import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('app-pages.js','utf8');
let userId='editor';
const sandbox={questionSelect:'*',questionBankRead:fn=>fn(new AbortController().signal),getSupabaseUserContext:()=>({userId})};
vm.createContext(sandbox);
vm.runInContext(source.slice(source.indexOf('  let editorialQuestionLoadGeneration'),source.indexOf('  const getTeacherResolvedQuestionRows'))+'\nglobalThis.load=getEditorialQuestionRows;',sandbox);
const context={userId};
const row=i=>({id:'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),created_at:'2026-11-05',last_reviewed_at:null});
function transport(data,{cap=50,change}={}){let calls=0;return async(resource,query,options)=>{
 assert.equal(resource,'question_items');assert.equal(options.requireAuthenticated,true);assert.equal(options.expectedUserId,'editor');assert.equal(options.prefer,'count=exact');assert(options.signal);
 const params=new URLSearchParams(query);assert.equal(params.get('order'),'id.asc');assert.equal(params.get('offset'),null);
 const cursor=(params.get('id')||'gt.').slice(3),remaining=data.filter(r=>r.id>cursor),page=remaining.slice(0,Math.min(cap,Number(params.get('limit'))));
 const response={data:page,contentRange:`${page.length?'0-'+(page.length-1):'*'}/${remaining.length}`};return change?.(response,++calls)||response;
};}
for(const count of [0,1,50,1000,1001,9095]){const data=Array.from({length:count},(_,i)=>row(i));const progress=[];const result=await sandbox.load(transport(data,{cap:37}),context,{onProgress:x=>progress.push(x)});assert.deepEqual(JSON.parse(JSON.stringify(result)),data);assert(progress.at(-1).includes(`${count} de ${count}`));}
for(const [name,change] of Object.entries({
 missingHeader:r=>({...r,contentRange:null}),unknownTotal:r=>({...r,contentRange:'0-49/*'}),wrongRange:r=>({...r,contentRange:'1-50/101'}),
 emptyMiddle:(r,n)=>n===2?{...r,data:[],contentRange:'*/51'}:r,
 duplicate:(r,n)=>n===2?{...r,data:[row(49),...r.data.slice(1)]}:r,
 unsorted:r=>({...r,data:[...r.data].reverse()}),invalidId:r=>({...r,data:[{id:'invalid'},...r.data.slice(1)]}),
 changedTotal:(r,n)=>n===2?{...r,contentRange:'0-49/52'}:r,
 network:(r,n)=>{if(n===2)throw Error('network');return r;}
}))await assert.rejects(()=>sandbox.load(transport(Array.from({length:101},(_,i)=>row(i)),{change}),context),undefined,name);
let release,enter;const block=new Promise(r=>release=r),entered=new Promise(r=>enter=r);
const old=sandbox.load(async()=>{enter();await block;return {data:[],contentRange:'*/0'}},context);const stale=assert.rejects(()=>old,/STALE_LOAD/);await entered;await sandbox.load(transport([]),context);release();await stale;
await assert.rejects(()=>sandbox.load(async()=>{userId='different';return {data:[],contentRange:'*/0'}},context),/ACCOUNT_CHANGED/);
console.log('PASS editorial pagination: 0/1/50/1000/1001/9095, shorter pages, exact completeness, malformed/missing headers, duplicates, ordering, changed counts, failed middle page, concurrent loads and account change.');

// Counting origin must neither depend on media loading nor confer publication rights.
vm.runInContext(source.slice(source.indexOf('const qbOfficialReleases='),source.indexOf('const questionBankCountSummary'))+'\nglobalThis.classify=questionBankCountOrigin;',sandbox);
const raw={id:row(1).id,code:'ENEM-FIXTURE',source_id:row(2).id,source:{id:row(2).id,source_type:'OFICIAL_INEP_ENEM'},license:{publication_allowed:false}};
const item={id:raw.code,uuid:raw.id,raw};
assert.equal(sandbox.classify(item),'enem');assert.equal(raw.license.publication_allowed,false);
assert.equal(sandbox.classify({...item,raw:{...raw,source:{...raw.source,id:'different'}}}),'other');
assert.equal(sandbox.classify({...item,raw:{...raw,source:{...raw.source,source_type:'AUTORAL'}},legalClassification:'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB'}),'authoral');
assert.equal(sandbox.classify({...item,raw:{...raw,source:undefined}}),'other');
console.log('PASS canonical ENEM origin, restricted license unchanged, mismatched source rejected, SAEB-aligned authoral remains authoral.');
