import { resolve } from 'node:path';
import { prepareValidationArtifact } from './lib/app-validation-artifact.mjs';
try {
  const args = process.argv.slice(2), localTest = args.includes('--local-test');
  const filtered = args.filter(value => value !== '--local-test');
  if (filtered.length !== 2 || filtered[0] !== '--public-config') throw new Error('Usage: node scripts/prepare-app-validation.mjs --public-config FILE [--local-test]');
  const root = resolve(import.meta.dirname, '..');
  console.log(JSON.stringify(prepareValidationArtifact({ directory: resolve(root, 'dist'), publicConfigFile: resolve(filtered[1]), repositoryRoot: root, environment: process.env.VERCEL_ENV, localTest }), null, 2));
} catch (error) { console.error('Validation build rejected: ' + error.message); process.exitCode = 1; }
