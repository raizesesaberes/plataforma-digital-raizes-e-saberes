import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {isLibraryAdministrator, deliverAdminEdition} from '../_shared/admin-library-policy.mjs';
import catalog from './catalog.json' with {type:'json'};
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://www.raizesesaberes.com.br','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(body:unknown,status:number)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({code:'method_not_allowed'},405);
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(authorization))return reply({code:'session_required'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply({code:'server_misconfigured'},503);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await userClient.auth.getUser();
 if(error||!data.user)return reply({code:'invalid_session'},401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 const profile=await admin.from('profiles').select('platform_role,status').eq('id',data.user.id).maybeSingle();
 if(profile.error||!isLibraryAdministrator(data.user,profile.data))return reply({code:'admin_required'},403);
 try{
  const raw=await req.text();if(raw.length>1024)return reply({code:'invalid_request'},400);
  const result=await deliverAdminEdition(JSON.parse(raw),{authorized:true,catalog,
   getRecord:async(id:string)=>{const r=await admin.from('content_items').select('content_type,title,metadata').eq('id',id).maybeSingle();return r.error?null:r.data;},
   sign:async(bucket:string,path:string,ttl:number)=>{const r=await admin.storage.from(bucket).createSignedUrl(path,ttl);if(r.error||!r.data?.signedUrl)throw Error('asset_unavailable');return r.data.signedUrl;}
  });
  return reply({...result,ok:result.status===200},result.status);
 }catch{return reply({code:'request_failed'},400);}
});
