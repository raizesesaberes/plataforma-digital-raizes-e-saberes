import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deliverAdminEdition,isLibraryAdministrator} from '../../supabase/functions/_shared/admin-library-policy.mjs';
const catalog=JSON.parse(readFileSync(new URL('../../supabase/functions/admin-library-read-access/catalog.json',import.meta.url)));
assert.equal(Object.keys(catalog).length,70);
const bookId=Object.keys(catalog)[0],expected=catalog[bookId];
const row={content_type:'BOOK',title:'Livro',metadata:{delivery_adapter:{kind:'library_book',resource_id:bookId},official_edition:{...expected,ingestion_status:'verified'}}};
let checks=0;
for(const role of ['student','teacher','professor','aluno','school_admin','',null]){
 assert.equal(isLibraryAdministrator({app_metadata:{platform_role:role}},{platform_role:role,status:'active'}),false);checks++;
}
assert.equal(isLibraryAdministrator({user_metadata:{platform_role:'admin'}},{platform_role:'admin',status:'active'}),false);checks++;
assert.equal(isLibraryAdministrator({app_metadata:{platform_role:'admin'}},{platform_role:'admin',status:'inactive'}),false);checks++;
for(const role of ['admin','admin_ti','administrador','administrador_nacional']){assert.equal(isLibraryAdministrator({app_metadata:{platform_role:role}},{platform_role:role,status:'active'}),true);checks++;}
async function call(payload,overrides={}){
 let signed=[];
 const result=await deliverAdminEdition(payload,{authorized:true,catalog,getRecord:async id=>{assert.equal(id,expected.content_item_id);return structuredClone(row);},sign:async(...args)=>{signed.push(args);return 'https://example.test/short-lived';},...overrides});
 return {result,signed};
}
for(const authorized of [false,undefined]){const {result,signed}=await call({bookId,assetKind:'page',pageNumber:1},{authorized});assert.equal(result.status,403);assert.equal(signed.length,0);checks++;}
for(const payload of [null,[],{bookId:'__proto__'},{bookId:'unknown'},{bookId,path:'arbitrary'},{bookId,bucket:'public'},{bookId,role:'admin'},{bookId,assetKind:'pdf'},{bookId,assetKind:'page',pageNumber:0},{bookId,assetKind:'page',pageNumber:-1},{bookId,assetKind:'page',pageNumber:1.5},{bookId,assetKind:'page',pageNumber:'1'},{bookId,assetKind:'page',pageNumber:expected.page_count+1}]){const {result,signed}=await call(payload);assert.ok(result.status>=400);assert.equal(signed.length,0);checks++;}
for(const key of ['ingestion_status','source_sha256','source_id','page_count','audience']){const changed=structuredClone(row);changed.metadata.official_edition[key]='incorrect';const {result,signed}=await call({bookId,assetKind:'page',pageNumber:1},{getRecord:async()=>changed});assert.equal(result.status,403);assert.equal(signed.length,0);checks++;}
let {result,signed}=await call({bookId});assert.equal(result.manifest.pageCount,expected.page_count);assert.equal(signed.length,0);checks++;
for(const kind of ['page','thumb'])for(const page of [1,expected.page_count]){const {result,signed}=await call({bookId,assetKind:kind,pageNumber:page});assert.equal(result.status,200);assert.deepEqual(signed,[['pages',`library/${bookId}/${kind==='thumb'?'thumbs':'pages'}/page-${String(page).padStart(3,'0')}.jpg`,60]]);checks++;}
console.log(`${checks} administrative policy checks passed; no student/teacher grants or arbitrary paths.`);
