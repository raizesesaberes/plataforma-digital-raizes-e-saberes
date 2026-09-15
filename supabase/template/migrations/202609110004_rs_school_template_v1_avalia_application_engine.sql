-- Avalia+ V1 - Fase 02
-- Hardening minimo do legado e motor canonico de aplicacao:
-- atribuicao -> tentativa -> respostas -> envio -> correcao objetiva -> resultado.

do $$
begin
  if to_regclass('public.assessments') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessments nao existe';
  end if;

  if to_regclass('public.assessment_questions') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_questions nao existe';
  end if;

  if to_regclass('public.question_items') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_items nao existe';
  end if;

  if to_regclass('public.question_alternatives') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_alternatives nao existe';
  end if;

  if to_regclass('public.student_grades') is null then
    raise exception 'PRE-CHECK bloqueado: public.student_grades nao existe';
  end if;

  if to_regprocedure('public.institutional_teacher_can_manage_class(uuid, uuid, uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.institutional_teacher_can_manage_class(uuid, uuid, uuid) nao existe';
  end if;

  if to_regprocedure('public.institutional_can_access_student(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.institutional_can_access_student(uuid) nao existe';
  end if;

  if to_regprocedure('public.secretaria_can_manage_school(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.secretaria_can_manage_school(uuid) nao existe';
  end if;
end
$$;

create table if not exists public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assigned_by uuid not null,
  target_type text not null,
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid references public.students(id) on delete cascade,
  available_from timestamptz not null default now(),
  available_until timestamptz,
  time_limit_minutes integer,
  max_attempts integer not null default 1,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_assignments_target_type_check
    check (target_type in ('class', 'student')),
  constraint assessment_assignments_status_check
    check (status in ('draft', 'published', 'closed', 'archived')),
  constraint assessment_assignments_target_shape_check
    check (
      (target_type = 'class' and student_id is null)
      or (target_type = 'student' and student_id is not null)
    ),
  constraint assessment_assignments_window_check
    check (available_until is null or available_until > available_from),
  constraint assessment_assignments_time_limit_check
    check (time_limit_minutes is null or time_limit_minutes > 0),
  constraint assessment_assignments_max_attempts_check
    check (max_attempts > 0),
  constraint assessment_assignments_class_school_fkey
    foreign key (class_id, school_id) references public.classes(id, school_id) on delete restrict
);

create unique index if not exists assessment_assignments_class_active_unique
  on public.assessment_assignments (school_id, assessment_id, class_id)
  where target_type = 'class' and status in ('draft', 'published');

create unique index if not exists assessment_assignments_student_active_unique
  on public.assessment_assignments (school_id, assessment_id, class_id, student_id)
  where target_type = 'student' and status in ('draft', 'published');

create index if not exists assessment_assignments_school_status_idx
  on public.assessment_assignments (school_id, status, available_from);

create index if not exists assessment_assignments_class_idx
  on public.assessment_assignments (class_id, status);

create index if not exists assessment_assignments_student_idx
  on public.assessment_assignments (student_id, status)
  where student_id is not null;

comment on table public.assessment_assignments is
  'Avalia+ V1: atribuicoes canonicas de avaliacao para turma ou aluno, sem duplicar por aluno quando o alvo for turma.';

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade,
  attempt_number integer not null,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  time_spent_seconds integer,
  score_raw numeric(10,2),
  score_percentage numeric(6,2),
  question_count integer not null default 0,
  answered_count integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unanswered_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_attempts_status_check
    check (status in ('in_progress', 'submitted', 'graded', 'cancelled', 'expired')),
  constraint assessment_attempts_attempt_number_check
    check (attempt_number > 0),
  constraint assessment_attempts_time_spent_check
    check (time_spent_seconds is null or time_spent_seconds >= 0),
  constraint assessment_attempts_score_percentage_check
    check (score_percentage is null or (score_percentage >= 0 and score_percentage <= 100)),
  constraint assessment_attempts_unique_number
    unique (assignment_id, student_id, attempt_number)
);

create unique index if not exists assessment_attempts_one_open_attempt
  on public.assessment_attempts (assignment_id, student_id)
  where status = 'in_progress';

create index if not exists assessment_attempts_student_status_idx
  on public.assessment_attempts (student_id, status, started_at desc);

create index if not exists assessment_attempts_assignment_idx
  on public.assessment_attempts (assignment_id, status);

comment on table public.assessment_attempts is
  'Avalia+ V1: tentativas individuais de alunos em atribuicoes validas.';

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.question_items(id) on delete restrict,
  selected_alternative_id uuid references public.question_alternatives(id) on delete restrict,
  response_text text,
  is_correct boolean,
  score_awarded numeric(10,2),
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_responses_one_per_question
    unique (attempt_id, question_id),
  constraint assessment_responses_has_answer_check
    check (selected_alternative_id is not null or nullif(btrim(coalesce(response_text, '')), '') is not null)
);

