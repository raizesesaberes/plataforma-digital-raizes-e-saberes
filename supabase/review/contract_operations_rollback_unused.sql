-- REVIEW ONLY. Forward compensating migration, ONLY before any operational use.
-- Requires maintenance window; never delete or repair ledger entries.
begin;
set local lock_timeout='2s';
select pg_advisory_xact_lock(81261011);
lock table public.contracts,public.contract_entitlement_events,public.tenant_product_entitlements,contract_operations_private.targets in access exclusive mode;
do $guard$
begin
 if exists(select 1 from public.contracts where metadata->>'source'='contract_operations_v1')
 or exists(select 1 from public.contract_entitlement_events where event_type='CONTRACT_OPERATION')
 or exists(select 1 from public.tenant_product_entitlements where metadata->>'operation_timezone'='America/Sao_Paulo')
 or exists(select 1 from contract_operations_private.targets) then
  raise exception 'ROLLBACK_REFUSED_OPERATIONAL_USE_REQUIRES_FORWARD_FIX';
 end if;
 if exists(select 1 from (values ('public.content_validate_entitlement()','4352d5e62d9e59898c1b1d3dfabd5fd2'),
('school_category_private.dynamic_school(jsonb)','12386c0c18049ff69301648d09475ffb'),
('school_category_private.school_contract(uuid,uuid)','2e5b33ac6c524b26cf3acc7d7977d890'),
('school_category_private.scope_tenants(uuid)','b71e41704cccbac0db4b83126372fa54'),
('school_category_private.legacy_resolver(jsonb)','cbadcfc1bc4693de6d3145c465496112'),
('school_category_private.has_dynamic_membership()','e26b302dc56413a501e20e3136eebbd1'),
('school_category_private.active_rules(jsonb)','87a23950871b720542e63c3e9c4b2871')) expected(signature,hash)
 where md5(pg_get_functiondef(to_regprocedure(signature))) is distinct from hash) then
  raise exception 'ROLLBACK_REFUSED_FUNCTION_DRIFT';
 end if;
 if exists(select 1 from (values ('content_validate_entitlement()','{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}'),('school_category_private.active_rules(jsonb)','{postgres=X/postgres}'),('school_category_private.dynamic_school(jsonb)','{postgres=X/postgres}'),('school_category_private.has_dynamic_membership()','{postgres=X/postgres}'),('school_category_private.legacy_resolver(jsonb)','{postgres=X/postgres}'),('school_category_private.school_contract(uuid,uuid)','{postgres=X/postgres}'),('school_category_private.scope_tenants(uuid)','{postgres=X/postgres}')) expected(signature,acl) left join pg_proc p on p.oid=to_regprocedure(signature) where p.oid is null or p.proacl::text is distinct from expected.acl or pg_get_userbyid(p.proowner)<>'postgres') then
  raise exception 'ROLLBACK_REFUSED_OWNER_OR_ACL_DRIFT';
 end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.content_validate_entitlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_contract public.contracts%rowtype;
