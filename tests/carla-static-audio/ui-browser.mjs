// LOCAL TEST ONLY. Registry and media are replaced in an isolated browser route.
// No speech or MP3 is generated. This does not validate real audio quality, CSP
// playback, Safari, or a screen reader. None of these fixtures enters dist.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {launchHarness, root} from '../carla-guidance/harness.mjs';
import {editorialClips, textDigest, sha256} from '../../mission-runtime/narration/audio-policy.mjs';
import {approvedCopy} from '../../mission-runtime/narration/approved-copy.mjs';
const clips = editorialClips(), bytes = new Uint8Array(256).fill(67), hash = await sha256(bytes);
const quiz = Object.entries(approvedCopy.examples).find(([, value]) => value.template === 'quiz');
const trail = Object.entries(approvedCopy.examples).find(([, value]) => value.template === 'trail');
const ids = ['colorir.cachorro.welcome', approvedCopy.motors.quiz.entry.id, quiz[1].after.id, trail[1].after.id];
const registry = {schemaVersion: 1, editorialRevision: approvedCopy.revision,
  release: {status: 'approved', approvalRef: 'browser-fixture-only'},
  licenses: [{id: 'fixture', provider: 'ElevenLabs', commercialUse: true, status: 'confirmed', confirmedOn: '2026-11-10', evidenceRef: 'not-a-real-license'}],
  assets: await Promise.all(ids.map(async (id, index) => {
    const clip = clips.find(item => item.clipId === id);
    return {clipId: id, textSha256: await textDigest(clip.text), bindings: clip.bindings,
      status: 'reviewed', path: `mission-runtime/narration/audio/test-${index}.mp3`, sha256: hash, bytes: bytes.length,
      durationSeconds: 2, voiceId: approvedCopy.voice.voiceId, licenseId: 'fixture',
      modelLabel: 'Eleven v4', review: {mode: 'individual', sourceTextVerified: true, sourceVerification: 'generation_history', sourceReference: 'qa-source-only', independentTranscription: false, listened: true, individualAuditoryQuality: 'passed', pilotReference: null, technical: {hashVerified: true, fullDecodePassed: true, formatPassed: true}, reference: 'not-listened-test-double'}};
  }))};
