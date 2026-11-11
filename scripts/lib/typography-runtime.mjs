// Only reviewed UI typography overrides. The recovery baseline stays immutable.
export const TYPOGRAPHY_OVERRIDES = Object.freeze(['styles.css', 'master-pack.css', 'index.html']);
export function validateTypographyManifest(manifest, baseline, otherOverrides = []) {
  if (manifest?.schema !== 1 || !Array.isArray(manifest.overrides) || manifest.overrides.length !== TYPOGRAPHY_OVERRIDES.length) throw Error('Invalid typography manifest');
  const seen = new Set();
  for (const entry of manifest.overrides) {
    if (!TYPOGRAPHY_OVERRIDES.includes(entry?.file) || seen.has(entry.file) || otherOverrides.some(item => item.file === entry.file) || baseline.filter(item => item.file === entry.file).length !== 1 || baseline.find(item => item.file === entry.file)?.sha256 !== entry.original_sha256 || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw Error('Unapproved typography override or changed baseline');
    seen.add(entry.file);
  }
  return manifest;
}
