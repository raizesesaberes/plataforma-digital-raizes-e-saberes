const calls=Object.freeze(Object.assign(Object.create(null),{
 enem_ingest_trust:{sql:'select enem_ingestion_api.trust($1::text) as result',args:['p_digest']},
 enem_ingest_material:{sql:'select enem_ingestion_api.material($1::text) as result',args:['p_digest']},
 enem_ingest_acquire:{sql:'select enem_ingestion_api.acquire($1::text,$2::jsonb) as result',args:['p_digest','p_verified']},
 enem_ingest_process_item:{sql:'select enem_ingestion_api.process_item($1::text,$2::integer,$3::jsonb,$4::text) as result',args:['p_digest','p_ordinal','p_verified','p_asset_check']},
 enem_ingest_progress:{sql:'select enem_ingestion_api.progress($1::text,$2::jsonb,$3::boolean) as result',args:['p_digest','p_verified','p_finish']}
}));
export function createRpc(pool){return async(name,args)=>{
 if(!Object.hasOwn(calls,name)||!args||typeof args!=='object')throw Error('GATEWAY_NOT_ALLOWED');
 const c=calls[name];if(Object.keys(args).sort().join(',')!==[...c.args].sort().join(','))throw Error('GATEWAY_ARGUMENTS');
 const result=await pool.query({text:c.sql,values:c.args.map(k=>args[k]),query_timeout:60000});
 if(!result||result.rows?.length!==1||!Object.hasOwn(result.rows[0],'result'))throw Error('GATEWAY_UNCONFIRMED');
 return result.rows[0].result;
};}
