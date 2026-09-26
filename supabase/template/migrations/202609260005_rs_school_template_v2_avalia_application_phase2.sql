-- Avalia+ 2.0 Fase 2 - ciclos, programacao, execucao online,
-- token, autosave, retomada, randomizacao, entrega segura e monitoramento.
-- Evolui o motor existente de assessments/assignments/attempts sem duplicar Avalia+.

create extension if not exists pgcrypto;

create table if not exists public.assessment_cycles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  school_year text not null,
  name text not null,
  component text,
  grade_year text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'AGENDADA',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint assessment_cycles_status_check check (status in ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'INCOMPLETA', 'CANCELADA')),
  constraint assessment_cycles_window_check check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.assessment_cycle_participants (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.assessment_cycles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  status text not null default 'eligible',
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint assessment_cycle_participants_shape_check check (class_id is not null or student_id is not null),
  constraint assessment_cycle_participants_status_check check (status in ('eligible', 'excluded', 'completed')),
  unique (cycle_id, class_id, student_id)
);

create table if not exists public.assessment_application_tokens (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  token_hash text not null,
  token_hint text,
  student_id uuid references public.students(id) on delete cascade,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  max_uses integer,
  use_count integer not null default 0,
  revoked_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint assessment_application_tokens_window_check check (valid_until is null or valid_until > valid_from),
  constraint assessment_application_tokens_max_uses_check check (max_uses is null or max_uses > 0)
);

