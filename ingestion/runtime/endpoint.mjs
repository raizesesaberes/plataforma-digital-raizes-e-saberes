export function approvedEndpoint(config,requested){
 if(config?.version!==1||typeof config.endpoint!=='string'||typeof config.allowedHost!=='string'||requested!==config.endpoint)throw Error('ENDPOINT_NOT_ACTIVATED');
 const u=new URL(config.endpoint);
 if(u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash||u.pathname!=='/api/ingest'||u.hostname!==config.allowedHost||u.hostname.endsWith('.supabase.co')||u.hostname.endsWith('.supabase.com'))throw Error('ENDPOINT_NOT_APPROVED');
 return u.href;
}
