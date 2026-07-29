-- Avalia+ - Aplicacao digital e resultados das avaliacoes.
-- Complementa o Banco de Questoes sem recriar tabelas existentes.

create extension if not exists pgcrypto;

alter table public.assessments
  add column if not exists approved_at timestamptz,
  add column if not exists published_at timestamptz,
  add column if not exists result_release_mode text not null default 'manual',
  add column if not exists shuffle_questions boolean not null default false,
  add column if not exists shuffle_alternatives boolean not null default false;

alter type public.assessment_status add value if not exists 'EM_REVISAO';
alter type public.assessment_status add value if not exists 'APROVADA';
alter type public.assessment_status add value if not exists 'AGENDADA';
alter type public.assessment_status add value if not exists 'DISPONIVEL';
alter type public.assessment_status add value if not exists 'ENCERRADA';

create table if not exists public.assessment_assignments (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  class_id text not null,
  class_name text not null,
  student_id uuid,
  assigned_by uuid not null default auth.uid(),
  available_from timestamptz not null default now(),
  due_at timestamptz,
  time_limit_minutes integer not null default 50 check (time_limit_minutes > 0),
  max_attempts integer not null default 1 check (max_attempts > 0),
  shuffle_questions boolean not null default false,
  shuffle_alternatives boolean not null default false,
  result_release_mode text not null default 'manual' check (result_release_mode in ('immediate','score_only','after_due','manual','hidden')),
  status text not null default 'AGENDADA' check (status in ('AGENDADA','DISPONIVEL','ENCERRADA','ARQUIVADA')),
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  student_id uuid not null default auth.uid(),
  attempt_number integer not null default 1,
  status text not null default 'EM_ANDAMENTO' check (status in ('NAO_INICIADA','EM_ANDAMENTO','ENVIADA','CORRIGIDA','ATRASADA','ENCERRADA')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  last_saved_at timestamptz,
  elapsed_seconds integer not null default 0,
  objective_score numeric(8,2) not null default 0,
  manual_score numeric(8,2) not null default 0,
  total_score numeric(8,2) not null default 0,
  percentage numeric(6,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id, attempt_number)
);

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  question_id uuid not null references public.question_items(id),
  selected_alternative_id uuid references public.question_alternatives(id),
  text_response text,
  is_correct boolean,
  automatic_score numeric(8,2) not null default 0,
  manual_score numeric(8,2),
  teacher_feedback text,
  answered_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists idx_assessment_assignments_assessment on public.assessment_assignments (assessment_id, status, available_from, due_at);
create index if not exists idx_assessment_assignments_class on public.assessment_assignments (class_id, status);
create index if not exists idx_assessment_attempts_assignment on public.assessment_attempts (assignment_id, student_id, status);
create index if not exists idx_assessment_responses_attempt on public.assessment_responses (attempt_id, question_id);

alter table public.assessment_assignments enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.assessment_responses enable row level security;

create or replace function public.jwt_text_array(path text[])
returns text[]
language sql
stable
as $$
  select coalesce(array(select jsonb_array_elements_text(auth.jwt() #> path)), array[]::text[]);
$$;

create or replace function public.current_student_class_ids()
returns text[]
language sql
stable
as $$
  select public.jwt_text_array(array['app_metadata','class_ids']);
$$;

drop policy if exists "teachers assign own assessments" on public.assessment_assignments;
create policy "teachers assign own assessments" on public.assessment_assignments
for all using (
  exists (
    select 1 from public.assessments a
    where a.id = assessment_id
      and (a.owner_user_id = auth.uid() or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','service_role']))
  )
)
with check (
  assigned_by = auth.uid()
  and exists (
    select 1 from public.assessments a
    where a.id = assessment_id
      and (a.owner_user_id = auth.uid() or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','service_role']))
  )
);

drop policy if exists "students read assigned assessments" on public.assessment_assignments;
create policy "students read assigned assessments" on public.assessment_assignments
for select using (
  public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','professor','service_role'])
  or student_id = auth.uid()
  or class_id = any(public.current_student_class_ids())
);

drop policy if exists "students manage own attempts" on public.assessment_attempts;
create policy "students manage own attempts" on public.assessment_attempts
for all using (
  student_id = auth.uid()
  or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','professor','service_role'])
)
with check (
  student_id = auth.uid()
  and exists (
    select 1 from public.assessment_assignments aa
    where aa.id = assignment_id
      and aa.status in ('AGENDADA','DISPONIVEL')
      and (aa.student_id = auth.uid() or aa.class_id = any(public.current_student_class_ids()))
  )
);

drop policy if exists "responses follow own attempts" on public.assessment_responses;
create policy "responses follow own attempts" on public.assessment_responses
for all using (
  exists (
    select 1 from public.assessment_attempts at
    where at.id = attempt_id
      and (
        at.student_id = auth.uid()
        or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','professor','service_role'])
      )
  )
)
with check (
  exists (
    select 1 from public.assessment_attempts at
    where at.id = attempt_id
      and at.student_id = auth.uid()
      and at.status = 'EM_ANDAMENTO'
  )
);
