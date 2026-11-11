// Read-only entrance summary. The personal-learning service authorizes the
// professional before any identity or private course is placed in the DOM.
import {createLearningClient} from '../personal-learning-runtime/client.mjs';
import {escape} from '../personal-learning-runtime/model.mjs';
import {SESSION_KEY, TOKEN_KEY, readSession, sameSession, assertSession, SessionError} from './session.mjs';

export const NEUTRAL_GREETING = 'Seu próximo passo na formação';
const cleanName = value => typeof value === 'string' ? value.trim().slice(0, 160) : '';
const aborted = () => new DOMException('Request aborted', 'AbortError');
export async function loadFormationWelcome({config, storage, fetcher = fetch, signal}) {
  const initial = readSession(storage);
  if (!initial) return null;
  const result = await createLearningClient({config, storage, fetcher}).list({signal});
  assertSession(storage, initial);
  if (signal?.aborted) throw aborted();
  // The list endpoint has now checked the account's active professional role.
  // Read identity from the server, never from locally supplied profile metadata.
  const base = String(config.url).replace(/\/$/, '');
  const session = readSession(storage);
  async function get(path) {
    const response = await fetcher(`${base}${path}`, {method: 'GET', signal,
      headers: {apikey: config.anonKey, Authorization: `Bearer ${session.access_token}`},
      cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'});
    assertSession(storage, session);
    if (signal?.aborted) throw aborted();
    if (!response.ok) throw new SessionError(response.status === 401 || response.status === 403 ? 'session_required' : 'service_unavailable', response.status);
    const data = await response.json();
    assertSession(storage, session);
    if (signal?.aborted) throw aborted();
    return data;
  }
  const user = await get('/auth/v1/user');
  if (!/^[0-9a-f-]{36}$/i.test(user?.id || '')) throw new SessionError('service_unavailable', 503);
  const profiles = await get(`/rest/v1/profiles?select=id,display_name&id=eq.${encodeURIComponent(user.id)}&limit=1`);
  if (!Array.isArray(profiles) || profiles.some(p => p.id !== user.id)) throw new SessionError('service_unavailable', 503);
  const name = cleanName(profiles[0]?.display_name) || cleanName(user.user_metadata?.full_name) || cleanName(user.user_metadata?.name);
  return {name, courses: result.courses.filter(c => c.status === 'in_progress' && !c.archived_at).map(({title, provider}) => ({title, provider}))};
}

export function renderFormationProgress(summary) {
  const courses = summary.courses;
  return `<h3>Cursos em andamento</h3>${courses.length ? `<ul class="formation-progress-list">${courses.slice(0, 3).map(c => `<li class="formation-progress-item"><strong>${escape(c.title)}</strong><span>${escape(c.provider)}</span><small>Em andamento · informado por você</small></li>`).join('')}</ul>${courses.length > 3 ? `<p>Mais ${courses.length - 3} curso(s) em andamento no seu espaço.</p>` : ''}` : '<p>Você ainda não marcou nenhum curso como em andamento.</p>'}<a href="personal-learning.html">Abrir minha formação</a><p class="formation-progress-note">Os registros são informados por você e não indicam progresso acompanhado pela plataforma.</p>`;
}

// The host owns layout and headings. Only these two optional anchors are changed:
// [data-formation-greeting] and [data-formation-progress]. Call destroy on unmount.
export function mountFormationWelcome({root, config = globalThis.window?.RAIZES_SUPABASE, storage = globalThis.localStorage, fetcher = globalThis.fetch, window: win = globalThis.window, document: doc = globalThis.document} = {}) {
  if (!root?.querySelector) throw new TypeError('Formation welcome root required');
  const greeting = root.querySelector('[data-formation-greeting]');
  const progress = root.querySelector('[data-formation-progress]');
  let generation = 0, controller, currentSession = null, destroyed = false;
  const listeners = [];
  function neutral(message = 'Entre na sua conta profissional para consultar seus cursos em andamento.') {
    if (greeting) greeting.textContent = NEUTRAL_GREETING;
    if (progress) progress.innerHTML = `<h3>Sua formação</h3><p>${escape(message)}</p>`;
  }
  function clear() {
    generation++; controller?.abort(); controller = null; currentSession = null; neutral();
  }
  async function refresh() {
    if (destroyed) return;
    clear();
    if (doc?.hidden) return;
    const session = readSession(storage);
    if (!session) return;
    currentSession = session;
    const epoch = generation;
    controller = new AbortController();
    neutral('Consultando seus cursos em andamento…');
    try {
      const summary = await loadFormationWelcome({config, storage, fetcher, signal: controller.signal});
      if (destroyed || epoch !== generation || !sameSession(storage, session)) return;
      if (!summary) return;
      if (greeting) greeting.textContent = summary.name ? `Olá, ${summary.name}.` : 'Olá! Este é seu espaço de formação.';
      if (progress) progress.innerHTML = renderFormationProgress(summary);
    } catch (error) {
      if (destroyed || epoch !== generation) return;
      clear();
      if (error?.name === 'AbortError' || error?.code === 'session_changed') return;
      neutral(error?.status === 401 || error?.status === 403 ? 'Entre na sua conta profissional para consultar seus cursos em andamento.' : 'Não foi possível consultar seus cursos agora. Tente novamente mais tarde.');
    }
  }
  function listen(target, name, handler, options) {
    target?.addEventListener(name, handler, options);
    listeners.push(() => target?.removeEventListener(name, handler, options));
  }
  listen(win, 'storage', event => { if (!event.key || [SESSION_KEY, TOKEN_KEY].includes(event.key)) refresh(); });
  listen(win, 'pagehide', clear);
  listen(win, 'pageshow', event => { if (event.persisted) refresh(); });
  listen(doc, 'visibilitychange', () => { if (doc.hidden) clear(); else refresh(); });
  // Capture before the platform logout handler starts its asynchronous request.
  listen(doc, 'click', event => { if (event.target?.closest?.('[data-platform-logout], [data-platform-site-logout]')) clear(); }, true);
  listen(win, 'raizes:session-changed', refresh);
  // Same-document session writes do not dispatch a storage event. This is only
  // a continuity check, never a network poll or credential refresh loop.
  const timer = win?.setInterval?.(() => { if (currentSession && !sameSession(storage, currentSession)) clear(); }, 500);
  const ready = refresh();
  return {ready, refresh, clear, destroy() { destroyed = true; clear(); listeners.forEach(remove => remove()); if (timer != null) win?.clearInterval?.(timer); }};
}
