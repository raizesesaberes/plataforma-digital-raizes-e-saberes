// LOCAL CHROME QA ONLY. Real registry, MP3 bytes, Audio and engine are preserved.
// Audio is silenced by Chromium --mute-audio, verified before opening a page.
// A transparent native play() observer retains detached Audio references; it
// does not replace Audio, resolve/reject playback, change volume or fake time.
// Run from the candidate checkout, or set CARLA_REPO_ROOT to that checkout:
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_PATH=/path/to/chrome \
//   node /path/to/carla-real-ui-browser.mjs
// Optional CARLA_QA_REPORT=/outside/repo/report.json. No output files by default.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const repo = resolve(process.env.CARLA_REPO_ROOT || process.cwd());
const load = file => import(pathToFileURL(resolve(repo, file)).href);
const {launchHarness, root} = await load('tests/carla-guidance/harness.mjs');
assert.equal(root, repo, 'harness must serve the selected checkout');
const {assetRegistry} = await load('mission-runtime/narration/asset-registry.mjs');
const {approvedCopy} = await load('mission-runtime/narration/approved-copy.mjs');
assert.equal(assetRegistry.assets.length, 111, 'this QA targets the P00-P18 checkpoint');
const [quizId, quiz] = Object.entries(approvedCopy.examples).find(([, value]) => value.template === 'quiz');
const admitted = id => { const asset = assetRegistry.assets.find(asset => asset.clipId === id); assert(asset, 'missing admitted clip: ' + id); return asset; };
admitted('colorir.cachorro.welcome'); admitted(quiz.before.id);
const colors = JSON.parse(await readFile(resolve(repo, 'mission-runtime/coloring/catalog.json')));
const catalog = JSON.parse(await readFile(resolve(repo, 'mission-runtime/catalog.json')));
const results = [], errors = [], violations = [], requests = [];
const h = await launchHarness();
let report;
try {
  const cdp = await h.browser.newBrowserCDPSession();
  const {arguments: chromeArgs} = await cdp.send('Browser.getBrowserCommandLine');
  assert(chromeArgs.includes('--mute-audio'), 'refuse to run without Chromium output muted');
  await cdp.detach();
  const p = await h.page(1280);
  p.setDefaultTimeout(15000);
  p.on('pageerror', error => errors.push(error.message));
  p.on('request', request => {
    if (request.url().includes('/mission-runtime/narration/audio/')) requests.push({url: request.url(), method: request.method()});
  });
  await p.exposeFunction('__carlaCspViolation', value => violations.push(value));
  await p.addInitScript(() => {
    window.__carlaRealMedia = [];
    const nativePlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      if (!window.__carlaRealMedia.includes(this)) window.__carlaRealMedia.push(this);
      return Reflect.apply(nativePlay, this, args);
    };
    document.addEventListener('securitypolicyviolation', event => {
      window.__carlaCspViolation({directive: event.effectiveDirective, blockedURI: event.blockedURI,
        source: new URL(event.sourceFile, location.href).pathname, line: event.lineNumber, column: event.columnNumber});
    });
  });
  const narration = frame => frame.evaluate(() => window.__carlaRealMedia.filter(media => media.hasAttribute('data-carla-audio')).map(media => ({
    paused: media.paused, ended: media.ended, currentTime: media.currentTime, src: media.getAttribute('src'), readyState: media.readyState,
  })));
  const waitPlaying = async frame => {
    // A genuine blocked gesture may require the existing explicit retry button.
    await frame.waitForFunction(() => ['Ouvindo Carla.', 'O navegador pediu outro toque. Use Tentar iniciar narração ou leia o roteiro.']
      .some(text => [...document.querySelectorAll('[role="status"]')].some(node => node.textContent === text)));
    const retry = frame.getByRole('button', {name: 'Tentar iniciar narração', exact: true});
    if (await retry.count()) await retry.click();
    await frame.waitForFunction(() => window.__carlaRealMedia.some(media => media.hasAttribute('data-carla-audio') && !media.paused && media.currentTime > 0.08));
    const first = (await narration(frame)).at(-1); assert(first.src?.startsWith('blob:'), 'play only verified Blob bytes');
    await p.waitForTimeout(160);
    const second = (await narration(frame)).at(-1); assert(second.currentTime > first.currentTime, 'real media time must advance');
    return second;
  };
  const stopped = async frame => {
    const media = await narration(frame); assert(media.length); assert(media.every(item => item.paused));
    assert.equal(media.at(-1).src, null, 'stop discards the verified Blob source');
  };

  // Colorir: use the real embedded-open protocol and frozen catalog snapshot.
  await h.install(p, '/mission-runtime/coloring/?embedded=1'); await h.wait(p, 'rs-coloring-ready');
  await h.send(p, {type: 'rs-coloring-open', content: colors.find(item => item.id === 'cachorro'), scope: 'local-real-audio-qa', ageRange: '2-3'});
  await h.wait(p, 'rs-coloring-opened');
  let frame = p.frames().find(frame => frame.url().includes('/mission-runtime/coloring/')); assert(frame);
  const welcome = () => frame.getByRole('button', {name: 'Ouvir acolhimento com Carla', exact: true});
  await welcome().waitFor();
  assert.equal(requests.length, 0, 'no MP3 request before a gesture');
  assert.deepEqual(await narration(frame), [], 'no narration before explicit listen');
  assert(await frame.locator('#hear-guide').isDisabled(), 'legacy embedded audio guard stays intact');
  await welcome().focus(); await p.keyboard.press('Enter');
  const playing = await waitPlaying(frame);
  await frame.getByRole('button', {name: 'Pausar narração', exact: true}).click();
  const paused = (await narration(frame)).at(-1); assert(paused.paused);
  await p.waitForTimeout(180);
  const held = (await narration(frame)).at(-1); assert(Math.abs(held.currentTime - paused.currentTime) < 0.05, 'paused time stays fixed');
  await frame.getByRole('button', {name: 'Retomar narração', exact: true}).click();
  await waitPlaying(frame); assert.equal((await narration(frame)).length, 1, 'resume reuses the verified media');
  await frame.getByRole('button', {name: 'Parar narração', exact: true}).click(); await stopped(frame);
  await welcome().click(); await waitPlaying(frame);
  await frame.locator('[data-tab="discovery"]').click(); await stopped(frame);
  await frame.getByRole('button', {name: 'Ouvir descoberta com Carla', exact: true}).waitFor();
  results.push({check: 'Colorir real MP3', passed: true, explicitKeyboardGesture: true, playingTime: playing.currentTime, pauseResumeStop: true, tabCancellation: true});

  await frame.locator('[data-tab="welcome"]').click(); await welcome().click(); await waitPlaying(frame);
  // Local host calls the same production helper as institutional.close(), then
  // removes its iframe. This checks the helper/removal contract, not auth UI.
  const hostRemoval = await p.evaluate(async () => {
    const frame = document.querySelector('iframe'), target = frame.contentWindow;
    const media = target.__carlaRealMedia.filter(media => media.hasAttribute('data-carla-audio'));
    const {stopFrameAudio} = await import('/mission-runtime/narration/audio-lifecycle.mjs');
    const wasPlaying = media.some(media => !media.paused);
    stopFrameAudio(frame);
    const stoppedBeforeRemoval = media.every(media => media.paused && !media.hasAttribute('src'));
    frame.remove();
    return {wasPlaying, stoppedBeforeRemoval, iframeRemoved: !frame.isConnected, stoppedAfterRemoval: media.every(media => media.paused)};
  });
  assert.deepEqual(hostRemoval, {wasPlaying: true, stoppedBeforeRemoval: true, iframeRemoved: true, stoppedAfterRemoval: true});
  results.push({check: 'production stopFrameAudio plus local host iframe removal', ...hostRemoval});

  // Quiz: load the exact approved content through the real Studio preview.
  await h.install(p, '/mission-runtime/studio/?snapshot=1&institutional=1'); await h.wait(p, 'rs-teacher-ready');
  await h.send(p, {type: 'rs-teacher-preview', content: catalog.find(item => item.id === quizId)});
  frame = p.frames().find(frame => frame.url().includes('/mission-runtime/studio/')); assert(frame);
  await frame.locator('[data-carla-guidance] summary').click();
  const proposal = frame.locator(`[data-carla-audio-id="${quiz.before.id}"]`); await proposal.waitFor();
  assert.equal(await frame.locator('[data-copy-kind="after"]').count(), 0, 'answer explanation stays hidden before responding');
  assert.deepEqual(await narration(frame), []);
  await frame.getByRole('button', {name: 'Ouvir música', exact: true}).click();
  await frame.waitForFunction(() => { const audio = document.querySelector('audio[data-game-music]'); return audio && !audio.paused && audio.currentTime > 0.08; });
  const beforeBlocked = requests.length;
  await proposal.click();
  await frame.getByText('Pause a música no controle do jogo para ouvir Carla.', {exact: true}).waitFor();
  assert.deepEqual(await narration(frame), [], 'music blocks Carla before real media creation');
  assert.equal(requests.length, beforeBlocked, 'blocked narration does not fetch the clip');
  await frame.getByRole('button', {name: 'Pausar música', exact: true}).click();
  await proposal.click(); await waitPlaying(frame);
  // Starting the existing music again must also stop a currently playing voice.
  await frame.getByRole('button', {name: 'Ouvir música', exact: true}).click();
  await frame.getByText('Pause a música no controle do jogo para ouvir Carla.', {exact: true}).waitFor(); await stopped(frame);
  await frame.getByRole('button', {name: 'Pausar música', exact: true}).click();
  await proposal.click(); await waitPlaying(frame);
  const questionBefore = await frame.locator('#quiz-question-title').textContent();
  await frame.evaluate(() => {
    const title = () => document.querySelector('#quiz-question-title')?.textContent;
    window.__carlaAnswerTiming = {before: title(), clickedAt: null, advancedAt: null};
    document.addEventListener('click', event => {
      if (event.target.closest('.quiz-options button')) window.__carlaAnswerTiming.clickedAt = performance.now();
    }, {capture: true, once: true});
    const observer = new MutationObserver(() => {
      const timing = window.__carlaAnswerTiming;
      if (timing.clickedAt !== null && title() !== timing.before) { timing.advancedAt = performance.now(); observer.disconnect(); }
    });
    observer.observe(document.body, {subtree: true, childList: true, characterData: true});
  });
  await frame.locator('.quiz-options button').filter({hasText: 'Madeira'}).first().click();
  await stopped(frame);
  await frame.waitForFunction(() => window.__carlaAnswerTiming.advancedAt !== null);
  const timing = await frame.evaluate(() => window.__carlaAnswerTiming);
  const elapsedMs = timing.advancedAt - timing.clickedAt;
  // A real 1.2 s timer is subject to renderer scheduling; report exact elapsed.
  assert(elapsedMs >= 1100 && elapsedMs < 2500, `unexpected quiz advance timing: ${elapsedMs} ms`);
  assert.notEqual(await frame.locator('#quiz-question-title').textContent(), questionBefore);
  const engineSource = await readFile(resolve(repo, 'mission-runtime/studio/assets/Player-nHpDXt_8.js'), 'utf8');
  assert(engineSource.includes('2200:1200'), 'unchanged runtime must still configure its 1200 ms advance');
  results.push({check: 'real quiz proposal MP3 with existing music and answer cancellation', passed: true, musicBlocksNarration: true, musicStartStopsNarration: true, responseStopsNarration: true, advanceElapsedMs: elapsedMs, configuredAdvanceMs: 1200});
  assert.deepEqual(errors, [], 'no page errors');
  // Independently reproduced in untouched baseline 50c479a/bc7de6c with the
  // same harness and exact same source position. Keep eval blocked; reject
  // any new violation, especially media. Do not loosen script-src for it.
  const baselineViolation = {directive: 'script-src', blockedURI: 'eval',
    source: '/mission-runtime/studio/assets/index-Di3aszpa.js', line: 333, column: 95378};
  assert.deepEqual(violations, [baselineViolation], 'only the verified existing baseline eval block is expected');
  report = {passed: true, realAudio: true, registryAssets: assetRegistry.assets.length, chromeOutputMuted: true, listeningAssessment: false,
    limitations: ['Not a listening/voice-quality assessment.', 'Chrome headless only; no Safari/iOS or screen reader.', 'Local harness host/removal contract, not authenticated institutional production UI.', 'Native play is transparently observed; Audio, registry, bytes and playback promises are not replaced.'], results, requests, errors, violations};
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report = {passed: false, realAudio: true, results, requests, errors, violations, error: error.stack || String(error)};
  throw error;
} finally {
  try { if (process.env.CARLA_QA_REPORT && report) await writeFile(resolve(process.env.CARLA_QA_REPORT), JSON.stringify(report, null, 2) + '\n'); }
  finally { await h.close(); }
}
