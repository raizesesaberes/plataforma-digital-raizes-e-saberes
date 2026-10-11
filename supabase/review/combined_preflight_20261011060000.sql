-- REVIEW PROPOSAL ONLY; NOT EXECUTED. No mutation, no override, no ledger repair.
-- Proposed package checkpoint immediately BEFORE PR1, after registered PR2/3/4.
-- Requires specific review of version reservations, this file hash and SQL source hashes.
-- Original contract_operations_preflight.sql is untouched.
BEGIN TRANSACTION READ ONLY;
SET LOCAL search_path = public, pg_temp;
do $ledger$
declare old_ok boolean; added_ok boolean;
begin
 select count(*)=149 and max(version)='20261011003404'
 and md5(string_agg(version||':'||coalesce(name,''),E'\n' order by version))='ef9f6ce1ab21510845023cceb4228bae'
 into old_ok from supabase_migrations.schema_migrations
 where version not in ('20261011060001','20261011060002','20261011060003');
 select count(*)=3 and count(*) filter(where
 (version='20261011060001' and name='fase3_assessment_authorization') or
 (version='20261011060002' and name='fase3_communication_replies') or
 (version='20261011060003' and name='fase3_notice_editing'))=3
 into added_ok from supabase_migrations.schema_migrations
 where version in ('20261011060001','20261011060002','20261011060003');
 if old_ok is distinct from true or added_ok is distinct from true then raise exception 'COMBINED_LEDGER_152_CHANGED'; end if;
