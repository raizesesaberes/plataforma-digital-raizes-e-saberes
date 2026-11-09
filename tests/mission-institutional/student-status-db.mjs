// Offline PostgreSQL regression. Use installed @electric-sql/pglite (0.3.14 tested),
// or set PGLITE_MODULE to its dist/index.js. Never connects to a hosted database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261109154633_mission_student_status_compatibility.sql');
const original=read('deployment/mission-institutional/mission_institutional.v2.review.sql').match(/create function mission_private\.student_allowed\([\s\S]*?\$\$;/)[0];
const list=read('deployment/mission-institutional/mission_entitlements.complement.review.sql').match(/create or replace function mission_private\.student_list\([\s\S]*?end\$\$;/)[0];
const uid='10000000-0000-0000-0000-000000000001',classId='20000000-0000-0000-0000-000000000001',schoolId='30000000-0000-0000-0000-000000000001',other='90000000-0000-0000-0000-000000000001';
test('student status compatibility preserves all existing enrollment, tenant, assignment and license gates',async t=>{
 const db=new PGlite();
 try {
 await db.exec(`
 create schema auth; create schema mission_private; create role authenticated;
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.students(id uuid primary key,user_id uuid,status text);
 create table public.enrollments(student_id uuid,class_id uuid,school_id uuid,status text,enrolled_at timestamptz,ended_at timestamptz);
 create table public.classes(id uuid primary key,school_id uuid,status text);
 create table public.schools(id uuid primary key,status text);
 create table mission_private.assignments(id uuid,class_id uuid,school_id uuid,revision_id uuid,assigned_at timestamptz,starts_at timestamptz,ends_at timestamptz,cancelled_at timestamptz);
 create function mission_private.release_enabled() returns boolean language sql as $$select coalesce(nullif(current_setting('test.release',true),''),'true')::boolean$$;
 create function mission_private.licensed(uuid,uuid) returns boolean language sql as $$select coalesce(nullif(current_setting('test.license',true),''),'true')::boolean$$;
 create function mission_private.assignment_json(a mission_private.assignments) returns jsonb language sql as $$select jsonb_build_object('id',a.id)$$;
 insert into public.students values('${uid}','${uid}','ativo');
 insert into public.enrollments values('${uid}','${classId}','${schoolId}','active',now()-interval '1 day',null);
 insert into public.classes values('${classId}','${schoolId}','active');
 insert into public.schools values('${schoolId}','active');
 insert into mission_private.assignments values('${other}','${classId}','${schoolId}','${other}',now(),now()-interval '1 hour',now()+interval '1 day',null);
 ${original}
 revoke all on function mission_private.student_allowed(uuid,uuid) from public;
 grant execute on function mission_private.student_allowed(uuid,uuid) to authenticated;
 ${list}`);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);
 const allowed=async(c=classId,s=schoolId)=>(await db.query('select mission_private.student_allowed($1,$2) ok',[c,s])).rows[0].ok;
 const count=async()=>(await db.query('select jsonb_array_length(mission_private.student_list()) n')).rows[0].n;
 const acl=async()=>(await db.query("select proacl::text acl from pg_proc where oid='mission_private.student_allowed(uuid,uuid)'::regprocedure")).rows[0].acl;
 const beforeAcl=await acl();
 assert.equal(await allowed(),false,'reproduce production active/ativo mismatch');
 assert.equal(await count(),0);
 await db.exec(migration);
 assert.equal(await acl(),beforeAcl,'CREATE OR REPLACE must preserve grants');
 assert.equal(await allowed(),true);assert.equal(await count(),1);
 await db.exec(migration);assert.equal(await count(),1,'migration is idempotent');
 for(const status of ['active','ativo']) await t.test('allow canonical student status '+status,async()=>{
  await db.query('update public.students set status=$1',[status]);assert.equal(await count(),1);
 });
 const blocked=[
 ['inactive student',"update public.students set status='inactive'"],
 ['inativo student',"update public.students set status='inativo'"],
 ['null student status',"update public.students set status=null"],
 ['unknown student status',"update public.students set status='ATIVO'"],
 ['different authenticated student',`update public.students set user_id='${other}'`],
 ['missing enrollment','delete from public.enrollments'],
 ['inactive enrollment',"update public.enrollments set status='inactive'"],
 ['unrecognized enrollment spelling remains blocked',"update public.enrollments set status='ativo'"],
 ['future enrollment',"update public.enrollments set enrolled_at=now()+interval '1 day'"],
 ['expired enrollment',"update public.enrollments set ended_at=now()-interval '1 day'"],
 ['wrong class',`update public.enrollments set class_id='${other}'`],
 ['wrong school',`update public.enrollments set school_id='${other}'`],
 ['class school mismatch',`update public.classes set school_id='${other}'`],
 ['inactive class',"update public.classes set status='inactive'"],
 ['inactive school',"update public.schools set status='inactive'"],
 ['cancelled assignment',"update mission_private.assignments set cancelled_at=now()"],
 ['future assignment',"update mission_private.assignments set starts_at=now()+interval '1 day'"],
 ['expired assignment',"update mission_private.assignments set ends_at=now()-interval '1 hour'"],
 ['license revoked',"select set_config('test.license','false',true)"],
 ['release disabled',"select set_config('test.release','false',true)"]
 ];
 for(const [name,sql] of blocked)await t.test(name,async()=>{
  await db.exec('begin;'+sql);try{assert.equal(await count(),0);}finally{await db.exec('rollback');}
 });
 assert.equal(await allowed(other,schoolId),false);assert.equal(await allowed(classId,other),false);
 await db.query("select set_config('request.jwt.claim.sub','',false)");assert.equal(await allowed(),false);
 await assert.rejects(count(),/MISSION_FORBIDDEN/);
 } finally {await db.close();}
});
