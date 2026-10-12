import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync(process.argv.find(x=>x.startsWith('--source='))?.slice(9)||'app-pages.js','utf8');
const helperSource=source;
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const helper=between(helperSource,'  const getTeacherResolverContext =','  const pickDefaultQuestionSource =');
const builder=source.slice(source.indexOf('  const selectQuestion ='));
const actualRefresh=between(builder,'  const refresh = async () => {','  const attemptLoginResume =');
const render=between(source.slice(source.indexOf('  const renderAccess =')),'  const render = async','  const setError =');
const detail=between(source,'  const renderDetail = async','  const saveOrder =');
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
let actor='teacher', calls=0, writes=[];
const nodes=new Map();const node=k=>{if(!nodes.has(k))nodes.set(k,new Proxy({},{set(o,p,v){writes.push([k,p,v]);o[p]=v;return true;}}));return nodes.get(k);};
let requestHook=async()=>{},historyHook=async()=>[],assessmentsHook=async()=>[];
const box={console,Set,Map,Date,Promise,URLSearchParams, getSupabaseUserContext:()=>({userId:actor}),supabaseEq:x=>'eq.'+x,allowedAssessmentRoles:[],normalizeRpcJson:x=>x,
 questionDialog:{open:false},closeQuestionPreview:()=>{},
 root:{querySelector:node,querySelectorAll:()=>[]},loading:node('loading'),errorNode:node('error'),empty:node('empty'),grid:node('grid'),detail:node('detail'),
 sessionStorage:{getItem:()=>null},setError:msg=>{node('error').textContent=msg;},localDevNotice:()=>'',populateFilterOptions:()=>{},attemptLoginResume:async()=>{},
 getFilteredItems:()=>box.questions,renderCard:x=>x.id,renderMetrics:()=>{},renderDashboardSummaries:()=>{},renderCart:()=>{},renderSaved:()=>{},renderAccess:()=>{},renderReviewQueue:()=>{},syncQuestionBankView:()=>{},focusQuestionBankHashTarget:()=>{},
 canEditOfficialQuestion:()=>false,canAdaptQuestion:()=>true,isSelected:()=>false,renderQuestionProof:x=>x.id,renderQuestionMetadata:()=>'',htmlEscape:x=>x,
 assessmentActorCurrent:()=>actor==='teacher',requireAssessmentActor:()=>{if(actor!=='teacher')throw Error('ACCOUNT_CHANGED');},assessmentActorId:'teacher',assessmentActorAbort:{signal:undefined},
 questions:[],assessments:[],selectedId:null,cart:[],activeAssessmentId:null,mode:'supabase',assessmentSavePromise:null,assessmentSaveKey:'save',uncertainSaveMessage:'uncertain',questionBankRefreshGeneration:0,
 assessmentRevision:0,assessmentRefreshGeneration:0,assessmentSwitchBusy:false,activeAssessmentProtected:false,hydrateConfirmedAssessment:()=>{throw Error('Unexpected hydration');}};
box.itemById=id=>box.questions.find(x=>x.id===id);
vm.createContext(box);vm.runInContext(helper+'\nglobalThis.load=getTeacherResolvedQuestionRows;',box);
box.questionBankDataService={mode:()=> 'supabase',getQuestionAccessState:()=>({status:'PASS'}),listQuestions:async()=>{
 const n=++calls;return (await box.load(async(resource,q,o)=>{
 if(resource==='teachers')return[{id:'t',school_id:'s'}];
 if(resource==='class_teacher_memberships')return[{class_id:'class5',status:'active'}];
 await requestHook(n);return{status:'PASS',total:1,items:[{id:'result-'+n,uuid:'q'+n}]};
 },{userId:'teacher',role:'professor'})).rows;
},listAssessments:()=>assessmentsHook(),getCurationHistory:()=>historyHook(),registerUsage:async()=>{}};
vm.runInContext(detail+render+actualRefresh+'\nglobalThis.refreshTest=refresh;',box);
const old=deferred(),entered=deferred();requestHook=async n=>{if(n===1){entered.resolve();await old.promise;}};
const first=box.refreshTest();await entered.promise;await box.refreshTest();
assert.equal(node('grid').innerHTML,'result-2');const before=writes.length;old.resolve();await first;
assert.equal(node('grid').innerHTML,'result-2');assert.equal(writes.length,before,'stale catch must not mutate DOM');assert.equal(box.questions[0].id,'result-2');
console.log('PASS actual helper+refresh+render: stale rejection cannot erase newer bank/DOM');
requestHook=async()=>{};
const a=deferred(),ae=deferred();let count=0;assessmentsHook=async()=>{if(++count===1){ae.resolve();await a.promise;}return[];};
const pa=box.refreshTest();await ae.promise;await box.refreshTest();const newest=node('grid').innerHTML,mark=writes.length;a.resolve();await pa;
assert.equal(node('grid').innerHTML,newest);assert.equal(writes.length,mark,'stale later service response must not mutate DOM');
console.log('PASS stale assessments response cannot overwrite staged questions');
assessmentsHook=async()=>[];
const h=deferred(),he=deferred();let histories=0;historyHook=async()=>{if(++histories===1){he.resolve();await h.promise;}return[];};
const ph=box.refreshTest();await he.promise;await box.refreshTest();const d=node('detail').innerHTML,hm=writes.length;h.resolve();await ph;
assert.equal(node('detail').innerHTML,d);assert.equal(writes.length,hm,'stale detail/history continuation cannot mutate DOM');
console.log('PASS guarded real renderDetail discards stale history and render continuation');
historyHook=async()=>[];const u=deferred(),ue=deferred();requestHook=async()=>{ue.resolve();await u.promise;};
const pu=box.refreshTest();await ue.promise;actor='other';const um=writes.length;u.resolve();await pu;assert.equal(writes.length,um);assert.equal(node('detail').innerHTML,d);
console.log('PASS identity switch discards old refresh without DOM writes; actor invalidation UI remains separate');
actor='teacher';box.assessmentSavePromise=Promise.resolve();const sm=writes.length;await box.refreshTest();assert.equal(writes.length,sm);
console.log('PASS in-flight save is preserved; synthetic DOM, no browser/human homologation');

box.assessmentSavePromise=null;
if(actualRefresh.includes('assessmentRevision')) {
 const r=deferred(),re=deferred();requestHook=async()=>{re.resolve();await r.promise;};
 const pr=box.refreshTest();await re.promise;box.assessmentRevision++;const rm=writes.length;r.resolve();await pr;
 assert.equal(writes.length,rm,'PR16 edit revision must invalidate refresh');
 box.assessmentSwitchBusy=true;const bm=writes.length;await box.refreshTest();assert.equal(writes.length,bm);
 console.log('PASS integrated PR16 preserves edit revision and assessment-switch mutex guards');
}
