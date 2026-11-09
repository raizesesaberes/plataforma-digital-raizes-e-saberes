import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../login.js',import.meta.url),'utf8');
const jwt=(extra={})=>`x.${Buffer.from(JSON.stringify({sub:'synthetic-a',exp:Math.floor(Date.now()/1000)+3600,...extra})).toString('base64url')}.x`;
function harness(next, fetchImpl=()=>{throw Error('unexpected network');}) {
 const storage=new Map(), location=new URL('https://validation.invalid/login.html?next='+encodeURIComponent(next));
 const context=vm.createContext({URL,URLSearchParams,Date,JSON,Set,FormData,atob,fetch:fetchImpl,document:{querySelector:()=>null},localStorage:{getItem:key=>storage.get(key)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},window:{location,RAIZES_SUPABASE:{url:'https://backend.invalid',anonKey:'synthetic-public-key'}}});
 vm.runInContext(source+'\nglobalThis.api={getNextPage,getPostLoginDestination,authenticateWithSupabase,authenticateStudentInstitutional,isAppLogin,requiresSupabaseAuth};',context);
 return {api:context.api,storage};
}
test('return denies external, scheme, encoded delimiter and control-character destinations',()=>{
 for(const next of ['//evil.invalid','\\\\evil.invalid','https://evil.invalid','javascript:alert(1)','data:text/html,x','%2f%2fevil.invalid','%252f%252fevil.invalid','/\\evil.invalid',' /app/','/app/\n','/app/%2f%2fevil'])assert.equal(harness(next).api.getNextPage(),'');
});
test('app return canonicalizes locally and drops query/fragment; existing local platform paths remain',()=>{
 for(const next of ['/app','/app/','/app/mission?token=synthetic#state']){const h=harness(next);assert.equal(h.api.getNextPage(),'/app/');assert.equal(h.api.isAppLogin,true);assert.equal(h.api.requiresSupabaseAuth,true);}
 assert.equal(harness('professor.html').api.getNextPage(),'professor.html');
 assert.equal(harness('/aluno').api.getNextPage(),'/aluno');
});
test('App login needs only token + Auth user + self-profile, not metadata role, legacy tables or institutional-login',async()=>{
 const requests=[];
 const h=harness('/app/',async(url,init)=>{requests.push(url);if(url.includes('/auth/v1/token'))return Response.json({access_token:jwt(),expires_at:Math.floor(Date.now()/1000)+3600,user:{id:'synthetic-a'}});if(url.endsWith('/auth/v1/user'))return Response.json({id:'synthetic-a'});if(url.endsWith('/rpc/app_get_self_profile'))return Response.json([{profile_id:'synthetic-a',platform_role:'aluno',status:'active',student_ids:['synthetic-student']}]);throw Error('unexpected endpoint');});
 const result=await h.api.authenticateWithSupabase('qa@example.invalid','synthetic-not-a-credential');assert.equal(result.platformRole,'aluno');assert.equal(result.userId,'synthetic-a');assert.equal(requests.length,3);assert.ok(h.storage.has('raizes:supabase-auth-session'));assert.ok(requests.every(x=>!x.includes('/users')&&!x.includes('/profiles')&&!x.includes('institutional-login')));
});
test('App login rejects mismatched identity, inactive profile, unsupported role and absent expiry without storing token',async()=>{
 for(const change of [{profile_id:'other'},{status:'inactive'},{platform_role:'admin'},{expiryMissing:true},{authId:'other'}]){
  const h=harness('/app/',async url=>{if(url.includes('/auth/v1/token'))return Response.json({access_token:jwt(change.expiryMissing?{exp:undefined}:{}),user:{id:'synthetic-a'}});if(url.endsWith('/auth/v1/user'))return Response.json({id:change.authId||'synthetic-a'});return Response.json([{profile_id:'synthetic-a',platform_role:'aluno',status:'active',...change}]);});
  await assert.rejects(h.api.authenticateWithSupabase('qa@example.invalid','synthetic'));assert.equal(h.storage.size,0);
 }
});
test('App login never stores a session when new RPC is absent or denied',async()=>{
 const h=harness('/app/',async url=>url.includes('/auth/v1/token')?Response.json({access_token:jwt(),user:{id:'synthetic-a'}}):url.endsWith('/auth/v1/user')?Response.json({id:'synthetic-a'}):new Response('{}',{status:404}));
 await assert.rejects(h.api.authenticateWithSupabase('qa@example.invalid','synthetic'));assert.equal(h.storage.size,0);
});
test('non-App email login retains existing platform metadata routing without self-profile dependency',async()=>{
 const calls=[];const h=harness('/professor',async url=>{calls.push(url);return Response.json({access_token:jwt({app_metadata:{platform_role:'professor'}}),user:{id:'synthetic-a'}});});
 assert.equal((await h.api.authenticateWithSupabase('qa@example.invalid','synthetic')).platformRole,'professor');assert.equal(calls.length,1);assert.equal(h.api.getPostLoginDestination('professor'),'/professor');
});

