import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const output=process.env.REGISTER_QA_DIR || '/tmp/teacher-register-qa';mkdirSync(output,{recursive:true});
const source=readFileSync('app-pages.js','utf8').replace('const createSupabaseRestClient =','const unusedRealClient =').replace(/renderAppPage\(\);\s*$/,'')+`\nconst createSupabaseRestClient=()=>({isConfigured:true,request:window.syntheticRequest});`;
const fixture=`
const token='x.'+btoa(JSON.stringify({sub:'teacher-synthetic',exp:9999999999,app_metadata:{platform_role:'professor'}}))+'.x';
localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:token}));localStorage.setItem('raizes:supabase-access-token',token);
window.calls=[];window.attendance=[];window.diary=[];
window.syntheticRequest=async(path,query,options={})=>{
 const body=options.body?JSON.parse(options.body):{};window.calls.push({path,body});
 if(path==='attendance_records')return window.attendance;
 if(path==='rpc/teacher_set_attendance_records'){window.attendance=body.p_records.map(r=>({...r,class_id:body.p_class_id,attendance_date:body.p_attendance_date,updated_at:'2026-11-05T12:00:00Z'}));return {saved:body.p_records.length};}
 if(path==='rpc/teacher_list_class_diary_entries')return window.diary;
 if(path==='rpc/teacher_upsert_class_diary_entry'){window.diary=[{id:'diary-synthetic',class_id:body.p_class_id,school_id:body.p_school_id,entry_date:body.p_entry_date,title:body.p_title,taught_content:body.p_taught_content,pedagogical_notes:body.p_pedagogical_notes,status:'draft',updated_at:'2026-11-05T12:00:00Z'}];return {diary_entry_id:'diary-synthetic'};}
 if(path==='rpc/teacher_close_class_diary_entry'){window.diary[0].status='closed';return {diary_entry_id:'diary-synthetic'};}
 throw Error('Unexpected synthetic request '+path);
};
const params=new URLSearchParams(location.search), view=params.get('tab')||params.get('view')||'diario',cid=params.get('id')||'class-a';
const classes=[{id:'class-a',schoolId:'school-a',schoolName:'Escola Sintética',name:'Turma A — Educação Infantil',shift:'Manhã'},{id:'class-b',schoolId:'school-a',schoolName:'Escola Sintética',name:'Turma B — Nome extenso para verificar a leitura em telas pequenas',shift:'Tarde'},{id:'class-other',schoolId:'school-other',name:'Turma de outra escola'}];
const students=[{id:'student-a',name:'Estudante Sintético A',classId:cid,schoolId:'school-a'},{id:'student-b',name:'Estudante Sintético B com nome extenso',classId:cid,schoolId:'school-a'}];
Object.assign(teacherInstitutionalState,{status:'ready',hydratedDom:true,profile:{id:'teacher-synthetic',schoolId:params.has('school')?params.get('school'):'school-a',displayName:'Professora Sintética'},schools:[{id:'school-a',name:'Escola Sintética',status:'active'},{id:'school-empty',name:'Escola sem turmas',status:'active'}],classes:params.has('empty')?[]:classes,studentsByClass:{[cid]:students},studentsById:Object.fromEntries(students.map(s=>[s.id,s]))});
Object.assign(teacherAttendanceState,{status:'ready',key:getTeacherAttendanceKey(cid,getTeacherAttendanceDate()),records:[],saving:false});
Object.assign(teacherDiaryState,{status:'ready',key:getTeacherDiaryKey(cid,getTeacherDiaryDate()),entries:[],saving:false});
Object.assign(teacherPlanningState,{status:'ready',plans:[]});
Object.assign(teacherDiaryPeriodState,{status:'ready',key:getTeacherDiaryPeriodKey(cid,getTeacherDiaryPeriodRange().from,getTeacherDiaryPeriodRange().to),summary:{diary_entries:[],planned_items:[],individual_notes:[]}});
window.mount=()=>{document.querySelector('[data-app-page]').innerHTML=location.pathname.includes('professor-turma')?renderTeacherClassPage():'<section class="teacher-workspace teacher-pilot rs-workspace" data-teacher-workspace>'+renderTeacherSidebar(view)+'<div class="tw-main"><main class="tw-content">'+renderTeacherRegisterClasses(view)+'</main></div></section>';initTeacherWorkspace();};mount();
`;
const server=createServer((req,res)=>{
 const path=new URL(req.url,'http://local').pathname;
 if(path==='/app.js'){res.setHeader('Content-Type','text/javascript');return res.end(source);}
 if(['/styles.css','/master-pack.css'].includes(path)){res.setHeader('Content-Type','text/css');return res.end(readFileSync(path.slice(1)));}
 if(path.endsWith('.png')){res.statusCode=404;return res.end();}
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/master-pack.css"></head><body class="master-app"><div data-app-page="'+(path.includes('professor-turma')?'professorTurma':'professor')+'"></div><script src="/app.js"></script><script>'+fixture+'</script></body></html>');
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 for(const width of [1440,768,390,320]){
  const page=await browser.newPage({viewport:{width,height:1000},timezoneId:'UTC'}),errors=[];
  page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  for(const view of ['diario','frequencia']){
   await page.goto(origin+'/professor.html?view='+view+'&school=school-a');
   assert.deepEqual(await page.locator('[data-teacher-register-class] option').evaluateAll(ns=>ns.map(n=>n.value)),['','class-a','class-b']);
   assert.equal(await page.locator('.tw-register-class-list a').count(),2);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'picker overflow '+width);
   if(width===1440||width===390)await page.screenshot({path:output+'/picker-'+view+'-'+width+'.png',fullPage:true});
   await page.locator('[data-teacher-register-class]').selectOption('class-a');await page.waitForURL(u=>u.pathname==='/professor-turma.html'&&u.searchParams.get('id')==='class-a');
   assert.equal(new URL(page.url()).searchParams.get('tab'),view);
   assert.equal(await page.locator('[data-teacher-register-class]').inputValue(),'class-a');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'panel overflow '+view+' '+width);
   assert(await page.locator('.tw-register-hero h1').evaluate(n=>parseFloat(getComputedStyle(n).fontSize)<=26));
   if(width===1440||width===390)await page.screenshot({path:output+'/'+view+'-'+width+'.png',fullPage:true});
   const print=page.locator('[data-rs-print="'+(view==='diario'?'teacher-diary':'teacher-attendance')+'"]');assert.equal(await print.count(),1);
   if(view==='frequencia'){
    await page.locator('[data-attendance-mark-all]').click();assert.equal(await page.locator('input[type=radio]:checked').count(),2);
    await page.locator('[name=attendance_student-b][value=absent]').check();await page.locator('[name=notes_student-b]').fill('Observação sintética');
    await page.locator('[data-teacher-attendance-form] [type=submit]').click();await page.waitForFunction(()=>calls.some(c=>c.path==='rpc/teacher_set_attendance_records')&&teacherAttendanceState.status==='ready'&&!teacherAttendanceState.saving);
    assert.equal(await page.evaluate(()=>attendance.find(r=>r.student_id==='student-b').status),'absent');
    assert.equal(await page.evaluate(()=>attendance.find(r=>r.student_id==='student-b').notes),'Observação sintética');
    await page.evaluate(()=>{teacherAttendanceState.status='error';teacherAttendanceState.error='Falha sintética';mount();});
    assert(await page.locator('[data-teacher-attendance-form] [type=submit]').isDisabled());
    await page.locator('[data-attendance-reload]').click();await page.waitForFunction(()=>teacherAttendanceState.status==='ready');
   }else{
    await page.locator('[name=taughtContent]').fill('Conteúdo sintético para conferir o formulário.');
    await page.locator('[data-teacher-diary-form] [type=submit]').click();await page.waitForFunction(()=>calls.some(c=>c.path==='rpc/teacher_upsert_class_diary_entry')&&!teacherDiaryState.saving);
    assert.equal(await page.locator('[name=taughtContent]').inputValue(),'Conteúdo sintético para conferir o formulário.');
    await page.locator('[data-teacher-diary-close]').click();await page.waitForFunction(()=>diary[0]?.status==='closed'&&!teacherDiaryState.saving);
    assert(await page.locator('[name=taughtContent]').isDisabled());assert(await page.locator('[data-teacher-diary-form] [type=submit]').isDisabled());
   }
   await page.goto(origin+'/professor-turma.html?id=class-a&school=school-a&tab='+view+'&'+(view==='diario'?'diaryDate':'date')+'=2026-11-04');
   await page.locator('[data-teacher-register-class]').selectOption('class-b');await page.waitForURL(u=>u.searchParams.get('id')==='class-b');
   assert.equal(new URL(page.url()).searchParams.get(view==='diario'?'diaryDate':'date'),'2026-11-04');
   const before=page.url();await page.evaluate(()=>{const n=document.querySelector('[data-teacher-register-class]');n.add(new Option('Forged','class-other'));n.value='class-other';n.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(page.url(),before);
   await page.evaluate(()=>{teacherAttendanceState.saving=true;mount();});assert(await page.locator('[data-teacher-register-class]').isDisabled());
   await page.goto(origin+'/professor.html?view='+view+'&school=school-empty&empty=1');assert(await page.locator('[data-teacher-register-class]').isDisabled());assert.match(await page.locator('[data-teacher-register-classes]').innerText(),/Nenhuma turma autorizada/);
   await page.goto(origin+'/professor.html?view='+view+'&school=');assert(await page.locator('[data-teacher-register-class]').isDisabled());assert.match(await page.locator('[data-teacher-register-classes]').innerText(),/Selecione uma escola autorizada/);
  }
  assert.deepEqual(errors,[]);console.log('PASS '+width+'px: school-scoped picker, class navigation/date, forged class denial, save locks, attendance save/reload, diary save/close, print hooks, empty states, no overflow or JS errors.');await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
