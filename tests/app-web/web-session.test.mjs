import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionGuard, parseSession, parsePublicConfig} from '../../mobile/src/services/webSessionCore.ts';
const jwt = (claims) => `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
const now = 1000000;
const raw = (id = 'a', extra = {}) => JSON.stringify({access_token: jwt({sub:id, exp:2000}), expires_at:2000, user:{id}, ...extra});
function setup() {
  let storage = raw(), time = now; const locks = [];
  const guard = createSessionGuard(() => storage, reason => locks.push(reason), () => time);
  return {guard, locks, write:v=>storage=v, tick:v=>time=v};
}
test('missing and malformed sessions are denied', () => { for (const x of [null, '{}','bad']) assert.throws(()=>parseSession(x, now)); });
test('stored identity cannot override JWT subject', () => assert.throws(()=>parseSession(raw('a',{user:{id:'b'}}),now)));
test('stored expiration cannot extend JWT', () => assert.throws(()=>parseSession(raw('a',{expires_at:99999}),1990000)));
test('missing expiration is denied', () => assert.throws(()=>parseSession(raw('a',{expires_at:undefined}),now)));
test('candidate ignores spoofed role and does not retain refresh token', () => {
  const s = parseSession(raw('a',{platform_role:'admin', refresh_token:'secret'}),now);
  assert.deepEqual(Object.keys(s.session).sort(), ['accessToken','userId']);
});
test('public config rejects secrets, URLs with credentials, query and insecure URLs', () => {
  for (const config of [{url:'http://example.com',anonKey:'sb_publishable_ok'}, {url:'https://user:pass@example.com',anonKey:'sb_publishable_ok'}, {url:'https://example.com?x=y',anonKey:'sb_publishable_ok'}, {url:'https://example.com',anonKey:jwt({role:'service_role'})}, {url:'https://example.com',anonKey:'sb_secret_fake'}]) assert.throws(()=>parsePublicConfig(config));
  assert.equal(parsePublicConfig({url:'https://example.com/',anonKey:jwt({role:'anon'})}).url,'https://example.com');
});
test('guard refuses unverified or fabricated session objects', () => {const {guard}=setup(); assert.throws(()=>guard.assert({userId:'a',accessToken:'fake'})); const {session}=guard.begin(); assert.throws(()=>guard.assert({...session}));});
test('logout permanently invalidates the previous session object', () => {const {guard}=setup(); const {session}=guard.begin(); guard.invalidate('signed_out'); assert.throws(()=>guard.assert(session));});
test('same-user token change invalidates old operations', () => {const s=setup();const {session}=s.guard.begin();s.write(raw('a',{access_token:jwt({sub:'a',exp:3000})})); assert.throws(()=>s.guard.assert(session));});
test('expiry invalidates active state', () => {const s=setup();const {session}=s.guard.begin();s.tick(1990000);assert.throws(()=>s.guard.assert(session));assert.equal(s.locks.at(-1),'session_expired');});
test('storage change prevents request dispatch', async () => {const s=setup();const {session}=s.guard.begin();s.write(raw('b'));await assert.rejects(s.guard.request(session,'https://never.invalid'));});
test('logout aborts pending fetch and denies late result even if transport ignores abort', async () => {
  const original=globalThis.fetch;let finish,signal;
  globalThis.fetch=async (_url,init)=>{signal=init.signal;return await new Promise(resolve=>finish=resolve);};
  try {const s=setup();const {session}=s.guard.begin();const request=s.guard.request(session,'https://fake.invalid');s.guard.invalidate('signed_out');assert.equal(signal.aborted,true);finish(new Response('{}'));await assert.rejects(request);} finally {globalThis.fetch=original;}
});
test('server denial locks state', async () => {const original=globalThis.fetch;globalThis.fetch=async()=>new Response('{}',{status:403});try {const s=setup();const {session}=s.guard.begin();await assert.rejects(s.guard.request(session,'https://fake.invalid'));assert.equal(s.locks.at(-1),'server_denied');}finally{globalThis.fetch=original;}});
test('body cannot be consumed after account changes', async () => {const original=globalThis.fetch;globalThis.fetch=async()=>new Response('{"private":true}');try{const s=setup();const {session}=s.guard.begin();const response=await s.guard.request(session,'https://fake.invalid');s.write(raw('b'));await assert.rejects(response.json());}finally{globalThis.fetch=original;}});
test('new generation supersedes validation', () => {const s=setup();const first=s.guard.begin();s.guard.begin();assert.throws(()=>s.guard.assert(first.session,first.epoch));});
test('revalidation preserves canonical object but blocks its requests until commit', async () => {
 const s=setup();const first=s.guard.begin();const canonical=s.guard.commit(first.session,first.epoch);
 const next=s.guard.begin();assert.throws(()=>s.guard.assert(canonical));
 assert.equal(s.guard.commit(next.session,next.epoch),canonical);s.guard.assert(canonical);
});
test('logout or expiry during revalidation prevents canonical session resurrection', () => {
 for (const expire of [false,true]) {const s=setup();const first=s.guard.begin();s.guard.commit(first.session,first.epoch);const next=s.guard.begin();if(expire)s.tick(1990000);else s.guard.invalidate('signed_out');assert.throws(()=>s.guard.commit(next.session,next.epoch));}
});
test('continuity identity survives only same-raw live revalidation, never grants request access', () => {
 const s=setup();const first=s.guard.begin();assert.equal(s.guard.validatedIdentity(),null);
 const canonical=s.guard.commit(first.session,first.epoch);s.guard.begin();
 assert.equal(s.guard.validatedIdentity(),'a');assert.throws(()=>s.guard.assert(canonical));
 s.write(raw('b'));assert.equal(s.guard.validatedIdentity(),null);
});
test('continuity identity is removed immediately on expiry or logout', () => {
 for(const expire of [true,false]){const s=setup();const first=s.guard.begin();s.guard.commit(first.session,first.epoch);s.guard.begin();if(expire)s.tick(1990000);else s.guard.invalidate('signed_out');assert.equal(s.guard.validatedIdentity(),null);}
});

test('first mutation during verification waits for commit; validation candidate never deadlocks', async () => {
 const original=globalThis.fetch;const calls=[];
 globalThis.fetch=async (url,init)=>{calls.push({url,method:init.method});return Response.json({ok:true});};
 try {
  const s=setup();const first=s.guard.begin();const canonical=s.guard.commit(first.session,first.epoch);
  const next=s.guard.begin();
  const mutation=s.guard.request(canonical,'https://fake.invalid/mutation',{method:'POST',body:'{}'});
  await Promise.resolve();assert.equal(calls.length,0);
  await s.guard.request(next.session,'https://fake.invalid/validate');assert.equal(calls.length,1);
  s.guard.commit(next.session,next.epoch);await mutation;
  assert.deepEqual(calls.map(x=>x.url),['https://fake.invalid/validate','https://fake.invalid/mutation']);
 } finally {globalThis.fetch=original;}
});
test('queued mutation never dispatches after logout, token change, expiration or server denial', async () => {
 const original=globalThis.fetch;let calls=0;globalThis.fetch=async()=>{calls++;return Response.json({});};
 try {
  for (const reason of ['logout','token','expired','server_denied']) {
   const s=setup();const first=s.guard.begin();const canonical=s.guard.commit(first.session,first.epoch);s.guard.begin();
   const pending=s.guard.request(canonical,'https://fake.invalid/mutation',{method:'POST'});
   const rejection=assert.rejects(pending);
   if(reason==='token'){s.write(raw('b'));assert.throws(()=>s.guard.check());}
   else if(reason==='expired'){s.tick(1990000);assert.throws(()=>s.guard.check());}
   else s.guard.invalidate(reason);
   await rejection;
  }
  assert.equal(calls,0);
 } finally {globalThis.fetch=original;}
});