create index if not exists assessment_responses_attempt_idx
  on public.assessment_responses (attempt_id);

create index if not exists assessment_responses_question_idx
  on public.assessment_responses (question_id);

comment on table public.assessment_responses is
  'Avalia+ V1: respostas do aluno. V1 prioriza multipla escolha; response_text fica reservado para discursivas futuras.';

create table if not exists public.assessment_results (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  status text not null default 'graded',
  score_raw numeric(10,2) not null default 0,
  score_percentage numeric(6,2) not null default 0,
  question_count integer not null default 0,
  answered_count integer not null default 0,
  correct_count integer not null default 0,
  incorrect_count integer not null default 0,
  unanswered_count integer not null default 0,
  finalized_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_results_attempt_unique
    unique (attempt_id),
  constraint assessment_results_status_check
    check (status in ('submitted', 'graded')),
  constraint assessment_results_score_percentage_check
    check (score_percentage >= 0 and score_percentage <= 100)
);

create index if not exists assessment_results_assignment_student_idx
  on public.assessment_results (assignment_id, student_id);

create index if not exists assessment_results_school_idx
  on public.assessment_results (school_id, finalized_at desc);

comment on table public.assessment_results is
  'Avalia+ V1: consolidado idempotente do resultado final para evitar recalculo em relatorios futuros. assessment_attempts segue como fonte operacional canonica.';

drop trigger if exists assessment_assignments_touch_updated_at on public.assessment_assignments;
create trigger assessment_assignments_touch_updated_at
before update on public.assessment_assignments
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists assessment_attempts_touch_updated_at on public.assessment_attempts;
create trigger assessment_attempts_touch_updated_at
before update on public.assessment_attempts
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists assessment_responses_touch_updated_at on public.assessment_responses;
create trigger assessment_responses_touch_updated_at
before update on public.assessment_responses
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists assessment_results_touch_updated_at on public.assessment_results;
create trigger assessment_results_touch_updated_at
before update on public.assessment_results
for each row execute function public.institutional_touch_updated_at();

alter table public.assessment_assignments enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_responses enable row level security;
alter table public.assessment_results enable row level security;

drop policy if exists "Allow all read access" on public.student_grades;
drop policy if exists student_grades_select_institutional on public.student_grades;
create policy student_grades_select_institutional
on public.student_grades
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_can_access_student(student_id)
  or public.institutional_is_current_student(student_id)
  or exists (
    select 1
    from public.students s
    where s.id = student_grades.student_id
      and public.secretaria_can_manage_school(s.school_id)
  )
);

revoke all on public.student_grades from anon;
revoke all on public.student_grades from public;
revoke insert, update, delete, truncate on public.student_grades from authenticated;
grant select on public.student_grades to authenticated;

revoke all on public.assessment_assignments from anon;
revoke all on public.assessment_attempts from anon;
revoke all on public.assessment_responses from anon;
revoke all on public.assessment_results from anon;

