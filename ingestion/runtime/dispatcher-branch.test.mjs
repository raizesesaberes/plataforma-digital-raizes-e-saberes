import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
for(const [ref,ok] of [['refs/heads/service/enem-ingestion-worker',true],['refs/heads/candidate/manifest-recovery-20261021',false],['refs/heads/main',false]])test('actual dispatcher branch '+ref,()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dispatch-branch-'));
 try{
 const dir=path.join(root,'ingestion/runtime');fs.mkdirSync(dir,{recursive:true});fs.mkdirSync(path.join(root,'ingestion/approved'));
 for(const f of ['dispatch-v2.mjs','response.mjs','endpoint.mjs'])fs.copyFileSync(new URL('./'+f,import.meta.url),path.join(dir,f));
 fs.writeFileSync(path.join(dir,'deployment.config.json'),JSON.stringify({version:1,endpoint:'https://worker.example.invalid/api/ingest',allowedHost:'worker.example.invalid'}));
 const item={code:'ENEM-SOURCE-q_fixture_only',request_id:'00000000-0000-5000-8000-000000000001',sha256:'b'.repeat(64)};
 const raw=JSON.stringify({version:1,items:[item]});const digest=createHash('sha256').update(raw).digest('hex');
 fs.writeFileSync(path.join(root,'ingestion/approved/fixture.json'),raw);
 const id='00000000-0000-4000-8000-000000000001';
 const result={manifest:digest,items:[{ordinal:1,code:item.code,id,state:'CONFIRMED',reason:null,receipt:{question_id:id,request_id:item.request_id,payload_sha:item.sha256}}]};
 fs.writeFileSync(path.join(root,'mock.mjs'),`let n=0;globalThis.fetch=async()=>{n++;return {ok:true,json:async()=>n===1?{value:'SYNTHETIC_TEST_TOKEN'}:${JSON.stringify(result)}}};process.on('exit',()=>{if(n!==${ok?2:0})process.exitCode=91;});`);
 const env={PATH:process.env.PATH,GITHUB_REPOSITORY:'raizesesaberes/plataforma-digital-raizes-e-saberes',GITHUB_REPOSITORY_ID:'1297887230',GITHUB_REF:ref,GITHUB_EVENT_NAME:'push',INGEST_ENDPOINT:'https://worker.example.invalid/api/ingest',ACTIONS_ID_TOKEN_REQUEST_URL:'https://oidc.example.invalid',ACTIONS_ID_TOKEN_REQUEST_TOKEN:'SYNTHETIC_ONLY'};
 const r=spawnSync(process.execPath,['--import',path.join(root,'mock.mjs'),'ingestion/runtime/dispatch-v2.mjs',digest,'ingestion/approved/fixture.json'],{cwd:root,env,encoding:'utf8'});
 if(ok){assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).status,'CONFIRMED');}else{assert.notEqual(r.status,0);assert.notEqual(r.status,91);assert.match(r.stderr,/UNTRUSTED_EVENT/);assert.equal(r.stdout,'');}
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
