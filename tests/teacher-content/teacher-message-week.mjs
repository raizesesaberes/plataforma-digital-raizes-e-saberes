import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=readFileSync('app-pages.js','utf8').replace(/renderAppPage\(\);\s*$/,'');
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/app.js'?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(req.url==='/app.js'?source:'<html><body><main id="fixture"></main><script src="/app.js"></script></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for (const width of [1440,390]) {
  const page=await browser.newPage({viewport:{width,height:900},timezoneId:'UTC'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);
  const actual=await page.evaluate(()=>{
   const day='2026-10-13';
   const agenda=['class_calendar','school_calendar','assessment_available','assessment_deadline'].map(source_type=>mapUnifiedCalendarEvent({source_id:source_type,source_type,event_date:day,start_time:'09:00:00',status:'published',title:source_type,student_id:source_type.startsWith('assessment')?'synthetic-student':null}));
   const privateRows=['student','family','student_family'].map(recipient_scope=>({id:recipient_scope,source_id:recipient_scope,source_type:'communication',communication_type:'message',audience_type:'student',recipient_scope,student_id:'synthetic-student',event_date:day,status:'published',title:'Private '+recipient_scope}));
   const all=[...agenda,...privateRows.map(mapUnifiedCalendarEvent),mapUnifiedCalendarEvent({...privateRows[0],source_type:undefined}),mapUnifiedCalendarEvent({source_id:'draft',source_type:'class_calendar',event_date:day,status:'draft'}),mapUnifiedCalendarEvent({source_id:'another-day',source_type:'class_calendar',event_date:'2026-10-14',status:'published'})];
   studentInstitutionalState.entries=all;familyInstitutionalState.entries=all;
   const student=getStudentInstitutionalEntriesForDate(day).map(e=>e.id),family=getFamilyEntriesForDate(day).map(e=>e.id);
   const grouped=getFamilyInstitutionalEntriesByDay('2026-10-12').ter.map(e=>e.id);
   const rendered=renderStudentInstitutionalWeekCell(day);document.querySelector('#fixture').innerHTML=rendered;
   teacherClassMessagesState.messages=[{id:'public-class',audienceType:'class',entry_date:day,status:'published'},...privateRows.map(e=>({id:e.id,audienceType:'student',entry_date:day,status:'published'}))];
   return {student,family,grouped,teacher:getTeacherClassMessagesForDate(day).map(e=>e.id),html:rendered};
  });
  for(const list of [actual.student,actual.family,actual.grouped])assert.deepEqual(list,['class_calendar','school_calendar','assessment_available','assessment_deadline']);
  assert.deepEqual(actual.teacher,['public-class']);assert(!actual.html.includes('Private'));assert.deepEqual(errors,[]);
  console.log(`PASS ${width}px: real mapper + student/family weekly selectors preserve class/school calendar and individual assessment availability/deadline; all private recipient scopes and untagged communication rows excluded; teacher class messages preserved.`);
  await page.close();
 }
} finally {await browser.close();await new Promise(r=>server.close(r));}
