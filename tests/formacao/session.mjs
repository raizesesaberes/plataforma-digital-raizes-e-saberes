import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createTrainingClient} from '../../formacao-runtime/client.mjs';
import {createLearningClient} from '../../personal-learning-runtime/client.mjs';
import {SESSION_KEY, TOKEN_KEY, readSession, refreshSession} from '../../formacao-runtime/session.mjs';
const config = {url: 'https://fixture.supabase.co', anonKey: 'fixture-public'};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status});
const jwt = (sub, session_id, exp = 9999999999) => `fixture.${Buffer.from(JSON.stringify({sub, session_id, exp})).toString('base64url')}.fixture`;
const initial = () => ({access_token: jwt('teacher-a','session-a',1), refresh_token: 'fixture-refresh', expires_at: 1});
const renewed = () => ({access_token: jwt('teacher-a','session-a'), refresh_token: 'fixture-next', expires_at: 9999999999});
function storage(session = initial()) {
  const map = new Map([[SESSION_KEY,JSON.stringify(session)],[TOKEN_KEY,session.access_token]]);
  return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
}
const edge = url => json(url.includes('teacher-training-access') ? {ok:true,actor:'teacher',access:'available',lessons:[]} : {ok:true,courses:[],certificates:[]});
const deferred = () => {let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('valid platform session flows into both areas without refresh or second login',async()=>{
  const store=storage(renewed()),calls=[];
  const fetcher=async(url,options)=>{calls.push(url);assert.equal(options.headers.Authorization,`Bearer ${renewed().access_token}`);return edge(url);};
  await createTrainingClient({config,storage:store,fetcher}).catalog();
  await createLearningClient({config,storage:store,fetcher}).list();
  assert.equal(calls.length,2);assert(calls.every(url=>url.includes('/functions/')));
});
test('parallel instances of both clients share one refresh and persist both keys',async()=>{
  const store=storage(),gate=deferred();let refreshes=0;
  const fetcher=async url=>{if(url.includes('/auth/')){refreshes++;await gate.promise;return json(renewed());}return edge(url);};
  const calls=[createTrainingClient({config,storage:store,fetcher}).catalog(),createTrainingClient({config,storage:store,fetcher}).catalog(),createLearningClient({config,storage:store,fetcher}).list()];
  gate.resolve();await Promise.all(calls);assert.equal(refreshes,1);assert.equal(store.getItem(TOKEN_KEY),readSession(store).access_token);
});
test('late 401 from old access token reuses completed refresh instead of rotating again',async()=>{
  const store=storage({...initial(),expires_at:9999999999}),late=deferred();let refreshes=0,oldCalls=0;
  const fetcher=async(url,opts)=>{
    if(url.includes('/auth/')){refreshes++;late.resolve();return json(renewed());}
    if(opts.headers.Authorization===`Bearer ${initial().access_token}`){if(++oldCalls===2)await late.promise;return json({ok:false},401);}
    return edge(url);
  };
  await Promise.all([createTrainingClient({config,storage:store,fetcher}).catalog(),createLearningClient({config,storage:store,fetcher}).list()]);assert.equal(refreshes,1);
});
test('canceling one consumer does not cancel another area waiting for refresh',async()=>{
  const store=storage(),gate=deferred(),started=deferred(),controller=new AbortController();let refreshes=0;
  const fetcher=async url=>{if(url.includes('/auth/')){refreshes++;started.resolve();await gate.promise;return json(renewed());}return edge(url);};
  const abandoned=createTrainingClient({config,storage:store,fetcher}).catalog({signal:controller.signal});
  const remaining=createLearningClient({config,storage:store,fetcher}).list();
  await started.promise;controller.abort();await assert.rejects(abandoned,{name:'AbortError'});gate.resolve();await remaining;assert.equal(refreshes,1);
});
test('different tab/module instances serialize via Web Locks and reread rotated session',async()=>{
  const other=await import('../../formacao-runtime/session.mjs?independent-tab');
  let queue=Promise.resolve(),refreshes=0;
  const locks={request(name,run){assert.match(name,/raizes:session-refresh:/);const next=queue.then(run);queue=next.catch(()=>{});return next;}};
  const store=storage(),session=readSession(store),fetcher=async()=>{refreshes++;return json(renewed());};
  const [a,b]=await Promise.all([refreshSession({config,storage:store,session,fetcher,locks}),other.refreshSession({config,storage:store,session,fetcher,locks})]);
  assert.equal(refreshes,1);assert.equal(a.access_token,b.access_token);
});
test('logout or a different login session during refresh cannot resurrect or overwrite account',async()=>{
  for(const replacement of [null,{...renewed(),access_token:jwt('teacher-b','session-b')},{...renewed(),access_token:jwt('teacher-a','different-login')}]){
    const store=storage(),fetcher=async()=>{replacement?store.setItem(SESSION_KEY,JSON.stringify(replacement)):store.removeItem(SESSION_KEY);return json(renewed());};
    await assert.rejects(refreshSession({config,storage:store,fetcher}),/session_changed/);
    assert.equal(readSession(store)?.access_token,replacement?.access_token);
  }
});
test('outage and rate limiting preserve session, invalid refresh remains an authentication error',async()=>{
  for(const status of [400,401,429,503]){const store=storage(),before=store.getItem(SESSION_KEY);await assert.rejects(refreshSession({config,storage:store,fetcher:async()=>json({},status)}),e=>e.code===(status>=429?'service_unavailable':'session_required'));assert.equal(store.getItem(SESSION_KEY),before);}
});
test('demo flags and orphan access token never count as an authenticated platform session',async()=>{
  const store=storage();store.removeItem(SESSION_KEY);store.setItem('raizes:demo-authenticated','true');
  const client=createTrainingClient({config,storage:store,fetcher:async()=>{throw Error('must not fetch');}});
  assert.equal(client.hasSession(),false);await assert.rejects(client.catalog(),/session_required/);
});
test('platform central refresh delegates to the same coordinator and does not clear on errors',()=>{
  const source=readFileSync(new URL('../../app-pages.js',import.meta.url),'utf8');
  const refresh=source.slice(source.indexOf('const refreshStoredSupabaseSession ='),source.indexOf('const getSupabaseAccessToken ='));
  assert.match(refresh,/import\("\.\/formacao-runtime\/session\.mjs"\)/);assert(!refresh.includes('clearSupabaseSession()'));assert(!refresh.includes('/auth/v1/token'));
});
