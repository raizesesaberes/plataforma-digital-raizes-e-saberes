import {connectionConfig} from './tls-config.mjs';
import {createRpc} from './rpc-adapter.mjs';
import {createHandler} from './handler.mjs';
export const SESSION_SQL="select session_user::text as session_user,current_user::text as current_user,current_database() as database,rolsuper,rolcreaterole,rolcreatedb,rolbypassrls,rolreplication from pg_catalog.pg_roles where rolname=session_user";
// Exactly one redacting listener per Client, including late events after destruction.
// pg-pool retains its own idle listener; this listener never logs the original Error.
const clientErrors=new WeakMap();
const guardedPools=new WeakSet();
function errorState(client){
 let state=clientErrors.get(client);
 if(!state){state={failed:false,reject:null};client.on('error',()=>{state.failed=true;state.reject?.(Error('DB_CONNECTION_UNCONFIRMED'));});clientErrors.set(client,state);}
 return state;
}
export function checkedPool(pool){
 // pg-pool emits acquire before removing its idle listener and resolving connect.
 if(!guardedPools.has(pool)){pool.on?.('acquire',errorState);guardedPools.add(pool);}
 return {async query(query){
 const client=await pool.connect();const state=errorState(client);let broken=true;
 let rejectEvent;const eventError=new Promise((_,reject)=>{rejectEvent=reject;});
 state.reject=rejectEvent;
 const run=q=>Promise.race([Promise.resolve().then(()=>{if(state.failed)throw Error('DB_CONNECTION_UNCONFIRMED');return client.query(q);}),eventError]);
 try{
 if(client.connection?.stream?.encrypted!==true||client.connection?.stream?.authorized!==true)throw Error('TLS_NOT_VERIFIED');
 const {rows}=await run({text:SESSION_SQL,values:[],query_timeout:5000});const s=rows?.[0];
 if(rows?.length!==1||s?.session_user!=='enem_ingest_runtime'||s.current_user!=='enem_ingest_runtime'||s.database!=='postgres'||['rolsuper','rolcreaterole','rolcreatedb','rolbypassrls','rolreplication'].some(k=>s[k]!==false))throw Error('UNEXPECTED_DB_IDENTITY');
 const result=await run(query);if(state.failed)throw Error('DB_CONNECTION_UNCONFIRMED');broken=false;return result;
 }finally{state.reject=null;client.release(broken||state.failed);}
}};}
export function createRuntime({Pool,env,config,verify}){
 let handler;
 return async req=>{try{
  if(new URL(req.url).pathname!=='/api/ingest')return new Response(null,{status:404});
  if(req.method!=='POST')return new Response(null,{status:405});
  if(!/^Bearer [A-Za-z0-9_.-]+$/.test(req.headers.get('authorization')||''))return new Response(null,{status:401});
  if(!handler){
   if(['SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SECRET_KEY','DATABASE_URL'].some(k=>Object.hasOwn(env,k)))throw Error('BROAD_RUNTIME_CONFIG_FORBIDDEN');
   if(config.version!==1||config.dbUser!=='enem_ingest_runtime'||!config.dbHost)throw Error('RUNTIME_NOT_CONFIGURED');
   const options=connectionConfig({host:config.dbHost,port:config.dbPort,database:config.database,ca:env.INGEST_DB_CA,password:env.INGEST_DB_PASSWORD},config.dbHost);
   const pool=new Pool({...options,enableChannelBinding:true});pool.on?.('error',()=>{/* no credentials or raw DB errors logged */});
   handler=createHandler({rpc:createRpc(checkedPool(pool)),...(verify?{verify}: {})});
  }
  return await handler(req);
 }catch{return Response.json({error:'INGEST_UNAVAILABLE_OR_UNCONFIRMED'},{status:503,headers:{'Cache-Control':'no-store'}});}};
}
