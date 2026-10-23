import {checkServerIdentity} from 'node:tls';
export function connectionConfig({host,port,database,ca,password,connectionUser},approvedHost){
 if(typeof host!=='string'||host!==approvedHost||!host.endsWith('.supabase.com')&&!host.endsWith('.supabase.co')||!/^[-a-z0-9.]+$/.test(host))throw Error('HOST_NOT_APPROVED');
 if(![5432,6543].includes(port)||database!=='postgres'||typeof ca!=='string'||!ca.includes('BEGIN CERTIFICATE')||typeof password!=='string'||password.length<32)throw Error('CONNECTION_CONFIG');
 const pooled=host.endsWith('.pooler.supabase.com');
 const user=connectionUser??(pooled?null:'enem_ingest_runtime');
 if(user!==(pooled?'enem_ingest_runtime.jaesjldrbjbdmzzggxzw':'enem_ingest_runtime'))throw Error('DB_WIRE_IDENTITY_NOT_APPROVED');
 return {host,port,database,user,password,max:1,connectionTimeoutMillis:5000,ssl:{ca,rejectUnauthorized:true,servername:host,checkServerIdentity:(h,cert)=>h!==host?Error('HOST_MISMATCH'):checkServerIdentity(host,cert)}};
}