revoke all on public.assessment_assignments from public;
revoke all on public.assessment_attempts from public;
revoke all on public.assessment_responses from public;
revoke all on public.assessment_results from public;

revoke insert, update, delete, truncate on public.assessment_assignments from authenticated;
revoke insert, update, delete, truncate on public.assessment_attempts from authenticated;
revoke insert, update, delete, truncate on public.assessment_responses from authenticated;
revoke insert, update, delete, truncate on public.assessment_results from authenticated;

grant select on public.assessment_assignments to authenticated;
grant select on public.assessment_attempts to authenticated;
grant select on public.assessment_responses to authenticated;
grant select on public.assessment_results to authenticated;

create or replace function public.avalia_current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id
  from public.students s
  left join public.users u on u.id = s.user_id
  where coalesce(s.status, 'active') = 'active'
    and (
      s.user_id = auth.uid()
      or lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      or lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;
$$;

create or replace function public.avalia_current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select t.id
  from public.teachers t
  where t.profile_id = auth.uid()
    and coalesce(t.status, 'active') = 'active'
  order by t.updated_at desc nulls last, t.created_at desc nulls last
  limit 1;
$$;

create or replace function public.avalia_assessment_is_assignable(p_assessment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.assessments a
    where a.id = p_assessment_id
      and a.archived_at is null
      and a.status in ('RASCUNHO', 'PRONTA', 'ATRIBUIDA', 'APLICADA')
      and exists (
        select 1
        from public.assessment_questions aq
        where aq.assessment_id = a.id
      )
  );
$$;

create or replace function public.avalia_student_can_access_assignment(p_assignment_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.assessment_assignments aa
    join public.enrollments e
      on e.student_id = p_student_id
     and e.class_id = aa.class_id
     and e.school_id = aa.school_id
     and e.status = 'active'
     and e.enrolled_at <= now()
     and (e.ended_at is null or e.ended_at > now())
    join public.students s on s.id = e.student_id
    left join public.users u on u.id = s.user_id
    where aa.id = p_assignment_id
      and aa.status = 'published'
      and aa.available_from <= now()
      and (aa.available_until is null or aa.available_until > now())
      and coalesce(s.status, 'active') = 'active'
      and (aa.target_type = 'class' or aa.student_id = p_student_id)
      and (
        s.user_id = auth.uid()
        or lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        or lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function public.avalia_teacher_can_manage_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.assessment_assignments aa
    join public.teachers t on t.id = public.avalia_current_teacher_id()
    where aa.id = p_assignment_id
      and public.institutional_teacher_can_manage_class(t.id, aa.class_id, aa.school_id)
  );
$$;

create or replace function public.avalia_can_read_assignment(p_assignment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.assessment_assignments aa
    where aa.id = p_assignment_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(aa.school_id)
        or public.avalia_teacher_can_manage_assignment(aa.id)
        or public.avalia_student_can_access_assignment(aa.id, public.avalia_current_student_id())
      )
  );
$$;

create or replace function public.avalia_can_read_attempt(p_attempt_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.assessment_attempts at
    where at.id = p_attempt_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(at.school_id)
        or public.avalia_teacher_can_manage_assignment(at.assignment_id)
        or public.institutional_is_current_student(at.student_id)
      )
  );
$$;

drop policy if exists assessment_assignments_select_institutional on public.assessment_assignments;
create policy assessment_assignments_select_institutional
on public.assessment_assignments
for select
to authenticated
using (public.avalia_can_read_assignment(id));

drop policy if exists assessment_attempts_select_institutional on public.assessment_attempts;
create policy assessment_attempts_select_institutional
on public.assessment_attempts
for select
to authenticated
using (public.avalia_can_read_attempt(id));

drop policy if exists assessment_responses_select_institutional on public.assessment_responses;
create policy assessment_responses_select_institutional
on public.assessment_responses
for select
to authenticated
using (public.avalia_can_read_attempt(attempt_id));

