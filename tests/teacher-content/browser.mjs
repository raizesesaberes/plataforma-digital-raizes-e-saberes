import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
let source=readFileSync('app-pages.js','utf8');
// Exercise the complete shipped renderer and handlers with synthetic transport only.
source=source.replace('const createSupabaseRestClient =','const unusedRealClient =').replace('const questionBankDataService =','const unusedRealBankService =').replace(/renderAppPage\(\);\s*$/,'');
source+=`\nconst createSupabaseRestClient=()=>({isConfigured:true,request:window.syntheticRequest});const questionBankDataService=window.syntheticBank;renderAppPage();`;
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
  window.calls=[];window.rpcFailure=false;window.slow=false;window.syntheticRequest=async(path,query,options)=>{
   calls.push({path,query,options});if(!options?.requireAuthenticated)throw Error('Missing auth');
   if(path==='rpc/current_institutional_school_ids')return ['school-a'];
   if(path==='schools')return [{id:'school-a',nome:'Escola Sintética A'}];
   if(options.body&&JSON.parse(options.body).p_context?.school_id==='school-b')throw Error('UNAUTHORIZED_SCHOOL_CONTEXT');
   if(path==='rpc/content_list_category_modules')return {status:'PASS',school_id:'school-a',modules:[{id:'b',name:'Atividades',content_types:['ACTIVITY'],total:0},{id:'q',name:'Questões',content_types:['QUESTION'],total:3},{id:'v',name:'Vídeos',content_types:['VIDEO'],total:0}]};
   const ctx=JSON.parse(options.body).p_context;
   if(ctx.school_id==='school-b')throw Error('UNAUTHORIZED_SCHOOL_CONTEXT');
   if(path==='rpc/content_resolve_for_user'){
    if(window.rpcFailure)throw Error('Serviço indisponível');
    if(window.slow&&ctx.module_id==='q')await new Promise(r=>window.finishOld=r);
    return {status:'PASS',total:ctx.module_id==='q'?3:0,items:ctx.module_id==='q'?[1,2,3].map(i=>({content_item_id:'item'+i,title:'Questão sintética '+i,content_type:'QUESTION'})):[]};
   }
   if(path==='rpc/content_get_category_item')return {status:'PASS',delivery_status:'INLINE_QUESTION',item:{title:'Questão sintética 1'},question:{statement:'Qual alternativa?',alternatives:[{label:'A',body:'Resposta sintética'}]}};
   throw Error('Unexpected RPC '+path);
  };
  window.syntheticBank={mode:()=> 'supabase',getQuestionAccessState:()=>({status:'PASS'}),listQuestions:async()=>{if(new URLSearchParams(location.search).has('fail'))throw Error('Falha sintética de consulta');return [];},listAssessments:async()=>[],listSources:async()=>[],listLicenses:async()=>[]};
 },{role});return {page,errors};
}
try{
 for(const width of [1440,390]){
  const {page,errors}=await setup('professor',{width,height:1000});await page.goto(base+'/catalog');
  await page.getByText('Questões: 3 conteúdos autorizados.',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-category-consumer-items] li').count(),3);
  assert.equal(await page.locator('[data-content-school-name]').textContent(),'Escola Sintética A');
  assert.equal(await page.locator('.tw-teacher-card strong').textContent(),'Docente Sintético');assert(await page.locator('.tw-teacher-card strong').isVisible());assert(await page.locator('[data-content-school-name]').isVisible());
  assert(!/Professora Helena|Admin TI|Admin Banco|Book Viewer/.test(await page.locator('body').innerText()));
  assert.equal(await page.locator('a[href="admin.html"],a[href="aluno.html"]').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'/tmp/teacher-catalog-'+width+'.png',fullPage:true});
  await page.locator('[data-category-consumer-open]').first().click();await page.getByText('Qual alternativa?',{exact:true}).waitFor();
  await page.locator('[data-category-consumer-module="0"]').click();await page.getByText('Nenhum conteúdo desta categoria está disponível para sua escola e turma no momento.',{exact:true}).waitFor();
  assert.equal(await page.locator('[data-category-consumer-detail]').textContent(),'');
  assert.equal(await page.locator('[data-category-consumer-module="1"] span').textContent(),'3 conteúdos disponíveis');
  await page.evaluate(()=>window.rpcFailure=true);await page.locator('[data-category-consumer-module="1"]').click();await page.locator('[role=alert]').filter({hasText:'Serviço indisponível'}).waitFor();
  assert.equal(await page.locator('.category-empty').count(),0);assert.equal(await page.locator('[data-category-consumer-module="1"] span').textContent(),'3 conteúdos disponíveis');
  await page.evaluate(()=>{window.rpcFailure=false;window.slow=true;});await page.locator('[data-category-consumer-module="1"]').click();await page.waitForFunction(()=>!!window.finishOld);await page.locator('[data-category-consumer-module="2"]').click();await page.evaluate(()=>window.finishOld());
  await page.getByText('Vídeos: nenhum conteúdo disponível.',{exact:true}).waitFor();assert.equal(await page.locator('[data-category-consumer-items] li').count(),0);
  assert.deepEqual(errors,[]);await page.close();
 }
 const {page:denied}=await setup();await denied.goto(base+'/catalog?school_id=school-b');await denied.locator('[role=alert]').filter({hasText:'UNAUTHORIZED_SCHOOL_CONTEXT'}).waitFor();assert.equal(await denied.locator('.category-module-card').count(),0);await denied.close();
 const {page:student,errors:studentErrors}=await setup('aluno');await student.goto(base+'/catalog');await student.locator('.category-module-card').first().waitFor();assert.equal(await student.locator('a[href*="professor"]').count(),0);assert.equal(await student.locator('.tw-teacher-card span').textContent(),'Aluno');assert.deepEqual(studentErrors,[]);await student.close();
 for(const role of ['professor','admin','revisor']){
  console.log('Bank role',role);const {page,errors}=await setup(role);await page.goto(base+'/bank?view=admin',{waitUntil:'domcontentloaded'});await page.locator('[data-question-bank]').waitFor();
  if(role==='professor'){
   assert.equal(await page.locator('[data-question-bank-shell-href*="view=admin"],[data-question-bank-shell-href*="view=editorial"]').count(),0);
   assert.equal(await page.locator('[data-question-bank]').getAttribute('data-qb-active-view'),'banco');
   assert.equal(await page.locator('[data-question-bank-shell-href*="view=nova"]').count(),1);
   assert(!/Admin Banco \/ Editorial/.test(await page.locator('.admin-sidebar').innerText()));
  }else if(role==='admin'){assert.equal(await page.locator('[data-question-bank-shell-href*="view=admin"]').count(),1);}
  if(role==='professor'){await page.goto(base+'/bank?view=dashboard',{waitUntil:'domcontentloaded'});await page.locator('[data-qb-total]').waitFor();assert.equal(await page.locator('.qb-dashboard-actions a[href*=editorial]').first().isVisible(),false);await page.goto(base+'/bank?view=nova',{waitUntil:'domcontentloaded'});await page.locator('[data-qb-create-draft]').first().waitFor();assert.equal(await page.locator('[data-qb-submit-review]').first().isVisible(),false);assert.equal(await page.locator('[data-native-category]').isVisible(),false);
   await page.evaluate(()=>{
    window.authorWrites=0;window.syntheticBank.createQuestionItem=async()=>{window.authorWrites++;return {id:'SYN-DRAFT',uuid:'55555555-5555-4555-8555-555555555555',publicationStatus:'NAO_PUBLICADO'};};
    document.querySelectorAll('[data-qb-editorial]').forEach(el=>{if(el.tagName==='SELECT')el.value=[...el.options].find(o=>o.value)?.value || '';else el.value='Valor sintético';});
    document.querySelectorAll('[data-qb-alternative]').forEach((el,i)=>el.value='Alternativa '+i);
   });
   await page.locator('[data-qb-create-draft]').first().click();await page.locator('[data-qb-authorial-receipt]').waitFor();
   assert.equal(await page.evaluate(()=>window.authorWrites),1);assert.equal(await page.locator('[data-qb-editorial-form]').isVisible(),false);
   await page.locator('[data-qb-create-draft]').first().dispatchEvent('click');assert.equal(await page.evaluate(()=>window.authorWrites),1);
   await page.locator('[data-qb-new-authorial]').click();assert(await page.locator('[data-qb-editorial-form]').isVisible());assert.equal(await page.evaluate(()=>window.authorWrites),1);
   const created=await page.evaluate(async()=>{
    const original=window.syntheticRequest;window.syntheticRequest=async(path,query,options)=>{
     window.calls.push({path,options});if(path==='rpc/avalia_plus_create_item')return {id:'synthetic-new',code:'SYN-NEW',internal_title:'Rascunho sintético',publication_status:'NAO_PUBLICADO',curation_status:'RASCUNHO'};
     if(path==='question_alternatives')return [];throw Error('Unexpected write '+path);
    };
    try{const result=await unusedRealBankService.createQuestionItem({source_id:'synthetic-source',license_id:'synthetic-license',internal_title:'Rascunho sintético'});
     let denied=false;try{await unusedRealBankService.updateQuestionItem('official-question',{});}catch{denied=true;}
     return {id:result.uuid,denied,calls:window.calls.filter(x=>x.path==='rpc/avalia_plus_create_item'||x.path==='rpc/avalia_plus_update_question_item'),caps:getQuestionBankCapabilities()};
    }finally{window.syntheticRequest=original;}
   });
   await page.goto(base+'/bank?view=dashboard&fail=1',{waitUntil:'domcontentloaded'});await page.locator('[data-qb-error]').filter({hasText:'Falha sintética'}).waitFor();assert.equal(await page.locator('[data-qb-total]').textContent(),'—');assert.equal(await page.locator('[data-qb-empty]').isVisible(),false);
   assert.equal(created.id,'synthetic-new');assert.equal(created.denied,true);assert.equal(created.calls.length,1);assert(created.calls[0].options.allowedRoles.includes('professor'));assert.equal(created.caps.edit,false);assert.equal(created.caps.adapt,true);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS full shipped renderer: teacher/student isolation, actual identity, 3 vs 0, category-specific empty, errors not zero, stale response, protected item, 1440/390px, bank capability navigation and deep link guard. Synthetic transport only.');
}finally{await browser.close();server.close();}
