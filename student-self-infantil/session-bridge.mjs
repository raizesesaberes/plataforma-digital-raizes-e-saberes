// LOCAL candidate for the exact storage/refresh contract used by login.js and
// app-pages.js. Stored claims are never used to authorize stage or content.
export const sessionKey='raizes:supabase-auth-session';
const tokenKey='raizes:supabase-access-token';
export function createSessionBridge({window,supabaseUrl,publishableKey,fetchImpl=fetch,now=()=>Date.now()}){
 const storage=window.localStorage,listeners=new Set();let refresh,expiryTimer;
 const read=()=>{try{return JSON.parse(storage.getItem(sessionKey)||'null');}catch{return null;}};
 const emit=()=>listeners.forEach(fn=>fn());
 function scheduleExpiry(){clearTimeout(expiryTimer);const remaining=Number(read()?.expires_at||0)*1000-now();if(remaining>0)expiryTimer=setTimeout(emit,Math.min(remaining,2147483647));}
 const changed=e=>{if(e.key===sessionKey||e.key===tokenKey||e.key===null){scheduleExpiry();emit();}};
 window.addEventListener('storage',changed);
 function clear(){clearTimeout(expiryTimer);storage.removeItem(sessionKey);storage.removeItem(tokenKey);emit();}
 async function getAccessToken(){
  const session=read();if(!session?.access_token)return null;
  if(Number(session.expires_at)>now()/1000+60){scheduleExpiry();return session.access_token;}
  if(!session.refresh_token){clear();return null;}
  if(refresh)return refresh;
  const original=storage.getItem(sessionKey);
  refresh=(async()=>{
   try{
    const res=await fetchImpl(new URL('/auth/v1/token?grant_type=refresh_token',supabaseUrl),{method:'POST',headers:{apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
    // Do not resurrect a logged-out/replaced session after a delayed refresh.
    if(storage.getItem(sessionKey)!==original)return null;
    if(!res.ok){clear();return null;}
    const next=await res.json();
    if(storage.getItem(sessionKey)!==original)return null;
    const expires=Number(next.expires_at||Math.floor(now()/1000)+Number(next.expires_in||0));
    if(typeof next.access_token!=='string'||!next.access_token.trim()||!Number.isFinite(expires)||expires<=now()/1000){clear();return null;}
    storage.setItem(sessionKey,JSON.stringify({...next,expires_at:expires,refresh_token:next.refresh_token||session.refresh_token}));
    storage.setItem(tokenKey,next.access_token);
    // Calling consumer is already waiting for this token and revalidates; do
    // not recursively emit/re-enter while the shared refresh promise resolves.
    scheduleExpiry();return next.access_token;
   }catch{if(storage.getItem(sessionKey)===original)clear();return null;}
   finally{refresh=undefined;}
  })();return refresh;
 }
 async function logout(){const token=read()?.access_token;clear();if(token)try{await fetchImpl(new URL('/auth/v1/logout',supabaseUrl),{method:'POST',headers:{apikey:publishableKey,Authorization:`Bearer ${token}`}});}catch{/* Local session stays cleared. */}}
 return Object.freeze({getAccessToken,logout,clear,notifySessionChanged:()=>{scheduleExpiry();emit();},subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn);},dispose:()=>{clearTimeout(expiryTimer);window.removeEventListener('storage',changed);listeners.clear();}});
}
