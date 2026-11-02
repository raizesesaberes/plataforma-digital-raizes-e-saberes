// Server-side prerequisite gate. Membership/category authorization must already
// have been resolved by the database; browser-provided roles are never accepted.
export function editionReadDecision({ authenticated, activeProfile, published,
  audience, actor, schoolAllowed, classAllowed, gradeAllowed, categoryAllowed }) {
  if (authenticated !== true || activeProfile !== true) return false;
  if (published !== true) return false;
  if (actor !== 'student' && actor !== 'teacher') return false;
  if (audience !== 'student' && audience !== 'teacher') return false;
  if (actor === 'student' && audience === 'teacher') return false;
  return schoolAllowed === true && classAllowed === true &&
    gradeAllowed === true && categoryAllowed === true;
}

export async function deliverEdition(payload, dependencies) {
  const { bookId, assetKind = 'manifest', pageNumber } = payload || {};
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId || ''))
    return { status: 400, code: 'invalid_book_id' };
  if (!['manifest', 'page', 'thumb'].includes(assetKind))
    return { status: 400, code: 'invalid_asset_kind' };
  const authorization = await dependencies.authorize(bookId);
  if (authorization !== true && (!authorization || !editionReadDecision(authorization)))
    return { status: 403, code: 'edition_access_denied' };
  const manifest = await dependencies.getManifest(bookId);
  if (!manifest || !Number.isSafeInteger(manifest.pageCount) || manifest.pageCount < 1)
    return { status: 404, code: 'manifest_missing' };
  if (assetKind === 'manifest') return { status: 200, manifest: {
    pageCount: manifest.pageCount, firstPage: 1, lastPage: manifest.pageCount,
    hasPages: true, hasThumbs: true,
  } };
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > manifest.pageCount)
    return { status: 400, code: 'page_out_of_range' };
  // Construct exact object paths; never sign a client-supplied path or bucket.
  const path = `library/${bookId}/${assetKind === 'thumb' ? 'thumbs' : 'pages'}/page-${String(pageNumber).padStart(3, '0')}.jpg`;
  const signedUrl = await dependencies.sign('pages', path, 300);
  return { status: 200, asset: { kind: assetKind, pageNumber, signedUrl, expiresIn: 300 } };
}
