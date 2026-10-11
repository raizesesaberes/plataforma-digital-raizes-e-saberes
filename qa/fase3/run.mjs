// Disposable integration environment. No production URL, credentials, or database accepted.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'../..');process.chdir(root);
const name=`rs-fase3-${process.pid}`;
const run=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',maxBuffer:16*1024*1024,stdio:input===undefined?['ignore','pipe','pipe']:['pipe','pipe','pipe']});
const postgres='postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3';
const postgrest='postgrest/postgrest:v12.2.12@sha256:5f4ce744539bbba786b4e24dbbd95bdb2a956dcf568c5374995a0ff4a68f5bd2';
const apply=file=>{console.log(`Load ${file}`);run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1'],readFileSync(file));};
try {
  run(['run','-d','--name',name,'--label','rs.fase3=synthetic','-e','POSTGRES_PASSWORD=synthetic-local-only',postgres]);
  let ready=false;
  for(let i=0;i<100;i++){try{run(['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres']);ready=true;break}catch{await new Promise(r=>setTimeout(r,200))}}
  if(!ready)throw new Error('Local postgres did not start');
  apply('qa/fase3/bootstrap.sql');apply('supabase/baselines/20261004_pilot_schema_baseline.sql');
  for(const file of readdirSync('supabase/migrations').filter(x=>x.startsWith('202610')&&x.endsWith('.sql')).sort())apply(`supabase/migrations/${file}`);
  apply('qa/fase3/observed-start-attempt.sql');
  apply('qa/fase3/seed.sql');
  run(['run','-d','--name',`${name}-rest`,'--label','rs.fase3=synthetic','--network',`container:${name}`,'-e','PGRST_DB_URI=postgres://authenticator:synthetic-local-only@127.0.0.1:5432/postgres','-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET=fase3-synthetic-jwt-secret-never-production-123456',postgrest]);
  const info=JSON.parse(run(['inspect',name]))[0];const host=Object.values(info.NetworkSettings.Networks)[0].IPAddress;
  ready=false;
  for(let i=0;i<100;i++){try{const res=await fetch(`http://${host}:3000/`);if(res.ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,200));}
  if(!ready)throw new Error('Local PostgREST did not start');
  execFileSync(process.execPath,['qa/fase3/journeys.mjs',name],{stdio:'inherit'});
} catch(error) {console.error(error.stderr?.toString()||error.message);process.exitCode=1;}
finally {for(const container of [`${name}-rest`,name]){try{run(['rm','-fv',container])}catch{}}}
