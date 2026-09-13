-- Relatorios Oficiais V1 - Fase 03
-- Modelo canonico de emissao oficial, snapshots imutaveis e arquivos privados.

create sequence if not exists public.official_report_identifier_seq;

create table if not exists public.official_report_exports (
  id uuid primary key default gen_random_uuid(),
  report_identifier text not null unique,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'ready', 'failed')),
  report_type text not null
    check (report_type in ('attendance', 'diary', 'avalia', 'school-analytics', 'network-analytics')),
  format text not null check (format in ('pdf', 'xlsx')),
  scope_kind text not null check (scope_kind in ('class', 'school', 'network')),
  school_id uuid references public.schools(id) on delete restrict,
  class_id uuid references public.classes(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  network_id uuid references public.education_networks(id) on delete restrict,
  date_from date,
  date_to date,
  requested_by uuid not null references auth.users(id) on delete restrict,
  requested_role text,
  params jsonb not null default '{}'::jsonb,
  snapshot_json jsonb,
  snapshot_hash text,
  source text not null default 'live_rpc',
  file_name text,
  mime_type text,
  file_size integer,
  sha256 text,
  ready_at timestamptz,
  failed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.official_report_files (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.official_report_exports(id) on delete restrict,
  format text not null check (format in ('pdf', 'xlsx')),
  file_name text not null,
  mime_type text not null,
  file_bytes bytea not null,
  file_size integer not null,
  sha256 text not null,
  created_at timestamptz not null default now(),
  unique (report_id, format)
);

create table if not exists public.official_report_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.official_report_exports(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists official_report_exports_requested_by_idx on public.official_report_exports(requested_by, created_at desc);
create index if not exists official_report_exports_school_idx on public.official_report_exports(school_id, created_at desc) where school_id is not null;
create index if not exists official_report_exports_class_idx on public.official_report_exports(class_id, created_at desc) where class_id is not null;
create index if not exists official_report_exports_network_idx on public.official_report_exports(network_id, created_at desc) where network_id is not null;
create index if not exists official_report_files_report_idx on public.official_report_files(report_id);
create index if not exists official_report_events_report_idx on public.official_report_events(report_id, created_at desc);

alter table public.official_report_exports enable row level security;
alter table public.official_report_files enable row level security;
alter table public.official_report_events enable row level security;

create or replace function public.set_official_report_identifier()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.report_identifier is null or btrim(new.report_identifier) = '' then
    new.report_identifier :=
      'RS-REL-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.official_report_identifier_seq')::text, 6, '0');
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.prevent_ready_official_report_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'ready' then
    raise exception 'official report snapshot is immutable after ready';
  end if;
  if tg_op = 'DELETE' and old.status = 'ready' then
    raise exception 'official report snapshot is immutable after ready';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.prevent_official_report_file_mutation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  raise exception 'official report files are immutable';
end;
$$;

drop trigger if exists trg_set_official_report_identifier on public.official_report_exports;
create trigger trg_set_official_report_identifier
before insert or update on public.official_report_exports
for each row execute function public.set_official_report_identifier();

drop trigger if exists trg_prevent_ready_official_report_mutation on public.official_report_exports;
create trigger trg_prevent_ready_official_report_mutation
before update or delete on public.official_report_exports
for each row execute function public.prevent_ready_official_report_mutation();

drop trigger if exists trg_prevent_official_report_file_update on public.official_report_files;
create trigger trg_prevent_official_report_file_update
before update or delete on public.official_report_files
for each row execute function public.prevent_official_report_file_mutation();

create or replace function public.official_report_can_read(p_report_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_report public.official_report_exports%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_report
  from public.official_report_exports
  where id = p_report_id;

  if not found then
    return false;
  end if;

  return v_report.requested_by = auth.uid();
end;
$$;

drop policy if exists official_report_exports_select on public.official_report_exports;
create policy official_report_exports_select
on public.official_report_exports
for select
to authenticated
using (public.official_report_can_read(id));

drop policy if exists official_report_files_select on public.official_report_files;
create policy official_report_files_select
on public.official_report_files
for select
to authenticated
using (public.official_report_can_read(report_id));

drop policy if exists official_report_events_select on public.official_report_events;
create policy official_report_events_select
on public.official_report_events
for select
to authenticated
using (public.official_report_can_read(report_id));

revoke all on table public.official_report_exports from public, anon, authenticated;
revoke all on table public.official_report_files from public, anon, authenticated;
revoke all on table public.official_report_events from public, anon, authenticated;

grant select on table public.official_report_exports to authenticated;
grant select on table public.official_report_files to authenticated;
grant select on table public.official_report_events to authenticated;
grant all on table public.official_report_exports to service_role;
grant all on table public.official_report_files to service_role;
grant all on table public.official_report_events to service_role;
grant usage, select on sequence public.official_report_identifier_seq to service_role;

revoke all on function public.set_official_report_identifier() from public, anon, authenticated;
revoke all on function public.prevent_ready_official_report_mutation() from public, anon, authenticated;
revoke all on function public.prevent_official_report_file_mutation() from public, anon, authenticated;
revoke all on function public.official_report_can_read(uuid) from public, anon;
grant execute on function public.official_report_can_read(uuid) to authenticated, service_role;
