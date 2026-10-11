/* Contract administration. Uses the existing authenticated REST client. */
(() => {
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels = {QUESTION:'Questões',VIDEO:'Vídeos',BOOK:'Livros',BOOK_PAGE:'Páginas',GAME:'Jogos',INTERACTION:'Experiências',ACTIVITY:'Atividades',PRINTABLE:'Imprimíveis',ASSESSMENT_TEMPLATE:'Modelos de avaliação',TRAINING:'Universidade / capacitação'};
  const options = (rows, key='id', label='name') => rows.map(r=>`<option value="${esc(r[key])}">${esc(r[label])}</option>`).join('');
  class ContractOperations extends HTMLElement {
    pendingKey() { return 'raizes:pending-contract:'+getPlatformSession().userId; }
    rememberPending(value) { try { if(value) sessionStorage.setItem(this.pendingKey(),JSON.stringify(value));else sessionStorage.removeItem(this.pendingKey()); } catch { /* Receipt remains on screen if browser storage is unavailable. */ } }
    connectedCallback() { if (!this.started) { this.started=true; this.load(); } }
    async rpc(name, body={}) { const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),20000);try{return await adminSchoolContentRequest(name,body,{signal:controller.signal});}finally{clearTimeout(timer);} }
    async load() {
      this.review=null; this.innerHTML='<p role="status">Carregando contratos, escolas e categorias…</p>';
      try { this.catalog=await this.rpc('admin_get_contract_operations'); if (!['schools','networks','products','contracts','taxonomy','subjects'].every(k=>Array.isArray(this.catalog[k]))) throw Error('Catálogo incompleto.'); this.render(); }
      catch(e) { this.innerHTML=`<p role="alert">Não foi possível carregar contratos: ${esc(e.message)}</p><button type="button" data-retry>Tentar novamente</button>`; this.querySelector('[data-retry]').onclick=()=>this.load(); }
    }
    contractState(c) {
      const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
      if(c.status==='CANCELLED')return 'Revogado';
      if(c.status==='SUSPENDED')return 'Suspenso';
      if(c.superseded)return 'Substituído';
      if(c.starts_at>today)return 'Agendado';
      if(c.ends_at&&c.ends_at<today)return 'Encerrado';
      return c.status==='ACTIVE'?'Vigente':c.status;
    }
    render() {
      const c=this.catalog;
      this.innerHTML=`<style>contract-operations{display:block}contract-operations form{display:grid;gap:18px}contract-operations fieldset{border:1px solid #cbd5d1;border-radius:12px;padding:18px}contract-operations label{display:block;margin:8px 0}contract-operations select,contract-operations input:not([type=checkbox]),contract-operations textarea{padding:9px;max-width:100%;border:1px solid #a8bdb4;border-radius:6px}contract-operations .co-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}contract-operations .co-schools{max-height:280px;overflow:auto}contract-operations button{margin:6px;padding:10px;border-radius:8px}contract-operations [role=alert]{color:#9a241e}contract-operations table{width:100%;border-collapse:collapse}contract-operations td,contract-operations th{padding:9px;text-align:left;border-bottom:1px solid #ddd}contract-operations .co-review{background:#edf6ef;padding:20px;border-radius:12px}contract-operations [hidden]{display:none!important}</style>
      <h2>Contratos e acessos</h2><p>Cadastre o contratante, escolha as escolas e configure categorias para conteúdos atuais e futuros publicados. Escolas inativas precisam concluir seu fluxo de implantação para receber acesso.</p>
      <form autocomplete="off">
       <fieldset><legend>1. Contrato e vigência</legend>
        <label>Operação<select name="renewal_id"><option value="">Criar contrato</option>${options(c.contracts.filter(x=>['ACTIVE','ENDED'].includes(x.status)),'id','reference')}</select></label>
        <label data-renewal-mode hidden>Configuração da renovação<select name="renewal_mode"><option value="reuse">Reutilizar configuração anterior de cada escola</option><option value="edit">Editar e aplicar configuração uniforme às escolas escolhidas</option></select></label><div data-contractor><label>Contratante<select name="network_id"><option value="">Cadastrar contratante</option>${options(c.networks.filter(x=>x.status==='active'))}</select></label>
         <div data-new-network class="co-grid"><label>Nome do contratante<input name="network_name"></label><label>Código único<input name="network_code"></label></div></div>
        <label>Duração<select name="duration"><option value="12">12 meses calendários (padrão)</option><option value="custom">Vigência personalizada</option></select></label><div class="co-grid"><label>Referência do novo contrato<input name="reference" required maxlength="120"></label><label>Data de ativação / início (UTC−03)<input type="date" name="starts_at" required></label><label>Fim da vigência (inclusive)<input type="date" name="ends_at" required readonly></label></div>
        <p>Padrão: 12 meses calendários, editável para exceções. Escolha a data de ativação; o último dia coberto será calculado e mostrado na revisão.</p><p data-renewal-note>Uma renovação cria um registro sucessor e preserva o contrato anterior.</p>
       </fieldset>
       <fieldset><legend>2. Escolas atendidas</legend><label>Buscar escola<input type="search" data-school-search></label><div class="co-schools">${c.schools.length?c.schools.map(s=>`<label data-school-row><input type="checkbox" name="school_ids" value="${esc(s.id)}"> ${esc(s.name)} — ${esc(s.code)} (${esc(s.status)})</label>`).join(''):'<p>Nenhuma escola cadastrada.</p>'}</div>
        <label><input type="checkbox" name="create_school"> Cadastrar nova escola com o fluxo de implantação</label>
        <div data-new-school hidden class="co-grid"><label>Nome oficial<input name="school_name"></label><label>Código institucional<input name="school_code"></label><label>Ano letivo<input name="school_year" pattern="[0-9]{4}"></label><label>Município<input name="municipality"></label><label>Estado<input name="state" maxlength="2"></label><p>A escola será criada inativa, com implantação teste, dentro da mesma confirmação do contrato.</p></div>
       </fieldset>
       <fieldset><legend>3. Produtos, módulos e categorias</legend><p>A seleção inclui itens atuais e futuros classificados. Livre/transversal continua sujeito à licença, idade, suspensão e entrega protegida. Universidade exige autorização separada.</p>
       ${c.products.length?c.products.map(p=>`<details data-product="${esc(p.id)}"><summary>${esc(p.name)}</summary><label><input type="checkbox" data-product-enabled> Contratar este produto</label><label><input type="checkbox" data-institutional> Autorizar universidade / capacitação separadamente</label><button type="button" data-select-all>Selecionar todas as categorias escolares deste produto</button><button type="button" data-clear-rules>Limpar categorias</button>
       ${p.modules.flatMap(m=>m.content_types.map(type=>`<details><summary>${esc(m.name)} — ${esc(labels[type]||type)}</summary>${c.taxonomy.filter(g=>g.institutional===(type==='TRAINING')).map(g=>`<div data-rule data-module="${esc(m.id)}" data-type="${esc(type)}" data-grade="${esc(g.grade_id)}"><label><input type="checkbox" data-rule-enabled> ${esc(g.stage_name)} — ${esc(g.grade_name)}</label><label>Tema<select data-subject aria-label="Tema de ${esc(labels[type]||type)} — ${esc(g.grade_name)}"><option value="">Todos os temas / multidisciplinar</option>${options(c.subjects)}</select></label></div>`).join('')}</details>`)).join('')}</details>`).join(''):'<p>Nenhum produto ativo. O catálogo precisa de um produto com módulos antes de contratar.</p>'}</fieldset>
       <fieldset><legend>4. Revisão</legend><label>Motivo<textarea name="reason" required minlength="5" maxlength="500"></textarea></label><label><input type="checkbox" name="adopt_dynamic" required> Confirmo a adoção das categorias na vigência e entendo que direitos legados não ampliarão as categorias escolhidas.</label><p>A revisão não grava o contrato. Depois de conferir, use “Confirmar e salvar contrato”.</p><button type="submit" class="is-primary" ${c.products.length?'':'disabled'}>Revisar alvos, categorias e vigência</button></fieldset>
      </form><p data-status role="status" aria-live="polite"></p><section data-review hidden class="co-review"></section>
      <h3>Histórico de contratos</h3>${c.contracts.length?`<table><thead><tr><th>Contrato</th><th>Vigência</th><th>Estado</th><th>Ação</th></tr></thead><tbody>${c.contracts.map(x=>`<tr><td>${esc(x.reference)}<small> ${esc(x.id)}</small></td><td>${esc(x.starts_at)} → ${esc(x.ends_at||'Sem término')}</td><td>${esc(this.contractState(x))}</td><td>${x.operational&&['ACTIVE','SUSPENDED'].includes(x.status)?`<button type="button" data-revoke="${esc(x.id)}">Revisar revogação</button>`:''}</td></tr>`).join('')}</tbody></table>`:'<p>Nenhum contrato cadastrado.</p>'}`;
      this.form=this.querySelector('form');
      this.form.addEventListener('input',()=>this.invalidate());
      this.form.addEventListener('change',e=>this.change(e));
      this.form.addEventListener('submit',e=>{e.preventDefault();this.preview(this.config());});
      this.querySelector('[data-school-search]').oninput=e=>{const q=e.target.value.toLocaleLowerCase();this.querySelectorAll('[data-school-row]').forEach(row=>row.hidden=!row.textContent.toLocaleLowerCase().includes(q));};
      this.querySelectorAll('[data-select-all]').forEach(b=>b.onclick=()=>{this.invalidate();const p=b.closest('[data-product]');p.querySelector('[data-product-enabled]').checked=true;p.querySelectorAll('[data-rule]').forEach(r=>{if(r.dataset.type!=='TRAINING')r.querySelector('input').checked=true;});});
      this.querySelectorAll('[data-clear-rules]').forEach(b=>b.onclick=()=>{this.invalidate();b.closest('[data-product]').querySelectorAll('[data-rule-enabled]').forEach(x=>x.checked=false);});
      this.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>{const reason=this.form.elements.reason.value.trim();if(reason.length<5){this.status('Preencha o motivo da revogação no campo Motivo.',true);return;}this.preview({action:'REVOKE',contract_id:b.dataset.revoke,reason});});
      try {const pending=JSON.parse(sessionStorage.getItem(this.pendingKey())||'null');if(pending?.review&&pending?.id){this.pendingConfirmation=true;this.review=pending.review;this.requestId=pending.id;this.showReview(this.review);this.status('Há uma confirmação sem recibo neste navegador. Confira a prévia e confirme novamente para recuperar a mesma operação: '+pending.id);}}catch{/* Ignore malformed local state. */}
    }
    invalidate() { this.generation=(this.generation||0)+1;this.review=null;this.querySelector('[data-review]').hidden=true; }
    status(message,error=false) { let el=this.querySelector('[data-status]');if(!el){el=document.createElement('p');el.dataset.status='';this.append(el);}el.textContent=message;el.setAttribute('role',error?'alert':'status'); }
    change(e) {
      this.invalidate();const f=this.form.elements;
      if(['starts_at','duration'].includes(e.target.name)) { f.ends_at.readOnly=f.duration.value==='12'; if(f.duration.value==='12') this.updateEnd(); }
      this.querySelector('[data-new-network]').hidden=!!f.network_id.value;
      this.querySelector('[data-new-school]').hidden=!f.create_school.checked;
      if(e.target.name==='renewal_mode') this.setProductEditing();
      if(e.target.name==='renewal_id') {
        const old=this.catalog.contracts.find(c=>c.id===f.renewal_id.value);this.querySelector('[data-contractor]').hidden=!!old;this.querySelector('[data-renewal-mode]').hidden=!old;f.renewal_mode.value='reuse';this.setProductEditing();
        this.querySelectorAll('[name=school_ids]').forEach(x=>x.checked=!!old?.school_ids.includes(x.value));
        this.querySelectorAll('[data-product-enabled],[data-rule-enabled],[data-institutional]').forEach(x=>x.checked=false);
        f.create_school.checked=false;this.querySelector('[data-new-school]').hidden=true;
        if(!old){this.renewalUnsupported=false;f.reference.value='';return;}
        f.reference.value=old.reference+' — renovação';f.starts_at.value=old.ends_at?new Date(Date.parse(old.ends_at+'T12:00:00Z')+86400000).toISOString().slice(0,10):'';this.updateEnd();
        const seen=new Set();let unsupported=false;
        for(const config of old.configurations){if(seen.has(config.product_id)){unsupported=true;continue;}seen.add(config.product_id);const p=this.querySelector(`[data-product="${CSS.escape(config.product_id)}"]`);if(!p){unsupported=true;continue;}p.open=true;p.querySelector('[data-product-enabled]').checked=true;p.querySelector('[data-institutional]').checked=config.institutional===true;
         for(const r of config.rules){const row=[...p.querySelectorAll('[data-rule]')].find(x=>x.dataset.module===r.module_id&&x.dataset.type===r.content_type&&x.dataset.grade===r.grade_id);if(!row||r.kind!=='STANDARD'){unsupported=true;continue;}row.querySelector('input').checked=true;row.querySelector('select').value=r.subject_id||'';}
        }
        this.querySelector('[data-renewal-note]').textContent=`Renova ${old.reference} (${old.starts_at} a ${old.ends_at||'sem término'}). A configuração anterior foi carregada. Revise escolas, categorias e nova vigência.`;
        if(unsupported)this.status('Há configurações específicas por escola. Reutilizar preserva essas diferenças, com detalhamento na prévia. Para alterar categorias ou incluir escolas, escolha a configuração uniforme. Amostras temporárias exigem revisão explícita.',false);
      }
    }
    setProductEditing() { const locked=!!this.form.elements.renewal_id.value&&this.form.elements.renewal_mode.value==='reuse';this.querySelectorAll('[data-product] input,[data-product] select,[data-product] button').forEach(x=>x.disabled=locked); }
    updateEnd() {
      const f=this.form.elements;
      if(!/^\d{4}-\d{2}-\d{2}$/.test(f.starts_at.value)){f.ends_at.value='';return;}
      const [y,m,d]=f.starts_at.value.split('-').map(Number);
      const last=new Date(Date.UTC(y+1,m,0)).getUTCDate();
      f.ends_at.value=new Date(Date.UTC(y+1,m-1,Math.min(d,last))-86400000).toISOString().slice(0,10);
    }
    config() {
      const f=this.form.elements;
      return {action:'CREATE',reuse_previous:!!f.renewal_id.value&&f.renewal_mode.value==='reuse',...(f.duration.value==='12'?{term_months:12}:{}),renewal_id:f.renewal_id.value||null,network_id:f.renewal_id.value?null:f.network_id.value||null,new_network:f.renewal_id.value||f.network_id.value?null:{name:f.network_name.value.trim(),code:f.network_code.value.trim()},reference:f.reference.value.trim(),starts_at:f.starts_at.value,ends_at:f.ends_at.value,school_ids:[...this.querySelectorAll('[name=school_ids]:checked')].map(x=>x.value),new_school:f.create_school.checked?{name:f.school_name.value.trim(),code:f.school_code.value.trim(),year:f.school_year.value,municipality:f.municipality.value.trim(),state:f.state.value.trim()}:null,reason:f.reason.value.trim(),adopt_dynamic:f.adopt_dynamic.checked,products:[...this.querySelectorAll('[data-product]')].filter(p=>p.querySelector('[data-product-enabled]').checked).map(p=>({product_id:p.dataset.product,institutional:p.querySelector('[data-institutional]').checked,rules:[...p.querySelectorAll('[data-rule]')].filter(r=>r.querySelector('input').checked).map(r=>({module_id:r.dataset.module,content_type:r.dataset.type,grade_id:r.dataset.grade,subject_id:r.querySelector('select').value||null,kind:'STANDARD'}))}))};
    }
    async preview(config) {
      this.invalidate();const generation=this.generation;this.status('Validando prévia…');
      try { const review=await this.rpc('admin_preview_contract_operation',{p_config:config});if(generation!==this.generation)return;this.review=review;this.requestId=crypto.randomUUID();this.showReview(review);this.status('Prévia pronta. Confira antes de confirmar.'); }
      catch(e){if(generation===this.generation)this.status('Falha na prévia: '+e.message,true);}
    }
    ruleLabel(r) { return `${labels[r.content_type]||r.content_type} · ${this.catalog.taxonomy.find(g=>g.grade_id===r.grade_id)?.grade_name||r.grade_id} · ${this.catalog.subjects.find(s=>s.id===r.subject_id)?.name||'Todos os temas'}`; }
    showReview(review) {
      const cfg=review.config;const host=this.querySelector('[data-review]');host.hidden=false;
      const old=review.previous_contract;
      const previous=this.catalog.contracts.find(c=>c.id===old?.id);
      const ruleKey=(product,r)=>JSON.stringify([product,r.module_id,r.content_type,r.grade_id,r.subject_id||null,r.kind]);
      const oldRules=new Map((previous?.configurations||[]).flatMap(p=>p.rules.map(r=>[ruleKey(p.product_id,r),r])));
      const nextRules=new Map((cfg.products||[]).flatMap(p=>(p.school_rules?Object.values(p.school_rules).flat():p.rules).map(r=>[ruleKey(p.product_id,r),r])));
      const removed=[...oldRules].filter(([key])=>!nextRules.has(key)).map(([,r])=>r);
      const added=[...nextRules].filter(([key])=>!oldRules.has(key)).map(([,r])=>r);
      host.innerHTML=`<h3>${cfg.action==='REVOKE'?'Revogar contrato':'Confirmar novo vínculo contratual'}</h3><p>Contratante: ${esc(review.contractor?.name||'Escola contratante')} ${esc(review.contractor?.code||'')}</p><p>${esc(cfg.reference||old?.contract_ref)} — ${esc(cfg.starts_at||old?.starts_at)} a ${esc(cfg.ends_at||old?.ends_at)}</p>${old?`<p>Anterior: ${esc(old.contract_ref)} — ${esc(old.starts_at)} a ${esc(old.ends_at||'sem término')}. Histórico preservado.</p>`:''}<ul>${(review.schools||[]).map(s=>`<li>${esc(s.name)} — ${esc(s.id)} (${esc(s.status)})</li>`).join('')}${(review.removed_schools||[]).map(s=>`<li>Removida na renovação: ${esc(s.name)} — ${esc(s.id)}. O contrato anterior deixa de liberar categorias na nova vigência.</li>`).join('')}${cfg.new_school?`<li>Nova escola: ${esc(cfg.new_school.name)} / ${esc(cfg.new_school.code)} — será criada inativa.</li>`:''}</ul>
      ${(cfg.products||[]).map(p=>`<h4>${esc(this.catalog.products.find(x=>x.id===p.product_id)?.name)}</h4>${p.school_rules?Object.entries(p.school_rules).map(([sid,rules])=>`<details><summary>Configuração preservada: ${esc(this.catalog.schools.find(s=>s.id===sid)?.name||sid)}</summary><p>Restrições da licença anterior mantidas. Módulos desabilitados: ${esc(Object.entries(p.school_module_overrides?.[sid]||{}).filter(([,enabled])=>!enabled).map(([id])=>this.catalog.products.find(x=>x.id===p.product_id)?.modules.find(m=>m.id===id)?.name||id).join(', ')||'nenhum override desabilitado')}</p><ul>${rules.map(r=>`<li>${esc(this.ruleLabel(r))}</li>`).join('')}</ul></details>`).join(''):`<ul>${p.rules.map(r=>`<li>${esc(this.ruleLabel(r))}</li>`).join('')}</ul>`}`).join('')}
      ${old?`<details><summary>Mudanças de categorias: ${added.length} adicionadas e ${removed.length} retiradas</summary><ul>${added.map(r=>`<li>Adicionar: ${esc(this.ruleLabel(r))}</li>`).join('')}${removed.map(r=>`<li>Retirar: ${esc(this.ruleLabel(r))}</li>`).join('')}</ul></details>`:''}<p>${esc(review.effects.warning)}</p><p>Motivo: ${esc(cfg.reason)}</p><label><input type="checkbox" data-confirm-check> Conferi alvos, mudanças e vigência.</label><button type="button" class="is-primary" data-confirm disabled>${cfg.action==='REVOKE'?'Confirmar revogação':'Confirmar e salvar contrato'}</button><button type="button" data-cancel>Voltar e editar</button>`;
      host.querySelector('[data-confirm-check]').onchange=e=>host.querySelector('[data-confirm]').disabled=!e.target.checked;
      host.querySelector('[data-cancel]').onclick=()=>{if(this.pendingConfirmation)return;this.invalidate();};
      if(this.pendingConfirmation)this.lockPending();
      host.querySelector('[data-confirm]').onclick=()=>this.confirm();
    }
    lockPending() {
      this.form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=true);
      this.querySelector('[data-cancel]').disabled=true;
      this.querySelectorAll('[data-revoke]').forEach(x=>x.disabled=true);
    }
    showSuccess(receipt,id) {
      this.review=null;this.pendingConfirmation=false;
      this.innerHTML=`<section class="co-review" role="status"><h2>Contrato ${receipt.action==='REVOKE'?'revogado':'salvo'}</h2><p>Operação registrada. Contrato ${esc(receipt.contract_id)}. Recibo ${esc(id)}.</p><p>A situação das escolas foi preservada.</p><button type="button" class="is-primary" data-new-contract>Criar outro contrato</button><button type="button" data-contract-list>Voltar à lista de contratos</button></section>`;
      this.rpc('admin_get_contract_operations').then(catalog=>{this.catalog=catalog;}).catch(()=>{this.status('Contrato salvo. A lista não pôde ser atualizada; use Voltar à lista para tentar novamente.');});
      this.querySelector('[data-new-contract]').onclick=()=>this.load();
      this.querySelector('[data-contract-list]').onclick=async()=>{await this.load();this.querySelector('h3')?.scrollIntoView({block:'start'});};
    }
    async confirm() {
      if(!this.review||this.saving)return;this.saving=true;this.pendingConfirmation=true;const review=this.review,id=this.requestId;this.rememberPending({review,id});
      const controls=[...this.querySelectorAll('input,select,textarea,button')];const states=controls.map(x=>x.disabled);controls.forEach(x=>x.disabled=true);this.status('Gravando operação '+id+'…');
      try { const receipt=await this.rpc('admin_confirm_contract_operation',{p_review:review,p_request_id:id});if(!receipt.contract_id)throw Error('Resposta sem recibo contratual.');this.rememberPending(null);this.showSuccess(receipt,id); }
      catch(e){controls.forEach((x,i)=>x.disabled=states[i]);if(/STALE_CONTRACT_REVIEW/.test(e.message)){this.pendingConfirmation=false;this.rememberPending(null);this.form.querySelectorAll('input,select,textarea,button').forEach(x=>x.disabled=false);this.setProductEditing();this.invalidate();this.status('A prévia ficou desatualizada. Revise novamente os alvos e a configuração antes de confirmar.',true);}else{this.lockPending();this.status('Não foi possível confirmar o resultado: '+e.message+'. Recibo '+id+'. Tente novamente para recuperar a mesma operação; não crie outra.',true);}}
      finally{this.saving=false;}
    }
  }
  customElements.define('contract-operations',ContractOperations);
})();
