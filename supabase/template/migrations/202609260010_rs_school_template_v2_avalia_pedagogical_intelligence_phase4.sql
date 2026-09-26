-- Avalia+ 2.0 Fase 4 - inteligencia pedagogica e estatistica.
-- Consolida resultados online/offline ja unificados sem reconstruir Fases 1-3.

create table if not exists public.assessment_proficiency_thresholds (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.assessments(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  network_id uuid references public.education_networks(id) on delete cascade,
  level_code text not null,
  label text not null,
  min_score numeric(6,2) not null,
  max_score numeric(6,2) not null,
  position integer not null,
  active boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint assessment_proficiency_thresholds_level_check check (level_code in ('ABAIXO_DO_BASICO', 'BASICO', 'ADEQUADO', 'AVANCADO')),
  constraint assessment_proficiency_thresholds_score_check check (min_score >= 0 and max_score <= 100 and min_score <= max_score),
  constraint assessment_proficiency_thresholds_scope_check check (assessment_id is not null or school_id is not null or network_id is not null)
);

create unique index if not exists assessment_proficiency_thresholds_scope_level_uq
on public.assessment_proficiency_thresholds (
  coalesce(assessment_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(network_id, '00000000-0000-0000-0000-000000000000'::uuid),
  level_code
) where active;

alter table public.assessment_proficiency_thresholds enable row level security;

create or replace function public.avalia_plus_default_proficiency_thresholds()
returns jsonb
language sql
immutable
as $$
  select jsonb_build_array(
    jsonb_build_object('level_code', 'ABAIXO_DO_BASICO', 'label', 'Abaixo do basico', 'min_score', 0, 'max_score', 49.99, 'position', 1),
    jsonb_build_object('level_code', 'BASICO', 'label', 'Basico', 'min_score', 50, 'max_score', 69.99, 'position', 2),
    jsonb_build_object('level_code', 'ADEQUADO', 'label', 'Adequado', 'min_score', 70, 'max_score', 84.99, 'position', 3),
    jsonb_build_object('level_code', 'AVANCADO', 'label', 'Avancado', 'min_score', 85, 'max_score', 100, 'position', 4)
  );
$$;

create or replace function public.avalia_plus_classify_proficiency(
  p_score numeric,
  p_assessment_id uuid default null,
  p_school_id uuid default null,
  p_network_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with configured as (
    select level_code, label, min_score, max_score, position
    from public.assessment_proficiency_thresholds
    where active
      and (
        (p_assessment_id is not null and assessment_id = p_assessment_id)
        or (p_assessment_id is null and p_school_id is not null and school_id = p_school_id)
        or (p_assessment_id is null and p_school_id is null and p_network_id is not null and network_id = p_network_id)
      )
    order by case when assessment_id is not null then 1 when school_id is not null then 2 else 3 end, position
  ), defaults as (
    select
      item->>'level_code' as level_code,
      item->>'label' as label,
      (item->>'min_score')::numeric as min_score,
      (item->>'max_score')::numeric as max_score,
      (item->>'position')::integer as position
    from jsonb_array_elements(public.avalia_plus_default_proficiency_thresholds()) item
  ), thresholds as (
    select * from configured
    union all
    select * from defaults
    where not exists (select 1 from configured)
  )
  select jsonb_build_object(
    'level_code', level_code,
    'label', label,
    'min_score', min_score,
    'max_score', max_score,
    'position', position
  )
  from thresholds
  where coalesce(p_score, 0) between min_score and max_score
  order by position
  limit 1;
$$;

create or replace function public.avalia_plus_assert_intelligence_scope(
  p_scope text,
  p_assignment_id uuid default null,
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_network_id uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if p_scope = 'assignment' then
    select * into v_assignment from public.assessment_assignments where id = p_assignment_id;
    if v_assignment.id is null then
      raise exception 'ASSIGNMENT_NOT_FOUND';
    end if;
    if not (
      public.is_platform_admin()
      or public.secretaria_can_manage_school(v_assignment.school_id)
      or public.avalia_plus_teacher_can_manage_class(v_assignment.class_id, v_assignment.school_id)
    ) then
      raise exception 'ASSESSMENT_INTELLIGENCE_FORBIDDEN' using errcode = '42501';
    end if;
    return true;
  end if;

  if p_scope = 'class' then
    if not exists (
      select 1
      from public.classes c
      where c.id = p_class_id
        and (public.is_platform_admin() or public.secretaria_can_manage_school(c.school_id) or public.avalia_plus_teacher_can_manage_class(c.id, c.school_id))
    ) then
      raise exception 'CLASS_INTELLIGENCE_FORBIDDEN' using errcode = '42501';
    end if;
    return true;
  end if;

  if p_scope = 'school' then
    if not (public.is_platform_admin() or public.secretaria_can_manage_school(p_school_id)) then
      raise exception 'SCHOOL_INTELLIGENCE_FORBIDDEN' using errcode = '42501';
    end if;
    return true;
  end if;

  if p_scope = 'network' then
    if not public.network_can_read(p_network_id) then
      raise exception 'NETWORK_INTELLIGENCE_FORBIDDEN' using errcode = '42501';
    end if;
    return true;
  end if;

  raise exception 'INVALID_INTELLIGENCE_SCOPE';
end;
$$;

create or replace function public.avalia_plus_get_pedagogical_intelligence(
  p_scope text,
  p_assignment_id uuid default null,
  p_assessment_id uuid default null,
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_network_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_component text default null,
  p_school_year text default null,
  p_booklet_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_scope text := lower(coalesce(p_scope, ''));
  v_network_id uuid := p_network_id;
  v_from date := coalesce(p_date_from, current_date - 365);
  v_to date := coalesce(p_date_to, current_date);
  v_payload jsonb;
begin
  if v_scope = 'network' then
    v_network_id := public.network_resolve_requested_network(p_network_id);
  end if;

  perform public.avalia_plus_assert_intelligence_scope(v_scope, p_assignment_id, p_school_id, p_class_id, v_network_id);

  with scoped_results as (
    select
      ar.*,
      aa.class_id,
      aa.target_type,
      aa.booklet_id,
      a.title as assessment_title,
      a.component,
      a.school_year,
      c.nome as class_name,
      s.nome as school_name,
      nsm.network_id,
      public.avalia_plus_classify_proficiency(ar.score_percentage, ar.assessment_id, ar.school_id, nsm.network_id) as proficiency
    from public.assessment_results ar
    join public.assessment_assignments aa on aa.id = ar.assignment_id
    join public.assessments a on a.id = ar.assessment_id
    left join public.classes c on c.id = aa.class_id
    left join public.schools s on s.id = ar.school_id
    left join public.network_school_memberships nsm on nsm.school_id = ar.school_id
      and nsm.status = 'active'
      and nsm.joined_at <= now()
      and (nsm.ended_at is null or nsm.ended_at > now())
    where ar.status in ('submitted', 'graded')
      and ar.finalized_at::date between v_from and v_to
      and (p_assignment_id is null or ar.assignment_id = p_assignment_id)
      and (p_assessment_id is null or ar.assessment_id = p_assessment_id)
      and (p_school_id is null or ar.school_id = p_school_id)
      and (p_class_id is null or aa.class_id = p_class_id)
      and (v_network_id is null or nsm.network_id = v_network_id)
      and (p_component is null or a.component = p_component)
      and (p_school_year is null or a.school_year = p_school_year)
      and (p_booklet_id is null or aa.booklet_id = p_booklet_id)
  ), response_scope as (
    select
      sr.*,
      resp.id as response_id,
      resp.question_id,
      resp.is_correct,
      resp.score_awarded,
      aq.position as question_position,
      aq.points,
      qi.code,
      qi.internal_title,
      qi.statement,
      qi.component as question_component,
      qi.school_year as question_school_year,
      qi.thematic_unit,
      qi.knowledge_object,
      qi.bncc_skill,
      qi.reference_matrix,
      qi.curriculum_matrix,
      qi.difficulty
    from scoped_results sr
    join public.assessment_responses resp on resp.attempt_id = sr.attempt_id
    join public.assessment_questions aq on aq.assessment_id = sr.assessment_id and aq.question_id = resp.question_id
    join public.question_items qi on qi.id = resp.question_id
  ), hierarchy_student as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by student_name), '[]'::jsonb) as data
    from (
      select
        sr.student_id,
        st.nome as student_name,
        sr.class_id,
        sr.class_name,
        sr.school_id,
        sr.school_name,
        count(*)::integer as results,
        round(avg(sr.score_percentage), 2) as average_percentage,
        max(sr.finalized_at) as last_result_at,
        public.avalia_plus_classify_proficiency(avg(sr.score_percentage), null, sr.school_id, sr.network_id) as proficiency
      from scoped_results sr
      join public.students st on st.id = sr.student_id
      group by sr.student_id, st.nome, sr.class_id, sr.class_name, sr.school_id, sr.school_name, sr.network_id
    ) row_data
  ), hierarchy_class as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by class_name), '[]'::jsonb) as data
    from (
      select
        sr.class_id,
        sr.class_name,
        sr.school_id,
        sr.school_name,
        count(distinct sr.student_id)::integer as students,
        count(*)::integer as results,
        round(avg(sr.score_percentage), 2) as average_percentage,
        public.avalia_plus_classify_proficiency(avg(sr.score_percentage), null, sr.school_id, sr.network_id) as proficiency
      from scoped_results sr
      group by sr.class_id, sr.class_name, sr.school_id, sr.school_name, sr.network_id
    ) row_data
  ), hierarchy_school as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by school_name), '[]'::jsonb) as data
    from (
      select
        sr.school_id,
        sr.school_name,
        count(distinct sr.class_id)::integer as classes,
        count(distinct sr.student_id)::integer as students,
        count(*)::integer as results,
        round(avg(sr.score_percentage), 2) as average_percentage,
        public.avalia_plus_classify_proficiency(avg(sr.score_percentage), null, sr.school_id, sr.network_id) as proficiency
      from scoped_results sr
      group by sr.school_id, sr.school_name, sr.network_id
    ) row_data
  ), hierarchy_network as (
    select jsonb_build_object(
      'network_id', v_network_id,
      'schools', count(distinct school_id),
      'classes', count(distinct class_id),
      'students', count(distinct student_id),
      'results', count(*),
      'average_percentage', coalesce(round(avg(score_percentage), 2), 0),
      'proficiency', public.avalia_plus_classify_proficiency(avg(score_percentage), null, null, v_network_id)
    ) as data
    from scoped_results
  ), curriculum as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by performance_percentage asc, skill), '[]'::jsonb) as data
    from (
      select
        coalesce(nullif(btrim(rs.thematic_unit), ''), 'NAO_INFORMADA') as thematic_unit,
        coalesce(nullif(btrim(rs.knowledge_object), ''), 'NAO_INFORMADO') as knowledge_object,
        coalesce(nullif(btrim(rs.bncc_skill), ''), 'SEM_HABILIDADE') as skill,
        coalesce(nullif(btrim(rs.reference_matrix), ''), nullif(btrim(rs.curriculum_matrix), ''), 'SEM_DESCRITOR') as descriptor,
        count(distinct rs.question_id)::integer as questions,
        count(rs.response_id)::integer as responses,
        count(rs.response_id) filter (where rs.is_correct is true)::integer as correct,
        round((count(rs.response_id) filter (where rs.is_correct is true)::numeric / nullif(count(rs.response_id), 0)) * 100, 2) as performance_percentage,
        case
          when count(rs.response_id) < 5 then 'INSUFFICIENT_SAMPLE'
          when (count(rs.response_id) filter (where rs.is_correct is true)::numeric / nullif(count(rs.response_id), 0)) < 0.6 then 'CRITICAL'
          else 'OK'
        end as learning_status
      from response_scope rs
      group by 1, 2, 3, 4
    ) row_data
  ), proficiency_distribution as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by position), '[]'::jsonb) as data
    from (
      select
        sr.proficiency->>'level_code' as level_code,
        sr.proficiency->>'label' as label,
        coalesce((sr.proficiency->>'position')::integer, 0) as position,
        count(*)::integer as results,
        count(distinct sr.student_id)::integer as students,
        round(avg(sr.score_percentage), 2) as average_percentage
      from scoped_results sr
      group by sr.proficiency->>'level_code', sr.proficiency->>'label', coalesce((sr.proficiency->>'position')::integer, 0)
    ) row_data
  ), item_stats_base as (
    select
      rs.question_id,
      min(rs.question_position) as position,
      max(coalesce(rs.internal_title, left(rs.statement, 120), rs.code, 'Questao')) as title,
      max(rs.bncc_skill) as bncc_skill,
      max(coalesce(rs.reference_matrix, rs.curriculum_matrix)) as descriptor,
      max(rs.difficulty) as planned_difficulty,
      count(rs.response_id)::integer as responses,
      count(rs.response_id) filter (where rs.is_correct is true)::integer as correct,
      round((count(rs.response_id) filter (where rs.is_correct is true)::numeric / nullif(count(rs.response_id), 0)) * 100, 2) as percent_correct,
      round((count(rs.response_id) filter (where rs.is_correct is true)::numeric / nullif(count(rs.response_id), 0)), 4) as difficulty_index,
      round(corr(case when rs.is_correct is true then 1::double precision else 0::double precision end, sr.score_percentage::double precision)::numeric, 4) as point_biserial
    from response_scope rs
    join scoped_results sr on sr.attempt_id = rs.attempt_id
    group by rs.question_id
  ), item_discrimination as (
    select
      question_id,
      round(
        (
          avg(case when is_correct is true then 1::numeric else 0::numeric end) filter (where score_band = 'top')
          -
          avg(case when is_correct is true then 1::numeric else 0::numeric end) filter (where score_band = 'bottom')
        ),
        4
      ) as discrimination_index
    from (
      select
        rs.question_id,
        rs.is_correct,
        case
          when ntile(4) over (partition by rs.question_id order by sr.score_percentage desc) = 1 then 'top'
          when ntile(4) over (partition by rs.question_id order by sr.score_percentage asc) = 1 then 'bottom'
          else 'middle'
        end as score_band
      from response_scope rs
      join scoped_results sr on sr.attempt_id = rs.attempt_id
    ) ranked
    group by question_id
  ), item_stats as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'question_id', b.question_id,
        'position', b.position,
        'title', b.title,
        'bncc_skill', b.bncc_skill,
        'descriptor', b.descriptor,
        'planned_difficulty', b.planned_difficulty,
        'responses', b.responses,
        'correct', b.correct,
        'percent_correct', coalesce(b.percent_correct, 0),
        'difficulty_index', case when b.responses >= 3 then b.difficulty_index else null end,
        'difficulty_status', case when b.responses >= 3 then 'PASS' else 'INSUFFICIENT_SAMPLE' end,
        'discrimination_index', case when b.responses >= 8 then d.discrimination_index else null end,
        'discrimination_status', case when b.responses >= 8 then 'PASS' else 'INSUFFICIENT_SAMPLE' end,
        'point_biserial', case when b.responses >= 5 then b.point_biserial else null end,
        'point_biserial_status', case when b.responses >= 5 then 'PASS' else 'INSUFFICIENT_SAMPLE' end
      )
      order by b.position
    ), '[]'::jsonb) as data
    from item_stats_base b
    left join item_discrimination d on d.question_id = b.question_id
  ), item_variances as (
    select
      question_id,
      var_samp(case when is_correct is true then 1::numeric else 0::numeric end) as item_variance
    from response_scope
    group by question_id
  ), attempt_scores as (
    select
      attempt_id,
      max(score_percentage) as total_score
    from response_scope
    group by attempt_id
  ), reliability as (
    select jsonb_build_object(
      'sample_size', attempt_stats.sample_size,
      'question_count', item_stats.question_count,
      'cronbach_alpha',
        case
          when attempt_stats.sample_size >= 5 and item_stats.question_count > 1 and nullif(attempt_stats.total_variance, 0) is not null
          then round(((item_stats.question_count::numeric / (item_stats.question_count::numeric - 1)) * (1 - (item_stats.item_variance_sum / nullif(attempt_stats.total_variance, 0))))::numeric, 4)
          else null
        end,
      'status',
        case
          when attempt_stats.sample_size >= 5 and item_stats.question_count > 1 and nullif(attempt_stats.total_variance, 0) is not null then 'PASS'
          else 'INSUFFICIENT_SAMPLE'
        end
    ) as data
    from (
      select
        coalesce(count(*)::integer, 0) as question_count,
        coalesce(sum(item_variance), 0) as item_variance_sum
      from item_variances
    ) item_stats
    cross join (
      select
        coalesce(count(*)::integer, 0) as sample_size,
        var_samp(total_score) as total_variance
      from attempt_scores
    ) attempt_stats
  ), evolution as (
    select coalesce(jsonb_agg(to_jsonb(row_data) order by period), '[]'::jsonb) as data
    from (
      select
        date_trunc('month', finalized_at)::date as period,
        count(*)::integer as results,
        round(avg(score_percentage), 2) as average_percentage
      from scoped_results
      group by 1
      having count(*) > 0
      order by 1
    ) row_data
  ), official_report_payload as (
    select jsonb_build_object(
      'report_type', 'avalia',
      'engine', 'official_reports_p0_live',
      'ready_for_export', true,
      'filters', jsonb_build_object(
        'scope', v_scope,
        'assignment_id', p_assignment_id,
        'assessment_id', p_assessment_id,
        'school_id', p_school_id,
        'class_id', p_class_id,
        'network_id', v_network_id,
        'date_from', v_from,
        'date_to', v_to,
        'component', p_component,
        'school_year', p_school_year,
        'booklet_id', p_booklet_id
      )
    ) as data
  )
  select jsonb_build_object(
    'scope', v_scope,
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'summary', jsonb_build_object(
      'students', (select count(distinct student_id) from scoped_results),
      'classes', (select count(distinct class_id) from scoped_results),
      'schools', (select count(distinct school_id) from scoped_results),
      'results', (select count(*) from scoped_results),
      'average_percentage', coalesce((select round(avg(score_percentage), 2) from scoped_results), 0)
    ),
    'hierarchy', jsonb_build_object(
      'students', (select data from hierarchy_student),
      'classes', (select data from hierarchy_class),
      'schools', (select data from hierarchy_school),
      'network', (select data from hierarchy_network)
    ),
    'curriculum', (select data from curriculum),
    'proficiency', jsonb_build_object(
      'thresholds', public.avalia_plus_default_proficiency_thresholds(),
      'distribution', (select data from proficiency_distribution)
    ),
    'items', (select data from item_stats),
    'reliability', (select data from reliability),
    'evolution', (select data from evolution),
    'official_report', (select data from official_report_payload),
    'metadata', jsonb_build_object('duplicate_analytics_engine', false, 'tri', false)
  ) into v_payload;

  return v_payload;