end $ledger$;
do $functions$ declare good boolean; begin
select coalesce(bool_and(ok),false) into good from (
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
from expected e left join pg_proc p on p.oid=to_regprocedure(e.signature)
) checked;
if good is distinct from true then raise exception 'COMBINED_CONTRACT_DEPENDENCIES_CHANGED';end if;
end $functions$;
do $objects$ declare good boolean; begin
select new_objects_absent and no_operational_contracts and no_operational_receipts and no_operational_entitlements into good from (
select to_regnamespace('contract_operations_private') is null
 and to_regprocedure('public.admin_get_contract_operations()') is null
 and to_regprocedure('public.admin_preview_contract_operation(jsonb)') is null
 and to_regprocedure('public.admin_confirm_contract_operation(jsonb,uuid)') is null
 and to_regclass('public.contract_operation_request_once') is null
 and to_regclass('public.contract_operation_successor_once') is null
 and to_regclass('public.contract_operation_predecessor_idx') is null as new_objects_absent,
 not exists(select 1 from public.contracts where metadata->>'source'='contract_operations_v1') as no_operational_contracts,
 not exists(select 1 from public.contract_entitlement_events where event_type='CONTRACT_OPERATION') as no_operational_receipts,
 not exists(select 1 from public.tenant_product_entitlements where metadata->>'operation_timezone'='America/Sao_Paulo') as no_operational_entitlements
) checked;
if good is distinct from true then raise exception 'COMBINED_CONTRACT_OBJECTS_CHANGED';end if;
end $objects$;
do $protections$ declare actual jsonb; expected jsonb := $expected${"public.avalia_current_student_id()":{"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"97999b75dee13694e601365d99f7134a","definition_md5":"3e20a7be5b00c46e81fb47db25c5b57d"},"trigger:assessments:fase3_assessment_delete_guard":{"enabled":"O","definition":"CREATE TRIGGER fase3_assessment_delete_guard BEFORE DELETE ON public.assessments FOR EACH ROW EXECUTE FUNCTION school_category_private.assessment_content_write_guard()"},"school_category_private.assessment_content_write_guard()":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"ca421399a763594a7d95556d18f5e93e","definition_md5":"cafa7a1a1229665ecae82e4f9aad25f4"},"public.communication_get_reply_thread(p_delivery_id uuid)":{"acl":"{postgres=X/postgres,authenticated=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"73b17bd967351a22e9f2aab6245dbabf","definition_md5":"209cac197c32f303e99be3cc335b39b7"},"trigger:assessment_questions:fase3_assessment_question_guard":{"enabled":"O","definition":"CREATE TRIGGER fase3_assessment_question_guard BEFORE INSERT OR DELETE OR UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION school_category_private.assessment_content_write_guard()"},"school_category_private.communication_edit_allowed(p_id uuid)":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=\"\"","jit=off"],"body_md5":"ecc5e64343a71238b6b62889c0baf34c","definition_md5":"41859288d34c6932e8ba9315ca95f39b"},"public.communication_list_reply_threads(p_communication_id uuid)":{"acl":"{postgres=X/postgres,authenticated=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"2a9e394bbffc7cabf2dac69c29cd5daf","definition_md5":"18d154fb3d5e08ab640a261bcc7ce043"},"trigger:assessment_assignments:fase3_assessment_publication_guard":{"enabled":"O","definition":"CREATE TRIGGER fase3_assessment_publication_guard BEFORE INSERT OR UPDATE OF assessment_id, school_id, class_id, status ON public.assessment_assignments FOR EACH ROW EXECUTE FUNCTION school_category_private.assessment_content_write_guard()"},"school_category_private.communication_reply_allowed(p_delivery_id uuid)":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"8750e1eecfaa1099a807c43022338a53","definition_md5":"abb631208d5a8e707019462fb701155e"},"public.communication_mark_revision_read(p_delivery_id uuid, p_revision integer)":{"acl":"{postgres=X/postgres,authenticated=X/postgres}","owner":"postgres","config":["search_path=\"\"","jit=off"],"body_md5":"9d7aa084011b973750163af56f13b05e","definition_md5":"2d3d31ebc9fcc143211896c9aaf0f143"},"public.communication_send_reply(p_delivery_id uuid, p_body text, p_request_id uuid)":{"acl":"{postgres=X/postgres,authenticated=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"3ce224270a6666a95d8c21bdd01ca22a","definition_md5":"3272aeba63ce3646735f9d9312f03d22"},"public.avalia_student_can_access_assignment(p_assignment_id uuid, p_student_id uuid)":{"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"ee3b77fa07362ea563d9fb4156812d00","definition_md5":"015310f29c60e4ddca3b5b84706ccf02"},"public.communication_get_notice_versions(p_communication_id uuid, p_delivery_id uuid)":{"acl":"{postgres=X/postgres,authenticated=X/postgres}","owner":"postgres","config":["search_path=\"\"","jit=off"],"body_md5":"4939b6c78774663fce1fb80e9ffc0479","definition_md5":"4131203418b7c793af45c9c5e8d5e99e"},"school_category_private.assessment_assert_question(p_school_id uuid, p_class_id uuid, p_question_id uuid)":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=\"\"","jit=off"],"body_md5":"81ecb872a7fabccc1cf04ecfcccb6a0d","definition_md5":"759c4d18845458a585b7c65464122e32"},"public.communication_edit_notice(p_communication_id uuid, p_expected_revision integer, p_title text, p_body text, p_request_id uuid)":{"acl":"{postgres=X/postgres,authenticated=X/postgres}","owner":"postgres","config":["search_path=\"\"","jit=off"],"body_md5":"1d38906727b01490093fcff6b7d530ce","definition_md5":"87917a80391aab427945823c7cdf3082"}}$expected$::jsonb; k text; v jsonb; begin
select snapshot into actual from (select jsonb_object_agg(key,value) from (
select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' key,
jsonb_build_object('body_md5',md5(p.prosrc),'definition_md5',md5(pg_get_functiondef(p.oid)),'acl',p.proacl::text,'config',p.proconfig,'owner',pg_get_userbyid(p.proowner)) value
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','school_category_private')
union all select 'trigger:'||t.tgrelid::regclass::text||':'||t.tgname,jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled) from pg_trigger t where not t.tgisinternal) s) q(snapshot);
for k,v in select * from jsonb_each(expected) loop
if actual->k is distinct from v then raise exception 'COMBINED_FASE3_PROTECTION_CHANGED: %',k;end if;
end loop;
end $protections$;
ROLLBACK;
