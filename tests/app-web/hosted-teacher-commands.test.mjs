import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
const source=resolve('mobile/src/services/hostedTeacherCommands.ts');
const ts=createRequire(source)('typescript');
function setup(){
 const module={exports:{}};vm.runInNewContext(ts.transpileModule(readFileSync(source,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,Error,Date,Set,Map,WeakSet,Object,require(){return{}}});
 let current=true, records=[], fail=null, calls=[], readFail=false, responseId='notice-1', changed=false;
 const session={userId:'teacher-1',accessToken:'token'},students=[{id:'a',name:'Alex'},{id:'b',name:'Alex'}];
 const classes=[{id:'c1',schoolId:'s1',name:'Turma A'},{id:'c2',schoolId:'s1',name:'Turma A'}];
 let published;
 let enrollments=students.map(s=>({id:'enrollment-'+s.id,student_id:s.id,school_id:'s1',status:'active',enrolled_date:'2026-01-01',ended_date:null,students:{nome:s.name,status:'active'}}));
 const io={classes:async()=>classes,students:async(_s,c)=>{calls.push({roster:c});return students},messages:async()=>[],read:async(_s,path)=>{calls.push({read:path});if(readFail)throw Error('offline');return path.startsWith('enrollments')?enrollments.map(r=>({...r,class_id:r.class_id??(path.includes('class_id=eq.c2')?'c2':'c1')})):path.startsWith('attendance')?records.map(r=>({...r})):published?[published]:[];},rpc:async(_s,name,body)=>{
 calls.push({name,body});if(fail)throw fail;
 if(name==='teacher_set_attendance_records')records=body.p_records.map(r=>({id:r.student_id,student_id:r.student_id,school_id:'s1',class_id:body.p_class_id,attendance_date:body.p_attendance_date,status:changed?'absent':r.status,notes:r.notes,updated_at:'2026-11-09T10:00:00Z'}));
 else published={id:responseId,school_id:body.p_school_id,class_id:body.p_class_id,student_id:body.p_student_id,author_profile_id:'teacher-1',audience_type:body.p_audience_type,title:body.p_title,body:body.p_body,communication_date:body.p_communication_date,status:'published'};
 return{communication_id:responseId};}};
 const api=module.exports.createHostedTeacherCommands(session,()=>current,io);
 return{api,session,io,students,classes,calls,valid:module.exports.validTeacherDate,set enrollments(v){enrollments=v},set current(v){current=v},set fail(v){fail=v},set records(v){records=v},set readFail(v){readFail=v},set changed(v){changed=v},set responseId(v){responseId=v}};
}
const draft={classId:'c2',studentId:'b',audience:'student',date:'2026-11-09',title:'Título',body:'Mensagem'};
const writes=h=>h.calls.filter(c=>c.name);
test('dates validate leap years and reject rollovers',()=>{const h=setup();assert.ok(h.valid('2024-02-29'));for(const d of ['2026-02-29','2026-13-01','2026-11-31','09/11/2026',''])assert.equal(h.valid(d),false);});
test('homonymous classes and students retain IDs; unmarked students are not present',async()=>{const h=setup();const r=await h.api.attendance('c2','2026-11-08');assert.equal(r.schoolClass.id,'c2');assert.deepEqual(Array.from(r.students,s=>s.id),['a','b']);assert.ok(r.students.every(s=>s.attendance===null));assert.ok(h.calls.find(c=>c.read?.startsWith('attendance'))?.read.includes('class_id=eq.c2&attendance_date=eq.2026-11-08'));});
test('invalid class or date makes no mutation and no roster read',async()=>{const h=setup();await assert.rejects(h.api.attendance('wrong','2026-11-09'),e=>e.code==='invalid_selection');await assert.rejects(h.api.attendance('c1','2026-02-30'),e=>e.code==='invalid_selection');assert.equal(h.calls.length,0);});
test('attendance saves explicit IDs, selected date and null expected revision; verifies readback',async()=>{const h=setup();const r=await h.api.attendance('c2','2026-11-08');const saved=await h.api.saveAttendance(r,{a:'absent',b:'present'});const w=writes(h)[0];assert.equal(w.body.p_attendance_date,'2026-11-08');assert.equal(w.body.p_class_id,'c2');assert.equal(w.body.p_records[0].expected_updated_at,null);assert.equal(saved.students[1].attendance,'present');assert.equal(writes(h).length,1);});
test('existing revision and notes survive saving; no student default',async()=>{const h=setup();h.records=[{id:'record',student_id:'a',school_id:'s1',class_id:'c1',attendance_date:'2026-11-09',status:'absent',notes:'Nota original',updated_at:'old-revision'}];const r=await h.api.attendance('c1','2026-11-09');await assert.rejects(h.api.saveAttendance(r,{a:'present'}),e=>e.code==='invalid_selection');await h.api.saveAttendance(r,{a:'present',b:'justified'});assert.equal(writes(h)[0].body.p_records[0].notes,'Nota original');assert.equal(writes(h)[0].body.p_records[0].expected_updated_at,'old-revision');});
test('conflict, mismatched readback and network failure block retry until explicit read',async()=>{for(const mode of ['conflict','network','mismatch']){const h=setup();const r=await h.api.attendance('c1','2026-11-09');if(mode==='conflict')h.fail=Error('rpc_failed:save:409:PT409');if(mode==='network')h.fail=Error('offline');if(mode==='mismatch')h.changed=true;await assert.rejects(h.api.saveAttendance(r,{a:'present',b:'present'}));await assert.rejects(h.api.saveAttendance(r,{a:'present',b:'present'}),e=>e.code==='review_required');assert.equal(writes(h).length,1);}});
test('student destination never widens to class when invalid',async()=>{const h=setup();await assert.rejects(h.api.publish({...draft,studentId:'missing'}),e=>e.code==='invalid_selection');await assert.rejects(h.api.publish({...draft,studentId:null}),e=>e.code==='invalid_selection');assert.equal(writes(h).length,0);});
test('publication verifies the returned ID and exact destination, not title',async()=>{const h=setup();assert.equal(await h.api.publish(draft),'notice-1');assert.equal(writes(h)[0].body.p_student_id,'b');assert.equal(writes(h)[0].body.p_class_id,'c2');assert.ok(h.calls.some(c=>c.read?.endsWith('id=eq.notice-1')));});
test('lost acknowledgement and invalid success payload never retry or report success',async()=>{for(const mode of ['lost','missing']){const h=setup();if(mode==='lost')h.fail=Error('offline');else h.responseId=null;await assert.rejects(h.api.publish(draft),e=>e.code==='uncertain');await assert.rejects(h.api.publish(draft),e=>e.code==='uncertain');assert.equal(writes(h).length,1);}});
test('session invalidation and changed token prevent requests',async()=>{for(const mode of ['expired','token']){const h=setup();if(mode==='expired')h.current=false;else h.session.accessToken='different';await assert.rejects(h.api.publish(draft),e=>e.code==='context_changed');assert.equal(h.calls.length,0);}});
test('cancel during roster read prevents publication; concurrent action blocked',async()=>{const h=setup();let release;h.io.classes=()=>new Promise(r=>release=r);const pending=h.api.publish(draft);await assert.rejects(h.api.messages(),e=>e.code==='busy');h.current=false;release(h.classes);await assert.rejects(pending,e=>e.code==='context_changed');assert.equal(writes(h).length,0);});
test('read failure provides no fixture fallback',async()=>{const h=setup();h.readFail=true;await assert.rejects(h.api.attendance('c1','2026-11-09'),/offline/);assert.equal(writes(h).length,0);});
test('hosted shell intercepts both legacy write routes, accessibility and library',()=>{const shell=readFileSync('mobile/src/AppShell.tsx','utf8');assert.match(shell,/HostedTeacherCommands session=\{session\}/);assert.match(shell,/hosted && String\(route.key\) === "profile:accessibility"/);assert.match(shell,/renderLibrary \? renderLibrary\(\) : <EmptyState/);});
test('teacher command guard reaches global platform exit and clears on unmount',()=>{
 const shell=readFileSync('mobile/src/AppShell.tsx','utf8');
 assert.match(shell,/registerHostedLeaveGuard\?: \(guard: \(\(\) => boolean\) \| null\) => void/);
 const start=shell.indexOf('  const commandLeave = useRef');
 const end=shell.indexOf('  const navigation =',start);
 let cleanup;const registered=[];
 const hooks={useRef:v=>({current:v}),useCallback:fn=>fn,useEffect:fn=>{cleanup=fn();},registerHostedLeaveGuard:g=>registered.push(g)};
 const code=ts.transpileModule(shell.slice(start,end)+'\nmodule.exports={commandLeave,registerCommandLeave};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const module={exports:{}};vm.runInNewContext(code,{...hooks,module});
 const {commandLeave,registerCommandLeave}=module.exports;
 let dirty=true;const guard=()=>!dirty;
 registerCommandLeave(guard);assert.equal(commandLeave.current(),false);assert.equal(registered.at(-1)(),false);
 dirty=false;assert.equal(registered.at(-1)(),true);
 registerCommandLeave(null);assert.equal(commandLeave.current,null);assert.equal(registered.at(-1),null);
 registerCommandLeave(guard);cleanup();assert.equal(commandLeave.current,null);assert.equal(registered.at(-1),null);
 const count=registered.length;cleanup();assert.equal(registered.length,count,'cleanup must not clear a guard belonging to another screen');
});
test('historical attendance uses database date casts, includes boundary days and deduplicates enrollment',async()=>{
 const h=setup();const row=(id,start,end=null)=>({id:`enroll-${id}-${start}`,student_id:id,school_id:'s1',status:'active',enrolled_date:start,ended_date:end,students:{nome:'Alex',status:'active'}});
 h.enrollments=[row('before','2026-11-10'),row('after','2026-01-01','2026-11-08'),row('boundary','2026-11-09','2026-11-09'),row('boundary','2026-01-01'),row('open',null)];
 const snapshot=await h.api.attendance('c1','2026-11-09');assert.deepEqual(Array.from(snapshot.students,s=>s.id),['boundary','open']);
 const path=h.calls.find(c=>c.read?.startsWith('enrollments')).read;assert.ok(path.includes('enrolled_date:enrolled_at::date,ended_date:ended_at::date'));assert.ok(path.includes('school_id=eq.s1&class_id=eq.c1&status=eq.active'));
 await h.api.saveAttendance(snapshot,{boundary:'present',open:'absent'});assert.equal(writes(h)[0].body.p_records.length,2);
});
test('communication recipients exclude ended enrollment; invalid enrollment date fails closed',async()=>{
 const h=setup();h.enrollments=[{id:'e',student_id:'b',school_id:'s1',status:'active',enrolled_date:'2026-01-01',ended_date:'2026-11-09',students:{nome:'Alex',status:'active'}}];
 await assert.rejects(h.api.publish(draft),e=>e.code==='invalid_selection');assert.equal(writes(h).length,0);assert.ok(h.calls.find(c=>c.read)?.read.includes('ended_at=is.null'));
 h.enrollments=[{id:'e',student_id:'b',school_id:'s1',status:'active',enrolled_date:'2026-02-30',ended_date:null,students:{nome:'Alex',status:'active'}}];await assert.rejects(h.api.attendance('c1','2026-11-09'),e=>e.code==='invalid_response');
});
