import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {createHash} from 'node:crypto';import {resolve} from 'node:path';import {available,validateAssignment,hydrateSnapshot,assignmentFingerprint,escapeHtml} from '../../mission-runtime/institutional.mjs';import {localDeadlineToUtc} from '../../mission-runtime/time.mjs';
const root=resolve(import.meta.dirname,'../..'),sha=s=>createHash('sha256').update(s).digest('hex');const base={id:'a',revision_id:'r',class_id:'c',starts_at:'2026-11-08T10:00:00Z',ends_at:null,content_hash:'h',snapshot:{},engine:'coloring',ageRange:'2-3'};
test('Infantil available without expiry',()=>assert.equal(available(base,Date.parse('2030-01-01')),true));
test('future, cancelled and expired fail closed',()=>{assert(!available(base,Date.parse('2026-01-01')));assert(!available({...base,cancelled_at:'now'}));assert(!available({...base,ends_at:'2026-11-08T10:00:00Z'},Date.parse('2026-11-08T10:00:00Z')));});
test('invalid window fails closed',()=>assert(!available({...base,starts_at:'bad'})));
test('explicit age and no expiry enforced',()=>{assert.throws(()=>validateAssignment({...base,ageRange:null}));assert.throws(()=>validateAssignment({...base,ends_at:'2030-01-01'}));assert.equal(validateAssignment(base),base);});
test('fingerprint changes on class revision cancellation range',()=>{for(const key of ['class_id','revision_id','cancelled_at','ageRange'])assert.notEqual(assignmentFingerprint(base),assignmentFingerprint({...base,[key]:'changed'}));});
test('snapshot byte identity verified and engine normalized',async()=>{const json='{"type":"coloring"}';const row=await hydrateSnapshot({snapshot_json:json,source_sha256:sha(json),engine:'colorir'});assert.equal(row.engine,'coloring');assert.equal(row.snapshot.type,'coloring');await assert.rejects(hydrateSnapshot({snapshot_json:json+' ',source_sha256:sha(json)}));});
test('escape html',()=>assert.equal(escapeHtml('<a "x">&'), '&lt;a &quot;x&quot;&gt;&amp;'));
test('timezone explicit and DST gaps rejected',()=>{assert.equal(localDeadlineToUtc('2026-11-08T10:00','America/Sao_Paulo'),'2026-11-08T13:00:00.000Z');assert.throws(()=>localDeadlineToUtc('2026-03-08T02:30','America/New_York'));assert.throws(()=>localDeadlineToUtc('2026-11-01T01:30','America/New_York'));});
test('approved immutable source manifest verifies all copied assets',()=>{const m=JSON.parse(readFileSync(resolve(root,'mission-runtime/runtime-copy-manifest.json')));assert.equal(m.files.length,1137);let changed=0;for(const e of m.files){assert.equal(sha(readFileSync(resolve(root,'mission-runtime',e.file))),e.sha256,e.file);if(!e.unchanged)changed++;else assert.equal(e.sha256,e.source_sha256);}assert.equal(changed,6);});
test('build manifest has four explicit baseline overrides and no test fixtures',()=>{const m=JSON.parse(readFileSync(resolve(root,'scripts/mission-runtime-manifest.json')));assert.deepEqual(m.overrides.map(o=>o.file),['app-pages.js','missao.html','colorir-descobrir.html','login.js']);assert.equal(m.overrides[0].file,'app-pages.js');const baseline=JSON.parse(readFileSync(resolve(root,'scripts/static-runtime-manifest.json')));for(const e of m.overrides){assert.equal(e.original_sha256,baseline.find(b=>b.file===e.file)?.sha256);assert.equal(sha(readFileSync(resolve(root,e.file))),e.sha256);}for(const e of m.files){assert(!e.file.includes('/tests/'));assert(!e.file.endsWith('runtime-copy-manifest.json'));assert.equal(sha(readFileSync(resolve(root,e.file))),e.sha256);}assert(!existsSync(resolve(root,'dist/tests')));});
test('official module has no browser storage or revoked editor RPC',()=>{const s=readFileSync(resolve(root,'mission-runtime/institutional.mjs'),'utf8');assert(!/localStorage\.|sessionStorage\./.test(s));assert(!s.includes('mission_teacher_publish_revision_v1'));assert(s.includes('mission-publish-revision'));assert(s.includes('p_week:week'));});
test('late artwork ACK cannot change another activity version',async()=>{
 const source=readFileSync(resolve(root,'mission-runtime/institutional.mjs'),'utf8');const line=source.split('\n').find(x=>x.includes('artQueue=artQueue.then'));const body=line.slice(line.indexOf('artQueue=artQueue.then(async()=>{')+'artQueue=artQueue.then(async()=>{'.length,line.lastIndexOf('});}'));
 let release,active={},artVersion=2;const a=active;a.pendingArt=1;const current=()=>true,r={id:'A'},data={painting:{},sequence:1},scope='mission-A',send=()=>assert.fail('stale ACK'),call=()=>new Promise(r=>release=r);
 const execute=eval('(async()=>{'+body+'})');const pending=execute();active={};artVersion=7;release({version:3});await pending;assert.equal(artVersion,7);assert.equal(a.pendingArt,0);
});
test('leave guard confirms pending or failed paint and dirty or saving plans',()=>{
 const source=readFileSync(resolve(root,'mission-runtime/institutional.mjs'),'utf8');const body=source.match(/const canLeave=\(\)=>\{([^\n]+)\};/)[1];let mode='student',dirty=false,savePending=null,active=null,asked=0;const window={confirm:()=>{asked++;return false;}};const check=eval('(()=>{'+body+'})');assert(check());active={pendingArt:1};assert(!check());active={pendingArt:0,artError:true};assert(!check());active=null;mode='teacher';dirty=true;assert(!check());dirty=false;savePending=Promise.resolve();assert(!check());savePending=null;assert(check());assert.equal(asked,4);
 const shell=readFileSync(resolve(root,'app-pages.js'),'utf8');assert(shell.indexOf('!missionHost.missionCanLeave()')<shell.indexOf('activeTeacherView = normalizedView;'));
});

