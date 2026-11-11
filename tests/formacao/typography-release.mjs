import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve, join} from 'node:path';
import {TYPOGRAPHY_OVERRIDES, validateTypographyManifest} from '../../scripts/lib/typography-runtime.mjs';
const root=resolve(import.meta.dirname,'../..');
const json=file=>JSON.parse(readFileSync(join(root,file),'utf8'));
const baseline=json('scripts/static-runtime-manifest.json');
const manifest=json('scripts/typography-runtime-manifest.json');
const others=['mission','app','formacao'].flatMap(name=>json(`scripts/${name}-runtime-manifest.json`).overrides);
test('typography release is restricted to three reviewed baseline resources',()=>{
  assert.deepEqual(TYPOGRAPHY_OVERRIDES,['styles.css','master-pack.css','index.html']);
  assert.equal(baseline.length,4373);
  validateTypographyManifest(manifest,baseline,others);
  for(const entry of manifest.overrides)assert.equal(createHash('sha256').update(readFileSync(join(root,entry.file))).digest('hex'),entry.sha256);
});
test('typography release rejects path expansion, duplicates, baseline replacement and override collisions',()=>{
  for(const path of ['supabase-config.js','../private','formacao-runtime/paid.mp4']){
    const bad=structuredClone(manifest);bad.overrides[0].file=path;
    assert.throws(()=>validateTypographyManifest(bad,baseline,others));
  }
  const duplicate=structuredClone(manifest);duplicate.overrides[1]=duplicate.overrides[0];
  assert.throws(()=>validateTypographyManifest(duplicate,baseline,others));
  const changedBaseline=structuredClone(manifest);changedBaseline.overrides[0].original_sha256='0'.repeat(64);
  assert.throws(()=>validateTypographyManifest(changedBaseline,baseline,others));
  assert.throws(()=>validateTypographyManifest(manifest,baseline,[...others,{file:'styles.css'}]));
});
