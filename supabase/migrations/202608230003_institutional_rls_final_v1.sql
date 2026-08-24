-- Nucleo Institucional V2 - FASE C / Fechamento de seguranca.
-- Aplicar somente depois da FASE B validar profile, teacher novo,
-- memberships e enrollments.

do $$
declare
  policy_record record;
begin
  if not exists (select 1 from public.school_memberships where status = 'active') then
    raise exception 'FASE C bloqueada: nao ha school_memberships ativos';
  end if;

  if not exists (select 1 from public.class_teacher_memberships where status = 'active') then
    raise exception 'FASE C bloqueada: nao ha class_teacher_memberships ativos';
  end if;

  if not exists (select 1 from public.enrollments where status = 'active') then
    raise exception 'FASE C bloqueada: nao ha enrollments ativos';
  end if;

  for policy_record in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public'
      and tablename in ('classes', 'students')
      and cmd = 'SELECT'
      and qual = 'true'
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      policy_record.policyname,
      policy_record.tablename
    );
  end loop;
end $$;

alter table public.schools enable row level security;
alter table public.teachers enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;

revoke all on table public.schools from anon;
revoke all on table public.teachers from anon;
revoke all on table public.classes from anon;
revoke all on table public.students from anon;

grant select on table public.schools to authenticated;
grant select on table public.teachers to authenticated;
grant select on table public.classes to authenticated;
grant select on table public.students to authenticated;

drop policy if exists schools_select_by_membership_or_admin on public.schools;
create policy schools_select_by_membership_or_admin
on public.schools
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_has_active_school_membership(id)
);

drop policy if exists teachers_select_by_profile_or_admin on public.teachers;
create policy teachers_select_by_profile_or_admin
on public.teachers
for select
to authenticated
using (
  public.is_platform_admin()
  or profile_id = auth.uid()
);

drop policy if exists classes_select_by_membership_or_admin on public.classes;
create policy classes_select_by_membership_or_admin
on public.classes
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_has_active_class_membership(id)
);

drop policy if exists students_select_by_enrollment_or_admin on public.students;
create policy students_select_by_enrollment_or_admin
on public.students
for select
to authenticated
using (
  public.is_platform_admin()
  or public.institutional_can_access_student(id)
);