drop policy if exists assessment_results_select_institutional on public.assessment_results;
create policy assessment_results_select_institutional
on public.assessment_results
for select
to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.avalia_teacher_can_manage_assignment(assignment_id)
  or public.institutional_is_current_student(student_id)
);

create or replace function public.teacher_create_assessment_assignment(
  p_assessment_id uuid,
  p_target_type text,
  p_class_id uuid,
  p_student_id uuid default null,
  p_available_from timestamptz default now(),
  p_available_until timestamptz default null,
  p_time_limit_minutes integer default null,
  p_max_attempts integer default 1,
  p_status text default 'published'
)
returns public.assessment_assignments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_teacher_id uuid;
  v_school_id uuid;
  v_target_type text := nullif(btrim(coalesce(p_target_type, '')), '');
  v_status text := coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'published');
  v_assignment public.assessment_assignments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_target_type not in ('class', 'student') then
    raise exception 'target_type deve ser class ou student.' using errcode = '22023';
  end if;

  if v_status not in ('draft', 'published') then
    raise exception 'Criacao permite somente draft ou published.' using errcode = '22023';
  end if;

  if p_max_attempts is null or p_max_attempts <= 0 then
    raise exception 'max_attempts deve ser maior que zero.' using errcode = '22023';
  end if;

  if p_time_limit_minutes is not null and p_time_limit_minutes <= 0 then
    raise exception 'time_limit_minutes deve ser nulo ou maior que zero.' using errcode = '22023';
  end if;

  if p_available_until is not null and p_available_until <= coalesce(p_available_from, now()) then
    raise exception 'available_until deve ser posterior a available_from.' using errcode = '22023';
  end if;

  select c.school_id
    into v_school_id
  from public.classes c
  where c.id = p_class_id
    and coalesce(c.status, 'active') = 'active';

  if v_school_id is null then
    raise exception 'Turma ativa nao encontrada.' using errcode = '42501';
  end if;

  select public.avalia_current_teacher_id() into v_teacher_id;

  if v_teacher_id is null then
    raise exception 'Professor institucional ativo nao encontrado.' using errcode = '42501';
  end if;

  if not public.institutional_teacher_can_manage_class(v_teacher_id, p_class_id, v_school_id) then
    raise exception 'Professor nao gerencia esta turma/escola.' using errcode = '42501';
  end if;

  if not public.avalia_assessment_is_assignable(p_assessment_id) then
    raise exception 'Avaliacao nao esta disponivel para aplicacao.' using errcode = '42501';
  end if;

  if v_target_type = 'student' then
    if p_student_id is null then
      raise exception 'student_id e obrigatorio para alvo student.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      where e.student_id = p_student_id
        and e.class_id = p_class_id
        and e.school_id = v_school_id
        and e.status = 'active'
        and e.enrolled_at <= now()
        and (e.ended_at is null or e.ended_at > now())
        and coalesce(s.status, 'active') = 'active'
    ) then
      raise exception 'Aluno nao pertence a turma/escola alvo.' using errcode = '42501';
    end if;
  elsif p_student_id is not null then
    raise exception 'student_id deve ser nulo para alvo class.' using errcode = '22023';
  end if;

  if v_target_type = 'class' then
    select *
      into v_assignment
    from public.assessment_assignments aa
    where aa.school_id = v_school_id
      and aa.assessment_id = p_assessment_id
      and aa.class_id = p_class_id
      and aa.target_type = 'class'
      and aa.status in ('draft', 'published')
    limit 1;

    update public.assessment_assignments
       set assigned_by = auth.uid(),
           available_from = coalesce(p_available_from, now()),
           available_until = p_available_until,
           time_limit_minutes = p_time_limit_minutes,
           max_attempts = p_max_attempts,
           status = v_status,
           published_at = case
             when v_status = 'published' then coalesce(published_at, now())
             else null
           end
     where id = v_assignment.id
     returning * into v_assignment;
  elsif v_target_type = 'student' then
    select *
      into v_assignment
    from public.assessment_assignments aa
    where aa.school_id = v_school_id
      and aa.assessment_id = p_assessment_id
      and aa.class_id = p_class_id
      and aa.student_id = p_student_id
      and aa.target_type = 'student'
      and aa.status in ('draft', 'published')
    limit 1;

    update public.assessment_assignments
       set assigned_by = auth.uid(),
           available_from = coalesce(p_available_from, now()),
           available_until = p_available_until,
           time_limit_minutes = p_time_limit_minutes,
           max_attempts = p_max_attempts,
           status = v_status,
           published_at = case
             when v_status = 'published' then coalesce(published_at, now())
             else null
           end
     where id = v_assignment.id
     returning * into v_assignment;
  end if;

  if v_assignment.id is null then
    insert into public.assessment_assignments (
      school_id,
      assessment_id,
      assigned_by,
      target_type,
      class_id,
      student_id,
      available_from,
      available_until,
      time_limit_minutes,
      max_attempts,
      status,
      published_at
    )
    values (
      v_school_id,
      p_assessment_id,
      auth.uid(),
      v_target_type,
      p_class_id,
      p_student_id,
      coalesce(p_available_from, now()),
      p_available_until,
      p_time_limit_minutes,
      p_max_attempts,
      v_status,
      case when v_status = 'published' then now() else null end
    )
    returning * into v_assignment;
  end if;

  return v_assignment;
