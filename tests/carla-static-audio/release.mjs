import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assetRegistry} from '../../mission-runtime/narration/asset-registry.mjs';
import {editorialClips,coloringCue,gameCue,gameCues,resolveAsset} from '../../mission-runtime/narration/audio-policy.mjs';
import {coloringAudioNotices} from '../../mission-runtime/narration/coloring-audio.mjs';
import {approvedCopy, contentDigest} from '../../mission-runtime/narration/resolve.mjs';
import {StaticNarrator} from '../../mission-runtime/narration/static-player.mjs';
import {validateCarlaAudio} from '../../scripts/lib/carla-audio-validation.mjs';
const root=new URL('../../',import.meta.url),read=path=>readFileSync(new URL(path,root));
const manifest=JSON.parse(read('scripts/mission-runtime-manifest.json'));
const colors=JSON.parse(read('mission-runtime/coloring/catalog.json'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
test('local partial admission has exactly 42 real files and six individual reviews',()=>{
 assert.equal(assetRegistry.assets.length,42);assert.equal(assetRegistry.assets.filter(a=>a.review.listened).length,6);
 assert.equal(assetRegistry.assets.filter(a=>!a.review.listened).length,36);assert(Object.isFrozen(assetRegistry));
 assert.equal(assetRegistry.release.approvalRef,'carla-local-p00-p06-20261110');
 for(const a of assetRegistry.assets){assert(Object.isFrozen(a.review));assert.equal(a.review.independentTranscription,false);assert.equal(a.review.sourceVerification,'generation_history');if(a.review.listened)assert.equal(a.review.reference,'voice-pilot-20261110-p00');else{assert.equal(a.review.pilotReference,'voice-pilot-20261110-p00');assert.equal(a.review.individualAuditoryQuality,'not_assessed');}}
});
test('all local files match exact published byte counts, hashes and allowlist',()=>{
 const result=validateCarlaAudio({root:root.pathname, runtimeManifest:manifest.files});
 assert.equal(result.assets,42);assert.equal(result.bytes,4941913);
 assert.equal(manifest.files.filter(e=>e.file.startsWith('mission-runtime/narration/audio/')).length,42);
 for(const a of assetRegistry.assets){assert.equal(read(a.path).length,a.bytes);assert.equal(sha(read(a.path)),a.sha256);}
});
test('registry contains only explicitly allowed public metadata',()=>{
 const keys=(value,expected)=>assert.deepEqual(Object.keys(value).sort(),expected.sort());
 keys(assetRegistry,['schemaVersion','editorialRevision','release','licenses','assets']);
 for(const a of assetRegistry.assets){keys(a,['clipId','textSha256','bindings','status','path','sha256','bytes','durationSeconds','voiceId','modelLabel','licenseId','review']);keys(a.review,['mode','reference','sourceReference','sourceTextVerified','sourceVerification','independentTranscription','listened','individualAuditoryQuality','pilotReference','technical']);}
 const serialized=JSON.stringify(assetRegistry);assert(!/libfile_|sourceLibraryId|generationId|credits|billing|daniel|@|https?:/i.test(serialized));
 for(const e of manifest.files)assert(!/revisao-coerencia|registro-p|conferencia-p|validacao-tecnica|source-technical.*\.json|\/tests\/|\/qa\//.test(e.file));
});
test('frozen institutional snapshots remain pending and separate from real audio admission',()=>{
 for(const c of colors){assert.equal(c.narration.status,'awaiting_licensed_audio');assert.equal(c.narration.licenseStatus,'pending');assert.equal(c.narration.audio,null);}
 assert.equal(coloringAudioNotices().partial,true);
});
function colorContext(asset){
 const parts=asset.clipId.split('.'),common=parts[0]==='common',stage=parts.at(-1);
 const activity=common?colors[0]:colors.find(c=>c.id===parts[1]);
 const age=['discovery_4_5','sound_4_5','letter_4_5','skip_sounds','paint_brush'].includes(stage)?'4-5':'2-3';
 const presentation=stage==='count_three'?{view:'counting',count:3}:stage==='life_show'?{view:'life',hasPaint:true}:stage==='life_no_paint'?{view:'life',hasPaint:false}:stage==='finished'?{completed:true}:{};
 return {activity,age,stage,presentation};
}
class MediaDouble {paused=true;setAttribute(){}removeAttribute(){}load(){}pause(){this.paused=true;}async play(){this.paused=false;}}
for(const asset of assetRegistry.assets.filter(a=>a.bindings[0].startsWith('coloring:')))test('real bytes pass the runtime hash before simulated media: '+asset.clipId,async()=>{
 const {activity,age,stage,presentation}=colorContext(asset),cue=await coloringCue(activity,age,stage,presentation);
 assert(cue);assert.equal(resolveAsset(cue),asset);
 const document=new EventTarget();document.hidden=false;const window=new EventTarget();window.location={origin:'https://local.test'};
 const audio=new MediaDouble();let constructed=false,revoked=false;
 const player=new StaticNarrator({document,window,musicPlaying:()=>false,fetch:async url=>{assert.equal(new URL(url).pathname,'/'+asset.path);return new Response(read(asset.path));},makeAudio:()=>{constructed=true;return audio;},urls:{createObjectURL:()=> 'blob:qa-only',revokeObjectURL:()=>{revoked=true;}}});
 try{player.setContext(cue.clipId,()=>true);assert.equal(await player.play(cue,{type:'click',isTrusted:true}),true);assert(constructed&&!audio.paused);player.stop();assert(audio.paused&&revoked);}finally{player.dispose();}
});
test('the next not-yet-admitted theme does not gain its welcome voice',async()=>{
 const nextTheme=colors.find(c=>c.id==='cenoura');const cue=await coloringCue(nextTheme,'2-3','welcome');assert(cue);assert.equal(resolveAsset(cue),null);
 assert.equal(editorialClips().length-assetRegistry.assets.length,75);
});


// Exact static content expanded to the same image data URLs as the runtime.
// Matching canonical hashes establishes input identity; no engine/DOM claim.
const catalog=JSON.parse(read('mission-runtime/catalog.json'));
function expandAssets(value){
 if(Array.isArray(value))return value.map(expandAssets);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>{
  if(key==='src'&&typeof item==='string'&&item.startsWith('rsplay-asset:')){
   const hash=item.slice(13),entry=manifest.files.find(e=>e.sha256===hash&&e.file.startsWith('mission-runtime/studio/runtime/assets/'));
   assert(entry,'image asset missing');const bytes=read(entry.file);assert.equal(sha(bytes),hash);
   const mime=entry.file.endsWith('.png')?'image/png':entry.file.endsWith('.jpg')||entry.file.endsWith('.jpeg')?'image/jpeg':null;assert(mime);
   return [key,'data:'+mime+';base64,'+bytes.toString('base64')];
  }
  return [key,expandAssets(item)];
 }));return value;
}
for(const [id,example] of Object.entries(approvedCopy.examples))test('exact game input and release gate without a browser: '+example.template,async()=>{
 const entry=catalog.find(c=>c.id===id),content=expandAssets(JSON.parse(read('mission-runtime/studio/'+entry.runtimeFile)));
 assert.equal(await contentDigest(content),example.canonicalSha256);
 const session={content,questionIndex:0,feedback:null,matched:[],flipped:[],correct:0,complete:false};
 assert.equal(await gameCue(session,example.after.id),null);
 const before=await gameCue(session,example.before.id);assert(before);
 assert.equal(Boolean(resolveAsset(before)),assetRegistry.assets.some(a=>a.clipId===example.before.id));
 assert.equal(await gameCue({...session,content:{...content,title:content.title+' changed'}},example.before.id),null);
 const explored={...session,matched:[example.itemId],feedback:['quiz','trail'].includes(example.template)?'correct':null,complete:['sequence','puzzle'].includes(example.template)};
 const after=await gameCue(explored,example.after.id);assert(after);
 assert.equal(Boolean(resolveAsset(after)),assetRegistry.assets.some(a=>a.clipId===example.after.id));
});

function quizSession() {
 const [id,example]=Object.entries(approvedCopy.examples).find(([,e])=>e.template==='quiz');
 const entry=catalog.find(c=>c.id===id),content=expandAssets(JSON.parse(read('mission-runtime/studio/'+entry.runtimeFile)));
 return {example,session:{content,questionIndex:0,feedback:null,matched:[],flipped:[],correct:0,complete:false}};
}
test('presentation batches hash large content once; explicit listen always rehashes',async()=>{
 const {example,session}=quizSession(),original=crypto.subtle.digest;let largeDigests=0;
 crypto.subtle.digest=function(algorithm,bytes){if(bytes.byteLength>100000)largeDigests++;return original.call(this,algorithm,bytes);};
 try {
  const cues=await gameCues(session,[example.before.id,approvedCopy.motors.quiz.entry.id,approvedCopy.motors.quiz.help.id,example.after.id]);
  assert.equal(cues.length,4);assert(cues.slice(0,3).every(Boolean));assert.equal(cues[3],null);assert.equal(largeDigests,1);
  assert(await gameCue(session,example.before.id));assert.equal(largeDigests,2);
 } finally {crypto.subtle.digest=original;}
});
for(const phase of ['content','text'])test('batch rejects state mutation during asynchronous '+phase+' digest',async()=>{
 const {example,session}=quizSession(),original=crypto.subtle.digest;let release,intercepted=false;
 crypto.subtle.digest=function(algorithm,bytes){
  const pending=original.call(this,algorithm,bytes);
  if(!intercepted&&(phase==='content'?bytes.byteLength>100000:bytes.byteLength<100000)){
   intercepted=true;return new Promise(resolve=>{release=()=>pending.then(resolve);});
  }
  return pending;
 };
 try {
  const pending=gameCues(session,[example.before.id,approvedCopy.motors.quiz.entry.id]);
  while(!release)await new Promise(resolve=>setTimeout(resolve,1));
  session.feedback='correct';release();assert.deepEqual(await pending,[]);assert(intercepted);
 }finally{crypto.subtle.digest=original;release?.();}
});
