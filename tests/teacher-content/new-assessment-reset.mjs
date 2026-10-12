import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
let source=readFileSync(process.argv.find(x=>x.startsWith('--source='))?.slice(9)||'app-pages.js','utf8');
source=source.replace('  const renderDetail = async', '  window.syntheticOpenQuestionPreview = openQuestionPreview;\n  const renderDetail = async');
// Exercise the complete shipped renderer and handlers with synthetic transport only.
source=source.replace('const createSupabaseRestClient =','const unusedRealClient =').replace('const questionBankDataService =','const unusedRealBankService =').replace(/renderAppPage\(\);\s*$/,'');
source+=`\nconst createSupabaseRestClient=()=>({isConfigured:true,request:window.syntheticRequest});const questionBankDataService={...window.syntheticBank,createAssessmentFromBank:(...args)=>unusedRealBankService.createAssessmentFromBank(...args),replaceAssessmentItems:(...args)=>unusedRealBankService.replaceAssessmentItems(...args)};
window.mapSyntheticQuestion=mapQuestionFromSupabase;window.mapSyntheticAssessment=mapAssessmentFromSupabase;
if(location.pathname.includes('professor.html')){
 teacherInstitutionalState.status='ready';teacherInstitutionalState.classes=[{id:'22222222-2222-4222-8222-222222222222',name:'Turma sintética 5º ano',schoolId:'school-a'}];teacherInstitutionalState.studentsByClass={};
 document.querySelector('[data-app-page]').innerHTML=renderTeacherAssessmentsView();initTeacherAvaliaApplication();
}else renderAppPage();`;
const server=createServer((req,res)=>{
 if(req.url.startsWith('/styles.css')||req.url.startsWith('/master-pack.css')){res.setHeader('Content-Type','text/css; charset=utf-8');return res.end(readFileSync(req.url.includes('master')?'master-pack.css':'styles.css'));}
 if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(source);}
 if(req.url==='/logo-sidebar-dark.png'){res.setHeader('Content-Type','image/png');return res.end(readFileSync('logo-sidebar-dark.png'));}
 if(req.url.includes('.png')){res.statusCode=404;return res.end();}
 const bank=req.url.startsWith('/bank');res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/master-pack.css"></head><body class="master-app"><div data-app-page="${bank?'bancoQuestoes':'catalogoCategorias'}"></div><script src="/app.js"></script></body></html>`);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const base='http://127.0.0.1:'+server.address().port;
async function setup(role='professor',size={width:1440,height:1000}){
 const page=await browser.newPage({viewport:size});await page.route('https://**/*',route=>route.abort());page.setDefaultTimeout(10000);const errors=[];page.on('pageerror',e=>(errors.push(e.message),console.error('BROWSER',e.stack)));
 await page.addInitScript(({role})=>{
  const token='x.'+btoa(JSON.stringify({sub:sessionStorage.getItem('test-active-user')||'synthetic-user',exp:9999999999,app_metadata:{platform_role:role==='revisor'?'professor':role,...(role==='professor'?{}:{question_bank_role:role})},user_metadata:{full_name:'Docente Sintético'}}))+'.x';
  localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:token}));localStorage.setItem('raizes:supabase-access-token',token);
  window.RAIZES_SUPABASE={url:'https://synthetic.invalid',anonKey:'synthetic',enabled:true};
  window.failWrite=false;window.failReadback=false;window.failSave=false;
  const load=()=>JSON.parse(sessionStorage.getItem('synthetic-server')||'{"assessments":[],"assignments":[],"calls":[]}');
  window.syntheticRequest=async(path,query,options)=>{
   const actor=JSON.parse(atob(localStorage.getItem('raizes:supabase-access-token').split('.')[1])).sub;const state=load();state.calls.push({path,query,options,actor});sessionStorage.setItem('synthetic-server',JSON.stringify(state));
   if(!options.requireAuthenticated)throw Error('Missing auth');
   if(path==='rpc/current_institutional_school_ids')return ['school-a'];if(path==='schools')return [{id:'school-a',nome:'Escola sintética'}];
   if(path==='rpc/avalia_plus_create_assessment_from_bank'){
    if(window.failSave)throw Object.assign(Error('Falha ao salvar'),{status:400,code:'P0001'});
    sessionStorage.setItem('synthetic-create-count',String(Number(sessionStorage.getItem('synthetic-create-count')||0)+1));
    window.lastSaveSignal=options.signal;
    if(window.slowSave)await new Promise(resolve=>window.releaseSave=resolve);const payload=JSON.parse(options.body).p_payload;
    const exam={owner_user_id:actor,id:'77777777-7777-4777-8777-777777777777',title:payload.title,component:payload.component,school_year:payload.school_year,status:'RASCUNHO',questions:payload.questions};
    state.assessments.push(exam);sessionStorage.setItem('synthetic-server',JSON.stringify(state));if(window.loseSaveAck)throw Error('Network response lost after commit');return {assessment:exam,questions:payload.questions,booklets:[]};
   }
   if(path==='rpc/avalia_plus_replace_assessment_items')return {assessment:state.assessments[0],questions:state.assessments[0].questions,booklets:[]};
   if(path==='assessment_assignments'){if(window.failReadback)throw Error('Falha no readback');return state.assignments;}
   if(path==='rpc/teacher_schedule_assessment_application_v2'){
    if(window.failWrite)throw Error('Publicação recusada');const p=JSON.parse(options.body);
    if(p.p_class_id!=='22222222-2222-4222-8222-222222222222'||p.p_assessment_id!==state.assessments[0]?.id)throw Error('Unauthorized target');
    const assignment={id:'33333333-3333-4333-8333-333333333333',assessment_id:p.p_assessment_id,class_id:p.p_class_id,status:'DISPONIVEL',assessment:{title:state.assessments[0].title},attempts:[]};
    state.assignments=[assignment];sessionStorage.setItem('synthetic-server',JSON.stringify(state));return {assignment};
   }
   throw Error('Unexpected RPC '+path);
  };
  window.syntheticBank={getAssessmentById:async(id)=>{const a=load().assessments.find(a=>a.id===id);return {...a,year:a.school_year,date:a.date || 'Sem data',questions:a.questions.map(q=>({...q,question:{code:'SYN-Q'}}))};},registerUsage:async()=>{},mode:()=>new URLSearchParams(location.search).has('local')?'fallback':'supabase',getQuestionAccessState:()=>({status:'PASS'}),listQuestions:async()=>[window.mapSyntheticQuestion({id:'44444444-4444-4444-8444-444444444444',code:'SYN-Q',internal_title:'Questão sintética',component:'Matemática',school_year:'5o ano',stage:'Fundamental',question_type:'multipla_escolha',statement:'Quanto?',publication_status:'PUBLICADO',curation_status:'APROVADO',created_at:'2026-10-11',alternatives:[{label:'A',body:'Um',is_correct:true},{label:'B',body:'Dois'}]})],listAssessments:async()=>load().assessments.map(a=>({...a,items:a.questions.length})),listSources:async()=>[],listLicenses:async()=>[]};
 },{role});return {page,errors};
}
async function prepareBuilder(page){
 await page.goto(base+'/bank?view=banco',{waitUntil:'domcontentloaded'});await page.locator('[data-qb-add]').first().click();
 await page.evaluate(()=>{history.pushState(null,'','/bank?view=avaliacoes');dispatchEvent(new PopStateEvent('popstate'));});
 await page.locator('[data-qb-assessment-title]').fill('Montagem concorrente');
}
async function switchUser(page,emit=true){
 await page.evaluate(emit=>{
  sessionStorage.setItem('test-active-user','synthetic-user-b');
  const old=JSON.parse(localStorage.getItem('raizes:supabase-auth-session'));const payload=JSON.parse(atob(old.access_token.split('.')[1]));payload.sub='synthetic-user-b';const token='x.'+btoa(JSON.stringify(payload))+'.x';
  localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({...old,access_token:token}));localStorage.setItem('raizes:supabase-access-token',token);
  if(emit)dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'}));
 },emit);
}
try{
 for(const size of [{width:1440,height:1000},{width:390,height:844}]){
  const {page,errors}=await setup('professor',size);
  await page.goto(base+'/bank?view=avaliacoes');await page.locator('[data-qb-loading]').waitFor({state:'hidden'});
  const fields=[['.qb-builder textarea','Orientações preservadas'],['.qb-builder input[type=date]','2026-10-23'],['[data-qb-assessment-year]','2o ano'],['[data-qb-assessment-component]','Matemática'],['[data-qb-cover]','Sem capa']];
  const snapshot=()=>page.evaluate(()=>({fields:[...document.querySelectorAll('.qb-builder input,.qb-builder textarea,.qb-builder select')].map(n=>[n.tagName,n.value,n.disabled]),local:Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])),session:Object.fromEntries(Object.keys(sessionStorage).sort().map(k=>[k,sessionStorage.getItem(k)]))}));
  for(const [selector,value] of fields){
   await page.evaluate(()=>{document.querySelectorAll('.qb-builder input,.qb-builder textarea').forEach(n=>{n.value='';n.dispatchEvent(new Event('input',{bubbles:true}));});document.querySelector('[data-qb-cover]').selectedIndex=0;});
   if(selector.includes('cover'))await page.locator(selector).selectOption({label:value});else await page.locator(selector).fill(value);
   assert.equal(await page.locator('[data-qb-assessment-title]').inputValue(),'');
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')).cart.length),0);
   // Commit the ordinary blur/change autosave before measuring reset cancellation.
   await page.locator('.qb-builder [data-qb-new-assessment]').focus();
   const before=await snapshot();let asked=0;
   page.once('dialog',async d=>{asked++;assert.equal(d.type(),'confirm');await d.dismiss();});
   await page.locator('.qb-builder [data-qb-new-assessment]').click();
   assert.equal(asked,1,selector+' must prompt without title/cart');
   assert.deepEqual(await snapshot(),before,selector+' cancel preserves all DOM fields and storage');
  }
  for(const [selector,value] of fields){if(selector.includes('cover'))await page.locator(selector).selectOption({label:value});else await page.locator(selector).fill(value);}
  await page.locator('.qb-builder [data-qb-new-assessment]').focus();
  const combined=await snapshot();page.once('dialog',d=>d.dismiss());await page.locator('.qb-builder [data-qb-new-assessment]').click();assert.deepEqual(await snapshot(),combined);
  page.once('dialog',d=>d.accept());await page.locator('.qb-builder [data-qb-new-assessment]').click();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')).reason==='new-assessment');
  const reset=await page.evaluate(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')));
  assert.equal(reset.activeAssessmentId,null);assert.deepEqual(reset.cart,[]);assert.deepEqual(reset.points,{});
  for(const [selector] of fields.filter(([s])=>!s.includes('cover')))assert.equal(await page.locator(selector).inputValue(),'');
  assert.equal(await page.locator('[data-qb-cover]').inputValue(),'Raízes e Saberes - padrao');
  assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('synthetic-server')||'{"calls":[]}').calls.filter(c=>/create_assessment|replace_assessment|schedule_assessment/.test(c.path)).length),0);
  assert.deepEqual(errors,[]);await page.close();
  console.log(`PASS ${size.width}px: instructions/date/year/component/cover individually prompt without title/cart; cancel preserves all DOM fields + localStorage + sessionStorage; combined cancel preserves; accepted reset is local only.`);
 }
}finally{await browser.close();server.close();}
