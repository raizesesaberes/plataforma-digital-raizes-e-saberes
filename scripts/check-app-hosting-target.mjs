import { resolve } from 'node:path';
import { checkAppArtifact } from './lib/app-hosting-target.mjs';
const args = process.argv.slice(2);
function argument(name) { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; }
try {
  const directory = argument('--directory'), mode = argument('--mode'), projectRef = argument('--project-ref');
  if (!directory || !mode || !projectRef || args.length !== 6) throw new Error('Usage: node scripts/check-app-hosting-target.mjs --directory dist --mode validation|production --project-ref REF');
  console.log(JSON.stringify(checkAppArtifact(resolve(directory), { mode, projectRef }), null, 2));
} catch (error) {
  console.error(`App hosting target rejected: ${error.message}`);
  process.exitCode = 1;
}
