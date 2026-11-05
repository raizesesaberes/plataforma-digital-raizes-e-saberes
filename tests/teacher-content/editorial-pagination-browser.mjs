import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const server=createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;if(p==='/supabase-config.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.RAIZES_SUPABASE={url:"https://synthetic.test",anonKey:"synthetic-public-key"};');}try{if(p.endsWith('.js'))res.setHeader('Content-Type','text/javascript');res.end(readFileSync('.'+p));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const id=i=>'00000000-0000-4000-8000-'+String(i+10).padStart(12,'0');
const base={statement:'Conteúdo sintético de teste',publication_status:'PUBLICADO',curation_status:'APROVADO',workflow_status:'APROVADO',legal_classification:'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',stage:'ENSINO_FUNDAMENTAL',school_year:'9o ano',component:'Matematica',metadata:{},alternatives:[]};
const rows=Array.from({length:1100},(_,i)=>({...base,id:id(i),code:'RS-FIXTURE-'+i,component:i%2?'Lingua Portuguesa':'Matematica'}));
// Synthetic source relation tests origin separately from licensing; no real question content.
for(const [i,external] of ['q_8ebbc34fb37b4b25896b999f5d0321d1','q_44fe373cbde24378bc0b7899c592d099','q_dac9ad1f99324ff3a7fb958d7c4bdca1'].entries())rows.push({...base,id:id(1100+i),code:'ENEM-SOURCE-'+external,source_id:'00000000-0000-4000-8000-000000009999',source:{id:'00000000-0000-4000-8000-000000009999',source_type:'OFICIAL_INEP_ENEM',license:{publication_allowed:i!==2}},license:{publication_allowed:i!==2},legal_classification:'ITEM_OFICIAL_PUBLICAMENTE_LIBERADO',school_year:'Faixas canônicas explícitas',stage:'Transversal delimitado',metadata:{enem:{examYear:2013},source_identity:{source_question_id:external}}});
rows.push({...base,id:id(1103),code:'RS-DRAFT',publication_status:'NAO_PUBLICADO',curation_status:'RASCUNHO',workflow_status:'EM_ELABORACAO',school_year:'8o ano'});
try{for(const scenario of ['complete','empty','middle-failure','missing-count','changed-count','timeout','account-change']){
 const p=await browser.newPage();p.setDefaultTimeout(20000);const errors=[],calls=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(({scenario})=>{const token='x.'+btoa(JSON.stringify({sub:'00000000-0000-4000-8000-000000000001',exp:9999999999,app_metadata:{platform_role:'admin'}}))+'.x';localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:token,expires_at:9999999999}));localStorage.setItem('raizes:supabase-access-token',token);if(scenario==='timeout'){const native=setTimeout;window.setTimeout=(f,ms,...a)=>native(f,ms===45000?300:ms,...a);}},{scenario});
 let release,entered;const held=new Promise(r=>release=r),entry=new Promise(r=>entered=r);
 await p.route('https://**/*',async route=>{const u=new URL(route.request().url());if(u.hostname!=='synthetic.test')return route.abort();let data=[],headers={};const resource=u.pathname.split('/').pop();if(resource==='question_items'){
 assert.equal(route.request().method(),'GET');if(u.searchParams.get('order')!=='id.asc'){const idFilter=u.searchParams.get('id')?.slice(3),codeFilter=u.searchParams.get('code')?.slice(3);return route.fulfill({contentType:'application/json',body:JSON.stringify(rows.filter(r=>r.id===idFilter||r.code===codeFilter))});}assert.equal(route.request().headers().prefer,'count=exact');assert.equal(u.searchParams.get('order'),'id.asc');
 const cursor=(u.searchParams.get('id')||'gt.').slice(3);calls.push(cursor);const remaining=(scenario==='empty'?[]:rows).filter(r=>r.id>cursor);data=remaining.slice(0,37);
 if(calls.length===2&&scenario==='middle-failure')return route.fulfill({status:503,body:'Synthetic read failure'});
 if(calls.length===2&&['timeout','account-change'].includes(scenario)){entered();await held;}
 headers={'access-control-expose-headers':'Content-Range','content-range':`${data.length?'0-'+(data.length-1):'*'}/${remaining.length+(scenario==='changed-count'&&calls.length===2?1:0)}`};if(scenario==='missing-count')headers={};
 }try{await route.fulfill({contentType:'application/json',headers,body:JSON.stringify(data)});}catch{}
 });
 await p.goto('http://127.0.0.1:'+server.address().port+'/banco-questoes.html?view=banco');
 if(scenario==='account-change'){await entry;await p.evaluate(()=>{localStorage.removeItem('raizes:supabase-auth-session');localStorage.removeItem('raizes:supabase-access-token');window.dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'}));});release();await p.getByRole('heading',{name:'Conta alterada'}).waitFor();assert.equal(await p.locator('[data-qb-grid]').count(),0);assert.equal(calls.length,2);}
 else if(['complete','empty'].includes(scenario)){
 const total=scenario==='empty'?0:1104;await p.waitForFunction(n=>document.querySelector('[data-qb-real-total]')?.textContent===String(n),total).catch(async e=>{console.log({scenario,calls:calls.length,errors,text:await p.locator('[data-qb-error]').textContent(),scope:await p.locator('[data-qb-count-scope]').textContent()});throw e;});
 assert.match(await p.locator('[data-qb-count-scope]').textContent(),/carregado integralmente/);
 if(scenario==='complete'){
 assert.equal(calls.length,30);assert.equal(await p.locator('[data-qb-origin-total="enem"]').textContent(),'3');assert.equal(await p.locator('[data-qb-origin-total="authoral"]').textContent(),'1101');assert.equal(await p.locator('[data-qb-published]').textContent(),'1103');assert.equal(await p.locator('[data-qb-draft]').textContent(),'1');
 await p.locator('[data-qb-origin="enem"]').click();await p.waitForFunction(()=>document.querySelector('[data-qb-filtered-real]').textContent==='3');assert.equal(await p.locator('[data-qb-grid] > *').count(),3);
 await p.locator('[data-qb-filter="examYear"]').selectOption('2013');assert.equal(await p.locator('[data-qb-filtered-real]').textContent(),'3');
 await p.locator('[data-qb-filter="examYear"]').selectOption('');await p.locator('[data-qb-origin="all"]').click();
 await p.locator('[data-qb-filter="year"]').selectOption('9o ano');await p.locator('[data-qb-filter="component"]').selectOption('Matematica');assert.equal(await p.locator('[data-qb-filtered-real]').textContent(),'550');
 await p.locator('[data-qb-filter="component"]').selectOption('Lingua Portuguesa');assert.equal(await p.locator('[data-qb-filtered-real]').textContent(),'550');assert.equal(await p.locator('[data-qb-real-total]').textContent(),'1104');
 await p.locator('[data-qb-filter="year"]').selectOption('');await p.locator('[data-qb-filter="component"]').selectOption('');await p.locator('[data-qb-origin="saeb"]').click();assert.equal(await p.locator('[data-qb-filtered-real]').textContent(),'0');
 }
 }else{await p.locator('[data-qb-error]:visible').waitFor();assert.equal(await p.locator('[data-qb-real-total]').textContent(),'—');assert.match(await p.locator('[data-qb-count-scope]').textContent(),/não concluída/);assert.equal(await p.locator('[data-qb-grid] > article').count(),0);release();}
 assert.deepEqual(errors,[]);console.log('PASS browser',scenario,'pages:',calls.length);release();await p.close();
}}finally{await browser.close();server.close();}
