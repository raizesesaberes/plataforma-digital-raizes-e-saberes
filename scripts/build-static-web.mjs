// Package only the verified recovery manifest; preserve other repository files.
import { createHash } from 'node:crypto';
import { cpSync, lstatSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { validateAppOverrides } from './lib/app-runtime-overrides.mjs';
import { validateCarlaAudio } from './lib/carla-audio-validation.mjs';
import { validateFormacaoManifest } from './lib/formacao-runtime.mjs';
import { restoreReviewedFormationTemplate } from './lib/formacao-platform-menu.mjs';
import { validateTypographyManifest } from './lib/typography-runtime.mjs';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'dist');
const baseline = JSON.parse(readFileSync(join(root, 'scripts/static-runtime-manifest.json'), 'utf8'));
const feature = JSON.parse(readFileSync(join(root, 'scripts/mission-runtime-manifest.json'), 'utf8'));
const app = JSON.parse(readFileSync(join(root, 'scripts/app-runtime-manifest.json'), 'utf8'));
if (!Array.isArray(app.files) || app.files.some(e => !e.file.startsWith('app/') || /(?:tests?|\.map$|metadata\.json$|\.tsx?$)/.test(e.file))) throw Error('Invalid App Raízes runtime manifest');
if (!Array.isArray(feature.files) || !Array.isArray(feature.overrides)) throw Error('Invalid mission manifest');
for (const entry of feature.files) {
 if (!entry.file.startsWith('mission-runtime/') || entry.file.includes('/tests/') || entry.file.endsWith('runtime-copy-manifest.json')) throw Error('Non-runtime feature path');
}
// Audio remains separate from institutional snapshots; fail closed on unreviewed assets.
validateCarlaAudio({root, runtimeManifest: feature.files});
const allowedOverrides=['app-pages.js','missao.html','colorir-descobrir.html','login.js'];
if (feature.overrides.length !== allowedOverrides.length || feature.overrides.some(e=>!allowedOverrides.includes(e.file)) || new Set(feature.overrides.map(e=>e.file)).size!==allowedOverrides.length) throw Error('Unapproved baseline override');
for (const override of feature.overrides) if (baseline.find(e=>e.file===override.file)?.sha256 !== override.original_sha256) throw Error('Baseline identity changed');
// A private beta link must not announce itself through the public platform menu.
const mode = JSON.parse(readFileSync(join(root, 'app/build-mode.json'), 'utf8')).mode;
if (mode === 'real-read-beta') {
 // Verified bytes of 4e91990aa5d7e98fbf18b793156f5229a998461f:app-pages.js.
 const productionMenuSha256 = 'fbe2abd6783576e5f24aa2e8a34753fbbf0a0ba085435566d30dd7baf042164f';
 // Only reviewed Formation edits may differ; undo them before validating
 // the original platform menu. New App shortcuts still fail closed.
 const formationPatch = JSON.parse(readFileSync(join(root, 'scripts/formacao-template-patch.json'), 'utf8'));
 const restored = restoreReviewedFormationTemplate(readFileSync(join(root, 'app-pages.js')), formationPatch);
 const actual = createHash('sha256').update(restored).digest('hex');
 if (actual !== productionMenuSha256) throw Error('Read beta requires baseline platform menu without App shortcut');
}
const appOverrides=validateAppOverrides(app.overrides,baseline,feature.overrides);
const training=validateFormacaoManifest(JSON.parse(readFileSync(join(root,'scripts/formacao-runtime-manifest.json'),'utf8')),baseline,feature.overrides,appOverrides);
const typography=validateTypographyManifest(JSON.parse(readFileSync(join(root,'scripts/typography-runtime-manifest.json'),'utf8')),baseline,[...feature.overrides,...appOverrides,...training.overrides]);
const manifest=[...baseline.map(e=>{const override=[...feature.overrides,...appOverrides,...training.overrides,...typography.overrides].find(o=>o.file===e.file);return override?{file:e.file,sha256:override.sha256}:e;}),...feature.files,...app.files,...training.files];
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

