import {createNavigationReader} from './automatic-navigation.mjs';
import {bindInfantilNavigation} from './navigation.mjs';
// Presentation adapter only. Existing RPCs and resource authorization unchanged.
export function mountExistingStudent({window,root,session,supabaseUrl,publishableKey,fetchImpl=fetch,loadExisting}) {
  const readNavigation=createNavigationReader({supabaseUrl,publishableKey,fetchImpl});
  let revision=0,pending,proof=null;
  Object.defineProperty(window,'RSStudentFamilyContext',{configurable:true,get:()=>proof});
  function clear(){revision++;pending?.abort();proof=null;root.dataset.selfPresentation='locked';root.dataset.state='locked';root.replaceChildren();}
  function message(state,text){root.dataset.state=state;root.textContent=text;if(state==='login_required'){const a=window.document.createElement('a');a.href='/login?next=%2Faluno';a.textContent='Entrar';root.append(a);}}
  async function enter(){
    clear();const ticket=revision;pending=new AbortController();const signal=pending.signal;
    message('checking','Verificando acesso');
    try{
      const token=await session.getAccessToken();if(ticket!==revision)return;
      if(!token){message('login_required','Entre com o login do aluno.');return;}
      const nav=await readNavigation(token,signal);let own=null;
      if(nav.stage==='EI'){
        const response=await fetchImpl(new URL('/rest/v1/rpc/student_get_self_infantil_context_v1',supabaseUrl),{method:'POST',signal,cache:'no-store',headers:{Authorization:`Bearer ${token}`,apikey:publishableKey,'Content-Type':'application/json'},body:'{}'});
        if(!response.ok)throw Error(response.status===401?'session_expired':'context_denied');
        const rows=await response.json();own=rows?.[0];
        if(!Array.isArray(rows)||rows.length!==1||own?.stage!=='EI'||['student_id','enrollment_id','school_id','class_id','grade_id'].some(k=>typeof own[k]!=='string'||!own[k]))throw Error('context_denied');
      }
      const current=await session.getAccessToken();if(ticket!==revision)return;
      if(current!==token)throw Error('session_expired');
      proof=own?Object.freeze({...own}):null;
      root.dataset.selfPresentation='basic';root.dataset.state='basic';
      await loadExisting({stage:nav.stage,token,isCurrent:()=>ticket===revision});
    }catch(error){if(ticket!==revision)return;proof=null;root.dataset.selfPresentation='locked';root.replaceChildren();message(error.message==='session_expired'?'login_required':'denied','Não foi possível validar o acesso do aluno.');}
  }
  const unbind=bindInfantilNavigation({window,navigation:{enter,clear},subscribeSession:session.subscribe});
  return ()=>{unbind();clear();};
}
