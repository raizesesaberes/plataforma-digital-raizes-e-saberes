// Explicit build-time tool. Reads the local, validated runtime; no production services.
import {readFile,writeFile} from 'node:fs/promises';
import {launchHarness,root} from './harness.mjs';
const input=process.argv[2];if(!input)throw Error('Provide approved motor scripts JSON path.');
const scripts=JSON.parse(await readFile(input));
const catalog=JSON.parse(await readFile(root+'/mission-runtime/catalog.json'));
const h=await launchHarness();const bindings={};
try{
 const p=await h.page();await h.install(p,'/mission-runtime/studio/?institutional=1&snapshot=1');await h.wait(p,'rs-teacher-ready');
 const f=p.frames()[1];
 for(const motor of scripts.motores){
  const ref=catalog.find(r=>r.id===motor.atividade.id);if(!ref)throw Error('Missing '+motor.atividade.id);
  bindings[ref.id]=await f.evaluate(async ref=>{
   const mod=await import('/mission-runtime/studio/assets/index-Di3aszpa.js');const content=await mod.a(ref);
   const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
   const bytes=new TextEncoder().encode(JSON.stringify(canonical(content)));
   return {canonicalSha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join(''),runtimeSha256:ref.runtimeSha256,template:content.template};
  },ref);
  console.log('BOUND',ref.id);
 }
 await writeFile(root+'/qa/carla-guidance/bindings.json',JSON.stringify(bindings,null,2)+'\n');
}finally{await h.close();}
