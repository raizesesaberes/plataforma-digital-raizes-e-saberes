create or replace function public.admin_list_students_without_credentials(
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_limit integer default 1000
) returns table(student_id uuid, school_id uuid, class_id uuid, student_name text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if p_school_id is null and p_class_id is null then
    raise exception 'SCHOOL_OR_CLASS_REQUIRED';
  end if;

  if p_school_id is not null and public.current_platform_role() <> 'service_role' and not public.secretaria_can_manage_school(p_school_id) then
    raise exception 'UNAUTHORIZED_PROVISIONING' using errcode = '42501';
  end if;

  if p_class_id is not null and public.current_platform_role() <> 'service_role' and not exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and public.secretaria_can_manage_school(c.school_id)
  ) then
    raise exception 'UNAUTHORIZED_PROVISIONING' using errcode = '42501';
  end if;

  return query
  select s.id, s.school_id, s.class_id, s.nome::text
  from public.students s
  left join public.student_institutional_credentials sic
    on sic.student_id = s.id
  where (p_school_id is null or s.school_id = p_school_id)
    and (p_class_id is null or s.class_id = p_class_id)
    and coalesce(lower(s.status), 'ativo') in ('ativo', 'active')
    and (
      sic.id is null
      or lower(coalesce(sic.status, '')) = 'pending_auth'
    )
  order by s.nome nulls last, s.created_at
  limit greatest(1, least(coalesce(p_limit, 1000), 5000));
end;
$$;

revoke all on function public.admin_list_students_without_credentials(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_list_students_without_credentials(uuid, uuid, integer) to service_role;
