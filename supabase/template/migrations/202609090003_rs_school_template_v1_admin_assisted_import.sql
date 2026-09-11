-- RS-SCHOOL-TEMPLATE V1 - Admin/TI assisted import for an initialized school.
-- Keeps the school inactive, imports only institutional records, and never creates Auth users.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_institutional_identity_check;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_institutional_identity_check
  CHECK (
    profile_id IS NOT NULL
    OR nullif(btrim(full_name), '') IS NOT NULL
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS teachers_school_full_name_idx
  ON public.teachers (school_id, lower(btrim(full_name)))
  WHERE full_name IS NOT NULL;

ALTER TABLE public.admin_school_deployment_events
  DROP CONSTRAINT IF EXISTS admin_school_deployment_events_action_check;

ALTER TABLE public.admin_school_deployment_events
  ADD CONSTRAINT admin_school_deployment_events_action_check
  CHECK (action = ANY (ARRAY[
    'school_created'::text,
    'duplicate_blocked'::text,
    'creation_failed'::text,
    'school_import_validated'::text,
    'school_import_confirmed'::text,
    'school_import_blocked'::text
  ]));

CREATE OR REPLACE FUNCTION public.secretaria_create_teacher(
  p_school_id uuid,
  p_full_name text,
  p_status text DEFAULT 'active'::text,
  p_disciplina text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_teacher_id uuid;
  v_full_name text := nullif(trim(p_full_name), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_disciplina text := nullif(trim(p_disciplina), '');
begin
  if v_full_name is null then
    raise exception 'Nome completo do professor e obrigatorio.' using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive', 'archived') then
    raise exception 'Status de professor incompativel com o schema.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.schools s where s.id = p_school_id and s.status <> 'archived'
  ) then
    raise exception 'Escola nao encontrada.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(p_school_id) and not public.is_platform_admin() then
    raise exception 'Perfil institucional sem permissao para criar professor nesta escola.' using errcode = '42501';
  end if;

  select t.id
    into v_teacher_id
  from public.teachers t
  left join public.profiles p on p.id = t.profile_id
  where t.school_id = p_school_id
    and lower(coalesce(nullif(btrim(t.full_name), ''), btrim(p.display_name))) = lower(v_full_name)
    and t.status <> 'archived'
  order by case when t.status = 'active' then 0 else 1 end, t.created_at
  limit 1;

  if v_teacher_id is null then
    insert into public.teachers (
      school_id,
      full_name,
      email,
      profile_id,
      disciplina,
      status
    )
    values (
      p_school_id,
      v_full_name,
      null,
      null,
      v_disciplina,
      v_status
    )
    returning id into v_teacher_id;
  else
    update public.teachers
       set full_name = v_full_name,
           disciplina = v_disciplina,
           status = v_status,
           updated_at = now()
     where id = v_teacher_id;
  end if;

  return jsonb_build_object(
    'teacher_id', v_teacher_id,
    'profile_id', null,
    'membership_id', null,
    'school_id', p_school_id,
    'status', v_status,
    'created_by', auth.uid(),
    'created_at', now()
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.admin_confirm_rs_school_import(
  p_school_id uuid,
  p_package jsonb,
  p_dry_run boolean DEFAULT true
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_admin_user_id uuid := auth.uid();
  v_admin_role text;
  v_school_code text;
  v_school_year text := coalesce(nullif(btrim(p_package ->> 'school_year'), ''), '2026');
  v_package_version text := coalesce(nullif(btrim(p_package ->> 'package_version'), ''), 'RS-SCHOOL-V1-DEPLOYMENT-2026-09-01');
  v_schema_version text := coalesce(nullif(btrim(p_package ->> 'schema_version'), ''), 'RS-SCHOOL-TEMPLATE V1');
  v_counts jsonb := jsonb_build_object(
    'valid_rows', 0,
    'classes_created', 0,
    'teachers_created', 0,
    'teacher_links_created', 0,
    'students_created', 0,
    'enrollments_created', 0,
    'guardians_created', 0,
    'family_links_created', 0,
    'existing', 0,
    'invalid', 0
  );
  v_class_ids jsonb := '{}'::jsonb;
  v_teacher_ids jsonb := '{}'::jsonb;
  v_student_ids jsonb := '{}'::jsonb;
  v_guardian_ids jsonb := '{}'::jsonb;
  v_item jsonb;
  v_key text;
  v_class_id uuid;
  v_teacher_id uuid;
  v_student_id uuid;
  v_guardian_id uuid;
  v_enrollment_id uuid;
  v_link_id uuid;
begin
  if v_admin_user_id is null then
    raise exception 'Sessao autenticada obrigatoria.' using errcode = '42501';
  end if;

  select lower(platform_role)
    into v_admin_role
  from public.profiles
  where id = v_admin_user_id
    and status = 'active';

  if v_admin_role not in ('admin', 'admin_ti', 'administrador', 'administrador_nacional') then
    raise exception 'Perfil Admin/TI obrigatorio para importar escola.' using errcode = '42501';
  end if;

  select coalesce(i.school_code, s.codigo_inep, s.nome)
    into v_school_code
  from public.schools s
  left join public.rs_school_installations i on i.school_id = s.id
  where s.id = p_school_id
    and s.status <> 'archived';

  if v_school_code is null then
    raise exception 'Escola alvo nao encontrada.' using errcode = '22023';
  end if;

  if v_package_version <> 'RS-SCHOOL-V1-DEPLOYMENT-2026-09-01' or v_schema_version <> 'RS-SCHOOL-TEMPLATE V1' then
    raise exception 'Pacote de importacao incompativel.' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_package -> 'classes', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_package -> 'teachers', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_package -> 'teacher_classes', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_package -> 'students', '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_package -> 'guardians', '[]'::jsonb)) <> 'array' then
    raise exception 'Formato do pacote de importacao invalido.' using errcode = '22023';
  end if;

  v_counts := jsonb_set(
    v_counts,
    '{valid_rows}',
    to_jsonb(
      jsonb_array_length(coalesce(p_package -> 'classes', '[]'::jsonb))
      + jsonb_array_length(coalesce(p_package -> 'teachers', '[]'::jsonb))
      + jsonb_array_length(coalesce(p_package -> 'teacher_classes', '[]'::jsonb))
      + jsonb_array_length(coalesce(p_package -> 'students', '[]'::jsonb))
      + jsonb_array_length(coalesce(p_package -> 'guardians', '[]'::jsonb))
    )
  );

  for v_item in select * from jsonb_array_elements(coalesce(p_package -> 'classes', '[]'::jsonb)) loop
    v_key := lower(btrim(v_item ->> 'class_name')) || '|' || coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year);
    if nullif(btrim(v_item ->> 'class_name'), '') is null then
      v_counts := jsonb_set(v_counts, '{invalid}', to_jsonb((v_counts ->> 'invalid')::int + 1));
      continue;
    end if;

    select id into v_class_id
    from public.classes
    where school_id = p_school_id
      and lower(btrim(nome)) = lower(btrim(v_item ->> 'class_name'))
      and coalesce(school_year, '') = coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year)
      and status <> 'archived'
    order by created_at
    limit 1;

    if v_class_id is null and p_dry_run then
      v_class_ids := jsonb_set(v_class_ids, array[v_key], to_jsonb(v_key), true);
    elsif v_class_id is null then
      insert into public.classes (school_id, nome, age_group, school_year, status, turno, ano_escolar)
      values (
        p_school_id,
        btrim(v_item ->> 'class_name'),
        nullif(btrim(v_item ->> 'age_group'), ''),
        coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year),
        coalesce(nullif(btrim(v_item ->> 'status'), ''), 'active'),
        nullif(btrim(v_item ->> 'shift'), ''),
        nullif(btrim(v_item ->> 'grade'), '')
      )
      returning id into v_class_id;
      v_counts := jsonb_set(v_counts, '{classes_created}', to_jsonb((v_counts ->> 'classes_created')::int + 1));
    elsif v_class_id is not null then
      v_counts := jsonb_set(v_counts, '{existing}', to_jsonb((v_counts ->> 'existing')::int + 1));
    end if;

    if v_class_id is not null then
      v_class_ids := jsonb_set(v_class_ids, array[v_key], to_jsonb(v_class_id::text), true);
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_package -> 'teachers', '[]'::jsonb)) loop
    v_key := lower(coalesce(nullif(btrim(v_item ->> 'email'), ''), btrim(v_item ->> 'full_name')));
    if nullif(btrim(v_item ->> 'full_name'), '') is null then
      v_counts := jsonb_set(v_counts, '{invalid}', to_jsonb((v_counts ->> 'invalid')::int + 1));
      continue;
    end if;

    select id into v_teacher_id
    from public.teachers
    where school_id = p_school_id
      and lower(coalesce(nullif(btrim(full_name), ''), '')) = lower(btrim(v_item ->> 'full_name'))
      and status <> 'archived'
    order by created_at
    limit 1;

    if v_teacher_id is null and p_dry_run then
      v_teacher_ids := jsonb_set(v_teacher_ids, array[v_key], to_jsonb(v_key), true);
    elsif v_teacher_id is null then
      insert into public.teachers (school_id, profile_id, full_name, email, disciplina, status)
      values (
        p_school_id,
        null,
        btrim(v_item ->> 'full_name'),
        nullif(btrim(v_item ->> 'email'), ''),
        nullif(btrim(v_item ->> 'disciplina'), ''),
        coalesce(nullif(btrim(v_item ->> 'status'), ''), 'active')
      )
      returning id into v_teacher_id;
      v_counts := jsonb_set(v_counts, '{teachers_created}', to_jsonb((v_counts ->> 'teachers_created')::int + 1));
    elsif v_teacher_id is not null then
      v_counts := jsonb_set(v_counts, '{existing}', to_jsonb((v_counts ->> 'existing')::int + 1));
    end if;

    if v_teacher_id is not null then
      v_teacher_ids := jsonb_set(v_teacher_ids, array[v_key], to_jsonb(v_teacher_id::text), true);
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_package -> 'students', '[]'::jsonb)) loop
    v_key := lower(btrim(v_item ->> 'full_name'));
    if nullif(btrim(v_item ->> 'full_name'), '') is null or nullif(btrim(v_item ->> 'class_name'), '') is null then
      v_counts := jsonb_set(v_counts, '{invalid}', to_jsonb((v_counts ->> 'invalid')::int + 1));
      continue;
    end if;

    select id into v_student_id
    from public.students
    where school_id = p_school_id
      and lower(btrim(nome)) = lower(btrim(v_item ->> 'full_name'))
      and status <> 'archived'
    order by created_at
    limit 1;

    if v_student_id is null and p_dry_run then
      v_student_ids := jsonb_set(v_student_ids, array[v_key], to_jsonb(v_key), true);
    elsif v_student_id is null then
      if (v_class_ids ->> (lower(btrim(v_item ->> 'class_name')) || '|' || coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year))) is null then
        v_counts := jsonb_set(v_counts, '{invalid}', to_jsonb((v_counts ->> 'invalid')::int + 1));
        continue;
      end if;

      insert into public.students (school_id, class_id, nome, data_nascimento, status, turma)
      values (
        p_school_id,
        (v_class_ids ->> (lower(btrim(v_item ->> 'class_name')) || '|' || coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year)))::uuid,
        btrim(v_item ->> 'full_name'),
        nullif(btrim(v_item ->> 'birth_date'), '')::date,
        coalesce(nullif(btrim(v_item ->> 'status'), ''), 'active'),
        btrim(v_item ->> 'class_name')
      )
      returning id into v_student_id;
      v_counts := jsonb_set(v_counts, '{students_created}', to_jsonb((v_counts ->> 'students_created')::int + 1));
    elsif v_student_id is not null then
      v_counts := jsonb_set(v_counts, '{existing}', to_jsonb((v_counts ->> 'existing')::int + 1));
    end if;

    if v_student_id is not null then
      v_student_ids := jsonb_set(v_student_ids, array[v_key], to_jsonb(v_student_id::text), true);
    end if;

    if v_student_id is not null then
      select id into v_enrollment_id
      from public.enrollments
      where school_id = p_school_id
        and student_id = v_student_id
        and class_id = (v_class_ids ->> (lower(btrim(v_item ->> 'class_name')) || '|' || coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year)))::uuid
        and school_year = coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year)
        and status = 'active'
      order by created_at
      limit 1;

      if v_enrollment_id is null and not p_dry_run then
        insert into public.enrollments (student_id, class_id, school_id, school_year, status)
        values (
          v_student_id,
          (v_class_ids ->> (lower(btrim(v_item ->> 'class_name')) || '|' || coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year)))::uuid,
          p_school_id,
          coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year),
          'active'
        )
        returning id into v_enrollment_id;
        v_counts := jsonb_set(v_counts, '{enrollments_created}', to_jsonb((v_counts ->> 'enrollments_created')::int + 1));
      elsif v_enrollment_id is not null then
        v_counts := jsonb_set(v_counts, '{existing}', to_jsonb((v_counts ->> 'existing')::int + 1));
      end if;
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_package -> 'teacher_classes', '[]'::jsonb)) loop
    if p_dry_run and (v_teacher_ids ? lower(btrim(v_item ->> 'teacher_email')))
      and (v_class_ids ? (lower(btrim(v_item ->> 'class_name')) || '|' || coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year))) then
      continue;
    end if;

    v_teacher_id := (v_teacher_ids ->> lower(btrim(v_item ->> 'teacher_email')))::uuid;
    v_class_id := (v_class_ids ->> (lower(btrim(v_item ->> 'class_name')) || '|' || coalesce(nullif(btrim(v_item ->> 'school_year'), ''), v_school_year)))::uuid;
    if not p_dry_run and (v_teacher_id is null or v_class_id is null) then
      v_counts := jsonb_set(v_counts, '{invalid}', to_jsonb((v_counts ->> 'invalid')::int + 1));
      continue;
    end if;

    select id into v_link_id
    from public.class_teacher_memberships
    where teacher_id = v_teacher_id
      and class_id = v_class_id
      and status = 'active'
    order by created_at
    limit 1;

    if v_link_id is null and not p_dry_run then
      insert into public.class_teacher_memberships (teacher_id, class_id, role, status)
      values (
        v_teacher_id,
        v_class_id,
        coalesce(nullif(btrim(v_item ->> 'role'), ''), 'principal'),
        'active'
      )
      returning id into v_link_id;
      v_counts := jsonb_set(v_counts, '{teacher_links_created}', to_jsonb((v_counts ->> 'teacher_links_created')::int + 1));
    elsif v_link_id is not null then
      v_counts := jsonb_set(v_counts, '{existing}', to_jsonb((v_counts ->> 'existing')::int + 1));
    end if;
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_package -> 'guardians', '[]'::jsonb)) loop
    v_key := lower(coalesce(nullif(btrim(v_item ->> 'email'), ''), btrim(v_item ->> 'guardian_name')));
    if p_dry_run and (v_student_ids ? lower(btrim(v_item ->> 'student_reference'))) then
      continue;
    end if;

    v_student_id := (v_student_ids ->> lower(btrim(v_item ->> 'student_reference')))::uuid;
    if nullif(btrim(v_item ->> 'guardian_name'), '') is null or (not p_dry_run and v_student_id is null) then
      v_counts := jsonb_set(v_counts, '{invalid}', to_jsonb((v_counts ->> 'invalid')::int + 1));
      continue;
    end if;

    select id into v_guardian_id
    from public.guardians
    where school_id = p_school_id
      and lower(coalesce(nullif(btrim(email), ''), btrim(full_name))) = v_key
      and status <> 'archived'
    order by created_at
    limit 1;

    if v_guardian_id is null and not p_dry_run then
      insert into public.guardians (school_id, profile_id, full_name, email, phone, status, access_status)
      values (
        p_school_id,
        null,
        btrim(v_item ->> 'guardian_name'),
        nullif(btrim(v_item ->> 'email'), ''),
        nullif(btrim(v_item ->> 'phone'), ''),
        coalesce(nullif(btrim(v_item ->> 'status'), ''), 'active'),
        'not_configured'
      )
      returning id into v_guardian_id;
      v_counts := jsonb_set(v_counts, '{guardians_created}', to_jsonb((v_counts ->> 'guardians_created')::int + 1));
    elsif v_guardian_id is not null then
      v_counts := jsonb_set(v_counts, '{existing}', to_jsonb((v_counts ->> 'existing')::int + 1));
    end if;

    if v_guardian_id is not null then
      v_guardian_ids := jsonb_set(v_guardian_ids, array[v_key], to_jsonb(v_guardian_id::text), true);

      select id into v_link_id
      from public.student_guardian_links
      where student_id = v_student_id
        and guardian_id = v_guardian_id
        and relationship = coalesce(nullif(btrim(v_item ->> 'relationship'), ''), 'responsavel')
        and status = 'active'
      order by created_at
      limit 1;

      if v_link_id is null and not p_dry_run then
        insert into public.student_guardian_links (student_id, guardian_id, relationship, is_primary, status)
        values (
          v_student_id,
          v_guardian_id,
          coalesce(nullif(btrim(v_item ->> 'relationship'), ''), 'responsavel'),
          coalesce((v_item ->> 'is_primary')::boolean, false),
          'active'
        )
        returning id into v_link_id;
        v_counts := jsonb_set(v_counts, '{family_links_created}', to_jsonb((v_counts ->> 'family_links_created')::int + 1));
      elsif v_link_id is not null then
        v_counts := jsonb_set(v_counts, '{existing}', to_jsonb((v_counts ->> 'existing')::int + 1));
      end if;
    end if;
  end loop;

  if (v_counts ->> 'invalid')::int > 0 then
    if not p_dry_run then
      raise exception 'Pacote contem registros invalidos.' using errcode = '22023';
    end if;
  end if;

  if not p_dry_run then
    update public.rs_school_installations
       set current_stage = case
             when (v_counts ->> 'classes_created')::int > 0
              and (v_counts ->> 'teachers_created')::int > 0
              and (v_counts ->> 'students_created')::int > 0
              and (v_counts ->> 'enrollments_created')::int > 0
              and (v_counts ->> 'guardians_created')::int > 0
              and (v_counts ->> 'family_links_created')::int > 0
             then 'pronta_para_validacao'
             else 'dados_parciais'
           end,
           validation_status = 'pending',
           updated_at = now()
     where school_id = p_school_id;

    insert into public.admin_school_deployment_events (
      admin_user_id,
      school_id,
      school_code,
      action,
      stage,
      result,
      reason
    ) values (
      v_admin_user_id,
      p_school_id,
      v_school_code,
      'school_import_confirmed',
      'dados_parciais',
      'created',
      jsonb_build_object(
        'package', v_package_version,
        'processed', jsonb_array_length(coalesce(p_package -> 'classes', '[]'::jsonb))
          + jsonb_array_length(coalesce(p_package -> 'teachers', '[]'::jsonb))
          + jsonb_array_length(coalesce(p_package -> 'teacher_classes', '[]'::jsonb))
          + jsonb_array_length(coalesce(p_package -> 'students', '[]'::jsonb))
          + jsonb_array_length(coalesce(p_package -> 'guardians', '[]'::jsonb)),
        'created', v_counts,
        'failures', 0
      )::text
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'dry_run', p_dry_run,
    'school_id', p_school_id,
    'school_code', v_school_code,
    'school_year', v_school_year,
    'package_version', v_package_version,
    'counts', v_counts
  );
end;
$$;

REVOKE ALL ON FUNCTION public.secretaria_create_teacher(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_create_teacher(uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.secretaria_create_teacher(uuid, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.secretaria_create_teacher(uuid, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.secretaria_create_class(uuid, text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_create_class(uuid, text, text, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.secretaria_create_guardian_link(uuid, text, text, text, text, text, boolean, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_create_guardian_link(uuid, text, text, text, text, text, boolean, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.secretaria_create_student_enrollment(text, date, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_create_student_enrollment(text, date, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.secretaria_link_teacher_to_class(uuid, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_link_teacher_to_class(uuid, uuid, text, text) FROM anon;

REVOKE ALL ON FUNCTION public.admin_confirm_rs_school_import(uuid, jsonb, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_confirm_rs_school_import(uuid, jsonb, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.admin_confirm_rs_school_import(uuid, jsonb, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_confirm_rs_school_import(uuid, jsonb, boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_confirm_rs_school_import(uuid, jsonb, boolean) IS
  'Admin/TI assisted RS-SCHOOL V1 import. Validates a controlled package, imports institutional records idempotently, and does not create Auth users or secrets.';
