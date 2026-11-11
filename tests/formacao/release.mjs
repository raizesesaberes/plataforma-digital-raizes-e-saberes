import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
import {validateFormacaoManifest} from '../../scripts/lib/formacao-runtime.mjs';
import {restoreReviewedFormationTemplate} from '../../scripts/lib/formacao-platform-menu.mjs';
const root=resolve(import.meta.dirname,'../..'),json=p=>JSON.parse(readFileSync(join(root,p),'utf8'));
const manifest=json('scripts/formacao-runtime-manifest.json');
const baseline=json('scripts/static-runtime-manifest.json');
const mission=json('scripts/mission-runtime-manifest.json');
const app=json('scripts/app-runtime-manifest.json');
test('Formation package permits only reviewed public resources and hashes every file',()=>{
  validateFormacaoManifest(manifest,baseline,mission.overrides,app.overrides);
  for(const entry of [...manifest.files,...manifest.overrides]) assert.equal(createHash('sha256').update(readFileSync(join(root,entry.file))).digest('hex'),entry.sha256,entry.file);
  for(const path of ['formacao-runtime/paid.mp4','supabase/functions/teacher-training-access/index.ts','formacao-runtime/../secrets.mjs']) {
    const bad=structuredClone(manifest);bad.files.push({file:path,sha256:'0'.repeat(64)});
    assert.throws(()=>validateFormacaoManifest(bad,baseline,mission.overrides,app.overrides));
  }
});
test('reviewed Formation edits leave every other platform-menu byte identical',()=>{
  const source=readFileSync(join(root,'app-pages.js')),patch=json('scripts/formacao-template-patch.json');
  const restored=restoreReviewedFormationTemplate(source,patch);
  assert.equal(createHash('sha256').update(restored).digest('hex'),'fbe2abd6783576e5f24aa2e8a34753fbbf0a0ba085435566d30dd7baf042164f');
  assert.throws(()=>restoreReviewedFormationTemplate(source+'\n<script>unreviewed</script>',patch));
});
test('public runtime includes no new paid media, signing tokens, or private bindings',()=>{
  for(const entry of manifest.files) {
    const source=readFileSync(join(root,entry.file),'utf8');
    assert.doesNotMatch(source,/sb_secret_|service_role.*eyJ|0f9a46d6c4dfb07b|1a2a805a953b98da|teacher_training_private/);
    assert(!entry.file.endsWith('.mp4'));
  }
  for(const p of ['supabase','qa','tests','media-inputs'])assert(!existsSync(join(root,'dist',p)));
});
