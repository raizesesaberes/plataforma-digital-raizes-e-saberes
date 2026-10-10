// Run against a local Expo web export. All API traffic is intercepted.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const out=process.env.EVIDENCE_DIR||'/tmp/teacher-avalia-evidence',base=process.env.BASE_URL||'http://127.0.0.1:8780';
assert.ok(['127.0.0.1','localhost'].includes(new URL(base).hostname), 'Only a local static export is permitted');
fs.mkdirSync(out,{recursive:true});
const classRows=[{class_id:'class-a',school_id:'school',class_name:'5º ano',school_year:'Fundamental',shift:'Manhã',student_count:2},{class_id:'class-b',school_id:'school',class_name:'5º ano',school_year:'Fundamental',shift:'Tarde',student_count:2}];
const assignments=[{id:'assignment-a',class_id:'class-a',status:'published',assessments:{title:'Leitura A',component:'Português',description:'Descrição sintética A'},classes:{nome:'5º ano'}},{id:'assignment-b',class_id:'class-b',status:'closed',assessments:{title:'Leitura B',component:'Português'},classes:{nome:'5º ano'}},{id:'unrelated',class_id:'class-c',status:'published',assessments:{title:'Fora da seleção'}}];
const cases=['legacy-navigation','shared-navigation','tracking-late','tracking-error','home-error','success-phone','success-tablet','empty-classes','empty-assessments','error-classes','error-assessments','error-context','error-summary','error-notifications','error-students','slow-students','slow-classes','late-assessments-class-change','logout-late','navigation-late'];
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});const results=[];
try{for(const name of (process.env.BEFORE ? ['before'] : process.env.CASE ? cases.filter(x=>x===process.env.CASE) : cases)){
 const p=await browser.newPage({viewport:name==='success-tablet'?{width:834,height:1112}:{width:390,height:844}});p.setDefaultTimeout(8000);
 let inModule=false,recovered=false,generation=1;const errors=[],unexpected=[],calls=[],held=[];
 const failPath={'home-error':'teacher_get_home_summary','tracking-error':'analytics_get_class_overview','before':'teacher_get_context','error-classes':'teacher_list_classes_for_mobile','error-assessments':'assessment_assignments','error-context':'teacher_get_context','error-summary':'teacher_get_home_summary','error-notifications':'teacher_get_notification_center','error-students':'enrollments'}[name];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin===base)return route.continue();
 if(!['https://synthetic.invalid','https://jaesjldrbjbdmzzggxzw.supabase.co'].includes(url.origin)){unexpected.push(url.origin);return route.abort();}
 const key=url.pathname.split('/').pop();calls.push(key);let payload;
 if(key==='token')payload={access_token:'synthetic-token-'+generation,user:{id:'synthetic-teacher-'+generation,email:'teacher@example.invalid'}};
 else if(key==='profiles')payload=[{platform_role:'professor',status:'active'}];
 else if(key==='users')payload=[{perfil:'professor',ativo:true}];
 else if(key==='teacher_list_classes_for_mobile')payload=name==='empty-classes'&&inModule?[]:classRows;
 else if(key==='teacher_get_home_summary')payload=[{teacher_name:'Professora Teste',school_name:'Escola Sintética',active_class_links:2,total_students:4}];
 else if(key==='teacher_get_context')payload=[{teacher_id:'teacher',teacher_name:'Professora Teste',school_name:'Escola Sintética',role:'professor',active_class_links:2}];
 else if(key==='assessment_assignments')payload=name==='empty-assessments'?[]:assignments.map(x=>({...x,assessments:{...x.assessments,title:generation===2&&x.id==='assignment-a'?'Nova sessão A':x.assessments.title}}));
 else if(['teacher_get_notification_center','enrollments','class_calendar_entries','communication_list_delivery_summaries','teacher_list_class_diary_entries','analytics_get_alerts','analytics_get_tracking_alerts','analytics_list_tracking_alerts'].includes(key))payload=[];
 else if(key==='analytics_get_class_overview'){const id=route.request().postDataJSON().p_class_id;payload={summary:{attendance_rate:id==='class-b'?31:91,assessment_average:id==='class-b'?22:88,assessment_participation:23,diary_entries_count:1}};}
 else if(key==='teacher_get_class_diary_period_summary')payload={};
 else {unexpected.push(key);return route.abort();}
 const send=()=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(payload)}).catch(()=>{});
 if((inModule||name==='home-error')&&key===failPath&&!recovered)return route.fulfill({status:503,contentType:'application/json',body:'{"message":"synthetic failure"}'});
 if(inModule&&!recovered&&((name==='tracking-late'&&key==='analytics_get_class_overview'&&route.request().postDataJSON().p_class_id==='class-b')||(name==='slow-students'&&key==='enrollments')||(name==='slow-classes'&&key==='teacher_list_classes_for_mobile')||(['late-assessments-class-change','logout-late','navigation-late'].includes(name)&&key==='assessment_assignments'))){held.push(send);return;}
 return send();});
 const login=async()=>{await p.getByLabel('E-mail',{exact:true}).fill('teacher@example.invalid');await p.getByLabel('Senha',{exact:true}).fill('synthetic-only');await p.getByRole('button',{name:'Entrar',exact:true}).click();await p.getByRole('button',{name:'Avalia+',exact:true}).waitFor();inModule=true;await p.getByRole('button',{name:'Avalia+',exact:true}).click();};
 const text=()=>p.locator('body').innerText();const openA=()=>p.getByRole('button',{name:'Abrir avaliação Leitura A',exact:true});
 await p.goto(base);await login();
 if(name==='legacy-navigation') {
 await openA().waitFor();
 for(const action of ['Fazer chamada','Enviar recado','Registrar aula','Agenda']){
 await p.getByRole('button',{name:'Início',exact:true}).first().click();await p.getByRole('button',{name:'Minhas Turmas',exact:true}).first().click();await p.getByRole('button',{name:'Abrir turma 5º ano',exact:true}).first().click();await p.getByRole('button',{name:action,exact:true}).first().click();
 await p.waitForTimeout(100);assert.ok(!(await text()).includes('Carregando turmas'));}
 await p.getByRole('button',{name:'Início',exact:true}).first().click();await p.getByRole('button',{name:'Avalia+',exact:true}).click();await openA().waitFor();
 } else if(name==='home-error') {
 await p.getByRole('button',{name:'Início',exact:true}).first().click();await p.getByText('Resumo inicial indisponível',{exact:true}).waitFor();assert.ok(!(await text()).includes('0 alunos acompanhados'));recovered=true;await p.getByRole('button',{name:'Tentar novamente: Resumo inicial indisponível',exact:true}).click();await p.getByText('Olá, Professora Teste',{exact:true}).waitFor();
 } else if(['shared-navigation','tracking-late','tracking-error'].includes(name)){
 await openA().waitFor();await p.getByRole('button',{name:'Minhas Turmas',exact:true}).first().click();await p.getByRole('button',{name:'Abrir turma 5º ano',exact:true}).nth(1).click();await p.getByText('Tarde',{exact:true}).first().waitFor();await p.getByRole('button',{name:'Voltar para minhas turmas',exact:true}).click();
 await p.getByRole('button',{name:'Início',exact:true}).first().click();await p.getByRole('button',{name:'Acompanhamento',exact:true}).first().click();
 if(name==='tracking-error'){await p.getByText('Indicadores indisponíveis',{exact:true}).waitFor();assert.ok(!(await text()).includes('88%'));recovered=true;await p.getByRole('button',{name:'Tentar novamente: Indicadores indisponíveis',exact:true}).click();}
 await p.getByText('88%',{exact:true}).first().waitFor();
 for(let i=0;i<3;i++){
 await p.getByRole('button',{name:'Selecionar acompanhamento 5º ano · Tarde',exact:true}).click();
 if(name==='tracking-late'&&i===0){await p.getByText('Carregando indicadores',{exact:true}).waitFor();assert.ok(!(await text()).includes('88%'));await p.getByRole('button',{name:'Selecionar acompanhamento 5º ano · Manhã',exact:true}).click();await p.getByText('88%',{exact:true}).first().waitFor();recovered=true;await Promise.all(held.splice(0).map(f=>f()));await p.waitForTimeout(50);assert.ok(!(await text()).includes('22%'));await p.getByRole('button',{name:'Selecionar acompanhamento 5º ano · Tarde',exact:true}).click();}
 await p.getByText('22%',{exact:true}).first().waitFor();assert.ok(!(await text()).includes('88%'));await p.getByRole('button',{name:'Selecionar acompanhamento 5º ano · Manhã',exact:true}).click();await p.getByText('88%',{exact:true}).first().waitFor();}
 await p.screenshot({path:`${out}/${name}.png`});
 } else if(name==='before'){await p.getByText('Nenhuma avaliação publicada',{exact:true}).waitFor();await p.screenshot({path:`${out}/before-auxiliary-error.png`});}
 else if(name==='empty-classes') {await p.getByText('Nenhuma turma vinculada',{exact:true}).last().waitFor();assert.ok(!(await text()).includes('Turma selecionada: Turma'));assert.equal(await p.getByText('Disponíveis',{exact:true}).count(),0);}
 else if(name==='empty-assessments') await p.getByText('Nenhuma avaliação para esta turma',{exact:true}).waitFor();
 else if(name==='error-students'){await openA().waitFor();for(let i=0;i<50&&!calls.includes('enrollments');i++)await p.waitForTimeout(20);assert.ok(calls.includes('enrollments'));}
 else if(name.startsWith('error-')){
  const title={'error-classes':'Não foi possível carregar as turmas','error-assessments':'Não foi possível carregar as avaliações','error-context':'Falha na consulta: Dados da professora','error-summary':'Falha na consulta: Resumo inicial','error-notifications':'Falha na consulta: Notificações'}[name];
  await p.getByText(title,{exact:true}).waitFor();
  if(!['error-classes','error-assessments'].includes(name))await openA().waitFor();else assert.equal(await p.getByText('Disponíveis',{exact:true}).count(),0);
  await p.getByText(title,{exact:true}).scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/${name}.png`});
  const before=calls.filter(x=>x==='assessment_assignments').length;recovered=true;await p.getByRole('button',{name:'Tentar novamente: '+title,exact:true}).click();await openA().waitFor();
  await p.getByText(title,{exact:true}).waitFor({state:'detached'});if(!['error-classes','error-assessments'].includes(name))assert.equal(calls.filter(x=>x==='assessment_assignments').length,before);
 }
 else if(name==='slow-classes') {await p.getByText('Carregando turmas',{exact:true}).waitFor();assert.ok(!(await text()).includes('Turma selecionada: Turma'));recovered=true;await Promise.all(held.splice(0).map(f=>f()));await openA().waitFor();}
 else if(name==='late-assessments-class-change'){await p.getByText('Carregando avaliações',{exact:true}).waitFor();await p.getByRole('button',{name:'Selecionar turma 5º ano · Fundamental · Tarde',exact:true}).click();recovered=true;await Promise.all(held.splice(0).map(f=>f()));await p.getByRole('button',{name:'Abrir avaliação Leitura B',exact:true}).waitFor();assert.equal(await openA().count(),0);}
 else if(name==='logout-late') {await p.getByText('Carregando avaliações',{exact:true}).waitFor();await p.getByRole('button',{name:'Sair',exact:true}).click();await p.getByLabel('E-mail',{exact:true}).waitFor();generation=2;recovered=true;inModule=false;await login();await p.getByRole('button',{name:'Abrir avaliação Nova sessão A',exact:true}).waitFor();await Promise.all(held.splice(0).map(f=>f()));assert.equal(await openA().count(),0);}
 else if(name==='navigation-late') {await p.getByText('Carregando avaliações',{exact:true}).waitFor();await p.getByRole('button',{name:'Início',exact:true}).first().click();recovered=true;await p.getByRole('button',{name:'Avalia+',exact:true}).click();await openA().waitFor();await Promise.all(held.splice(0).map(f=>f()));await openA().waitFor();}
 else {await openA().waitFor();if(name==='slow-students'){for(let i=0;i<50&&!held.length;i++)await p.waitForTimeout(20);assert.ok(held.length>0,'student detail request held');recovered=true;await Promise.all(held.splice(0).map(f=>f()));}}
 if(name.startsWith('success')){
  assert.equal(await p.getByRole('button',{name:'Abrir avaliação Leitura B',exact:true}).count(),0);assert.ok(!(await text()).includes('Fora da seleção'));assert.ok(!(await text()).includes('0 questões'));
  await p.screenshot({path:`${out}/${name}.png`});await p.getByRole('button',{name:'Selecionar turma 5º ano · Fundamental · Tarde',exact:true}).click();await p.getByRole('button',{name:'Abrir avaliação Leitura B',exact:true}).waitFor();assert.equal(await openA().count(),0);
  await p.getByRole('button',{name:'Filtrar Disponíveis',exact:true}).click();await p.getByText('Nenhuma avaliação neste filtro',{exact:true}).waitFor();await p.getByRole('button',{name:'Filtrar Todas',exact:true}).click();await p.getByRole('button',{name:'Abrir avaliação Leitura B',exact:true}).click();await p.getByText('Aplicar ou publicar avaliações não está disponível neste app.',{exact:true}).waitFor();assert.equal(await p.getByRole('button',{name:'Publicar avaliação',exact:true}).count(),0);await p.screenshot({path:`${out}/${name}-detail.png`});
 }
 await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 results.push({name,status:'PASS',calls,unexpected,errors});console.log(name,'PASS');await p.close();
 }}finally{await browser.close();fs.writeFileSync(`${out}/${process.env.BEFORE?'before-results':process.env.CASE||'browser-results'}.json`,JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1});
