import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPersonalLearningHandler} from '../../supabase/functions/personal-learning/handler.mjs';
import {ALLOWED_ROLES, courseInput, courseUrl, fileInfo, MAX_FILE_BYTES, readBounded} from '../../supabase/functions/personal-learning/domain.mjs';
import {createLearningClient, SESSION_KEY} from '../../personal-learning-runtime/client.mjs';
import {queryDraft, visibleCourses, counts, escape, normalizeData} from '../../personal-learning-runtime/model.mjs';
const A = '10000000-0000-4000-8000-000000000001', B = '10000000-0000-4000-8000-000000000002';
const C = '20000000-0000-4000-8000-000000000001', CB = '20000000-0000-4000-8000-000000000002';
const X = '30000000-0000-4000-8000-000000000001';
const fields = {title: 'Curso de educação', provider: 'Instituição externa', url: 'https://instituicao.edu.br/curso', status: 'saved'};
const course = {id: C, owner_id: A, ...courseInput(fields), archived_at: null, created_at: '2026-11-01', updated_at: '2026-11-01'};
const pdf = new TextEncoder().encode('%PDF-1.7\nexample\n%%EOF\n');
const cert = {id: X, course_id: C, owner_id: A, original_name: 'certificado.pdf', mime_type: 'application/pdf', byte_size: pdf.length, sha256: 'a'.repeat(64), storage_path: `${A}/${C}/${X}/${'a'.repeat(64)}.pdf`};
function harness(overrides = {}) {
  const calls = []; const rows = [structuredClone(course), {...structuredClone(course), id: CB, owner_id: B}];
  const deps = {
    authenticate: async token => {calls.push(['authenticate', token]); return token === 'Bearer valid' ? {id: A, profile: {status: 'active', platform_role: 'professor'}} : null;},
    list: async owner => ({courses: rows.filter(c => c.owner_id === owner), certificates: []}),
    course: async (owner, id) => rows.find(c => c.owner_id === owner && c.id === id),
    courseCount: async () => 1,
    createCourse: async values => {calls.push(['create', values]); return {...values, id: C};},
    updateCourse: async (owner, id, values) => {calls.push(['update', owner, id]); const row = rows.find(c => c.owner_id === owner && c.id === id); return row ? {...row, ...values} : null;},
    archiveCourse: async (owner, id, archived) => {const row = rows.find(c => c.owner_id === owner && c.id === id); return row ? {...row, archived_at: archived ? '2026-11-11' : null} : null;},
    certificate: async (owner, id) => owner === A && id === X ? {...cert} : null,
    certificateCount: async () => 0,
    insertCertificate: async values => {calls.push(['insertCertificate', values]); return values;},
    bucketPrivate: async () => true,
    upload: async (...args) => calls.push(['upload', ...args]),
    discardUpload: async (...args) => calls.push(['discard', ...args]),
    sign: async (...args) => {calls.push(['sign', ...args]); return 'https://project.supabase.co/storage/v1/object/sign/personal-learning-certificates/file.pdf?token=test';},
    ...overrides
  };
  const handler = createPersonalLearningHandler(deps);
  const request = (input, extra = {}) => handler(new Request('https://project.supabase.co/functions/v1/personal-learning', {method: 'POST', headers: {authorization: 'Bearer valid', 'content-type': 'application/json', ...extra.headers}, body: JSON.stringify(input), ...Object.fromEntries(Object.entries(extra).filter(([key]) => key !== 'headers'))}));
  const upload = (id = C, data = pdf, type = 'application/pdf', headers = {}) => handler(new Request(`https://project.supabase.co/functions/v1/personal-learning?action=upload&courseId=${id}`, {method: 'POST', headers: {authorization: 'Bearer valid', 'content-type': type, 'x-file-name': encodeURIComponent('../../arquivo.exe'), ...headers}, body: data}));
  return {calls, handler, request, upload};
}
test('course fields bounded, canonical HTTPS URL, fragments removed', () => {
  const c = courseInput({...fields, title: ' Curso ', url: fields.url + '#aula'});
  assert.equal(c.title, 'Curso'); assert.equal(c.source_url, fields.url); assert.equal(c.completion_declared_at, null);
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:pass@example.com', 'https://localhost/x', 'https://127.0.0.1/x', 'https://[::1]/x', 'https://site.local/x', 'https://example.com:444/x', 'https://example.com/ x', 'https://example.com\\evil']) assert.throws(() => courseUrl(url), url);
  assert.throws(() => courseInput({...fields, title: 'x'.repeat(181)}));
});
test('completion is explicit, validated, nonfuture, clears on other status', () => {
  const now = new Date('2026-11-11T12:00:00Z');
  assert.throws(() => courseInput({...fields, status: 'completed', completedOn: '2026-11-10'}, now), /completion_declaration/);
  for (const completedOn of ['2026-02-30', '2026-11-12', '1899-01-01', 'bad']) assert.throws(() => courseInput({...fields, status: 'completed', completedDeclaration: true, completedOn}, now));
  assert.equal(courseInput({...fields, status: 'completed', completedDeclaration: true, completedOn: '2026-11-10'}, now).completed_on, '2026-11-10');
  assert.equal(courseInput({...fields, completedOn: '2026-11-10'}, now).completed_on, null);
});
test('server MIME and bytes match, filename safe, no executable suffix', () => {
  assert.equal(fileInfo(pdf, 'application/pdf', '../../document.exe').original_name, '.._.._document.pdf');
  assert.throws(() => fileInfo(pdf, 'image/png', 'test.png'), /invalid_file_type/);
  assert.throws(() => fileInfo(new TextEncoder().encode('<svg>bad</svg>'), 'image/png', 'test.png'));
  assert.throws(() => fileInfo(new Uint8Array(MAX_FILE_BYTES + 1), 'application/pdf', 'x.pdf'));
  assert.throws(() => fileInfo(new Uint8Array(), 'application/pdf', 'x.pdf'));
  assert.throws(() => fileInfo(new TextEncoder().encode('%PDF-1.7 no end'), 'application/pdf', 'x.pdf'));
  const png = new Uint8Array(45); png.set([137,80,78,71,13,10,26,10]); png.set(new TextEncoder().encode('IHDR'),12); png.set(new TextEncoder().encode('IEND'),37);
  assert.equal(fileInfo(png, 'image/png', 'x').extension, 'png');
  assert.equal(fileInfo(new Uint8Array([255,216,255,0,255,217]), 'image/jpeg', 'x').extension, 'jpg');
});
test('request stream bounded even without content length', async () => {
  const req = new Request('https://test', {method: 'POST', body: '0123456789'});
  await assert.rejects(() => readBounded(req, 5), /request_too_large/);
});
test('CORS and HTTP methods fail closed', async () => {
  const h = harness();
  assert.equal((await h.request({action: 'list'}, {headers: {origin: 'https://evil.example'}})).status, 403);
  assert.equal((await h.handler(new Request('https://test', {method: 'GET'}))).status, 405);
  assert.equal((await h.handler(new Request('https://test', {method: 'OPTIONS', headers: {origin: 'https://www.raizesesaberes.com.br'}}))).status, 204);
  assert.equal(h.calls.length, 0);
});
test('every actionable request requires verified auth and active allowed role', async () => {
  const h = harness();
  assert.equal((await h.request({action: 'list'}, {headers: {authorization: ''}})).status, 401);
  assert.equal((await h.request({action: 'list'}, {headers: {authorization: 'Bearer stale'}})).status, 401);
  for (const profile of [{status: 'inactive', platform_role: 'professor'}, {status: 'active', platform_role: 'aluno'}, null]) {
    const d = harness({authenticate: async () => ({id: A, profile})});
    assert.equal((await d.request({action: 'list'})).status, 403); assert.equal((await d.upload()).status, 403);
  }
  for (const role of ALLOWED_ROLES) assert.equal((await harness({authenticate: async () => ({id: A, profile: {status: 'active', platform_role: role}})}).request({action: 'list'})).status, 200);
});
test('list returns only owner metadata and strips locators/owner IDs', async () => {
  const h = harness(); const response = await h.request({action: 'list'}); const body = await response.json();
  assert.equal(body.courses.length, 1); assert.equal(body.courses[0].id, C); assert.equal(body.courses[0].owner_id, undefined);
  assert.match(response.headers.get('cache-control'), /no-store/); assert.equal(h.calls[0][0], 'authenticate');
});
test('client cannot choose owner, role, arbitrary path or bucket', async () => {
  for (const key of ['owner_id','ownerId','user_id','userId','bucket','role','path','storage_path']) {
    const h = harness(); assert.equal((await h.request({action: 'create', ...fields, [key]: B})).status, 400);
    assert.equal(h.calls.filter(c => c[0] === 'create').length, 0);
  }
});
test('create owner comes solely from verified auth and no authenticity claim', async () => {
  const h = harness(); const res = await h.request({action: 'create', ...fields});
  assert.equal(res.status, 200); assert.equal(h.calls.find(c => c[0] === 'create')[1].owner_id, A);
  assert.equal((await res.json()).course.status, 'saved');
});
test('cross-user update, archive, upload and sign denied; no side effects', async () => {
  const h = harness();
  assert.equal((await h.request({action: 'update', id: CB, ...fields})).status, 404);
  assert.equal((await h.request({action: 'archive', id: CB, archived: true})).status, 404);
  assert.equal((await h.upload(CB)).status, 404);
  assert.equal((await h.request({action: 'sign', id: CB})).status, 404);
  assert.equal(h.calls.filter(c => ['upload','sign'].includes(c[0])).length, 0);
});
test('reversible course archive retains records', async () => {
  const h = harness();
  assert.ok((await (await h.request({action: 'archive', id: C, archived: true})).json()).course.archived_at);
  assert.equal((await (await h.request({action: 'archive', id: C, archived: false})).json()).course.archived_at, null);
});
test('upload stores immutable owner-bound hash of exact bytes with no locator response', async () => {
  const h = harness(); const res = await h.upload(); const body = await res.json(); assert.equal(res.status, 200);
  const [,bucket,path,bytes,type] = h.calls.find(c => c[0] === 'upload');
  assert.equal(bucket, 'personal-learning-certificates'); assert.ok(path.startsWith(`${A}/${C}/`)); assert.match(path, /[0-9a-f]{64}\.pdf$/);
  assert.deepEqual(bytes,pdf); assert.equal(type,'application/pdf');
  assert.equal(body.certificate.storage_path,undefined); assert.equal(body.certificate.sha256,undefined); assert.equal(body.certificate.authenticity,'not_verified');
});
test('invalid and oversized uploads rejected before storage', async () => {
  for (const [bytes,type] of [[pdf,'image/jpeg'],[new Uint8Array(MAX_FILE_BYTES + 1),'application/pdf']]) {
    const h = harness(); assert.ok((await h.upload(C,bytes,type)).status >= 400); assert.equal(h.calls.filter(c => c[0] === 'upload').length,0);
  }
});
test('failed metadata transaction compensates only newly uploaded exact object', async () => {
  const h = harness({insertCertificate: async () => {const error=Error('private SQL details'); error.writeRejected=true; throw error;}});
  const res = await h.upload(); assert.equal(res.status,503); assert.equal((await res.json()).code,'service_unavailable');
  assert.equal(h.calls.find(c=>c[0]==='upload')[2],h.calls.find(c=>c[0]==='discard')[2]);
});
test('download has owner validation, exact path binding, private bucket and 60 sec TTL', async () => {
  const h = harness(); assert.equal((await h.request({action:'sign',id:X})).status,200);
  assert.deepEqual(h.calls.find(c=>c[0]==='sign').slice(1),['personal-learning-certificates',cert.storage_path,60,'certificado.pdf']);
  for (const changed of [{storage_path:'other/user.pdf'},{owner_id:B},{course_id:CB},{mime_type:'text/html'}]) {
    const bad = harness({certificate:async()=>({...cert,...changed})}); assert.equal((await bad.request({action:'sign',id:X})).status,404); assert.equal(bad.calls.filter(c=>c[0]==='sign').length,0);
  }
  assert.equal((await harness({bucketPrivate:async()=>false}).request({action:'sign',id:X})).status,503);
});
test('input JSON bound and malformed actions rejected', async()=>{
  const h=harness();
  assert.equal((await h.request({action:'create',...fields,title:'x'.repeat(10000)})).status,413);
  assert.equal((await h.request({action:'unknown'})).status,400);
  assert.equal((await h.request({action:'sign',id:'../../other'})).status,400);
});
test('frontend prefill is inert data and text is escaped',()=>{
  const draft=queryDraft('?title=Novo&provider=Uni&url=https%3A%2F%2Funi.edu.br%2Fcurso&status=completed');
  assert.equal(draft.status,'completed'); assert.equal(draft.completedDeclaration,undefined);
  assert.equal(queryDraft('?title=X&provider=Y&url=javascript:alert(1)'),null);
  assert.equal(escape('<img src=x onerror="x">'),'&lt;img src=x onerror=&quot;x&quot;&gt;');
});
test('filters and counters distinguish archived and self-declared states',()=>{
  const courses=[course,{...course,id:CB,status:'completed'},{...course,id:X,archived_at:'2026-01-01'}];
  assert.deepEqual(counts(courses),{all:2,saved:1,in_progress:0,completed:1,archived:1});
  assert.equal(visibleCourses(courses,'all').length,2); assert.equal(visibleCourses(courses,'archived').length,1);
  assert.equal(visibleCourses(courses,'completed','educação').length,1);
  assert.throws(()=>normalizeData({courses:[{...course,source_url:'javascript:x'}],certificates:[]}));
});
function storage(session={access_token:'valid',refresh_token:'refresh',expires_at:9999999999}) { const map=new Map([[SESSION_KEY,JSON.stringify(session)]]); return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}; }
const cfg={url:'https://project.supabase.co',anonKey:'publishable'};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
test('frontend shares existing auth and refreshes only one explicit auth failure',async()=>{
  const store=storage(),calls=[];
  const client=createLearningClient({config:cfg,storage:store,fetcher:async(url,init)=>{calls.push([url,init]); if(url.includes('/auth/'))return json({access_token:'next',refresh_token:'r2',expires_in:3600}); if(init.headers.Authorization==='Bearer valid')return json({ok:false,code:'invalid_session'},401); return json({ok:true,courses:[],certificates:[]});}});
  await client.list(); assert.equal(calls.length,3); assert.equal(JSON.parse(store.getItem(SESSION_KEY)).access_token,'next');
});
test('frontend never automatically retries ambiguous mutations',async()=>{
  let calls=0; const client=createLearningClient({config:cfg,storage:storage(),fetcher:async()=>{calls++;throw Error('network');}});
  await assert.rejects(()=>client.save(fields)); assert.equal(calls,1);
});
test('logout/account switch during response discards personal result',async()=>{
  const store=storage(); const client=createLearningClient({config:cfg,storage:store,fetcher:async()=>{store.removeItem(SESSION_KEY);return json({ok:true,courses:[course],certificates:[]});}});
  await assert.rejects(()=>client.list(),/session_changed/);
});
test('refresh cannot resurrect account after another tab logs out',async()=>{
  const store=storage({access_token:'valid',refresh_token:'refresh',expires_at:1}); const client=createLearningClient({config:cfg,storage:store,fetcher:async()=>{store.removeItem(SESSION_KEY);return json({access_token:'next'});}});
  await assert.rejects(()=>client.list(),/session_changed/); assert.equal(store.getItem(SESSION_KEY),null);
});
test('client rejects wrong origin/bucket and long-lived signed links',async()=>{
  for(const signedUrl of ['https://evil.example/file?token=x','https://project.supabase.co/storage/v1/object/public/personal-learning-certificates/x','https://project.supabase.co/storage/v1/object/sign/other/x?token=x']){
    const client=createLearningClient({config:cfg,storage:storage(),fetcher:async()=>json({ok:true,signedUrl,expiresIn:60})}); await assert.rejects(()=>client.certificate(X),/certificate_unavailable/);
  }
});
test('migration denies direct writes, protects owner reads and storage, constrains certificate identity',()=>{
  const sql=readFileSync(new URL('../../supabase/migrations/20261111102918_personal_learning_private.sql',import.meta.url),'utf8');
  assert.equal((sql.match(/enable row level security/g)||[]).length,2);
  assert.match(sql,/revoke all on public.personal_learning_courses, public.personal_learning_certificates from public, anon, authenticated/);
  assert.equal((sql.match(/owner_id = \(select auth.uid\(\)\)/g)||[]).length,2);
  assert.equal((sql.match(/as restrictive/g)||[]).length,4);
  assert.match(sql,/foreign key \(course_id, owner_id\)/); assert.match(sql,/false,10485760/);
});
test('Edge adapter uses getUser, session owner filters, pinned SDK, no getPublicUrl',()=>{
  const src=readFileSync(new URL('../../supabase/functions/personal-learning/index.ts',import.meta.url),'utf8');
  assert.match(src,/auth\.getUser\(\)/); assert.match(src,/@supabase\/supabase-js@2\.57\.4/); assert.ok(!src.includes('getPublicUrl')); assert.ok(!src.includes('user_metadata')); assert.match(src,/upsert: false/);
});

