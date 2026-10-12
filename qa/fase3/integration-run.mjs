// Disposable integration environment. No production URL, credentials, or database accepted.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {recordStage,writeManifestIndex,manifestQuery} from './release-manifest.mjs';
import assert from 'node:assert/strict';
import {checkVersionQuery} from './check-version-query.mjs';
const root=resolve(import.meta.dirname,'../..');process.chdir(root);
const name=`rs-fase3-${process.pid}`;
const run=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',maxBuffer:16*1024*1024,stdio:input===undefined?['ignore','pipe','pipe']:['pipe','pipe','pipe']});
const postgres='postgres:17@sha256:2d2b8998d31037bf721cfdf764d76ba74171b4fab3431b7f72c27c56ddbdf9e3';
const postgrest='postgrest/postgrest:v12.2.12@sha256:5f4ce744539bbba786b4e24dbbd95bdb2a956dcf568c5374995a0ff4a68f5bd2';
const baseline=false;
const manifestsOnly=process.argv.includes('--manifests-only');
const stage=nameOfStage=>{if(manifestsOnly)recordStage(nameOfStage,sql=>run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],sql));};
const autosaveOnly=process.argv.includes('--autosave-only');
const routingOnly=process.argv.includes('--routing-only');
const contractsFirst=process.argv.includes('--contracts-first');
const snapshot=()=>JSON.parse(run(['exec','-i',name,'psql','-U','postgres','-At'],`select jsonb_object_agg(key, value) from (select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' key,jsonb_build_object('body_md5',md5(p.prosrc),'definition_md5',md5(pg_get_functiondef(p.oid)),'acl',p.proacl::text,'config',p.proconfig,'owner',pg_get_userbyid(p.proowner)) value from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','school_category_private') union all select 'trigger:'||t.tgrelid::regclass::text||':'||t.tgname,jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) from pg_trigger t where not t.tgisinternal) s;`));
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
  apply('tests/contracts/admin-assert.sql');apply('tests/contracts/production-legacy-helpers.sql');
  apply('qa/fase3/seed.sql');
  const expected=[...JSON.parse(readFileSync('qa/fase3/production-parity.json')).functions,...JSON.parse(readFileSync('qa/fase3/reply-production-parity.json')).functions];
  const names=expected.map(x=>"'"+x.proname+"'").join(',');
  const parityQuery=`select json_agg(x) from (select p.proname, pg_get_function_identity_arguments(p.oid) as args, md5(p.prosrc) as body_md5, p.prosecdef as security_definer, p.proconfig, p.proacl::text as acl, has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute, has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','school_category_private') and p.proname in (${names})) x;`;
  const actual=JSON.parse(run(['exec','-i',name,'psql','-U','postgres','-At'],parityQuery));
  for(const row of expected){const match=actual.find(x=>x.proname===row.proname && x.args===row.args);if(JSON.stringify(match)!==JSON.stringify(row))throw new Error('Production parity mismatch: '+row.proname);}
  writeFileSync('qa/fase3/local-parity.json',JSON.stringify({status:'PASS',matchedFunctions:expected.length,checks:'body_md5, signature, security_definer, search_path, exact ACL and execute privileges'},null,2)+'\n');
  const contractPreflight=readFileSync('supabase/review/contract_operations_preflight.sql','utf8').split('select count(*)=149')[0];
  const checked=run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],contractPreflight);
  if(checked.trim().split('\n').some(line=>!line.endsWith('|t')))throw new Error('Contract function preflight mismatch: '+checked);
  console.log('PASS seven contract function preconditions (migration ledger is outside this synthetic fixture)');
  const beforeFase3=snapshot();
  const observed=JSON.parse(readFileSync('qa/fase3/boundary-production-stage0.json'));
  const catalog=()=>JSON.parse(run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],manifestQuery));
  assert.deepEqual(catalog(),observed,'Synthetic initial catalog differs from captured production boundaries');
  console.log('PASS exact production stage0 parity, including existing question/snapshot boundaries');
  stage('00_before');
  if(contractsFirst)apply('supabase/review/contract_operations.sql');
  if(!baseline){apply('supabase/review/fase3_assessment_authorization.sql');stage('01_after_pr2');apply('supabase/review/fase3_communication_replies.sql');stage('02_after_pr3');apply('supabase/review/fase3_notice_editing.sql');stage('03_after_pr4');}
  const afterFase3=snapshot();
  if(!contractsFirst)apply('supabase/review/contract_operations.sql');
  stage('04_after_pr1');
  const afterContracts=snapshot();
  const finalCatalog=catalog();
  const boundaryNames=new Set(JSON.parse(readFileSync('qa/fase3/boundary-production-functions.json')).map(x=>x.proname));
  for(const [key,value] of Object.entries(observed.functions)){
    if(boundaryNames.has(key.split('.')[1].split('(')[0]))assert.deepEqual(finalCatalog.functions[key],value,'Existing boundary function changed: '+key);
  }
  for(const name of ['question_items','question_alternatives','question_media','question_distractor_analyses','question_item_versions','question_workflow_events','question_curation_history','assessment_booklets','assessment_booklet_questions']){
    assert.deepEqual(finalCatalog.relations['public.'+name],observed.relations['public.'+name],'Existing protected relation changed: '+name);
  }
  const aq=observed.relations['public.assessment_questions'];
  assert.deepEqual(finalCatalog.relations['public.assessment_questions'].policies,aq.policies);
  for(const trigger of aq.triggers)assert.deepEqual(finalCatalog.relations['public.assessment_questions'].triggers.find(t=>t.name===trigger.name),trigger);
  console.log('PASS existing boundary functions/ACLs, restrictive policies and enabled triggers preserved after all four proposals');
  const protectedObjects=Object.keys(afterFase3).filter(key=>JSON.stringify(afterFase3[key])!==JSON.stringify(beforeFase3[key]));
  const overwritten=protectedObjects.filter(key=>JSON.stringify(afterFase3[key])!==JSON.stringify(afterContracts[key]));
  if(overwritten.length)throw new Error('Contract overwrote FASE3 protection: '+overwritten.join(','));
  const changedDependencies=Object.keys(afterFase3).filter(key=>JSON.stringify(afterFase3[key])!==JSON.stringify(afterContracts[key])).map(key=>({key,before:afterFase3[key],after:afterContracts[key]}));
  writeFileSync('qa/fase3/integration-functions.json',JSON.stringify({protectedObjects,protectedDefinitions:Object.fromEntries(protectedObjects.map(key=>[key,afterFase3[key]])),overwritten,changedDependencies},null,2)+'\n');
  console.log('PASS contracts preserved '+protectedObjects.length+' FASE3 functions/triggers including definitions, ACLs and config');
  if(manifestsOnly){writeManifestIndex();checkVersionQuery(sql=>run(['exec','-i',name,'psql','-U','postgres','-v','ON_ERROR_STOP=1','-At'],sql));console.log('PASS stage manifests captured; no ledger created or written');} else {
  apply('tests/contracts/seed.sql');
  if(process.argv.includes('--assembly-only')) {
    const beforeAssembly=catalog();apply('supabase/review/assessment_institutional_assembly.sql');const afterAssembly=catalog();
    assert.deepEqual(afterAssembly.relations,beforeAssembly.relations);
    for(const [key,value] of Object.entries(beforeAssembly.functions)){
      if(key.startsWith('public.avalia_plus_create_assessment_from_bank(')||key.startsWith('public.avalia_plus_replace_assessment_items(')){assert.deepEqual(afterAssembly.functions[key].acl,value.acl);}else assert.deepEqual(afterAssembly.functions[key],value,key);
    }
    execFileSync('python3',['tests/contracts/assembly-institutional.py'],{stdio:'inherit',env:{...process.env,RS_CONTRACT_TEST_CONTAINER:name}});
  } else {
  if(process.argv.includes('--amendments-only')) {
    const beforeAmendment=catalog();apply('supabase/review/contract_amendments.sql');const afterAmendment=catalog();
    assert.deepEqual(afterAmendment.relations,beforeAmendment.relations,'Amendment changed table ACL/RLS/policies/triggers');
    for(const [key,value] of Object.entries(beforeAmendment.functions)){
      if(key.startsWith('school_category_private.normalize_config(')){
        assert.deepEqual(afterAmendment.functions[key].acl,value.acl,'Existing validator ACL changed');
      } else assert.deepEqual(afterAmendment.functions[key],value,'Existing function changed: '+key);
    }
    console.log('PASS amendment preserves all existing functions except rule-count validator; table ACL/RLS/policies/triggers unchanged');
    execFileSync('python3',['tests/contracts/amendments.py'],{stdio:'inherit',env:{...process.env,RS_CONTRACT_TEST_CONTAINER:name}}); }
  for(const suite of (autosaveOnly||routingOnly||process.argv.includes('--amendments-only')?[]:['database.py','content.py','edge-cases.py','security-regressions.py','succession-regressions.py'])){
    console.log('CONTRACT SUITE '+suite);
    execFileSync('python3',['tests/contracts/'+suite],{stdio:'inherit',env:{...process.env,RS_CONTRACT_TEST_CONTAINER:name}});
  }
  if(!process.argv.includes('--amendments-only')) {
  run(['run','-d','--name',`${name}-rest`,'--label','rs.fase3=synthetic','--network',`container:${name}`,'-e','PGRST_DB_URI=postgres://authenticator:synthetic-local-only@127.0.0.1:5432/postgres','-e','PGRST_DB_SCHEMAS=public','-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET=fase3-synthetic-jwt-secret-never-production-123456',postgrest]);
  const info=JSON.parse(run(['inspect',name]))[0];const host=Object.values(info.NetworkSettings.Networks)[0].IPAddress;
  ready=false;
  for(let i=0;i<100;i++){try{const res=await fetch(`http://${host}:3000/`);if(res.ok){ready=true;break}}catch{} await new Promise(r=>setTimeout(r,200));}
  if(!ready)throw new Error('Local PostgREST did not start');
  if(autosaveOnly){execFileSync(process.execPath,['tests/student-autosave/browser-database.mjs',name],{stdio:'inherit'});} else if(routingOnly){execFileSync(process.execPath,['qa/fase3/routing-browser.mjs',name],{stdio:'inherit'});} else {
  let journeyError;
  try { execFileSync(process.execPath,['qa/fase3/journeys.mjs',name,...(baseline?['--baseline']:[])],{stdio:'inherit'}); } catch(error) { journeyError=error; }
  execFileSync('python3',['tests/contracts/fase3-bridge.py'],{stdio:'inherit',env:{...process.env,RS_CONTRACT_TEST_CONTAINER:name}});
  if(journeyError)throw journeyError;
  }
  }
}
}
} catch(error) {console.error(error.stderr?.toString()||error.message);process.exitCode=1;}
finally {for(const container of [`${name}-rest`,name]){try{run(['rm','-fv',container])}catch{}}}
