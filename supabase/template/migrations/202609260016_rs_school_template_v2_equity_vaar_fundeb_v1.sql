-- Equidade Educacional / VAAR-FUNDEB V1
-- Camada agregada sobre analytics existentes, sem dados ficticios e sem novo motor paralelo.

do $$
begin
  if to_regclass('public.assessment_results') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_results nao existe';
  end if;
  if to_regclass('public.students') is null then
    raise exception 'PRE-CHECK bloqueado: public.students nao existe';
  end if;
  if to_regclass('public.enrollments') is null then
    raise exception 'PRE-CHECK bloqueado: public.enrollments nao existe';
  end if;
  if to_regclass('public.attendance_records') is null then
    raise exception 'PRE-CHECK bloqueado: public.attendance_records nao existe';
  end if;
  if to_regclass('public.education_networks') is null then
    raise exception 'PRE-CHECK bloqueado: public.education_networks nao existe';
  end if;
  if to_regclass('public.official_report_exports') is null then
    raise exception 'PRE-CHECK bloqueado: public.official_report_exports nao existe';
  end if;
  if to_regprocedure('public.avalia_plus_classify_proficiency(numeric, uuid, uuid, uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.avalia_plus_classify_proficiency nao existe';
  end if;
  if to_regprocedure('public.network_can_read(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.network_can_read(uuid) nao existe';
  end if;
end
$$;

create table if not exists public.equity_student_attributes (
  student_id uuid primary key references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  race_ethnicity text,
  nse_band text,
  territory text,
  pcd_status text,
  gender text,
  source_type text not null default 'official_import'
    check (source_type in ('official_import', 'institutional_self_declaration', 'administrative_record', 'not_informed')),
  data_status text not null default 'available'
    check (data_status in ('available', 'empty_real', 'archived')),
  legal_basis text not null default 'public_policy',
  effective_from date not null default current_date,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equity_official_indicator_imports (
  id uuid primary key default gen_random_uuid(),
  network_id uuid references public.education_networks(id) on delete restrict,
  school_id uuid references public.schools(id) on delete restrict,
  indicator_code text not null,
  indicator_name text not null,
  period_start date not null,
  period_end date not null,
  data_kind text not null default 'DADO_OFICIAL_IMPORTADO'
    check (data_kind = 'DADO_OFICIAL_IMPORTADO'),
  source_document text,
  payload jsonb not null default '{}'::jsonb,
  imported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint equity_official_indicator_scope_check check (network_id is not null or school_id is not null),
  constraint equity_official_indicator_period_check check (period_end >= period_start)
);

create table if not exists public.equity_vaar_evidence_snapshots (
  id uuid primary key default gen_random_uuid(),
  scope_kind text not null check (scope_kind in ('network', 'school')),
  network_id uuid references public.education_networks(id) on delete restrict,
  school_id uuid references public.schools(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  data_kind text not null check (data_kind in ('INDICADOR_INTERNO', 'DADO_OFICIAL_IMPORTADO')),
  indicator_payload jsonb not null,
  snapshot_hash text not null,
  generated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint equity_vaar_snapshot_scope_check check (
    (scope_kind = 'network' and network_id is not null and school_id is null)
    or (scope_kind = 'school' and school_id is not null)
  ),
  constraint equity_vaar_snapshot_period_check check (period_end >= period_start)
);

create index if not exists equity_student_attributes_school_idx
  on public.equity_student_attributes (school_id);
create index if not exists equity_student_attributes_dimensions_idx
  on public.equity_student_attributes (race_ethnicity, nse_band, pcd_status, territory, gender)
  where data_status = 'available';
create index if not exists equity_official_indicator_network_idx
  on public.equity_official_indicator_imports (network_id, period_start, period_end)
  where network_id is not null;
create index if not exists equity_official_indicator_school_idx
  on public.equity_official_indicator_imports (school_id, period_start, period_end)
  where school_id is not null;
create index if not exists equity_vaar_snapshot_network_idx
  on public.equity_vaar_evidence_snapshots (network_id, created_at desc)
  where network_id is not null;
create index if not exists equity_vaar_snapshot_school_idx
  on public.equity_vaar_evidence_snapshots (school_id, created_at desc)
  where school_id is not null;

create or replace function public.equity_touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists trg_equity_student_attributes_touch on public.equity_student_attributes;
create trigger trg_equity_student_attributes_touch
before update on public.equity_student_attributes
for each row execute function public.equity_touch_updated_at();

create or replace function public.equity_small_group_minimum()
returns integer
language sql
immutable
as $$
  select 5;
$$;

create or replace function public.equity_dimension_value(
  p_attrs public.equity_student_attributes,
  p_dimension text
)
returns text
language plpgsql
immutable
as $$
begin
  case lower(coalesce(nullif(p_dimension, ''), 'race_ethnicity'))
    when 'race_ethnicity' then return nullif(btrim(p_attrs.race_ethnicity), '');
    when 'nse_band' then return nullif(btrim(p_attrs.nse_band), '');
    when 'territory' then return nullif(btrim(p_attrs.territory), '');
    when 'pcd_status' then return nullif(btrim(p_attrs.pcd_status), '');
    when 'gender' then return nullif(btrim(p_attrs.gender), '');
    else
      raise exception 'UNSUPPORTED_EQUITY_DIMENSION';
  end case;
end;
$$;

create or replace function public.equity_can_read_school(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select coalesce(public.is_platform_admin(), false)
    or coalesce(public.secretaria_can_manage_school(p_school_id), false)
    or exists (
      select 1
      from public.network_school_memberships nsm
      where nsm.school_id = p_school_id
        and nsm.status = 'active'
        and public.network_can_read(nsm.network_id)
    );
$$;

create or replace function public.equity_assert_scope(
  p_scope text,
  p_network_id uuid default null,
  p_school_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_scope text := lower(coalesce(nullif(p_scope, ''), 'network'));
  v_network_id uuid := p_network_id;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if v_scope = 'school' then
    if p_school_id is null then
      raise exception 'SCHOOL_REQUIRED';
    end if;
    if not public.equity_can_read_school(p_school_id) then
      raise exception 'EQUITY_SCHOOL_FORBIDDEN' using errcode = '42501';
    end if;
    return jsonb_build_object('scope', 'school', 'school_id', p_school_id, 'network_id', p_network_id);
  end if;

  if v_scope <> 'network' then
    raise exception 'UNSUPPORTED_EQUITY_SCOPE';
  end if;

  if v_network_id is null then
    v_network_id := public.network_resolve_requested_network(null);
  end if;

  if v_network_id is null or not public.network_can_read(v_network_id) then
    raise exception 'EQUITY_NETWORK_FORBIDDEN' using errcode = '42501';
  end if;

  return jsonb_build_object('scope', 'network', 'network_id', v_network_id, 'school_id', null);
end;
$$;

create or replace function public.equity_dimensions_status(
  p_scope text default 'network',
  p_network_id uuid default null,
  p_school_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_scope jsonb;
  v_scope_kind text;
  v_network_id uuid;
  v_school_id uuid;
  v_counts jsonb;
begin
  v_scope := public.equity_assert_scope(p_scope, p_network_id, p_school_id);
  v_scope_kind := v_scope->>'scope';
  v_network_id := nullif(v_scope->>'network_id', '')::uuid;
  v_school_id := nullif(v_scope->>'school_id', '')::uuid;

  with scoped_schools as (
    select v_school_id as school_id
    where v_scope_kind = 'school'
    union
    select nsm.school_id
    from public.network_school_memberships nsm
    where v_scope_kind = 'network'
      and nsm.network_id = v_network_id
      and nsm.status = 'active'
  ), attrs as (
    select esa.*
    from public.equity_student_attributes esa
    join scoped_schools ss on ss.school_id = esa.school_id
    where esa.data_status = 'available'
  )
  select jsonb_build_object(
    'race_ethnicity', count(*) filter (where nullif(btrim(race_ethnicity), '') is not null),
    'nse_band', count(*) filter (where nullif(btrim(nse_band), '') is not null),
    'pcd_status', count(*) filter (where nullif(btrim(pcd_status), '') is not null),
    'territory', count(*) filter (where nullif(btrim(territory), '') is not null),
    'gender', count(*) filter (where nullif(btrim(gender), '') is not null),
    'students_with_any_dimension', count(*) filter (
      where nullif(btrim(coalesce(race_ethnicity, '')), '') is not null
         or nullif(btrim(coalesce(nse_band, '')), '') is not null
         or nullif(btrim(coalesce(pcd_status, '')), '') is not null
         or nullif(btrim(coalesce(territory, '')), '') is not null
         or nullif(btrim(coalesce(gender, '')), '') is not null
    )
  ) into v_counts
  from attrs;

  return jsonb_build_object(
    'status', case when (v_counts->>'students_with_any_dimension')::integer > 0 then 'PASS' else 'EMPTY_REAL' end,
    'scope', v_scope,
    'counts', v_counts,
    'source', 'AUTHORIZED_INSTITUTIONAL_DIMENSIONS_ONLY'
  );
end;
$$;

create or replace function public.equity_get_dashboard(
  p_scope text default 'network',
  p_network_id uuid default null,
  p_school_id uuid default null,
  p_date_from date default (current_date - interval '365 days')::date,
  p_date_to date default current_date,
  p_dimension text default 'race_ethnicity',
  p_min_group_size integer default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_scope jsonb;
  v_scope_kind text;
  v_network_id uuid;
  v_school_id uuid;
  v_min integer := greatest(coalesce(p_min_group_size, public.equity_small_group_minimum()), public.equity_small_group_minimum());
  v_dimension text := lower(coalesce(nullif(p_dimension, ''), 'race_ethnicity'));
  v_payload jsonb;
begin
  if v_dimension not in ('race_ethnicity', 'nse_band', 'territory', 'pcd_status', 'gender') then
    raise exception 'UNSUPPORTED_EQUITY_DIMENSION';
  end if;
  if p_date_to < p_date_from then
    raise exception 'INVALID_PERIOD';
  end if;

  v_scope := public.equity_assert_scope(p_scope, p_network_id, p_school_id);
  v_scope_kind := v_scope->>'scope';
  v_network_id := nullif(v_scope->>'network_id', '')::uuid;
  v_school_id := nullif(v_scope->>'school_id', '')::uuid;

  with scoped_schools as (
    select v_school_id as school_id
    where v_scope_kind = 'school'
    union
    select nsm.school_id
    from public.network_school_memberships nsm
    where v_scope_kind = 'network'
      and nsm.network_id = v_network_id
      and nsm.status = 'active'
  ), active_students as (
    select distinct
      s.id as student_id,
      s.school_id,
      coalesce(e.class_id, s.class_id) as class_id,
      sc.nome as school_name,
      c.nome as class_name,
      coalesce(public.equity_dimension_value(esa, v_dimension), 'SEM_DADO') as dimension_value
    from public.students s
    join scoped_schools ss on ss.school_id = s.school_id
    join public.schools sc on sc.id = s.school_id
    left join public.enrollments e on e.student_id = s.id and e.school_id = s.school_id and e.status = 'active'
    left join public.classes c on c.id = coalesce(e.class_id, s.class_id)
    left join public.equity_student_attributes esa on esa.student_id = s.id and esa.data_status = 'available'
    where coalesce(s.status, 'ativo') in ('ativo', 'active')
  ), student_results as (
    select
      ar.student_id,
      ar.school_id,
      avg(ar.score_percentage) as avg_score,
      count(*)::integer as result_count,
      min(ar.finalized_at)::date as first_result_date,
      max(ar.finalized_at)::date as last_result_date
    from public.assessment_results ar
    join scoped_schools ss on ss.school_id = ar.school_id
    where ar.finalized_at::date between p_date_from and p_date_to
    group by ar.student_id, ar.school_id
  ), student_attendance as (
    select
      ar.student_id,
      ar.school_id,
      count(*)::integer as attendance_records,
      count(*) filter (where ar.status = 'present')::integer as present_records,
      round((count(*) filter (where ar.status = 'present')::numeric / nullif(count(*), 0)) * 100, 2) as attendance_rate
    from public.attendance_records ar
    join scoped_schools ss on ss.school_id = ar.school_id
    where ar.attendance_date between p_date_from and p_date_to
    group by ar.student_id, ar.school_id
  ), joined as (
    select
      ast.*,
      sr.avg_score,
      sr.result_count,
      sr.first_result_date,
      sr.last_result_date,
      sa.attendance_records,
      sa.attendance_rate
    from active_students ast
    left join student_results sr on sr.student_id = ast.student_id and sr.school_id = ast.school_id
    left join student_attendance sa on sa.student_id = ast.student_id and sa.school_id = ast.school_id
  ), group_metrics as (
    select
      dimension_value,
      count(distinct student_id)::integer as student_count,
      count(distinct student_id) filter (where result_count is not null)::integer as participants,
      round(avg(avg_score) filter (where avg_score is not null), 2) as average_performance,
      round((count(distinct student_id) filter (where result_count is not null)::numeric / nullif(count(distinct student_id), 0)) * 100, 2) as participation_rate,
      round(avg(attendance_rate) filter (where attendance_rate is not null), 2) as attendance_rate,
      min(first_result_date) as first_result_date,
      max(last_result_date) as last_result_date
    from joined
    group by dimension_value
  ), safe_metrics as (
    select
      dimension_value,
      student_count,
      student_count < v_min as suppressed,
      case when student_count < v_min then null else participants end as participants,
      case when student_count < v_min then null else average_performance end as average_performance,
      case when student_count < v_min then null else participation_rate end as participation_rate,
      case when student_count < v_min then null else attendance_rate end as attendance_rate,
      case when student_count < v_min then null else first_result_date end as first_result_date,
      case when student_count < v_min then null else last_result_date end as last_result_date,
      case when student_count < v_min or average_performance is null then null
        else public.avalia_plus_classify_proficiency(average_performance, null, case when v_scope_kind = 'school' then v_school_id else null end, v_network_id)
      end as proficiency
    from group_metrics
  ), unsuppressed as (
    select *
    from safe_metrics
    where not suppressed and dimension_value <> 'SEM_DADO'
  ), summary as (
    select jsonb_build_object(
      'students', coalesce((select count(*) from joined), 0),
      'participants', coalesce((select count(*) from joined where result_count is not null), 0),
      'groups', coalesce((select count(*) from group_metrics), 0),
      'groups_with_authorized_dimension', coalesce((select count(*) from group_metrics where dimension_value <> 'SEM_DADO'), 0),
      'suppressed_groups', coalesce((select count(*) from safe_metrics where suppressed), 0),
      'mean_performance', coalesce((select round(avg(avg_score), 2) from joined where avg_score is not null), 0),
      'participation_rate', coalesce((select round((count(*) filter (where result_count is not null)::numeric / nullif(count(*), 0)) * 100, 2) from joined), 0),
      'attendance_rate', coalesce((select round(avg(attendance_rate), 2) from joined where attendance_rate is not null), 0),
      'equity_gap_points', coalesce((select round(max(average_performance) - min(average_performance), 2) from unsuppressed where average_performance is not null), 0)
    ) as data
  )
  select jsonb_build_object(
    'status', case
      when coalesce((select count(*) from group_metrics where dimension_value <> 'SEM_DADO'), 0) = 0 then 'EMPTY_REAL'
      else 'PASS'
    end,
    'scope', v_scope,
    'period', jsonb_build_object('from', p_date_from, 'to', p_date_to),
    'dimension', v_dimension,
    'data_kind', 'INDICADOR_INTERNO',
    'official_data_present', exists (
      select 1
      from public.equity_official_indicator_imports eoi
      where eoi.period_start <= p_date_to
        and eoi.period_end >= p_date_from
        and (
          (v_scope_kind = 'network' and eoi.network_id = v_network_id)
          or (v_scope_kind = 'school' and eoi.school_id = v_school_id)
        )
    ),
    'privacy', jsonb_build_object(
      'minimum_group_size', v_min,
      'small_group_reidentification', 'ZERO',
      'suppression_rule', 'Groups below the minimum are suppressed before disclosure.'
    ),
    'summary', (select data from summary),
    'groups', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'dimension_value', dimension_value,
          'privacy_status', case when suppressed then 'SUPPRESSED_SMALL_GROUP' else 'VISIBLE_AGGREGATE' end,
          'student_count', case when suppressed then null else student_count end,
          'student_count_bucket', case when suppressed then '<' || v_min::text else null end,
          'participants', participants,
          'average_performance', average_performance,
          'participation_rate', participation_rate,
          'attendance_rate', attendance_rate,
          'proficiency', proficiency,
          'first_result_date', first_result_date,
          'last_result_date', last_result_date
        )
        order by suppressed asc, average_performance asc nulls last, dimension_value asc
      )
      from safe_metrics
    ), '[]'::jsonb),
    'attention_groups', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'dimension_value', dimension_value,
          'reason', 'LOWER_THAN_VISIBLE_GROUP_MEAN',
          'average_performance', average_performance,
          'participation_rate', participation_rate,
          'attendance_rate', attendance_rate
        )
        order by average_performance asc nulls last
      )
      from unsuppressed
      where average_performance is not null
        and average_performance < coalesce((select avg(average_performance) from unsuppressed where average_performance is not null), 0)
    ), '[]'::jsonb),
    'official_internal_data_separation', jsonb_build_object(
      'internal_indicator_label', 'INDICADOR_INTERNO',
      'official_import_label', 'DADO_OFICIAL_IMPORTADO',
      'automatic_vaar_eligibility_statement', 'NOT_DECLARED_BY_PLATFORM'
    )
  ) into v_payload;

  return v_payload;
