-- REVIEW: metadata only; no user rows or ledger changes. Run with readonly connection.
BEGIN TRANSACTION READ ONLY;
SET LOCAL search_path=public,pg_temp;
WITH
roles(role) AS (VALUES ('anon'),('authenticated'),('service_role')),
functions AS (
 SELECT n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' key,
 jsonb_build_object('body_md5',md5(p.prosrc),'definition_md5',md5(pg_get_functiondef(p.oid)),
 'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef,'config',p.proconfig,'acl',p.proacl::text,
 'execute',(SELECT jsonb_object_agg(role,has_function_privilege(role,p.oid,'EXECUTE')) FROM roles)) value
 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
 WHERE n.nspname IN ('public','school_category_private','contract_operations_private') AND p.proname IN ('active_rules','actor_context','admin_confirm_contract_operation','admin_get_contract_operations','admin_preview_contract_operation','adopted','assessment_assert_question','assessment_content_write_guard','authorized_items','avalia_current_student_id','avalia_plus_assignment_is_open','avalia_plus_create_assessment_from_bank','avalia_plus_replace_assessment_items','avalia_student_can_access_assignment','communication_can_read','communication_current_student_can_read','communication_delivery_is_active','communication_edit_allowed','communication_edit_notice','communication_get_notice_versions','communication_get_reply_thread','communication_guardian_can_read','communication_list_reply_threads','communication_mark_revision_read','communication_reply_allowed','communication_send_reply','communication_teacher_can_target','content_resolve_for_user','content_resolve_question_details_for_user','content_validate_entitlement','contract_schools','dynamic_school','has_dynamic_membership','in_scope','institutional_touch_updated_at','legacy_resolver','revision','school_content_assert_admin','school_contract','scope_tenants','secretaria_can_manage_school','superseded','teacher_create_assessment_assignment','teacher_schedule_assessment_application_v2','validate')
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
 WHERE n.nspname||'.'||c.relname IN ('public.assessments','public.assessment_questions','public.assessment_assignments','public.communications','public.communication_deliveries','public.communication_replies','public.communication_revisions','public.communication_revision_reads','public.contracts','public.contract_products','public.contract_entitlement_events','public.tenant_product_entitlements','public.tenant_product_content_modules','contract_operations_private.targets')
), schemas AS (
 SELECT n.nspname key,jsonb_build_object('owner',pg_get_userbyid(n.nspowner),'acl',n.nspacl::text,
 'privileges',(SELECT jsonb_object_agg(role,jsonb_build_object('usage',has_schema_privilege(role,n.oid,'USAGE'),'create',has_schema_privilege(role,n.oid,'CREATE'))) FROM roles)) value
 FROM pg_namespace n WHERE n.nspname IN ('public','school_category_private','contract_operations_private')
)
SELECT jsonb_build_object('functions',coalesce((SELECT jsonb_object_agg(key,value) FROM functions),'{}'::jsonb),'relations',coalesce((SELECT jsonb_object_agg(key,value) FROM relations),'{}'::jsonb),'schemas',coalesce((SELECT jsonb_object_agg(key,value) FROM schemas),'{}'::jsonb));
ROLLBACK;
