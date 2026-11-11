// Read-only local rendering. No production login, course data, or mutations.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(import.meta.dirname,'../..');
const out=process.env.FORMATION_VISUAL_OUTPUT||'/tmp/formacao-visual-qa-20261111/final';
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.svg':'image/svg+xml','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.json':'application/json'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const report=[];
async function capture(page, options) {
 await page.evaluate(()=>Promise.all([...document.images].map(image=>{image.loading='eager';return image.decode().catch(()=>{});})));
 await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(1,1);
 await page.screenshot(options);
 console.log('Captured '+options.path.split('/').pop());
}
try{
 for(const width of (process.env.FORMATION_VISUAL_WIDTHS||'1440,390,320').split(',').map(Number)){
  const page=await browser.newPage({viewport:{width,height:1000},locale:'pt-BR'}),errors=[];
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(origin+'/universidade.html');await page.locator('.fd-collection-covers img').last().waitFor();
  await page.locator('.fd-collection-covers').scrollIntoViewIfNeeded();await page.evaluate(()=>{document.querySelectorAll('img').forEach(img=>img.loading='eager');window.scrollTo(0,0);});await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
  assert.equal(await page.locator('.app-topbar .module-switcher,.app-topbar .top-filter').count(),0);
  assert.equal(await page.locator('.fd-entry-cards>a').count(),3);
  assert.equal(await page.locator('.fd-highlight-card').count(),2);
  assert.equal(await page.locator('.fd-collection-covers img').count(),3);
  assert(await page.locator('.fd-collection-covers img').evaluateAll(images=>images.every(img=>img.naturalWidth>0&&getComputedStyle(img).objectFit==='contain')));
  assert(await page.locator('[data-formation-progress]').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  assert(await page.locator('.app-topbar').evaluate(el=>getComputedStyle(el).position==='relative'));
  const typography=await page.locator('.university-public-hero h1').evaluate(el=>({family:getComputedStyle(el).fontFamily,weight:getComputedStyle(el).fontWeight}));
  assert(!/Poppins|Georgia|Manrope/.test(typography.family));assert.equal(typography.weight,'600');
  await capture(page,{path:out+`/university-home-${width}.png`,fullPage:true});
  if(width<1024){await page.locator('[data-rs-menu-toggle]').click();assert(await page.locator('.app-sidebar').isVisible());await page.keyboard.press('Escape');assert(await page.locator('.app-sidebar').isHidden());}
  await page.locator('.app-search input').fill('Docência Plural');
  await page.waitForURL(url=>url.hash==='#catalogo');await page.locator('[data-course-results] .public-course-card').first().waitFor();
  assert.equal(await page.locator('[data-course-search]').inputValue(),'Docência Plural');
  assert.equal(await page.locator('[data-course-results] .public-course-card').count(),1);
  await page.locator('[data-course-search]').fill('');
  assert.equal(await page.locator('.app-search input').inputValue(),'');
  const weights=await page.locator('.public-course-card').first().locator('h3,p,dt,dd,button,figure span').evaluateAll(nodes=>nodes.map(node=>({tag:node.tagName,weight:getComputedStyle(node).fontWeight,family:getComputedStyle(node).fontFamily})));
  assert(weights.every(x=>Number(x.weight)<=600&&!/Poppins|Georgia|Manrope/.test(x.family)));
  const heavy=await page.locator('.university-catalog-platform *').evaluateAll(nodes=>nodes.filter(el=>el.getClientRects().length&&[...el.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())&&Number(getComputedStyle(el).fontWeight)>700).map(el=>({class:el.className,tag:el.tagName,text:el.textContent.trim().slice(0,65),weight:getComputedStyle(el).fontWeight})));
  assert.deepEqual(heavy,[],'No residual heavy UI text in the course catalog');
  await capture(page,{path:out+`/external-courses-${width}.png`,fullPage:true});
  await page.locator('.fd-highlight-card').count();
  await page.goto(origin+'/universidade.html#curso-real-docencia-plural');
  await page.locator('[data-course-detail]:not([hidden])').waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await capture(page,{path:out+`/external-detail-${width}.png`,fullPage:true});
  await page.locator('.fd-detail-back').click();assert(await page.locator('[data-course-detail]').isHidden());
  for(const [path,selector] of [['formacao.html','.formation-hero h1'],['personal-learning.html','main h1']]){
   await page.goto(origin+'/'+path);await page.locator(selector).waitFor();
   const font=await page.locator(selector).evaluate(el=>({family:getComputedStyle(el).fontFamily,weight:getComputedStyle(el).fontWeight}));
   assert.equal(font.family,typography.family);assert.equal(font.weight,'600');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await capture(page,{path:out+`/${path.replace('.html','')}-guest-${width}.png`,fullPage:true});
  }
  // Integrate the real welcome module with synthetic authorized API responses.
  let welcomeMode='courses', listCalls=0;
  const userId='12345678-1234-4123-8123-123456789abc';
  const fullName='Maria Aparecida de Albuquerque e Vasconcelos';
  const courses=Array.from({length:3},(_,i)=>({id:'fixture-'+i,title:'Formação continuada em práticas pedagógicas inclusivas, planejamento e avaliação da aprendizagem '+(i+1),provider:'Instituição pública de formação continuada',status:'in_progress',source_url:'https://example.org/course-'+i,archived_at:null}));
  await page.route(origin+'/supabase-config.js',route=>route.fulfill({contentType:'text/javascript',body:'window.RAIZES_SUPABASE={url:"https://fixture.supabase.co",anonKey:"fixture-public"};'}));
  await page.route('https://fixture.supabase.co/functions/v1/personal-learning',route=>{listCalls++;assert.equal(route.request().postDataJSON().action,'list');return route.fulfill({json:{ok:true,courses:welcomeMode==='empty'?[]:courses,certificates:[]}});});
  await page.route('https://fixture.supabase.co/auth/v1/user',route=>route.fulfill({json:{id:userId}}));
  await page.route('https://fixture.supabase.co/rest/v1/profiles?**',route=>route.fulfill({json:[{id:userId,display_name:fullName}]}));
  await page.evaluate(()=>localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:'fixture-token',expires_at:Date.now()/1000+3600,platform_role:'professor',user:{id:'12345678-1234-4123-8123-123456789abc'}})));
  await page.goto(origin+'/universidade.html');
  await page.getByRole('heading',{name:'Olá, '+fullName+'.',exact:true}).waitFor();
  assert.equal(await page.locator('.formation-progress-item').count(),3);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await capture(page,{path:out+`/welcome-long-profile-${width}.png`,fullPage:true});
  // A shell rerender must destroy the previous welcome controller.
  await page.evaluate(()=>renderAppPage());
  await page.getByRole('heading',{name:'Olá, '+fullName+'.',exact:true}).waitFor();
  const beforeRefresh=listCalls;
  await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'})));
  await page.getByRole('heading',{name:'Olá, '+fullName+'.',exact:true}).waitFor();
  assert.equal(listCalls-beforeRefresh,1,'Rerender must not duplicate welcome listeners');
  welcomeMode='empty';await page.reload();
  await page.getByText('Você ainda não marcou nenhum curso como em andamento.',{exact:true}).waitFor();
  await capture(page,{path:out+`/welcome-empty-${width}.png`,fullPage:true});
  await page.evaluate(()=>{localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:'expired-fixture',expires_at:1,platform_role:'professor',user:{id:'12345678-1234-4123-8123-123456789abc'}}));window.dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'}));});
  await page.getByRole('heading',{name:'Seu próximo passo na formação',exact:true}).waitFor();
  assert.equal(await page.locator('.formation-progress-item').count(),0);
  assert(!(await page.locator('[data-university-home]').innerText()).includes(fullName));
  await capture(page,{path:out+`/welcome-expired-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);report.push({width,typography,weights,overflow:false,errors});await page.close();
 }
 await writeFile(out+'/visual-report.json',JSON.stringify({localSynthetic:true,externalRequestsBlocked:true,report},null,2));
 console.log('PASS Formation visual consistency, public home, search, navigation and responsive layout at 1440/390/320.');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
