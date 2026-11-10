import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from '../../mobile/node_modules/typescript/lib/typescript.js';

const source=file=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');
function load(file,mocks={}){
 const exports={};
 const js=ts.transpile(source(file),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React});
 vm.runInNewContext(js,{exports,require:name=>{
  if(name in mocks)return mocks[name];
  if(name.endsWith('.png'))return name;
  throw Error('Unexpected import '+name);
 }});
 return exports;
}
const {appProfiles}=load('mobile/src/data/fixtures.ts');
const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useEffect:()=>{},useState:initial=>[initial,()=>{}]};
const {ExperienceHome}=load('mobile/src/screens/ExperienceHome.tsx',{
 react:{...React,default:React},
 'react-native':{View:'View',Text:'Text',Image:'Image',Pressable:'Pressable',StyleSheet:{create:value=>value},useWindowDimensions:()=>({width:320,height:844})},
 '../components/AppIcon':{AppIcon:'AppIcon'},
 '../services/readBetaPolicy':{READ_BETA:true,isReadBetaRoute:()=>false},
 '../services/library':{}
});
function texts(node){
 if(typeof node==='string')return [node];
 if(Array.isArray(node))return node.flatMap(texts);
 return node?.children?.flatMap(texts)||[];
}
const title='Da Educação Infantil ao Ensino Médio';
test('generic student title is centralized and renders above the home greeting',()=>{
 assert.equal(appProfiles.fundamental.title,title);
 for(const preview of [true,false]){
  const rendered=ExperienceHome({profile:appProfiles.fundamental,session:null,preview,hosted:true,onOpen:()=>{},onLogout:()=>{}});
  const content=texts(rendered),label=content.indexOf(title),greeting=content.findIndex(text=>text.startsWith(preview?'Olá,':'Preparando seu espaço'));
  assert.ok(label>=0&&label<greeting,'Inclusive title renders above the greeting');
  assert.ok(!content.includes('FUNDAMENTAL E MÉDIO'));
 }
 assert.match(source('mobile/src/AppShell.tsx'),/subtitle=\{profile\.title\}/);
});
test('infantil and teacher home labels and profile identities stay specific',()=>{
 for(const [role,label,profileTitle]of [['crescer','EDUCAÇÃO INFANTIL','Raízes Crescer'],['professor','AMBIENTE DA PROFESSORA','Professora']]){
  const content=texts(ExperienceHome({profile:appProfiles[role],session:null,preview:true,hosted:true,onOpen:()=>{},onLogout:()=>{}}));
  assert.equal(appProfiles[role].role,role);assert.equal(appProfiles[role].title,profileTitle);
  assert.ok(content.includes(label));assert.ok(!content.includes(title));
 }
 assert.equal(appProfiles.fundamental.role,'fundamental');
});
