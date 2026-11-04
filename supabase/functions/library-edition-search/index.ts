import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {decodePrivateIndex} from '../_shared/library-search-index.mjs';
import indexCatalog from './index-catalog.json' with {type:'json'};
import {createSearchHandler} from '../_shared/library-search-handler.mjs';
Deno.serve(createSearchHandler({
 session:async(authorization:string)=>{
  const url=Deno.env.get('SUPABASE_URL'),anon=Deno.env.get('SUPABASE_ANON_KEY');
  if(!url||!anon)throw Error('configuration');
  const user=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await user.auth.getUser();if(error||!data.user)return null;
  return {
   authorize:async(bookId:string)=>{const r=await user.rpc('library_authorize_edition',{p_book_id:bookId});return !r.error&&r.data===true;},
   manifest:async(bookId:string)=>{const r=await user.rpc('library_edition_manifest',{p_book_id:bookId});return r.error?null:r.data;}
  };
 },
 load:async(bucket:string,path:string)=>{
  const url=Deno.env.get('SUPABASE_URL'),secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');if(!url||!secret)throw Error('configuration');
  const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const r=await admin.storage.from(bucket).download(path);if(r.error||!r.data||r.data.size>16*1024*1024)throw Error('index_unavailable');
  const bookId=path.split('/')[1];
  return decodePrivateIndex(await r.data.arrayBuffer(),(indexCatalog as Record<string,unknown>)[bookId]);
 }
}));
