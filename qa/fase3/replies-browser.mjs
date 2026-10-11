import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
const require=createRequire(import.meta.url);
const { chromium }=require('playwright');

// Focused browser integration: actual reply component + actual student-card renderer,
// real local PostgREST. The enclosing page is a synthetic host, not the full app shell.
export async function runReplyBrowser({base,token,communicationId,deliveryId}) {
 const source=readFileSync('app-pages.js','utf8');
 const start=source.indexOf('const renderStudentInboxCard =');
 const end=source.indexOf('const renderStudentInboxList =',start);
 assert.ok(start>=0 && end>start);
 const escape=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
 const fixtureFlags={RAIZES_COMMUNICATION_REPLIES_ENABLED:false};
 const render=new Function('globalThis','premiumIcon','printableEscape','getActiveStudentProfile','communicationDeliveryStateLabel','resolveCommunicationDeepLink',`${source.slice(start,end)};return renderStudentInboxCard;`)(fixtureFlags,()=>'',escape,()=>({className:'Synthetic class'}),()=> 'Não lido',x=>x);
 assert.ok(!render({deliveryId,id:communicationId,title:'Gate closed',sourceType:''}).includes('data-communication-delivery'));
 fixtureFlags.RAIZES_COMMUNICATION_REPLIES_ENABLED=true;
 let failNextSend=true;
 let loseCommittedResponse=true;
 const server=createServer(async(req,res)=>{
  try{
   if(['/styles.css','/master-pack.css'].includes(req.url)){res.setHeader('Content-Type','text/css');res.end(readFileSync(req.url.slice(1)));return;}
   if(req.url==='/communication-replies.js'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync('communication-replies.js'));return;}
   if(req.url.startsWith('/backend/rpc/')){
    const name=req.url.slice('/backend/rpc/'.length);
    if(!['communication_send_reply','communication_get_reply_thread','communication_list_reply_threads'].includes(name)){res.writeHead(404).end();return;}
    if(name==='communication_send_reply'&&failNextSend){failNextSend=false;res.writeHead(503,{'Content-Type':'application/json'}).end('{"message":"synthetic transient failure"}');return;}
    const chunks=[];for await(const chunk of req)chunks.push(chunk);
    const response=await fetch(`${base}/rpc/${name}`,{method:'POST',headers:{Authorization:req.headers.authorization,'Content-Type':'application/json'},body:Buffer.concat(chunks)});
    const payload=await response.text();
    if(name==='communication_send_reply'&&response.ok&&loseCommittedResponse){
     loseCommittedResponse=false;
     res.writeHead(503,{'Content-Type':'application/json'}).end('{"message":"synthetic response lost after commit"}');return;
    }
    res.writeHead(response.status,{'Content-Type':'application/json'}).end(payload);return;
   }
   const role=req.url==='/teacher'?1:req.url==='/other-school'?5:2;
   const button=role===1?`<button data-communication-replies="${communicationId}">Ver respostas / Responder</button>`:render({deliveryId,id:communicationId,title:'Synthetic browser notice',text:'Fictional notice',sourceType:''});
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end(`<!doctype html><html lang="pt-BR"><title>Synthetic reply test</title><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/master-pack.css"><body class="master-app">${button}<script>
   globalThis.RAIZES_COMMUNICATION_REPLIES_ENABLED=true;
   async function resolveSupabaseUserContext(){return {userId:'synthetic-actor-${role}'};}
   function createSupabaseRestClient(){return {request:async(path,query,options)=>{const response=await fetch('/backend/'+path,{...options,headers:{Authorization:'Bearer ${token(role)}','Content-Type':'application/json'}});if(!response.ok)throw new Error('request failed');return response.json();}};}
   </script><script src="/communication-replies.js"></script></body></html>`);
  }catch(error){res.writeHead(500).end('Synthetic harness error');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  const student=await browser.newPage();const teacher=await browser.newPage();
  const errors=[];student.on('pageerror',e=>errors.push(e.message));teacher.on('pageerror',e=>errors.push(e.message));
  await student.goto(origin+'/student');await student.getByRole('button',{name:'Ver respostas / Responder'}).click();
  const text='SYNTHETIC <img src=x onerror="window.replyXss=true"> aluno';
  await student.getByRole('textbox',{name:'Sua resposta'}).fill(text);
  await student.getByRole('button',{name:'Enviar resposta'}).click();
  await student.getByRole('status').filter({hasText:'Seu texto foi mantido'}).waitFor();
  assert.equal(await student.getByRole('textbox',{name:'Sua resposta'}).inputValue(),text);
  await student.getByRole('button',{name:'Enviar resposta'}).click();
  // This request committed in PostgreSQL, but its HTTP acknowledgement was lost.
  await student.getByRole('status').filter({hasText:'Seu texto foi mantido'}).waitFor();
  await student.getByRole('button',{name:'Fechar',exact:true}).click();
  await student.getByRole('button',{name:'Ver respostas / Responder'}).click();
  assert.equal(await student.getByRole('textbox',{name:'Sua resposta'}).inputValue(),text);
  assert.equal(await student.locator('[data-reply-messages] article').count(),1);
  await student.getByRole('button',{name:'Enviar resposta'}).click();
  await student.getByRole('status').filter({hasText:'Resposta enviada.'}).waitFor();
  assert.equal(await student.locator('[data-reply-messages] article').count(),1);
  await student.locator('[data-reply-messages]').getByText(text,{exact:true}).waitFor();
  assert.equal(await student.evaluate(()=>window.replyXss),undefined);
  await teacher.goto(origin+'/teacher');await teacher.getByRole('button',{name:'Ver respostas / Responder'}).click();
  await teacher.getByRole('button',{name:/SYNTHETIC 2.*1 resposta/}).click();
  await teacher.locator('[data-reply-messages]').getByText(text,{exact:true}).waitFor();
  await teacher.getByRole('textbox',{name:'Sua resposta'}).fill('SYNTHETIC teacher browser return');
  await teacher.getByRole('button',{name:'Enviar resposta'}).click();
  await teacher.getByRole('status').filter({hasText:'Resposta enviada.'}).waitFor();
  await student.reload();await student.getByRole('button',{name:'Ver respostas / Responder'}).click();
  await student.locator('[data-reply-messages]').getByText('SYNTHETIC teacher browser return',{exact:true}).waitFor();
  assert.equal(await student.locator('[data-reply-messages] article').count(),2);
  await student.setViewportSize({width:390,height:844});
  assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await student.screenshot({path:'qa/fase3/replies-browser.png',fullPage:true});
  const other=await browser.newPage();await other.goto(origin+'/other-school');
  await other.getByRole('button',{name:'Ver respostas / Responder'}).click();
  await other.getByText('Não foi possível abrir as respostas deste comunicado.',{exact:true}).waitFor();
  assert.equal(await other.getByRole('textbox').count(),0);
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
