// Node 24+: runs the actual handler with in-memory clients and no network or real env.
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const sourceUrl = new URL('../../supabase/functions/admin-create-auth-access/index.ts', import.meta.url);
const sdkImport = 'import { createClient } from "npm:@supabase/supabase-js@2.57.4";';
const source = readFileSync(sourceUrl, 'utf8');
assert.ok(source.startsWith(sdkImport), 'Review the harness when the SDK import changes');
const script = new vm.Script(stripTypeScriptTypes(source.replace(sdkImport, ''), { mode: 'strip' }), {
  filename: sourceUrl.pathname,
});
const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const otherId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const targetId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const schoolId = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const valid = () => ({
  ok: true,
  email_already_used: false, email_auth_user_id: null,
  institutional_target_already_linked: false, linked_auth_user_id: null,
  orphan_auth_recovery_required: false, institutional_target_auth_user_id: null,
  target_type: 'teacher', target_status: 'active',
  profile_conflict: false, profile_conflict_id: null,
  school_membership_conflict: false, school_membership_conflict_id: null,
});

async function invoke(data, { error = null, reject = false, targetType = 'teacher', linkedUser = null } = {}) {
  const calls = { create: [], audit: [], rpc: [] };
  const roles = { teacher: 'professor', student: 'aluno', guardian: 'educacao_infantil' };
  const target = { id: targetId, school_id: schoolId, profile_id: null, user_id: linkedUser,
    status: 'active', full_name: 'Synthetic fixture', nome: 'Synthetic fixture', email: 'fixture@example.invalid' };
  const rows = { profiles: { id, status: 'active', platform_role: 'admin' },
    schools: { id: schoolId, status: 'active' }, teachers: target, students: target, guardians: target, users: [] };
  const admin = {
    from(table) {
      if (table === 'admin_auth_access_events') return {
        insert(row) { calls.audit.push(row); return Promise.resolve({ error: null }); },
      };
      assert.ok(Object.hasOwn(rows, table), `Unexpected table: ${table}`);
      const result = () => Promise.resolve({ data: rows[table], error: null });
      const query = { select() { return query; }, eq() { return query; }, ilike() { return query; },
        limit() { return query; }, maybeSingle: result,
        then(resolve, reject) { return result().then(resolve, reject); } };
      return query;
    },
    async rpc(name, args) {
      calls.rpc.push({ name, args });
      if (reject) throw new Error('Synthetic transport rejection');
      return { data, error };
    },
    auth: { admin: {
      async createUser(attributes) {
        calls.create.push(attributes);
        // Deliberate stop at the creation boundary: no real or fake persistence.
        return { data: null, error: { code: 'synthetic_stop_after_guard' } };
      },
      listUsers() { throw new Error('listUsers must never be called'); },
    } },
  };
  let handler;
  const env = { SUPABASE_URL: 'https://synthetic.example.invalid', SUPABASE_ANON_KEY: 'synthetic-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service' };
  const context = vm.createContext({ Request, Response, crypto: webcrypto,
    fetch() { throw new Error('Network forbidden in these tests'); },
    createClient(url, key) {
      assert.equal(url, env.SUPABASE_URL);
      if (key === env.SUPABASE_SERVICE_ROLE_KEY) return admin;
      assert.equal(key, env.SUPABASE_ANON_KEY);
      return { auth: { async getUser() { return { data: { user: { id } }, error: null }; } } };
    },
    Deno: { env: { get(name) { return env[name]; } }, serve(fn) { handler = fn; } },
  });
  script.runInContext(context, { timeout: 1000 });
  const response = await handler(new Request('https://synthetic.example.invalid/provision', {
    method: 'POST', headers: { Authorization: 'Bearer synthetic', 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetType, targetInstitutionalId: targetId, email: 'fixture@example.invalid',
      expectedRole: roles[targetType], schoolId }),
  }));
  assert.equal(calls.rpc.length, 1);
  assert.equal(calls.rpc[0].name, 'admin_check_auth_access_duplicate');
  assert.equal(calls.rpc[0].args.p_expected_role, roles[targetType]);
  return { calls, status: response.status, body: await response.json() };
}

