-- Exact definitions/ACLs captured via read-only pg_catalog query on 2026-10-11.
-- LOCAL SYNTHETIC RESTORE ONLY. Never apply these fixtures to production.
CREATE OR REPLACE FUNCTION public.school_content_candidates(p_school_id uuid, p_item_id uuid)
 RETURNS TABLE(contract_id uuid, product_id uuid, contract_ref text, product_name text, grade_id uuid, ends_at date)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
  select distinct c.id,p.id,c.contract_ref,p.name,ci.grade_id,c.ends_at
  from public.content_items ci
  join public.content_grades g on g.id=ci.grade_id and g.status='active'
  join public.content_segments sg on sg.id=g.segment_id and sg.status='active'
  join public.content_question_items cq on cq.content_item_id=ci.id
  join public.question_items q on q.id=cq.question_item_id
  join public.content_collection_items cci on cci.content_item_id=ci.id
  join public.content_collections cc on cc.id=cci.collection_id and cc.status='active'
  join public.product_collections pc on pc.collection_id=cci.collection_id
  join public.products p on p.id=pc.product_id and p.status='ACTIVE'
  join public.contract_products cp on cp.product_id=p.id and cp.status='active'
  join public.contracts c on c.id=cp.contract_id and c.status='ACTIVE'
    and c.starts_at<=current_date and (c.ends_at is null or c.ends_at>=current_date)
  join public.tenants ct on ct.id=c.tenant_id and ct.status='active'
  where ci.id=p_item_id and ci.content_type='QUESTION' and ci.editorial_status='PUBLISHED'
    and ci.published_at is not null and q.publication_status='PUBLICADO' and q.curation_status='APROVADO'
    and (ci.segment_id is null or ci.segment_id=g.segment_id)
    and (ci.owner_scope='GLOBAL_RAIZES' or exists(select 1 from public.tenants owner where owner.id=ci.owner_tenant_id
      and owner.status='active' and (owner.school_id=p_school_id or (owner.tenant_type='NETWORK' and exists(select 1 from public.education_networks en where en.id=owner.network_id and en.status='active') and exists(
        select 1 from public.network_school_memberships membership where membership.network_id=owner.network_id
        and membership.school_id=p_school_id and membership.status='active' and (membership.ended_at is null or membership.ended_at>now()))))))
    and exists(select 1 from public.content_grade_aliases a where a.grade_id=ci.grade_id
      and a.alias_code=public.rs_content_normalize_code(q.school_year))
    and (ct.school_id=p_school_id or (ct.tenant_type='NETWORK' and exists(select 1 from public.education_networks en where en.id=ct.network_id and en.status='active') and exists(
      select 1 from public.network_school_memberships n where n.network_id=ct.network_id
      and n.school_id=p_school_id and n.status='active' and (n.ended_at is null or n.ended_at>now()))))
    and exists(select 1 from public.product_content_modules pm join public.content_modules m on m.id=pm.content_module_id
      where pm.product_id=p.id and m.status='active' and 'QUESTION'=any(m.content_types))
    and ((jsonb_typeof(cp.metadata->'authorized_grade_ids')='array' and cp.metadata->'authorized_grade_ids' ? ci.grade_id::text)
      or exists(select 1 from public.tenant_product_entitlements e
        join public.tenants et on et.id=e.tenant_id and et.status='active'
        where e.contract_id=c.id and e.product_id=p.id and e.status='ACTIVE'
        and e.metadata->>'source' is distinct from 'school_content_admin_v1'
        and e.starts_at<=current_date and (e.ends_at is null or e.ends_at>=current_date)
        and ci.grade_id=any(e.grade_ids)
        and (cardinality(e.segment_ids)=0 or g.segment_id=any(e.segment_ids))
        and (cardinality(e.subject_ids)=0 or ci.subject_id=any(e.subject_ids))
        and (et.school_id=p_school_id or et.id=ct.id)))
$function$
;
revoke all on function public.school_content_candidates(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.school_content_candidates(uuid,uuid) to service_role;

CREATE OR REPLACE FUNCTION public.school_content_managed_grades(p_school_id uuid, p_class_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
 with classes as (
   select c.id,c.school_year,c.ano_escolar,c.age_group from public.teachers t
   join public.class_teacher_memberships m on m.teacher_id=t.id and m.status='active' and (m.ended_at is null or m.ended_at>now())
   join public.classes c on c.id=m.class_id and c.school_id=t.school_id and c.status='active'
   where t.profile_id=auth.uid() and t.status='active' and t.school_id=p_school_id and (p_class_id is null or c.id=p_class_id)
   union
   select c.id,c.school_year,c.ano_escolar,c.age_group from public.students s
   join public.enrollments e on e.student_id=s.id and e.status='active' and e.enrolled_at<=now() and (e.ended_at is null or e.ended_at>now())
   join public.classes c on c.id=e.class_id and c.school_id=e.school_id and c.status='active'
   where s.user_id=auth.uid() and s.status='active' and e.school_id=p_school_id and s.school_id=p_school_id and (p_class_id is null or c.id=p_class_id)
 ), resolved as (
   select c.id,array_agg(distinct a.grade_id) grades from classes c
   join public.content_grade_aliases a on a.alias_code=any(array[public.rs_content_normalize_code(c.school_year),public.rs_content_normalize_code(c.ano_escolar::text),public.rs_content_normalize_code(c.age_group)])
   join public.content_grades g on g.id=a.grade_id and g.status='active'
   group by c.id having count(distinct a.grade_id)=1
 ) select distinct unnest(grades) from resolved
 where exists(select 1 from public.profiles p where p.id=auth.uid() and p.status='active')
   and exists(select 1 from public.schools s where s.id=p_school_id and s.status='active')
$function$
;
revoke all on function public.school_content_managed_grades(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.school_content_managed_grades(uuid,uuid) to service_role;
