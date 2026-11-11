import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const name = readdirSync(new URL('supabase/migrations/', root)).find(n => n.endsWith('_teacher_training_platform_access.sql'));
const sql = readFileSync(new URL(`supabase/migrations/${name}`, root), 'utf8');
test('platform access requires authoritative effective teacher membership, never metadata', () => {
 for (const text of ["p.status = 'active'", "role_name <> 'professor'", "s.status = 'active'", "t.status = 'active'", "m.membership_role = 'professor'", "m.status = 'active'", 'm.started_at <= now()', 'm.ended_at > now()', 't.school_id = p_school_id']) assert.ok(sql.includes(text), text);
 assert.doesNotMatch(sql, /auth\.jwt\(|raw_user_meta_data|user_metadata/);
});
test('catalog and playback share visibility without separate TRAINING licensing', () => {
 assert.equal((sql.match(/teacher_training_private.visible_to_teacher\(l(?:esson)?\.content_item_id/g) || []).length, 2);
 assert.doesNotMatch(sql, /license_required|active_rules_for_context|authorized_items_for_context|teacher_training_private.licensed\(/);
 for (const text of ["ci.editorial_status = 'PUBLISHED'", 'ci.published_at <= now()', "ci.owner_scope = 'GLOBAL_RAIZES'", 'ci.owner_user_id = auth.uid()', "b.action in ('BLOCK', 'EMBARGO')", 'scope_tenants(p_school)']) assert.ok(sql.includes(text), text);
});
test('publication changes only requested Aula 2; storage and contracts remain untouched', () => {
 assert.ok(sql.includes("'EXPECTED_AULA_2_REVIEW_BASELINE'"));
 assert.ok(sql.includes('Publication is NOT a claim of pedagogical QA'));
 assert.doesNotMatch(sql, /(?:insert\s+into|update|delete\s+from)\s+(?:public\.)?(?:contracts|contract_products|tenant_product_entitlements|tenant_product_content_modules|storage\.|teacher_training_private.assets)\b/i);
 assert.doesNotMatch(sql, /create\s+policy|grant\s+/i);
 assert.equal((sql.match(/security definer/g) || []).length, (sql.match(/set search_path = ''/g) || []).length);
 assert.ok(sql.includes('revoke all on function teacher_training_private.visible_to_teacher(uuid, uuid) from public, anon, authenticated'));
});
test('transactional proof cannot commit fixtures and includes negative cases', () => {
 const proof = readFileSync(new URL('qa/teacher-training/platform-access-dry-run.sql', root), 'utf8');
 assert.match(proof, /rollback;\s*$/);
 assert.doesNotMatch(proof, /^\s*commit;/mi);
 for (const label of ['inactive profile', 'inactive teacher', 'inactive school', 'future membership', 'expired membership', 'foreign teacher owner', 'school block', 'school embargo', 'ANON_RPC_ALLOWED', 'CROSS_SCHOOL_ALLOWED']) assert.ok(proof.includes(label), label);
});

test('personal-learning excludes family while preserving exact other professional roles', async () => {
 const { ALLOWED_ROLES } = await import('../../supabase/functions/personal-learning/domain.mjs');
 const { createPersonalLearningHandler } = await import('../../supabase/functions/personal-learning/handler.mjs');
 assert.deepEqual([...ALLOWED_ROLES], ['professor', 'coordenador', 'gestor', 'admin', 'admin_ti', 'administrador', 'administrador_nacional']);
 for (const role of ['educacao_infantil', 'aluno', ...ALLOWED_ROLES]) {
  let listed = false;
  const handler = createPersonalLearningHandler({
   authenticate: async () => ({ id: '10000000-0000-4000-8000-000000000001', profile: { status: 'active', platform_role: role }, user_metadata: { platform_role: 'admin' } }),
   list: async () => { listed = true; return { courses: [], certificates: [] }; },
  });
  const response = await handler(new Request('https://example.invalid/', { method: 'POST', headers: { authorization: 'Bearer test', 'content-type': 'application/json' }, body: JSON.stringify({ action: 'list' }) }));
  assert.equal(response.status, ALLOWED_ROLES.has(role) ? 200 : 403, role);
  assert.equal(listed, ALLOWED_ROLES.has(role), role);
 }
 assert.equal((sql.match(/alter policy personal_learning_/g) || []).length, 2);
 assert.equal((sql.match(/owner_id = \(select auth.uid\(\)\)/g) || []).length, 2);
});
