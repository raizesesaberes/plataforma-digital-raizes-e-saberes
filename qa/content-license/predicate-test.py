"""Actual installed resolver body; synthetic PostgreSQL data and explicit context/rule stubs.
Not an end-to-end authorization/contract/RLS test. Never accepts a remote DB URL.
"""
import subprocess, pathlib, time, json, hashlib
ROOT=pathlib.Path(__file__).resolve().parent
REPO=ROOT.parents[1]
name='rs-question-license-synthetic'
def docker(*args,input=None):
 try: return subprocess.check_output(['docker',*args],input=input,text=True,stderr=subprocess.STDOUT)
 except subprocess.CalledProcessError as e:
  if 'psql' in args: print(e.output,flush=True)
  raise
def sql(q): return docker('exec','-i',name,'psql','-U','postgres','-At','-v','ON_ERROR_STOP=1',input=q).strip()
def count(n,label):
 actual=int(sql("select count(*) from school_category_private.authorized_items('{}')"));assert actual==n,(label,actual,n);print(f'PASS {label}: {actual}',flush=True)
try:
 docker('run','-d','--name',name,'--label','rs.synthetic=ef2-predicate','-e','POSTGRES_PASSWORD=synthetic-only','postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3')
 for _ in range(100):
  try: docker('exec',name,'pg_isready','-h','127.0.0.1','-U','postgres');break
  except subprocess.CalledProcessError:time.sleep(.1)
 sql('''create schema school_category_private;create schema auth;
 create function auth.uid() returns uuid language sql as $$ select '00000000-0000-4000-8000-000000000099'::uuid $$;
 create type public.rs_content_type as enum ('QUESTION','VIDEO');
 create table content_items(id uuid primary key,title text,content_type rs_content_type,grade_id uuid,segment_id uuid,subject_id uuid,published_at timestamptz,editorial_status text,metadata jsonb,owner_scope text,owner_tenant_id uuid,owner_user_id uuid);
 create table content_question_items(content_item_id uuid,question_item_id uuid);
 create table question_items(id uuid primary key,publication_status text,curation_status text,license_id uuid,source_id uuid);
 create table question_sources(id uuid primary key,license_id uuid);
 create table question_licenses(id uuid primary key,publication_allowed boolean);
 create table content_subjects(id uuid primary key,status text);
 create table content_access_exceptions(content_item_id uuid,school_id uuid,tenant_id uuid,action text,starts_at timestamptz,ends_at timestamptz);
 create table synthetic_rules(module_id uuid,rule_grade uuid,rule_subject uuid,content_types rs_content_type[],segment_id uuid,institutional boolean);
 create function school_category_private.actor_context(jsonb) returns jsonb language sql as $$ select '{"school_id":"00000000-0000-4000-8000-000000000001","institutional":false,"grade_ids":["00000000-0000-4000-8000-000000000002"]}'::jsonb $$;
 create function school_category_private.scope_tenants(uuid) returns setof uuid language sql as $$ select '00000000-0000-4000-8000-000000000003'::uuid $$;
 create function school_category_private.active_rules(jsonb) returns setof synthetic_rules language sql as $$ select * from public.synthetic_rules $$;
 insert into synthetic_rules values('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002',null,array['QUESTION']::rs_content_type[],null,false);
 insert into question_licenses values('00000000-0000-4000-8000-000000000088',true),('00000000-0000-4000-8000-000000000077',true);
 insert into question_sources values('00000000-0000-4000-8000-000000000066','00000000-0000-4000-8000-000000000077');
 ''')
 source=(REPO/'supabase/migrations/20261011003308_school_content_dynamic_categories_v2.sql').read_text()
 body=source.split('create function school_category_private.authorized_items(',1)[1].split('create function school_category_private.resolve(',1)[0]
 sql('create function school_category_private.authorized_items('+body)
 observed=sql("select md5(prosrc) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='school_category_private' and proname='authorized_items'")
 assert observed=='849f5ffcee863c786252c3a75ae2a15d',observed
 print('PASS exact production authorized_items body MD5 '+observed)
 sql("""insert into question_items select md5('q'||i)::uuid,'PUBLICADO','HOMOLOGADO','00000000-0000-4000-8000-000000000088','00000000-0000-4000-8000-000000000066' from generate_series(1,202)i;
 insert into content_items select id,'Synthetic','QUESTION','00000000-0000-4000-8000-000000000002',null,null,now(),'PUBLISHED','{"category_mode":"GRADE"}','GLOBAL_RAIZES',null,null from question_items;
 insert into content_question_items select id,id from question_items;""")
 count(0,'202 mapped HOMOLOGADO remain denied (confirmed defect/compatibility decision)')
 sql("update question_items set curation_status='APROVADO'")
 count(202,'202 synthetic APROVADO visible under pre-existing EF2 rule; no per-item grants')
 sql("insert into question_items values(md5('future')::uuid,'PUBLICADO','APROVADO','00000000-0000-4000-8000-000000000088','00000000-0000-4000-8000-000000000066');insert into content_items select id,'Future addition','QUESTION','00000000-0000-4000-8000-000000000002',null,null,now(),'PUBLISHED','{}','GLOBAL_RAIZES',null,null from question_items where id=md5('future')::uuid;insert into content_question_items values(md5('future')::uuid,md5('future')::uuid)")
 count(203,'new future EF2 item visible without changing existing category rules')
 sql("update content_items set grade_id='00000000-0000-4000-8000-000000000005' where id=md5('future')::uuid")
 count(202,'EF5 outside contracted EF2 rule denied')
 sql("update content_items set editorial_status='DRAFT' where id=md5('q1')::uuid")
 count(201,'draft denied')
 sql("update content_items set editorial_status='ARCHIVED' where id=md5('q2')::uuid")
 count(200,'withdrawn denied')
 for idx,action in [(3,'BLOCK'),(4,'EMBARGO')]:
  sql(f"insert into content_access_exceptions values(md5('q{idx}')::uuid,'00000000-0000-4000-8000-000000000001',null,'{action}',null,null)")
 count(198,'BLOCK and EMBARGO prevail')
 sql("update question_licenses set publication_allowed=false")
 count(198,'baseline reproduces license denial defect')
 sql("revoke all on function school_category_private.authorized_items(jsonb,uuid) from public;grant execute on function school_category_private.authorized_items(jsonb,uuid) to postgres")
 metadata="select jsonb_build_object('acl',proacl::text,'owner',proowner,'config',proconfig,'definer',prosecdef,'args',pg_get_function_identity_arguments(oid)) from pg_proc where oid='school_category_private.authorized_items(jsonb,uuid)'::regprocedure"
 before=sql(metadata)
 patch=(REPO/'supabase/review/content_question_license.sql').read_text()
 sql(patch)
 assert sql(metadata)==before,'ACL/signature/config/owner/security changed'
 print('PASS unchanged ACL, owner, config, security and signature')
 count(0,'patched revocation false denies all')
 sql("update question_licenses set publication_allowed=true")
 count(198,'both question and source licenses true restore eligible items')
 for label,deny,restore in [
  ('question license revoked',"update question_licenses set publication_allowed=false where id='00000000-0000-4000-8000-000000000088'","update question_licenses set publication_allowed=true"),
  ('source license revoked',"update question_licenses set publication_allowed=false where id='00000000-0000-4000-8000-000000000077'","update question_licenses set publication_allowed=true"),
  ('question license missing',"update question_items set license_id=null","update question_items set license_id='00000000-0000-4000-8000-000000000088'"),
  ('question source missing',"update question_items set source_id=null","update question_items set source_id='00000000-0000-4000-8000-000000000066'"),
  ('question source nonexistent',"update question_items set source_id='00000000-0000-4000-8000-000000000055'","update question_items set source_id='00000000-0000-4000-8000-000000000066'"),
  ('source license missing',"update question_sources set license_id=null","update question_sources set license_id='00000000-0000-4000-8000-000000000077'"),
  ('source license nonexistent',"update question_sources set license_id='00000000-0000-4000-8000-000000000055'","update question_sources set license_id='00000000-0000-4000-8000-000000000077'"),
  ('question license nonexistent',"update question_items set license_id='00000000-0000-4000-8000-000000000055'","update question_items set license_id='00000000-0000-4000-8000-000000000088'"),
  ('null permission fail closed',"update question_licenses set publication_allowed=null","update question_licenses set publication_allowed=true"),
  ('HOMOLOGADO remains denied',"update question_items set curation_status='HOMOLOGADO'","update question_items set curation_status='APROVADO'")]:
  sql(deny);count(0,label);sql(restore);count(198,label+' restored')
 sql("delete from content_access_exceptions")
 count(200,'BLOCK/EMBARGO previously excluded exactly2')
 sql("update content_items set editorial_status='PUBLISHED' where editorial_status in ('DRAFT','ARCHIVED')")
 count(202,'draft/withdrawn remained excluded until fixture restored')
 sql("update content_items set grade_id='00000000-0000-4000-8000-000000000002' where id=md5('future')::uuid")
 count(203,'EF5 previously excluded; future EF2 auto visible without grants')
 sql("insert into synthetic_rules values('00000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-000000000002',null,array['VIDEO']::rs_content_type[],null,false);insert into content_items values(md5('video')::uuid,'Synthetic video','VIDEO','00000000-0000-4000-8000-000000000002',null,null,now(),'PUBLISHED','{}','GLOBAL_RAIZES',null,null)")
 count(204,'non-question path unchanged')
 sql("update question_licenses set publication_allowed=false")
 count(1,'license revocation affects QUESTION only; VIDEO remains unchanged')
 body_hash=sql("select md5(prosrc) from pg_proc where oid='school_category_private.authorized_items(jsonb,uuid)'::regprocedure")
 print('AFTER BODY MD5 '+body_hash)
 try:sql(patch);raise AssertionError('stale guard accepted')
 except subprocess.CalledProcessError as e:assert 'QUESTION_LICENSE_RESOLVER_PRECONDITION_FAILED' in e.output
 assert sql(metadata)==before
 print('PASS repeat apply rejected by before-body guard')
 print('LIMIT: actual private resolver with stubbed actor/rules; student/raw-bank RLS, real context and SCHOOL/NETWORK contract branches NOT exercised.')
finally:
 try: docker('rm','-f',name)
 except subprocess.CalledProcessError:pass
