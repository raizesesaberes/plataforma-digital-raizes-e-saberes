import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLatestRequest } from '../src/services/latest-request.ts';
const deferred = () => { let resolve, reject; const promise = new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}; };
for (const data of [[], [{id:'class-a'}]]) test(`successful ${data.length ? 'data' : 'empty'} response is delivered`, async()=>{
 const values=[];await createLatestRequest().run(async()=>data,x=>values.push(x),()=>assert.fail());assert.deepEqual(values,[data]);
});
test('failure is distinct from empty and retry can recover',async()=>{
 const gate=createLatestRequest(), values=[];await gate.run(async()=>{throw Error('synthetic')},x=>values.push(x),()=>values.push('error'));
 await gate.run(async()=>['recovered'],x=>values.push(x),()=>assert.fail());assert.deepEqual(values,['error',['recovered']]);
});
for(const late of ['success','error']) test(`old ${late} cannot overwrite a newer response`,async()=>{
 const gate=createLatestRequest(),old=deferred(),values=[];
 const first=gate.run(()=>old.promise,x=>values.push(x),()=>values.push('old error'));
 await gate.run(async()=>['new'],x=>values.push(x),()=>assert.fail());
 late==='success'?old.resolve(['old']):old.reject(Error('old'));await first;assert.deepEqual(values,[['new']]);
});
for(const late of ['success','error']) test(`logout/unmount cancels late ${late}`,async()=>{
 const gate=createLatestRequest(),pending=deferred(),values=[];
 const run=gate.run(()=>pending.promise,x=>values.push(x),()=>values.push('error'));gate.cancel();
 late==='success'?pending.resolve(['old user']):pending.reject(Error('old'));await run;assert.deepEqual(values,[]);
});
test('rapid retries invalidate every prior request',async()=>{
 const gate=createLatestRequest(),pending=[deferred(),deferred(),deferred()],values=[];
 const runs=pending.map(d=>{gate.cancel();return gate.run(()=>d.promise,x=>values.push(x),()=>values.push('error'))});
 pending[2].resolve('last');pending[1].resolve('middle');pending[0].reject(Error('first'));await Promise.all(runs);assert.deepEqual(values,['last']);
});
test('failed or delayed auxiliary resources do not suppress assessments',async()=>{
 const assessment=createLatestRequest(),auxiliary=createLatestRequest(),slow=deferred(),values=[];
 const other=auxiliary.run(()=>slow.promise,x=>values.push(x),()=>values.push('auxiliary error'));
 await assessment.run(async()=>['assessment'],x=>values.push(x),()=>assert.fail());assert.deepEqual(values,[['assessment']]);
 slow.reject(Error('synthetic'));await other;assert.deepEqual(values,[['assessment'],'auxiliary error']);
});
