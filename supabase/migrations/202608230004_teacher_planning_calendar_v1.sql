-- Planejamento Professor -> Calendario Aluno/Familia V1.
-- Etapa A: backend seguro para propostas privadas do professor e publicacoes de agenda por turma.
-- Nao cria seed, nao publica dados ficticios e nao abre leitura publica para Aluno/Familia.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'PRE-CHECK bloqueado: public.profiles nao existe';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'teachers'
      and column_name = 'profile_id'
  ) then
    raise exception 'PRE-CHECK bloqueado: public.teachers.profile_id nao existe';
  end if;

  if to_regclass('public.school_memberships') is null then
    raise exception 'PRE-CHECK bloqueado: public.school_memberships nao existe';
  end if;

  if to_regclass('public.class_teacher_memberships') is null then
    raise exception 'PRE-CHECK bloqueado: public.class_teacher_memberships nao existe';
  end if;

  if to_regclass('public.enrollments') is null then
    raise exception 'PRE-CHECK bloqueado: public.enrollments nao existe';
  end if;

  if to_regprocedure('public.institutional_touch_updated_at()') is null then
    raise exception 'PRE-CHECK bloqueado: public.institutional_touch_updated_at() nao existe';
  end if;

  if to_regprocedure('public.is_platform_admin()') is null then
    raise exception 'PRE-CHECK bloqueado: public.is_platform_admin() nao existe';
  end if;
end $$;

create extension if not exists pgcrypto;

create table if not exists public.teacher_plans (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  plan_date date not null,
  weekday text not null,
  title text not null,
  resource_type text not null default 'outro',
  resource_reference jsonb not null default '{}'::jsonb,
  teacher_notes text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_plans_status_check check (status in ('draft', 'published', 'archived')),
  constraint teacher_plans_weekday_check check (weekday in ('segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo')),
  constraint teacher_plans_resource_type_check check (resource_type in (
    'atividade',
    'aula',
    'lembrete',
    'livro',
    'experiencia',
    'atividade_online',
    'proposta_livre',
    'outro'
  )),
  constraint teacher_plans_title_not_blank check (length(btrim(title)) > 0)
);

comment on table public.teacher_plans is
  'Propostas privadas do planejamento do professor. Planejar nao publica automaticamente para alunos/familias.';
comment on column public.teacher_plans.teacher_notes is
  'Observacoes internas da professora. Nunca devem ser usadas como texto publico de agenda.';
comment on column public.teacher_plans.resource_reference is
  'Referencia tecnica opcional para livro, pagina, experiencia ou atividade futura.';

create table if not exists public.class_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  plan_id uuid references public.teacher_plans(id) on delete set null,
  entry_date date not null,
  start_time time,
  end_time time,
  title text not null,
  description text,
  entry_type text not null default 'outro',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_calendar_entries_status_check check (status in ('published', 'cancelled', 'archived')),
  constraint class_calendar_entries_type_check check (entry_type in (
    'atividade',
    'aula',
    'lembrete',
    'livro',
    'experiencia',
    'atividade_online',
    'outro'
  )),
  constraint class_calendar_entries_title_not_blank check (length(btrim(title)) > 0),
  constraint class_calendar_entries_time_check check (end_time is null or start_time is null or end_time > start_time)
);

comment on table public.class_calendar_entries is
  'Entradas publicadas na agenda da turma. Visiveis a alunos/familias somente quando houver policy institucional apropriada.';
