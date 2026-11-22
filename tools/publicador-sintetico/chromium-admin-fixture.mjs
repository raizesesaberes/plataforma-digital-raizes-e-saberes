// Tests a single exact synthetic TLS Admin fixture in a disposable Chromium profile.
// DevTools uses inherited pipes, not a listening debug port or an existing session.
import { createHash, X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

let child, profile, deadline;
function need(ok) { if (!ok) throw Error('invalid browser fixture request'); }
async function main() {
  const input = JSON.parse(readFileSync(0, 'utf8')); // URL never on argv
  // The Admin page belongs to a fresh private HTTPS loopback test listener.
  const url = new URL(input.url);
  const mode=input.mode;
  need(['same-session','before-restart','after-restart'].includes(mode));
  need(mode==='after-restart'?/^fixture-[a-f0-9]{12}$/.test(input.receipt):!Object.hasOwn(input,'receipt'));
  need(url.protocol === 'https:' && url.hostname === '127.0.0.1' &&
       /^[0-9]{4,5}$/.test(url.port) && !url.username && !url.password &&
       url.pathname === '/' && !url.search && !url.hash);
  const cer = new X509Certificate(readFileSync(process.argv[3]));
  need(cer.checkIP('127.0.0.1') === '127.0.0.1' && cer.verify(cer.publicKey));
  const pin = createHash('sha256').update(cer.publicKey.export({type:'spki',format:'der'})).digest('base64');
  profile = await mkdtemp(join(tmpdir(), 'rs-chromium-fixture-'));
  const args = ['--headless=new','--remote-debugging-pipe','--no-first-run','--no-default-browser-check',
    '--disable-background-networking','--disable-component-update','--disable-sync','--disable-extensions',
    '--disable-default-apps','--disable-crash-reporter','--no-proxy-server','--metrics-recording-only',
    '--autoplay-policy=no-user-gesture-required','--mute-audio',
    '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--ignore-certificate-errors-spki-list='+pin,'--user-data-dir='+profile,'about:blank'];
  child = spawn(process.argv[2], args, { stdio:['ignore','ignore','ignore','pipe','pipe'] });
  const done = once(child,'exit').catch(()=>{});
  const pending = new Map(), lifecycle = new Map(), loaded = new Set();
  let seq=0, remainder='';
  function rejectAll() { for(const q of [...pending.values(),...lifecycle.values()]) q.reject(Error('browser early exit')); }
  child.on('exit',rejectAll); child.on('error',rejectAll); child.stdio[3].on('error',rejectAll);
  child.stdio[4].setEncoding('utf8');
  child.stdio[4].on('data',chunk=>{
    remainder+=chunk;
    let cut;
    while((cut=remainder.indexOf('\0'))!==-1){
      const raw=remainder.slice(0,cut); remainder=remainder.slice(cut+1);
      let m; try {m=JSON.parse(raw);} catch {rejectAll();return;}
      if(m.method==='Page.lifecycleEvent'&&m.params?.name==='load'&&m.params.loaderId){
        const id=m.params.loaderId;loaded.add(id);lifecycle.get(id)?.resolve();lifecycle.delete(id);
      }
      if(!pending.has(m.id)) continue;
      const q=pending.get(m.id); pending.delete(m.id);
      m.error?q.reject(Error('browser protocol refused command')):q.resolve(m.result);
    }
  });
  const cmd=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    const id=++seq;
    pending.set(id,{resolve,reject});
    child.stdio[3].write(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})})+'\0');
  });
  deadline=setTimeout(()=>rejectAll(),32_000);
  try {
    const {targetId}=await cmd('Target.createTarget',{url:'about:blank'});
    const {sessionId}=await cmd('Target.attachToTarget',{targetId,flatten:true});
    await cmd('Page.enable',{},sessionId);
    await cmd('Page.setLifecycleEventsEnabled',{enabled:true},sessionId);
    const tryNav=await cmd('Page.navigate',{url:url.href},sessionId);
    need(tryNav.loaderId&&!tryNav.errorText);
    if(!loaded.has(tryNav.loaderId))await new Promise((resolve,reject)=>lifecycle.set(tryNav.loaderId,{resolve,reject}));
    const same=await cmd('Runtime.evaluate',{expression:"location.href === "+JSON.stringify(url.href)+
      " && document.readyState === 'complete' && !!document.getElementById('role')",returnByValue:true},sessionId);
    need(same.result?.value===true);
    const program=(async function adminUI(mode,expectedReceipt) {
      const need=(ok,phase)=>{if(!ok)throw Error(phase);};
      const e=id=>document.getElementById(id);
      const until=(f,phase,limit=7500)=>new Promise((resolve,reject)=>{
        const stop=(err)=>{
          observer.disconnect();clearTimeout(deadline);
          if(err)reject(Error(phase));else resolve();
        };
        const tick=()=>{
          if(f())stop(false);
          else if(e('feedback')?.textContent==='verification_failed')stop(true);
        };
        const observer=new MutationObserver(tick);
        observer.observe(document.documentElement,{subtree:true,attributes:true,characterData:true,childList:true});
        const deadline=setTimeout(()=>stop(true),limit);
        tick();
      });
      const pick=(name)=>{e('role').value=name;e('role').dispatchEvent(new Event('change'));};
      await until(()=>e('role')&&e('approve')&&e('publish'),'page');
      if(mode==='after-restart'){
        pick('publisher');
        await until(()=>e('stage').textContent==='published'&&!e('role').disabled,'restart');
        need(e('receipt').textContent===expectedReceipt&&e('publish').disabled&&e('confirm').disabled&&!e('recover').disabled,'restart');
        const guarded=await fetch('/publish',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirm:true})});
        need(guarded.status===409,'guard');
        e('recover').click();
        await until(()=>e('feedback').textContent==='prior_receipt_read_only','readback');
        need(e('receipt').textContent===expectedReceipt&&e('publish').disabled&&e('confirm').disabled,'readback');
        return {ok:true,readback:true,guard:true};
      }
      pick('other');
      await until(()=>e('stage').textContent==='review'&&!e('role').disabled,'unauthorized');
      need(e('approve').disabled&&e('publish').disabled,'unauthorized');
      pick('reviewer');
      await until(()=>!e('approve').disabled,'reviewer');
      need(e('manifest').textContent.includes('4 e 5')&&/^[a-f0-9]{64}$/.test(e('hash').textContent),'manifest');
      e('approve').click();
      await until(()=>e('feedback').textContent==='approval_verified','approve');
      need(!e('receipt').textContent&&e('publish').disabled,'approve');
      pick('publisher');
      await until(()=>!e('confirm').disabled,'publisher');
      need(e('publish').disabled,'confirmation');
      e('confirm').click();
      need(!e('publish').disabled,'confirmation');
      e('publish').click();
      await until(()=>e('feedback').textContent==='reconcile_required','lock');
      need(e('publish').disabled&&e('confirm').disabled&&!e('confirm').checked&&e('role').disabled&&!e('recover').disabled,'lock');
      e('publish').click(); // Disabled; first valid replay only after a read-only recovery.
      need(e('feedback').textContent==='reconcile_required','lock');
      if(mode==='before-restart')return {ok:true,ambiguous:true,firstReadbackFailed:true};
      e('recover').click();
      await until(()=>e('feedback').textContent==='receipt_recovered_without_retry','readback');
      const receipt=e('receipt').textContent;
      need(/^fixture-[a-f0-9]+$/.test(receipt),'readback');
      e('publish').click();
      await until(()=>e('feedback').textContent==='same_prior_receipt','replay');
      need(e('receipt').textContent===receipt,'replay');
      return {ok:true,readback:true,replay:true};
    }).toString();
    const r=await cmd('Runtime.evaluate',{expression:'('+program+')('+JSON.stringify(mode)+','+JSON.stringify(input.receipt??null)+')',
       awaitPromise:true,returnByValue:true,userGesture:true},sessionId);
    if(r.exceptionDetails){
      const phase=(r.exceptionDetails.exception?.description||'').match(/^Error: (page|unauthorized|reviewer|manifest|approve|publisher|confirmation|lock|readback|replay|restart|guard)\b/)?.[1];
      process.stderr.write('Admin fixture failed phase='+(phase||'unclassified')+'\n');
      process.exitCode=1;return;
    }
    need(r.result?.value?.ok);
    process.stdout.write(JSON.stringify(r.result.value));
  } finally {
    clearTimeout(deadline);
    child.kill();
    await Promise.race([done,new Promise(resolve=>setTimeout(resolve,1200))]);
  }
}
try {await main();} catch {
  process.stderr.write('Chromium Admin fixture unavailable or invalid\n'); process.exitCode=1;
} finally {
  if(profile) await rm(profile,{recursive:true,force:true,maxRetries:4}).catch(()=>{});
}