end;
$$;

create or replace function public.student_start_assessment_attempt(p_assignment_id uuid)
returns public.assessment_attempts
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_assignment public.assessment_assignments%rowtype;
  v_attempt public.assessment_attempts%rowtype;
  v_attempt_count integer;
  v_next_number integer;
  v_question_count integer;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select public.avalia_current_student_id() into v_student_id;

  if v_student_id is null then
    raise exception 'Aluno institucional ativo nao encontrado.' using errcode = '42501';
  end if;

  select *
    into v_assignment
  from public.assessment_assignments
  where id = p_assignment_id;

  if v_assignment.id is null then
    raise exception 'Atribuicao nao encontrada.' using errcode = '42501';
  end if;

  if not public.avalia_student_can_access_assignment(p_assignment_id, v_student_id) then
    raise exception 'Aluno nao pode acessar esta avaliacao.' using errcode = '42501';
  end if;

  select *
    into v_attempt
  from public.assessment_attempts
  where assignment_id = p_assignment_id
    and student_id = v_student_id
    and status = 'in_progress'
  order by started_at desc
  limit 1;

  if v_attempt.id is not null then
    return v_attempt;
  end if;

  select count(*)
    into v_attempt_count
  from public.assessment_attempts
  where assignment_id = p_assignment_id
    and student_id = v_student_id
    and status in ('in_progress', 'submitted', 'graded');

  if v_attempt_count >= v_assignment.max_attempts then
    raise exception 'Limite de tentativas atingido.' using errcode = '42501';
  end if;

  v_next_number := v_attempt_count + 1;

  select count(*)
    into v_question_count
  from public.assessment_questions
  where assessment_id = v_assignment.assessment_id;

  insert into public.assessment_attempts (
    assignment_id,
    assessment_id,
    school_id,
    student_id,
    attempt_number,
    status,
    question_count
  )
  values (
    v_assignment.id,
    v_assignment.assessment_id,
    v_assignment.school_id,
    v_student_id,
    v_next_number,
    'in_progress',
    v_question_count
  )
  returning * into v_attempt;

  return v_attempt;
end;
$$;

