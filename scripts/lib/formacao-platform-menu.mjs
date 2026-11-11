import {createHash} from 'node:crypto';
// Reverse only the reviewed Formation edits. Every other byte, including the
// platform menu and private App beta entry points, must match production.
export function restoreReviewedFormationTemplate(source, patch) {
  if (patch?.schema !== 1 || !Array.isArray(patch.patches) || !patch.patches.length) throw Error('Invalid reviewed Formation template patch');
  const text = Buffer.isBuffer(source) ? source.toString('utf8') : source;
  if (createHash('sha256').update(text).digest('hex') !== patch.reviewedSha256) throw Error('Unreviewed Formation template bytes');
  const lines = text.match(/[^\n]*\n|[^\n]+$/g) || [];
  let previous = Infinity;
  for (const change of [...patch.patches].reverse()) {
    if (!Number.isSafeInteger(change.start) || change.start < 0 || !Array.isArray(change.approved) || !Array.isArray(change.baseline) || change.start + change.approved.length > previous || lines.slice(change.start, change.start + change.approved.length).join('') !== change.approved.join('')) throw Error('Invalid reviewed Formation template edit');
    lines.splice(change.start, change.approved.length, ...change.baseline);
    previous = change.start;
  }
  return lines.join('');
}
