import test from 'node:test';import assert from 'node:assert/strict';import {validateV1,validateV2} from './response.mjs';
const digest='a'.repeat(64),id='00000000-0000-4000-8000-000000000001',request='00000000-0000-5000-8000-000000000001';
const manifest={version:1,items:[{code:'ENEM-SOURCE-q_test',request_id:request,sha256:'b'.repeat(64)}]};
const receipt={question_id:id,request_id:request,payload_sha:'b'.repeat(64)};
const v1=()=>({manifest:digest,count:1,items:[{code:manifest.items[0].code,id,status:'CONFIRMED',receipt:{...receipt}}]});
const v2=()=>({manifest:digest,items:[{ordinal:1,code:manifest.items[0].code,id,state:'CONFIRMED',reason:null,receipt:{...receipt}}]});
test('V1 realistic receipt',()=>assert.equal(validateV1(v1(),manifest,digest).status,'CONFIRMED'));
test('V2 realistic receipt',()=>assert.equal(validateV2(v2(),manifest,digest).status,'CONFIRMED'));
test('V1 negative count without items fails',()=>assert.throws(()=>validateV1({manifest:digest,count:-1},manifest,digest)));
test('V2 empty items fails',()=>assert.throws(()=>validateV2({manifest:digest,items:[]},manifest,digest)));
for(const state of ['toString','constructor','__proto__','UNKNOWN'])test('V2 denies inherited/unknown '+state,()=>{const r=v2();r.items[0].state=state;assert.throws(()=>validateV2(r,manifest,digest));});
for(const version of [1,2]){
 const f=version===1?v1:v2,check=version===1?validateV1:validateV2;
 for(const [name,mutate] of Object.entries({wrongCode:r=>r.items[0].code='ENEM-SOURCE-q_other',invalidUUID:r=>r.items[0].id='no',missingReceipt:r=>delete r.items[0].receipt,wrongRequest:r=>r.items[0].receipt.request_id='00000000-0000-5000-8000-000000000002',wrongHash:r=>r.items[0].receipt.payload_sha='c'.repeat(64),wrongQuestion:r=>r.items[0].receipt.question_id='00000000-0000-4000-8000-000000000002',extra:r=>r.items.push({...r.items[0]}),missing:r=>r.items=[]}))test('V'+version+' rejects '+name,()=>{const r=f();mutate(r);assert.throws(()=>check(r,manifest,digest));});
}
test('V2 legitimate quarantine is partial, not success',()=>{const r=v2();Object.assign(r.items[0],{state:'QUARANTINED',reason:'PNG_DIMENSION_LIMIT',id:null,receipt:null});assert.equal(validateV2(r,manifest,digest).status,'PARTIAL');});
test('V2 pending is partial',()=>{const r=v2();Object.assign(r.items[0],{state:'PENDING',id:null,receipt:null});assert.equal(validateV2(r,manifest,digest).status,'PARTIAL');});
const second={code:'ENEM-SOURCE-q_second',request_id:'00000000-0000-5000-8000-000000000002',sha256:'c'.repeat(64)};
test('V2 rejects duplicated ordinal with exact count',()=>{const m={version:1,items:[...manifest.items,second]},r=v2();r.items.push({...r.items[0]});assert.throws(()=>validateV2(r,m,digest));});
test('V1 rejects duplicate UUID even with coherent per-item receipts',()=>{const m={version:1,items:[...manifest.items,second]},r=v1();r.count=2;r.items.push({code:second.code,id,status:'CONFIRMED',receipt:{question_id:id,request_id:second.request_id,payload_sha:second.sha256}});assert.throws(()=>validateV1(r,m,digest));});
test('V2 rejects duplicate UUID across distinct ordinals',()=>{const m={version:1,items:[...manifest.items,second]},r=v2();r.items.push({ordinal:2,code:second.code,id,state:'CONFIRMED',reason:null,receipt:{question_id:id,request_id:second.request_id,payload_sha:second.sha256}});assert.throws(()=>validateV2(r,m,digest));});
test('V2 ordinal out of expected range rejected',()=>{const r=v2();r.items[0].ordinal=2;assert.throws(()=>validateV2(r,manifest,digest));});
test('V1 integer but wrong count rejected',()=>{const r=v1();r.count=0;assert.throws(()=>validateV1(r,manifest,digest));});

for(const version of [1,2]) test('V'+version+' rejects same UUID with uppercase alias',()=>{
 const m={version:1,items:[...manifest.items,second]},r=version===1?v1():v2();
 const lower='abcdefab-1234-4000-8000-abcdefabcdef';
 r.items[0].id=lower;r.items[0].receipt.question_id=lower;
 r.items.push({code:second.code,id:lower.toUpperCase(),ordinal:2,status:'CONFIRMED',state:'CONFIRMED',reason:null,receipt:{question_id:lower.toUpperCase(),request_id:second.request_id,payload_sha:second.sha256}});
 if(version===1)r.count=2;
 assert.throws(()=>(version===1?validateV1:validateV2)(r,m,digest));
});
