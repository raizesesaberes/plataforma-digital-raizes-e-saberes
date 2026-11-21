// Tests a single exact synthetic TLS media URL in a disposable Chromium profile.
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
  const url = new URL(input.url);
  need(url.protocol === 'https:' && url.hostname === '127.0.0.1' &&
       (url.port === '54321' || (input.offline === true && url.port === '54443')) &&
       !url.username && !url.password && !url.hash &&
       /^\/storage\/v1\/object\/sign\/videos\/formacao\/fixture\/fixture\/fixture\/volume-1\/unidade-1\/aula-4\/[0-9a-f]{64}\.mp4$/.test(url.pathname) &&
       /^\?token=[A-Za-z0-9._~%-]+$/.test(url.search));
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
  const pending = new Map();
  let seq=0, remainder='';
  function rejectAll() { for(const q of pending.values()) q.reject(Error('browser early exit')); }
  child.on('exit',rejectAll); child.on('error',rejectAll); child.stdio[3].on('error',rejectAll);
  child.stdio[4].setEncoding('utf8');
  child.stdio[4].on('data',chunk=>{
    remainder+=chunk;
    let cut;
    while((cut=remainder.indexOf('\0'))!==-1){
      const raw=remainder.slice(0,cut); remainder=remainder.slice(cut+1);
      let m; try {m=JSON.parse(raw);} catch {rejectAll();return;}
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
    const program=(async function player(source) {
      const v=document.createElement('video');
      v.playsInline=true; v.preload='auto'; v.width=160; v.height=96;
      document.body.append(v);
      const require=(ok,phase)=>{if(!ok)throw Error(phase);};
      const until=(f,phase,limit=7500)=>new Promise((resolve,reject)=>{
        const start=performance.now();
        function tick(){
          if(v.error)return reject(Error(phase));
          if(f())return resolve();
          if(performance.now()-start>limit)return reject(Error(phase));
          setTimeout(tick,40);
        }
        tick();
      });
      const codec=v.canPlayType('video/mp4; codecs="avc1.42c01e, mp4a.40.2"');
      require(codec==='maybe'||codec==='probably','codec');
      v.src=source;
      await until(()=>v.readyState>=2,'metadata');
      require(v.duration>=5.9&&v.duration<=6.1&&v.videoWidth===160&&v.videoHeight===96,'dimensions');
      let presents=0;
      const frame=()=>{presents++;v.requestVideoFrameCallback(frame);};
      v.requestVideoFrameCallback(frame);
      await Promise.race([v.play(),new Promise((_,reject)=>setTimeout(()=>reject(Error('autoplay')),4500))]);
      await until(()=>v.currentTime>=1.1&&presents>=3&&v.webkitAudioDecodedByteCount>0,'playback');
      v.pause();
      const initial={time:v.currentTime,frames:presents,audioBytes:v.webkitAudioDecodedByteCount};
      v.currentTime=4.2;
      await until(()=>!v.seeking&&v.readyState>=2&&v.currentTime>=4.1&&v.currentTime<=4.4,'seek');
      await v.play();
      await until(()=>v.currentTime>=4.85&&presents>initial.frames,'after-seek');
      v.pause();
      return {codec,duration:v.duration,width:v.videoWidth,height:v.videoHeight,initial,
              after:{time:v.currentTime,frames:presents},browser:navigator.userAgent.match(/(?:Chrome|Chromium)\/[0-9.]+/)?.[0]};
    }).toString();
    const r=await cmd('Runtime.evaluate',{expression:'('+program+')('+JSON.stringify(url.href)+')',
       awaitPromise:true,returnByValue:true,userGesture:true},sessionId);
    if(r.exceptionDetails){
      // Only known phase tokens, never exception value, URL, token or stack.
      const phase=(r.exceptionDetails.exception?.description||'').match(/^Error: (codec|metadata|dimensions|autoplay|playback|seek|after-seek)\b/)?.[1];
      process.stderr.write('Browser playback failed: '+(phase||'unclassified')+'\n');
      process.exitCode=1;
      return;
    }
    need(r.result?.value?.initial?.time>=1.1 && r.result.value?.after?.time>=4.85);
    process.stdout.write(JSON.stringify(r.result.value));
  } finally {
    clearTimeout(deadline);
    child.kill();
    await Promise.race([done,new Promise(resolve=>setTimeout(resolve,1200))]);
  }
}
try {await main();} catch {
  process.stderr.write('Chromium fixture unavailable or invalid\n'); process.exitCode=1;
} finally {
  if(profile) await rm(profile,{recursive:true,force:true,maxRetries:4}).catch(()=>{});
}
