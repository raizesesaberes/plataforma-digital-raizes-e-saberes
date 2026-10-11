import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const source=readFileSync('contract-operations.js','utf8');
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<contract-operations></contract-operations>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.getPlatformSession=()=>({userId:'synthetic-admin'});
  window.state=JSON.parse(sessionStorage.getItem('synthetic-server')||'null')||{calls:[],receipts:{},lose:false,delay:0,writes:0};
  const persist=()=>sessionStorage.setItem('synthetic-server',JSON.stringify(state));
  const catalog={schools:[{id:'s',name:'Synthetic school',code:'S',status:'inactive'}],networks:[],products:[],contracts:[],taxonomy:[],subjects:[]};
  window.adminSchoolContentRequest=async(name,body)=>{
   if(name==='admin_get_contract_operations'){if(state.failRead)throw Error('Synthetic readback unavailable');return catalog;}
   if(name==='admin_preview_contract_operation')return {status:'PASS',config:body.p_config,revision:'synthetic-revision',schools:[],effects:{warning:'Synthetic'}};
   if(name==='admin_confirm_contract_operation'){
    state.calls.push(body.p_request_id);
    if(state.reject){const rejection=state.reject;state.reject=null;persist();throw typeof rejection==='string'?Object.assign(Error(rejection),{status:400,code:'P0001',databaseMessage:rejection}):Object.assign(Error(rejection.databaseMessage),rejection);}
    if(!state.receipts[body.p_request_id]){state.writes++;state.receipts[body.p_request_id]={status:'PASS',contract_id:'synthetic-contract',school_ids:['s'],new_school:null,request_id:body.p_request_id};}
    if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
    if(state.lose){state.lose=false;persist();throw Error('Synthetic lost acknowledgement');}
    persist();return state.receipts[body.p_request_id];
   }
  };
 });
 await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({content:source});
 const seed=(action='CREATE')=>page.evaluate((action)=>{const ui=document.querySelector('contract-operations');ui.review={revision:'synthetic-revision',config:{action,reference:'Synthetic draft',starts_at:'2026-10-11',ends_at:'2027-10-10',products:[]},schools:[],effects:{warning:'Synthetic'}};ui.requestId=crypto.randomUUID();ui.form.elements.reference.value='Draft preserved';ui.showReview(ui.review);},action);
 await seed();await page.locator('[data-cancel]').click();assert.equal(await page.locator('[name=reference]').inputValue(),'Draft preserved');assert.equal(await page.evaluate(()=>state.writes),0);
 await seed();await page.locator('[data-confirm-check]').check();await page.evaluate(()=>state.delay=250);await page.locator('[data-confirm]').click();assert.equal(await page.locator('[name=reference]').inputValue(),'Draft preserved');await page.getByRole('heading',{name:'Contrato salvo',exact:true}).waitFor();assert.equal(await page.evaluate(()=>state.writes),1);
 await page.locator('[data-new-contract]').click();await page.locator('form').waitFor();assert.equal(await page.locator('[name=reference]').inputValue(),'');
 await seed();await page.evaluate(()=>{state.delay=0;state.lose=true;});await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('[name=reference]').inputValue(),'Draft preserved');assert(await page.locator('[name=reference]').isDisabled());assert(await page.locator('[data-cancel]').isDisabled());assert.equal(await page.locator('[data-new-contract]').count(),0);
 await page.evaluate(()=>state.failRead=true);const before=await page.evaluate(()=>state.writes);await page.locator('[data-confirm]').click();await page.getByRole('heading',{name:'Contrato salvo',exact:true}).waitFor();assert.equal(await page.evaluate(()=>state.writes),before);const calls=await page.evaluate(()=>state.calls);assert.equal(calls.at(-1),calls.at(-2));
 await page.getByText('Contrato salvo. A lista não pôde ser atualizada;', {exact:false}).waitFor();await page.evaluate(()=>state.failRead=false);await page.locator('[data-contract-list]').click();await page.getByRole('heading',{name:'Histórico de contratos'}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('raizes:pending-contract:synthetic-admin')),null);

 // Definitive validation failures release the draft, clear persisted locks and require a new review/key.
 for(const rejection of ['ACTIVE_PRODUCT_REQUIRED','VALID_FINITE_WINDOW_REQUIRED']){
  await seed();const oldId=await page.evaluate(()=>document.querySelector('contract-operations').requestId);
  await page.evaluate(code=>state.reject=code,rejection);await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();
  await page.getByText('Confirmação rejeitada:',{exact:false}).waitFor();assert.equal(await page.locator('[name=reference]').inputValue(),'Draft preserved');assert(!(await page.locator('[name=reference]').isDisabled()));
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('raizes:pending-contract:synthetic-admin')),null);
  await page.locator('[name=reference]').fill('Corrected draft');await page.locator('[name=reference]').blur();
  await page.evaluate(()=>{const ui=document.querySelector('contract-operations');return ui.preview(ui.config());});
  assert.notEqual(await page.evaluate(()=>document.querySelector('contract-operations').requestId),oldId);
  await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('heading',{name:'Contrato salvo',exact:true}).waitFor();
  await page.locator('[data-new-contract]').click();await page.locator('form').waitFor();
 }
 await seed();await page.evaluate(()=>state.reject='ACTIVE_PRODUCT_REQUIRED');await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('alert').waitFor();
 await page.reload();await page.addScriptTag({content:source});await page.locator('form').waitFor();assert(!(await page.locator('[name=reference]').isDisabled()));assert.equal(await page.locator('[data-review]').isVisible(),false);
 // Lookalike messages, proxy errors and pre-receipt failures cannot unlock an uncertain request.
 for(const rejection of [
  {databaseMessage:'ACTIVE_PRODUCT_REQUIRED'},
  {status:503,code:'P0001',databaseMessage:'ACTIVE_PRODUCT_REQUIRED'},
  {status:400,code:'P0001',databaseMessage:'CONTRACT_WRITE_BUSY'},
  {status:400,code:'P0001',databaseMessage:'REQUEST_ID_REUSED'}
 ]){
  await seed();await page.evaluate(error=>state.reject=error,rejection);await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('alert').waitFor();
  assert(await page.locator('[name=reference]').isDisabled());assert(await page.locator('[data-cancel]').isDisabled());assert(await page.evaluate(()=>sessionStorage.getItem('raizes:pending-contract:synthetic-admin')));
  const id=await page.evaluate(()=>document.querySelector('contract-operations').requestId);await page.locator('[data-confirm]').click();await page.getByRole('heading',{name:'Contrato salvo',exact:true}).waitFor();assert.equal(await page.evaluate(()=>state.calls.at(-1)),id);
  await page.locator('[data-new-contract]').click();await page.locator('form').waitFor();
 }
 // Real receipt schema has no action. Recover a revocation after reload using the persisted validated review.
 await seed('REVOKE');await page.evaluate(()=>state.lose=true);await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('alert').waitFor();
 const revokeWrites=await page.evaluate(()=>state.writes);const revokeId=await page.evaluate(()=>document.querySelector('contract-operations').requestId);
 await page.reload();await page.addScriptTag({content:source});await page.locator('[data-confirm]').waitFor();assert(await page.locator('[name=reference]').isDisabled());assert(await page.locator('[data-cancel]').isDisabled());assert.equal(await page.evaluate(()=>document.querySelector('contract-operations').requestId),revokeId);
 await page.evaluate(()=>state.failRead=true);await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('heading',{name:'Revogação confirmada',exact:true}).waitFor();assert.equal(await page.evaluate(()=>state.writes),revokeWrites);
 await page.getByText('Revogação confirmada. A lista não pôde ser atualizada;',{exact:false}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('raizes:pending-contract:synthetic-admin')),null);
 assert.deepEqual(errors,[]);console.log('PASS real Chromium DOM: cancel preserves draft; delayed ACK; receipt success; new contract; lost ACK locks draft; same-key retry without duplicate; return to list; typed rejection/edit/new preview/confirm and reload; revocation receipt without action and lost-ACK reload recovery. Synthetic RPC only.');
}finally{await browser.close();server.close();}
