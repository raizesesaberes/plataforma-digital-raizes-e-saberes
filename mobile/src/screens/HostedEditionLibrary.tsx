import React, {useEffect, useRef} from 'react';
import {rpc, type MobileSession} from '../services/library';
import {awaitPlatformSessionReady, callPlatformLibraryFunction, subscribePlatformSession} from '../services/webSession';
type EditionClient = {list:()=>Promise<unknown>; read:(bookId:string,kind?:string,page?:number)=>Promise<unknown>; search:(bookId:string,query:string,offset?:number)=>Promise<unknown>};
type Runtime = {libraryEditionClient:(transport:{rpc:(name:string,args?:Record<string,unknown>)=>Promise<{data:unknown}>;functions:{invoke:(name:string,options:{body:Record<string,unknown>})=>Promise<{data:unknown}>}})=>EditionClient;mountEditionLibrary:(root:ShadowRoot, options:{client:EditionClient;signal:AbortSignal})=>Promise<()=>void>};
declare global {interface Window {RaizesEditionLibraryReady?:Promise<Runtime>;}}
/** Web-only bridge. No storage, credentials in URLs, fixture or legacy catalog fallback. */
export function HostedEditionLibrary({session, platformLibraryHref}:{session:MobileSession;platformLibraryHref:'/biblioteca.html?from=aluno'|'/biblioteca.html'|'/professor.html?view=biblioteca'}) {
 const ref=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  const host=ref.current;if(!host)return;
  const root=host.shadowRoot||host.attachShadow({mode:'open'});
  let disposed=false,version=0,abort:AbortController|undefined,cleanup:(()=>void)|undefined;
  const reset=()=>{version++;abort?.abort();cleanup?.();cleanup=undefined;root.replaceChildren();};
  const start=async()=>{
   reset();const v=version;abort=new AbortController();const signal=abort.signal;
   root.innerHTML=`<style>${styles}</style><section aria-label="Biblioteca"><h1>Biblioteca</h1><p id="edition-status" role="status">Carregando livros disponíveis…</p><div id="edition-list"></div><div id="edition-reader" hidden></div><hr><h2>Outros materiais</h2><p>Consulte os materiais anteriores e as opções de gestão na biblioteca da plataforma.</p><a data-platform>Ir à biblioteca da plataforma</a></section>`;
   root.querySelector('a')!.setAttribute('href',platformLibraryHref);
   const current=()=>{if(disposed||signal.aborted||v!==version)throw Error('library_disposed');};
   const guarded=async(operation:()=>Promise<unknown>)=>{current();await awaitPlatformSessionReady(session);current();const data=await operation();current();await awaitPlatformSessionReady(session);current();return data;};
   try {
    if(!window.RaizesEditionLibraryReady)throw Error('edition_runtime_missing');
    const runtime=await window.RaizesEditionLibraryReady;current();
    // The shared adapter validates list/read/search contracts. Hosted transport is injected.
    const client=runtime.libraryEditionClient({
     rpc:async(name,args={})=>{if(name!=='library_list_editions')throw Error('rpc_not_allowed');return {data:await guarded(()=>rpc(session,name,args))};},
     functions:{invoke:async(name,{body})=>({data:await guarded(()=>callPlatformLibraryFunction(session,name,body))})},
    });
    const end=await runtime.mountEditionLibrary(root,{client,signal});
    if(disposed||signal.aborted||v!==version)end();else cleanup=end;
   }catch{if(!disposed&&!signal.aborted&&v===version){const status=root.querySelector('#edition-status');if(status)status.textContent='Não foi possível carregar a biblioteca. Volte ao início e tente novamente.';}}
  };
  const unsubscribe=subscribePlatformSession(state=>{
   if(state.status==='ready'&&state.session===session)void start();
   else {reset();root.textContent=state.status==='locked'&&state.reason==='verifying'?'Conferindo acesso à biblioteca…':'Entre novamente para acessar a biblioteca.';}
  });
  return()=>{disposed=true;unsubscribe();reset();};
 },[session,platformLibraryHref]);
 return React.createElement('div',{ref,style:{width:'100%',minWidth:0},'data-testid':'hosted-edition-library'});
}
const styles=`
:host{display:block;color:#203c2e;font:16px/1.5 system-ui,sans-serif}*{box-sizing:border-box}[hidden]{display:none!important}h1{font-size:25px}h2{font-size:19px;overflow-wrap:anywhere}button,input,select,a{font:inherit}button,a{min-height:44px}button{cursor:pointer;border:1px solid #b6ccbe;border-radius:10px;padding:10px;background:#fff;color:#164d3b}button:disabled{opacity:.55;cursor:default}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #176747;outline-offset:2px}a{display:inline-flex;align-items:center;color:#176747}input,select{min-height:44px;width:100%;max-width:100%;padding:8px;border:1px solid #b6ccbe;border-radius:8px;font-size:16px}.ed-toolbar{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}.ed-toolbar label{flex:1;min-width:130px}.ed-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px}.ed-card{border:1px solid #dce6dd;border-radius:14px;overflow:hidden;background:white}.ed-cover{height:190px;background:#f1f4ed;display:flex;align-items:center;justify-content:center}.ed-cover img{display:none;width:100%;height:100%;object-fit:contain}.ed-cover.is-loaded img{display:block}.ed-cover.is-loaded .ed-cover-fallback{display:none}.ed-cover-fallback{padding:10px;font-size:13px}.ed-card-body{padding:12px}.ed-badge,.ed-meta{font-size:13px}.ed-read{width:100%}.ed-reader{max-width:100%}.reader-header{padding:12px}.reader-layout{display:grid;grid-template-columns:100px minmax(0,1fr);gap:10px}.thumbnail-list img{width:70px}.book-stage{min-width:0;overflow:auto;max-width:100%}.reader-page{margin:0;overflow:auto}.reader-page img{width:calc(100% * var(--zoom,1));max-width:none;height:auto}.reader-controls{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;padding:12px 0}.reader-controls button{min-width:44px}.ed-status{overflow-wrap:anywhere}@media(max-width:700px){.reader-layout{display:block}.reader-rail{display:none}.ed-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ed-cover{height:160px}.ed-card h2{font-size:16px}}
`;
