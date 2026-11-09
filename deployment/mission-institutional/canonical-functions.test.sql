CREATE OR REPLACE FUNCTION school_category_private.school_contract(p_school uuid, p_contract uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.contracts c join public.tenants t on t.id=c.tenant_id
 join public.schools s on s.id=p_school and s.status='active'
 where c.id=p_contract and c.status='ACTIVE' and c.starts_at<=case when c.metadata->>'source'='contract_operations_v1' then (now() at time zone 'America/Sao_Paulo')::date else current_date end and (c.ends_at is null or c.ends_at>=case when c.metadata->>'source'='contract_operations_v1' then (now() at time zone 'America/Sao_Paulo')::date else current_date end)
 and t.status='active' and not contract_operations_private.superseded(c.id)
 and case when c.metadata->>'source'='contract_operations_v1' then contract_operations_private.in_scope(c.id,p_school)
 else (t.school_id=s.id or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=s.id and m.status='active' and (m.ended_at is null or m.ended_at>now())))) end
 and (t.network_id is null or exists(select 1 from public.education_networks n where n.id=t.network_id and n.status='active')));
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
$function$
;
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
CREATE OR REPLACE FUNCTION school_category_private.actor_context(p_context jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
declare uid uuid:=auth.uid();sid uuid:=nullif(p_context->>'school_id','')::uuid;cid uuid:=nullif(p_context->>'class_id','')::uuid;
tid uuid;student uuid;actual_school uuid;actual_class uuid;classids uuid[];grades uuid[];institutional boolean:=coalesce(p_context->>'mode','SCHOOL')='INSTITUTIONAL';
begin
 if uid is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if not exists(select 1 from public.profiles where id=uid and status='active') then raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode='42501';end if;
 if exists(select 1 from public.teachers where profile_id=uid and status='active') then
  select id,school_id into tid,actual_school from public.teachers where profile_id=uid and status='active' and (sid is null or school_id=sid) order by created_at desc nulls last,id limit 1;
  if tid is null then raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT' using errcode='42501';end if;sid:=actual_school;
  select coalesce(array_agg(c.id),'{}') into classids from public.class_teacher_memberships m join public.classes c on c.id=m.class_id and c.school_id=sid and c.status='active'
  where m.teacher_id=tid and m.status='active' and (m.ended_at is null or m.ended_at>now()) and (cid is null or c.id=cid);
  if cid is not null and not(cid=any(classids)) then raise exception 'UNAUTHORIZED_CLASS_CONTEXT' using errcode='42501';end if;
 else
  if institutional then raise exception 'INSTITUTIONAL_STAFF_CONTEXT_REQUIRED' using errcode='42501';end if;
  select s.id,e.school_id,e.class_id into student,actual_school,actual_class from public.students s join public.enrollments e on e.student_id=s.id
  join public.classes c on c.id=e.class_id and c.school_id=e.school_id and c.status='active'
  where s.user_id=uid and s.status in('active','ativo') and s.school_id=e.school_id and e.status in('active','ativo') and e.enrolled_at<=now() and (e.ended_at is null or e.ended_at>now()) order by e.enrolled_at desc,e.id limit 1;
  if student is null then raise exception 'UNAUTHORIZED_STUDENT_CONTEXT' using errcode='42501';end if;
  if sid is not null and sid<>actual_school then raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT' using errcode='42501';end if;
  if cid is not null and cid<>actual_class then raise exception 'UNAUTHORIZED_CLASS_CONTEXT' using errcode='42501';end if;
  sid:=actual_school;cid:=actual_class;classids:=array[cid];
 end if;
 if not exists(select 1 from public.schools where id=sid and status='active') then raise exception 'ACTIVE_SCHOOL_REQUIRED' using errcode='42501';end if;
 if institutional then
  if cid is not null then raise exception 'INSTITUTIONAL_CONTEXT_HAS_NO_CLASS';end if;
  select array_agg(grade_id) into grades from school_category_private.taxonomy() tx where tx.institutional;
 else
  with resolved as (
   select c.id,array_agg(distinct tx.grade_id) g from public.classes c
   join public.content_grade_aliases a on a.alias_code=any(array[public.rs_content_normalize_code(c.school_year),public.rs_content_normalize_code(c.ano_escolar::text),public.rs_content_normalize_code(c.age_group)])
   join school_category_private.taxonomy() tx on tx.grade_id=a.grade_id and not tx.institutional
   where c.id=any(classids) group by c.id having count(distinct tx.grade_id)=1
  ) select coalesce(array_agg(distinct x),'{}') into grades from resolved cross join lateral unnest(g) x;
 end if;
 return jsonb_build_object('school_id',sid,'class_id',cid,'grade_ids',to_jsonb(coalesce(grades,'{}')),'institutional',institutional,'teacher',tid is not null);
end $function$
;
CREATE OR REPLACE FUNCTION school_category_private.taxonomy()
 RETURNS TABLE(grade_id uuid, segment_id uuid, stage text, stage_name text, grade_name text, grade_code text, sort_order integer, institutional boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select g.id,g.segment_id,case s.code when 'EDUCACAO_INFANTIL' then 'EI' when 'FUNDAMENTAL' then 'EF_INICIAIS' when 'FUNDAMENTAL_ANOS_FINAIS' then 'EF_FINAIS' when 'ENSINO_MEDIO' then 'EM' else 'INSTITUTIONAL' end,
 s.name,g.name,g.code,g.sort_order,s.code='FORMACAO_INSTITUCIONAL'
 from public.content_grades g join public.content_segments s on s.id=g.segment_id
 where g.status='active' and s.status='active' and (
 (s.code='EDUCACAO_INFANTIL' and g.code in('EI2','EI3','EI4','EI5')) or
 (s.code='FUNDAMENTAL' and g.code in('1_ANO','2_ANO','3_ANO','4_ANO','5_ANO')) or
 (s.code='FUNDAMENTAL_ANOS_FINAIS' and g.code in('6_ANO','7_ANO','8_ANO','9_ANO')) or
 (s.code='ENSINO_MEDIO' and g.code in('EM_1','EM_2','EM_3')) or
 (s.code='FORMACAO_INSTITUCIONAL' and g.code='UNIVERSIDADE_CAPACITACAO'));
$function$
;
CREATE OR REPLACE FUNCTION school_category_private.scope_tenants(p_school uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select t.id from public.tenants t where t.status='active' and (t.school_id=p_school or (t.tenant_type='NETWORK' and exists(
 select 1 from public.network_school_memberships m join public.education_networks n on n.id=m.network_id and n.status='active'
 where m.network_id=t.network_id and m.school_id=p_school and m.status='active' and (m.ended_at is null or m.ended_at>now()))))
 union select c.tenant_id from public.contracts c join contract_operations_private.targets x on x.contract_id=c.id where x.school_id=p_school and school_category_private.school_contract(p_school,c.id);
$function$
;
CREATE OR REPLACE FUNCTION contract_operations_private.adopted(p_school uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.tenants where school_id=p_school and metadata->>'category_entitlements_enabled'='true')
 or exists(select 1 from contract_operations_private.targets where school_id=p_school and adoption_on<=(now() at time zone 'America/Sao_Paulo')::date and not cancelled_before_use)
 -- Network membership can be added after the original adoption snapshot. Such a
 -- school cannot inherit a superseded license through legacy dispatch or raw RLS.
 or exists(select 1 from public.network_school_memberships m
 join public.tenants t on t.network_id=m.network_id and t.tenant_type='NETWORK'
 join public.contracts c on c.tenant_id=t.id
 where m.school_id=p_school and m.status='active' and (m.ended_at is null or m.ended_at>now())
 and contract_operations_private.superseded(c.id));
$function$
;
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