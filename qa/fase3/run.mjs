// Disposable integration environment. No production URL, credentials, or database accepted.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'../..');process.chdir(root);
const name=`rs-fase3-${process.pid}`;
const run=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',maxBuffer:16*1024*1024,stdio:input===undefined?['ignore','pipe','pipe']:['pipe','pipe','pipe']});
const postgres='postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3';
const postgrest='postgrest/postgrest:v12.2.12@sha256:5f4ce744539bbba786b4e24dbbd95bdb2a956dcf568c5374995a0ff4a68f5bd2';
const baseline=process.argv.includes('--baseline');
const apply=file=>{console.log(`Load ${file}`);run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],readFileSync(file));};
try {
  run(['run','-d','--name',name,'--label','rs.fase3=synthetic','-e','POSTGRES_PASSWORD=synthetic-local-only',postgres]);
  let ready=false;
  for(let i=0;i<100;i++){try{run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break}catch{await new Promise(r=>setTimeout(r,200))}}
  if(!ready)throw new Error('Local postgres did not start');
  apply('qa/fase3/bootstrap.sql');apply('supabase/baselines/20261004_pilot_schema_baseline.sql');
  for(const file of readdirSync('supabase/migrations').filter(x=>x.startsWith('202610')&&x.endsWith('.sql')).sort())apply(`supabase/migrations/${file}`);
  apply('qa/fase3/observed-start-attempt.sql');
  apply('qa/fase3/observed-boundary-fixture.sql');
  apply('qa/fase3/observed-20261009195512.sql');
  apply('qa/fase3/observed-boundary-alignment.sql');
  apply('qa/fase3/seed.sql');
  const expected=[...JSON.parse(readFileSync('qa/fase3/production-parity.json')).functions,...JSON.parse(readFileSync('qa/fase3/reply-production-parity.json')).functions];
  const names=expected.map(x=>"'"+x.proname+"'").join(',');
  const parityQuery=`select json_agg(x) from (select p.proname, pg_get_function_identity_arguments(p.oid) as args, md5(p.prosrc) as body_md5, p.prosecdef as security_definer, p.proconfig, p.proacl::text as acl, has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute, has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','school_category_private') and p.proname in (${names})) x;`;
  const actual=JSON.parse(run(['exec','-i',name,'psql','-U','postgres','-At'],parityQuery));
  for(const row of expected){const match=actual.find(x=>x.proname===row.proname && x.args===row.args);if(JSON.stringify(match)!==JSON.stringify(row))throw new Error('Production parity mismatch: '+row.proname);}
  writeFileSync('qa/fase3/local-parity.json',JSON.stringify({status:'PASS',matchedFunctions:expected.length,checks:'body_md5, signature, security_definer, search_path, exact ACL and execute privileges'},null,2)+'\n');
  if(!baseline){apply('supabase/review/fase3_assessment_authorization.sql');apply('supabase/review/fase3_communication_replies.sql');apply('supabase/review/fase3_notice_editing.sql');}
  run(['run','-d','--name',`${name}-rest`,'--label','rs.fase3=synthetic','--network',`container:${name}`,'-e','PGRST_DB_URI=postgres://authenticator:synthetic-local-only@127.0.0.1:5432/postgres','-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET=fase3-synthetic-jwt-secret-never-production-123456',postgrest]);
  const info=JSON.parse(run(['inspect',name]))[0];const host=Object.values(info.NetworkSettings.Networks)[0].IPAddress;
  ready=false;
  for(let i=0;i<100;i++){try{const res=await fetch(`http://${host}:3000/`);if(res.ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,200));}
  if(!ready)throw new Error('Local PostgREST did not start');
  execFileSync(process.execPath,['qa/fase3/journeys.mjs',name,...(baseline?['--baseline']:[])],{stdio:'inherit'});
} catch(error) {console.error(error.stderr?.toString()||error.message);process.exitCode=1;}
finally {for(const container of [`${name}-rest`,name]){try{run(['rm','-fv',container])}catch{}}}
