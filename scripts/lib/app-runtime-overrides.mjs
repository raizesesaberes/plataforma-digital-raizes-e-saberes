export const APP_RUNTIME_OVERRIDES = Object.freeze([
  'library-edition-boot.mjs',
  'library-edition-client.mjs',
  'library-edition-reader.mjs',
]);

// An App build may adapt only this reviewed library surface. Existing mission and
// platform overrides remain independently constrained by the static builder.
export function validateAppOverrides(overrides, baseline, featureOverrides) {
  if (!Array.isArray(overrides) || overrides.length !== APP_RUNTIME_OVERRIDES.length ||
      new Set(overrides.map(entry => entry?.file)).size !== APP_RUNTIME_OVERRIDES.length) {
    throw Error('Expected the three explicit App library overrides');
  }
  for (const entry of overrides) {
    if (!APP_RUNTIME_OVERRIDES.includes(entry?.file) ||
        featureOverrides.some(other => other.file === entry.file) ||
        !/^[a-f0-9]{64}$/.test(entry.sha256) ||
        !/^[a-f0-9]{64}$/.test(entry.original_sha256) ||
        baseline.filter(original => original.file === entry.file).length !== 1 ||
        baseline.find(original => original.file === entry.file)?.sha256 !== entry.original_sha256) {
      throw Error('Unapproved App runtime override or changed baseline');
    }
  }
  return overrides;
}
