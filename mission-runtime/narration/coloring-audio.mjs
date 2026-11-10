import {assetRegistry} from './asset-registry.mjs';
import {coloringCue, resolveAsset, releasedRegistry, editorialClips, admittedReview} from './audio-policy.mjs';
import {StaticNarrator} from './static-player.mjs';
const idleAdapter = Object.freeze({enabled: false, show() {}, clear() {}, stop() {}, dispose() {}});
const stageLabels = {
  welcome: 'acolhimento', discovery_2_3: 'descoberta', discovery_4_5: 'descoberta',
  sound_4_5: 'sons das palavras', letter_4_5: 'letra inicial', skip_sounds: 'convite para continuar pintando',
  count_invite: 'convite para contar', count_one: 'uma estrela', count_two: 'duas estrelas',
  count_three: 'três estrelas', count_reset: 'contar outra vez', paint_touch: 'pintar com um toque',
  paint_brush: 'pintar com o pincel', paint_erase: 'apagar pintura', paint_more_colors: 'mais cores',
  paint_undo: 'desfazer pintura', paint_keyboard: 'pintar pelo teclado', life_invite: 'ganhar vida',
  life_show: 'desenho com pintura', life_no_paint: 'desenho sem pintura', life_pause: 'pausar o movimento',
  finished: 'conclusão da descoberta', permission_to_observe: 'observar no seu tempo', audio_unavailable: 'ajuda com o áudio',
};
// Presentation-only release copy. Frozen snapshot narration fields stay pending.
// The build verifies real files/license/hash; these labels do not authorize play.
export function coloringAudioNotices(registry = assetRegistry) {
  if (!releasedRegistry(registry)) return null;
  const available = registry.assets.filter(asset => asset.status === 'reviewed' && admittedReview(asset, registry) &&
    asset.bindings?.some(binding => binding.startsWith('coloring:')) &&
    registry.licenses.some(license => license.id === asset.licenseId && license.status === 'confirmed' && license.commercialUse === true));
  if (!available.length) return null;
  const total = editorialClips().filter(clip => clip.bindings.some(binding => binding.startsWith('coloring:'))).length;
  const partial = new Set(available.map(asset => asset.clipId)).size < total;
  return {
    stageUnavailable: 'Esta orientação ainda não tem áudio disponível. O adulto pode ler o roteiro; use os botões Ouvir nas etapas com narração.',
    life: 'As orientações disponíveis têm botões Ouvir. Ouvir é opcional e o texto continua disponível.',
    adultTitle: 'Áudio disponível por etapa',
    adultBody: (partial ? 'Um conjunto de falas com Carla está disponível, com licença comercial confirmada. As demais falas seguem em preparação. ' :
      'As falas com Carla disponíveis nos botões Ouvir têm licença comercial confirmada. ') +
      'Ouvir é opcional e o roteiro continua acessível em texto. A gravura animada é a mesma pintura digital; não há leitura de folha fotografada.',
    partial,
  };
}
export function createColoringAudio({getActivity, getAge, registry = () => assetRegistry, document: doc = globalThis.document,
  makePlayer = options => new StaticNarrator(options)} = {}) {
  // Empty registry means no elements, listeners, requests or changes to old controls.
  if (!releasedRegistry(registry())) return idleAdapter;
  if (!doc.querySelector('link[data-carla-audio-style]')) {
    const style = doc.createElement('link'); style.rel = 'stylesheet'; style.href = new URL('./audio-controls.css', import.meta.url).href;
    style.setAttribute('data-carla-audio-style', ''); doc.head.append(style);
  }
  let token = 0, clickRequest = 0, panel = null, legacy = null, controller = null, disposed = false;
  const element = (tag, text, className) => { const item = doc.createElement(tag); if (text) item.textContent = text; if (className) item.className = className; return item; };
  const clear = () => {
    token++; clickRequest++; controller?.stop(); panel?.remove(); panel = null;
    if (legacy?.isConnected) legacy.hidden = false;
    legacy = null;
  };
  async function show({container, activity = getActivity(), age = getAge(), stages, presentation = {}, replaceNote = null}) {
    clear();
    if (disposed || !container?.isConnected || !releasedRegistry(registry())) return;
    const epoch = token, context = Object.freeze({epoch, activity, age, presentation}), snapshot = JSON.stringify(activity);
    const valid = cue => !disposed && token === epoch && JSON.stringify(activity) === snapshot && container.isConnected && getActivity() === activity && getAge() === age &&
      (!container.closest('dialog') || container.closest('dialog').open) && stages.some(stage => stage === cue?.stage || cue?.clipId.endsWith('.' + stage));
    // Registry and cryptographic checks occur before any controls are shown.
    let ready;
    try {
      ready = (await Promise.all(stages.map(async stage => ({stage, cue: await coloringCue(activity, age, stage, presentation)}))))
        .filter(({cue}) => cue && resolveAsset(cue, registry()));
    } catch { return; }
    if (!ready.length || token !== epoch || getActivity() !== activity || getAge() !== age || !container.isConnected) return;
    panel = element('section', null, 'carla-audio-panel'); panel.setAttribute('aria-label', 'Ouvir o roteiro com Carla'); panel.setAttribute('role', 'group'); panel.dataset.carlaAudioControls = 'coloring';
    const actions = element('div', null, 'carla-audio-actions');
    const pause = element('button', 'Pausar narração'), stop = element('button', 'Parar narração');
    const status = element('p', 'Escolha uma orientação para ouvir. O texto continua disponível.');
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    controller ||= makePlayer({registry, document: doc, onStatus: () => {}});
    controller.onStatus = value => {
      if (token !== epoch || !panel?.isConnected) return;
      status.textContent = value.message;
      pause.textContent = value.state === 'blocked' ? 'Tentar iniciar narração' : value.state === 'paused' ? 'Retomar narração' : 'Pausar narração';
      pause.disabled = !['playing', 'paused', 'blocked'].includes(value.state);
      stop.disabled = !['loading', 'playing', 'paused', 'blocked'].includes(value.state);
    };
    controller.setContext(context, cue => valid(cue) && ready.some(item => item.cue.clipId === cue?.clipId && item.cue.textSha256 === cue?.textSha256 && item.cue.binding === cue?.binding));
    const transcript = element('details'); transcript.append(element('summary', 'Ler o roteiro de áudio'));
    for (const {stage, cue} of ready) {
      const button = element('button', `Ouvir ${stageLabels[stage] || 'orientação'}`, 'carla-audio-listen');
      button.type = 'button'; button.dataset.carlaAudioId = cue.clipId;
      button.setAttribute('aria-label', `Ouvir ${stageLabels[stage] || 'orientação'} com Carla`);
      button.addEventListener('click', async event => {
        const request = ++clickRequest;
        const fresh = await coloringCue(activity, age, stage, presentation).catch(() => null);
        if (fresh && request === clickRequest && token === epoch && valid(fresh)) void controller.play(fresh, event);
      });
      panel.append(button); transcript.append(element('p', cue.text));
    }
    pause.type = stop.type = 'button'; pause.disabled = stop.disabled = true;
    pause.addEventListener('click', event => { clickRequest++; if (['paused', 'blocked'].includes(controller.state)) void controller.resume(event); else controller.pause(); });
    stop.addEventListener('click', () => { clickRequest++; controller.stop(); }); actions.append(pause, stop);
    panel.append(actions, status, transcript); container.append(panel);
    legacy = replaceNote; if (legacy?.isConnected) legacy.hidden = true;
  }
  return {enabled: true, show, clear, stop() { clickRequest++; controller?.stop(); }, dispose() { clear(); disposed = true; controller?.dispose(); controller = null; }};
}
