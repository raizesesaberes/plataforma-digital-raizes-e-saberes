import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_RUNTIME_OVERRIDES, validateAppOverrides } from '../../scripts/lib/app-runtime-overrides.mjs';
const baseline=APP_RUNTIME_OVERRIDES.map(file=>({file,sha256:'a'.repeat(64)}));
const entries=()=>baseline.map(entry=>({file:entry.file,original_sha256:entry.sha256,sha256:'b'.repeat(64)}));
test('only the explicit three library adapters can override the retained baseline',()=>{
 assert.equal(validateAppOverrides(entries(),baseline,[]).length,3);
});
test('missing, duplicate, unrelated, changed-baseline and feature-overlap overrides fail closed',()=>{
 for(const bad of [undefined,[],entries().slice(1),[entries()[0],entries()[0],entries()[2]],entries().map((e,i)=>i?e:{...e,file:'supabase-config.js'}),entries().map((e,i)=>i?e:{...e,original_sha256:'c'.repeat(64)}),entries().map((e,i)=>i?e:{...e,sha256:'invalid'})]) {
  assert.throws(()=>validateAppOverrides(bad,baseline,[]));
 }
 assert.throws(()=>validateAppOverrides(entries(),baseline,[{file:APP_RUNTIME_OVERRIDES[0]}]));
 assert.throws(()=>validateAppOverrides(entries(),baseline.slice(1),[]));
 assert.throws(()=>validateAppOverrides(entries(),[...baseline,baseline[0]],[]));
});
