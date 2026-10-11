import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
// Exercise the shipped REST request function, including its error metadata boundary.
const source=readFileSync('app-pages.js','utf8');
const start=source.indexOf('  const request = async',source.indexOf('const createSupabaseRestClient ='));
const requestSource=source.slice(start,source.indexOf('\n  };',start)+5);
const makeRequest=new Function('fetch','resolveSupabaseUserContext','mapSupabaseError',`const isConfigured=true,baseUrl='https://synthetic.invalid',config={anonKey:'synthetic'};${requestSource};return request;`);
for(const body of [JSON.stringify({code:'P0001',message:'ACTIVE_PRODUCT_REQUIRED'}),'<html>Unavailable</html>']){
 const request=makeRequest(async()=>({ok:false,status:400,text:async()=>body}),async()=>({token:'synthetic'}),()=> 'Display message');
 await assert.rejects(request('rpc/admin_confirm_contract_operation'),e=>{
  assert.equal(e.status,400);assert.equal(e.message,'Display message');
  assert.equal(e.code,body.startsWith('{')?'P0001':undefined);
  assert.equal(e.databaseMessage,body.startsWith('{')?'ACTIVE_PRODUCT_REQUIRED':undefined);return true;
 });
}
console.log('PASS shipped REST request preserves typed database errors; non-JSON responses remain untyped. No network calls.');
