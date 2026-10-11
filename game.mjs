import { randomInt, randomUUID } from 'node:crypto';
export const CARDS = ['gallo|El gallo','diablo|El diablo','dama|La dama','catrin|El catrín','paraguas|El paraguas','sirena|La sirena','escalera|La escalera','botella|La botella','barril|El barril','arbol|El árbol','melon|El melón','valiente|El valiente','gorrito|El gorrito','muerte|La muerte','pera|La pera','bandera|La bandera','bandolon|El bandolón','violoncello|El violoncello','garza|La garza','pajaro|El pájaro','mano|La mano','bota|La bota','luna|La luna','cotorro|El cotorro','borracho|El borracho','negrito|El negrito','corazon|El corazón','sandia|La sandía','tambor|El tambor','camaron|El camarón','jaras|Las jaras','musico|El músico','arana|La araña','soldado|El soldado','estrella|La estrella','cazo|El cazo','mundo|El mundo','apache|El apache','nopal|El nopal','alacran|El alacrán','rosa|La rosa','calavera|La calavera','campana|La campana','cantarito|El cantarito','venado|El venado','sol|El sol','corona|La corona','chalupa|La chalupa','pino|El pino','pescado|El pescado','palma|La palma','maceta|La maceta','arpa|El arpa','rana|La rana'].map((s,i)=>{const [id,name]=s.split('|');return {id,name,number:i+1}});
export function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
export function player(token,name){return {id:randomUUID(),token,name,board:[],marks:[],shots:0,ack:0}}
export function room(code,p){return {code,host:p.id,players:[p],phase:'lobby',deck:[],called:[],events:[],round:0,winner:null,updated:Date.now(),rule:'full',party:false}}
const fail=(message)=>{throw new Error(message)};
export function act(r,p,action,data={}){
 const host=()=>{if(r.host!==p.id)fail('Solo el host puede hacer esto.')};
 if(action==='host'){if(r.phase==='playing')fail('El host se cambia entre partidas.');if(r.players.find(x=>x.id===r.host)?.online && r.host!==p.id)fail('Pide al host que te pase el control.');r.host=p.id;}
 else if(action==='transfer'){host();if(r.phase==='playing')fail('Cambia el host entre partidas.');if(!r.players.some(x=>x.id===data.id))fail('Jugador no encontrado.');r.host=data.id;}
 else if(action==='start'){
  host();if(r.phase==='playing')fail('Ya hay una partida.');if(r.players.length<2)fail('Necesitas al menos dos jugadores.');
  r.rule=data.rule==='line'?'line':'full';r.party=data.party===true;r.phase='playing';r.deck=shuffle(CARDS.map(c=>c.id));r.called=[];r.events=[];r.winner=null;r.losers=[];r.round++;
  for(const x of r.players){x.board=shuffle(CARDS.map(c=>c.id)).slice(0,16);x.marks=[];x.shots=0;x.ack=0;}
 }
 else if(action==='draw'){
  host();if(r.phase!=='playing')fail('La partida no está activa.');if(!r.deck.length)fail('Se acabó la baraja.');
  r.called.push(r.deck.shift());
  if(r.called.length%2===0){const pair=r.called.slice(-2),missed=[];
   for(const x of r.players)if(!pair.some(c=>x.board.includes(c))){x.shots++;missed.push(x.id)}
   r.events.push({id:r.called.length/2,pair,missed,type:r.party?'shot':'point'});
  }
 }
 else if(action==='mark'){
  if(r.phase!=='playing')fail('La partida no está activa.');if(!p.board.includes(data.card)||!r.called.includes(data.card))fail('Esa carta todavía no ha salido.');
  if(!p.marks.includes(data.card))p.marks.push(data.card);
 }
 else if(action==='ack'){p.ack=p.shots;}
 else if(action==='win'){
  if(r.phase!=='playing')fail('La partida no está activa.');
  const lines=[];for(let i=0;i<4;i++){lines.push([0,1,2,3].map(j=>p.board[i*4+j]));lines.push([0,1,2,3].map(j=>p.board[j*4+i]))}lines.push([0,5,10,15].map(i=>p.board[i]),[3,6,9,12].map(i=>p.board[i]));
  const valid=r.rule==='full'?p.board.every(c=>p.marks.includes(c)):lines.some(line=>line.every(c=>p.marks.includes(c)));
  if(!valid)fail(r.rule==='full'?'Todavía no completaste tu tablero.':'Necesitas una fila, columna o diagonal completa.');
  r.phase='finished';r.winner=p.id;r.losers=r.players.filter(x=>x.id!==p.id).map(x=>x.id);
 }
 else fail('Acción desconocida.');
 r.updated=Date.now();
}
export function view(r,p){return {code:r.code,host:r.host,phase:r.phase,called:r.called,events:r.events.slice(-8),round:r.round,winner:r.winner,losers:r.losers||[],rule:r.rule,party:r.party,remaining:r.deck.length,me:{id:p.id,board:p.board,marks:p.marks,shots:p.shots,ack:p.ack},players:r.players.map(x=>({id:x.id,name:x.name,shots:x.shots,marked:x.marks.length,online:!!x.online}))}}