comment on column public.class_calendar_entries.description is
  'Descricao publica da publicacao. Nao copiar teacher_plans.teacher_notes automaticamente.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classes'::regclass
      and conname = 'classes_id_school_id_unique'
  ) then
    alter table public.classes
      add constraint classes_id_school_id_unique
      unique (id, school_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teacher_plans'::regclass
      and conname = 'teacher_plans_class_school_consistency_fkey'
  ) then
    alter table public.teacher_plans
      add constraint teacher_plans_class_school_consistency_fkey
      foreign key (class_id, school_id)
      references public.classes(id, school_id)
      on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.class_calendar_entries'::regclass
      and conname = 'class_calendar_entries_class_school_consistency_fkey'
  ) then
    alter table public.class_calendar_entries
      add constraint class_calendar_entries_class_school_consistency_fkey
      foreign key (class_id, school_id)
      references public.classes(id, school_id)
      on delete restrict;
  end if;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'teacher_plans',
    'class_calendar_entries'
  ]
  loop
    if not exists (
      select 1
      from pg_trigger
      where tgrelid = format('public.%I', table_name)::regclass
        and tgname = format('%s_touch_updated_at', table_name)
    ) then
      execute format(
        'create trigger %I before update on public.%I for each row execute function public.institutional_touch_updated_at()',
        format('%s_touch_updated_at', table_name),
        table_name
      );
    end if;
  end loop;
end $$;

create index if not exists teacher_plans_teacher_id_idx on public.teacher_plans(teacher_id);
create index if not exists teacher_plans_class_id_idx on public.teacher_plans(class_id);
create index if not exists teacher_plans_school_id_idx on public.teacher_plans(school_id);
create index if not exists teacher_plans_plan_date_idx on public.teacher_plans(plan_date);
create index if not exists teacher_plans_status_idx on public.teacher_plans(status);
create index if not exists teacher_plans_week_lookup_idx on public.teacher_plans(class_id, plan_date, status);

create index if not exists class_calendar_entries_class_id_idx on public.class_calendar_entries(class_id);
create index if not exists class_calendar_entries_school_id_idx on public.class_calendar_entries(school_id);
create index if not exists class_calendar_entries_teacher_id_idx on public.class_calendar_entries(teacher_id);
create index if not exists class_calendar_entries_plan_id_idx on public.class_calendar_entries(plan_id);
create index if not exists class_calendar_entries_entry_date_idx on public.class_calendar_entries(entry_date);
create index if not exists class_calendar_entries_status_idx on public.class_calendar_entries(status);
create index if not exists class_calendar_entries_week_lookup_idx on public.class_calendar_entries(class_id, entry_date, status);
create unique index if not exists class_calendar_entries_one_published_plan_idx
  on public.class_calendar_entries(plan_id)
  where plan_id is not null and status = 'published';

create or replace function public.institutional_teacher_can_manage_class(
  target_teacher_id uuid,
  target_class_id uuid,
  target_school_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1
      from public.class_teacher_memberships ctm
      join public.teachers t on t.id = ctm.teacher_id
      join public.classes c on c.id = ctm.class_id
      where ctm.teacher_id = target_teacher_id
        and ctm.class_id = target_class_id
        and (target_school_id is null or c.school_id = target_school_id)
        and t.profile_id = auth.uid()
        and coalesce(t.status, 'active') = 'active'
        and ctm.status = 'active'
        and ctm.started_at <= now()
        and (ctm.ended_at is null or ctm.ended_at > now())
        and coalesce(c.status, 'active') = 'active'
    );
$$;

