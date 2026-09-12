-- Avalia+ V1 - Fase 03: resultados agregados por turma/escola e habilidades BNCC.
-- Leitura read-only por RPC; nao expõe gabarito nem ranking publico de alunos.

do $$
begin
  if to_regclass('public.assessment_results') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_results nao existe';
  end if;

  if to_regclass('public.assessment_responses') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_responses nao existe';
  end if;

  if to_regprocedure('public.avalia_teacher_can_manage_assignment(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: helper public.avalia_teacher_can_manage_assignment nao existe';
  end if;
end $$;

create or replace function public.teacher_get_assessment_class_results(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if p_assignment_id is null then
    raise exception 'assignment_id obrigatorio.' using errcode = '22023';
  end if;

  if not (
    public.is_platform_admin()
    or public.avalia_teacher_can_manage_assignment(p_assignment_id)
    or exists (
      select 1
      from public.assessment_assignments aa
      where aa.id = p_assignment_id
        and public.secretaria_can_manage_school(aa.school_id)
    )
  ) then
    raise exception 'Acesso negado aos resultados desta avaliacao.' using errcode = '42501';
  end if;

  with assignment_scope as (
    select
      aa.*,
      a.title as assessment_title,
      a.component as assessment_component,
      a.school_year as assessment_year,
      c.nome as class_name,
      s.nome as school_name
    from public.assessment_assignments aa
    join public.assessments a on a.id = aa.assessment_id
    join public.classes c on c.id = aa.class_id
    join public.schools s on s.id = aa.school_id
    where aa.id = p_assignment_id
  ),
  assigned_students as (
    select distinct st.id, st.nome
    from assignment_scope aa
    join public.enrollments e
      on e.class_id = aa.class_id
     and e.school_id = aa.school_id
     and e.status = 'active'
     and e.enrolled_at <= now()
     and (e.ended_at is null or e.ended_at > now())
    join public.students st
      on st.id = e.student_id
     and coalesce(st.status, 'active') = 'active'
    where aa.target_type = 'class'
       or (aa.target_type = 'student' and st.id = aa.student_id)
  ),
  assigned_count as (
    select count(*)::integer as total from assigned_students
  ),
  attempts as (
    select at.*
    from public.assessment_attempts at
    where at.assignment_id = p_assignment_id
  ),
  latest_attempt as (
    select distinct on (at.student_id) at.*
    from attempts at
    order by at.student_id, at.started_at desc
  ),
  results as (
    select ar.*
    from public.assessment_results ar
    where ar.assignment_id = p_assignment_id
  ),
  summary as (
    select
      (select total from assigned_count) as assigned_students,
      (select count(distinct student_id)::integer from attempts) as started_students,
      (select count(distinct student_id)::integer from results) as completed_students,
      coalesce(round(avg(score_percentage)::numeric, 2), 0) as average_percentage,
      coalesce(round(avg(correct_count)::numeric, 2), 0) as average_correct,
      coalesce(max(score_percentage), 0) as highest_percentage,
      coalesce(min(score_percentage), 0) as lowest_percentage
    from results
  ),
  students_payload as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'student_id', st.id,
        'student_name', st.nome,
        'status', coalesce(r.status, la.status, 'not_started'),
        'attempt_id', la.id,
        'score_percentage', r.score_percentage,
        'answered_count', coalesce(r.answered_count, la.answered_count, 0),
        'correct_count', coalesce(r.correct_count, la.correct_count, 0),
        'incorrect_count', coalesce(r.incorrect_count, la.incorrect_count, 0),
        'unanswered_count', coalesce(r.unanswered_count, la.unanswered_count, 0),
        'finalized_at', r.finalized_at
      )
      order by st.nome
    ), '[]'::jsonb) as data
    from assigned_students st
    left join latest_attempt la on la.student_id = st.id
    left join results r on r.student_id = st.id
  ),
  questions_payload as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'question_id', aq.question_id,
        'position', aq.position,
        'title', coalesce(qi.internal_title, left(qi.statement, 140), 'Questao'),
        'bncc_skill', nullif(btrim(coalesce(qi.bncc_skill, '')), ''),
        'responses', coalesce(qs.responses, 0),
        'correct', coalesce(qs.correct, 0),
        'incorrect', coalesce(qs.incorrect, 0),
        'unanswered', greatest((select total from assigned_count) - coalesce(qs.responses, 0), 0),
        'error_rate', case when coalesce(qs.responses, 0) > 0 then round((coalesce(qs.incorrect, 0)::numeric / qs.responses) * 100, 2) else 0 end
      )
      order by coalesce(qs.incorrect, 0) desc, aq.position
    ), '[]'::jsonb) as data
    from public.assessment_questions aq
    join assignment_scope aa on aa.assessment_id = aq.assessment_id
    join public.question_items qi on qi.id = aq.question_id
    left join lateral (
      select
        count(ar.id)::integer as responses,
        count(ar.id) filter (where ar.is_correct is true)::integer as correct,
        count(ar.id) filter (where coalesce(ar.is_correct, false) is false)::integer as incorrect
      from public.assessment_responses ar
      join public.assessment_attempts at on at.id = ar.attempt_id
      where at.assignment_id = aa.id
        and at.status in ('submitted', 'graded')
        and ar.question_id = aq.question_id
    ) qs on true
  ),
  skills_payload as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'bncc_skill', bncc_skill,
        'questions', question_count,
        'responses', responses,
        'correct', correct,
        'incorrect', incorrect,
        'performance_percentage', case when responses > 0 then round((correct::numeric / responses) * 100, 2) else 0 end
      )
      order by case when responses > 0 then (correct::numeric / responses) else 0 end asc, bncc_skill
    ), '[]'::jsonb) as data
    from (
      select
        coalesce(nullif(btrim(qi.bncc_skill), ''), 'SEM_HABILIDADE') as bncc_skill,
        count(distinct aq.question_id)::integer as question_count,
        count(ar.id)::integer as responses,
        count(ar.id) filter (where ar.is_correct is true)::integer as correct,
        count(ar.id) filter (where coalesce(ar.is_correct, false) is false)::integer as incorrect
      from assignment_scope aa
      join public.assessment_questions aq on aq.assessment_id = aa.assessment_id
      join public.question_items qi on qi.id = aq.question_id
      left join public.assessment_attempts at
        on at.assignment_id = aa.id
       and at.status in ('submitted', 'graded')
      left join public.assessment_responses ar
        on ar.attempt_id = at.id
       and ar.question_id = aq.question_id
      group by coalesce(nullif(btrim(qi.bncc_skill), ''), 'SEM_HABILIDADE')
    ) skill_rows
  )
  select jsonb_build_object(
    'assignment', jsonb_build_object(
      'id', aa.id,
      'assessment_id', aa.assessment_id,
      'assessment_title', aa.assessment_title,
      'component', aa.assessment_component,
      'school_year', aa.assessment_year,
      'school_id', aa.school_id,
      'school_name', aa.school_name,
      'class_id', aa.class_id,
      'class_name', aa.class_name,
      'target_type', aa.target_type,
      'available_from', aa.available_from,
      'available_until', aa.available_until,
      'status', aa.status
    ),
    'summary', jsonb_build_object(
      'assigned_students', sm.assigned_students,
      'started_students', sm.started_students,
      'completed_students', sm.completed_students,
      'participation_percentage', case when sm.assigned_students > 0 then round((sm.completed_students::numeric / sm.assigned_students) * 100, 2) else 0 end,
      'average_correct', sm.average_correct,
      'average_percentage', sm.average_percentage,
      'highest_percentage', sm.highest_percentage,
      'lowest_percentage', sm.lowest_percentage
    ),
    'students', sp.data,
    'questions', qp.data,
    'skills', sk.data
  )
  into v_payload
  from assignment_scope aa
  cross join summary sm
  cross join students_payload sp
  cross join questions_payload qp
  cross join skills_payload sk;

  if v_payload is null then
    raise exception 'Atribuicao nao encontrada.' using errcode = '42501';
  end if;

  return v_payload;
