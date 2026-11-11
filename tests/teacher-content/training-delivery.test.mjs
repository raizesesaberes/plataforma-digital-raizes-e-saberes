import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { deliverTeacherTraining } from '../../supabase/functions/_shared/teacher-training-policy.mjs';

const lessonId = '00000000-0000-4000-8000-000000000001';
const schoolId = '00000000-0000-4000-8000-000000000002';
const hash = 'a'.repeat(64);
const path = `formacao/avalia-mais/matematica/1-ano/volume-1/unidade-1/aula-1/${hash}.mp4`;
const binding = { lessonId, kind: 'video', bucket: 'videos', path, mimeType: 'video/mp4', sha256: hash };
const lesson = { id: lessonId, title: 'Synthetic lesson', description: '', lessonNumber: 1, status: 'published',
  hierarchy: { collection: 'Synthetic', subject: 'Matemática', schoolYear: '1º ano', volume: 1, unit: 1 },
  availableKinds: ['video'], canPlay: true, durationSeconds: 180.234 };
const assetRequest = { action: 'asset', lessonId, kind: 'video', schoolId };
function dependencies(overrides = {}) {
  const calls = [];
  return { calls,
    catalog: async sid => { calls.push(['catalog', sid]); return { ok: true, actor: 'teacher', schoolId, access: 'available', lessons: [lesson] }; },
    authorize: async (id, sid) => { calls.push(['authorize', id, sid]); return true; },
    binding: async (id, kind) => { calls.push(['binding', id, kind]); return binding; },
    sign: async (bucket, path, ttl) => { calls.push(['sign', bucket, path, ttl]); return 'https://synthetic.invalid/signed'; },
    ...overrides,
  };
}

