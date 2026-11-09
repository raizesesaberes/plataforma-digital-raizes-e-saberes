import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {libraryEditionClient} from '../../library-edition-client.mjs';
const book={book_id:'synthetic-book',title:'Livro de teste',page_count:3,audience:'student'};
test('edition list uses real RPC, rejects malformed success instead of empty fallback',async()=>{
 for(const data of [null,undefined,{},[null],[{...book,page_count:'3'}],[{...book,audience:'admin'}]]){
  const client=libraryEditionClient({rpc:async name=>{assert.equal(name,'library_list_editions');return {data};}});
  await assert.rejects(client.list(),/invalid_edition_list/);
 }
 for(const data of [[],[book]])assert.deepEqual(await libraryEditionClient({rpc:async()=>({data})}).list(),data);
 await assert.rejects(libraryEditionClient({rpc:async()=>({error:Error('denied')})}).list(),/denied/);
});
test('edition reader and search retain protected endpoint contracts',async()=>{
 const calls=[];const client=libraryEditionClient({functions:{invoke:async(name,{body})=>{calls.push({name,body});return {data:{ok:true}};}}});
 await client.read(book.book_id,'page',2);await client.search(book.book_id,'palavra',50);
 assert.deepEqual(calls,[{name:'library-edition-read-access',body:{bookId:book.book_id,assetKind:'page',pageNumber:2}},{name:'library-edition-search',body:{bookId:book.book_id,query:'palavra',offset:50}}]);
 for(const data of [null,{}, {ok:false}]){const denied=libraryEditionClient({functions:{invoke:async()=>({data})}});await assert.rejects(denied.read('b'));await assert.rejects(denied.search('b','q'));}
});
test('hosted bridge injects guarded transport and exposes explicit platform fallback',async()=>{
 const source=await readFile(new URL('../../mobile/src/screens/HostedEditionLibrary.tsx',import.meta.url),'utf8');
 assert.ok(source.includes('runtime.libraryEditionClient('));assert.ok(source.includes("name!=='library_list_editions'"));
 assert.ok(source.includes('subscribePlatformSession'));assert.ok(source.includes('await awaitPlatformSessionReady(session)'));
 assert.ok(source.includes('abort?.abort()'));assert.ok(source.includes('signal.aborted'));
 assert.ok(source.includes('Outros materiais'));assert.ok(source.includes('/biblioteca.html?from=aluno'));
 assert.doesNotMatch(source,/localStorage|student_get_library_books|accessToken|fetch\(/);
});
test('runtime import remains same-origin and survives rebuild',async()=>{
 const build=await readFile(new URL('../../scripts/build-app-web.mjs',import.meta.url),'utf8');
 assert.ok(build.includes("RaizesEditionLibraryReady=import('/library-edition-boot.mjs')"));
});
