import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';

// Override with APP_SHELL_PATH when the app lives elsewhere in a checkout.
// Works here (integration/) and from platform/tests/app-web/.
const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  process.env.APP_SHELL_PATH,
  resolve(here, '../mobile/src/AppShell.tsx'),
  resolve(here, '../../mobile/src/AppShell.tsx'),
  resolve(here, '../../app-web/mobile/src/AppShell.tsx'),
  resolve(here, '../../apps/app-raizes/mobile/src/AppShell.tsx'),
].filter(Boolean);
const sourcePath = candidates.find(existsSync);
assert.ok(sourcePath, 'Set APP_SHELL_PATH to the AppShell.tsx under test.');
const requireFromApp = createRequire(sourcePath);
const ts = requireFromApp('typescript');
const source = readFileSync(sourcePath, 'utf8');
const start = source.indexOf('function isHostedRouteSupported(');
const end = source.indexOf('export function AppShell(', start);
assert.ok(start >= 0 && end > start, 'Hosted route guard must exist.');
const context = vm.createContext({});
vm.runInContext(ts.transpileModule(source.slice(start, end), {
  compilerOptions: { target: ts.ScriptTarget.ES2020 },
}).outputText, context);
const supports = context.isHostedRouteSupported;

test('legacy title routes, empty details and unknown routes fail closed', () => {
  for (const role of ['crescer', 'fundamental', 'professor']) {
    for (const route of ['agenda:Example', 'notification:Example', 'not-implemented', 'family:unknown', 'book:', 'profile:accessibility-malformed']) {
      assert.equal(supports(role, route, true), false, `${role}:${route}`);
    }
    assert.equal(supports(role, 'agenda', true), true);
    assert.equal(supports(role, 'notifications', true), true);
  }
});

test('institutional routes require a renderer and planning requires a teacher', () => {
  for (const role of ['crescer', 'fundamental', 'professor']) {
    for (const route of ['mission', 'coloring', 'coloring-mission', 'prints']) {
      assert.equal(supports(role, route, false), false, `${role}:${route}`);
      assert.equal(supports(role, route, true), true, `${role}:${route}`);
    }
  }
  assert.equal(supports('crescer', 'mission-planner', true), false);
  assert.equal(supports('fundamental', 'mission-planner', true), false);
  assert.equal(supports('professor', 'mission-planner', true), true);
  assert.equal(supports('professor', 'mission-planner', false), false);
  assert.equal(supports('fundamental', 'games', false), false);
  assert.equal(supports('fundamental', 'games', true), true);
});

test('real detail routes remain scoped to their supported roles', () => {
  for (const route of ['activity:real-id', 'book:real-id']) {
    for (const role of ['crescer', 'fundamental']) assert.equal(supports(role, route, true), true);
    assert.equal(supports('professor', route, true), false);
  }
  for (const route of ['discovery:real-id', 'game:real-id', 'achievement:real-id']) {
    assert.equal(supports('crescer', route, true), true);
    assert.equal(supports('fundamental', route, true), false);
  }
  for (const route of ['home', 'profile', 'agenda', 'mission']) assert.equal(supports('unknown', route, true), false);
});

test('official library supports teacher and student shells, not arbitrary roles or library URLs', () => {
  for (const role of ['professor', 'crescer', 'fundamental']) {
    assert.equal(supports(role, 'library', false), true, role);
    for (const route of ['library:teacher', 'library?role=professor', 'library#teacher', '/professor.html?view=biblioteca', 'book', 'book:']) {
      assert.equal(supports(role, route, true), false, `${role}:${route}`);
    }
  }
  for (const role of ['unknown', 'admin', 'aluno', 'professor?role=aluno']) {
    assert.equal(supports(role, 'library', true), false, role);
  }
  for (const role of ['crescer', 'fundamental']) {
    for (const route of ['classes', 'attendance', 'diary', 'tracking']) {
      assert.equal(supports(role, route, true), false, `${role}:${route}`);
    }
  }
  assert.equal(supports('professor', 'book:student-only-legacy-reader', true), false);
});

test('guard is wired before dispatch, requires session, preserves native and preview', () => {
  const guard = source.indexOf('hosted && !preview && (!session || !isHostedRouteSupported');
  const dispatch = source.indexOf('<ExperienceHome', guard);
  assert.ok(guard > end && dispatch > guard, 'Expected hosted session/allowlist guard before screen dispatch.');
});

// Pure policy tests only. No React render, credentials, backend or browser calls.