create or replace function public.student_save_assessment_response(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_alternative_id uuid default null,
  p_response_text text default null
)
returns public.assessment_responses
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_attempt public.assessment_attempts%rowtype;
  v_response public.assessment_responses%rowtype;
  v_response_text text := nullif(btrim(coalesce(p_response_text, '')), '');
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select public.avalia_current_student_id() into v_student_id;

  select *
    into v_attempt
  from public.assessment_attempts
  where id = p_attempt_id;

  if v_attempt.id is null or v_attempt.student_id <> v_student_id then
    raise exception 'Tentativa nao pertence ao aluno autenticado.' using errcode = '42501';
  end if;

  if v_attempt.status <> 'in_progress' then
    raise exception 'Tentativa ja encerrada.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.assessment_questions aq
    where aq.assessment_id = v_attempt.assessment_id
      and aq.question_id = p_question_id
  ) then
    raise exception 'Questao nao pertence a avaliacao.' using errcode = '42501';
  end if;

  if p_selected_alternative_id is not null and not exists (
    select 1
    from public.question_alternatives qa
    where qa.id = p_selected_alternative_id
      and qa.question_id = p_question_id
  ) then
    raise exception 'Alternativa nao pertence a questao.' using errcode = '42501';
  end if;

  if p_selected_alternative_id is null and v_response_text is null then
    raise exception 'Informe uma alternativa ou resposta.' using errcode = '22023';
  end if;

  insert into public.assessment_responses (
    attempt_id,
    question_id,
    selected_alternative_id,
    response_text,
    is_correct,
    score_awarded,
    answered_at
  )
  values (
    p_attempt_id,
    p_question_id,
    p_selected_alternative_id,
    v_response_text,
    null,
    null,
    now()
  )
  on conflict (attempt_id, question_id)
  do update
     set selected_alternative_id = excluded.selected_alternative_id,
         response_text = excluded.response_text,
         is_correct = null,
         score_awarded = null,
         answered_at = now()
  returning * into v_response;

  return v_response;
end;
$$;

