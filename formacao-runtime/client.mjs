// Reuses the platform session. Only the authenticated Edge function decides access.
// No entitlement, role, media locator, or lesson catalog is trusted from storage.
import {SESSION_KEY, TOKEN_KEY, readSession, refreshSession, sessionExpired, assertSession, SessionError} from './session.mjs';
export {SESSION_KEY, TOKEN_KEY, readSession};
export class TrainingError extends SessionError {
  constructor(code, status = 0) { super(code, status); }
}
export function createTrainingClient({config, storage = localStorage, fetcher = fetch}) {
  const base = String(config?.url || '').replace(/\/$/, '');
  const refresh = (session, signal) => refreshSession({config, storage, fetcher, session, signal});
  async function request(body, {signal} = {}) {
    if (!base || !config?.anonKey) throw new TrainingError('service_unavailable', 503);
    let session = readSession(storage);
    if (!session) throw new TrainingError('session_required', 401);
    if (sessionExpired(session)) session = await refresh(session, signal);
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetcher(`${base}/functions/v1/teacher-training-access`, {
        method: 'POST', headers: {apikey: config.anonKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json'},
        cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', signal, body: JSON.stringify(body),
      });
      if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
      assertSession(storage, session);
      if (response.status === 401 && attempt === 0 && session.refresh_token) { session = await refresh(session, signal); continue; }
      let data; try { data = await response.json(); } catch (error) {
        if (signal?.aborted || error?.name === 'AbortError') throw new DOMException('Request aborted', 'AbortError');
        throw new TrainingError('service_unavailable', response.status);
      }
      if (signal?.aborted) throw new DOMException('Request aborted', 'AbortError');
      assertSession(storage, session);
      if (!response.ok || data?.ok !== true) throw new TrainingError(data?.code || 'service_unavailable', response.status);
      return data;
    }
    throw new TrainingError('session_required', 401);
  }
  return {
    hasSession: () => !!readSession(storage),
    catalog: (options) => request({action: 'catalog'}, options).then(normalizeCatalog),
    async asset(lessonId, kind, schoolId, options) {
      const result = await request({action: 'asset', lessonId, kind, ...(schoolId ? {schoolId} : {})}, options);
      const asset = result.asset;
      let url; try { url = new URL(asset?.signedUrl); } catch { throw new TrainingError('asset_unavailable'); }
      // The private Storage origin is fixed by the application configuration.
      if (asset.lessonId !== lessonId || asset.kind !== kind || url.protocol !== 'https:' || url.origin !== new URL(base).origin ||
        !url.pathname.startsWith('/storage/v1/object/sign/') || !url.searchParams.has('token') || !Number.isFinite(asset.expiresIn) || asset.expiresIn <= 0) {
        throw new TrainingError('asset_unavailable');
      }
      return asset;
    },
  };
}
const text = (value, fallback = '') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
export function normalizeCatalog(data) {
  if (!data || data.ok !== true || !['admin', 'teacher'].includes(data.actor) || !['available', 'license_required'].includes(data.access) || !Array.isArray(data.lessons)) throw new TrainingError('service_unavailable');
  const seen = new Set();
  const lessons = data.access !== 'available' ? [] : data.lessons.filter(lesson => data.actor === 'admin' || lesson?.status === 'published').map(lesson => {
    if (!lesson || typeof lesson.id !== 'string' || !lesson.id || seen.has(lesson.id) || !text(lesson.title) || !['draft', 'review', 'published'].includes(lesson.status) || !lesson.hierarchy) throw new TrainingError('service_unavailable');
    seen.add(lesson.id);
    const h = lesson.hierarchy;
    const kinds = lesson.canPlay === true && Array.isArray(lesson.availableKinds) ? [...new Set(lesson.availableKinds.filter(kind => ['video', 'audio'].includes(kind)))] : [];
    return {id: lesson.id, title: lesson.title, description: text(lesson.description), status: lesson.status,
      lessonNumber: Number.isFinite(lesson.lessonNumber) ? lesson.lessonNumber : null,
      durationSeconds: Number.isFinite(lesson.durationSeconds) && lesson.durationSeconds > 0 ? lesson.durationSeconds : null,
      hierarchy: {collection: text(h.collection, 'Coleção'), subject: text(h.subject), schoolYear: text(h.schoolYear, 'Ano / faixa etária'), volume: text(String(h.volume ?? ''), '—'), unit: text(String(h.unit ?? ''), '—'), unitTitle: text(h.unitTitle)},
      availableKinds: kinds, canPlay: kinds.length > 0};
  });
  lessons.sort((a, b) => hierarchyKey(a).localeCompare(hierarchyKey(b), 'pt-BR', {numeric: true}) || (a.lessonNumber ?? 0) - (b.lessonNumber ?? 0));
  return {actor: data.actor, schoolId: typeof data.schoolId === 'string' ? data.schoolId : null, access: data.access, lessons};
}
export function hierarchyKey(lesson) { const h = lesson.hierarchy; return [h.collection, h.subject, h.schoolYear, h.volume, h.unit].join('\u001f'); }
export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '';
  const total = Math.round(seconds); const mins = Math.floor(total / 60); const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
export function groupLessons(lessons) {
  const collections = new Map();
  for (const lesson of lessons) {
    const h = lesson.hierarchy, key = JSON.stringify([h.collection, h.subject]);
    if (!collections.has(key)) collections.set(key, {label: [h.collection, h.subject].filter(Boolean).join(' · '), years: new Map()});
    const years = collections.get(key).years;
    if (!years.has(h.schoolYear)) years.set(h.schoolYear, new Map());
    const volumes = years.get(h.schoolYear);
    if (!volumes.has(h.volume)) volumes.set(h.volume, new Map());
    const units = volumes.get(h.volume);
    if (!units.has(h.unit)) units.set(h.unit, []);
    units.get(h.unit).push(lesson);
  }
  return collections;
}
