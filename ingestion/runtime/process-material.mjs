import {validatePrivatePayloads,quarantineCode} from './png.mjs';
export async function processMaterial(material,{digest,verified,rpc,cryptoImpl=crypto}){
 if(!Array.isArray(material)||material.length<1||material.length>25)throw Error('BATCH_LIMIT');
 if(material.some(x=>!x||typeof x.text!=='string'||typeof x.sha256!=='string'))throw Error('MATERIAL_PROTOCOL');
 if(material.reduce((n,x)=>n+new TextEncoder().encode(x.text).length,0)>16777216)throw Error('BATCH_BYTES');
 for(let index=0;index<material.length;index++){
  let assetCheck='VALID';
  try{await validatePrivatePayloads([material[index]],cryptoImpl);}catch(error){
   const code=quarantineCode(error);if(!code)throw error;assetCheck=code;
  }
  await rpc('enem_ingest_process_item',{p_digest:digest,p_ordinal:index+1,p_verified:verified,p_asset_check:assetCheck});
 }
}
