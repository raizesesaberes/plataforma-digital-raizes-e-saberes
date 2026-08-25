-- Educacao Infantil -> acesso institucional do proprio aluno.
-- Libera leitura segura para o Auth de educacao_infantil vinculado em students.user_id.
-- Nao altera dados, nao cria seed e nao abre acesso anonimo.

begin;

do $$
begin
  if to_regclass('public.students') is null then
    raise exception 'PRE-CHECK bloqueado: public.students nao existe';
  end if;

  if to_regclass('public.enrollments') is null then
    raise exception 'PRE-CHECK bloqueado: public.enrollments nao existe';
  end if;

  if to_regclass('public.classes') is null then
    raise exception 'PRE-CHECK bloqueado: public.classes nao existe';
  end if;

  if to_regclass('public.schools') is null then
    raise exception 'PRE-CHECK bloqueado: public.schools nao existe';
  end if;

  if to_regclass('public.class_teacher_memberships') is null then
    raise exception 'PRE-CHECK bloqueado: public.class_teacher_memberships nao existe';
  end if;

  if to_regclass('public.teachers') is null then
    raise exception 'PRE-CHECK bloqueado: public.teachers nao existe';
  end if;

  if to_regclass('public.profiles') is null then
    raise exception 'PRE-CHECK bloqueado: public.profiles nao existe';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'students'
      and column_name = 'user_id'
  ) then
    raise exception 'PRE-CHECK bloqueado: public.students.user_id nao existe';
  end if;
end $$;

create or replace function public.institutional_is_current_early_childhood_student(target_student_id uuid)
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
  );
$$;

create or replace function public.institutional_early_childhood_has_active_enrollment(
  target_student_id uuid,
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
    where s.id = target_student_id
      and s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.class_id = target_class_id
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;

create or replace function public.institutional_early_childhood_can_access_class(target_class_id uuid)
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
    where s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.class_id = target_class_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;

create or replace function public.institutional_early_childhood_can_access_school(target_school_id uuid)
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
    where s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.school_id = target_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;

create or replace function public.institutional_early_childhood_can_access_teacher(target_teacher_id uuid)
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
    join public.class_teacher_memberships ctm on ctm.class_id = e.class_id
    join public.teachers t on t.id = ctm.teacher_id
    where s.user_id = auth.uid()
      and coalesce(s.status, 'active') = 'active'
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
      and t.id = target_teacher_id
      and coalesce(t.status, 'active') = 'active'
  );
$$;

create or replace function public.institutional_early_childhood_can_access_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.teachers t
    where t.profile_id = target_profile_id
      and public.institutional_early_childhood_can_access_teacher(t.id)
  );
$$;

revoke execute on function public.institutional_is_current_early_childhood_student(uuid) from public, anon;
revoke execute on function public.institutional_early_childhood_has_active_enrollment(uuid, uuid, uuid) from public, anon;
revoke execute on function public.institutional_early_childhood_can_access_class(uuid) from public, anon;
revoke execute on function public.institutional_early_childhood_can_access_school(uuid) from public, anon;
revoke execute on function public.institutional_early_childhood_can_access_teacher(uuid) from public, anon;
revoke execute on function public.institutional_early_childhood_can_access_profile(uuid) from public, anon;

grant execute on function public.institutional_is_current_early_childhood_student(uuid) to authenticated, service_role;
grant execute on function public.institutional_early_childhood_has_active_enrollment(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.institutional_early_childhood_can_access_class(uuid) to authenticated, service_role;
grant execute on function public.institutional_early_childhood_can_access_school(uuid) to authenticated, service_role;
grant execute on function public.institutional_early_childhood_can_access_teacher(uuid) to authenticated, service_role;
grant execute on function public.institutional_early_childhood_can_access_profile(uuid) to authenticated, service_role;

drop policy if exists students_select_self_early_childhood on public.students;
create policy students_select_self_early_childhood
on public.students
for select
to authenticated
using (
  user_id = auth.uid()
  and coalesce(status, 'active') = 'active'
);

drop policy if exists enrollments_select_self_early_childhood on public.enrollments;
create policy enrollments_select_self_early_childhood
on public.enrollments
for select
to authenticated
using (
  public.institutional_early_childhood_has_active_enrollment(student_id, class_id, school_id)
);

drop policy if exists classes_select_self_early_childhood on public.classes;
create policy classes_select_self_early_childhood
on public.classes
for select
to authenticated
using (
  public.institutional_early_childhood_can_access_class(id)
);

drop policy if exists schools_select_self_early_childhood on public.schools;
create policy schools_select_self_early_childhood
on public.schools
for select
to authenticated
using (
  public.institutional_early_childhood_can_access_school(id)
);

drop policy if exists class_teacher_memberships_select_self_early_childhood on public.class_teacher_memberships;
create policy class_teacher_memberships_select_self_early_childhood
on public.class_teacher_memberships
for select
to authenticated
using (
  status = 'active'
  and public.institutional_early_childhood_can_access_class(class_id)
);

drop policy if exists teachers_select_self_early_childhood on public.teachers;
create policy teachers_select_self_early_childhood
on public.teachers
for select
to authenticated
using (
  public.institutional_early_childhood_can_access_teacher(id)
);

drop policy if exists profiles_select_teacher_for_early_childhood on public.profiles;
create policy profiles_select_teacher_for_early_childhood
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.institutional_early_childhood_can_access_profile(id)
);

do $$
begin
  if to_regclass('public.class_calendar_entries') is not null then
    execute $policy$
      drop policy if exists class_calendar_entries_select_self_early_childhood on public.class_calendar_entries
    $policy$;

    execute $policy$
      create policy class_calendar_entries_select_self_early_childhood
      on public.class_calendar_entries
      for select
      to authenticated
      using (
        status = 'published'
        and public.institutional_early_childhood_can_access_class(class_id)
        and public.institutional_early_childhood_can_access_school(school_id)
      )
    $policy$;
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'students',
        'enrollments',
        'classes',
        'schools',
        'class_teacher_memberships',
        'teachers',
        'profiles',
        'class_calendar_entries'
      )
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
      and table_name in (
        'students',
        'enrollments',
        'classes',
        'schools',
        'class_teacher_memberships',
        'teachers',
        'profiles'
      )
      and grantee = 'anon'
  ) then
    raise exception 'VALIDACAO bloqueada: anon possui privilegios em tabelas institucionais de educacao infantil';
  end if;
end $$;

commit;
