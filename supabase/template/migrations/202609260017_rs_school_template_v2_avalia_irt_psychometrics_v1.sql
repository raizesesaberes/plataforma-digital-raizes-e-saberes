-- Avalia+ - TRI / Psicometria Avancada V1
-- Complementa o analytics existente sem reconstruir as Fases 1-4.

do $$
begin
  if to_regclass('public.assessment_results') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_results nao existe';
  end if;
  if to_regclass('public.assessment_responses') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_responses nao existe';
  end if;
  if to_regclass('public.assessment_questions') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_questions nao existe';
  end if;
  if to_regclass('public.question_items') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_items nao existe';
  end if;
  if to_regprocedure('public.avalia_plus_assert_intelligence_scope(text, uuid, uuid, uuid, uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.avalia_plus_assert_intelligence_scope nao existe';
  end if;
end
$$;

create table if not exists public.assessment_irt_calibrations (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  school_id uuid references public.schools(id) on delete restrict,
  network_id uuid references public.education_networks(id) on delete restrict,
  model_type text not null check (model_type in ('1PL', '2PL', '3PL')),
  method text not null default 'SERVER_SIDE_MLE'
    check (method in ('SERVER_SIDE_MLE', 'CLASSICAL_INITIALIZATION', 'EXTERNAL_CALIBRATION')),
  version_number integer not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'CALIBRATING', 'VALID', 'INSUFFICIENT_SAMPLE', 'ARCHIVED')),
  sample_size integer not null default 0,
  item_count integer not null default 0,
  min_sample_size integer not null default 30,
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  calibrated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_irt_calibrations_sample_check check (sample_size >= 0 and item_count >= 0 and min_sample_size > 0),
  unique (assessment_id, model_type, version_number)
);

