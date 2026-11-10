import {r as requireReact} from '../studio/assets/react-Db-_YT-E.js';
import {assetRegistry} from './asset-registry.mjs';
import {gameCue, gameCues, unchangedSnapshot, resolveAsset, releasedRegistry} from './audio-policy.mjs';
import {gameCopyState} from './resolve.mjs';
import {StaticNarrator} from './static-player.mjs';
const React = requireReact(), h = React.createElement;
const labels = {entry: 'acolhimento', 'motor-help': 'como jogar', before: 'proposta',
  'example-help': 'dica', after: 'descoberta já explorada', finish: 'conclusão'};
function clipsFor(session, example) {
  const state = gameCopyState(session, example);
  if (!state?.example) return [];
  return [state.before, state.help, state.after,
    ...(session.complete ? [state.motor.finish] : [state.motor.entry, state.motor.help])].filter(Boolean);
}

// Presentation only. No dispatch, continue, timer, score or progress writes.
export function useGameAudio(session, example, {registry = () => assetRegistry} = {}) {
  const controller = React.useRef(null), live = React.useRef(null), clickRequest = React.useRef(0);
  const [ready, setReady] = React.useState(null), [status, setStatus] = React.useState({state: 'idle', message: ''});
  const currentRegistry = registry();
  const registered = new Set(Array.isArray(currentRegistry?.assets) ? currentRegistry.assets.map(asset => asset?.clipId) : []);
  const candidates = example ? clipsFor(session, example).filter(clip => registered.has(clip.id)) : [];
  const enabled = releasedRegistry(currentRegistry) && candidates.length > 0;
  live.current = {session, example};
  React.useLayoutEffect(() => {
    if (!enabled) {
      controller.current?.dispose(); controller.current = null;
      return;
    }
    const player = controller.current ||= new StaticNarrator({onStatus: setStatus, registry});
    let active = true; const unchanged = unchangedSnapshot(session); clickRequest.current++;
    const valid = cue => active && unchanged(session) && live.current.session === session && live.current.example === example &&
      clipsFor(session, example).some(clip => clip.id === cue?.clipId);
    player.setContext(session, valid);
    setReady(null);
    // Defer only optional control preparation, leaving the engine's existing
    // effects/timers free to register before hashing embedded image bytes.
    const preparation = setTimeout(() => {
      if (!active) return;
      gameCues(session, candidates.map(clip => clip.id)).then(cues => {
        if (active && live.current.session === session) setReady({session, cues: cues.filter(cue => cue && resolveAsset(cue, registry()))});
      }).catch(() => { if (active) setReady(null); });
    }, 0);
    return () => { active = false; clearTimeout(preparation); clickRequest.current++; player.stop(); };
  }, [session, example, enabled]);
  React.useEffect(() => () => { controller.current?.dispose(); controller.current = null; }, []);
  const cues = ready?.session === session && enabled ? ready.cues : [];
  const lineButton = (clip, kind) => {
    const cue = cues.find(cue => cue.clipId === clip.id);
    if (!cue) return null;
    return h('button', {type: 'button', className: 'carla-audio-listen', 'data-carla-audio-id': cue.clipId,
      'aria-label': `Ouvir ${labels[kind] || 'orientação'} com Carla`,
      onClick: async event => {
        const gesture = event.nativeEvent, request = ++clickRequest.current;
        const fresh = await gameCue(session, cue.clipId).catch(() => null);
        if (fresh && request === clickRequest.current && live.current.session === session) void controller.current?.play(fresh, gesture);
      }}, 'Ouvir com Carla');
  };
  const controls = !cues.length ? null : h('div', {className: 'carla-audio-panel', 'data-carla-audio-controls': 'game', role: 'group', 'aria-label': 'Narração de Carla'},
    h('div', {className: 'carla-audio-actions'},
      h('button', {type: 'button', disabled: !['playing', 'paused', 'blocked'].includes(status.state),
        onClick: event => { clickRequest.current++; if (['paused', 'blocked'].includes(status.state)) void controller.current?.resume(event.nativeEvent); else controller.current?.pause(); }},
      status.state === 'blocked' ? 'Tentar iniciar narração' : status.state === 'paused' ? 'Retomar narração' : 'Pausar narração'),
      h('button', {type: 'button', disabled: !['loading', 'playing', 'paused', 'blocked'].includes(status.state), onClick: () => { clickRequest.current++; controller.current?.stop(); }}, 'Parar narração')),
    h('p', {role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'}, status.message || 'Escolha uma orientação para ouvir. O texto continua disponível.'),
    h('p', {className: 'carla-audio-note'}, 'Se a música estiver tocando, pause-a no controle do jogo antes de ouvir Carla.'));
  return {lineButton, controls, available: cues.length > 0,
    onDetailsToggle: event => { if (!event.currentTarget.open) { clickRequest.current++; controller.current?.stop(); } }};
}
