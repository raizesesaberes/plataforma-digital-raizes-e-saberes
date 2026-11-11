import test from 'node:test';
import assert from 'node:assert/strict';
import {loadFormationWelcome, mountFormationWelcome, renderFormationProgress, NEUTRAL_GREETING} from '../../formacao-runtime/welcome.mjs';
import {SESSION_KEY} from '../../formacao-runtime/session.mjs';
const config = {url:'https://fixture.supabase.co',anonKey:'fixture-public'};
const id = '12345678-1234-4123-8123-123456789abc';
const session = {access_token:'fixture-a',expires_at:9999999999};
const response = (body,status=200) => new Response(JSON.stringify(body),{status});
const course = (title,status='in_progress') => ({id:title,title,provider:'Instituição',source_url:'https://example.com/course',status});
function storage(value=session) {let current=value;return {getItem:k=>k===SESSION_KEY&&current?JSON.stringify(current):null,set:value=>{current=value;}};}
function mock(courses=[],name='Ana <Teste>') {const calls=[];return {calls,fetcher:async(url,opts)=>{calls.push({url,opts});if(url.includes('/functions/'))return response({ok:true,courses,certificates:[]});if(url.endsWith('/auth/v1/user'))return response({id,user_metadata:{full_name:'Nome Auth'}});return response([{id,display_name:name}]);}};}
function fixture(store,fetcher) {
  const greeting={textContent:''},progress={innerHTML:''};
  const win=new EventTarget(),doc=new EventTarget();doc.hidden=false;
  let interval;win.setInterval=fn=>{interval=fn;return 1;};win.clearInterval=()=>{};
  const root={querySelector:selector=>selector.includes('greeting')?greeting:progress};
  const mounted=mountFormationWelcome({root,config,storage:store,fetcher,window:win,document:doc});
  return {greeting,progress,win,doc,mounted,tick:()=>interval()};
}
test('anonymous does not fetch or show cached identity',async()=>{
  const api=mock(),f=fixture(storage(null),api.fetcher);await f.mounted.ready;
  assert.equal(api.calls.length,0);assert.equal(f.greeting.textContent,NEUTRAL_GREETING);assert.match(f.progress.innerHTML,/Entre na sua conta/);f.mounted.destroy();
});
test('validates professional list before identity; shows only active self-reported courses',async()=>{
  const api=mock([course('<Curso>'),course('Concluído','completed'),{...course('Arquivado'),archived_at:'2026-01-01'}]);
  const summary=await loadFormationWelcome({config,storage:storage(),fetcher:api.fetcher});
  assert.equal(summary.name,'Ana <Teste>');assert.equal(summary.courses.length,1);
  assert.match(api.calls[0].url,/personal-learning$/);assert.equal(JSON.parse(api.calls[0].opts.body).action,'list');
  assert(api.calls.slice(1).every(c=>c.opts.method==='GET'&&c.opts.cache==='no-store'));
  const html=renderFormationProgress(summary);assert.match(html,/&lt;Curso&gt;/);assert.match(html,/informado por você/);assert.doesNotMatch(html,/Concluído|Arquivado|%/);
});
test('empty account gets honest empty state and server profile greeting',async()=>{
  const api=mock(),f=fixture(storage(),api.fetcher);await f.mounted.ready;
  assert.equal(f.greeting.textContent,'Olá, Ana <Teste>.');assert.match(f.progress.innerHTML,/ainda não marcou/);f.mounted.destroy();
});
test('denied professional and expired sessions never request identity',async()=>{
  for(const status of [401,403]) {let calls=0;const f=fixture(storage(),async()=>{calls++;return response({ok:false,code:'session_required'},status);});await f.mounted.ready;assert.equal(calls,1);assert.equal(f.greeting.textContent,NEUTRAL_GREETING);assert.match(f.progress.innerHTML,/Entre na sua conta/);f.mounted.destroy();}
  const api=mock(),f=fixture(storage({...session,expires_at:1}),api.fetcher);await f.mounted.ready;assert.equal(api.calls.length,0);assert.equal(f.greeting.textContent,NEUTRAL_GREETING);f.mounted.destroy();
});
test('network error never masquerades as empty account',async()=>{
  const f=fixture(storage(),async()=>{throw Error('fixture offline');});await f.mounted.ready;assert.match(f.progress.innerHTML,/Não foi possível/);assert.doesNotMatch(f.progress.innerHTML,/ainda não marcou/);f.mounted.destroy();
});
test('account switch during request prevents stale content even if transport ignores abort',async()=>{
  const store=storage();let release;const wait=new Promise(resolve=>release=resolve);const api=mock([course('Privado A')]);
  const f=fixture(store,async(...args)=>{await wait;return api.fetcher(...args);});
  store.set({access_token:'fixture-b',expires_at:9999999999});f.tick();release();await f.mounted.ready;
  assert.equal(f.greeting.textContent,NEUTRAL_GREETING);assert.doesNotMatch(f.progress.innerHTML,/Privado A/);f.mounted.destroy();
});
test('logout capture clears synchronously; bfcache requires fresh server data',async()=>{
  const store=storage(),api=mock([course('Privado A')]),f=fixture(store,api.fetcher);await f.mounted.ready;
  const click=new Event('click');Object.defineProperty(click,'target',{value:{closest:()=>true}});f.doc.dispatchEvent(click);
  assert.equal(f.greeting.textContent,NEUTRAL_GREETING);assert.doesNotMatch(f.progress.innerHTML,/Privado A/);
  await f.mounted.refresh();f.win.dispatchEvent(new Event('pagehide'));assert.doesNotMatch(f.progress.innerHTML,/Privado A/);
  store.set(null);const show=new Event('pageshow');show.persisted=true;f.win.dispatchEvent(show);
  assert.equal(f.greeting.textContent,NEUTRAL_GREETING);f.mounted.destroy();
});
test('storage account change clears existing private view before next response',async()=>{
  const store=storage(),api=mock([course('Privado A')]),f=fixture(store,api.fetcher);await f.mounted.ready;
  store.set(null);const event=new Event('storage');event.key=SESSION_KEY;f.win.dispatchEvent(event);
  assert.doesNotMatch(f.progress.innerHTML,/Privado A/);assert.equal(f.greeting.textContent,NEUTRAL_GREETING);f.mounted.destroy();
});
test('mismatching server profile is rejected without displaying its name',async()=>{
  const api=mock();const f=fixture(storage(),async(url,opts)=>url.includes('/rest/')?response([{id:'different',display_name:'Other person'}]):api.fetcher(url,opts));await f.mounted.ready;
  assert.equal(f.greeting.textContent,NEUTRAL_GREETING);assert.match(f.progress.innerHTML,/Não foi possível/);f.mounted.destroy();
});