create or replace function public.institutional_plan_matches_publication(
  target_plan_id uuid,
  target_teacher_id uuid,
  target_class_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    target_plan_id is null
    or exists (
      select 1
      from public.teacher_plans tp
      where tp.id = target_plan_id
        and tp.teacher_id = target_teacher_id
        and tp.class_id = target_class_id
        and tp.school_id = target_school_id
        and tp.status in ('draft', 'published')
    );
$$;

revoke execute on function public.institutional_teacher_can_manage_class(uuid, uuid, uuid) from public, anon;
revoke execute on function public.institutional_plan_matches_publication(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.institutional_teacher_can_manage_class(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.institutional_plan_matches_publication(uuid, uuid, uuid, uuid) to authenticated, service_role;

revoke all on table public.teacher_plans from anon;
revoke all on table public.class_calendar_entries from anon;
grant select, insert, update on table public.teacher_plans to authenticated;
grant select, insert, update on table public.class_calendar_entries to authenticated;

alter table public.teacher_plans enable row level security;
alter table public.class_calendar_entries enable row level security;

drop policy if exists teacher_plans_select_own_class_or_admin on public.teacher_plans;
create policy teacher_plans_select_own_class_or_admin
on public.teacher_plans
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
);

drop policy if exists teacher_plans_insert_own_class_or_admin on public.teacher_plans;
create policy teacher_plans_insert_own_class_or_admin
on public.teacher_plans
for insert
to authenticated
with check (
  status in ('draft', 'published')
  and (
    public.is_platform_admin()
    or public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
  )
);

drop policy if exists teacher_plans_update_own_class_or_admin on public.teacher_plans;
create policy teacher_plans_update_own_class_or_admin
on public.teacher_plans
for update
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
)
with check (
  public.is_platform_admin()
  or public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
);

drop policy if exists class_calendar_entries_select_teacher_class_or_admin on public.class_calendar_entries;
create policy class_calendar_entries_select_teacher_class_or_admin
on public.class_calendar_entries
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
);

drop policy if exists class_calendar_entries_insert_teacher_class_or_admin on public.class_calendar_entries;
create policy class_calendar_entries_insert_teacher_class_or_admin
on public.class_calendar_entries
for insert
to authenticated
with check (
  status = 'published'
  and (
    public.is_platform_admin()
    or public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
  )
  and public.institutional_plan_matches_publication(plan_id, teacher_id, class_id, school_id)
);

drop policy if exists class_calendar_entries_update_teacher_class_or_admin on public.class_calendar_entries;
create policy class_calendar_entries_update_teacher_class_or_admin
on public.class_calendar_entries
for update
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
)
with check (
  public.is_platform_admin()
  or (
    public.institutional_teacher_can_manage_class(teacher_id, class_id, school_id)
    and public.institutional_plan_matches_publication(plan_id, teacher_id, class_id, school_id)
  )
);

-- Intencionalmente nao ha policy de SELECT para aluno/familia nesta fase.
-- A leitura futura deve depender de vinculo institucional real do aluno/familia com enrollments,
-- sem USING(true), sem anon e sem public.users legado como autorizador novo.

do $$
begin
  if to_regclass('public.teacher_plans') is null then
    raise exception 'VALIDACAO bloqueada: public.teacher_plans nao existe';
  end if;

  if to_regclass('public.class_calendar_entries') is null then
    raise exception 'VALIDACAO bloqueada: public.class_calendar_entries nao existe';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'teacher_plans'
      and c.relrowsecurity = true
  ) then
    raise exception 'VALIDACAO bloqueada: RLS nao esta ativa em public.teacher_plans';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'class_calendar_entries'
      and c.relrowsecurity = true
  ) then
    raise exception 'VALIDACAO bloqueada: RLS nao esta ativa em public.class_calendar_entries';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('teacher_plans', 'class_calendar_entries')
      and (
        coalesce(qual, '') = 'true'
        or coalesce(with_check, '') = 'true'
      )
  ) then
    raise exception 'VALIDACAO bloqueada: existe policy USING(true) ou WITH CHECK(true) em planejamento/calendario';
  end if;

  if exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name in ('teacher_plans', 'class_calendar_entries')
      and grantee = 'anon'
  ) then
    raise exception 'VALIDACAO bloqueada: anon possui privilegios em teacher_plans/class_calendar_entries';
  end if;

  if exists (select 1 from public.teacher_plans limit 1) then
    raise exception 'VALIDACAO bloqueada: public.teacher_plans possui linhas criadas durante a migration';
  end if;

  if exists (select 1 from public.class_calendar_entries limit 1) then
    raise exception 'VALIDACAO bloqueada: public.class_calendar_entries possui linhas criadas durante a migration';
  end if;
end $$;

commit;
