// Validate SELECT syntax/observations against virtual VALUES, never a migration ledger.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
export function checkVersionQuery(query){
 const source=readFileSync('supabase/review/package_versions_readonly.sql','utf8');
 const cases=[
  {name:'absent',rows:[],entries:'0',names:'t',prefix:'t'},
  {name:'approved-prefix',rows:[['20261011060001','fase3_assessment_authorization'],['20261011060002','fase3_communication_replies']],entries:'2',names:'t',prefix:'t'},
  {name:'conflicting-name',rows:[['20261011060001','different_package']],entries:'1',names:'f',prefix:'t'},
  {name:'gap',rows:[['20261011060004','contract_operations']],entries:'1',names:'t',prefix:'f'},
 ];
 for(const c of cases){
  const values=c.rows.length?'VALUES '+c.rows.map(([v,n])=>`('${v}'::text,'${n}'::text)`).join(','):'SELECT null::text,null::text WHERE false';
  const simulation=source.replaceAll('supabase_migrations.schema_migrations','virtual_ledger').replaceAll('WITH proposed(',`WITH virtual_ledger(version,name) AS (${values}), proposed(`);
  const lines=query(simulation).trim().split('\n').filter(x=>x!=='BEGIN'&&x!=='ROLLBACK');
  assert.equal(lines.length,5);const summary=lines.at(-1).split('|');
  // Deliberately no fake149-history: original-ledger check MUST remain false.
  assert.equal(summary[0],'f');assert.equal(summary[4],c.entries);assert.equal(summary[5],c.names);assert.equal(summary[6],c.prefix);
  if(c.name==='absent')assert.ok(lines.slice(0,4).every(x=>x.includes('ABSENT_NOT_RESERVED')));
  if(c.name==='conflicting-name')assert.ok(lines[0].includes('CONFLICT_STOP'));
 }
 writeFileSync('qa/fase3/manifests/version-query-checks.json',JSON.stringify({scope:'Virtual VALUES only; no real migration ledger created, read or written',checks:cases.map(c=>({name:c.name,status:'PASS'})),original149NeverFaked:true},null,2)+'\n');
 console.log('PASS version SELECTs: absent, approved prefix, conflicting name and gap; no ledger writes');
}
