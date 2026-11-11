import {SESSION_KEY, TOKEN_KEY, readSession} from './session.mjs';

// Navigation hints never authorize content. Both learning clients still use the server.
function roleHint(session) {
  let claims = {};
  try { claims = JSON.parse(atob(session.access_token.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))); } catch {}
  const metadata = claims.app_metadata || session?.user?.app_metadata || {};
  return String(metadata.platform_role || metadata.app_role || metadata.role || claims.platform_role || session?.platform_role || '').toLowerCase();
}
function panelDestination(session, actor) {
  const role = roleHint(session);
  if (actor === 'admin' || (!actor && ['admin','administrador','administrador_nacional'].includes(role))) return ['admin.html', 'Voltar ao painel administrativo'];
  if (['gestor','gestor_escolar','manager','secretaria_municipal'].includes(role)) return ['gestor.html', 'Voltar ao painel da gestão'];
  if (['coordenador','coordenador_pedagogico','coordinator'].includes(role)) return ['professor.html', 'Voltar ao painel da coordenação'];
  if (actor === 'teacher' || ['professor','teacher'].includes(role)) return ['professor.html', 'Voltar ao painel do professor'];
  return null;
}

export function syncFormationPanel(actor) {
  const link = document.querySelector('#panel-link');
  if (!link) return;
  const session = readSession(localStorage);
  const destination = actor && session ? panelDestination(session, actor) : null;
  link.hidden = !destination;
  if (destination) { link.href = destination[0]; link.textContent = destination[1]; }
}

