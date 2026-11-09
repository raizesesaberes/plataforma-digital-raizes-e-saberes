const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.resolve(__dirname,'../../mobile'),ts=require(root+'/node_modules/typescript');
let events={},entries=[null],at=0,state,allowed=true,clean,nonceCount=0;
const history={replaceState(s,_,url){entries[at]={s,url}},pushState(s,_,url){entries=entries.slice(0,at+1);entries.push({s,url});at++},go(delta){at+=delta;assert(at>=0&&at<entries.length);events.popstate({state:entries[at].s})},back(){this.go(-1)}};
const context={exports:{},require:n=>({useRef:v=>({current:v}),useEffect:f=>{clean=f()}}),crypto:{randomUUID:()=> 'nonce-test-'+(++nonceCount)},history,location:{pathname:'/app'},window:{addEventListener:(n,f)=>events[n]=f,removeEventListener:n=>delete events[n]}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'/src/hooks-hosted-navigation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
const nav=context.exports.useHostedNavigation(true,'home',s=>state=s,()=>allowed);
nav.push('agenda','agenda');nav.push({token:'ephemeral-private-detail'},'detalhe');assert.equal(at,2);assert(!JSON.stringify(entries).includes('ephemeral-private-detail'));
nav.back();assert.equal(state,'agenda');history.go(1);assert.equal(state.token,'ephemeral-private-detail');
allowed=false;nav.back();assert.equal(at,2);assert.equal(state.token,'ephemeral-private-detail');allowed=true;
nav.back();nav.push('notifications','notifications');assert.equal(entries.length,3);assert.equal(state,'notifications');
// An event's forged position must not influence repair: canonical position stays in memory.
entries[1].s.position=999;allowed=false;nav.back();assert.equal(at,2);assert.equal(state,'notifications');allowed=true;
// Foreign cancellation keeps the current mounted screen/draft but starts a new epoch.
const oldNonce=entries[at].s.rsApp;allowed=false;
events.popstate({state:{rsApp:'other-account',index:1,position:999,payload:'foreign-private'}});
assert.equal(state,'notifications');assert.equal(entries[at].url,'/app#section');
assert.notEqual(entries[at].s.rsApp,oldNonce);assert.equal(entries[at].s.index,0);assert.equal(entries[at].s.position,0);
assert.equal(nav.back(),false);assert(!JSON.stringify(entries[at]).includes('foreign-private'));
allowed=true;nav.push('agenda','agenda');assert.equal(entries[at].s.index,1);assert.equal(entries[at].s.position,1);
nav.back();assert.equal(state,'notifications');history.go(1);assert.equal(state,'agenda');
// Foreign acceptance resets to home, with another fresh epoch and correct next push/back.
const canceledNonce=entries[at].s.rsApp;
events.popstate({state:{rsApp:oldNonce,index:1,position:1}});
assert.equal(state,'home');assert.equal(entries[at].url,'/app#home');assert.notEqual(entries[at].s.rsApp,canceledNonce);assert.equal(nav.back(),false);
nav.push('agenda','agenda');assert.equal(entries[at].s.index,1);assert.equal(entries[at].s.position,1);nav.back();assert.equal(state,'home');history.go(1);assert.equal(state,'agenda');
clean();assert.equal(events.popstate,undefined);
console.log('PASS: list/detail back-forward; cancellation repair; no payload in browser history; forward-branch discard; forged-position ignored; foreign cancel preserves current state; foreign allow resets home; fresh epoch and next push/back/forward after both resets; cleanup.');
