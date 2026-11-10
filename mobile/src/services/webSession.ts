import { assertReadBetaRequest } from "./readBetaPolicy";
import type { MobileSession, SessionAppRole } from './library';
import { SESSION_KEY, createSessionGuard, installHostedGuard, parsePublicConfig, parseSession } from './webSessionCore';
export type PlatformSessionState = {status: 'locked'; reason: string} | {status: 'ready'; session: MobileSession; role: SessionAppRole};
const listeners = new Set<(state: PlatformSessionState) => void>();
let state: PlatformSessionState = {status: 'locked', reason: 'session_unverified'};
let enabled = false;
let loadVersion = 0;
let activeLogin: AbortController | null = null;
let signedOut = false;
let resumeBlocked = false;
function emit(next: PlatformSessionState) { state = next; listeners.forEach(fn => fn(next)); }
const guard = createSessionGuard(() => window.localStorage.getItem(SESSION_KEY), reason => emit({status: 'locked', reason}));
function config() {
  if (!enabled || typeof window === 'undefined') throw Error('hosted_session_disabled');
  return parsePublicConfig((window as unknown as {RAIZES_SUPABASE?: unknown}).RAIZES_SUPABASE);
}
export function enablePlatformSession() {
  if (enabled) return;
  if (typeof window === 'undefined') throw Error('hosted_origin_required');
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
  if ((window.location.protocol !== 'https:' && !(window.location.protocol === 'http:' && loopback)) || !/^\/app(?:\/|$)/.test(window.location.pathname)) throw Error('hosted_origin_required');
  enabled = true;
  installHostedGuard(config, guard);
  window.addEventListener('storage', event => {
    if (event.key === SESSION_KEY || event.key === null || event.key === 'raizes:supabase-access-token') {
      cancelPlatformLogin(); loadVersion++; guard.invalidate('session_changed');
    }
  });
  const resume = () => { if (!signedOut && !resumeBlocked && !activeLogin && document.visibilityState !== 'hidden') void loadPlatformSession().catch(() => {}); };
  // Back/Forward, fragment changes or leaving the document supersede an unfinished login.
  for (const event of ['pagehide', 'popstate', 'hashchange']) window.addEventListener(event, cancelPlatformLogin);
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);
  document.addEventListener('visibilitychange', resume);
  // Covers same-document writes, for which the storage event does not fire.
  window.setInterval(() => { try { guard.check(); } catch { /* already locked */ } }, 1000);
}
export function subscribePlatformSession(listener: (state: PlatformSessionState) => void) {
  listeners.add(listener); listener(state);
  return () => { listeners.delete(listener); };
}
type LoadedSession = {session: MobileSession; role: SessionAppRole};
let pendingLoad: {version: number; promise: Promise<LoadedSession>} | null = null;
export function loadPlatformSession(): Promise<LoadedSession> {
  if (signedOut) return Promise.reject(Error('signed_out'));
  if (activeLogin) return Promise.reject(Error('login_in_progress'));
  if (pendingLoad?.version === loadVersion) return pendingLoad.promise;
  const version = ++loadVersion;
  // Schedule validation after publishing the pending promise, so synchronous listeners
  // that ask to load again share the same operation rather than recursively restarting.
  const promise = Promise.resolve().then(() => validatePlatformSession(version));
  pendingLoad = {version, promise};
  void promise.then(() => { if (pendingLoad?.version === version) pendingLoad = null; }, () => { if (pendingLoad?.version === version) pendingLoad = null; });
  return promise;
}
type AccessRequest = (path: string, init?: RequestInit) => Promise<Response>;
/** The identical server checks run for a stored session and a new in-memory login. */
async function verifyPlatformAccess(session: MobileSession, request: AccessRequest) {
  async function readRpc<T>(name: string): Promise<T> {
    const response = await request(`/rest/v1/rpc/${name}`, {method: 'POST', body: '{}'});
    if (!response.ok) throw Error('profile_validation_failed');
    return response.json() as Promise<T>;
  }
    const response = await request('/auth/v1/user');
    if (!response.ok) throw Error('auth_validation_failed');
    const user = await response.json();
    if (user?.id !== session.userId) throw Error('server_identity_mismatch');
    if (user.user_metadata?.password_change_required === true) throw Error('password_change_required');
    // Self-profile RPC is UID-filtered and grants no table-wide SELECT privileges.
    // Neither JWT metadata, legacy users nor matching e-mail can choose a role.
    const profiles = await readRpc<Array<{profile_id: string; platform_role: string; status: string; student_ids: string[]}>>('app_get_self_profile');
    const profile = profiles[0];
    if (profiles.length !== 1 || profile?.profile_id !== session.userId) throw Error('profile_identity_mismatch');
    if (!['active', 'ativo'].includes(String(profile.status).toLowerCase())) throw Error('profile_inactive');
    const platformRole = String(profile.platform_role).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (!['aluno', 'educacao_infantil', 'professor'].includes(platformRole)) throw Error('unsupported_role');
    const context = await readRpc<Array<Record<string, unknown>>>(platformRole === 'professor' ? 'teacher_get_context' : 'student_get_context');
    const row = context[0];
    if (context.length !== 1 || !row?.school_id) throw Error('institutional_context_missing');
    let role: SessionAppRole;
    if (platformRole === 'professor') {
      if (row.profile_id !== session.userId) throw Error('teacher_identity_mismatch');
      if (!row.teacher_id || !Number.isFinite(Number(row.active_class_links)) || Number(row.active_class_links) <= 0) throw Error('institutional_context_missing');
      role = 'professor';
    } else {
      if (!row.student_id || !row.class_id || !Array.isArray(profile.student_ids) || !profile.student_ids.includes(String(row.student_id))) throw Error('student_identity_mismatch');
      const segment = String(row.segment).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
      if (segment === 'EDUCACAO_INFANTIL') role = 'crescer';
      else if (platformRole === 'aluno' && ['ENSINO_FUNDAMENTAL', 'ENSINO_MEDIO'].includes(segment)) role = 'fundamental';
      else throw Error('unsupported_segment');
    }
    return {role, platformRole};
}
export function cancelPlatformVerification() {
  resumeBlocked = true;
  loadVersion++; guard.invalidate('verification_cancelled');
}
async function validatePlatformSession(version: number): Promise<LoadedSession> {
  const timeout = window.setTimeout(() => {
    if (version === loadVersion) { loadVersion++; guard.invalidate('verification_timeout'); }
  }, 15000);
  try {
    if (version !== loadVersion) throw Error('verification_superseded');
    const cfg = config();
    const {session, epoch} = guard.begin();
    const {role} = await verifyPlatformAccess(session, (path, init = {}) => guard.request(session, `${cfg.url}${path}`, {
      ...init, headers: {apikey: cfg.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json'},
    }));
    guard.assert(session, epoch);
    if (version !== loadVersion) throw Error('verification_superseded');
    const canonical = guard.commit(session, epoch);
    resumeBlocked = false;
    emit({status: 'ready', session: canonical, role});
    return {session: canonical, role};
  } catch (error) {
    if (version === loadVersion) guard.invalidate(error instanceof Error ? error.message : 'verification_failed');
    throw error;
  } finally { window.clearTimeout(timeout); }
}
/** Continuity indicator, not authorization. Requests must use the guarded services. */
export function currentPlatformSessionIdentity(): string | null {
  return enabled ? guard.validatedIdentity() : null;
}
export async function awaitPlatformSessionReady(session: MobileSession): Promise<void> {
  const pending = pendingLoad;
  if (pending) {
    const result = await pending.promise;
    if (result.session !== session) throw Error('session_changed');
  }
  if (state.status !== 'ready' || state.session !== session) throw Error('session_unverified');
  guard.assert(session);
}
export async function callPlatformFunction<T = unknown>(session: MobileSession, name: 'mission-publish-revision', args: Record<string, unknown>): Promise<T> {
  if (name !== 'mission-publish-revision') throw Error('function_not_allowed');
  await awaitPlatformSessionReady(session);
  const cfg = config();
  const response = await guard.request(session, `${cfg.url}/functions/v1/${name}`, {method: 'POST', headers: {apikey: cfg.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json'}, body: JSON.stringify(args)});
  if (!response.ok) throw Error('function_request_failed');
  return response.json() as Promise<T>;
}
export function platformLoginUrl(): string { return '/login.html?auth=supabase&next=%2Fapp%2F'; }
export async function signOutPlatformSession(): Promise<{revoked: boolean; cleared: boolean}> {
  if (!enabled) throw Error('hosted_session_disabled');
  let cfg: ReturnType<typeof config> | null = null;
  try { cfg = config(); } catch { /* local logout must still lock on bad config */ }
  let token: string | null = state.status === 'ready' ? state.session.accessToken : null;
  try { const stored = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null'); if (typeof stored?.access_token === 'string') token = stored.access_token; } catch { /* still clear known keys */ }
  signedOut = true;
  cancelPlatformLogin(); loadVersion++; guard.invalidate('signed_out');
  // Never clear other applications' sessions or wildcard sb-* keys.
  let cleared = true;
  for (const key of [SESSION_KEY, 'raizes:supabase-access-token', 'raizes:demo-authenticated', 'raizes:demo-curator']) {
    try { window.localStorage.removeItem(key); if (window.localStorage.getItem(key) !== null) cleared = false; }
    catch { cleared = false; }
  }
  if (!token || !cfg) return {revoked: false, cleared};
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    assertReadBetaRequest(`${cfg.url}/auth/v1/logout?scope=local`, {method: "POST"}, cfg.url);
    const response = await new Promise<Response>((resolve, reject) => {
      const abort = () => reject(Error('logout_timeout'));
      controller.signal.addEventListener('abort', abort, {once: true});
      fetch(`${cfg!.url}/auth/v1/logout?scope=local`, {method: 'POST', headers: {apikey: cfg!.publishableKey, Authorization: `Bearer ${token}`}, signal: controller.signal, cache: 'no-store', redirect: 'error'})
        .then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', abort));
    });
    return {revoked: response.ok, cleared};
  } catch { return {revoked: false, cleared}; }
  finally { window.clearTimeout(timeout); }
}

/** Edition endpoints only. Uses the same validated identity and response-body guard. */
export async function callPlatformLibraryFunction(session: MobileSession, name: string, args: Record<string, unknown>): Promise<unknown> {
  if (!['library-edition-read-access', 'library-edition-search'].includes(name)) throw Error('function_not_allowed');
  await awaitPlatformSessionReady(session);
  const cfg = config();
  const response = await guard.request(session, `${cfg.url}/functions/v1/${name}`, {method: 'POST', headers: {apikey: cfg.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json'}, body: JSON.stringify(args)});
  if (!response.ok) throw Error('edition_function_request_failed');
  const data = await response.json();
  // Signed assets are data, not trusted navigation. Reject redirects to arbitrary
  // origins and executable/non-network schemes before the reader receives a URL.
  if (name === 'library-edition-read-access' && data?.asset) {
    const raw = data.asset.signedUrl;
    if (typeof raw !== 'string') throw Error('invalid_edition_asset_url');
    let url: URL;
    try { url = new URL(raw); } catch { throw Error('invalid_edition_asset_url'); }
    if (url.protocol !== 'https:' || url.origin !== cfg.url || url.username || url.password) throw Error('invalid_edition_asset_url');
  }
  return data;
}

/** Cancel only the current uncommitted login; existing stored sessions are not removed. */
export function cancelPlatformLogin() { activeLogin?.abort(); }

/** Existing platform credential contracts, with no registration, recovery, refresh or role picker. */
export async function signInPlatformSession(identifier: string, password: string, signal?: AbortSignal): Promise<LoadedSession> {
  if (activeLogin) throw Error('login_in_progress');
  resumeBlocked = true;
  const cfg = config();
  const value = identifier.trim();
  const institutional = /^[A-Z]{2,12}-\d{4,8}$/.test(value.toUpperCase());
  if (!value || !password || (!institutional && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) throw Error('invalid_login_input');
  const snapshot = window.localStorage.getItem(SESSION_KEY);
  const previousToken = window.localStorage.getItem('raizes:supabase-access-token');
  const controller = new AbortController(); activeLogin = controller;
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, {once: true});
  if (signal?.aborted) controller.abort();
  loadVersion++; guard.invalidate('signing_in');
  let timedOut = false;
  const timeout = window.setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
  function check() {
    if (timedOut) throw Error('login_timeout');
    if (controller.signal.aborted || activeLogin !== controller) throw Error('login_cancelled');
    if (window.localStorage.getItem(SESSION_KEY) !== snapshot) throw Error('session_changed');
  }
  async function untilCancelled<T>(operation: Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const abort = () => reject(Error(timedOut ? 'login_timeout' : 'login_cancelled'));
      controller.signal.addEventListener('abort', abort, {once: true});
      if (controller.signal.aborted) abort();
      operation.then(resolve, reject).finally(() => controller.signal.removeEventListener('abort', abort));
    });
  }
  async function request(path: string, init: RequestInit = {}) {
    check();
    assertReadBetaRequest(`${cfg.url}${path}`, init, cfg.url);
    const response = await untilCancelled(fetch(`${cfg.url}${path}`, {...init, signal: controller.signal, cache: 'no-store', redirect: 'error'}));
    check();
    const body = await untilCancelled(response.text()); check();
    return new Response(body || null, {status: response.status, headers: response.headers});
  }
  try {
    const path = institutional ? '/functions/v1/student-institutional-login' : '/auth/v1/token?grant_type=password';
    const response = await request(path, {method: 'POST', headers: {apikey: cfg.publishableKey, 'Content-Type': 'application/json'},
      body: JSON.stringify(institutional ? {login: value.toUpperCase(), password} : {email: value.toLowerCase(), password})});
    if (!response.ok) throw Error(response.status === 429 ? 'login_rate_limited' : response.status >= 500 ? 'login_unavailable' : 'invalid_credentials');
    const data = await response.json(); check();
    const auth = institutional ? data?.ok === true ? data.session : null : data;
    if (!auth?.access_token || !auth?.user?.id) throw Error('invalid_credentials');
    // Do not bypass the platform's mandatory password-change journey.
    if (auth.user.user_metadata?.password_change_required === true) throw Error('password_change_required');
    const stored = {access_token: auth.access_token, refresh_token: typeof auth.refresh_token === 'string' ? auth.refresh_token : '',
      expires_at: auth.expires_at || Math.floor(Date.now() / 1000) + Number(auth.expires_in || 3600), token_type: auth.token_type || 'bearer',
      user: auth.user, platform_role: '', question_bank_role: null};
    const {session} = parseSession(JSON.stringify(stored));
    const access = await verifyPlatformAccess(session, (path, init = {}) => request(path, {...init,
      headers: {apikey: cfg.publishableKey, Authorization: `Bearer ${session.accessToken}`, 'Content-Type': 'application/json'}}));
    if (institutional && access.role === 'professor') throw Error('unsupported_institutional_role');
    check(); parseSession(JSON.stringify(stored));
    stored.platform_role = access.platformRole;
    const raw = JSON.stringify(stored);
    // Write only the two official keys. No password or demo authorization is persisted.
    try {
      window.localStorage.setItem('raizes:supabase-access-token', stored.access_token);
      window.localStorage.setItem(SESSION_KEY, raw);
    } catch {
      // The canonical write did not commit. Restore only our companion-key write.
      if (window.localStorage.getItem(SESSION_KEY) === snapshot && window.localStorage.getItem('raizes:supabase-access-token') === stored.access_token) {
        if (previousToken === null) window.localStorage.removeItem('raizes:supabase-access-token');
        else window.localStorage.setItem('raizes:supabase-access-token', previousToken);
      }
      throw Error('storage_unavailable');
    }
    loadVersion++;
    const candidate = guard.begin();
    const canonical = guard.commit(candidate.session, candidate.epoch);
    activeLogin = null; signedOut = false; resumeBlocked = false;
    emit({status: 'ready', session: canonical, role: access.role});
    return {session: canonical, role: access.role};
  } catch (error) {
    if (activeLogin === controller) {
      guard.invalidate(timedOut ? 'login_timeout' : controller.signal.aborted ? 'login_cancelled' : 'login_failed');
    }
    if (timedOut) throw Error('login_timeout');
    if (controller.signal.aborted) throw Error('login_cancelled');
    // Never forward an Auth/Edge response (which may contain personal data) to the UI.
    throw error;
  } finally {
    window.clearTimeout(timeout); signal?.removeEventListener('abort', cancel);
    if (activeLogin === controller) activeLogin = null;
  }
}
