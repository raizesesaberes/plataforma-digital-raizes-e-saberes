import {useEffect,useRef} from 'react';
// Local history per mounted authenticated shell. Never restore another account's route state.
export function useHostedNavigation<T>(enabled:boolean,initial:T,apply:(state:T)=>void,canLeave:()=>boolean){
 const values=useRef(new Map<number,T>()),cursor=useRef(0),position=useRef(0),next=useRef(1),repair=useRef(false),applyRef=useRef(apply),guardRef=useRef(canLeave),nonce=useRef('');
 applyRef.current=apply;guardRef.current=canLeave;
 useEffect(()=>{if(!enabled)return;nonce.current=crypto.randomUUID();values.current.set(0,initial);history.replaceState({rsApp:nonce.current,index:0,position:0},'',location.pathname+'#home');
 const pop=(event:PopStateEvent)=>{if(repair.current){repair.current=false;return;}const incoming=event.state;if(incoming?.rsApp!==nonce.current||!Number.isInteger(incoming.index)||!values.current.has(incoming.index)){applyRef.current(initial);cursor.current=0;position.current=0;history.replaceState({rsApp:nonce.current,index:0,position:0},'',location.pathname+'#home');return;}
 const previous=position.current;if(!guardRef.current()){repair.current=true;history.go(previous-incoming.position);return;}cursor.current=incoming.index;position.current=incoming.position;applyRef.current(values.current.get(incoming.index)!);};
 window.addEventListener('popstate',pop);return()=>{window.removeEventListener('popstate',pop);values.current.clear();};
 },[enabled]);
 return {push(state:T,label:string){if(!enabled){apply(state);return;}if(!guardRef.current())return;const index=next.current++;values.current.set(index,state);cursor.current=index;position.current++;history.pushState({rsApp:nonce.current,index,position:position.current},'',location.pathname+'#'+encodeURIComponent(label));apply(state);},back(){if(enabled&&cursor.current>0){history.back();return true;}return false;}};
}
