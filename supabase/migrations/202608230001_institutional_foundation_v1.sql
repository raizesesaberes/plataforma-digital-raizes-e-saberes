-- Nucleo Institucional V2 - FASE A / Fundacao nova.
-- Preserva a arquitetura legada public.users -> teachers/students.user_id.
-- Nao converte user_id legado para auth.users, nao altera classes.teacher_id
-- legado e nao fecha RLS de schools/teachers/classes/students nesta fase.

create extension if not exists pgcrypto;

create or replace function public.current_platform_role()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'platform_role',
      auth.jwt() -> 'app_metadata' ->> 'app_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      case when auth.role() = 'service_role' then 'service_role' else '' end
    )
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select public.current_platform_role() = any(array[
    'admin',
    'admin_ti',
    'administrador',
    'administrador_nacional',
    'ti',
    'service_role'
  ]);
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  platform_role text not null default 'user',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_status_check check (status in ('active', 'inactive', 'pending', 'blocked', 'archived'))
);

comment on table public.profiles is
  'Perfil persistente da aplicacao. A autorizacao continua usando app_metadata.platform_role.';
comment on column public.profiles.platform_role is
  'Representacao persistente; nao substitui app_metadata.platform_role automaticamente.';

alter table public.schools add column if not exists status text not null default 'active';
alter table public.schools add column if not exists updated_at timestamptz not null default now();

alter table public.teachers add column if not exists profile_id uuid;
alter table public.teachers add column if not exists status text not null default 'active';
alter table public.teachers add column if not exists updated_at timestamptz not null default now();

alter table public.classes add column if not exists age_group text;
alter table public.classes add column if not exists school_year text;
alter table public.classes add column if not exists status text not null default 'active';
alter table public.classes add column if not exists updated_at timestamptz not null default now();

