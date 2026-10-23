import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyReadonlyOIDC} from './oidc-readonly-verify.mjs';
import {assertContext,AUDIENCE,safeFailurePhase,failureMessage} from './oidc-readonly.mjs';
const repo='raizesesaberes/plataforma-digital-raizes-e-saberes',ref='refs/heads/service/enem-ingestion-worker',sha='a'.repeat(40),wf=`${repo}/.github/workflows/enem-oidc-readonly.yml@${ref}`;
const trust={audience:AUDIENCE,ref,workflowRef:wf,workflowSha:sha,commit:sha};
const claims={iss:'https://token.actions.githubusercontent.com',aud:AUDIENCE,repository:repo,repository_id:'1297887230',repository_owner_id:'299967037',ref,ref_type:'branch',workflow_ref:wf,workflow_sha:sha,sha,event_name:'push',environment:'enem-oidc-readonly',sub:`repo:${repo}:environment:enem-oidc-readonly`,runner_environment:'github-hosted',iat:1000,nbf:1000,exp:1300,jti:'test-only-fixture',run_id:'1',run_attempt:'1'};
// Unsigned, unusable fixture; signature success is mocked only for claim-boundary unit tests.
const fixture=c=>[Buffer.from(JSON.stringify({alg:'RS256',kid:'fixture'})).toString('base64url'),Buffer.from(JSON.stringify(c)).toString('base64url'),'AA'].join('.');
const options={now:1100,fetcher:async()=>({ok:true,text:async()=>JSON.stringify({keys:[{kid:'fixture',kty:'RSA'}]})}),cryptoImpl:{subtle:{importKey:async()=>({}),verify:async()=>true}}};
test('diagnostic scope accepts only diagnostic identity',async()=>{assert.equal((await verifyReadonlyOIDC(fixture(claims),trust,options)).commit,sha)});
for(const [key,value] of Object.entries({aud:'urn:rs:enem-ingest:jaesjldrbjbdmzzggxzw',environment:'enem-ingest',sub:`repo:${repo}:environment:enem-ingest`,ref:'refs/heads/main',workflow_ref:`${repo}/.github/workflows/enem-ingest.yml@${ref}`,event_name:'workflow_dispatch',sha:'b'.repeat(40),repository_id:'1',exp:1050})) test(`refuse ${key} mismatch`,async()=>{await assert.rejects(verifyReadonlyOIDC(fixture({...claims,[key]:value}),trust,options))});
test('reject bad signature even with valid diagnostic claims',async()=>{await assert.rejects(verifyReadonlyOIDC(fixture(claims),trust,{...options,cryptoImpl:{subtle:{importKey:async()=>({}),verify:async()=>false}}}),/JWT_SIGNATURE/)});
test('cannot substitute ingestion trust',async()=>{await assert.rejects(verifyReadonlyOIDC('invalid',{...trust,audience:'urn:rs:enem-ingest:jaesjldrbjbdmzzggxzw'},options),/READONLY_TRUST_SCOPE/)});
test('canonical verifier unchanged',()=>{assert.equal(createHash('sha256').update(readFileSync('ingestion/runtime/oidc.mjs')).digest('hex'),'3d20a8a2f73646fb9f64be667fdaf725327e589e7814ed4426b0e9a71c117247')});
test('workflow has exclusive environment and no ingestion triggers',()=>{const w=readFileSync('.github/workflows/enem-oidc-readonly.yml','utf8');assert.match(w,/name: enem-oidc-readonly/);assert.doesNotMatch(w,/workflow_dispatch|schedule:|pull_request:|process_item|release|secrets\./);assert.doesNotMatch(w,/ingestion\/runtime/);assert.match(w,/contents: read/);assert.match(w,/id-token: write/)});
test('GET only and verifier hash pinned',()=>{const s=readFileSync('ingestion/review/oidc-readonly.mjs','utf8');assert.equal((s.match(/await fetch\(/g)||[]).length,3);assert.equal((s.match(/method:'GET'/g)||[]).length,4);assert.doesNotMatch(s,/method:'(?:POST|PUT|PATCH|DELETE)'/);assert.ok(s.includes(createHash('sha256').update(readFileSync('ingestion/review/oidc-readonly-verify.mjs')).digest('hex')))});
test('context refuses credentials before network',()=>{const e={EXPECTED_WORKFLOW_COMMIT:sha,GITHUB_SHA:sha,GITHUB_WORKFLOW_SHA:sha,GITHUB_WORKFLOW_REF:wf,GITHUB_REPOSITORY:repo,GITHUB_REPOSITORY_ID:'1297887230',GITHUB_REPOSITORY_OWNER_ID:'299967037',GITHUB_REF:ref,GITHUB_REF_TYPE:'branch',GITHUB_EVENT_NAME:'push',RUNNER_ENVIRONMENT:'github-hosted'};assertContext(e);for(const key of ['DATABASE_URL','INGEST_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY'])assert.throws(()=>assertContext({...e,[key]:''}));});
test('self review cannot extend to ingestion',()=>{const p=JSON.parse(readFileSync('ingestion/review/oidc-readonly-single-account.policy.json'));assert.equal(p.environment,'enem-oidc-readonly');assert.equal(p.single_account.independent_review,false);assert.equal(p.reserved_ingestion_environment.prevent_self_review,true);assert.equal(p.reserved_ingestion_environment.diagnostic_policy_applies,false);assert.equal(p.publication.authorized,false)});

test('phase codes separate signature claims request HTTP and worker failures',()=>{
 for(const code of ['JWT_SIGNATURE','JWKS_KEY','JWT_HEADER'])assert.equal(safeFailurePhase('OIDC_VERIFICATION',new Error(code)),'OIDC_SIGNATURE');
 for(const code of ['JWT_SCOPE','JWT_ENVIRONMENT','JWT_EXPIRED','JWT_RUN'])assert.equal(safeFailurePhase('OIDC_VERIFICATION',new Error(code)),'OIDC_CLAIMS');
 for(const phase of ['OIDC_REQUEST','PREVIEW_HTTP','PREVIEW_PROTECTION','WORKER_RESPONSE'])assert.equal(safeFailurePhase(phase,new Error('private response')),phase);
 assert.equal(safeFailurePhase('OIDC_VERIFICATION',new Error('unknown')),'OIDC_VERIFICATION');
});
test('failure output cannot expose arbitrary errors or untrusted phase values',()=>{
 assert.equal(failureMessage(new Error('private token or body')),'READONLY_PREFLIGHT_FAILED_NO_RETRY phase=CONTEXT');
 assert.equal(failureMessage({diagnosticPhase:'private value'}),'READONLY_PREFLIGHT_FAILED_NO_RETRY phase=CONTEXT');
 assert.equal(failureMessage({diagnosticPhase:'OIDC_CLAIMS',message:'private value'}),'READONLY_PREFLIGHT_FAILED_NO_RETRY phase=OIDC_CLAIMS');
});
