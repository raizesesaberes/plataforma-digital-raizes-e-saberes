import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from '../../mobile/node_modules/typescript/lib/typescript.js';
async function modules(beta) {
 const urls={};
 for(const name of ['readBetaPolicy','webSessionCore','library','webSession']){
  let source=await readFile(new URL(`../../mobile/src/services/${name}.ts`,import.meta.url),'utf8');
  source=source.replace("process.env.EXPO_PUBLIC_REAL_READ_BETA === 'true'",String(beta));
  let js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
  for(const [key,url] of Object.entries(urls))for(const ext of ['', '.ts'])js=js.replaceAll(`"./${key}${ext}"`,JSON.stringify(url)).replaceAll(`'./${key}${ext}'`,JSON.stringify(url));
  urls[name]=`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
 }
 return {policy:await import(urls.readBetaPolicy),core:await import(urls.webSessionCore),library:await import(urls.library),web:await import(urls.webSession)};
}
test('beta blocks every non-allowlisted service before fetch, including generic RPC, POST and auto-progress',async()=>{
 const {core,library,web}=await modules(true);
 const saved=globalThis.fetch;let count=0;
 globalThis.fetch=async()=>{count++;return Response.json({});};
 const claims={sub:'test-fixture',exp:Math.floor(Date.now()/1000)+3600};
 const token=`x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
 const raw=JSON.stringify({access_token:token,user:{id:claims.sub},expires_at:claims.exp});
 const guard=core.createSessionGuard(()=>raw,()=>{});
 core.installHostedGuard(()=>({url:'https://test.invalid',publishableKey:'sb_publishable_fixture'}),guard);
 const pending=guard.begin(),session=guard.commit(pending.session,pending.epoch);
 try{
  for(const name of ['student_save_library_progress','student_save_activity_progress','teacher_save_attendance_records','communication_mark_read','student_list_calendar_events','unknown','library_list_editions?x=1'])await assert.rejects(library.rpc(session,name,{}),/read_beta_operation_unavailable/);
  await assert.rejects(library.saveLibraryProgress(session,'book',2,10),/read_beta_operation_unavailable/);
  await assert.rejects(library.saveEarlyChildhoodActivityProgress(session,'a','COMPLETED',100),/read_beta_operation_unavailable/);
  await assert.rejects(library.startEarlyChildhoodGameAttempt(session,'g'),/read_beta_operation_unavailable/);
  await assert.rejects(library.restGet(session,'students?select=*'),/read_beta_operation_unavailable/);
  for(const path of ['/functions/v1/mission-publish-revision','/rest/v1/students','/functions/v1/student-library-read-access'])await assert.rejects(guard.request(session,'https://test.invalid'+path,{method:'POST',body:'{}'}),/read_beta_operation_unavailable/);
  // Function service can fail earlier on session state, but must never dispatch.
  await assert.rejects(web.callPlatformFunction(session,'mission-publish-revision',{}));
  assert.equal(count,0);
  await library.rpc(session,'library_list_editions',{});assert.equal(count,1);
 }finally{globalThis.fetch=saved;}
});
test('only reviewed exact endpoints/methods and expected origin pass the beta transport',async()=>{
 const {policy}=await modules(true),origin='https://test.invalid';
 for(const name of ['app_get_self_profile','student_get_context','teacher_get_context','teacher_list_classes_for_mobile','notification_get_center','teacher_get_notification_center','library_list_editions'])assert.doesNotThrow(()=>policy.assertReadBetaRequest(`${origin}/rest/v1/rpc/${name}`,{method:'POST'},origin));
 for(const name of ['library-edition-read-access','library-edition-search'])assert.doesNotThrow(()=>policy.assertReadBetaRequest(`${origin}/functions/v1/${name}`,{method:'POST'},origin));
 assert.doesNotThrow(()=>policy.assertReadBetaRequest(origin+'/auth/v1/user',{},origin));
 assert.doesNotThrow(()=>policy.assertReadBetaRequest(origin+'/auth/v1/logout?scope=local',{method:'POST'},origin));
 for(const [url,method] of [[origin+'/auth/v1/user','POST'],[origin+'/auth/v1/token?grant_type=password','POST'],[origin+'/rest/v1/rpc/library_list_editions','DELETE'],[origin+'/rest/v1/rpc/library_list_editions?x=1','POST'],['https://other.invalid/rest/v1/rpc/library_list_editions','POST'],[origin+'/rest/v1/rpc/library_list_editions#x','POST'],[origin+'/unknown','GET']])assert.throws(()=>policy.assertReadBetaRequest(url,{method},origin),/read_beta_operation_unavailable/);
 assert.throws(()=>policy.assertReadBetaRequest(origin+'/auth/v1/user'),/read_beta_operation_unavailable/);
});
test('build policy ignores runtime query/storage; full default is unchanged; unknown UI routes denied',async()=>{
 const {policy}=await modules(true);
 globalThis.window={location:{search:'?EXPO_PUBLIC_REAL_READ_BETA=false&write=true'},localStorage:{getItem:()=> 'false'}};
 try{assert.throws(()=>policy.assertReadBetaRequest('https://test.invalid/rest/v1/rpc/save',{method:'POST'},'https://test.invalid'));}finally{delete globalThis.window;}
 assert.equal(policy.isReadBetaRoute('aluno','mission'),false);
 assert.equal(policy.isReadBetaRoute('professor','agenda'),false);
 assert.equal(policy.isReadBetaRoute('aluno','unknown'),false);
 assert.equal(policy.isReadBetaRoute('crescer','profile'),true);
 const full=await modules(false);assert.doesNotThrow(()=>full.policy.assertReadBetaRequest('https://test.invalid/unknown',{method:'POST'}));
 const source=await readFile(new URL('../../mobile/src/services/readBetaPolicy.ts',import.meta.url),'utf8');assert.doesNotMatch(source,/localStorage|location|URLSearchParams/);
 const shell=await readFile(new URL('../../mobile/src/HostedApplication.tsx',import.meta.url),'utf8');assert.match(shell,/Beta real · somente leitura/);const appShell=await readFile(new URL('../../mobile/src/AppShell.tsx',import.meta.url),'utf8');assert.match(appShell,/READ_BETA && !isReadBetaRoute/);assert.ok(appShell.indexOf('READ_BETA && !isReadBetaRoute') < appShell.indexOf('<ExperienceHome'));assert.match(appShell,/<ReadBetaSummary/);
 const build=await readFile(new URL('../../scripts/build-app-web.mjs',import.meta.url),'utf8');assert.match(build,/EXPO_PUBLIC_REAL_READ_BETA:readBeta\?'true':'false'/);
});
test('beta real session adapter validates Auth/profile/context, denies institutional publish before fetch and permits explicit logout',async()=>{
 const {web}=await modules(true);const original=globalThis.fetch;const requests=[];
 const exp=Math.floor(Date.now()/1000)+3600,token=`x.${Buffer.from(JSON.stringify({sub:'fixture',exp})).toString('base64url')}.x`;
 const storage=new Map([['raizes:supabase-auth-session',JSON.stringify({access_token:token,user:{id:'fixture'},expires_at:exp})]]);
 globalThis.window={location:{protocol:'https:',hostname:'fixture.invalid',pathname:'/app/'},RAIZES_SUPABASE:{url:'https://test.invalid',anonKey:'sb_publishable_fixture'},localStorage:{getItem:key=>storage.get(key),removeItem:key=>storage.delete(key)},addEventListener(){},setInterval(){},setTimeout,clearTimeout};
 globalThis.document={visibilityState:'visible',addEventListener(){}};
 globalThis.fetch=async(url)=>{requests.push(url);if(url.endsWith('/auth/v1/user'))return Response.json({id:'fixture'});if(url.endsWith('/rpc/app_get_self_profile'))return Response.json([{profile_id:'fixture',platform_role:'aluno',status:'active',student_ids:['student']}]);if(url.endsWith('/rpc/student_get_context'))return Response.json([{student_id:'student',school_id:'school',class_id:'class',segment:'ENSINO_FUNDAMENTAL'}]);return Response.json({ok:true});};
 try{
  web.enablePlatformSession();const {session}=await web.loadPlatformSession();assert.equal(requests.length,3);
  await assert.rejects(web.callPlatformFunction(session,'mission-publish-revision',{}),/read_beta_operation_unavailable/);assert.equal(requests.length,3);
  await web.callPlatformLibraryFunction(session,'library-edition-search',{bookId:'fixture',query:'texto',offset:0});assert.equal(requests.length,4);
  assert.equal((await web.signOutPlatformSession()).revoked,true);assert.equal(requests.length,5);assert.match(requests.at(-1),/auth\/v1\/logout\?scope=local$/);assert.equal(storage.size,0);
 }finally{globalThis.fetch=original;delete globalThis.window;delete globalThis.document;}
});
test('beta public platform menu remains byte-identical to approved production baseline',async()=>{
 const {createHash}=await import('node:crypto');
 const baseline=JSON.parse(await readFile(new URL('../../scripts/static-runtime-manifest.json',import.meta.url),'utf8'));
 const source=await readFile(new URL('../../app-pages.js',import.meta.url));
 assert.equal(createHash('sha256').update(source).digest('hex'),'fbe2abd6783576e5f24aa2e8a34753fbbf0a0ba085435566d30dd7baf042164f');
 const builder=await readFile(new URL('../../scripts/build-static-web.mjs',import.meta.url),'utf8');
 assert.match(builder,/mode === 'real-read-beta'/);assert.match(builder,/actual !== productionMenuSha256/);
});
