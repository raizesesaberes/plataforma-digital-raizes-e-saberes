-- REVIEW ONLY. Non-destructive retirement/pause; never restores legacy grants or public access.
begin;
create function school_category_private.checkpoint_fingerprint() returns text
language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_object(
 'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),p.proowner::regrole::text,p.proacl::text) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='school_category_private' or (n.nspname='public' and (p.proname like '%categor%' or p.proname in('admin_search_root_content','admin_set_root_content_state','content_resolve_for_user','avalia_plus_create_item','avalia_plus_update_question_item','avalia_plus_set_item_workflow','admin_get_category_checkpoint','admin_pause_category_checkpoint','student_can_read_library_book','student_can_read_game','student_can_read_activity','student_can_read_discovery')))),
 'policies',(select jsonb_agg(jsonb_build_array(c.relname,pol.polname,pol.polpermissive,pol.polroles,pg_get_expr(pol.polqual,pol.polrelid)) order by c.relname,pol.polname) from pg_policy pol join pg_class c on c.oid=pol.polrelid where pol.polname like 'category_%'),
 'indexes',(select jsonb_agg(indexdef order by indexname) from pg_indexes where schemaname='public' and indexname in('category_request_once','category_classification_request_once','category_delivery_binding_once','category_native_request_once','root_review_request_once','category_checkpoint_request_once')),
 'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by t.tgname) from pg_trigger t where not t.tgisinternal and t.tgname like 'category_checkpoint_%'),
 'taxonomy',(select jsonb_agg(to_jsonb(t) order by grade_id) from school_category_private.taxonomy()t)
 )::text);
$$;
create function school_category_private.checkpoint_use_count() returns bigint
language sql stable security definer set search_path='' as $$
 select (select count(*) from public.tenants where metadata->>'category_entitlements_enabled'='true')+
 (select count(*) from public.contract_entitlement_events where event_type='CATEGORY_RULES_SAVED')+
 (select count(*) from public.content_editorial_events where event_type in('CONTENT_CATEGORY_CLASSIFIED','NATIVE_QUESTION_CATEGORY_SAVED','ROOT_CONTENT_SUSPENDED','ROOT_CONTENT_REPUBLISHED','ROOT_CONTENT_PUBLISHED'));
$$;
create function public.admin_get_category_checkpoint() returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform public.school_content_assert_admin();
 return (select jsonb_build_object('status','PASS','checkpoint',checkpoint,'writes_paused',writes_paused,'phase',phase,'fingerprint',school_category_private.checkpoint_fingerprint(),'use_count',school_category_private.checkpoint_use_count(),'preserves_reads',true,'preserves_data',true) from school_category_private.checkpoint_control where singleton);