const h = await launchHarness();
const results = [], errors = [];
try {
  const p = await h.page(390); p.on('pageerror', error => errors.push(error.message));
  await p.emulateMedia({reducedMotion: 'reduce'});
  await p.route('**/mission-runtime/narration/asset-registry.mjs', route => route.fulfill({contentType: 'text/javascript', body: `export const assetRegistry=${JSON.stringify(registry)};`}));
  await p.route('**/mission-runtime/narration/audio/test-*.mp3', async route => {
    await new Promise(resolve => setTimeout(resolve, 100));
    await route.fulfill({contentType: 'application/octet-stream', body: Buffer.from(bytes)}).catch(() => {});
  });
  await p.addInitScript(() => {
    window.carlaTestMedia = [];
    window.Audio = class {
      paused = true; attempts = 0;
      constructor() { window.carlaTestMedia.push(this); }
      setAttribute() {} removeAttribute() { this.src = ''; } load() {}
      pause() { this.paused = true; }
      async play() {
        if (++this.attempts === 1) { const error = Error('Test gesture block'); error.name = 'NotAllowedError'; throw error; }
        this.paused = false;
      }
    };
  });
  const colors = JSON.parse(await readFile(root + '/mission-runtime/coloring/catalog.json'));
  await h.install(p, '/mission-runtime/coloring/?embedded=1'); await h.wait(p, 'rs-coloring-ready');
  await h.send(p, {type: 'rs-coloring-open', content: colors[0], scope: 'audio-fixture', ageRange: '2-3'}); await h.wait(p, 'rs-coloring-opened');
  let ui = p.frameLocator('iframe'), frame = p.frames()[1];
  await ui.getByRole('button', {name: 'Ouvir acolhimento com Carla', exact: true}).waitFor();
  assert.equal(await frame.evaluate(() => carlaTestMedia.length), 0);
  assert(await ui.locator('#hear-guide').isDisabled());
  assert(await ui.locator('[data-carla-audio-controls]').getAttribute('role') === 'group');
  const button = ui.getByRole('button', {name: 'Ouvir acolhimento com Carla', exact: true});
  await button.focus(); await p.keyboard.press('Enter');
  await ui.getByRole('button', {name: 'Tentar iniciar narração', exact: true}).click();
  await ui.getByText('Ouvindo Carla.', {exact: true}).waitFor();
  await ui.getByRole('button', {name: 'Pausar narração', exact: true}).click();
  await ui.getByRole('button', {name: 'Retomar narração', exact: true}).click();
  await ui.locator('[data-tab="discovery"]').click();
  assert(await frame.evaluate(() => carlaTestMedia.every(media => media.paused)));
  assert.equal(await ui.locator('[data-carla-audio-controls]').count(), 0);
  results.push({coloring: 'keyboard, second gesture, pause/resume, tab cancellation, empty-stage fallback'});
  await ui.locator('[data-tab="welcome"]').click(); await button.waitFor(); await button.click();
  await ui.locator('[data-tab="discovery"]').click(); await p.waitForTimeout(200);
  assert(await frame.evaluate(() => carlaTestMedia.every(media => media.paused)));
  results.push({coloring: 'cancelled slow load does not start after tab change'});
  const catalog = JSON.parse(await readFile(root + '/mission-runtime/catalog.json'));
  await h.install(p, '/mission-runtime/studio/?snapshot=1&institutional=1'); await h.wait(p, 'rs-teacher-ready');
  await h.send(p, {type: 'rs-teacher-preview', content: catalog.find(item => item.id === quiz[0])});
  ui = p.frameLocator('iframe'); frame = p.frames()[1];
  await ui.locator('[data-carla-guidance] summary').click();
  await ui.locator(`[data-carla-audio-id="${approvedCopy.motors.quiz.entry.id}"]`).waitFor();
  assert.equal(await ui.locator(`[data-carla-audio-id="${quiz[1].after.id}"]`).count(), 0);
  await ui.locator('.quiz-options button').filter({hasText: 'Madeira'}).first().click();
  await ui.locator(`[data-carla-audio-id="${quiz[1].after.id}"]`).waitFor();
  await p.waitForTimeout(1400);
  assert.equal(await ui.locator('[data-copy-kind="before"]').count(), 0);
  await ui.locator('[data-carla-guidance] summary').click();
  await ui.locator(`[data-carla-audio-id="${quiz[1].after.id}"]`).click();
  await ui.getByRole('button', {name: 'Tentar iniciar narração', exact: true}).click();
  await ui.getByText('Ouvindo Carla.', {exact: true}).waitFor();
  await frame.evaluate(() => window.dispatchEvent(new Event('rs-carla-stop')));
  assert(await frame.evaluate(() => carlaTestMedia.every(media => media.paused)));
  assert(await frame.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  results.push({quiz: 'answer hidden before engine gate, original advance retained, manual review later, host revocation'});
  await h.install(p, '/mission-runtime/studio/?snapshot=1&institutional=1'); await h.wait(p, 'rs-teacher-ready');
  const trailEntry = catalog.find(item => item.id === trail[0]);
  const trailContent = JSON.parse(await readFile(root + '/mission-runtime/studio/' + trailEntry.runtimeFile));
  await h.send(p, {type: 'rs-teacher-preview', content: trailEntry});
  ui = p.frameLocator('iframe'); frame = p.frames()[1];
  assert.equal(await ui.locator(`[data-carla-audio-id="${trail[1].after.id}"]`).count(), 0);
  const first = trailContent.nodes[0], correct = first.options.find(option => option.id === first.correctOptionId);
  await ui.getByRole('button', {name: correct.label, exact: true}).click();
  await ui.getByText(trailContent.nodes[1].prompt, {exact: true}).waitFor();
  await p.waitForTimeout(1500);
  if (!(await ui.locator('[data-carla-guidance]').evaluate(element => element.open))) await ui.locator('[data-carla-guidance] summary').click();
  await ui.locator(`[data-carla-audio-id="${trail[1].after.id}"]`).click();
  await ui.getByRole('button', {name: 'Tentar iniciar narração', exact: true}).click();
  await ui.getByText('Ouvindo Carla.', {exact: true}).waitFor();
  assert.equal(await ui.locator('[data-copy-kind="before"]').count(), 0);
  await ui.getByRole('button', {name: 'Parar narração', exact: true}).click();
  assert(await frame.evaluate(() => carlaTestMedia.every(media => media.paused)));
  results.push({trail: 'explanation remains playable in history well after native item advance; fake media only'});
  assert.deepEqual(errors, []);
  await mkdir(root + '/qa/carla-static-audio/evidence', {recursive: true});
  await writeFile(root + '/qa/carla-static-audio/evidence/ui-browser-report.json', JSON.stringify({testDoublesOnly: true, realAudio: false, results, errors}, null, 2));
  console.log('PASS local UI fixtures. Real-audio, CSP, Safari and AT validation still required.');
} finally { await h.close(); }
