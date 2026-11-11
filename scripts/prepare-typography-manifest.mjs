import {readFileSync, writeFileSync} from 'node:fs';
import {resolve, join} from 'node:path';
import {createHash} from 'node:crypto';
import {TYPOGRAPHY_OVERRIDES} from './lib/typography-runtime.mjs';
const root = resolve(import.meta.dirname, '..');
const baseline = JSON.parse(readFileSync(join(root, 'scripts/static-runtime-manifest.json'), 'utf8'));
const overrides = TYPOGRAPHY_OVERRIDES.map(file => ({file, original_sha256: baseline.find(item => item.file === file).sha256, sha256: createHash('sha256').update(readFileSync(join(root, file))).digest('hex')}));
writeFileSync(join(root, 'scripts/typography-runtime-manifest.json'), JSON.stringify({schema: 1, overrides}, null, 2) + '\n');
console.log('Reviewed typography hashes prepared; recovery baseline unchanged.');
