// Explicit local PostgreSQL contract harness. No remote URLs or environment credentials.
import test,{before,after,beforeEach,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {deflateSync} from 'node:zlib';
import {validatePrivatePayloads} from '../runtime/png.mjs';
import {fixture} from '../runtime/acceptance-fixture.mjs';
const {Client}=createRequire(new URL('../runtime/package.json',import.meta.url))('pg');
const options={host:'/tmp/rs-enem04-pg',database:'postgres',user:process.env.USER};
const db=new Client(options);const sha=s=>createHash('sha256').update(s).digest('hex');
const root=new URL('../../',import.meta.url);
const migration=fs.readdirSync(new URL('supabase/migrations/',root)).find(n=>n.endsWith('_enem_worker_global_preflight.sql'));
before(async()=>db.connect());after(async()=>db.end());
beforeEach(async()=>db.query('BEGIN'));afterEach(async()=>db.query('ROLLBACK'));
function batch(){
 const f=fixture(),m=f.manifest;
 Object.assign(m.release_binding,{workflow_ref:'raizesesaberes/plataforma-digital-raizes-e-saberes/.github/workflows/enem-ingest.yml@refs/heads/service/enem-ingestion-worker',audience:'urn:rs:enem-ingest:jaesjldrbjbdmzzggxzw'});
 f.p.canonical_category={category_mode:'TRANSVERSAL',subject_id:'77777777-7777-4777-8777-777777777777',category_grade_ids:['66666666-6666-4666-8666-666666666666']};
 const p2=structuredClone(f.p),e2=structuredClone(m.items[0]);
 Object.assign(p2,{code:'ENEM-SOURCE-q_fixture2',category_request_id:'55555555-5555-4555-8555-555555555555'});
 Object.assign(p2.metadata.source_identity,{source_question_id:'q_fixture2',occurrence_id:'occ_fixture2'});p2.metadata.source_occurrence.question_number=53;
 Object.assign(e2,{ordinal:2,code:p2.code,request_id:p2.category_request_id,source_question_id:'q_fixture2',occurrence_id:'occ_fixture2',number:53});
 m.items.push(e2);return {m,p:[f.p,p2]};
}
async function seed(f){
 const {m,p}=f;
 await db.query("INSERT INTO question_licenses VALUES($1,true);",[p[0].license_id]);
 await db.query("INSERT INTO question_sources VALUES($1,$2,'OFICIAL_INEP_ENEM')",[p[0].source_id,p[0].license_id]);
 await db.query("INSERT INTO content_subjects VALUES($1,'active')",[p[0].canonical_category.subject_id]);
 const rawPayloads=p.map(JSON.stringify);rawPayloads.forEach((s,i)=>m.items[i].sha256=sha(s));
 const raw=JSON.stringify(m),digest=sha(raw),b=m.release_binding;
 await db.query('INSERT INTO enem_ingestion_private.releases VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,clock_timestamp()+interval \'1 hour\')',[digest,raw,b.commit_sha,b.workflow_sha,b.ref,b.workflow_ref,b.audience,b.approval_reference]);
 for(let i=0;i<p.length;i++){const e=m.items[i];await db.query('INSERT INTO enem_ingestion_private.payloads VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[digest,i+1,e.code,e.source_question_id,e.occurrence_id,e.request_id,e.sha256,rawPayloads[i]]);}
 f.digest=digest;f.verified={repository_id:'1297887230',commit:b.commit_sha,workflow_sha:b.workflow_sha,ref:b.ref,run_id:'123',run_attempt:'1',jti:'synthetic-local-jti',expires_at:String(Math.floor(Date.now()/1000)+300)};
 return f;
}
async function snapshot(){return JSON.stringify((await db.query(`SELECT jsonb_build_object(
 'questions',(select coalesce(jsonb_agg(to_jsonb(q)),'[]') from question_items q),
 'receipts',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from enem_ingestion_private.receipts r),
 'runs',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from enem_ingestion_private.runs r),
 'lease',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from enem_ingestion_private.lease r),
 'progress',(select coalesce(jsonb_agg(to_jsonb(r)),'[]') from enem_ingestion_private.progress r)) AS state`)).rows[0]);}
async function denied(f,expected,kind='material'){
 const before=await snapshot();await db.query('SAVEPOINT rejection');
 await assert.rejects(db.query(kind==='material'?'SELECT public.enem_ingest_material($1)':kind==='item'?'SELECT enem_ingestion_private.execute_one($1,$2,1)':'SELECT public.enem_ingest_acquire($1,$2)',kind==='material'?[f.digest]:[f.digest,f.verified]),expected);
 await db.query('ROLLBACK TO SAVEPOINT rejection');assert.equal(await snapshot(),before);
}
test('read-only global material validates whole synthetic batch without runs, lease or receipts',async()=>{
 const f=await seed(batch()),before=await snapshot();
 const r=(await db.query('SELECT public.enem_ingest_material($1) value',[f.digest])).rows[0].value;
 assert.equal(r.contract,'enem-global-preflight-v1');assert.equal(r.state,'READY');assert.equal(r.material.length,2);assert.equal(await snapshot(),before);
});
test('runtime remains NOLOGIN and effective ACLs are not expanded',async()=>{
 const r=(await db.query("SELECT rolcanlogin,has_function_privilege('enem_ingest_runtime','enem_ingestion_private.assert_global_preflight(text,jsonb)','EXECUTE') helper,has_function_privilege('enem_ingest_runtime','public.enem_ingest_material(text)','EXECUTE') core,has_function_privilege('enem_ingest_runtime','enem_ingestion_api.material(text)','EXECUTE') api FROM pg_roles WHERE rolname='enem_ingest_runtime'")).rows[0];
 assert.deepEqual(r,{rolcanlogin:false,helper:false,core:false,api:true});
 await assert.rejects(db.query("SELECT enem_ingestion_api.material(repeat('0',64))"),/INGEST_LOGIN_REQUIRED/);
});
for(const [name,mutate,reason] of [
 ['unapproved manifest',f=>f.m.publication_authorized=false,/PUBLICATION_APPROVAL_REQUIRED/],
 ['human evidence missing',f=>f.m.items[1].human_review.status='PENDING',/HUMAN_APPROVAL_REQUIRED/],
 ['rights evidence pending',f=>f.m.items[1].rights='PENDING',/PAYLOAD_BINDING/],
 ['missing source evidence',f=>f.m.items[1].source_license_validation.reference='',/SOURCE_LICENSE_EVIDENCE_REQUIRED/],
 ['official occurrence mismatch',f=>f.p[1].metadata.source_occurrence.question_number=63,/OFFICIAL_IDENTITY_INVALID/],
 ['request mismatch',f=>f.p[1].category_request_id='88888888-8888-4888-8888-888888888888',/PAYLOAD_BINDING/],
 ['key mismatch',f=>f.p[1].alternatives[0].is_correct=true,/ENEM_KEY_MISMATCH|ENEM_KEY_INVALID/],
 ['image manifest mismatch',f=>f.m.items[1].images=[{sha256:'f'.repeat(64)}],/IMAGE_MANIFEST_BINDING/],
 ['bad category',f=>f.p[1].canonical_category.category_grade_ids=[],/EXPLICIT_TRANSVERSAL_GRADES_REQUIRED/],
 ['quarantine in manifest',f=>f.m.quarantined_items=[53],/PUBLICATION_APPROVAL_REQUIRED/],
 ['duplicate batch identity',f=>{f.p[1].metadata.source_identity.occurrence_id='occ_fixture';f.m.items[1].occurrence_id='occ_fixture'},/DUPLICATE_MANIFEST_IDENTITY/]
])test(name+' rejects later item before lease and all writes',async()=>{const f=batch();mutate(f);await seed(f);await denied(f,reason);await denied(f,reason,'acquire');});
test('revoked license between material and acquire is detected before runs insert',async()=>{
 const f=await seed(batch());await db.query('SELECT public.enem_ingest_material($1)',[f.digest]);await db.query('UPDATE question_licenses SET publication_allowed=false');await denied(f,/RIGHTS_GATE/,'acquire');await denied(f,/RIGHTS_GATE/,'item');
});
test('acquire refuses a stale-snapshot isolation level before writing',async()=>{
 await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');const f=await seed(batch());
 await denied(f,/READ_COMMITTED_REQUIRED/,'acquire');
});
for(const field of ['source_question_id','occurrence_id','tuple'])test('destination duplicate by '+field+' ignores differing code',async()=>{
 const f=await seed(batch()),metadata=structuredClone(f.p[0].metadata);
 if(field==='source_question_id')metadata.source_identity.occurrence_id='different';
 if(field==='occurrence_id')metadata.source_identity.source_question_id='different';
 if(field==='tuple')metadata.source_identity={source_question_id:'different',occurrence_id:'different'};
 await db.query('INSERT INTO question_items(id,code,metadata) VALUES($1,$2,$3)',['99999999-9999-4999-8999-999999999999','UNRELATED-CODE',metadata]);
 await denied(f,/PREEXISTING_IDENTITY_REQUIRES_RECONCILIATION/);await denied(f,/PREEXISTING_IDENTITY_REQUIRES_RECONCILIATION/,'acquire');
});
test('expired and disabled release, hash tampering, quarantine, and worker mismatch fail closed',async()=>{
 const f=await seed(batch());
 for(const sql of ["UPDATE enem_ingestion_private.releases SET enabled=false","UPDATE enem_ingestion_private.releases SET expires_at=clock_timestamp()-interval '1 second'","UPDATE enem_ingestion_private.payloads SET payload_text=payload_text||' '","INSERT INTO enem_ingestion_private.progress VALUES('"+f.digest+"',2,'QUARANTINED')"]){
 await db.query('SAVEPOINT mutation');await db.query(sql);await denied(f,/RELEASE_NOT_APPROVED|PAYLOAD_BINDING|BATCH_QUARANTINED/,'acquire');await db.query('ROLLBACK TO SAVEPOINT mutation');}
 f.verified.ref='refs/heads/main';await denied(f,/WORKLOAD_SCOPE/,'acquire');
});
for(const variant of ['request','official-origin'])test('duplicate collision via '+variant+' blocks acquire',async()=>{
 const f=await seed(batch()),metadata=variant==='request'?{import_request_id:f.p[0].category_request_id}:structuredClone(f.p[0].metadata);
 if(variant==='official-origin'){metadata.source_identity={source_question_id:'different',occurrence_id:'different'};metadata.source_occurrence.source_url='https://official.invalid/another-download-url';}
 await db.query('INSERT INTO question_items(id,code,metadata,source_id) VALUES($1,$2,$3,$4)',['99999999-9999-4999-8999-999999999999','DIFFERENT',metadata,f.p[0].source_id]);
 await denied(f,/PREEXISTING_IDENTITY_REQUIRES_RECONCILIATION/,'acquire');
});
test('receipt mismatch blocks whole batch and does not create a replacement',async()=>{
 const f=await seed(batch());await db.query('INSERT INTO enem_ingestion_private.receipts(digest,ordinal,question_id,request_id,payload_sha) VALUES($1,1,$2,$3,$4)',[f.digest,'99999999-9999-4999-8999-999999999999',f.p[0].category_request_id,'a'.repeat(64)]);await denied(f,/RECEIPT_DRIFT/,'acquire');
});
test('confirmed receipt resumes read-only and rejects category or alternative drift',async()=>{
 const f=await seed(batch()),p=f.p[0],id='99999999-9999-4999-8999-999999999999';
 await db.query("INSERT INTO question_items VALUES($1,$2,$3,$4,$5,$6,$7,'PUBLICADO','APROVADO','APROVADO')",[id,p.code,p.metadata,p.statement,p.correct_answer,p.source_id,p.license_id]);
 for(let i=0;i<5;i++){const a=p.alternatives[i];await db.query('INSERT INTO question_alternatives(question_id,label,body,is_correct,position) VALUES($1,$2,$3,$4,$5)',[id,a.label,a.body,a.is_correct,i+1]);}
 await db.query("INSERT INTO content_items VALUES($1,$2,$3,'PUBLISHED')",[id,p.canonical_category.subject_id,p.canonical_category]);
 await db.query('INSERT INTO content_question_items VALUES($1,$1)',[id]);
 await db.query('INSERT INTO enem_ingestion_private.receipts(digest,ordinal,question_id,request_id,payload_sha) VALUES($1,1,$2,$3,$4)',[f.digest,id,p.category_request_id,f.m.items[0].sha256]);
 const before=await snapshot();await db.query('SELECT public.enem_ingest_material($1)',[f.digest]);assert.equal(await snapshot(),before);
 await db.query('SAVEPOINT drift');await db.query("UPDATE content_items SET editorial_status='DRAFT'");await denied(f,/RECEIPT_CATEGORY_DRIFT/,'acquire');await db.query('ROLLBACK TO SAVEPOINT drift');
 await db.query("UPDATE question_alternatives SET body='changed' WHERE label='A'");await denied(f,/RECEIPT_DRIFT/,'acquire');
});
test('acquire locks exclude an external writer until transaction ends; all fixture writes roll back',async()=>{
 const f=await seed(batch());await db.query('SELECT public.enem_ingest_acquire($1,$2)',[f.digest,f.verified]);
 const other=new Client(options);await other.connect();try{await other.query("SET lock_timeout='100ms'");await assert.rejects(other.query('INSERT INTO question_items(id,code) VALUES($1,$2)',['99999999-9999-4999-8999-999999999999','OUTSIDE']),e=>e.code==='55P03');}finally{await other.end();}
 assert.equal((await db.query('SELECT count(*)::int n FROM question_items')).rows[0].n,0);
 assert.equal((await db.query('SELECT count(*)::int n FROM enem_ingestion_private.receipts')).rows[0].n,0);
});
test('old branch constraint rejects; rollback and forward migration round-trip with empty registry',async()=>{
 await db.query('SAVEPOINT oldref');await assert.rejects(db.query("INSERT INTO enem_ingestion_private.releases(digest,ref) VALUES('x','refs/heads/candidate/manifest-recovery-20261021')"),/releases_ref_check/);await db.query('ROLLBACK TO SAVEPOINT oldref');
 // Each script owns its transaction. There is no real question material in this database.
 await db.query('ROLLBACK');
 await db.query(fs.readFileSync(new URL('supabase/review/enem_worker_global_preflight.rollback.sql',root),'utf8'));
 assert.equal((await db.query("SELECT to_regprocedure('enem_ingestion_private.assert_global_preflight(text,jsonb)') helper")).rows[0].helper,null);
 await db.query(fs.readFileSync(new URL('supabase/migrations/'+migration,root),'utf8'));
 assert.equal((await db.query('SELECT count(*)::int n FROM enem_ingestion_private.releases')).rows[0].n,0);
});

function png(){const w=2,h=2,stride=w*4,scan=Buffer.alloc((stride+1)*h);let seed=7;for(let y=0;y<h;y++)for(let x=1;x<=stride;x++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;scan[y*(stride+1)+x]=seed&255;}const crc=b=>{let c=0xffffffff;for(const x of b){c^=x;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;};const chunk=(t,b)=>{const type=Buffer.from(t),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(b.length);c.writeUInt32BE(crc(Buffer.concat([type,b])));return Buffer.concat([n,type,b,c]);};const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;const raw=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(scan)),chunk('IEND',Buffer.alloc(0))]);const hash=sha(raw);return {path:`assets/${hash}.png`,sha256:hash,bytes:raw.length,width:w,height:h,mime:'image/png',base64:raw.toString('base64')};}
test('real PNG envelope is checked against frozen image evidence before lease',async()=>{
 const f=batch(),image=png();await validatePrivatePayloads([{text:JSON.stringify({...f.p[1],metadata:{...f.p[1].metadata,enemPilotInline:{assets:[image]}}}),sha256:sha(JSON.stringify({...f.p[1],metadata:{...f.p[1].metadata,enemPilotInline:{assets:[image]}}}))}]);
 f.p[1].metadata.enemPilotInline.assets=[image];f.m.items[1].images=[Object.fromEntries(Object.entries(image).filter(([k])=>k!=='base64'))];
 await seed(f);assert.equal((await db.query('SELECT public.enem_ingest_material($1) r',[f.digest])).rows[0].r.state,'READY');
 await db.query("UPDATE enem_ingestion_private.payloads SET payload_text=replace(payload_text,$1,$2),payload_sha=encode(extensions.digest(convert_to(replace(payload_text,$1,$2),'UTF8'),'sha256'),'hex') WHERE ordinal=2",[image.base64,'AAAA']);
 await denied(f,/PAYLOAD_BINDING/,'acquire');
});
test('material works in a PostgreSQL READ ONLY transaction',async()=>{
 const f=await seed(batch());await db.query('COMMIT');
 try{await db.query('BEGIN READ ONLY');const before=await snapshot();await db.query('SELECT public.enem_ingest_material($1)',[f.digest]);assert.equal(await snapshot(),before);}
 finally{await db.query('ROLLBACK');await db.query('BEGIN');for(const t of ['enem_ingestion_private.payloads','enem_ingestion_private.releases','question_sources','question_licenses','content_subjects'])await db.query('DELETE FROM '+t);await db.query('COMMIT');await db.query('BEGIN');}
});
