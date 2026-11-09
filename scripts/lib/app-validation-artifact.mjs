import { readFileSync, writeFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { VALIDATION_REF, parsePublicConfigFile, validateBackendTarget, checkAppArtifact } from './app-hosting-target.mjs';

// Only post-process an already verified static build. Source configuration is never replaced.
export function prepareValidationArtifact({ directory, publicConfigFile, repositoryRoot, environment, localTest = false }) {
  if (environment === 'production') throw new Error('Production builds cannot use the validation backend.');
  if (environment !== 'preview' && !localTest) throw new Error('Expected VERCEL_ENV=preview or explicit local test.');
  const root = realpathSync(repositoryRoot), output = realpathSync(directory);
  if (output !== join(root, 'dist')) throw new Error('Only the existing repository dist build may be configured.');
  const destination = join(output, 'supabase-config.js');
  if (lstatSync(destination).isSymbolicLink() || !lstatSync(destination).isFile()) throw new Error('Expected a regular build configuration file.');
  const sourceStat = lstatSync(join(root, 'supabase-config.js')), destinationStat = lstatSync(destination);
  if (realpathSync(destination) === realpathSync(join(root, 'supabase-config.js')) || (sourceStat.dev === destinationStat.dev && sourceStat.ino === destinationStat.ino)) throw new Error('Source configuration cannot be replaced.');
  const candidate = parsePublicConfigFile(readFileSync(publicConfigFile, 'utf8'));
  validateBackendTarget(candidate, { mode: 'validation', projectRef: VALIDATION_REF });
  // Legacy keys can be checked for an explicit conflicting project claim. Modern publishable keys are opaque.
  if (candidate.anonKey.includes('.')) {
    const claims = JSON.parse(Buffer.from(candidate.anonKey.split('.')[1], 'base64url').toString('utf8'));
    if (claims.ref && claims.ref !== VALIDATION_REF) throw new Error('Public key claims a different backend project.');
  }
  const original = readFileSync(destination, 'utf8');
  const sourceHash = createHash('sha256').update(readFileSync(join(root, 'supabase-config.js'))).digest('hex');
  const replacement = 'window.RAIZES_SUPABASE = ' + JSON.stringify(candidate, null, 2) + ';\n';
  try {
    writeFileSync(destination, replacement);
    const verified = checkAppArtifact(output, { mode: 'validation', projectRef: VALIDATION_REF });
    if (createHash('sha256').update(readFileSync(join(root, 'supabase-config.js'))).digest('hex') !== sourceHash) throw new Error('Source configuration changed.');
    return { ...verified, sourceConfigurationUnchanged: true, previewOnly: true };
  } catch (error) {
    writeFileSync(destination, original);
    throw error;
  }
}
