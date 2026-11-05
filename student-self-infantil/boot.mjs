// Local product integration. Server failures never bootstrap the old aluno page.
import {createSessionBridge} from './session-bridge.mjs';
import {mountSelfInfantil} from './presentation.mjs';
const root=document.querySelector('[data-app-page="aluno"]');
const config=window.RAIZES_SUPABASE||{};
let legacyLoaded=false,legacyLoading;
function script(src){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=src;node.onload=resolve;node.onerror=reject;document.body.append(node);});}
async function legacy(){
 root.dataset.selfPresentation='basic';
 if(legacyLoaded){window.dispatchEvent(new Event('rs-self-basic-remount'));return;}
 if(legacyLoading)return legacyLoading;
 legacyLoading=(async()=>{await script('/app-pages.js');await script('/script.js');await script('/communication-replies.js');await script('/notice-editing.js');legacyLoaded=true;})();
 return legacyLoading;
}
if(root){
 root.dataset.selfManaged='true';
 if(!config.url||!config.anonKey){root.textContent='Serviço de acesso indisponível.';root.dataset.state='denied';}
 else{
  const session=createSessionBridge({window,supabaseUrl:config.url,publishableKey:config.anonKey});
  mountSelfInfantil({window,root,session,supabaseUrl:config.url,publishableKey:config.anonKey,
   beforeInfantil:()=>{if(legacyLoaded||legacyLoading){window.location.reload();return false;}return true;},
   onBasic:()=>{void legacy().catch(()=>{if(root.dataset.state==='basic'){root.replaceChildren();root.textContent='Não foi possível carregar o ambiente do aluno.';root.dataset.state='denied';}});},onLegacy:()=>{root.dataset.state='denied';}});
 }
}
