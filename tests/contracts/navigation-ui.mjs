import {createRequire} from 'node:module';import {readFileSync} from 'node:fs';import {createServer} from 'node:http';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');const src=readFileSync('app-pages.js','utf8');
const part=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));
const code=part('const adminReadOnlyNav =','const questionBankAdminNavIcons =')+part('const renderAdminSidebar =','const adminPermissionRoleLabel =')+part('const initAdminWorkspace =','const schoolCollectiveData =');
assert(code.length<65000);
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<main data-admin-workspace><div data-nav></div><section data-admin-content></section></main>');});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 await page.addInitScript(()=>{window.adminBindSchoolContent=()=>{};window.printableEscape=String;window.getPlatformSession=()=>({email:'synthetic@example.invalid'});window.rememberCurrentPlatformRoute=()=>{};window.ensureAdminReadOnlyData=async()=>{};window.renderAdminWorkspaceView=v=>v==='conteúdos'&&['entitlements','network-contracts'].includes(new URLSearchParams(location.search).get('type'))?'<h2>Contratos e acessos</h2>':'<h2>'+v+'</h2>';});
 const mount=()=>page.addScriptTag({content:code+"\ndocument.querySelector('[data-nav]').innerHTML=renderAdminSidebar();initAdminWorkspace();"});
 await page.goto('http://127.0.0.1:'+server.address().port+'/admin.html');await mount();
 await page.getByRole('button',{name:'Contratos',exact:true}).click();await page.getByRole('heading',{name:'Contratos e acessos'}).waitFor();assert.match(page.url(),/view=conteudos&type=entitlements/);assert.equal(await page.locator('[data-admin-view=contratos].is-active').count(),1);
 await page.getByRole('button',{name:'Conteúdos',exact:true}).click();assert(!new URL(page.url()).searchParams.has('type'));assert.equal(await page.locator('[data-admin-view="conteúdos"].is-active').count(),1);
 await page.goBack();await page.getByRole('heading',{name:'Contratos e acessos'}).waitFor();assert.equal(await page.locator('[data-admin-view=contratos].is-active').count(),1);
 await page.reload();await mount();assert.equal(await page.locator('[data-admin-view=contratos].is-active').count(),1);
 await page.goto('http://127.0.0.1:'+server.address().port+'/admin.html?view=conteudos&type=book');await mount();assert.equal(new URL(page.url()).searchParams.get('type'),'book');assert.equal(await page.locator('[data-admin-view="conteúdos"].is-active').count(),1);
 assert.deepEqual(errors,[]);console.log('PASS admin sidebar real DOM: Contracts route/highlight; Contents exit; browser back; reload; other content subroute preserved. No backend calls.');
}finally{await browser.close();server.close();}
