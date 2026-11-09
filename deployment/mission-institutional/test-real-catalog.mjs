import{PGlite}from'@electric-sql/pglite';import{readFileSync}from'node:fs';import assert from'node:assert/strict';import{createHash}from'node:crypto';
const db=new PGlite(),u=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;let checks=0;
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
create table content_items(id uuid primary key,content_type text,owner_scope text,editorial_status text,published_at timestamptz,metadata jsonb);create table profiles(id uuid primary key,platform_role text,status text);create table schools(id uuid primary key,status text);
create table teachers(id uuid primary key,profile_id uuid,school_id uuid,status text);create table classes(id uuid primary key,school_id uuid,nome text,ano_escolar text,status text);
create table school_memberships(profile_id uuid,school_id uuid,status text,started_at timestamptz,ended_at timestamptz);
create table class_teacher_memberships(teacher_id uuid,class_id uuid,status text,started_at timestamptz,ended_at timestamptz);
create table students(id uuid primary key,user_id uuid,status text);create table enrollments(student_id uuid,class_id uuid,school_id uuid,status text,enrolled_at timestamptz,ended_at timestamptz);
create table content_segments(id uuid primary key,code text,status text);create table content_grades(id uuid primary key,segment_id uuid,code text,status text);create table content_grade_aliases(grade_id uuid,alias_code text);
create function public.rs_content_normalize_code(text) returns text language sql immutable as $$select $1$$;`);
await db.exec(readFileSync(new URL('./mission_institutional.v2.review.sql',import.meta.url),'utf8'));console.log('PASS SQL compilation');checks++;
const t=u(1),st=u(2),out=u(3),school=u(10),cls=u(20),ei=u(21),rev=u(40),color=u(41);const source=' {"id":"test","template":"quiz","grade":"1º ano","title":"Original","questions":[{"id":"q1","prompt":"One?","correctOptionId":"a"}]} ';
await db.exec(`insert into profiles values('${t}','professor','active');insert into schools values('${school}','active');insert into teachers values('${u(30)}','${t}','${school}','active');insert into classes values('${cls}','${school}','1','1_ANO','active'),('${ei}','${school}','EI','EI4','active');insert into school_memberships values('${t}','${school}','active',now()-interval '1 day',null);insert into class_teacher_memberships values('${u(30)}','${cls}','active',now()-interval '1 day',null),('${u(30)}','${ei}','active',now()-interval '1 day',null);insert into students values('${u(31)}','${st}','active');insert into enrollments values('${u(31)}','${cls}','${school}','active',now()-interval '1 day',null),('${u(31)}','${ei}','${school}','active',now()-interval '1 day',null);insert into content_segments values('${u(50)}','FUNDAMENTAL','active'),('${u(51)}','EDUCACAO_INFANTIL','active');insert into content_grades values('${u(52)}','${u(50)}','1_ANO','active'),('${u(53)}','${u(51)}','EI4','active');insert into content_grade_aliases values('${u(52)}','1_ANO'),('${u(53)}','EI4');`);
for(const[id,key,engine,grade,ages,raw]of[[rev,'test','quiz','1',[],source],[color,'color','colorir','infantil',['2-3','4-5'],'{"id":"color","type":"coloring","title":"Color"}']]){const hash=createHash('sha256').update(raw).digest('hex');await db.query('insert into mission_private.revisions(id,activity_key,revision,title,engine,grade,age_ranges,source_json,content_hash,source_sha256,published) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,true)',[id,key,'1',key,engine,grade,ages,raw,hash]);}
async function as(user,fn){await db.exec('begin;set local role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,true)",[user]);try{const v=await fn();await db.exec('commit');return v}catch(e){await db.exec('rollback');throw e}}
async function rpc(name,args=[]){return(await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) value`,args)).rows[0].value}
async function test(name,fn){await fn();console.log('PASS',name);checks++}async function no(name,fn,rx){await test(name,()=>assert.rejects(fn,rx))}
const start=new Date(Date.now()-60000).toISOString(),end=new Date(Date.now()+86400000).toISOString();const assign=(r=rev,c=cls,k=u(100),en=end,age=null)=>as(t,()=>rpc('mission_teacher_assign_v1',[c,r,start,en,'America/Sao_Paulo',k,age]));let a,ca;

