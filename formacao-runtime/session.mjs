// One platform session, shared by modules and (via Web Locks) same-origin tabs.
// Claims here only detect session continuity. The server still authorizes every request.
export const SESSION_KEY = 'raizes:supabase-auth-session';
export const TOKEN_KEY = 'raizes:supabase-access-token';
export class SessionError extends Error {
  constructor(code, status = 401) { super(code); this.code = code; this.status = status; }
}
const flights = new WeakMap();
const rotations = new WeakMap();
function claims(token) {
  try { return JSON.parse(atob(String(token).split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))); } catch { return {}; }
}
export function readSession(storage) {
  try {
    const value = JSON.parse(storage.getItem(SESSION_KEY) || 'null');
    if (typeof value?.access_token === 'string' && value.access_token) return value;
    return null;
  } catch { return null; }
}
export function sameSession(storage, previous, current = readSession(storage)) {
  if (!previous?.access_token || !current?.access_token) return false;
  if (previous.access_token === current.access_token) return true;
  const chain = rotations.get(storage);
  let token = previous.access_token;
  for (let i = 0; chain && i < 20 && chain.has(token); i++) {
    token = chain.get(token);
    if (token === current.access_token) return true;
  }
  const a = claims(previous.access_token), b = claims(current.access_token);
  return !!a.sub && !!a.session_id && a.sub === b.sub && a.session_id === b.session_id;
}
export function assertSession(storage, session) {
  if (!sameSession(storage, session)) throw new SessionError('session_changed');
}
export function sessionExpired(session, skew = 30) {
  const expiry = Number(session?.expires_at || claims(session?.access_token).exp);
  return expiry > 0 && expiry <= Date.now() / 1000 + skew;
}
const aborted = () => new DOMException('Request aborted', 'AbortError');
export async function refreshSession({config, storage, fetcher = fetch, session = readSession(storage), signal, locks = globalThis.navigator?.locks}) {
  if (signal?.aborted) throw aborted();
  assertSession(storage, session);
  const current = readSession(storage);
  if (current.access_token !== session.access_token) return current;
  if (!session.refresh_token) throw new SessionError('session_required');
  const base = String(config?.url || '').replace(/\/$/, '');
  if (!base || !config?.anonKey) throw new SessionError('service_unavailable', 503);
  let byBase = flights.get(storage);
  if (!byBase) flights.set(storage, byBase = new Map());
  let flight = byBase.get(base);
  if (!flight) {
    flight = {waiters: new Set()};
    // Defer until the first waiter is registered.
    const execute = async () => {
      if (![...flight.waiters].some(waiter => !waiter.signal?.aborted)) throw aborted();
      assertSession(storage, session);
      const latest = readSession(storage);
      if (latest.access_token !== session.access_token) return latest;
      const response = await fetcher(`${base}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST', headers: {apikey: config.anonKey, 'Content-Type': 'application/json'},
        cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
        body: JSON.stringify({refresh_token: session.refresh_token}),
      });
      assertSession(storage, session);
      if (readSession(storage).access_token !== session.access_token) return readSession(storage);
      if (!response.ok) throw new SessionError(response.status >= 500 || response.status === 429 ? 'service_unavailable' : 'session_required', response.status >= 500 || response.status === 429 ? 503 : 401);
      const next = await response.json();
      if (![...flight.waiters].some(waiter => !waiter.signal?.aborted)) throw aborted();
      assertSession(storage, session);
      if (readSession(storage).access_token !== session.access_token) return readSession(storage);
      if (!next?.access_token) throw new SessionError('session_required');
      const saved = {...session, ...next, expires_at: next.expires_at || Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600)};
      storage.setItem(SESSION_KEY, JSON.stringify(saved));
      storage.setItem(TOKEN_KEY, saved.access_token);
      let chain = rotations.get(storage);
      if (!chain) rotations.set(storage, chain = new Map());
      chain.set(session.access_token, saved.access_token);
      if (chain.size > 20) chain.delete(chain.keys().next().value);
      return saved;
    };
    flight.promise = Promise.resolve().then(() => locks?.request ? locks.request(`raizes:session-refresh:${base}`, execute) : execute()).finally(() => { if (byBase.get(base) === flight) byBase.delete(base); });
    byBase.set(base, flight);
  }
  const waiter = {signal}; flight.waiters.add(waiter);
  try {
    return await new Promise((resolve, reject) => {
      const onAbort = () => reject(aborted());
      signal?.addEventListener('abort', onAbort, {once: true});
      flight.promise.then(value => { signal?.removeEventListener('abort', onAbort); signal?.aborted ? reject(aborted()) : resolve(value); }, error => { signal?.removeEventListener('abort', onAbort); reject(error); });
    });
  } finally { flight.waiters.delete(waiter); }
}
