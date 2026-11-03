import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import allowlist from './allowlist.json' with {type:'json'};
// Kept closed until the administrator session is verified. Deployment of a
// bounded absolute deadline is the sole activation step; no persistent tokens.
const EXPIRES_AT=0;
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://www.raizesesaberes.com.br','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({code:'method_not_allowed'},405);
 if(!EXPIRES_AT||Date.now()>=EXPIRES_AT)return reply({code:'importer_closed'},410);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply({code:'server_misconfigured'},503);
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(authorization))return reply({code:'session_required'},401);
 const client=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser();
 if(error||!data.user)return reply({code:'invalid_session'},401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const profile=await admin.from('profiles').select('platform_role,status').eq('id',data.user.id).maybeSingle();
 const roles=['admin','admin_ti','administrador','administrador_nacional'];
 if(profile.error||profile.data?.status!=='active'||!roles.includes(String(profile.data.platform_role).toLowerCase())||!roles.includes(String(data.user.app_metadata?.platform_role).toLowerCase()))return reply({code:'admin_required'},403);
 const target=new URL(req.url).searchParams.get('path')||'';
 const expected=(allowlist as Record<string,{size:number;sha256:string}>)[target];
 if(!expected)return reply({code:'path_not_allowed'},403);
 const declared=Number(req.headers.get('content-length'));
 if(!Number.isFinite(declared)||declared!==expected.size)return reply({code:'size_mismatch'},400);
 if(req.headers.get('content-type')!=='image/jpeg')return reply({code:'invalid_content_type'},400);
 const bytes=new Uint8Array(await req.arrayBuffer());
 if(bytes.byteLength!==expected.size||bytes[0]!==255||bytes[1]!==216)return reply({code:'invalid_payload'},400);
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(digest!==expected.sha256)return reply({code:'hash_mismatch'},400);
 // A second deadline check covers uploads that finish after expiry.
 if(Date.now()>=EXPIRES_AT)return reply({code:'importer_closed'},410);
 const uploaded=await admin.storage.from('pages').upload(target,bytes,{contentType:'image/jpeg',upsert:false});
 const alreadyExists=!!uploaded.error && (String(uploaded.error.statusCode)==='409' || uploaded.error.message==='The resource already exists');
 if(uploaded.error&&!alreadyExists)return reply({code:'upload_rejected'},409);
 // A repeated request must pass the same full readback verification; never overwrite.
 const downloaded=await admin.storage.from('pages').download(target);
 if(downloaded.error||!downloaded.data)return reply({code:'verification_failed'},502);
 const actual=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await downloaded.data.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(downloaded.data.size!==expected.size||actual!==expected.sha256)return reply({code:'verification_failed'},502);
 return reply({ok:true,path:target,size:expected.size,sha256:actual,already_exists:alreadyExists},201);
});
