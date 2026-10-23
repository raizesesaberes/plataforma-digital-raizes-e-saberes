import {verifyOIDC} from './oidc.mjs';
import {processMaterial} from './process-material.mjs';
import {approvedManifest,preflightMaterial} from './acceptance.mjs';
import {validateV2} from './response.mjs';
export function createHandler({rpc,verify=verifyOIDC,approvalCatalog={version:1,releases:[]}}) { return async req=>{
 try{
  if(req.method!=='POST')return new Response(null,{status:405});
  if(Number(req.headers.get('content-length')||0)>1024)throw Error('REQUEST_SIZE');
  if(!req.body)throw Error('REQUEST_BODY');const reader=req.body.getReader();let text='',size=0;const decoder=new TextDecoder();for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();throw Error('REQUEST_SIZE');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  const body=JSON.parse(text);if(Object.keys(body).sort().join(',')!=='manifest_sha256'||!/^[a-f0-9]{64}$/.test(body.manifest_sha256))throw Error('MANIFEST_REQUEST');
  const token=req.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
  if(!token)throw Error('OIDC_REQUIRED');
  // Only non-content trust metadata is returned, using an existing server-only connection.
  const trust=await rpc('enem_ingest_trust',{p_digest:body.manifest_sha256});
  const verified=await verify(token,trust);
  const manifest=approvedManifest(approvalCatalog,body.manifest_sha256,trust);
  const material=await rpc('enem_ingest_material',{p_digest:body.manifest_sha256});
  await preflightMaterial(material,manifest);
  await rpc('enem_ingest_acquire',{p_digest:body.manifest_sha256,p_verified:verified});
  await processMaterial(material,{digest:body.manifest_sha256,verified,rpc});
  const result=await rpc('enem_ingest_progress',{p_digest:body.manifest_sha256,p_verified:verified,p_finish:true});
  validateV2(result,manifest,body.manifest_sha256);
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'INGEST_DENIED_OR_UNCONFIRMED',retry:'Read receipt before retry; no token or DB error disclosed.'},{status:403,headers:{'Cache-Control':'no-store'}});}
}; }
