export const stable = value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
export async function validateColoring(activity){
 if(!activity||activity.type!=='coloring'||activity.status!=='draft'||!/^RS-INF-COLORIR-[A-Z0-9-]+$/.test(activity.catalogId)||!Number.isSafeInteger(activity.revision)||activity.revision<1||!/^art\/[a-z0-9-]+\.png$/.test(activity.art)||!Array.isArray(activity.ageRanges)||activity.ageRanges.some(x=>!['2-3','4-5'].includes(x))||!activity.ageRanges.length||!/^([a-f0-9]{64})$/.test(activity.contentHash)||!/^([a-f0-9]{64})$/.test(activity.artSha256))throw Error('Identidade de atividade infantil inválida.');
 const {contentHash,...body}=activity;
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body))))].map(n=>n.toString(16).padStart(2,'0')).join('');
 if(hash!==contentHash)throw Error('Revisão infantil divergente.');
 return structuredClone(activity);
}
export function coloringEntry(activity){return {id:activity.catalogId,title:activity.title,subject:activity.subject,description:activity.theme,grade:'Educação Infantil · faixa a definir',template:'coloring',status:'draft',sourceRevision:activity.revision,contentHash:activity.contentHash,artSha256:activity.artSha256,ageRanges:[...activity.ageRanges],coloring:structuredClone(activity),publishEligible:false};}
export async function loadCatalog(){
 const read=async path=>{const r=await fetch(path);if(!r.ok)throw Error('Catálogo indisponível');const c=await r.json();if(!Array.isArray(c))throw Error('Catálogo inválido');return c;};
 const [games,infant]=await Promise.all([read('catalog.json'),read('coloring/catalog.json')]);
 const coloring=await Promise.all(infant.map(validateColoring));
 const all=[...games,...coloring.map(coloringEntry)];
 if(new Set(all.map(x=>x.id)).size!==all.length)throw Error('Identidade duplicada no catálogo.');
 return all;
}
