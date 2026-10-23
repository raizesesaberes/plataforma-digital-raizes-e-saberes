// DRAFT ONLY. Intended path: ingestion/review/oidc-readonly.mjs.
// No DB library, deployment command, importer, filesystem token output or POST.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const REPO='raizesesaberes/plataforma-digital-raizes-e-saberes';
const REF='refs/heads/service/enem-ingestion-worker';
const WORKFLOW=`${REPO}/.github/workflows/enem-ingest.yml@${REF}`;
export const AUDIENCE='urn:rs:enem-oidc-readonly:jaesjldrbjbdmzzggxzw:preview';
const ENDPOINT='https://enem-ingestion-worker-hj3ok2d8b-raizesesaberes.vercel.app/api/ingest';
const OIDC_HASH='3d20a8a2f73646fb9f64be667fdaf725327e589e7814ed4426b0e9a71c117247';
const fail=()=>{throw Error('READONLY_PREFLIGHT_REFUSED')};
export function assertContext(env){
 const sha=env.EXPECTED_WORKFLOW_COMMIT;
 if(!/^[a-f0-9]{40}$/.test(sha||'')||env.GITHUB_SHA!==sha||env.GITHUB_WORKFLOW_SHA!==sha||env.GITHUB_WORKFLOW_REF!==WORKFLOW||env.GITHUB_REPOSITORY!==REPO||env.GITHUB_REPOSITORY_ID!=='1297887230'||env.GITHUB_REPOSITORY_OWNER_ID!=='299967037'||env.GITHUB_REF!==REF||env.GITHUB_REF_TYPE!=='branch'||env.GITHUB_EVENT_NAME!=='push'||env.RUNNER_ENVIRONMENT!=='github-hosted')fail();
 for(const key of ['DATABASE_URL','INGEST_DB_PASSWORD','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY'])if(Object.hasOwn(env,key))fail();
 return {audience:AUDIENCE,ref:REF,workflowRef:WORKFLOW,workflowSha:sha,commit:sha};
}
export async function runReadonly(env=process.env){
 const trust=assertContext(env);
 if(process.versions.node.split('.')[0]!=='24')fail();
 const modulePath=resolve('ingestion/runtime/oidc.mjs');
 const bytes=await readFile(modulePath);
 if(createHash('sha256').update(bytes).digest('hex')!==OIDC_HASH)fail();
 const {verifyOIDC}=await import(pathToFileURL(modulePath).href);
 const requestURL=new URL(env.ACTIONS_ID_TOKEN_REQUEST_URL);
 if(requestURL.protocol!=='https:'||!requestURL.hostname.endsWith('.actions.githubusercontent.com')||requestURL.port||requestURL.username||requestURL.password||requestURL.hash||typeof env.ACTIONS_ID_TOKEN_REQUEST_TOKEN!=='string'||!env.ACTIONS_ID_TOKEN_REQUEST_TOKEN)fail();
 requestURL.searchParams.set('audience',AUDIENCE);
 // This is the ONLY token request, in a future explicitly authorized run.
 // No token value, response body, redirect URL or underlying exception is logged.
 const issued=await fetch(requestURL,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{Authorization:`Bearer ${env.ACTIONS_ID_TOKEN_REQUEST_TOKEN}`}});
 if(!issued.ok)fail();
 const raw=await issued.text();if(raw.length>32768)fail();
 let token=JSON.parse(raw).value;
 if(typeof token!=='string'||token.length>16384)fail();
 const identity=await verifyOIDC(token,trust);
 if(identity.run_id!==env.GITHUB_RUN_ID||identity.run_attempt!==env.GITHUB_RUN_ATTEMPT)fail();
 // Negative protection control: no OIDC token, no cookies, no redirect follow.
 const denied=await fetch(ENDPOINT,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000)});
 const deniedStatus=denied.status;
 await denied.body?.cancel();
 if(![301,302,303,307,308,401,403].includes(deniedStatus))fail();
 // External Vercel protection only. No Authorization header to the application.
 // GET is rejected by the approved runtime before Pool creation (405).
 const accepted=await fetch(ENDPOINT,{method:'GET',redirect:'manual',signal:AbortSignal.timeout(10000),headers:{'x-vercel-trusted-oidc-idp-token':token}});
 token='';
 const status=accepted.status;await accepted.body?.cancel();
 if(status!==405)fail();
 console.log(JSON.stringify({oidc_signature_and_scope:'PASS',preview_protection:'PASS',unauthenticatedStatus:deniedStatus,authenticatedGetStatus:status,method:'GET',dbConnectionAttempted:false,applicationBearerSent:false,publicationAuthorized:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 runReadonly().catch(()=>{console.error('READONLY_PREFLIGHT_FAILED_NO_RETRY');process.exitCode=1});
}
