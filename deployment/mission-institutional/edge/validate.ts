import { gameSchema } from './validator/content.ts';
export const sha256=async(text:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=';
const bounded=(v:unknown,depth=0):void=>{if(depth>32)throw Error('CONTENT_TOO_DEEP');if(v&&typeof v==='object'){if(Object.keys(v).length>10000)throw Error('CONTENT_TOO_LARGE');if(Object.keys(v).some(k=>['__proto__','prototype','constructor'].includes(k)))throw Error('CONTENT_UNSAFE_KEY');for(const x of Object.values(v))bounded(x,depth+1)}};
const refs=(v:any,set=new Set<string>()):Set<string>=>{if(typeof v==='string'&&v.startsWith('rsplay-asset:'))set.add(v);else if(v&&typeof v==='object')for(const x of Object.values(v))refs(x,set);return set};
function hydrate(v:any,known:Set<string>,key=''):any{if(typeof v==='string'&&v.startsWith('rsplay-asset:')){if(key!=='src'||!known.has(v))throw Error('UNKNOWN_ASSET_REFERENCE');return png}if(Array.isArray(v))return v.map(x=>hydrate(x,known));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,hydrate(x,known,k)]));return v}
const scalar=(x:any):boolean=>typeof x==='string'&&x.trim().length>0&&x.length<=2000&&!x.includes('<')&&!x.includes('>')&&Array.from(x).every(c=>c.charCodeAt(0)>=32||[9,10,13].includes(c.charCodeAt(0)));
function validateColor(base:any,edit:any,path:string[]=[]):void{
 if(JSON.stringify(base)===JSON.stringify(edit))return;
 if(typeof base==='string'&&typeof edit==='string'){
  const p=path.join('.'),allowed=/^(title|theme|fact|letter|initialWords\.\d+|script\.(welcome|discovery|sound|celebrate)|ageGuidance\.(2-3|4-5|adultNote)|factSource\.(title|url))$/.test(p);
  if(!allowed||!scalar(edit)||(p==='letter'&&!/^[A-Z]$/.test(edit))||(p==='factSource.url'&&!/^https:\/\//.test(edit)))throw Error('COLORING_FIELD_NOT_EDITABLE:'+p);return;
 }
 if(Array.isArray(base)&&Array.isArray(edit)&&base.length===edit.length){base.forEach((x,i)=>validateColor(x,edit[i],[...path,String(i)]));return}
 if(base&&edit&&typeof base==='object'&&typeof edit==='object'&&!Array.isArray(base)&&!Array.isArray(edit)){
  const a=Object.keys(base).sort(),b=Object.keys(edit).sort();if(JSON.stringify(a)!==JSON.stringify(b))throw Error('COLORING_STRUCTURE_CHANGED');for(const k of a)validateColor(base[k],edit[k],[...path,k]);return;
 }throw Error('COLORING_STRUCTURE_CHANGED');
}
export async function validateRevision(baseRaw:string,draftRaw:string,engine:string){
 if(new TextEncoder().encode(draftRaw).length>2097152)throw Error('CONTENT_TOO_LARGE');const base=JSON.parse(baseRaw),edit=JSON.parse(draftRaw);bounded(base);bounded(edit);
 if(base.id!==edit.id||base.template!==edit.template||base.type!==edit.type||base.grade!==edit.grade||base.catalog?.band!==edit.catalog?.band)throw Error('CONTENT_IDENTITY_CHANGED');
 if(engine==='colorir'){
  // Non-editable identity, media, age ranges, licensing and schema are kept byte-for-byte as values.
  validateColor({...base,contentHash:undefined},{...edit,contentHash:undefined});const {contentHash:old,...without}=edit;const hash=await sha256(JSON.stringify(without));edit.contentHash=hash;
  return{source_json:JSON.stringify(edit),content_hash:hash};
 }
 const known=refs(base);const hydrated=hydrate(edit,known);const result=gameSchema.safeParse(hydrated);
 if(!result.success)throw Object.assign(Error('ENGINE_VALIDATION_FAILED'),{issues:result.error.issues.map(i=>({path:i.path.join('.'),message:i.message}))});
 const canonical=(v:any):any=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 if(JSON.stringify(canonical(result.data))!==JSON.stringify(canonical(hydrated)))throw Error('CONTENT_NORMALIZATION_REQUIRED');
 return{source_json:draftRaw,content_hash:await sha256(draftRaw)};
}
