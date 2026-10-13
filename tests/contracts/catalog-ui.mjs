import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.abort());
 await page.setContent('<contract-operations></contract-operations>');
 await page.evaluate(c=>{window.adminSchoolContentRequest=async()=>c;window.getPlatformSession=()=>({userId:'synthetic'});},JSON.parse(readFileSync('/tmp/banco-completo-synthetic-catalog.json')));
 await page.addScriptTag({content:readFileSync('contract-operations.js','utf8')});
 const product=page.locator('[data-product="'+process.argv[2]+'"]');await product.waitFor();
 assert.equal(await product.locator('[data-rule]').count(),145);
 await product.locator(':scope > summary').click();await product.locator('[data-select-all]').click();
 assert.equal(await product.locator('[data-rule-enabled]:checked').count(),144);
 assert.equal(await product.locator('[data-rule][data-type=TRAINING] input:checked').count(),0);
 assert.equal(await product.locator('[data-institutional]').isChecked(),false);
 for(const t of ['QUESTION','VIDEO','BOOK','BOOK_PAGE','GAME','INTERACTION','ACTIVITY','PRINTABLE','ASSESSMENT_TEMPLATE','TRAINING'])assert(await product.locator('[data-type='+t+']').count()>0);
 assert.deepEqual(errors,[]);console.log('PASS real DOM: 145 empty category options visible; school select-all144; TRAINING remains separate; no network');
}finally{await browser.close();}
