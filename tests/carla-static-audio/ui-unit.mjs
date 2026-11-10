import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createColoringAudio, coloringAudioNotices} from '../../mission-runtime/narration/coloring-audio.mjs';
import {pendingRegistry} from './pending-fixture.mjs';
import {coloringCue, editorialClips, sha256} from '../../mission-runtime/narration/audio-policy.mjs';
import {StaticNarrator} from '../../mission-runtime/narration/static-player.mjs';
import {STOP_AUDIO_EVENT, stopFrameAudio} from '../../mission-runtime/narration/audio-lifecycle.mjs';
import {approvedCopy} from '../../mission-runtime/narration/approved-copy.mjs';
const colors = JSON.parse(readFileSync(new URL('../../mission-runtime/coloring/catalog.json', import.meta.url)));

// Minimal offline DOM double. No browser, human voice, real audio, or media API
// is exercised here. Real browser/keyboard/AT verification remains required.
class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.attrs = {}; this.dataset = {}; this.events = {}; this.hidden = false; this.disabled = false; this.textContent = ''; }
  get isConnected() { return this.root === true || Boolean(this.parent?.isConnected); }
  setAttribute(key, value) { this.attrs[key] = value; }
  append(...items) { for (const child of items) { child.parent = this; this.children.push(child); } }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(item => item !== this); this.parent = null; }
  closest(selector) { return this.tagName === selector ? this : this.parent?.closest(selector) || null; }
  addEventListener(type, fn) { (this.events[type] ||= []).push(fn); }
  fire(type, extra = {}) { for (const fn of this.events[type] || []) fn({type, isTrusted: true, currentTarget: this, ...extra}); }
  all(tag) { return this.children.flatMap(child => [child, ...child.all(tag)]).filter(child => child.tagName === tag); }
}
function documentDouble() {
  const doc = new EventTarget(); doc.hidden = false;
  doc.createElement = tag => new Element(tag); doc.querySelector = () => null; doc.head = new Element('head'); doc.head.root = true;
  return doc;
}
class Media {
  paused = true;
  setAttribute() {} removeAttribute() { this.src = ''; } load() {}
  pause() { this.paused = true; }
  async play() { this.paused = false; }
}
const bytes = new Uint8Array(256).fill(67), hash = await sha256(bytes);
async function setup({pending = false} = {}) {
  const activity = colors[0], cue = await coloringCue(activity, '2-3', 'welcome');
  const clip = editorialClips().find(item => item.clipId === cue.clipId);
  const registry = {schemaVersion: 1, editorialRevision: approvedCopy.revision,
    release: {status: 'approved', approvalRef: 'unit-only'},
    licenses: [{id: 'unit', provider: 'ElevenLabs', commercialUse: true, status: 'confirmed', confirmedOn: '2026-11-10', evidenceRef: 'unit-only'}],
    assets: [{clipId: cue.clipId, textSha256: cue.textSha256, bindings: clip.bindings, status: 'reviewed',
      path: 'mission-runtime/narration/audio/test-only.mp3', sha256: hash, bytes: bytes.length, durationSeconds: 2,
      voiceId: approvedCopy.voice.voiceId, licenseId: 'unit', modelLabel: 'Eleven v4', review: {mode: 'individual', sourceTextVerified: true, sourceVerification: 'generation_history', sourceReference: 'qa-source-only', independentTranscription: false, listened: true, individualAuditoryQuality: 'passed', pilotReference: null, technical: {hashVerified: true, fullDecodePassed: true, formatPassed: true}, reference: 'unit-only'}}]};
  const doc = documentDouble(), win = new EventTarget(); win.location = {origin: 'https://local.test'};
  const container = new Element('div'); container.root = true;
  const legacy = new Element('div'); container.append(legacy);
  let current = activity, age = '2-3', requests = 0, player, finish;
  const media = [];
  const adapter = createColoringAudio({getActivity: () => current, getAge: () => age, registry: () => registry, document: doc,
    makePlayer: options => (player = new StaticNarrator({...options, document: doc, window: win,
      fetch: async () => { requests++; return pending ? new Promise(resolve => { finish = resolve; }) : new Response(bytes); },
      makeAudio: () => { const audio = new Media(); media.push(audio); return audio; },
      urls: {createObjectURL: () => 'blob:unit', revokeObjectURL() {}}}))});
  const show = stages => adapter.show({container, stages, replaceNote: legacy});
  return {adapter, container, legacy, doc, win, registry, show, media,
    player: () => player, requests: () => requests, finish: () => finish?.(new Response(bytes)),
    changeAge: () => { age = '4-5'; }, changeActivity: () => { current = colors[1]; }};
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

test('empty registry is a truly inert Colorir adapter', () => {
  let touched = false;
  const adapter = createColoringAudio({registry: () => pendingRegistry,
    getActivity: () => { touched = true; }, document: {createElement() { touched = true; }}, makePlayer() { touched = true; }});
  assert.equal(adapter.enabled, false); adapter.show(); adapter.clear(); adapter.stop(); adapter.dispose();
  assert.equal(touched, false);
});
test('admitted clip gets semantic controls and transcript without autoplay', async () => {
  const f = await setup();
  try {
    await f.show(['welcome', 'discovery_2_3']);
    const buttons = f.container.all('button');
    assert.deepEqual(buttons.map(button => button.textContent), ['Ouvir acolhimento', 'Pausar narração', 'Parar narração']);
    assert(buttons.every(button => button.type === 'button'));
    assert.equal(buttons[0].attrs['aria-label'], 'Ouvir acolhimento com Carla');
    assert(f.container.all('p').some(p => p.textContent === approvedCopy.coloring.cachorro.stages.welcome.text));
    assert.equal(f.container.all('section')[0].attrs.role, 'group');
    assert(f.container.all('p').some(p => p.attrs.role === 'status' && p.attrs['aria-live'] === 'polite'));
    assert.equal(f.requests(), 0); assert.equal(f.media.length, 0); assert(f.legacy.hidden);
  } finally { f.adapter.dispose(); }
});
test('explicit listen, pause, resume and stop keep independent text and controls', async () => {
  const f = await setup();
  try {
    await f.show(['welcome']); const [listen, pause, stop] = f.container.all('button');
    listen.fire('click'); while (!f.media.length) await tick(); await tick();
    assert.equal(f.player().state, 'playing'); assert(!pause.disabled);
    pause.fire('click'); assert.equal(pause.textContent, 'Retomar narração'); assert(f.media[0].paused);
    pause.fire('click'); await tick(); assert.equal(f.player().state, 'playing');
    stop.fire('click'); assert(f.media[0].paused); assert(stop.disabled);
    assert.equal(f.container.all('details').length, 1);
  } finally { f.adapter.dispose(); }
});
test('changed tab clears a pending request and does not speak a stale cue', async () => {
  const f = await setup({pending: true});
  try {
    await f.show(['welcome']); f.container.all('button')[0].fire('click');
    while (!f.requests()) await tick();
    assert.equal(f.player().state, 'loading');
    await f.show(['discovery_2_3']); f.finish(); await tick();
    assert.equal(f.media.length, 0); assert.equal(f.container.all('button').length, 0); assert(!f.legacy.hidden);
  } finally { f.adapter.dispose(); }
});
for (const transition of ['age', 'activity', 'removed', 'closed-dialog']) test('context gate rejects ' + transition, async () => {
  const f = await setup();
  try {
    await f.show(['welcome']); const listen = f.container.all('button')[0];
    if (transition === 'age') f.changeAge();
    if (transition === 'activity') f.changeActivity();
    if (transition === 'removed') f.container.root = false;
    if (transition === 'closed-dialog') { const d = new Element('dialog'); d.open = false; d.root = true; f.container.root = false; d.append(f.container); }
    listen.fire('click'); await tick(); assert.equal(f.requests(), 0);
  } finally { f.adapter.dispose(); }
});
test('host cancellation stops and revokes the current narrator before frame removal', async () => {
  const f = await setup();
  try {
    await f.show(['welcome']); f.container.all('button')[0].fire('click'); while (!f.media.length) await tick();
    f.win.dispatchEvent(new Event(STOP_AUDIO_EVENT));
    assert(f.media[0].paused); assert.equal(f.player().canUse({}), false);
  } finally { f.adapter.dispose(); }
});
test('host helper does nothing with the empty registry fixture', () => {
  let touched = false;
  stopFrameAudio({get contentWindow() { touched = true; throw Error('must remain inert'); }}, pendingRegistry);
  assert.equal(touched, false);
});
test('snapshots, embedded guard, Player hooks, engine stay unchanged; CSP adds only approved local media', () => {
  const base = 'bc7de6c68a1155ebacc18edf1afa4b36bddf5449';
  const baseFile = path => execFileSync('git', ['show', base + ':' + path], {cwd: new URL('../..', import.meta.url), encoding: 'utf8'});
  const rootFile = path => readFileSync(new URL('../../' + path, import.meta.url), 'utf8');
  assert.equal(rootFile('mission-runtime/studio/index.html'), baseFile('mission-runtime/studio/index.html').replace("default-src 'self';", "default-src 'self'; media-src 'self' blob:;"));
  for (const path of ['mission-runtime/narration/approved-copy.mjs', 'mission-runtime/narration/resolve.mjs',
    'mission-runtime/coloring/catalog.json', 'mission-runtime/coloring/narrator.mjs', 'mission-runtime/coloring/counting.mjs',
    'mission-runtime/studio/assets/Player-nHpDXt_8.js', 'mission-runtime/studio/assets/index-Di3aszpa.js',
    'qa/carla-guidance/player-hook.json']) assert.equal(rootFile(path), baseFile(path), path);
  const source = rootFile('mission-runtime/coloring/app.mjs'), before = baseFile('mission-runtime/coloring/app.mjs');
  const validation = text => text.slice(text.indexOf('function validateSnapshot('), text.indexOf('function startEmbedded('));
  assert.equal(validation(source), validation(before));
  assert(source.includes("ready=!embedded&&Boolean(licensedTrack(a.narration,tab))"));
  const host = rootFile('mission-runtime/institutional.mjs');
  assert(host.includes('const close=()=>{stopFrameAudio(frame);'));
});


test('context change while a click is being rehashed cannot start audio', async () => {
  const f = await setup();
  try {
    await f.show(['welcome']); f.container.all('button')[0].fire('click');
    f.changeActivity(); f.adapter.clear(); await tick();
    assert.equal(f.requests(), 0); assert.equal(f.media.length, 0);
  } finally { f.adapter.dispose(); }
});

test('empty-registry React adapter emits no controls or state changes', async () => {
  const {r} = await import('../../mission-runtime/studio/assets/react-Db-_YT-E.js');
  const {useGameAudio} = await import('../../mission-runtime/narration/game-audio.mjs');
  const React = r(), internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous = internals.H, effects = [];
  // Offline hook dispatcher only. This is not a React DOM or browser test.
  internals.H = {useRef: value => ({current: value}), useState: value => [value, () => { throw Error('unexpected state mutation'); }],
    useLayoutEffect: fn => effects.push(fn), useEffect: fn => effects.push(fn)};
  try {
    const example = Object.values(approvedCopy.examples)[0];
    const result = useGameAudio({content: {id: 'unused', template: 'quiz'}}, example, {registry: () => pendingRegistry});
    assert.equal(result.controls, null); assert.equal(result.available, false);
    assert.equal(result.lineButton(example.before, 'before'), null);
    for (const run of effects) run()?.();
  } finally { internals.H = previous; }
});


test('no admitted coloring asset preserves the exact legacy notices', () => {
  assert.equal(coloringAudioNotices(pendingRegistry), null);
});
test('partial coloring release avoids claiming full rollout or a pending license', async () => {
  const f = await setup();
  try {
    const notices = coloringAudioNotices(f.registry);
    assert.equal(notices.partial, true);
    assert.match(notices.adultBody, /As demais falas seguem em preparação/);
    assert.match(notices.adultBody, /licença comercial confirmada/);
    assert(!notices.life.includes('Narração em preparação'));
    f.registry.licenses[0].status = 'revoked';
    assert.equal(coloringAudioNotices(f.registry), null);
  } finally { f.adapter.dispose(); }
});


// Hold the first WebCrypto operation of a listen click. Further hashes run
// normally once released. These are offline handler tests, not browser/media QA.
function holdNextDigest() {
  const subtle = crypto.subtle, original = subtle.digest;
  let release;
  subtle.digest = function (...args) {
    subtle.digest = original;
    return new Promise((resolve, reject) => {
      release = () => original.apply(subtle, args).then(resolve, reject);
    });
  };
  return {
    get pending() { return Boolean(release); },
    async release() { assert(release, 'listen must reach its asynchronous hash'); await release(); },
    restore() { subtle.digest = original; },
  };
}
for (const command of ['stop', 'pause', 'resume', 'public-stop']) test('Colorir ' + command + ' cancels an older listen awaiting its hash', async () => {
  const f = await setup(); let held;
  try {
    await f.show(['welcome']); const [listen, pause, stop] = f.container.all('button');
    listen.fire('click'); while (!f.media.length) await tick(); await tick();
    assert.equal(f.player().state, 'playing');
    if (command === 'resume') { pause.fire('click'); assert.equal(f.player().state, 'paused'); }
    const requestsBefore = f.requests(), mediaBefore = f.media.length;
    held = holdNextDigest();
    const pending = listen.events.click[0]({type: 'click', isTrusted: true, currentTarget: listen});
    assert(held.pending);
    if (command === 'public-stop') f.adapter.stop();
    else (command === 'stop' ? stop : pause).fire('click');
    await held.release(); await pending; await tick();
    assert.equal(f.requests(), requestsBefore, 'cancelled listen must not fetch another track');
    assert.equal(f.media.length, mediaBefore, 'cancelled listen must not construct new media');
    assert.equal(f.player().state, command === 'pause' ? 'paused' : command === 'resume' ? 'playing' : 'stopped');
    assert.equal(f.media[0].paused, command !== 'resume');
  } finally { held?.restore(); f.adapter.dispose(); }
});

// Exercise the actual React adapter handlers with a seeded hook dispatcher.
// Effects and rendering are deliberately outside this race test's scope.
for (const command of ['stop', 'pause', 'resume']) test('game ' + command + ' cancels an older listen awaiting its hash', async () => {
  const {r} = await import('../../mission-runtime/studio/assets/react-Db-_YT-E.js');
  const {useGameAudio} = await import('../../mission-runtime/narration/game-audio.mjs');
  const {gameCue, resolveAsset} = await import('../../mission-runtime/narration/audio-policy.mjs');
  const {assetRegistry} = await import('../../mission-runtime/narration/asset-registry.mjs');
  const read = path => readFileSync(new URL('../../' + path, import.meta.url));
  const catalog = JSON.parse(read('mission-runtime/catalog.json'));
  const manifest = JSON.parse(read('scripts/mission-runtime-manifest.json'));
  const [id, example] = Object.entries(approvedCopy.examples).find(([, example]) => example.template === 'quiz');
  const expand = value => Array.isArray(value) ? value.map(expand) : value && typeof value === 'object' ?
    Object.fromEntries(Object.entries(value).map(([key, item]) => {
      if (key === 'src' && typeof item === 'string' && item.startsWith('rsplay-asset:')) {
        const hash = item.slice(13), entry = manifest.files.find(entry => entry.sha256 === hash && entry.file.startsWith('mission-runtime/studio/runtime/assets/'));
        assert(entry); const mime = entry.file.endsWith('.png') ? 'image/png' : 'image/jpeg';
        return [key, 'data:' + mime + ';base64,' + read(entry.file).toString('base64')];
      }
      return [key, expand(item)];
    })) : value;
  const content = expand(JSON.parse(read('mission-runtime/studio/' + catalog.find(entry => entry.id === id).runtimeFile)));
  const session = {content, questionIndex: 0, feedback: null, matched: [], flipped: [], correct: 0, complete: false};
  const cue = await gameCue(session, example.before.id);
  assert(cue); assert(resolveAsset(cue), 'seed a real admitted game cue');
  const calls = [], player = {
    play() { calls.push('play'); }, stop() { calls.push('stop'); },
    pause() { calls.push('pause'); }, resume() { calls.push('resume'); },
  };
  const refs = [{current: player}, {current: null}, {current: 0}];
  const states = [{session, cues: [cue]}, {state: command === 'resume' ? 'paused' : 'playing', message: ''}];
  const React = r(), internals = React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;
  const previous = internals.H; let refIndex = 0, stateIndex = 0, held;
  internals.H = {useRef: () => refs[refIndex++], useState: () => [states[stateIndex++], () => {}], useLayoutEffect() {}, useEffect() {}};
  try {
    const audio = useGameAudio(session, example, {registry: () => assetRegistry});
    const listen = audio.lineButton(example.before, 'before'); assert(listen);
    const [pause, stop] = audio.controls.props.children[0].props.children;
    const event = {nativeEvent: {type: 'click', isTrusted: true}};
    held = holdNextDigest(); const pending = listen.props.onClick(event); assert(held.pending);
    (command === 'stop' ? stop : pause).props.onClick(event);
    await held.release(); await pending;
    assert.deepEqual(calls, [command], 'older listen must not call play after the newer command');
  } finally { held?.restore(); internals.H = previous; }
});
