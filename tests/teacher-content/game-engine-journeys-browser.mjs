// Actual full page and interaction handlers; synthetic Auth/availability. Movie navigation is accelerated. Does not certify remote XP or real sessions.
import{createRequire}from'node:module';import{readFileSync,existsSync}from'node:fs';import{createServer}from'node:http';
const{chromium}=createRequire(import.meta.url)('playwright');const server=createServer((req,res)=>{const p=new URL(req.url,'http://local').pathname;if(p==='/supabase-config.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.RAIZES_SUPABASE={url:"https://synthetic.test",anonKey:"synthetic"}');}try{const path='.'+p;const ext=p.split('.').pop();res.setHeader('Content-Type',({js:'text/javascript',css:'text/css',html:'text/html',json:'application/json',png:'image/png',mp3:'audio/mpeg',mp4:'video/mp4'})[ext]||'application/octet-stream');res.end(readFileSync(path));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});

const results=[];
try {
for(const game of ['organizando-cesta','jardim-descobertas','atelie-bia']){
 const p=await browser.newPage({viewport:{width:1600,height:2200}});p.setDefaultTimeout(15000);const errors=[],missing=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)missing.push(new URL(r.url()).pathname)});
 await p.addInitScript(()=>{const token='x.'+btoa(JSON.stringify({sub:'synthetic-student',exp:9999999999,app_metadata:{platform_role:'aluno'}}))+'.x';localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:token,expires_at:9999999999}));localStorage.setItem('raizes:supabase-access-token',token);});
 await p.route('https://**/*',async r=>{if(!r.request().url().startsWith('https://synthetic.test'))return r.abort();let data=[];if(r.request().url().includes('current_institutional_school_ids')){await new Promise(r=>setTimeout(r,500));data=['synthetic-school'];}if(r.request().url().includes('school_content_availability'))data=['RS-EI-GAME-ORGANIZANDO-CESTA','RS-EI-GAME-JARDIM-DESCOBERTAS','RS-EI-GAME-ATELIE-BIA'].map(content_id=>({school_id:'synthetic-school',content_type:'game',content_id,status:'available'}));await r.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
 await p.goto('http://127.0.0.1:'+server.address().port+'/jogos.html?game='+game);
 await p.waitForFunction(()=>window.RSGameEngine?.engine?.root?.isConnected);
 const same=await p.evaluate(()=>{const old=RSGameEngine.engine;RSGameEngine.mountAll();RSGameEngine.mountAll();window.engine=old;return old===RSGameEngine.engine&&old.root.childElementCount===1;});if(!same)throw Error('Duplicate mount');
 if(game==='organizando-cesta'){
  await p.evaluate(()=>{engine.updateRoundContent();engine.go('choice');});
  const items=await p.evaluate(()=>engine.currentRound().items.map(x=>({id:x.id,target:x.targetId})));
  for(const item of items){await p.locator(`[data-drag-id="${item.id}"]`).click();await p.locator(`[data-drop-id="${item.target}"]`).click();}
  await p.waitForFunction(()=>engine.state.screen==='final');
 } else if(game==='jardim-descobertas'){
  const rounds=await p.evaluate(()=>RaizesJardimDescobertasConfig.rounds.map(r=>r.id));
  for(const id of rounds){await p.evaluate(id=>engine.startJardimDiscoveryRound(id),id);const b=p.locator(`[data-game-action="answer-jardim-discovery"][data-round-id="${id}"]`);await b.focus();await b.press('Enter');if(!await b.isDisabled())throw Error('Target not accepted');await p.waitForTimeout(1000);await p.evaluate(()=>document.querySelector('[data-jardim-home-video]').dispatchEvent(new Event('ended')));await p.waitForTimeout(1100);}
 await p.waitForFunction(()=>!document.querySelector('[data-game-action="jardim-final-hub"]').disabled);console.log('GARDEN final victory state',await p.locator('.jardim-cinematic-screen').getAttribute('data-jardim-cinematic-state'));
 }else{
  await p.evaluate(()=>{engine.prepareGuidedPaintingCharacter('ladybug');engine.go('choice');});await p.waitForFunction(()=>engine.guidedPaint?.maskReady);
  const steps=await p.evaluate(()=>engine.guidedPaintingConfig().steps.filter(s=>!s.locked).map(s=>s.id));
  for(const step of steps){await p.waitForFunction(step=>engine.guidedPaint?.maskReady&&engine.guidedPaint.region===step,step);const c=p.locator('[data-guided-artboard]');await c.scrollIntoViewIfNeeded();const b=await c.boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();for(let y=1;y<b.height;y+=Math.max(2,b.height*16/1254)){await p.mouse.move(b.x+1,b.y+y);await p.mouse.move(b.x+b.width-1,b.y+y);}await p.mouse.up();await p.locator('[data-game-action="guided-ready"]').click();console.log('PAINT',step);}
  await p.waitForFunction(()=>engine.state.screen==='final');
 }
 if(errors.length)throw Error(JSON.stringify(errors));results.push({game,idempotent:true,screen:await p.evaluate(()=>engine.state.screen),missing:[...new Set(missing)],errors});console.log(JSON.stringify(results.at(-1)));await p.close();
}
}finally{await browser.close();await new Promise(r=>server.close(r));}
