"""Real repository schema/RLS/functions; only auth claims and identities are synthetic."""
import pathlib,subprocess,time,json,os,hashlib,sys
ROOT=pathlib.Path(__file__).resolve().parents[2]
NAME='rs-teacher-messages-'+str(os.getpid())
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
 def uid(n):return '00000000-0000-0000-0000-'+str(n).zfill(12)
 school='10000000-0000-0000-0000-000000000001';classid='30000000-0000-0000-0000-000000000001';student='40000000-0000-0000-0000-000000000001';otherstudent='40000000-0000-0000-0000-000000000003'
 sql("""insert into auth.users(id) select ('00000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(7,9)n;
 insert into profiles(id,platform_role,display_name) select id,case when right(id::text,1)='9' then 'aluno' else 'familia' end,'Synthetic extra' from auth.users where right(id::text,1) in('7','8','9');
 insert into public.users(id,nome,perfil) select id,display_name,platform_role from profiles where right(id::text,1) in('7','8','9');
 insert into students(id,user_id,school_id,class_id,nome,status) values('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','Synthetic other student','active');
 insert into enrollments(student_id,class_id,school_id,school_year) values('40000000-0000-0000-0000-000000000003','30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026');
 insert into student_guardians(student_id,profile_id) values('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000006'),('40000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000007'),('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000008');
 """)
 def call(q,n):
  role={1:'professor',2:'aluno',3:'secretaria',4:'professor',5:'aluno',9:'aluno'}.get(n,'familia')
  return sql('set request.jwt.claims='+lit(json.dumps({'sub':uid(n),'role':'authenticated','app_metadata':{'platform_role':role}}))+';set role authenticated;'+q)
 def publish(sid=student,audience='student',n=1):return json.loads(call('select publish_communication('+','.join([lit(school),lit('message'),lit(audience),lit('Synthetic private message'),lit('Synthetic private body'),lit(classid),lit(sid) if sid else 'null'])+')',n))
 r=publish();comm=r['communication_id'];assert r['deliveries_created']==2,r
 def inbox(n):return json.loads(call("select coalesce(jsonb_agg(t),'[]') from communication_get_inbox() t",n))
 assert len(inbox(2))==len(inbox(6))==1
 for n in [5,7,8,9]:assert inbox(n)==[],(n,inbox(n))
 assert call('select count(*) from communications where id='+lit(comm),6)=='1'
 for n in [5,7,8,9]:assert call('select count(*) from communications where id='+lit(comm),n)=='0'
 before=sql('select count(*) from communications')
 for sid,n in [('40000000-0000-0000-0000-000000000002',1),(student,4),(student,7)]:
  try:publish(sid,n=n);raise AssertionError('forbidden send')
  except RuntimeError as e:assert 'permissao' in str(e) or 'matricula' in str(e),str(e)
 assert sql('select count(*) from communications')==before
 sql("update student_guardians set status='inactive' where profile_id="+lit(uid(6)))
 r=publish();assert r['deliveries_created']==1,r
 sql("update class_teacher_memberships set started_at=now()-interval '2 days', ended_at=now()-interval '1 day' where class_id="+lit(classid))
 try:publish();raise AssertionError('expired teacher link')
 except RuntimeError as e:assert 'permissao' in str(e)
 print('PASS PostgreSQL existing publish_communication and RLS: individual delivers only target student + active linked guardian; other same-class student/family and other-school family cannot receive/read; forged school/student and expired teacher membership denied; inactive guardian gets no new delivery. No new backend SQL required or applied.',flush=True)
finally:
 run('rm','-fv',NAME)
