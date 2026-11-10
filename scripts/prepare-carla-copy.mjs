// Compile approved editorial text only. Does not generate speech or change activity snapshots.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),source=process.argv[2];
if(!source)throw Error('Provide the local approved scripts directory.');
const c=JSON.parse(await readFile(resolve(source,'colorir/roteiros-colorir.json'))),m=JSON.parse(await readFile(resolve(source,'motores/roteiros-carla-motores.json'))),bindings=JSON.parse(await readFile(root+'/qa/carla-guidance/bindings.json'));
const coloring=Object.fromEntries(c.activities.map(a=>[a.activityId,{catalogId:a.source.catalogId,revision:a.source.revision,contentHash:a.source.contentHash,teacherNote:a.teacherNote,factSource:{...a.source.factSource,url:a.source.factSource.url.replace('/en/web/','/web/')},stages:Object.fromEntries(a.clips.map(id=>{const clip=c.clips.find(x=>x.id===id);return[clip.stage,{id,text:clip.spokenText}]}))}]));
const common=Object.fromEntries(c.clips.filter(x=>x.activityId===null).map(x=>[x.id.slice(7),{id:x.id,text:x.spokenText}]));
const itemIds={quiz:'q1',association:'p1',memory:'p1',sequence:null,classification:'i2',puzzle:null,'word-search':'w1',crossword:'e1',completion:'b0',trail:'q1'};
const motors=Object.fromEntries(m.motores.map(a=>[a.motor,{entry:{id:a.falas_base[0].id,text:a.falas_base[0].texto},help:{id:a.falas_base[1].id,text:a.falas_base[1].texto},finish:{id:a.falas_base[2].id,text:a.falas_base[2].texto}}]));
const examples=Object.fromEntries(m.motores.map(a=>[a.atividade.id,{...bindings[a.atividade.id],itemId:itemIds[a.motor],title:a.atividade.titulo,before:{id:a.exemplo_real.pre_resposta.id,text:a.exemplo_real.pre_resposta.texto},help:{id:a.exemplo_real.ajuda_sem_resposta.id,text:a.exemplo_real.ajuda_sem_resposta.texto},after:{id:a.exemplo_real.pos_resposta.id,text:a.exemplo_real.pos_resposta.texto}}]));
const data={schemaVersion:1,revision:'carla-editorial-2026-11-10-v1',voice:{name:'Carla',provider:'ElevenLabs',voiceId:'m151rjrbWXbBqyq56tly',locale:'pt-BR'},audio:{status:'awaiting_licensed_audio',licenseStatus:'pending',files:null},metrics:{clips:c.clips.length+m.motores.length*6,characters:c.metrics.characters+m.motores.reduce((n,a)=>n+[...a.falas_base,...Object.values(a.exemplo_real)].reduce((t,x)=>t+x.texto.length,0),0)},coloring,common,motors,examples};
if(data.metrics.clips!==117||data.metrics.characters!==10119)throw Error('Unexpected approved text volume.');
await writeFile(root+'/mission-runtime/narration/approved-copy.mjs','// Approved editorial text. No generated audio. Source snapshots remain unchanged.\nconst freeze=value=>{if(value&&typeof value===\'object\'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};\nexport const approvedCopy=freeze('+JSON.stringify(data,null,2)+');\n');
console.log('Prepared',data.metrics);
