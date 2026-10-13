-- Recovery only after explicit rollback decision; restores function definitions, not migration history.
begin;
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
  from context x join public.tenants t on t.school_id=x.school_id and t.tenant_type='SCHOOL' and t.status='active' and contract_operations_private.adopted(t.school_id)
  join public.tenant_product_entitlements e on e.tenant_id=t.id and e.status='ACTIVE' and e.starts_at<=case when e.metadata->>'operation_timezone'='America/Sao_Paulo' then (now() at time zone 'America/Sao_Paulo')::date else current_date end and (e.ends_at is null or e.ends_at>=case when e.metadata->>'operation_timezone'='America/Sao_Paulo' then (now() at time zone 'America/Sao_Paulo')::date else current_date end) and e.metadata->>'source'='school_content_category_v1'
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
$function$
;
CREATE OR REPLACE FUNCTION school_category_private.authorized_items(p_context jsonb, p_item uuid DEFAULT NULL::uuid)
 RETURNS TABLE(content_item_id uuid, question_item_id uuid, title text, content_type rs_content_type, grade_id uuid, subject_id uuid, published_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
 with ctx as materialized(select school_category_private.actor_context(p_context) c),
 context as materialized(select (c->>'school_id')::uuid school_id,(c->>'institutional')::boolean institutional,
 array(select value::uuid from jsonb_array_elements_text(c->'grade_ids')) grade_ids from ctx),
 scope as materialized(select school_category_private.scope_tenants(x.school_id) id from context x),
 rules as materialized (select * from school_category_private.active_rules(p_context) where nullif(p_context->>'module_id','') is null or module_id=(p_context->>'module_id')::uuid ), blocked as materialized (
  select b.content_item_id from public.content_access_exceptions b cross join context x
  where b.action in('BLOCK','EMBARGO') and (b.school_id=x.school_id or b.tenant_id in(select id from scope))
  and (b.starts_at is null or b.starts_at<=now()) and (b.ends_at is null or b.ends_at>=now())
 ), selected as materialized (
  select ci.* from public.content_items ci where (p_item is null or ci.id=p_item)
   and ci.content_type=coalesce(nullif(p_context->>'content_type','')::public.rs_content_type,ci.content_type)
   and ci.editorial_status='PUBLISHED' and ci.published_at is not null and ci.published_at<=now()
   and ci.id not in(select content_item_id from blocked)
 ), eligible as (
  select distinct ci.id,cq.question_item_id,ci.title,ci.content_type,ci.grade_id,ci.subject_id,ci.published_at
  from selected ci cross join context x join rules r on ci.content_type=any(r.content_types)
  left join public.content_question_items cq on cq.content_item_id=ci.id
  left join public.question_items q on q.id=cq.question_item_id
  where (r.rule_subject is null or ci.subject_id=r.rule_subject)
  and (nullif(p_context->>'subject_id','') is null or ci.subject_id=(p_context->>'subject_id')::uuid)
  and (ci.subject_id is null or exists(select 1 from public.content_subjects sub where sub.id=ci.subject_id and sub.status='active'))
  and (ci.content_type<>'QUESTION' or (
   q.publication_status='PUBLICADO' and q.curation_status='APROVADO'
   -- Both licenses are required at read time: revocation must take effect immediately.
   and exists (
    select 1 from public.question_sources qs
    join public.question_licenses ql on ql.id=q.license_id and ql.publication_allowed is true
    join public.question_licenses sl on sl.id=qs.license_id and sl.publication_allowed is true
    where qs.id=q.source_id
   )
  ))
  and (
   (coalesce(ci.metadata->>'category_mode','GRADE')='GRADE' and not r.institutional and ci.grade_id=r.rule_grade and (ci.segment_id is null or ci.segment_id=r.segment_id))
   or (ci.metadata->>'category_mode'='TRANSVERSAL' and not r.institutional and ci.grade_id is null and jsonb_typeof(ci.metadata->'category_grade_ids')='array' and ci.metadata->'category_grade_ids' ? r.rule_grade::text and (ci.segment_id is null or ci.segment_id=r.segment_id))
   or (ci.metadata->>'category_mode'='INSTITUTIONAL' and r.institutional and x.institutional and ci.grade_id=r.rule_grade and ci.segment_id=r.segment_id))
  and (ci.owner_scope='GLOBAL_RAIZES'
   or (ci.owner_scope in('SCHOOL','NETWORK') and ci.owner_tenant_id in(select id from scope))
   or (ci.owner_scope='TEACHER' and ci.owner_user_id=auth.uid()))
 ) select * from eligible;
$function$
;
drop function public.school_inspect_available_content(uuid,jsonb,integer,integer);
drop function school_category_private.authorized_items_for_context(jsonb,jsonb,uuid,uuid);
drop function school_category_private.active_rules_for_context(jsonb,jsonb);
commit;
