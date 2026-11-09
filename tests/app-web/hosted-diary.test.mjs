import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
const here=dirname(fileURLToPath(import.meta.url));
const sourcePath=[process.env.HOSTED_DIARY_PATH,resolve(here,'../mobile/src/services/hostedDiary.ts'),resolve(here,'../../mobile/src/services/hostedDiary.ts')].filter(Boolean).find(existsSync);
assert.ok(sourcePath,'Set HOSTED_DIARY_PATH to hostedDiary.ts');
const ts=createRequire(sourcePath)('typescript'), module={exports:{}};
vm.runInNewContext(ts.transpileModule(readFileSync(sourcePath,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,Error,TypeError,require(){return{rpc(){throw Error('Real transport forbidden in synthetic test')}}}});
const {createHostedDiary}=module.exports;
const scope={schoolId:'school-a',classId:'class-a',date:'2026-11-09'},session={userId:'synthetic',accessToken:'synthetic'};
const row=()=>({id:'entry-a',school_id:'school-a',class_id:'class-a',teacher_id:'teacher-a',entry_date:scope.date,title:'Original',taught_content:'Original content',pedagogical_notes:'Notes',plan_id:'plan-a',calendar_entry_id:'calendar-a',activity_link_count:2,updated_at:'2026-11-09T09:00:00Z',status:'draft'});
const draft={title:' New title ',taughtContent:' New content ',pedagogicalNotes:' New notes '};
function setup(initial=row()){
 let stored=initial, current=true, mutationError=null, commit=true, readsFail=false;const calls=[];
 const transport=async(_session,name,body,opts)=>{
  calls.push({name,body,opts});
  if(name==='teacher_list_class_diary_entries'){if(readsFail)throw new TypeError('offline');return stored?[{...stored}]:[];}
  assert.equal(name,'teacher_upsert_class_diary_entry');assert.equal(body.p_activity_links,null);
  if(commit){stored={...(stored||row()),id:stored?.id||'created',plan_id:body.p_plan_id,calendar_entry_id:body.p_calendar_entry_id,activity_link_count:stored?.activity_link_count||0,title:body.p_title,taught_content:body.p_taught_content,pedagogical_notes:body.p_pedagogical_notes,updated_at:'2026-11-09T10:00:00Z'};}
  if(mutationError)throw mutationError;return{diary_entry_id:stored.id};
 };
 const api=createHostedDiary(session,scope,()=>current,transport);
 return{api,calls,get stored(){return stored},set stored(v){stored=v},set current(v){current=v},set mutationError(v){mutationError=v},set commit(v){commit=v},set readsFail(v){readsFail=v}};
}
const writes=h=>h.calls.filter(c=>c.name==='teacher_upsert_class_diary_entry');
test('save preserves links and metadata, uses original revision, confirms readback',async()=>{const h=setup(),expected=await h.api.load();const result=await h.api.saveDraft(expected,draft);assert.equal(result.title,'New title');assert.equal(result.activityLinkCount,2);const w=writes(h)[0];assert.equal(w.opts.ifMatch,'"entry-a|2026-11-09T09:00:00Z"');assert.equal(w.body.p_plan_id,'plan-a');assert.equal(w.body.p_calendar_entry_id,'calendar-a');assert.equal(w.body.p_activity_links,null);assert.equal(writes(h).length,1)});
test('create uses empty expected revision and zero links',async()=>{const h=setup(null);const result=await h.api.saveDraft(null,draft);assert.equal(result.id,'created');assert.equal(writes(h)[0].opts.ifMatch,'"|"');assert.equal(writes(h)[0].body.p_entry_id,null)});
test('stale expected revision rejects before mutation',async()=>{const h=setup(),e=await h.api.load();h.stored={...h.stored,updated_at:'newer'};await assert.rejects(h.api.saveDraft(e,draft),x=>x.code==='conflict');assert.equal(writes(h).length,0)});
test('closed entry cannot be saved; close capability never sends a request',async()=>{const h=setup({...row(),status:'closed'}),e=await h.api.load();await assert.rejects(h.api.saveDraft(e,draft),x=>x.code==='closed');const n=h.calls.length;assert.equal(h.api.capabilities.close,false);await assert.rejects(h.api.close(e),x=>x.code==='close_unavailable');assert.equal(h.calls.length,n)});
test('403 and 409 are not converted into success or retried',async()=>{for(const status of [403,409]){const h=setup(),e=await h.api.load();h.commit=false;h.mutationError=new Error(`rpc_failed:save:${status}:denied`);await assert.rejects(h.api.saveDraft(e,draft),new RegExp(String(status)));assert.equal(writes(h).length,1)}});
test('lost acknowledgement after commit reconciles without a second write',async()=>{const h=setup(),e=await h.api.load();h.mutationError=new TypeError('lost acknowledgement');const result=await h.api.saveDraft(e,draft);assert.equal(result.title,'New title');assert.equal(writes(h).length,1)});
test('uncertain uncommitted write requires explicit reload before retry',async()=>{const h=setup(),e=await h.api.load();h.commit=false;h.mutationError=new Error('rpc_failed:save:503');await assert.rejects(h.api.saveDraft(e,draft),x=>x.code==='review_required');await assert.rejects(h.api.saveDraft(e,draft),x=>x.code==='review_required');assert.equal(writes(h).length,1);const reviewed=await h.api.load();h.commit=true;h.mutationError=null;await h.api.saveDraft(reviewed,draft);assert.equal(writes(h).length,2)});
test('mismatched or incomplete read response fails closed',async()=>{for(const changed of [{class_id:'other'},{school_id:'other'},{entry_date:'2026-11-10'},{updated_at:''},{activity_link_count:undefined},{plan_id:undefined}]){const h=setup({...row(),...changed});await assert.rejects(h.api.load(),x=>x.code==='invalid_response');assert.equal(writes(h).length,0)}});
test('context changes prevent network requests',async()=>{const h=setup();h.current=false;await assert.rejects(h.api.load(),x=>x.code==='context_changed');assert.equal(h.calls.length,0)});
test('concurrent save is rejected while first operation is in flight',async()=>{let resolveRead;const api=createHostedDiary(session,scope,()=>true,async()=>new Promise(r=>resolveRead=r));const first=api.load();await assert.rejects(api.saveDraft(null,draft),x=>x.code==='busy');resolveRead([]);await first});
test('unmount/session change during read prevents returned data or mutation',async()=>{let current=true,resolveRead;let calls=0;const api=createHostedDiary(session,scope,()=>current,async()=>{calls++;return new Promise(r=>resolveRead=r)});const result=api.saveDraft(null,draft);current=false;resolveRead([]);await assert.rejects(result,x=>x.code==='context_changed');assert.equal(calls,1)});
test('success response with mismatched readback is never reported as saved',async()=>{let count=0;const before=row();const api=createHostedDiary(session,scope,()=>true,async(_s,name)=>{if(name==='teacher_list_class_diary_entries'){count++;return[{...before}]};return{diary_entry_id:before.id}});const expected=await api.load();await assert.rejects(api.saveDraft(expected,draft),x=>x.code==='review_required');assert.equal(count,3);await assert.rejects(api.saveDraft(expected,draft),x=>x.code==='review_required')});
test('lost ack followed by failed readback locks mutation until an explicit successful load',async()=>{let readFails=false,writes=0;const before=row();const api=createHostedDiary(session,scope,()=>true,async(_s,name)=>{if(name==='teacher_list_class_diary_entries'){if(readFails)throw new TypeError('offline');return[{...before}]};writes++;readFails=true;throw new TypeError('lost ack')});const expected=await api.load();await assert.rejects(api.saveDraft(expected,draft),x=>x.code==='review_required');await assert.rejects(api.saveDraft(expected,draft),x=>x.code==='review_required');assert.equal(writes,1)});
test('real library RPC and hosted guard accept canonical session, reject clones and transmit If-Match',async()=>{
 const moduleURL=(name,replacements={})=>{let js=ts.transpileModule(readFileSync(resolve(dirname(sourcePath),`${name}.ts`),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;js=js.replace(/(["'])\.\/readBetaPolicy(?:\.ts)?\1/g,JSON.stringify(new URL('../../mobile/src/services/readBetaPolicy.ts',import.meta.url).href));for(const [key,url]of Object.entries(replacements))js=js.replaceAll(`"./${key}"`,JSON.stringify(url)).replaceAll(`'./${key}'`,JSON.stringify(url));return `data:text/javascript;base64,${Buffer.from(js).toString('base64')}`};
 const coreURL=moduleURL('webSessionCore'),libURL=moduleURL('library',{webSessionCore:coreURL});
 const core=await import(coreURL),realDiary=await import(moduleURL('hostedDiary',{library:libURL}));
 const claims={sub:'synthetic-teacher',exp:Math.floor(Date.now()/1000)+3600};
 const token=`x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
 const raw=JSON.stringify({access_token:token,user:{id:claims.sub},expires_at:claims.exp});
 const guard=core.createSessionGuard(()=>raw,()=>{}),candidate=guard.begin(),canonical=guard.commit(candidate.session,candidate.epoch);
 core.installHostedGuard(()=>({url:'https://backend.invalid',publishableKey:'sb_publishable_test'}),guard);
 let stored=row();const calls=[],originalFetch=globalThis.fetch;
 globalThis.fetch=async(url,init)=>{calls.push({url,init});if(url.endsWith('/teacher_list_class_diary_entries'))return Response.json([stored]);assert.ok(url.endsWith('/teacher_upsert_class_diary_entry'));const body=JSON.parse(init.body);assert.equal(init.headers['If-Match'],'"entry-a|2026-11-09T09:00:00Z"');assert.equal(init.headers.authorization,`Bearer ${token}`);assert.equal(init.headers.apikey,'sb_publishable_test');stored={...stored,title:body.p_title,taught_content:body.p_taught_content,pedagogical_notes:body.p_pedagogical_notes,updated_at:'new-revision'};return Response.json({diary_entry_id:stored.id})};
 try {
  const api=realDiary.createHostedDiary(canonical,scope,()=>true),e=await api.load();assert.equal((await api.saveDraft(e,draft)).title,'New title');assert.equal(calls.length,4);
  const n=calls.length;await assert.rejects(realDiary.createHostedDiary({...canonical},scope,()=>true).load(),/session_unverified/);assert.equal(calls.length,n);
 } finally {globalThis.fetch=originalFetch;guard.invalidate()}
});