alter table public.students add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.schools'::regclass
      and conname = 'schools_status_check'
  ) then
    alter table public.schools
      add constraint schools_status_check
      check (status in ('active', 'inactive', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teachers'::regclass
      and conname = 'teachers_status_check'
  ) then
    alter table public.teachers
      add constraint teachers_status_check
      check (status in ('active', 'inactive', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.classes'::regclass
      and conname = 'classes_status_check'
  ) then
    alter table public.classes
      add constraint classes_status_check
      check (status in ('active', 'inactive', 'archived'));
  end if;
end $$;

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  membership_role text not null,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_memberships_status_check check (status in ('active', 'inactive', 'ended', 'archived')),
  constraint school_memberships_role_check check (membership_role in (
    'professor',
    'gestor',
    'coordenador',
    'direcao',
    'secretaria',
    'admin',
    'admin_ti'
  )),
  constraint school_memberships_dates_check check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.class_teacher_memberships (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete cascade,
  role text not null default 'principal',
  status text not null default 'active',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_teacher_memberships_role_check check (role in ('principal', 'auxiliar', 'especialista', 'substituto')),
  constraint class_teacher_memberships_status_check check (status in ('active', 'inactive', 'ended', 'archived')),
  constraint class_teacher_memberships_dates_check check (ended_at is null or ended_at >= started_at)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  school_id uuid not null references public.schools(id) on delete restrict,
  school_year text not null,
  status text not null default 'active',
  enrolled_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_status_check check (status in ('active', 'transferred', 'ended', 'cancelled', 'archived')),
  constraint enrollments_dates_check check (ended_at is null or ended_at >= enrolled_at)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.teachers'::regclass
      and conname = 'teachers_profile_id_fkey'
  ) then
    alter table public.teachers
      add constraint teachers_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete set null;
  end if;
end $$;

create or replace function public.institutional_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'schools',
    'teachers',
    'classes',
    'students',
    'school_memberships',
    'class_teacher_memberships',
    'enrollments'
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

create index if not exists profiles_platform_role_idx on public.profiles(platform_role);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists schools_status_idx on public.schools(status);
create index if not exists teachers_profile_id_idx on public.teachers(profile_id);
create index if not exists teachers_school_id_idx on public.teachers(school_id);
create index if not exists teachers_status_idx on public.teachers(status);
create unique index if not exists teachers_one_active_profile_idx
  on public.teachers(profile_id)
  where profile_id is not null and status = 'active';
create index if not exists classes_school_id_idx on public.classes(school_id);
create index if not exists classes_teacher_id_idx on public.classes(teacher_id);
create index if not exists classes_status_idx on public.classes(status);
create index if not exists students_school_id_idx on public.students(school_id);
create index if not exists students_class_id_idx on public.students(class_id);
create index if not exists students_status_idx on public.students(status);
create index if not exists school_memberships_profile_id_idx on public.school_memberships(profile_id);
create index if not exists school_memberships_school_id_idx on public.school_memberships(school_id);
create index if not exists school_memberships_status_idx on public.school_memberships(status);
create unique index if not exists school_memberships_one_active_role_idx
  on public.school_memberships(school_id, profile_id, membership_role)
  where status = 'active' and ended_at is null;
create index if not exists class_teacher_memberships_class_id_idx on public.class_teacher_memberships(class_id);
create index if not exists class_teacher_memberships_teacher_id_idx on public.class_teacher_memberships(teacher_id);
create index if not exists class_teacher_memberships_status_idx on public.class_teacher_memberships(status);
create unique index if not exists class_teacher_memberships_one_active_role_idx
  on public.class_teacher_memberships(class_id, teacher_id, role)
  where status = 'active' and ended_at is null;
create index if not exists enrollments_student_id_idx on public.enrollments(student_id);
create index if not exists enrollments_class_id_idx on public.enrollments(class_id);
create index if not exists enrollments_school_id_idx on public.enrollments(school_id);
create index if not exists enrollments_status_idx on public.enrollments(status);
create unique index if not exists enrollments_one_active_class_year_idx
  on public.enrollments(student_id, class_id, school_year)
  where status = 'active' and ended_at is null;

create or replace function public.institutional_has_active_school_membership(target_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = target_school_id
      and sm.profile_id = auth.uid()
      and sm.status = 'active'
      and sm.started_at <= now()
      and (sm.ended_at is null or sm.ended_at > now())
  );
$$;

create or replace function public.institutional_is_current_teacher(target_teacher_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.teachers t
    where t.id = target_teacher_id
      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
  );
$$;

create or replace function public.institutional_has_active_class_membership(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t on t.id = ctm.teacher_id
    where ctm.class_id = target_class_id
      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
  );
$$;

create or replace function public.institutional_can_access_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.class_teacher_memberships ctm on ctm.class_id = e.class_id
    join public.teachers t on t.id = ctm.teacher_id
    where e.student_id = target_student_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
  );
$$;

revoke execute on function public.current_platform_role() from public, anon;
revoke execute on function public.is_platform_admin() from public, anon;
revoke execute on function public.institutional_has_active_school_membership(uuid) from public, anon;
revoke execute on function public.institutional_is_current_teacher(uuid) from public, anon;
revoke execute on function public.institutional_has_active_class_membership(uuid) from public, anon;
revoke execute on function public.institutional_can_access_student(uuid) from public, anon;
grant execute on function public.current_platform_role() to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;
grant execute on function public.institutional_has_active_school_membership(uuid) to authenticated, service_role;
grant execute on function public.institutional_is_current_teacher(uuid) to authenticated, service_role;
grant execute on function public.institutional_has_active_class_membership(uuid) to authenticated, service_role;
grant execute on function public.institutional_can_access_student(uuid) to authenticated, service_role;

revoke all on table public.profiles from anon;
revoke all on table public.school_memberships from anon;
revoke all on table public.class_teacher_memberships from anon;
revoke all on table public.enrollments from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.school_memberships to authenticated;
grant select, insert, update, delete on table public.class_teacher_memberships to authenticated;
grant select, insert, update, delete on table public.enrollments to authenticated;

alter table public.profiles enable row level security;
alter table public.school_memberships enable row level security;
alter table public.class_teacher_memberships enable row level security;
alter table public.enrollments enable row level security;

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_platform_admin());

drop policy if exists profiles_admin_manage on public.profiles;
create policy profiles_admin_manage
on public.profiles
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists school_memberships_select_own_or_admin on public.school_memberships;
create policy school_memberships_select_own_or_admin
on public.school_memberships
for select
to authenticated
using (profile_id = auth.uid() or public.is_platform_admin());

drop policy if exists school_memberships_admin_manage on public.school_memberships;
create policy school_memberships_admin_manage
on public.school_memberships
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists class_teacher_memberships_select_own_or_admin on public.class_teacher_memberships;
create policy class_teacher_memberships_select_own_or_admin
on public.class_teacher_memberships
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_is_current_teacher(teacher_id)
);

drop policy if exists class_teacher_memberships_admin_manage on public.class_teacher_memberships;
create policy class_teacher_memberships_admin_manage
on public.class_teacher_memberships
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists enrollments_select_by_class_membership_or_admin on public.enrollments;
create policy enrollments_select_by_class_membership_or_admin
on public.enrollments
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_has_active_class_membership(class_id)
);

drop policy if exists enrollments_admin_manage on public.enrollments;
create policy enrollments_admin_manage
on public.enrollments
for all
to authenticated
using (public.is_platform_admin())
with check (public.is_platform_admin());
