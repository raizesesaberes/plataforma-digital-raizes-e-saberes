import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)('playwright');
export async function runNoticeBrowser({base,token,communicationId,deliveryId}){
 let loseAck=true;
 const server=createServer(async(req,res)=>{
  try{
   if(req.url==='/notice-editing.js'){res.setHeader('Content-Type','text/javascript');res.end(readFileSync('notice-editing.js'));return;}
   if(req.url.startsWith('/rpc/')){
    if(!['communication_get_notice_versions','communication_edit_notice','communication_mark_revision_read'].includes(req.url.slice(5))){res.writeHead(404).end();return;}
    const chunks=[];for await(const c of req)chunks.push(c);
    const r=await fetch(base+req.url,{method:'POST',headers:{Authorization:req.headers.authorization,'Content-Type':'application/json'},body:Buffer.concat(chunks)});
    const text=await r.text();
    if(req.url==='/rpc/communication_edit_notice'&&r.ok&&loseAck){loseAck=false;res.writeHead(503).end('{}');return;}
    res.writeHead(r.status,{'Content-Type':'application/json'}).end(text);return;
   }
   const actor=req.url==='/student'?2:req.url==='/other'?5:1;
   res.setHeader('Content-Type','text/html; charset=utf-8');
   res.end(`<!doctype html><html><body><button data-notice-versions="${communicationId}" ${actor!==1?`data-notice-delivery="${deliveryId}"`:''}>Abrir versões</button><script>
   globalThis.RAIZES_NOTICE_EDITING_ENABLED=true;
   async function resolveSupabaseUserContext(){return {userId:'synthetic-${actor}'};}
   function createSupabaseRestClient(){return {request:async(path,q,options)=>{const r=await fetch('/'+path,{...options,headers:{Authorization:'Bearer ${token(actor)}','Content-Type':'application/json'}});if(!r.ok)throw new Error('failed');return r.json();}};}
   </script><script src="/notice-editing.js"></script></body></html>`);
  }catch{res.writeHead(500).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const teacher=await browser.newPage();const student=await browser.newPage();const errors=[];
  for(const p of [teacher,student])p.on('pageerror',e=>errors.push(e.message));
  await teacher.goto(origin);await teacher.getByRole('button',{name:'Abrir versões'}).click();
  await teacher.getByRole('textbox',{name:'Título do comunicado'}).fill('SYNTHETIC EDITED IN BROWSER');
  await teacher.getByRole('textbox',{name:'Texto do comunicado'}).fill('SYNTHETIC <img src=x onerror="window.editXss=true">');
  await teacher.getByRole('button',{name:'Salvar nova versão'}).click();
  await teacher.getByRole('status').filter({hasText:'Não foi possível salvar'}).waitFor();
  await teacher.getByRole('button',{name:'Fechar',exact:true}).click();
  await teacher.getByRole('button',{name:'Abrir versões'}).click();
  await teacher.getByRole('button',{name:'Salvar nova versão'}).click();
  await teacher.getByRole('status').filter({hasText:'Versão 2 salva no servidor'}).waitFor();
  await student.goto(origin+'/student');await student.getByRole('button',{name:'Abrir versões'}).click();
  await student.getByRole('heading',{name:'SYNTHETIC EDITED IN BROWSER'}).waitFor();
  assert.equal(await student.getByRole('button',{name:'Salvar nova versão'}).count(),0);
  await student.getByRole('button',{name:'Confirmar leitura desta versão'}).click();
  await student.getByRole('status').filter({hasText:'Leitura confirmada no servidor.'}).waitFor();
  await student.reload();await student.getByRole('button',{name:'Abrir versões'}).click();
  await student.getByRole('button',{name:'Esta versão já foi lida'}).waitFor();
  await student.getByText('Histórico de versões',{exact:true}).click();
  assert.equal(await student.locator('details article').count(),2);
  assert.equal(await student.evaluate(()=>window.editXss),undefined);
  const other=await browser.newPage();await other.goto(origin+'/other');await other.getByRole('button',{name:'Abrir versões'}).click();
  await other.getByText('Não foi possível abrir as versões deste comunicado.').waitFor();assert.equal(await other.getByRole('textbox').count(),0);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
}