create table if not exists public.assessment_irt_item_parameters (
  id uuid primary key default gen_random_uuid(),
  calibration_id uuid not null references public.assessment_irt_calibrations(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assessment_question_id uuid references public.assessment_questions(id) on delete cascade,
  question_id uuid not null references public.question_items(id) on delete restrict,
  item_version integer,
  parameter_a numeric(10,6),
  parameter_b numeric(10,6),
  parameter_c numeric(10,6),
  response_count integer not null default 0,
  correct_count integer not null default 0,
  quality_metrics jsonb not null default '{}'::jsonb,
  status text not null default 'INSUFFICIENT_SAMPLE'
    check (status in ('VALID', 'INSUFFICIENT_SAMPLE', 'EXTERNAL_PENDING')),
  created_at timestamptz not null default now(),
  constraint assessment_irt_item_parameters_a_check check (parameter_a is null or parameter_a > 0),
  constraint assessment_irt_item_parameters_c_check check (parameter_c is null or (parameter_c >= 0 and parameter_c < 1)),
  unique (calibration_id, question_id)
);

create table if not exists public.assessment_irt_student_proficiencies (
  id uuid primary key default gen_random_uuid(),
  calibration_id uuid not null references public.assessment_irt_calibrations(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  assessment_result_id uuid not null references public.assessment_results(id) on delete cascade,
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid references public.classes(id) on delete restrict,
  model_type text not null check (model_type in ('1PL', '2PL', '3PL')),
  calibration_version integer not null,
  theta numeric(10,6),
  theta_se numeric(10,6),
  tri_proficiency numeric(10,2),
  raw_score_percentage numeric(6,2) not null,
  estimation_status text not null default 'INSUFFICIENT_RESPONSES'
    check (estimation_status in ('VALID', 'INSUFFICIENT_RESPONSES', 'INSUFFICIENT_CALIBRATION')),
  traceability jsonb not null default '{}'::jsonb,
  estimated_at timestamptz not null default now(),
  unique (calibration_id, assessment_result_id)
);

create table if not exists public.assessment_irt_scale_levels (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.assessments(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  network_id uuid references public.education_networks(id) on delete cascade,
  level_code text not null,
  label text not null,
  min_theta numeric(10,6) not null,
  max_theta numeric(10,6) not null,
  min_tri_proficiency numeric(10,2),
  max_tri_proficiency numeric(10,2),
  position integer not null,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint assessment_irt_scale_levels_scope_check check (assessment_id is not null or school_id is not null or network_id is not null),
  constraint assessment_irt_scale_levels_theta_check check (min_theta <= max_theta),
  constraint assessment_irt_scale_levels_position_check check (position > 0)
);

create index if not exists assessment_irt_calibrations_assessment_idx
  on public.assessment_irt_calibrations (assessment_id, model_type, version_number desc);
create index if not exists assessment_irt_parameters_question_idx
  on public.assessment_irt_item_parameters (question_id, status);
create index if not exists assessment_irt_proficiencies_student_idx
  on public.assessment_irt_student_proficiencies (student_id, estimated_at desc);
create index if not exists assessment_irt_proficiencies_scope_idx
  on public.assessment_irt_student_proficiencies (school_id, class_id, assessment_id, estimated_at desc);

create or replace function public.avalia_plus_irt_probability(
  p_theta numeric,
  p_a numeric,
  p_b numeric,
  p_c numeric default 0,
  p_model_type text default '2PL'
)
returns numeric
language plpgsql
immutable
as $$
declare
  v_a numeric := case when upper(coalesce(p_model_type, '2PL')) = '1PL' then 1 else greatest(coalesce(p_a, 1), 0.05) end;
  v_b numeric := coalesce(p_b, 0);
  v_c numeric := case when upper(coalesce(p_model_type, '2PL')) = '3PL' then greatest(least(coalesce(p_c, 0), 0.95), 0) else 0 end;
  v_exp double precision;
  v_p numeric;
begin
  v_exp := exp((-1.702 * v_a * (coalesce(p_theta, 0) - v_b))::double precision);
  v_p := v_c + (1 - v_c) * (1 / (1 + v_exp))::numeric;
  return greatest(least(v_p, 0.999999), 0.000001);
end;
$$;

create or replace function public.avalia_plus_irt_scale_score(p_theta numeric)
returns numeric
language sql
immutable
as $$
  select round((500 + (coalesce(p_theta, 0) * 100))::numeric, 2);
$$;

create or replace function public.avalia_plus_irt_can_manage_assessment(p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.assessments a
    where a.id = p_assessment_id
      and (
        public.is_platform_admin()
        or (a.school_id is not null and public.secretaria_can_manage_school(a.school_id))
        or exists (
          select 1
          from public.assessment_assignments aa
          where aa.assessment_id = a.id
            and public.secretaria_can_manage_school(aa.school_id)
        )
      )
  );
$$;

create or replace function public.avalia_plus_irt_estimate_theta(
  p_attempt_id uuid,
  p_calibration_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_theta numeric := 0;
  v_score numeric;
  v_info numeric;
  v_p numeric;
  v_prime numeric;
  v_step numeric;
  v_iter integer;
  v_responses integer;
  v_cal public.assessment_irt_calibrations%rowtype;
  r record;
begin
  select * into v_cal
  from public.assessment_irt_calibrations
  where id = p_calibration_id and status = 'VALID';

  if not found then
    return jsonb_build_object('status', 'INSUFFICIENT_CALIBRATION');
  end if;

  select count(*) into v_responses
  from public.assessment_responses resp
  join public.assessment_irt_item_parameters ip on ip.calibration_id = p_calibration_id and ip.question_id = resp.question_id
  where resp.attempt_id = p_attempt_id
    and ip.status = 'VALID'
    and resp.is_correct is not null;

  if coalesce(v_responses, 0) < 3 then
    return jsonb_build_object('status', 'INSUFFICIENT_RESPONSES', 'responses', coalesce(v_responses, 0));
  end if;

  for v_iter in 1..20 loop
    v_score := 0;
    v_info := 0;

    for r in
      select
        case when resp.is_correct is true then 1::numeric else 0::numeric end as u,
        coalesce(ip.parameter_a, 1) as a,
        coalesce(ip.parameter_b, 0) as b,
        coalesce(ip.parameter_c, 0) as c
      from public.assessment_responses resp
      join public.assessment_irt_item_parameters ip on ip.calibration_id = p_calibration_id and ip.question_id = resp.question_id
      where resp.attempt_id = p_attempt_id
        and ip.status = 'VALID'
        and resp.is_correct is not null
    loop
      v_p := public.avalia_plus_irt_probability(v_theta, r.a, r.b, r.c, v_cal.model_type);
      v_prime := 1.702 * r.a * (v_p - r.c) * (1 - v_p) / greatest(1 - r.c, 0.000001);
      v_score := v_score + ((r.u - v_p) * v_prime / greatest(v_p * (1 - v_p), 0.000001));
      v_info := v_info + ((v_prime * v_prime) / greatest(v_p * (1 - v_p), 0.000001));
    end loop;

    exit when v_info is null or v_info <= 0;
    v_step := greatest(least(v_score / v_info, 1), -1);
    v_theta := greatest(least(v_theta + v_step, 4), -4);
    exit when abs(v_step) < 0.001;
  end loop;

  return jsonb_build_object(
    'status', 'VALID',
    'theta', round(v_theta, 6),
    'theta_se', case when v_info > 0 then round((1 / sqrt(v_info))::numeric, 6) else null end,
    'responses', v_responses,
    'iterations', v_iter,
    'tri_proficiency', public.avalia_plus_irt_scale_score(v_theta)
  );
end;
$$;

create or replace function public.avalia_plus_irt_run_calibration(
  p_assessment_id uuid,
  p_model_type text default '2PL',
  p_method text default 'SERVER_SIDE_MLE',
  p_min_sample_size integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_model text := upper(coalesce(nullif(p_model_type, ''), '2PL'));
  v_method text := upper(coalesce(nullif(p_method, ''), 'SERVER_SIDE_MLE'));
  v_min_sample integer := greatest(coalesce(p_min_sample_size, 30), 5);
  v_assessment public.assessments%rowtype;
  v_version integer;
  v_sample integer;
  v_item_count integer;
  v_status text;
  v_calibration_id uuid;
  v_result record;
  v_estimate jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_model not in ('1PL', '2PL', '3PL') then
    raise exception 'UNSUPPORTED_IRT_MODEL';
  end if;
  if v_method not in ('SERVER_SIDE_MLE', 'CLASSICAL_INITIALIZATION', 'EXTERNAL_CALIBRATION') then
    raise exception 'UNSUPPORTED_IRT_METHOD';
  end if;

  select * into v_assessment from public.assessments where id = p_assessment_id;
  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND';
  end if;
  if not public.avalia_plus_irt_can_manage_assessment(p_assessment_id) then
    raise exception 'UNAUTHORIZED_CALIBRATION' using errcode = '42501';
  end if;

  select count(distinct student_id) into v_sample
  from public.assessment_results
  where assessment_id = p_assessment_id
    and status in ('submitted', 'graded');

  select count(*) into v_item_count
  from public.assessment_questions
  where assessment_id = p_assessment_id;

  select coalesce(max(version_number), 0) + 1 into v_version
  from public.assessment_irt_calibrations
  where assessment_id = p_assessment_id and model_type = v_model;

  v_status := case when coalesce(v_sample, 0) < v_min_sample or coalesce(v_item_count, 0) = 0 then 'INSUFFICIENT_SAMPLE' else 'VALID' end;

  insert into public.assessment_irt_calibrations (
    assessment_id, school_id, network_id, model_type, method, version_number,
    status, sample_size, item_count, min_sample_size, metrics, created_by, calibrated_at
  )
  values (
    p_assessment_id,
    v_assessment.school_id,
    null,
    v_model,
    v_method,
    v_version,
    v_status,
    coalesce(v_sample, 0),
    coalesce(v_item_count, 0),
    v_min_sample,
    jsonb_build_object(
      'percentual_acerto_preserved', true,
      'tri_proficiency_separate', true,
      'client_side_tri_trust', 'ZERO',
      'sample_status', v_status
    ),
    auth.uid(),
    case when v_status = 'VALID' then now() else null end
  )
  returning id into v_calibration_id;

  with item_observed as (
    select
      aq.id as assessment_question_id,
      aq.question_id,
      qi.workflow_version as item_version,
      count(resp.id)::integer as response_count,
      count(resp.id) filter (where resp.is_correct is true)::integer as correct_count,
      (count(resp.id) filter (where resp.is_correct is true)::numeric / nullif(count(resp.id), 0)) as p_value,
      corr(case when resp.is_correct is true then 1::double precision else 0::double precision end, ar.score_percentage::double precision)::numeric as point_biserial,
      greatest(count(qa.id), 1)::numeric as alternatives_count
    from public.assessment_questions aq
    join public.question_items qi on qi.id = aq.question_id
    left join public.assessment_responses resp on resp.question_id = aq.question_id
    left join public.assessment_results ar on ar.attempt_id = resp.attempt_id and ar.assessment_id = aq.assessment_id
    left join public.question_alternatives qa on qa.question_id = aq.question_id
    where aq.assessment_id = p_assessment_id
    group by aq.id, aq.question_id, qi.workflow_version
  )
  insert into public.assessment_irt_item_parameters (
    calibration_id, assessment_id, assessment_question_id, question_id, item_version,
    parameter_a, parameter_b, parameter_c, response_count, correct_count, quality_metrics, status
  )
  select
    v_calibration_id,
    p_assessment_id,
    assessment_question_id,
    question_id,
    item_version,
    case
      when v_status <> 'VALID' then null
      when v_model = '1PL' then 1
      else round(greatest(0.25, least(3, 1 + coalesce(point_biserial, 0)))::numeric, 6)
    end,
    case
      when v_status <> 'VALID' or p_value is null then null
      else round(greatest(least(ln((1 - greatest(least(p_value, 0.99), 0.01)) / greatest(least(p_value, 0.99), 0.01)), 4), -4)::numeric, 6)
    end,
    case
      when v_status <> 'VALID' then null
      when v_model = '3PL' then round(least(0.35, 1 / nullif(alternatives_count, 0))::numeric, 6)
      else 0
    end,
    coalesce(response_count, 0),
    coalesce(correct_count, 0),
    jsonb_build_object(
      'p_value', p_value,
      'point_biserial', point_biserial,
      'parameter_source', case when v_status = 'VALID' then 'SERVER_SIDE_OBSERVED_RESPONSES' else 'INSUFFICIENT_SAMPLE' end,
      'c_source', case when v_model = '3PL' then 'ALTERNATIVE_COUNT' else 'NOT_APPLICABLE' end
    ),
    case when v_status = 'VALID' then 'VALID' else 'INSUFFICIENT_SAMPLE' end
  from item_observed;

  if v_status = 'VALID' then
    for v_result in
      select
        ar.*,
        aa.class_id
      from public.assessment_results ar
      join public.assessment_assignments aa on aa.id = ar.assignment_id
      where ar.assessment_id = p_assessment_id
        and ar.status in ('submitted', 'graded')
    loop
      v_estimate := public.avalia_plus_irt_estimate_theta(v_result.attempt_id, v_calibration_id);

      insert into public.assessment_irt_student_proficiencies (
        calibration_id, assessment_id, assignment_id, assessment_result_id, attempt_id,
        student_id, school_id, class_id, model_type, calibration_version,
        theta, theta_se, tri_proficiency, raw_score_percentage,
        estimation_status, traceability
      )
      values (
        v_calibration_id,
        v_result.assessment_id,
        v_result.assignment_id,
        v_result.id,
        v_result.attempt_id,
        v_result.student_id,
        v_result.school_id,
        v_result.class_id,
        v_model,
        v_version,
        nullif(v_estimate->>'theta', '')::numeric,
        nullif(v_estimate->>'theta_se', '')::numeric,
        nullif(v_estimate->>'tri_proficiency', '')::numeric,
        v_result.score_percentage,
        coalesce(v_estimate->>'status', 'INSUFFICIENT_RESPONSES'),
        jsonb_build_object(
          'model', v_model,
          'calibration_id', v_calibration_id,
          'calibration_version', v_version,
          'method', v_method,
          'estimated_server_side', true,
          'percentual_acerto_preserved', v_result.score_percentage,
          'estimate', v_estimate
        )
      )
      on conflict (calibration_id, assessment_result_id) do update
      set theta = excluded.theta,
          theta_se = excluded.theta_se,
          tri_proficiency = excluded.tri_proficiency,
          estimation_status = excluded.estimation_status,
          traceability = excluded.traceability,
          estimated_at = now();
    end loop;
  end if;

  return jsonb_build_object(
    'calibration_id', v_calibration_id,
    'assessment_id', p_assessment_id,
    'model_type', v_model,
    'method', v_method,
    'version_number', v_version,
    'status', v_status,
    'sample_size', coalesce(v_sample, 0),
    'item_count', coalesce(v_item_count, 0),
    'min_sample_size', v_min_sample,
    'insufficient_sample', v_status = 'INSUFFICIENT_SAMPLE',
    'client_side_tri_trust', 'ZERO'
  );
end;
$$;

create or replace function public.avalia_plus_irt_configure_scale_level(
  p_level jsonb
)
returns public.assessment_irt_scale_levels
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_row public.assessment_irt_scale_levels%rowtype;
  v_assessment_id uuid := nullif(p_level->>'assessment_id', '')::uuid;
  v_school_id uuid := nullif(p_level->>'school_id', '')::uuid;
  v_network_id uuid := nullif(p_level->>'network_id', '')::uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if not (
    public.is_platform_admin()
    or (v_assessment_id is not null and public.avalia_plus_irt_can_manage_assessment(v_assessment_id))
    or (v_school_id is not null and public.secretaria_can_manage_school(v_school_id))
    or (v_network_id is not null and public.network_can_read(v_network_id))
  ) then
    raise exception 'IRT_SCALE_FORBIDDEN' using errcode = '42501';
  end if;

  insert into public.assessment_irt_scale_levels (
    assessment_id, school_id, network_id, level_code, label, min_theta, max_theta,
    min_tri_proficiency, max_tri_proficiency, position, metadata, created_by
  )
  values (
    v_assessment_id,
    v_school_id,
    v_network_id,
    upper(coalesce(nullif(p_level->>'level_code', ''), 'LEVEL')),
    coalesce(nullif(p_level->>'label', ''), upper(coalesce(nullif(p_level->>'level_code', ''), 'LEVEL'))),
    (p_level->>'min_theta')::numeric,
    (p_level->>'max_theta')::numeric,
    nullif(p_level->>'min_tri_proficiency', '')::numeric,
    nullif(p_level->>'max_tri_proficiency', '')::numeric,
    coalesce((p_level->>'position')::integer, 1),
    coalesce(p_level->'metadata', '{}'::jsonb),
    auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.avalia_plus_get_irt_analytics(
  p_scope text default 'network',
  p_assessment_id uuid default null,
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_network_id uuid default null,
  p_date_from date default (current_date - interval '365 days')::date,
  p_date_to date default current_date
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
  if v_network_id is null and v_scope = 'network' then
    v_network_id := public.network_resolve_requested_network(null);
  end if;

  perform public.avalia_plus_assert_intelligence_scope(v_scope, null, p_school_id, p_class_id, v_network_id);

  return (
    with scoped as (
      select
        isp.*,
        aa.class_id as assignment_class_id,
        c.nome as class_name,
        s.nome as school_name,
        nsm.network_id,
        a.title as assessment_title,
        a.component,
        a.school_year,
        cal.model_type,
        cal.version_number,
        cal.method,
        cal.status as calibration_status
      from public.assessment_irt_student_proficiencies isp
      join public.assessment_irt_calibrations cal on cal.id = isp.calibration_id
      join public.assessment_assignments aa on aa.id = isp.assignment_id
      join public.assessments a on a.id = isp.assessment_id
      left join public.classes c on c.id = coalesce(isp.class_id, aa.class_id)
      left join public.schools s on s.id = isp.school_id
      left join public.network_school_memberships nsm on nsm.school_id = isp.school_id and nsm.status = 'active'
      where isp.estimation_status = 'VALID'
        and isp.estimated_at::date between p_date_from and p_date_to
        and (p_assessment_id is null or isp.assessment_id = p_assessment_id)
        and (p_school_id is null or isp.school_id = p_school_id)
        and (p_class_id is null or coalesce(isp.class_id, aa.class_id) = p_class_id)
        and (v_network_id is null or nsm.network_id = v_network_id)
    ), student_rows as (
      select coalesce(jsonb_agg(to_jsonb(row_data) order by student_name), '[]'::jsonb) as data
      from (
        select
          sp.student_id,
          st.nome as student_name,
          sp.school_id,
          sp.school_name,
          sp.assignment_class_id as class_id,
          sp.class_name,
          count(*)::integer as estimates,
          round(avg(sp.theta), 4) as theta,
          round(avg(sp.tri_proficiency), 2) as tri_proficiency,
          round(avg(sp.raw_score_percentage), 2) as percentual_acerto,
          max(sp.estimated_at) as last_estimated_at
        from scoped sp
        join public.students st on st.id = sp.student_id
        group by sp.student_id, st.nome, sp.school_id, sp.school_name, sp.assignment_class_id, sp.class_name
      ) row_data
    ), class_rows as (
      select coalesce(jsonb_agg(to_jsonb(row_data) order by class_name), '[]'::jsonb) as data
      from (
        select
          assignment_class_id as class_id,
          class_name,
          school_id,
          school_name,
          count(distinct student_id)::integer as students,
          round(avg(theta), 4) as theta,
          round(avg(tri_proficiency), 2) as tri_proficiency,
          round(stddev_samp(tri_proficiency), 2) as distribution_sd
        from scoped
        group by assignment_class_id, class_name, school_id, school_name
      ) row_data
    ), school_rows as (
      select coalesce(jsonb_agg(to_jsonb(row_data) order by school_name), '[]'::jsonb) as data
      from (
        select
          school_id,
          school_name,
          count(distinct assignment_class_id)::integer as classes,
          count(distinct student_id)::integer as students,
          round(avg(theta), 4) as theta,
          round(avg(tri_proficiency), 2) as tri_proficiency
        from scoped
        group by school_id, school_name
      ) row_data
    ), evolution as (
      select coalesce(jsonb_agg(to_jsonb(row_data) order by period), '[]'::jsonb) as data
      from (
        select
          date_trunc('month', estimated_at)::date as period,
          count(*)::integer as estimates,
          round(avg(theta), 4) as theta,
          round(avg(tri_proficiency), 2) as tri_proficiency
        from scoped
        group by 1
      ) row_data
    )
    select jsonb_build_object(
      'status', case when (select count(*) from scoped) > 0 then 'PASS' else 'EMPTY_REAL' end,
      'scope', v_scope,
      'period', jsonb_build_object('from', p_date_from, 'to', p_date_to),
      'summary', jsonb_build_object(
        'estimates', coalesce((select count(*) from scoped), 0),
        'students', coalesce((select count(distinct student_id) from scoped), 0),
        'classes', coalesce((select count(distinct assignment_class_id) from scoped), 0),
        'schools', coalesce((select count(distinct school_id) from scoped), 0),
        'theta', coalesce((select round(avg(theta), 4) from scoped), 0),
        'tri_proficiency', coalesce((select round(avg(tri_proficiency), 2) from scoped), 0),
        'percentual_acerto', coalesce((select round(avg(raw_score_percentage), 2) from scoped), 0),
        'percentual_acerto_and_tri_are_distinct', true
      ),
      'hierarchy', jsonb_build_object(
        'students', (select data from student_rows),
        'classes', (select data from class_rows),
        'schools', (select data from school_rows),
        'network', jsonb_build_object(
          'network_id', v_network_id,
          'theta', coalesce((select round(avg(theta), 4) from scoped), 0),
          'tri_proficiency', coalesce((select round(avg(tri_proficiency), 2) from scoped), 0)
        )
      ),
      'evolution', (select data from evolution),
      'traceability', jsonb_build_object(
        'calibration_required', true,
        'client_side_tri_trust', 'ZERO',
        'official_saeb_equivalence', 'NOT_DECLARED'
      )
    )
  );
end;
$$;

alter table public.assessment_irt_calibrations enable row level security;
alter table public.assessment_irt_item_parameters enable row level security;
alter table public.assessment_irt_student_proficiencies enable row level security;
alter table public.assessment_irt_scale_levels enable row level security;

drop policy if exists assessment_irt_calibrations_select_authorized on public.assessment_irt_calibrations;
create policy assessment_irt_calibrations_select_authorized
on public.assessment_irt_calibrations
for select
to authenticated
using (
  public.is_platform_admin()
  or public.avalia_plus_irt_can_manage_assessment(assessment_id)
  or (school_id is not null and public.secretaria_can_manage_school(school_id))
  or (network_id is not null and public.network_can_read(network_id))
);

drop policy if exists assessment_irt_parameters_select_authorized on public.assessment_irt_item_parameters;
create policy assessment_irt_parameters_select_authorized
on public.assessment_irt_item_parameters
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_irt_calibrations cal
    where cal.id = calibration_id
      and (
        public.is_platform_admin()
        or public.avalia_plus_irt_can_manage_assessment(cal.assessment_id)
        or (cal.school_id is not null and public.secretaria_can_manage_school(cal.school_id))
        or (cal.network_id is not null and public.network_can_read(cal.network_id))
      )
  )
);

drop policy if exists assessment_irt_proficiencies_select_authorized on public.assessment_irt_student_proficiencies;
create policy assessment_irt_proficiencies_select_authorized
on public.assessment_irt_student_proficiencies
for select
to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or exists (
    select 1
    from public.network_school_memberships nsm
    where nsm.school_id = assessment_irt_student_proficiencies.school_id
      and nsm.status = 'active'
      and public.network_can_read(nsm.network_id)
  )
);

drop policy if exists assessment_irt_scale_levels_select_authorized on public.assessment_irt_scale_levels;
create policy assessment_irt_scale_levels_select_authorized
on public.assessment_irt_scale_levels
for select
to authenticated
using (
  public.is_platform_admin()
  or (assessment_id is not null and public.avalia_plus_irt_can_manage_assessment(assessment_id))
  or (school_id is not null and public.secretaria_can_manage_school(school_id))
  or (network_id is not null and public.network_can_read(network_id))
);

revoke all on table public.assessment_irt_calibrations from public, anon, authenticated;
revoke all on table public.assessment_irt_item_parameters from public, anon, authenticated;
revoke all on table public.assessment_irt_student_proficiencies from public, anon, authenticated;
revoke all on table public.assessment_irt_scale_levels from public, anon, authenticated;
grant select on table public.assessment_irt_calibrations to authenticated;
grant select on table public.assessment_irt_item_parameters to authenticated;
grant select on table public.assessment_irt_student_proficiencies to authenticated;
grant select on table public.assessment_irt_scale_levels to authenticated;
grant all on table public.assessment_irt_calibrations to service_role;
grant all on table public.assessment_irt_item_parameters to service_role;
grant all on table public.assessment_irt_student_proficiencies to service_role;
grant all on table public.assessment_irt_scale_levels to service_role;

revoke all on function public.avalia_plus_irt_probability(numeric, numeric, numeric, numeric, text) from public, anon;
revoke all on function public.avalia_plus_irt_scale_score(numeric) from public, anon;
revoke all on function public.avalia_plus_irt_can_manage_assessment(uuid) from public, anon;
revoke all on function public.avalia_plus_irt_estimate_theta(uuid, uuid) from public, anon, authenticated;
revoke all on function public.avalia_plus_irt_run_calibration(uuid, text, text, integer) from public, anon;
revoke all on function public.avalia_plus_irt_configure_scale_level(jsonb) from public, anon;
revoke all on function public.avalia_plus_get_irt_analytics(text, uuid, uuid, uuid, uuid, date, date) from public, anon;
grant execute on function public.avalia_plus_irt_probability(numeric, numeric, numeric, numeric, text) to authenticated, service_role;
grant execute on function public.avalia_plus_irt_scale_score(numeric) to authenticated, service_role;
grant execute on function public.avalia_plus_irt_can_manage_assessment(uuid) to authenticated, service_role;
grant execute on function public.avalia_plus_irt_estimate_theta(uuid, uuid) to service_role;
grant execute on function public.avalia_plus_irt_run_calibration(uuid, text, text, integer) to authenticated, service_role;
grant execute on function public.avalia_plus_irt_configure_scale_level(jsonb) to authenticated, service_role;
grant execute on function public.avalia_plus_get_irt_analytics(text, uuid, uuid, uuid, uuid, date, date) to authenticated, service_role;

comment on table public.assessment_irt_calibrations is
  'TRI/Psicometria V1: versoes de calibracao por avaliacao/modelo, com status INSUFFICIENT_SAMPLE quando nao ha amostra real suficiente.';
comment on table public.assessment_irt_item_parameters is
  'TRI/Psicometria V1: parametros a/b/c por item e versao de calibracao, sem gerar parametro ficticio quando a amostra e insuficiente.';
comment on table public.assessment_irt_student_proficiencies is
  'TRI/Psicometria V1: theta e TRI_PROFICIENCY separados de PERCENTUAL_ACERTO.';
comment on function public.avalia_plus_irt_run_calibration(uuid, text, text, integer) is
  'Executa calibracao TRI server-side e grava rastreabilidade; nao confia em calculos do frontend.';

do $$
declare
  v_anon_grants integer;
  v_internal_grant integer;
begin
  select count(*) into v_anon_grants
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name like 'avalia_plus_irt%'
    and grantee = 'anon';

  if v_anon_grants <> 0 then
    raise exception 'VALIDATION failed: anon recebeu grants em funcoes TRI';
  end if;

  select count(*) into v_internal_grant
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name = 'avalia_plus_irt_estimate_theta'
    and grantee = 'authenticated';

  if v_internal_grant <> 0 then
    raise exception 'VALIDATION failed: authenticated recebeu grant na funcao interna de theta';
  end if;
end
$$;