end;
$$;

create or replace function public.equity_get_vaar_evidence(
  p_scope text default 'network',
  p_network_id uuid default null,
  p_school_id uuid default null,
  p_date_from date default (current_date - interval '365 days')::date,
  p_date_to date default current_date,
  p_dimension text default 'race_ethnicity'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_dashboard jsonb;
  v_scope jsonb;
  v_scope_kind text;
  v_network_id uuid;
  v_school_id uuid;
begin
  v_dashboard := public.equity_get_dashboard(p_scope, p_network_id, p_school_id, p_date_from, p_date_to, p_dimension);
  v_scope := v_dashboard->'scope';
  v_scope_kind := v_scope->>'scope';
  v_network_id := nullif(v_scope->>'network_id', '')::uuid;
  v_school_id := nullif(v_scope->>'school_id', '')::uuid;

  return jsonb_build_object(
    'vaar_statement', 'A Plataforma fornece indicadores internos e evidencias de apoio; nao declara automaticamente habilitacao oficial ao VAAR-FUNDEB.',
    'internal_indicators', v_dashboard,
    'official_imports', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'indicator_code', indicator_code,
          'indicator_name', indicator_name,
          'period_start', period_start,
          'period_end', period_end,
          'data_kind', data_kind,
          'source_document', source_document,
          'payload', payload
        )
        order by period_end desc, indicator_code asc
      )
      from public.equity_official_indicator_imports eoi
      where eoi.period_start <= p_date_to
        and eoi.period_end >= p_date_from
        and (
          (v_scope_kind = 'network' and eoi.network_id = v_network_id)
          or (v_scope_kind = 'school' and eoi.school_id = v_school_id)
        )
    ), '[]'::jsonb),
    'privacy', jsonb_build_object(
      'small_group_reidentification', 'ZERO',
      'cross_school_leak', 'ZERO',
      'sensitive_raw_data_exposure', 'ZERO'
    )
  );
