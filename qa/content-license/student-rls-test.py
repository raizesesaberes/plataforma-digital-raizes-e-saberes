"""Real repository schema/RLS/functions; only auth claims and identities are synthetic."""
import pathlib,subprocess,time,json,os
ROOT=pathlib.Path(__file__).resolve().parents[2]
NAME='rs-fase3-license-'+str(os.getpid())
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
 context=json.dumps({'school_id':'10000000-0000-0000-0000-000000000001','content_type':'QUESTION'})
 policies="select jsonb_agg(to_jsonb(p) order by tablename,policyname) from pg_policies p where schemaname='public' and tablename in ('question_items','question_alternatives')"
 before=sql(policies)
 assert int(sql('select count(*) from public.question_items'))>0
 assert int(sql('select count(*) from public.question_alternatives'))>0
 def checks(phase):
  for table in ['question_items','question_alternatives']:
   n=actor('select count(*) from public.'+table);assert n=='0',(phase,table,n)
   print('PASS '+phase+' student authenticated direct '+table+'=0',flush=True)
  try:
   result=json.loads(actor("select public.content_resolve_question_details_for_user('"+context+"'::jsonb)"))
   assert not result.get('items'),(phase,result)
   print('PASS '+phase+' student detail RPC no items',flush=True)
  except RuntimeError as e:
   assert 'AUTHORIZED_TEACHER_CONTEXT_NOT_FOUND' in str(e),str(e)
   print('PASS '+phase+' student detail RPC denied AUTHORIZED_TEACHER_CONTEXT_NOT_FOUND',flush=True)
  teacher=json.loads(actor("select public.content_resolve_question_details_for_user('"+context+"'::jsonb)",TEACHER))
  assert len(teacher.get('items',[]))==1,(phase,teacher)
  print('PASS '+phase+' teacher detail RPC positive control=1',flush=True)
 checks('before')
 apply(pathlib.Path('supabase/review/content_question_license.sql'))
 checks('after')
 assert sql(policies)==before
 print('PASS exact real question/alternative RLS policies unchanged',flush=True)
 sql('update public.question_licenses set publication_allowed=false')
 denied=json.loads(actor("select public.content_resolve_question_details_for_user('"+context+"'::jsonb)",TEACHER));assert not denied.get('items'),denied
 print('PASS full-schema teacher detail denies revoked license',flush=True)
 print('LIMIT no browser/production session or exhaustive contract matrix; existing assignment snapshot access not exercised.',flush=True)
finally:
 try:run('rm','-f',NAME)
 except RuntimeError:pass
