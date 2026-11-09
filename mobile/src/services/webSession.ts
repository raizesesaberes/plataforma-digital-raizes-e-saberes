import { getAppRoleForSession, restGet, rpc, type MobileSession, type SessionAppRole } from './library';
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
    // Local JWT metadata and stored roles never authorize access.
    const profiles = await restGet<Array<{status?: string}>>(session, `profiles?select=status&id=eq.${encodeURIComponent(session.userId)}&limit=1`);
    if (!profiles[0] || !['active', 'ativo'].includes(String(profiles[0].status).toLowerCase())) throw Error('profile_inactive');
    const role = await getAppRoleForSession(session);
    if (!['crescer', 'fundamental', 'professor'].includes(role)) throw Error('unsupported_role');
    const context = await rpc<Array<Record<string, unknown>>>(session, role === 'professor' ? 'teacher_get_context' : 'student_get_context', {});
    const row = context[0];
    if (!row?.school_id || (role === 'professor' ? !row.teacher_id || Number(row.active_class_links) <= 0 : !row.student_id || !row.class_id)) throw Error('institutional_context_missing');
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
