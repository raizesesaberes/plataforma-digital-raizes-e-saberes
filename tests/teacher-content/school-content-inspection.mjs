import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=readFileSync('app-pages.js','utf8').replace(/renderAppPage\(\);\s*$/,'').replace('const createSupabaseRestClient =','const unusedYearRestClient =')+'\nconst createSupabaseRestClient=()=>({request:(...args)=>window.syntheticYearRequest(...args)});';
const server=createServer((req,res)=>{
 res.setHeader('Content-Type','text/javascript; charset=utf-8');const path=req.url.split('?')[0];if(['/styles.css','/master-pack.css','/school-content-inspection.js'].includes(path)){if(path.endsWith('.css'))res.setHeader('Content-Type','text/css; charset=utf-8');return res.end(readFileSync('.'+path));}
 if(path==='/app.js')return res.end(source);
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/master-pack.css"></head><body class="master-app"><div id="test-root"></div><script src="/school-content-inspection.js"></script><script src="/app.js"></script></body></html>');
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000}});page.setDefaultTimeout(8000);await page.route('https://**/*',r=>r.abort());const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/secretaria?view=painel');
 await page.evaluate(()=>{
  window.activeSchool='school-a';window.testActor='admin';window.calls=[];window.pending=[];window.replyMode='ok';
  window.response=(sid,offset=0,filter={})=>{const empty=filter.query==='empty',total=empty?0:205;return {status:'PASS',school_id:sid,school_name:'Escola sintética',contracts:[{reference:'SYNTHETIC',status:'ACTIVE',effective:true}],categories:[{module_id:'q',module_name:'Questões',content_type:'QUESTION',grade_id:'g2',grade_name:'EF2',effective:true,state:'AVAILABLE',total:202},{module_id:'q',module_name:'Questões',content_type:'QUESTION',grade_id:'g5',grade_name:'EF5',effective:true,state:'AVAILABLE',total:3},{module_id:'b',module_name:'Livros',content_type:'BOOK',grade_id:'g2',grade_name:'EF2',effective:true,state:'AWAITING_PUBLICATION',total:0}],type_totals:{QUESTION:205},total,offset,limit:25,items:Array.from({length:Math.min(25,Math.max(0,total-offset))},(_,i)=>({id:'synthetic-'+(offset+i),title:(sid==='school-a'?'Escola A':'Escola B')+' questão '+(offset+i),content_type:'QUESTION',delivery_status:'QUESTION_ENGINE'}))};};
  window.request=async(p,options)=>{calls.push({p,actor:testActor});if(replyMode==='error')throw Error('Falha sintética');if(replyMode==='missing')throw Object.assign(Error('missing RPC'),{code:'PGRST202'});if(replyMode==='slow')return await new Promise(resolve=>pending.push(()=>resolve(response(p.p_school_id,p.p_offset,p.p_filter))));if(replyMode==='wrong')return response('other-school');if(replyMode==='legacy')return {...response(p.p_school_id),status:'ADAPTER_REQUIRED',total:null,categories:[],items:[]};return response(p.p_school_id,p.p_offset,p.p_filter);};
  window.mountTest=(compact=false)=>{document.querySelector('#test-root').innerHTML=compact?SchoolContentInspection.renderCards(activeSchool,'Escola sintética','/secretaria?view=conteudosDisponiveis'):SchoolContentInspection.render(activeSchool,'Escola sintética');SchoolContentInspection.mount(document.querySelector('[data-school-content-inspection]'),{request,currentSchool:()=>activeSchool,actor:()=>testActor});};
  mountTest();
 });
 await page.getByText(/205 conteúdos publicados autorizados/).waitFor();assert.equal(await page.locator('[data-inspection-items] li').count(),25);
 await page.getByRole('button',{name:'Próxima'}).click();await page.getByText(/Exibindo 26–50/).waitFor();assert.equal(await page.locator('[data-inspection-items] li').count(),25);
 await page.locator('[name=query]').fill('empty');await page.getByRole('button',{name:'Consultar',exact:true}).click();await page.getByText(/0 conteúdos publicados autorizados/).waitFor();assert(await page.getByRole('button',{name:'Próxima'}).isDisabled());
 await page.evaluate(()=>{replyMode='error';});await page.getByRole('button',{name:'Atualizar consulta'}).click();await page.getByRole('alert').filter({hasText:'Falha sintética'}).waitFor();assert.equal(await page.locator('[data-inspection-items] li').count(),0);
 await page.evaluate(()=>{replyMode='missing';});await page.getByRole('button',{name:'Atualizar consulta'}).click();await page.getByText(/ainda não instalada/).waitFor();
 await page.evaluate(()=>{replyMode='wrong';});await page.getByRole('button',{name:'Atualizar consulta'}).click();await page.getByRole('alert').filter({hasText:'outra escola'}).waitFor();
 await page.evaluate(()=>{replyMode='slow';mountTest();});await page.waitForFunction(()=>pending.length===1);
 await page.evaluate(()=>{activeSchool='school-b';replyMode='ok';mountTest();pending.shift()();});await page.getByText(/205 conteúdos publicados autorizados/).waitFor();assert(!await page.locator('[data-inspection-items]').innerText().then(s=>s.includes('Escola A')));
 await page.evaluate(()=>{replyMode='slow';mountTest();});await page.waitForFunction(()=>pending.length===1);await page.evaluate(()=>{testActor='other-user';dispatchEvent(new StorageEvent('storage'));pending.shift()();});await page.getByText(/Escola ou conta alterada/).waitFor();assert.equal(await page.locator('[data-inspection-items] li').count(),0);
 // Compact cards preserve unknown vs true zero, use canonical union totals rather than page size.
 await page.evaluate(()=>{testActor='secretaria';replyMode='ok';mountTest(true);});await page.getByText('205',{exact:true}).waitFor();assert.equal(await page.locator('[data-inspection-summary] article strong').allTextContents().then(x=>x.slice(0,3)).then(JSON.stringify),JSON.stringify(['205','0','—']));
 await page.evaluate(()=>{replyMode='legacy';mountTest(true);});await page.getByText(/autorização legada/).waitFor();assert.equal(await page.locator('[data-inspection-summary] article strong').count(),0);
 // Render the real Secretaria initial screen with fictional academic context only.
 await page.evaluate(()=>{
  secretariaInstitutionalState.status='ready';secretariaInstitutionalState.selectedSchoolId='school-a';secretariaInstitutionalState.schools=[{id:'school-a',nome:'Escola sintética A',status:'active'}];secretariaInstitutionalState.authorizedSchools=secretariaInstitutionalState.schools;secretariaInstitutionalState.academicYears=[{school_id:'school-a',school_year:'2027',status:'active',start_date:'2020-01-01',end_date:'2099-12-31'}];secretariaInstitutionalState.classes=[{school_id:'school-a',school_year:'5_ANO',status:'active',id:'synthetic-class'}];
  document.querySelector('#test-root').innerHTML=renderSecretariaDashboard();replyMode='ok';activeSchool='school-a';SchoolContentInspection.mount(document.querySelector('[data-school-content-inspection]'),{request,currentSchool:()=>activeSchool,actor:()=>testActor});
 });
 await page.getByText('205',{exact:true}).waitFor();await page.getByText('Escola atual · Ano letivo 2027',{exact:true}).waitFor();assert.equal(await page.locator('.secretaria-dashboard-context').count(),0);
 assert.equal(await page.locator('.secretaria-dashboard-metrics').count(),2);assert.equal(await page.locator('[data-inspection-compact]').count(),1);
 await page.screenshot({path:'/tmp/school-content-'+width+'.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No page horizontal overflow');
 assert.equal(await page.evaluate(()=>{secretariaInstitutionalState.academicYears=[];secretariaInstitutionalState.enrollments=[];return getSecretariaCurrentSchoolYear();}),'');
 assert.equal(await page.evaluate(()=>{secretariaInstitutionalState.academicYears=[{school_id:'school-a',school_year:'2025',status:'closed',start_date:'2025-01-01',end_date:'2025-12-31'}];secretariaInstitutionalState.classes=[{school_id:'school-a',school_year:'2026'}];return getSecretariaCurrentSchoolYear();}),'2026');
 assert.equal(await page.evaluate(()=>{secretariaInstitutionalState.academicYears.push({school_id:'school-a',school_year:'2040',status:'active',start_date:'2040-01-01',end_date:'2040-12-31'});return getSecretariaCurrentSchoolYear();}),'2026');
 assert.equal(await page.evaluate(()=>{history.replaceState(null,'','/secretaria?year=2025');return getSecretariaCurrentSchoolYear();}),'2025');
 await page.evaluate(()=>{secretariaInstitutionalState.academicYears=[];secretariaInstitutionalState.classes=[];history.replaceState(null,'','/secretaria?view=novaTurma');document.querySelector('#test-root').innerHTML=renderSecretariaDashboard();window.yearRequests=[];window.syntheticYearRequest=async(...args)=>{yearRequests.push(args);throw Error('Synthetic stop before mutation');};initSecretariaInstitutional();});
 assert.equal(await page.locator('[name=school_year]').inputValue(),'');
 assert.equal(await page.locator('[name=school_year]').evaluate(n=>n.checkValidity()),false);
 for(const value of ['', 'Não informado', '5_ANO']){await page.locator('[name=school_year]').fill(value);await page.locator('[data-secretaria-class-form]').dispatchEvent('submit');assert.equal(await page.evaluate(()=>yearRequests.length),0);}
 await page.locator('[name=nome]').fill('Synthetic class');await page.locator('[name=school_year]').fill('2028');assert(await page.locator('[name=school_year]').evaluate(n=>n.checkValidity()));await page.locator('[data-secretaria-class-form]').dispatchEvent('submit');await page.waitForFunction(()=>yearRequests.length===1);assert.equal(await page.evaluate(()=>JSON.parse(yearRequests[0][2].body).p_school_year),'2028');
 assert.deepEqual(errors,[]);console.log('PASS '+width+'px: real Secretaria initial renderer/year/cards, administrator/secretary UI, pagination205/25, zero vs unknown, failure/missing RPC, wrong school, delayed school/account switch.');await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