create table if not exists public.assessment_attempt_events (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.assessment_attempts(id) on delete cascade,
  assignment_id uuid references public.assessment_assignments(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  actor_user_id uuid,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_reapplication_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  previous_max_attempts integer not null,
  new_max_attempts integer not null,
  authorized_by uuid,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.assessment_assignments
  add column if not exists cycle_id uuid references public.assessment_cycles(id) on delete set null,
  add column if not exists booklet_id uuid references public.assessment_booklets(id) on delete set null,
  add column if not exists application_status text not null default 'AGENDADA',
  add column if not exists token_required boolean not null default false,
  add column if not exists shuffle_questions boolean not null default false,
  add column if not exists shuffle_alternatives boolean not null default false,
  add column if not exists application_settings jsonb not null default '{}'::jsonb,
  add column if not exists closed_at timestamptz;

alter table public.assessment_attempts
  add column if not exists booklet_id uuid references public.assessment_booklets(id) on delete set null,
  add column if not exists access_token_id uuid references public.assessment_application_tokens(id) on delete set null,
  add column if not exists application_status text not null default 'EM_ANDAMENTO',
  add column if not exists question_order uuid[] not null default '{}'::uuid[],
  add column if not exists alternative_order jsonb not null default '{}'::jsonb,
  add column if not exists deadline_at timestamptz,
  add column if not exists last_autosaved_at timestamptz,
  add column if not exists remaining_seconds integer,
  add column if not exists progress jsonb not null default '{}'::jsonb,
  add column if not exists submitted_reason text,
  add column if not exists client_state jsonb not null default '{}'::jsonb;

alter table public.assessment_responses
  add column if not exists answer_payload jsonb not null default '{}'::jsonb,
  add column if not exists autosave_sequence integer not null default 1,
  add column if not exists client_saved_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assessment_assignments_application_status_check' and conrelid = 'public.assessment_assignments'::regclass) then
    alter table public.assessment_assignments add constraint assessment_assignments_application_status_check
      check (application_status in ('AGENDADA', 'EM_ANDAMENTO', 'CONCLUIDA', 'INCOMPLETA', 'CANCELADA'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assessment_attempts_application_status_check' and conrelid = 'public.assessment_attempts'::regclass) then
    alter table public.assessment_attempts add constraint assessment_attempts_application_status_check
      check (application_status in ('EM_ANDAMENTO', 'CONCLUIDA', 'INCOMPLETA', 'CANCELADA'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assessment_attempts_remaining_seconds_check' and conrelid = 'public.assessment_attempts'::regclass) then
    alter table public.assessment_attempts add constraint assessment_attempts_remaining_seconds_check
      check (remaining_seconds is null or remaining_seconds >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assessment_responses_autosave_sequence_check' and conrelid = 'public.assessment_responses'::regclass) then
    alter table public.assessment_responses add constraint assessment_responses_autosave_sequence_check
      check (autosave_sequence > 0);
  end if;
end $$;

create index if not exists idx_assessment_cycles_school_year_status on public.assessment_cycles (school_id, school_year, status, starts_at desc);
create index if not exists idx_assessment_cycle_participants_cycle on public.assessment_cycle_participants (cycle_id, school_id, class_id, student_id);
create index if not exists idx_assessment_assignments_cycle on public.assessment_assignments (cycle_id, application_status, available_from);
create index if not exists idx_assessment_tokens_assignment on public.assessment_application_tokens (assignment_id, revoked_at, valid_from, valid_until);
create unique index if not exists assessment_tokens_assignment_hash_unique on public.assessment_application_tokens (assignment_id, token_hash) where revoked_at is null;
create index if not exists idx_assessment_attempts_v2_status on public.assessment_attempts (assignment_id, student_id, application_status, last_autosaved_at desc);
create index if not exists idx_assessment_attempt_events_attempt on public.assessment_attempt_events (attempt_id, created_at desc);
create index if not exists idx_assessment_reapplication_assignment on public.assessment_reapplication_logs (assignment_id, student_id, created_at desc);

alter table public.assessment_cycles enable row level security;
alter table public.assessment_cycle_participants enable row level security;
alter table public.assessment_application_tokens enable row level security;
alter table public.assessment_attempt_events enable row level security;
alter table public.assessment_reapplication_logs enable row level security;

create or replace function public.avalia_plus_token_hash(p_token text)
returns text language sql immutable as $$
  select encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

create or replace function public.avalia_plus_generate_token()
returns text language sql volatile as $$
  select upper(substr(encode(gen_random_bytes(9), 'hex'), 1, 6) || '-' || substr(encode(gen_random_bytes(9), 'hex'), 1, 6));
$$;

create or replace function public.avalia_plus_teacher_can_manage_class(p_class_id uuid, p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_platform_admin()
    or public.secretaria_can_manage_school(p_school_id)
    or exists (
      select 1
      from public.teachers t
      where t.id = public.avalia_current_teacher_id()
        and public.institutional_teacher_can_manage_class(t.id, p_class_id, p_school_id)
    );
$$;

create or replace function public.avalia_plus_assignment_is_open(p_assignment public.assessment_assignments)
returns boolean language sql stable as $$
  select p_assignment.status = 'published'
    and p_assignment.available_from <= now()
    and (p_assignment.available_until is null or p_assignment.available_until > now())
    and p_assignment.application_status in ('AGENDADA', 'EM_ANDAMENTO');
$$;

create or replace function public.avalia_plus_validate_token(p_assignment_id uuid, p_student_id uuid, p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
  v_token public.assessment_application_tokens%rowtype;
begin
  select * into v_assignment from public.assessment_assignments where id = p_assignment_id;
  if v_assignment.id is null then
    raise exception 'Atribuicao nao encontrada.' using errcode = '42501';
  end if;

  if coalesce(v_assignment.token_required, false) is false then
    return null;
  end if;
  if nullif(btrim(coalesce(p_token, '')), '') is null then
    raise exception 'Token de aplicacao obrigatorio.' using errcode = '42501';
  end if;

  select * into v_token
  from public.assessment_application_tokens t
  where t.assignment_id = p_assignment_id
    and t.token_hash = public.avalia_plus_token_hash(p_token)
    and t.revoked_at is null
    and t.valid_from <= now()
    and (t.valid_until is null or t.valid_until > now())
    and (t.student_id is null or t.student_id = p_student_id)
    and (t.max_uses is null or t.use_count < t.max_uses)
  order by t.student_id nulls last, t.created_at desc
  limit 1
  for update;

  if v_token.id is null then
    raise exception 'Token de aplicacao invalido ou expirado.' using errcode = '42501';
  end if;

  update public.assessment_application_tokens
     set use_count = use_count + 1, last_used_at = now()
   where id = v_token.id;

  return v_token.id;
end;
$$;

create or replace function public.avalia_plus_question_order(p_assessment_id uuid, p_booklet_id uuid, p_attempt_id uuid, p_shuffle boolean default false)
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(question_id order by sort_key), '{}'::uuid[])
  from (
    select aq.question_id,
           case when p_shuffle then md5(p_attempt_id::text || ':' || aq.question_id::text) else lpad(aq.position::text, 8, '0') end as sort_key
    from public.assessment_questions aq
    where aq.assessment_id = p_assessment_id
      and (
        p_booklet_id is null
        or exists (
          select 1
          from public.assessment_booklet_questions abq
          where abq.booklet_id = p_booklet_id
            and abq.assessment_question_id = aq.id
        )
      )
  ) ordered;
$$;

create or replace function public.avalia_plus_alternative_order(p_question_ids uuid[], p_attempt_id uuid, p_shuffle boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_object_agg(question_id::text, alternatives), '{}'::jsonb)
  from (
    select qid as question_id,
      (
        select coalesce(jsonb_agg(id order by sort_key), '[]'::jsonb)
        from (
          select qa.id,
                 case when p_shuffle then md5(p_attempt_id::text || ':' || qid::text || ':' || qa.id::text) else lpad(qa.position::text, 8, '0') end as sort_key
          from public.question_alternatives qa
          where qa.question_id = qid
        ) alt
      ) as alternatives
    from unnest(coalesce(p_question_ids, '{}'::uuid[])) qid
  ) mapped;
$$;

create or replace function public.avalia_plus_build_progress(p_attempt_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'question_count', at.question_count,
    'answered_count', coalesce(count(ar.id), 0),
    'remaining_seconds', case when at.deadline_at is null then null else greatest(0, floor(extract(epoch from (at.deadline_at - now())))::integer) end,
    'last_autosaved_at', at.last_autosaved_at
  )
  from public.assessment_attempts at
  left join public.assessment_responses ar on ar.attempt_id = at.id
  where at.id = p_attempt_id
  group by at.id;
$$;

create or replace function public.teacher_schedule_assessment_application_v2(
  p_assessment_id uuid,
  p_target_type text,
  p_class_id uuid,
  p_student_id uuid default null,
  p_available_from timestamptz default now(),
  p_available_until timestamptz default null,
  p_time_limit_minutes integer default null,
  p_max_attempts integer default 1,
  p_cycle_name text default null,
  p_school_year text default null,
  p_booklet_id uuid default null,
  p_token_required boolean default false,
  p_shuffle_questions boolean default false,
  p_shuffle_alternatives boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
  v_cycle public.assessment_cycles%rowtype;
  v_school_id uuid;
  v_assessment public.assessments%rowtype;
  v_token text;
  v_token_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_assessment from public.assessments where id = p_assessment_id;
  select c.school_id into v_school_id from public.classes c where c.id = p_class_id and coalesce(c.status, 'active') in ('active', 'ativo');
  if v_assessment.id is null or v_school_id is null or not public.avalia_plus_teacher_can_manage_class(p_class_id, v_school_id) then
    raise exception 'Professor/Gestao nao autorizados para esta aplicacao.' using errcode = '42501';
  end if;

  if p_booklet_id is not null and not exists (
    select 1 from public.assessment_booklets ab
    where ab.id = p_booklet_id and ab.assessment_id = p_assessment_id and ab.position between 1 and 5
  ) then
    raise exception 'Caderno invalido para esta avaliacao.' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_cycle_name, '')), '') is not null then
    insert into public.assessment_cycles (school_id, school_year, name, component, grade_year, starts_at, ends_at, status, created_by)
    values (
      v_school_id,
      coalesce(nullif(p_school_year, ''), v_assessment.school_year, v_assessment.assessment_year, extract(year from now())::text),
      p_cycle_name,
      v_assessment.component,
      v_assessment.school_year,
      p_available_from,
      p_available_until,
      case when coalesce(p_available_from, now()) <= now() then 'EM_ANDAMENTO' else 'AGENDADA' end,
      auth.uid()
    )
    returning * into v_cycle;
  end if;

  v_assignment := public.teacher_create_assessment_assignment(
    p_assessment_id, p_target_type, p_class_id, p_student_id,
    p_available_from, p_available_until, p_time_limit_minutes, p_max_attempts, 'published'
  );

  update public.assessment_assignments
     set cycle_id = v_cycle.id,
         booklet_id = p_booklet_id,
         application_status = case when coalesce(p_available_from, now()) <= now() then 'EM_ANDAMENTO' else 'AGENDADA' end,
         token_required = coalesce(p_token_required, false),
         shuffle_questions = coalesce(p_shuffle_questions, false),
         shuffle_alternatives = coalesce(p_shuffle_alternatives, false),
         application_settings = jsonb_build_object('phase', 'AVALIA_PLUS_2_FASE_2'),
         updated_at = now()
   where id = v_assignment.id
   returning * into v_assignment;

  insert into public.assessment_cycle_participants (cycle_id, school_id, class_id, student_id, status)
  select v_cycle.id, v_school_id, p_class_id, p_student_id, 'eligible'
  where v_cycle.id is not null
  on conflict do nothing;

  if coalesce(p_token_required, false) then
    v_token := public.avalia_plus_generate_token();
    insert into public.assessment_application_tokens (assignment_id, token_hash, token_hint, student_id, valid_from, valid_until, created_by)
    values (v_assignment.id, public.avalia_plus_token_hash(v_token), right(v_token, 4), p_student_id, coalesce(p_available_from, now()), p_available_until, auth.uid())
    returning id into v_token_id;
  end if;

  return jsonb_build_object(
    'assignment', to_jsonb(v_assignment),
    'cycle', case when v_cycle.id is null then null else to_jsonb(v_cycle) end,
    'token', case when v_token is null then null else jsonb_build_object('id', v_token_id, 'value', v_token, 'hint', right(v_token, 4)) end
  );
end;
$$;

create or replace function public.student_start_assessment_attempt_v2(p_assignment_id uuid, p_application_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_assignment public.assessment_assignments%rowtype;
  v_attempt public.assessment_attempts%rowtype;
  v_attempt_count integer;
  v_question_count integer;
  v_token_id uuid;
  v_order uuid[];
  v_deadline timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;
  select public.avalia_current_student_id() into v_student_id;
  select * into v_assignment from public.assessment_assignments where id = p_assignment_id for update;
  if v_student_id is null or v_assignment.id is null or not public.avalia_student_can_access_assignment(p_assignment_id, v_student_id) then
    raise exception 'Aluno nao autorizado para esta avaliacao.' using errcode = '42501';
  end if;
  if not public.avalia_plus_assignment_is_open(v_assignment) then
    raise exception 'Aplicacao fora do periodo autorizado.' using errcode = '42501';
  end if;

  v_token_id := public.avalia_plus_validate_token(p_assignment_id, v_student_id, p_application_token);

  select count(*) into v_attempt_count
  from public.assessment_attempts
  where assignment_id = p_assignment_id and student_id = v_student_id and status <> 'cancelled';
  if v_attempt_count >= v_assignment.max_attempts then
    raise exception 'Limite de tentativas atingido.' using errcode = '42501';
  end if;

  select count(*) into v_question_count from public.assessment_questions aq where aq.assessment_id = v_assignment.assessment_id;
  v_deadline := case when v_assignment.time_limit_minutes is null then null else now() + make_interval(mins => v_assignment.time_limit_minutes) end;

  insert into public.assessment_attempts (
    assignment_id, assessment_id, school_id, student_id, attempt_number, status,
    booklet_id, access_token_id, application_status, deadline_at, started_at,
    time_limit_minutes, remaining_seconds, question_count
  )
  values (
    p_assignment_id, v_assignment.assessment_id, v_assignment.school_id, v_student_id, v_attempt_count + 1, 'in_progress',
    v_assignment.booklet_id, v_token_id, 'EM_ANDAMENTO', v_deadline, now(),
    v_assignment.time_limit_minutes, case when v_assignment.time_limit_minutes is null then null else v_assignment.time_limit_minutes * 60 end, v_question_count
  )
  returning * into v_attempt;

  v_order := public.avalia_plus_question_order(v_assignment.assessment_id, v_assignment.booklet_id, v_attempt.id, v_assignment.shuffle_questions);

  update public.assessment_attempts
     set question_order = v_order,
         alternative_order = public.avalia_plus_alternative_order(v_order, v_attempt.id, v_assignment.shuffle_alternatives),
         progress = public.avalia_plus_build_progress(v_attempt.id)
   where id = v_attempt.id
   returning * into v_attempt;

  update public.assessment_assignments set application_status = 'EM_ANDAMENTO', updated_at = now() where id = p_assignment_id;
  insert into public.assessment_attempt_events (attempt_id, assignment_id, student_id, actor_user_id, event_type)
  values (v_attempt.id, p_assignment_id, v_student_id, auth.uid(), 'STARTED');

  return jsonb_build_object('attempt', to_jsonb(v_attempt));
end;
$$;

create or replace function public.student_save_assessment_response_v2(
  p_attempt_id uuid,
  p_question_id uuid,
  p_selected_alternative_id uuid default null,
  p_response_text text default null,
  p_autosave_sequence integer default 1,
  p_client_state jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_attempt public.assessment_attempts%rowtype;
  v_response public.assessment_responses%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;
  select public.avalia_current_student_id() into v_student_id;
  select * into v_attempt from public.assessment_attempts where id = p_attempt_id for update;
  if v_student_id is null or v_attempt.id is null or v_attempt.student_id <> v_student_id or v_attempt.status <> 'in_progress' then
    raise exception 'Tentativa nao autorizada para autosave.' using errcode = '42501';
  end if;
  if v_attempt.deadline_at is not null and v_attempt.deadline_at <= now() then
    update public.assessment_attempts
       set status = 'expired', application_status = 'INCOMPLETA', remaining_seconds = 0, submitted_reason = 'time_expired', last_autosaved_at = now()
     where id = p_attempt_id;
    raise exception 'Tempo de aplicacao encerrado.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.assessment_questions aq where aq.assessment_id = v_attempt.assessment_id and aq.question_id = p_question_id) then
    raise exception 'Questao nao pertence a avaliacao.' using errcode = '42501';
  end if;
  if p_selected_alternative_id is not null and not exists (select 1 from public.question_alternatives qa where qa.id = p_selected_alternative_id and qa.question_id = p_question_id) then
    raise exception 'Alternativa invalida para a questao.' using errcode = '42501';
  end if;

  insert into public.assessment_responses (
    attempt_id, question_id, selected_alternative_id, response_text, answered_at,
    answer_payload, autosave_sequence, client_saved_at
  )
  values (
    p_attempt_id, p_question_id, p_selected_alternative_id, nullif(p_response_text, ''), now(),
    jsonb_build_object('source', 'autosave_v2', 'has_text', nullif(p_response_text, '') is not null, 'has_objective', p_selected_alternative_id is not null),
    greatest(coalesce(p_autosave_sequence, 1), 1), now()
  )
  on conflict (attempt_id, question_id)
  do update set
    selected_alternative_id = excluded.selected_alternative_id,
    response_text = excluded.response_text,
    answered_at = now(),
    answer_payload = excluded.answer_payload,
    autosave_sequence = greatest(public.assessment_responses.autosave_sequence, excluded.autosave_sequence),
    client_saved_at = now()
  returning * into v_response;

  update public.assessment_attempts
     set last_autosaved_at = now(),
         remaining_seconds = case when deadline_at is null then remaining_seconds else greatest(0, floor(extract(epoch from (deadline_at - now())))::integer) end,
         progress = public.avalia_plus_build_progress(id),
         client_state = coalesce(p_client_state, '{}'::jsonb)
   where id = p_attempt_id
   returning * into v_attempt;

  insert into public.assessment_attempt_events (attempt_id, assignment_id, student_id, actor_user_id, event_type, metadata)
  values (p_attempt_id, v_attempt.assignment_id, v_student_id, auth.uid(), 'AUTOSAVED', jsonb_build_object('question_id', p_question_id));

  return jsonb_build_object('response', to_jsonb(v_response), 'attempt', to_jsonb(v_attempt));
end;
$$;

create or replace function public.student_submit_assessment_attempt_v2(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid;
  v_attempt public.assessment_attempts%rowtype;
  v_result public.assessment_results%rowtype;
  v_total_points numeric := 0;
  v_score_raw numeric := 0;
  v_question_count integer := 0;
  v_answered_count integer := 0;
  v_correct_count integer := 0;
  v_incorrect_count integer := 0;
  v_unanswered_count integer := 0;
  v_percentage numeric := 0;
  v_reason text := 'submitted';
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;
  select public.avalia_current_student_id() into v_student_id;
  select * into v_attempt from public.assessment_attempts where id = p_attempt_id for update;
  if v_student_id is null or v_attempt.id is null or v_attempt.student_id <> v_student_id or v_attempt.status <> 'in_progress' then
    raise exception 'Tentativa nao autorizada para entrega.' using errcode = '42501';
  end if;
  if v_attempt.deadline_at is not null and v_attempt.deadline_at <= now() then
    v_reason := 'time_expired';
  end if;

  update public.assessment_responses ar
     set is_correct = case
           when ar.selected_alternative_id is null then null
           else coalesce((select qa.is_correct from public.question_alternatives qa where qa.id = ar.selected_alternative_id and qa.question_id = ar.question_id), false)
         end,
         score_awarded = case
           when ar.selected_alternative_id is null then null
           when coalesce((select qa.is_correct from public.question_alternatives qa where qa.id = ar.selected_alternative_id and qa.question_id = ar.question_id), false)
             then coalesce((select aq.points from public.assessment_questions aq where aq.assessment_id = v_attempt.assessment_id and aq.question_id = ar.question_id limit 1), 0)
           else 0
         end
  where ar.attempt_id = p_attempt_id
    and exists (select 1 from public.assessment_questions aq where aq.assessment_id = v_attempt.assessment_id and aq.question_id = ar.question_id);

  select coalesce(sum(aq.points), 0), count(*) into v_total_points, v_question_count
  from public.assessment_questions aq
  where aq.assessment_id = v_attempt.assessment_id;

  select
    count(*) filter (where ar.id is not null),
    count(*) filter (where ar.is_correct is true),
    count(*) filter (where ar.id is not null and ar.selected_alternative_id is not null and coalesce(ar.is_correct, false) is false),
    coalesce(sum(coalesce(ar.score_awarded, 0)), 0)
    into v_answered_count, v_correct_count, v_incorrect_count, v_score_raw
  from public.assessment_questions aq
  left join public.assessment_responses ar on ar.question_id = aq.question_id and ar.attempt_id = p_attempt_id
  where aq.assessment_id = v_attempt.assessment_id;

  v_unanswered_count := greatest(v_question_count - v_answered_count, 0);
  v_percentage := case when v_total_points > 0 then round((v_score_raw / v_total_points) * 100, 2) else 0 end;

  update public.assessment_attempts
     set status = case when v_reason = 'time_expired' then 'expired' else 'graded' end,
         application_status = case when v_reason = 'time_expired' and v_unanswered_count > 0 then 'INCOMPLETA' else 'CONCLUIDA' end,
         submitted_at = coalesce(submitted_at, now()),
         graded_at = now(),
         submitted_reason = v_reason,
         time_spent_seconds = greatest(0, floor(extract(epoch from (now() - started_at)))::integer),
         remaining_seconds = case when deadline_at is null then remaining_seconds else greatest(0, floor(extract(epoch from (deadline_at - now())))::integer) end,
         score_raw = v_score_raw,
         score_percentage = v_percentage,
         question_count = v_question_count,
         answered_count = v_answered_count,
         correct_count = v_correct_count,
         incorrect_count = v_incorrect_count,
         unanswered_count = v_unanswered_count,
         progress = public.avalia_plus_build_progress(id),
         last_autosaved_at = coalesce(last_autosaved_at, now())
   where id = p_attempt_id
   returning * into v_attempt;

  insert into public.assessment_results (
    assessment_id, assignment_id, student_id, attempt_id, school_id, status,
    score_raw, score_percentage, question_count, answered_count, correct_count,
    incorrect_count, unanswered_count, finalized_at
  )
  values (
    v_attempt.assessment_id, v_attempt.assignment_id, v_attempt.student_id, v_attempt.id, v_attempt.school_id,
    case when v_reason = 'time_expired' and v_unanswered_count > 0 then 'submitted' else 'graded' end,
    v_score_raw, v_percentage, v_question_count, v_answered_count, v_correct_count,
    v_incorrect_count, v_unanswered_count, now()
  )
  on conflict (attempt_id)
  do update set
    score_raw = excluded.score_raw,
    score_percentage = excluded.score_percentage,
    question_count = excluded.question_count,
    answered_count = excluded.answered_count,
    correct_count = excluded.correct_count,
    incorrect_count = excluded.incorrect_count,
    unanswered_count = excluded.unanswered_count,
    finalized_at = excluded.finalized_at,
    status = excluded.status
  returning * into v_result;

  insert into public.assessment_attempt_events (attempt_id, assignment_id, student_id, actor_user_id, event_type, metadata)
  values (p_attempt_id, v_attempt.assignment_id, v_student_id, auth.uid(), 'SUBMITTED', jsonb_build_object('reason', v_reason));

  return jsonb_build_object('attempt', to_jsonb(v_attempt), 'result', to_jsonb(v_result));
end;
$$;

create or replace function public.teacher_authorize_assessment_reapplication(
  p_assignment_id uuid,
  p_student_id uuid default null,
  p_extra_attempts integer default 1,
  p_reason text default null
)
returns public.assessment_assignments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
  v_previous integer;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;
  select * into v_assignment from public.assessment_assignments where id = p_assignment_id for update;
  if v_assignment.id is null or not public.avalia_plus_teacher_can_manage_class(v_assignment.class_id, v_assignment.school_id) then
    raise exception 'Usuario nao autorizado para reaplicacao.' using errcode = '42501';
  end if;
  if coalesce(p_extra_attempts, 0) <= 0 then
    raise exception 'extra_attempts deve ser maior que zero.' using errcode = '22023';
  end if;

  v_previous := v_assignment.max_attempts;
  update public.assessment_assignments
     set max_attempts = max_attempts + p_extra_attempts,
         application_status = 'EM_ANDAMENTO',
         updated_at = now()
   where id = p_assignment_id
   returning * into v_assignment;

  insert into public.assessment_reapplication_logs (assignment_id, student_id, previous_max_attempts, new_max_attempts, authorized_by, reason)
  values (p_assignment_id, p_student_id, v_previous, v_assignment.max_attempts, auth.uid(), p_reason);

  return v_assignment;
end;
$$;

create or replace function public.teacher_get_assessment_application_monitor(p_assignment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
  v_payload jsonb;
begin
  select * into v_assignment from public.assessment_assignments where id = p_assignment_id;
  if v_assignment.id is null or not public.avalia_plus_teacher_can_manage_class(v_assignment.class_id, v_assignment.school_id) then
    raise exception 'Acesso negado ao monitoramento desta aplicacao.' using errcode = '42501';
  end if;

  with eligible as (
    select e.student_id, s.nome as student_name
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.class_id = v_assignment.class_id
      and e.school_id = v_assignment.school_id
      and e.status = 'active'
      and coalesce(s.status, 'active') in ('active', 'ativo')
      and (v_assignment.target_type = 'class' or e.student_id = v_assignment.student_id)
  ), latest_attempt as (
    select distinct on (at.student_id) at.*
    from public.assessment_attempts at
    where at.assignment_id = p_assignment_id
    order by at.student_id, at.started_at desc
  ), rows as (
    select
      e.student_id,
      e.student_name,
      at.id as attempt_id,
      coalesce(at.application_status, 'AGENDADA') as application_status,
      at.status,
      at.started_at,
      at.submitted_at,
      at.last_autosaved_at,
      at.answered_count,
      at.question_count,
      at.score_percentage
    from eligible e
    left join latest_attempt at on at.student_id = e.student_id
  )
  select jsonb_build_object(
    'assignment', to_jsonb(v_assignment),
    'eligible', (select count(*) from rows),
    'started', (select count(*) from rows where attempt_id is not null),
    'in_progress', (select count(*) from rows where application_status = 'EM_ANDAMENTO'),
    'completed', (select count(*) from rows where application_status = 'CONCLUIDA'),
    'incomplete', (select count(*) from rows where application_status = 'INCOMPLETA'),
    'students', coalesce((select jsonb_agg(to_jsonb(rows) order by student_name) from rows), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

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
            'target_type', aa.target_type,
            'class_id', aa.class_id,
            'student_id', aa.student_id,
            'available_from', aa.available_from,
            'available_until', aa.available_until,
            'time_limit_minutes', aa.time_limit_minutes,
            'max_attempts', aa.max_attempts,
            'status', aa.status,
            'application_status', aa.application_status,
            'token_required', aa.token_required,
            'shuffle_questions', aa.shuffle_questions,
            'shuffle_alternatives', aa.shuffle_alternatives,
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
          select at.*
          from public.assessment_attempts at
          where at.assignment_id = aa.id and at.student_id = v_student_id
          order by at.started_at desc
          limit 1
        ) at on true
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
            order by case when at.question_order is not null and aq.question_id = any(at.question_order) then array_position(at.question_order, aq.question_id) else aq.position end
          ) as questions
          from public.assessment_questions aq
          join public.question_items qi on qi.id = aq.question_id
          left join lateral (
            select jsonb_agg(
              jsonb_build_object('id', qa.id, 'label', qa.label, 'body', qa.body, 'position', qa.position)
              order by case
                when at.alternative_order ? qi.id::text then (
                  select ordinality
                  from jsonb_array_elements_text(at.alternative_order -> qi.id::text) with ordinality alt_order(id, ordinality)
                  where alt_order.id::uuid = qa.id
                  limit 1
                )
                else qa.position
              end
            ) as alternatives
            from public.question_alternatives qa
            where qa.question_id = qi.id
          ) alt on true
          where aq.assessment_id = a.id
            and (
              aa.booklet_id is null
              or exists (
                select 1 from public.assessment_booklet_questions abq
                where abq.booklet_id = aa.booklet_id and abq.assessment_question_id = aq.id
              )
            )
        ) q on true
        where public.avalia_student_can_access_assignment(aa.id, v_student_id)
      ) assignments_scope
    ), '[]'::jsonb),
    'attempts',
    coalesce((
      select jsonb_agg(
        to_jsonb(at) || jsonb_build_object(
          'progress', public.avalia_plus_build_progress(at.id),
          'responses', coalesce((select jsonb_agg(to_jsonb(ar) order by ar.answered_at asc) from public.assessment_responses ar where ar.attempt_id = at.id), '[]'::jsonb)
        )
        order by at.started_at desc
      )
      from public.assessment_attempts at
      where at.student_id = v_student_id
    ), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

drop policy if exists assessment_cycles_select_institutional on public.assessment_cycles;
create policy assessment_cycles_select_institutional on public.assessment_cycles for select to authenticated using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or exists (
    select 1 from public.assessment_cycle_participants acp
    where acp.cycle_id = assessment_cycles.id
      and (public.institutional_is_current_student(acp.student_id) or public.avalia_plus_teacher_can_manage_class(acp.class_id, acp.school_id))
  )
);

drop policy if exists assessment_cycle_participants_select_institutional on public.assessment_cycle_participants;
create policy assessment_cycle_participants_select_institutional on public.assessment_cycle_participants for select to authenticated using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.institutional_is_current_student(student_id)
  or public.avalia_plus_teacher_can_manage_class(class_id, school_id)
);

drop policy if exists assessment_tokens_no_direct_read on public.assessment_application_tokens;
create policy assessment_tokens_no_direct_read on public.assessment_application_tokens for select to authenticated using (
  public.is_platform_admin()
  or exists (select 1 from public.assessment_assignments aa where aa.id = assignment_id and public.avalia_plus_teacher_can_manage_class(aa.class_id, aa.school_id))
);

drop policy if exists assessment_attempt_events_read_institutional on public.assessment_attempt_events;
create policy assessment_attempt_events_read_institutional on public.assessment_attempt_events for select to authenticated using (
  public.is_platform_admin()
  or public.institutional_is_current_student(student_id)
  or exists (
    select 1 from public.assessment_assignments aa
    where aa.id = assignment_id
      and (public.secretaria_can_manage_school(aa.school_id) or public.avalia_plus_teacher_can_manage_class(aa.class_id, aa.school_id))
  )
);

drop policy if exists assessment_reapplication_logs_read_institutional on public.assessment_reapplication_logs;
create policy assessment_reapplication_logs_read_institutional on public.assessment_reapplication_logs for select to authenticated using (
  public.is_platform_admin()
  or exists (
    select 1 from public.assessment_assignments aa
    where aa.id = assignment_id
      and (public.secretaria_can_manage_school(aa.school_id) or public.avalia_plus_teacher_can_manage_class(aa.class_id, aa.school_id))
  )
);

revoke all on public.assessment_cycles from public, anon;
revoke all on public.assessment_cycle_participants from public, anon;
revoke all on public.assessment_application_tokens from public, anon;
revoke all on public.assessment_attempt_events from public, anon;
revoke all on public.assessment_reapplication_logs from public, anon;
revoke insert, update, delete, truncate on public.assessment_cycles from authenticated;
revoke insert, update, delete, truncate on public.assessment_cycle_participants from authenticated;
revoke insert, update, delete, truncate on public.assessment_application_tokens from authenticated;
revoke insert, update, delete, truncate on public.assessment_attempt_events from authenticated;
revoke insert, update, delete, truncate on public.assessment_reapplication_logs from authenticated;
grant select on public.assessment_cycles to authenticated;
grant select on public.assessment_cycle_participants to authenticated;
grant select on public.assessment_application_tokens to authenticated;
grant select on public.assessment_attempt_events to authenticated;
grant select on public.assessment_reapplication_logs to authenticated;

revoke all on function public.teacher_schedule_assessment_application_v2(uuid, text, uuid, uuid, timestamptz, timestamptz, integer, integer, text, text, uuid, boolean, boolean, boolean) from public, anon;
revoke all on function public.student_start_assessment_attempt_v2(uuid, text) from public, anon;
revoke all on function public.student_save_assessment_response_v2(uuid, uuid, uuid, text, integer, jsonb) from public, anon;
revoke all on function public.student_submit_assessment_attempt_v2(uuid) from public, anon;
revoke all on function public.teacher_authorize_assessment_reapplication(uuid, uuid, integer, text) from public, anon;
revoke all on function public.teacher_get_assessment_application_monitor(uuid) from public, anon;
grant execute on function public.teacher_schedule_assessment_application_v2(uuid, text, uuid, uuid, timestamptz, timestamptz, integer, integer, text, text, uuid, boolean, boolean, boolean) to authenticated;
grant execute on function public.student_start_assessment_attempt_v2(uuid, text) to authenticated;
grant execute on function public.student_save_assessment_response_v2(uuid, uuid, uuid, text, integer, jsonb) to authenticated;
grant execute on function public.student_submit_assessment_attempt_v2(uuid) to authenticated;
grant execute on function public.teacher_authorize_assessment_reapplication(uuid, uuid, integer, text) to authenticated;
grant execute on function public.teacher_get_assessment_application_monitor(uuid) to authenticated;
