// Local synthetic navigation/privacy checks only. No production login or media.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve(import.meta.dirname,'../..');
const out = process.env.FORMATION_SIDEBAR_OUTPUT || '/tmp/formacao-sidebar-qa-20261111';
await mkdir(out,{recursive:true});
const server = createServer(async (req,res) => {
  try {
    let path = new URL(req.url,'http://local').pathname;
    if (path === '/supabase-config.js') { res.setHeader('Content-Type','text/javascript'); res.end('window.RAIZES_SUPABASE={url:"https://fixture.supabase.co",anonKey:"fixture-public"};'); return; }
    if (!extname(path)) path += '.html';
    const file = resolve(root,'.'+path); if (!file.startsWith(root+'/')) throw Error();
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.json':'application/json'})[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.statusCode = 404; res.end('Not found'); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})});
const checks = [], errors = [];
const lessons = ['Corações para presentear','Coleções de brinquedos','Cartões de números','Contagem de coleções'].map((title,i)=>({id:`fixture-lesson-${i+1}`,title,description:'Formação docente para o trabalho com a unidade 1 do volume 1.',lessonNumber:i+1,status:'published',availableKinds:['video'],canPlay:true,durationSeconds:180,hierarchy:{collection:'Avalia+',subject:'Matemática',schoolYear:'1º ano',volume:1,unit:1,unitTitle:'Descobertas com Lia e Davi'}}));
const courses = [{id:'20000000-0000-4000-8000-000000000001',title:'Educação inclusiva: caminhos para a sala de aula',provider:'Instituição de formação',source_url:'https://example.org/inclusao',status:'in_progress',archived_at:null}];
async function fixture(width=1440,options={}) {
  const context=await browser.newContext({viewport:{width,height:1000},locale:'pt-BR'}),page=await context.newPage();
  page.setDefaultTimeout(12000); page.on('pageerror',e=>errors.push(e.message));
  const calls={catalog:0,asset:0,logout:0,refresh:0,personal:0};
  await context.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.addInitScript(({guest,expired,role})=>{
    if(!guest && !sessionStorage.getItem('fixture-initialized')) {
      localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:'fixture-token',refresh_token:'fixture-refresh',expires_at:expired?1:9999999999,platform_role:role}));
      localStorage.setItem('raizes:supabase-access-token','fixture-token');
      for(const key of ['raizes:demo-authenticated','raizes:demo-curator','sb-fixture-auth-token','sb-other-project-auth-token','saved-courses','favorites']) localStorage.setItem(key,'fixture-keep-or-clear');
      sessionStorage.setItem('fixture-initialized','1');
    }
    Object.defineProperty(HTMLMediaElement.prototype,'src',{configurable:true,get(){return this.getAttribute('data-test-src')||'';},set(value){this.setAttribute('data-test-src',value);}});
    HTMLMediaElement.prototype.play=async function(){};
    HTMLMediaElement.prototype.pause=function(){window.fixturePauses=(window.fixturePauses||0)+1;};
    HTMLMediaElement.prototype.load=function(){};
  },{guest:!!options.guest,expired:!!options.expired,role:options.role||'professor'});
  await context.route('https://fixture.supabase.co/functions/v1/teacher-training-access',async route=>{
    const body=route.request().postDataJSON();
    if(body.action==='asset') { calls.asset++; if(options.assetDelay) await new Promise(r=>setTimeout(r,options.assetDelay)); await route.fulfill({json:{ok:true,asset:{lessonId:body.lessonId,kind:body.kind,mimeType:'video/mp4',signedUrl:'https://fixture.supabase.co/storage/v1/object/sign/private/fixture.mp4?token=fixture-only',expiresIn:300}}}).catch(()=>{}); return; }
    calls.catalog++; if(options.catalogDelay) await new Promise(r=>setTimeout(r,options.catalogDelay));
    await route.fulfill({json:{ok:true,actor:options.role==='admin'?'admin':'teacher',access:'available',lessons}}).catch(()=>{});
  });
  await context.route('https://fixture.supabase.co/functions/v1/personal-learning',async route=>{
    calls.personal++; if(options.personalDelay) await new Promise(r=>setTimeout(r,options.personalDelay));
    await route.fulfill({json:{ok:true,courses,certificates:[]}}).catch(()=>{});
  });
  await context.route('https://fixture.supabase.co/auth/v1/token?grant_type=refresh_token',async route=>{
    calls.refresh++; if(options.refreshDelay) await new Promise(r=>setTimeout(r,options.refreshDelay));
    await route.fulfill({json:{access_token:'fixture-renewed',refresh_token:'fixture-next',expires_at:9999999999}}).catch(()=>{});
  });
  await context.route('https://fixture.supabase.co/auth/v1/logout?scope=local',async route=>{
    calls.logout++; assert.equal(route.request().method(),'POST');
    if(options.logoutDelay) await new Promise(r=>setTimeout(r,options.logoutDelay));
    await route.fulfill({status:options.logoutStatus||204,...(options.logoutStatus?{json:{code:'fixture_unavailable'}}:{body:''})}).catch(()=>{});
  });
  return {context,page,calls};
}
const noOverflow=page=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
const readyImages=page=>page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
async function capture(page,name) { await readyImages(page); await page.screenshot({path:`${out}/${name}.png`,fullPage:true}); }
async function privateGone(page) {
  await page.waitForFunction(()=>!document.querySelector('video,audio,[data-course],[data-lesson]'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('raizes:supabase-auth-session')),null);
  assert.equal(await page.evaluate(()=>localStorage.getItem('raizes:supabase-access-token')),null);
  for(const key of ['saved-courses','favorites','sb-other-project-auth-token']) assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'fixture-keep-or-clear');
  for(const key of ['raizes:demo-authenticated','raizes:demo-curator','sb-fixture-auth-token']) assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
}
try {
  const arrival=await fixture(1440);
  await arrival.page.goto(origin+'/universidade.html');
  await arrival.page.locator('.fd-entry-cards a[href="formacao.html"]').waitFor();
  await arrival.page.evaluate(()=>sessionStorage.setItem('raizes:formation-navigation-stack',JSON.stringify(['formacao.html','personal-learning.html'])));
  await arrival.page.locator('.fd-entry-cards a[href="formacao.html"]').click();
  await arrival.page.locator('#lesson-title').waitFor();
  assert.equal(new URL(await arrival.page.evaluate(()=>document.referrer)).pathname,'/universidade.html');
  await arrival.page.locator('[data-formation-back]').click();
  await arrival.page.waitForLoadState();
  assert.equal(new URL(arrival.page.url()).pathname,'/universidade.html','A fresh Universidade arrival must outrank a stale personal-learning visit');
  checks.push({history:'Universidade to Formation with stale personal-learning history',result:'Voltar respects the actual same-origin arrival'});
  await arrival.context.close();
  for(const width of [1440,1280,1024,768,390,320]) {
    const {context,page,calls}=await fixture(width);
    await page.goto(origin+'/formacao.html'); await page.locator('#lesson-title').waitFor();
    assert.equal(calls.logout,0); assert.equal(calls.asset,0);
    const nav=page.locator('.fd-platform-nav');
    assert.deepEqual(await nav.locator('a').evaluateAll(links=>links.map(a=>a.getAttribute('href'))),['universidade.html','formacao.html','universidade.html#catalogo','personal-learning.html']);
    assert.equal(await nav.locator('[aria-current=page]').innerText(),'Nossas coleções');
    assert.equal(await page.locator('[data-formation-home]').getAttribute('href'),'universidade.html');
    assert.equal(await page.locator('#panel-link').getAttribute('href'),'professor.html');
    assert.equal(await page.locator('.fd-global-actions').innerText(),'Voltar\nInício\nSair');
    assert(await noOverflow(page),`page overflow at ${width}`);
    const fonts=await page.locator('.lesson-filters input,.lesson-filters select,.lesson-quick-results small,.lesson-quick-results span,.sidebar-heading p,.breadcrumbs ol').evaluateAll(els=>els.map(el=>parseFloat(getComputedStyle(el).fontSize)));
    assert(fonts.every(size=>size>=14),`readable metadata at ${width}`);
    const player=await page.locator('.media-stage').boundingBox();
    assert(player.width>=(width<641?width-34:width>=1280?600:width>=1024?700:width-52),`player width ${player.width} at ${width}`);
    assert.equal(await page.locator('[data-formation-shell]').count(),1);
    assert.equal(await page.locator('header').count(),1); assert.equal(await page.locator('main').count(),1);
    await capture(page,`collections-${width}`);
    if(width===1440 || width===390 || width===320) {
      await page.screenshot({path:`${out}/top-viewport-${width}.png`});
      await page.locator('.lesson-heading').evaluate(el=>el.scrollIntoView({block:'start',behavior:'instant'}));
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      assert((await page.locator('.media-stage').boundingBox()).y < 180);
      if(width===1440) {
        const rail=await page.locator('#formation-navigation').boundingBox();
        const home=await nav.locator('a').first().boundingBox();
        assert(Math.abs(rail.y)<1,'The desktop navigation remains sticky');
        assert(home.y>=0 && home.y+home.height<1000,'The Universidade link remains inside the viewport while watching');
      }
      await page.screenshot({path:`${out}/player-viewport-${width}.png`});
      await page.evaluate(()=>scrollTo(0,0));
    }
    if(width<1024) {
      const toggle=page.locator('[data-formation-menu-toggle]');
      assert(!(await page.locator('#formation-navigation').isVisible()));
      await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'),'true');
      assert(await page.locator('[data-formation-content]').evaluate(el=>el.inert));
      assert.equal(await page.locator('#formation-navigation').getAttribute('aria-modal'),'true');
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('data-formation-menu-close')),'');
      const links=page.locator('#formation-navigation a');
      await links.last().focus(); await page.keyboard.press('Tab'); assert(await links.first().evaluate(el=>el===document.activeElement));
      await page.keyboard.press('Shift+Tab'); assert(await links.last().evaluate(el=>el===document.activeElement));
      if(width<=390) await page.screenshot({path:`${out}/drawer-${width}.png`});
      await page.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-expanded'),'false'); assert(await toggle.evaluate(el=>el===document.activeElement));
      assert(!(await page.locator('[data-formation-content]').evaluate(el=>el.inert)));
      await toggle.click(); await page.locator('[data-formation-menu-close]').click(); assert(await toggle.evaluate(el=>el===document.activeElement));
      await toggle.click(); await page.mouse.click(width-5,100); assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      await toggle.click(); await page.setViewportSize({width:1440,height:1000}); assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      assert(!(await page.locator('[data-formation-content]').evaluate(el=>el.inert))); assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
      await page.setViewportSize({width,height:1000});
    }
    await page.getByRole('searchbox').fill('brinquedos'); assert.equal(await page.locator('.lesson-quick-results button').count(),1);
    await page.locator('.lesson-quick-results button').click(); assert.equal(await page.locator('#lesson-title').innerText(),lessons[1].title);
    await page.goBack(); await page.locator('#lesson-title').filter({hasText:lessons[0].title}).waitFor();
    await page.locator('[data-formation-home]').click(); await page.waitForURL('**/universidade.html');
    await page.goto(origin+'/personal-learning.html'); await page.getByRole('heading',{name:courses[0].title}).waitFor();
    assert(await noOverflow(page),`personal overflow at ${width}`); assert.equal(await nav.locator('[aria-current=page]').innerText(),'Meus cursos e certificados');
    await capture(page,`personal-${width}`);
    await page.locator('[data-formation-back]').click(); await page.waitForURL('**/universidade.html');
    checks.push({width,navigation:'unique destinations and active state',drawer:width<1024?'Escape/close/overlay/focus trap/inert/resize passed':'fixed rail',content:'search, lesson selection, native Back and personal workspace passed',overflow:'none',minimumMetadataPx:Math.min(...fonts)});
    await context.close();
  }
  for(const mode of ['playing','pending-media','pending-catalog','pending-refresh','revocation-timeout','personal','personal-pending','success']) {
    const options={logoutStatus:mode==='success'?undefined:503,logoutDelay:mode==='revocation-timeout'?5500:150,...(mode==='pending-media'?{assetDelay:400}:{}),...(mode==='pending-catalog'?{catalogDelay:400}:{}),...(mode==='pending-refresh'?{expired:true,refreshDelay:400}:{}),...(mode==='personal-pending'?{personalDelay:400}:{})};
    const {context,page,calls}=await fixture(390,options);
    await page.goto(origin+(mode.startsWith('personal')?'/personal-learning.html':'/formacao.html'));
    if(mode==='playing'||mode==='pending-media') {
      await page.locator('#lesson-title').waitFor(); await page.getByRole('button',{name:'Reproduzir '+lessons[0].title,exact:true}).click();
      if(mode==='playing') await page.locator('video').waitFor(); else await page.locator('.player-loading').waitFor();
    } else if(mode==='personal') await page.locator('[data-course]').waitFor();
    else if(mode==='pending-catalog') await page.waitForFunction(()=>document.querySelector('[aria-busy]'));
    else if(mode==='pending-refresh') await page.waitForTimeout(80);
    else if(!mode.startsWith('personal')) await page.locator('#lesson-title').waitFor();
    assert.equal(calls.logout,0);
    await page.locator('[data-formation-logout]').click();
    if(mode==='success') await page.waitForURL('**/login.html?logout=1');
    else {
      await privateGone(page);
      if(mode==='playing') assert((await page.evaluate(()=>window.fixturePauses))>=1);
      await page.locator('[data-formation-session-status]').filter({hasText:'Não foi possível confirmar'}).waitFor();
      await page.waitForTimeout(450); await privateGone(page);
      assert.equal(await page.locator('dialog[open]').count(),0);
      assert(!(await page.locator('body').innerText()).includes(lessons[0].title));
    }
    assert.equal(calls.logout,1); if(mode==='pending-refresh') {assert.equal(calls.refresh,1);assert.equal(calls.catalog,0);}
    checks.push({logout:mode,privateContent:'removed immediately and no stale restoration',session:'current session only; unrelated keys retained',realServices:false});
    await context.close();
  }

  for(const path of ['/formacao.html','/personal-learning.html']) {
    const broken=await fixture(390,{catalogDelay:400,personalDelay:400,logoutStatus:503});
    await broken.page.goto(origin+path); await broken.page.waitForTimeout(50);
    await broken.page.evaluate(()=>{
      const remove=Storage.prototype.removeItem;
      Storage.prototype.removeItem=function(key){if(key==='raizes:supabase-auth-session')throw new DOMException('Fixture denied','SecurityError');return remove.call(this,key);};
    });
    await broken.page.locator('[data-formation-logout]').click();
    await broken.page.locator('[data-formation-session-status]').filter({hasText:'Não foi possível apagar'}).waitFor();
    await broken.page.evaluate(()=>window.dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'})));
    await broken.page.waitForTimeout(600);
    assert.equal(await broken.page.locator('main').innerText(),'');
    assert.equal(await broken.page.locator('video,audio,[data-course],[data-lesson],dialog[open]').count(),0);
    assert.equal(broken.calls.logout,1); assert.equal(path.includes('personal')?broken.calls.personal:broken.calls.catalog,1);
    assert(!await broken.page.locator('[data-formation-session-status]').innerText().then(t=>t.includes('Você saiu')));
    checks.push({logout:'storage SecurityError '+path,privateContent:'cleared; late response and storage events cannot restore it',claim:'no false successful local logout'});
    await broken.context.close();
  }
  const switched=await fixture(390,{logoutDelay:400}); await switched.page.goto(origin+'/formacao.html'); await switched.page.locator('#lesson-title').waitFor();
  await switched.page.locator('[data-formation-logout]').click();
  await switched.page.evaluate(()=>{
    localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:'fixture-other-account',expires_at:9999999999,platform_role:'professor'}));
    localStorage.setItem('raizes:supabase-access-token','fixture-other-account');
    window.dispatchEvent(new StorageEvent('storage',{key:'raizes:supabase-auth-session'}));
  });
  await switched.page.waitForTimeout(600); await switched.page.locator('#lesson-title').waitFor();
  assert(new URL(switched.page.url()).pathname.includes('formacao'));
  assert.equal(await switched.page.evaluate(()=>localStorage.getItem('raizes:supabase-access-token')),'fixture-other-account');
  assert(!(await switched.page.locator('[data-formation-session-status]').isVisible()));
  checks.push({logout:'account changed during revocation',result:'new account retained; no stale redirect or clearing'}); await switched.context.close();
  const historyCheck=await fixture(1440); await historyCheck.page.goto(origin+'/formacao.html'); await historyCheck.page.locator('#lesson-title').waitFor();
  const globalHistory=['biblioteca.html','professor.html','professor.html?view=FORMA%C3%87%C3%83O'];
  await historyCheck.page.evaluate(stack=>{sessionStorage.removeItem('raizes:formation-navigation-stack');sessionStorage.setItem('raizes:platform-navigation-stack',JSON.stringify(stack));},globalHistory);
  await historyCheck.page.goto(origin+'/formacao'); await historyCheck.page.locator('#lesson-title').waitFor();
  await historyCheck.page.goto(origin+'/formacao.html'); await historyCheck.page.locator('#lesson-title').waitFor();
  assert.deepEqual(await historyCheck.page.evaluate(()=>JSON.parse(sessionStorage.getItem('raizes:platform-navigation-stack'))),globalHistory);
  await historyCheck.page.locator('[data-formation-back]').click(); await historyCheck.page.waitForURL('**/universidade.html');
  checks.push({history:'accented/case legacy alias and clean/html duplicate',result:'canonical Universidade; unrelated global history preserved'}); await historyCheck.context.close();

  const guest=await fixture(320,{guest:true}); await guest.page.goto(origin+'/formacao.html');
  await guest.page.getByRole('heading',{name:'Vamos começar?'}).waitFor(); assert.equal(guest.calls.catalog,0); assert.equal(guest.calls.logout,0);
  assert(!(await guest.page.locator('[data-formation-logout]').isVisible())); assert(await guest.page.locator('[data-formation-login]').isVisible()); assert(await noOverflow(guest.page));
  await capture(guest.page,'guest-320'); await guest.context.close();
  const admin=await fixture(1440,{role:'admin'}); await admin.page.goto(origin+'/formacao.html'); await admin.page.locator('#lesson-title').waitFor();
  assert.equal(await admin.page.locator('#panel-link').getAttribute('href'),'admin.html'); await admin.context.close();
  assert.deepEqual(errors,[]);
  await writeFile(out+'/report.json',JSON.stringify({synthetic:true,realLogin:false,realPlayback:false,checks,errors},null,2));
  console.log('PASS sidebar: 1440/1280/1024/768/390/320, keyboard drawer, navigation, readable metadata, protected logout, concurrent refresh and failures.');
} finally { await browser.close(); await new Promise(r=>server.close(r)); }
