import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('app-pages.js','utf8');
const body=source.slice(source.indexOf('  const populateFilterOptions = () => {'),source.indexOf('  const itemById =',source.indexOf('  const populateFilterOptions = () => {')));
function run(items){
 const filters=['examYear','language','component','theme'].map(key=>({dataset:{qbFilter:key},value:'',options:[{value:'',textContent:'Todos'}],querySelectorAll(){return this.options.slice(1).map(o=>({remove:()=>this.options.splice(this.options.indexOf(o),1)}));},append(o){this.options.push(o);}}));
 const help={textContent:''};const context={filters,bankItems:()=>items,syncExamFilterVisibility:()=>{},document:{createElement:()=>({})},root:{querySelector:s=>s.includes('examYear')?filters[0]:help}};
 vm.runInNewContext(body+'populateFilterOptions();',context);
 return Object.fromEntries(filters.map(f=>[f.dataset.qbFilter,f.options.map(o=>o.value)]));
}
assert.deepEqual(run([{}]),{examYear:[''],language:[''],component:[''],theme:['']});
assert.deepEqual(run([{examYear:'2020',language:'Inglês',component:'Matemática',theme:'Tema explícito'},{examYear:'2020',language:'',component:'Matemática'}]),{examYear:['','2020'],language:['','Inglês'],component:['','Matemática'],theme:['','Tema explícito']});
console.log('PASS metadata-driven options: absent language/year/theme stay empty; explicit values deduplicate; no fixed language inventory.');
