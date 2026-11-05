import {mountWeeklyBoard} from './board.mjs';
import {createWeeklyRpcTransport} from './transport.mjs';
const active=new Map();
const dispose=(root)=>{const item=active.get(root);if(!item)return;active.delete(root);item.transport.dispose();item.board?.dispose();};
function check(){for(const [root,item] of active){if(!root.isConnected||item.identity()!==item.subject)dispose(root);}}
const observer=new MutationObserver(check);observer.observe(document.documentElement,{childList:true,subtree:true});
for(const event of ['storage','focus','pageshow'])window.addEventListener(event,check);
window.addEventListener('pagehide',()=>{for(const root of active.keys())dispose(root);});
setInterval(check,1000);
export async function mount({root,rpc,sessionIdentity,teacherTarget=null,existingWeekElement=null,weekStart=null}){
 if(active.has(root))return;
 if(!document.querySelector('[data-weekly-board-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./weekly.css',import.meta.url).href;link.dataset.weeklyBoardStyle='true';document.head.append(link);}
 // Local calendar dates, not UTC rollover. Explicit date from existing weekly view wins.
 const now=new Date(),monday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-(now.getDay()+6)%7);
 const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const start=weekStart&&/^\d{4}-\d{2}-\d{2}$/.test(weekStart)?new Date(weekStart+'T12:00:00'):monday;
 const dates=Array.from({length:5},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return iso(d);});
 const transport=createWeeklyRpcTransport({rpc,sessionIdentity,teacherTarget}),item={transport,identity:sessionIdentity,subject:sessionIdentity(),board:null};active.set(root,item);
 try{item.board=await mountWeeklyBoard({root,dates,transport,existingWeekElement});if(active.get(root)!==item)item.board.dispose();}
 catch{dispose(root);if(root.isConnected)root.textContent='Não foi possível carregar o quadro. Recarregue a página para tentar novamente.';}
 check();
}