test('print injection only eligible canonical roles',()=>{const shell=readFileSync(resolve(root,'app-pages.js'),'utf8');assert(shell.includes('["professor", "aluno", "educacao_infantil"].includes(getCurrentPlatformRole()) && !root.querySelector("[data-institutional-mission]")'));});

// Real production callback regression: JSONB arrays must not collapse to row zero.
test('production adapter preserves direct RPC shapes and session/error guards',async()=>{
 const {platformAdapter}=await import('./platform-adapter.mjs');
 const source=readFileSync(resolve(root,'app-pages.js'),'utf8');
 let identity='teacher:1',payload,fail=false,change=false,requests=0;
 const rpc=platformAdapter(source,{
  missionSessionIdentity:()=>identity,getPlatformSession:()=>({userId:'teacher:1'}),
  createSupabaseRestClient:()=>({request:async(path,_q,opts)=>{requests++;assert.equal(path,'rpc/mission_teacher_classes_v1');assert.equal(opts.requireAuthenticated,true);if(fail)throw Error('RPC_FAILED');if(change)identity='teacher:2';return payload;}})
 });
 for(const value of [[],[{id:'one'}],[{id:'one'},{id:'two'}],Array.from({length:8},(_,i)=>({id:String(i)})),{id:'one',version:2},null]){payload=value;const result=await rpc('mission_teacher_classes_v1',{});assert.strictEqual(result.data,value);}
 fail=true;await assert.rejects(rpc('mission_teacher_classes_v1',{}),/RPC_FAILED/);fail=false;
 change=true;await assert.rejects(rpc('mission_teacher_classes_v1',{}),/Sessão alterada/);change=false;
 identity=null;const count=requests;await assert.rejects(rpc('mission_teacher_classes_v1',{}),/Sessão necessária/);assert.equal(requests,count);
});