const invalid = [null, undefined, false, true, 0, 1, '', 'unexpected', [], [valid()], {},
  { ...valid(), ok: false }, { ...valid(), ok: 'true' },
  { ...valid(), email_already_used: true }, { ...valid(), email_auth_user_id: id },
  { ...valid(), institutional_target_already_linked: true }, { ...valid(), linked_auth_user_id: id },
  { ...valid(), orphan_auth_recovery_required: true }, { ...valid(), institutional_target_auth_user_id: id },
  { ...valid(), institutional_target_already_linked: true, linked_auth_user_id: id,
    institutional_target_auth_user_id: id, orphan_auth_recovery_required: true },
];
for (const field of ['ok', 'email_already_used', 'institutional_target_already_linked', 'orphan_auth_recovery_required',
  'email_auth_user_id', 'linked_auth_user_id', 'institutional_target_auth_user_id']) {
  const missing = valid(); delete missing[field]; invalid.push(missing);
}
for (const field of ['email_already_used', 'institutional_target_already_linked', 'orphan_auth_recovery_required']) {
  for (const value of ['false', 0, null]) invalid.push({ ...valid(), [field]: value });
}
for (const field of ['email_auth_user_id', 'linked_auth_user_id', 'institutional_target_auth_user_id']) {
  for (const value of ['', 'not-a-uuid', 123, {}, [], ` ${id}`, `${id}x`, `${id}\n`]) invalid.push({ ...valid(), [field]: value });
}
invalid.forEach((data, n) => test(`invalid response ${n + 1}: blocks before createUser`, async () => {
  const result = await invoke(data);
  assert.equal(result.status, 500);
  assert.equal(result.body.code, 'auth_duplicate_check_failed');
  assert.equal(result.calls.create.length, 0);
  assert.equal(result.calls.audit.at(-1).reason, 'auth_duplicate_check_failed');
}));
for (const options of [{ error: { code: '42501' } }, { reject: true }]) {
  test(`RPC failure ${JSON.stringify(options)} blocks even with valid data`, async () => {
    const result = await invoke(valid(), options);
    assert.equal(result.status, 500);
    assert.equal(result.body.code, 'auth_duplicate_check_failed');
    assert.equal(result.calls.create.length, 0);
  });
}
for (const targetType of ['teacher', 'student', 'guardian']) {
  test(`valid free ${targetType}: reaches createUser exactly once`, async () => {
    const result = await invoke({ ...valid(), target_type: targetType }, { targetType });
    assert.equal(result.calls.create.length, 1);
    assert.equal(result.body.code, 'auth_create_failed'); // Deliberate synthetic stop.
    assert.equal(result.status, 502);
  });
}
const linked = { ...valid(), institutional_target_already_linked: true, linked_auth_user_id: id };
const orphan = { ...valid(), orphan_auth_recovery_required: true, institutional_target_auth_user_id: otherId };
const email = { ...valid(), email_already_used: true, email_auth_user_id: id };
const conflicts = [
  ['email', email, 'email_already_used'],
  ['linked without target metadata', linked, 'auth_already_configured'],
  ['linked equals target', { ...linked, institutional_target_auth_user_id: id }, 'auth_already_configured'],
  ['UUID case preserves equality', { ...linked, institutional_target_auth_user_id: id.toUpperCase() }, 'auth_already_configured'],
  ['orphan only', orphan, 'orphan_auth_recovery_required'],
  ['orphan plus linked plus email', { ...orphan, institutional_target_already_linked: true, linked_auth_user_id: id,
    email_already_used: true, email_auth_user_id: otherId }, 'orphan_auth_recovery_required'],
  ['linked precedes email', { ...linked, email_already_used: true, email_auth_user_id: otherId }, 'auth_already_configured'],
];
for (const [label, data, code] of conflicts) test(`valid conflict: ${label}`, async () => {
  const result = await invoke(data);
  assert.equal(result.status, 409);
  assert.equal(result.body.code, code);
  assert.equal(result.calls.create.length, 0);
});
test('student already configured still precedes orphan', async () => {
  const result = await invoke(orphan, { targetType: 'student', linkedUser: id });
  assert.equal(result.status, 409);
  assert.equal(result.body.code, 'auth_already_configured');
  assert.equal(result.calls.create.length, 0);
});
test('additional real RPC profile/membership fields do not reject free Auth', async () => {
  const result = await invoke({ ...valid(), profile_conflict: true, profile_conflict_id: id,
    school_membership_conflict: true, school_membership_conflict_id: otherId });
  assert.equal(result.calls.create.length, 1);
});
