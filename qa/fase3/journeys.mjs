import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const db = process.argv[2];
assert.match(db || '', /^rs-fase3-/);
const info = JSON.parse(execFileSync('docker', ['inspect', db], {encoding:'utf8'}))[0];
assert.equal(info.Config.Labels['rs.fase3'], 'synthetic');
const host = Object.values(info.NetworkSettings.Networks)[0].IPAddress;
assert.match(host, /^172\./);
const base = `http://${host}:3000`;
const secret = 'fase3-synthetic-jwt-secret-never-production-123456';
const id = (kind, n=1) => `${kind}0000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const roles = {1:'professor',2:'aluno',3:'secretaria',4:'professor',5:'aluno',6:'familia'};
function token(n, includeEmail=true, subject=id(0,n)) {
  const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url');
  const data = `${b64({alg:'HS256',typ:'JWT'})}.${b64({sub:subject,...(includeEmail===true?{email:`synthetic-${n}@example.invalid`}:typeof includeEmail==='string'?{email:includeEmail}:{}),role:'authenticated',app_metadata:{platform_role:roles[n],question_bank_role:roles[n]},exp:Math.floor(Date.now()/1000)+3600})}`;
  return `${data}.${createHmac('sha256',secret).update(data).digest('base64url')}`;
}
async function request(n,path,body,method) {
  const res = await fetch(`${base}/${path}`,{method:method || (body ? 'POST':'GET'),headers:{Authorization:`Bearer ${token(n)}`,'Content-Type':'application/json',Prefer:'return=representation'},body:body ? JSON.stringify(body):undefined});
  const raw = await res.text();
  let data; try {data=JSON.parse(raw)} catch {data=raw}
  return {status:res.status,data};
}
async function rpc(n,name,body={}) {const r=await request(n,`rpc/${name}`,body);assert.ok(r.status<300,`${name}: ${JSON.stringify(r)}`);return r.data;}
function sql(query) {return execFileSync('docker',['exec','-i',db,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],{input:query,encoding:'utf8'}).trim();}
const results=[];
async function test(name,fn) {try {await fn();results.push({name,status:'PASS'});console.log(`PASS ${name}`)}catch(error){results.push({name,status:'FAIL',error:error.message});console.error(`FAIL ${name}: ${error.message}`)}}
const draft={p_school_id:id(1),p_communication_type:'notice',p_audience_type:'class',p_title:'SYNTHETIC NOTICE',p_body:'Fictional classroom notice',p_class_id:id(3)};
let communication,delivery;
await test('communication: publish, recipient, unread, idempotent read, teacher return',async()=>{
  const pub=await rpc(1,'publish_communication',draft); communication=pub.communication_id;assert.equal(pub.deliveries_created,1);
  const inbox=await rpc(2,'communication_get_inbox');assert.equal(inbox.length,1);assert.equal(inbox[0].communication_id,communication);assert.equal(inbox[0].read_at,null);delivery=inbox[0].delivery_id;
  assert.equal((await rpc(2,'communication_mark_read',{p_delivery_id:delivery})).changed,true);
  assert.equal((await rpc(2,'communication_mark_read',{p_delivery_id:delivery})).changed,false);
  const summary=(await rpc(1,'communication_list_delivery_summaries')).find(x=>x.communication_id===communication);
  assert.equal(summary.read_count,1);assert.equal(summary.unread_count,0);
});
await test('communication: school B cannot receive/read/manage school A delivery',async()=>{
  assert.ok(delivery);assert.equal((await rpc(5,'communication_get_inbox')).length,0);
  assert.equal((await request(5,'rpc/communication_mark_read',{p_delivery_id:delivery})).status,403);
  assert.equal((await request(4,'rpc/publish_communication',draft)).status,403);
  assert.equal((await rpc(4,'communication_list_delivery_summaries')).length,0);
});
await test('communication: direct editing is blocked by existing ACL (no edit RPC)',async()=>{
  assert.ok(communication);const update=await request(1,`communications?id=eq.${communication}`,{body:'SYNTHETIC EDIT'},'PATCH');assert.equal(update.status,403,JSON.stringify(update));assert.match(update.data.message,/permission denied for table communications/);
  assert.equal((await rpc(2,'communication_get_inbox'))[0].body,draft.p_body);
});
await test('communication: archive, republish without duplicate, soft delete',async()=>{
  assert.ok(communication);await rpc(3,'secretaria_set_communication_status',{p_communication_id:communication,p_to_status:'archived'});
  assert.equal((await rpc(2,'communication_get_inbox')).length,0);
  await rpc(3,'secretaria_set_communication_status',{p_communication_id:communication,p_to_status:'published'});
  const inbox=await rpc(2,'communication_get_inbox');assert.equal(inbox.length,1);assert.equal(inbox[0].delivery_id,delivery);
  await rpc(3,'secretaria_delete_communication',{p_communication_id:communication});assert.equal((await rpc(2,'communication_get_inbox')).length,0);
});
await test('communication: expired/draft do not deliver; individual validates school',async()=>{
  assert.equal((await rpc(1,'publish_communication',{...draft,p_expires_at:'2000-01-01T00:00:00Z'})).deliveries_created,0);
  assert.equal((await rpc(1,'publish_communication',{...draft,p_status:'draft'})).deliveries_created,0);
  assert.equal((await request(1,'rpc/publish_communication',{...draft,p_audience_type:'student',p_student_id:id(4,2)})).status,403);
  assert.equal((await rpc(2,'communication_get_inbox')).length,0);
});
await test('assessment: reproduce ambiguous class embedding (HTTP 300 / PGRST201)',async()=>{
  const r=await request(1,'assessment_assignments?select=id,classes(nome)');assert.equal(r.status,300);assert.equal(r.data.code,'PGRST201');
});
await test('content: teacher discovers authorized question; school B has no entitlement',async()=>{
 const payload=await rpc(1,'content_resolve_question_details_for_user',{p_context:{school_id:id(1),class_id:id(3),content_type:'QUESTION'}});
 assert.equal(payload.status,'PASS',JSON.stringify(payload));assert.equal(payload.items.length,1,JSON.stringify(payload));
 const other=await rpc(4,'content_resolve_question_details_for_user',{p_context:{school_id:id(1,2),class_id:id(3,2),content_type:'QUESTION'}});assert.equal(other.items.length,0);
});
// Execute the actual web adapter method in isolation against the local HTTP API.
const webSource=readFileSync('app-pages.js','utf8');
const webStart=webSource.lastIndexOf('async createAssessmentFromBank(payload) {');
const webEnd=webSource.indexOf('async replaceAssessmentItems(',webStart);
assert.ok(webStart>0 && webEnd>webStart);
const webAdapter=new Function('client','resolveSupabaseUserContext','allowedAssessmentRoles','mapAssessmentFromSupabase',`return ({${webSource.slice(webStart,webEnd)}})`)(
  ()=>({request:async(path,query,options)=>{const r=await request(1,path,JSON.parse(options.body));assert.ok(r.status<300,JSON.stringify(r));return r.data;}}),
  async()=>({userId:id(0,1),role:'professor'}),['professor'],x=>x
);
await test('web: builder adapter serializes named RPC argument',async()=>{
  const assessment=await webAdapter.createAssessmentFromBank({title:'SYNTHETIC WEB ASSEMBLY',questions:[{question_id:id(7),points:1}]});assert.ok(assessment.id);
});
let assignment,attempt,assessmentId;
await test('assessment: assemble approved question and publish to teacher class',async()=>{
  const assembled=await rpc(1,'avalia_plus_create_assessment_from_bank',{p_payload:{title:'SYNTHETIC ASSESSMENT',school_id:id(1),class_id:id(3),component:'Matemática',school_year:'5',questions:[{question_id:id(7),points:1}]}});
  assessmentId=assembled.assessment?.id || assembled.id;
  assert.ok(assessmentId,JSON.stringify(assembled));
  const published=await rpc(1,'teacher_schedule_assessment_application_v2',{p_assessment_id:assessmentId,p_target_type:'class',p_class_id:id(3)});
  assignment=published.assignment.id;
  assert.equal((await request(4,'rpc/teacher_schedule_assessment_application_v2',{p_assessment_id:assessmentId,p_target_type:'class',p_class_id:id(3)})).status,403);
});
await test('assessment: student receives, starts, answers, submits; teacher results',async()=>{
  assert.ok(assignment);
  const inbox=await rpc(2,'student_list_assessment_assignments');assert.equal(inbox.assignments.length,1);
  const started=await rpc(2,'student_start_assessment_attempt_v2',{p_assignment_id:assignment});attempt=started.attempt.id;
  await rpc(2,'student_save_assessment_response_v2',{p_attempt_id:attempt,p_question_id:id(7),p_selected_alternative_id:id(8,2),p_autosave_sequence:1});
  await rpc(2,'student_submit_assessment_attempt_v2',{p_attempt_id:attempt});
  const results=await rpc(1,'teacher_get_assessment_class_results',{p_assignment_id:assignment});
  assert.equal(results.summary.completed_students,1,JSON.stringify(results));assert.equal(results.summary.average_percentage,100);
});
await test('assessment: other school cannot list/start/respond/read results',async()=>{
  assert.ok(assignment);assert.ok(attempt);
  assert.equal((await rpc(5,'student_list_assessment_assignments')).assignments.length,0);
  assert.equal((await request(5,'rpc/student_start_assessment_attempt_v2',{p_assignment_id:assignment})).status,403);
  assert.equal((await request(5,'rpc/student_save_assessment_response_v2',{p_attempt_id:attempt,p_question_id:id(7),p_selected_alternative_id:id(8,2)})).status,403);
  assert.equal((await request(4,'rpc/teacher_get_assessment_class_results',{p_assignment_id:assignment})).status,403);
});
await test('SECURITY BLOCKER: school without content entitlement cannot assemble that question',async()=>{
 const denied=await request(4,'rpc/avalia_plus_create_assessment_from_bank',{p_payload:{title:'SYNTHETIC UNAUTHORIZED QUESTION',school_id:id(1,2),class_id:id(3,2),questions:[{question_id:id(7),points:1}]}});
 assert.ok(denied.status>=400,'Unauthorized synthetic school assembled a question excluded by its content resolver (HTTP '+denied.status+')');
});
const assembly=(school=id(1),classId=id(3),question=id(7))=>({p_payload:{title:'SYNTHETIC SECURITY CASE',school_id:school,class_id:classId,questions:[{question_id:question,points:1}]}});
async function mustDeny(n,name,body){const r=await request(n,'rpc/'+name,body);assert.ok(r.status>=400 && r.status<500,JSON.stringify(r));return r;}
await test('security: null question, unknown question and wrong school/class are denied atomically',async()=>{
 const count=()=>sql('select count(*) from public.assessments;');const before=count();
 await mustDeny(1,'avalia_plus_create_assessment_from_bank',assembly(id(1),id(3),null));
 await mustDeny(1,'avalia_plus_create_assessment_from_bank',assembly(id(1),id(3),id(7,99)));
 await mustDeny(1,'avalia_plus_create_assessment_from_bank',assembly(id(1,2),id(3,2)));
 await mustDeny(1,'avalia_plus_create_assessment_from_bank',assembly(id(1),id(3,2)));
 assert.equal(count(),before);
});
await test('security: expired/suspended license blocks assembly, replacement and publication',async()=>{
 const cases=[
  ["update public.contracts set ends_at=current_date-1", "update public.contracts set ends_at=null"],
  ["update public.contracts set status='SUSPENDED'", "update public.contracts set status='ACTIVE'"],
  ["update public.tenant_product_entitlements set status='SUSPENDED'", "update public.tenant_product_entitlements set status='ACTIVE'"],
  ["update public.tenant_product_entitlements set ends_at=current_date-1", "update public.tenant_product_entitlements set ends_at=null"],
  ["update public.question_licenses set publication_allowed=false", "update public.question_licenses set publication_allowed=true"]
 ];
 for(const [suspend,restore] of cases){sql(suspend);try{
  await mustDeny(1,'avalia_plus_create_assessment_from_bank',assembly());
  await mustDeny(1,'avalia_plus_replace_assessment_items',{p_assessment_id:assessmentId,p_payload:{questions:[{question_id:id(7),points:1}]}});
  await mustDeny(1,'teacher_schedule_assessment_application_v2',{p_assessment_id:assessmentId,p_target_type:'class',p_class_id:id(3)});
  assert.equal(sql(`select count(*) from public.assessment_questions where assessment_id='${assessmentId}'`),'1');
 }finally{sql(restore)}}
});
await test('security: non-approved item cannot be assembled or published',async()=>{
 sql("update public.question_items set workflow_status='EM_REVISAO'");
 try{
  await mustDeny(1,'avalia_plus_create_assessment_from_bank',assembly());
  await mustDeny(1,'teacher_schedule_assessment_application_v2',{p_assessment_id:assessmentId,p_target_type:'class',p_class_id:id(3)});
 }finally{sql("update public.question_items set workflow_status='APROVADO'")}
});
await test('security: positive entitlement grant permits B; revocation denies again',async()=>{
 sql(`do $$ declare tenant uuid; product uuid; contract uuid; begin
 select id into tenant from public.tenants where school_id='${id(1,2)}';select id into product from public.products where code='FASE3_SYNTHETIC';
 insert into public.contracts(tenant_id,contract_ref,starts_at,status) values(tenant,'SYNTHETIC_B',current_date-1,'ACTIVE') returning id into contract;
 insert into public.contract_products(contract_id,product_id,metadata) select contract,product,cp.metadata from public.contract_products cp limit 1;
 insert into public.tenant_product_entitlements(contract_id,tenant_id,product_id,starts_at,grade_ids,metadata) select contract,tenant,product,current_date-1,e.grade_ids,e.metadata from public.tenant_product_entitlements e limit 1;
 end $$;`);
 try{
  const granted=await rpc(4,'avalia_plus_create_assessment_from_bank',assembly(id(1,2),id(3,2)));assert.ok(granted.assessment.id);
  await mustDeny(4,'teacher_schedule_assessment_application_v2',{p_assessment_id:assessmentId,p_target_type:'class',p_class_id:id(3,2)});
  sql("update public.contracts set status='SUSPENDED' where contract_ref='SYNTHETIC_B'");
  await mustDeny(4,'avalia_plus_create_assessment_from_bank',assembly(id(1,2),id(3,2)));
 }finally{sql("update public.contracts set status='SUSPENDED' where contract_ref='SYNTHETIC_B'")}
});
// Import the actual mobile data service. Only rewrite the local Supabase gateway prefix.
process.env.EXPO_PUBLIC_SUPABASE_URL=base;
process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY='synthetic-publishable-key';
const nativeFetch=globalThis.fetch;
globalThis.fetch=(url,opts)=>{assert.ok(String(url).startsWith(base+'/rest/v1/'));return nativeFetch(String(url).replace(base+'/rest/v1/',base+'/'),opts)};
const mobile=await import('../../mobile/src/services/library.ts');
await test('mobile: teacher assignment query resolves real PostgREST relationships',async()=>{
  const rows=await mobile.getTeacherAssessmentAssignments({accessToken:token(1),userId:id(0,1)});assert.equal(rows.length,1);assert.equal(rows[0].id,assignment);assert.equal(rows[0].className,'SYNTHETIC CLASS 1');
});
await test('mobile: teacher communication publish/summary use same canonical delivery',async()=>{
 const session={accessToken:token(1),userId:id(0,1)};
 await mobile.publishTeacherCommunication(session,{schoolId:id(1),classId:id(3),audienceType:'class',title:'SYNTHETIC MOBILE NOTICE',body:'From actual mobile adapter'});
 const summaries=await mobile.getTeacherCommunicationSummaries(session);
 const sent=summaries.find(x=>x.title==='SYNTHETIC MOBILE NOTICE');assert.ok(sent);assert.equal(sent.deliveredCount,1);assert.equal(sent.unreadCount,1);
});
globalThis.fetch=nativeFetch;
await test('SECURITY BLOCKER: missing email must not resolve another student',async()=>{
 const response=await nativeFetch(`${base}/rpc/avalia_current_student_id`,{method:'POST',headers:{Authorization:`Bearer ${token(5,false)}`,'Content-Type':'application/json'},body:'{}'});
 const selected=await response.json();assert.equal(selected,id(4,2),'Missing-email JWT resolved wrong synthetic student: '+selected);
});
await test('security: missing/empty email cannot read, start or act as another student',async()=>{
 const call=async(n,name,body={})=>{const res=await nativeFetch(`${base}/rpc/${name}`,{method:'POST',headers:{Authorization:`Bearer ${token(n,false)}`,'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:res.status,data:await res.json()}};
 assert.equal((await call(5,'avalia_current_student_id')).data,id(4,2));
 assert.equal((await call(2,'avalia_current_student_id')).data,id(4));
 assert.equal((await call(6,'avalia_current_student_id')).data,null);
 assert.equal((await call(5,'student_list_assessment_assignments')).data.assignments.length,0);
 assert.equal((await call(5,'student_start_assessment_attempt_v2',{p_assignment_id:assignment})).status,403);
 assert.equal((await call(5,'avalia_student_can_access_assignment',{p_assignment_id:assignment,p_student_id:id(4)})).data,false);
 assert.equal(await rpc(2,'avalia_student_can_access_assignment',{p_assignment_id:null,p_student_id:id(4)}),false);
 assert.equal(await rpc(2,'avalia_student_can_access_assignment',{p_assignment_id:assignment,p_student_id:null}),false);
});
await test('security: empty email, mismatched email and null subject do not bypass identity',async()=>{
 for(const email of ['', 'synthetic-2@example.invalid']){
  const res=await nativeFetch(`${base}/rpc/avalia_current_student_id`,{method:'POST',headers:{Authorization:`Bearer ${token(5,email)}`,'Content-Type':'application/json'},body:'{}'});
  assert.equal(await res.json(),id(4,2));
 }
 const res=await nativeFetch(`${base}/rpc/avalia_current_student_id`,{method:'POST',headers:{Authorization:`Bearer ${token(5,false,null)}`,'Content-Type':'application/json'},body:'{}'});
 assert.equal(await res.json(),null);
});
await test('security: ambiguous active user binding fails closed, never falls back to email',async()=>{
 sql(`update public.students set user_id='${id(0,2)}' where id='${id(4,2)}'`);
 try{
  assert.equal(await rpc(2,'avalia_current_student_id'),null);
  assert.equal(await rpc(2,'avalia_student_can_access_assignment',{p_assignment_id:assignment,p_student_id:id(4)}),false);
 }finally{sql(`update public.students set user_id='${id(0,5)}' where id='${id(4,2)}'`)}
});
await test('security: public ACLs preserved and new helpers have no app EXECUTE grants',async()=>{
 assert.equal(sql("select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='school_category_private' and p.proname like 'assessment_%' and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('service_role',p.oid,'EXECUTE'));"),'0');
 for(const name of ['avalia_current_student_id','avalia_student_can_access_assignment']){
  const actual=sql(`select proacl::text from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname='${name}'`);
  assert.equal(actual,'{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}');
 }
});
await test('assessment: owner deletes unassigned draft through REST cascade; assigned history cannot be deleted',async()=>{
 const draft=await rpc(1,'avalia_plus_create_assessment_from_bank',assembly());
 const aid=draft.assessment.id;
 assert.equal(sql(`select count(*) from public.assessment_questions where assessment_id='${aid}'`),'1');
 const removed=await request(1,`assessments?id=eq.${aid}`,undefined,'DELETE');
 assert.equal(removed.status,200,JSON.stringify(removed));
 assert.equal(sql(`select count(*) from public.assessment_questions where assessment_id='${aid}'`),'0');
 const before=sql(`select jsonb_agg(to_jsonb(q))::text from public.assessment_questions q where assessment_id='${assessmentId}'`);
 const denied=await request(1,`assessments?id=eq.${assessmentId}`,undefined,'DELETE');
 assert.equal(denied.status,403,JSON.stringify(denied));
 assert.equal(sql(`select jsonb_agg(to_jsonb(q))::text from public.assessment_questions q where assessment_id='${assessmentId}'`),before);
 assert.equal((await rpc(1,'teacher_get_assessment_class_results',{p_assignment_id:assignment})).summary.average_percentage,100);
});
await test('security: two teaching years cannot replace an assigned snapshot with other-year content',async()=>{
 sql(`insert into public.classes(id,school_id,teacher_id,nome,school_year,ano_escolar) values('${id(3,3)}','${id(1)}','${id(2)}','SYNTHETIC YEAR FOUR','4_ANO','4_ANO');
 insert into public.class_teacher_memberships(class_id,teacher_id) values('${id(3,3)}','${id(2)}');
 insert into public.question_items(id,code,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status)
 select '${id(7,2)}','FASE3-SYNTHETIC-002','Synthetic year four',component,stage,'4',question_type,'Synthetic other-year question',correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status from public.question_items where id='${id(7)}';
 do $$ declare g uuid; seg uuid; m uuid; ci uuid; begin
 select id,segment_id into strict g,seg from public.content_grades where code='4_ANO';
 select id into m from public.content_modules where code='FASE3_SYNTHETIC';
 update public.contract_products set metadata=jsonb_set(metadata,'{authorized_grade_ids}',(metadata->'authorized_grade_ids')||to_jsonb(g));
 update public.tenant_product_entitlements set grade_ids=array_append(grade_ids,g),metadata=jsonb_set(metadata,'{category_rules}',(metadata->'category_rules')||jsonb_build_array(jsonb_build_object('module_id',m,'content_type','QUESTION','grade_id',g,'kind','STANDARD'))) where tenant_id=(select id from public.tenants where school_id='${id(1)}');
 insert into public.content_items(content_type,segment_id,grade_id,title,editorial_status,published_at) values('QUESTION',seg,g,'Synthetic year four','PUBLISHED',now()) returning id into ci;
 insert into public.content_question_items(content_item_id,question_item_id) values(ci,'${id(7,2)}');end $$;`);
 const resolved=await rpc(1,'content_resolve_question_details_for_user',{p_context:{school_id:id(1),class_id:id(3),content_type:'QUESTION'}});
 assert.ok(!resolved.items.some(x=>x.question_item_id===id(7,2)));
 const draft=await rpc(1,'avalia_plus_create_assessment_from_bank',assembly(id(1),null));
 const aid=draft.assessment.id;
 assert.equal(sql(`select class_id is null from public.assessments where id='${aid}'`),'t');
 const replace={p_assessment_id:aid,p_payload:{questions:[{question_id:id(7,2),points:1}]}};
 // Both years are authorized to this teacher at school scope before assignment.
 await rpc(1,'avalia_plus_replace_assessment_items',replace);
 await rpc(1,'avalia_plus_replace_assessment_items',{...replace,p_payload:{questions:[{question_id:id(7),points:1}]}});
 const pub=await rpc(1,'teacher_schedule_assessment_application_v2',{p_assessment_id:aid,p_target_type:'class',p_class_id:id(3)});
 const snapshot=()=>sql(`select jsonb_agg(to_jsonb(q) order by id)::text from public.assessment_questions q where assessment_id='${aid}'`);
 const original=snapshot();
 const denial=await mustDeny(1,'avalia_plus_replace_assessment_items',replace);
 assert.match(denial.data.message,/ASSESSMENT_ASSIGNED_CONTENT_IMMUTABLE/);
 assert.equal(snapshot(),original);
 // Even changing only points, deleting, or moving an assigned row must fail.
 for(const mutation of [`update public.assessment_questions set points=2 where assessment_id='${aid}'`,`delete from public.assessment_questions where assessment_id='${aid}'`]){
  assert.throws(()=>sql(mutation),/ASSESSMENT_ASSIGNED_CONTENT_IMMUTABLE/);
 }
 sql(`update public.assessment_assignments set status='closed' where id='${pub.assignment.id}'`);
 await mustDeny(1,'avalia_plus_replace_assessment_items',replace);
 assert.equal(snapshot(),original);
 // Race publication against replacement on separate HTTP connections. Exactly
 // one may succeed; a published assignment must still contain year-five items.
 for(let n=0;n<4;n++){
  const candidate=await rpc(1,'avalia_plus_create_assessment_from_bank',assembly(id(1),null));
  const candidateId=candidate.assessment.id;
  const [publication,replacement]=await Promise.all([
   request(1,'rpc/teacher_schedule_assessment_application_v2',{p_assessment_id:candidateId,p_target_type:'class',p_class_id:id(3)}),
   request(1,'rpc/avalia_plus_replace_assessment_items',{...replace,p_assessment_id:candidateId})
  ]);
  assert.ok((publication.status<300 && replacement.status===403)||(replacement.status<300 && publication.status===403),JSON.stringify({publication,replacement}));
  assert.equal(sql(`select count(*) from public.assessment_assignments aa join public.assessment_questions aq on aq.assessment_id=aa.assessment_id where aa.assessment_id='${candidateId}' and aq.question_id='${id(7,2)}'`),'0');
 }
 // Previously submitted student's result remains intact.
 assert.equal((await rpc(1,'teacher_get_assessment_class_results',{p_assignment_id:assignment})).summary.average_percentage,100);
});

writeFileSync(resolve(process.argv.includes('--baseline')?'qa/fase3/results-baseline.json':'qa/fase3/results.json'),JSON.stringify({baseCommit:execFileSync('git',['merge-base','HEAD','origin/main'],{encoding:'utf8'}).trim(),scope:'Isolated PostgreSQL + PostgREST RPC/data service integration; not browser/native or production validation',results},null,2)+'\n');
if(results.some(x=>x.status==='FAIL')) process.exitCode=1;
