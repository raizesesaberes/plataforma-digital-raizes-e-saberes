const invalid=()=>{throw Error('INVALID_INGEST_RESPONSE')};
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function expected(manifest){
 if(!manifest||manifest.version!==1||!Array.isArray(manifest.items)||!manifest.items.length||manifest.items.length>25)invalid();
 const codes=new Set(),requests=new Set();
 for(const i of manifest.items){if(!i||typeof i.code!=='string'||!i.code.startsWith('ENEM-SOURCE-q_')||!hash(i.sha256)||!uuid(i.request_id)||codes.has(i.code)||requests.has(i.request_id))invalid();codes.add(i.code);requests.add(i.request_id);}
 return manifest.items;
}
function receipt(r,item,id){if(!r||typeof r!=='object'||!uuid(id)||r.question_id!==id||r.request_id!==item.request_id||r.payload_sha!==item.sha256)invalid();}
export function validateV1(response,manifest,digest){
 const items=expected(manifest);if(!hash(digest)||!response||response.manifest!==digest||!Number.isSafeInteger(response.count)||response.count!==items.length||!Array.isArray(response.items)||response.items.length!==items.length)invalid();
 const ids=new Set(),codes=new Set();
 response.items.forEach((r,index)=>{const e=items[index];if(!r||r.code!==e.code||r.status!=='CONFIRMED'||codes.has(r.code)||ids.has(r.id))invalid();receipt(r.receipt,e,r.id);codes.add(r.code);ids.add(r.id);});
 return {manifest:digest,count:items.length,status:'CONFIRMED'};
}
const reasons=new Set(['PNG_DIMENSION_LIMIT','PNG_INTERLACE_UNSUPPORTED','PREEXISTING_IDENTITY_REQUIRES_RECONCILIATION','INVALID_SUBJECT','INVALID_CATEGORY_MODE','EXPLICIT_TRANSVERSAL_GRADES_REQUIRED','TRANSVERSAL_CANNOT_INCLUDE_INSTITUTIONAL','CREATE_READBACK','CONTENT_DRIFT','ALTERNATIVE_DRIFT']);
export function validateV2(response,manifest,digest){
 const items=expected(manifest);if(!hash(digest)||!response||response.manifest!==digest||!Array.isArray(response.items)||response.items.length!==items.length)invalid();
 const counts={CONFIRMED:0,QUARANTINED:0,PENDING:0},ordinals=new Set(),ids=new Set();
 for(const r of response.items){if(!r||!Number.isSafeInteger(r.ordinal)||r.ordinal<1||r.ordinal>items.length||ordinals.has(r.ordinal)||typeof r.state!=='string'||!Object.hasOwn(counts,r.state))invalid();const e=items[r.ordinal-1];if(r.code!==e.code)invalid();ordinals.add(r.ordinal);
  if(r.state==='CONFIRMED'){receipt(r.receipt,e,r.id);if(ids.has(r.id)||r.reason!=null)invalid();ids.add(r.id);}
  else if(r.id!=null||r.receipt!=null||(r.state==='QUARANTINED'&&!reasons.has(r.reason))||(r.state==='PENDING'&&r.reason!=null))invalid();
  counts[r.state]++;
 }
 return {manifest:digest,...counts,status:counts.CONFIRMED===items.length?'CONFIRMED':'PARTIAL'};
}
