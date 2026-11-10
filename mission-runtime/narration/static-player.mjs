import {resolveAsset, sha256} from './audio-policy.mjs';
import {assetRegistry} from './asset-registry.mjs';
import {STOP_AUDIO_EVENT} from './audio-lifecycle.mjs';

const players = new Set();
async function boundedBytes(response, expected) {
  const reader = response.body?.getReader();
  if (!reader) throw Error('Audio stream unavailable');
  const chunks = []; let total = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > expected) throw Error('Audio exceeds reviewed size');
      chunks.push(value);
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (total !== expected) throw Error('Incomplete audio');
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
const messages = {
  idle: '', loading: 'Preparando a voz da Carla…', playing: 'Ouvindo Carla.',
  paused: 'Narração pausada.', stopped: 'Narração interrompida.', ended: 'Narração concluída.',
  unavailable: 'O áudio não está disponível agora. O roteiro continua na tela.',
  blocked: 'O navegador pediu outro toque. Use Tentar iniciar narração ou leia o roteiro.',
  music: 'Pause a música no controle do jogo para ouvir Carla.',
};

// Inert until a future reviewed UI adapter calls play from a trusted user event.
// Dependencies are injectable for offline tests; production never uses a TTS API.
export class StaticNarrator {
  constructor({onStatus = () => {}, registry = () => assetRegistry, document: doc = globalThis.document,
    window: win = globalThis.window, fetch: fetcher = (...args) => globalThis.fetch(...args),
    makeAudio = () => new Audio(), urls = URL,
    musicPlaying = () => Boolean(doc?.querySelector('audio[data-game-music]:not([data-carla-audio])') &&
      [...doc.querySelectorAll('audio[data-game-music]')].some(audio => !audio.paused && !audio.ended)),
  } = {}) {
    this.onStatus = onStatus; this.registry = registry; this.doc = doc; this.win = win;
    this.fetcher = fetcher; this.makeAudio = makeAudio; this.urls = urls; this.musicPlaying = musicPlaying;
    this.serial = 0; this.context = null; this.allowed = () => false; this.disposed = false;
    this.audio = null; this.url = null; this.request = null; this.cue = null; this.state = 'idle';
    this.hidden = () => { if (this.doc?.hidden) this.stop(); };
    this.leave = () => this.stop();
    this.musicStarted = event => { if (this.cue && event.target?.matches?.('audio[data-game-music]')) this.stop('music'); };
    doc?.addEventListener('visibilitychange', this.hidden);
    doc?.addEventListener('freeze', this.leave);
    doc?.addEventListener('play', this.musicStarted, true);
    win?.addEventListener('pagehide', this.leave);
    this.hostStop = () => this.revoke();
    win?.addEventListener(STOP_AUDIO_EVENT, this.hostStop);
    players.add(this);
  }
  status(state) { this.state = state; this.onStatus({state, message: messages[state] || messages.unavailable}); }
  setContext(key, isAllowed = () => true) {
    if (key !== this.context) this.stop();
    this.context = key; this.allowed = isAllowed;
    if (this.cue && !this.canUse(this.cue)) this.stop();
  }
  revoke() { this.allowed = () => false; this.stop(); }
  canUse(cue) {
    try { return !this.disposed && this.context !== null && !this.doc?.hidden && this.allowed(cue) === true; }
    catch { return false; }
  }
  userEvent(event) { return event?.isTrusted === true && ['click', 'keydown', 'pointerup'].includes(event.type); }
  async play(cue, event) {
    if (!this.userEvent(event) || !this.canUse(cue)) return false;
    const asset = resolveAsset(cue, this.registry());
    if (!asset) { this.stop('unavailable'); return false; }
    // Preserve the existing music controller, volume and labels. The smallest
    // integration asks the listener to pause it, rather than mutating its media
    // behind React's back. Starting music later cancels this narration.
    if (this.musicPlaying()) { this.stop('music'); return false; }
    for (const player of players) player.stop();
    this.cue = cue; this.assetVersion = JSON.stringify(asset);
    const ticket = ++this.serial, context = this.context, assetVersion = JSON.stringify(asset);
    const abort = new AbortController(); this.request = abort;
    const timer = setTimeout(() => { if (ticket === this.serial) this.stop('unavailable'); }, 15000);
    this.timeout = timer;
    const stillCurrent = () => ticket === this.serial && this.context === context &&
      this.canUse(cue) && resolveAsset(cue, this.registry()) === asset && JSON.stringify(asset) === assetVersion && !this.musicPlaying();
    this.status('loading');
    try {
      const origin = this.win?.location?.origin;
      if (!origin || !/^https?:\/\//.test(origin)) throw Error('No valid same-origin audio host');
      const response = await this.fetcher(new URL('/' + asset.path, origin).href, {
        signal: abort.signal, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-cache',
      });
      if (!response.ok || response.redirected) throw Error('Audio could not be loaded');
      const length = response.headers.get('content-length');
      if (length && Number(length) !== asset.bytes) throw Error('Unexpected audio size');
      const bytes = await boundedBytes(response, asset.bytes);
      if (!stillCurrent()) { if (ticket === this.serial) this.stop(); return false; }
      if (bytes.byteLength !== asset.bytes || await sha256(bytes) !== asset.sha256) throw Error('Audio hash mismatch');
      if (!stillCurrent()) { if (ticket === this.serial) this.stop(); return false; }
      const audio = this.makeAudio(); this.audio = audio;
      audio.preload = 'none'; audio.loop = false;
      audio.setAttribute('data-carla-audio', '');
      const url = this.urls.createObjectURL(new Blob([bytes], {type: 'audio/mpeg'}));
      this.url = url; audio.src = url;
      audio.onended = () => { if (ticket === this.serial) this.stop('ended'); };
      audio.onerror = () => { if (ticket === this.serial) this.stop('unavailable'); };
      await audio.play();
      if (!stillCurrent()) { audio.pause(); if (this.audio === audio) this.stop(); return false; }
      this.status('playing'); return true;
    } catch (error) {
      if (ticket === this.serial) {
        // Keep only the already verified local Blob for a direct second gesture
        // (Safari/iOS). No fetch/hash await occurs before that next play().
        if (error?.name === 'NotAllowedError' && this.audio && stillCurrent()) this.status('blocked');
        else this.stop('unavailable');
      }
      return false;
    } finally {
      if (this.request === abort) this.request = null;
      clearTimeout(timer); if (this.timeout === timer) this.timeout = null;
    }
  }
  pause() {
    if (this.state === 'loading') { this.stop(); return; }
    if (this.audio) { this.audio.pause(); this.status('paused'); }
  }
  async resume(event) {
    if (!this.userEvent(event) || !['paused', 'blocked'].includes(this.state) || !this.audio) return false;
    if (!this.canUse(this.cue) || JSON.stringify(resolveAsset(this.cue, this.registry())) !== this.assetVersion) { this.stop(); return false; }
    if (this.musicPlaying()) { this.stop('music'); return false; }
    const audio = this.audio, ticket = this.serial;
    try {
      await audio.play();
      if (ticket !== this.serial || !this.canUse(this.cue) || JSON.stringify(resolveAsset(this.cue, this.registry())) !== this.assetVersion || this.musicPlaying()) {
        audio.pause(); if (this.audio === audio) this.stop(); return false;
      }
      this.status('playing'); return true;
    } catch { if (ticket === this.serial) this.status('blocked'); return false; }
  }
  stop(state = 'stopped') {
    this.serial++;
    clearTimeout(this.timeout); this.timeout = null;
    this.request?.abort(); this.request = null;
    if (this.audio) {
      this.audio.onended = this.audio.onerror = null;
      this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null;
    }
    if (this.url) { this.urls.revokeObjectURL(this.url); this.url = null; }
    this.cue = null;
    if (this.state !== 'idle' || state !== 'stopped') this.status(state);
  }
  dispose() {
    this.stop(); this.disposed = true; players.delete(this);
    this.doc?.removeEventListener('visibilitychange', this.hidden);
    this.doc?.removeEventListener('freeze', this.leave);
    this.doc?.removeEventListener('play', this.musicStarted, true);
    this.win?.removeEventListener('pagehide', this.leave);
    this.win?.removeEventListener(STOP_AUDIO_EVENT, this.hostStop);
  }
}