const navigationKey = 'raizes:formation-navigation-stack';
const safePages = new Set(['universidade','formacao','personal-learning','professor','admin','gestor']);
function safeTarget(value) {
  try {
    const url = new URL(value, location.href);
    if (url.origin !== location.origin) return null;
    const page = url.pathname.replace(/^\//, '').replace(/\.html$/, '').replace(/\/$/, '');
    if (!safePages.has(page)) return null;
    const view = String(url.searchParams.get('view') || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (page === 'professor' && ['formacao','universidade'].includes(view)) return 'universidade.html';
    return url.pathname.replace(/^\//, '') + url.search + url.hash;
  } catch { return null; }
}
function navigationStack() {
  try { const value = JSON.parse(sessionStorage.getItem(navigationKey) || '[]'); return Array.isArray(value) ? value.map(safeTarget).filter(Boolean) : []; } catch { return []; }
}
function saveStack(stack) { try { sessionStorage.setItem(navigationKey, JSON.stringify(stack.slice(-20))); } catch {} }
function rememberPage(value = location.href) {
  const current = safeTarget(value), stack = navigationStack();
  if (!stack.length) {
    try {
      const globalStack = JSON.parse(sessionStorage.getItem('raizes:platform-navigation-stack') || '[]');
      const previous = Array.isArray(globalStack) ? globalStack.map(safeTarget).filter(Boolean).at(-1) : null;
      if (previous && previous !== current) stack.push(previous);
    } catch {}
  }
  if (current && stack.at(-1) !== current) saveStack([...stack, current]);
}
function goBack() {
  const stack = navigationStack(), current = new URL(location.href);
  const page = url => url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  while (stack.length && page(new URL(stack.at(-1), location.href)) === page(current)) stack.pop();
  const target = stack.at(-1) || 'universidade.html';
  saveStack(stack);
  location.assign(target);
}

function mountNavigation(shell) {
  const sidebar = shell.querySelector('#formation-navigation');
  const content = shell.querySelector('[data-formation-content]');
  const toggle = shell.querySelector('[data-formation-menu-toggle]');
  const closeButton = sidebar.querySelector('[data-formation-menu-close]');
  const overlay = shell.querySelector('[data-formation-menu-overlay]');
  const mobile = matchMedia('(max-width: 1023px)');
  const logoutButton = shell.querySelector('[data-formation-logout]');
  const loginLink = shell.querySelector('[data-formation-login]');
  const status = shell.querySelector('[data-formation-session-status]');
  let open = false, previousOverflow = '', signingOut = false;
  function setOpen(next, restoreFocus = true) {
    next = Boolean(next && mobile.matches);
    if (next && !open) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    if (!next && open) document.body.style.overflow = previousOverflow;
    open = next;
    shell.classList.toggle('fd-menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    overlay.hidden = !open;
    sidebar.inert = mobile.matches && !open;
    content.inert = open;
    if (open) {
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.setAttribute('aria-labelledby', 'formation-navigation-title');
      closeButton.focus();
    } else {
      sidebar.removeAttribute('role'); sidebar.removeAttribute('aria-modal'); sidebar.removeAttribute('aria-labelledby');
      if (restoreFocus && mobile.matches) toggle.focus();
    }
  }
  toggle.addEventListener('click', () => setOpen(!open));
  closeButton.addEventListener('click', () => setOpen(false));
  overlay.addEventListener('click', () => setOpen(false));
  sidebar.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', event => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (event.key !== 'Tab') return;
    const controls = [...sidebar.querySelectorAll('a[href],button:not([disabled])')].filter(el => !el.hidden && el.getClientRects().length);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sidebar)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  mobile.addEventListener('change', () => {
    const hadFocus = sidebar.contains(document.activeElement);
    setOpen(false, false);
    if (mobile.matches && hadFocus) toggle.focus();
    else if (!mobile.matches && (document.activeElement === closeButton || document.activeElement === toggle)) sidebar.querySelector('[aria-current]')?.focus();
  });
  setOpen(false, false);

  function syncSessionActions() {
    const session = readSession(localStorage);
    logoutButton.hidden = !session;
    loginLink.hidden = !!session;
    const personalPanel = shell.querySelector('[data-personal-panel]');
    if (personalPanel) {
      const destination = session && panelDestination(session);
      personalPanel.hidden = !destination;
      if (destination) { personalPanel.href = destination[0]; personalPanel.textContent = destination[1]; }
    }
    if (!session) syncFormationPanel(null);
  }
  logoutButton.addEventListener('click', async () => {
    if (signingOut) return;
    const session = readSession(localStorage);
    if (!session) { syncSessionActions(); return; }
    signingOut = true; logoutButton.disabled = true;
    const config = window.RAIZES_SUPABASE;
    // Clear immediately, before awaiting the network. A late refresh then fails
    // the shared session continuity guard instead of restoring the old account.
    let localCleared = false;
    try {
      for (const key of [SESSION_KEY, TOKEN_KEY, 'raizes:demo-authenticated', 'raizes:demo-curator']) localStorage.removeItem(key);
      const ref = new URL(config?.url).hostname.match(/^([a-z0-9-]+)\.supabase\.co$/)?.[1];
      if (ref) localStorage.removeItem(`sb-${ref}-auth-token`);
      localCleared = !localStorage.getItem(SESSION_KEY) && !localStorage.getItem(TOKEN_KEY);
    } catch { localCleared = false; }
    if (localCleared) window.dispatchEvent(new StorageEvent('storage', {key: SESSION_KEY}));
    else window.dispatchEvent(new Event('formation:signout-blocked'));
    syncSessionActions(); setOpen(false, false);
    status.hidden = false;
    status.textContent = localCleared ? 'Você saiu deste navegador. Encerrando esta sessão…' : 'Não foi possível apagar a sessão deste navegador. Feche esta aba e tente sair novamente pela plataforma.';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let revoked = false;
    try {
      if (config?.url && config?.anonKey) {
        const response = await fetch(`${config.url.replace(/\/$/, '')}/auth/v1/logout?scope=local`, {
          method: 'POST', headers: {apikey: config.anonKey, Authorization: `Bearer ${session.access_token}`},
          cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal: controller.signal,
        });
        revoked = response.ok || response.status === 401 || response.status === 403;
      }
    } catch {} finally { clearTimeout(timeout); }
    // A different account may have signed in elsewhere while revocation waited.
    // Do not clear that new session or redirect its active workspace.
    if (!localCleared) return;
    if (readSession(localStorage)) { status.hidden = true; signingOut = false; logoutButton.disabled = false; syncSessionActions(); return; }
    if (revoked) location.replace('login.html?logout=1');
    else status.textContent = 'Você saiu deste navegador. Não foi possível confirmar o encerramento no servidor. Entre novamente quando precisar continuar.';
    signingOut = false;
  });
  shell.querySelector('[data-formation-back]').addEventListener('click', goBack);
  shell.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (link && !event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && event.button === 0) rememberPage(link.href);
  });
  window.addEventListener('storage', event => { if (!event.key || event.key === SESSION_KEY || event.key === TOKEN_KEY) syncSessionActions(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { setOpen(false, false); syncSessionActions(); } });
  window.addEventListener('pagehide', () => setOpen(false, false));
  // A fresh same-origin arrival is a navigation hint, never authorization.
  // University uses its own shell, so its link into Formation must supersede
  // visits left in this rail's older history. Never accept an external referrer.
  const arrival = document.referrer && safeTarget(document.referrer);
  if (arrival && new URL(arrival, location.href).pathname.replace(/\.html$/, '') !== location.pathname.replace(/\.html$/, '')) rememberPage(arrival);
  rememberPage(); syncSessionActions();
}

const shell = document.querySelector('[data-formation-shell]');
if (shell && !shell.dataset.navigationReady) { shell.dataset.navigationReady = 'true'; mountNavigation(shell); }
