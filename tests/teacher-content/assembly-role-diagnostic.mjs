// Diagnostic regression only. All identities/state exist solely in a disposable Docker database.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const name=`rs-assembly-role-${process.pid}`;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',maxBuffer:16*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=input=>docker(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],input);
try{
 docker(['run','-d','--name',name,'--label','rs.fase3=synthetic','-e','POSTGRES_PASSWORD=synthetic-local-only','postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3']);
 let ready=false;for(let n=0;n<100;n++){try{docker(['exec',name,'pg_isready','-U','postgres']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,200));}}assert(ready);
 sql(readFileSync('qa/fase3/bootstrap.sql','utf8'));
 sql(readFileSync('supabase/baselines/20261004_pilot_schema_baseline.sql','utf8'));
 const expected={avalia_plus_can_author_items:'e412292d6269c8e87251e3f8948408fc',avalia_plus_create_assessment_from_bank:'dd108be00647e4e653a4c1b7dda5f24e',current_question_bank_role:'05a3314b0f14e2b33d6b25ed0a508d0f',has_question_bank_role:'4d7dd8436492fd34b8877fd7ba9f1bf8'};
 const names=Object.keys(expected).map(x=>"'"+x+"'").join(',');
 const actual=JSON.parse(sql(`select json_object_agg(p.proname,md5(p.prosrc)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in (${names});`).trim());
 assert.deepEqual(actual,expected,'Diagnostic functions must match production read-only snapshot');
 console.log('PASS four guard/assembly function bodies match production snapshot');
 const result=sql(`
 insert into auth.users(id) values('00000000-0000-0000-0000-000000000001');
 insert into public.profiles(id,display_name,platform_role,status) values('00000000-0000-0000-0000-000000000001','SYNTHETIC','professor','active');
 insert into public.schools(id,nome,status) values('10000000-0000-0000-0000-000000000001','SYNTHETIC','active');
 insert into public.teachers(id,profile_id,school_id,status) values('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','active');
 insert into public.classes(id,school_id,nome,ano_escolar,school_year,status) values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','SYNTHETIC','5º Ano','2026','active');
 insert into public.class_teacher_memberships(class_id,teacher_id,status) values('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','active');
 select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{}}',false);
 do $$ declare denied boolean:=false;begin
 if public.current_question_bank_role()<>'' or public.avalia_plus_can_author_items() then raise exception 'Unexpected role resolution';end if;
 begin perform public.avalia_plus_create_assessment_from_bank('{"title":"SYNTHETIC role mismatch","application_date":"2026-10-11","component":"Matemática","school_year":"5","questions":[{"question_id":"70000000-0000-0000-0000-000000000001","position":1,"points":1}]}'::jsonb);
 exception when sqlstate 'P0001' then if sqlerrm<>'UNAUTHORIZED_ASSESSMENT_ASSEMBLY' then raise;end if;denied:=true;end;
 if not denied then raise exception 'Expected assembly rejection';end if;
 if exists(select 1 from public.assessments where title='SYNTHETIC role mismatch') then raise exception 'Unexpected persisted assessment';end if;
 end $$;
 select 'PASS institutional professor + active membership + absent legacy role => P0001 UNAUTHORIZED_ASSESSMENT_ASSEMBLY, zero assessments';
 select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","app_metadata":{"question_bank_role":"professor"}}',false);
 do $$ begin if not public.avalia_plus_can_author_items() then raise exception 'Legacy fixture role must pass initial guard';end if;end $$;
 select 'PASS historical synthetic fixtures included question_bank_role and therefore concealed the mismatch';
 `);
 console.log(result.split('\n').filter(x=>x.startsWith('PASS')).join('\n'));
}catch(e){console.error(e.stderr?.toString()||e.message);process.exitCode=1;}
finally{try{docker(['rm','-fv',name]);}catch{}}
