// The training release adds only these explicitly reviewed browser resources.
// Backend, credentials, internal metadata and paid media must never reach dist.
export const FORMACAO_OVERRIDES = Object.freeze(['script.js', 'universidade.html']);
export function validateFormacaoManifest(manifest, baseline, featureOverrides, appOverrides) {
  if (manifest?.schema !== 1 || !Array.isArray(manifest.files) || !Array.isArray(manifest.overrides)) throw Error('Invalid training manifest');
  const seen = new Set();
  for (const item of manifest.files) {
    const path = item?.file;
    if (typeof path !== 'string' || !(['formacao.html','personal-learning.html'].includes(path) || /^(formacao-runtime|personal-learning-runtime)\/[a-z0-9-]+\.(mjs|css|svg)$/.test(path)) || seen.has(path)) throw Error('Unapproved training runtime file');
    seen.add(path);
  }
  if (!seen.has('formacao.html') || !seen.has('personal-learning.html')) throw Error('Missing training entrypoint');
  if (manifest.overrides.length !== FORMACAO_OVERRIDES.length) throw Error('Unexpected training overrides');
  for (const item of manifest.overrides) {
    if (!FORMACAO_OVERRIDES.includes(item?.file) || featureOverrides.some(e => e.file === item.file) || appOverrides.some(e => e.file === item.file) || baseline.filter(e => e.file === item.file).length !== 1 || baseline.find(e => e.file === item.file)?.sha256 !== item.original_sha256) throw Error('Unapproved training override or changed baseline');
  }
  return manifest;
}
