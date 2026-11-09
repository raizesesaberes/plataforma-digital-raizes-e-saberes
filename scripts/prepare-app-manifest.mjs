import {readFileSync,writeFileSync,readdirSync,lstatSync,unlinkSync} from 'node:fs';
import {resolve,join} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),files=[];
function sha(p){return createHash('sha256').update(readFileSync(join(root,p))).digest('hex');}
function walk(dir){for(const name of readdirSync(join(root,dir)).sort()){const p=dir+'/'+name,stat=lstatSync(join(root,p));if(stat.isSymbolicLink())throw Error('Symlink '+p);if(stat.isDirectory())walk(p);else if(name==='metadata.json'||name.endsWith('.map'))unlinkSync(join(root,p));else files.push({file:p,sha256:sha(p)});}}
walk('app');
const baseline=JSON.parse(readFileSync(join(root,'scripts/static-runtime-manifest.json'),'utf8'));
const overrides=['library-edition-boot.mjs','library-edition-client.mjs','library-edition-reader.mjs'].map(file=>{
 const original=baseline.find(entry=>entry.file===file);if(!original)throw Error('Missing library baseline '+file);
 return {file,original_sha256:original.sha256,sha256:sha(file)};
});
writeFileSync(join(root,'scripts/app-runtime-manifest.json'),JSON.stringify({schema:1,baseCommit:'4e91990aa5d7e98fbf18b793156f5229a998461f',files,overrides},null,2)+'\n');
const missionPath=join(root,'scripts/mission-runtime-manifest.json'),mission=JSON.parse(readFileSync(missionPath));for(const file of ['app-pages.js','login.js']){const entry=mission.overrides.find(e=>e.file===file);if(!entry)throw Error('Missing approved override '+file);entry.sha256=sha(file);}writeFileSync(missionPath,JSON.stringify(mission,null,2)+'\n');
console.log('App manifest prepared:',files.length,'files; approved app-pages/login override hashes updated.');
