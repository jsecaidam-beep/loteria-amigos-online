import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARDS, player, room, act, view } from './game.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const dataDir=process.env.DATA_DIR||path.join(root,'data');
await mkdir(dataDir,{recursive:true});
let saved={};try{saved=JSON.parse(await readFile(path.join(dataDir,'rooms.json'),'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const rooms=new Map(Object.entries(saved));for(const r of rooms.values())for(const p of r.players)p.online=false;
const clients=new Map();let persistence=Promise.resolve();
function save(){const text=JSON.stringify(Object.fromEntries(rooms));persistence=persistence.catch(()=>{}).then(async()=>{await writeFile(path.join(dataDir,'rooms.tmp'),text);await rename(path.join(dataDir,'rooms.tmp'),path.join(dataDir,'rooms.json'))});return persistence}
function publish(r){for(const p of r.players)for(const res of clients.get(r.code+':'+p.token)||[])res.write('data: '+JSON.stringify(view(r,p))+'\n\n')}
const limits=new Map();
function limited(key,max){const now=Date.now();let x=limits.get(key);if(!x||now-x.t>60000){x={t:now,n:0};limits.set(key,x)}return ++x.n>max}
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
function token(req){return req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith('session='))?.slice(8)}
function auth(req,code){const r=rooms.get(code);if(!r)throw new Error('Sala no encontrada o caducada.');const p=r.players.find(x=>x.token===token(req));if(!p)throw new Error('Entra primero a la sala.');return {r,p}}
function cookie(req,res,t){res.setHeader('Set-Cookie',`session=${t}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${req.socket.encrypted||req.headers['x-forwarded-proto']==='https'?'; Secure':''}`)}
async function body(req){let size=0,text='';for await(const chunk of req){size+=chunk.length;if(size>4096)throw new Error('Petición demasiado grande.');text+=chunk}return JSON.parse(text||'{}')}
export const server=http.createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');
 res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'");
 try{
  const url=new URL(req.url,'http://localhost');const parts=url.pathname.split('/').filter(Boolean);
  if(req.method==='POST'){
   if(req.headers.origin){const origin=new URL(req.headers.origin);if(origin.host!==req.headers.host)throw new Error('Origen no permitido.');}
   if(limited(token(req)||req.socket.remoteAddress,180))return json(res,429,{error:'Espera un momento antes de continuar.'});
   const data=await body(req);
   if(url.pathname==='/api/rooms'||url.pathname==='/api/join'){
    const name=String(data.name||'').trim().slice(0,24);if(!name)throw new Error('Escribe tu nombre.');
    let t=token(req);if(!/^[a-f0-9]{48}$/.test(t||''))t=randomBytes(24).toString('hex');cookie(req,res,t);
    let r,p;
    if(url.pathname==='/api/rooms'){
     if(limited('create:'+req.socket.remoteAddress,20))return json(res,429,{error:'Demasiadas salas creadas.'});
     let code;do{code=randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(code));p=player(t,name);r=room(code,p);rooms.set(code,r);
    }else{
     r=rooms.get(String(data.code||'').toUpperCase());if(!r)throw new Error('Ese código no existe.');p=r.players.find(x=>x.token===t);
     if(!p){if(r.phase==='playing')throw new Error('La partida ya comenzó. Entra cuando termine.');if(r.players.length>=24)throw new Error('La sala está llena.');p=player(t,name);r.players.push(p)}
    }
    r.updated=Date.now();await save();publish(r);return json(res,200,view(r,p));
   }
   if(parts[0]==='api'&&parts[1]==='rooms'&&parts[3]==='action'){
    const {r,p}=auth(req,parts[2]);act(r,p,data.action,data);await save();publish(r);return json(res,200,view(r,p));
   }
   return json(res,404,{error:'Ruta no encontrada.'});
  }
  if(req.method!=='GET')return json(res,405,{error:'Método no permitido.'});
  if(url.pathname==='/health')return json(res,200,{ok:true});
  if(url.pathname==='/api/cards')return json(res,200,CARDS);
  if(parts[0]==='api'&&parts[1]==='rooms'){
   const {r,p}=auth(req,parts[2]);
   if(parts[3]==='events'){
    const clientKey=r.code+':'+p.token;let sockets=clients.get(clientKey);if(!sockets){sockets=new Set();clients.set(clientKey,sockets)}if(sockets.size>=4)return json(res,429,{error:'Cierra otras pestañas de esta sala.'});
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});res.write('retry: 2000\n\n');sockets.add(res);p.online=true;publish(r);
    const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),20000);
    req.on('close',()=>{clearInterval(heartbeat);sockets.delete(res);if(!sockets.size){clients.delete(clientKey);p.online=false;publish(r)}});return;
   }
   return json(res,200,view(r,p));
  }
  const relative=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname).slice(1);const target=path.resolve(root,'public',relative);
  if(!target.startsWith(path.join(root,'public')+path.sep))return json(res,404,{error:'No encontrado.'});
  const bytes=await readFile(target);const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg'};
  res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':relative.startsWith('cards/')?'public, max-age=604800':'no-cache'});res.end(bytes);
 }catch(e){if(!res.headersSent)json(res,e.code==='ENOENT'?404:400,{error:e.code==='ENOENT'?'No encontrado.':e.message});else res.end()}
});
const cleanup=setInterval(()=>{for(const [code,r]of rooms)if(Date.now()-r.updated>86400000&&!r.players.some(p=>p.online))rooms.delete(code);for(const [k,v]of limits)if(Date.now()-v.t>60000)limits.delete(k);save().catch(console.error)},60000);cleanup.unref();
if(process.env.NODE_ENV!=='test')server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Lotería lista en puerto '+(process.env.PORT||3000)));
