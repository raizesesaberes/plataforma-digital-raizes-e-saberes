// Planning only. Does not call a voice service, create sound, copy media, claim
// license clearance, or activate a runtime registry.
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {editorialClips, textDigest, AUDIO_ROOT, safeAssetPath} from '../mission-runtime/narration/audio-policy.mjs';
import {approvedCopy} from '../mission-runtime/narration/approved-copy.mjs';
const clips = await Promise.all(editorialClips().map(async clip => {
  const fileName = clip.clipId.replace(/\./g, '-') + '.mp3';
  const path = AUDIO_ROOT + fileName;
  if (!safeAssetPath(path)) throw Error('Review filename for ' + clip.clipId);
  return {...clip, textSha256: await textDigest(clip.text), fileName, path, status: 'not_generated', audio: null};
}));
const plan = {schemaVersion: 1, sourceCommit: 'bc7de6c68a1155ebacc18edf1afa4b36bddf5449',
  editorialRevision: approvedCopy.revision, voice: approvedCopy.voice,
  state: 'awaiting_real_licensed_reviewed_files', clips};
writeFileSync(resolve(import.meta.dirname, '../qa/carla-static-audio/asset-plan.json'), JSON.stringify(plan, null, 2) + '\n');
console.log('Prepared', clips.length, 'text/hash/binding records. Generated audio: 0.');
