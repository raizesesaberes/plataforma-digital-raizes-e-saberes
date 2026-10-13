-- REVIEW ONLY. New institutional metadata access requires specific review before production.
-- No migration version, data writes, policy edits or production application.
begin;
do $guard$
begin
 if md5(pg_get_functiondef(to_regprocedure('school_category_private.active_rules(jsonb)'))) is distinct from '87a23950871b720542e63c3e9c4b2871' then raise exception 'INSPECTION_CANONICAL_DRIFT_active_rules';end if;
 if md5(pg_get_functiondef(to_regprocedure('school_category_private.authorized_items(jsonb,uuid)'))) is distinct from '5b5296af33547a9e6644084680b40502' then raise exception 'INSPECTION_CANONICAL_DRIFT_authorized_items';end if;
end $guard$;
CREATE OR REPLACE FUNCTION school_category_private.active_rules_for_context(p_context jsonb, p_actor_context jsonb)
 RETURNS TABLE(module_id uuid, module_name text, rule_grade uuid, rule_subject uuid, content_types rs_content_type[], segment_id uuid, institutional boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
 with ctx as materialized(select p_actor_context c),
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
CREATE OR REPLACE FUNCTION school_category_private.active_rules(p_context jsonb)
 RETURNS TABLE(module_id uuid, module_name text, rule_grade uuid, rule_subject uuid, content_types rs_content_type[], segment_id uuid, institutional boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
 select * from school_category_private.active_rules_for_context(p_context,school_category_private.actor_context(p_context));
$function$;
CREATE OR REPLACE FUNCTION school_category_private.authorized_items_for_context(p_context jsonb, p_actor_context jsonb, p_item uuid DEFAULT NULL::uuid, p_rule_grade uuid DEFAULT NULL::uuid)
 RETURNS TABLE(content_item_id uuid, question_item_id uuid, title text, content_type rs_content_type, grade_id uuid, subject_id uuid, published_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
 with ctx as materialized(select p_actor_context c),
 context as materialized(select (c->>'school_id')::uuid school_id,(c->>'institutional')::boolean institutional,
 array(select value::uuid from jsonb_array_elements_text(c->'grade_ids')) grade_ids from ctx),
 scope as materialized(select school_category_private.scope_tenants(x.school_id) id from context x),
 rules as materialized (select * from school_category_private.active_rules_for_context(p_context,p_actor_context) where (nullif(p_context->>'module_id','') is null or module_id=(p_context->>'module_id')::uuid) and (p_rule_grade is null or rule_grade=p_rule_grade) ), blocked as materialized (
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
CREATE OR REPLACE FUNCTION school_category_private.authorized_items(p_context jsonb, p_item uuid DEFAULT NULL::uuid)
 RETURNS TABLE(content_item_id uuid, question_item_id uuid, title text, content_type rs_content_type, grade_id uuid, subject_id uuid, published_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
 SET plan_cache_mode TO 'force_custom_plan'
AS $function$
 select * from school_category_private.authorized_items_for_context(p_context,school_category_private.actor_context(p_context),p_item);
$function$;
revoke all on function school_category_private.active_rules_for_context(jsonb,jsonb),school_category_private.authorized_items_for_context(jsonb,jsonb,uuid,uuid) from public,anon,authenticated,service_role;

-- Only metadata is returned; no question text, answer key, signed asset or user identity.
create function public.school_inspect_available_content(p_school_id uuid,p_filter jsonb default '{}',p_limit integer default 25,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' set jit='off' set statement_timeout='15s' as $$
declare actor_role text;school public.schools%rowtype;contexts jsonb;result jsonb;contracts jsonb;categories jsonb;typ text:=nullif(p_filter->>'content_type','');grade uuid:=nullif(p_filter->>'grade_id','')::uuid;needle text:=btrim(coalesce(p_filter->>'query',''));
begin
 select lower(platform_role) into actor_role from public.profiles where id=auth.uid() and status='active';
 if actor_role is null or actor_role not in('admin','secretaria','gestor','coordenador') then raise exception 'INSTITUTIONAL_INSPECTION_DENIED' using errcode='42501';end if;
 if actor_role<>'admin' and not public.secretaria_can_manage_school(p_school_id) then raise exception 'INSTITUTIONAL_INSPECTION_DENIED' using errcode='42501';end if;
 select * into school from public.schools where id=p_school_id;
 if school.id is null then raise exception 'INSTITUTIONAL_INSPECTION_DENIED' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset<0 or p_offset>100000 or length(needle)>200 then raise exception 'INVALID_INSPECTION_PAGE';end if;
 if typ is not null and typ<>all(enum_range(null::public.rs_content_type)::text[]) then raise exception 'INVALID_INSPECTION_TYPE';end if;
 -- Contract registration is distinct from effective canonical rules. No prices or private contract metadata.
 select coalesce(jsonb_agg(jsonb_build_object('reference',c.contract_ref,'status',c.status,'starts_at',c.starts_at,'ends_at',c.ends_at,'effective',school_category_private.school_contract(p_school_id,c.id)) order by c.contract_ref),'[]') into contracts
 from public.contracts c where exists(select 1 from public.tenant_product_entitlements e join public.tenants t on t.id=e.tenant_id where e.contract_id=c.id and t.school_id=p_school_id);
 if school.status<>'active' then return jsonb_build_object('status','INACTIVE_SCHOOL','school_id',school.id,'school_name',school.nome,'contracts',contracts,'categories','[]'::jsonb,'total',0,'items','[]'::jsonb,'limit',p_limit,'offset',p_offset);end if;
 if not school_category_private.dynamic_school(jsonb_build_object('school_id',p_school_id)) then return jsonb_build_object('status','ADAPTER_REQUIRED','school_id',school.id,'school_name',school.nome,'contracts',contracts,'categories','[]'::jsonb,'total',null,'items','[]'::jsonb,'limit',p_limit,'offset',p_offset);end if;
 -- School-wide taxonomy union, never an impersonated student. Each person's runtime scope remains unchanged.
 select jsonb_agg(jsonb_build_object('school_id',p_school_id,'institutional',institutional,'grade_ids',grades)) into contexts
 from (select institutional,jsonb_agg(grade_id) grades from school_category_private.taxonomy() group by institutional) tx;
 with contexts as materialized(select value ctx from jsonb_array_elements(contexts)),
 rules as materialized(select distinct r.* from contexts x cross join lateral school_category_private.active_rules_for_context('{}',x.ctx) r),
 configured as materialized(
  select distinct (r->>'module_id')::uuid module_id,r->>'content_type' content_type,(r->>'grade_id')::uuid grade_id
  from public.tenants t join public.tenant_product_entitlements e on e.tenant_id=t.id
  cross join lateral jsonb_array_elements(case when jsonb_typeof(e.metadata->'category_rules')='array' then e.metadata->'category_rules' else '[]' end) r
  where t.school_id=p_school_id and e.metadata->>'source'='school_content_category_v1'
 ), keys as (select * from configured union select module_id,unnest(content_types)::text,rule_grade from rules),
 counted as (
  select k.*,m.name module_name,tx.grade_name,exists(select 1 from rules r where r.module_id=k.module_id and r.rule_grade=k.grade_id and k.content_type=any(r.content_types::text[])) effective,
   (select count(distinct a.content_item_id) from contexts x cross join lateral school_category_private.authorized_items_for_context(jsonb_build_object('module_id',k.module_id,'content_type',k.content_type),x.ctx,null,k.grade_id) a join public.content_items ci on ci.id=a.content_item_id
    where ci.owner_scope<>'TEACHER' and (a.grade_id=k.grade_id or (ci.metadata->>'category_mode'='TRANSVERSAL' and ci.metadata->'category_grade_ids' ? k.grade_id::text))) total
  from keys k join public.content_modules m on m.id=k.module_id join school_category_private.taxonomy() tx on tx.grade_id=k.grade_id
 ) select coalesce(jsonb_agg(jsonb_build_object('module_id',module_id,'module_name',module_name,'content_type',content_type,'grade_id',grade_id,'grade_name',grade_name,'configured',true,'effective',effective,'total',case when effective then total else 0 end,'state',case when not effective then 'RESTRICTED' when total=0 then 'AWAITING_PUBLICATION' else 'AVAILABLE' end) order by content_type,grade_name,module_id),'[]') into categories from counted;
 with contexts as materialized(select value ctx from jsonb_array_elements(contexts)),
 allowed as materialized(
  select distinct a.* from contexts x cross join lateral school_category_private.authorized_items_for_context('{}',x.ctx) a
  join public.content_items ci on ci.id=a.content_item_id where ci.owner_scope<>'TEACHER'
 ), grade_allowed as materialized(
  select distinct a.* from contexts x cross join lateral school_category_private.authorized_items_for_context('{}',x.ctx,null,grade) a
  join public.content_items ci on ci.id=a.content_item_id where ci.owner_scope<>'TEACHER'
 ), matched as materialized(
  select a.*,ci.metadata from grade_allowed a join public.content_items ci on ci.id=a.content_item_id
  where (typ is null or a.content_type::text=typ)
  and (needle='' or a.title ilike '%'||needle||'%')
 ), page as (select * from matched order by title,content_item_id limit p_limit offset p_offset)
 select jsonb_build_object('status','PASS','school_id',school.id,'school_name',school.nome,'contracts',contracts,'categories',categories,
 'total',(select count(*) from matched),'type_totals',(select coalesce(jsonb_object_agg(z.content_type,z.total),'{}') from (select content_type,count(*) total from allowed group by content_type) z),'limit',p_limit,'offset',p_offset,
 'items',coalesce(jsonb_agg(jsonb_build_object('id',p.content_item_id,'title',p.title,'content_type',p.content_type,'grade_id',p.grade_id,'published_at',p.published_at,
 'delivery_status',case when p.content_type='QUESTION' then 'QUESTION_ENGINE' else 'ADAPTER_NOT_VERIFIED' end) order by p.title,p.content_item_id),'[]')) into result from page p;
 return result;
end $$;
revoke all on function public.school_inspect_available_content(uuid,jsonb,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.school_inspect_available_content(uuid,jsonb,integer,integer) to authenticated;
commit;
