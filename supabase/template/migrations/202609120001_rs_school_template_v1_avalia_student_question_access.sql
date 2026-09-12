-- Avalia+ V1 - acesso seguro do aluno as questoes de avaliacoes atribuidas.
-- Mantem gabarito fora das leituras diretas do aluno.

do $$
begin
  if to_regclass('public.assessment_questions') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_questions nao existe';
  end if;

  if to_regclass('public.question_items') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_items nao existe';
  end if;

  if to_regclass('public.question_alternatives') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_alternatives nao existe';
  end if;

  if to_regprocedure('public.avalia_student_can_access_assignment(uuid, uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: helper public.avalia_student_can_access_assignment nao existe';
  end if;
end $$;

drop policy if exists assessment_questions_student_assigned_select on public.assessment_questions;
create policy assessment_questions_student_assigned_select
on public.assessment_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_assignments aa
    where aa.assessment_id = assessment_questions.assessment_id
      and public.avalia_student_can_access_assignment(aa.id, public.avalia_current_student_id())
  )
);

drop policy if exists "published questions readable by educators" on public.question_items;
create policy "published questions readable by educators"
on public.question_items
for select
to authenticated
using (
  public.is_platform_admin()
  or public.has_question_bank_role(array[
    'admin',
    'administrador_nacional',
    'gestor',
    'gestor_da_rede',
    'curator',
    'curador',
    'revisor',
    'revisor_pedagogico',
    'professor',
    'aplicador',
    'visualizador',
    'viewer',
    'service_role'
  ])
);

drop policy if exists "question children readable with question" on public.question_alternatives;
create policy "question children readable with question"
on public.question_alternatives
for select
to authenticated
using (
  public.is_platform_admin()
  or public.has_question_bank_role(array[
    'admin',
    'administrador_nacional',
    'gestor',
    'gestor_da_rede',
    'curator',
    'curador',
    'revisor',
    'revisor_pedagogico',
    'professor',
    'aplicador',
    'visualizador',
    'viewer',
    'service_role'
  ])
);

create or replace function public.student_list_assessment_assignments()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select public.avalia_current_student_id() into v_student_id;

  if v_student_id is null then
    raise exception 'Aluno institucional ativo nao encontrado.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'assignments',
    coalesce((
      select jsonb_agg(row_payload order by available_from desc)
      from (
        select
          aa.available_from,
          jsonb_build_object(
            'id', aa.id,
            'school_id', aa.school_id,
            'assessment_id', aa.assessment_id,
            'assigned_by', aa.assigned_by,
            'target_type', aa.target_type,
            'class_id', aa.class_id,
            'student_id', aa.student_id,
            'available_from', aa.available_from,
            'available_until', aa.available_until,
            'time_limit_minutes', aa.time_limit_minutes,
            'max_attempts', aa.max_attempts,
            'status', aa.status,
            'published_at', aa.published_at,
            'created_at', aa.created_at,
            'updated_at', aa.updated_at,
            'assessment', jsonb_build_object(
              'id', a.id,
              'title', a.title,
              'description', a.description,
              'component', a.component,
              'school_year', a.school_year,
              'instructions', a.instructions,
              'total_points', a.total_points,
              'status', a.status,
              'questions', coalesce(q.questions, '[]'::jsonb)
            )
          ) as row_payload
        from public.assessment_assignments aa
        join public.assessments a on a.id = aa.assessment_id
        left join lateral (
          select jsonb_agg(
            jsonb_build_object(
              'id', aq.id,
              'question_id', aq.question_id,
              'position', aq.position,
              'points', aq.points,
              'question', jsonb_build_object(
                'id', qi.id,
                'code', qi.code,
                'internal_title', qi.internal_title,
                'statement', qi.statement,
                'base_text', qi.base_text,
                'bncc_skill', qi.bncc_skill,
                'question_type', qi.question_type,
                'alternatives', coalesce(alt.alternatives, '[]'::jsonb)
              )
            )
            order by aq.position
          ) as questions
          from public.assessment_questions aq
          join public.question_items qi on qi.id = aq.question_id
          left join lateral (
            select jsonb_agg(
              jsonb_build_object(
                'id', qa.id,
                'label', qa.label,
                'body', qa.body,
                'position', qa.position
              )
              order by qa.position
            ) as alternatives
            from public.question_alternatives qa
            where qa.question_id = qi.id
          ) alt on true
          where aq.assessment_id = a.id
        ) q on true
        where public.avalia_student_can_access_assignment(aa.id, v_student_id)
      ) assignments_scope
    ), '[]'::jsonb),
    'attempts',
    coalesce((
      select jsonb_agg(row_payload order by started_at desc)
      from (
        select
          at.started_at,
          to_jsonb(at) || jsonb_build_object(
            'responses',
            coalesce((
              select jsonb_agg(to_jsonb(ar) order by ar.answered_at asc)
              from public.assessment_responses ar
              where ar.attempt_id = at.id
            ), '[]'::jsonb)
          ) as row_payload
        from public.assessment_attempts at
        where at.student_id = v_student_id
      ) attempts_scope
    ), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

revoke all on function public.student_list_assessment_assignments() from public, anon;
grant execute on function public.student_list_assessment_assignments() to authenticated;
