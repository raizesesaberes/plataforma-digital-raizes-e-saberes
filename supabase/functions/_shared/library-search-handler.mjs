import {findOccurrences} from './library-text-search.mjs';
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'https://www.raizesesaberes.com.br','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'};
const reply=(status,body)=>new Response(JSON.stringify({...body,ok:status===200}),{status,headers});
export function createSearchHandler(deps){return async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{code:'method_not_allowed'});
 const bearer=req.headers.get('authorization')||'';
 if(!/^Bearer\s+\S+$/i.test(bearer))return reply(401,{code:'session_required'});
 try{
  // Bound request bytes before parsing, including requests without Content-Length.
  const reader=req.body?.getReader();if(!reader)return reply(400,{code:'invalid_request'});
  let chunks=[],size=0;while(true){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>2048){await reader.cancel();return reply(413,{code:'request_too_large'});}chunks.push(r.value);}
  const bytes=new Uint8Array(size);let pos=0;for(const c of chunks){bytes.set(c,pos);pos+=c.length;}
  let input;try{input=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,{code:'invalid_request'});}
  const {bookId,query,offset=0}=input||{};
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(bookId||'')||typeof query!=='string'||!query.trim()||query.length>160||!Number.isSafeInteger(offset)||offset<0)return reply(400,{code:'invalid_request'});
  const session=await deps.session(bearer);if(!session)return reply(401,{code:'invalid_session'});
  if(await session.authorize(bookId)!==true)return reply(403,{code:'edition_access_denied'});
  const manifest=await session.manifest(bookId);
  if(!Number.isSafeInteger(manifest?.pageCount)||manifest.pageCount<1)return reply(404,{code:'search_unavailable'});
  // Fixed private path only; no signed URL or complete index leaves this handler.
  const index=await deps.load('pages',`library/${bookId}/search/text-v1.json`);
  if(index?.version!=='text-v1'||index.bookId!==bookId||!Array.isArray(index.pages)||index.pages.length!==manifest.pageCount)return reply(404,{code:'search_unavailable'});
  const results=findOccurrences(index.pages,query);
  return reply(200,{total:results.length,offset,results:results.slice(offset,offset+50),searchablePages:index.pages.filter(p=>p.length).length,pageCount:index.pages.length});
 }catch{return reply(503,{code:'search_unavailable'});}
};}
