// LOCAL CANDIDATE. Presentation only; never grants resources or assets.
const stages = new Map([['EI','VALID_INFANTIL'],['EF_INICIAIS','VALID_BASIC'],['EF_FINAIS','VALID_BASIC'],['EM','VALID_BASIC']]);
export function createNavigationReader({supabaseUrl,publishableKey,fetchImpl=fetch}) {
  const url=new URL('/rest/v1/rpc/student_get_self_navigation_v1',supabaseUrl);
  return async (token,signal)=>{
    const response=await fetchImpl(url,{method:'POST',signal,cache:'no-store',headers:{Authorization:`Bearer ${token}`,apikey:publishableKey,'Content-Type':'application/json'},body:'{}'});
    if(!response.ok)throw Error(response.status===401?'session_expired':'navigation_unavailable');
    const rows=await response.json();
    if(!Array.isArray(rows)||rows.length!==1)throw Error('navigation_denied');
    const {outcome,stage}=rows[0]??{};
    if(!stages.has(stage)||stages.get(stage)!==outcome)throw Error('navigation_denied');
    return Object.freeze({outcome,stage});
  };
}
// Call at the existing aluno home, including login return/reload/back. Query,
// class label and client JWT claims never select a stage. Other pages untouched.
export function createAutomaticNavigation({getAccessToken,readNavigation,render}) {
  let revision=0, pending;
  function clear(){revision++;pending?.abort();pending=undefined;render({state:'locked'});}
  async function enter(href){
    clear();
    const path=new URL(href,'https://local.invalid').pathname;
    if(!['/aluno','/aluno.html'].includes(path)){render({state:'legacy'});return;}
    const ticket=revision;pending=new AbortController();const signal=pending.signal;
    render({state:'checking'});
    try{
      const token=await getAccessToken();if(ticket!==revision)return;
      if(!token){render({state:'login_required',login:'/login?next=%2Faluno'});return;}
      const result=await readNavigation(token,signal);
      const current=await getAccessToken();if(ticket!==revision)return;
      if(current!==token){clear();render({state:'login_required'});return;}
      // Defense at adapter boundary as well as HTTP decoder.
      if(!stages.has(result?.stage)||stages.get(result.stage)!==result.outcome)throw Error('navigation_denied');
      render({state:result.stage==='EI'?'infantil':'basic',stage:result.stage});
    }catch(error){if(ticket===revision)render({state:error.message==='session_expired'?'login_required':'denied'});}
  }
  return Object.freeze({enter,clear});
}
// bindInfantilNavigation from navigation.mjs can bind this same enter/clear API.
// Login retains its existing credential flow and returns aluno to /aluno; this
// controller would select presentation automatically after server validation.
