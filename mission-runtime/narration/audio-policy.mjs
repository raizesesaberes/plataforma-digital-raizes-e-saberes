import {approvedCopy, coloringCopy, contentDigest, gameCopyState} from './resolve.mjs';
import {assetRegistry} from './asset-registry.mjs';

export const AUDIO_ROOT = 'mission-runtime/narration/audio/';
const digestPattern = /^[a-f0-9]{64}$/;
const issuedCues = new WeakSet();
export async function sha256(bytes) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(value => value.toString(16).padStart(2, '0')).join('');
}
export const textDigest = text => sha256(new TextEncoder().encode(text));

// This list is deterministic and carries only public editorial content, never a
// school, pupil, session, answer history, access token, or production credential.
export function editorialClips() {
  const entries = new Map();
  const add = (clip, binding) => {
    if (!entries.has(clip.id)) entries.set(clip.id, {clipId: clip.id, text: clip.text, bindings: []});
    const item = entries.get(clip.id);
    if (item.text !== clip.text) throw Error('Conflicting approved clip: ' + clip.id);
    item.bindings.push(binding);
  };
  for (const [id, activity] of Object.entries(approvedCopy.coloring)) {
    const binding = `coloring:${id}:${activity.catalogId}:${activity.revision}:${activity.contentHash}`;
    Object.values(activity.stages).forEach(clip => add(clip, binding));
    Object.values(approvedCopy.common).forEach(clip => add(clip, binding));
  }
  for (const [id, example] of Object.entries(approvedCopy.examples)) {
    const binding = `game:${id}:${example.template}:${example.canonicalSha256}`;
    Object.values(approvedCopy.motors[example.template]).forEach(clip => add(clip, binding));
    [example.before, example.help, example.after].forEach(clip => add(clip, binding));
  }
  return [...entries.values()].map(item => ({...item, bindings: item.bindings.sort()}));
}

async function issue(clip, binding) {
  if (!clip) return null;
  const cue = Object.freeze({clipId: clip.id, text: clip.text, textSha256: await textDigest(clip.text), binding});
  issuedCues.add(cue);
  return cue;
}

// Rehash on each request. Do not trust a copied ID, the stored hash alone, or a
// previously verified mutable object. The engine remains the only state writer.
export async function gameCue(session, clipId) {
  const stateBefore = JSON.stringify(session);
  const content = session?.content;
  const example = approvedCopy.examples[content?.id];
  if (!example || example.template !== content.template) return null;
  const digest = await contentDigest(content);
  if (digest !== example.canonicalSha256 || JSON.stringify(session) !== stateBefore) return null;
  const state = gameCopyState(session, example);
  const permitted = [state.before, state.help, state.after,
    ...(session.complete ? [state.motor.finish] : [state.motor.entry, state.motor.help])];
  const cue = await issue(permitted.find(clip => clip?.id === clipId), `game:${content.id}:${content.template}:${digest}`);
  return JSON.stringify(session) === stateBefore ? cue : null;
}

// The caller must already have passed the institutional snapshot/art checks.
// This additional check does not replace or relax validateSnapshot. It never
// changes narration.status, licenseStatus, audio:null, or any snapshot bytes.
export async function coloringCue(activity, age, stage, presentation = {}) {
  if (typeof stage !== 'string' || !coloringCopy(activity, age)) return null;
  const snapshotBefore = JSON.stringify(activity), presentationBefore = JSON.stringify(presentation);
  const {contentHash, ...payload} = activity;
  if (await sha256(new TextEncoder().encode(JSON.stringify(payload))) !== contentHash || JSON.stringify(activity) !== snapshotBefore) return null;
  const approved = approvedCopy.coloring[activity.id];
  if (age === '2-3' && ['sound_4_5', 'letter_4_5', 'skip_sounds', 'paint_brush'].includes(stage)) return null;
  if (stage === 'discovery_2_3' && age !== '2-3' || stage === 'discovery_4_5' && age !== '4-5') return null;
  if (stage.startsWith('count_')) {
    if (!activity.counting || presentation.view !== 'counting') return null;
    const expected = {count_one: 1, count_two: 2, count_three: 3};
    if (stage in expected && presentation.count !== expected[stage]) return null;
    if (stage === 'count_reset' && (presentation.count !== 0 || presentation.restarted !== true)) return null;
  }
  if (stage === 'life_show' && (presentation.view !== 'life' || presentation.hasPaint !== true)) return null;
  if (stage === 'life_no_paint' && (presentation.view !== 'life' || presentation.hasPaint !== false)) return null;
  if (stage === 'finished' && presentation.completed !== true) return null;
  const clip = approved.stages[stage] || approvedCopy.common[stage];
  const cue = await issue(clip, `coloring:${activity.id}:${approved.catalogId}:${approved.revision}:${contentHash}`);
  return JSON.stringify(activity) === snapshotBefore && JSON.stringify(presentation) === presentationBefore ? cue : null;
}

