import {assetRegistry} from './asset-registry.mjs';
import {releasedRegistry} from './audio-policy.mjs';
export const STOP_AUDIO_EVENT = 'rs-carla-stop';
// Synchronous, same-origin and data-free. Run before destroying the iframe on
// exit, expiry or revocation. Never sends school/session data through a channel.
export function stopFrameAudio(frame, registry = assetRegistry) {
  if (!releasedRegistry(registry)) return;
  try {
    const target = frame?.contentWindow;
    if (target && target.location.origin === globalThis.location?.origin) target.dispatchEvent(new target.Event(STOP_AUDIO_EVENT));
  } catch { /* Inaccessible frames still lose playback when the host removes them. */ }
}
