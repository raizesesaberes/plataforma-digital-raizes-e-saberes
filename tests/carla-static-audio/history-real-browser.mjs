// LOCAL QA ONLY: optional reviewed P10 MP3 is read from outside the checkout.
// It is served only by an intercepted test route and is never admitted by this
// test to the runtime registry/allowlist. Production still has its fixed set.
// CARLA_QA_QUIZ_AFTER_MP3=/path/to/verified/quiz-exemplo-explicacao.mp3
// PLAYWRIGHT_MODULE=... CHROMIUM_PATH=... node tests/carla-static-audio/history-real-browser.mjs
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {launchHarness, root} from '../carla-guidance/harness.mjs';
import {assetRegistry} from '../../mission-runtime/narration/asset-registry.mjs';
import {approvedCopy} from '../../mission-runtime/narration/approved-copy.mjs';
import {editorialClips, sha256, textDigest} from '../../mission-runtime/narration/audio-policy.mjs';
const input = process.env.CARLA_QA_QUIZ_AFTER_MP3;
assert(input && !resolve(input).startsWith(root + '/'), 'use the canonical verified input outside the repository');
const bytes = await readFile(input), expectedHash = '9e999941cbbf0505f1e06cea758e6ed91780db75e3335d6c8fdd1a9a50db0406';
assert.equal(await sha256(bytes), expectedHash); assert.equal(bytes.length, 107216);
const [id, quiz] = Object.entries(approvedCopy.examples).find(([, value]) => value.template === 'quiz');
const clip = editorialClips().find(clip => clip.clipId === quiz.after.id);
const registry = structuredClone(assetRegistry);
const asset = {...structuredClone(registry.assets.find(asset => !asset.review.listened)),
  clipId: clip.clipId, textSha256: await textDigest(clip.text), bindings: clip.bindings,
  path: 'mission-runtime/narration/audio/qa-only-quiz-history.mp3', sha256: expectedHash,
  bytes: bytes.length, durationSeconds: 5.642437};
// Parent confirmed P10 source/technical checks; voice pattern was approved in
// P00. This is a test-scoped registry entry, not individual listening approval.
asset.review.reference = 'qa-only-source-technical-p10-20261110';
asset.review.sourceReference = 'qa-only-source-technical-p10-20261110';
assert.equal(asset.review.listened, false); assert.equal(asset.review.individualAuditoryQuality, 'not_assessed');
registry.assets = registry.assets.filter(entry => entry.clipId !== asset.clipId).concat(asset);
const catalog = JSON.parse(await readFile(root + '/mission-runtime/catalog.json'));
const h = await launchHarness();
try {
  const cdp = await h.browser.newBrowserCDPSession();
  assert((await cdp.send('Browser.getBrowserCommandLine')).arguments.includes('--mute-audio'));
  await cdp.detach();
  const p = await h.page(390), errors = [];
  p.on('pageerror', error => errors.push(error.message));
  await p.emulateMedia({reducedMotion: 'reduce'});
  await p.route('**/mission-runtime/narration/asset-registry.mjs', route => route.fulfill({contentType: 'text/javascript', body: `export const assetRegistry=${JSON.stringify(registry)};`}));
  await p.route('**/' + asset.path, route => route.fulfill({contentType: 'audio/mpeg', body: bytes}));
  await p.addInitScript(() => {
    window.__historyMedia = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (!window.__historyMedia.includes(this)) window.__historyMedia.push(this);
      return Reflect.apply(play, this, args);
    };
  });
  await h.install(p, '/mission-runtime/studio/?snapshot=1&institutional=1'); await h.wait(p, 'rs-teacher-ready');
  await h.send(p, {type: 'rs-teacher-preview', content: catalog.find(entry => entry.id === id)});
  const f = p.frames()[1]; p.setDefaultTimeout(15000);
  const question = f.locator('#quiz-question-title'); await question.waitFor();
  const before = await question.textContent();
  assert.equal(await f.locator(`[data-carla-audio-id="${quiz.after.id}"]`).count(), 0);
  await f.locator('.quiz-options button').filter({hasText: 'Madeira'}).first().click();
  await f.waitForFunction(before => document.querySelector('#quiz-question-title').textContent !== before, before);
  await p.waitForTimeout(1500); // Far beyond the original short answer window.
  const currentQuestion = await question.textContent();
  const details = f.locator('[data-carla-guidance]');
  if (!(await details.evaluate(element => element.open))) await details.locator('summary').click();
  await f.locator(`[data-carla-audio-id="${quiz.after.id}"]`).click();
  await f.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(element => /Ouvindo Carla|O navegador pediu/.test(element.textContent)));
  const retry = f.getByRole('button', {name: 'Tentar iniciar narração', exact: true});
  if (await retry.count()) await retry.click();
  await f.waitForFunction(() => __historyMedia.some(media => media.hasAttribute('data-carla-audio') && !media.paused && media.currentTime > 0.1));
  assert((await f.evaluate(() => __historyMedia.at(-1).getAttribute('src'))).startsWith('blob:'));
  await f.getByText('Narração concluída.', {exact: true}).waitFor({timeout: 15000});
  assert.equal(await question.textContent(), currentQuestion, 'audio never dispatches a new answer');
  assert.equal(await f.locator('[data-copy-kind="before"]').count(), 0);
  assert(await f.evaluate(() => __historyMedia.every(media => media.paused)));
  assert.deepEqual(errors, []);
  const report = {passed: true, checkpointAssets: assetRegistry.assets.length, testOnlyExtraClip: quiz.after.id,
    sha256: expectedHash, bytes: bytes.length, durationSeconds: asset.durationSeconds,
    listenedIndividually: false, chromeOutputMuted: true, viewportWidth: 390, reducedMotion: true,
    explicitListenAfterItemAdvancePlusMs: 1500, entireRealClipReachedEnded: true,
    originalAdvanceUnchanged: true, productionRegistryChanged: false,
    limitations: ['P10 file served by isolated QA route only.', 'Chrome headless; not a listening assessment, physical phone, Safari or screen reader.'], errors};
  await mkdir(root + '/qa/carla-static-audio/evidence', {recursive: true});
  await writeFile(root + '/qa/carla-static-audio/evidence/history-real-browser.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally {await h.close();}