await test('release disabled by default',async()=>{await assert.rejects(()=>assign(),/MISSION_INSTITUTIONAL_RELEASE_BLOCKED/);assert.equal((await as(st,()=>rpc('mission_student_list_v1'))).length,0);await assert.rejects(()=>as(t,()=>db.query('update mission_private.release_control set enabled=true')),/permission denied/)});
await db.exec("update mission_private.release_control set enabled=true,reason='SYNTHETIC TEST ONLY'");
const {validateRevision}=await import('./edge/validate.ts');
await db.exec(readFileSync(new URL('./catalog-seed.review.sql',import.meta.url),'utf8'));
const rows=(await db.query("select * from mission_private.revisions where activity_key not in('test','color') order by activity_key")).rows;assert.equal(rows.length,397);
// Only synthetic editorial fixtures; natural source IDs are public catalogue provenance.
const bindingAudit=JSON.parse(readFileSync(new URL('./provenance-binding-audit.json',import.meta.url),'utf8'));
for(const [i,b] of bindingAudit.bindings.entries())await db.query('insert into public.content_items values($1,$2,$3,$4,now(),$5)',[u(9000+i),'BOOK','GLOBAL_RAIZES','PUBLISHED',{official_edition:{source_id:b.source}}]);
await db.exec(readFileSync(new URL('./source-bindings.review.sql',import.meta.url),'utf8'));
await db.exec(readFileSync(new URL('./source-bindings.review.sql',import.meta.url),'utf8'));
assert.equal(Number((await db.query('select count(*) n from mission_private.source_bindings')).rows[0].n),227);
await assert.rejects(()=>db.query("update mission_private.source_bindings set source_reference='changed'"),/MISSION_IMMUTABLE/);
await assert.rejects(()=>as(t,()=>db.query('select * from mission_private.source_bindings')),/permission denied/);
console.log('PASS 227 source bindings resolve natural editorial identities, replay safely and remain immutable/private');
const errors=[];let valid=0;for(const r of rows){try{const v=await validateRevision(r.source_json,r.source_json,r.engine);assert.equal(v.content_hash,r.content_hash);valid++;}catch(e){errors.push({id:r.activity_key,engine:r.engine,message:e.message,issues:e.issues})}}
console.log(JSON.stringify({total:rows.length,valid,errors,unknownGrade:rows.filter(x=>x.grade===null).length},null,2));assert.equal(errors.length,0);
let semanticChecks=0;const by=(engine,predicate=()=>true)=>rows.find(r=>r.engine===engine&&predicate(JSON.parse(r.source_json)));
async function mutation(label,r,change,good=true){const edit=JSON.parse(r.source_json);change(edit);if(good){await validateRevision(r.source_json,JSON.stringify(edit),r.engine)}else await assert.rejects(()=>validateRevision(r.source_json,JSON.stringify(edit),r.engine));console.log('PASS',label);checks++;semanticChecks++;}
await mutation('quiz alternative text editable',by('quiz'),x=>x.questions[0].options[0].label='Outra resposta autorizada');
await mutation('quiz duplicate alternatives rejected',by('quiz'),x=>x.questions[0].options[0].label=x.questions[0].options[1].label,false);
await mutation('quiz answer reference editable to existing option',by('quiz'),x=>x.questions[0].correctOptionId=x.questions[0].options[1].id);
await mutation('quiz absent answer reference rejected',by('quiz'),x=>x.questions[0].correctOptionId='nonexistent',false);
await mutation('memory both identical faces editable',by('memory',x=>x.memoryMode==='identical'),x=>{x.pairs[0].left.label='Nova dupla';x.pairs[0].right.label='Nova dupla'});
await mutation('memory broken identical pair rejected',by('memory',x=>x.memoryMode==='identical'),x=>x.pairs[0].left.label='Só um lado',false);
await mutation('relational labels editable',by('association'),x=>x.pairs[0].left.label='Novo conceito');
await mutation('sequence duplicate labels rejected',by('sequence'),x=>x.items[0].label=x.items[1].label,false);
await mutation('classification item labels editable',by('classification'),x=>x.items[0].label='Item novo');
await mutation('classification foreign category rejected',by('classification'),x=>x.items[0].categoryId='missing-category',false);
await mutation('word-search clue editable',by('word-search'),x=>x.words[0].clue='Nova pista');
await mutation('word-search word without matching grid rejected',by('word-search'),x=>x.words[0].word='ZZZZZZZZZZZZ',false);
await mutation('crossword clue editable',by('crossword'),x=>x.entries[0].clue='Nova pista autoral');
await mutation('crossword out of bounds rejected',by('crossword'),x=>x.entries[0].row=11,false);
await mutation('puzzle caption editable',by('puzzle'),x=>x.pieces[0].label='Nova legenda');
await mutation('puzzle duplicate slots rejected',by('puzzle'),x=>x.pieces[0].slot=x.pieces[1].slot,false);
await mutation('completion answers and matching choices editable',by('completion',x=>x.blanks[0].options),x=>{x.blanks[0].answers=['resposta nova'];x.blanks[0].options[0].label='resposta nova'});
await mutation('completion answers without matching option rejected',by('completion',x=>x.blanks[0].options),x=>x.blanks[0].answers=['nunca existe'],false);
await mutation('trail prompt editable',by('trail'),x=>x.nodes[0].prompt='Novo desafio');
await mutation('grade identity cannot be changed',by('quiz'),x=>x.grade='9º ano',false);
await mutation('Colorir narration editable and rehashed',by('colorir'),x=>x.script.welcome='Olá! Vamos descobrir este animal?');
await mutation('Colorir artwork cannot be replaced implicitly',by('colorir'),x=>x.art='art/outro.png',false);
await mutation('Colorir age ranges cannot be changed implicitly',by('colorir'),x=>x.ageRanges=['4-5'],false);
await mutation('unknown runtime asset reference rejected',by('quiz'),x=>x.questions[0].image={src:'rsplay-asset:unknown',alt:'Imagem'},false);
await mutation('external image rejected',by('quiz'),x=>x.questions[0].image={src:'https://attacker.invalid/p.png',alt:'Imagem'},false);
await mutation('unknown metadata field rejected',by('quiz'),x=>x.metadata={approved:true},false);
await mutation('unknown prototype key rejected',by('quiz'),x=>Object.defineProperty(x,'__proto__',{value:{admin:true},enumerable:true}),false);
await mutation('constructor key rejected',by('quiz'),x=>Object.defineProperty(x,'constructor',{value:'malicious',enumerable:true}),false);
await mutation('unpersisted parser transformations rejected',by('quiz'),x=>x.title='  needs trimming  ',false);
await mutation('plain math text remains safe editable text',by('quiz'),x=>x.questions[0].prompt='Compare: 2 < 3.');
const realQuiz=rows.find(r=>r.engine==='quiz'&&r.grade==='1');const assigned=await as(t,()=>rpc('mission_teacher_assign_v1',[cls,realQuiz.id,start,end,'America/Sao_Paulo',u(950),null]));assert.equal((await as(st,()=>rpc('mission_student_open_v1',[assigned.id]))).source_sha256,realQuiz.source_sha256);
for(const r of rows.filter(r=>r.engine==='colorir')){for(const age of ['2-3','4-5']){const a=await as(t,()=>rpc('mission_teacher_assign_v1',[ei,r.id,start,null,'America/Sao_Paulo',crypto.randomUUID(),age]));assert.equal(a.ends_at,null);assert.equal(a.ageRange,age);assert.equal(a.xp_enabled,false)}}
console.log(JSON.stringify({all397Valid:true,semanticMutations:semanticChecks,realContentSyntheticAssignments:17,remoteWrites:false}));