create or replace function public.student_submit_assessment_attempt(p_attempt_id uuid)
returns public.assessment_results
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_attempt public.assessment_attempts%rowtype;
  v_result public.assessment_results%rowtype;
  v_total_points numeric(10,2);
  v_score_raw numeric(10,2);
  v_question_count integer;
  v_answered_count integer;
  v_correct_count integer;
  v_incorrect_count integer;
  v_unanswered_count integer;
  v_percentage numeric(6,2);
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select public.avalia_current_student_id() into v_student_id;

  select *
    into v_attempt
  from public.assessment_attempts
  where id = p_attempt_id;

  if v_attempt.id is null or v_attempt.student_id <> v_student_id then
    raise exception 'Tentativa nao pertence ao aluno autenticado.' using errcode = '42501';
  end if;

  if v_attempt.status in ('submitted', 'graded') then
    select *
      into v_result
    from public.assessment_results
    where attempt_id = p_attempt_id;

    if v_result.id is not null then
      return v_result;
    end if;
  elsif v_attempt.status <> 'in_progress' then
    raise exception 'Tentativa nao pode ser enviada neste estado.' using errcode = '42501';
  end if;

  update public.assessment_responses ar
     set is_correct = coalesce((
           select qa.is_correct
           from public.question_alternatives qa
           where qa.id = ar.selected_alternative_id
             and qa.question_id = ar.question_id
         ), false),
         score_awarded = case
           when coalesce((
             select qa.is_correct
             from public.question_alternatives qa
             where qa.id = ar.selected_alternative_id
               and qa.question_id = ar.question_id
           ), false) then (
             select aq.points
             from public.assessment_questions aq
             where aq.assessment_id = v_attempt.assessment_id
               and aq.question_id = ar.question_id
             limit 1
           )
           else 0
         end
  where ar.attempt_id = p_attempt_id
    and exists (
      select 1
      from public.assessment_questions aq
      where aq.assessment_id = v_attempt.assessment_id
        and aq.question_id = ar.question_id
    );

  select
    coalesce(sum(aq.points), 0),
    count(*)
    into v_total_points, v_question_count
  from public.assessment_questions aq
  where aq.assessment_id = v_attempt.assessment_id;

  select
    count(*) filter (where ar.id is not null),
    count(*) filter (where ar.is_correct is true),
    count(*) filter (where ar.id is not null and coalesce(ar.is_correct, false) is false),
    coalesce(sum(ar.score_awarded), 0)
    into v_answered_count, v_correct_count, v_incorrect_count, v_score_raw
  from public.assessment_questions aq
  left join public.assessment_responses ar
    on ar.question_id = aq.question_id
   and ar.attempt_id = p_attempt_id
  where aq.assessment_id = v_attempt.assessment_id;

  v_unanswered_count := greatest(v_question_count - v_answered_count, 0);
  v_percentage := case
    when v_total_points > 0 then round((v_score_raw / v_total_points) * 100, 2)
    else 0
  end;

  update public.assessment_attempts
     set status = 'graded',
         submitted_at = coalesce(submitted_at, now()),
         graded_at = now(),
         time_spent_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::integer),
         score_raw = v_score_raw,
         score_percentage = v_percentage,
         question_count = v_question_count,
         answered_count = v_answered_count,
         correct_count = v_correct_count,
         incorrect_count = v_incorrect_count,
         unanswered_count = v_unanswered_count
   where id = p_attempt_id
   returning * into v_attempt;

  insert into public.assessment_results (
    assessment_id,
    assignment_id,
    student_id,
    attempt_id,
    school_id,
    status,
    score_raw,
    score_percentage,
    question_count,
    answered_count,
    correct_count,
    incorrect_count,
    unanswered_count,
    finalized_at
  )
  values (
    v_attempt.assessment_id,
    v_attempt.assignment_id,
    v_attempt.student_id,
    v_attempt.id,
    v_attempt.school_id,
    'graded',
    v_score_raw,
    v_percentage,
    v_question_count,
    v_answered_count,
    v_correct_count,
    v_incorrect_count,
    v_unanswered_count,
    now()
  )
  on conflict (attempt_id)
  do update
     set score_raw = excluded.score_raw,
         score_percentage = excluded.score_percentage,
         question_count = excluded.question_count,
         answered_count = excluded.answered_count,
         correct_count = excluded.correct_count,
         incorrect_count = excluded.incorrect_count,
         unanswered_count = excluded.unanswered_count,
         finalized_at = excluded.finalized_at,
         status = excluded.status
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.avalia_current_student_id() from public, anon;
revoke all on function public.avalia_current_teacher_id() from public, anon;
revoke all on function public.avalia_assessment_is_assignable(uuid) from public, anon;
revoke all on function public.avalia_student_can_access_assignment(uuid, uuid) from public, anon;
revoke all on function public.avalia_teacher_can_manage_assignment(uuid) from public, anon;
revoke all on function public.avalia_can_read_assignment(uuid) from public, anon;
revoke all on function public.avalia_can_read_attempt(uuid) from public, anon;

grant execute on function public.avalia_current_student_id() to authenticated;
grant execute on function public.avalia_current_teacher_id() to authenticated;
grant execute on function public.avalia_assessment_is_assignable(uuid) to authenticated;
grant execute on function public.avalia_student_can_access_assignment(uuid, uuid) to authenticated;
grant execute on function public.avalia_teacher_can_manage_assignment(uuid) to authenticated;
grant execute on function public.avalia_can_read_assignment(uuid) to authenticated;
grant execute on function public.avalia_can_read_attempt(uuid) to authenticated;

revoke all on function public.teacher_create_assessment_assignment(uuid, text, uuid, uuid, timestamptz, timestamptz, integer, integer, text) from public, anon;
revoke all on function public.student_start_assessment_attempt(uuid) from public, anon;
revoke all on function public.student_save_assessment_response(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.student_submit_assessment_attempt(uuid) from public, anon;

grant execute on function public.teacher_create_assessment_assignment(uuid, text, uuid, uuid, timestamptz, timestamptz, integer, integer, text) to authenticated;
grant execute on function public.student_start_assessment_attempt(uuid) to authenticated;
grant execute on function public.student_save_assessment_response(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.student_submit_assessment_attempt(uuid) to authenticated;
