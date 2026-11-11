import {createTrainingClient, SESSION_KEY, TOKEN_KEY, formatDuration, groupLessons, hierarchyKey} from './client.mjs';
const main = document.querySelector('#formation-main');
const announcer = document.querySelector('#announcer');
const client = createTrainingClient({config: window.RAIZES_SUPABASE});
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const paths = {
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
  book: '<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Zm0 0v15"/>',
  play: '<path d="m9 5 11 7-11 7Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Zm-4 10 3 3 5-6"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 14-2l1 2M4 16l1 2a8 8 0 0 0 14-2"/>',
  headphones: '<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="5" height="9" rx="2"/><rect x="16" y="12" width="5" height="9" rx="2"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.book}</svg>`;
const illustration = `<div class="learning-art" aria-hidden="true"><div class="art-orbit art-orbit-one"></div><div class="art-orbit art-orbit-two"></div><img class="university-art" src="assets/universidade/banner-principal.webp" width="340" height="178" alt="" /><span class="art-caption">Saberes que florescem.</span><span class="art-spark">✦</span></div>`;
const collectionCover = lesson => lesson?.hierarchy.collection === 'Avalia+' && lesson.hierarchy.schoolYear === '1º ano' && lesson.hierarchy.volume === '1'
  ? '<img class="collection-cover" src="assets/colecoes/oficiais/rs2026-avalia-01-v1-professor.webp" width="600" height="849" alt="Capa Avalia+, 1º ano, volume 1, manual do professor" />' : '';

let catalog = null, selected = null, requestController = null, mediaController = null, loadVersion = 0, mediaVersion = 0;
let pendingMedia = false, lastKind = 'video', resumeTime = 0;
const loginHref = 'login.html?auth=supabase&next=formacao.html';
const announce = message => { announcer.textContent = message; };
function disposeMedia() {
  mediaVersion++; mediaController?.abort(); mediaController = null; pendingMedia = false;
  const media = main.querySelector('video, audio');
  if (media) { media.pause(); media.removeAttribute('src'); media.load(); }
}
const hero = (compact = false) => `<section class="formation-hero ${compact ? 'is-compact' : ''}" aria-labelledby="formation-title"><div class="hero-copy"><span class="eyebrow"><span class="eyebrow-dot"></span> UNIVERSIDADE RAÍZES E SABERES</span><h1 id="formation-title">Aprender para<br /><em>transformar a prática.</em></h1><p>Um espaço para aprofundar seus saberes e levar novas possibilidades para a sala de aula.</p><span class="hero-seal">${icon('shield')} Formação docente · Acesso institucional</span></div>${illustration}</section>`;
const structure = `<section class="learning-structure" aria-labelledby="structure-title"><div><span class="section-eyebrow">UM PERCURSO BEM ORGANIZADO</span><h2 id="structure-title">Da coleção à sua próxima aula.</h2><p>Encontre cada orientação no lugar certo, acompanhando a organização dos materiais pedagógicos.</p></div><ol class="structure-steps"><li><span>01</span><strong>Coleção</strong><small>O ponto de partida</small></li><li><span>02</span><strong>Ano / faixa etária</strong><small>Seu contexto de ensino</small></li><li><span>03</span><strong>Volume</strong><small>Uma etapa de cada vez</small></li><li><span>04</span><strong>Unidade</strong><small>Saberes conectados</small></li><li><span>05</span><strong>Aula</strong><small>Da escuta à prática</small></li></ol></section>`;
function renderGate(kind) {
  disposeMedia(); catalog = null; selected = null;
  const states = {
    session: {tag: 'SEU ESPAÇO DE FORMAÇÃO', title: 'Vamos começar?', body: 'Entre com sua conta institucional para consultar as aulas de formação disponíveis para o seu perfil e a sua escola.', action: `<a class="button button-primary" href="${loginHref}">Entrar na formação ${icon('arrow')}</a>`, note: 'O acesso às aulas depende de uma licença de formação ativa.'},
    expired: {tag: 'ACESSO PROTEGIDO', title: 'Entre novamente para continuar.', body: 'Sua sessão precisa ser renovada. Faça login com sua conta institucional para consultar as aulas.', action: `<a class="button button-primary" href="${loginHref}">Entrar novamente ${icon('arrow')}</a>`, note: 'Seu acesso será verificado novamente após o login.'},
    license: {tag: 'ACESSO INSTITUCIONAL', title: 'Sua formação começa com a licença da escola.', body: 'Não identificamos uma licença de formação ativa para o seu acesso. Consulte a gestão da sua escola sobre a habilitação deste espaço.', action: `<button class="button button-primary" type="button" data-retry>Verificar acesso novamente ${icon('refresh')}</button>`, note: 'As aulas são liberadas conforme o vínculo institucional e a licença de formação.'},
    denied: {tag: 'ACESSO INSTITUCIONAL', title: 'Este acesso ainda não está disponível.', body: 'Não foi possível autorizar a formação para seu perfil ou vínculo institucional. Consulte a gestão da escola para verificar seu acesso.', action: `<button class="button button-primary" type="button" data-retry>Verificar acesso novamente ${icon('refresh')}</button>`, note: 'A área de formação exige um perfil e um vínculo ativos e autorizados.'},
    error: {tag: 'VAMOS TENTAR NOVAMENTE', title: 'Não foi possível consultar sua formação.', body: 'A verificação de acesso está indisponível neste momento. Confira sua conexão e tente novamente.', action: `<button class="button button-primary" type="button" data-retry>Tentar novamente ${icon('refresh')}</button>`, note: 'Nenhuma aula foi carregada sem a confirmação de acesso.'},
    loading: {tag: 'ACESSO INSTITUCIONAL', title: 'Preparando seu espaço.', body: 'Estamos verificando sua sessão e as aulas autorizadas para o seu perfil.', action: '<span class="checking" role="status"><span class="spinner" aria-hidden="true"></span> Consultando acesso…</span>', note: 'Apenas conteúdos autorizados serão exibidos.'},
  };
  const s = states[kind] || states.error;
  main.innerHTML = `<div class="page-width gate-page">${hero()}<section class="access-card" aria-labelledby="access-title" ${kind === 'loading' ? 'aria-busy="true"' : ''}><div class="access-icon">${icon(kind === 'error' ? 'refresh' : 'lock')}</div><div class="access-copy"><span class="section-eyebrow">${s.tag}</span><h2 id="access-title">${s.title}</h2><p>${s.body}</p><div class="access-actions">${s.action}<a class="text-link" href="universidade.html#catalogo">Explorar cursos gratuitos ${icon('arrow')}</a></div><small>${icon('shield')}${s.note}</small></div></section>${structure}<a class="personal-link" href="personal-learning.html">Meus cursos e certificados ${icon('arrow')}</a></div>`;
  document.querySelector('#panel-link').href = 'plataforma.html';
  document.querySelector('#panel-link').innerHTML = 'Voltar à plataforma <span aria-hidden="true">→</span>';
  announce(kind === 'loading' ? 'Verificando acesso à formação.' : s.title);
}
function renderTree() {
  const groups = groupLessons(catalog.lessons);
  return [...groups.values()].map(group => {
    const isCurrent = [...group.years.values()].some(volumes => [...volumes.values()].some(units => [...units.values()].some(lessons => lessons.some(lesson => lesson.id === selected?.id))));
    return `<details class="collection-group" ${isCurrent ? 'open' : ''}><summary>${icon('book')}<span><small>COLEÇÃO</small>${escape(group.label)}</span>${icon('chevron', 'disclosure-icon')}</summary><div class="collection-content">${[...group.years.entries()].map(([year, volumes]) => `<details class="year-group" ${year === selected?.hierarchy.schoolYear ? 'open' : ''}><summary>${escape(year)}${icon('chevron', 'disclosure-icon')}</summary>${[...volumes.entries()].map(([volume, units]) => `<details class="volume-group" ${volume === selected?.hierarchy.volume ? 'open' : ''}><summary>Volume ${escape(volume)}${icon('chevron', 'disclosure-icon')}</summary>${[...units.entries()].map(([unit, lessons]) => `<details class="unit-group" ${lessons.some(l => l.id === selected?.id) ? 'open' : ''}><summary><span>Unidade ${escape(unit)}${lessons[0].hierarchy.unitTitle ? `<span class="unit-name">${escape(lessons[0].hierarchy.unitTitle)}</span>` : ''}</span><small>${lessons.length} ${lessons.length === 1 ? 'aula' : 'aulas'}</small>${icon('chevron', 'disclosure-icon')}</summary><ol class="lesson-list">${lessons.map(lesson => `<li><button type="button" class="lesson-option ${lesson.id === selected?.id ? 'is-selected' : ''}" data-lesson="${escape(lesson.id)}" ${lesson.id === selected?.id ? 'aria-current="true"' : ''}><span class="lesson-number">${lesson.id === selected?.id ? icon('play') : escape(String(lesson.lessonNumber ?? '•').padStart(2, '0'))}</span><span class="lesson-option-copy"><small>AULA ${escape(String(lesson.lessonNumber ?? ''))}${lesson.durationSeconds ? ` <span aria-hidden="true">·</span> ${formatDuration(lesson.durationSeconds)}` : ''}</small><strong>${escape(lesson.title)}</strong>${lesson.status !== 'published' ? `<span class="review-label">${lesson.status === 'review' ? 'Em revisão' : 'Rascunho'} · Admin</span>` : ''}${!lesson.canPlay ? '<span class="pending-label">Mídia em preparação</span>' : ''}</span></button></li>`).join('')}</ol></details>`).join('')}</details>`).join('')}</details>`).join('')}</div></details>`;
  }).join('');
}
function cover(message = '') {
  const lesson = selected, playable = lesson.canPlay;
  return `<div class="player-cover"><div class="cover-decor" aria-hidden="true"><span></span><span></span><span></span></div><span class="cover-brand">RAÍZES E SABERES <span>FORMAÇÃO DOCENTE</span></span><div class="cover-center">${playable ? `<button type="button" class="play-button" data-play="${escape(lastKind)}" aria-label="${message ? 'Tentar reproduzir novamente' : 'Reproduzir ' + lesson.title}">${icon(message ? 'refresh' : 'play')}</button>` : `<span class="unavailable-symbol">${icon('book')}</span>`}<strong>${message ? 'Vamos retomar?' : playable ? (lastKind === 'audio' ? 'Ouvir a aula' : 'Assistir à aula') : 'Conteúdo em preparação'}</strong><p>${message ? escape(message) : playable ? 'Seu momento de aprender começa aqui.' : 'A mídia desta aula ainda não está disponível.'}</p></div><span class="cover-foot">${icon('lock')} Reprodução com acesso protegido${lesson.durationSeconds ? `<span>${icon('clock')}${formatDuration(lesson.durationSeconds)}</span>` : ''}</span></div>`;
}
function renderWorkspace() {
  disposeMedia();
  const collections = groupLessons(catalog.lessons).size;
  const units = new Set(catalog.lessons.map(hierarchyKey)).size;
  document.querySelector('#panel-link').href = catalog.actor === 'admin' ? 'admin.html' : 'professor.html?view=formacao';
  document.querySelector('#panel-link').innerHTML = `Voltar ao ${catalog.actor === 'admin' ? 'painel' : 'professor'} <span aria-hidden="true">→</span>`;
  if (!catalog.lessons.length) {
    main.innerHTML = `<div class="page-width">${hero(true)}<section class="empty-catalog"><span class="access-icon">${icon('book')}</span><span class="section-eyebrow">SEU ESPAÇO ESTÁ PRONTO</span><h2>As próximas aulas chegarão por aqui.</h2><p>Seu acesso foi verificado. Ainda não há aulas publicadas disponíveis para o seu vínculo.</p><button class="button button-primary" data-retry>Consultar novamente ${icon('refresh')}</button><a class="text-link" href="universidade.html#catalogo">Explorar cursos gratuitos ${icon('arrow')}</a></section></div>`;
    return;
  }
  const h = selected.hierarchy, duration = formatDuration(selected.durationSeconds), index = catalog.lessons.findIndex(l => l.id === selected.id);
  main.innerHTML = `<div class="page-width workspace-page"><section class="workspace-heading"><div><span class="section-eyebrow">UNIVERSIDADE RAÍZES E SABERES</span><h1>Minha formação</h1><p>Conhecimento que acompanha sua prática, aula por aula.</p></div><span class="access-badge">${icon('shield')}${catalog.actor === 'admin' ? 'Visualização administrativa' : 'Acesso institucional verificado'}</span></section><div class="workspace-layout"><aside class="course-sidebar" aria-label="Percurso de formação"><div class="sidebar-heading">${collectionCover(selected)}<span class="section-eyebrow">SEU PERCURSO</span><h2>Explore as aulas</h2><p>${collections} ${collections === 1 ? 'coleção' : 'coleções'} <span aria-hidden="true">·</span> ${units} ${units === 1 ? 'unidade' : 'unidades'} <span aria-hidden="true">·</span> ${catalog.lessons.length} ${catalog.lessons.length === 1 ? 'aula' : 'aulas'}</p></div><nav aria-label="Coleções, anos, volumes, unidades e aulas">${renderTree()}</nav><div class="sidebar-note">${icon('book')}<div><p>Escolha uma aula e estude no seu ritmo.</p><a class="personal-link" href="personal-learning.html">Meus cursos e certificados ${icon('arrow')}</a></div></div></aside><section class="lesson-workspace" aria-labelledby="lesson-title"><nav class="breadcrumbs" aria-label="Caminho da aula"><ol>${[h.collection, h.subject, h.schoolYear, `Volume ${h.volume}`, `Unidade ${h.unit}`].filter(Boolean).map(part => `<li>${escape(part)}</li>`).join('')}</ol></nav><div class="lesson-heading"><div><span class="section-eyebrow">AULA ${escape(String(selected.lessonNumber ?? '').padStart(2, '0'))}</span><h2 id="lesson-title" tabindex="-1">${escape(selected.title)}</h2></div>${duration ? `<span class="duration-badge">${icon('clock')}${duration}</span>` : ''}</div>${selected.status !== 'published' ? `<div class="review-notice" role="note">${icon('shield')}<div><strong>${selected.status === 'review' ? 'Em revisão editorial' : 'Rascunho editorial'} · Apenas administradores</strong><span>Esta aula ainda não está liberada para professores. A revisão e a aprovação permanecem pendentes.</span></div></div>` : ''}<div class="media-stage" id="media-stage">${cover()}</div><div class="player-bottom"><span>${icon('lock')} Conteúdo institucional protegido</span><span>Estude no seu tempo</span></div><div class="lesson-information"><section class="about-lesson" aria-labelledby="about-title"><span class="section-eyebrow">DA FORMAÇÃO À SALA DE AULA</span><h3 id="about-title">Sobre esta aula</h3><p>${escape(selected.description || 'Acompanhe as orientações desta aula no contexto da coleção e do seu planejamento pedagógico.')}</p><div class="lesson-context"><span>${icon('book')}${escape([h.collection, h.subject].filter(Boolean).join(' · '))}</span><span>${escape(h.schoolYear)}</span><span>Volume ${escape(h.volume)} · Unidade ${escape(h.unit)}</span></div></section><section class="lesson-resources" aria-labelledby="resources-title"><h3 id="resources-title">Conteúdo da aula</h3>${selected.availableKinds.length ? selected.availableKinds.map(kind => `<button type="button" class="resource-button" data-play="${kind}">${icon(kind === 'video' ? 'play' : 'headphones')}<span><strong>${kind === 'video' ? 'Videoaula' : 'Áudio da aula'}</strong><small>${duration || 'Acesso protegido'}</small></span>${icon('arrow')}</button>`).join('') : '<p>A mídia será exibida aqui quando estiver disponível.</p>'}</section></div><nav class="lesson-pagination" aria-label="Navegação entre aulas">${index > 0 ? `<button type="button" data-lesson="${escape(catalog.lessons[index - 1].id)}"><span aria-hidden="true">←</span><span><small>Aula anterior</small><strong>${escape(catalog.lessons[index - 1].title)}</strong></span></button>` : '<span></span>'}${index < catalog.lessons.length - 1 ? `<button type="button" data-lesson="${escape(catalog.lessons[index + 1].id)}"><span><small>Próxima aula</small><strong>${escape(catalog.lessons[index + 1].title)}</strong></span><span aria-hidden="true">→</span></button>` : ''}</nav><p class="study-note">Este espaço não registra conclusão de aulas nem emite certificados nesta etapa.</p></section></div></div>`;
}
function selectLesson(id, {history = true, focus = true} = {}) {
  const lesson = catalog?.lessons.find(item => item.id === id);
  if (!lesson || (selected?.id === id && main.querySelector('.workspace-layout'))) return;
  selected = lesson; lastKind = lesson.availableKinds.includes('video') ? 'video' : lesson.availableKinds[0] || 'video'; resumeTime = 0;
  if (history) { const url = new URL(location.href); url.searchParams.set('aula', id); window.history.pushState(null, '', url); }
  renderWorkspace();
  if (focus) document.querySelector('#lesson-title')?.focus({preventScroll: window.innerWidth > 640});
  announce(`Aula ${lesson.lessonNumber ?? ''}: ${lesson.title}.`);
}
async function startMedia(kind) {
  if (!selected?.canPlay || !selected.availableKinds.includes(kind) || pendingMedia) return;
  const priorMedia = main.querySelector('video, audio');
  if (priorMedia && kind === lastKind && priorMedia.src) { try { await priorMedia.play(); priorMedia.focus(); } catch { announce('Use o controle de reprodução do vídeo para iniciar.'); } return; }
  disposeMedia(); lastKind = kind; pendingMedia = true;
  const version = mediaVersion, lessonId = selected.id;
  mediaController = new AbortController();
  const stage = main.querySelector('#media-stage');
  stage.innerHTML = '<div class="player-loading" role="status"><span class="spinner" aria-hidden="true"></span><strong>Preparando sua aula…</strong><p>Verificando a autorização de reprodução.</p></div>';
  main.querySelectorAll('[data-play]').forEach(button => { button.disabled = true; });
  try {
    const asset = await client.asset(lessonId, kind, catalog.schoolId, {signal: mediaController.signal});
    if (version !== mediaVersion || selected?.id !== lessonId) return;
    const media = document.createElement(kind === 'audio' ? 'audio' : 'video');
    media.controls = true; media.preload = 'metadata'; media.setAttribute('playsinline', ''); media.setAttribute('controlslist', 'nodownload');
    media.setAttribute('aria-label', `${kind === 'audio' ? 'Áudio' : 'Vídeo'}: ${selected.title}`);
    media.setAttribute('tabindex', '0'); media.disablePictureInPicture = true;
    media.src = asset.signedUrl;
    media.addEventListener('loadedmetadata', () => { if (resumeTime > 0 && resumeTime < media.duration) media.currentTime = resumeTime; }, {once: true});
    media.addEventListener('error', () => {
      if (version !== mediaVersion) return;
      resumeTime = Number.isFinite(media.currentTime) ? media.currentTime : 0;
      disposeMedia(); stage.innerHTML = cover('Não foi possível reproduzir. Tente renovar o acesso ao conteúdo.');
      main.querySelectorAll('[data-play]').forEach(button => { button.disabled = false; });
      announce('Reprodução interrompida. Você pode tentar novamente.');
    }, {once: true});
    stage.replaceChildren(media); stage.classList.toggle('audio-stage', kind === 'audio');
    media.focus({preventScroll: true});
    try { await media.play(); } catch (error) { if (error.name === 'NotAllowedError') announce('A aula está pronta. Use o controle de reprodução para iniciar.'); }
  } catch (error) {
    if (error.name === 'AbortError' || version !== mediaVersion) return;
    if (error.status === 401 || error.status === 403) { requestController?.abort(); loadVersion++; renderGate(error.status === 401 ? 'expired' : 'denied'); }
    else { stage.innerHTML = cover(error.code === 'asset_unavailable' ? 'Esta mídia ainda não está disponível. Tente novamente mais tarde.' : 'Não foi possível carregar a mídia. Confira sua conexão e tente novamente.'); announce('Não foi possível carregar a mídia da aula.'); }
  } finally {
    if (version === mediaVersion) { pendingMedia = false; main.querySelectorAll('[data-play]').forEach(button => { button.disabled = false; }); }
  }
}
async function loadCatalog() {
  requestController?.abort(); requestController = new AbortController();
  const version = ++loadVersion;
  if (!client.hasSession()) { renderGate('session'); return; }
  renderGate('loading');
  try {
    const result = await client.catalog({signal: requestController.signal});
    if (version !== loadVersion) return;
    if (result.access === 'license_required') { renderGate('license'); return; }
    catalog = result;
    const requested = new URL(location.href).searchParams.get('aula');
    if (catalog.lessons.length) selectLesson(catalog.lessons.find(item => item.id === requested)?.id || catalog.lessons[0].id, {history: false, focus: false});
    else renderWorkspace();
    announce(`${catalog.lessons.length} ${catalog.lessons.length === 1 ? 'aula disponível' : 'aulas disponíveis'}.`);
  } catch (error) {
    if (error.name === 'AbortError' || version !== loadVersion) return;
    renderGate(error.status === 401 ? 'expired' : error.status === 403 ? 'denied' : 'error');
  }
}
main.addEventListener('click', event => {
  const retry = event.target.closest('[data-retry]'); if (retry) { loadCatalog(); return; }
  const lesson = event.target.closest('[data-lesson]'); if (lesson) { selectLesson(lesson.dataset.lesson); return; }
  const play = event.target.closest('[data-play]'); if (play) startMedia(play.dataset.play);
});
window.addEventListener('popstate', () => { if (catalog?.lessons.length) selectLesson(catalog.lessons.find(item => item.id === new URL(location.href).searchParams.get('aula'))?.id || catalog.lessons[0].id, {history: false}); });
window.addEventListener('storage', event => { if (event.key === null || event.key === SESSION_KEY || event.key === TOKEN_KEY) loadCatalog(); });
window.addEventListener('pagehide', () => { loadVersion++; requestController?.abort(); disposeMedia(); });
window.addEventListener('pageshow', event => { if (event.persisted) loadCatalog(); });
loadCatalog();
