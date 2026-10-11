import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=readFileSync('app-pages.js','utf8');
const part=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const code=part('const adminInactiveSchoolContractSummary =','const adminInvokeSetTenantContentModule =')+part('const adminSchoolContentRequest =','const categoryModuleChoices =')+part('const renderAdminSchoolContentCatalog =','const collectCategoryConfig =');
const inactive=()=>Object.assign(Error('ACTIVE_SCHOOL_REQUIRED'),{status:400,code:'P0001',databaseMessage:'ACTIVE_SCHOOL_REQUIRED'});
const catalog={status:'PASS',schools:[{id:'a',name:'School A',status:'inactive'},{id:'b',name:'School B',status:'inactive'}],products:[{id:'p',name:'Banco Completo'}],taxonomy:[{grade_id:'g',grade_name:'Infantil 2'}],contracts:[
 {id:'c-a',reference:'Own contract',school_ids:['a'],starts_at:'2026-10-11',ends_at:'2027-10-10',status:'ACTIVE',configurations:[{product_id:'p',institutional:true,rules:[{content_type:'QUESTION',grade_id:'g'}]}]},
 {id:'c-b',reference:'Other school contract',school_ids:['b'],configurations:[]},
 {id:'shared',reference:'Shared contract',school_ids:['a','b'],configurations:[{product_id:'p',rules:[{content_type:'SECRET_OTHER_SCHOOL_RULE',grade_id:'g'}]}]}
]};
async function run({firstError=inactive(),data=catalog,secondError=null,active=false}={}){
 const calls=[];
 const ctx=vm.createContext({AbortController,setTimeout,clearTimeout,adminOperationalState:{contractLoading:{},contractOverviews:{}},ensureAdminSupabaseConfig:async()=>{},normalizeRpcJson:x=>x,categoryEscape:v=>String(v??'').replaceAll('<','&lt;'),categoryTypeLabels:{QUESTION:'Questões'},createSupabaseRestClient:()=>({request:async(path,params,options)=>{
  assert.equal(options.requireAuthenticated,true);assert.deepEqual(Array.from(options.allowedRoles),['admin']);calls.push(path);
  if(path==='rpc/admin_get_school_content_categories'){if(!active)throw firstError;return {status:'PASS',school_id:'a',contracts:[],taxonomy:[],schools:[],subjects:[]};}
  assert.equal(path,'rpc/admin_get_contract_operations');if(secondError)throw secondError;return data;
 }})});
 vm.runInContext(code,ctx);
 const result=await vm.runInContext("adminLoadSchoolContractOverview('a')",ctx);ctx.result=result;
 const html=active?'':vm.runInContext('renderAdminSchoolContentCatalog(result.category_catalog)',ctx);
 return {result,html,calls};
}
let r=await run();assert.equal(r.result.status,'PASS');assert.match(r.html,/Escola inativa: contrato cadastrado/);assert.match(r.html,/Own contract/);assert.match(r.html,/sem categoria TRAINING/);assert(!/Other school contract|SECRET_OTHER_SCHOOL_RULE|<form|<button|<input/.test(r.html));assert.equal(r.calls.length,2);
r=await run({active:true});assert.equal(r.result.status,'PASS');assert.equal(r.calls.length,1);assert.equal(r.result.category_catalog.readonly_inactive,undefined);
for(const error of [Object.assign(Error('Forbidden'),{status:403}),Object.assign(Error('ACTIVE_SCHOOL_REQUIRED'),{status:503,code:'P0001',databaseMessage:'ACTIVE_SCHOOL_REQUIRED'}),Error('Network unavailable'),Error('ACTIVE_SCHOOL_REQUIRED')]){
 r=await run({firstError:error});assert.equal(r.result.status,'ERROR');assert.equal(r.calls.length,1);assert.match(r.html,/role="alert"/);
}
r=await run({secondError:Object.assign(Error('Forbidden'),{status:403})});assert.equal(r.result.status,'ERROR');assert.match(r.html,/Forbidden/);
r=await run({secondError:Error('Infrastructure unavailable')});assert.equal(r.result.status,'ERROR');assert.match(r.html,/Infrastructure unavailable/);
r=await run({data:{...catalog,contracts:[]}});assert.equal(r.result.status,'PASS');assert.match(r.html,/nenhum contrato cadastrado/);
for(const data of [{...catalog,schools:[]},{...catalog,schools:[{id:'a',status:'active'}]},{status:'PASS'}]){r=await run({data});assert.equal(r.result.status,'ERROR');}
console.log('PASS inactive admin readonly overview; active route unchanged; admin-only options/403; exact school scope; shared rules omitted; empty/malformed/stale data; infrastructure errors retained. Synthetic RPC only.');
