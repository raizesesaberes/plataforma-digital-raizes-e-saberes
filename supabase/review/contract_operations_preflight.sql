-- READ ONLY. Every ok must be true. Any drift requires refreshed review.
with expected(signature,hash,acl,config) as (values
('public.content_validate_entitlement()','afabcab82a52caa969938ee9c9bc54a7','{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}',array['search_path=public, pg_temp']::text[]),
('school_category_private.active_rules(jsonb)','96870fab8f1b04fbea6315501dd525a5','{postgres=X/postgres}',array['search_path=""','jit=off','plan_cache_mode=force_custom_plan']::text[]),
('school_category_private.dynamic_school(jsonb)','f571b9cef1c82dee28aaaa7194d5ec0c','{postgres=X/postgres}',array['search_path=""']::text[]),
('school_category_private.has_dynamic_membership()','28058c0e8d51ceec501545e4084b885b','{postgres=X/postgres}',array['search_path=""']::text[]),
('school_category_private.legacy_resolver(jsonb)','f988ae1eae4b3cf22a8adf11b504919f','{postgres=X/postgres}',array['search_path=""','jit=off']::text[]),
('school_category_private.school_contract(uuid,uuid)','602c6a3fe0453560760c4f337c1a9cf4','{postgres=X/postgres}',array['search_path=""']::text[]),
('school_category_private.scope_tenants(uuid)','4a13778202006bc08a5cf6d959f2d81a','{postgres=X/postgres}',array['search_path=""']::text[])
)
select e.signature, p.oid is not null and md5(pg_get_functiondef(p.oid))=e.hash
 and pg_get_userbyid(p.proowner)='postgres' and p.prosecdef
 and p.proacl::text=e.acl and p.proconfig is not distinct from e.config as ok
from expected e left join pg_proc p on p.oid=to_regprocedure(e.signature);

select count(*)=149 and max(version)='20261011003404'
 and md5(string_agg(version||':'||coalesce(name,''),E'\n' order by version))='ef9f6ce1ab21510845023cceb4228bae' as ledger_ok
from supabase_migrations.schema_migrations;

select to_regnamespace('contract_operations_private') is null
 and to_regprocedure('public.admin_get_contract_operations()') is null
 and to_regprocedure('public.admin_preview_contract_operation(jsonb)') is null
 and to_regprocedure('public.admin_confirm_contract_operation(jsonb,uuid)') is null
 and to_regclass('public.contract_operation_request_once') is null
 and to_regclass('public.contract_operation_successor_once') is null
 and to_regclass('public.contract_operation_predecessor_idx') is null as new_objects_absent,
 not exists(select 1 from public.contracts where metadata->>'source'='contract_operations_v1') as no_operational_contracts,
 not exists(select 1 from public.contract_entitlement_events where event_type='CONTRACT_OPERATION') as no_operational_receipts,
 not exists(select 1 from public.tenant_product_entitlements where metadata->>'operation_timezone'='America/Sao_Paulo') as no_operational_entitlements;
