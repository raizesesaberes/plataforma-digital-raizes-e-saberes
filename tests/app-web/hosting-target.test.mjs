import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PRODUCTION_REF, VALIDATION_REF, parsePublicConfigFile, validateBackendTarget, checkAppArtifact } from '../../scripts/lib/app-hosting-target.mjs';
const source = (ref = VALIDATION_REF, key = 'sb_publishable_synthetic') => `window.RAIZES_SUPABASE = {url:"https://${ref}.supabase.co",anonKey:"${key}",allowLocalFallback:false,};`;
test('literal public configuration is parsed without executing code', () => {
  assert.equal(parsePublicConfigFile(source()).anonKey, 'sb_publishable_synthetic');
  for (const bad of [source() + 'fetch("https://never.invalid")', source().replace('false', 'true'), source().replace('false', '(()=>false)()')]) assert.throws(() => parsePublicConfigFile(bad));
});
test('secret/service keys and unexpected fields are rejected', () => {
  const jwt = 'a.' + Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url') + '.b';
  for (const key of ['sb_secret_synthetic', jwt, 'unknown']) assert.throws(() => parsePublicConfigFile(source(VALIDATION_REF,key)));
  assert.throws(() => parsePublicConfigFile(source().replace('allowLocalFallback:false','allowLocalFallback:false,extra:1')));
});
test('validation rejects production and the occupied second template', () => {
  assert.throws(() => validateBackendTarget(parsePublicConfigFile(source(PRODUCTION_REF)), {mode:'validation',projectRef:VALIDATION_REF}));
  assert.throws(() => validateBackendTarget(parsePublicConfigFile(source('khtnlmsoytshnrypevcs')), {mode:'validation',projectRef:'khtnlmsoytshnrypevcs'}));
});
test('only exact HTTPS origin and explicit approved mode are accepted', () => {
  const config = parsePublicConfigFile(source());
  assert.equal(validateBackendTarget(config,{mode:'validation',projectRef:VALIDATION_REF}).backendOrigin, `https://${VALIDATION_REF}.supabase.co`);
  for (const url of ['http://'+VALIDATION_REF+'.supabase.co',config.url+'?query=1',config.url+'/#hash',config.url+'/path',config.url+'.evil.invalid']) assert.throws(() => validateBackendTarget({...config,url},{mode:'validation',projectRef:VALIDATION_REF}));
  assert.throws(() => validateBackendTarget(config,{mode:'auto',projectRef:VALIDATION_REF}));
});
test('artifact requires real entry and same-origin login, never logs a key', () => {
  const dir = mkdtempSync(join(tmpdir(),'app-target-test-'));
  try {
    mkdirSync(join(dir,'app')); mkdirSync(join(dir,'mission-runtime'));
    writeFileSync(join(dir,'supabase-config.js'),source());
    for (const file of ['login.html','login.js','app/platform-runtime.js','mission-runtime/institutional.mjs']) writeFileSync(join(dir,file),'');
    const html='<script src="/supabase-config.js"></script><script src="/app/platform-runtime.js"></script><script src="/app/_expo/static/js/web/hosted-entry-test.js"></script>';
    writeFileSync(join(dir,'app/index.html'),html);
    const result = checkAppArtifact(dir,{mode:'validation',projectRef:VALIDATION_REF});
    assert.equal(result.remoteActions,0);assert(!JSON.stringify(result).includes('sb_publishable'));
    writeFileSync(join(dir,'app/index.html'),html+'qa-fixtures');
    assert.throws(() => checkAppArtifact(dir,{mode:'validation',projectRef:VALIDATION_REF}));
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