export function safeAssetPath(path) {
  return typeof path === 'string' && /^mission-runtime\/narration\/audio\/[a-z0-9][a-z0-9_-]*\.mp3$/.test(path);
}
export function releasedRegistry(registry) {
  return registry?.schemaVersion === 1 && registry.editorialRevision === approvedCopy.revision &&
    registry.release?.status === 'approved' &&
    typeof registry.release.approvalRef === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(registry.release.approvalRef) &&
    Array.isArray(registry.assets) && Array.isArray(registry.licenses);
}
// Source text is checked against the generation history, not independently
// transcribed from audio. Technical checks never imply individual listening.
const reviewRef = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value);
function checkedSourceAndFile(review) {
  return reviewRef(review?.reference) && reviewRef(review?.sourceReference) &&
    review.sourceTextVerified === true && review.sourceVerification === 'generation_history' &&
    review.independentTranscription === false && review.technical?.hashVerified === true &&
    review.technical?.fullDecodePassed === true && review.technical?.formatPassed === true;
}
export function admittedReview(asset, registry) {
  const review = asset?.review;
  if (!checkedSourceAndFile(review) || asset.modelLabel !== 'Eleven v4') return false;
  if (review.mode === 'individual') return review.listened === true &&
    review.individualAuditoryQuality === 'passed' && review.pilotReference === null;
  if (review.mode !== 'approved_voice_pilot + per_file_technical_and_source_checks' ||
      review.listened !== false || review.individualAuditoryQuality !== 'not_assessed' ||
      !reviewRef(review.pilotReference)) return false;
  // A pilot reference must lead to an actual, individually reviewed asset in
  // this same release with the same voice/model, never to a generic claim.
  return registry.assets.some(pilot => pilot !== asset && pilot.status === 'reviewed' &&
    pilot.voiceId === asset.voiceId && pilot.modelLabel === asset.modelLabel &&
    pilot.review?.reference === review.pilotReference && checkedSourceAndFile(pilot.review) &&
    pilot.review.mode === 'individual' && pilot.review.listened === true &&
    pilot.review.individualAuditoryQuality === 'passed' && pilot.review.pilotReference === null);
}
// Called again immediately before/after loading and on resume. Passing an entry
// from an untrusted object is insufficient: both cue and manifest must match.
export function resolveAsset(cue, registry = assetRegistry) {
  if (!cue || !issuedCues.has(cue) || !releasedRegistry(registry)) return null;
  const matches = registry.assets.filter(asset => asset.clipId === cue.clipId);
  if (matches.length !== 1) return null;
  const asset = matches[0];
  if (asset.status !== 'reviewed' || asset.textSha256 !== cue.textSha256 ||
      !Array.isArray(asset.bindings) || !asset.bindings.includes(cue.binding) ||
      !safeAssetPath(asset.path) || !digestPattern.test(asset.sha256) ||
      !Number.isSafeInteger(asset.bytes) || asset.bytes < 128 || asset.bytes > 10_000_000 ||
      !Number.isFinite(asset.durationSeconds) || asset.durationSeconds <= 0 || asset.durationSeconds > 180 ||
      asset.voiceId !== approvedCopy.voice.voiceId || !admittedReview(asset, registry)) return null;
  const licenses = registry.licenses.filter(license => license.id === asset.licenseId);
  if (licenses.length !== 1) return null;
  const license = licenses[0];
  if (license.provider !== approvedCopy.voice.provider || license.commercialUse !== true ||
      license.status !== 'confirmed' || !/^\d{4}-\d{2}-\d{2}$/.test(license.confirmedOn) ||
      typeof license.evidenceRef !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(license.evidenceRef)) return null;
  return asset;
}
