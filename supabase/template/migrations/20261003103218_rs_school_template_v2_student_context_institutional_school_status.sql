-- ALUNO FUNDAMENTAL 01
-- Contexto escolar canonico para aluno com login institucional.
--
-- A credencial institucional pode existir antes da ativacao formal da escola
-- no ciclo de vida Admin. O ambiente do aluno deve resolver o vinculo real
-- aluno -> matricula -> turma -> escola enquanto a escola nao estiver
-- arquivada/excluida, sem alterar dados de aluno, matricula ou credencial.

drop function if exists public.student_get_context();

create or replace function public.student_get_context()
returns table(
  student_id uuid,
  student_name text,
  enrollment_id uuid,
  class_id uuid,
  class_name text,
  school_id uuid,
  school_name text,
  segment text,
  school_year text,
  age_group text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    s.id as student_id,
    s.nome::text as student_name,
    e.id as enrollment_id,
    e.class_id,
    c.nome::text as class_name,
    e.school_id,
    sc.nome::text as school_name,
    case
      when lower(coalesce(c.age_group, '')) in (
        'educacao_infantil',
        'educação infantil',
        'infantil',
        'pre_escola',
        'pré-escola',
        'pre escola',
        'pré escola'
      )
        or lower(coalesce(c.school_year, e.school_year, c.ano_escolar, s.turma, '')) similar to '%(infantil|creche|maternal|pre|pré)%'
        then 'EDUCACAO_INFANTIL'
      when lower(coalesce(c.school_year, e.school_year, c.ano_escolar, s.turma, '')) similar to '%(medio|médio|ensino medio|ensino médio)%'
        then 'ENSINO_MEDIO'
      else 'ENSINO_FUNDAMENTAL'
    end as segment,
    coalesce(c.school_year, e.school_year, c.ano_escolar::text, s.turma::text) as school_year,
    c.age_group
  from public.students s
  join public.enrollments e on e.student_id = s.id
  join public.classes c on c.id = e.class_id
  join public.schools sc on sc.id = e.school_id
  left join public.users u on u.id = s.user_id
  where auth.uid() is not null
    and (
      s.user_id = auth.uid()
      or lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and lower(coalesce(s.status, 'active')) in ('active', 'ativo')
    and lower(coalesce(e.status, 'active')) in ('active', 'ativo')
    and e.enrolled_at <= now()
    and (e.ended_at is null or e.ended_at > now())
    and lower(coalesce(c.status, 'active')) in ('active', 'ativo')
    and lower(coalesce(sc.status, 'active')) not in ('archived', 'deleted', 'excluida', 'excluída')
  order by e.enrolled_at desc nulls last, e.created_at desc nulls last
  limit 1;
$$;

revoke all on function public.student_get_context() from public, anon;
grant execute on function public.student_get_context() to authenticated, service_role;

comment on function public.student_get_context() is
  'Contexto canonico do aluno autenticado por auth.uid(), incluindo login institucional. Retorna aluno, matricula ativa, turma, escola e segmento sem depender de fallback demonstrativo.';
