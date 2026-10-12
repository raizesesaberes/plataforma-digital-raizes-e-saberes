"""Real repository schema/RLS/functions; only auth claims and identities are synthetic."""
import pathlib,subprocess,time,json,os,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
NAME='rs-ef2-authorial-'+str(os.getpid())
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
 run('run','-d','--name',NAME,'--label','rs.fase3=synthetic','-e','POSTGRES_PASSWORD=synthetic-only','postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3')
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
 rows=json.loads((ROOT/'qa/ef2-authorial/proposed-bindings.json').read_text())['rows']
 def lit(x):return "'"+str(x).replace("'","''")+"'"
 # Only IDs/classification from the manifest; no real question text or personal data.
 tax=json.loads(sql("select jsonb_object_agg(code,id) from content_grades"))
 segments=json.loads(sql("select jsonb_object_agg(code,id) from content_segments"))
 sql("insert into question_licenses(id,name,license_type,legal_notes,publication_allowed) values('00d2716c-942d-496f-ae49-aa4db37a5228','Synthetic shared demo','demo','Synthetic',true); insert into question_sources(id,name,source_type,license_id,legal_status,curation_status) values('f4039b27-3fe7-4446-94c4-66d9a31ddcb5','Synthetic demo','demo','00d2716c-942d-496f-ae49-aa4db37a5228','Synthetic','HOMOLOGADO')")
 # Reuse real canonical taxonomy fixture IDs through explicit test-only substitution.
 subs={'a1b1498a-26a9-498a-9e3a-65634cf70904':tax['2_ANO'],'6ff7f173-bc5c-42f7-a87a-4c57c542e1ab':segments['FUNDAMENTAL']}
 for sid,code in [('d7cf397b-a497-484f-bd11-f5453e090727','LINGUA_PORTUGUESA'),('611fe688-b66d-421a-a332-c683217f0572','MATEMATICA')]:
  value=sql('select id from content_subjects where code='+lit(code))
  if not value:
   sql(f"insert into content_subjects(id,code,name) values('{sid}','{code}','Synthetic subject')");value=sid
  subs[sid]=value
 seed_statements=[]
 for n,r in enumerate(rows):
  seed_statements.append(f"insert into question_items(id,code,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status) values('{r['question_id']}',{lit(r['code'])},'Synthetic item {n}','Matematica','Synthetic','2o ano','multipla_escolha','Synthetic question {n}','B','f4039b27-3fe7-4446-94c4-66d9a31ddcb5','Synthetic author','00d2716c-942d-496f-ae49-aa4db37a5228','ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB','HOMOLOGADO','PUBLICADO','APROVADO');insert into question_alternatives(question_id,label,body,is_correct,position) values('{r['question_id']}','A','Synthetic A',false,1),('{r['question_id']}','B','Synthetic B',true,2);insert into question_workflow_events(question_id,from_status,to_status,comment) values('{r['question_id']}','EM_REVISAO','APROVADO','Synthetic preexisting history')")
 sql(';'.join(seed_statements))
 revisions=json.loads(sql("select jsonb_object_agg(id,school_category_private.question_revision(id)) from question_items"))
 for r in rows:subs[r['expected_question_revision']]=revisions[r['question_id']]
 for table,key,expected in [('question_sources','f4039b27-3fe7-4446-94c4-66d9a31ddcb5','0052a2de7800e916b46d83bdacd83b63'),('question_licenses','00d2716c-942d-496f-ae49-aa4db37a5228','07dcaf110de3a55ed47da22e17133c5e')]:subs[expected]=sql(f"select md5(to_jsonb(t)::text) from {table} t where id='{key}'")
 batch=(ROOT/'supabase/review/ef2_authorial_catalog.sql').read_text()
 print('SQL_SOURCE_SHA256 '+hashlib.sha256(batch.encode()).hexdigest(),flush=True)
 for old,new in subs.items():batch=batch.replace(old,new)
 # Add two EF5 controls, preserving the original seeded EF5 = total three.
 sql("""insert into question_items(id,code,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status)
 select md5('ef5-'||n)::uuid,'SYN-EF5-'||n,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status from question_items cross join generate_series(2,3)n where id='70000000-0000-0000-0000-000000000001';
 insert into content_items(id,content_type,segment_id,grade_id,title,editorial_status,published_at) select md5('ef5-'||n)::uuid,content_type,segment_id,grade_id,title,editorial_status,published_at from content_items cross join generate_series(2,3)n;
 insert into content_question_items(content_item_id,question_item_id) select md5('ef5-'||n)::uuid,md5('ef5-'||n)::uuid from generate_series(2,3)n;""")
 def snapshot():return sql("select md5(jsonb_build_object('q',(select jsonb_agg(to_jsonb(t) order by id) from question_items t),'a',(select jsonb_agg(to_jsonb(t) order by id) from question_alternatives t),'c',(select jsonb_agg(to_jsonb(t) order by id) from content_items t),'map',(select jsonb_agg(to_jsonb(t) order by content_item_id) from content_question_items t),'ev',(select jsonb_agg(to_jsonb(t) order by id) from content_editorial_events t),'s',(select jsonb_agg(to_jsonb(t) order by id) from question_sources t),'l',(select jsonb_agg(to_jsonb(t) order by id) from question_licenses t))::text)")
 def contracthash():return sql("select md5(jsonb_build_object('contracts',(select jsonb_agg(to_jsonb(t) order by id) from contracts t),'entitlements',(select jsonb_agg(to_jsonb(t) order by id) from tenant_product_entitlements t),'exceptions',(select jsonb_agg(to_jsonb(t) order by id) from content_access_exceptions t))::text)")
 def fail(q,code):
  try:sql(q);raise AssertionError('unexpected success '+code)
  except RuntimeError as e:assert code in str(e),str(e)
 before=snapshot();ch=contracthash()
 collision="insert into content_items(id,content_type,title) values('"+rows[0]['proposed_content_item_id']+"','QUESTION','Synthetic collision');\n"
 fail(batch.replace('do $batch$',collision+'do $batch$',1),'EF2_PARTIAL_OR_COLLISION');assert snapshot()==before
 fail(batch.replace(rows[1]['question_id'],rows[0]['question_id']),'duplicate key');assert snapshot()==before
 print('PASS conflicting catalog ID / duplicate manifest ID fail atomically',flush=True)
 fail(batch.replace(rows[0]['code'],'DRIFT-CODE'), 'EF2_QUESTION_REVISION_DRIFT');assert snapshot()==before
 fail(batch.replace('raise notice \'EF2_AUTHORIAL_APPLIED_202\';',"raise exception 'SYNTHETIC_FORCED_ROLLBACK';"),'SYNTHETIC_FORCED_ROLLBACK');assert snapshot()==before
 sql(batch.replace('commit;','rollback;'));assert snapshot()==before
 print('PASS revision drift / forced late failure / explicit rollback: zero partial state',flush=True)
 ef5=sql("select md5(jsonb_agg(to_jsonb(q) order by q.id)::text) from question_items q where school_year<>'2o ano'")
 sql(batch);after=snapshot();sql(batch);assert snapshot()==after
 assert contracthash()==ch
 assert ef5==sql("select md5(jsonb_agg(to_jsonb(q) order by q.id)::text) from question_items q where school_year<>'2o ano'")
 assert sql("select count(*) from content_question_items")=='205'
 fail(batch.replace('manifest_sha256\' is distinct from digest','manifest_sha256\' is distinct from \'tampered\''),'EF2_REPLAY_DRIFT');assert snapshot()==after
 print('PASS apply 202 / repeat exact NOOP / mismatched replay denied / 3 EF5 unchanged / zero contract or exception writes',flush=True)
 school='10000000-0000-0000-0000-000000000001';class2='30000000-0000-0000-0000-000000000003';class5='30000000-0000-0000-0000-000000000001'
 sql(f"insert into classes(id,school_id,nome,school_year,ano_escolar) values('{class2}','{school}','Synthetic EF2','2026','2_ANO');insert into class_teacher_memberships(class_id,teacher_id) values('{class2}','20000000-0000-0000-0000-000000000001')")
 def resolve(cid=class2,who=TEACHER,schoolid=school,offset=0):
  ctx={'school_id':schoolid,'content_type':'QUESTION','limit':100,'offset':offset}
  if cid:ctx['class_id']=cid
  return json.loads(actor('select content_resolve_for_user('+lit(json.dumps(ctx))+'::jsonb)',who))
 assert resolve()['total']==0
 print('PASS teacher active EF2 class without contracted EF2 category sees zero',flush=True)
 sql("update contract_products set metadata=jsonb_build_object('authorized_grade_ids',(select jsonb_agg(id) from content_grades where code in('2_ANO','5_ANO'))); update tenant_product_entitlements set grade_ids=(select array_agg(id) from content_grades where code in('2_ANO','5_ANO')),metadata=jsonb_set(metadata,'{category_rules}',(metadata->'category_rules') || jsonb_build_array((metadata->'category_rules'->0)||jsonb_build_object('grade_id',(select id from content_grades where code='2_ANO'))))")
 ids=set()
 for offset in [0,100,200]:
  page=resolve(offset=offset);assert page['total']==202,page;ids.update(x['question_item_id'] for x in page['items'])
 assert ids=={r['question_id'] for r in rows};assert resolve(class5)['total']==3;assert resolve(None)['total']==205
 print('PASS real dynamic resolver 202 EF2 across 3 pages / EF5 exactly 3 / union 205',flush=True)
 # Real detail RPC and builder; all payload text remains synthetic.
 qid=rows[0]['question_id'];detail_ids=set()
 for offset in [0,100,200]:
  ctx={'school_id':school,'class_id':class2,'content_type':'QUESTION','limit':100,'offset':offset}
  details=json.loads(actor('select content_resolve_question_details_for_user('+lit(json.dumps(ctx))+'::jsonb)',TEACHER))
  detail_ids.update(x['id'] for x in details['items'])
  assert all(len(x['alternatives'])==2 for x in details['items'])
 assert detail_ids==ids
 payload={'title':'SYN EF2 exam','description':'','instructions':'','component':'Matemática','school_year':'2','class_name':None,'cover_template':'Raízes e Saberes - padrao','application_date':None,'questions':[{'question_id':qid,'position':1,'points':1}],'booklets':[{'code':'A','title':'Caderno A','position':1,'questions':[{'question_id':qid,'position':1}]}]}
 assessment=json.loads(actor('select avalia_plus_create_assessment_from_bank('+lit(json.dumps(payload))+'::jsonb)',TEACHER));assert assessment['assessment']['id']
 aid=assessment['assessment']['id']
 replacement=json.loads(actor('select avalia_plus_replace_assessment_items('+lit(aid)+'::uuid,'+lit(json.dumps(payload))+'::jsonb)',TEACHER));assert replacement
 def publish(cid):return actor('select teacher_schedule_assessment_application_v2(p_assessment_id=>'+lit(aid)+",p_target_type=>'class',p_class_id=>"+lit(cid)+')',TEACHER)
 try:publish(class5);raise AssertionError('wrong grade publish allowed')
 except RuntimeError as e:assert 'ASSESSMENT_CONTENT_ACCESS_DENIED' in str(e)
 assert json.loads(publish(class2))['assignment']['id']
 print('PASS migrated EF2 CREATE / REPLACE / publish EF2, wrong-grade EF5 publication denied',flush=True)
 print('PASS authorized teacher opens actual details and creates assessment from migrated EF2',flush=True)
 for table in ['question_items','question_alternatives']:
  assert actor('select count(*) from '+table)=='0';print('PASS authenticated student raw '+table+'=0',flush=True)
 for action in ['BLOCK','EMBARGO']:
  sql(f"insert into content_access_exceptions(content_item_id,school_id,action,reason) values('{rows[0]['proposed_content_item_id']}','{school}','{action}','Synthetic exception')")
  assert resolve()['total']==201
  sql('delete from content_access_exceptions')
 licenseid=sql("select details->>'license_id' from content_editorial_events where event_type='EF2_AUTHORIAL_BATCH_COMPLETED'")
 sql(f"update question_licenses set publication_allowed=false where id='{licenseid}'");assert resolve()['total']==0;assert resolve(class5)['total']==3
 sql(f"update question_licenses set publication_allowed=true where id='{licenseid}'")
 print('PASS BLOCK / EMBARGO / authorial license false deny EF2, retain 3 EF5',flush=True)
 try:resolve(class2,TEACHER,'10000000-0000-0000-0000-000000000002');raise AssertionError('cross-school allowed')
 except RuntimeError as e:assert 'UNAUTHORIZED' in str(e)
 print('PASS cross-school context denied; no real school/class or student data used',flush=True) # Future root creation must use the existing explicit canonical authoring path.
 admin='00000000-0000-0000-0000-000000000006'
 sql(f"update profiles set platform_role='admin' where id='{admin}'")
 def adminrpc(name,payload):
  claims=json.dumps({'sub':admin,'role':'authenticated','app_metadata':{'platform_role':'admin','question_bank_role':'admin'}})
  return json.loads(sql('set request.jwt.claims='+lit(claims)+';set role authenticated;select to_jsonb('+name+'('+lit(json.dumps(payload))+'::jsonb))'))
 future={'code':'SYN-FUTURE-EF2','internal_title':'Synthetic future question','component':'Matemática','question_type':'multipla_escolha','statement':'Synthetic future question','correct_answer':'B','source_id':'60000000-0000-0000-0000-000000000001','license_id':'50000000-0000-0000-0000-000000000001','author_name':'Synthetic author','legal_classification':'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB','alternatives':[{'label':'A','body':'Synthetic A','is_correct':False},{'label':'B','body':'Synthetic B','is_correct':True}]}
 try:adminrpc('avalia_plus_create_item',future);raise AssertionError('root creation without canonical classification accepted')
 except RuntimeError as e:assert 'EXPLICIT_CANONICAL_CLASSIFICATION_REQUIRED' in str(e)
 future.update(canonical_category={'category_mode':'GRADE','grade_id':tax['2_ANO'],'subject_id':subs['611fe688-b66d-421a-a332-c683217f0572'],'multidisciplinary':False,'category_grade_ids':[]},category_reason='Synthetic future canonical test',category_request_id='f0000000-0000-4000-8000-000000000001')
 ch=contracthash();new=adminrpc('avalia_plus_create_item',future);assert adminrpc('avalia_plus_create_item',future)['id']==new['id']
 assert sql('select count(*) from content_question_items where question_item_id='+lit(new['id']))=='1'
 assert resolve()['total']==202
 claims=json.dumps({'sub':admin,'role':'authenticated','app_metadata':{'platform_role':'admin','question_bank_role':'admin'}})
 sql('set request.jwt.claims='+lit(claims)+';set role authenticated;select avalia_plus_set_item_workflow('+lit(new['id'])+",'APROVADO','Synthetic editorial review')")
 assert resolve()['total']==203;assert contracthash()==ch
 assert actor('select count(*) from question_items')=='0'
 print('PASS future root create requires classification / idempotent native create / unpublished denied / editorial approval auto adds EF2 without per-school grants / student raw still zero',flush=True)

 sql('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text,name text)') # syntax-only local ledger fixture, no simulated production success
 sql((ROOT/'qa/ef2-authorial/install/03-postcheck.sql').read_text())
 sql((ROOT/'qa/ef2-authorial/install/04-invariants.sql').read_text())
 print('PASS packaged readonly postcheck and invariant queries parse on actual schema',flush=True)
finally:
 try:run('rm','-f',NAME)
 except RuntimeError:pass
