-- Aluno -> Minha Semana da propria turma.
-- Libera leitura segura de class_calendar_entries para aluno autenticado por auth.uid()
-- ou pelo vinculo legado auth.users -> public.users -> students.user_id.

begin;

do $$
begin
  if to_regclass('public.users') is null then
    raise exception 'PRE-CHECK bloqueado: public.users legado nao existe';
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

  if to_regprocedure('public.is_platform_admin()') is null then
    raise exception 'PRE-CHECK bloqueado: public.is_platform_admin() nao existe';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'email'
  ) then
    raise exception 'PRE-CHECK bloqueado: public.users.email nao existe';
  end if;
end $$;

create or replace function public.institutional_is_current_student(target_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    where s.id = target_student_id
      and s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
  )
  or exists (
    select 1
    from public.students s
    join public.users u on u.id = s.user_id
    where s.id = target_student_id
      and lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and coalesce(s.status, 'active') = 'active'
  );
$$;

create or replace function public.institutional_student_can_access_calendar_entry(
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
    from public.students s
    join public.enrollments e on e.student_id = s.id
    left join public.users u on u.id = s.user_id
    where e.class_id = target_class_id
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
      and (
        s.user_id = auth.uid()
        or lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

revoke execute on function public.institutional_is_current_student(uuid) from public, anon;
revoke execute on function public.institutional_student_can_access_calendar_entry(uuid, uuid) from public, anon;
grant execute on function public.institutional_is_current_student(uuid) to authenticated, service_role;
grant execute on function public.institutional_student_can_access_calendar_entry(uuid, uuid) to authenticated, service_role;

alter table public.class_calendar_entries enable row level security;

drop policy if exists class_calendar_entries_select_student_enrollment on public.class_calendar_entries;
create policy class_calendar_entries_select_student_enrollment
on public.class_calendar_entries
for select
to authenticated
using (
  status = 'published'
  and (
    public.is_platform_admin()
    or public.institutional_student_can_access_calendar_entry(class_id, school_id)
  )
);

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'class_calendar_entries'
      and policyname = 'class_calendar_entries_select_student_enrollment'
  ) then
    raise exception 'VALIDACAO bloqueada: policy class_calendar_entries_select_student_enrollment nao existe';
  end if;

  if exists (
    select 1
    from information_schema.table_privileges
    where table_schema = 'public'
      and table_name = 'class_calendar_entries'
      and grantee = 'anon'
  ) then
    raise exception 'VALIDACAO bloqueada: anon possui privilegios em public.class_calendar_entries';
  end if;
end $$;

commit;
