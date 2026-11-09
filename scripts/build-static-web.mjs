// Package only the verified recovery manifest; preserve other repository files.
import { createHash } from 'node:crypto';
import { cpSync, lstatSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist');
const baseline = JSON.parse(readFileSync(join(root, 'scripts/static-runtime-manifest.json'), 'utf8'));
const feature = JSON.parse(readFileSync(join(root, 'scripts/mission-runtime-manifest.json'), 'utf8'));
if (!Array.isArray(feature.files) || !Array.isArray(feature.overrides)) throw Error('Invalid mission manifest');
for (const entry of feature.files) {
 if (!entry.file.startsWith('mission-runtime/') || entry.file.includes('/tests/') || entry.file.endsWith('runtime-copy-manifest.json')) throw Error('Non-runtime feature path');
}
const allowedOverrides=['app-pages.js','missao.html'];
if (feature.overrides.length !== allowedOverrides.length || feature.overrides.some(e=>!allowedOverrides.includes(e.file)) || new Set(feature.overrides.map(e=>e.file)).size!==allowedOverrides.length) throw Error('Unapproved baseline override');
for (const override of feature.overrides) if (baseline.find(e=>e.file===override.file)?.sha256 !== override.original_sha256) throw Error('Baseline identity changed');
const manifest=[...baseline.map(e=>{const override=feature.overrides.find(o=>o.file===e.file);return override?{file:e.file,sha256:override.sha256}:e;}),...feature.files];
if (!Array.isArray(baseline) || baseline.length !== 4373) throw new Error('Expected 4373 approved runtime files');
const seen = new Set();
// Validate the complete source set before replacing any previous build.
for (const entry of manifest) {
  const name = entry.file;
  if (typeof name !== 'string' || isAbsolute(name) || name.includes('\\') ||
      name.split('/').some(part => !part || part === '.' || part === '..' || part.startsWith('.')) ||
      seen.has(name.toLowerCase())) throw new Error(`Invalid or duplicate runtime path: ${name}`);
  if (!/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Invalid digest: ${name}`);
  seen.add(name.toLowerCase());
  let current = root;
  for (const part of name.split('/')) {
    current = join(current, part);
    if (lstatSync(current).isSymbolicLink()) throw new Error(`Symlink not allowed: ${name}`);
  }
  if (!lstatSync(current).isFile()) throw new Error(`Non-regular runtime file: ${name}`);
  const hash = createHash('sha256').update(readFileSync(current)).digest('hex');
  if (hash !== entry.sha256) throw new Error(`Runtime source hash mismatch: ${name}`);
}
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const { file } of manifest) {
  const destination = join(output, file);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(join(root, file), destination);
}
console.log(`Static runtime prepared: ${manifest.length} verified files in dist; unlisted files excluded.`);

