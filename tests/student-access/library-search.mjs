import assert from 'node:assert/strict';
import {createSearchHandler} from '../../supabase/functions/_shared/library-search-handler.mjs';
import {libraryEditionClient} from '../../library-edition-client.mjs';
const id='00000000-0000-4000-8000-000000000001';let reads=0,allowed=true,valid=true;
const handler=createSearchHandler({session:async()=>valid?{authorize:async()=>allowed,manifest:async()=>({pageCount:1})}:null,load:async(bucket,path)=>{reads++;assert.equal(bucket,'pages');assert.equal(path,`library/${id}/search/text-v1.json`);return {version:'text-v1',bookId:id,pages:[[{text:'Educação',box:[0,0,.1,.1]}]]};}});
async function request(body,auth='Bearer local-test'){return handler(new Request('http://localhost/search',{method:'POST',headers:{authorization:auth},body:JSON.stringify(body)}));}
assert.equal((await request({bookId:id,query:'educacao'},'')).status,401);
valid=false;assert.equal((await request({bookId:id,query:'educacao'})).status,401);valid=true;
allowed=false;assert.equal((await request({bookId:id,query:'educacao',role:'admin'})).status,403);assert.equal(reads,0);allowed=true;
assert.equal((await request({bookId:'../other',query:'a'})).status,400);
assert.equal((await request({bookId:id,query:'a'.repeat(3000)})).status,413);
const client=libraryEditionClient({functions:{invoke:async(name,{body})=>{assert.equal(name,'library-edition-search');const response=await request(body);assert.equal(response.headers.get('Cache-Control'),'no-store');return {data:await response.json()};}}});
const result=await client.search(id,'educacao');assert.equal(result.total,1);assert.equal(result.results[0].page,1);assert(!JSON.stringify(result).includes('text-v1.json'));assert(!('pages' in result));
console.log('PASS HTTP handler + actual client: missing/invalid session, denied edition before storage, invalid ID, payload size, authorized results, no-store and no index/URL exposure. Supabase dependencies mocked.');
// Defense-in-depth matrix: caller role/path claims never change a denied decision.
for(const audience of ['student','teacher'])for(const actor of ['student','teacher']){
 let loads=0;const permitted=actor==='teacher'||audience==='student';
 const h=createSearchHandler({session:async()=>({authorize:async()=>permitted,manifest:async()=>({pageCount:1})}),load:async()=>{loads++;return {version:'text-v1',bookId:id,pages:[Array.from({length:120},(_,i)=>({text:'alvo',box:[0,i/120,.01,.005]}))]};}});
 const response=await h(new Request('http://localhost',{method:'POST',headers:{authorization:'Bearer local-test'},body:JSON.stringify({bookId:id,query:'alvo',offset:50,role:'teacher',path:'manual-alheio'})}));
 assert.equal(response.status,permitted?200:403);assert.equal(loads,permitted?1:0);if(permitted){const data=await response.json();assert.equal(data.total,120);assert.equal(data.results.length,50);}
}
console.log('PASS student/manual matrix and 50-result paging with 120 matches; synthetic authorization.');
