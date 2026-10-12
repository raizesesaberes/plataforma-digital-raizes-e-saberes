-- REVIEW ONLY; no migration version reserved and no production apply performed.
-- Changes exactly one private function body. No grants, RLS, Auth or data writes.
begin;
do $guard$
declare p record;
begin
 select prosrc,proacl,proconfig,prosecdef,proowner into p from pg_proc
 where oid=to_regprocedure('school_category_private.authorized_items(jsonb,uuid)');
 if not found or md5(p.prosrc) is distinct from '849f5ffcee863c786252c3a75ae2a15d'
 or p.proacl::text is distinct from '{postgres=X/postgres}'
 or p.proconfig is distinct from array['search_path=""','jit=off','plan_cache_mode=force_custom_plan']::text[]
 or p.prosecdef is distinct from true or pg_get_userbyid(p.proowner) is distinct from 'postgres'
 then raise exception 'QUESTION_LICENSE_RESOLVER_PRECONDITION_FAILED';end if;
end $guard$;
create or replace function school_category_private.authorized_items(p_context jsonb,p_item uuid default null)
returns table(content_item_id uuid,question_item_id uuid,title text,content_type public.rs_content_type,grade_id uuid,subject_id uuid,published_at timestamptz)
language sql stable security definer set search_path='' set jit='off' set plan_cache_mode='force_custom_plan' as $$
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
$$;


commit;
