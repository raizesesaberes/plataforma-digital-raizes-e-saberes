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
  window.state={calls:[],receipts:{},lose:false,delay:0,writes:0};
  const catalog={schools:[{id:'s',name:'Synthetic school',code:'S',status:'inactive'}],networks:[],products:[],contracts:[],taxonomy:[],subjects:[]};
  window.adminSchoolContentRequest=async(name,body)=>{
   if(name==='admin_get_contract_operations'){if(state.failRead)throw Error('Synthetic readback unavailable');return catalog;}
   if(name==='admin_confirm_contract_operation'){
    state.calls.push(body.p_request_id);
    if(!state.receipts[body.p_request_id]){state.writes++;state.receipts[body.p_request_id]={contract_id:'synthetic-contract',action:body.p_review.config.action};}
    if(state.delay)await new Promise(r=>setTimeout(r,state.delay));
    if(state.lose){state.lose=false;throw Error('Synthetic lost acknowledgement');}
    return state.receipts[body.p_request_id];
   }
  };
 });
 await page.goto('http://127.0.0.1:'+server.address().port);await page.addScriptTag({content:source});
 const seed=()=>page.evaluate(()=>{const ui=document.querySelector('contract-operations');ui.review={config:{action:'CREATE',reference:'Synthetic draft',starts_at:'2026-10-11',ends_at:'2027-10-10',products:[]},schools:[],effects:{warning:'Synthetic'}};ui.requestId=crypto.randomUUID();ui.form.elements.reference.value='Draft preserved';ui.showReview(ui.review);});
 await seed();await page.locator('[data-cancel]').click();assert.equal(await page.locator('[name=reference]').inputValue(),'Draft preserved');assert.equal(await page.evaluate(()=>state.writes),0);
 await seed();await page.locator('[data-confirm-check]').check();await page.evaluate(()=>state.delay=250);await page.locator('[data-confirm]').click();assert.equal(await page.locator('[name=reference]').inputValue(),'Draft preserved');await page.getByRole('heading',{name:'Contrato salvo',exact:true}).waitFor();assert.equal(await page.evaluate(()=>state.writes),1);
 await page.locator('[data-new-contract]').click();await page.locator('form').waitFor();assert.equal(await page.locator('[name=reference]').inputValue(),'');
 await seed();await page.evaluate(()=>{state.delay=0;state.lose=true;});await page.locator('[data-confirm-check]').check();await page.locator('[data-confirm]').click();await page.getByRole('alert').waitFor();assert.equal(await page.locator('[name=reference]').inputValue(),'Draft preserved');assert(await page.locator('[name=reference]').isDisabled());assert(await page.locator('[data-cancel]').isDisabled());assert.equal(await page.locator('[data-new-contract]').count(),0);
 await page.evaluate(()=>state.failRead=true);const before=await page.evaluate(()=>state.writes);await page.locator('[data-confirm]').click();await page.getByRole('heading',{name:'Contrato salvo',exact:true}).waitFor();assert.equal(await page.evaluate(()=>state.writes),before);const calls=await page.evaluate(()=>state.calls);assert.equal(calls.at(-1),calls.at(-2));
 await page.getByText('Contrato salvo. A lista não pôde ser atualizada;', {exact:false}).waitFor();await page.evaluate(()=>state.failRead=false);await page.locator('[data-contract-list]').click();await page.getByRole('heading',{name:'Histórico de contratos'}).waitFor();assert.equal(await page.evaluate(()=>sessionStorage.getItem('raizes:pending-contract:synthetic-admin')),null);
 assert.deepEqual(errors,[]);console.log('PASS real Chromium DOM: cancel preserves draft; delayed ACK; receipt success; new contract; lost ACK locks draft; same-key retry without duplicate; return to list. Synthetic RPC only.');
}finally{await browser.close();server.close();}
