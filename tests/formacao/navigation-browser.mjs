// All accounts and transport responses here are synthetic. No production services or mutations.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname, '../..');
const out = resolve(process.env.FORMATION_NAVIGATION_OUTPUT || '/tmp/formacao-navigation-qa-20261111');
await mkdir(out, {recursive:true});
const server = createServer(async (req,res) => {
  try {
    let path = new URL(req.url, 'http://local').pathname;
    if (path === '/supabase-config.js') {
      res.setHeader('Content-Type','text/javascript');
      res.end('window.RAIZES_SUPABASE={url:"https://fixture.supabase.co",anonKey:"fixture-public"};'); return;
    }
    if (!extname(path)) path += '.html';
    const file = resolve(root, '.'+path);
    if (!file.startsWith(root+'/')) throw Error('Outside root');
    res.setHeader('Content-Type', ({'.svg':'image/svg+xml','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.json':'application/json'})[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode=404; res.end('Not found'); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const id = '12345678-1234-4123-8123-123456789abc';
const lessons = Array.from({length:4},(_,i)=>({id:'fixture-lesson-'+(i+1),title:'Aula sintética '+(i+1),description:'Metadados de teste, sem mídia privada.',lessonNumber:i+1,status:'published',availableKinds:['video'],canPlay:true,durationSeconds:300,hierarchy:{collection:'Avalia+',subject:'Matemática',schoolYear:'1º ano',volume:'1',unit:'1'}}));
const report=[];
try {
  for (const width of [1440,390,320]) {
    const context=await browser.newContext({viewport:{width,height:1000},locale:'pt-BR'});
    const page=await context.newPage(), errors=[], requests=[];
    page.setDefaultTimeout(15000); page.on('pageerror',e=>errors.push(e.message));
    await context.addInitScript(({id})=>{
      if (!localStorage.getItem('fixture-seeded')) {
        localStorage.setItem('fixture-seeded','1');
        localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:'fixture-token',expires_at:Date.now()/1000+3600,platform_role:'professor',user:{id,user_metadata:{full_name:'Professora Sintética'}}}));
      }
    },{id});
    await context.route('**/*',async route=>{
      const req=route.request(),url=req.url();
      if(url.startsWith(origin+'/')) return route.continue();
      if(!url.startsWith('https://fixture.supabase.co/')) return route.abort();
      requests.push({url,method:req.method(),body:req.postData()});
      if(url.includes('/functions/v1/personal-learning')) {
        assert.equal(req.postDataJSON().action,'list');
        return route.fulfill({json:{ok:true,courses:[],certificates:[]}});
      }
      if(url.includes('/functions/v1/teacher-training-access')) {
        assert.equal(req.postDataJSON().action,'catalog','Navigation must not request paid media');
        return route.fulfill({json:{ok:true,actor:'teacher',schoolId:null,access:'available',lessons}});
      }
      if(url.endsWith('/auth/v1/user')) return route.fulfill({json:{id}});
      if(url.includes('/rest/v1/profiles?')) return route.fulfill({json:[{id,display_name:'Professora Sintética'}]});
      return route.fulfill({json:[]});
    });
    const canonical = async () => {
      await page.waitForURL(url=>/^\/universidade(?:\.html)?$/.test(url.pathname));
      await page.locator('[data-university-home]').waitFor({state:'visible'});
      await page.getByRole('heading',{name:'Olá, Professora Sintética.',exact:true}).waitFor();
      assert.equal(await page.locator('.fd-entry-cards>a').count(),3);
      assert.equal(await page.locator('.fd-highlight-card').count(),2);
      assert.equal(await page.locator('.fd-collection-covers img').count(),3);
      assert.equal(await page.locator('.tw-formation-shell,#teacher-formation-title').count(),0);
    };
    // The actual teacher menu and quick action share the canonical destination.
    await page.goto(origin+'/professor.html');
    await page.locator('[data-teacher-workspace]').waitFor();
    assert.equal(await page.locator('.tw-sidebar [data-teacher-open-url="universidade.html"]').count(),1);
    assert.match(await page.evaluate(()=>renderTeacherQuickActions()),/data-teacher-open-url="universidade.html"/);
    if(width<1024) await page.locator('[data-rs-menu-toggle]').click();
    await page.evaluate(()=>{const guard=document.createElement('div');guard.dataset.institutionalMission='teacher';guard.missionCanLeave=()=>false;document.querySelector('[data-teacher-content]').append(guard);});
    await page.locator('.tw-sidebar [data-teacher-open-url="universidade.html"]').click();
    assert.equal(new URL(page.url()).pathname,'/professor.html','Pending mission guard must remain effective');
    await page.evaluate(()=>document.querySelector('[data-institutional-mission]').remove());
    if(width<1024) await page.locator('[data-rs-menu-toggle]').click();
    await page.locator('.tw-sidebar [data-teacher-open-url="universidade.html"]').click();
    await canonical();
    await page.goBack(); await page.locator('[data-teacher-workspace]').waitFor();
    await page.goForward(); await canonical();
    // Bookmarks/old history must replace themselves, never insert a legacy screen.
    for (const path of ['professor','professor.html']) for(const alias of ['formação','formacao','universidade']) {
      await page.goto(origin+'/personal-learning.html');
      await page.goto(origin+'/'+path+'?view='+encodeURIComponent(alias));
      await canonical();
      await page.goBack();
      assert.equal(new URL(page.url()).pathname,'/personal-learning.html','Alias must replace its history entry');
      await page.goForward(); await canonical();
    }
    // Existing same-document teacher popstate entries also canonicalize.
    await page.goto(origin+'/professor.html');await page.locator('[data-teacher-workspace]').waitFor();
    await page.evaluate(()=>{history.pushState({},'',location.pathname+'?view=formacao');window.dispatchEvent(new PopStateEvent('popstate'));});
    await canonical();
    // Hash back/forward, global Inicio, and the separate role-aware dashboard exit.
    await page.locator('.fd-entry-cards a[href="#catalogo"]').click();
    await page.locator('[data-university-external]').waitFor({state:'visible'});
    await page.goBack(); await canonical();
    await page.goForward();await page.locator('[data-university-external]').waitFor({state:'visible'});
    await page.locator('.app-topbar .rs-global-actions').getByRole('link',{name:'Início',exact:true}).click();await canonical();
    assert.equal(await page.locator('.app-topbar .rs-global-actions').getByRole('link',{name:'Voltar ao painel',exact:true}).getAttribute('href'),'professor.html');
    assert.equal(await page.locator('a[href="plataforma.html"],a[href*="view=formacao"],a[href*="view=forma%C3%A7%C3%A3o"]').count(),0);
    // Re-mounting the actual welcome code must not duplicate storage listeners.
    await page.evaluate(()=>renderAppPage()); await canonical();
    const before=requests.filter(r=>r.url.includes('/functions/v1/personal-learning')).length;
    await page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'})));
    await page.getByRole('heading',{name:'Olá, Professora Sintética.',exact:true}).waitFor();
    assert.equal(requests.filter(r=>r.url.includes('/functions/v1/personal-learning')).length-before,1);
    // Course and certificate spaces retain protected state and return to this same home.
    await page.locator('.fd-entry-cards a[href="formacao.html"]').click();
    await page.locator('#lesson-title').waitFor();assert.equal(await page.locator('.lesson-option').count(),4);
    assert.equal(await page.locator('#panel-link').getAttribute('href'),'professor.html');
    await page.locator('[data-formation-home]').click();await canonical();
    await page.locator('.fd-entry-cards a[href="personal-learning.html"]').click();
    await page.locator('[data-formation-home]').click();await canonical();
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'University must not overflow');
    await page.evaluate(()=>Promise.all([...document.images].map(image=>{image.loading='eager';return image.decode().catch(()=>{});})));
    await page.screenshot({path:out+`/canonical-${width}.png`,fullPage:true});
    // Role-specific exits never send an admin/manager to the teacher panel.
    for(const [role,home] of [['admin','admin.html'],['gestor','gestor.html'],['coordenador','professor.html']]) {
      await page.evaluate(role=>{const key='raizes:supabase-auth-session';const session=JSON.parse(localStorage.getItem(key));session.platform_role=role;localStorage.setItem(key,JSON.stringify(session));},role);
      await page.goto(origin+'/universidade.html?from=teacher');
      assert.equal(await page.locator('.app-topbar .rs-global-actions').getByRole('link',{name:'Voltar ao painel',exact:true}).getAttribute('href'),home);
      assert.equal(await page.locator('.university-teacher-return').count(),0);
    }
    assert.deepEqual(errors,[]);
    report.push({width,canonicalTeacherMenu:true,aliases:6,history:'replace/back/forward/popstate/hash',welcomeListeners:1,syntheticLessons:4,roleExits:true,errors});
    await context.close();
  }
  await writeFile(out+'/report.json',JSON.stringify({synthetic:true,productionAuth:false,mediaPlayback:false,report},null,2));
  console.log('PASS Formation canonical navigation: real menu, six aliases, history, returns, roles, welcome remount, 1440/390/320.');
} finally { await browser.close(); server.closeAllConnections(); await new Promise(r=>server.close(r)); }