end;
$$;

create or replace function public.get_assessment_skill_results(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_results jsonb;
begin
  select public.teacher_get_assessment_class_results(p_assignment_id) into v_results;
  return coalesce(v_results -> 'skills', '[]'::jsonb);
end;
$$;

create or replace function public.secretaria_get_assessment_school_results(p_school_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if p_school_id is null then
    raise exception 'school_id obrigatorio.' using errcode = '22023';
  end if;

  if not (public.is_platform_admin() or public.secretaria_can_manage_school(p_school_id)) then
    raise exception 'Acesso negado aos resultados desta escola.' using errcode = '42501';
  end if;

  with assignments as (
    select
      aa.*,
      a.title as assessment_title,
      a.component as component,
      c.nome as class_name
    from public.assessment_assignments aa
    join public.assessments a on a.id = aa.assessment_id
    join public.classes c on c.id = aa.class_id
    where aa.school_id = p_school_id
      and aa.status in ('published', 'closed', 'archived')
  ),
  assignment_rows as (
    select
      aa.id,
      aa.assessment_id,
      aa.assessment_title,
      aa.component,
      aa.class_id,
      aa.class_name,
      aa.created_at,
      coalesce(roster.assigned_students, 0) as assigned_students,
      coalesce(started.started_students, 0) as started_students,
      coalesce(completed.completed_students, 0) as completed_students,
      coalesce(results.average_percentage, 0) as average_percentage
    from assignments aa
    left join lateral (
      select count(distinct st.id)::integer as assigned_students
      from public.enrollments e
      join public.students st on st.id = e.student_id and coalesce(st.status, 'active') = 'active'
      where e.class_id = aa.class_id
        and e.school_id = aa.school_id
        and e.status = 'active'
        and e.enrolled_at <= now()
        and (e.ended_at is null or e.ended_at > now())
        and (aa.target_type = 'class' or st.id = aa.student_id)
    ) roster on true
    left join lateral (
      select count(distinct at.student_id)::integer as started_students
      from public.assessment_attempts at
      where at.assignment_id = aa.id
    ) started on true
    left join lateral (
      select count(distinct ar.student_id)::integer as completed_students
      from public.assessment_results ar
      where ar.assignment_id = aa.id
    ) completed on true
    left join lateral (
      select round(avg(ar.score_percentage)::numeric, 2) as average_percentage
      from public.assessment_results ar
      where ar.assignment_id = aa.id
    ) results on true
  ),
  summary as (
    select
      count(distinct class_id)::integer as classes_participating,
      sum(assigned_students)::integer as assigned_students,
      sum(started_students)::integer as started_students,
      sum(completed_students)::integer as completed_students,
      coalesce(round(avg(nullif(average_percentage, 0))::numeric, 2), 0) as average_percentage
    from assignment_rows
  ),
  performance_distribution as (
    select jsonb_build_object(
      'attention', count(*) filter (where score_percentage < 50),
      'developing', count(*) filter (where score_percentage >= 50 and score_percentage < 70),
      'adequate', count(*) filter (where score_percentage >= 70)
    ) as data
    from public.assessment_results
    where school_id = p_school_id
  ),
  skills as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'bncc_skill', bncc_skill,
        'questions', question_count,
        'responses', responses,
        'correct', correct,
        'incorrect', incorrect,
        'performance_percentage', case when responses > 0 then round((correct::numeric / responses) * 100, 2) else 0 end
      )
      order by case when responses > 0 then (correct::numeric / responses) else 0 end asc, bncc_skill
    ), '[]'::jsonb) as data
    from (
      select
        coalesce(nullif(btrim(qi.bncc_skill), ''), 'SEM_HABILIDADE') as bncc_skill,
        count(distinct aq.question_id)::integer as question_count,
        count(ar.id)::integer as responses,
        count(ar.id) filter (where ar.is_correct is true)::integer as correct,
        count(ar.id) filter (where coalesce(ar.is_correct, false) is false)::integer as incorrect
      from assignments aa
      join public.assessment_questions aq on aq.assessment_id = aa.assessment_id
      join public.question_items qi on qi.id = aq.question_id
      left join public.assessment_attempts at
        on at.assignment_id = aa.id
       and at.status in ('submitted', 'graded')
      left join public.assessment_responses ar
        on ar.attempt_id = at.id
       and ar.question_id = aq.question_id
      group by coalesce(nullif(btrim(qi.bncc_skill), ''), 'SEM_HABILIDADE')
    ) skill_rows
  ),
  assignments_payload as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'assignment_id', id,
        'assessment_id', assessment_id,
        'assessment_title', assessment_title,
        'component', component,
        'class_id', class_id,
        'class_name', class_name,
        'assigned_students', assigned_students,
        'started_students', started_students,
        'completed_students', completed_students,
        'participation_percentage', case when assigned_students > 0 then round((completed_students::numeric / assigned_students) * 100, 2) else 0 end,
        'average_percentage', average_percentage
      )
      order by created_at desc
    ), '[]'::jsonb) as data
    from assignment_rows
  )
  select jsonb_build_object(
    'school_id', p_school_id,
    'summary', jsonb_build_object(
      'classes_participating', coalesce(sm.classes_participating, 0),
      'assigned_students', coalesce(sm.assigned_students, 0),
      'started_students', coalesce(sm.started_students, 0),
      'completed_students', coalesce(sm.completed_students, 0),
      'participation_percentage', case when coalesce(sm.assigned_students, 0) > 0 then round((coalesce(sm.completed_students, 0)::numeric / sm.assigned_students) * 100, 2) else 0 end,
      'average_percentage', coalesce(sm.average_percentage, 0)
    ),
    'distribution', pd.data,
    'skills', sk.data,
    'assignments', ap.data
  )
  into v_payload
  from summary sm
  cross join performance_distribution pd
  cross join skills sk
  cross join assignments_payload ap;

  return coalesce(v_payload, jsonb_build_object(
    'school_id', p_school_id,
    'summary', jsonb_build_object(),
    'distribution', jsonb_build_object(),
    'skills', '[]'::jsonb,
    'assignments', '[]'::jsonb
  ));
end;
$$;

revoke all on function public.teacher_get_assessment_class_results(uuid) from public, anon;
revoke all on function public.get_assessment_skill_results(uuid) from public, anon;
revoke all on function public.secretaria_get_assessment_school_results(uuid) from public, anon;

grant execute on function public.teacher_get_assessment_class_results(uuid) to authenticated;
grant execute on function public.get_assessment_skill_results(uuid) to authenticated;
grant execute on function public.secretaria_get_assessment_school_results(uuid) to authenticated;
