// Verify the exact reviewed artifact before searching; never trust a path alone.
export async function decodePrivateIndex(bytes,expected){
 if(!expected||bytes.byteLength!==expected.bytes||bytes.byteLength>16*1024*1024)throw Error('index_unavailable');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
 if(digest!==expected.sha256)throw Error('index_unavailable');
 const index=JSON.parse(new TextDecoder().decode(bytes));
 if(index.bookId!==expected.bookId||index.sourceSha256!==expected.sourceSha256||index.version!=='text-v1'||index.pages.length!==expected.pageCount)throw Error('index_unavailable');
 return index;
}
