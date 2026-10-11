// Offline comparison only. Input is the metadata JSON returned by package_metadata_readonly.sql.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
const [stage,observedPath]=process.argv.slice(2);
const index=JSON.parse(readFileSync('qa/fase3/manifests/index.json'));
const expectedEntry=index.stages.find(x=>x.stage===stage);assert.ok(expectedEntry,'Unknown approved checkpoint');
const digest=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(digest(expectedEntry.file),expectedEntry.sha256,'Manifest hash changed');
assert.equal(digest(index.query.file),index.query.sha256,'Metadata query hash changed');
for(const extra of [index.versionQuery,index.approvedCombinedPreflight])assert.equal(digest(extra.file),extra.sha256,'Review query hash changed');
for(const proposal of index.proposals)assert.equal(digest(proposal.file),proposal.sha256,'SQL source hash changed');
const expected=JSON.parse(readFileSync(expectedEntry.file)).metadata;
const parsed=JSON.parse(readFileSync(observedPath));const actual=parsed.metadata||parsed;
const changes=[];
for(const kind of ['functions','relations','schemas']){
 for(const name of new Set([...Object.keys(expected[kind]),...Object.keys(actual[kind]||{})])){
  if(!isDeepStrictEqual(expected[kind][name],actual[kind]?.[name]))changes.push(`${kind}:${name}`);
 }
}
if(changes.length){console.error('STOP metadata drift: '+changes.join(', '));process.exitCode=1;}
else console.log(`PASS ${stage}: exact scoped functions, table RLS/ACL/columns/policies/indexes/triggers, schemas; ledger still requires separate readonly check`);