end $$;
create unique index category_checkpoint_request_once on public.content_editorial_events(actor_user_id,(details->>'request_id')) where event_type='CATEGORY_CHECKPOINT_PAUSED';
create function public.admin_pause_category_checkpoint(p_fingerprint text,p_phase text,p_reason text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare receipt jsonb;hash text;result jsonb;used bigint;
begin
 perform public.school_content_assert_admin();
 if p_phase not in('RETIRED_BEFORE_USE','PAUSED_AFTER_USE') or p_request_id is null or length(btrim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'RECOVERY_REASON_PHASE_REQUEST_REQUIRED';end if;
 hash:=md5(jsonb_build_array(p_fingerprint,p_phase,p_reason)::text);
 if not pg_try_advisory_xact_lock(81261014) then raise exception 'CATEGORY_RECOVERY_BUSY';end if;
 perform set_config('lock_timeout','1s',true);
 -- Writers hold SHARE on this row until commit. This drains them before the use check.
 perform 1 from school_category_private.checkpoint_control where singleton for update;
 select details into receipt from public.content_editorial_events where event_type='CATEGORY_CHECKPOINT_PAUSED' and actor_user_id=auth.uid() and details->>'request_id'=p_request_id::text;
 if found then if receipt->>'input_hash'<>hash then raise exception 'REQUEST_ID_REUSED';end if;return receipt->'result';end if;
 if p_fingerprint is null or p_fingerprint<>school_category_private.checkpoint_fingerprint() then raise exception 'CHECKPOINT_FINGERPRINT_MISMATCH';end if;
 used:=school_category_private.checkpoint_use_count();
 if p_phase='RETIRED_BEFORE_USE' and used<>0 then raise exception 'CHECKPOINT_ALREADY_USED_PAUSE_REQUIRED';end if;
 update school_category_private.checkpoint_control set writes_paused=true,phase=p_phase,changed_at=now() where singleton;
 result:=public.admin_get_category_checkpoint();
 insert into public.content_editorial_events(event_type,actor_user_id,details) values('CATEGORY_CHECKPOINT_PAUSED',auth.uid(),jsonb_build_object('request_id',p_request_id,'input_hash',hash,'reason',p_reason,'result',result));
 return result;
exception when lock_not_available then raise exception 'CATEGORY_RECOVERY_BUSY';
end $$;

-- Also guard existing privileged writers that can reach the same canonical records.
create function school_category_private.guard_checkpoint_writes() returns trigger
language plpgsql security definer set search_path='' as $$
declare qid uuid;
begin
 if tg_table_name='tenants' then
  if tg_op='DELETE' then if old.metadata->>'category_entitlements_enabled'='true' then raise exception 'DYNAMIC_ADOPTION_CANNOT_BE_REMOVED';end if;return old;end if;
  if tg_op='UPDATE' and old.metadata->>'category_entitlements_enabled'='true' and coalesce(new.metadata->>'category_entitlements_enabled','false')<>'true' then raise exception 'DYNAMIC_ADOPTION_CANNOT_BE_REMOVED';end if;
  if new.metadata->>'category_entitlements_enabled'='true' then perform school_category_private.assert_writes_open();end if;
 elsif tg_table_name='tenant_product_entitlements' then
  if new.metadata->>'source'='school_content_category_v1' or (tg_op='UPDATE' and old.metadata->>'source'='school_content_category_v1') then perform school_category_private.assert_writes_open();end if;
 elsif tg_table_name='tenant_product_content_modules' then
  if exists(select 1 from public.tenant_product_entitlements where id=coalesce(new.entitlement_id,old.entitlement_id) and metadata->>'source'='school_content_category_v1') then perform school_category_private.assert_writes_open();end if;
 elsif tg_table_name in('question_items','question_alternatives') then
  if tg_table_name='question_items' then qid:=new.id;else qid:=coalesce(new.question_id,old.question_id);end if;
  if exists(select 1 from public.content_question_items a join public.content_items c on c.id=a.content_item_id where a.question_item_id=qid and c.metadata->>'classification_source'='canonical_category_v1') then perform school_category_private.assert_writes_open();end if;
 else perform school_category_private.assert_writes_open();end if;
 if tg_op='DELETE' then return old;end if;return new;
end $$;
create trigger category_checkpoint_content_guard before insert or update on public.content_items for each row execute function school_category_private.guard_checkpoint_writes();
create trigger category_checkpoint_question_guard before update on public.question_items for each row execute function school_category_private.guard_checkpoint_writes();
create trigger category_checkpoint_alternative_guard before insert or update or delete on public.question_alternatives for each row execute function school_category_private.guard_checkpoint_writes();
create trigger category_checkpoint_entitlement_guard before insert or update on public.tenant_product_entitlements for each row execute function school_category_private.guard_checkpoint_writes();
create trigger category_checkpoint_adoption_guard before insert or update or delete on public.tenants for each row execute function school_category_private.guard_checkpoint_writes();
create trigger category_checkpoint_module_guard before insert or update or delete on public.tenant_product_content_modules for each row execute function school_category_private.guard_checkpoint_writes();
create trigger category_checkpoint_exception_guard before insert or update or delete on public.content_access_exceptions for each row execute function school_category_private.guard_checkpoint_writes();
revoke all on function public.admin_get_category_checkpoint(),public.admin_pause_category_checkpoint(text,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.admin_get_category_checkpoint(),public.admin_pause_category_checkpoint(text,text,text,uuid) to authenticated;
revoke all on all functions in schema school_category_private from public,anon,authenticated,service_role;
commit;
