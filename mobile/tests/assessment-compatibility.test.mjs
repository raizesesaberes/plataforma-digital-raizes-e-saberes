import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import {
  mapStudentAssessmentAssignments as map,
  normalizeAssessmentState as state,
  assessmentSection as section,
  assessmentActionLabel as action,
} from '../src/services/assessments.ts';

// Shape of student_list_assessment_assignments(): assignments + newest-first attempts.
const assignment = (id = 'assignment-a') => ({
  id, assessment_id: 'shared-assessment', status: 'published',
  available_from: '2026-01-01T00:00:00Z', available_until: null,
  assessment: { id: 'shared-assessment', title: 'Synthetic assessment', questions: [{}, {}, {}] },
});
const attempt = (id = 'assignment-a', extra = {}) => ({
  assignment_id: id, assessment_id: 'shared-assessment', status: 'graded',
  answered_count: 3, score_percentage: 75, submitted_at: '2026-01-02T00:00:00Z', ...extra,
});
const one = (extra = {}) => map({ assignments: [assignment()], attempts: [attempt('assignment-a', extra)] })[0];

for (const [input, expected] of [[0, 0], [75, 75], [100, 100], ['62.5', 62.5], [null, null], [undefined, null], ['', null], ['bad', null]]) {
  test(`canonical score_percentage ${JSON.stringify(input)}`, () => assert.equal(one({ score_percentage: input }).scorePercent, expected));
}
test('does not silently substitute unrelated score_percent', () => {
  assert.equal(one({ score_percentage: 0, score_percent: 99 }).scorePercent, 0);
  assert.equal(one({ score_percentage: null, score_percent: 99 }).scorePercent, null);
});
for (const [status, label, bucket] of [
  ['graded', 'Concluída', 'closed'], ['submitted', 'Concluída', 'closed'],
  ['expired', 'Expirada', 'closed'], ['cancelled', 'Cancelada', 'closed'],
  ['in_progress', 'Em andamento', 'in_progress'], [' GRADED ', 'Concluída', 'closed'],
]) {
  for (const answered of [0, 2]) test(`${status} with ${answered} answers`, () => {
    const item = one({ status, answered_count: answered });
    assert.equal(state(item), label); assert.equal(section(item), bucket);
  });
}
test('unstarted assignment remains available', () => {
  const item = map({ assignments: [assignment()], attempts: [] })[0];
  assert.equal(state(item), 'Disponível'); assert.equal(item.scorePercent, null);
  assert.equal(item.answeredCount, 0); assert.equal(action(item), 'Aguardar orientação');
});
test('expired without result does not advertise a result', () => {
  assert.equal(action(one({ status: 'expired', score_percentage: null })), 'Prazo encerrado');
  assert.equal(action(one({ status: 'expired', score_percentage: 0 })), 'Resultado disponível');
  assert.equal(action(one({ status: 'submitted', score_percentage: null })), 'Aguardar resultado');
  assert.equal(action(one({ status: 'cancelled', score_percentage: null })), 'Avaliação cancelada');
  assert.equal(action(one({ status: 'cancelled', score_percentage: 75 })), 'Avaliação cancelada');
});
test('two assignments of the same assessment retain independent results and progress', () => {
  const items = map({ assignments: [assignment('assignment-a'), assignment('assignment-b')],
    attempts: [attempt('assignment-b', { score_percentage: 20 }), attempt('assignment-a', { score_percentage: null, status: 'in_progress', answered_count: 1 })] });
  assert.deepEqual(items.map(x => [x.id, x.assessmentId, x.scorePercent, x.attemptStatus, x.answeredCount]), [
    ['assignment-a', 'shared-assessment', null, 'in_progress', 1],
    ['assignment-b', 'shared-assessment', 20, 'graded', 3],
  ]);
});
test('an unstarted second assignment does not borrow the first attempt', () => {
  const items = map({ assignments: [assignment(), assignment('assignment-b')], attempts: [attempt()] });
  assert.equal(items[1].attemptStatus, null); assert.equal(items[1].scorePercent, null);
  assert.equal(section(items[1]), 'available');
});
test('latest matching attempt follows the RPC ordering, ignoring other assignments', () => {
  const item = map({ assignments: [assignment()], attempts: [attempt('assignment-b'), attempt('assignment-a', { score_percentage: 40 }), attempt('assignment-a', { score_percentage: 90 })] })[0];
  assert.equal(item.scorePercent, 40);
});
test('assessment_id alone cannot identify either an assignment or its attempt', () => {
  assert.deepEqual(map({ assignments: [{ assessment_id: 'shared-assessment' }], attempts: [attempt()] }), []);
  assert.equal(map({ assignments: [assignment()], attempts: [{ assessment_id: 'shared-assessment', score_percentage: 100 }] })[0].scorePercent, null);
});
test('existing assignment_id alias and count fallbacks are retained', () => {
  const a = { ...assignment(), id: null, assignment_id: 'assignment-a' };
  const item = map({ assignments: [a], attempts: [attempt('assignment-a', { answered_count: undefined, responses: [{}] })] })[0];
  assert.equal(item.id, 'assignment-a'); assert.equal(item.questionCount, 3); assert.equal(item.answeredCount, 1);
});
test('empty payload and arrays remain safe', () => {
  assert.deepEqual(map({}), []); assert.deepEqual(map({ assignments: null, attempts: null }), []);
});
test('mapping preserves input data', () => {
  const payload = { assignments: [assignment()], attempts: [attempt()] };
  const before = structuredClone(payload); map(payload); assert.deepEqual(payload, before);
});
test('existing service uses the real RPC and the corrected adapter with synthetic transport', async () => {
  const raw = readFileSync(new URL('../src/services/library.ts', import.meta.url), 'utf8');
  const source = stripTypeScriptTypes(raw.replace(/^import .*;\n/gm, ''), { mode: 'strip' })
    .replace(/^export (?=(?:async )?function|const|class)/gm, '').replace(/^export\s*\{\s*\};?$/gm, '');
  const calls = [];
  const context = vm.createContext({ mapStudentAssessmentAssignments: map,
    process: { env: { EXPO_PUBLIC_SUPABASE_URL: 'https://synthetic.invalid', EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'synthetic-only' } },
    fetch: async (url, options) => {
      calls.push([url, options.method, options.body]);
      return { ok: true, json: async () => ({ assignments: [assignment(), assignment('assignment-b')], attempts: [attempt('assignment-b', { score_percentage: 0 })] }) };
    },
  });
  new vm.Script(source + '\nthis.getAssignments = getStudentAssessmentAssignments;').runInContext(context);
  const items = await context.getAssignments({ userId: 'synthetic-user', accessToken: 'synthetic-session' });
  assert.deepEqual(calls, [['https://synthetic.invalid/rest/v1/rpc/student_list_assessment_assignments', 'POST', '{}']]);
  assert.equal(items[0].scorePercent, null); assert.equal(items[1].scorePercent, 0);
});

test('mixed list keeps every valid assignment in exactly one section and preserves RPC order', () => {
  const ids = ['available', 'running', 'finished-zero', 'timed-out', 'cancelled'];
  const items = map({ assignments: ids.map(assignment), attempts: [
    attempt('running', { status: 'in_progress', answered_count: 1, score_percentage: null }),
    attempt('finished-zero', { score_percentage: 0 }),
    attempt('timed-out', { status: 'expired', score_percentage: null }),
    attempt('cancelled', { status: 'cancelled', score_percentage: null }),
  ] });
  assert.deepEqual(items.map(x => x.id), ids);
  const groups = ['available', 'in_progress', 'closed'].map(key => items.filter(x => section(x) === key));
  assert.deepEqual(groups.map(group => group.map(x => x.id)), [
    ['available'], ['running'], ['finished-zero', 'timed-out', 'cancelled'],
  ]);
  assert.equal(new Set(groups.flat().map(x => x.id)).size, items.length);
  assert.equal(action(groups[2][0]), 'Resultado disponível');
  assert.equal(action(groups[2][1]), 'Prazo encerrado');
});
