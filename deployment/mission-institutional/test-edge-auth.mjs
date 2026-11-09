import assert from 'node:assert/strict';import{createHandler}from './edge/handler.ts';import{sha256}from './edge/hash.ts';
const teacher='00000000-0000-4000-8000-000000000001',draftId='00000000-0000-4000-8000-000000000002';
const raw='{"id":"synthetic"}',hash=await sha256(raw),env={url:'https://synthetic.invalid',anonKey:'SYNTHETIC_PUBLIC',serviceKey:'SYNTHETIC_SERVICE'};
let tests=0;
async function run(config={}){const calls=[],draft={id:draftId,teacher_auth_id:teacher,snapshot_json:raw,source_sha256:hash,base_snapshot_json:raw,base_source_sha256:hash,engine:'quiz',...(config.draft||{})};
 const fake=async(url,options)=>{calls.push({url,options});if(url.endsWith('/auth/v1/user'))return Response.json({id:teacher,is_anonymous:!!config.anonymous},{status:config.authStatus||200});if(url.endsWith('mission_teacher_get_draft_for_publish_v1'))return Response.json(draft,{status:config.draftStatus||200});return Response.json({id:'published',snapshot_json:raw},{status:config.finalStatus||200})};
 const validator=async()=>{if(config.validationError)throw Object.assign(Error('ENGINE_VALIDATION_FAILED'),{issues:[{path:'questions',message:'Invalid relation'}]});return{source_json:raw,content_hash:hash}};
 const handle=createHandler(env,fake,validator),headers={'Content-Type':'application/json',...(!config.noToken?{Authorization:'Bearer SYNTHETIC_USER_TOKEN'}:{}),...(config.origin?{Origin:config.origin}:{})};
 const response=await handle(new Request('https://edge.invalid',{method:config.method||'POST',headers,body:JSON.stringify(config.body||{draft_id:draftId})}));return{response,calls,body:await response.json()}}
async function check(name,config,status,count){const r=await run(config);assert.equal(r.response.status,status);assert.equal(r.calls.length,count);assert.ok(!JSON.stringify(r.body).includes(env.serviceKey));tests++;console.log('PASS',name);return r}
await check('missing token', {noToken:true},401,0);await check('invalid token',{authStatus:401},401,1);await check('anonymous user',{anonymous:true},401,1);
await check('other origin',{origin:'https://attacker.invalid'},403,0);await check('wrong body identity',{body:{draft_id:draftId,teacher_id:teacher}},400,1);
await check('oversized request',{body:{draft_id:draftId,extra:'x'.repeat(5000)}},413,1);
await check('cross class denied by user-scoped RPC',{draftStatus:403},403,2);await check('cross owner response denied',{draft:{teacher_auth_id:draftId}},403,2);
await check('draft digest mismatch',{draft:{source_sha256:'0'.repeat(64)}},409,2);await check('base digest mismatch',{draft:{base_source_sha256:'0'.repeat(64)}},409,2);
await check('reviewed digest mismatch',{body:{draft_id:draftId,expected_draft_sha256:'0'.repeat(64)}},409,2);
await check('engine relation failure never finalizes',{validationError:true},422,2);await check('late finalizer rejection',{finalStatus:403},409,3);
const good=await check('valid publication forwards verified identity',{},200,3);assert.equal(good.calls[1].options.headers.Authorization,'Bearer SYNTHETIC_USER_TOKEN');assert.equal(good.calls[2].options.headers.Authorization,'Bearer SYNTHETIC_SERVICE');const args=JSON.parse(good.calls[2].options.body);assert.equal(args.p_teacher_auth_id,teacher);assert.equal(args.p_draft_sha256,hash);assert.equal(args.p_base_sha256,hash);
console.log(JSON.stringify({tests,networkCalls:0,usesMockEngineValidator:true,note:'HTTP/auth orchestration only. Full engine tests separate.'}));
