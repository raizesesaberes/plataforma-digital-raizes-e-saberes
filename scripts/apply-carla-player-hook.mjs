// Two reversible presentation insertions. Refuses any unexpected upstream Player.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const record=JSON.parse(await readFile(root+'/qa/carla-guidance/player-hook.json'));
const target=resolve(root,record.file),hash=s=>createHash('sha256').update(s).digest('hex');
let source=await readFile(target,'utf8');
if(hash(source)===record.afterSha256){console.log('Presentation hook already verified.');process.exit(0);}
if(hash(source)!==record.beforeSha256)throw Error('Player differs from approved base; review before applying.');
for(const {before,after} of record.replacements){if(source.split(before).length!==2)throw Error('Insertion point is not unique.');source=source.replace(before,after);}
source=record.prepend+source;
if(hash(source)!==record.afterSha256)throw Error('Unexpected patched bytes; original not changed.');
await writeFile(target,source);console.log('Applied verified presentation-only hook.');
