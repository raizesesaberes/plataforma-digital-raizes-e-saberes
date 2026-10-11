import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
export async function runExpoBrowser({base,token,id,communicationId}){
 const dist='/tmp/rs-fase3-expo-dist';assert.ok(existsSync(dist+'/index.html'),'Run node qa/fase3/build-expo-preview.mjs first');
 let loseReply=true,losePublish=true,loseSubmit=true,failQuestions=true,missingBackend=false;let backendCalls=0,failReplyRefresh=false;let releaseSave,releaseReply,saveHeld=false,replyHeld=false;
 const server=createServer(async(req,res)=>{try{
  if(req.url.startsWith('/synthetic-session')){const q=new URL(req.url,'http://local').searchParams;const actor=Number(q.get('actor')||1);if(q.get('unavailable')==='1')missingBackend=true;assert.ok([1,2,5,6].includes(actor));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({actor,enabled:q.get('gate')!=='off',session:{accessToken:token(actor),userId:id(0,actor)}}));return;}
  if(req.url.startsWith('/rest/v1/')){
   backendCalls++;const path=req.url.replace('/rest/v1/','/');if(missingBackend&&path==='/rpc/student_list_assessment_assignments'){missingBackend=false;res.writeHead(404).end('{}');return;}const chunks=[];for await(const chunk of req)chunks.push(chunk);
   if(path==='/rpc/communication_get_reply_thread'&&failReplyRefresh){failReplyRefresh=false;res.writeHead(503).end('{}');return;}
   if(path==='/rpc/content_resolve_question_details_for_user'&&failQuestions){failQuestions=false;res.writeHead(503).end('{}');return;}
   const response=await fetch(base+path,{method:req.method,headers:{Authorization:req.headers.authorization,'Content-Type':'application/json'},body:req.method==='GET'?undefined:Buffer.concat(chunks)});const raw=await response.text();
   const lost=response.ok&&((path==='/rpc/communication_send_reply'&&loseReply)||(path==='/rpc/teacher_schedule_assessment_application_v2'&&losePublish)||(path==='/rpc/student_submit_assessment_attempt_v2'&&loseSubmit));
   if(lost){if(path.includes('communication_send'))loseReply=false;if(path.includes('schedule'))losePublish=false;if(path.includes('submit'))loseSubmit=false;res.writeHead(503).end('{}');return;}
   const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
   if(response.ok&&path==='/rpc/student_save_assessment_response_v2'&&body.p_response_text==='SYNTHETIC A'){saveHeld=true;await new Promise(r=>releaseSave=r);}
   if(response.ok&&path==='/rpc/communication_send_reply'&&body.p_body==='SYNTHETIC DELAYED ACK'){replyHeld=true;await new Promise(r=>releaseReply=r);}
   if(response.ok&&path==='/rpc/communication_send_reply')failReplyRefresh=true;
   res.writeHead(response.status,{'Content-Type':'application/json'}).end(raw);return;
  }
  let file=resolve(dist,decodeURIComponent(req.url.split('?')[0]).replace(/^\//,''));if(!file.startsWith(dist+'/')||!existsSync(file)||req.url.startsWith('/?'))file=dist+'/index.html';
  if(req.url==='/'||req.url.startsWith('/?'))file=dist+'/index.html';
  res.setHeader('Content-Type',extname(file)==='.js'?'text/javascript':extname(file)==='.html'?'text/html':extname(file)==='.css'?'text/css':'application/octet-stream');res.end(readFileSync(file));
 }catch(e){res.writeHead(500).end('synthetic host error');}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(58137,'127.0.0.1',resolve);});
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const teacher=await browser.newPage(),student=await browser.newPage(),other=await browser.newPage(),closed=await browser.newPage();
  const errors=[];for(const page of [teacher,student,other,closed])page.on('pageerror',e=>errors.push(e.message));
  await closed.goto('http://127.0.0.1:58137/?actor=2&gate=off');await closed.getByText('Jornada de avaliações aguardando liberação do backend.').waitFor();assert.equal(await closed.getByRole('button',{name:'Iniciar avaliação'}).count(),0);assert.equal(backendCalls,0);
  await closed.goto('http://127.0.0.1:58137/?actor=2&unavailable=1');await closed.getByText('Serviço indisponível neste ambiente.').waitFor();assert.equal(await closed.getByText('Sem avaliações disponíveis no momento.').count(),0);
  await teacher.goto('http://127.0.0.1:58137/?actor=1');await teacher.getByRole('button',{name:'Turma: SYNTHETIC CLASS 1',exact:true}).click();
  await teacher.getByText(/Não foi possível confirmar/).waitFor();await teacher.getByRole('button',{name:'✓ Turma: SYNTHETIC CLASS 1',exact:true}).click();
  await teacher.getByRole('button',{name:'Synthetic arithmetic',exact:true}).click();
  await teacher.getByRole('textbox',{name:'Título da avaliação'}).fill('SYNTHETIC EXPO BROWSER');await teacher.getByRole('button',{name:'Montar avaliação',exact:true}).click();
  await teacher.getByText('Avaliação salva no servidor. Selecione Publicar para enviar à turma.').waitFor();
  await teacher.getByRole('button',{name:'Publicar na turma selecionada',exact:true}).click();await teacher.getByText('Publicação confirmada no servidor.').waitFor();
  await student.goto('http://127.0.0.1:58137/?actor=2');await student.getByRole('button',{name:'Abrir: SYNTHETIC EXPO BROWSER',exact:true}).click();await student.getByRole('button',{name:'Iniciar avaliação',exact:true}).click();
  await student.getByRole('button',{name:'B: 2',exact:true}).click();await student.getByText('Resposta salva no servidor.').waitFor();
  await student.reload();await student.getByRole('button',{name:'Abrir: SYNTHETIC EXPO BROWSER',exact:true}).click();await student.getByRole('button',{name:'✓ B: 2',exact:true}).waitFor();
  await student.getByRole('button',{name:'Entregar avaliação',exact:true}).click();await student.getByText('Resultado: 100%',{exact:true}).waitFor();
  await teacher.getByRole('button',{name:'Atualizar avaliações',exact:true}).click();await teacher.getByText('Média: 100%',{exact:true}).waitFor();
  for(const title of ['SYNTHETIC FUTURE','SYNTHETIC EXPIRED']) {
    await teacher.getByRole('button',{name:'Avaliação salva: '+title,exact:true}).click();await teacher.getByRole('button',{name:'Publicar na turma selecionada',exact:true}).click();
    await teacher.getByText('Esta turma já possui aplicação futura ou encerrada. Revise o agendamento existente antes de publicar agora.').waitFor();
    assert.equal(await teacher.getByText('Publicação confirmada no servidor.').count(),0);
  }
  await student.getByRole('button',{name:'Abrir: SYNTHETIC OPEN SAVE',exact:true}).click();await student.getByRole('button',{name:'Iniciar avaliação',exact:true}).click();
  const answer=student.getByRole('textbox',{name:'Resposta da questão 1'});await answer.fill('SYNTHETIC A');await student.getByRole('button',{name:'Salvar resposta 1',exact:true}).click();
  while(!saveHeld)await new Promise(r=>setTimeout(r,20));await answer.fill('SYNTHETIC B');releaseSave();await student.getByText('Resposta salva no servidor.').waitFor();assert.equal(await answer.inputValue(),'SYNTHETIC B');
  assert.equal(await student.getByRole('button',{name:'Entregar avaliação',exact:true}).isDisabled(),true);
  await student.getByRole('button',{name:'Salvar resposta 1',exact:true}).click();await student.getByText('Resposta salva no servidor.').waitFor();
  await student.reload();await student.getByRole('button',{name:'Abrir: SYNTHETIC OPEN SAVE',exact:true}).click();await answer.waitFor();assert.equal(await answer.inputValue(),'SYNTHETIC B');
  await other.goto('http://127.0.0.1:58137/?actor=5');await other.getByText('Sem avaliações disponíveis no momento.').waitFor();assert.equal(await other.getByRole('button',{name:'Abrir: SYNTHETIC EXPO BROWSER'}).count(),0);
  await student.getByRole('button',{name:'Recados',exact:true}).click();await student.getByRole('button',{name:'Responder: SYNTHETIC EXPO NOTICE',exact:true}).click();
  await student.getByRole('textbox',{name:'Sua resposta'}).fill('SYNTHETIC EXPO RESPONSE');await student.getByRole('button',{name:'Enviar resposta',exact:true}).click();await student.getByText(/Não foi possível confirmar/).waitFor();
  await student.getByRole('button',{name:'Fechar conversa'}).click();await student.getByRole('button',{name:'Responder: SYNTHETIC EXPO NOTICE',exact:true}).click();await student.getByRole('button',{name:'Enviar resposta',exact:true}).click();await student.getByText('Resposta confirmada no servidor.').waitFor();
  await student.getByText(/Não foi possível atualizar a conversa/).waitFor();
  await student.getByRole('textbox',{name:'Sua resposta'}).fill('SYNTHETIC DELAYED ACK');await student.getByRole('button',{name:'Enviar resposta',exact:true}).click();
  while(!replyHeld)await new Promise(r=>setTimeout(r,20));
  await student.getByRole('button',{name:'Fechar conversa'}).click();await student.getByRole('button',{name:'Responder: SYNTHETIC EXPO NOTICE',exact:true}).click();
  await student.getByRole('textbox',{name:'Sua resposta'}).waitFor();releaseReply();
  await student.waitForFunction(()=>Array.from(document.querySelectorAll('textarea,input')).find(x=>x.getAttribute('aria-label')==='Sua resposta')?.value==='');
  assert.equal(await student.getByRole('button',{name:'Enviar resposta',exact:true}).isDisabled(),true);
  await teacher.getByRole('button',{name:'Recados',exact:true}).click();await teacher.getByRole('button',{name:'Conversas: SYNTHETIC EXPO NOTICE',exact:true}).click();await teacher.getByRole('button',{name:/SYNTHETIC 2 · Aluno: SYNTHETIC STUDENT A · 2 resposta/}).click();
  await teacher.getByRole('textbox',{name:'Sua resposta'}).fill('SYNTHETIC EXPO TEACHER RETURN');await teacher.getByRole('button',{name:'Enviar resposta',exact:true}).click();await teacher.getByText('Resposta confirmada no servidor.').waitFor();
  await student.getByRole('button',{name:'Atualizar conversa',exact:true}).click();await student.getByText(/SYNTHETIC EXPO TEACHER RETURN/).waitFor();
  await teacher.getByRole('button',{name:'Fechar conversa'}).click();await teacher.getByRole('button',{name:'Editar / Versões: SYNTHETIC EXPO NOTICE',exact:true}).click();await teacher.getByRole('textbox',{name:'Título do recado'}).fill('SYNTHETIC EXPO EDITED');await teacher.getByRole('button',{name:'Salvar nova versão',exact:true}).click();await teacher.getByText('Nova versão confirmada no servidor.').waitFor();
  await student.reload();await student.getByRole('button',{name:'Recados',exact:true}).click();await student.getByRole('button',{name:'Versão / Leitura: SYNTHETIC EXPO EDITED',exact:true}).click();await student.getByRole('button',{name:'Confirmar leitura desta versão',exact:true}).click();await student.getByText('Leitura confirmada no servidor.').waitFor();
  assert.equal(await student.getByRole('button',{name:'Salvar nova versão',exact:true}).count(),0);
  const family=await browser.newPage();await family.goto('http://127.0.0.1:58137/?actor=6');await family.getByRole('button',{name:'Recados',exact:true}).click();await family.getByRole('button',{name:'Responder: SYNTHETIC EXPO EDITED',exact:true}).click();await family.getByRole('textbox',{name:'Sua resposta'}).fill('SYNTHETIC FAMILY RESPONSE');await family.getByRole('button',{name:'Enviar resposta',exact:true}).click();await family.getByText('Resposta confirmada no servidor.').waitFor();assert.equal(await family.getByRole('button',{name:'Salvar nova versão',exact:true}).count(),0);

  await student.setViewportSize({width:390,height:844});await student.screenshot({path:'qa/fase3/expo-browser.png',fullPage:true});assert.deepEqual(errors,[]);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