test('game hub retains four game cards without duplicated coloring galleries or player injection',()=>{
 const source=readFileSync(resolve(root,'app-pages.js'),'utf8');
 const start=source.indexOf('const renderGamesModule ='),end=source.indexOf('\nconst modules =',start),module=source.slice(start,end);
 const render=Function('getRequestedGameId','getCurrentPlatformRole','isContentGovernanceRequired','isContentGovernanceReady','officialSchoolGameIds','isContentAvailableToSession','renderStudentOfficialGameCards','isStudentEarlyChildhoodContext',module+';return renderGamesModule;');
 const ids=['caixa-misteriosa','organizando-cesta','jardim-descobertas','atelie-bia'];
 for(const role of ['aluno','educacao_infantil'])for(const infant of [true,false])for(const requested of ['',...ids]){
 const html=render(()=>requested,()=>role,()=>false,()=>true,ids,()=>true,()=>ids.map(id=>'<a href="jogos.html?game='+id+'">'+id+'</a>').join(''),()=>infant)();
 assert.equal(html.includes('data-institutional-mission="discovery"'),false);
 assert.equal(html.includes('data-student-discovery-slot'),false);
 if(!requested)for(const id of ids)assert(html.includes('jogos.html?game='+id));else assert(html.includes('data-game-id="'+requested+'"'));
 }
});

test('real page initialization calls institutional mount after route HTML insertion',()=>{
 const source=readFileSync(resolve(root,'app-pages.js'),'utf8');const start=source.indexOf('const renderAppPage =');const body=source.slice(start,source.indexOf('const missionSessionIdentity',start));assert(start>0);assert(body.indexOf('${routeHtml}')>=0);assert(body.indexOf('initInstitutionalMissions();')>body.indexOf('${routeHtml}'));
});


test('themes group independently from activity ids and preserve approved order',async()=>{
 const {groupColoringThemes,themeForActivity}=await import('../../mission-runtime/coloring/themes.mjs');
 const activities=JSON.parse(readFileSync(resolve(root,'mission-runtime/coloring/catalog.json')));
 const rows=activities.map((snapshot,i)=>({id:'revision-'+i,snapshot}));
 let themes=groupColoringThemes(rows);assert.equal(themes.length,8);assert.deepEqual(themes.map(t=>t.label),['Perto de nós','Floresta','Bichinhos que voam','Bichinhos do mar','Frutas','Legumes','Selva','Números']);
 const future={...activities[0],id:'future-drawing',title:'Synthetic future drawing',themeId:'perto-de-nos'};
 themes=groupColoringThemes([...rows,{id:'future',snapshot:{coloring:future}}]);assert.equal(themes.length,8);assert.equal(themes[0].activities.length,2);assert.equal(themes[0].activities[1].id,'future');assert.equal(themeForActivity({...future,themeId:'unknown'}),null);
 assert.equal(groupColoringThemes([]).length,0);assert.equal(groupColoringThemes(rows.slice(3,4))[0].id,'bichinhos-do-mar');
});
test('new tab keeps the coloring gallery and authorized legacy route fallback',()=>{
 const source=readFileSync(resolve(root,'app-pages.js'),'utf8');
 assert(source.includes('colorirDescobrir: ["aluno", "educacao_infantil", "escola", "admin"]'));
 assert(source.includes('const studentAllowedRouteKeys = new Set(["colorirDescobrir",'));
 const start=source.indexOf('  colorirDescobrir: {'),end=source.indexOf('  perfil: {',start),getter=source.slice(start,end);
 assert(getter.includes('["aluno", "educacao_infantil"]'));assert(getter.includes('data-student-discovery-slot'));assert(getter.includes('window.renderColorirDescobrirApp'));
 const entry=readFileSync(resolve(root,'colorir-descobrir.html'),'utf8');assert(entry.indexOf('src="supabase-config.js"')<entry.indexOf('src="app-pages.js'));
});

test('full-screen theme home retains a way back to the platform',async()=>{
 const {discoveryMarkup}=await import('../../mission-runtime/coloring/discovery.mjs');
 const markup=discoveryMarkup([],{homeHref:'/aluno'});assert(markup.includes('href="/aluno"'));assert(markup.includes('← Início'));assert(!discoveryMarkup([]).includes('discovery-exit'));
});
