import {normalizeData} from './model.mjs';
import {SESSION_KEY, TOKEN_KEY, readSession, refreshSession, sessionExpired, assertSession, SessionError} from '../formacao-runtime/session.mjs';
export {SESSION_KEY, TOKEN_KEY, readSession};
export class LearningError extends SessionError {
  constructor(code, status = 0) { super(code, status); }
}
export function createLearningClient({config, storage = localStorage, fetcher = fetch}) {
  const base = String(config?.url || '').replace(/\/$/, '');
  const refresh = (session, signal) => refreshSession({config, storage, fetcher, session, signal});
  async function request(body, {file, courseId, signal} = {}) {
    if (!base || !config?.anonKey) throw new LearningError('service_unavailable', 503);
    let session = readSession(storage); if (!session) throw new LearningError('session_required', 401);
    if (sessionExpired(session)) session = await refresh(session, signal);
    for (let attempt = 0; attempt < 2; attempt++) {
      const headers = {apikey: config.anonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': file ? file.type : 'application/json'};
      if (file) headers['X-File-Name'] = encodeURIComponent(file.name);
      const response = await fetcher(`${base}/functions/v1/personal-learning${file ? `?action=upload&courseId=${encodeURIComponent(courseId)}` : ''}`, {
        method: 'POST', headers, body: file || JSON.stringify(body), cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal});
      assertSession(storage, session);
      // Only an explicit authentication rejection is safe to retry. Never retry
      // ambiguous create/upload/network failures, which may already have saved.
      if (response.status === 401 && attempt === 0 && session.refresh_token) { session = await refresh(session, signal); continue; }
      let data; try { data = await response.json(); } catch { throw new LearningError('service_unavailable', response.status); }
      if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
      assertSession(storage, session);
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
