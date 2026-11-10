// LOCAL IMPORT ONLY. The caller must explicitly name cumulatively authorized
// batches and a private review directory. No network/generation/publication.
// Private records remain in the input directory and never enter the allowlist.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {editorialClips} from '../mission-runtime/narration/audio-policy.mjs';
import {assetRegistry as previousRegistry} from '../mission-runtime/narration/asset-registry.mjs';
import {approvedCopy} from '../mission-runtime/narration/approved-copy.mjs';
import {validateCarlaAudio} from './lib/carla-audio-validation.mjs';
const [privateDirectory,batchList,releaseRef]=process.argv.slice(2);
assert(privateDirectory && batchList && /^[a-zA-Z0-9_-]{1,120}$/.test(releaseRef||''), 'usage: private-directory P00,P01,... opaque-local-admission-reference');
const input=resolve(privateDirectory),root=resolve(import.meta.dirname,'..');
assert(input!==root&&!input.startsWith(root+'/'),'private review directory must be outside the repository');
const batches=batchList.split(',');assert(batches.every(b=>/^P\d{2}$/.test(b))&&batches.includes('P00')&&new Set(batches).size===batches.length);
const json=path=>JSON.parse(readFileSync(path,'utf8')),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const inventory=json(join(input,'inventario-falas.json'));
assert.equal(inventory.sourceCommit,'bc7de6c68a1155ebacc18edf1afa4b36bddf5449');assert.equal(inventory.editorialRevision,approvedCopy.revision);
const planned=new Map(editorialClips().map(c=>[c.clipId,c]));
const incoming=new Map(inventory.clips.map(c=>[c.clipId,c]));
const technical=new Map(json(join(input,'validacao-tecnica.json')).results.map(c=>[c.clipId,c]));
const assets=[],privateMap=[],sourcePaths=new Map();
for(const batch of batches){
 const pilot=batch==='P00',folder=join(input,batch.toLowerCase()+'-recebido');
 const review=json(pilot?join(input,'conferencia-p00/review-p00.json'):join(folder,'revisao-coerencia.json'));
 const record=json(join(folder,'extraido',pilot?'registro-p00.json':'registro.json'));
 assert.equal(record.batchId,batch);assert.equal(record.voiceId,approvedCopy.voice.voiceId);assert.equal(record.modelUiLabel,'Eleven v4');
 assert.equal(record.license.plan,'Creator');assert.equal(record.license.betaRestrictionObserved,false);
 if(pilot){assert.equal(review.listenedByUser,true);assert.equal(review.voiceRhythmPronunciationApproved,true);assert.equal(review.independentTranscriptionPerformed,false);}
 else{assert.equal(review.batchId,batch);assert.equal(review.sourceTextAndGenerationLinkageVerified,true);assert.equal(review.technicalChecksPassed,true);assert.equal(review.individualListeningPerformed,false);assert.equal(review.independentTranscriptionPerformed,false);assert.equal(review.voicePatternApprovalRef,'voice-pilot-20261110-p00');assert.equal(record.license.paidPlanObserved,true);}
 assert.equal(review.clips.length,record.clips.length);
 for(const [index,checked] of review.clips.entries()){
  const clip=planned.get(checked.clipId),entry=incoming.get(checked.clipId),source=record.clips.find(c=>c.clipId===checked.clipId),tech=technical.get(checked.clipId);
  assert(clip&&entry&&source&&tech,'missing source/review/technical clip');
  assert.equal(source.text,clip.text);assert.equal(entry.text,clip.text);
  assert.equal(checked.generationId,source.generationId);assert.equal(entry.audio.generationId,source.generationId);
  assert.equal(checked.textSha256,sha(clip.text));assert.equal(source.textSha256,checked.textSha256);assert.equal(entry.textSha256,checked.textSha256);
  assert.equal(source.fileName,entry.fileName);assert.equal(entry.audio.fileName,entry.fileName);assert(/^[a-z0-9][a-z0-9_-]*\.mp3$/.test(entry.fileName));
  const bytes=readFileSync(join(input,'audio',entry.fileName)),digest=sha(bytes);
  assert.equal(digest,checked.audioSha256);assert.equal(digest,entry.audio.sha256);assert.equal(digest,source.audioSha256);assert.equal(digest,tech.audioSha256);
  assert.equal(bytes.length,entry.audio.bytes);assert.equal(bytes.length,source.audioBytes);assert.equal(bytes.length,tech.bytes);
  assert.equal(tech.textSha256,checked.textSha256);assert.deepEqual(tech.fatal,[]);assert.deepEqual(tech.requiresReview,[]);
  assert.equal(entry.audio.technicalDecode,'passed');assert.equal(tech.codec,'mp3');assert.equal(Number(tech.sampleRateHz),44100);assert.equal(tech.channels,1);assert.equal(Number(tech.bitrate),128000);
  assert(Math.abs(tech.durationSeconds-entry.audio.durationSeconds)<0.01);
  if(!pilot){assert.equal(entry.audio.sourceTextVerified,true);assert.equal(entry.audio.sourceGenerationLinkage,'verified');assert.equal(entry.audio.independentTranscription,false);assert.equal(entry.audio.individualListening,'not_assessed');assert.deepEqual(entry.audio.technicalReviewFlags,[]);}
  assert(!assets.some(a=>a.clipId===clip.clipId),'duplicate clip across batches');
  const publicSourceRef=`source-${batch.toLowerCase()}-${String(index+1).padStart(3,'0')}-20261110`;
  const publicReviewRef=pilot?'voice-pilot-20261110-p00':review.reference;
  assert(/^[a-zA-Z0-9_-]{1,120}$/.test(publicReviewRef));
  assets.push({clipId:clip.clipId,textSha256:checked.textSha256,bindings:clip.bindings,status:'reviewed',path:'mission-runtime/narration/audio/'+entry.fileName,
   sha256:digest,bytes:bytes.length,durationSeconds:Number(tech.durationSeconds.toFixed(3)),voiceId:record.voiceId,modelLabel:record.modelUiLabel,licenseId:'commercial-voice-20261110',
   review:{mode:pilot?'individual':'approved_voice_pilot + per_file_technical_and_source_checks',reference:publicReviewRef,sourceReference:publicSourceRef,
    sourceTextVerified:true,sourceVerification:'generation_history',independentTranscription:false,listened:pilot,individualAuditoryQuality:pilot?'passed':'not_assessed',
    pilotReference:pilot?null:'voice-pilot-20261110-p00',technical:{hashVerified:true,fullDecodePassed:true,formatPassed:true}}});
  sourcePaths.set(clip.clipId,join(input,'audio',entry.fileName));
  privateMap.push({clipId:clip.clipId,sourceReference:publicSourceRef,publicReviewRef,privateReviewRef:review.reference,generationId:source.generationId,audioSha256:digest});
 }
}
assert(previousRegistry.assets.every(old=>assets.some(asset=>asset.clipId===old.clipId&&asset.sha256===old.sha256)),'refusing to drop or replace already admitted assets');
const registry={schemaVersion:1,editorialRevision:approvedCopy.revision,release:{status:'approved',approvalRef:releaseRef},
 licenses:[{id:'commercial-voice-20261110',provider:'ElevenLabs',commercialUse:true,status:'confirmed',confirmedOn:'2026-11-10',evidenceRef:'commercial-generation-20261110'}],assets};
