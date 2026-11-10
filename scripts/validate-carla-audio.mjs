import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {validateCarlaAudio} from './lib/carla-audio-validation.mjs';
const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(root + '/scripts/mission-runtime-manifest.json', 'utf8'));
console.log(JSON.stringify(validateCarlaAudio({root, runtimeManifest: manifest.files, inspectMedia: process.argv.includes('--inspect-media')}), null, 2));
