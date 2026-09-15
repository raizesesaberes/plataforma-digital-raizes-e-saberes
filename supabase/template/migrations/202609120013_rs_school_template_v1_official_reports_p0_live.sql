-- RS-SCHOOL-TEMPLATE V1 - Relatorios Oficiais P0 live.
-- Hardening do legado vazio public.reports + RPCs live para preview institucional.
-- Nao gera PDF/XLSX, storage, snapshots, assinatura digital nem historico de emissao.

begin;

do $$
begin
  if to_regclass('public.reports') is null then
    raise exception 'PRE-CHECK bloqueado: public.reports nao existe';
  end if;
  if to_regclass('public.attendance_records') is null then
    raise exception 'PRE-CHECK bloqueado: public.attendance_records nao existe';
  end if;
  if to_regclass('public.class_diary_entries') is null then
    raise exception 'PRE-CHECK bloqueado: public.class_diary_entries nao existe';
  end if;
  if to_regclass('public.assessment_assignments') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_assignments nao existe';
  end if;
  if to_regprocedure('public.secretaria_can_manage_school(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.secretaria_can_manage_school(uuid) nao existe';
  end if;
  if to_regprocedure('public.institutional_teacher_can_manage_class(uuid, uuid, uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.institutional_teacher_can_manage_class(uuid, uuid, uuid) nao existe';
  end if;
  if to_regprocedure('public.network_can_read(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.network_can_read(uuid) nao existe';
  end if;
end $$;

alter table public.reports enable row level security;
revoke all on table public.reports from public;
revoke all on table public.reports from anon;
revoke all on table public.reports from authenticated;

revoke all on function public.attendance_guardian_can_read(uuid) from public, anon;
revoke all on function public.attendance_teacher_can_record(uuid, uuid, uuid, date) from public, anon;
revoke all on function public.secretaria_list_attendance_events() from public, anon;
revoke all on function public.secretaria_list_attendance_records() from public, anon;
revoke all on function public.teacher_set_attendance_records(uuid, date, jsonb) from public, anon;

grant execute on function public.attendance_guardian_can_read(uuid) to authenticated, service_role;
grant execute on function public.attendance_teacher_can_record(uuid, uuid, uuid, date) to authenticated, service_role;
grant execute on function public.secretaria_list_attendance_events() to authenticated, service_role;
grant execute on function public.secretaria_list_attendance_records() to authenticated, service_role;
grant execute on function public.teacher_set_attendance_records(uuid, date, jsonb) to authenticated, service_role;

create or replace function public.report_can_read_school(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(public.is_platform_admin(), false)
    or public.secretaria_can_manage_school(p_school_id)
    or exists (
      select 1
      from public.current_network_school_ids() cns
      where cns.school_id = p_school_id
    );
$$;

create or replace function public.report_can_read_class(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and (
        public.report_can_read_school(c.school_id)
        or exists (
          select 1
          from public.teachers t
          where t.school_id = c.school_id
            and t.profile_id = auth.uid()
            and t.status = 'active'
            and public.institutional_teacher_can_manage_class(t.id, c.id, c.school_id)
        )
      )
  );
$$;

create or replace function public.report_get_attendance(
  p_scope text default 'school',
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_student_id uuid default null,
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
    select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  elsif p_student_id is not null then
    select s.school_id into v_school_id from public.students s where s.id = p_student_id;
  end if;

  if v_scope = 'network' or v_network_id is not null then
    v_network_id := public.network_resolve_requested_network(v_network_id);
    with scoped as (
      select ar.*
      from public.attendance_records ar
      join public.network_school_memberships nsm on nsm.school_id = ar.school_id
      where nsm.network_id = v_network_id
        and nsm.status = 'active'
        and nsm.joined_at <= now()
        and (nsm.ended_at is null or nsm.ended_at > now())
        and ar.attendance_date between v_from and v_to
    )
    select jsonb_build_object(
        'total', count(*),
        'present', count(*) filter (where status = 'present'),
        'absent', count(*) filter (where status = 'absent'),
        'justified', count(*) filter (where status = 'justified'),
        'attendance_rate', round(100 * count(*) filter (where status = 'present')::numeric / nullif(count(*), 0), 2)
      )
    into v_summary
    from scoped;

    with school_rows as (
      select s.id as school_id, s.nome as school_name,
        count(ar.*) as total,
        count(*) filter (where ar.status = 'present') as present,
        count(*) filter (where ar.status = 'absent') as absent,
        count(*) filter (where ar.status = 'justified') as justified,
        round(100 * count(*) filter (where ar.status = 'present')::numeric / nullif(count(ar.*), 0), 2) as attendance_rate
      from public.network_school_memberships nsm
      join public.schools s on s.id = nsm.school_id
      left join public.attendance_records ar on ar.school_id = s.id and ar.attendance_date between v_from and v_to
      where nsm.network_id = v_network_id
        and nsm.status = 'active'
        and nsm.joined_at <= now()
        and (nsm.ended_at is null or nsm.ended_at > now())
      group by s.id, s.nome
      order by s.nome
    )
    select coalesce(jsonb_agg(to_jsonb(school_rows)), '[]'::jsonb) into v_rows from school_rows;
  else
    if v_school_id is null or not public.report_can_read_school(v_school_id) then
      if p_class_id is null or not public.report_can_read_class(p_class_id) then
        raise exception 'REPORT_ACCESS_DENIED' using errcode = '42501';
      end if;
    end if;

    with scoped as (
      select ar.*
      from public.attendance_records ar
      where ar.attendance_date between v_from and v_to
        and (v_school_id is null or ar.school_id = v_school_id)
        and (p_class_id is null or ar.class_id = p_class_id)
        and (p_student_id is null or ar.student_id = p_student_id)
    )
    select jsonb_build_object(
        'total', count(*),
        'present', count(*) filter (where status = 'present'),
        'absent', count(*) filter (where status = 'absent'),
        'justified', count(*) filter (where status = 'justified'),
        'attendance_rate', round(100 * count(*) filter (where status = 'present')::numeric / nullif(count(*), 0), 2)
      )
    into v_summary
    from scoped;

    with student_rows as (
      select st.id as student_id, st.nome as student_name, c.id as class_id, c.nome as class_name,
        count(ar.*) as total,
        count(*) filter (where ar.status = 'present') as present,
        count(*) filter (where ar.status = 'absent') as absent,
        count(*) filter (where ar.status = 'justified') as justified,
        round(100 * count(*) filter (where ar.status = 'present')::numeric / nullif(count(ar.*), 0), 2) as attendance_rate
      from public.students st
      join public.classes c on c.id = st.class_id
      left join public.attendance_records ar on ar.student_id = st.id and ar.attendance_date between v_from and v_to
      where st.school_id = v_school_id
        and (p_class_id is null or st.class_id = p_class_id)
        and (p_student_id is null or st.id = p_student_id)
      group by st.id, st.nome, c.id, c.nome
      order by c.nome, st.nome
    )
    select coalesce(jsonb_agg(to_jsonb(student_rows)), '[]'::jsonb) into v_rows from student_rows;
  end if;

  return jsonb_build_object(
    'report_type', 'attendance',
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

create or replace function public.report_get_class_diary(
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_teacher_id uuid default null,
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
  v_school_id uuid := p_school_id;
  v_summary jsonb;
  v_rows jsonb;
begin
  if p_class_id is not null then
    select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  end if;

  if v_school_id is null or not public.report_can_read_school(v_school_id) then
    if p_class_id is null or not public.report_can_read_class(p_class_id) then
      raise exception 'REPORT_ACCESS_DENIED' using errcode = '42501';
    end if;
  end if;

  with scoped as (
    select cde.*
    from public.class_diary_entries cde
    where cde.entry_date between v_from and v_to
      and cde.deleted_at is null
      and (v_school_id is null or cde.school_id = v_school_id)
      and (p_class_id is null or cde.class_id = p_class_id)
      and (p_teacher_id is null or cde.teacher_id = p_teacher_id)
  )
  select jsonb_build_object(
      'entries', count(*),
      'closed_entries', count(*) filter (where status = 'closed'),
      'draft_entries', count(*) filter (where status = 'draft')
    )
  into v_summary
  from scoped;

  with rows as (
    select cde.id, cde.entry_date, cde.title, cde.status, c.nome as class_name,
      coalesce(p.display_name, 'Professor') as teacher_name,
      cde.taught_content, cde.pedagogical_notes,
      (select count(*) from public.attendance_records ar where ar.class_id = cde.class_id and ar.attendance_date = cde.entry_date) as attendance_records,
      (select count(*) from public.class_diary_activity_links l where l.diary_entry_id = cde.id) as activity_links
    from public.class_diary_entries cde
    join public.classes c on c.id = cde.class_id
    join public.teachers t on t.id = cde.teacher_id
    left join public.profiles p on p.id = t.profile_id
    where cde.entry_date between v_from and v_to
      and cde.deleted_at is null
      and (v_school_id is null or cde.school_id = v_school_id)
      and (p_class_id is null or cde.class_id = p_class_id)
      and (p_teacher_id is null or cde.teacher_id = p_teacher_id)
    order by cde.entry_date desc, c.nome asc
  )
  select coalesce(jsonb_agg(to_jsonb(rows)), '[]'::jsonb) into v_rows from rows;

  return jsonb_build_object(
    'report_type', 'class_diary',
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

create or replace function public.report_get_avalia(
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_assignment_id uuid default null,
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
  v_school_id uuid := p_school_id;
  v_summary jsonb;
  v_rows jsonb;
begin
  if p_class_id is not null then
    select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
  elsif p_assignment_id is not null then
    select aa.school_id into v_school_id from public.assessment_assignments aa where aa.id = p_assignment_id;
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
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.report_can_read_school(uuid) from public, anon;
revoke all on function public.report_can_read_class(uuid) from public, anon;
revoke all on function public.report_get_attendance(text, uuid, uuid, uuid, uuid, date, date) from public, anon;
revoke all on function public.report_get_class_diary(uuid, uuid, uuid, date, date) from public, anon;
revoke all on function public.report_get_avalia(uuid, uuid, uuid, date, date) from public, anon;

grant execute on function public.report_can_read_school(uuid) to authenticated, service_role;
grant execute on function public.report_can_read_class(uuid) to authenticated, service_role;
grant execute on function public.report_get_attendance(text, uuid, uuid, uuid, uuid, date, date) to authenticated, service_role;
grant execute on function public.report_get_class_diary(uuid, uuid, uuid, date, date) to authenticated, service_role;
grant execute on function public.report_get_avalia(uuid, uuid, uuid, date, date) to authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from information_schema.routine_privileges rp
    where rp.routine_schema = 'public'
      and rp.routine_name like 'report_%'
      and rp.grantee in ('anon', 'PUBLIC')
      and rp.privilege_type = 'EXECUTE'
  ) then
    raise exception 'POST-CHECK bloqueado: report RPC com EXECUTE anon/PUBLIC';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants rtg
    where rtg.table_schema = 'public'
      and rtg.table_name = 'reports'
      and rtg.grantee in ('anon', 'PUBLIC', 'authenticated')
  ) then
    raise exception 'POST-CHECK bloqueado: grants diretos remanescentes em public.reports';
  end if;
end $$;

commit;
