begin;

create table if not exists public.education_networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  municipality text,
  state text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  institutional_metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_school_memberships (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.education_networks(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive', 'ended', 'archived')),
  joined_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_user_memberships (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.education_networks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('secretaria_municipal')),
  status text not null default 'active' check (status in ('active', 'inactive', 'ended', 'archived')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists education_networks_code_uq
  on public.education_networks (lower(code));

create unique index if not exists network_school_memberships_active_uq
  on public.network_school_memberships (network_id, school_id)
  where status = 'active' and ended_at is null;

create index if not exists network_school_memberships_school_idx
  on public.network_school_memberships (school_id, network_id)
  where status = 'active' and ended_at is null;

create unique index if not exists network_user_memberships_active_uq
  on public.network_user_memberships (network_id, profile_id, role)
  where status = 'active' and ended_at is null;

create index if not exists network_user_memberships_profile_idx
  on public.network_user_memberships (profile_id, network_id)
  where status = 'active' and ended_at is null;

drop trigger if exists education_networks_touch_updated_at on public.education_networks;
create trigger education_networks_touch_updated_at
before update on public.education_networks
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists network_school_memberships_touch_updated_at on public.network_school_memberships;
create trigger network_school_memberships_touch_updated_at
before update on public.network_school_memberships
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists network_user_memberships_touch_updated_at on public.network_user_memberships;
create trigger network_user_memberships_touch_updated_at
before update on public.network_user_memberships
for each row execute function public.institutional_touch_updated_at();

alter table public.education_networks enable row level security;
alter table public.network_school_memberships enable row level security;
alter table public.network_user_memberships enable row level security;

create or replace function public.current_network_ids()
returns table(network_id uuid)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select distinct num.network_id
  from public.network_user_memberships num
  where num.profile_id = auth.uid()
    and num.role = 'secretaria_municipal'
    and num.status = 'active'
    and num.started_at <= now()
    and (num.ended_at is null or num.ended_at > now());
$$;

create or replace function public.network_can_read(p_network_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(public.is_platform_admin(), false)
    or exists (
      select 1
      from public.network_user_memberships num
      where num.network_id = p_network_id
        and num.profile_id = auth.uid()
        and num.role = 'secretaria_municipal'
        and num.status = 'active'
        and num.started_at <= now()
        and (num.ended_at is null or num.ended_at > now())
    );
$$;

create or replace function public.current_network_school_ids()
returns table(school_id uuid)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select distinct nsm.school_id
  from public.network_school_memberships nsm
  join public.current_network_ids() cni on cni.network_id = nsm.network_id
  where nsm.status = 'active'
    and nsm.joined_at <= now()
    and (nsm.ended_at is null or nsm.ended_at > now());
$$;

create or replace function public.network_can_manage_school(p_network_id uuid, p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.network_user_memberships num
    join public.network_school_memberships nsm on nsm.network_id = num.network_id
    where num.network_id = p_network_id
      and num.profile_id = auth.uid()
      and num.role = 'secretaria_municipal'
      and num.status = 'active'
      and num.started_at <= now()
      and (num.ended_at is null or num.ended_at > now())
      and nsm.school_id = p_school_id
      and nsm.status = 'active'
      and nsm.joined_at <= now()
      and (nsm.ended_at is null or nsm.ended_at > now())
  );
$$;

create policy "education networks read scoped"
on public.education_networks
for select
to authenticated
using (public.network_can_read(id));

create policy "education networks admin manage"
on public.education_networks
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "network school memberships read scoped"
on public.network_school_memberships
for select
to authenticated
using (public.network_can_read(network_id));

create policy "network school memberships admin manage"
on public.network_school_memberships
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy "network user memberships read scoped"
on public.network_user_memberships
for select
to authenticated
using (public.network_can_read(network_id) or profile_id = auth.uid());

create policy "network user memberships admin manage"
on public.network_user_memberships
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

create or replace function public.network_resolve_requested_network(p_network_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_network_id uuid;
begin
  if p_network_id is not null then
    v_network_id := p_network_id;
  else
    select cni.network_id
      into v_network_id
    from public.current_network_ids() cni
    order by cni.network_id
    limit 1;

    if v_network_id is null and public.is_platform_admin() then
      select en.id
        into v_network_id
      from public.education_networks en
      where en.status = 'active'
      order by en.created_at asc
      limit 1;
    end if;
  end if;

  if v_network_id is null or not public.network_can_read(v_network_id) then
    raise exception 'NETWORK_ACCESS_DENIED' using errcode = '42501';
  end if;

  return v_network_id;
end;
$$;

create or replace function public.network_school_metric_rows(
  p_network_id uuid,
  p_date_from date default null,
  p_date_to date default null
)
returns table(
  school_id uuid,
  school_name text,
  school_status text,
  active_students bigint,
  active_classes bigint,
  active_teachers bigint,
  attendance_rate numeric,
  assessment_assignments bigint,
  assigned_students bigint,
  completed_students bigint,
  assessment_participation numeric,
  assessment_average numeric,
  bncc_skills bigint,
  bncc_questions bigint,
  bncc_responses bigint,
  bncc_correct bigint,
  bncc_percentage numeric,
  diary_entries bigint
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with linked_schools as (
    select s.id, s.nome, s.status
    from public.network_school_memberships nsm
    join public.schools s on s.id = nsm.school_id
    where nsm.network_id = p_network_id
      and nsm.status = 'active'
      and nsm.joined_at <= now()
      and (nsm.ended_at is null or nsm.ended_at > now())
  ),
  attendance as (
    select ar.school_id,
      count(*) filter (where lower(ar.status) in ('present', 'presente')) as present_count,
      count(*) filter (where lower(ar.status) in ('present', 'presente', 'absent', 'ausente', 'justified', 'justificada')) as total_count
    from public.attendance_records ar
    join linked_schools ls on ls.id = ar.school_id
    where (p_date_from is null or ar.attendance_date >= p_date_from)
      and (p_date_to is null or ar.attendance_date <= p_date_to)
    group by ar.school_id
  ),
  assignment_stats as (
    select aa.school_id,
      count(distinct aa.id) as assessment_assignments,
      count(distinct coalesce(aa.student_id, e.student_id)) as assigned_students,
      count(distinct ar.student_id) as completed_students,
      avg(ar.score_percentage) filter (where ar.status in ('submitted', 'graded')) as assessment_average
    from public.assessment_assignments aa
    join linked_schools ls on ls.id = aa.school_id
    left join public.enrollments e on aa.target_type = 'class'
      and e.class_id = aa.class_id
      and e.school_id = aa.school_id
      and e.status = 'active'
    left join public.assessment_results ar on ar.assignment_id = aa.id
      and ar.school_id = aa.school_id
      and ar.status in ('submitted', 'graded')
    where aa.status = 'published'
      and (p_date_from is null or coalesce(aa.published_at, aa.created_at)::date >= p_date_from)
      and (p_date_to is null or coalesce(aa.published_at, aa.created_at)::date <= p_date_to)
    group by aa.school_id
  ),
  bncc_stats as (
    select ar.school_id,
      count(distinct qi.bncc_skill) filter (where nullif(qi.bncc_skill, '') is not null) as bncc_skills,
      count(distinct aq.question_id) as bncc_questions,
      count(resp.id) as bncc_responses,
      count(resp.id) filter (where resp.is_correct is true) as bncc_correct
    from public.assessment_results ar
    join linked_schools ls on ls.id = ar.school_id
    join public.assessment_questions aq on aq.assessment_id = ar.assessment_id
    join public.question_items qi on qi.id = aq.question_id
    left join public.assessment_responses resp on resp.attempt_id = ar.attempt_id
      and resp.question_id = aq.question_id
    where ar.status in ('submitted', 'graded')
      and (p_date_from is null or ar.finalized_at::date >= p_date_from)
      and (p_date_to is null or ar.finalized_at::date <= p_date_to)
    group by ar.school_id
  ),
  diary_stats as (
    select cde.school_id, count(*) as diary_entries
    from public.class_diary_entries cde
    join linked_schools ls on ls.id = cde.school_id
    where cde.deleted_at is null
      and (p_date_from is null or cde.entry_date >= p_date_from)
      and (p_date_to is null or cde.entry_date <= p_date_to)
    group by cde.school_id
  )
  select
    ls.id,
    ls.nome::text,
    coalesce(ls.status, 'active')::text,
    count(distinct st.id) filter (where coalesce(st.status, 'active') = 'active')::bigint,
    count(distinct cl.id) filter (where coalesce(cl.status, 'active') = 'active')::bigint,
    count(distinct t.id) filter (where coalesce(t.status, 'active') = 'active')::bigint,
    case when coalesce(att.total_count, 0) = 0 then null else round((att.present_count::numeric / att.total_count::numeric) * 100, 2) end,
    coalesce(ast.assessment_assignments, 0)::bigint,
    coalesce(ast.assigned_students, 0)::bigint,
    coalesce(ast.completed_students, 0)::bigint,
    case when coalesce(ast.assigned_students, 0) = 0 then null else round((ast.completed_students::numeric / ast.assigned_students::numeric) * 100, 2) end,
    round(coalesce(ast.assessment_average, 0), 2),
    coalesce(bncc.bncc_skills, 0)::bigint,
    coalesce(bncc.bncc_questions, 0)::bigint,
    coalesce(bncc.bncc_responses, 0)::bigint,
    coalesce(bncc.bncc_correct, 0)::bigint,
    case when coalesce(bncc.bncc_responses, 0) = 0 then null else round((bncc.bncc_correct::numeric / bncc.bncc_responses::numeric) * 100, 2) end,
    coalesce(ds.diary_entries, 0)::bigint
  from linked_schools ls
  left join public.students st on st.school_id = ls.id
  left join public.classes cl on cl.school_id = ls.id
  left join public.teachers t on t.school_id = ls.id
  left join attendance att on att.school_id = ls.id
  left join assignment_stats ast on ast.school_id = ls.id
  left join bncc_stats bncc on bncc.school_id = ls.id
  left join diary_stats ds on ds.school_id = ls.id
  group by
    ls.id, ls.nome, ls.status,
    att.present_count, att.total_count,
    ast.assessment_assignments, ast.assigned_students, ast.completed_students, ast.assessment_average,
    bncc.bncc_skills, bncc.bncc_questions, bncc.bncc_responses, bncc.bncc_correct,
    ds.diary_entries
  order by ls.nome;
$$;

create or replace function public.network_get_overview(
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
  v_network_id uuid;
  v_network public.education_networks%rowtype;
  v_schools jsonb;
  v_summary jsonb;
begin
  v_network_id := public.network_resolve_requested_network(p_network_id);

  select * into v_network from public.education_networks where id = v_network_id;

  with metrics as (
    select * from public.network_school_metric_rows(v_network_id, p_date_from, p_date_to)
  )
  select
    coalesce(jsonb_agg(to_jsonb(metrics) order by school_name), '[]'::jsonb),
    jsonb_build_object(
      'schools_total', count(*),
      'schools_active', count(*) filter (where school_status = 'active'),
      'active_students', coalesce(sum(active_students), 0),
      'active_classes', coalesce(sum(active_classes), 0),
      'active_teachers', coalesce(sum(active_teachers), 0),
      'attendance_rate', case when count(attendance_rate) = 0 then null else round(avg(attendance_rate), 2) end,
      'assessment_assignments', coalesce(sum(assessment_assignments), 0),
      'assigned_students', coalesce(sum(assigned_students), 0),
      'completed_students', coalesce(sum(completed_students), 0),
      'assessment_participation', case when coalesce(sum(assigned_students), 0) = 0 then null else round((sum(completed_students)::numeric / sum(assigned_students)::numeric) * 100, 2) end,
      'assessment_average', case when count(nullif(assessment_average, 0)) = 0 then null else round(avg(nullif(assessment_average, 0)), 2) end,
      'bncc_skills', coalesce(sum(bncc_skills), 0),
      'bncc_questions', coalesce(sum(bncc_questions), 0),
      'bncc_responses', coalesce(sum(bncc_responses), 0),
      'bncc_correct', coalesce(sum(bncc_correct), 0),
      'bncc_percentage', case when coalesce(sum(bncc_responses), 0) = 0 then null else round((sum(bncc_correct)::numeric / sum(bncc_responses)::numeric) * 100, 2) end,
      'diary_entries', coalesce(sum(diary_entries), 0)
    )
  into v_schools, v_summary
  from metrics;

  return jsonb_build_object(
    'network', jsonb_build_object(
      'id', v_network.id,
      'name', v_network.name,
      'code', v_network.code,
      'municipality', v_network.municipality,
      'state', v_network.state,
      'status', v_network.status
    ),
    'period', jsonb_build_object('date_from', p_date_from, 'date_to', p_date_to),
    'summary', coalesce(v_summary, '{}'::jsonb),
    'schools', coalesce(v_schools, '[]'::jsonb),
    'scope', jsonb_build_object('kind', 'network', 'global_school_access', false)
  );
end;
$$;

create or replace function public.network_get_school_comparison(
  p_network_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_metric text default 'attendance_rate'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_network_id uuid;
  v_metric text := coalesce(nullif(p_metric, ''), 'attendance_rate');
  v_rows jsonb;
begin
  v_network_id := public.network_resolve_requested_network(p_network_id);

  with metrics as (
    select *,
      case v_metric
        when 'assessment_average' then assessment_average
        when 'assessment_participation' then assessment_participation
        when 'bncc_percentage' then bncc_percentage
        when 'diary_entries' then diary_entries::numeric
        else attendance_rate
      end as metric_value
    from public.network_school_metric_rows(v_network_id, p_date_from, p_date_to)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'school_id', school_id,
    'school_name', school_name,
    'metric', v_metric,
    'value', metric_value,
    'attendance_rate', attendance_rate,
    'assessment_average', assessment_average,
    'assessment_participation', assessment_participation,
    'bncc_percentage', bncc_percentage,
    'diary_entries', diary_entries
  ) order by school_name), '[]'::jsonb)
  into v_rows
  from metrics;

  return jsonb_build_object(
    'network_id', v_network_id,
    'metric', v_metric,
    'schools', v_rows,
    'public_ranking', false
  );
end;
$$;

create or replace function public.network_get_users(p_network_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_network_id uuid;
  v_users jsonb;
begin
  v_network_id := public.network_resolve_requested_network(p_network_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'profile_id', p.id,
    'display_name', coalesce(p.display_name, p.id::text),
    'email', null,
    'role', num.role,
    'status', num.status,
    'started_at', num.started_at
  ) order by coalesce(p.display_name, p.id::text)), '[]'::jsonb)
  into v_users
  from public.network_user_memberships num
  join public.profiles p on p.id = num.profile_id
  where num.network_id = v_network_id
    and num.status = 'active'
    and num.started_at <= now()
    and (num.ended_at is null or num.ended_at > now());

  return jsonb_build_object('network_id', v_network_id, 'users', v_users);
end;
$$;

revoke all on table public.education_networks from public, anon;
revoke all on table public.network_school_memberships from public, anon;
revoke all on table public.network_user_memberships from public, anon;
grant select on table public.education_networks to authenticated;
grant select on table public.network_school_memberships to authenticated;
grant select on table public.network_user_memberships to authenticated;

revoke all on function public.current_network_ids() from public, anon, authenticated;
revoke all on function public.network_can_read(uuid) from public, anon, authenticated;
revoke all on function public.current_network_school_ids() from public, anon, authenticated;
revoke all on function public.network_can_manage_school(uuid, uuid) from public, anon, authenticated;
revoke all on function public.network_resolve_requested_network(uuid) from public, anon, authenticated;
revoke all on function public.network_school_metric_rows(uuid, date, date) from public, anon, authenticated;
revoke all on function public.network_get_overview(uuid, date, date) from public, anon, authenticated;
revoke all on function public.network_get_school_comparison(uuid, date, date, text) from public, anon, authenticated;
revoke all on function public.network_get_users(uuid) from public, anon, authenticated;

grant execute on function public.current_network_ids() to authenticated;
grant execute on function public.current_network_school_ids() to authenticated;
grant execute on function public.network_can_manage_school(uuid, uuid) to authenticated;
grant execute on function public.network_get_overview(uuid, date, date) to authenticated;
grant execute on function public.network_get_school_comparison(uuid, date, date, text) to authenticated;
grant execute on function public.network_get_users(uuid) to authenticated;

insert into public.education_networks (id, name, code, municipality, state, status, institutional_metadata)
values (
  '90000000-0000-0000-0000-000000000001',
  'Rede Municipal PILOT Raízes e Saberes',
  'REDE-PILOT-RAIZES',
  'Santa Helena',
  'GO',
  'active',
  jsonb_build_object('purpose', 'homologacao_rede_municipal_v1')
)
on conflict (id) do update
set name = excluded.name,
    code = excluded.code,
    municipality = excluded.municipality,
    state = excluded.state,
    status = excluded.status,
    updated_at = now();

insert into public.education_networks (id, name, code, municipality, state, status, institutional_metadata)
values (
  '90000000-0000-0000-0000-000000000002',
  'Rede Municipal PILOT Isolamento',
  'REDE-PILOT-ISOLAMENTO',
  'Santa Helena',
  'GO',
  'active',
  jsonb_build_object('purpose', 'isolamento_rede_municipal_v1')
)
on conflict (id) do nothing;

insert into public.network_school_memberships (network_id, school_id, status)
select '90000000-0000-0000-0000-000000000001'::uuid, s.id, 'active'
from public.schools s
where s.id in (
  '10054837-ca0f-4be5-a316-30f0913a0efc',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '299d6be9-bb9b-4a24-8b02-bb36c1f45289'
)
on conflict do nothing;

insert into public.network_user_memberships (network_id, profile_id, role, status)
select
  '90000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  'secretaria_municipal',
  'active'
from public.profiles p
where p.platform_role = 'secretaria'
  and coalesce(p.status, 'active') = 'active'
order by p.created_at asc
limit 1
on conflict do nothing;

commit;
