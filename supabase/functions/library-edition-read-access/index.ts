import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { deliverEdition } from '../_shared/library-edition-policy.mjs';
const headers={'Content-Type':'application/json','Access-Control-Allow-Origin':'https://www.raizesesaberes.com.br','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Cache-Control':'no-store'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({code:'method_not_allowed'},405);
 const authorization=req.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(authorization))return reply({code:'session_required'},401);
 const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
 const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
 if(!url||!anon||!secret)return reply({code:'server_misconfigured'},503);
 const user=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await user.auth.getUser();
 if(error||!data.user)return reply({code:'invalid_session'},401);
 const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const result=await deliverEdition(await req.json(),{
   authorize:async(bookId:string)=>{const r=await user.rpc('library_authorize_edition',{p_book_id:bookId});return !r.error&&r.data===true;},
   getManifest:async(bookId:string)=>{const r=await user.rpc('library_edition_manifest',{p_book_id:bookId});return r.error?null:r.data;},
   sign:async(bucket:string,path:string,ttl:number)=>{const r=await admin.storage.from(bucket).createSignedUrl(path,ttl);if(r.error||!r.data?.signedUrl)throw Error('asset_unavailable');return r.data.signedUrl;}
  });
  return reply({...result,ok:result.status===200},result.status);
 }catch{return reply({code:'request_failed'},400);}
});
