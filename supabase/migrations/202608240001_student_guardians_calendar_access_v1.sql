-- Familia/Aluno -> Calendario V1.
-- Cria vinculo institucional familia -> aluno e libera leitura segura
-- de class_calendar_entries apenas para publicacoes da turma matriculada.

begin;

do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'PRE-CHECK bloqueado: public.profiles nao existe';
  end if;

  if to_regclass('public.students') is null then
    raise exception 'PRE-CHECK bloqueado: public.students nao existe';
  end if;

  if to_regclass('public.enrollments') is null then
    raise exception 'PRE-CHECK bloqueado: public.enrollments nao existe';
  end if;

  if to_regclass('public.class_calendar_entries') is null then
    raise exception 'PRE-CHECK bloqueado: public.class_calendar_entries nao existe';
  end if;

  if to_regprocedure('public.institutional_touch_updated_at()') is null then
    raise exception 'PRE-CHECK bloqueado: public.institutional_touch_updated_at() nao existe';
  end if;

  if to_regprocedure('public.is_platform_admin()') is null then
    raise exception 'PRE-CHECK bloqueado: public.is_platform_admin() nao existe';
  end if;
end $$;

create table if not exists public.student_guardians (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null default 'responsavel',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_guardians_relationship_check check (relationship in (
    'responsavel',
    'mae',
    'pai',
    'avo',
    'tutor',
    'outro'
  )),
  constraint student_guardians_status_check check (status in ('active', 'inactive', 'archived'))
);

comment on table public.student_guardians is
  'Vinculo institucional entre profile Auth de familia/responsavel e aluno. Nao armazena credenciais.';
comment on column public.student_guardians.profile_id is
  'Referencia public.profiles(id), que por sua vez referencia auth.users(id).';
comment on column public.student_guardians.student_id is
  'Aluno institucional autorizado para o responsavel.';

create index if not exists student_guardians_student_id_idx
  on public.student_guardians(student_id);
create index if not exists student_guardians_profile_id_idx
  on public.student_guardians(profile_id);
create index if not exists student_guardians_status_idx
  on public.student_guardians(status);
create unique index if not exists student_guardians_one_active_relationship_idx
  on public.student_guardians(student_id, profile_id, relationship)
  where status = 'active';

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'student_guardians_touch_updated_at'
      and tgrelid = 'public.student_guardians'::regclass
  ) then
    execute $trigger$
      create trigger student_guardians_touch_updated_at
      before update on public.student_guardians
      for each row execute function public.institutional_touch_updated_at()
    $trigger$;
  end if;
end $$;

create or replace function public.institutional_is_current_guardian(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.student_guardians sg
    where sg.student_id = target_student_id
      and sg.profile_id = auth.uid()
      and sg.status = 'active'
  );
$$;

create or replace function public.institutional_guardian_can_access_calendar_entry(
  target_class_id uuid,
  target_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.student_guardians sg
    join public.enrollments e on e.student_id = sg.student_id
    where sg.profile_id = auth.uid()
      and sg.status = 'active'
      and e.class_id = target_class_id
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;

revoke execute on function public.institutional_is_current_guardian(uuid) from public, anon;
revoke execute on function public.institutional_guardian_can_access_calendar_entry(uuid, uuid) from public, anon;
grant execute on function public.institutional_is_current_guardian(uuid) to authenticated, service_role;
grant execute on function public.institutional_guardian_can_access_calendar_entry(uuid, uuid) to authenticated, service_role;

revoke all on table public.student_guardians from anon;
grant select, insert, update on table public.student_guardians to authenticated;

alter table public.student_guardians enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_guardians'
      and policyname = 'student_guardians_select_own_or_admin'
  ) then
    execute $policy$
      create policy student_guardians_select_own_or_admin
      on public.student_guardians
      for select
      to authenticated
      using (
        profile_id = auth.uid()
        or public.is_platform_admin()
      )
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'student_guardians'
      and policyname = 'student_guardians_admin_manage'
  ) then
    execute $policy$
      create policy student_guardians_admin_manage
      on public.student_guardians
      for all
      to authenticated
      using (public.is_platform_admin())
      with check (public.is_platform_admin())
    $policy$;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_calendar_entries'
      and policyname = 'class_calendar_entries_select_guardian_enrollment'
  ) then
    execute $policy$
      create policy class_calendar_entries_select_guardian_enrollment
      on public.class_calendar_entries
      for select
      to authenticated
      using (
        status = 'published'
        and public.institutional_guardian_can_access_calendar_entry(class_id, school_id)
      )
    $policy$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'student_guardians'
      and c.relrowsecurity = true
  ) then
    raise exception 'VALIDACAO bloqueada: RLS nao esta ativa em public.student_guardians';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('student_guardians', 'class_calendar_entries')
      and (
        qual = 'true'
        or with_check = 'true'
      )
  ) then
    raise exception 'VALIDACAO bloqueada: existe policy USING(true) ou WITH CHECK(true)';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'student_guardians'
      and grantee = 'anon'
  ) then
    raise exception 'VALIDACAO bloqueada: anon possui privilegios em public.student_guardians';
  end if;

  if exists (select 1 from public.student_guardians limit 1) then
    raise exception 'VALIDACAO bloqueada: public.student_guardians possui linhas criadas durante a migration';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'class_calendar_entries'
      and policyname = 'class_calendar_entries_select_guardian_enrollment'
  ) then
    raise exception 'VALIDACAO bloqueada: policy de calendario para responsavel nao foi criada';
  end if;
end $$;

commit;