test('committed upload response lost is reconciled without deleting stored bytes',async()=>{
  let persisted;
  const h=harness({insertCertificate:async row=>{persisted=row;throw Error('lost response');},certificate:async(owner,id)=>persisted?.owner_id===owner&&persisted?.id===id?persisted:null});
  const response=await h.upload(); assert.equal(response.status,200); assert.equal((await response.json()).certificate.id,persisted.id); assert.equal(h.calls.filter(c=>c[0]==='discard').length,0);
});
test('uncertain insert or reconciliation retains private bytes',async()=>{
  for (const lookup of [async()=>null,async()=>{throw Error('lookup unavailable');}]) {
    const h=harness({insertCertificate:async()=>{throw Error('response lost');},certificate:lookup});
    assert.equal((await h.upload()).status,503); assert.equal(h.calls.filter(c=>c[0]==='discard').length,0);
  }
});
test('account switch and abort during JSON body decode discard stale data',async()=>{
  for(const kind of ['switch','abort']) {
    const store=storage(),controller=new AbortController();
    const client=createLearningClient({config:cfg,storage:store,fetcher:async()=>({ok:true,status:200,json:async()=>{if(kind==='switch')store.setItem(SESSION_KEY,JSON.stringify({access_token:'other'}));else controller.abort();return {ok:true,courses:[course],certificates:[]};}})});
    await assert.rejects(()=>client.list({signal:controller.signal}),kind==='switch'?/session_changed/:/Request aborted/);
  }
});

for (const [httpStatus, expectedStatus, expectedCode] of [[400,401,'session_required'],[401,401,'session_required'],[500,503,'service_unavailable']]) {
  test(`refresh HTTP ${httpStatus} maps to ${expectedStatus} ${expectedCode}`,async()=>{
    const store=storage({access_token:'expired-fixture',refresh_token:'fixture-refresh',expires_at:1}); const calls=[];
    const client=createLearningClient({config:cfg,storage:store,fetcher:async(url)=>{calls.push(url);return json({code:httpStatus===400?'refresh_token_not_found':'fixture_failure'},httpStatus);}});
    await assert.rejects(()=>client.list(),error=>error.status===expectedStatus&&error.code===expectedCode);
    assert.equal(calls.length,1); assert.match(calls[0],/auth\/v1\/token\?grant_type=refresh_token$/);
    assert.equal(JSON.parse(store.getItem(SESSION_KEY)).access_token,'expired-fixture');
  });
}
