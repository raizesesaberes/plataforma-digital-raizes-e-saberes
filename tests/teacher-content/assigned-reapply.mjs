import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
let source=readFileSync('app-pages.js','utf8');
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
  const token='x.'+btoa(JSON.stringify({sub:sessionStorage.getItem('test-active-user')||'synthetic-user',exp:9999999999,app_metadata:{platform_role:role==='revisor'?'professor':role,question_bank_role:role},user_metadata:{full_name:'Docente Sintético'}}))+'.x';
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
    const exam={owner_user_id:actor,id:'11111111-1111-4111-8111-111111111111',title:payload.title,component:payload.component,school_year:payload.school_year,status:'RASCUNHO',questions:payload.questions};
    state.assessments=[exam];sessionStorage.setItem('synthetic-server',JSON.stringify(state));if(window.loseSaveAck)throw Error('Network response lost after commit');return {assessment:exam,questions:payload.questions,booklets:[]};
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
 const {page,errors}=await setup();page.on('dialog',d=>d.accept());await page.goto(base+'/bank?view=avaliacoes');
 const original='11111111-1111-4111-8111-111111111111', copy='55555555-5555-4555-8555-555555555555';
 await page.evaluate(({original})=>{sessionStorage.setItem('synthetic-server',JSON.stringify({assessments:[{id:original,title:'Original aplicada',status:'RASCUNHO',isAssigned:true,school_year:'5o ano',component:'Matemática',questions:[{question_id:'44444444-4444-4444-8444-444444444444',points:1}]}],assignments:[],calls:[]}));},{original});await page.reload();
 await page.getByText('Já aplicada · conteúdo protegido',{exact:false}).waitFor();
 await page.locator(`[data-qb-open-assessment="${original}"]`).click();await page.locator('[data-qb-assessment-protection]:visible').waitFor();
 assert(await page.locator('[data-qb-assessment-title]').isDisabled());assert(await page.locator('[data-qb-save-draft]').isDisabled());
 await page.locator('[data-qb-save-draft]').dispatchEvent('click');
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('synthetic-server')).calls.filter(c=>/create_assessment|replace_assessment|schedule_assessment/.test(c.path)).length),0);
 // Rejected local edits must never become the protected/offical preview after reload.
 await page.evaluate(()=>{const key='raizes:question-bank-draft:synthetic-user';const d=JSON.parse(localStorage.getItem(key));d.builder.title='LOCAL REJECTED';d.builder.instructions='LOCAL INSTRUCTIONS';d.builder.date='2030-12-12';d.points={'SYN-Q':99};d.builder.component='LOCAL';d.builder.year='LOCAL';localStorage.setItem(key,JSON.stringify(d));const server=JSON.parse(sessionStorage.getItem('synthetic-server'));Object.assign(server.assessments[0],{instructions:'SERVER INSTRUCTIONS',date:'2026-10-14'});server.assessments[0].questions[0].points=3;sessionStorage.setItem('synthetic-server',JSON.stringify(server));});
 await page.reload();await page.locator('[data-qb-assessment-protection]:visible').waitFor();assert(await page.locator('[data-qb-assessment-title]').isDisabled());
 assert.equal(await page.locator('[data-qb-assessment-title]').inputValue(),'Original aplicada');assert.equal(await page.locator('.qb-builder textarea').inputValue(),'SERVER INSTRUCTIONS');assert.equal(await page.locator('[data-qb-points]').first().inputValue(),'3');assert.equal(await page.locator('.qb-builder input[type=date]').inputValue(),'2026-10-14');assert.equal(await page.locator('[data-qb-assessment-component]').inputValue(),'Matemática');assert.equal(await page.locator('[data-qb-assessment-year]').inputValue(),'5o ano');
 await page.locator('[data-qb-preview=student]').click();assert(!(await page.locator('body').innerText()).includes('LOCAL REJECTED'));assert(!(await page.locator('body').innerText()).includes('LOCAL INSTRUCTIONS'));await page.locator('[data-qb-close-preview]').click();
 await page.locator('[data-qb-publish-digital]').click();await page.waitForURL('**/professor.html?view=avaliacoes&assessment_id='+original+'#aplicacoes');
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('synthetic-server')).calls.filter(c=>/create_assessment|replace_assessment|schedule_assessment/.test(c.path)).length),0);
 await page.goto(base+'/bank?view=avaliacoes');await page.locator(`[data-qb-reapply-assessment="${original}"]`).click();await page.waitForURL('**/professor.html?view=avaliacoes&assessment_id='+original+'#aplicacoes');
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('synthetic-server')).calls.filter(c=>/create_assessment|replace_assessment|schedule_assessment/.test(c.path)).length),0);
 // Existing explicit duplication action must return a new ID before the editor is unlocked.
 await page.goto(base+'/bank?view=avaliacoes');await page.evaluate(copy=>{questionBankDataService.duplicateAssessment=async id=>{window.copyCalls=(window.copyCalls || 0)+1;await new Promise(r=>window.releaseCopy=r);const s=JSON.parse(sessionStorage.getItem('synthetic-server'));const a=s.assessments.find(a=>a.id===id);const b={...a,id:copy,title:a.title+' - cópia',isAssigned:false};s.assessments.push(b);sessionStorage.setItem('synthetic-server',JSON.stringify(s));return b;};},copy);
 await page.locator(`[data-qb-duplicate-assessment="${original}"]`).click();await page.waitForFunction(()=>!!window.releaseCopy);await page.locator('[data-qb-save-draft]').dispatchEvent('click');await page.locator(`[data-qb-duplicate-assessment="${original}"]`).dispatchEvent('click');assert.equal(await page.evaluate(()=>window.copyCalls),1);assert(await page.evaluate(()=>!!sessionStorage.getItem('raizes:assessment-save-pending:synthetic-user')));await page.evaluate(()=>window.releaseCopy());await page.waitForFunction(()=>document.querySelector('[data-qb-assessment-title]').value.includes('cópia'));assert(!(await page.locator('[data-qb-assessment-title]').isDisabled()));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')).activeAssessmentId),copy);
 assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('synthetic-server')).assessments[0].title),'Original aplicada');
 // Actual remote mapper/query: any visible assignment protects the base content, irrespective of draft status.
 assert(await page.evaluate(async original=>{const old=window.syntheticRequest;let query;window.syntheticRequest=async(p,q)=>{query=q;return [{id:original,status:'RASCUNHO',assignments:[{id:'synthetic-assignment'}],questions:[]}];};try{const a=await unusedRealBankService.getAssessmentById(original);return a.isAssigned && query.includes('assessment_assignments!assessment_assignments_assessment_id_fkey(id)');}finally{window.syntheticRequest=old;}},original));
 // Slow save A cannot interleave duplication or opening B, including programmatic events.
 await page.evaluate(()=>{const s=JSON.parse(sessionStorage.getItem('synthetic-server'));s.assessments[0].isAssigned=false;sessionStorage.setItem('synthetic-server',JSON.stringify(s));});await page.reload();await page.locator(`[data-qb-open-assessment="${original}"]`).click();await page.waitForFunction(()=>document.querySelector('[data-qb-assessment-title]').value==='Original aplicada');
 await page.evaluate(original=>{window.duplicateCalls=0;questionBankDataService.duplicateAssessment=async()=>{window.duplicateCalls++;throw Error('Must not duplicate');};questionBankDataService.replaceAssessmentItems=async()=>{await new Promise(r=>window.releaseReplace=r);if(window.rejectAck)throw Error('Synthetic ACK lost');return {id:original};};},original);
 await page.locator('[data-qb-save-draft]').click();await page.waitForFunction(()=>!!window.releaseReplace);const pending=await page.evaluate(()=>sessionStorage.getItem('raizes:assessment-save-pending:synthetic-user'));
 await page.locator(`[data-qb-duplicate-assessment="${original}"]`).dispatchEvent('click');await page.locator(`[data-qb-open-assessment="${copy}"]`).dispatchEvent('click');assert.equal(await page.evaluate(()=>window.duplicateCalls),0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('raizes:assessment-save-pending:synthetic-user')),pending);
 await page.evaluate(()=>window.releaseReplace());await page.waitForFunction(()=>!sessionStorage.getItem('raizes:assessment-save-pending:synthetic-user'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')).activeAssessmentId),original);assert.equal(await page.locator('[data-qb-assessment-title]').inputValue(),'Original aplicada');
 await page.evaluate(()=>{window.releaseReplace=null;window.rejectAck=true;});await page.locator('[data-qb-save-draft]').click();await page.waitForFunction(()=>!!window.releaseReplace);await page.evaluate(()=>window.releaseReplace());await page.getByText('A confirmação do salvamento está pendente.',{exact:false}).first().waitFor();
 const uncertain=await page.evaluate(()=>sessionStorage.getItem('raizes:assessment-save-pending:synthetic-user'));await page.locator(`[data-qb-duplicate-assessment="${original}"]`).dispatchEvent('click');await page.locator(`[data-qb-open-assessment="${copy}"]`).dispatchEvent('click');assert.equal(await page.evaluate(()=>window.duplicateCalls),0);assert.equal(await page.evaluate(()=>sessionStorage.getItem('raizes:assessment-save-pending:synthetic-user')),uncertain);
 assert.deepEqual(errors,[]);await page.close();
 console.log('PASS slow save/uncertain ACK blocks duplication and opening another ID; rejected local draft replaced by server fields and points; applied draft is labeled/protected on open and reload; title/save disabled and synthetic save blocked; both Reaplicar paths navigate original ID without create/replace/publish writes; explicit duplicate opens new editable ID, original unchanged; actual remote mapper/FK query includes assignments. Synthetic transport only.');
}finally{await browser.close();server.close();}
