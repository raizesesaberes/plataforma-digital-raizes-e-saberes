import test from 'node:test';import assert from 'node:assert/strict';import pg from 'pg';import {checkedPool,SESSION_SQL} from './runtime.mjs';import entry from './api/ingest.mjs';
const identity={session_user:'enem_ingest_runtime',current_user:'enem_ingest_runtime',database:'postgres',rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolbypassrls:false,rolreplication:false};
for(const fail of [false,true])test('real pg Pool acquisition/release, simulated transport fail='+fail,async()=>{
 let ended=0,queries=0;
 class LocalClient extends pg.Client{
  constructor(o){super(o);this.connection.stream={encrypted:true,authorized:true};}
  connect(callback){callback(null);if(fail)this.emit('error',Error('SYNTHETIC_PRIVATE_FATAL'));}
  query(q){queries++;return Promise.resolve({rows:q.text===SESSION_SQL?[identity]:[]});}
  end(callback){ended++;this.emit('end');callback?.();}
 }
 const pool=new pg.Pool({Client:LocalClient,max:1});pool.on('error',()=>{});const checked=checkedPool(pool);
 try{if(fail){await assert.rejects(checked.query({text:'gateway'}),/DB_CONNECTION_UNCONFIRMED/);assert.equal(queries,0);assert.equal(pool.totalCount,0);assert.equal(ended,1);}else{await checked.query({text:'gateway'});assert.equal(queries,2);assert.equal(pool.idleCount,1);}}
 finally{await pool.end();}
});
test('real driver entrypoint denies unauthenticated request without database config',async()=>{const r=await entry.fetch(new Request('https://fixture.example/api/ingest',{method:'POST'}));assert.equal(r.status,401);});
