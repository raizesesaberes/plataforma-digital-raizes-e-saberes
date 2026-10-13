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
 apply(pathlib.Path('supabase/review/fase3_communication_replies.sql'))
 apply(pathlib.Path('supabase/review/fase3_notice_editing.sql'))
 apply(pathlib.Path('supabase/review/teacher_message_audiences.sql'))
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
 def call(q,n,claims=True):
  role={1:'professor',2:'aluno',3:'secretaria',4:'professor',5:'aluno',9:'aluno'}.get(n,'familia')
  jwt={'sub':uid(n),'role':'authenticated'}
  if claims:jwt['app_metadata']={'platform_role':role}
  return sql('set request.jwt.claims='+lit(json.dumps(jwt))+';set role authenticated;'+q)
 def publish(sid=student,audience='student',n=1):return json.loads(call('select publish_communication('+','.join([lit(school),lit('message'),lit(audience),lit('Synthetic private message'),lit('Synthetic private body'),lit(classid),lit(sid) if sid else 'null'])+')',n))
 r=publish();comm=r['communication_id'];assert r['deliveries_created']==2,r
 def inbox(n):return json.loads(call("select coalesce(jsonb_agg(t),'[]') from communication_get_inbox() t",n))
 assert len(inbox(2))==len(inbox(6))==1
 for n in [5,7,8,9]:assert inbox(n)==[],(n,inbox(n))
 assert call('select count(*) from communications where id='+lit(comm),6)=='1'
 for n in [5,7,8,9]:assert call('select count(*) from communications where id='+lit(comm),n)=='0'
 # New explicit audience matrix; every identity/content is fictional.
 import uuid,concurrent.futures
 sql("insert into auth.users(id) values("+lit(uid(10))+"),("+lit(uid(11))+");insert into profiles(id,platform_role,display_name) values("+lit(uid(10))+",'familia','Second active guardian'),("+lit(uid(11))+",'familia','Blocked guardian');")
 sql("insert into guardians(id,school_id,profile_id,full_name,status,access_status) values('90000000-0000-0000-0000-000000000010',"+lit(school)+","+lit(uid(10))+",'Second active guardian','active','active'),('90000000-0000-0000-0000-000000000011',"+lit(school)+","+lit(uid(11))+",'Blocked guardian','active','blocked');insert into student_guardian_links(guardian_id,student_id) values('90000000-0000-0000-0000-000000000010',"+lit(student)+"),('90000000-0000-0000-0000-000000000011',"+lit(student)+");")
 def newpublish(scope='student_family',sid=student,n=1,key=None,body='Synthetic scoped body',sc=school,cl=classid,claims=False):
  payload={'schoolId':sc,'classId':cl,'studentId':sid,'recipientScope':scope,'title':'Synthetic '+scope,'body':body}
  key=key or str(uuid.uuid4())
  return json.loads(call('select teacher_publish_message('+lit(key)+','+lit(json.dumps(payload))+'::jsonb)',n,claims))
 def denied(q,n):
  try:call(q,n)
  except RuntimeError:return
  raise AssertionError(('unexpected authorization',n,q))
 def readable(cid,n):return call('select count(*) from communications where id='+lit(cid),n)=='1'
 def inbox_ids(n,center=False):
  data=json.loads(call("select coalesce(jsonb_agg(t),'[]') from "+('notification_get_center' if center else 'communication_get_inbox')+'() t',n))
  return [x.get('communication_id',x.get('source_id')) for x in data]
 scoped={}
 for scope,wanted in [('student',{2}),('family',{6,10}),('student_family',{2,6,10})]:
  key=str(uuid.uuid4());r=newpublish(scope,key=key);cid=r['communication_id'];scoped[scope]=cid
  assert r['deliveries_created']==len(wanted),r
  assert newpublish(scope,key=key)==r,'retry changed result'
  assert json.loads(call('select teacher_get_message_request('+lit(key)+')',1))['result']==r
  assert json.loads(call('select teacher_get_message_request('+lit(key)+')',4))=={'found':False}
  denied('select teacher_publish_message('+lit(key)+','+lit(json.dumps({'schoolId':school,'classId':classid,'studentId':student,'recipientScope':scope,'title':'changed','body':'different'}))+'::jsonb)',1)
  assert readable(cid,1) and readable(cid,3)
  delivery=json.loads(sql("select jsonb_agg(jsonb_build_object('id',id,'who',recipient_profile_id)) from communication_deliveries where communication_id="+lit(cid)))
  for n in [2,4,5,6,7,8,9,10,11]:
   expected=n in wanted
   assert readable(cid,n)==expected,(scope,n,'raw')
   row=sql('select to_jsonb(c) from communications c where id='+lit(cid))
   assert (call('select communication_user_can_access_advanced(jsonb_populate_record(null::communications,'+lit(row)+'::jsonb))',n)=='t')==expected,(scope,n,'attachment guard')
   assert (cid in inbox_ids(n))==expected,(scope,n,'inbox')
   assert (cid in inbox_ids(n,True))==expected,(scope,n,'center')
   if expected:
    did=next(d['id'] for d in delivery if d['who']==uid(n))
    read=json.loads(call('select communication_mark_read('+lit(did)+')',n));assert read['read_at'] and read['changed']
    assert not json.loads(call('select communication_mark_read('+lit(did)+')',n))['changed']
    assert json.loads(call('select communication_get_notice_versions('+lit(cid)+','+lit(did)+')',n))['body']=='Synthetic scoped body'
    assert json.loads(call('select communication_get_reply_thread('+lit(did)+')',n))['body']=='Synthetic scoped body'
    call('select communication_mark_revision_read('+lit(did)+',1)',n)
   else:
    did=delivery[0]['id']
    denied('select communication_mark_read('+lit(did)+')',n)
    denied('select communication_get_notice_versions('+lit(cid)+','+lit(did)+')',n)
    denied('select communication_get_reply_thread('+lit(did)+')',n)
    denied('select communication_mark_revision_read('+lit(did)+',1)',n)
  summaries=json.loads(call("select jsonb_agg(t) from communication_list_delivery_summaries() t where communication_id="+lit(cid),1));assert summaries[0]['read_count']==len(wanted)
  assert sql('select communication_generate_deliveries('+lit(cid)+')')=='0'
 print('PASS explicit student/family/both: delivery, raw RLS, inbox, notification center, author, multiple active guardians, inactive/blocked guardian, same-class and school isolation, receipt ownership, legacy reply/version readers.',flush=True)
 # Valid institutional professor works without app_metadata/role claims; actual stored role controls permission.
 cid=newpublish(scope='student',claims=False)['communication_id']
 assert sql("select author_profile_id::text||':'||author_role from communications where id="+lit(cid))==uid(1)+':professor'
 sql("update profiles set platform_role='aluno' where id="+lit(uid(1)))
 for claims in [False,True]:
  try:newpublish(claims=claims);raise AssertionError('improper stored role accepted')
  except RuntimeError as e:assert 'MESSAGE_TEACHER_FORBIDDEN' in str(e)
 sql("update profiles set platform_role='professor' where id="+lit(uid(1)))
 print('PASS institutional professor without JWT role claims publishes; stored nonteacher role and invalid membership denied; no Auth metadata workaround.',flush=True)
 # Author checks, foreign contexts, direct mutation and private request table ACL.
 for n in [2,4,6]:
  try:newpublish(n=n);raise AssertionError('forged author')
  except RuntimeError:pass
 for options in [dict(sid='40000000-0000-0000-0000-000000000002'),dict(sc='10000000-0000-0000-0000-000000000002')]:
  try:newpublish(**options);raise AssertionError('foreign context')
  except RuntimeError:pass
 denied('select * from school_category_private.teacher_message_requests',1)
 assert sql("select has_function_privilege('anon','public.teacher_publish_message(uuid,jsonb)','EXECUTE') or has_function_privilege('anon','public.teacher_get_message_request(uuid)','EXECUTE') or has_function_privilege('authenticated','school_category_private.message_scope_access(communications)','EXECUTE')")=='f'
 denied("update communications set recipient_scope='student' where id="+lit(scoped['family']),1)
 # A family-only request with no active guardian must roll back completely.
 sql("update student_guardians set status='inactive' where profile_id="+lit(uid(7)))
 oldcount=sql('select count(*) from communications')
 try:newpublish(scope='family',sid=otherstudent);raise AssertionError('empty family delivery')
 except RuntimeError as e:assert 'MESSAGE_NO_ELIGIBLE_RECIPIENTS' in str(e)
 assert sql('select count(*) from communications')==oldcount
 assert newpublish(scope='student',sid=otherstudent)['deliveries_created']==1
 assert newpublish(scope='student_family',sid=otherstudent)['deliveries_created']==1
 # Concurrent equal request keys produce one communication/result.
 key=str(uuid.uuid4());oldcount=int(sql('select count(*) from communications'))
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: replies=list(pool.map(lambda _:newpublish(key=key),range(2)))
 assert replies[0]==replies[1] and int(sql('select count(*) from communications'))==oldcount+1
 # Withdrawal/expiry must hide scoped messages even with retained delivery rows.
 for column,value in [('status',"'archived'"),('expires_at',"now()-interval '1 minute'")]:
  cid=scoped['family'];sql('update communications set '+column+'='+value+' where id='+lit(cid))
  for n in [6,10]:
   assert not readable(cid,n) and cid not in inbox_ids(n) and cid not in inbox_ids(n,True)
  sql("update communications set status='published',expires_at=null where id="+lit(cid))
 # Revoked family link loses content and receipt rights for already delivered messages.
 cid=scoped['family'];did=sql('select id from communication_deliveries where communication_id='+lit(cid)+' and recipient_profile_id='+lit(uid(6)))
 sql("update student_guardians set status='inactive' where profile_id="+lit(uid(6)))
 assert not readable(cid,6) and cid not in inbox_ids(6) and cid not in inbox_ids(6,True)
 denied('select communication_mark_read('+lit(did)+')',6);denied('select communication_get_reply_thread('+lit(did)+')',6)
 sql("update student_guardians set status='active' where profile_id="+lit(uid(6)))
 # Scoped management readers must not bypass current profile/school/membership.
 cid=scoped['family'];did=sql('select id from communication_deliveries where communication_id='+lit(cid)+' and recipient_profile_id='+lit(uid(6)))
 report=json.loads(call('select communication_report_delivery('+lit(did)+",'outro','Synthetic report quoting private content')",6))
 reportid=sql('select id from communication_moderation_reports where delivery_id='+lit(did))
 def management_lists():
  for query in ['select count(*) from secretaria_list_communications() where id=', 'select count(*) from secretaria_list_communication_events() where communication_id=', 'select count(*) from communication_list_delivery_summaries() where communication_id=']:
   assert call(query+lit(cid),3)=='0',query
  assert call('select count(*) from communication_moderation_reports where id='+lit(reportid),3)=='0'
  for query in ['select communication_get_notice_versions('+lit(cid)+')','select communication_list_reply_threads('+lit(cid)+')','select communication_edit_notice('+lit(cid)+",1,'changed','changed',"+lit(str(uuid.uuid4()))+')','select secretaria_set_communication_status('+lit(cid)+",'archived')",'select secretaria_delete_communication('+lit(cid)+')','select communication_review_report('+lit(reportid)+",'EM_ANALISE')"]:denied(query,3)
  assert not readable(cid,3)
 assert call('select count(*) from secretaria_list_communications() where id='+lit(cid),3)=='1'
 assert json.loads(call('select communication_get_notice_versions('+lit(cid)+')',3))['body']=='Synthetic scoped body'
 for change,restore in [("update profiles set status='inactive' where id="+lit(uid(3)),"update profiles set status='active' where id="+lit(uid(3))), ("update schools set status='inactive' where id="+lit(school),"update schools set status='active' where id="+lit(school)), ("update school_memberships set status='inactive' where profile_id="+lit(uid(3)),"update school_memberships set status='active' where profile_id="+lit(uid(3)))]:
  sql(change);management_lists();sql(restore)
 assert call('select count(*) from secretaria_list_communications() where id='+lit(cid),3)=='1'
 # Retain old legacy listing semantics, while scoped rows are hidden for inactive profiles.
 sql("update profiles set status='inactive' where id="+lit(uid(3)))
 assert call('select count(*) from secretaria_list_communications() where id='+lit(comm),3)=='1'
 sql("update profiles set status='active' where id="+lit(uid(3)))
 print('PASS management scoped readers/mutations: inactive profile, inactive school, revoked membership deny lists, versions, threads, receipt summaries, quoted reports, edits/status/delete; historical legacy listing semantics preserved.',flush=True)
 # Audience cannot be widened, even by an old lifecycle path with owner privileges.
 try:sql("update communications set recipient_scope='student_family' where id="+lit(scoped['family']));raise AssertionError('audience widened')
 except RuntimeError as e:assert 'MESSAGE_AUDIENCE_IMMUTABLE' in str(e)
 # Inactive school is not a current authorized context.
 sql("update schools set status='inactive' where id="+lit(school))
 assert not readable(scoped['family'],6)
 try:newpublish();raise AssertionError('inactive school')
 except RuntimeError as e:assert 'MESSAGE_TEACHER_FORBIDDEN' in str(e)
 sql("update schools set status='active' where id="+lit(school))
 print('PASS durable request identity: replay, conflict, concurrent retries, no-recipient atomic rollback, inactive links, archive/expiry; private table/direct writes denied. This is deduplication by persistent key, not a general exactly-once claim.',flush=True)
 sql("update guardians set status='inactive' where profile_id in("+lit(uid(10))+','+lit(uid(11))+')')
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
 try:newpublish();raise AssertionError('expired teacher explicit audience')
 except RuntimeError as e:assert 'MESSAGE_TEACHER_FORBIDDEN' in str(e)
 print('PASS PostgreSQL existing publish_communication and RLS: individual delivers only target student + active linked guardian; other same-class student/family and other-school family cannot receive/read; forged school/student and expired teacher membership denied; inactive guardian gets no new delivery. New audience SQL applied only in this disposable container; never production.',flush=True)
finally:
 run('rm','-fv',NAME)
