// Catalog metadata only. No user rows, credentials, ledger writes or production connection.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
export const proposals=[
 ['20261011060001','fase3_assessment_authorization'],
 ['20261011060002','fase3_communication_replies'],
 ['20261011060003','fase3_notice_editing'],
 ['20261011060004','contract_operations'],
];
const relations=['assessments','assessment_questions','assessment_assignments','communications','communication_deliveries','communication_replies','communication_revisions','communication_revision_reads','contracts','contract_products','contract_entitlement_events','tenant_product_entitlements','tenant_product_content_modules'].map(x=>'public.'+x).concat('contract_operations_private.targets');
const names=new Set();
for(const [,name] of proposals){const sql=readFileSync(`supabase/review/${name}.sql`,'utf8');for(const m of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w.]+)/gi))names.add(m[1].split('.').at(-1));for(const m of sql.matchAll(/"proname":"([\w]+)"/g))names.add(m[1]);}
for(const name of ['institutional_touch_updated_at','school_content_assert_admin','avalia_plus_assignment_is_open'])names.add(name);
const quote=x=>"'"+x.replaceAll("'","''")+"'";
export const manifestQuery=`WITH
roles(role) AS (VALUES ('anon'),('authenticated'),('service_role')),
functions AS (
 SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' key,
 jsonb_build_object('body_md5',md5(p.prosrc),'definition_md5',md5(pg_get_functiondef(p.oid)),
 'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl::text,
 'execute',(SELECT jsonb_object_agg(role,has_function_privilege(role,p.oid,'EXECUTE')) FROM roles)) value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','school_category_private','contract_operations_private') AND p.proname IN (${[...names].sort().map(quote).join(',')})
), relations AS (
 SELECT n.nspname||'.'||c.relname key,jsonb_build_object('owner',pg_get_userbyid(c.relowner),
 'rls',c.relrowsecurity,'force_rls',c.relforcerowsecurity,'acl',c.relacl::text,
 'privileges',(SELECT jsonb_object_agg(role,jsonb_build_object('select',has_table_privilege(role,c.oid,'SELECT'),'insert',has_table_privilege(role,c.oid,'INSERT'),'update',has_table_privilege(role,c.oid,'UPDATE'),'delete',has_table_privilege(role,c.oid,'DELETE'),'truncate',has_table_privilege(role,c.oid,'TRUNCATE'),'references',has_table_privilege(role,c.oid,'REFERENCES'),'trigger',has_table_privilege(role,c.oid,'TRIGGER'))) FROM roles),
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'acl',a.attacl::text,'default',pg_get_expr(d.adbin,d.adrelid)) ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',pol.polname,'permissive',pol.polpermissive,'command',pol.polcmd,'roles',(SELECT jsonb_agg(CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x)::text END ORDER BY x) FROM unnest(pol.polroles)x),'using',pg_get_expr(pol.polqual,pol.polrelid),'check',pg_get_expr(pol.polwithcheck,pol.polrelid)) ORDER BY pol.polname),'[]'::jsonb) FROM pg_policy pol WHERE pol.polrelid=c.oid),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',con.conname,'definition',pg_get_constraintdef(con.oid,true),'validated',con.convalidated) ORDER BY con.conname),'[]'::jsonb) FROM pg_constraint con WHERE con.conrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(pg_get_indexdef(i.indexrelid) ORDER BY ic.relname),'[]'::jsonb) FROM pg_index i JOIN pg_class ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)) value
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname||'.'||c.relname IN (${relations.map(quote).join(',')})
), schemas AS (
 SELECT n.nspname key,jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',n.nspacl::text,
 'privileges',(SELECT jsonb_object_agg(role,jsonb_build_object('usage',has_schema_privilege(role,n.oid,'USAGE'),'create',has_schema_privilege(role,n.oid,'CREATE'))) FROM roles)) value
 FROM pg_namespace n WHERE n.nspname IN ('public','school_category_private','contract_operations_private')
)
SELECT jsonb_build_object('functions',coalesce((SELECT jsonb_object_agg(key,value) FROM functions),'{}'::jsonb),'relations',coalesce((SELECT jsonb_object_agg(key,value) FROM relations),'{}'::jsonb),'schemas',coalesce((SELECT jsonb_object_agg(key,value) FROM schemas),'{}'::jsonb));`;
export function recordStage(stage,query){
 mkdirSync('qa/fase3/manifests',{recursive:true});
 const metadata=JSON.parse(query(manifestQuery));
 writeFileSync(`qa/fase3/manifests/${stage}.json`,JSON.stringify({scope:'Synthetic expected metadata; not production attestation',stage,metadata},null,2)+'\n');
 console.log(`MANIFEST ${stage}: ${Object.keys(metadata.functions).length} functions; ${Object.keys(metadata.relations).length} tables`);
}
export function writeManifestIndex(){
 const stages=['00_before','01_after_pr2','02_after_pr3','03_after_pr4','04_after_pr1'];
 const sha=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
 const file='supabase/review/package_metadata_readonly.sql';
 writeFileSync(file,'-- REVIEW: metadata only; no user rows or ledger changes. Run with readonly connection.\nBEGIN TRANSACTION READ ONLY;\nSET LOCAL search_path=public,pg_temp;\n'+manifestQuery+'\nROLLBACK;\n');
 const index={status:'REVIEW_REQUIRED_NOT_INSTALL_AUTHORIZATION',databaseReservation:false,ledgerObserved:false,query:{file,sha256:sha(file)},versionQuery:{file:'supabase/review/package_versions_readonly.sql',sha256:sha('supabase/review/package_versions_readonly.sql')},approvedCombinedPreflight:{file:'supabase/review/combined_preflight_20261011060000.sql',sha256:sha('supabase/review/combined_preflight_20261011060000.sql')},proposals:proposals.map(([version,name])=>({version,name,file:`supabase/review/${name}.sql`,sha256:sha(`supabase/review/${name}.sql`)})),stages:stages.map((stage,i)=>({stage,expectedLedgerCount:149+i,expectedAdditionalVersions:proposals.slice(0,i).map(x=>x[0]),file:`qa/fase3/manifests/${stage}.json`,sha256:sha(`qa/fase3/manifests/${stage}.json`)}))};
 writeFileSync('qa/fase3/manifests/index.json',JSON.stringify(index,null,2)+'\n');
}
