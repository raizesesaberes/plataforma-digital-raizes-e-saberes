import {checkServerIdentity} from 'node:tls';
export function connectionConfig({host,port,database,ca,password},approvedHost){
 if(typeof host!=='string'||host!==approvedHost||!host.endsWith('.supabase.com')&&!host.endsWith('.supabase.co')||!/^[-a-z0-9.]+$/.test(host))throw Error('HOST_NOT_APPROVED');
 if(![5432,6543].includes(port)||database!=='postgres'||typeof ca!=='string'||!ca.includes('BEGIN CERTIFICATE')||typeof password!=='string'||password.length<32)throw Error('CONNECTION_CONFIG');
 return {host,port,database,user:'enem_ingest_runtime',password,max:1,connectionTimeoutMillis:5000,ssl:{ca,rejectUnauthorized:true,servername:host,checkServerIdentity:(h,cert)=>h!==host?Error('HOST_MISMATCH'):checkServerIdentity(host,cert)}};
}
