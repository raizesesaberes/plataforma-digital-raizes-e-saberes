import { rpc, type MobileSession, type SessionAppRole } from './library';
import { SESSION_KEY, createSessionGuard, installHostedGuard, parsePublicConfig } from './webSessionCore';
export type PlatformSessionState = {status: 'locked'; reason: string} | {status: 'ready'; session: MobileSession; role: SessionAppRole};
const listeners = new Set<(state: PlatformSessionState) => void>();
let state: PlatformSessionState = {status: 'locked', reason: 'session_unverified'};
let enabled = false;
let loadVersion = 0;
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
      loadVersion++; guard.invalidate('session_changed');
    }
  });
  const resume = () => { if (document.visibilityState !== 'hidden') void loadPlatformSession().catch(() => {}); };
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
  if (pendingLoad?.version === loadVersion) return pendingLoad.promise;
  const version = ++loadVersion;
  // Schedule validation after publishing the pending promise, so synchronous listeners
  // that ask to load again share the same operation rather than recursively restarting.
  const promise = Promise.resolve().then(() => validatePlatformSession(version));
  pendingLoad = {version, promise};
  void promise.then(() => { if (pendingLoad?.version === version) pendingLoad = null; }, () => { if (pendingLoad?.version === version) pendingLoad = null; });
  return promise;
}
async function validatePlatformSession(version: number): Promise<LoadedSession> {
  try {
    if (version !== loadVersion) throw Error('verification_superseded');
    const cfg = config();
    const {session, epoch} = guard.begin();
    const response = await guard.request(session, `${cfg.url}/auth/v1/user`, {headers: {apikey: cfg.publishableKey, Authorization: `Bearer ${session.accessToken}`}});
    if (!response.ok) throw Error('auth_validation_failed');
    const user = await response.json();
    if (user?.id !== session.userId) throw Error('server_identity_mismatch');
    // Self-profile RPC is UID-filtered and grants no table-wide SELECT privileges.
    // Neither JWT metadata, legacy users nor matching e-mail can choose a role.
    const profiles = await rpc<Array<{profile_id: string; platform_role: string; status: string; student_ids: string[]}>>(session, 'app_get_self_profile', {});
    const profile = profiles[0];
    if (profiles.length !== 1 || profile?.profile_id !== session.userId) throw Error('profile_identity_mismatch');
    if (!['active', 'ativo'].includes(String(profile.status).toLowerCase())) throw Error('profile_inactive');
    const platformRole = String(profile.platform_role).normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (!['aluno', 'educacao_infantil', 'professor'].includes(platformRole)) throw Error('unsupported_role');
    const context = await rpc<Array<Record<string, unknown>>>(session, platformRole === 'professor' ? 'teacher_get_context' : 'student_get_context', {});
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
    guard.assert(session, epoch);
    if (version !== loadVersion) throw Error('verification_superseded');
    const canonical = guard.commit(session, epoch);
    emit({status: 'ready', session: canonical, role});
    return {session: canonical, role};
  } catch (error) {
    if (version === loadVersion) guard.invalidate(error instanceof Error ? error.message : 'verification_failed');
    throw error;
  }
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
export async function signOutPlatformSession(): Promise<{revoked: boolean}> {
  if (!enabled) throw Error('hosted_session_disabled');
  let cfg: ReturnType<typeof config> | null = null;
  try { cfg = config(); } catch { /* local logout must still lock on bad config */ }
  let token: string | null = null;
  try { const stored = JSON.parse(window.localStorage.getItem(SESSION_KEY) || 'null'); if (typeof stored?.access_token === 'string') token = stored.access_token; } catch { /* still clear known keys */ }
  loadVersion++; guard.invalidate('signed_out');
  // Never clear other applications' sessions or wildcard sb-* keys.
  for (const key of [SESSION_KEY, 'raizes:supabase-access-token', 'raizes:demo-authenticated', 'raizes:demo-curator']) window.localStorage.removeItem(key);
  if (!token || !cfg) return {revoked: false};
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${cfg.url}/auth/v1/logout?scope=local`, {method: 'POST', headers: {apikey: cfg.publishableKey, Authorization: `Bearer ${token}`}, signal: controller.signal, cache: 'no-store', redirect: 'error'});
    return {revoked: response.ok};
  } catch { return {revoked: false}; }
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
