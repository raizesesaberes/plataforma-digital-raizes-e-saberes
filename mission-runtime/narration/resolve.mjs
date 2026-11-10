import {approvedCopy} from './approved-copy.mjs';
export {approvedCopy};
export function commonText(stage,fallback=''){return approvedCopy.common[stage]?.text||fallback;}
export function coloringCopy(activity,age){
 const a=approvedCopy.coloring[activity?.id];
 if(!a||!['2-3','4-5'].includes(age)||a.catalogId!==activity.catalogId||a.revision!==activity.revision||a.contentHash!==activity.contentHash)return null;
 const get=stage=>a.stages[stage]?.text;
 return {welcome:get('welcome'),discovery:get(age==='2-3'?'discovery_2_3':'discovery_4_5'),sound:age==='4-5'?get('sound_4_5'):null,letter:age==='4-5'?get('letter_4_5'):null,countInvite:get('count_invite'),countOne:get('count_one'),countTwo:get('count_two'),countThree:get('count_three'),countReset:get('count_reset'),teacherNote:a.teacherNote,factSource:a.factSource};
}
export function canonical(value){return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;}
export async function contentDigest(content){const bytes=new TextEncoder().encode(JSON.stringify(canonical(content)));return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const verified=new WeakMap();
export function verifyGameContent(content){
 const candidate=approvedCopy.examples[content?.id];
 if(!candidate||candidate.template!==content.template)return Promise.resolve(null);
 if(!verified.has(content))verified.set(content,contentDigest(content).then(hash=>hash===candidate.canonicalSha256?candidate:null).catch(()=>null));
 return verified.get(content);
}
export function motorCopy(content){return approvedCopy.motors[content?.template]||null;}
// Presentation only. Never transition the engine, change timers, or infer a correct answer.
export function gameCopyState(session,example=null){
 const motor=motorCopy(session?.content);if(!motor)return null;
 const state={motor,example:null,before:null,help:null,after:null};
 if(!example||example!==approvedCopy.examples[session.content.id])return state;
 const matched=session.matched||[],template=session.content.template;
 let solved=false,before=!session.complete;
 if(template==='quiz'||template==='trail'){
  const index=(template==='quiz'?session.content.questions:session.content.nodes).findIndex(q=>q.id===example.itemId);
  const current=session.questionIndex===index;
  solved=template==='quiz'?session.questionIndex>index||current&&Boolean(session.feedback):matched.includes(example.itemId)||current&&Boolean(session.feedback);
  before=current&&!session.feedback&&!session.complete;
 }else if(template==='sequence'||template==='puzzle')solved=session.complete===true;
 else solved=matched.includes(example.itemId);
 state.example=example;
 state.before=before&&!solved?example.before:null;
 state.help=state.before&&(template!=='memory'||session.flipped?.length)?example.help:null;
 state.after=solved?example.after:null;
 return state;
}

// Erasing an empty region or undoing paint does not mean the image has colors.
export function paintingHasColor({actions=[],cursor=0}={}){const colored=new Set();for(const action of actions.slice(0,cursor)){if(action.tool==='erase')colored.delete(action.region);else colored.add(action.region);}return colored.size>0;}
