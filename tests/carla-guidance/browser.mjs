import {readFile,mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
import {launchHarness,root} from './harness.mjs';import {approvedCopy} from '../../mission-runtime/narration/approved-copy.mjs';
const catalog=JSON.parse(await readFile(root+'/mission-runtime/catalog.json')),colors=JSON.parse(await readFile(root+'/mission-runtime/coloring/catalog.json'));
const out=root+'/qa/carla-guidance/evidence';await mkdir(out,{recursive:true});
const h=await launchHarness(),results=[],errors=[],external=[],audio=[];
try{
 const p=await h.page();let editedGame;p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(!r.url().startsWith(h.origin+'/')&&!/^(blob:|data:)/.test(r.url()))external.push(r.url());if(/\.(mp3|wav|ogg)(\?|$)/.test(r.url()))audio.push(r.url());});
 for(const [id,e] of Object.entries(approvedCopy.examples)){
  const ref=catalog.find(x=>x.id===id);
  await h.install(p,'/mission-runtime/studio/?snapshot=1&institutional=1');await h.wait(p,'rs-teacher-ready');await h.send(p,{type:'rs-teacher-preview',content:ref});
  const f=p.frames()[1],ui=p.frameLocator('iframe');
  await ui.locator('[data-carla-guidance][data-copy-bound="true"]').waitFor();
  assert.equal(await ui.locator('[data-copy-kind="after"]').count(),0,id+' early answer');
  await ui.locator('[data-carla-guidance] summary').click();
  await ui.locator('[data-copy-kind="before"]').waitFor();assert.equal(await ui.locator('[data-copy-kind="before"]').innerText(),e.before.text);
  assert.equal(await ui.locator('[data-carla-guidance]').locator('button,audio').count(),0);
  const checks=await f.evaluate(async id=>{
   const c=await import('/mission-runtime/narration/resolve.mjs'),m=await import('/mission-runtime/studio/assets/index-Di3aszpa.js');
   const ref=(await(await fetch('/mission-runtime/catalog.json')).json()).find(x=>x.id===id);const actual=await m.a(ref);
   const verified=await c.verifyGameContent(actual),edited=structuredClone(actual);edited.title+=' editada';
   return {bound:!!verified,editedBound:!!(await c.verifyGameContent(edited))};
  },id);assert.deepEqual(checks,{bound:true,editedBound:false});
  if(e.template==='quiz'){
   editedGame=await f.evaluate(async id=>{const m=await import('/mission-runtime/studio/assets/index-Di3aszpa.js');const refs=await(await fetch('/mission-runtime/catalog.json')).json();const value=await m.a(refs.find(x=>x.id===id));value.title+=' • revisão docente';return value;},id);
   await ui.locator('.quiz-options button').filter({hasText:'Madeira'}).first().click();
   await ui.locator('[data-copy-kind="after"]').waitFor();assert.equal(await ui.locator('[data-copy-kind="after"]').innerText(),e.after.text);
   await p.waitForTimeout(1400);assert.equal(await ui.locator('[data-copy-kind="before"]').count(),0);assert.equal(await ui.locator('[data-copy-kind="after"]').count(),1,'past explanation stays available');
  }
  if(['quiz','puzzle','memory'].includes(e.template))await p.screenshot({path:out+'/'+e.template+'-1280.png',fullPage:true});
  assert(await f.evaluate(()=>[...document.querySelectorAll('audio')].every(a=>a.paused)),'no automatic playback');
  assert.deepEqual(await p.evaluate(()=>({...localStorage})),{'carla-test-sentinel':'untouched'});
  results.push({motor:e.template,initialBinding:true,preAnswerHidden:true,editedSnapshotRejected:true});
 }
 for(const a of colors)for(const age of ['2-3','4-5']){
  await h.install(p,'/mission-runtime/coloring/?embedded=1');await h.wait(p,'rs-coloring-ready');await h.send(p,{type:'rs-coloring-open',content:a,scope:'carla-'+a.id+'-'+age,ageRange:age});await h.wait(p,'rs-coloring-opened');
  const f=p.frames()[1],ui=p.frameLocator('iframe'),copy=approvedCopy.coloring[a.id].stages;
  await ui.getByText(copy.welcome.text,{exact:true}).waitFor();assert(await ui.locator('#hear-guide').isDisabled());
  assert.equal(await ui.getByText('Alicia',{exact:false}).count(),0);await ui.locator('[data-tab="discovery"]').click();await ui.getByText(copy[age==='2-3'?'discovery_2_3':'discovery_4_5'].text,{exact:true}).waitFor();
  if(age==='4-5'&&!a.counting){await ui.locator('[data-tab="sound"]').click();await ui.getByText(copy.sound_4_5.text,{exact:true}).waitFor();await ui.getByText(copy.letter_4_5.text,{exact:true}).waitFor();await ui.locator('#skip-sound').click();}
  else assert.equal(await ui.locator('[data-tab="sound"]').count(),0);
  await ui.locator('#give-life').click();await ui.getByText(approvedCopy.common.life_no_paint.text,{exact:true}).waitFor();await ui.getByRole('button',{name:'Voltar a pintar',exact:true}).click();
  await f.evaluate(()=>window.rsPreview.getEngine().fillRegion(1));await ui.locator('#give-life').click();await ui.getByText(approvedCopy.common.life_show.text,{exact:true}).waitFor();await ui.locator('#finish').click();
  if(a.id==='cachorro'&&age==='4-5'){await ui.locator('[data-tool="erase"]').click();await f.evaluate(()=>window.rsPreview.getEngine().fillRegion(1));await ui.locator('#give-life').click();await ui.getByText(approvedCopy.common.life_no_paint.text,{exact:true}).waitFor();await ui.getByRole('button',{name:'Voltar a pintar',exact:true}).click();await ui.locator('#undo').click();assert.equal(await f.evaluate(()=>window.rsPreview.getEngine().cursor),1);}
  if(a.counting){await ui.locator('#count-open').click();for(const i of [2,0,1])await ui.locator('[data-count-item="'+i+'"]').click();assert.equal(await ui.locator('#count-status').innerText(),copy.count_three.text);assert.equal(await ui.locator('[data-count-item]:disabled').count(),3);await ui.locator('#count-reset').click();assert.equal(await ui.locator('#count-status').innerText(),copy.count_reset.text);assert.equal(await f.evaluate(()=>window.rsPreview.getEngine().cursor),1);await ui.getByRole('button',{name:'Voltar a pintar',exact:true}).click();}
  results.push({colorir:a.id,age,copy:true,soundStillDisabled:true,paintingAndLife:true});
 }
 await h.install(p,'/mission-runtime/studio/?snapshot=1&institutional=1');await h.wait(p,'rs-teacher-ready');await h.send(p,{type:'rs-teacher-preview',content:editedGame});await p.frameLocator('iframe').locator('.player').waitFor();await p.waitForTimeout(150);assert.equal(await p.frameLocator('iframe').locator('[data-carla-guidance]').count(),0);
 // Other activities must not inherit example-specific instructions.
 const unrelated=catalog.find(x=>x.template==='memory'&&!approvedCopy.examples[x.id]);
 await h.install(p,'/mission-runtime/studio/?snapshot=1&institutional=1');await h.wait(p,'rs-teacher-ready');await h.send(p,{type:'rs-teacher-preview',content:unrelated});await p.frameLocator('iframe').locator('.player').waitFor();assert.equal(await p.frameLocator('iframe').locator('[data-carla-guidance]').count(),0);
 // Edited and newly authored snapshots retain their own script, not another activity's approved copy.
 const altered=structuredClone(colors[0]);altered.script.welcome='Texto da revisão própria preservado.';delete altered.contentHash;
 altered.contentHash=await p.evaluate(async x=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(x))))].map(v=>v.toString(16).padStart(2,'0')).join(''),altered);
 await h.install(p,'/mission-runtime/coloring/?embedded=1');await h.wait(p,'rs-coloring-ready');await h.send(p,{type:'rs-coloring-open',content:altered,scope:'edited',ageRange:'2-3'});await h.wait(p,'rs-coloring-opened');await p.frameLocator('iframe').getByText(altered.script.welcome,{exact:true}).waitFor();
 // Phone viewport and reduced motion, no forced playback or horizontal overflow.
 await p.setViewportSize({width:390,height:900});await p.emulateMedia({reducedMotion:'reduce'});
 await h.install(p,'/mission-runtime/coloring/?embedded=1');await h.wait(p,'rs-coloring-ready');await h.send(p,{type:'rs-coloring-open',content:colors[0],scope:'mobile',ageRange:'4-5'});await h.wait(p,'rs-coloring-opened');await p.screenshot({path:out+'/colorir-390.png',fullPage:true});
 await p.frameLocator('iframe').locator('#give-life').click();assert(await p.frameLocator('iframe').locator('.life-scene').evaluate(e=>e.classList.contains('still')));await p.screenshot({path:out+'/colorir-life-390.png',fullPage:true});
 for(const template of ['quiz','puzzle']){const ref=catalog.find(x=>x.id===Object.keys(approvedCopy.examples).find(id=>approvedCopy.examples[id].template===template));await h.install(p,'/mission-runtime/studio/?snapshot=1&institutional=1');await h.wait(p,'rs-teacher-ready');await h.send(p,{type:'rs-teacher-preview',content:ref});await p.frameLocator('iframe').locator('[data-copy-bound="true"]').waitFor();await p.frameLocator('iframe').locator('[data-carla-guidance] summary').focus();await p.keyboard.press('Enter');await p.frameLocator('iframe').locator('[data-copy-kind="before"]').scrollIntoViewIfNeeded();assert(await p.frameLocator('iframe').locator('[data-carla-guidance] details').evaluate(e=>e.open),'keyboard can open help');assert(await p.frames()[1].evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.screenshot({path:out+'/'+template+'-390.png',fullPage:true});}
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);const musicRequests=audio.filter(url=>/\/mission-runtime\/studio\/music\/(adventure|carefree)\.mp3$/.test(url)),narrationRequests=audio.filter(url=>!musicRequests.includes(url));assert.deepEqual(narrationRequests,[]);
 await writeFile(out+'/report.json',JSON.stringify({localSynthetic:true,productionAuthenticated:false,results,errors,externalRequests:external,narrationRequests,existingMusicPreloads:musicRequests.map(url=>new URL(url).pathname)},null,2));console.log('PASS Carla: 10 real motors, 16 Coloring age paths, edited-copy fallback, reduced motion, no narration or external calls; existing music stays paused.');
}finally{await h.close();}
