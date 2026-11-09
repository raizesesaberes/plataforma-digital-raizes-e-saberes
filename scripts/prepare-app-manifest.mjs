import {readFileSync,writeFileSync,readdirSync,lstatSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),files=[];
function sha(p){return createHash('sha256').update(readFileSync(join(root,p))).digest('hex');}
function walk(dir){for(const name of readdirSync(join(root,dir)).sort()){const p=dir+'/'+name,stat=lstatSync(join(root,p));if(stat.isSymbolicLink())throw Error('Symlink '+p);if(stat.isDirectory())walk(p);else if(name==='metadata.json'||name.endsWith('.map'))unlinkSync(join(root,p));else files.push({file:p,sha256:sha(p)});}}
walk('app');
writeFileSync(join(root,'scripts/app-runtime-manifest.json'),JSON.stringify({schema:1,baseCommit:'4d85baf00eecc72eed604738f71a7b70b641a0a2',files},null,2)+'\n');
const missionPath=join(root,'scripts/mission-runtime-manifest.json'),mission=JSON.parse(readFileSync(missionPath));for(const file of ['app-pages.js','login.js']){const entry=mission.overrides.find(e=>e.file===file);if(!entry)throw Error('Missing approved override '+file);entry.sha256=sha(file);}writeFileSync(missionPath,JSON.stringify(mission,null,2)+'\n');
console.log('App manifest prepared:',files.length,'files; approved app-pages/login override hashes updated.');
