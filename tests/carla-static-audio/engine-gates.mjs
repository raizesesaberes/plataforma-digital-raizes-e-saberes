// Replay the exact deployed engine functions, without exposing hooks in the runtime.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {launchHarness,root} from '../carla-guidance/harness.mjs';
const h=await launchHarness({exposeEngine:true});
try {
 const p=await h.page();await h.install(p,'/mission-runtime/studio/?snapshot=1&institutional=1');await h.wait(p,'rs-teacher-ready');
 const results=await p.frames()[1].evaluate(async()=>{
  const runtime=await import('/mission-runtime/studio/assets/index-Di3aszpa.js');
  const {approvedCopy,gameCopyState,verifyGameContent}=await import('/mission-runtime/narration/resolve.mjs');
  const engine=await import('/test-engine.mjs');
  const {gameCue,resolveAsset}=await import('/mission-runtime/narration/audio-policy.mjs');
  const {assetRegistry}=await import('/mission-runtime/narration/asset-registry.mjs');
  const catalog=await(await fetch('/mission-runtime/catalog.json')).json(),results=[];
  for(const [id,example]of Object.entries(approvedCopy.examples)){
   const content=await runtime.a(catalog.find(x=>x.id===id));
   const verified=await verifyGameContent(content);if(verified!==example)throw Error('Binding '+id);
   let session=engine.start(content,()=>0.4);
   const state=()=>gameCopyState(session,example);
   const dispatch=action=>{session=engine.transition(session,action);};
   const must=(value,label)=>{if(!value)throw Error(content.template+': '+label);};
   must(!state().after,'answer before interaction');
   const beforeState=JSON.stringify(session);
   must(!(await gameCue(session,example.after.id)),'audio answer before interaction');
   const entry=await gameCue(session,state().motor.entry.id);must(entry,'approved entry cue');must(Boolean(resolveAsset(entry))===assetRegistry.assets.some(asset=>asset.clipId===entry.clipId),'only installed entry can play');
   must(beforeState===JSON.stringify(session),'audio resolver mutated engine');
   must(!(await gameCue({...session,content:{...content,title:content.title+' edited'}},state().motor.entry.id)),'edited content inherited audio');
   const advance=()=>dispatch({type:'continue'});
   switch(content.template){
    case 'quiz':case 'trail':{
     const q=(content.questions||content.nodes)[0],type=content.template==='quiz'?'answer':'trail-answer';
     dispatch({type,optionId:q.options.find(o=>o.id!==q.correctOptionId).id});must(session.feedback==='retry','wrong attempt accepted');must(state().after,'explanation only after attempt');must(await gameCue(session,example.after.id),'audio explanation after attempted answer');advance();must(!state().after,'retry returns to prompt');must(!(await gameCue(session,example.after.id)),'audio retry returns to prompt');
     dispatch({type,optionId:q.correctOptionId});must(state().after,'correct explanation');advance();must(!state().before&&state().after,'past explanation without stale prompt');break;
    }
    case 'memory':{
     dispatch({type:'flip',cardId:example.itemId+'-left'});must(state().help,'help only with open card');
     dispatch({type:'flip',cardId:content.pairs.find(p=>p.id!==example.itemId).id+'-right'});must(!state().after,'wrong pair');advance();
     for(const side of ['left','right'])dispatch({type:'flip',cardId:example.itemId+'-'+side});break;
    }
    case 'association':dispatch({type:'match',leftId:example.itemId,rightId:content.pairs.find(p=>p.id!==example.itemId).id});must(!state().after,'wrong relation');advance();dispatch({type:'match',leftId:example.itemId,rightId:example.itemId});break;
    case 'sequence':{
     dispatch({type:'check-sequence'});must(!state().after,'unordered cards');advance();
     content.items.forEach((item,i)=>{while(session.order.indexOf(item.id)>i)dispatch({type:'move-sequence',itemId:item.id,delta:-1});});
     dispatch({type:'check-sequence'});must(session.complete,'complete ordered sequence');break;
    }
    case 'classification':{
     const item=content.items.find(x=>x.id===example.itemId);dispatch({type:'classify',itemId:item.id,categoryId:content.categories.find(x=>x.id!==item.categoryId).id});must(!state().after,'wrong class');advance();dispatch({type:'classify',itemId:item.id,categoryId:item.categoryId});break;
    }
    case 'puzzle':{
     const first=content.pieces[0];dispatch({type:'place-piece',pieceId:first.id,slot:(first.slot+1)%content.pieces.length});must(!state().after,'wrong puzzle slot');advance();
     content.pieces.forEach((piece,i)=>{dispatch({type:'place-piece',pieceId:piece.id,slot:piece.slot});if(i<content.pieces.length-1)must(!state().after,'incomplete puzzle');});must(session.complete,'completed puzzle');break;
    }
    case 'word-search':{
     const w=content.words.find(x=>x.id===example.itemId);dispatch({type:'find-word',start:{row:0,col:0},end:{row:0,col:0}});must(!state().after,'wrong word');advance();
     dispatch({type:'find-word',start:{row:w.row,col:w.col},end:{row:w.row+(w.direction==='vertical'?w.word.length-1:0),col:w.col+(w.direction==='vertical'?0:w.word.length-1)}});break;
    }
    case 'crossword':{
     const entry=content.entries.find(x=>x.id===example.itemId);dispatch({type:'crossword-answer',entryId:entry.id,value:'__wrong__'});must(!state().after,'wrong crossword');advance();dispatch({type:'crossword-answer',entryId:entry.id,value:entry.answer});break;
    }
    case 'completion':{
     const blank=content.blanks.find(x=>x.id===example.itemId);dispatch({type:'fill-blank',blankId:blank.id,value:'__wrong__'});must(!state().after,'wrong completion');advance();dispatch({type:'fill-blank',blankId:blank.id,value:blank.answers[0]});break;
    }
   }
   must(state().after===example.after,'approved explanation after actual gate');
   const afterCue=await gameCue(session,example.after.id);must(afterCue?.text===example.after.text,'audio explanation after exact engine gate');must(Boolean(resolveAsset(afterCue))===assetRegistry.assets.some(asset=>asset.clipId===afterCue.clipId),'only installed explanation can play');
   results.push({template:content.template,id,actualEngine:true,wrongAttemptReviewed:true,approvedExplanationGate:true,audioCueGate:true,installedEntry:Boolean(resolveAsset(entry)),installedExplanation:Boolean(resolveAsset(afterCue)),editedContentRejected:true});
  }
  return results;
 });
 assert.equal(results.length,10);await mkdir(root+'/qa/carla-static-audio/evidence',{recursive:true});await writeFile(root+'/qa/carla-static-audio/evidence/engine-gates.json',JSON.stringify(results,null,2)+'\n');console.log('PASS prepared audio cues with exact runtime engine: all ten explanation gates, wrong attempts, sequence/puzzle completion and quiz/trail progression.');
}finally{await h.close();}
