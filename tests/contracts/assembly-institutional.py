"""Synthetic-only SQL regression against the full contract/category/FASE3 database."""
from database import sql,rpc,assert_eq,ADMIN
import json,copy
T='00000000-0000-0000-0000-000000000001';OTHER='00000000-0000-0000-0000-000000000004';STUDENT='00000000-0000-0000-0000-000000000002'
S='10000000-0000-0000-0000-000000000001';C='30000000-0000-0000-0000-000000000001';B='10000000-0000-0000-0000-000000000002';CB='30000000-0000-0000-0000-000000000002';Q='70000000-0000-0000-0000-000000000001';Q2='70000000-0000-0000-0000-000000000002'
# Match institutional import: profile_id, no legacy user_id; class grade stored separately from academic year.
sql(f"update teachers set user_id=null where profile_id='{T}';update classes set school_year='2026',ano_escolar='5º Ano' where id='{C}'",role='postgres')
sql(f"""insert into question_items select (jsonb_populate_record(null::question_items,to_jsonb(q)||jsonb_build_object('id','{Q2}','code','SYN-Q2'))).* from question_items q where id='{Q}';
insert into content_items select (jsonb_populate_record(null::content_items,to_jsonb(c)||jsonb_build_object('id','80000000-0000-0000-0000-000000000002','title','SYN Q2'))).* from content_items c join content_question_items m on m.content_item_id=c.id where m.question_item_id='{Q}';
insert into content_question_items(content_item_id,question_item_id) values('80000000-0000-0000-0000-000000000002','{Q2}');""",role='postgres')
payload={'title':'SYN PR12','description':'','instructions':'','class_name':None,'application_date':'2026-10-11','component':'Matemática','school_year':'5','cover_template':'Raízes e Saberes - padrao','questions':[{'question_id':Q,'position':1,'points':1},{'question_id':Q2,'position':2,'points':1}],'booklets':[{'code':'A','title':'Caderno A','position':1,'questions':[{'question_id':Q,'position':1},{'question_id':Q2,'position':2}]}]}
def create(p=payload,actor=T,**kwargs):return rpc('avalia_plus_create_assessment_from_bank',[p],actor=actor,**kwargs)
def replace(a,p=payload,actor=T,**kwargs):return rpc('avalia_plus_replace_assessment_items',[a,p],actor=actor,**kwargs)
def count():return sql('select count(*) from assessments',role='postgres')
a=create()['assessment'];aid=a['id'];assert_eq(a['owner_user_id'],T);assert_eq(a['owner_role'],'professor');assert_eq(a['school_id'],S);assert_eq(a['class_id'],None)
assert_eq(sql(f"select count(*) from assessment_questions where assessment_id='{aid}'",role='postgres'),'2')
updated=replace(aid,{**payload,'title':'SYN PR12 updated'})['assessment'];assert_eq(updated['owner_role'],'professor');assert_eq(updated['title'],'SYN PR12 updated')
print('PASS PR12 two-question payload without legacy claims: owner/school persisted, replace succeeds')
assert_eq(create(question_bank_role='professor')['assessment']['owner_role'],'professor')
create(actor=STUDENT,question_bank_role='professor',error='ASSESSMENT_TEACHER_CONTEXT_REQUIRED')
create(actor=STUDENT,error='UNAUTHORIZED_ASSESSMENT_ASSEMBLY')
replace(aid,actor=OTHER,error='UNAUTHORIZED_ASSESSMENT_ASSEMBLY')
create({**payload,'school_id':B},error='UNAUTHORIZED_SCHOOL_CONTEXT')
create({**payload,'class_id':CB},error='UNAUTHORIZED_CLASS_CONTEXT')
create(actor=OTHER,error='ASSESSMENT_CONTENT_ACCESS_DENIED')
print('PASS legacy teacher parity; forged professor without membership, nonteacher, other owner/school/class/category denied')
for mutation,restore,err in [
 (f"update profiles set platform_role='aluno' where id='{T}'",f"update profiles set platform_role='professor' where id='{T}'",'ASSESSMENT_TEACHER_CONTEXT_REQUIRED'),
 (f"update teachers set status='inactive' where profile_id='{T}'",f"update teachers set status='active' where profile_id='{T}'",'ASSESSMENT_TEACHER_CONTEXT_REQUIRED'),
 (f"update profiles set status='inactive' where id='{T}'",f"update profiles set status='active' where id='{T}'",'ACTIVE_PROFILE_REQUIRED'),
 (f"update class_teacher_memberships set status='inactive' where class_id='{C}'",f"update class_teacher_memberships set status='active' where class_id='{C}'",'ASSESSMENT_TEACHER_CONTEXT_REQUIRED'),
 (f"update schools set status='inactive' where id='{S}'",f"update schools set status='active' where id='{S}'",'ACTIVE_SCHOOL_REQUIRED'),
 ("update question_licenses set publication_allowed=false where id='50000000-0000-0000-0000-000000000001'","update question_licenses set publication_allowed=true where id='50000000-0000-0000-0000-000000000001'",'ASSESSMENT_QUESTION_NOT_APPROVED'),
 ("update tenant_product_entitlements set status='SUSPENDED' where contract_id in(select id from contracts where contract_ref='FASE3_SYNTHETIC')","update tenant_product_entitlements set status='ACTIVE' where contract_id in(select id from contracts where contract_ref='FASE3_SYNTHETIC')",'ASSESSMENT_CONTENT_ACCESS_DENIED')]:
 sql(mutation,role='postgres');before=count();create(error=err);replace(aid,error=err);assert_eq(count(),before);sql(restore,role='postgres')
 assert_eq(sql(f"select title from assessments where id='{aid}'",role='postgres'),'SYN PR12 updated')
 print('PASS create/replace fail atomically: '+err)
# Missing license is impossible under the existing NOT NULL/FK constraints; neither is relaxed.
sql(f"update question_items set license_id=null where id='{Q}'",role='postgres',error='violates not-null constraint')
print('PASS absent license rejected by unchanged schema constraint; revoked license denied by content guard')
admin=create(actor=ADMIN,question_bank_role='admin')['assessment'];assert_eq(admin['owner_role'],'admin');replace(admin['id'],actor=ADMIN,question_bank_role='admin')
print('PASS authorized legacy administrator create/replace preserved')
assignment=json.loads(sql(f"select public.teacher_schedule_assessment_application_v2(p_assessment_id=>'{aid}',p_target_type=>'class',p_class_id=>'{C}')",actor=T))
assert assignment['assignment']['id'];replace(aid,error='ASSESSMENT_ASSIGNED_CONTENT_IMMUTABLE')
print('PASS subsequent institutional publication; assigned content remains immutable')
print('PASS two-function scope; relation ACL/RLS/triggers and all other catalog functions unchanged (runner asserts)')
# Independently verify the generated after-hashes against PostgreSQL's stored bodies.
expected=json.load(open('qa/teacher-content/assembly-production-after.json'))['functions']
for name in ['avalia_plus_create_assessment_from_bank(jsonb)','avalia_plus_replace_assessment_items(uuid,jsonb)']:
 assert_eq(sql(f"select md5(prosrc) from pg_proc where oid='public.{name}'::regprocedure",role='postgres'),expected[name]['body_md5'])
print('PASS installation readback hashes equal PostgreSQL stored function bodies')
