import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHmac} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
const db=process.argv[2];assert.match(db,/^rs-fase3-/);const info=JSON.parse(execFileSync('docker',['inspect',db],{encoding:'utf8'}))[0];assert.equal(info.Config.Labels['rs.fase3'],'synthetic');
const ip=Object.values(info.NetworkSettings.Networks)[0].IPAddress;assert.match(ip,/^172\./);const base=`http://${ip}:3000`;
const uid=n=>`00000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
const token=n=>{const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');const raw=b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:uid(n),role:'authenticated',app_metadata:{platform_role:n===1?'professor':'aluno',question_bank_role:n===1?'professor':'aluno'},exp:Math.floor(Date.now()/1000)+3600});return raw+'.'+createHmac('sha256','fase3-synthetic-jwt-secret-never-production-123456').update(raw).digest('base64url');};
const report={scope:'Synthetic stored-session routing and real login failure; NOT successful Auth login or native validation',checks:[],pageErrors:[],authRequests:0,requests:[],networkFailures:[],badResponses:[],consoleErrors:[],fontResponses:[]};
function observe(page) {
 page.on('pageerror',e=>report.pageErrors.push({page:page.url(),message:e.message,stack:e.stack}));
 page.on('requestfailed',r=>report.networkFailures.push({page:page.url(),url:r.url(),type:r.resourceType(),error:r.failure()?.errorText}));
 page.on('response',r=>{if(r.request().resourceType()==='font')report.fontResponses.push({page:page.url(),url:r.url(),status:r.status()});if(r.status()>=400)report.badResponses.push({page:page.url(),url:r.url(),type:r.request().resourceType(),status:r.status()});});
 page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push({page:page.url(),message:m.text(),location:m.location()});});
}
function exportedFiles(root) {
 const files=new Set();
 const visit=dir=>{for(const item of readdirSync(dir,{withFileTypes:true})){const path=resolve(dir,item.name);if(item.isDirectory())visit(path);else if(item.isFile())files.add(path);}};
 visit(root);return files;
}
async function serve(port,root,expo){const allowedExport=expo?exportedFiles(root):null;const server=createServer(async(req,res)=>{try{
 const u=new URL(req.url,`http://127.0.0.1:${port}`);
 if(u.pathname==='/synthetic-session'){const n=Number(u.searchParams.get('actor')||1);assert.ok([1,2].includes(n));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({actor:n,session:{userId:uid(n),accessToken:token(n)}}));return;}
 if(u.pathname.startsWith('/auth/v1/')){report.authRequests++;res.writeHead(503,{'Content-Type':'application/json'}).end('{"message":"Local Auth is not running"}');return;}
 if(u.pathname.startsWith('/rest/v1/')){report.requests.push(u.pathname);const chunks=[];for await(const c of req)chunks.push(c);const response=await fetch(base+u.pathname.slice(8)+u.search,{method:req.method,headers:{Authorization:req.headers.authorization||'',apikey:'synthetic-key','Content-Type':'application/json'},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});res.writeHead(response.status,{'Content-Type':'application/json'}).end(await response.text());return;}
 if(u.pathname==='/supabase-config.js'){res.setHeader('Content-Type','text/javascript');res.end(`window.RAIZES_SUPABASE={url:'http://127.0.0.1:${port}',anonKey:'synthetic-key',allowLocalFallback:false};window.RAIZES_COMMUNICATION_REPLIES_ENABLED=true;window.RAIZES_NOTICE_EDITING_ENABLED=true;`);return;}
 let path=resolve(root,'.'+u.pathname);if(expo&&u.pathname==='/')path=resolve(root,'index.html');assert.ok(path.startsWith(root+'/'));assert.ok(expo ? allowedExport.has(path) : !u.pathname.split('/').some(x=>x.startsWith('.')));const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.ttf':'font/ttf','.webp':'image/webp','.jpeg':'image/jpeg','.jpg':'image/jpeg','.woff2':'font/woff2'};assert.ok(types[extname(path)]&&existsSync(path));res.setHeader('Content-Type',types[extname(path)]);res.end(readFileSync(path));
 }catch(e){res.writeHead(404).end('Not available in synthetic host');}});await new Promise(r=>server.listen(port,'127.0.0.1',r));return server;}
