/* One teacher composer for class and individual (student + linked guardians) messages. */
(() => {
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const render=()=>`<section class="tw-board" data-teacher-messages><h2>Mensagens</h2><p>Envie para a turma ou, de forma particular, para um aluno e seus responsáveis vinculados. Mensagens particulares não são publicadas na Minha Semana.</p><form data-message-compose class="tw-planning-form"><label>Turma<select name="classId" required><option value="">Selecione a turma</option></select></label><label>Destino<select name="audienceType" required><option value="class">Toda a turma</option><option value="student">Individual: aluno e responsáveis vinculados</option></select></label><label data-message-student hidden>Aluno<select name="studentId"><option value="">Selecione o aluno</option></select></label><p>O destino individual inclui a conta do aluno e os responsáveis com vínculo ativo. Não há envio separado apenas ao aluno ou apenas à família. A gestão autorizada também pode consultar.</p><label>Título<input name="title" required maxlength="90"></label><label class="tw-planning-form-note">Mensagem<textarea name="message" required maxlength="900" rows="4"></textarea></label><button type="submit">Revisar destinatários e mensagem</button></form><p data-message-status role="status" aria-live="polite"></p><section data-message-preview hidden></section><section><div class="tw-section-head"><h3>Recebidas</h3><button type="button" data-message-refresh>Atualizar mensagens</button></div><p>Comunicados autorizados para a turma selecionada. Esta lista não oferece conversa privada entre professores nem confirmação de leitura do professor.</p><div data-message-received role="status"></div></section><section><h3>Enviadas</h3><div data-message-sent></div></section></section>`;
 const mount=(root,deps)=>{
  if(!root||root.dataset.bound)return;root.dataset.bound='true';
  const initialActor=deps.actor(),classes=deps.classes();
  const form=root.querySelector('form'),status=root.querySelector('[data-message-status]'),preview=root.querySelector('[data-message-preview]'),sent=root.querySelector('[data-message-sent]'),received=root.querySelector('[data-message-received]');
  const markerKey='raizes:teacher-message-pending:'+initialActor;
  let generation=0,controller,review=null,busy=false,stopped=false;
  const current=()=>!stopped&&root.isConnected&&initialActor&&deps.actor()===initialActor;
  const invalidate=()=>{review=null;preview.hidden=true;preview.textContent='';};
  const stop=()=>{if(current())return;stopped=true;controller?.abort();invalidate();sent.textContent='';received.textContent='';form.reset();form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);status.textContent='Conta alterada. Abra Mensagens novamente.';};
  const observer=new MutationObserver(()=>{stop();if(stopped){observer.disconnect();window.removeEventListener('storage',stop);}});observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('storage',stop);
  const actorCheck=()=>{if(!current())throw Error('Conta alterada. Abra Mensagens novamente.');};
  const message=s=>{status.textContent=s;};
  const getContext=()=>{
   const c=classes.find(c=>c.id===form.elements.classId.value);if(!c)throw Error('Selecione uma turma autorizada.');
   const audience=form.elements.audienceType.value;if(!['class','student'].includes(audience))throw Error('Destino inválido.');
   const student=audience==='student'?deps.students(c.id).find(s=>s.id===form.elements.studentId.value):null;
   if(audience==='student'&&!student)throw Error('Selecione um aluno da turma atual.');
   return {c,audience,student};
  };
  const snapshot=()=>{actorCheck();const {c,audience,student}=getContext();const title=form.elements.title.value.trim(),body=form.elements.message.value.trim();if(!title||!body)throw Error('Preencha título e mensagem.');return {schoolId:c.schoolId,classId:c.id,audienceType:audience,studentId:student?.id||null,title,body,destination:student?`${student.name} e responsáveis vinculados — ${c.name} — ${c.schoolName||'Escola'}`:`Toda a turma ${c.name} — ${c.schoolName||'Escola'}`};};
  const selection=()=>{invalidate();form.elements.studentId.innerHTML='<option value="">Selecione o aluno</option>'+deps.students(form.elements.classId.value).map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');form.elements.studentId.value='';form.elements.studentId.required=form.elements.audienceType.value==='student';root.querySelector('[data-message-student]').hidden=!form.elements.studentId.required;};
  const list=rows=>rows.length?`<ul>${rows.map(r=>`<li><strong>${esc(r.title)}</strong><p>${esc(r.body)}</p><small>${r.audience_type==='student'?'Particular: '+esc(deps.students(form.elements.classId.value).find(s=>s.id===r.student_id)?.name||'Aluno fora do vínculo atual')+' e responsáveis vinculados':'Toda a turma'} · ${esc(r.author_role||'Equipe escolar')} · ${esc(r.status)}</small></li>`).join('')}</ul>`:'<p>Nenhuma mensagem retornada.</p>';
  const load=async()=>{
   actorCheck();const classId=form.elements.classId.value;const token=++generation;controller?.abort();controller=new AbortController();received.textContent='';sent.textContent='';
   if(!classId){received.textContent='Selecione uma turma para consultar.';return;}
   received.textContent='Carregando mensagens...';
   try{const rows=await deps.list(classId,{signal:controller.signal,expectedUserId:initialActor});if(token!==generation||!current())return;
    if(!Array.isArray(rows)||rows.some(r=>r.class_id!==classId||r.school_id!==classes.find(c=>c.id===classId)?.schoolId))throw Error('Resposta de outra turma ou incompleta.');
    const own=rows.filter(r=>r.author_profile_id===initialActor),other=rows.filter(r=>r.author_profile_id!==initialActor&&r.status==='published');
    sent.innerHTML=list(own);received.innerHTML=list(other);
   }catch(e){if(token===generation&&current()){sent.textContent='';received.textContent='Não foi possível carregar mensagens. '+e.message;}}
  };
  form.elements.classId.innerHTML+=[...classes].map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.schoolName||'Escola')}</option>`).join('');
  const initial=deps.initialClass();if(classes.some(c=>c.id===initial))form.elements.classId.value=initial;
  form.addEventListener('input',invalidate);
  form.addEventListener('change',event=>{invalidate();if(event.target.name==='classId'||event.target.name==='audienceType')selection();if(event.target.name==='classId')load();});
  form.addEventListener('submit',event=>{event.preventDefault();if(busy)return;try{if(sessionStorage.getItem(markerKey))throw Error('Confirmação de envio pendente. Consulte Enviadas antes de tentar outro envio; não repita a mensagem.');review=snapshot();preview.innerHTML=`<h3>Confirmar envio</h3><p><strong>Destino:</strong> ${esc(review.destination)}</p><p>${review.audienceType==='student'?'Mensagem particular. Não aparece no mural da turma ou na Minha Semana.':'Mensagem visível aos alunos e responsáveis da turma selecionada.'}</p><h4>${esc(review.title)}</h4><p>${esc(review.body)}</p><button type="button" data-message-confirm>Confirmar envio</button><button type="button" data-message-cancel>Voltar à edição</button>`;preview.hidden=false;preview.querySelector('button').focus();message('Confira o destino e o texto antes de confirmar.');}catch(e){message(e.message);}});
  root.addEventListener('click',async event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-message-cancel')){invalidate();form.elements.title.focus();}
   if(button.hasAttribute('data-message-refresh')){try{await load();}catch(e){message(e.message);}}
   if(!button.hasAttribute('data-message-confirm')||busy)return;
   let approved;
   try{actorCheck();approved=snapshot();if(!review||JSON.stringify(approved)!==JSON.stringify(review))throw Error('O destino ou texto mudou. Revise novamente.');if(sessionStorage.getItem(markerKey))throw Error('Confirmação pendente; não repita o envio.');}catch(e){invalidate();message(e.message);return;}
   busy=true;const controls=[...root.querySelectorAll('input,select,textarea,button')].map(node=>({node,disabled:node.disabled}));controls.forEach(({node})=>node.disabled=true);
   try{
    sessionStorage.setItem(markerKey,JSON.stringify({classId:approved.classId,startedAt:new Date().toISOString()}));
    const result=await deps.send(approved,{expectedUserId:initialActor});actorCheck();
    if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result?.communication_id||'')||result.status!=='published')throw Error('Resposta sem confirmação do envio.');
    sessionStorage.removeItem(markerKey);invalidate();form.elements.title.value='';form.elements.message.value='';message('Mensagem enviada e confirmada.');await load();
   }catch(e){if(current()){
    const definitive=e.status>=400&&e.status<500&&/^(PGRST\d{3}|[A-Z0-9]{5})$/.test(e.code||'');
    if(definitive){sessionStorage.removeItem(markerKey);message('Envio recusado. '+e.message+' Revise e tente novamente.');invalidate();}
    else{message('Confirmação de envio pendente. Consulte Enviadas; não repita a mensagem.');invalidate();}
   }}finally{busy=false;if(current())controls.forEach(({node,disabled})=>node.disabled=disabled);}
  });
  selection();if(sessionStorage.getItem(markerKey))message('Confirmação de envio pendente. Consulte Enviadas; não repita a mensagem.');load();
 };
 window.TeacherMessages={render,mount};
})();
