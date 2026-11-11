import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createTrainingClient, normalizeCatalog, groupLessons, formatDuration, SESSION_KEY} from '../../formacao-runtime/client.mjs';
const lesson = {id:'lesson-fixture-one', title:'Aula de teste', description:'Descrição local', lessonNumber:1, status:'published', hierarchy:{collection:'Coleção teste',subject:'Matemática',schoolYear:'1º ano',volume:1,unit:1}, availableKinds:['video'],canPlay:true,durationSeconds:485};
const fixture = {ok:true,actor:'teacher',schoolId:'school-fixture',access:'available',lessons:[lesson,{...lesson,id:'lesson-fixture-review',lessonNumber:2,status:'review'}]};
assert.equal(normalizeCatalog(fixture).lessons.length,1);
assert.equal(normalizeCatalog({...fixture,actor:'admin'}).lessons.length,2);
assert.equal(normalizeCatalog({...fixture,access:'license_required'}).lessons.length,0);
assert.equal(normalizeCatalog({...fixture,lessons:[{...lesson,canPlay:false}]}).lessons[0].availableKinds.length,0);
assert.throws(()=>normalizeCatalog({...fixture,actor:'anonymous'}));
assert.throws(()=>normalizeCatalog({...fixture,lessons:[lesson,lesson]}));
assert.equal(groupLessons(normalizeCatalog({...fixture,actor:'admin'}).lessons).size,1);
assert.equal(groupLessons([lesson,{...lesson,hierarchy:{...lesson.hierarchy,collection:'Outra'}}]).size,2);
assert.equal(formatDuration(null),''); assert.equal(formatDuration(485),'8:05');
const config={url:'https://fixture.supabase.co',anonKey:'public-test-key'};
const storage = (()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}})();
let calls=[];
const client=createTrainingClient({config,storage,fetcher:async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(fixture),{status:200});}});
await assert.rejects(client.catalog(),e=>e.status===401);assert.equal(calls.length,0);
storage.setItem(SESSION_KEY,JSON.stringify({access_token:'fixture-token',expires_at:Date.now()/1000+3600,platform_role:'admin'}));
const result=await client.catalog();assert.equal(result.actor,'teacher');assert.equal(calls.length,1);assert.equal(calls[0].options.headers.Authorization,'Bearer fixture-token');assert.deepEqual(JSON.parse(calls[0].options.body),{action:'catalog'});assert.equal(calls[0].options.cache,'no-store');
const asset=(url)=>createTrainingClient({config,storage,fetcher:async()=>new Response(JSON.stringify({ok:true,asset:{lessonId:lesson.id,kind:'video',signedUrl:url,expiresIn:300,mimeType:'video/mp4'}}))});
assert.equal((await asset('https://fixture.supabase.co/storage/v1/object/sign/private/a.mp4?token=fixture').asset(lesson.id,'video')).kind,'video');
for(const url of ['javascript:alert(1)','https://evil.example/video.mp4','https://fixture.supabase.co/storage/v1/object/public/private/a.mp4','https://fixture.supabase.co/storage/v1/object/sign/private/a.mp4']) await assert.rejects(asset(url).asset(lesson.id,'video'));
const refreshCalls=[];storage.setItem(SESSION_KEY,JSON.stringify({access_token:'expired',refresh_token:'fixture-refresh',expires_at:1}));
const refreshClient=createTrainingClient({config,storage,fetcher:async(url,options)=>{refreshCalls.push({url,options});return new Response(JSON.stringify(url.includes('/auth/')?{access_token:'renewed',refresh_token:'new-refresh',expires_in:3600}:fixture));}});
await refreshClient.catalog();assert.equal(refreshCalls.length,2);assert.equal(refreshCalls[1].options.headers.Authorization,'Bearer renewed');
const raced=createTrainingClient({config,storage,fetcher:async()=>{storage.removeItem(SESSION_KEY);return new Response(JSON.stringify(fixture));}});
await assert.rejects(raced.catalog(),e=>e.code==='session_changed');
// Refresh failures are classified for the UI, not leaked as raw Auth statuses.
for (const [httpStatus, expectedStatus, expectedCode] of [[400,401,'session_required'],[401,401,'session_required'],[403,401,'session_required'],[500,503,'service_unavailable'],[503,503,'service_unavailable']]) {
  storage.setItem(SESSION_KEY,JSON.stringify({access_token:'expired-fixture',refresh_token:'fixture-refresh',expires_at:1}));
  const requests=[];
  const expired=createTrainingClient({config,storage,fetcher:async url=>{requests.push(url);return new Response(JSON.stringify({code:'refresh_token_not_found'}),{status:httpStatus});}});
  await assert.rejects(expired.catalog(),error=>error.status===expectedStatus&&error.code===expectedCode);
  assert.equal(requests.length,1);assert(requests[0].includes('/auth/v1/token'));
  assert.equal(JSON.parse(storage.getItem(SESSION_KEY)).access_token,'expired-fixture');
}
// An Edge 401 followed by Auth 400 must also lead to the login state.
storage.setItem(SESSION_KEY,JSON.stringify({access_token:'active-fixture',refresh_token:'fixture-refresh',expires_at:Date.now()/1000+3600}));
let rejectionCalls=0;
const rejectedRefresh=createTrainingClient({config,storage,fetcher:async url=>{rejectionCalls++;return new Response(JSON.stringify({code:'invalid_session'}),{status:url.includes('/auth/')?400:401});}});
await assert.rejects(rejectedRefresh.catalog(),error=>error.code==='session_required'&&error.status===401);assert.equal(rejectionCalls,2);
// Session and abort checks must run after JSON parsing, before data escapes.
for (const mutation of ['logout','switch','abort']) {
  storage.setItem(SESSION_KEY,JSON.stringify({access_token:'active-fixture',expires_at:Date.now()/1000+3600}));
  const controller=new AbortController();
  const parsingRace=createTrainingClient({config,storage,fetcher:async()=>({ok:true,status:200,json:async()=>{
    if(mutation==='logout')storage.removeItem(SESSION_KEY);
    if(mutation==='switch')storage.setItem(SESSION_KEY,JSON.stringify({access_token:'other-account-fixture'}));
    if(mutation==='abort')controller.abort();
    return fixture;
  }})});
  await assert.rejects(parsingRace.catalog({signal:controller.signal}),error=>mutation==='abort'?error.name==='AbortError':error.code==='session_changed'&&error.status===401);
}
// An interrupted refresh must never restore or replace the saved account.
for (const mutation of ['logout','switch','abort']) {
  storage.setItem(SESSION_KEY,JSON.stringify({access_token:'expired-fixture',refresh_token:'fixture-refresh',expires_at:1}));
  const controller=new AbortController();let requests=0;
  const interrupted=createTrainingClient({config,storage,fetcher:async()=>{requests++;return {ok:true,status:200,json:async()=>{
    if(mutation==='logout')storage.removeItem(SESSION_KEY);
    if(mutation==='switch')storage.setItem(SESSION_KEY,JSON.stringify({access_token:'other-account-fixture'}));
    if(mutation==='abort')controller.abort();
    return {access_token:'must-not-be-saved',expires_in:3600};
  }};}});
  await assert.rejects(interrupted.catalog({signal:controller.signal}),error=>mutation==='abort'?error.name==='AbortError':error.code==='session_changed'&&error.status===401);
  assert.equal(requests,1);assert.notEqual(JSON.parse(storage.getItem(SESSION_KEY)||'null')?.access_token,'must-not-be-saved');
}
const source=await readFile(new URL('../../formacao-runtime/app.mjs',import.meta.url),'utf8');
assert(!source.includes('Corações para presentear'));assert(!source.includes('Coleções de brinquedos'));assert(!source.includes('localStorage.setItem'));assert(!source.includes('object/public'));
console.log('PASS training client: server authority, license/pending gating, private URL checks, refresh 400/401/403 vs 500/503 mapping, post-JSON session/abort races, no interrupted refresh writes, grouping, metadata-only duration.');