const servers=[await serve(58138,'/tmp/rs-fase3-routing-dist',true),await serve(58139,resolve('.'),false)];const browser=await chromium.launch({headless:true,executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const stored=n=>({cookies:[],origins:[{origin:'http://127.0.0.1:58139',localStorage:[{name:'raizes:supabase-auth-session',value:JSON.stringify({access_token:token(n),expires_at:Math.floor(Date.now()/1000)+3600})}]}]});
 const page=await browser.newPage({viewport:{width:1280,height:1000},storageState:stored(1)});await page.route('**/*',route=>/^http:\/\/127\.0\.0\.1:5813[89]\//.test(route.request().url())?route.continue():route.abort());observe(page);
 await page.goto('http://127.0.0.1:58138/');await page.getByLabel('E-mail',{exact:true}).fill('synthetic@example.invalid');await page.getByLabel('Senha',{exact:true}).fill('synthetic-local-only');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.getByText('Não foi possível entrar. Confira e tente novamente.').waitFor();assert.equal(report.authRequests,1);report.checks.push('PASS real App.tsx splash/login submits only to local unavailable Auth and stays signed out');
 for(const actor of [1,2]){
  await page.goto(`http://127.0.0.1:58138/?mode=shell&actor=${actor}`);
  await page.getByRole('button',{name:'Avalia+',exact:true}).click();
  await page.getByText(actor===1?'Avalia+ · Professor':'Sem avaliações disponíveis no momento.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Início',exact:true}).last().click();
  if(actor===1)await page.getByRole('button',{name:'Enviar recado',exact:true}).click();
  else {await page.getByRole('button',{name:'Notificações',exact:true}).click();await page.getByRole('button',{name:'Recados e respostas',exact:true}).click();}
  await page.getByText('Recados e respostas',{exact:true}).waitFor();await page.getByText('Nenhum recado disponível.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Perfil',exact:true}).click();await page.getByRole('button',{name:'Sair',exact:true}).last().click();await page.getByLabel('E-mail',{exact:true}).waitFor();
  report.checks.push(`PASS real AppShell actor ${actor}: home -> Avalia+ -> home -> notices -> profile -> logout -> real App login (QA session injection, not Auth login)`);
 }
 const login=await browser.newPage();observe(login);await login.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:58139/')?route.continue():route.abort());
 await login.goto('http://127.0.0.1:58139/login.html');await login.locator('[name=email]').fill('synthetic@example.invalid');await login.locator('[name=password]').fill('synthetic-local-only');await login.getByRole('button',{name:'Entrar',exact:true}).click();
 await login.locator('[data-login-error]').waitFor();assert.match(login.url(),/login.html/);assert.equal(report.authRequests,2);report.checks.push('PASS real login.html submits to unavailable local Auth, reports failure, never grants session');await login.close();
 for(const route of ['professor.html?view=avaliacoes','professor.html?view=mensagens']){await page.goto('http://127.0.0.1:58139/'+route);await page.getByText(route.includes('avaliacoes')?'Publicar avaliação':'Recados para a turma',{exact:true}).first().waitFor();assert.ok((await page.locator('body').innerText()).includes('SYNTHETIC CLASS 1'));report.checks.push('PASS real web entry '+route+' loads synthetic teacher scope');}
 const student=await browser.newPage({storageState:stored(2)});observe(student);await student.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:58139/')?route.continue():route.abort());
 await student.goto('http://127.0.0.1:58139/aluno.html?view=avaliacoes');await student.getByText('Nenhuma avaliacao nesta etapa.',{exact:true}).first().waitFor();
 await student.getByRole('link',{name:'Recados',exact:true}).click();await student.locator('.student-inbox-panel').waitFor();assert.match(student.url(),/view=recados/);await student.reload();await student.locator('.student-inbox-panel').waitFor();
 await student.locator('[data-platform-logout]').last().click();await student.waitForURL('**/login.html');assert.equal(await student.evaluate(()=>localStorage.getItem('raizes:supabase-auth-session')),null);
 report.checks.push('PASS real aluno.html: assessments -> Recados link -> reload -> logout clears stored synthetic session');
 await student.close();
 assert.ok(report.requests.includes('/rest/v1/rpc/student_list_assessment_assignments'));assert.ok(report.requests.includes('/rest/v1/rpc/communication_get_inbox'));
 assert.equal(report.fontResponses.filter(r=>r.status===200).length,3);assert.deepEqual(report.pageErrors,[]);
 report.checks.push('PASS three local Feather font loads return 200 and no unhandled pageErrors; external hosts remain blocked');
 report.fixtureAcl=JSON.parse(execFileSync('docker',['exec',db,'psql','-U','postgres','-At','-c',"select json_build_object('xp_records_select',has_table_privilege('authenticated','public.xp_records','SELECT'),'student_medals_select',has_table_privilege('authenticated','public.student_medals','SELECT'))"],{encoding:'utf8'}));
 report.externalFonts='Google Fonts stylesheet requests remain deliberately blocked; not the cause of the three original Expo pageErrors';
 writeFileSync('qa/fase3/routing-results.json',JSON.stringify(report,null,2)+'\n');
}finally{await browser.close();for(const s of servers){s.closeAllConnections();await new Promise(r=>s.close(r));}}