const {createHandler}=await import('./edge/handler.ts');
async function serviceCall(name,args){await db.exec('begin;set local role service_role');try{const r=await rpc(name,args);await db.exec('commit');return r}catch(e){await db.exec('rollback');throw e}}
const fetchToLocalDB=async(url,opts)=>{if(url.endsWith('/auth/v1/user'))return Response.json({id:t,is_anonymous:false});const name=url.split('/').at(-1),args=JSON.parse(opts.body);try{
 if(name==='mission_teacher_get_draft_for_publish_v1')return Response.json(await as(t,()=>rpc(name,[args.p_draft_id])));
 if(name==='mission_service_finalize_revision_v1'){assert.equal(opts.headers.Authorization,'Bearer SYNTHETIC_SERVICE');return Response.json(await serviceCall(name,[args.p_teacher_auth_id,args.p_draft_id,args.p_draft_sha256,args.p_base_sha256,args.p_source_json,args.p_content_hash]));}
 throw Error('unexpected endpoint');}catch(e){return Response.json({error:e.message},{status:403})}};
const handler=createHandler({url:'https://synthetic.invalid',anonKey:'SYNTHETIC_PUBLIC',serviceKey:'SYNTHETIC_SERVICE'},fetchToLocalDB,validateRevision);
let ownCount=0;
for(const r of rows.filter(r=>['1','infantil'].includes(r.grade)).filter((r,i,all)=>all.findIndex(x=>x.engine===r.engine)===i)){
 const edit=JSON.parse(r.source_json);edit.title+=' — versão autoral';const classId=r.grade==='infantil'?ei:cls;
 const draft=await as(t,()=>rpc('mission_teacher_save_revision_v1',[classId,r.id,JSON.stringify(edit),crypto.randomUUID()]));
 const request=()=>new Request('https://edge.invalid',{method:'POST',headers:{Authorization:'Bearer SYNTHETIC_USER','Content-Type':'application/json'},body:JSON.stringify({draft_id:draft.id,expected_draft_sha256:draft.source_sha256})});
 const response=await handler(request());const published=await response.json();assert.equal(response.status,200,JSON.stringify(published));assert.equal(published.review_status,'teacher_authored');
 const replay=await handler(request());assert.equal((await replay.json()).id,published.id);
 const assigned=await as(t,()=>rpc('mission_teacher_assign_v1',[classId,published.id,start,r.grade==='infantil'?null:end,'America/Sao_Paulo',crypto.randomUUID(),r.engine==='colorir'?'2-3':null]));
 const opened=await as(st,()=>rpc('mission_student_open_v1',[assigned.id]));assert.equal(opened.source_sha256,published.source_sha256);assert.equal(JSON.parse(opened.snapshot_json).title,edit.title);assert.equal(opened.xp_enabled,false);
 const original=(await db.query('select source_json from mission_private.revisions where id=$1',[r.id])).rows[0].source_json;assert.equal(original,r.source_json);ownCount++;console.log('PASS actual Edge + SQL author publication '+r.engine);
}
console.log(JSON.stringify({integratedEdgeSQLAuthorPublications:ownCount,realCatalogRows:397,remoteWrites:false,authIssuerMocked:true}));await db.close();
