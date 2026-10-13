/* Read-only institutional catalogue. Requires separately reviewed SQL installation. */
(() => {
 const types={QUESTION:'Questões',BOOK:'Livros',BOOK_PAGE:'Páginas',ACTIVITY:'Atividades',PRINTABLE:'Imprimíveis',GAME:'Jogos',INTERACTION:'Experiências',VIDEO:'Vídeos',ASSESSMENT_TEMPLATE:'Avaliações',TRAINING:'Formação'};
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const render=(schoolId,name)=>`<section class="panel admin-board" data-school-content-inspection="${escape(schoolId)}"><h2>Conteúdos disponíveis</h2><p><strong>${escape(name)}</strong> · Consulta institucional, somente leitura.</p><p>Mostra o acervo institucional da escola. Cada professor ou aluno continua sujeito à sua turma, faixa e permissões. Conteúdos pessoais de docentes não entram nesta visão.</p><p data-inspection-status role="status" aria-live="polite">Consultando autorização da escola...</p><button type="button" data-inspection-retry>Atualizar consulta</button><div data-inspection-summary></div><form data-inspection-filter><label>Categoria <select name="content_type"><option value="">Todas</option>${Object.entries(types).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>Ano / faixa <select name="grade_id"><option value="">Todos</option></select></label><label>Buscar título <input name="query" type="search" maxlength="200"></label><button type="submit">Consultar</button></form><div data-inspection-items></div></section>`;
 const renderCards=(schoolId,name,href,icon='')=>`<section class="panel" data-school-content-inspection="${escape(schoolId)}" data-inspection-compact><div class="panel-head"><h2>Conteúdos disponíveis</h2><a href="${escape(href)}">Consultar conteúdos e contratação</a></div><p>${escape(name)} · Catálogo institucional autorizado, sem totais do acervo global.</p><p data-inspection-status role="status" aria-live="polite">Consultando conteúdos...</p><button type="button" data-inspection-retry>Atualizar</button><div data-inspection-summary></div><template data-inspection-icon>${icon}</template><div data-inspection-items></div></section>`;
 const mount=(root,{request,currentSchool,actor})=>{
  if(!root||root.dataset.inspectionBound)return;root.dataset.inspectionBound='true';
  const school=root.dataset.schoolContentInspection,initialActor=actor();
  const status=root.querySelector('[data-inspection-status]'),summary=root.querySelector('[data-inspection-summary]'),items=root.querySelector('[data-inspection-items]'),form=root.querySelector('form')||document.createElement('form');
  let generation=0,controller,offset=0,filter={},disposed=false;
  const compact=root.hasAttribute('data-inspection-compact');
  const current=()=>Boolean(initialActor)&&!disposed&&root.isConnected&&currentSchool()===school&&actor()===initialActor;
  const clear=()=>{summary.textContent='';items.textContent='';};
  const stop=()=>{if(current())return;disposed=true;generation++;controller?.abort();clear();status.textContent='Escola ou conta alterada. Abra novamente a consulta.';};
  // No session/school response may remain visible after a context switch.
  const observer=new MutationObserver(()=>{stop();if(disposed){observer.disconnect();window.removeEventListener('storage',onStorage);window.removeEventListener('popstate',onStorage);}});observer.observe(document.body,{childList:true,subtree:true});
  const onStorage=()=>stop();window.addEventListener('storage',onStorage);window.addEventListener('popstate',onStorage);
  const fail=error=>{
   clear();status.setAttribute('role','alert');
   status.textContent=error?.code==='PGRST202'||error?.code==='42883'?'Consulta institucional ainda não instalada. Não é possível aferir disponibilidade; nenhum total foi presumido.':`Não foi possível aferir os conteúdos desta escola. ${error?.message||'Tente novamente.'}`;
  };
  const validate=r=>{
   if(!r||r.school_id!==school||!['PASS','INACTIVE_SCHOOL','ADAPTER_REQUIRED'].includes(r.status)||!Array.isArray(r.contracts)||!Array.isArray(r.categories)||!Array.isArray(r.items))throw Error('Resposta incompleta ou de outra escola.');
   if(r.status==='PASS'&&(!r.type_totals||Object.values(r.type_totals).some(n=>!Number.isSafeInteger(n)||n<0)||!Number.isSafeInteger(r.total)||r.total<0||r.offset!==offset||r.limit!==25||r.items.length>25||r.items.length>r.total||r.categories.some(c=>!Number.isSafeInteger(c.total)||c.total<0||!types[c.content_type]||!c.grade_id||!['AVAILABLE','AWAITING_PUBLICATION','RESTRICTED'].includes(c.state))))throw Error('Contagem ou paginação não confirmada.');
  };
  const load=async()=>{
   if(!current()){stop();return;}const token=++generation;controller?.abort();controller=new AbortController();const activeController=controller,signal=controller.signal;
   clear();status.setAttribute('role','status');status.textContent='Consultando autorização da escola...';
   const timeout=setTimeout(()=>activeController.abort(),15000);
   try{
    const r=await request({p_school_id:school,p_filter:filter,p_limit:25,p_offset:offset},{signal,expectedUserId:initialActor});
    if(token!==generation||!current())return;validate(r);
    summary.innerHTML=`<h3>Contratação e disponibilidade</h3>${r.contracts.length?`<ul>${r.contracts.map(c=>`<li>${escape(c.reference)} · ${escape(c.status)} · ${escape(c.starts_at)} a ${escape(c.ends_at||'sem término')} · ${c.effective?'vigente para a escola':'sem vigência efetiva'}</li>`).join('')}</ul>`:'<p>Nenhum contrato vinculado retornado por esta consulta.</p>'}`;
    if(r.status==='ADAPTER_REQUIRED'){status.textContent='Disponibilidade não aferida: esta escola usa autorização legada, ainda sem integração nesta consulta. Totais globais não representam seu acesso.';return;}
    if(r.status==='INACTIVE_SCHOOL'){status.textContent='Restrito: escola inativa. Nenhum conteúdo disponível por este motor enquanto estiver inativa.';return;}
    if(compact){
     const keys=['QUESTION','BOOK','ACTIVITY','PRINTABLE','GAME','INTERACTION','VIDEO','TRAINING'];
     summary.innerHTML=`<div class="secretaria-metric-row secretaria-dashboard-metrics" aria-label="Conteúdos autorizados da escola">${keys.map(type=>{const rows=r.categories.filter(c=>c.content_type===type),known=rows.length>0,total=r.type_totals[type]||0;return `<article class="school-content-metric">${root.querySelector('[data-inspection-icon]')?.innerHTML||''}<span>${escape(types[type])}</span><strong>${known?total:'—'}</strong><small>${!known?'Não aferido / sem categoria':!rows.some(c=>c.effective)?'Restrito':total===0?'Em breve / sem publicação autorizada':type==='QUESTION'?'Publicado autorizado':'Catálogo; abertura não verificada'}</small></article>`;}).join('')}</div>`;
     status.textContent='Visão institucional. Faixas individuais e abertura protegida seguem suas permissões. Consulte o detalhe para comparar com o contrato.';return;
    }
    const grades=[...new Map(r.categories.map(c=>[c.grade_id,c.grade_name])).entries()];
    form.elements.grade_id.innerHTML='<option value="">Todos</option>'+grades.map(([id,name])=>`<option value="${escape(id)}">${escape(name)}</option>`).join('');form.elements.grade_id.value=filter.grade_id||'';
    summary.innerHTML+=r.categories.length?`<div style="overflow-x:auto"><table><thead><tr><th>Categoria / ano</th><th>Contratado / configurado</th><th>Disponível publicado</th><th>Situação</th></tr></thead><tbody>${r.categories.map(c=>`<tr><td>${escape(types[c.content_type])} · ${escape(c.grade_name)}<br><small>${escape(c.module_name)}</small></td><td>${c.effective?'Regra contratual vigente':'Cadastrado; sem regra vigente'}</td><td>${c.total}</td><td>${c.state==='RESTRICTED'?'Restrito':c.state==='AWAITING_PUBLICATION'?'Em breve / sem publicação autorizada no momento':'Publicado e autorizado'}</td></tr>`).join('')}</tbody></table></div><p>Os totais por categoria podem se sobrepor. O total da consulta conta cada conteúdo uma vez.</p>`:'<p>Nenhuma categoria contratual configurada para esta escola.</p>';
    const absent=Object.entries(types).filter(([type])=>!r.categories.some(c=>c.content_type===type)).map(([,label])=>label);
    if(absent.length)summary.innerHTML+=`<p>Sem categoria canônica retornada: ${escape(absent.join(', '))}. O acervo legado desses módulos não foi aferido; ausência de integração não significa zero conteúdo.</p>`;
    summary.innerHTML+='<p>Questões: autorização do motor canônico. Demais módulos: publicação autorizada no catálogo; abertura protegida e acervo legado ainda precisam de verificação específica. Nenhum arquivo é liberado por esta tela.</p>';
    status.textContent=`${r.total} conteúdos publicados autorizados no catálogo canônico para o filtro. Exibindo ${r.items.length?offset+1:0}–${offset+r.items.length}.`;
    items.innerHTML=(r.items.length?`<ul>${r.items.map(i=>`<li><strong>${escape(i.title)}</strong> · ${escape(types[i.content_type]||i.content_type)}<br><small>${escape(i.id)} · ${i.delivery_status==='QUESTION_ENGINE'?'Motor de questões':'Abertura protegida não verificada'}</small></li>`).join('')}</ul>`:'<p>Nenhum item autorizado corresponde a esta consulta.</p>')+`<button type="button" data-inspection-page="-1" ${offset===0?'disabled':''}>Anterior</button><button type="button" data-inspection-page="1" ${offset+25>=r.total?'disabled':''}>Próxima</button>`;
   }catch(error){if(token===generation&&current())fail(error);}finally{clearTimeout(timeout);}
  };
  root.addEventListener('click',event=>{const b=event.target.closest('button');if(!b||b.disabled)return;if(b.hasAttribute('data-inspection-retry'))load();if(b.dataset.inspectionPage){offset=Math.max(0,offset+25*Number(b.dataset.inspectionPage));load();}});
  form.addEventListener('submit',event=>{event.preventDefault();filter=Object.fromEntries(new FormData(form));offset=0;load();});
  load();return {reload:load,dispose:()=>{disposed=true;controller?.abort();observer.disconnect();window.removeEventListener('storage',onStorage);window.removeEventListener('popstate',onStorage);clear();}};
 };
 window.SchoolContentInspection={render,renderCards,mount};
})();