test('App preserves institutional-code login with Auth and self-profile checks before storage',async()=>{
 const calls=[];const h=harness('/app/',async url=>{calls.push(url);if(url.endsWith('/functions/v1/student-institutional-login'))return Response.json({ok:true,session:{access_token:jwt(),user:{id:'synthetic-a'}}});if(url.endsWith('/auth/v1/user'))return Response.json({id:'synthetic-a'});return Response.json([{profile_id:'synthetic-a',platform_role:'aluno',status:'active'}]);});
 assert.equal((await h.api.authenticateStudentInstitutional('synthetic-code','synthetic')).platformRole,'aluno');assert.equal(calls.length,3);assert.ok(h.storage.has('raizes:supabase-auth-session'));assert.doesNotMatch(source,/studentMode[^;]*!isAppLogin/);
});
test('App institutional code does not save a token on denied profile, mismatched identity or unavailable Edge',async()=>{
 for(const scenario of ['profile-denied','wrong-identity','edge-unavailable','teacher-role']){
  const h=harness('/app/',async url=>{if(url.endsWith('/functions/v1/student-institutional-login'))return scenario==='edge-unavailable'?new Response('{}',{status:404}):Response.json({ok:true,session:{access_token:jwt(),user:{id:'synthetic-a'}}});if(url.endsWith('/auth/v1/user'))return Response.json({id:scenario==='wrong-identity'?'other':'synthetic-a'});return Response.json([{profile_id:'synthetic-a',platform_role:scenario==='teacher-role'?'professor':'aluno',status:scenario==='profile-denied'?'inactive':'active'}]);});
  await assert.rejects(h.api.authenticateStudentInstitutional('synthetic-code','synthetic'));assert.equal(h.storage.size,0);
 }
});

 test('App persists verified role instead of conflicting metadata without changing JWT in both login paths',async()=>{
  for(const institutional of [false,true]){
   const token=jwt({app_metadata:{platform_role:'professor'}});
   const session={access_token:token,user:{id:'synthetic-a',app_metadata:{platform_role:'professor'}}};
   const h=harness('/app/',async url=>{
    if(url.includes('/auth/v1/token'))return Response.json(session);
    if(url.endsWith('/functions/v1/student-institutional-login'))return Response.json({ok:true,session});
    if(url.endsWith('/auth/v1/user'))return Response.json({id:'synthetic-a'});
    return Response.json([{profile_id:'synthetic-a',platform_role:'aluno',status:'active'}]);
   });
   const result=await (institutional?h.api.authenticateStudentInstitutional('synthetic-code','synthetic'):h.api.authenticateWithSupabase('qa@example.invalid','synthetic'));
   const saved=JSON.parse(h.storage.get('raizes:supabase-auth-session'));
   assert.equal(result.platformRole,'aluno');assert.equal(saved.platform_role,'aluno');assert.equal(saved.access_token,token);
  }
 });
