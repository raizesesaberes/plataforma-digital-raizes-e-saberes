import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('actual submit invokes sibling V2 dispatcher from repository cwd',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'submit-path-'));
 try{
 fs.mkdirSync(path.join(root,'ingestion/approved'),{recursive:true});fs.mkdirSync(path.join(root,'ingestion/runtime'));
 fs.copyFileSync(new URL('./submit-approved.mjs',import.meta.url),path.join(root,'ingestion/runtime/submit-approved.mjs'));
 fs.writeFileSync(path.join(root,'ingestion/runtime/dispatch-v2.mjs'),"if(!/^[0-9a-f]{64}$/.test(process.argv[2]))process.exit(8);console.log('V2_PATH_REACHED');");
 fs.writeFileSync(path.join(root,'ingestion/runtime/dispatch.mjs'),"process.exit(9)");
 fs.writeFileSync(path.join(root,'ingestion/approved/test.json'),JSON.stringify({version:1,items:[{ordinal:1}]}));
 const r=spawnSync(process.execPath,['ingestion/runtime/submit-approved.mjs'],{cwd:root,encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/V2_PATH_REACHED/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
