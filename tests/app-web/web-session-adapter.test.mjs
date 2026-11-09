import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from '../../mobile/node_modules/typescript/lib/typescript.js';
async function moduleURL(name, replacements={}) {
  let source=await readFile(new URL(`../../mobile/src/services/${name}.ts`,import.meta.url),'utf8');
  let js=ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});
  for (const [name,url] of Object.entries(replacements)) js=js.replaceAll(`"./${name}"`,JSON.stringify(url)).replaceAll(`'./${name}'`,JSON.stringify(url));
  return `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`;
}
test('real adapter uses Auth + server role + active institutional context, and clears only known keys', async()=>{
 const core=await moduleURL('webSessionCore');const library=await moduleURL('library',{webSessionCore:core});const web=await import(await moduleURL('webSession',{webSessionCore:core,library}));
 const savedFetch=globalThis.fetch;
 const claims={sub:'student-a',exp:Math.floor(Date.now()/1000)+3600};
 const token=`x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
 const storage=new Map();const handlers={};
 const store=()=>storage.set('raizes:supabase-auth-session',JSON.stringify({access_token:token,user:{id:'student-a'},expires_at:claims.exp,platform_role:'professor'}));store();
 globalThis.window={location:{protocol:'https:',pathname:'/app/'},RAIZES_SUPABASE:{url:'https://backend.invalid',anonKey:'sb_publishable_test'},localStorage:{getItem:key=>storage.get(key)||null,removeItem:key=>storage.delete(key)},addEventListener:(key,fn)=>handlers[key]=fn,setInterval:()=>0,setTimeout,clearTimeout};
 globalThis.document={visibilityState:'visible',addEventListener:()=>{}};
 let active=true, context=true, identity='student-a', profileId='student-a', platformRole='aluno', studentIds=['s'], teacherId='student-a';const requests=[];let editionResponse={ok:true};
 globalThis.fetch=async(url)=>{
   requests.push(url);
   if(url.endsWith('/auth/v1/user'))return Response.json({id:identity});
   if(url.includes('/rpc/app_get_self_profile'))return Response.json([{profile_id:profileId,status:active?'ativo':'inactive',platform_role:platformRole,student_ids:studentIds}]);
   if(url.includes('/users?')||url.includes('/profiles?'))throw Error('legacy table access forbidden');
   if(url.includes('/rpc/teacher_get_context'))return Response.json([{profile_id:teacherId,teacher_id:'t',school_id:'school',active_class_links:1}]);
   if(url.includes('/rpc/student_get_context'))return Response.json(context?[{student_id:'s',school_id:'school',class_id:'class',segment:'ENSINO_FUNDAMENTAL'}]:[]);
   if(url.includes('/functions/v1/library-edition-'))return Response.json(editionResponse);
   if(url.includes('/auth/v1/logout'))return new Response(null,{status:204});
   throw Error('unexpected mock route');
 };
 try {
   web.enablePlatformSession();
   const result=await web.loadPlatformSession();assert.equal(result.role,'fundamental');assert.equal(web.currentPlatformSessionIdentity(),'student-a');assert.ok(requests[0].endsWith('/auth/v1/user'));
   for(const endpoint of ['library-edition-read-access','library-edition-search'])assert.deepEqual(await web.callPlatformLibraryFunction(result.session,endpoint,{bookId:'synthetic'}),{ok:true});
   for(const signedUrl of ['javascript:alert(1)','data:image/svg+xml,test','http://backend.invalid/a','https://outside.invalid/a','https://user:password@backend.invalid/a','//backend.invalid/a','/storage/a',null]) {
    editionResponse={ok:true,asset:{signedUrl}};
    await assert.rejects(web.callPlatformLibraryFunction(result.session,'library-edition-read-access',{}),/invalid_edition_asset_url/);
   }
   editionResponse={ok:true,asset:{signedUrl:'https://backend.invalid/storage/v1/object/sign/private/page.jpg?token=synthetic'}};
   assert.deepEqual(await web.callPlatformLibraryFunction(result.session,'library-edition-read-access',{}),editionResponse);
   editionResponse={ok:true};
   const forbiddenRequests=requests.length;await assert.rejects(web.callPlatformLibraryFunction(result.session,'mission-publish-revision',{}),/function_not_allowed/);assert.equal(requests.length,forbiddenRequests);
   await assert.rejects(web.callPlatformLibraryFunction({...result.session},'library-edition-read-access',{}),/session_unverified/);
   const before=requests.length;
   handlers.focus();handlers.focus();handlers.pageshow();
   const pending=web.loadPlatformSession();assert.equal(web.loadPlatformSession(),pending);
   await Promise.resolve();assert.equal(web.currentPlatformSessionIdentity(),'student-a');
   const ready=web.awaitPlatformSessionReady(result.session);
   const revalidated=await pending;await ready;assert.equal(revalidated.session,result.session);
   await assert.rejects(web.awaitPlatformSessionReady({...result.session}));
   assert.equal(requests.slice(before).filter(url=>url.endsWith('/auth/v1/user')).length,1);
   handlers.storage({key:'raizes:supabase-auth-session'});assert.equal(web.currentPlatformSessionIdentity(),null);
   await assert.rejects(web.callPlatformLibraryFunction(result.session,'library-edition-read-access',{}),/session_unverified/);
   active=false;const denied=web.loadPlatformSession();const deniedReady=web.awaitPlatformSessionReady(result.session);await assert.rejects(denied,/profile_inactive/);await assert.rejects(deniedReady);assert.equal(web.currentPlatformSessionIdentity(),null);active=true;
   context=false;await assert.rejects(web.loadPlatformSession(),/institutional_context_missing/);context=true;
   identity='other';await assert.rejects(web.loadPlatformSession(),/server_identity_mismatch/);identity='student-a';
   profileId='other';await assert.rejects(web.loadPlatformSession(),/profile_identity_mismatch/);profileId='student-a';
   studentIds=[];await assert.rejects(web.loadPlatformSession(),/student_identity_mismatch/);studentIds=['s'];
   platformRole='admin';await assert.rejects(web.loadPlatformSession(),/unsupported_role/);
   platformRole='professor';assert.equal((await web.loadPlatformSession()).role,'professor');
   teacherId='other';await assert.rejects(web.loadPlatformSession(),/teacher_identity_mismatch/);teacherId='student-a';platformRole='aluno';
   assert.ok(requests.every(url=>!url.includes('/users?')&&!url.includes('/profiles?')));
   await web.loadPlatformSession();storage.set('unrelated','keep');storage.set('sb-other-project-auth-token','keep');
   assert.equal((await web.signOutPlatformSession()).revoked,true);assert.equal(storage.get('unrelated'),'keep');assert.equal(storage.get('sb-other-project-auth-token'),'keep');assert.equal(storage.has('raizes:supabase-auth-session'),false);
   assert.equal(web.currentPlatformSessionIdentity(),null);
 } finally {globalThis.fetch=savedFetch;delete globalThis.window;delete globalThis.document;}
});
