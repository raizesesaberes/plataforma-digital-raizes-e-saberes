import {useEffect,useRef} from 'react';
// Route payloads live only in this mounted authenticated shell, never history.state or URLs.
export function useHostedNavigation<T>(enabled:boolean,initial:T,apply:(state:T)=>void,canLeave:()=>boolean){
 const values=useRef(new Map<number,{state:T;position:number}>()),cursor=useRef(0),position=useRef(0),next=useRef(1),repair=useRef(false),applyRef=useRef(apply),guardRef=useRef(canLeave),nonce=useRef('');
 applyRef.current=apply;guardRef.current=canLeave;
 useEffect(()=>{if(!enabled)return;nonce.current=crypto.randomUUID();values.current.set(0,{state:initial,position:0});cursor.current=0;position.current=0;next.current=1;repair.current=false;history.replaceState({rsApp:nonce.current,index:0,position:0},'',location.pathname+'#home');
 const pop=(event:PopStateEvent)=>{
  if(repair.current){repair.current=false;return;}
  const incoming=event.state;
  const target=incoming?.rsApp===nonce.current&&Number.isInteger(incoming.index)?values.current.get(incoming.index):undefined;
  if(!target){
   // Unknown entries have no trustworthy direction. Start a fresh local history
   // without restoring foreign payloads or discarding a canceled draft.
   const accepted=guardRef.current();
   const current=values.current.get(cursor.current)?.state??initial;
   const state=accepted?initial:current;
   nonce.current=crypto.randomUUID();values.current.clear();
   values.current.set(0,{state,position:0});cursor.current=0;position.current=0;next.current=1;repair.current=false;
   history.replaceState({rsApp:nonce.current,index:0,position:0},'',location.pathname+(accepted?'#home':'#section'));
   if(accepted)applyRef.current(initial);return;
  }
  const delta=position.current-target.position;
  if(delta===0)return;
  if(!guardRef.current()){repair.current=true;history.go(delta);return;}
  cursor.current=incoming.index;position.current=target.position;applyRef.current(target.state);
 };
 window.addEventListener('popstate',pop);return()=>{window.removeEventListener('popstate',pop);values.current.clear();};
 },[enabled]);
 return {push(state:T,label:string){if(!enabled){applyRef.current(state);return;}if(!guardRef.current())return;for(const [id,value] of values.current){if(value.position>position.current)values.current.delete(id);}const index=next.current++;position.current++;values.current.set(index,{state,position:position.current});cursor.current=index;history.pushState({rsApp:nonce.current,index,position:position.current},'',location.pathname+'#'+encodeURIComponent(label));applyRef.current(state);},back(){if(enabled&&position.current>0){history.back();return true;}return false;}};
}