test('catalog is authenticated metadata only, whitelisted and never signed', async () => {
  const deps = dependencies({ catalog: async () => ({ ok: true, actor: 'admin', schoolId: null, access: 'available',
    token: 'must not leak', lessons: [{ ...lesson, status: 'review', bucket: 'videos', path, signedUrl: 'secret', metadata: { raw: 'unsafe' } }] }) });
  const result = await deliverTeacherTraining({ action: 'catalog' }, deps);
  assert.equal(result.status, 200);
  assert.equal(result.lessons[0].status, 'review');
  assert.deepEqual(deps.calls, []);
  assert.doesNotMatch(JSON.stringify(result), /must not leak|bucket|signedUrl|metadata|formacao\//);
});

test('unlicensed teachers get the explicit empty protected state', async () => {
  const result = await deliverTeacherTraining({ action: 'catalog' }, dependencies({ catalog: async () => ({
    ok: true, actor: 'teacher', schoolId, access: 'license_required', lessons: [],
  }) }));
  assert.equal(result.access, 'license_required');
  assert.equal(result.status, 200);
  assert.deepEqual(result.lessons, []);
});

test('teacher catalog rejects accidental review disclosure and malformed states', async () => {
  for (const data of [null, {}, { ok: true, actor: 'teacher', schoolId, access: 'available', lessons: [{ ...lesson, status: 'review' }] },
    { ok: true, actor: 'teacher', schoolId, access: 'license_required', lessons: [lesson] }]) {
    assert.equal((await deliverTeacherTraining({ action: 'catalog' }, dependencies({ catalog: async () => data }))).status, 503);
  }
});

test('catalog with inactive media remains visible to admin but never playable', async () => {
  const result = await deliverTeacherTraining({ action: 'catalog' }, dependencies({ catalog: async () => ({
    ok: true, actor: 'admin', schoolId: null, access: 'available', lessons: [{ ...lesson, availableKinds: [], canPlay: false, durationSeconds: null }],
  }) }));
  assert.equal(result.status, 200);
  assert.equal(result.lessons[0].canPlay, false);
});

test('catalog authorization errors are sanitized and fail closed', async () => {
  const result = await deliverTeacherTraining({ action: 'catalog' }, dependencies({ catalog: async () => { throw { code: '42501', message: 'private details' }; } }));
  assert.deepEqual(result, { ok: false, status: 403, code: 'training_access_denied' });
});

test('rejects arbitrary paths, buckets, roles, action types and malformed identities before any call', async () => {
  for (const payload of [null, [], {}, { action: 'delete' }, { action: 'catalog', role: 'admin' },
    { action: 'catalog', schoolId: 'not-uuid' }, { ...assetRequest, path }, { ...assetRequest, bucket: 'videos' },
    { ...assetRequest, lessonId: '../x' }, { ...assetRequest, kind: 'poster' }, { ...assetRequest, schoolId: null }]) {
    const deps = dependencies();
    assert.equal((await deliverTeacherTraining(payload, deps)).status, 400);
    assert.deepEqual(deps.calls, []);
  }
});

test('asset checks caller authorization before any private lookup or signing', async () => {
  const deps = dependencies();
  const result = await deliverTeacherTraining(assetRequest, deps);
  assert.equal(result.status, 200);
  assert.deepEqual(deps.calls, [['authorize', lessonId, schoolId], ['binding', lessonId, 'video'], ['sign', 'videos', path, 300]]);
  assert.deepEqual(result.asset, { lessonId, kind: 'video', mimeType: 'video/mp4', signedUrl: 'https://synthetic.invalid/signed', expiresIn: 300 });
  assert.equal(result.asset.path, undefined);
});

test('all non-true authorization responses deny, including a forged role object', async () => {
  for (const allow of [false, null, undefined, {}, { actor: 'admin', allowed: true }, 'true', 1]) {
    const deps = dependencies({ authorize: async () => allow });
    assert.equal((await deliverTeacherTraining(assetRequest, deps)).status, 403);
    assert.deepEqual(deps.calls, []);
  }
});

test('missing or inactive binding is not signed', async () => {
  const deps = dependencies({ binding: async () => null });
  assert.equal((await deliverTeacherTraining(assetRequest, deps)).status, 404);
  assert.equal(deps.calls.filter(c => c[0] === 'sign').length, 0);
});

test('rejects traversal, cross-bucket, cross-lesson, cross-kind, hash and extension substitutions', async () => {
  for (const changed of [
    { ...binding, path: '../private.mp4' }, { ...binding, path: path.replace('formacao/', 'library/') },
    { ...binding, path: path.replace('/matematica/', '/../') }, { ...binding, path: path.replace('/1-ano/', '/%2e%2e/') },
    { ...binding, path: path.replace('.mp4', '.html') }, { ...binding, bucket: 'books' },
    { ...binding, lessonId: schoolId }, { ...binding, kind: 'audio' }, { ...binding, sha256: 'b'.repeat(64) },
    { ...binding, mimeType: 'text/html' },
  ]) {
    const deps = dependencies({ binding: async () => changed });
    assert.equal((await deliverTeacherTraining(assetRequest, deps)).status, 404);
    assert.equal(deps.calls.filter(c => c[0] === 'sign').length, 0);
  }
});

test('backend errors never leak details or become alternate access', async () => {
  for (const method of ['authorize', 'binding', 'sign']) {
    const result = await deliverTeacherTraining(assetRequest, dependencies({ [method]: async () => { throw Error('secret/path'); } }));
    assert.deepEqual(result, { ok: false, status: 503, code: 'service_unavailable' });
  }
});

test('every playback invocation reauthorizes; no warm-cache bypass after revocation', async () => {
  let allowed = true;
  const deps = dependencies({ authorize: async () => allowed });
  assert.equal((await deliverTeacherTraining(assetRequest, deps)).status, 200);
  allowed = false;
  assert.equal((await deliverTeacherTraining(assetRequest, deps)).status, 403);
  assert.equal(deps.calls.filter(c => c[0] === 'sign').length, 1);
});

const migration = readFileSync(new URL(`../../supabase/migrations/${readdirSync(new URL('../../supabase/migrations/', import.meta.url)).find(name => name.endsWith('_teacher_training_protected_delivery.sql'))}`, import.meta.url), 'utf8');
test('migration requires active professor, school and effective school membership', () => {
  for (const required of ["p.status = 'active'", "role_name <> 'professor'", "s.status = 'active'", "t.status = 'active'",
    "m.membership_role = 'professor'", "m.status = 'active'", 'm.started_at <= now()', 'm.ended_at > now()']) assert.ok(migration.includes(required), required);
  assert.doesNotMatch(migration, /user_metadata|raw_user_meta_data|auth\.jwt\(/);
});
test('migration reuses strict institutional grants and checks canonical editorial visibility', () => {
  for (const required of ['active_rules_for_context', 'authorized_items_for_context', "'INSTITUTIONAL'", "'TRAINING'", "l.status = 'published'", "lesson.status <> 'published'"]) assert.ok(migration.includes(required));
  assert.doesNotMatch(migration, /(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?(?:contracts|contract_products|tenant_product_entitlements|tenant_product_content_modules)\b/i);
  assert.doesNotMatch(migration, /library_authorize_edition|legacy_media_gate/);
});
test('private tables and helper functions have RLS/ACLs, no generic storage grants', () => {
  assert.equal((migration.match(/enable row level security/g) || []).length, 2);
  assert.ok(migration.includes('revoke all on all functions in schema teacher_training_private from public, anon, authenticated'));
  assert.ok(migration.includes('revoke all on function public.teacher_training_asset_binding(uuid, text) from public, anon, authenticated'));
  assert.ok(migration.includes('grant execute on function public.teacher_training_asset_binding(uuid, text) to service_role'));
  assert.equal((migration.match(/security definer/g) || []).length, (migration.match(/set search_path = ''/g) || []).length);
  assert.doesNotMatch(migration, /create\s+policy|alter\s+table\s+storage|update\s+storage\.buckets/i);
});
test('binding readiness requires verified, exact private existing objects and starts inactive', () => {
  for (const required of ['a.ready and a.verified_at is not null', 'b.public is false', 'o.name = a.storage_path',
    "o.metadata->>'size' = a.byte_size::text", "o.metadata->>'mimetype' = a.mime_type", "a.storage_path = 'formacao/'",
    'seed.duration_seconds, false']) assert.ok(migration.includes(required), required);
});

test('edge verifies JWT through Auth, uses caller RPC for authorization, never logs signed tokens', () => {
  const source = readFileSync(new URL('../../supabase/functions/teacher-training-access/index.ts', import.meta.url), 'utf8');
  assert.ok(source.includes('user.auth.getUser()'));
  assert.ok(source.includes("user.rpc('teacher_training_authorize_lesson'"));
  assert.ok(source.includes("admin.rpc('teacher_training_asset_binding'"));
  assert.ok(source.includes("'Cache-Control': 'private, no-store'"));
  assert.doesNotMatch(source, /console\.|getPublicUrl|getSession\(/);
});
