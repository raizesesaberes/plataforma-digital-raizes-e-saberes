// Reuses the caller's authenticated Supabase client. No role or school claims
// are accepted by this adapter; the server resolves all authorization.
export function libraryEditionClient(supabase) {
 return {
  async list(){const r=await supabase.rpc('library_list_editions');if(r.error)throw r.error;if(!Array.isArray(r.data)||r.data.some(book=>!book||typeof book.book_id!=='string'||typeof book.title!=='string'||!Number.isSafeInteger(book.page_count)||book.page_count<1||!['student','teacher'].includes(book.audience)))throw Error('invalid_edition_list');return r.data;},
  async search(bookId,query,offset=0){
   const r=await supabase.functions.invoke('library-edition-search',{body:{bookId,query,offset}});
   if(r.error||!r.data?.ok)throw Error('search_unavailable');return r.data;
  },
  async read(bookId,assetKind='manifest',pageNumber){
   const r=await supabase.functions.invoke('library-edition-read-access',{body:{bookId,assetKind,pageNumber}});
   if(r.error||!r.data?.ok)throw r.error||Error(r.data?.code||'edition_access_denied');return r.data;
  }
 };
}
