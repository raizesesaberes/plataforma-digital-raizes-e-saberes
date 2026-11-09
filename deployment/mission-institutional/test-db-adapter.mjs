// Optional real PostgreSQL adapter. Never connect this synthetic suite to production.
import {isAbsolute} from 'node:path';
export function localPostgresOptions(url,socket){
 const parsed=new URL(url);
 if(!['postgres:','postgresql:'].includes(parsed.protocol)||!['127.0.0.1','localhost','[::1]'].includes(parsed.hostname)||!/^\/mission_test[_a-z0-9]*$/.test(parsed.pathname))throw Error('Only loopback mission_test* databases are permitted');
 // Reject every query parameter, including host, hostaddr, options and connection overrides.
 if(parsed.search||parsed.hash)throw Error('PostgreSQL URL query parameters and fragments are forbidden');
 if(socket!==undefined&&(!isAbsolute(socket)||socket.includes('\0')))throw Error('MISSION_TEST_PGSOCKET must be an absolute path without NUL');
 const port=Number(parsed.port||5432);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid local PostgreSQL port');
 return {host:socket??parsed.hostname.replace(/^\[|\]$/g,''),port,user:decodeURIComponent(parsed.username)||'postgres',password:decodeURIComponent(parsed.password),database:parsed.pathname.slice(1),ssl:false,options:''};
}
export async function createTestDatabase(){
 const url=process.env.MISSION_TEST_DATABASE_URL;
 if(!url){if(process.env.MISSION_TEST_PGSOCKET!==undefined)throw Error('MISSION_TEST_DATABASE_URL is required with a PostgreSQL socket');const {PGlite}=await import('@electric-sql/pglite');return new PGlite()}
 const options=localPostgresOptions(url,process.env.MISSION_TEST_PGSOCKET);
 const {Client}=await import('pg');const client=new Client(options);await client.connect();
 return {exec:sql=>client.query(sql),query:(sql,args)=>client.query(sql,args),close:()=>client.end()};
}