end;
$$;

create or replace function public.equity_create_vaar_snapshot(
  p_scope text default 'network',
  p_network_id uuid default null,
  p_school_id uuid default null,
  p_date_from date default (current_date - interval '365 days')::date,
  p_date_to date default current_date,
  p_dimension text default 'race_ethnicity'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_payload jsonb;
  v_scope jsonb;
  v_hash text;
  v_snapshot_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  v_payload := public.equity_get_vaar_evidence(p_scope, p_network_id, p_school_id, p_date_from, p_date_to, p_dimension);
  v_scope := v_payload #> '{internal_indicators,scope}';
  v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');

  insert into public.equity_vaar_evidence_snapshots (
    scope_kind,
    network_id,
    school_id,
    period_start,
    period_end,
    data_kind,
    indicator_payload,
    snapshot_hash,
    generated_by
  )
  values (
    v_scope->>'scope',
    nullif(v_scope->>'network_id', '')::uuid,
    nullif(v_scope->>'school_id', '')::uuid,
    p_date_from,
    p_date_to,
    'INDICADOR_INTERNO',
    v_payload,
    v_hash,
    auth.uid()
  )
  returning id into v_snapshot_id;

  return jsonb_build_object(
    'snapshot_id', v_snapshot_id,
    'snapshot_hash', v_hash,
    'data_kind', 'INDICADOR_INTERNO',
    'scope', v_scope,
    'period', jsonb_build_object('from', p_date_from, 'to', p_date_to)
  );
end;
$$;

create or replace function public.equity_create_official_report_export(
  p_scope text default 'network',
  p_network_id uuid default null,
  p_school_id uuid default null,
  p_date_from date default (current_date - interval '365 days')::date,
  p_date_to date default current_date,
  p_dimension text default 'race_ethnicity',
  p_format text default 'pdf'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_payload jsonb;
  v_scope jsonb;
  v_format text := lower(coalesce(nullif(p_format, ''), 'pdf'));
  v_hash text;
  v_report_id uuid;
  v_identifier text;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_format not in ('pdf', 'xlsx') then
    raise exception 'UNSUPPORTED_REPORT_FORMAT';
  end if;

  v_payload := public.equity_get_vaar_evidence(p_scope, p_network_id, p_school_id, p_date_from, p_date_to, p_dimension);
  v_scope := v_payload #> '{internal_indicators,scope}';
  v_hash := encode(digest(v_payload::text, 'sha256'), 'hex');

  insert into public.official_report_exports (
    status,
    report_type,
    format,
    scope_kind,
    school_id,
    network_id,
    date_from,
    date_to,
    requested_by,
    requested_role,
    params,
    snapshot_json,
    snapshot_hash,
    source,
    ready_at
  )
  values (
    'ready',
    case when v_scope->>'scope' = 'network' then 'network-analytics' else 'school-analytics' end,
    v_format,
    v_scope->>'scope',
    nullif(v_scope->>'school_id', '')::uuid,
    nullif(v_scope->>'network_id', '')::uuid,
    p_date_from,
    p_date_to,
    auth.uid(),
    v_scope->>'scope',
    jsonb_build_object(
      'module', 'EQUIDADE_VAAR_FUNDEB_V1',
      'dimension', p_dimension,
      'format', v_format,
      'data_kind', 'INDICADOR_INTERNO'
    ),
    v_payload,
    v_hash,
    'equity_vaar_v1',
    now()
  )
  returning id, report_identifier into v_report_id, v_identifier;

  return jsonb_build_object(
    'report_id', v_report_id,
    'report_identifier', v_identifier,
    'report_type', case when v_scope->>'scope' = 'network' then 'network-analytics' else 'school-analytics' end,
    'format', v_format,
    'snapshot_hash', v_hash,
    'source', 'equity_vaar_v1'
  );
end;
$$;

alter table public.equity_student_attributes enable row level security;
alter table public.equity_official_indicator_imports enable row level security;
alter table public.equity_vaar_evidence_snapshots enable row level security;

drop policy if exists equity_official_indicator_imports_select on public.equity_official_indicator_imports;
create policy equity_official_indicator_imports_select
on public.equity_official_indicator_imports
for select
to authenticated
using (
  public.is_platform_admin()
  or (school_id is not null and public.equity_can_read_school(school_id))
  or (network_id is not null and public.network_can_read(network_id))
);

drop policy if exists equity_vaar_snapshots_select on public.equity_vaar_evidence_snapshots;
create policy equity_vaar_snapshots_select
on public.equity_vaar_evidence_snapshots
for select
to authenticated
using (
  generated_by = auth.uid()
  or public.is_platform_admin()
  or (school_id is not null and public.equity_can_read_school(school_id))
  or (network_id is not null and public.network_can_read(network_id))
);

revoke all on table public.equity_student_attributes from public, anon, authenticated;
revoke all on table public.equity_official_indicator_imports from public, anon, authenticated;
revoke all on table public.equity_vaar_evidence_snapshots from public, anon, authenticated;
grant select on table public.equity_official_indicator_imports to authenticated;
grant select on table public.equity_vaar_evidence_snapshots to authenticated;
grant all on table public.equity_student_attributes to service_role;
grant all on table public.equity_official_indicator_imports to service_role;
grant all on table public.equity_vaar_evidence_snapshots to service_role;

revoke all on function public.equity_touch_updated_at() from public, anon, authenticated;
revoke all on function public.equity_small_group_minimum() from public, anon;
revoke all on function public.equity_dimension_value(public.equity_student_attributes, text) from public, anon, authenticated;
revoke all on function public.equity_can_read_school(uuid) from public, anon;
revoke all on function public.equity_assert_scope(text, uuid, uuid) from public, anon;
revoke all on function public.equity_dimensions_status(text, uuid, uuid) from public, anon;
revoke all on function public.equity_get_dashboard(text, uuid, uuid, date, date, text, integer) from public, anon;
revoke all on function public.equity_get_vaar_evidence(text, uuid, uuid, date, date, text) from public, anon;
revoke all on function public.equity_create_vaar_snapshot(text, uuid, uuid, date, date, text) from public, anon;
revoke all on function public.equity_create_official_report_export(text, uuid, uuid, date, date, text, text) from public, anon;

grant execute on function public.equity_small_group_minimum() to authenticated, service_role;
grant execute on function public.equity_can_read_school(uuid) to authenticated, service_role;
grant execute on function public.equity_assert_scope(text, uuid, uuid) to authenticated, service_role;
grant execute on function public.equity_dimensions_status(text, uuid, uuid) to authenticated, service_role;
grant execute on function public.equity_get_dashboard(text, uuid, uuid, date, date, text, integer) to authenticated, service_role;
grant execute on function public.equity_get_vaar_evidence(text, uuid, uuid, date, date, text) to authenticated, service_role;
grant execute on function public.equity_create_vaar_snapshot(text, uuid, uuid, date, date, text) to authenticated, service_role;
grant execute on function public.equity_create_official_report_export(text, uuid, uuid, date, date, text, text) to authenticated, service_role;

comment on table public.equity_student_attributes is
  'Equidade/VAAR V1: dimensoes sensiveis autorizadas por estudante. Sem grant ao frontend; uso via agregacoes seguras.';
comment on table public.equity_official_indicator_imports is
  'Equidade/VAAR V1: dados oficiais importados e separados dos indicadores internos.';
comment on table public.equity_vaar_evidence_snapshots is
  'Equidade/VAAR V1: snapshots historicos de evidencias internas/oficiais para relatórios.';
comment on function public.equity_get_dashboard(text, uuid, uuid, date, date, text, integer) is
  'Retorna painel agregado de equidade com supressao de grupos pequenos e separacao INDICADOR_INTERNO/DADO_OFICIAL_IMPORTADO.';
comment on function public.equity_get_vaar_evidence(text, uuid, uuid, date, date, text) is
  'Monta evidencias de apoio ao VAAR-FUNDEB sem declarar elegibilidade oficial automatica.';

do $$
declare
  v_anon_grants integer;
  v_raw_authenticated_grants integer;
  v_min integer;
begin
  select count(*) into v_anon_grants
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name like 'equity_%'
    and grantee = 'anon';

  if v_anon_grants <> 0 then
    raise exception 'VALIDATION failed: anon recebeu grants em funcoes equity_%';
  end if;

  select count(*) into v_raw_authenticated_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'equity_student_attributes'
    and grantee = 'authenticated';

  if v_raw_authenticated_grants <> 0 then
    raise exception 'VALIDATION failed: authenticated recebeu grant na tabela sensivel equity_student_attributes';
  end if;

  select public.equity_small_group_minimum() into v_min;
  if v_min < 5 then
    raise exception 'VALIDATION failed: limite minimo de grupo pequeno menor que 5';
  end if;
end
$$;
