import {normalizeData} from './model.mjs';
export const SESSION_KEY = 'raizes:supabase-auth-session';
export const TOKEN_KEY = 'raizes:supabase-access-token';
export class LearningError extends Error { constructor(code, status = 0) { super(code); this.code = code; this.status = status; } }
export function readSession(storage) {
  try { const value = JSON.parse(storage.getItem(SESSION_KEY) || 'null'); return value?.access_token ? value : null; } catch { return null; }
}
export function createLearningClient({config, storage = localStorage, fetcher = fetch}) {
  const base = String(config?.url || '').replace(/\/$/, ''); let refreshing;
  async function refresh(session, signal) {
    if (!session?.refresh_token) throw new LearningError('session_required', 401);
    if (!refreshing) refreshing = (async () => {
      const response = await fetcher(`${base}/auth/v1/token?grant_type=refresh_token`, {method: 'POST',
        headers: {apikey: config.anonKey, 'Content-Type': 'application/json'}, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal,
        body: JSON.stringify({refresh_token: session.refresh_token})});
      // Supabase Auth uses HTTP 400 for a missing/expired refresh token.
      // Normalize authentication rejection for the UI; retain outages as retryable.
      if (!response.ok) throw new LearningError(response.status >= 500 ? 'service_unavailable' : 'session_required', response.status >= 500 ? 503 : 401);
      const next = await response.json(); if (!next?.access_token) throw new LearningError('session_required', 401);
      if (readSession(storage)?.access_token !== session.access_token) throw new LearningError('session_changed', 401);
      const saved = {...session, ...next, expires_at: next.expires_at || Math.floor(Date.now() / 1000) + Number(next.expires_in || 3600)};
      storage.setItem(SESSION_KEY, JSON.stringify(saved)); storage.setItem(TOKEN_KEY, saved.access_token); return saved;
    })().finally(() => { refreshing = null; });
    return refreshing;
  }
  async function request(body, {file, courseId, signal} = {}) {
    if (!base || !config?.anonKey) throw new LearningError('service_unavailable', 503);
    let session = readSession(storage); if (!session) throw new LearningError('session_required', 401);
    if (Number(session.expires_at) > 0 && Number(session.expires_at) <= Date.now() / 1000 + 30) session = await refresh(session, signal);
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = {apikey: config.anonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file ? file.type : 'application/json'};
      if (file) headers['X-File-Name'] = encodeURIComponent(file.name);
      const response = await fetcher(`${base}/functions/v1/personal-learning${file ? `?action=upload&courseId=${encodeURIComponent(courseId)}` : ''}`, {
        method: 'POST', headers, body: file || JSON.stringify(body), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal});
      if (readSession(storage)?.access_token !== session.access_token) throw new LearningError('session_changed', 401);
      // Only an explicit authentication rejection is safe to retry. Never retry
      // ambiguous create/upload/network failures, which may already have saved.
      if (response.status === 401 && attempt === 0 && session.refresh_token) { session = await refresh(session, signal); continue; }
      let data; try { data = await response.json(); } catch { throw new LearningError('service_unavailable', response.status); }
      if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
      if (readSession(storage)?.access_token !== session.access_token) throw new LearningError('session_changed', 401);
      if (!response.ok || data?.ok !== true) throw new LearningError(data?.code || 'service_unavailable', response.status);
      return data;
    }
    throw new LearningError('session_required', 401);
  }
  return {
    hasSession: () => !!readSession(storage),
    list: options => request({action: 'list'}, options).then(normalizeData),
    save: (fields, options) => request({action: fields.id ? 'update' : 'create', ...fields}, options),
    archive: (id, archived, options) => request({action: 'archive', id, archived}, options),
    upload: (courseId, file, options = {}) => request(null, {...options, file, courseId}),
    async certificate(id, options) {
      const result = await request({action: 'sign', id}, options); let url;
      try { url = new URL(result.signedUrl); } catch { throw new LearningError('certificate_unavailable'); }
      if (url.protocol !== 'https:' || url.origin !== new URL(base).origin || !url.pathname.startsWith('/storage/v1/object/sign/personal-learning-certificates/') || !url.searchParams.get('token') || !Number.isFinite(result.expiresIn) || result.expiresIn <= 0 || result.expiresIn > 60) throw new LearningError('certificate_unavailable');
      return result;
    }
  };
}
