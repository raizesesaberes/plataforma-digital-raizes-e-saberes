-- Nucleo Institucional V2 - FASE B / Reconciliacao controlada.
-- Edite somente os parametros do bloco abaixo antes de executar.
-- Nao reutiliza teacher legado, nao apaga dados antigos e nao altera public.users.

do $$
declare
  p_auth_professor_id uuid := '00000000-0000-0000-0000-000000000000';
  p_school_id uuid := '00000000-0000-0000-0000-000000000000';
  p_class_id uuid := '00000000-0000-0000-0000-000000000000';
  p_school_year text := '2026';
  p_teacher_display_name text := 'Professor(a)';
  p_teacher_membership_role text := 'professor';
  p_class_teacher_role text := 'principal';

  v_teacher_id uuid;
  v_teacher_user_nullable text;
begin
  if p_auth_professor_id = '00000000-0000-0000-0000-000000000000'
    or p_school_id = '00000000-0000-0000-0000-000000000000'
    or p_class_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Configure p_auth_professor_id, p_school_id e p_class_id antes de executar a FASE B';
  end if;

  if not exists (
    select 1
    from auth.users au
    where au.id = p_auth_professor_id
      and au.raw_app_meta_data ->> 'platform_role' = 'professor'
  ) then
    raise exception 'Auth professor informado nao existe ou nao possui app_metadata.platform_role=professor';
  end if;

  if not exists (select 1 from public.schools where id = p_school_id) then
    raise exception 'school_id informado nao existe';
  end if;

  if not exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and c.school_id = p_school_id
  ) then
    raise exception 'class_id informado nao existe ou nao pertence ao school_id informado';
  end if;

  insert into public.profiles (id, display_name, platform_role, status)
  values (p_auth_professor_id, p_teacher_display_name, 'professor', 'active')
  on conflict (id) do update
    set display_name = coalesce(profiles.display_name, excluded.display_name),
        platform_role = excluded.platform_role,
        status = 'active',
        updated_at = now();

  select c.is_nullable
    into v_teacher_user_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'teachers'
    and c.column_name = 'user_id';

  if v_teacher_user_nullable = 'NO' then
    raise exception 'teachers.user_id e NOT NULL na arquitetura legada; crie uma etapa compativel com public.users antes de inserir o novo teacher';
  end if;

  select t.id
    into v_teacher_id
  from public.teachers t
  where t.profile_id = p_auth_professor_id
  order by t.created_at
  limit 1;

  if v_teacher_id is null then
    v_teacher_id := gen_random_uuid();

    insert into public.teachers (id, profile_id, school_id, status)
    values (v_teacher_id, p_auth_professor_id, p_school_id, 'active');
  else
    update public.teachers
      set school_id = p_school_id,
          status = 'active',
          updated_at = now()
    where id = v_teacher_id;
  end if;

  insert into public.school_memberships (
    school_id,
    profile_id,
    membership_role,
    status,
    started_at
  )
  select
    p_school_id,
    p_auth_professor_id,
    p_teacher_membership_role,
    'active',
    now()
  where not exists (
    select 1
    from public.school_memberships sm
    where sm.school_id = p_school_id
      and sm.profile_id = p_auth_professor_id
      and sm.membership_role = p_teacher_membership_role
      and sm.status = 'active'
      and sm.ended_at is null
  );

  insert into public.class_teacher_memberships (
    class_id,
    teacher_id,
    role,
    status,
    started_at
  )
  select
    p_class_id,
    v_teacher_id,
    p_class_teacher_role,
    'active',
    now()
  where not exists (
    select 1
    from public.class_teacher_memberships ctm
    where ctm.class_id = p_class_id
      and ctm.teacher_id = v_teacher_id
      and ctm.role = p_class_teacher_role
      and ctm.status = 'active'
      and ctm.ended_at is null
  );

  insert into public.enrollments (
    student_id,
    class_id,
    school_id,
    school_year,
    status,
    enrolled_at
  )
  select
    st.id,
    st.class_id,
    st.school_id,
    p_school_year,
    'active',
    now()
  from public.students st
  where st.school_id = p_school_id
    and st.class_id = p_class_id
    and not exists (
      select 1
      from public.enrollments e
      where e.student_id = st.id
        and e.class_id = st.class_id
        and e.school_id = st.school_id
        and e.school_year = p_school_year
        and e.status = 'active'
        and e.ended_at is null
    );
end $$;
