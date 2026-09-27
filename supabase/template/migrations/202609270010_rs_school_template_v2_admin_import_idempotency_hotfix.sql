-- HOTFIX VISTORIA 01C — Admin bulk import idempotency classification.
-- Existing rows must not be counted as new on reimport. Identical persisted
-- schools are classified as unchanged; changed existing schools as updates.

create or replace function public.admin_preview_network_bulk_import(
  p_rows jsonb,
  p_source_format text default 'CSV',
  p_import_type text default 'auto',
  p_school_year text default '2026',
  p_column_mapping jsonb default '{}'::jsonb,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_batch public.admin_network_bulk_import_batches%rowtype;
  v_row jsonb;
  v_row_errors jsonb;
  v_row_number integer := 0;
  v_total integer := 0;
  v_invalid integer := 0;
  v_duplicate integer := 0;
  v_new integer := 0;
  v_updates integer := 0;
  v_unchanged integer := 0;
  v_seen text[] := array[]::text[];
  v_errors jsonb := '[]'::jsonb;
  v_type text;
  v_school_code text;
  v_school_name text;
  v_class_name text;
  v_student_name text;
  v_teacher_name text;
  v_teacher_email text;
  v_guardian_name text;
  v_guardian_email text;
  v_municipio text;
  v_estado text;
  v_diretor text;
  v_key text;
  v_school_id uuid;
  v_exists boolean;
  v_existing_school_name text;
  v_existing_school_code text;
  v_existing_municipio text;
  v_existing_estado text;
  v_existing_diretor text;
  v_counts jsonb := jsonb_build_object(
    'schools', 0,
    'classes', 0,
    'teachers', 0,
    'students', 0,
    'guardians', 0,
    'enrollments', 0,
    'teacher_class_links', 0,
    'guardian_student_links', 0
  );
begin
  if not public.is_platform_admin() then
    raise exception 'Perfil Admin/TI obrigatorio para importar rede.' using errcode = '42501';
  end if;

  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'Linhas CSV/XLSX devem chegar como array JSON ja parseado pela interface.' using errcode = '22023';
  end if;

  if p_idempotency_key is not null then
    select * into v_batch
    from public.admin_network_bulk_import_batches
    where idempotency_key = p_idempotency_key;

    if v_batch.id is not null then
      return jsonb_build_object(
        'batch_id', v_batch.id,
        'status', v_batch.status,
        'idempotent_replay', true,
        'report', v_batch.preview_report,
        'errors', v_batch.errors
      );
    end if;
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_row_number := v_row_number + 1;
    v_total := v_total + 1;
    v_row_errors := '[]'::jsonb;
    v_type := lower(btrim(coalesce(
      nullif(v_row ->> 'tipo', ''),
      nullif(v_row ->> 'entity_type', ''),
      nullif(v_row ->> 'entidade', ''),
      nullif(v_row ->> 'tipo_de_importacao', ''),
      nullif(p_import_type, ''),
      'auto'
    )));
    v_type := translate(v_type, 'áàãâéêíóôõúç', 'aaaaeeiooouc');
    v_school_code := nullif(btrim(coalesce(
      v_row ->> 'codigo_escola',
      v_row ->> 'codigo_da_escola',
      v_row ->> 'cod_escola',
      v_row ->> 'codigo_unidade',
      v_row ->> 'school_code',
      v_row ->> 'codigo_inep',
      v_row ->> 'cod_inep',
      v_row ->> 'codigo',
      v_row ->> 'Código',
      v_row ->> 'Codigo',
      v_row ->> 'Código da Escola',
      v_row ->> 'Codigo da Escola',
      v_row ->> 'inep'
    )), '');
    v_school_name := nullif(btrim(coalesce(
      v_row ->> 'nome_escola',
      v_row ->> 'nome_da_escola',
      v_row ->> 'nome_unidade',
      v_row ->> 'nome_da_unidade',
      v_row ->> 'unidade_escolar',
      v_row ->> 'school_name',
      v_row ->> 'Nome da Escola',
      v_row ->> 'Nome Escola',
      v_row ->> 'Nome da Unidade',
      v_row ->> 'escola'
    )), '');
    v_class_name := nullif(btrim(coalesce(v_row ->> 'nome_turma', v_row ->> 'nome_da_turma', v_row ->> 'class_name', v_row ->> 'Nome da Turma', v_row ->> 'turma')), '');
    v_student_name := nullif(btrim(coalesce(v_row ->> 'nome_aluno', v_row ->> 'nome_do_aluno', v_row ->> 'student_name', v_row ->> 'Nome do Aluno', v_row ->> 'aluno')), '');
    v_teacher_name := nullif(btrim(coalesce(v_row ->> 'nome_professor', v_row ->> 'nome_do_professor', v_row ->> 'teacher_name', v_row ->> 'Nome do Professor', v_row ->> 'professor')), '');
    v_teacher_email := nullif(btrim(coalesce(v_row ->> 'email_professor', v_row ->> 'email_do_professor', v_row ->> 'e_mail_professor', v_row ->> 'teacher_email', v_row ->> 'E-mail do Professor', v_row ->> 'Email do Professor')), '');
    v_guardian_name := nullif(btrim(coalesce(v_row ->> 'nome_responsavel', v_row ->> 'nome_do_responsavel', v_row ->> 'guardian_name', v_row ->> 'Nome do Responsável', v_row ->> 'Nome do Responsavel', v_row ->> 'responsavel')), '');
    v_guardian_email := nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'email_do_responsavel', v_row ->> 'e_mail_responsavel', v_row ->> 'guardian_email', v_row ->> 'E-mail do Responsável', v_row ->> 'Email do Responsavel')), '');
    v_municipio := nullif(btrim(coalesce(v_row ->> 'municipio', v_row ->> 'Município', v_row ->> 'Municipio', v_row ->> 'cidade', v_row ->> 'city')), '');
    v_estado := nullif(upper(btrim(coalesce(v_row ->> 'estado', v_row ->> 'Estado', v_row ->> 'uf', v_row ->> 'UF'))), '');
    v_diretor := nullif(btrim(coalesce(v_row ->> 'diretor', v_row ->> 'Diretor', v_row ->> 'diretora', v_row ->> 'Diretora', v_row ->> 'principal')), '');

    if v_type = 'auto' then
      v_type := case
        when v_school_name is not null and v_class_name is null and v_student_name is null and v_teacher_name is null and v_guardian_name is null then 'school'
        when v_class_name is not null and v_student_name is null and v_teacher_name is null and v_guardian_name is null then 'class'
        when v_teacher_name is not null and v_class_name is null then 'teacher'
        when v_student_name is not null and v_guardian_name is null then 'student'
        when v_guardian_name is not null and v_student_name is null then 'guardian'
        when v_teacher_name is not null and v_class_name is not null then 'teacher_class_link'
        when v_guardian_name is not null and v_student_name is not null then 'guardian_student_link'
        else 'unknown'
      end;
    end if;

    v_type := case
      when v_type in ('school', 'schools', 'escola', 'escolas') then 'school'
      when v_type in ('class', 'classes', 'turma', 'turmas') then 'class'
      when v_type in ('teacher', 'teachers', 'professor', 'professores') then 'teacher'
      when v_type in ('student', 'students', 'aluno', 'alunos') then 'student'
      when v_type in ('guardian', 'guardians', 'responsavel', 'responsaveis') then 'guardian'
      when v_type in ('enrollment', 'enrollments', 'matricula', 'matriculas') then 'enrollment'
      when v_type in ('teacher_class', 'teacher_class_link', 'vinculo_professor_turma', 'professor_turma') then 'teacher_class_link'
      when v_type in ('guardian_student', 'guardian_student_link', 'vinculo_responsavel_aluno', 'responsavel_aluno') then 'guardian_student_link'
      else v_type
    end;

    if v_type not in ('school', 'class', 'teacher', 'student', 'guardian', 'enrollment', 'teacher_class_link', 'guardian_student_link') then
      v_invalid := v_invalid + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object(
        'row', v_row_number,
        'field', 'Tipo',
        'error', 'UNSUPPORTED_ENTITY',
        'message', 'Tipo de importação não reconhecido. Selecione Escolas, Turmas, Professores, Alunos, Responsáveis, Matrículas ou Vínculos.'
      ));
      continue;
    end if;

    if v_type <> 'school' and v_school_code is null then
      v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object(
        'row', v_row_number,
        'field', 'Código da Escola',
        'error', 'REQUIRED',
        'message', 'Informe o código da escola para vincular esta linha à unidade correta.'
      ));
    end if;

    if v_type = 'school' then
      if v_school_name is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome da Escola', 'error', 'REQUIRED', 'message', 'Informe o nome oficial da escola.'));
      end if;
      if v_school_code is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Código', 'error', 'REQUIRED', 'message', 'Informe um código único para a escola.'));
      end if;
    elsif v_type = 'class' and v_class_name is null then
      v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome da Turma', 'error', 'REQUIRED', 'message', 'Informe o nome da turma.'));
    elsif v_type = 'teacher' and coalesce(v_teacher_name, v_teacher_email) is null then
      v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome/E-mail do Professor', 'error', 'REQUIRED', 'message', 'Informe o nome ou o e-mail do professor.'));
    elsif v_type = 'student' and v_student_name is null then
      v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome do Aluno', 'error', 'REQUIRED', 'message', 'Informe o nome do aluno.'));
    elsif v_type = 'guardian' and coalesce(v_guardian_name, v_guardian_email) is null then
      v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome/E-mail do Responsável', 'error', 'REQUIRED', 'message', 'Informe o nome ou o e-mail do responsável.'));
    elsif v_type = 'enrollment' then
      if v_student_name is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome do Aluno', 'error', 'REQUIRED', 'message', 'Informe o aluno da matrícula.'));
      end if;
      if v_class_name is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome da Turma', 'error', 'REQUIRED', 'message', 'Informe a turma da matrícula.'));
      end if;
    elsif v_type = 'teacher_class_link' then
      if coalesce(v_teacher_name, v_teacher_email) is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome/E-mail do Professor', 'error', 'REQUIRED', 'message', 'Informe o professor do vínculo.'));
      end if;
      if v_class_name is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome da Turma', 'error', 'REQUIRED', 'message', 'Informe a turma do vínculo.'));
      end if;
    elsif v_type = 'guardian_student_link' then
      if coalesce(v_guardian_name, v_guardian_email) is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome/E-mail do Responsável', 'error', 'REQUIRED', 'message', 'Informe o responsável do vínculo.'));
      end if;
      if v_student_name is null then
        v_row_errors := v_row_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Nome do Aluno', 'error', 'REQUIRED', 'message', 'Informe o aluno do vínculo.'));
      end if;
    end if;

    if jsonb_array_length(v_row_errors) > 0 then
      v_invalid := v_invalid + 1;
      v_errors := v_errors || v_row_errors;
      continue;
    end if;

    v_key := v_type || '|' || coalesce(lower(v_school_code), '') || '|' || lower(coalesce(v_school_name, v_class_name, v_student_name, v_teacher_email, v_teacher_name, v_guardian_email, v_guardian_name, ''));
    if v_key = any(v_seen) then
      v_duplicate := v_duplicate + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'Linha', 'error', 'DUPLICATE_IN_FILE', 'message', 'Esta linha repete outro registro do mesmo arquivo.'));
      continue;
    end if;
    v_seen := array_append(v_seen, v_key);

    v_counts := jsonb_set(v_counts, array[
      case v_type
        when 'school' then 'schools'
        when 'class' then 'classes'
        when 'teacher' then 'teachers'
        when 'student' then 'students'
        when 'guardian' then 'guardians'
        when 'enrollment' then 'enrollments'
        when 'teacher_class_link' then 'teacher_class_links'
        else 'guardian_student_links'
      end
    ], to_jsonb(coalesce((v_counts ->> case v_type
        when 'school' then 'schools'
        when 'class' then 'classes'
        when 'teacher' then 'teachers'
        when 'student' then 'students'
        when 'guardian' then 'guardians'
        when 'enrollment' then 'enrollments'
        when 'teacher_class_link' then 'teacher_class_links'
        else 'guardian_student_links'
      end)::integer, 0) + 1), true);

    v_school_id := null;
    v_existing_school_name := null;
    v_existing_school_code := null;
    v_existing_municipio := null;
    v_existing_estado := null;
    v_existing_diretor := null;

    select s.id, s.nome, s.codigo_inep, s.municipio, s.estado, s.diretor
      into v_school_id, v_existing_school_name, v_existing_school_code, v_existing_municipio, v_existing_estado, v_existing_diretor
    from public.schools s
    where lower(btrim(coalesce(s.codigo_inep, ''))) = lower(coalesce(v_school_code, ''))
       or (v_type = 'school' and lower(btrim(s.nome)) = lower(coalesce(v_school_name, '')))
    order by s.created_at
    limit 1;

    if v_type = 'school' then
      v_exists := v_school_id is not null;
    elsif v_type = 'class' then
      select exists(select 1 from public.classes c where c.school_id = v_school_id and lower(btrim(c.nome)) = lower(v_class_name) and c.status <> 'archived') into v_exists;
    elsif v_type = 'teacher' then
      select exists(select 1 from public.teachers t where t.school_id = v_school_id and lower(coalesce(nullif(btrim(t.email), ''), nullif(btrim(t.full_name), ''))) = lower(coalesce(v_teacher_email, v_teacher_name)) and t.status <> 'archived') into v_exists;
    elsif v_type = 'student' then
      select exists(select 1 from public.students s where s.school_id = v_school_id and lower(btrim(s.nome)) = lower(v_student_name) and coalesce(s.status, 'active') <> 'archived') into v_exists;
    elsif v_type = 'guardian' then
      select exists(select 1 from public.guardians g where g.school_id = v_school_id and lower(coalesce(nullif(btrim(g.email), ''), btrim(g.full_name))) = lower(coalesce(v_guardian_email, v_guardian_name)) and g.status <> 'archived') into v_exists;
    else
      v_exists := false;
    end if;

    if v_exists and v_type = 'school' then
      if lower(btrim(coalesce(v_existing_school_name, ''))) = lower(btrim(coalesce(v_school_name, '')))
        and lower(btrim(coalesce(v_existing_school_code, ''))) = lower(btrim(coalesce(v_school_code, '')))
        and (v_municipio is null or lower(btrim(coalesce(v_existing_municipio, ''))) = lower(btrim(v_municipio)))
        and (v_estado is null or upper(btrim(coalesce(v_existing_estado, ''))) = upper(btrim(v_estado)))
        and (v_diretor is null or lower(btrim(coalesce(v_existing_diretor, ''))) = lower(btrim(v_diretor))) then
        v_unchanged := v_unchanged + 1;
      else
        v_updates := v_updates + 1;
      end if;
    elsif v_exists then
      v_updates := v_updates + 1;
    else
      v_new := v_new + 1;
    end if;
  end loop;

  insert into public.admin_network_bulk_import_batches (
    source_format,
    import_type,
    school_year,
    status,
    payload,
    column_mapping,
    preview_report,
    errors,
    idempotency_key,
    created_by
  ) values (
    upper(coalesce(nullif(p_source_format, ''), 'CSV')),
    lower(coalesce(nullif(p_import_type, ''), 'auto')),
    coalesce(nullif(p_school_year, ''), '2026'),
    case when v_invalid = 0 and v_duplicate = 0 then 'validated' else 'draft' end,
    p_rows,
    coalesce(p_column_mapping, '{}'::jsonb),
    jsonb_build_object(
      'total_rows', v_total,
      'valid_rows', greatest(v_total - v_invalid - v_duplicate, 0),
      'invalid_rows', v_invalid,
      'duplicate_rows', v_duplicate,
      'new_rows', v_new,
      'update_rows', v_updates,
      'unchanged_existing', v_unchanged,
      'counts', v_counts,
      'requires_confirmation', true,
      'canonical_engine', 'admin_confirm_rs_school_import'
    ),
    v_errors,
    p_idempotency_key,
    auth.uid()
  )
  returning * into v_batch;

  return jsonb_build_object(
    'batch_id', v_batch.id,
    'status', v_batch.status,
    'report', v_batch.preview_report,
    'errors', v_batch.errors
  );
end;
$$;

revoke all on function public.admin_preview_network_bulk_import(jsonb, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.admin_preview_network_bulk_import(jsonb, text, text, text, jsonb, text) to authenticated;

comment on function public.admin_preview_network_bulk_import(jsonb, text, text, text, jsonb, text) is
  'Admin hotfix: accepts official/friendly/literal spreadsheet headers, returns row-level human-readable errors, and classifies existing school reimports idempotently.';
