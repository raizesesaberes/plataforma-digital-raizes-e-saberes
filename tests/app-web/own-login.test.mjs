import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import ts from '../../mobile/node_modules/typescript/lib/typescript.js';
const key='raizes:supabase-auth-session',tokenKey='raizes:supabase-access-token';
let seed=0;
async function harness(options={}){
 const urls={};
 for(const name of ['readBetaPolicy','webSessionCore','webSession']){
  let source=await readFile(new URL(`../../mobile/src/services/${name}.ts`,import.meta.url),'utf8');
  source=source.replace("process.env.EXPO_PUBLIC_REAL_READ_BETA === 'true'",'true');
  let js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022})+`\n// test ${++seed}`;
  for(const [name,url]of Object.entries(urls))for(const ext of ['', '.ts'])js=js.replaceAll(`'./${name}${ext}'`,JSON.stringify(url)).replaceAll(`"./${name}${ext}"`,JSON.stringify(url));
  urls[name]=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
 }
 const web=await import(urls.webSession),storage=new Map(options.initial||[]),handlers={},states=[],calls=[],timers=new Map();let timerId=0;
 const exp=Math.floor(Date.now()/1000)+3600,claims={sub:'synthetic-user',exp};
 const token=`x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
 const auth={access_token:token,refresh_token:'synthetic-refresh',user:{id:claims.sub},expires_in:3600};
 const role=options.role||'professor';
 const context=role==='professor'?{profile_id:claims.sub,teacher_id:'synthetic-teacher',school_id:'synthetic-school',active_class_links:1}:{student_id:'synthetic-student',school_id:'synthetic-school',class_id:'synthetic-class',segment:role==='crescer'?'EDUCACAO_INFANTIL':options.segment||'ENSINO_FUNDAMENTAL'};
 const profile={profile_id:claims.sub,platform_role:role==='professor'?'professor':role==='crescer'?'educacao_infantil':'aluno',status:'active',student_ids:['synthetic-student']};
 const originalFetch=globalThis.fetch;
 globalThis.window={location:{protocol:'http:',hostname:'127.0.0.1',pathname:'/app/'},RAIZES_SUPABASE:{url:'https://backend.invalid',anonKey:'sb_publishable_synthetic'},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{if(options.storageFail===k)throw Error('storage blocked');storage.set(k,v);},removeItem:k=>{if(options.removeFailure===k)throw Error('storage blocked');storage.delete(k);}},addEventListener:(name,fn)=>handlers[name]=fn,setInterval(){},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id)};
 globalThis.document={visibilityState:'visible',addEventListener:(name,fn)=>handlers[name]=fn};
 globalThis.fetch=async(url,init={})=>{
  calls.push({url,init});
  if(options.fetch){const response=await options.fetch(url,init,{auth,context,profile,storage});if(response!==undefined)return response;}
  if(url.includes('/auth/v1/token'))return Response.json(auth);
  if(url.includes('/functions/v1/student-institutional-login'))return Response.json({ok:true,session:auth});
  if(url.endsWith('/auth/v1/user'))return Response.json({id:claims.sub});
  if(url.endsWith('/rpc/app_get_self_profile'))return Response.json([profile]);
  if(url.endsWith('_get_context'))return Response.json([context]);
  if(url.includes('/auth/v1/logout'))return new Response(null,{status:204});
  throw Error('Unexpected synthetic route');
 };
 web.enablePlatformSession();const unsubscribe=web.subscribePlatformSession(state=>states.push(state));
 return {web,storage,handlers,states,calls,timers,auth,profile,context,cleanup(){unsubscribe();globalThis.fetch=originalFetch;delete globalThis.window;delete globalThis.document;}};
}
for(const role of ['professor','crescer','fundamental','medio'])test(`inline ${role} uses existing auth contract and server role, persists compatible session only after context`,async()=>{
 const student=role!=='professor';const h=await harness({role:role==='medio'?'fundamental':role,segment:role==='medio'?'ENSINO_MEDIO':undefined,fetch:async(url,init,{storage})=>{assert.equal(storage.has(key),false,'No session persists before all authorization checks');}});
 try{
  const result=await h.web.signInPlatformSession(student?' ab-1234 ':' Teacher@EXAMPLE.invalid ','synthetic-password');
  assert.equal(result.role,role==='medio'?'fundamental':role);assert.equal(h.calls.length,4);
  assert.deepEqual(JSON.parse(h.calls[0].init.body),student?{login:'AB-1234',password:'synthetic-password'}:{email:'teacher@example.invalid',password:'synthetic-password'});
  assert.ok(h.calls[0].url.endsWith(student?'/functions/v1/student-institutional-login':'/auth/v1/token?grant_type=password'));
  assert.ok(h.calls.every(({init})=>init.cache==='no-store'&&init.redirect==='error'));
  const saved=JSON.parse(h.storage.get(key));assert.equal(saved.platform_role,h.profile.platform_role);assert.equal(saved.question_bank_role,null);assert.equal(saved.refresh_token,'synthetic-refresh');assert.equal(saved.access_token,h.storage.get(tokenKey));assert.equal(h.storage.size,2);assert.equal(h.web.currentPlatformSessionIdentity(),'synthetic-user');assert.doesNotMatch(h.storage.get(key),/synthetic-password/);
  // Existing platform reader consumes the same schema, without a second login.
  const source=await readFile(new URL('../../login.js',import.meta.url),'utf8');
  const context=vm.createContext({URL,URLSearchParams,Date,JSON,Set,FormData,atob,document:{querySelector:()=>null},localStorage:{getItem:k=>h.storage.get(k)},window:{location:new URL('https://platform.invalid/login.html?auth=supabase&next=/app/')}});
  vm.runInContext(source+'\nglobalThis.savedContext=getStoredSupabaseContext();',context);
  assert.equal(context.savedContext.userId,'synthetic-user');assert.equal(context.savedContext.role,h.profile.platform_role);
 }finally{h.cleanup();}
});
test('invalid input does not dispatch; duplicate pending submit dispatches once; cancellation ignores late success and allows retry',async()=>{
 let release;const h=await harness({fetch:async url=>url.includes('/auth/v1/token')?await new Promise(resolve=>release=resolve):undefined});
 try{
  await assert.rejects(h.web.signInPlatformSession('bad','test'),/invalid_login_input/);assert.equal(h.calls.length,0);
  const controller=new AbortController(),attempt=h.web.signInPlatformSession('a@example.invalid','synthetic',controller.signal);
  await assert.rejects(h.web.signInPlatformSession('a@example.invalid','synthetic'),/login_in_progress/);assert.equal(h.calls.length,1);
  controller.abort();await assert.rejects(attempt,/login_cancelled/);assert.equal(h.storage.size,0);
  release(Response.json(h.auth));await Promise.resolve();assert.equal(h.states.some(x=>x.status==='ready'),false);
  const retry=h.web.signInPlatformSession('a@example.invalid','synthetic');await Promise.resolve();release(Response.json(h.auth));await retry;assert.equal(h.web.currentPlatformSessionIdentity(),'synthetic-user');
 }finally{h.cleanup();}
});
for(const scenario of ['auth-denied','wrong-auth-identity','wrong-profile','inactive-profile','missing-school','wrong-student','teacher-code','expired-token','mandatory-password','edge-denied'])test(`${scenario} rejects before session persistence`,async()=>{
 const h=await harness({role:scenario==='wrong-student'?'fundamental':'professor',fetch:async(url,init,{auth,profile,context})=>{
  if(scenario==='auth-denied'&&url.includes('/auth/v1/token'))return new Response('{}',{status:400});
  if(scenario==='mandatory-password'&&url.includes('/auth/v1/token'))return Response.json({...auth,user:{...auth.user,user_metadata:{password_change_required:true}}});
  if(scenario==='expired-token'&&url.includes('/auth/v1/token'))return Response.json({...auth,expires_at:1});
  if(scenario==='edge-denied'&&url.includes('student-institutional-login'))return new Response('{}',{status:403});
  if(scenario==='wrong-auth-identity'&&url.endsWith('/auth/v1/user'))return Response.json({id:'other-user'});
  if(scenario==='wrong-profile'&&url.endsWith('app_get_self_profile'))return Response.json([{...profile,profile_id:'other-user'}]);
  if(scenario==='inactive-profile'&&url.endsWith('app_get_self_profile'))return Response.json([{...profile,status:'inactive'}]);
  if(scenario==='missing-school'&&url.endsWith('_get_context'))return Response.json([{...context,school_id:null}]);
  if(scenario==='wrong-student'&&url.endsWith('_get_context'))return Response.json([{...context,student_id:'other-student'}]);
 }});
 try{await assert.rejects(h.web.signInPlatformSession(['teacher-code','edge-denied'].includes(scenario)?'AB-1234':'a@example.invalid','synthetic'));assert.equal(h.storage.size,0);assert.equal(h.states.some(x=>x.status==='ready'),false);}
 finally{h.cleanup();}
});
test('credential error preserves existing platform session without displaying old account',async()=>{
 const h=await harness({initial:[[key,'old-session'],[tokenKey,'old-token'],['unrelated','keep']],fetch:async url=>url.includes('/auth/v1/token')?new Response('{}',{status:400}):undefined});
 try{await assert.rejects(h.web.signInPlatformSession('a@example.invalid','synthetic'),/invalid_credentials/);assert.equal(h.storage.get(key),'old-session');assert.equal(h.storage.get(tokenKey),'old-token');assert.equal(h.storage.get('unrelated'),'keep');assert.equal(h.web.currentPlatformSessionIdentity(),null);}
 finally{h.cleanup();}
});
for(const stage of ['token','context'])test(`account change during ${stage} cannot replace new session`,async()=>{
 let release;const h=await harness({fetch:async url=>(stage==='token'?url.includes('/auth/v1/token'):url.endsWith('teacher_get_context'))?await new Promise(resolve=>release=resolve):undefined});
 try{
  const attempt=h.web.signInPlatformSession('a@example.invalid','synthetic');
  while(!release)await new Promise(resolve=>setImmediate(resolve));
  h.storage.set(key,'new-session');h.storage.set(tokenKey,'new-token');h.handlers.storage({key});
  await assert.rejects(attempt,/login_cancelled|session_changed/);release(Response.json(stage==='token'?h.auth:[h.context]));await new Promise(resolve=>setImmediate(resolve));
  assert.equal(h.storage.get(key),'new-session');assert.equal(h.storage.get(tokenKey),'new-token');assert.equal(h.states.some(x=>x.status==='ready'),false);
 }finally{h.cleanup();}
});
test('timeout settles even with a transport ignoring AbortSignal; old delayed response never authenticates',async()=>{
 let release;const h=await harness({fetch:async url=>url.includes('/auth/v1/token')?await new Promise(resolve=>release=resolve):undefined});
 try{const attempt=h.web.signInPlatformSession('a@example.invalid','synthetic');[...h.timers.values()].find(x=>x.ms===15000).fn();await assert.rejects(attempt,/login_timeout/);release(Response.json(h.auth));await Promise.resolve();assert.equal(h.storage.size,0);assert.equal(h.states.some(x=>x.status==='ready'),false);}
 finally{h.cleanup();}
});
test('failed canonical storage write restores companion token and never grants readiness',async()=>{
 const h=await harness({storageFail:key,initial:[[key,'old-session'],[tokenKey,'old-token']]});
 try{await assert.rejects(h.web.signInPlatformSession('a@example.invalid','synthetic'),/storage_unavailable/);assert.equal(h.storage.get(key),'old-session');assert.equal(h.storage.get(tokenKey),'old-token');assert.equal(h.states.some(x=>x.status==='ready'),false);}
 finally{h.cleanup();}
});
test('existing session verification can be cancelled, bounds stalled work and never restores a late identity',async()=>{
 let release;const h=await harness({fetch:async url=>url.endsWith('/auth/v1/user')?await new Promise(resolve=>release=resolve):undefined});
 h.storage.set(key,JSON.stringify({...h.auth,expires_at:Math.floor(Date.now()/1000)+3600}));
 try{const attempt=h.web.loadPlatformSession();await Promise.resolve();h.web.cancelPlatformVerification();await assert.rejects(attempt);release(Response.json({id:h.auth.user.id}));assert.equal(h.states.at(-1).reason,'verification_cancelled');assert.equal(h.web.currentPlatformSessionIdentity(),null);}
 finally{h.cleanup();}
});
test('hosted opening uses own branded screens, exposes no profile picker, clears password, and respects reduced motion',async()=>{
 const source=await readFile(new URL('../../mobile/src/HostedApplication.tsx',import.meta.url),'utf8');assert.match(source,/<HostedSplash/);assert.match(source,/<HostedLoginScreen/);assert.doesNotMatch(source,/Entrar na plataforma|<LoginScreen/);
 const login=await readFile(new URL('../../mobile/src/screens/HostedLoginScreen.tsx',import.meta.url),'utf8');assert.match(login,/autoComplete="username"/);assert.match(login,/autoComplete="current-password"/);assert.match(login,/setPassword\(''\)/);assert.match(login,/Cancelar entrada/);assert.doesNotMatch(login,/onSelectRole|signInWithPassword|console\./);
 const splash=await readFile(new URL('../../mobile/src/components/HostedSplash.tsx',import.meta.url),'utf8');assert.match(splash,/isReduceMotionEnabled/);assert.match(splash,/setTimeout\(onComplete,1400\)/);
});

test('App uses server canonical role even if login metadata suggests elevated role',async()=>{
 const h=await harness({role:'fundamental',fetch:async(url,init,{auth})=>url.includes('/auth/v1/token')?Response.json({...auth,user:{...auth.user,app_metadata:{platform_role:'admin'},user_metadata:{role:'admin'}}}):undefined});
 try{const result=await h.web.signInPlatformSession('a@example.invalid','synthetic');assert.equal(result.role,'fundamental');assert.equal(JSON.parse(h.storage.get(key)).platform_role,'aluno');assert.equal(JSON.parse(h.storage.get(key)).question_bank_role,null);}
 finally{h.cleanup();}
});

test('session verification timeout settles and permits another attempt without stale restoration',async()=>{
 let release;const h=await harness({fetch:async url=>url.endsWith('/auth/v1/user')?await new Promise(resolve=>release=resolve):undefined});
 h.storage.set(key,JSON.stringify({...h.auth,expires_at:Math.floor(Date.now()/1000)+3600}));
 try{
  const first=h.web.loadPlatformSession();await Promise.resolve();[...h.timers.values()].find(x=>x.ms===15000).fn();await assert.rejects(first);
  assert.equal(h.states.at(-1).reason,'verification_timeout');release(Response.json({id:h.auth.user.id}));await Promise.resolve();assert.equal(h.web.currentPlatformSessionIdentity(),null);
  const next=h.web.loadPlatformSession();await Promise.resolve();release(Response.json({id:h.auth.user.id}));await next;assert.equal(h.web.currentPlatformSessionIdentity(),'synthetic-user');
 }finally{h.cleanup();}
});

for(const stored of [false,true])test(`mandatory password change from verified Auth blocks ${stored?'existing':'new'} session`,async()=>{
 const h=await harness({fetch:async(url,init,{auth})=>url.endsWith('/auth/v1/user')?Response.json({...auth.user,user_metadata:{password_change_required:true}}):undefined});
 if(stored)h.storage.set(key,JSON.stringify({...h.auth,expires_at:Math.floor(Date.now()/1000)+3600}));
 try{
  await assert.rejects(stored?h.web.loadPlatformSession():h.web.signInPlatformSession('a@example.invalid','synthetic'),/password_change_required/);
  assert.equal(h.web.currentPlatformSessionIdentity(),null);assert.equal(h.states.some(x=>x.status==='ready'),false);if(!stored)assert.equal(h.storage.size,0);
 }finally{h.cleanup();}
});
test('failed logout storage removal still revokes remotely and cannot resume until explicit successful login',async()=>{
 const h=await harness({removeFailure:key});h.storage.set(key,JSON.stringify({...h.auth,expires_at:Math.floor(Date.now()/1000)+3600}));h.storage.set(tokenKey,h.auth.access_token);h.storage.set('unrelated','keep');
 try{
  await h.web.loadPlatformSession();const result=await h.web.signOutPlatformSession();assert.deepEqual(result,{revoked:true,cleared:false});
  assert.ok(h.calls.some(x=>x.url.includes('/auth/v1/logout')));assert.equal(h.storage.has(tokenKey),false);assert.equal(h.storage.get('unrelated'),'keep');assert.equal(h.web.currentPlatformSessionIdentity(),null);
  const before=h.calls.length;h.handlers.focus();h.handlers.pageshow();await assert.rejects(h.web.loadPlatformSession(),/signed_out/);assert.equal(h.calls.length,before);assert.notEqual(h.states.at(-1).status,'ready');
  await h.web.signInPlatformSession('a@example.invalid','synthetic');assert.equal(h.web.currentPlatformSessionIdentity(),'synthetic-user');
 }finally{h.cleanup();}
});
test('verification cannot restore old stored account during a pending new login',async()=>{
 let release;const h=await harness({fetch:async url=>url.includes('/auth/v1/token')?await new Promise(resolve=>release=resolve):undefined});
 h.storage.set(key,JSON.stringify({...h.auth,expires_at:Math.floor(Date.now()/1000)+3600}));
 try{const attempt=h.web.signInPlatformSession('a@example.invalid','synthetic');await assert.rejects(h.web.loadPlatformSession(),/login_in_progress/);assert.equal(h.states.some(x=>x.status==='ready'),false);release(Response.json(h.auth));await attempt;}
 finally{h.cleanup();}
});
test('verification body that ignores AbortSignal settles on timeout without restoring a session',async()=>{
 let release;const h=await harness({fetch:async url=>url.endsWith('/auth/v1/user')?{ok:true,status:200,headers:new Headers(),text:()=>new Promise(resolve=>release=resolve)}:undefined});
 h.storage.set(key,JSON.stringify({...h.auth,expires_at:Math.floor(Date.now()/1000)+3600}));
 try{const attempt=h.web.loadPlatformSession();while(!release)await new Promise(resolve=>setImmediate(resolve));[...h.timers.values()].find(x=>x.ms===15000).fn();await assert.rejects(attempt);release(JSON.stringify(h.auth.user));assert.equal(h.states.at(-1).reason,'verification_timeout');assert.equal(h.web.currentPlatformSessionIdentity(),null);}
 finally{h.cleanup();}
});

for(const cancel of [false,true])test(`failed or cancelled login never resumes previous account on focus (${cancel})`,async()=>{
 let release;const h=await harness({fetch:async url=>url.includes('/auth/v1/token')?cancel?await new Promise(resolve=>release=resolve):new Response('{}',{status:400}):undefined});
 h.storage.set(key,JSON.stringify({...h.auth,expires_at:Math.floor(Date.now()/1000)+3600}));
 try{
  const controller=new AbortController(),attempt=h.web.signInPlatformSession('b@example.invalid','synthetic',controller.signal);if(cancel)controller.abort();await assert.rejects(attempt);
  const before=h.calls.length;h.handlers.focus();h.handlers.pageshow();h.handlers.visibilitychange();await new Promise(resolve=>setImmediate(resolve));assert.equal(h.calls.length,before);assert.notEqual(h.states.at(-1).status,'ready');
  if(release)release(Response.json(h.auth));
  await h.web.loadPlatformSession();assert.equal(h.web.currentPlatformSessionIdentity(),'synthetic-user','Explicit session check may reopen the stored account');
 }finally{h.cleanup();}
});

for(const event of ['pagehide','popstate','hashchange'])test(`${event} cancels pending credential login without a late session`,async()=>{
 let release;const h=await harness({fetch:async url=>url.includes('/auth/v1/token')?await new Promise(resolve=>release=resolve):undefined});
 try{const attempt=h.web.signInPlatformSession('a@example.invalid','synthetic');h.handlers[event]();await assert.rejects(attempt,/login_cancelled/);release(Response.json(h.auth));await new Promise(resolve=>setImmediate(resolve));assert.equal(h.storage.size,0);assert.equal(h.web.currentPlatformSessionIdentity(),null);}
 finally{h.cleanup();}
});
