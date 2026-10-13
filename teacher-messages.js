/* Explicit recipient intent; the reviewed backend enforces delivery and durable retry identity. */
(() => {
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={class:'Toda a turma',student:'Somente aluno',family:'Somente família',student_family:'Aluno e família'};
 const render=()=>`<section class="tw-board" data-teacher-messages><h2>Mensagens</h2><p>Escolha quem receberá a mensagem. Mensagens individuais ficam fora do mural e da Minha Semana.</p><form data-message-compose class="tw-planning-form"><label>Turma<select name="classId" required><option value="">Selecione a turma</option></select></label><label>Destino<select name="audienceType" required>${Object.entries(labels).map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}</select></label><label data-message-student hidden>Aluno de referência<select name="studentId"><option value="">Selecione o aluno</option></select></label><p>“Somente família” inclui todos os responsáveis ativos vinculados ao aluno. “Somente aluno” exclui os responsáveis. A gestão autorizada pode consultar.</p><label>Título<input name="title" required maxlength="90"></label><label class="tw-planning-form-note">Mensagem<textarea name="message" required maxlength="900" rows="4"></textarea></label><button type="submit">Revisar destinatários e mensagem</button></form><p data-message-status role="status" aria-live="polite"></p><section data-message-preview hidden></section><section data-message-recovery hidden></section><section><div class="tw-section-head"><h3>Recebidas</h3><button type="button" data-message-refresh>Atualizar mensagens</button></div><p>Comunicados autorizados para a turma selecionada. Esta lista não oferece conversa privada entre professores nem confirmação de leitura do professor.</p><div data-message-received role="status"></div></section><section><h3>Enviadas</h3><div data-message-sent></div></section></section>`;
 const mount=(root,deps)=>{
  if(!root||root.dataset.bound)return;root.dataset.bound='true';
  const initialActor=deps.actor(),classes=deps.classes();
  const form=root.querySelector('form'),status=root.querySelector('[data-message-status]'),preview=root.querySelector('[data-message-preview]'),recovery=root.querySelector('[data-message-recovery]'),sent=root.querySelector('[data-message-sent]'),received=root.querySelector('[data-message-received]');
  const markerKey='raizes:teacher-message-pending:'+initialActor;
  let generation=0,controller,review=null,busy=false,stopped=false;
  const current=()=>!stopped&&root.isConnected&&initialActor&&deps.actor()===initialActor;
  const invalidate=()=>{review=null;preview.hidden=true;preview.textContent='';};
  const stop=()=>{if(current())return;stopped=true;controller?.abort();invalidate();recovery.textContent='';sent.textContent='';received.textContent='';form.reset();form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);status.textContent='Conta alterada. Abra Mensagens novamente.';};
  const observer=new MutationObserver(()=>{stop();if(stopped){observer.disconnect();window.removeEventListener('storage',stop);}});observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('storage',stop);
  const actorCheck=()=>{if(!current())throw Error('Conta alterada. Abra Mensagens novamente.');};
  const message=s=>{status.textContent=s;};
  const pending=()=>{const raw=sessionStorage.getItem(markerKey);if(!raw)return null;try{return JSON.parse(raw);}catch{return {};}};
  const validResult=(r,key)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r?.communication_id||'')&&r.status==='published'&&r.request_id===key;
  const selection=()=>{invalidate();form.elements.studentId.innerHTML='<option value="">Selecione o aluno</option>'+deps.students(form.elements.classId.value).map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');form.elements.studentId.value='';form.elements.studentId.required=form.elements.audienceType.value!=='class';root.querySelector('[data-message-student]').hidden=!form.elements.studentId.required;};
  const snapshot=()=>{
   actorCheck();const c=classes.find(c=>c.id===form.elements.classId.value);if(!c)throw Error('Selecione uma turma autorizada.');
   const scope=form.elements.audienceType.value;if(!Object.hasOwn(labels,scope))throw Error('Destino inválido.');
   const student=scope!=='class'?deps.students(c.id).find(s=>s.id===form.elements.studentId.value):null;
   if(scope!=='class'&&!student)throw Error('Selecione um aluno da turma atual.');
   const title=form.elements.title.value.trim(),body=form.elements.message.value.trim();if(!title||!body)throw Error('Preencha título e mensagem.');
   return {schoolId:c.schoolId,classId:c.id,audienceType:scope==='class'?'class':'student',recipientScope:scope,studentId:student?.id||null,title,body,destination:`${labels[scope]}${student?' — '+student.name:''} — ${c.name} — ${c.schoolName||'Escola'}`};
  };
  const description=p=>`<p><strong>Destino:</strong> ${esc(p.destination)}</p><p>${p.recipientScope==='family'?'Apenas os responsáveis ativos vinculados. O aluno não recebe.':p.recipientScope==='student'?'Apenas a conta do aluno. Os responsáveis não recebem.':p.recipientScope==='student_family'?'A conta do aluno e todos os responsáveis ativos vinculados.':'Alunos e responsáveis da turma selecionada.'}</p><h4>${esc(p.title)}</h4><p>${esc(p.body)}</p>`;
  const list=rows=>rows.length?`<ul>${rows.map(r=>`<li><strong>${esc(r.title)}</strong><p>${esc(r.body)}</p><small>${r.audience_type==='student'?esc(labels[r.recipient_scope]||'Aluno e família (legado)')+': '+esc(deps.students(form.elements.classId.value).find(s=>s.id===r.student_id)?.name||'Aluno fora do vínculo atual'):'Toda a turma'} · ${esc(r.author_role||'Equipe escolar')} · ${esc(r.status)}</small></li>`).join('')}</ul>`:'<p>Nenhuma mensagem retornada.</p>';
  const load=async()=>{
   actorCheck();const classId=form.elements.classId.value;const token=++generation;controller?.abort();controller=new AbortController();received.textContent='';sent.textContent='';
   if(!classId){received.textContent='Selecione uma turma para consultar.';return;}
   received.textContent='Carregando mensagens...';
   try{const rows=await deps.list(classId,{signal:controller.signal,expectedUserId:initialActor});if(token!==generation||!current())return;
    if(!Array.isArray(rows)||rows.some(r=>r.class_id!==classId||r.school_id!==classes.find(c=>c.id===classId)?.schoolId))throw Error('Resposta de outra turma ou incompleta.');
    sent.innerHTML=list(rows.filter(r=>r.author_profile_id===initialActor));received.innerHTML=list(rows.filter(r=>r.author_profile_id!==initialActor&&r.status==='published'));
   }catch(e){if(token===generation&&current()){sent.textContent='';received.textContent='Não foi possível carregar mensagens. '+e.message;}}
  };
  const recover=async()=>{
   const p=pending();if(!p||busy)return;
   recovery.hidden=false;recovery.innerHTML='<button type="button" data-message-reconcile>Consultar confirmação</button>';
   if(!p.requestId||!p.payload){message('Envio antigo com confirmação pendente. Consulte Enviadas; solicite conferência antes de repetir.');return;}
   message('Consultando confirmação do envio pendente...');busy=true;
   try{const result=await deps.lookup(p.requestId,{expectedUserId:initialActor});actorCheck();
    if(result?.found&&validResult(result.result,p.requestId)){sessionStorage.removeItem(markerKey);recovery.hidden=true;recovery.textContent='';message('Envio recuperado e confirmado.');await load();}
    else if(result?.found===false){message('Confirmação de envio pendente. Você pode repetir a mesma solicitação com segurança.');recovery.innerHTML=description(p.payload)+'<button type="button" data-message-retry>Repetir a mesma solicitação</button><button type="button" data-message-reconcile>Consultar confirmação</button>';}
    else throw Error('Resposta incompleta.');
   }catch(e){if(current())message('Confirmação de envio pendente. Não crie outro envio; tente consultar novamente.');}finally{busy=false;}
  };
  const transmit=async(p)=>{
   actorCheck();busy=true;const controls=[...root.querySelectorAll('input,select,textarea,button')].map(node=>({node,disabled:node.disabled}));controls.forEach(({node})=>node.disabled=true);
   try{
    sessionStorage.setItem(markerKey,JSON.stringify(p));
    const result=await deps.send(p.payload,{expectedUserId:initialActor,requestId:p.requestId});actorCheck();
    if(!validResult(result,p.requestId))throw Error('Resposta sem confirmação do envio.');
    sessionStorage.removeItem(markerKey);invalidate();recovery.hidden=true;recovery.textContent='';form.elements.title.value='';form.elements.message.value='';message('Mensagem enviada e confirmada.');await load();
   }catch(e){if(current()){
    const definitive=e.status>=400&&e.status<500&&/^(PGRST\d{3}|[A-Z0-9]{5})$/.test(e.code||'');
    // A retry refusal does not prove the FIRST request failed; preserve its durable key.
    if(definitive&&!p.uncertain){sessionStorage.removeItem(markerKey);message('Envio recusado. '+e.message+' Revise e tente novamente.');invalidate();}
    else{p.uncertain=true;sessionStorage.setItem(markerKey,JSON.stringify(p));message('Confirmação de envio pendente. Consulte a confirmação antes de outro envio.');invalidate();recovery.hidden=false;recovery.innerHTML='<button type="button" data-message-reconcile>Consultar confirmação</button>';}
   }}finally{busy=false;if(current())controls.forEach(({node,disabled})=>node.disabled=disabled);}
  };
  form.elements.classId.innerHTML+=[...classes].map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.schoolName||'Escola')}</option>`).join('');
  const initial=deps.initialClass();if(classes.some(c=>c.id===initial))form.elements.classId.value=initial;
  form.addEventListener('input',invalidate);
  form.addEventListener('change',event=>{invalidate();if(event.target.name==='classId'||event.target.name==='audienceType')selection();if(event.target.name==='classId')load().catch(e=>message(e.message));});
  form.addEventListener('submit',event=>{event.preventDefault();if(busy)return;try{if(pending())throw Error('Confirmação de envio pendente. Consulte a confirmação antes de outro envio.');review=snapshot();preview.innerHTML='<h3>Confirmar envio</h3>'+description(review)+'<button type="button" data-message-confirm>Confirmar envio</button><button type="button" data-message-cancel>Voltar à edição</button>';preview.hidden=false;preview.querySelector('button').focus();message('Confira o destino e o texto antes de confirmar.');}catch(e){message(e.message);}});
  root.addEventListener('click',async event=>{
   const button=event.target.closest('button');if(!button||busy)return;
   if(button.hasAttribute('data-message-cancel')){invalidate();form.elements.title.focus();}
   if(button.hasAttribute('data-message-refresh')){try{await load();}catch(e){message(e.message);}}
   if(button.hasAttribute('data-message-reconcile'))await recover();
   if(button.hasAttribute('data-message-retry')){const p=pending();if(p?.requestId&&p.payload){try{await transmit({...p,uncertain:true});}catch(e){message(e.message);}}}
   if(!button.hasAttribute('data-message-confirm'))return;
   try{const approved=snapshot();if(!review||JSON.stringify(approved)!==JSON.stringify(review))throw Error('O destino ou texto mudou. Revise novamente.');if(pending())throw Error('Confirmação pendente; não repita o envio.');await transmit({requestId:crypto.randomUUID(),payload:approved,uncertain:false});}catch(e){invalidate();message(e.message);}
  });
  selection();load().catch(e=>message(e.message));if(pending())recover();
 };
 window.TeacherMessages={render,mount};
})();
