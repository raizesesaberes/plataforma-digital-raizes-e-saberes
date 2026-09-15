begin;

drop function if exists public.report_get_avalia(uuid, uuid, uuid, date, date);

create or replace function public.report_get_avalia(
  p_scope text default 'school',
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_assignment_id uuid default null,
  p_network_id uuid default null,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_from date := coalesce(p_date_from, current_date - 29);
  v_to date := coalesce(p_date_to, current_date);
  v_scope text := coalesce(nullif(lower(trim(p_scope)), ''), 'school');
  v_school_id uuid := p_school_id;
  v_network_id uuid := p_network_id;
  v_summary jsonb := '{}'::jsonb;
  v_rows jsonb := '[]'::jsonb;
begin
  if v_to < v_from then
    raise exception 'REPORT_INVALID_PERIOD' using errcode = '22023';
  end if;

  if p_class_id is not null then
    select c.school_id into v_school_id
    from public.classes c
    where c.id = p_class_id;
  elsif p_assignment_id is not null then
    select aa.school_id into v_school_id
    from public.assessment_assignments aa
    where aa.id = p_assignment_id;
  end if;

  if v_scope = 'network' or v_network_id is not null then
    v_network_id := public.network_resolve_requested_network(v_network_id);

    with assignments as (
      select aa.*
      from public.assessment_assignments aa
      join public.network_school_memberships nsm on nsm.school_id = aa.school_id
      where nsm.network_id = v_network_id
        and nsm.status = 'active'
        and nsm.joined_at <= now()
        and (nsm.ended_at is null or nsm.ended_at > now())
        and aa.status = 'published'
        and aa.available_from::date <= v_to
        and coalesce(aa.available_until::date, v_to) >= v_from
        and (p_class_id is null or aa.class_id = p_class_id)
        and (p_assignment_id is null or aa.id = p_assignment_id)
    ),
    aggregates as (
      select
        count(distinct a.id) as assignments,
        count(distinct e.student_id) as assigned_students,
        count(distinct ar.student_id) as completed_students,
        round(100 * count(distinct ar.student_id)::numeric / nullif(count(distinct e.student_id), 0), 2) as participation_percentage,
        round(avg(ar.score_percentage), 2) as average_percentage
      from assignments a
      left join public.enrollments e on e.class_id = a.class_id and e.status = 'active'
      left join public.assessment_results ar on ar.assignment_id = a.id
    )
    select to_jsonb(aggregates) into v_summary from aggregates;

    with rows as (
      select
        aa.id,
        aa.school_id,
        s.nome as school_name,
        a.title as assessment_title,
        c.nome as class_name,
        aa.status,
        count(distinct e.student_id) as assigned_students,
        count(distinct ar.student_id) as completed_students,
        round(100 * count(distinct ar.student_id)::numeric / nullif(count(distinct e.student_id), 0), 2) as participation_percentage,
        round(avg(ar.score_percentage), 2) as average_percentage
      from public.assessment_assignments aa
      join public.network_school_memberships nsm on nsm.school_id = aa.school_id
      join public.schools s on s.id = aa.school_id
      join public.assessments a on a.id = aa.assessment_id
      join public.classes c on c.id = aa.class_id
      left join public.enrollments e on e.class_id = aa.class_id and e.status = 'active'
      left join public.assessment_results ar on ar.assignment_id = aa.id
      where nsm.network_id = v_network_id
        and nsm.status = 'active'
        and nsm.joined_at <= now()
        and (nsm.ended_at is null or nsm.ended_at > now())
        and aa.status = 'published'
        and aa.available_from::date <= v_to
        and coalesce(aa.available_until::date, v_to) >= v_from
        and (p_class_id is null or aa.class_id = p_class_id)
        and (p_assignment_id is null or aa.id = p_assignment_id)
      group by aa.id, aa.school_id, s.nome, a.title, c.nome, aa.status
      order by s.nome asc, a.title asc, c.nome asc
    )
    select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into v_rows from rows;

    return jsonb_build_object(
      'report_type', 'avalia',
      'report_scope', 'network',
      'network_id', v_network_id,
      'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
      'summary', coalesce(v_summary, '{}'::jsonb),
      'rows', coalesce(v_rows, '[]'::jsonb)
    );
  end if;

  if v_school_id is null or not public.report_can_read_school(v_school_id) then
    if p_class_id is null or not public.report_can_read_class(p_class_id) then
      raise exception 'REPORT_ACCESS_DENIED' using errcode = '42501';
    end if;
  end if;

  with assignments as (
    select aa.*
    from public.assessment_assignments aa
    where aa.status = 'published'
      and aa.available_from::date <= v_to
      and coalesce(aa.available_until::date, v_to) >= v_from
      and (v_school_id is null or aa.school_id = v_school_id)
      and (p_class_id is null or aa.class_id = p_class_id)
      and (p_assignment_id is null or aa.id = p_assignment_id)
  ),
  aggregates as (
    select
      count(distinct a.id) as assignments,
      count(distinct e.student_id) as assigned_students,
      count(distinct ar.student_id) as completed_students,
      round(100 * count(distinct ar.student_id)::numeric / nullif(count(distinct e.student_id), 0), 2) as participation_percentage,
      round(avg(ar.score_percentage), 2) as average_percentage
    from assignments a
    left join public.enrollments e on e.class_id = a.class_id and e.status = 'active'
    left join public.assessment_results ar on ar.assignment_id = a.id
  )
  select to_jsonb(aggregates) into v_summary from aggregates;

  with rows as (
    select aa.id, a.title as assessment_title, c.nome as class_name, aa.status,
      count(distinct e.student_id) as assigned_students,
      count(distinct ar.student_id) as completed_students,
      round(100 * count(distinct ar.student_id)::numeric / nullif(count(distinct e.student_id), 0), 2) as participation_percentage,
      round(avg(ar.score_percentage), 2) as average_percentage
    from public.assessment_assignments aa
    join public.assessments a on a.id = aa.assessment_id
    join public.classes c on c.id = aa.class_id
    left join public.enrollments e on e.class_id = aa.class_id and e.status = 'active'
    left join public.assessment_results ar on ar.assignment_id = aa.id
    where aa.status = 'published'
      and aa.available_from::date <= v_to
      and coalesce(aa.available_until::date, v_to) >= v_from
      and (v_school_id is null or aa.school_id = v_school_id)
      and (p_class_id is null or aa.class_id = p_class_id)
      and (p_assignment_id is null or aa.id = p_assignment_id)
    group by aa.id, a.title, c.nome, aa.status
    order by a.title asc, c.nome asc
  )
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into v_rows from rows;

  return jsonb_build_object(
    'report_type', 'avalia',
    'report_scope', case when p_class_id is not null then 'class' else 'school' end,
    'school_id', v_school_id,
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.report_get_avalia(text, uuid, uuid, uuid, uuid, date, date) from public, anon;
grant execute on function public.report_get_avalia(text, uuid, uuid, uuid, uuid, date, date) to authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from information_schema.routine_privileges rp
    where rp.routine_schema = 'public'
      and rp.routine_name = 'report_get_avalia'
      and rp.grantee in ('anon', 'PUBLIC')
      and rp.privilege_type = 'EXECUTE'
  ) then
    raise exception 'POST-CHECK bloqueado: report_get_avalia com EXECUTE anon/PUBLIC';
  end if;
end $$;

commit;
