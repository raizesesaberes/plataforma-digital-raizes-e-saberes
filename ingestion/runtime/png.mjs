const bad=x=>{throw Error(x)};
class QuarantinableContentError extends Error { constructor(code){super(code);this.code=code;} }
const content=x=>{throw new QuarantinableContentError(x)};
const QUARANTINE_CODES=new Set(['PNG_DIMENSION_LIMIT','PNG_INTERLACE_UNSUPPORTED']);
export function quarantineCode(error){return error instanceof QuarantinableContentError&&QUARANTINE_CODES.has(error.code)?error.code:null;}
function crc32(b){let c=0xffffffff;for(const x of b){c^=x;for(let n=0;n<8;n++)c=(c>>>1)^((c&1)?0xedb88320:0);}return(c^0xffffffff)>>>0;}
const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
export async function validatePNG(a,cryptoImpl=crypto){
 if(!a||a.mime!=='image/png'||!Number.isSafeInteger(a.bytes)||a.bytes<57||a.bytes>524288||typeof a.base64!=='string'||a.base64.length>699052||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(a.base64))bad('PNG_ENVELOPE');
 const binary=atob(a.base64);if(btoa(binary)!==a.base64)bad('BASE64_CANONICAL');const b=Uint8Array.from(binary,c=>c.charCodeAt(0));
 if(b.length!==a.bytes||hex(b.slice(0,8))!=='89504e470d0a1a0a')bad('PNG_BYTES');
 const hash=hex(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',b)));if(hash!==a.sha256||a.path!==`assets/${hash}.png`)bad('PNG_SHA');
 const d=new DataView(b.buffer);let pos=8,header=false,end=false,idat=[],idatEnded=false,palette=false,w,h,depth,color,interlace;
 while(pos<b.length){if(pos+12>b.length)bad('PNG_CHUNK');const n=d.getUint32(pos);if(n>b.length-pos-12)bad('PNG_CHUNK');const typ=new TextDecoder().decode(b.slice(pos+4,pos+8));if(crc32(b.slice(pos+4,pos+8+n))!==d.getUint32(pos+8+n))bad('PNG_CRC');
  if(!header&&typ!=='IHDR')bad('PNG_ORDER');
  if(typ==='IHDR'){if(header||n!==13)bad('PNG_IHDR');header=true;w=d.getUint32(pos+8);h=d.getUint32(pos+12);depth=b[pos+16];color=b[pos+17];interlace=b[pos+20];if(b[pos+18]||b[pos+19]||interlace>1)bad('PNG_ENCODING');}
  else if(typ==='PLTE'){if(idat.length||n%3||!n||n>768)bad('PNG_PALETTE');palette=true;}
  else if(typ==='IDAT'){if(idatEnded)bad('PNG_IDAT_ORDER');idat.push(b.slice(pos+8,pos+8+n));}
  else if(typ==='IEND'){if(n||pos+12!==b.length)bad('PNG_IEND');end=true;}
  else {if(idat.length)idatEnded=true;if(typ[0]===typ[0].toUpperCase())bad('PNG_CRITICAL');}
  pos+=12+n;
 }
 const channels={0:1,2:3,3:1,4:2,6:4}[color];
 if(!end||!idat.length||!channels||![1,2,4,8,16].includes(depth)||([2,4,6].includes(color)&&![8,16].includes(depth))||(color===3&&(!palette||depth===16)))bad('PNG_PIXEL_FORMAT');
 if(!Number.isSafeInteger(a.width)||!Number.isSafeInteger(a.height)||w!==a.width||h!==a.height||!w||!h)bad('PNG_DECLARED_DIMENSIONS');
 if(w>4096||h>4096||w*h>8000000)content('PNG_DIMENSION_LIMIT');
 if(interlace===1)content('PNG_INTERLACE_UNSUPPORTED');
 const stride=Math.ceil(w*channels*depth/8), expected=(stride+1)*h;if(expected>67108864)bad('PNG_DECODE_LIMIT');
 const size=idat.reduce((n,v)=>n+v.length,0),packed=new Uint8Array(size);let off=0;for(const v of idat){packed.set(v,off);off+=v.length;}
 const reader=new Blob([packed]).stream().pipeThrough(new DecompressionStream('deflate')).getReader();const pieces=[];let total=0;
 try{for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>expected){await reader.cancel();bad('PNG_DECODE_LENGTH');}pieces.push(value);}}finally{reader.releaseLock();}
 if(total!==expected)bad('PNG_DECODE_LENGTH');const decoded=new Uint8Array(total);off=0;for(const v of pieces){decoded.set(v,off);off+=v.length;}
 // Decode every scanline filter; input is bounded above before allocation.
 const bpp=Math.max(1,Math.ceil(channels*depth/8));let prev=new Uint8Array(stride);
 for(let y=0;y<h;y++){const filter=decoded[y*(stride+1)];if(filter>4)bad('PNG_FILTER');const row=decoded.slice(y*(stride+1)+1,(y+1)*(stride+1));for(let x=0;x<stride;x++){const left=x>=bpp?row[x-bpp]:0,up=prev[x],ul=x>=bpp?prev[x-bpp]:0;let pred=0;if(filter===1)pred=left;if(filter===2)pred=up;if(filter===3)pred=Math.floor((left+up)/2);if(filter===4){const p=left+up-ul,pa=Math.abs(p-left),pb=Math.abs(p-up),pc=Math.abs(p-ul);pred=pa<=pb&&pa<=pc?left:pb<=pc?up:ul;}row[x]=(row[x]+pred)&255;}prev=row;}
 return {sha256:hash,bytes:b.length,width:w,height:h};
}
export async function validatePrivatePayloads(payloads,cryptoImpl=crypto){
 if(!Array.isArray(payloads)||!payloads.length||payloads.length>25)bad('BATCH_LIMIT');let total=0;
 for(const row of payloads){if(typeof row.text!=='string')bad('PAYLOAD_TEXT');const raw=new TextEncoder().encode(row.text);total+=raw.length;if(raw.length>4194304||total>16777216)bad('PAYLOAD_LIMIT');if(hex(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',raw)))!==row.sha256)bad('PAYLOAD_SHA');const p=JSON.parse(row.text),assets=p.metadata?.enemPilotInline?.assets;if(!Array.isArray(assets)||assets.length>16)bad('ASSET_COUNT');let bytes=0;const paths=new Set();for(const a of assets){if(paths.has(a.path))bad('ASSET_DUPLICATE');paths.add(a.path);bytes+=a.bytes;if(bytes>2097152)bad('ITEM_ASSET_LIMIT');await validatePNG(a,cryptoImpl);}const blocks=[...(p.metadata?.content?.blocks||[]),...(p.metadata?.content?.alternatives||[]).flatMap(a=>a.blocks||[])];for(const b of blocks){if(!b||!['text','asset'].includes(b.type)||typeof b.value!=='string')bad('BLOCK_TYPE');if(b.type==='asset'&&!paths.has(b.value))bad('ASSET_REFERENCE');}}
}
