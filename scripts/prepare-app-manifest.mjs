import {readFileSync,writeFileSync,readdirSync,lstatSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),files=[];
function sha(p){return createHash('sha256').update(readFileSync(join(root,p))).digest('hex');}
function walk(dir){for(const name of readdirSync(join(root,dir)).sort()){const p=dir+'/'+name,stat=lstatSync(join(root,p));if(stat.isSymbolicLink())throw Error('Symlink '+p);if(stat.isDirectory())walk(p);else if(name==='metadata.json'||name.endsWith('.map'))unlinkSync(join(root,p));else files.push({file:p,sha256:sha(p)});}}
walk('app');
writeFileSync(join(root,'scripts/app-runtime-manifest.json'),JSON.stringify({schema:1,baseCommit:'132da48959b5dd9614f11afbcac704747ff1596f',files},null,2)+'\n');
const missionPath=join(root,'scripts/mission-runtime-manifest.json'),mission=JSON.parse(readFileSync(missionPath));mission.overrides.find(e=>e.file==='app-pages.js').sha256=sha('app-pages.js');writeFileSync(missionPath,JSON.stringify(mission,null,2)+'\n');
console.log('App manifest prepared:',files.length,'files; only app-pages override hash updated.');
