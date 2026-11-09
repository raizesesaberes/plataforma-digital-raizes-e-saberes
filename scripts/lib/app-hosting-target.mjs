import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export const PRODUCTION_REF = 'jaesjldrbjbdmzzggxzw';
export const VALIDATION_REF = 'fpzvkyoxsnhxalibdqpm';

// Parse the deliberately small public configuration without evaluating JavaScript.
export function parsePublicConfigFile(source) {
  const match = source.match(/^\s*window\.RAIZES_SUPABASE\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
  if (!match) throw new Error('Expected a literal RAIZES_SUPABASE configuration.');
  const json = match[1].replace(/([{,]\s*)([a-zA-Z_][\w]*)\s*:/g, '$1"$2":').replace(/,\s*([}\]])/g, '$1');
  const config = JSON.parse(json);
  if (!config || Object.keys(config).sort().join(',') !== 'allowLocalFallback,anonKey,url') throw new Error('Unexpected configuration fields.');
  if (config.allowLocalFallback !== false) throw new Error('Local fallback must remain disabled.');
  const key = config.anonKey;
  if (typeof key !== 'string') throw new Error('A public key is required.');
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key);
  if (!publicKey && /^[^.]+\.[^.]+\.[^.]+$/.test(key)) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')).role === 'anon'; } catch { /* not a supported public key */ }
  }
  if (!publicKey) throw new Error('Only a publishable or legacy anon key is accepted.');
  return config;
}

export function validateBackendTarget(config, { mode, projectRef }) {
  if (!['validation', 'production'].includes(mode)) throw new Error('Choose validation or production explicitly.');
  const expected = mode === 'validation' ? VALIDATION_REF : PRODUCTION_REF;
  if (projectRef !== expected) throw new Error('The selected project is not approved for this validation plan.');
  const url = new URL(config.url);
  if (url.href !== `https://${expected}.supabase.co/`) throw new Error(`Backend target mismatch for ${mode}; no remote action was taken.`);
  return { mode, projectRef, backendOrigin: url.origin };
}

export function checkAppArtifact(directory, target) {
  const source = readFileSync(join(directory, 'supabase-config.js'), 'utf8');
  const result = validateBackendTarget(parsePublicConfigFile(source), target);
  const index = readFileSync(join(directory, 'app/index.html'), 'utf8');
  for (const file of ['login.html', 'login.js', 'app/platform-runtime.js', 'mission-runtime/institutional.mjs']) readFileSync(join(directory, file));
  if (!index.includes('src="/supabase-config.js"') || !index.includes('src="/app/platform-runtime.js"')) throw new Error('App must load its configuration/runtime from the same origin.');
  if (!/src="\/app\/_expo\/static\/js\/web\/hosted-entry-[^"/]+\.js"/.test(index)) throw new Error('A hosted app entry is required.');
  if (/qa-fixtures|preview-entry|data-demonstration/i.test(index)) throw new Error('Test fixtures and preview entry cannot be used as the real app.');
  return { ...result, publicConfigurationSha256: createHash('sha256').update(source).digest('hex'), sameOriginLoginFiles: true, remoteActions: 0 };
}
