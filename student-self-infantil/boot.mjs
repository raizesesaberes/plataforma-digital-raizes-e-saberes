import {createSessionBridge} from './session-bridge.mjs';
import {mountExistingStudent} from './existing-student-navigation.mjs';
const root=document.querySelector('[data-app-page="aluno"]');
const config=window.RAIZES_SUPABASE||{};
let loaded=false,loading,loadedToken;
function script(src){return new Promise((resolve,reject)=>{const node=document.createElement('script');node.src=src;node.onload=resolve;node.onerror=reject;document.body.append(node);});}
async function loadExisting({token,isCurrent}){
  // A different identity/session must not reuse the old dashboard's cached data.
  if(loadedToken&&loadedToken!==token){window.location.reload();return;}
  loadedToken=token;
  if(loaded){if(isCurrent())window.dispatchEvent(new Event('rs-self-basic-remount'));return;}
  if(!loading)loading=(async()=>{await script('/app-pages.js');await script('/script.js');await script('/communication-replies.js');await script('/notice-editing.js');loaded=true;})();
  await loading;if(isCurrent())window.dispatchEvent(new Event('rs-self-basic-remount'));
}
if(root){root.dataset.selfManaged='true';
  if(!config.url||!config.anonKey){root.textContent='Serviço de acesso indisponível.';root.dataset.state='denied';}
  else{const session=createSessionBridge({window,supabaseUrl:config.url,publishableKey:config.anonKey});mountExistingStudent({window,root,session,supabaseUrl:config.url,publishableKey:config.anonKey,loadExisting});}
}
