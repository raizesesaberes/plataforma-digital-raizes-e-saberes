"""Real repository schema/RLS/functions; only auth claims and identities are synthetic."""
import pathlib,subprocess,time,json,os,hashlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
NAME='rs-school-inspection-'+str(os.getpid())
def run(*args,input=None):
 p=subprocess.run(['docker',*args],input=input,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr+'\n'+p.stdout)
 return p.stdout.strip()
def sql(q):return run('exec','-i',NAME,'psql','-XAtq','-U','postgres','-v','ON_ERROR_STOP=1',input=q)
def apply(f):sql((ROOT/f).read_text());print('LOAD '+str(f),flush=True)
STUDENT='00000000-0000-0000-0000-000000000002'; TEACHER='00000000-0000-0000-0000-000000000001'
def actor(q,who=STUDENT):
 claims=json.dumps({'sub':who,'role':'authenticated','app_metadata':{'platform_role':'aluno' if who==STUDENT else 'professor'}})
 return sql("set request.jwt.claims='"+claims+"';set role authenticated;"+q)
try:
 run('run','-d','--name',NAME,'--label','rs.fase3=synthetic','--mount','type=tmpfs,destination=/var/lib/postgresql/data,tmpfs-size=268435456','-e','POSTGRES_PASSWORD=synthetic-only','postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3')
 for _ in range(100):
  try:run('exec',NAME,'pg_isready','-h','127.0.0.1','-U','postgres');break
  except RuntimeError:time.sleep(.1)
 apply(pathlib.Path('qa/fase3/bootstrap.sql'));apply(pathlib.Path('supabase/baselines/20261004_pilot_schema_baseline.sql'))
 for f in sorted((ROOT/'supabase/migrations').glob('202610*.sql')):apply(f.relative_to(ROOT))
 for f in ['qa/fase3/observed-start-attempt.sql','qa/fase3/observed-boundary-fixture.sql','qa/fase3/observed-20261009195512.sql','qa/fase3/observed-boundary-alignment.sql','tests/contracts/admin-assert.sql','tests/contracts/production-legacy-helpers.sql','qa/fase3/seed.sql','supabase/review/fase3_assessment_authorization.sql']:
  apply(pathlib.Path(f))
 apply(pathlib.Path('supabase/review/contract_operations.sql'))
 apply(pathlib.Path('supabase/review/assessment_institutional_assembly.sql'))
 apply(pathlib.Path('supabase/review/teacher_legacy_grade_scope.sql'))
 apply(pathlib.Path('supabase/review/content_question_license.sql'))
 def lit(x):return "'"+str(x).replace("'","''")+"'"
 school='10000000-0000-0000-0000-000000000001';other='10000000-0000-0000-0000-000000000002';secretary='00000000-0000-0000-0000-000000000003';admin='00000000-0000-0000-0000-000000000007'
 sql(f"insert into auth.users(id) values('{admin}');insert into profiles(id,platform_role,display_name) values('{admin}','admin','Synthetic admin');")
 baseline=actor("select content_resolve_for_user('{\"school_id\":\""+school+"\",\"content_type\":\"QUESTION\"}')",TEACHER)
 # One seed EF5 plus 2 more; 202 fictional EF2 questions. No production content loaded.
 sql("""insert into question_items(id,code,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status)
 select md5('inspection-'||n)::uuid,'INSPECT-'||n,'Synthetic '||n,component,stage,case when n<=202 then '2_ANO' else '5_ANO' end,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status from question_items cross join generate_series(1,204)n where code='FASE3-SYNTHETIC-001';
 insert into content_items(id,content_type,segment_id,grade_id,title,editorial_status,published_at)
 select md5('inspection-'||n)::uuid,'QUESTION',g.segment_id,g.id,'Synthetic '||n,'PUBLISHED',now() from generate_series(1,204)n join content_grades g on g.code=case when n<=202 then '2_ANO' else '5_ANO' end;
 insert into content_question_items(content_item_id,question_item_id) select md5('inspection-'||n)::uuid,md5('inspection-'||n)::uuid from generate_series(1,204)n;
 update contract_products set metadata=metadata||jsonb_build_object('authorized_grade_ids',(select jsonb_agg(id) from content_grades where code in('2_ANO','5_ANO')));
 update tenant_product_entitlements set grade_ids=(select array_agg(id) from content_grades where code in('2_ANO','5_ANO')),metadata=jsonb_set(metadata,'{category_rules}',(metadata->'category_rules')||jsonb_build_array(jsonb_build_object('module_id',metadata->'category_rules'->0->>'module_id','content_type','QUESTION','grade_id',(select id from content_grades where code='2_ANO'),'kind','STANDARD')));
 """)
 before=actor("select content_resolve_for_user('{\"school_id\":\""+school+"\",\"content_type\":\"QUESTION\"}')",TEACHER)
 apply(pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'supabase/review/school_content_inspection.sql'))
 assert actor("select content_resolve_for_user('{\"school_id\":\""+school+"\",\"content_type\":\"QUESTION\"}')",TEACHER)==before
 def inspect(sid=school,who=secretary,filters={},offset=0):
  claims=json.dumps({'sub':who,'role':'authenticated','app_metadata':{'platform_role':'admin' if who==admin else 'secretaria'}})
  return json.loads(sql("set request.jwt.claims="+lit(claims)+";set role authenticated;select school_inspect_available_content("+lit(sid)+','+lit(json.dumps(filters))+'::jsonb,25,'+str(offset)+')'))
 a=inspect();assert a['total']==205 and len(a['items'])==25,a
 assert sorted(c['total'] for c in a['categories'])==[3,202],a['categories']
 assert inspect(who=admin)['total']==205
 ids=[]
 for off in range(0,205,25):ids += [x['id'] for x in inspect(offset=off)['items']]
 assert len(ids)==len(set(ids))==205
 g2=sql("select id from content_grades where code='2_ANO'");assert inspect(filters={'grade_id':g2})['total']==202
 assert inspect(filters={'query':'NONEXISTENT SYNTHETIC'})['total']==0
 try:inspect(sid=other);raise AssertionError('cross-school allowed')
 except RuntimeError as e:assert 'DENIED' in str(e)
 for who in [STUDENT,TEACHER]:
  try:inspect(who=who);raise AssertionError('role allowed')
  except RuntimeError as e:assert 'DENIED' in str(e)
 assert inspect(sid=other,who=admin)['total']==0
 sql("update schools set status='inactive' where id="+lit(school));assert inspect()['status']=='INACTIVE_SCHOOL';sql("update schools set status='active' where id="+lit(school))
 sql("insert into schools(id,nome) values('10000000-0000-0000-0000-000000000003','Synthetic legacy')");a=inspect(sid='10000000-0000-0000-0000-000000000003',who=admin);assert a['status']=='ADAPTER_REQUIRED' and a['total'] is None
 sql("insert into content_access_exceptions(content_item_id,school_id,action,reason) values(md5('inspection-1')::uuid,"+lit(school)+",'BLOCK','Synthetic')");assert inspect()['total']==204;sql('delete from content_access_exceptions')
 sql('update question_licenses set publication_allowed=false');assert inspect()['total']==0;sql('update question_licenses set publication_allowed=true')
 sql("update contracts set starts_at=current_date-10,ends_at=current_date-1");a=inspect();assert a['total']==0 and all(c['state']=='RESTRICTED' for c in a['categories'])
 assert 'statement' not in json.dumps(a) and 'correct_answer' not in json.dumps(a)
 try:actor("select * from school_category_private.authorized_items_for_context('{}','{}')",TEACHER);raise AssertionError('private helper callable')
 except RuntimeError as e:assert 'permission denied' in str(e)
 # P2: transversal ownership of grade labels must not replace grade + subject authorization.
 sql("""update contracts set starts_at=current_date-1,ends_at=null;
 insert into content_subjects(id,code,name) values(md5('inspect-math')::uuid,'INSPECT_MATH','Synthetic Math'),(md5('inspect-language')::uuid,'INSPECT_LANGUAGE','Synthetic Language');
 update content_items set subject_id=case when grade_id=(select id from content_grades where code='2_ANO') then md5('inspect-math')::uuid else md5('inspect-language')::uuid end;
 update tenant_product_entitlements e set metadata=jsonb_set(metadata,'{category_rules}',(select jsonb_agg(r||jsonb_build_object('subject_id',case when r->>'grade_id'=(select id::text from content_grades where code='2_ANO') then md5('inspect-math')::uuid else md5('inspect-language')::uuid end)) from jsonb_array_elements(e.metadata->'category_rules') r));
 insert into question_items(id,code,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status)
 select md5('transversal-'||n)::uuid,'TRANSVERSAL-'||n,'Synthetic transversal '||n,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status from question_items cross join generate_series(1,2)n where code='FASE3-SYNTHETIC-001';
 insert into content_items(id,content_type,segment_id,grade_id,subject_id,title,editorial_status,published_at,metadata)
 select md5('transversal-'||n)::uuid,'QUESTION',segment_id,null,md5(case when n=1 then 'inspect-language' else 'inspect-math' end)::uuid,'Synthetic transversal '||n,'PUBLISHED',now(),jsonb_build_object('category_mode','TRANSVERSAL','category_grade_ids',(select jsonb_agg(id) from content_grades where code in('2_ANO','5_ANO')))
 from content_items cross join generate_series(1,2)n where id=(select content_item_id from content_question_items where question_item_id='70000000-0000-0000-0000-000000000001');
 insert into content_question_items(content_item_id,question_item_id) select md5('transversal-'||n)::uuid,md5('transversal-'||n)::uuid from generate_series(1,2)n;
 """)
 g5=sql("select id from content_grades where code='5_ANO'")
 a=inspect();assert a['total']==207
 counts={c['grade_id']:c['total'] for c in a['categories']};assert counts[g2]==203 and counts[g5]==4,counts
 for gid,expected,forbidden in [(g2,203,'Synthetic transversal 1'),(g5,4,'Synthetic transversal 2')]:
  assert inspect(filters={'grade_id':gid})['total']==expected
  rows=inspect(filters={'grade_id':gid,'query':'Synthetic transversal'})['items'];assert len(rows)==1 and all(x['title']!=forbidden for x in rows),rows
 sql("update tenant_product_entitlements e set metadata=jsonb_set(metadata,'{category_rules}',(metadata->'category_rules')||jsonb_build_array((select r||jsonb_build_object('subject_id',md5('inspect-math')::uuid) from jsonb_array_elements(e.metadata->'category_rules') r where r->>'grade_id'="+lit(g5)+")))")
 a=inspect();assert a['total']==207 and a['type_totals']['QUESTION']==207
 assert inspect(filters={'grade_id':g5})['total']==5
 print('PASS P2: transversal EF2+EF5 Language authorized only via EF5 excluded from EF2 Math; inverse excluded from EF5; per-grade counts/list agree; overlapping authorized rules remain deduplicated207.',flush=True)
 print('PASS real PostgreSQL: admin/secretary, role+school isolation, 202 EF2 + 3 EF5, total vs 25-item pages, search zero, inactive/legacy/no-contract, expiry/BLOCK/license revocation, unchanged teacher resolver, private helpers inaccessible.',flush=True)
finally:
 run('rm','-fv',NAME)
