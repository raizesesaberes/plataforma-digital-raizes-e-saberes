const roles = new Set(['admin', 'admin_ti', 'administrador', 'administrador_nacional']);
export function isLibraryAdministrator(user, profile) {
  return !!user && profile?.status === 'active' &&
    roles.has(String(profile.platform_role).toLowerCase()) &&
    roles.has(String(user.app_metadata?.platform_role).toLowerCase());
}

export async function deliverAdminEdition(payload, {authorized, catalog, getRecord, sign}) {
  if (authorized !== true) return {status:403, code:'admin_required'};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      Object.keys(payload).some(k => !['bookId','assetKind','pageNumber'].includes(k)))
    return {status:400, code:'invalid_request'};
  const {bookId, assetKind='manifest', pageNumber} = payload;
  if (typeof bookId !== 'string' || !Object.hasOwn(catalog, bookId))
    return {status:404, code:'edition_unavailable'};
  if (!['manifest','page','thumb'].includes(assetKind)) return {status:400, code:'invalid_asset_kind'};
  const expected = catalog[bookId];
  const row = await getRecord(expected.content_item_id);
  const edition = row?.metadata?.official_edition;
  if (row?.content_type !== 'BOOK' || row?.metadata?.delivery_adapter?.kind !== 'library_book' ||
      row.metadata.delivery_adapter.resource_id !== bookId || edition?.ingestion_status !== 'verified' ||
      edition.page_count !== expected.page_count || edition.source_sha256 !== expected.source_sha256 ||
      edition.source_id !== expected.source_id || edition.audience !== expected.audience)
    return {status:403, code:'edition_not_verified'};
  if (assetKind === 'manifest') return {status:200, manifest:{title:row.title,
    pageCount:expected.page_count, firstPage:1, lastPage:expected.page_count, hasPages:true, hasThumbs:true}};
  if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > expected.page_count)
    return {status:400, code:'page_out_of_range'};
  const path = `library/${bookId}/${assetKind === 'thumb' ? 'thumbs' : 'pages'}/page-${String(pageNumber).padStart(3,'0')}.jpg`;
  const signedUrl = await sign('pages', path, 60);
  return {status:200, asset:{kind:assetKind, pageNumber, signedUrl, expiresIn:60}};
}
