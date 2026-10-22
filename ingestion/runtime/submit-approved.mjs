import fs from 'node:fs';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';import {createHash} from 'node:crypto';
const dir='ingestion/approved';const files=fs.readdirSync(dir).filter(x=>/^[a-z0-9-]+\.json$/.test(x));
if(files.length!==1)throw Error('SINGLE_ACTIVE_MANIFEST_REQUIRED');
const raw=fs.readFileSync(`${dir}/${files[0]}`);if(raw.length>65536)throw Error('MANIFEST_SIZE');const m=JSON.parse(raw);if(m.version!==1||!Array.isArray(m.items)||m.items.length<1||m.items.length>25)throw Error('MANIFEST_FORMAT');
const digest=createHash('sha256').update(raw).digest('hex');
const r=spawnSync(process.execPath,[fileURLToPath(new URL('./dispatch-v2.mjs',import.meta.url)),digest,`${dir}/${files[0]}`],{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status||1);
