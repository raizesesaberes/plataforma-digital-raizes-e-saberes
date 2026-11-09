import React, { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import type { AppProfile, ModuleKey } from '../data/fixtures';
import { rpc, type MobileSession } from '../services/library';
import { currentPlatformSessionIdentity, callPlatformFunction, awaitPlatformSessionReady } from '../services/webSession';
type Host = HTMLDivElement & {missionCanLeave?:()=>boolean};
type Runtime = {mountMission:(options:{root:Host;mode:string;discoveryLayout?:'themes';sessionIdentity:()=>string|null;discoveryAllowed:()=>boolean;rpc:(name:string,args:Record<string,unknown>)=>Promise<{data:unknown}>})=>Promise<()=>void>};
declare global {interface Window {RaizesMissionRuntimeReady?:Promise<Runtime>;}}
export function InstitutionalWorkspace({profile,session,moduleKey,registerLeaveGuard}:{profile:AppProfile;session:MobileSession;moduleKey:ModuleKey;registerLeaveGuard:(guard:(()=>boolean)|null)=>void}) {
 const ref=useRef<Host|null>(null), register=useRef(registerLeaveGuard);register.current=registerLeaveGuard;
 useEffect(()=>{
  if(Platform.OS!=='web'||!ref.current)return;
  const host=ref.current;let disposed=false,cleanup:(()=>void)|undefined;
  const mode=moduleKey==='prints'?'prints':moduleKey==='coloring'&&profile.role==='crescer'?'discovery':moduleKey==='coloring'?'prints':profile.role==='professor'?'teacher':'student';
  const identity=currentPlatformSessionIdentity();
  register.current(()=>host.missionCanLeave?.()??true);
  const current=()=>!disposed&&currentPlatformSessionIdentity()===identity?identity:null;
  void (async()=>{
   if(!identity||!window.RaizesMissionRuntimeReady)throw Error('institutional_runtime_missing');
   const runtime=await window.RaizesMissionRuntimeReady;if(disposed)return;
   const end=await runtime.mountMission({root:host,mode,discoveryLayout:'themes',sessionIdentity:current,discoveryAllowed:()=>profile.role==='crescer'&&!!current(),rpc:async(name,args={})=>{
    await awaitPlatformSessionReady(session);
    if(!current())throw Error('Sessão alterada.');
    if(!/^mission_[a-z0-9_]+$/.test(name)&&name!=='mission-publish-revision')throw Error('Operação não autorizada.');
    const data=name==='mission-publish-revision'?await callPlatformFunction(session,name,args):await rpc(session,name,args);
    if(!current())throw Error('Sessão alterada.');
    // Preserve arrays exactly: list RPCs must not be flattened to their first row.
    return {data};
   }});
   if(disposed)end();else {cleanup=end;const style=document.createElement('style');style.textContent='@media(max-width:699px){.mission-main{padding:12px}.player-frame{min-height:420px;height:68dvh}button,input,select{min-height:44px}dialog{box-sizing:border-box;max-width:96vw;width:96vw}}';host.shadowRoot?.append(style);}
  })().catch(()=>{if(!disposed){host.replaceChildren();if(host.shadowRoot)host.shadowRoot.replaceChildren();host.textContent='Não foi possível abrir esta área. Volte ao início e tente novamente. Nenhuma operação foi confirmada.';}});
  return()=>{disposed=true;cleanup?.();register.current(null);host.replaceChildren();host.shadowRoot?.replaceChildren();};
 },[session,profile.role,moduleKey]);
 return Platform.OS==='web'?React.createElement('div',{ref,style:{width:'100%',minWidth:0,boxSizing:'border-box'},'data-testid':'institutional-workspace'}):<View><Text>Área institucional disponível no App Raízes pelo navegador.</Text></View>;
}
