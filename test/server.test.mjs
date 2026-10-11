import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
process.env.NODE_ENV='test';const dir=await mkdtemp(path.join(os.tmpdir(),'loteria-test-'));process.env.DATA_DIR=dir;
const {server}=await import('../server.mjs');await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
async function post(route,data,cookie){const res=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});return {status:res.status,cookie:res.headers.get('set-cookie')?.split(';')[0],data:await res.json()}}
test('partida con 3 conexiones HTTP, SSE, permisos y reclamo real',async()=>{try{
const h=await post('/api/rooms',{name:'Host'});assert.equal(h.status,200);const code=h.data.code;
const a=await post('/api/join',{name:'Ana',code}),b=await post('/api/join',{name:'Javi',code});assert.equal(a.status,200);assert.equal(b.status,200);
const abort=new AbortController();const stream=await fetch(base+'/api/rooms/'+code+'/events',{headers:{Cookie:a.cookie},signal:abort.signal});assert.equal(stream.headers.get('content-type'),'text/event-stream');const reader=stream.body.getReader();const decoder=new TextDecoder();let text='';for(let i=0;i<4&&!text.includes('data:');i++)text+=decoder.decode((await reader.read()).value);assert.match(text,/data:/);abort.abort();
const started=await post('/api/rooms/'+code+'/action',{action:'start',party:true},h.cookie);assert.equal(started.data.players.length,3);
assert.equal((await post('/api/rooms/'+code+'/action',{action:'draw'},a.cookie)).status,400);
assert.equal((await post('/api/join',{name:'Tarde',code})).status,400);
assert.equal((await post('/api/rooms/'+code+'/action',{action:'win'},a.cookie)).status,400);
const board=(await fetch(base+'/api/rooms/'+code,{headers:{Cookie:a.cookie}}).then(r=>r.json())).me.board;
let latest;for(let i=0;i<54;i++){latest=await post('/api/rooms/'+code+'/action',{action:'draw'},h.cookie);assert.equal(latest.status,200);const card=latest.data.called.at(-1);if(board.includes(card))assert.equal((await post('/api/rooms/'+code+'/action',{action:'mark',card},a.cookie)).status,200)}
const result=await post('/api/rooms/'+code+'/action',{action:'win'},a.cookie);assert.equal(result.status,200);assert.equal(result.data.winner,a.data.me.id);assert.equal(result.data.losers.length,2);assert.equal(result.data.events.at(-1).id,27);
const asset=await fetch(base+'/cards/gallo.jpg');assert.equal(asset.status,200);assert.equal(asset.headers.get('content-type'),'image/jpeg');assert.equal((await fetch(base+'/')).status,200);
assert.equal((await post('/api/rooms/'+code+'/action',{action:'draw'})).status,400);
const csrf=await fetch(base+'/api/rooms',{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:'{"name":"x"}'});assert.equal(csrf.status,400);
}finally{await new Promise(resolve=>server.close(resolve));server.closeAllConnections();await rm(dir,{recursive:true,force:true})}});
