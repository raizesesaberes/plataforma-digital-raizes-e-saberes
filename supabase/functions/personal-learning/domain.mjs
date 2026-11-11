export const BUCKET = 'personal-learning-certificates';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const SIGNED_TTL = 60;
export const ALLOWED_ROLES = new Set(['professor', 'educacao_infantil', 'coordenador', 'gestor', 'admin', 'admin_ti', 'administrador', 'administrador_nacional']);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class LearningError extends Error {
  constructor(code, status = 400) { super(code); this.code = code; this.status = status; }
}
export const fail = (code, status = 400) => { throw new LearningError(code, status); };
export function validId(value) { if (typeof value !== 'string' || !UUID.test(value)) fail('invalid_id'); return value.toLowerCase(); }
export function textField(value, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max || /[\u0000-\u001f\u007f]/.test(value)) fail('invalid_course');
  return value.trim();
}
export function courseUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/.test(value)) fail('invalid_url');
  let u; try { u = new URL(value); } catch { fail('invalid_url'); }
  // Links are stored and shown, never fetched by the server. Reject credentials,
  // local addresses, custom ports and executable schemes even for outbound links.
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || !u.hostname.includes('.') ||
      /^[\d.]+$/.test(u.hostname) || u.hostname.includes(':') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(u.hostname)) fail('invalid_url');
  u.hash = ''; return u.href;
}
export function courseInput(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_request');
  const status = input.status;
  if (!['saved', 'in_progress', 'completed'].includes(status)) fail('invalid_status');
  let completed_on = null, completion_declared_at = null;
  if (status === 'completed') {
    if (input.completedDeclaration !== true) fail('completion_declaration_required');
    if (typeof input.completedOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.completedOn)) fail('invalid_completion_date');
    const d = new Date(input.completedOn + 'T00:00:00Z');
    if (!Number.isFinite(d.valueOf()) || d.toISOString().slice(0, 10) !== input.completedOn || input.completedOn > now.toISOString().slice(0, 10) || input.completedOn < '1900-01-01') fail('invalid_completion_date');
    completed_on = input.completedOn; completion_declared_at = now.toISOString();
  }
  return {title: textField(input.title, 180), provider: textField(input.provider, 120), source_url: courseUrl(input.url), status, completed_on, completion_declared_at};
}
export function fileInfo(bytes, mime, filename) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > MAX_FILE_BYTES) fail('invalid_file_size', 413);
  const type = String(mime || '').toLowerCase().trim();
  const starts = expected => expected.every((b, i) => bytes[i] === b);
  let extension;
  if (type === 'application/pdf' && starts([37, 80, 68, 70, 45]) && /%%EOF\s*$/.test(new TextDecoder().decode(bytes.slice(-1024)))) extension = 'pdf';
  if (type === 'image/png' && bytes.length >= 45 && starts([137, 80, 78, 71, 13, 10, 26, 10]) && new TextDecoder().decode(bytes.slice(12, 16)) === 'IHDR' && new TextDecoder().decode(bytes.slice(-8, -4)) === 'IEND') extension = 'png';
  if (type === 'image/jpeg' && bytes.length >= 4 && starts([255, 216, 255]) && bytes.at(-2) === 255 && bytes.at(-1) === 217) extension = 'jpg';
  if (!extension) fail('invalid_file_type');
  const name = String(filename || 'certificado').normalize('NFC').replace(/[\u0000-\u001f\u007f/\\<>:"|?*]/g, '_').trim().slice(0, 145).replace(/\.+$/, '') || 'certificado';
  // Ensure the download extension describes server-verified bytes, not a supplied suffix.
  const original_name = name.replace(/\.[a-z0-9]{1,12}$/i, '') + '.' + extension;
  return {mime_type: type, extension, original_name, byte_size: bytes.length};
}
export async function readBounded(request, max) {
  const size = request.headers.get('content-length');
  if (size && (!/^\d+$/.test(size) || Number(size) > max)) fail('request_too_large', 413);
  const reader = request.body?.getReader(); if (!reader) fail('invalid_request');
  const chunks = []; let total = 0;
  while (true) { const {done, value} = await reader.read(); if (done) break; total += value.length; if (total > max) { await reader.cancel(); fail('request_too_large', 413); } chunks.push(value); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export function publicCertificate(row) {
  return {id: row.id, course_id: row.course_id, original_name: row.original_name, mime_type: row.mime_type, byte_size: row.byte_size, created_at: row.created_at, authenticity: 'not_verified'};
}
export function publicCourse(row) {
  return {id: row.id, title: row.title, provider: row.provider, source_url: row.source_url, status: row.status, completed_on: row.completed_on, completion_declared_at: row.completion_declared_at, archived_at: row.archived_at, created_at: row.created_at, updated_at: row.updated_at};
}
