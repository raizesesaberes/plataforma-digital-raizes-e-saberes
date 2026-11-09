// Offline PostgreSQL regression. Never connects to a hosted database.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const {PGlite}=await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261109160204_mission_class_grade_aliases.sql');
const original=read('deployment/mission-institutional/mission_institutional.v2.review.sql').match(/create function mission_private\.class_grade\([\s\S]*?\$\$;/)[0];
const prints=read('deployment/mission-institutional/mission_prints.complement.review.sql');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('Colorir recognizes canonical preschool age aliases without weakening access gates',async t=>{
 const db=new PGlite();
 try{
  await db.exec(`
   create role anon; create role authenticated; create schema auth; create schema mission_private;
   create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   create table public.classes(id uuid primary key,school_id uuid,ano_escolar text,school_year text,age_group text);
   create table public.content_segments(id uuid primary key,code text,status text);
   create table public.content_grades(id uuid primary key,segment_id uuid,code text,status text);
   create table public.content_grade_aliases(grade_id uuid,alias_code text);
   create function public.rs_content_normalize_code(text) returns text language sql immutable as $$select trim(both '_' from regexp_replace(upper(coalesce($1,'')),'[^A-Z0-9]+','_','g'))$$;
   create table mission_private.revisions(id uuid primary key,activity_key text,revision text,engine text,grade text,published boolean,owner_auth_id uuid);
   create function mission_private.revision_json(r mission_private.revisions) returns jsonb language sql as $$select jsonb_build_object('id',r.id)$$;
   create function mission_private.release_enabled() returns boolean language sql as $$select coalesce(nullif(current_setting('test.release',true),''),'true')::boolean$$;
   create function mission_private.student_allowed(uuid,uuid) returns boolean language sql as $$select coalesce(nullif(current_setting('test.enrolled',true),''),'true')::boolean$$;
   create function mission_private.teacher_allowed(uuid) returns boolean language sql as $$select false$$;
   create function mission_private.licensed(uuid,uuid) returns boolean language sql as $$select coalesce(nullif(current_setting('test.licensed',true),''),'true')::boolean$$;
   ${original}
   revoke all on function mission_private.class_grade(uuid) from public;
   insert into content_segments values('${id(1)}','EDUCACAO_INFANTIL','active'),('${id(2)}','FUNDAMENTAL','active'),('${id(3)}','FUNDAMENTAL_ANOS_FINAIS','active'),('${id(4)}','ENSINO_MEDIO','active');
   insert into classes values('${id(10)}','${id(11)}',null,'2026','2 anos');
  `);
  for(const [n,segment,code,alias] of [[12,1,'EI2','2_ANOS'],[13,1,'EI3','3_ANOS'],[14,1,'EI4','4_ANOS'],[15,1,'EI5','5_ANOS'],[21,2,'1_ANO','1_ANO'],[25,2,'5_ANO','5_ANO'],[29,3,'9_ANO','9_ANO'],[31,4,'EM_1','EM_1']]){
   await db.query('insert into content_grades values($1,$2,$3,\'active\')',[id(n),id(segment),code]);
   await db.query('insert into content_grade_aliases values($1,$2)',[id(n),alias]);
  }
  for(let n=0;n<8;n++)await db.query('insert into mission_private.revisions values($1,$2,\'1\',\'colorir\',\'infantil\',true,null)',[id(100+n),'color-'+n]);
  await db.exec(prints);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id(50)]);
  const grade=async()=>(await db.query('select mission_private.class_grade($1) grade',[id(10)])).rows[0].grade;
  const count=async()=>(await db.query('select jsonb_array_length(public.mission_print_catalog_v1()) n')).rows[0].n;
  const security=async()=>(await db.query("select proacl::text,prosecdef,proconfig from pg_proc where oid='mission_private.class_grade(uuid)'::regprocedure")).rows[0];
  const before=await security();
  assert.equal(await grade(),null);assert.equal(await count(),0,'reproduces missing themes for an authorized preschool class');
  await db.exec(migration);
  assert.deepEqual(await security(),before,'keep ACL, SECURITY DEFINER and empty search_path');
  assert.equal(await count(),8);await db.exec(migration);assert.equal(await count(),8,'idempotent');
  for(const years of [2,3,4,5])await t.test('preschool '+years+' anos has eight themes',async()=>{
   await db.query('update classes set ano_escolar=null,school_year=\'2026\',age_group=$1',[years+' anos']);assert.equal(await grade(),'infantil');assert.equal(await count(),8);
  });
  for(const [column,value,expected] of [['ano_escolar','1_ANO','1'],['ano_escolar','5_ANO','5'],['age_group','9_ANO','9'],['school_year','EM_1','EM1']])await t.test('preserve '+column+' '+value,async()=>{
   await db.exec('update classes set ano_escolar=null,age_group=null,school_year=null');
   await db.query(`update classes set ${column}=$1`,[value]);assert.equal(await grade(),expected);assert.equal(await count(),0);
  });
  await t.test('repeated fields for same canonical grade are unambiguous',async()=>{
   await db.exec("update classes set ano_escolar='2 anos',age_group='2 anos',school_year='2026'");assert.equal(await grade(),'infantil');assert.equal(await count(),8);
  });
  for(const [name,sql] of [
   ['conflicting preschool ages',"update classes set ano_escolar='4 anos',age_group='2 anos',school_year='2026'"],
   ['conflicting stages',"update classes set ano_escolar='5_ANO',age_group='2 anos',school_year='2026'"],
   ['ambiguous alias',`insert into content_grade_aliases values('${id(14)}','2_ANOS')`],
   ['unknown grade',"update classes set ano_escolar=null,age_group='unknown',school_year='2026'"],
   ['inactive grade',"update content_grades set status='inactive'"],
   ['inactive segment',"update content_segments set status='inactive'"],
   ['revoked enrollment',"select set_config('test.enrolled','false',true)"],
   ['revoked license',"select set_config('test.licensed','false',true)"],
   ['release disabled',"select set_config('test.release','false',true)"],
   ['unpublished themes',"update mission_private.revisions set published=false"],
   ['another teacher private themes',`update mission_private.revisions set owner_auth_id='${id(51)}'`]
  ])await t.test(name+' fails closed',async()=>{
   await db.exec('begin;'+sql);try{assert.equal(await count(),0);}finally{await db.exec('rollback');}
  });
  await db.query("select set_config('request.jwt.claim.sub','',false)");await assert.rejects(count(),/MISSION_FORBIDDEN/);
 }finally{await db.close();}
});
