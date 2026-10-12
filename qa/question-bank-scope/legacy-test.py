"""Real repository schema/RLS/functions; only auth claims and identities are synthetic."""
import pathlib,subprocess,time,json,os,argparse
ROOT=pathlib.Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--patch');parser.add_argument('--rejected-regression',action='store_true');args=parser.parse_args()
PATCH=pathlib.Path(args.patch).resolve() if args.patch else ROOT/'supabase/review/teacher_legacy_grade_scope.sql'
NAME='rs-fase3-teacher-legacy-'+str(os.getpid())
def run(*args,input=None):
 p=subprocess.run(['docker',*args],input=input,text=True,capture_output=True)
 if p.returncode:raise RuntimeError(p.stderr+'\n'+p.stdout)
 return p.stdout.strip()
def sql(q):return run('exec','-i',NAME,'psql','-XAtq','-U','postgres','-v','ON_ERROR_STOP=1',input=q)
def apply(f):
 text=(ROOT/f).read_text()
 if str(f)=='qa/fase3/seed.sql':text=text.replace('category_entitlements_enabled":true','category_entitlements_enabled":false')
 sql(text);print('LOAD '+str(f),flush=True)
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
 for f in ['qa/fase3/observed-start-attempt.sql','qa/fase3/observed-boundary-fixture.sql','qa/fase3/observed-20261009195512.sql','qa/fase3/observed-boundary-alignment.sql','tests/contracts/admin-assert.sql','tests/contracts/production-legacy-helpers.sql','qa/fase3/seed.sql','supabase/review/fase3_assessment_authorization.sql','supabase/review/contract_operations.sql','supabase/review/assessment_institutional_assembly.sql']:
  apply(pathlib.Path(f))
 school='10000000-0000-0000-0000-000000000001';class5='30000000-0000-0000-0000-000000000001';class2='30000000-0000-0000-0000-000000000003'
 sql("""
 update public.content_feature_flags set enabled=true where flag_key='CONTENT_RESOLVER_QUESTIONS';
 insert into public.content_feature_flags(flag_key,enabled) select 'CONTENT_RESOLVER_QUESTIONS',true where not exists(select 1 from public.content_feature_flags where flag_key='CONTENT_RESOLVER_QUESTIONS' and tenant_id is null);
 update public.tenant_product_entitlements set grade_ids=(select array_agg(id) from public.content_grades where code in ('2_ANO','5_ANO')),metadata='{}';
 insert into public.question_items(id,code,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status)
 select '70000000-0000-0000-0000-000000000002','LEGACY-SYNTHETIC-002',internal_title,component,stage,'2_ANO',question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status from public.question_items where id='70000000-0000-0000-0000-000000000001';
 insert into public.content_items(id,content_type,segment_id,grade_id,title,editorial_status,published_at) select '90000000-0000-0000-0000-000000000002','QUESTION',segment_id,id,'Synthetic EF2','PUBLISHED',now() from public.content_grades where code='2_ANO';
 insert into public.content_question_items values('90000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000002',now());
 insert into public.content_collections(id,code,name) values('91000000-0000-0000-0000-000000000001','LEGACY_SYNTHETIC','Legacy synthetic');
 insert into public.content_collection_items(collection_id,content_item_id) select '91000000-0000-0000-0000-000000000001',id from public.content_items;
 insert into public.product_collections(product_id,collection_id) select id,'91000000-0000-0000-0000-000000000001' from public.products where code='FASE3_SYNTHETIC';
 insert into public.classes(id,school_id,nome,school_year,ano_escolar) values('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','Synthetic EF2','2_ANO','2_ANO');
 """)
 q5='70000000-0000-0000-0000-000000000001';q2='70000000-0000-0000-0000-000000000002'
 def rpc(cid=None,offset=0):
  ctx={'school_id':school,'content_type':'QUESTION','limit':1,'offset':offset}
  if cid:ctx['class_id']=cid
  return json.loads(actor("select public.content_resolve_for_user('"+json.dumps(ctx)+"'::jsonb)",TEACHER))
 def ids(cid):
  page=rpc(cid);out={x['question_item_id'] for x in page['items']}
  for offset in range(1,page['total']):out.update(x['question_item_id'] for x in rpc(cid,offset)['items'])
  return out
 assert ids(class5)=={q5}
 print('PASS legacy teacher EF5-only, product EF2+EF5, explicit class5 returns EF5 only',flush=True)
 assert ids(None)=={q2,q5}
 print('CONFIRMED DEFECT legacy school-only context returns EF2+EF5 despite teacher EF5-only',flush=True)
 try:rpc(class2);raise AssertionError('unauthorized class accepted')
 except RuntimeError as e:assert 'UNAUTHORIZED_CLASS_CONTEXT' in str(e),str(e)
 print('PASS unlinked explicit class2 denied',flush=True)
 sql("insert into public.class_teacher_memberships(class_id,teacher_id) values('"+class2+"','20000000-0000-0000-0000-000000000001')")
 assert ids(class2)=={q2};assert ids(class5)=={q5};assert ids(class2)|ids(class5)=={q2,q5}
 print('PASS both memberships explicit class2/class5 filtered; union exactly EF2+EF5 with pagination',flush=True)
 sql("update public.class_teacher_memberships set ended_at=now() where class_id='"+class2+"'")
 try:rpc(class2);raise AssertionError('ended membership accepted')
 except RuntimeError as e:assert 'UNAUTHORIZED_CLASS_CONTEXT' in str(e),str(e)
 print('PASS ended membership class2 denied',flush=True)
 sql("update public.classes set school_year='2026',ano_escolar='5_ANO' where id='"+class5+"'")
 observed=ids(class5)
 print('OBSERVED explicit class5 with school_year=2026, ano_escolar=5_ANO question count='+str(len(observed)),flush=True)
 assert observed=={q2,q5}
 print('CONFIRMED DEFECT legacy unresolved school_year alias leaves grade NULL; explicit class still returns EF2+EF5',flush=True)
 metadata="select jsonb_build_object('acl',proacl::text,'owner',proowner,'config',proconfig,'definer',prosecdef,'args',pg_get_function_identity_arguments(oid)) from pg_proc where oid='school_category_private.legacy_resolver(jsonb)'::regprocedure"
 beforemeta=sql(metadata)
 unsupported=actor("select public.content_resolve_for_user('{\"school_id\":\""+school+"\",\"content_type\":\"VIDEO\"}')",TEACHER)
 def student_result():
  try:return actor("select public.content_resolve_for_user('{\"school_id\":\""+school+"\",\"content_type\":\"QUESTION\"}')")
  except RuntimeError as e:return str(e)
 student_before=student_result()
 if args.rejected_regression:
  rejected_payload={'title':'SYN old SQL regression','description':'','instructions':'','component':'Matemática','school_year':'5','class_name':None,'cover_template':'Raízes e Saberes - padrao','application_date':None,'questions':[{'question_id':q5,'position':1,'points':1}],'booklets':[{'code':'A','title':'Caderno A','position':1,'questions':[{'question_id':q5,'position':1}]}]}
  def rejected_call(name,aid=None):
   prefix=("'"+aid+"'::uuid,") if aid else ''
   return json.loads(actor("select public."+name+"("+prefix+"'"+json.dumps(rejected_payload).replace("'","''")+"'::jsonb)",TEACHER))
  old_draft=rejected_call('avalia_plus_create_assessment_from_bank')['assessment']['id']
  print('CONTROL before rejected SQL legitimate no-class CREATE succeeds',flush=True)
 sql(PATCH.read_text())
 if args.rejected_regression:
  snapshot="select jsonb_build_object('assessment',(select to_jsonb(a) from public.assessments a where id='"+old_draft+"'),'questions',(select jsonb_agg(to_jsonb(q) order by q.id) from public.assessment_questions q where assessment_id='"+old_draft+"'))"
  prior=sql(snapshot)
  for name,aid in [('avalia_plus_create_assessment_from_bank',None),('avalia_plus_replace_assessment_items',old_draft)]:
   try:rejected_call(name,aid);raise AssertionError('Rejected SQL unexpectedly allowed builder')
   except RuntimeError as e:assert 'EXPLICIT_TEACHER_CLASS_REQUIRED' in str(e),str(e)
   print('CONFIRMED REJECTED SQL REGRESSION '+name+' legitimate no-class builder raises EXPLICIT_TEACHER_CLASS_REQUIRED',flush=True)
  assert sql(snapshot)==prior
  print('PASS rejected SQL failed REPLACE leaves original draft unchanged',flush=True)
  raise SystemExit(0)
 assert sql(metadata)==beforemeta
 assert student_result()==student_before
 print('PASS student response unchanged immediately after patch under same fixture',flush=True)
 print('PASS patch preserves exact ACL/owner/config/security/signature',flush=True)
 assert ids(class5)=={q5}
 print('PASS patched school_year2026+ano_escolar5_ANO resolves EF5 only',flush=True)
 assert {x['question_item_id'] for x in json.loads(actor("select public.content_resolve_for_user(null::jsonb)",TEACHER))['items']}=={q5}
 try:
  actor("select public.content_resolve_for_user('null'::jsonb)",TEACHER);raise AssertionError('JSON null context accepted')
 except RuntimeError:pass
 print('PASS SQL NULL context verified union; JSON null context rejected without recursion',flush=True)
 def deny(cid,message):
  try:rpc(cid);raise AssertionError('Expected denial '+message)
  except RuntimeError as e:assert message in str(e),str(e)
 assert ids(None)=={q5}
 print('PASS school-only draft context unions only verified taught EF5',flush=True)
 deny(class2,'UNAUTHORIZED_CLASS_CONTEXT')
 print('PASS patched ended membership denied',flush=True)
 sql("update public.classes set school_year='2_ANO',ano_escolar='5_ANO' where id='"+class5+"'")
 deny(class5,'CANONICAL_CLASS_GRADE_REQUIRED')
 deny(None,'CANONICAL_CLASS_GRADE_REQUIRED')
 print('PASS contradictory EF2/EF5 aliases denied',flush=True)
 sql("update public.classes set school_year='2026',ano_escolar='unknown',age_group=null where id='"+class5+"'")
 deny(class5,'CANONICAL_CLASS_GRADE_REQUIRED')
 print('PASS zero canonical aliases denied',flush=True)
 sql("update public.classes set age_group='5_ANO' where id='"+class5+"'")
 assert ids(class5)=={q5}
 print('PASS age_group canonical fallback resolves uniquely',flush=True)
 sql("update public.classes set school_year='5_ANO',ano_escolar='5_ANO',age_group='5_ANO' where id='"+class5+"'")
 assert ids(class5)=={q5}
 print('PASS three aliases same canonical grade count as one',flush=True)
 sql("update public.tenant_product_entitlements set grade_ids=(select array_agg(id) from public.content_grades where code='2_ANO')")
 assert ids(class5)==set()
 print('PASS EF5 teacher cannot use EF2-only entitlement despite both product items',flush=True)
 sql("update public.tenant_product_entitlements set grade_ids=(select array_agg(id) from public.content_grades where code in ('2_ANO','5_ANO'));update public.class_teacher_memberships set ended_at=null where class_id='"+class2+"'")
 assert ids(class2)=={q2};assert ids(class5)=={q5};assert ids(class2)|ids(class5)=={q2,q5}
 assert ids(None)=={q2,q5}
 print('PASS patched implicit and explicit multiple classes paginated union EF2+EF5',flush=True)
 # Add duplicate-grade class to prove union deduplicates, then exercise actual builder RPCs.
 sql("insert into public.classes(id,school_id,nome,school_year,ano_escolar) values('30000000-0000-0000-0000-000000000004','"+school+"','Synthetic EF5 B','2026','5_ANO');insert into public.class_teacher_memberships(class_id,teacher_id) values('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000001')")
 assert ids(None)=={q2,q5};assert rpc(None)['total']==2
 print('PASS union duplicate content deduplicated across two EF5 classes',flush=True)
 sql("update public.class_teacher_memberships set ended_at=now() where class_id='"+class2+"'")
 assert ids(None)=={q5}
 payload={'title':'SYN builder no class','description':'','instructions':'','component':'Matemática','school_year':'5','class_name':None,'cover_template':'Raízes e Saberes - padrao','application_date':None,'questions':[{'question_id':q5,'position':1,'points':1}],'booklets':[{'code':'A','title':'Caderno A','position':1,'questions':[{'question_id':q5,'position':1}]}]}
 def assembly(name,p,aid=None):
  arg=("'"+aid+"'::uuid,") if aid else ''
  return json.loads(actor("select public."+name+"("+arg+"'"+json.dumps(p).replace("'","''")+"'::jsonb)",TEACHER))
 def must_fail(action,expected):
  try:action();raise AssertionError('Expected denial '+expected)
  except RuntimeError as e:assert expected in str(e),str(e)
 created=assembly('avalia_plus_create_assessment_from_bank',payload)['assessment'];aid=created['id']
 assert created['class_id'] is None
 replaced=assembly('avalia_plus_replace_assessment_items',{**payload,'title':'SYN replacement valid'},aid)['assessment'];assert replaced['title']=='SYN replacement valid'
 print('PASS actual builder CREATE and REPLACE without class_id, verified EF5 union',flush=True)
 denied={**payload,'title':'SHOULD ROLLBACK','questions':[{'question_id':q2,'position':1,'points':1}],'booklets':[]}
 must_fail(lambda:assembly('avalia_plus_create_assessment_from_bank',denied),'ASSESSMENT_CONTENT_ACCESS_DENIED')
 snapshot="select jsonb_build_object('assessment',(select to_jsonb(a) from public.assessments a where id='"+aid+"'),'questions',(select jsonb_agg(to_jsonb(q) order by q.id) from public.assessment_questions q where assessment_id='"+aid+"'))"
 prior=sql(snapshot)
 must_fail(lambda:assembly('avalia_plus_replace_assessment_items',denied,aid),'ASSESSMENT_CONTENT_ACCESS_DENIED')
 assert sql(snapshot)==prior
 print('PASS untaught EF2 CREATE/REPLACE denied and REPLACE fully rolled back',flush=True)
 def publish(cid):return json.loads(actor("select public.teacher_schedule_assessment_application_v2(p_assessment_id=>'"+aid+"',p_target_type=>'class',p_class_id=>'"+cid+"')",TEACHER))
 must_fail(lambda:publish('30000000-0000-0000-0000-000000000002'),'Professor/Gestao nao autorizados para esta aplicacao.')
 sql("update public.class_teacher_memberships set ended_at=null where class_id='"+class2+"'")
 must_fail(lambda:publish(class2),'ASSESSMENT_CONTENT_ACCESS_DENIED')
 assert sql("select count(*) from public.assessment_assignments where assessment_id='"+aid+"'")=='0'
 published=publish(class5);assert published['assignment']['id']
 print('PASS publication authorized EF5; other-school class and linked wrong-grade EF2 denied without assignments',flush=True)
 must_fail(lambda:assembly('avalia_plus_replace_assessment_items',payload,aid),'ASSESSMENT_ASSIGNED_CONTENT_IMMUTABLE')
 print('PASS assigned assessment remains immutable',flush=True)
 # Inner recursion must read beyond100, while outward pagination/dedup remains stable.
 sql("""insert into public.question_items select (jsonb_populate_record(null::public.question_items,to_jsonb(q)||jsonb_build_object('id',md5('large-question-'||n)::uuid,'code','SYN-LARGE-'||n))).* from public.question_items q cross join generate_series(1,105)n where q.id='70000000-0000-0000-0000-000000000001';
 insert into public.content_items select (jsonb_populate_record(null::public.content_items,to_jsonb(c)||jsonb_build_object('id',md5('large-content-'||n)::uuid))).* from public.content_items c join public.content_question_items m on m.content_item_id=c.id cross join generate_series(1,105)n where m.question_item_id='70000000-0000-0000-0000-000000000001';
 insert into public.content_question_items(content_item_id,question_item_id) select md5('large-content-'||n)::uuid,md5('large-question-'||n)::uuid from generate_series(1,105)n;
 insert into public.content_collection_items(collection_id,content_item_id) select '91000000-0000-0000-0000-000000000001',md5('large-content-'||n)::uuid from generate_series(1,105)n;""")
 pages=[]
 for offset in [0,100]:
  ctx={'school_id':school,'content_type':'QUESTION','limit':100,'offset':offset}
  page=json.loads(actor("select public.content_resolve_for_user('"+json.dumps(ctx)+"')",TEACHER));assert page['total']==107;pages.append(page['items'])
 assert len(pages[0])==100 and len(pages[1])==7
 assert len({x['question_item_id'] for page in pages for x in page})==107
 print('PASS107 unique union items, internal class pagination beyond100, outward pages100+7, duplicate-grade class dedup',flush=True)

 assert actor("select public.content_resolve_for_user('{\"school_id\":\""+school+"\",\"content_type\":\"VIDEO\"}')",TEACHER)==unsupported
 print('PASS unsupported non-QUESTION and student branch responses unchanged',flush=True)
 try:
  sql(PATCH.read_text())
  raise AssertionError('Reapply should reject')
 except RuntimeError as e:assert 'TEACHER_LEGACY_GRADE_PRECONDITION_FAILED' in str(e),str(e)
 print('PASS reapply rejects changed before-body',flush=True)
 print('AFTER BODY MD5 '+sql("select md5(prosrc) from pg_proc where oid='school_category_private.legacy_resolver(jsonb)'::regprocedure"),flush=True)
 print('LIMIT isolated actual schema/RPC, no browser/session lifecycle or production writes; legacy licensing unchanged.',flush=True)
finally:
 try:run('rm','-f',NAME)
 except RuntimeError:pass
