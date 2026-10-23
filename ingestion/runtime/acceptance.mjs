// Publication admission only. No database, network, upload or editorial decisions.
import {createHash} from 'node:crypto';
import {validatePrivatePayloads} from './png.mjs';
const deny=code=>{throw Error(code)};
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const uuid=x=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(x);
const text=x=>typeof x==='string'&&x.trim().length>0&&x.length<=1000;
const sha=x=>createHash('sha256').update(x).digest('hex');
function approval(x){
 if(!x||x.status!=='APPROVED'||!text(x.reviewer)||!text(x.reference)||typeof x.reviewed_at!=='string'||!Number.isFinite(Date.parse(x.reviewed_at)))deny('HUMAN_APPROVAL_REQUIRED');
}
function unique(set,value){if(set.has(value))deny('DUPLICATE_MANIFEST_IDENTITY');set.add(value);}
export function validateApprovalManifest(raw,digest,trust=null){
 if(typeof raw!=='string'||Buffer.byteLength(raw)>65536||!hash(digest)||sha(raw)!==digest)deny('APPROVED_MANIFEST_HASH');
 let m;try{m=JSON.parse(raw)}catch{deny('APPROVED_MANIFEST_JSON')}
 if(!m||m.version!==1||m.acceptance_contract!=='helena-enem-publication-v1'||m.project_id!=='jaesjldrbjbdmzzggxzw'||m.publication_authorized!==true||!Array.isArray(m.quarantined_items)||m.quarantined_items.length||!Array.isArray(m.items)||m.items.length<1||m.items.length>25)deny('PUBLICATION_APPROVAL_REQUIRED');
 approval(m.human_approval);approval(m.rights_approval);
 const b=m.release_binding;
 if(!b||typeof b.commit_sha!=='string'||!/^[a-f0-9]{40}$/.test(b.commit_sha)||typeof b.workflow_sha!=='string'||!/^[a-f0-9]{40}$/.test(b.workflow_sha)||!text(b.ref)||!b.ref.startsWith('refs/heads/')||!text(b.workflow_ref)||!text(b.audience)||!text(b.approval_reference))deny('RELEASE_BINDING_REQUIRED');
 if(trust&&[['commit_sha','commit'],['workflow_sha','workflowSha'],['ref','ref'],['workflow_ref','workflowRef'],['audience','audience']].some(([a,c])=>b[a]!==trust[c]))deny('APPROVAL_TRUST_MISMATCH');
 const seen=Array.from({length:5},()=>new Set());
 m.items.forEach((e,index)=>{
  if(!e||e.ordinal!==index+1||!text(e.source_question_id)||!/^q_[A-Za-z0-9_-]+$/.test(e.source_question_id)||!text(e.occurrence_id)||!/^occ_[A-Za-z0-9_-]+$/.test(e.occurrence_id)||e.code!==`ENEM-SOURCE-${e.source_question_id}`||!hash(e.sha256)||!uuid(e.request_id)||!uuid(e.source_id)||!uuid(e.license_id)||!Number.isInteger(e.year)||e.year<1998||e.year>2100||!Number.isInteger(e.number)||e.number<1||!text(e.application)||!text(e.booklet)||!Object.hasOwn(e,'language')||!(e.language===null||text(e.language))||!text(e.source_url)||!e.source_url.startsWith('https://')||!['A','B','C','D','E'].includes(e.official_answer)||e.rights!=='APPROVED'||e.editorial!=='APPROVED'||e.quarantine!=='NONE'||!Array.isArray(e.images))deny('APPROVED_ITEM_REQUIRED');
  approval(e.human_review);approval(e.images_review);approval(e.answer_validation);
  if(!hash(e.answer_validation.evidence_sha256))deny('ANSWER_EVIDENCE_REQUIRED');
  const l=e.source_license_validation;
  if(!l||l.status!=='VALID'||l.publication_allowed!==true||l.source_id!==e.source_id||l.license_id!==e.license_id||!text(l.reference))deny('SOURCE_LICENSE_EVIDENCE_REQUIRED');
  for(const [i,v] of [e.source_question_id,e.occurrence_id,e.request_id,e.code,JSON.stringify([e.year,e.application,e.booklet,e.number,e.source_url])].entries())unique(seen[i],v);
  const images=new Set();
  for(const a of e.images){if(!a||!hash(a.sha256)||a.path!==`assets/${a.sha256}.png`||!Number.isInteger(a.bytes)||a.bytes<57||!Number.isInteger(a.width)||!Number.isInteger(a.height)||a.mime!=='image/png')deny('IMAGE_EVIDENCE_REQUIRED');unique(images,a.path);}
 });
 return m;
}
export function approvedManifest(catalog,digest,trust){
 if(catalog?.version!==1||!Array.isArray(catalog.releases))deny('HELENA_APPROVAL_NOT_CONFIGURED');
 const entries=catalog.releases.filter(e=>e?.manifest_sha256===digest);
 if(entries.length!==1)deny('HELENA_APPROVAL_NOT_CONFIGURED');
 return validateApprovalManifest(entries[0].manifest_text,digest,trust);
}
export async function preflightMaterial(material,manifest,cryptoImpl=crypto){
 // Entire batch is checked before acquire(), the first state-changing gateway.
 if(!Array.isArray(material)||material.length!==manifest.items.length)deny('MATERIAL_MANIFEST_COUNT');
 await validatePrivatePayloads(material,cryptoImpl);
 for(let index=0;index<material.length;index++){
  const row=material[index],e=manifest.items[index],p=JSON.parse(row.text),m=p.metadata,o=m?.source_occurrence,i=m?.source_identity;
  if(row.sha256!==e.sha256||p.code!==e.code||p.category_request_id!==e.request_id||p.source_id!==e.source_id||p.license_id!==e.license_id||i?.source_question_id!==e.source_question_id||i?.occurrence_id!==e.occurrence_id||o?.exam_year!==e.year||o?.question_number!==e.number||o?.application!==e.application||o?.booklet!==e.booklet||o?.source_url!==e.source_url||o?.question_language!==e.language||m?.enem?.examYear!==e.year||m?.enem?.language!==e.language||p.correct_answer!==e.official_answer||o?.official_answer!==e.official_answer)deny('PAYLOAD_MANIFEST_BINDING');
  if(p.question_type!=='multipla_escolha'||p.legal_classification!=='ITEM_OFICIAL_PUBLICAMENTE_LIBERADO'||m.enemPilotInline.publication_allowed!==true||o.editorial_role!=='PRINCIPAL'||o.answer_verification!=='VERIFIED_OFFICIAL'||typeof p.statement!=='string'||!p.statement.trim()||!p.canonical_category||!text(p.category_reason)||!Array.isArray(p.alternatives)||p.alternatives.length!==5||!Array.isArray(m.content?.alternatives)||m.content.alternatives.length!==5||!Array.isArray(m.content?.blocks)||!m.content.blocks.length||m.content.blocks.length>256||Buffer.byteLength(JSON.stringify(m))>900000)deny('CANONICAL_PAYLOAD_REQUIRED');
  if(m.content.blocks.some(b=>b.type==='text'&&b.value.length>100000))deny('CANONICAL_BLOCK_LIMIT');
  const assets=m.enemPilotInline.assets;
  if(assets.length!==e.images.length)deny('IMAGE_MANIFEST_BINDING');
  let bytes=0;
  for(let j=0;j<assets.length;j++){
   const a=assets[j],f=e.images[j];if(['path','sha256','bytes','width','height','mime'].some(k=>a[k]!==f[k]))deny('IMAGE_MANIFEST_BINDING');
   // Conservative admitted subset of the current DB contract. No new exception/grant.
   if(a.bytes>65536||a.width>2048||a.height>2048)deny('DB_IMAGE_POLICY_REQUIRES_REVIEW');bytes+=a.bytes;
  }
  if(bytes>524288)deny('DB_IMAGE_POLICY_REQUIRES_REVIEW');
  const paths=new Set(assets.map(a=>a.path));let correct=0;
  p.alternatives.forEach((a,j)=>{
   const b=m.content.alternatives[j];
   if(a.label!=='ABCDE'[j]||b.label!==a.label||typeof a.body!=='string'||a.body.length>100000||a.body!==b.text||typeof a.is_correct!=='boolean'||!Array.isArray(b.asset_paths)||b.asset_paths.length>16||(!a.body.trim()&&!b.asset_paths.length)||b.asset_paths.some(v=>!paths.has(v)))deny('CANONICAL_ALTERNATIVES_REQUIRED');
   if(a.is_correct){correct++;if(a.label!==p.correct_answer)deny('CANONICAL_ANSWER_MISMATCH');}
  });
  if(correct!==1)deny('CANONICAL_ANSWER_MISMATCH');
 }
 return manifest;
}
