import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
let source=readFileSync('app-pages.js','utf8');
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
}try{
 for(const size of [{width:1440,height:1000},{width:390,height:844}]){
 const {page,errors}=await setup('professor',size);page.on('dialog',d=>d.accept());
 await page.goto(base+'/bank?view=banco');await page.locator('[data-qb-grid] [data-qb-add]').first().waitFor();
 assert(await page.locator('[data-qb-grid] [data-qb-add]').first().isEnabled());
 await page.evaluate(()=>{
  const rows=Array.from({length:205},(_,i)=>({id:`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`,code:i<3?`SYN-EF5-${i}`:`SYN-EF2-${i}`,internal_title:`Sintética ${i}`,component:'Matemática',school_year:i<3?'5o ano':'2o ano',stage:'Fundamental',question_type:'multipla_escolha',statement:`Questão sintética ${i}`,publication_status:'PUBLICADO',curation_status:'APROVADO',created_at:'2026-10-12',alternatives:[{label:'A',body:'Um',is_correct:true},{label:'B',body:'Dois',is_correct:false}]}));
  questionBankDataService.listQuestions=async()=>rows.map(mapQuestionFromSupabase);
  questionBankDataService.getCurationHistory=async()=>[];
  dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'}));
 });
 await page.waitForFunction(()=>document.querySelectorAll('[data-qb-grid] [data-qb-add]').length===205);
 const ef5=page.locator('[data-qb-grid] [data-qb-add="SYN-EF5-0"]');const ef2=page.locator('[data-qb-grid] [data-qb-add="SYN-EF2-3"]');
 assert(await ef5.isEnabled());assert(await ef2.isEnabled());await ef5.click();await page.waitForFunction(()=>document.querySelector('[data-qb-grid] [data-qb-add="SYN-EF5-0"]').textContent==='Selecionada');
 await page.evaluate(()=>{history.pushState(null,'','/bank?view=avaliacoes');dispatchEvent(new PopStateEvent('popstate'));});
 await page.locator('[data-qb-remove="SYN-EF5-0"]').click();
 await page.evaluate(()=>{history.pushState(null,'','/bank?view=banco');dispatchEvent(new PopStateEvent('popstate'));});
 await page.waitForFunction(()=>!document.querySelector('[data-qb-grid] [data-qb-add="SYN-EF5-0"]').disabled);
 // Reproduce restored applied context, then explicitly start a NEW draft.
 const original='11111111-1111-4111-8111-111111111111';
 await page.evaluate(original=>{
  const old={id:original,title:'Original aplicada',status:'RASCUNHO',isAssigned:true,school_year:'5o ano',component:'Matemática',questions:[]};
  sessionStorage.setItem('synthetic-server',JSON.stringify({assessments:[old],assignments:[],calls:[]}));window.protectedBefore=JSON.stringify(old);
  // Open through actual UI rather than changing application internals.
  dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'}));
 },original);
 await page.evaluate(()=>{history.pushState(null,'','/bank?view=avaliacoes');dispatchEvent(new PopStateEvent('popstate'));});
 await page.locator(`[data-qb-open-assessment="${original}"]`).click();
 await page.evaluate(()=>{history.pushState(null,'','/bank?view=banco');dispatchEvent(new PopStateEvent('popstate'));});
 await page.locator('[data-qb-selection-context]').waitFor();assert(await ef5.isDisabled());assert(await ef2.isDisabled());
 await page.locator('[data-qb-grid] [data-qb-add="SYN-EF2-3"]').dispatchEvent('click');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')).cart.length),0);
 await page.locator('[data-qb-selection-context] [data-qb-new-assessment]').click();await page.waitForFunction(()=>!document.querySelector('[data-qb-grid] [data-qb-add="SYN-EF2-3"]').disabled);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')).activeAssessmentId),null);
 assert.equal(await page.evaluate(()=>JSON.stringify(JSON.parse(sessionStorage.getItem('synthetic-server')).assessments[0])===window.protectedBefore),true);
 await ef2.click();await page.evaluate(()=>{history.pushState(null,'','/bank?view=avaliacoes');dispatchEvent(new PopStateEvent('popstate'));});
 await page.locator('[data-qb-assessment-title]').fill('Prova sintética EF2');await page.locator('[data-qb-save-draft]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('raizes:question-bank-draft:synthetic-user')).activeAssessmentId==='77777777-7777-4777-8777-777777777777');
 const check=await page.evaluate(()=>{const s=JSON.parse(sessionStorage.getItem('synthetic-server'));const c=s.calls.filter(c=>c.path==='rpc/avalia_plus_create_assessment_from_bank');return {count:c.length,payload:JSON.parse(c[0].options.body).p_payload,originalUnchanged:JSON.stringify(s.assessments[0])===window.protectedBefore};});
 assert.equal(check.count,1);assert.equal(check.payload.school_year,'2o ano');assert.equal(check.payload.questions.length,1);assert(check.originalUnchanged);
 // A running REPLACE must also block starting a new draft, even via synthetic event.
 await page.evaluate(()=>{questionBankDataService.replaceAssessmentItems=async()=>{await new Promise(r=>window.finishReplace=r);return {id:'77777777-7777-4777-8777-777777777777'};};});
 await page.locator('[data-qb-save-draft]').click();await page.waitForFunction(()=>!!window.finishReplace);
 assert(await page.locator('.qb-builder [data-qb-new-assessment]').isDisabled());
 await page.locator('.qb-builder [data-qb-new-assessment]').dispatchEvent('click');
 assert.equal(await page.locator('[data-qb-assessment-title]').inputValue(),'Prova sintética EF2');
 await page.evaluate(()=>window.finishReplace());await page.waitForFunction(()=>!sessionStorage.getItem('raizes:assessment-save-pending:synthetic-user'));
 // Pending confirmation and in-flight saves must never permit resetting the builder.
 await page.evaluate(()=>sessionStorage.setItem('raizes:assessment-save-pending:synthetic-user','{"assessmentId":"77777777-7777-4777-8777-777777777777"}'));
 await page.locator('.qb-builder [data-qb-new-assessment]').dispatchEvent('click');
 assert.equal(await page.locator('[data-qb-assessment-title]').inputValue(),'Prova sintética EF2');
 await page.evaluate(()=>sessionStorage.removeItem('raizes:assessment-save-pending:synthetic-user'));
 await page.evaluate(()=>{history.pushState(null,'','/bank?view=banco');dispatchEvent(new PopStateEvent('popstate'));});
 const opener=page.locator('[data-qb-grid] [data-qb-view="SYN-EF2-20"]');await opener.scrollIntoViewIfNeeded();const beforeY=await page.evaluate(()=>window.scrollY);
 await page.evaluate(()=>{window.historyResolvers=[];questionBankDataService.getCurationHistory=async()=>new Promise((resolve,reject)=>window.historyResolvers.push({resolve,reject}));});
 await opener.click();const modal=page.locator('[data-qb-question-dialog]');await modal.waitFor();
 assert.equal(await modal.getAttribute('aria-labelledby'),'qb-question-dialog-title');assert.equal(await page.locator('[data-qb-question-dialog-body]').getAttribute('aria-busy'),'true');
 assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-qb-close-question-dialog')),true);
 await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.querySelector('[data-qb-question-dialog]').contains(document.activeElement)));
 await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.qbView),'SYN-EF2-20');assert(Math.abs((await page.evaluate(()=>window.scrollY))-beforeY)<2);
 await page.evaluate(()=>window.historyResolvers[0].resolve([{comment:'STALE CLOSED'}]));await page.waitForTimeout(30);assert.equal(await modal.getAttribute('open'),null);
 await opener.click();await page.waitForFunction(()=>window.historyResolvers.length===2);
 await page.evaluate(()=>{void window.syntheticOpenQuestionPreview('SYN-EF5-1');});await page.waitForFunction(()=>window.historyResolvers.length===3);
 await page.evaluate(()=>window.historyResolvers[2].resolve([{comment:'NEWEST HISTORY'}]));await modal.getByText('NEWEST HISTORY',{exact:false}).waitFor();
 await page.evaluate(()=>window.historyResolvers[1].resolve([{comment:'OBSOLETE HISTORY'}]));await page.waitForTimeout(30);assert.equal(await modal.getByText('OBSOLETE HISTORY',{exact:false}).count(),0);
 assert(await modal.getByText('Questão sintética 1',{exact:true}).count());
 await modal.locator('[data-qb-close-question-dialog]').click();await opener.click();await page.waitForFunction(()=>window.historyResolvers.length===4);await page.evaluate(()=>window.historyResolvers[3].reject(Error('Synthetic error')));
 await modal.getByRole('alert').waitFor();assert(await modal.getByText('Questão sintética 20',{exact:true}).count());
 await modal.locator('[data-qb-retry-question-dialog]').click();await page.waitForFunction(()=>window.historyResolvers.length===5);await page.evaluate(()=>window.historyResolvers[4].resolve([]));await page.waitForFunction(()=>document.querySelector('[data-qb-question-dialog-body]').getAttribute('aria-busy')==='false');
 assert(await page.evaluate(()=>document.querySelector('[data-qb-question-dialog]').contains(document.activeElement)));
 const dims=await modal.evaluate(el=>({width:el.getBoundingClientRect().width,scroll:el.scrollWidth,client:el.clientWidth}));assert(dims.width<=size.width);assert(dims.scroll<=dims.client+1,dims);
 await page.screenshot({path:`qa/selection-modal/${size.width}.png`});
 await modal.locator('[data-qb-close-question-dialog]').click();
 // Same-task close/open must not let queued close events invalidate the new preview.
 await page.evaluate(()=>{document.querySelector('[data-qb-view="SYN-EF2-20"]').click();document.querySelector('[data-qb-close-question-dialog]').click();window.syntheticOpenQuestionPreview('SYN-EF5-2');});await page.waitForTimeout(30);
 assert(await modal.isVisible());await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 await opener.click();const pendingIndex=await page.evaluate(()=>window.historyResolvers.length-1);
 await switchUser(page);await modal.waitFor({state:'hidden'});
 await page.evaluate(index=>window.historyResolvers[index].resolve([{comment:'WRONG ACCOUNT HISTORY'}]),pendingIndex);
 await page.waitForTimeout(30);assert.equal(await page.locator('body').getByText('WRONG ACCOUNT HISTORY',{exact:false}).count(),0);
 assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 assert.deepEqual(errors,[]);await page.close();
 console.log(`PASS ${size.width}px professor without editorial role: EF2+EF5 selection/removal; protected original preserved; explicit new draft CREATE; in-flight save and pending ACK guards; account switch; dialog focus/Escape/scroll/reopen/races/loading/error/retry/viewport.`);
 }
}finally{await browser.close();server.close();}
