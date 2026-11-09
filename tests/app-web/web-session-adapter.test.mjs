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
 let active=true, context=true, identity='student-a';const requests=[];
 globalThis.fetch=async(url)=>{
   requests.push(url);
   if(url.endsWith('/auth/v1/user'))return Response.json({id:identity});
   if(url.includes('/profiles?'))return Response.json([{status:active?'ativo':'inactive',platform_role:'aluno'}]);
   if(url.includes('/users?'))return Response.json([{perfil:'aluno',ativo:true}]);
   if(url.includes('/rpc/student_get_context'))return Response.json(context?[{student_id:'s',school_id:'school',class_id:'class',segment:'fundamental'}]:[]);
   if(url.includes('/auth/v1/logout'))return new Response(null,{status:204});
   throw Error('unexpected mock route');
 };
 try {
   web.enablePlatformSession();
   const result=await web.loadPlatformSession();assert.equal(result.role,'fundamental');assert.equal(web.currentPlatformSessionIdentity(),'student-a');assert.ok(requests[0].endsWith('/auth/v1/user'));
   const before=requests.length;
   handlers.focus();handlers.focus();handlers.pageshow();
   const pending=web.loadPlatformSession();assert.equal(web.loadPlatformSession(),pending);
   await Promise.resolve();assert.equal(web.currentPlatformSessionIdentity(),'student-a');
   const ready=web.awaitPlatformSessionReady(result.session);
   const revalidated=await pending;await ready;assert.equal(revalidated.session,result.session);
   await assert.rejects(web.awaitPlatformSessionReady({...result.session}));
   assert.equal(requests.slice(before).filter(url=>url.endsWith('/auth/v1/user')).length,1);
   handlers.storage({key:'raizes:supabase-auth-session'});assert.equal(web.currentPlatformSessionIdentity(),null);
   active=false;const denied=web.loadPlatformSession();const deniedReady=web.awaitPlatformSessionReady(result.session);await assert.rejects(denied,/profile_inactive/);await assert.rejects(deniedReady);assert.equal(web.currentPlatformSessionIdentity(),null);active=true;
   context=false;await assert.rejects(web.loadPlatformSession(),/student_context_missing/);context=true;
   identity='other';await assert.rejects(web.loadPlatformSession(),/server_identity_mismatch/);identity='student-a';
   await web.loadPlatformSession();storage.set('unrelated','keep');storage.set('sb-other-project-auth-token','keep');
   assert.equal((await web.signOutPlatformSession()).revoked,true);assert.equal(storage.get('unrelated'),'keep');assert.equal(storage.get('sb-other-project-auth-token'),'keep');assert.equal(storage.has('raizes:supabase-auth-session'),false);
   assert.equal(web.currentPlatformSessionIdentity(),null);
 } finally {globalThis.fetch=savedFetch;delete globalThis.window;delete globalThis.document;}
});
