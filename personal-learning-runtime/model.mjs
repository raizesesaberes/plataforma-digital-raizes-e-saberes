export const labels = {saved: 'Quero fazer', in_progress: 'Em andamento', completed: 'Concluídos'};
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
export function outboundUrl(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443') && !/[\\\s]/.test(value) ? u.href : null; } catch { return null; }
}
export function queryDraft(search) {
  const p = new URLSearchParams(search), url = outboundUrl(p.get('url'));
  const title = (p.get('title') || '').trim().slice(0, 180), provider = (p.get('provider') || '').trim().slice(0, 120);
  if (!url || !title || !provider) return null;
  return {title, provider, source_url: url, status: Object.hasOwn(labels, p.get('status')) ? p.get('status') : 'saved'};
}
export function visibleCourses(courses, filter, search = '') {
  const q = search.trim().toLocaleLowerCase('pt-BR');
  return courses.filter(c => (filter === 'archived' ? !!c.archived_at : !c.archived_at && (filter === 'all' || c.status === filter)) && (!q || `${c.title} ${c.provider}`.toLocaleLowerCase('pt-BR').includes(q)));
}
export function counts(courses) {
  return courses.reduce((out, c) => { if (c.archived_at) out.archived++; else {out.all++; out[c.status]++;} return out; }, {all: 0, saved: 0, in_progress: 0, completed: 0, archived: 0});
}
export function dateLabel(value) {
  if (!value) return ''; const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  return Number.isFinite(date.valueOf()) ? new Intl.DateTimeFormat('pt-BR', {timeZone: 'UTC'}).format(date) : '';
}
export function localToday() {
  const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function normalizeData(data) {
  if (!Array.isArray(data?.courses) || !Array.isArray(data?.certificates)) throw Error('invalid_response');
  const ids = new Set();
  for (const c of data.courses) {
    if (!c || typeof c.id !== 'string' || ids.has(c.id) || !Object.hasOwn(labels, c.status) || typeof c.title !== 'string' || typeof c.provider !== 'string' || !outboundUrl(c.source_url)) throw Error('invalid_response');
    ids.add(c.id);
  }
  for (const c of data.certificates) if (!c || typeof c.id !== 'string' || !ids.has(c.course_id) || typeof c.original_name !== 'string' || !['application/pdf','image/png','image/jpeg'].includes(c.mime_type) || !Number.isSafeInteger(c.byte_size) || c.byte_size < 1 || c.byte_size > 10485760) throw Error('invalid_response');
  return data;
}
