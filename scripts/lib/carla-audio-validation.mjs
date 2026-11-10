import {readFileSync, lstatSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {editorialClips, releasedRegistry, safeAssetPath, admittedReview} from '../../mission-runtime/narration/audio-policy.mjs';
import {approvedCopy} from '../../mission-runtime/narration/approved-copy.mjs';
import {assetRegistry} from '../../mission-runtime/narration/asset-registry.mjs';
const sha = data => createHash('sha256').update(data).digest('hex');
const fail = message => { throw Error('Carla audio: ' + message); };
const reference = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value);
function probeMp3(file) {
  const result = spawnSync('ffprobe', ['-v', 'error', '-show_entries',
    'format=format_name,duration:format_tags:stream=codec_type,codec_name,sample_rate,channels,bit_rate:stream_tags', '-of', 'json', file],
  {encoding: 'utf8', timeout: 15000, maxBuffer: 100000});
  if (result.error || result.status !== 0) fail('ffprobe unavailable or invalid MP3: ' + file);
  const decoded = spawnSync('ffmpeg', ['-v', 'error', '-i', file, '-map', '0:a:0', '-f', 'null', '-'],
    {encoding: 'utf8', timeout: 30000, maxBuffer: 100000});
  if (decoded.error || decoded.status !== 0 || decoded.stderr.trim()) fail('full MP3 decode failed: ' + file);
  return JSON.parse(result.stdout);
}

// Build verifies every admitted asset. QA mode also checks ffprobe metadata
// and fully decodes each MP3 with ffmpeg; the exact reviewed bytes remain bound by SHA-256 during builds.
export function validateCarlaAudio({root, registry = assetRegistry, runtimeManifest, inspectMedia = false, probe = probeMp3}) {
  if (registry.schemaVersion !== 1 || registry.editorialRevision !== approvedCopy.revision ||
      !Array.isArray(registry.assets) || !Array.isArray(registry.licenses)) fail('invalid registry header');
  const listed = runtimeManifest.filter(entry => entry.file.startsWith('mission-runtime/narration/audio/'));
  if (registry.release?.status === 'awaiting_assets') {
    if (registry.assets.length || registry.licenses.length || listed.length || registry.release.approvalRef !== null) {
      fail('pending registry must not admit media or a claimed release approval');
    }
    return {state: 'awaiting_assets', assets: 0, bytes: 0, mediaInspection: 'not_applicable'};
  }
  if (!releasedRegistry(registry) || registry.assets.length === 0) fail('release approval is missing');
  const expected = new Map(editorialClips().map(clip => [clip.clipId, clip]));
  const licenseIds = new Set();
  for (const license of registry.licenses) {
    if (!reference(license.id) || licenseIds.has(license.id) || license.status !== 'confirmed' ||
        license.provider !== approvedCopy.voice.provider || license.commercialUse !== true ||
        !/^\d{4}-\d{2}-\d{2}$/.test(license.confirmedOn) || !reference(license.evidenceRef)) fail('unconfirmed or duplicate license');
    licenseIds.add(license.id);
  }
  const ids = new Set(), paths = new Set(); let totalBytes = 0;
  for (const asset of registry.assets) {
    const clip = expected.get(asset.clipId);
    if (!clip || ids.has(asset.clipId)) fail('unknown or duplicate clip: ' + asset.clipId);
    ids.add(asset.clipId);
    if (asset.status !== 'reviewed' || asset.voiceId !== approvedCopy.voice.voiceId || !licenseIds.has(asset.licenseId) ||
        asset.textSha256 !== sha(clip.text) || JSON.stringify(asset.bindings) !== JSON.stringify(clip.bindings) ||
        !admittedReview(asset, registry)) fail('text, content binding or declared review evidence missing: ' + asset.clipId);
    if (!safeAssetPath(asset.path) || paths.has(asset.path)) fail('unsafe or reused path: ' + asset.path);
    paths.add(asset.path);
    if (!/^[a-f0-9]{64}$/.test(asset.sha256) || !Number.isSafeInteger(asset.bytes) || asset.bytes < 128 || asset.bytes > 10_000_000 ||
        !Number.isFinite(asset.durationSeconds) || asset.durationSeconds <= 0 || asset.durationSeconds > 180) fail('invalid media metadata');
    let path = root;
    for (const part of asset.path.split('/')) { path = join(path, part); if (lstatSync(path).isSymbolicLink()) fail('symlink: ' + asset.path); }
    if (!lstatSync(path).isFile()) fail('not a regular media file');
    const bytes = readFileSync(path);
    if (bytes.length !== asset.bytes || sha(bytes) !== asset.sha256) fail('file size or SHA-256 mismatch: ' + asset.path);
    const manifestEntries = runtimeManifest.filter(entry => entry.file === asset.path);
    if (manifestEntries.length !== 1 || manifestEntries[0].sha256 !== asset.sha256) fail('asset missing from static hash allowlist');
    if (inspectMedia) {
      const media = probe(path), streams = media.streams;
      if (media.format?.format_name !== 'mp3' || !Array.isArray(streams) || streams.length !== 1 ||
          streams[0].codec_type !== 'audio' || streams[0].codec_name !== 'mp3' || Number(streams[0].sample_rate) !== 44100 || streams[0].channels !== 1 ||
          Object.keys(media.format.tags || {}).some(key => key !== 'encoder') || Object.keys(streams[0].tags || {}).length > 0 ||
          Number(streams[0].bit_rate) < 127000 || Number(streams[0].bit_rate) > 129000 ||
          !Number.isFinite(Number(media.format.duration)) || Math.abs(Number(media.format.duration) - asset.durationSeconds) > 0.1) {
        fail('MP3 metadata differs from reviewed export: ' + asset.path);
      }
    }
    totalBytes += bytes.length;
  }
  if (listed.length !== paths.size || listed.some(entry => !paths.has(entry.file))) fail('unregistered audio in runtime manifest');
  if (registry.assets.some(asset => asset.bindings.some(binding => binding.startsWith('game:')))) {
    const html = readFileSync(join(root, 'mission-runtime/studio/index.html'), 'utf8');
    const tag = html.match(/<meta\s+http-equiv=["']Content-Security-Policy["'][\s\S]*?>/i)?.[0];
    const policy = tag?.match(/content=["']([^"]*)["']/i)?.[1] || '';
    const media = policy.split(';').map(part => part.trim()).find(part => part.startsWith('media-src '));
    if (media !== "media-src 'self' blob:") fail("game activation requires reviewed Studio media-src 'self' blob:");
  }
  return {state: 'approved', assets: ids.size, bytes: totalBytes, mediaInspection: inspectMedia ? 'passed' : 'hash_only'};
}
