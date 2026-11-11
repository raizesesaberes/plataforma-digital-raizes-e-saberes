import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),base='1038e03';
const original=p=>execFileSync('git',['show',`${base}:${p}`],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024});
const draft=process.env.COLORIR_DRAFT_ROOT?resolve(process.env.COLORIR_DRAFT_ROOT):root;
const read=p=>readFileSync(resolve(draft,p),'utf8');
for(const file of ['mission-runtime/coloring/style.css','mission-runtime/coloring/discovery.css']){
 const before=original(file),after=read(file);assert(after.startsWith(before),file+' original rules, including print, must stay byte-identical');const addition=after.slice(before.length);assert(addition.includes('@media screen'));assert(!addition.includes('@media print'));assert(!addition.includes('@font-face'));assert(!addition.includes('canvas {'));assert(!addition.includes('#painting {'));
}
const before=original('colorir-descobrir.html'),after=read('colorir-descobrir.html');const link='    <link rel="stylesheet" href="mission-runtime/coloring/host.css?v=20261111" />\n';assert.equal(after.replace(link,''),before);assert.equal(after.split(link).length,2);
const host=read('mission-runtime/coloring/host.css');assert(host.includes('[data-active-module="colorirDescobrir"]'));assert(host.includes('.rs-menu-open'));assert(host.includes('.app-topbar { display: flex; }'));assert(!host.includes('!important'));
for(const file of ['mission-runtime/institutional.mjs','mission-runtime/coloring/app.mjs','mission-runtime/coloring/discovery.mjs','mission-runtime/coloring/paint-engine.mjs','mission-runtime/coloring/palette.mjs','mission-runtime/coloring/catalog.json','mission-runtime/coloring/counting.mjs','mission-runtime/coloring/themes.mjs','mission-runtime/narration/coloring-audio.mjs','mission-runtime/narration/static-player.mjs','mission-runtime/narration/approved-copy.mjs'])assert.equal(readFileSync(resolve(root,file),'utf8'),original(file),file+' must remain unchanged');
console.log('PASS Colorir CSS-only shell/UI changes; original print rules, engine, eight-theme catalog, palette, authorization and audio source unchanged.');
