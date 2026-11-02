import assert from 'node:assert/strict';
import { editionReadDecision, deliverEdition } from '../../supabase/functions/_shared/library-edition-policy.mjs';
const grant={authenticated:true,activeProfile:true,published:true,audience:'student',actor:'student',schoolAllowed:true,classAllowed:true,gradeAllowed:true,categoryAllowed:true};
const id='9acf5606-796c-41f5-9f93-29e97ab26291';
for(const actor of ['student','teacher']) for(const audience of ['student','teacher']) {
  assert.equal(editionReadDecision({...grant,actor,audience}),!(actor==='student'&&audience==='teacher'));
}
let checks=4;
for(const flag of ['authenticated','activeProfile','published','schoolAllowed','classAllowed','gradeAllowed','categoryAllowed'])
  for(const value of [false,undefined,null,'true',1]) {assert.equal(editionReadDecision({...grant,[flag]:value}),false);checks++;}
for(const actor of ['admin','guardian',undefined]){assert.equal(editionReadDecision({...grant,actor}),false);checks++;}
for(const kind of ['manifest','page','thumb']) {
  let reads=0,signs=0;
  const deps={authorize:async()=>({...grant,audience:'teacher'}),getManifest:async()=>{reads++;return {pageCount:109};},sign:async()=>{signs++;return 'synthetic';}};
  assert.equal((await deliverEdition({bookId:id,assetKind:kind,pageNumber:1},deps)).status,403);
  assert.equal(reads,0);assert.equal(signs,0);checks++;
  deps.authorize=async()=>({...grant,actor:'teacher',audience:'teacher'});
  const response=await deliverEdition({bookId:id,assetKind:kind,pageNumber:109,path:'../../private'},deps);
  assert.equal(response.status,200);checks++;
}
let signs=0;
const deps={authorize:async()=>grant,getManifest:async()=>({pageCount:109}),sign:async(bucket,path,ttl)=>{assert.equal(bucket,'pages');assert.equal(ttl,300);assert.equal(path,`library/${id}/pages/page-109.jpg`);signs++;return 'synthetic';}};
for(const pageNumber of [0,-1,110,1.2,'1',null]){assert.equal((await deliverEdition({bookId:id,assetKind:'page',pageNumber},deps)).status,400);checks++;}
assert.equal(signs,0);
assert.equal((await deliverEdition({bookId:id,assetKind:'page',pageNumber:109},deps)).status,200);assert.equal(signs,1);checks++;
console.log(`PASS ${checks} policy and delivery scenarios; synthetic dependencies, no production writes. Live database and browser validation still required.`);
