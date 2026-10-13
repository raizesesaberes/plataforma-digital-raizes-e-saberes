import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createServer} from 'node:http';import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const source=readFileSync('app-pages.js','utf8').replace(/renderAppPage\(\);\s*$/,'');
const server=createServer((req,res)=>{
 const url=new URL(req.url,'http://local');
 if(url.pathname==='/app.js'||url.pathname==='/teacher-messages.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(url.pathname==='/app.js'?source:readFileSync('teacher-messages.js'));}
 const kind=url.pathname.includes('professor-turma')?'professorTurma':url.pathname.includes('professor-aluno')?'professorAluno':'professor';
 res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<html><body><div data-app-page="${kind}"><section data-teacher-workspace><nav id="nav"></nav>${kind==='professor'?'<div data-teacher-home>Início sintético</div><div data-teacher-content hidden></div>':'<h1>Contexto sintético</h1>'}</section></div><script>
 const token='x.'+btoa(JSON.stringify({sub:'synthetic-teacher',exp:9999999999,app_metadata:{platform_role:'professor'}}))+'.x';localStorage.setItem('raizes:supabase-auth-session',JSON.stringify({access_token:token}));localStorage.setItem('raizes:supabase-access-token',token);</script><script src="/teacher-messages.js"></script><script src="/app.js"></script><script>
 teacherInstitutionalState.status='ready';teacherInstitutionalState.hydratedDom=true;teacherInstitutionalState.classes=[{id:'class-a',schoolId:'school-a',name:'Turma A',schoolName:'Escola A'}];teacherInstitutionalState.studentsById={'student-a':{id:'student-a',classId:'class-a',name:'Aluno A'}};document.querySelector('#nav').innerHTML=renderTeacherSidebar('inicio');initTeacherWorkspace();
 </script></body></html>`);
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
 for(const path of ['/professor.html','/professor-turma.html?id=class-a','/professor-aluno.html?id=student-a']){
  const page=await browser.newPage();page.setDefaultTimeout(8000);page.setDefaultNavigationTimeout(8000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.goto(origin+path);await page.locator('#nav [data-teacher-view="mensagens"]').click();await page.waitForURL(url=>url.pathname==='/professor.html'&&url.searchParams.get('view')==='mensagens');await page.locator('[data-teacher-messages]').waitFor();
  if(path!=='/professor.html'){assert.equal(new URL(page.url()).searchParams.get('message_class_id'),'class-a');assert.equal(await page.locator('[name=classId]').inputValue(),'class-a');}
  await page.goBack();await page.waitForURL(origin+path);if(path==='/professor.html')assert(await page.locator('[data-teacher-content]').isHidden());else await page.getByText('Contexto sintético',{exact:true}).waitFor();
  await page.goForward();await page.waitForURL(url=>url.pathname==='/professor.html'&&url.searchParams.get('view')==='mensagens');await page.locator('[data-teacher-messages]').waitFor();assert.deepEqual(errors,[]);await page.close();
  console.log('PASS actual initTeacherWorkspace/sidebar: '+path+' → Messages, current authorized class preserved, browser back/forward restored.');
 }
 const page=await browser.newPage();await page.goto(origin+'/professor-turma.html?id=foreign');await page.locator('#nav [data-teacher-view="mensagens"]').click();await page.waitForURL(url=>url.pathname==='/professor.html'&&url.searchParams.get('view')==='mensagens');assert.equal(new URL(page.url()).searchParams.get('message_class_id'),null);await page.close();console.log('PASS unknown class is not silently substituted or carried into Messages.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
