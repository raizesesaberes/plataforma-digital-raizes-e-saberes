// Read-only client; identity, scope and resource authority stay on the server.
export function createSelfInfantilReader({supabaseUrl,publishableKey,getAccessToken,fetchImpl=fetch}){
 const url=new URL('/functions/v1/student-self-infantil-access',supabaseUrl).href;
 async function request(body){
  const token=await getAccessToken();if(!token)throw Error('missing_session');
  const response=await fetchImpl(url,{method:'POST',cache:'no-store',headers:{Authorization:'Bearer '+token,apikey:publishableKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(response.status===401)throw Error('session_expired');
  const payload=await response.json();if(!response.ok||payload?.ok!==true)throw Error('read_denied');return payload;
 }
 return Object.freeze({
  async catalog(limit=24,offset=0){const p=await request({mode:'catalog',limit,offset});if(!Array.isArray(p.items)||p.items.length>limit||p.limit!==limit||p.offset!==offset)throw Error('invalid_catalog');return p.items;},
  async content(kind,id){if(!['activity','discovery','game'].includes(kind))throw Error('invalid_kind');const p=await request({mode:'content',contentKind:kind,contentId:id});if(p.content?.id!==id)throw Error('resource_mismatch');return p.content;}
 });
}