begin
  select *
  into v_contract
  from public.contracts
  where id = new.contract_id;

  if not found then
    raise exception 'CONTRACT_NOT_FOUND';
  end if;

  if new.status = 'ACTIVE' and v_contract.status <> 'ACTIVE' then
    raise exception 'CONTRACT_NOT_ACTIVE';
  end if;

  if not exists (
    select 1
    from public.contract_products cp
    where cp.contract_id = new.contract_id
      and cp.product_id = new.product_id
      and cp.status = 'active'
  ) then
    raise exception 'PRODUCT_NOT_IN_CONTRACT';
  end if;

  if not public.content_tenant_matches_contract_scope(v_contract.tenant_id, new.tenant_id) then
    raise exception 'ENTITLEMENT_TENANT_OUT_OF_CONTRACT_SCOPE';
  end if;

  if new.starts_at < v_contract.starts_at then
    raise exception 'ENTITLEMENT_STARTS_BEFORE_CONTRACT';
  end if;

  if v_contract.ends_at is not null and (new.ends_at is null or new.ends_at > v_contract.ends_at) then
    raise exception 'ENTITLEMENT_ENDS_AFTER_CONTRACT';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION school_category_private.active_rules(p_context jsonb)
 RETURNS TABLE(module_id uuid, module_name text, rule_grade uuid, rule_subject uuid, content_types rs_content_type[], segment_id uuid, institutional boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
 with ctx as materialized(select school_category_private.actor_context(p_context) c),
 context as materialized(select (c->>'school_id')::uuid school_id,(c->>'institutional')::boolean institutional,
 array(select value::uuid from jsonb_array_elements_text(c->'grade_ids')) grade_ids from ctx)

  select distinct m.id module_id,m.name module_name,(r.value->>'grade_id')::uuid rule_grade,(r.value->>'subject_id')::uuid rule_subject,array[(r.value->>'content_type')::public.rs_content_type] content_types,tx.segment_id,tx.institutional
  from context x join public.tenants t on t.school_id=x.school_id and t.tenant_type='SCHOOL' and t.status='active' and t.metadata->>'category_entitlements_enabled'='true'
  join public.tenant_product_entitlements e on e.tenant_id=t.id and e.status='ACTIVE' and e.starts_at<=current_date and (e.ends_at is null or e.ends_at>=current_date) and e.metadata->>'source'='school_content_category_v1'
  join public.contracts c on c.id=e.contract_id and school_category_private.school_contract(x.school_id,c.id)
  join public.contract_products cp on cp.contract_id=c.id and cp.product_id=e.product_id and cp.status='active'
  join public.products p on p.id=e.product_id and p.status='ACTIVE'
  cross join lateral jsonb_array_elements(case when jsonb_typeof(e.metadata->'category_rules')='array' then e.metadata->'category_rules' else '[]' end) r
  join school_category_private.taxonomy() tx on tx.grade_id=(r.value->>'grade_id')::uuid and tx.grade_id=any(e.grade_ids)
  join public.product_content_modules pm on pm.product_id=p.id and pm.content_module_id=(r.value->>'module_id')::uuid
  join public.content_modules m on m.id=pm.content_module_id and m.status='active' and r.value->>'content_type'=any(m.content_types::text[])
  left join public.tenant_product_content_modules tm on tm.entitlement_id=e.id and tm.content_module_id=m.id
  where coalesce(tm.enabled,true)
  and (not(cp.metadata ? 'authorized_subject_ids') or (jsonb_typeof(cp.metadata->'authorized_subject_ids')='array' and r.value->>'subject_id' is not null and cp.metadata->'authorized_subject_ids' ? (r.value->>'subject_id')))
  and (r.value->>'subject_id' is null or exists(select 1 from public.content_subjects cs where cs.id=(r.value->>'subject_id')::uuid and cs.status='active'))
  and (
   (r.value->>'kind'='STANDARD' and jsonb_typeof(cp.metadata->'authorized_grade_ids')='array' and cp.metadata->'authorized_grade_ids' ? tx.grade_id::text
    and tx.grade_id=any(x.grade_ids) and tx.institutional=x.institutional
    and (not tx.institutional or cp.metadata->'institutional_training_authorized'='true'::jsonb))
   or (r.value->>'kind'='SAMPLE' and jsonb_typeof(cp.metadata->'authorized_grade_ids')='array' and jsonb_typeof(cp.metadata->'authorized_sample_grade_ids')='array' and not tx.institutional and not x.institutional
    and cp.metadata->'authorized_sample_grade_ids' ? tx.grade_id::text
    and cp.metadata->'authorized_grade_ids' ? (r.value->>'audience_grade_id')
    and (r.value->>'audience_grade_id')::uuid=any(x.grade_ids)
    and (r.value->>'starts_at')::timestamptz<=now() and (r.value->>'ends_at')::timestamptz>now()
    and (r.value->>'starts_at')::timestamptz>=c.starts_at::timestamptz
    and (c.ends_at is null or (r.value->>'ends_at')::timestamptz<c.ends_at::timestamptz+interval '1 day'+interval '1 microsecond')))
;
$function$;

CREATE OR REPLACE FUNCTION school_category_private.dynamic_school(p_context jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare sid uuid:=nullif(p_context->>'school_id','')::uuid;
begin
 if sid is null then
  select school_id into sid from public.teachers where profile_id=auth.uid() and status='active' order by created_at desc nulls last,id limit 1;
  if sid is null then select school_id into sid from public.student_get_context() limit 1;end if;
 end if;
 return exists(select 1 from public.tenants where school_id=sid and metadata->>'category_entitlements_enabled'='true');
end $function$;

CREATE OR REPLACE FUNCTION school_category_private.has_dynamic_membership()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.tenants t where t.tenant_type='SCHOOL' and t.metadata->>'category_entitlements_enabled'='true' and (
 exists(select 1 from public.teachers a where a.profile_id=auth.uid() and a.status='active' and a.school_id=t.school_id)
 or exists(select 1 from public.students a where a.user_id=auth.uid() and a.school_id=t.school_id)
 or exists(select 1 from public.student_get_context() a where a.school_id=t.school_id)));
$function$;

CREATE OR REPLACE FUNCTION school_category_private.legacy_resolver(p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_content_type public.rs_content_type := coalesce((p_context ->> 'content_type')::public.rs_content_type, 'QUESTION'::public.rs_content_type);
  v_school_id uuid := nullif(p_context ->> 'school_id', '')::uuid;
  v_class_id uuid := nullif(p_context ->> 'class_id', '')::uuid;
  v_subject_code text := public.rs_content_normalize_code(p_context ->> 'subject_code');
  v_limit integer := least(greatest(coalesce((p_context ->> 'limit')::integer, 25), 1), 100);
  v_offset integer := greatest(coalesce((p_context ->> 'offset')::integer, 0), 0);
  v_teacher_id uuid;
  v_student_id uuid;
  v_grade_id uuid;
  v_subject_id uuid;
  v_items jsonb;
  v_total integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_content_type <> 'QUESTION' then
    return jsonb_build_object('status', 'UNSUPPORTED_CONTENT_TYPE', 'items', '[]'::jsonb, 'total', 0);
  end if;

  if exists (
    select 1
    from public.teachers t
    where t.profile_id = v_uid
      and coalesce(t.status, 'active') = 'active'
  ) then
    select t.id, coalesce(v_school_id, t.school_id)
    into v_teacher_id, v_school_id
    from public.teachers t
    where t.profile_id = v_uid
      and coalesce(t.status, 'active') = 'active'
      and (v_school_id is null or t.school_id = v_school_id)
    order by t.created_at desc nulls last
    limit 1;

    if v_teacher_id is null or v_school_id is null then
      raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT';
    end if;

    if v_class_id is not null then
      if not exists (
        select 1
        from public.class_teacher_memberships ctm
        join public.classes c on c.id = ctm.class_id
        where ctm.teacher_id = v_teacher_id
          and ctm.class_id = v_class_id
          and ctm.status = 'active'
          and (ctm.ended_at is null or ctm.ended_at > now())
          and c.school_id = v_school_id
          and coalesce(c.status, 'active') = 'active'
      ) then
        raise exception 'UNAUTHORIZED_CLASS_CONTEXT';
      end if;

      select cga.grade_id
      into v_grade_id
      from public.classes c
      join public.content_grade_aliases cga
        on cga.alias_code = public.rs_content_normalize_code(coalesce(c.school_year, c.ano_escolar::text))
      where c.id = v_class_id
      limit 1;
    end if;

  else
    select sgc.student_id, sgc.school_id, sgc.class_id, cga.grade_id
    into v_student_id, v_school_id, v_class_id, v_grade_id
    from public.student_get_context() sgc
    left join public.content_grade_aliases cga
      on cga.alias_code = public.rs_content_normalize_code(sgc.school_year)
    limit 1;

    if v_student_id is null then
      raise exception 'UNAUTHORIZED_STUDENT_CONTEXT';
    end if;

    if nullif(p_context ->> 'school_id', '')::uuid is not null and nullif(p_context ->> 'school_id', '')::uuid <> v_school_id then
      raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT';
    end if;

    if nullif(p_context ->> 'class_id', '')::uuid is not null and nullif(p_context ->> 'class_id', '')::uuid <> v_class_id then
      raise exception 'UNAUTHORIZED_CLASS_CONTEXT';
    end if;
  end if;

  if not public.content_feature_enabled_for_school('CONTENT_RESOLVER_QUESTIONS', v_school_id) then
    return jsonb_build_object(
      'status', 'FEATURE_DISABLED',
      'feature', 'content_resolver_questions',
      'items', '[]'::jsonb,
      'total', 0
    );
  end if;

  if v_subject_code is not null then
    select csa.subject_id
    into v_subject_id
    from public.content_subject_aliases csa
    where csa.alias_code = v_subject_code
    limit 1;
  end if;

  with school_tenant as (
    select t.id
    from public.tenants t
    where t.tenant_type = 'SCHOOL'
      and t.school_id = v_school_id
      and t.status = 'active'
    limit 1
  ),
  network_tenants as (
    select t.id
    from public.tenants t
    join public.network_school_memberships nsm on nsm.network_id = t.network_id
    where t.tenant_type = 'NETWORK'
      and t.status = 'active'
      and nsm.school_id = v_school_id
      and nsm.status = 'active'
      and (nsm.ended_at is null or nsm.ended_at > now())
  ),
  entitled_products as (
    select distinct tpe.product_id, tpe.contract_id, tpe.metadata
    from public.tenant_product_entitlements tpe
    left join public.contracts valid_contract on valid_contract.id=tpe.contract_id
      and valid_contract.status='ACTIVE' and valid_contract.starts_at<=current_date
      and (valid_contract.ends_at is null or valid_contract.ends_at>=current_date)
    left join public.contract_products valid_cp on valid_cp.contract_id=tpe.contract_id
      and valid_cp.product_id=tpe.product_id and valid_cp.status='active'
    left join public.products valid_product on valid_product.id=tpe.product_id and valid_product.status='ACTIVE'
    join public.product_content_modules pcm on pcm.product_id = tpe.product_id
    join public.content_modules cm on cm.id = pcm.content_module_id
    left join public.tenant_product_content_modules tpcm
      on tpcm.entitlement_id = tpe.id
     and tpcm.content_module_id = cm.id
    where tpe.status = 'ACTIVE'
      and (tpe.metadata->>'source' is distinct from 'school_content_admin_v1' or
        (valid_contract.id is not null and valid_cp.contract_id is not null and valid_product.id is not null
        and public.content_tenant_matches_contract_scope(valid_contract.tenant_id,tpe.tenant_id)
        and exists(select 1 from public.schools s where s.id=v_school_id and s.status='active')
        and exists(select 1 from public.profiles p where p.id=v_uid and p.status='active')))
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
      and cm.status = 'active'
      and v_content_type = any(cm.content_types)
      and coalesce(tpcm.enabled, true) = true
      and (
        tpe.tenant_id in (select id from school_tenant)
        or tpe.tenant_id in (select id from network_tenants)
      )
      and (cardinality(tpe.grade_ids) = 0 or v_grade_id is null or v_grade_id = any(tpe.grade_ids))
      and (cardinality(tpe.subject_ids) = 0 or v_subject_id is null or v_subject_id = any(tpe.subject_ids))
  ),
  allowed_by_exception as (
    select cae.content_item_id
    from public.content_access_exceptions cae
    where cae.action in ('ALLOW', 'PILOT')
      and (cae.school_id = v_school_id or cae.tenant_id in (select id from school_tenant union select id from network_tenants))
      and (cae.starts_at is null or cae.starts_at <= now())
      and (cae.ends_at is null or cae.ends_at >= now())
  ),
  blocked as (
    select cae.content_item_id
    from public.content_access_exceptions cae
    where cae.action in ('BLOCK', 'EMBARGO')
      and (cae.school_id = v_school_id or cae.tenant_id in (select id from school_tenant union select id from network_tenants))
      and (cae.starts_at is null or cae.starts_at <= now())
      and (cae.ends_at is null or cae.ends_at >= now())
  ),
  eligible as (
    select distinct
      ci.id as content_item_id,
      cqi.question_item_id,
      ci.title,
      ci.grade_id,
      ci.subject_id,
      ci.published_at
    from public.content_items ci
    join public.content_question_items cqi on cqi.content_item_id = ci.id
    left join public.content_collection_items cci on cci.content_item_id = ci.id
    left join public.product_collections pc on pc.collection_id = cci.collection_id
    where ci.content_type = 'QUESTION'
      and ci.editorial_status = 'PUBLISHED'
      and ci.published_at is not null
      and ci.id not in (select content_item_id from blocked)
      and (
        exists(select 1 from entitled_products ep where ep.product_id=pc.product_id
          and (ep.metadata->>'source' is distinct from 'school_content_admin_v1' or
            (coalesce(ep.metadata->'allowed_content_item_ids','[]'::jsonb) ? ci.id::text
             and ci.grade_id in(select public.school_content_managed_grades(v_school_id,v_class_id))
             and exists(select 1 from public.school_content_candidates(v_school_id,ci.id) candidate
               where candidate.product_id=ep.product_id and candidate.contract_id=ep.contract_id))))
        or ci.id in (select content_item_id from allowed_by_exception)
      )
      and (v_grade_id is null or ci.grade_id is null or ci.grade_id = v_grade_id)
      and (v_subject_id is null or ci.subject_id is null or ci.subject_id = v_subject_id)
  ),
  counted as (
    select count(*)::integer as total from eligible
  ),
  paged as (
    select *
    from eligible
    order by published_at desc nulls last, content_item_id
    limit v_limit offset v_offset
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'content_item_id', p.content_item_id,
      'question_item_id', p.question_item_id,
      'title', p.title,
      'grade_id', p.grade_id,
      'subject_id', p.subject_id,
      'published_at', p.published_at
    )), '[]'::jsonb),
    (select total from counted)
  into v_items, v_total
  from paged p;

  return jsonb_build_object(
    'status', 'PASS',
    'content_type', 'QUESTION',
    'school_id', v_school_id,
    'class_id', v_class_id,
    'limit', v_limit,
    'offset', v_offset,
    'total', coalesce(v_total, 0),
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION school_category_private.school_contract(p_school uuid, p_contract uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.contracts c join public.tenants t on t.id=c.tenant_id
 join public.schools s on s.id=p_school and s.status='active'
 where c.id=p_contract and c.status='ACTIVE' and c.starts_at<=current_date and (c.ends_at is null or c.ends_at>=current_date)
 and t.status='active' and (t.school_id=s.id or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=s.id and m.status='active' and (m.ended_at is null or m.ended_at>now())))));
$function$;

CREATE OR REPLACE FUNCTION school_category_private.scope_tenants(p_school uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select t.id from public.tenants t where t.status='active' and (t.school_id=p_school or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=p_school and m.status='active' and (m.ended_at is null or m.ended_at>now()))));
$function$;
drop function public.admin_confirm_contract_operation(jsonb,uuid);
drop function public.admin_preview_contract_operation(jsonb);
drop function public.admin_get_contract_operations();
drop function contract_operations_private.revision(jsonb);
drop function contract_operations_private.validate(jsonb);
drop function contract_operations_private.contract_schools(uuid);
drop function contract_operations_private.in_scope(uuid,uuid);
drop function contract_operations_private.adopted(uuid);
drop function contract_operations_private.superseded(uuid);
drop table contract_operations_private.targets;
drop schema contract_operations_private;
drop index public.contract_operation_request_once;
drop index public.contract_operation_successor_once;
drop index public.contract_operation_predecessor_idx;
commit;
