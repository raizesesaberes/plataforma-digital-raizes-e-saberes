import {readFileSync,writeFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {FORMACAO_OVERRIDES} from './lib/formacao-runtime.mjs';
const root=resolve(import.meta.dirname,'..');
const sha=file=>createHash('sha256').update(readFileSync(join(root,file))).digest('hex');
const baseline=JSON.parse(readFileSync(join(root,'scripts/static-runtime-manifest.json'),'utf8'));
const files=['formacao.html','personal-learning.html',...['formacao-runtime','personal-learning-runtime'].flatMap(dir=>readdirSync(join(root,dir)).sort().map(name=>dir+'/'+name))].map(file=>{
 if(!lstatSync(join(root,file)).isFile()||lstatSync(join(root,file)).isSymbolicLink())throw Error('Only reviewed files allowed: '+file);
 return {file,sha256:sha(file)};
});
const overrides=FORMACAO_OVERRIDES.map(file=>({file,original_sha256:baseline.find(e=>e.file===file).sha256,sha256:sha(file)}));
writeFileSync(join(root,'scripts/formacao-runtime-manifest.json'),JSON.stringify({schema:1,baseCommit:'c2d112908a8d357ede1ffca75a13b8be929e300c',files,overrides},null,2)+'\n');
const missionPath=join(root,'scripts/mission-runtime-manifest.json'),mission=JSON.parse(readFileSync(missionPath));
mission.overrides.find(e=>e.file==='app-pages.js').sha256=sha('app-pages.js');
writeFileSync(missionPath,JSON.stringify(mission,null,2)+'\n');
console.log('Training runtime manifest prepared; current Carla and App manifests preserved.');