end;
$$;

create or replace function public.teacher_get_assessment_pedagogical_intelligence(p_assignment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.avalia_plus_get_pedagogical_intelligence('assignment', p_assignment_id, null, null, null, null, null, null, null, null, null);
$$;

create or replace function public.secretaria_get_assessment_pedagogical_intelligence(
  p_school_id uuid,
  p_date_from date default null,
  p_date_to date default null,
  p_component text default null,
  p_school_year text default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select public.avalia_plus_get_pedagogical_intelligence('school', null, null, p_school_id, null, null, p_date_from, p_date_to, p_component, p_school_year, null);
$$;

create or replace function public.network_get_assessment_pedagogical_intelligence(
  p_network_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_component text default null,
  p_school_year text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_network_id uuid;
begin
  v_network_id := public.network_resolve_requested_network(p_network_id);
  return public.avalia_plus_get_pedagogical_intelligence('network', null, null, null, null, v_network_id, p_date_from, p_date_to, p_component, p_school_year, null);
end;
$$;

drop policy if exists assessment_proficiency_thresholds_select_authorized on public.assessment_proficiency_thresholds;
create policy assessment_proficiency_thresholds_select_authorized
on public.assessment_proficiency_thresholds
for select
to authenticated
using (
  public.is_platform_admin()
  or (school_id is not null and public.secretaria_can_manage_school(school_id))
  or (network_id is not null and public.network_can_read(network_id))
  or created_by = auth.uid()
);

revoke all on public.assessment_proficiency_thresholds from public, anon;
grant select on public.assessment_proficiency_thresholds to authenticated;

revoke all on function public.avalia_plus_get_pedagogical_intelligence(text, uuid, uuid, uuid, uuid, uuid, date, date, text, text, uuid) from public, anon;
revoke all on function public.teacher_get_assessment_pedagogical_intelligence(uuid) from public, anon;
revoke all on function public.secretaria_get_assessment_pedagogical_intelligence(uuid, date, date, text, text) from public, anon;
revoke all on function public.network_get_assessment_pedagogical_intelligence(uuid, date, date, text, text) from public, anon;
revoke all on function public.avalia_plus_classify_proficiency(numeric, uuid, uuid, uuid) from public, anon;
grant execute on function public.avalia_plus_get_pedagogical_intelligence(text, uuid, uuid, uuid, uuid, uuid, date, date, text, text, uuid) to authenticated, service_role;
grant execute on function public.teacher_get_assessment_pedagogical_intelligence(uuid) to authenticated, service_role;
grant execute on function public.secretaria_get_assessment_pedagogical_intelligence(uuid, date, date, text, text) to authenticated, service_role;
grant execute on function public.network_get_assessment_pedagogical_intelligence(uuid, date, date, text, text) to authenticated, service_role;
grant execute on function public.avalia_plus_classify_proficiency(numeric, uuid, uuid, uuid) to authenticated, service_role;
