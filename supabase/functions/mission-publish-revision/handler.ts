import {sha256} from './hash.ts';
type Env={url:string;anonKey:string;serviceKey:string;allowedOrigins?:string[]};
type Validator=(base:string,draft:string,engine:string)=>Promise<{source_json:string;content_hash:string}>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createHandler(env:Env,fetcher:typeof fetch,validate:Validator){return async(req:Request)=>{
 const origin=req.headers.get('origin'),allowed=env.allowedOrigins??['https://www.raizesesaberes.com.br','https://raizesesaberes.com.br'];
 const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
 if(origin&&allowed.includes(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='authorization,apikey,content-type,x-client-info';headers['Access-Control-Allow-Methods']='POST,OPTIONS'}
 const response=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!allowed.includes(origin))return response(403,{error:'ORIGIN_NOT_ALLOWED'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});if(req.method!=='POST')return response(405,{error:'METHOD_NOT_ALLOWED'});
 const token=req.headers.get('authorization');if(!token?.startsWith('Bearer ')||token.length>16384)return response(401,{error:'AUTH_REQUIRED'});
 try{
  if(!env.url||!env.anonKey||!env.serviceKey)return response(503,{error:'BACKEND_NOT_CONFIGURED'});
  const userRes=await fetcher(env.url+'/auth/v1/user',{headers:{apikey:env.anonKey,Authorization:token}});if(!userRes.ok)return response(401,{error:'INVALID_SESSION'});
  const user=await userRes.json();if(!uuid.test(user.id??'')||user.is_anonymous===true)return response(401,{error:'INVALID_SESSION'});
  const reader=req.body?.getReader();let body='',size=0;if(reader){const decoder=new TextDecoder();while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return response(413,{error:'REQUEST_TOO_LARGE'})}body+=decoder.decode(value,{stream:true})}body+=decoder.decode()}
  let payload;try{payload=JSON.parse(body)}catch{return response(400,{error:'INVALID_REQUEST'})}
  if(!payload||!uuid.test(payload.draft_id??'')||Object.keys(payload).some(k=>!['draft_id','expected_draft_sha256'].includes(k)))return response(400,{error:'INVALID_REQUEST'});
  const rpc=async(name:string,args:unknown,key:string,authorization:string)=>fetcher(env.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:key,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(args)});
  const draftRes=await rpc('mission_teacher_get_draft_for_publish_v1',{p_draft_id:payload.draft_id},env.anonKey,token);if(!draftRes.ok)return response(403,{error:'DRAFT_NOT_AUTHORIZED'});const draft=await draftRes.json();
  if(!draft||draft.id!==payload.draft_id||draft.teacher_auth_id!==user.id)return response(403,{error:'DRAFT_NOT_AUTHORIZED'});
  if(typeof draft.snapshot_json!=='string'||typeof draft.base_snapshot_json!=='string')return response(409,{error:'DRAFT_HASH_MISMATCH'});
  const digest=await sha256(draft.snapshot_json),baseDigest=await sha256(draft.base_snapshot_json);
  if(digest!==draft.source_sha256||baseDigest!==draft.base_source_sha256||(payload.expected_draft_sha256&&payload.expected_draft_sha256!==digest))return response(409,{error:'DRAFT_HASH_MISMATCH'});
  let validated;try{validated=await validate(draft.base_snapshot_json,draft.snapshot_json,draft.engine)}catch(e:any){return response(422,{error:e.message,issues:e.issues??[]})}
  const final=await rpc('mission_service_finalize_revision_v1',{p_teacher_auth_id:user.id,p_draft_id:draft.id,p_draft_sha256:digest,p_base_sha256:baseDigest,p_source_json:validated.source_json,p_content_hash:validated.content_hash},env.serviceKey,'Bearer '+env.serviceKey);
  if(!final.ok)return response(409,{error:'FINALIZATION_REJECTED'});return response(200,await final.json());
 }catch{return response(500,{error:'PUBLICATION_FAILED'})}
}}
