import config from './deployment.config.json' with {type:'json'};
import {approvedEndpoint} from './endpoint.mjs';
import fs from 'node:fs';import {createHash} from 'node:crypto';import {validateV2} from './response.mjs';
import {validateApprovalManifest} from './acceptance.mjs';
// GitHub-hosted job only; never prints credentials or payload content.
const expectedRepo='raizesesaberes/plataforma-digital-raizes-e-saberes';
if(process.env.GITHUB_REPOSITORY!==expectedRepo||process.env.GITHUB_REPOSITORY_ID!=='1297887230'||process.env.GITHUB_REF!=='refs/heads/service/enem-ingestion-worker'||process.env.GITHUB_EVENT_NAME!=='push')throw Error('UNTRUSTED_EVENT');
const digest=process.argv[2];if(!/^[a-f0-9]{64}$/.test(digest||''))throw Error('MANIFEST_DIGEST');
const manifestPath=process.argv[3];if(typeof manifestPath!=='string'||!/^ingestion\/approved\/[a-z0-9-]+\.json$/.test(manifestPath))throw Error('MANIFEST_PATH');
const manifestRaw=fs.readFileSync(manifestPath);if(manifestRaw.length>65536||createHash('sha256').update(manifestRaw).digest('hex')!==digest)throw Error('MANIFEST_HASH');const manifest=validateApprovalManifest(manifestRaw.toString('utf8'),digest);
const endpoint=process.env.INGEST_ENDPOINT;
approvedEndpoint(config,endpoint);
const requestURL=new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL);if(requestURL.protocol!=='https:')throw Error('OIDC_REQUEST_URL');
requestURL.searchParams.set('audience','urn:rs:enem-ingest:jaesjldrbjbdmzzggxzw');
const r=await fetch(requestURL,{headers:{Authorization:`Bearer ${process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`},redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('OIDC_UNAVAILABLE');
const {value}=await r.json();const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${value}`,'Content-Type':'application/json'},body:JSON.stringify({manifest_sha256:digest}),redirect:'error',signal:AbortSignal.timeout(65000)});
if(!response.ok)throw Error('IMPORT_UNCONFIRMED_NO_AUTOMATIC_RETRY');
const result=await response.json();const summary=validateV2(result,manifest,digest);console.log(JSON.stringify(summary));
if(summary.status!=='CONFIRMED')process.exitCode=2;
