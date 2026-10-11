import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
let source=readFileSync('app-pages.js','utf8');
// Exercise the complete shipped renderer and handlers with synthetic transport only.
source=source.replace('const createSupabaseRestClient =','const unusedRealClient =').replace('const questionBankDataService =','const unusedRealBankService =').replace(/renderAppPage\(\);\s*$/,'');
source+=`\nconst createSupabaseRestClient=()=>({isConfigured:true,request:window.syntheticRequest});const questionBankDataService={...window.syntheticBank,createAssessmentFromBank:payload=>unusedRealBankService.createAssessmentFromBank(payload)};
window.mapSyntheticQuestion=mapQuestionFromSupabase;
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
  const token='x.'+btoa(JSON.stringify({sub:'synthetic-user',exp:9999999999,app_metadata:{platform_role:role==='revisor'?'professor':role,question_bank_role:role},user_metadata:{full_name:'Docente Sintético'}}))+'.x';
  localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:token}));localStorage.setItem('raizes:supabase-access-token',token);
  window.RAIZES_SUPABASE={url:'https://synthetic.invalid',anonKey:'synthetic',enabled:true};
  window.failWrite=false;window.failReadback=false;window.failSave=false;
  const load=()=>JSON.parse(sessionStorage.getItem('synthetic-server')||'{"assessments":[],"assignments":[],"calls":[]}');
  window.syntheticRequest=async(path,query,options)=>{
   const state=load();state.calls.push({path,query,options});sessionStorage.setItem('synthetic-server',JSON.stringify(state));
   if(!options.requireAuthenticated)throw Error('Missing auth');
   if(path==='rpc/current_institutional_school_ids')return ['school-a'];if(path==='schools')return [{id:'school-a',nome:'Escola sintética'}];
   if(path==='rpc/avalia_plus_create_assessment_from_bank'){
    if(window.failSave)throw Error('Falha ao salvar');const payload=JSON.parse(options.body).p_payload;
    const exam={id:'11111111-1111-4111-8111-111111111111',title:payload.title,component:payload.component,school_year:payload.school_year,status:'RASCUNHO',questions:payload.questions};
    state.assessments=[exam];sessionStorage.setItem('synthetic-server',JSON.stringify(state));return {assessment:exam,questions:payload.questions,booklets:[]};
   }
   if(path==='assessment_assignments'){if(window.failReadback)throw Error('Falha no readback');return state.assignments;}
   if(path==='rpc/teacher_schedule_assessment_application_v2'){
    if(window.failWrite)throw Error('Publicação recusada');const p=JSON.parse(options.body);
    if(p.p_class_id!=='22222222-2222-4222-8222-222222222222'||p.p_assessment_id!==state.assessments[0]?.id)throw Error('Unauthorized target');
    const assignment={id:'33333333-3333-4333-8333-333333333333',assessment_id:p.p_assessment_id,class_id:p.p_class_id,status:'DISPONIVEL',assessment:{title:state.assessments[0].title},attempts:[]};
    state.assignments=[assignment];sessionStorage.setItem('synthetic-server',JSON.stringify(state));return {assignment};
   }
   throw Error('Unexpected RPC '+path);
  };
  window.syntheticBank={registerUsage:async()=>{},mode:()=>new URLSearchParams(location.search).has('local')?'fallback':'supabase',getQuestionAccessState:()=>({status:'PASS'}),listQuestions:async()=>[window.mapSyntheticQuestion({id:'44444444-4444-4444-8444-444444444444',code:'SYN-Q',internal_title:'Questão sintética',component:'Matemática',school_year:'5o ano',stage:'Fundamental',question_type:'multipla_escolha',statement:'Quanto?',publication_status:'PUBLICADO',curation_status:'APROVADO',created_at:'2026-10-11',alternatives:[{label:'A',body:'Um',is_correct:true},{label:'B',body:'Dois'}]})],listAssessments:async()=>load().assessments.map(a=>({...a,items:a.questions.length})),listSources:async()=>[],listLicenses:async()=>[]};
 },{role});return {page,errors};
}
try{
 const {page,errors}=await setup();
 await page.goto(base+'/bank?view=banco',{waitUntil:'domcontentloaded'});await page.locator('[data-qb-add]').first().click();
 await page.evaluate(()=>{history.pushState(null,'','/bank?view=avaliacoes');dispatchEvent(new PopStateEvent('popstate'));});
 await page.locator('[data-qb-publish-digital]').waitFor();
 assert.equal(await page.locator('[data-qb-assessment-title]').inputValue(),'');assert.equal(await page.locator('[data-qb-assessment-year]').inputValue(),'5o ano');
 assert.equal(await page.locator('.qb-builder input[type=date]').inputValue(),'');assert(!/2o Ano A|5o Ano B|demonstrativa/.test(await page.locator('.qb-builder').innerText()));
 await page.locator('[data-qb-assessment-title]').fill('Diagnóstico sintético');
 await page.locator('[data-qb-assessment-year]').fill('2o ano');await page.locator('[data-qb-publish-digital]').click();await page.getByText('O ano deve corresponder às questões selecionadas: 5o ano.',{exact:true}).waitFor();assert(page.url().includes('/bank'));
 await page.locator('[data-qb-assessment-year]').fill('5o ano');await page.evaluate(()=>window.failSave=true);await page.locator('[data-qb-publish-digital]').click();assert(page.url().includes('/bank'));assert(!/Avaliação publicada/.test(await page.locator('body').innerText()));
 await page.evaluate(()=>window.failSave=false);await page.locator('[data-qb-publish-digital]').click();await page.waitForURL('**/professor.html?view=avaliacoes&assessment_id=11111111-1111-4111-8111-111111111111#aplicacoes');
 await page.locator('[data-avalia-assessment-select] option[value="11111111-1111-4111-8111-111111111111"]').waitFor({state:'attached'});
 assert.equal(await page.locator('[data-avalia-assessment-select]').inputValue(),'11111111-1111-4111-8111-111111111111');assert.equal(await page.locator('[data-avalia-class-select]').inputValue(),'');
 assert.equal(await page.locator('[data-avalia-class-select] option').count(),2);
 await page.locator('[data-avalia-assignment-form] [type=submit]').click();await page.getByText('Selecione uma avaliação e uma turma autorizadas.',{exact:true}).waitFor();
 await page.locator('[data-avalia-class-select]').selectOption('22222222-2222-4222-8222-222222222222');assert.equal(await page.locator('[data-avalia-assessment-select]').inputValue(),'11111111-1111-4111-8111-111111111111');
 await page.evaluate(()=>window.failWrite=true);await page.locator('[data-avalia-assignment-form] [type=submit]').click();await page.getByText('Publicação recusada',{exact:true}).waitFor();assert(!/publicada e confirmada/.test(await page.locator('body').innerText()));
 await page.evaluate(()=>{window.failWrite=false;window.failReadback=true;});await page.locator('[data-avalia-assignment-form] [type=submit]').click();await page.getByText('Envio recebido, mas a consulta da aplicação não foi confirmada. Atualize Aplicações antes de tentar novamente.',{exact:true}).waitFor();
 // Reload reads committed server state; failure must never be converted into local success.
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-avalia-assignment-list]').getByText('Diagnóstico sintético',{exact:true}).waitFor();
 await page.locator('[data-avalia-class-select]').selectOption('22222222-2222-4222-8222-222222222222');await page.locator('[data-avalia-assignment-form] [type=submit]').click();await page.getByText('Avaliação publicada e confirmada em Aplicações.',{exact:true}).waitFor();
 const evidence=await page.evaluate(()=>({state:JSON.parse(sessionStorage.getItem('synthetic-server')),local:Object.keys(localStorage)}));assert.equal(evidence.state.assignments.length,1);assert(!evidence.local.some(k=>k.includes('digital-assessment')));
 assert(evidence.state.calls.some(c=>c.path==='rpc/teacher_schedule_assessment_application_v2'));assert.deepEqual(errors,[]);
 // Unknown URL id is not silently replaced by the first assessment.
 await page.goto(base+'/professor.html?view=avaliacoes&assessment_id=unknown',{waitUntil:'domcontentloaded'});await page.getByText('A avaliação solicitada não está disponível para este perfil. Selecione uma avaliação autorizada.',{exact:true}).waitFor();assert.equal(await page.locator('[data-avalia-assessment-select]').inputValue(),'');
 await page.goto(base+'/bank?view=avaliacoes&local=1',{waitUntil:'domcontentloaded'});await page.locator('[data-qb-publish-digital]').click();await page.getByText('Conecte-se para salvar e escolher uma turma. Nenhuma aplicação foi publicada.',{exact:true}).waitFor();assert(page.url().includes('/bank'));
 await page.close();console.log('PASS saved bank assessment -> canonical form exact id -> explicit authorized class -> real service RPC -> readback. Wrong year/no target/save failure/RPC failure/readback failure/unknown id do not publish locally or report success. Synthetic transport only.');
}finally{await browser.close();server.close();}
