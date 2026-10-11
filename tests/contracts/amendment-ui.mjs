import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');const source=readFileSync('contract-operations.js','utf8');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<contract-operations></contract-operations>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.RAIZES_CONTRACT_AMENDMENTS_ENABLED=true;window.getPlatformSession=()=>({userId:'synthetic'});
  const rule={module_id:'m',content_type:'QUESTION',grade_id:'g',subject_id:null,kind:'STANDARD'};
  const old={id:'c',reference:'Existing school contract',operational:true,school_ids:['s'],tenant_school_id:'s',status:'ACTIVE',starts_at:'2026-10-11',ends_at:'2027-10-10',configurations:[{product_id:'p',rules:[rule],institutional:false},{product_id:'legacy',rules:[rule],institutional:false}]};
  const catalog={schools:[{id:'s',name:'Synthetic school',status:'inactive'}],networks:[],contracts:[old],subjects:[],taxonomy:[{grade_id:'g',grade_name:'Infantil 2',institutional:false},{grade_id:'gi',grade_name:'Universidade',institutional:true}],products:[{id:'p',name:'Banco Completo',modules:[{id:'m',name:'Questions',content_types:['QUESTION']},{id:'mt',name:'Universidade',content_types:['TRAINING']}]},{id:'legacy',name:'Legacy',modules:[{id:'m',name:'Questions',content_types:['QUESTION']}]}]};
  window.state=JSON.parse(sessionStorage.getItem('server')||'null')||{calls:[],writes:0,lose:true,receipts:{}};
  window.adminSchoolContentRequest=async(name,body)=>{
   if(name==='admin_get_contract_operations')return catalog;
   state.calls.push({name,body});
   if(name==='admin_preview_contract_amendment'){if(state.delayPreview)await new Promise(resolve=>{window.releasePreview=resolve;});return {status:'PASS',config:body.p_config,revision:'r',before:{contract:{...old,contract_ref:old.reference}},added_rules:[],removed_rules:[rule],removed_products:['legacy'],product_state_changes:[{product_id:'legacy',before_product:'active',before_entitlement:'ACTIVE',after_product:'inactive',after_entitlement:'REVOKED'}],module_changes:[{name:'Universidade',before:false,after:true}],effects:{warning:'Dates preserved'}};}
   if(name!=='admin_confirm_contract_amendment')throw Error('Unexpected RPC '+name);
   if(state.reject){state.reject=false;throw Object.assign(Error('AMENDMENT_REACTIVATION_REQUIRES_REVIEW'),{status:400,code:'P0001',databaseMessage:'AMENDMENT_REACTIVATION_REQUIRES_REVIEW'});}
   if(!state.receipts[body.p_request_id]){state.writes++;state.receipts[body.p_request_id]={status:'PASS',action:'AMEND',contract_id:'c',school_ids:['s'],request_id:body.p_request_id};}
   const lose=state.lose;state.lose=false;sessionStorage.setItem('server',JSON.stringify(state));if(lose)throw Error('Lost ACK');return state.receipts[body.p_request_id];
  };
 });
 const mount=()=>page.addScriptTag({content:source});await page.goto('http://127.0.0.1:'+server.address().port);await mount();
 await page.locator('[data-amend]').click();assert(await page.locator('[name=starts_at]').isDisabled());assert.equal(await page.locator('[name=starts_at]').inputValue(),'2026-10-11');assert.equal(await page.locator('[name=ends_at]').inputValue(),'2027-10-10');
 await page.locator('[data-exit-amend]').click();assert.equal(await page.evaluate(()=>state.writes),0);await page.locator('[data-amend]').click();
 // Cancel while the server's preview is still pending, then deliver the late response.
 await page.locator('[name=reason]').fill('Delayed preview cancellation');await page.locator('[name=adopt_dynamic]').check();await page.evaluate(()=>state.delayPreview=true);await page.locator('button[type=submit]').click();await page.waitForFunction(()=>typeof window.releasePreview==='function');
 await page.locator('[data-exit-amend]').click();await page.evaluate(()=>{state.delayPreview=false;window.releasePreview();});
 await page.waitForFunction(()=>document.querySelector('contract-operations').generation>=1);await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,0)));
 assert.equal(await page.locator('[data-review]').isVisible(),false);assert.equal(await page.locator('[data-confirm]').count(),0);assert.equal(await page.evaluate(()=>document.querySelector('contract-operations').review),null);assert.equal(await page.evaluate(()=>state.writes),0);
 await page.evaluate(()=>state.calls=[]);await page.locator('[data-amend]').click();
 await page.locator('[data-product=legacy] [data-product-enabled]').uncheck();await page.locator('[data-product=p] [data-institutional]').check();await page.locator('[data-rule][data-type=TRAINING]').evaluate(el=>el.closest('details').open=true);await page.locator('[data-rule][data-type=TRAINING] input').check();
 await page.locator('[name=reason]').fill('Synthetic content amendment');await page.locator('[name=adopt_dynamic]').check();await page.locator('button[type=submit]').click();await page.getByText('Revisar aditamento do contrato',{exact:true}).waitFor();
 const cfg=await page.evaluate(()=>state.calls[0].body.p_config);assert.equal(cfg.action,'AMEND');assert.equal(cfg.contract_id,'c');assert(!('starts_at' in cfg));assert.equal(cfg.products.length,1);assert.equal(cfg.products[0].rules.length,2);assert.deepEqual(cfg.school_ids,['s']);
 await page.evaluate(()=>state.reject=true);await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('alert').waitFor();
 assert(!(await page.locator('[name=reason]').isDisabled()));assert(await page.locator('[name=starts_at]').isDisabled());assert.equal(await page.evaluate(()=>sessionStorage.getItem('raizes:pending-contract:synthetic')),null);assert.equal(await page.evaluate(()=>state.writes),0);
 await page.locator('button[type=submit]').click();await page.getByText('Revisar aditamento do contrato',{exact:true}).waitFor();
 await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('alert').waitFor();assert(await page.locator('[data-exit-amend]').isDisabled());const key=await page.evaluate(()=>document.querySelector('contract-operations').requestId);
 await page.reload();await mount();await page.locator('[data-confirm]').waitFor();assert(await page.locator('[name=starts_at]').isDisabled());assert.equal(await page.locator('[name=reason]').inputValue(),'Synthetic content amendment');assert(!(await page.locator('[data-product=legacy] [data-product-enabled]').isChecked()));
 await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('heading',{name:'Aditamento confirmado'}).waitFor();assert.equal(await page.evaluate(()=>state.writes),1);assert.equal(await page.evaluate(()=>state.calls.at(-1).body.p_request_id),key);assert.deepEqual(errors,[]);
 console.log('PASS amendment UI: explicit action, preserved dates/targets, category selection/removal, cancel with late preview ignored, preview, lost ACK/reload/same-key recovery, exact success. Synthetic RPC only.');
}finally{await browser.close();server.close();}
