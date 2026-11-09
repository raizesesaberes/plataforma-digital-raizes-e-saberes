import { assertReadBetaRequest } from "./readBetaPolicy.ts";
/** No browser state is read until the hosted entry explicitly enables this adapter. */
export const SESSION_KEY = 'raizes:supabase-auth-session';
export type SessionIdentity = { accessToken: string; userId: string; email?: string };
export type PublicConfig = { url: string; publishableKey: string };
export function parsePublicConfig(value: unknown): PublicConfig {
  const v = value as {url?: unknown; anonKey?: unknown};
  if (!v || typeof v.url !== 'string' || typeof v.anonKey !== 'string') throw Error('supabase_public_config_missing');
  const url = new URL(v.url);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || !/^\/?$/.test(url.pathname)) throw Error('supabase_public_config_invalid');
  const key = v.anonKey;
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (key.split('.').length === 3) {
    try { publicKey = decodeClaims(key).role === 'anon'; } catch { publicKey = false; }
  }
  if (!publicKey) throw Error('supabase_public_key_invalid');
  return { url: url.origin, publishableKey: key };
}
function decodeClaims(token: string): Record<string, unknown> {
  const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(part + '='.repeat((4 - part.length % 4) % 4)));
}
export function parseSession(raw: string | null, now = Date.now()) {
  let value, claims;
  try { value = JSON.parse(raw || 'null'); claims = decodeClaims(value.access_token); }
  catch { throw Error('session_missing_or_invalid'); }
  if (typeof value.user?.id !== 'string' || !value.user.id || claims.sub !== value.user.id || typeof value.access_token !== 'string') throw Error('session_identity_mismatch');
  const expiresAt = Math.min(Number(claims.exp), Number(value.expires_at)) * 1000;
  if (!Number.isFinite(expiresAt) || expiresAt <= now + 60000) throw Error('session_expired');
  return { session: Object.freeze({ accessToken: value.access_token, userId: value.user.id }) as SessionIdentity, expiresAt };
}
export function createSessionGuard(read: () => string | null, onLock: (reason: string) => void, now = Date.now) {
  let generation = 0;
  let current: {raw: string | null; session: SessionIdentity; canonical: SessionIdentity; retainedValidated: boolean; verifying: boolean; expiresAt: number; epoch: number} | null = null;
  const requests = new Set<AbortController>();
  const waiters = new Set<{resolve: () => void; reject: (reason: Error) => void}>();
  function rejectWaiters(reason: string) {
    waiters.forEach(waiter => waiter.reject(Error(reason))); waiters.clear();
  }
  function invalidate(reason = 'session_changed') {
    generation++; current = null;
    rejectWaiters(reason);
    requests.forEach(controller => controller.abort()); requests.clear();
    onLock(reason);
  }
  function begin() {
    const previous = current;
    const raw = read();
    const candidate = parseSession(raw, now());
    if (previous && previous.raw !== raw) invalidate('session_changed');
    generation++;
    rejectWaiters('verification_superseded');
    requests.forEach(controller => controller.abort()); requests.clear();
    // Verification gets a private identity object. Existing screens retain the canonical
    // object, but cannot make requests until this verification successfully commits.
    const canonical = previous?.raw === raw ? previous.canonical : Object.freeze({...candidate.session});
    current = {...candidate, canonical, retainedValidated: previous?.raw === raw && previous.retainedValidated === true, verifying: true, raw, epoch: generation};
    onLock('verifying');
    return current;
  }
  function commit(session: SessionIdentity, epoch: number) {
    assert(session, epoch);
    current!.verifying = false;
    current!.retainedValidated = true;
    waiters.forEach(waiter => waiter.resolve()); waiters.clear();
    return current!.canonical;
  }
  function assert(session: SessionIdentity, epoch = generation) {
    if (!current || (current.verifying ? current.session : current.canonical) !== session || epoch !== generation) throw Error('session_unverified');
    let raw;
    try { raw = read(); } catch { invalidate('storage_unavailable'); throw Error('storage_unavailable'); }
    if (raw !== current.raw) { invalidate(); throw Error('session_changed'); }
    if (current.expiresAt <= now() + 60000) { invalidate('session_expired'); throw Error('session_expired'); }
  }
  async function request(session: SessionIdentity, input: string, init: RequestInit = {}): Promise<Response> {
    assertReadBetaRequest(input, init, hostedConfig()?.url);
    const epoch = generation;
    if (current?.verifying && current.retainedValidated && current.canonical === session) {
      // UI actions queue behind the existing verification. Its private candidate
      // bypasses this branch so Auth/role/context requests can complete normally.
      assert(current.session, epoch);
      await new Promise<void>((resolve, reject) => waiters.add({resolve, reject}));
    }
    assert(session, epoch);
    const controller = new AbortController(); requests.add(controller);
    try {
      const response = await fetch(input, {...init, signal: controller.signal, cache: 'no-store', redirect: 'error'});
      assert(session, epoch);
      // Consume the body inside the guard; no late JSON can escape after account changes.
      const body = await response.text();
      assert(session, epoch);
      if (response.status === 401 || response.status === 403) { invalidate('server_denied'); throw Error('server_denied'); }
      const result = new Response(body || null, {status: response.status, statusText: response.statusText, headers: response.headers});
      const json = result.json.bind(result);
      result.json = async () => { assert(session, epoch); const data = await json(); assert(session, epoch); return data; };
      return result;
    } finally { requests.delete(controller); }
  }
  function validatedIdentity(): string | null {
    if (!current?.retainedValidated) return null;
    try {
      // A continuity signal only: assert/request still reject the UI object while
      // verification is pending. Never trust this identity as request permission.
      assert(current.verifying ? current.session : current.canonical, current.epoch);
      return current.canonical.userId;
    } catch { return null; }
  }
  function check() { if (current) assert(current.verifying ? current.session : current.canonical, current.epoch); }
  return {begin, commit, assert, request, invalidate, check, validatedIdentity};
}
let hosted = false;
let configReader: (() => PublicConfig) | null = null;
let requestGuard: ReturnType<typeof createSessionGuard> | null = null;
export function installHostedGuard(config: () => PublicConfig, guard: ReturnType<typeof createSessionGuard>) {
  hosted = true; configReader = config; requestGuard = guard;
}
export function hostedConfig(): PublicConfig | null { return hosted ? configReader!() : null; }
export function authenticatedFetch(session: SessionIdentity, input: string, init: RequestInit): Promise<Response> {
  assertReadBetaRequest(input, init, hostedConfig()?.url);
  return hosted ? requestGuard!.request(session, input, init) : fetch(input, init);
}
