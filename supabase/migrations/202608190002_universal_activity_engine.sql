-- Motor Universal de Atividades
-- A imagem original permanece no Banco de Atividades; producoes dos alunos ficam separadas.

create extension if not exists pgcrypto;

create table if not exists public.activity_engine_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_code text not null unique,
  activity_code text not null,
  teacher_id uuid,
  class_id text not null,
  student_ids text[] not null default '{}',
  assigned_at timestamptz not null default now(),
  due_date timestamptz,
  instructions text,
  tool_profile text not null default 'ei2',
  mode text not null default 'livre' check (mode in ('livre','sugerido')),
  status text not null default 'PUBLICADA' check (status in ('RASCUNHO','PUBLICADA','ARQUIVADA')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_engine_submissions (
  id uuid primary key default gen_random_uuid(),
  submission_code text not null unique,
  assignment_id uuid not null references public.activity_engine_assignments(id) on delete cascade,
  activity_code text not null,
  student_id text not null,
  class_id text not null,
  teacher_id uuid,
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED','IN_PROGRESS','COMPLETED')),
  started_at timestamptz,
  last_saved_at timestamptz,
  completed_at timestamptz,
  engine_version text not null,
  canvas_data jsonb not null default '{"strokes":[]}',
  objects_data jsonb not null default '[]',
  preview text,
  final_artwork text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

create table if not exists public.activity_engine_usage_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references public.activity_engine_assignments(id) on delete set null,
  submission_id uuid references public.activity_engine_submissions(id) on delete set null,
  activity_code text not null,
  actor_id text,
  actor_role text,
  event_type text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.activity_engine_assignments enable row level security;
alter table public.activity_engine_submissions enable row level security;
alter table public.activity_engine_usage_logs enable row level security;

drop policy if exists activity_engine_teacher_manage_assignments on public.activity_engine_assignments;
create policy activity_engine_teacher_manage_assignments
on public.activity_engine_assignments
for all
using (public.has_printable_activities_role(array['professor','coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional']))
with check (public.has_printable_activities_role(array['professor','coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional']));

drop policy if exists activity_engine_teacher_read_submissions on public.activity_engine_submissions;
create policy activity_engine_teacher_read_submissions
on public.activity_engine_submissions
for select
using (public.has_printable_activities_role(array['professor','coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional']));

drop policy if exists activity_engine_student_write_own_submission on public.activity_engine_submissions;
create policy activity_engine_student_write_own_submission
on public.activity_engine_submissions
for all
using (student_id = coalesce(auth.jwt() ->> 'student_id', auth.uid()::text))
with check (student_id = coalesce(auth.jwt() ->> 'student_id', auth.uid()::text));

drop policy if exists activity_engine_logs_authorized_insert on public.activity_engine_usage_logs;
create policy activity_engine_logs_authorized_insert
on public.activity_engine_usage_logs
for insert
with check (
  public.has_printable_activities_role(array['professor','coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional'])
  or actor_id = coalesce(auth.jwt() ->> 'student_id', auth.uid()::text)
);
