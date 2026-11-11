import {createLearningClient, SESSION_KEY, readSession} from './client.mjs';
import {labels, escape as e, visibleCourses, counts, dateLabel, localToday, queryDraft, normalizeData} from './model.mjs';
const main = document.querySelector('#main'), dialog = document.querySelector('#course-dialog'), toast = document.querySelector('#toast');
const api = createLearningClient({config: window.RAIZES_SUPABASE});
let data = {courses: [], certificates: []}, filter = 'all', search = '', controller = new AbortController(), generation = 0, privacyEpoch = 0, prefillOpened = false, returnFocus, toastTimer;
const messages = {
  already_saved: 'Este curso ou arquivo já está salvo. Confira também os arquivados.',
  invalid_course: 'Confira o nome do curso e a instituição responsável.', invalid_url: 'Use um endereço HTTPS público e sem dados de acesso, de preferência da instituição responsável.',
  invalid_status: 'Escolha uma situação para este curso.', completion_declaration_required: 'Confirme a declaração de conclusão para continuar.',
  invalid_completion_date: 'Informe uma data de conclusão válida, não posterior a hoje.',
  invalid_file_size: 'Escolha um arquivo com até 10 MB.', request_too_large: 'O arquivo ultrapassa o limite de 10 MB.',
  invalid_file_type: 'O conteúdo do arquivo precisa corresponder ao formato PDF, PNG ou JPEG informado.',
  course_not_found: 'Este curso não está disponível. Atualize a lista.', certificate_not_found: 'Este certificado não está disponível para sua conta.',
  certificate_unavailable: 'Não foi possível abrir o certificado agora. Tente novamente mais tarde.',
  certificate_limit: 'Este curso já tem 10 arquivos. Guarde os demais com você.', course_limit: 'Você atingiu o limite de 500 cursos neste espaço.',
};
function notify(text) { clearTimeout(toastTimer); toast.textContent = text; toast.hidden = false; toastTimer = setTimeout(() => { toast.hidden = true; }, 7500); }
function clearPrivateView() { controller.abort(); controller = new AbortController(); generation++; privacyEpoch++; data = {courses: [], certificates: []}; if (dialog.open) dialog.close(); dialog.replaceChildren(); toast.hidden = true; }
function locked(forbidden = false) {
  clearPrivateView();
  main.innerHTML = `<section class="access-state"><span class="eyebrow">ESPAÇO PESSOAL PROTEGIDO</span><div class="lock-icon" aria-hidden="true">⌑</div><h1>${forbidden ? 'Seu perfil ainda não tem acesso' : 'Sua formação tem um lugar aqui'}</h1><p>${forbidden ? 'Este espaço está disponível para perfis ativos de docentes, coordenação, gestão e administração. Se precisar, converse com a equipe responsável pela sua conta.' : 'Entre com sua conta da plataforma para organizar cursos externos e guardar seus certificados de forma privada.'}</p><div class="state-actions"><a class="button primary" href="login.html?auth=supabase&next=${encodeURIComponent('personal-learning.html' + location.search)}">${forbidden ? 'Entrar com outra conta' : 'Entrar na plataforma'}</a><a class="button secondary" href="universidade.html#catalogo">Conhecer cursos gratuitos</a></div><p class="small">Você usa o mesmo acesso da plataforma. Não é necessário criar outra conta.</p></section>`;
}
function handleError(error, target) {
  if (error?.name === 'AbortError') return;
  if (error?.status === 401) { locked(); return; }
  if (error?.status === 403) { locked(true); return; }
  const text = messages[error?.code] || 'Não foi possível confirmar a operação. Atualize a lista antes de tentar novamente.';
  if (target) { target.hidden = false; target.textContent = text; target.focus(); } else notify(text);
}
function render() {
  const c = counts(data.courses);
  main.innerHTML = `<section class="hero"><div class="hero-copy"><span class="eyebrow">MEU PERCURSO · FORMAÇÃO EXTERNA</span><h1>Aprender faz parte<br />de quem ensina.</h1><p>Um lugar para organizar seus cursos, acompanhar o que está em andamento e guardar cada conquista.</p><div class="hero-actions"><button class="button primary" data-add>＋ Adicionar curso</button><a class="text-link" href="universidade.html#catalogo">Descobrir cursos gratuitos <span aria-hidden="true">↗</span></a></div></div><aside class="journey-card" aria-label="Resumo da minha formação"><span class="eyebrow">SEU PERCURSO ATÉ AQUI</span><div class="journey-counts"><div><strong>${c.saved}</strong><span>Quero fazer</span></div><div><strong>${c.in_progress}</strong><span>Em andamento</span></div><div><strong>${c.completed}</strong><span>Concluídos*</span></div></div><p>*Conclusões informadas por você.</p><span class="private-label">◈ Visível apenas para sua conta</span></aside></section>
  <div class="privacy-note"><span aria-hidden="true">i</span><p>Os cursos e certificados são oferecidos por instituições externas. Aqui você organiza seus registros pessoais. A plataforma não emite esses certificados nem verifica sua autenticidade ou reconhecimento.</p></div>
  <section class="course-section" aria-labelledby="course-heading"><div class="section-title"><div><span class="eyebrow">ORGANIZE SEU PRÓXIMO PASSO</span><h2 id="course-heading">Meus cursos e certificados</h2></div><button class="button subtle" data-refresh>Atualizar lista <span aria-hidden="true">↻</span></button></div>
  <div class="toolbar"><div class="filters" role="group" aria-label="Filtrar cursos">${[['all','Todos'], ...Object.entries(labels), ['archived','Arquivados']].map(([key,label]) => `<button data-filter="${key}" aria-pressed="${key === filter}">${label}<span>${c[key]}</span></button>`).join('')}</div><label class="search"><span class="sr-only">Buscar curso ou instituição</span><input type="search" id="search" placeholder="Buscar curso ou instituição" value="${e(search)}" maxlength="180" /></label></div>
  <div id="course-list" class="course-list"></div><p class="storage-note">Arquivos aceitos: PDF, PNG e JPEG, até 10 MB cada. Até 10 arquivos por curso. Seus arquivos são privados e não aparecem no catálogo público.</p></section>`;
  renderList();
}
function renderList() {
  const courses = visibleCourses(data.courses, filter, search), list = main.querySelector('#course-list'); if (!list) return;
  list.innerHTML = courses.length ? courses.map(course => card(course)).join('') : `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">✧</span><h3>${search ? 'Nenhum resultado por aqui' : filter === 'all' ? 'Seu percurso começa com um curso' : filter === 'archived' ? 'Nenhum curso arquivado' : 'Ainda não há cursos nesta etapa'}</h3><p>${search ? 'Tente outro nome de curso ou instituição.' : filter === 'all' ? 'Adicione um curso que deseja fazer ou registre uma formação que já concluiu.' : filter === 'archived' ? 'Ao arquivar, seus registros e arquivos continuam guardados.' : 'Adicione um curso ou altere a situação de um registro existente.'}</p>${!search && filter !== 'archived' ? '<button class="button secondary" data-add>Adicionar meu primeiro curso</button>' : ''}</div>`;
}
function card(course) {
  const certs = data.certificates.filter(c => c.course_id === course.id);
  return `<article class="course-card" data-course="${e(course.id)}"><div class="course-top"><div class="course-monogram" aria-hidden="true">${e(course.provider.charAt(0).toLocaleUpperCase('pt-BR'))}</div><div class="course-info"><span class="provider">${e(course.provider)}</span><h3>${e(course.title)}</h3><div class="course-meta"><span class="badge ${course.status}">${course.archived_at ? 'Arquivado · ' : ''}${e(course.status === 'completed' ? 'Concluído' : labels[course.status])}</span>${course.status === 'completed' ? `<span>Conclusão declarada em ${e(dateLabel(course.completed_on))}</span>` : '<span>Acompanhamento informado por você</span>'}</div></div></div>
  <div class="course-actions"><a href="${e(course.source_url)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Ir para a instituição <span aria-hidden="true">↗</span></a><div>${!course.archived_at ? `<button data-edit="${e(course.id)}">Gerenciar curso</button>` : ''}<button data-archive="${e(course.id)}" data-archived="${!course.archived_at}">${course.archived_at ? 'Restaurar' : 'Arquivar'}</button></div></div>
  <details class="certificates"><summary>Certificados e comprovantes <span>${certs.length} ${certs.length === 1 ? 'arquivo' : 'arquivos'}</span></summary><div class="certificate-content"><p class="small">Evidências externas enviadas por você, sem verificação de autenticidade.</p>${certs.length ? `<ul class="certificate-list">${certs.map(cert => `<li><div><strong>${e(cert.original_name)}</strong><span>${(cert.byte_size / 1024 / 1024).toFixed(2).replace('.', ',')} MB · Enviado em ${e(dateLabel(cert.created_at))}</span></div><button data-download="${e(cert.id)}" class="button secondary" aria-label="Baixar ${e(cert.original_name)}">Baixar ↓</button></li>`).join('')}</ul>` : '<p class="no-certificate">Nenhum arquivo anexado. O curso pode ser acompanhado mesmo sem certificado.</p>'}${!course.archived_at && certs.length < 10 ? `<form data-upload="${e(course.id)}" class="upload-form"><label for="file-${e(course.id)}">Adicionar certificado emitido pela instituição</label><input id="file-${e(course.id)}" name="certificate" type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" required aria-describedby="file-help-${e(course.id)}" /><p class="small" id="file-help-${e(course.id)}">PDF, PNG ou JPEG, até 10 MB. Ao enviar, o arquivo será armazenado de forma privada na sua conta. Confira se pertence a você antes de enviar.</p><button class="button primary" type="submit">Guardar arquivo</button><p class="inline-error" role="alert" tabindex="-1" hidden></p></form>` : ''}</div></details></article>`;
}
function openEditor(course = {}) {
  returnFocus = document.activeElement;
  const completed = course.status === 'completed';
  dialog.innerHTML = `<form id="course-form"><div class="dialog-header"><div><span class="eyebrow">MEU PERCURSO</span><h2 id="editor-title">${course.id ? 'Gerenciar curso' : 'Adicionar curso externo'}</h2></div><button type="button" class="close" data-close aria-label="Fechar">×</button></div><p class="editor-intro">Registre o curso e a instituição responsável. O acesso às aulas e a emissão de certificados continuam no site da instituição.</p>
  ${course.id ? `<input type="hidden" name="id" value="${e(course.id)}" />` : ''}<label>Nome do curso<input name="title" required maxlength="180" value="${e(course.title)}" autocomplete="off" /></label><label>Instituição responsável<input name="provider" required maxlength="120" value="${e(course.provider)}" autocomplete="organization" /></label><label>Link do curso na instituição<input name="url" type="url" pattern="https://.*" placeholder="https://" required maxlength="2048" value="${e(course.source_url)}" /></label><p class="field-help">Prefira o endereço oficial e não inclua senhas, códigos de acesso ou links privados.</p><label>Situação do curso<select name="status">${Object.entries(labels).map(([value,label]) => `<option value="${value}" ${(course.status || 'saved') === value ? 'selected' : ''}>${value === 'completed' ? 'Concluído' : label}</option>`).join('')}</select></label>
  <div id="completion-fields" class="completion-fields" ${completed ? '' : 'hidden'}><label>Data de conclusão<input name="completedOn" type="date" max="${localToday()}" min="1900-01-01" value="${e(course.completed_on || localToday())}" ${completed ? 'required' : ''} /></label><label class="check"><input type="checkbox" name="completedDeclaration" ${completed ? 'required' : ''} /><span>Declaro que concluí este curso na instituição indicada. Entendo que este registro não é uma validação da plataforma.</span></label></div><p class="inline-error" role="alert" tabindex="-1" hidden></p><div class="dialog-actions"><button class="button secondary" type="button" data-close>Cancelar</button><button class="button primary" type="submit">Salvar curso</button></div></form>`;
  dialog.showModal(); dialog.querySelector('[name=title]').focus();
}
function upsert(course) {
  generation++;
  const courses = [course, ...data.courses.filter(c => c.id !== course.id)];
  data = normalizeData({...data, courses}); render();
}
async function load({initial = false} = {}) {
  if (!api.hasSession()) { locked(); return; }
  const current = ++generation;
  if (initial) main.innerHTML = '<div class="loading" role="status">Carregando seus cursos e certificados…</div>';
  try {
    const result = await api.list({signal: controller.signal}); if (current !== generation) return;
    data = result; render();
    if (!prefillOpened) { prefillOpened = true; const draft = queryDraft(location.search); if (draft) { const existing = data.courses.find(c => c.source_url === draft.source_url && !c.archived_at); openEditor(existing ? {...existing, status: draft.status} : draft); } }
  } catch (error) {
    if (error?.status === 401 || error?.status === 403 || error?.name === 'AbortError') { handleError(error); return; }
    if (initial) main.innerHTML = '<section class="access-state"><span class="eyebrow">MINHA FORMAÇÃO</span><h1>Não foi possível carregar seu espaço</h1><p>Tente novamente em instantes. Se o problema continuar, procure a equipe responsável pela plataforma.</p><button class="button primary" data-refresh>Tentar novamente</button></section>';
    else handleError(error);
  }
}
main.addEventListener('input', event => { if (event.target.id === 'search') { search = event.target.value; renderList(); } });
main.addEventListener('click', async event => {
  const button = event.target.closest('button'); if (!button) return;
  if (button.hasAttribute('data-add')) return openEditor();
  if (button.hasAttribute('data-edit')) return openEditor(data.courses.find(c => c.id === button.dataset.edit));
  if (button.hasAttribute('data-filter')) { filter = button.dataset.filter; render(); main.querySelector(`[data-filter="${filter}"]`).focus(); return; }
  if (button.hasAttribute('data-refresh')) { button.disabled = true; await load({initial: !main.querySelector('#course-list')}); if (button.isConnected) button.disabled = false; return; }
  const operationGeneration = privacyEpoch;
  button.disabled = true;
  try {
    if (button.dataset.archive) { const archived = button.dataset.archived === 'true'; const result = await api.archive(button.dataset.archive, archived, {signal: controller.signal}); if (operationGeneration !== privacyEpoch) return; upsert(result.course); notify(archived ? 'Curso arquivado. Seus registros e arquivos continuam guardados.' : 'Curso restaurado.'); }
    if (button.dataset.download) {
      const result = await api.certificate(button.dataset.download, {signal: controller.signal});
      if (operationGeneration !== privacyEpoch) return;
      const a = document.createElement('a'); a.href = result.signedUrl; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.referrerPolicy = 'no-referrer'; a.click();
      notify('Acesso ao arquivo liberado por 60 segundos. Se o navegador bloquear a abertura, tente novamente.');
    }
  } catch (error) { handleError(error); } finally { if (button.isConnected) button.disabled = false; }
});
main.addEventListener('submit', async event => {
  const form = event.target.closest('[data-upload]'); if (!form) return; event.preventDefault();
  const file = form.querySelector('input[type=file]').files[0], errorBox = form.querySelector('.inline-error'), button = form.querySelector('button');
  if (!file) return;
  if (!file.size || file.size > 10485760) { handleError({code: 'invalid_file_size'}, errorBox); return; }
  if (!['application/pdf','image/png','image/jpeg'].includes(file.type)) { handleError({code: 'invalid_file_type'}, errorBox); return; }
  const operationGeneration = privacyEpoch;
  button.disabled = true; button.textContent = 'Guardando arquivo…'; errorBox.hidden = true;
  try { const result = await api.upload(form.dataset.upload, file, {signal: controller.signal}); if (operationGeneration !== privacyEpoch) return; generation++; data = normalizeData({...data, certificates: [...data.certificates, result.certificate]}); render(); const details = main.querySelector(`[data-course="${form.dataset.upload}"] details`); if (details) details.open = true; notify('Arquivo guardado de forma privada. Autenticidade não verificada.'); }
  catch (error) { handleError(error, errorBox); }
  finally { if (button.isConnected) { button.disabled = false; button.textContent = 'Guardar arquivo'; } }
});
dialog.addEventListener('click', event => { if (event.target.closest('[data-close]') && !dialog.querySelector('[type=submit]')?.disabled) dialog.close(); });
dialog.addEventListener('cancel', event => { if (dialog.querySelector('[type=submit]')?.disabled) event.preventDefault(); });
dialog.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus(); else main.querySelector('[data-add]')?.focus(); });
dialog.addEventListener('change', event => {
  if (event.target.name !== 'status') return; const isCompleted = event.target.value === 'completed';
  dialog.querySelector('#completion-fields').hidden = !isCompleted;
  dialog.querySelector('[name=completedOn]').required = isCompleted;
  dialog.querySelector('[name=completedDeclaration]').required = isCompleted;
  dialog.querySelector('[name=completedDeclaration]').checked = false;
});
dialog.addEventListener('submit', async event => {
  event.preventDefault(); const form = event.target, button = form.querySelector('[type=submit]'), errorBox = form.querySelector('.inline-error');
  if (button.disabled) return;
  const fields = Object.fromEntries(new FormData(form)); fields.completedDeclaration = form.elements.completedDeclaration.checked;
  const operationGeneration = privacyEpoch;
  button.disabled = true; button.textContent = 'Salvando…'; errorBox.hidden = true;
  try { const result = await api.save(fields, {signal: controller.signal}); if (operationGeneration !== privacyEpoch) return; upsert(result.course); dialog.close(); if (location.search) history.replaceState(null, '', location.pathname); notify('Curso salvo no seu espaço pessoal.'); }
  catch (error) { handleError(error, errorBox); }
  finally { if (button.isConnected) { button.disabled = false; button.textContent = 'Salvar curso'; } }
});
// Clear personal content immediately after logout or account change in another tab.
window.addEventListener('storage', event => { if (!event.key || event.key === SESSION_KEY) { clearPrivateView(); if (readSession(localStorage)) load({initial: true}); else locked(); } });
window.addEventListener('pageshow', event => { if (event.persisted) { clearPrivateView(); load({initial: true}); } });
load({initial: true});
