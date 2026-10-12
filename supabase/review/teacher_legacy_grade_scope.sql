-- REVIEW ONLY: no production apply, no migration number, no data/ACL edits.
-- Teacher branch only: verified class union; explicit classes resolve one canonical grade.
begin;
do $guard$
declare p record;
begin
 select prosrc,proacl,proconfig,prosecdef,proowner into p from pg_proc
 where oid=to_regprocedure('school_category_private.legacy_resolver(jsonb)');
 if not found or md5(p.prosrc) is distinct from 'bf45a14cbcb7ed66b08049c1ef7a5e0b'
 or p.proacl::text is distinct from '{postgres=X/postgres}'
 or p.proconfig is distinct from array['search_path=""','jit=off']::text[]
 or p.prosecdef is distinct from true or pg_get_userbyid(p.proowner) is distinct from 'postgres'
 then raise exception 'TEACHER_LEGACY_GRADE_PRECONDITION_FAILED';end if;
end $guard$;
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
  v_grade_matches integer;
  v_union_class uuid;
  v_union_page jsonb;
  v_union_items jsonb := '[]'::jsonb;
  v_union_offset integer;
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

    if p_context is not null and jsonb_typeof(p_context) <> 'object' then
      raise exception 'INVALID_CONTENT_CONTEXT';
    end if;
    if v_class_id is null then
      -- Draft assembly has no target class yet. Union only verified active
      -- classes, using the explicit-class path so each entitlement is evaluated
      -- against that class's canonical grade. Never use NULL as all grades.
      for v_union_class in
        select distinct c.id from public.class_teacher_memberships ctm
        join public.classes c on c.id=ctm.class_id
        where ctm.teacher_id=v_teacher_id and ctm.status='active'
          and (ctm.ended_at is null or ctm.ended_at>now())
          and c.school_id=v_school_id and coalesce(c.status,'active')='active'
        order by c.id
      loop
        v_union_offset := 0;
        loop
          v_union_page := school_category_private.legacy_resolver(
            coalesce(p_context,'{}'::jsonb) || jsonb_build_object('school_id',v_school_id,
              'class_id',v_union_class,'limit',100,'offset',v_union_offset));
          if v_union_page->>'status' is distinct from 'PASS' then
            return v_union_page;
          end if;
          v_union_items := v_union_items || coalesce(v_union_page->'items','[]'::jsonb);
          exit when jsonb_array_length(coalesce(v_union_page->'items','[]'::jsonb))<100;
          v_union_offset := v_union_offset + 100;
          exit when v_union_offset >= coalesce((v_union_page->>'total')::integer,0);
        end loop;
      end loop;
      with unique_items as (
        select distinct on (item->>'content_item_id') item
        from jsonb_array_elements(v_union_items) item
        order by item->>'content_item_id'
      ), paged as (
        select item from unique_items
        order by (item->>'published_at')::timestamptz desc nulls last,item->>'content_item_id'
        limit v_limit offset v_offset
      )
      select coalesce((select jsonb_agg(item order by (item->>'published_at')::timestamptz desc nulls last,item->>'content_item_id') from paged),'[]'::jsonb),
        (select count(*)::integer from unique_items)
      into v_items,v_total;
      return jsonb_build_object('status','PASS','content_type','QUESTION',
        'school_id',v_school_id,'class_id',null,'items',v_items,'total',v_total,
        'limit',v_limit,'offset',v_offset);
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

      -- Match the canonical actor_context vocabulary; never turn an unresolved
      -- or conflicting class grade into the legacy NULL/all-grades fallback.
      select count(distinct tx.grade_id), min(tx.grade_id::text)::uuid
      into v_grade_matches, v_grade_id
      from public.classes c
      join public.content_grade_aliases cga on cga.alias_code = any(array[
        public.rs_content_normalize_code(c.school_year),
        public.rs_content_normalize_code(c.ano_escolar::text),
        public.rs_content_normalize_code(c.age_group)
      ])
      join school_category_private.taxonomy() tx
        on tx.grade_id=cga.grade_id and not tx.institutional
      where c.id = v_class_id;
      if v_grade_matches <> 1 or v_grade_id is null then
        raise exception 'CANONICAL_CLASS_GRADE_REQUIRED' using errcode='42501';
      end if;
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
      and not contract_operations_private.superseded(tpe.contract_id)
      and tpe.metadata->>'operation_timezone' is distinct from 'America/Sao_Paulo'
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

commit;