const manifestPath=join(root,'scripts/mission-runtime-manifest.json'),manifest=json(manifestPath);
manifest.files=manifest.files.filter(entry=>!entry.file.startsWith('mission-runtime/narration/audio/'));
mkdirSync(join(root,'mission-runtime/narration/audio'),{recursive:true});
for(const asset of assets){copyFileSync(sourcePaths.get(asset.clipId),join(root,asset.path));manifest.files.push({file:asset.path,sha256:asset.sha256});}
// Verify real media and exact source bindings before writing the active registry.
const validation=validateCarlaAudio({root,registry,runtimeManifest:manifest.files,inspectMedia:true});
const module='// Verified static files only. Private source/license records are not published.\nconst freeze = value => { if (value && typeof value === "object") { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };\nexport const assetRegistry = freeze('+JSON.stringify(registry,null,2)+');\n';
writeFileSync(join(root,'mission-runtime/narration/asset-registry.mjs'),module);
for(const entry of manifest.files){if(['mission-runtime/narration/asset-registry.mjs','mission-runtime/narration/audio-lifecycle.mjs','mission-runtime/narration/game-audio.mjs'].includes(entry.file))entry.sha256=sha(readFileSync(join(root,entry.file)));}
writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
writeFileSync(join(input,'runtime-admission-'+releaseRef+'.json'),JSON.stringify({batches,releaseRef,clips:privateMap},null,2)+'\n');
console.log(JSON.stringify({...validation,batches,individuallyListened:assets.filter(a=>a.review.listened).length,pilotAndTechnical:assets.filter(a=>!a.review.listened).length,publicationPerformed:false},null,2));
