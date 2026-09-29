-- HOTFIX CRITICO — Importacao unificada: roteamento estrito por entidade.
-- Referencias usadas para localizar dependencias entre abas nao podem fazer
-- uma linha alimentar outro contrato. Ex.: RESPONSAVEL_ALUNO.student_name
-- resolve aluno ja criado, mas nao cria aluno novamente.

create or replace function public.admin_confirm_network_bulk_import(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_batch public.admin_network_bulk_import_batches%rowtype;
  v_row jsonb;
  v_school_code text;
  v_school_name text;
  v_school_year text;
  v_type text;
  v_school_id uuid;
  v_packages jsonb := '{}'::jsonb;
  v_package jsonb;
  v_report jsonb;
  v_reports jsonb := '[]'::jsonb;
  v_school_created integer := 0;
  v_school_existing integer := 0;
  v_key text;
  v_raw_relationship text;
  v_relationship text;
  v_student_reference text;
begin
  if not public.is_platform_admin() then
    raise exception 'Perfil Admin/TI obrigatorio para confirmar importacao de rede.' using errcode = '42501';
  end if;

  select * into v_batch
  from public.admin_network_bulk_import_batches
  where id = p_batch_id;

  if v_batch.id is null then
    raise exception 'Lote de implantacao nao encontrado.' using errcode = '22023';
  end if;

  if v_batch.status = 'confirmed' then
    return jsonb_build_object(
      'batch_id', v_batch.id,
      'status', 'confirmed',
      'idempotent_replay', true,
      'report', v_batch.preview_report
    );
  end if;

  if v_batch.status <> 'validated' then
    raise exception 'Somente lotes validados podem ser confirmados.' using errcode = '22023';
  end if;

  v_school_year := coalesce(nullif(v_batch.school_year, ''), '2026');

  for v_row in select * from jsonb_array_elements(v_batch.payload) loop
    v_type := lower(btrim(coalesce(v_row ->> 'tipo', v_row ->> 'entity_type', v_row ->> 'entidade', v_batch.import_type, 'auto')));
    v_type := translate(v_type, 'áàãâéêíóôõúç', 'aaaaeeiooouc');
    v_school_code := nullif(btrim(coalesce(v_row ->> 'codigo_escola', v_row ->> 'school_code', v_row ->> 'codigo_inep', v_row ->> 'inep')), '');
    v_school_name := nullif(btrim(coalesce(v_row ->> 'nome_escola', v_row ->> 'school_name', v_row ->> 'escola')), '');

    if v_type in ('school', 'schools', 'escola', 'escolas') then
      select id into v_school_id
      from public.schools
      where lower(btrim(coalesce(codigo_inep, ''))) = lower(v_school_code)
         or lower(btrim(nome)) = lower(v_school_name)
      order by created_at
      limit 1;

      if v_school_id is null then
        insert into public.schools (nome, codigo_inep, municipio, estado, diretor, status)
        values (
          v_school_name,
          v_school_code,
          nullif(btrim(coalesce(v_row ->> 'municipio', v_row ->> 'city')), ''),
          nullif(btrim(coalesce(v_row ->> 'estado', v_row ->> 'uf')), ''),
          nullif(btrim(coalesce(v_row ->> 'diretor', v_row ->> 'principal')), ''),
          'inactive'
        )
        returning id into v_school_id;

        insert into public.rs_school_installations (
          school_id,
          school_code,
          deployment_mode,
          schema_version,
          package_version,
          school_year,
          current_stage,
          validation_status,
          created_by
        ) values (
          v_school_id,
          v_school_code,
          'production',
          'RS-SCHOOL-TEMPLATE V1',
          'RS-SCHOOL-V1-DEPLOYMENT-2026-09-01',
          v_school_year,
          'em_configuracao',
          'pending',
          auth.uid()
        )
        on conflict (school_id) do nothing;

        v_school_created := v_school_created + 1;
      else
        v_school_existing := v_school_existing + 1;
      end if;
    end if;
  end loop;

  for v_row in select * from jsonb_array_elements(v_batch.payload) loop
    v_type := lower(btrim(coalesce(v_row ->> 'tipo', v_row ->> 'entity_type', v_row ->> 'entidade', v_batch.import_type, 'auto')));
    v_type := translate(v_type, 'áàãâéêíóôõúç', 'aaaaeeiooouc');
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

    if v_type = 'school' then
      continue;
    end if;

    v_school_code := nullif(btrim(coalesce(v_row ->> 'codigo_escola', v_row ->> 'school_code', v_row ->> 'codigo_inep', v_row ->> 'inep')), '');
    if v_school_code is null then
      continue;
    end if;

    if not (v_packages ? v_school_code) then
      v_packages := jsonb_set(v_packages, array[v_school_code], jsonb_build_object(
        'package_version', 'RS-SCHOOL-V1-DEPLOYMENT-2026-09-01',
        'schema_version', 'RS-SCHOOL-TEMPLATE V1',
        'school_year', v_school_year,
        'classes', '[]'::jsonb,
        'teachers', '[]'::jsonb,
        'teacher_classes', '[]'::jsonb,
        'students', '[]'::jsonb,
        'guardians', '[]'::jsonb
      ), true);
    end if;

    if v_type = 'class' and nullif(btrim(coalesce(v_row ->> 'nome_turma', v_row ->> 'class_name', v_row ->> 'turma')), '') is not null then
      v_packages := jsonb_set(v_packages, array[v_school_code, 'classes'],
        coalesce(v_packages #> array[v_school_code, 'classes'], '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'class_name', btrim(coalesce(v_row ->> 'nome_turma', v_row ->> 'class_name', v_row ->> 'turma')),
          'school_year', coalesce(nullif(btrim(coalesce(v_row ->> 'ano_letivo', v_row ->> 'school_year')), ''), v_school_year),
          'status', 'active',
          'age_group', nullif(btrim(coalesce(v_row ->> 'faixa_etaria', v_row ->> 'age_group')), ''),
          'shift', nullif(btrim(coalesce(v_row ->> 'turno', v_row ->> 'shift')), ''),
          'grade', nullif(btrim(coalesce(v_row ->> 'ano_serie', v_row ->> 'grade')), '')
        )), true);
    end if;

    if v_type = 'teacher' and coalesce(nullif(btrim(coalesce(v_row ->> 'nome_professor', v_row ->> 'teacher_name', v_row ->> 'professor')), ''), nullif(btrim(coalesce(v_row ->> 'email_professor', v_row ->> 'teacher_email')), '')) is not null then
      v_packages := jsonb_set(v_packages, array[v_school_code, 'teachers'],
        coalesce(v_packages #> array[v_school_code, 'teachers'], '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'full_name', coalesce(nullif(btrim(coalesce(v_row ->> 'nome_professor', v_row ->> 'teacher_name', v_row ->> 'professor')), ''), nullif(btrim(coalesce(v_row ->> 'email_professor', v_row ->> 'teacher_email')), '')),
          'email', nullif(btrim(coalesce(v_row ->> 'email_professor', v_row ->> 'teacher_email')), ''),
          'disciplina', nullif(btrim(coalesce(v_row ->> 'componente', v_row ->> 'disciplina')), ''),
          'status', 'active'
        )), true);
    end if;

    if v_type = 'teacher_class_link' then
      v_packages := jsonb_set(v_packages, array[v_school_code, 'teacher_classes'],
        coalesce(v_packages #> array[v_school_code, 'teacher_classes'], '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'teacher_email', coalesce(nullif(btrim(coalesce(v_row ->> 'email_professor', v_row ->> 'teacher_email')), ''), nullif(btrim(coalesce(v_row ->> 'nome_professor', v_row ->> 'teacher_name', v_row ->> 'professor')), '')),
          'class_name', btrim(coalesce(v_row ->> 'nome_turma', v_row ->> 'class_name', v_row ->> 'turma')),
          'school_year', coalesce(nullif(btrim(coalesce(v_row ->> 'ano_letivo', v_row ->> 'school_year')), ''), v_school_year),
          'role', coalesce(nullif(btrim(coalesce(v_row ->> 'funcao', v_row ->> 'role')), ''), 'principal')
        )), true);
    end if;

    if v_type = 'student' and nullif(btrim(coalesce(v_row ->> 'nome_aluno', v_row ->> 'student_name', v_row ->> 'aluno')), '') is not null then
      v_packages := jsonb_set(v_packages, array[v_school_code, 'students'],
        coalesce(v_packages #> array[v_school_code, 'students'], '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'full_name', btrim(coalesce(v_row ->> 'nome_aluno', v_row ->> 'student_name', v_row ->> 'aluno')),
          'birth_date', nullif(btrim(coalesce(v_row ->> 'data_nascimento', v_row ->> 'birth_date')), ''),
          'class_name', nullif(btrim(coalesce(v_row ->> 'nome_turma', v_row ->> 'class_name', v_row ->> 'turma')), ''),
          'school_year', coalesce(nullif(btrim(coalesce(v_row ->> 'ano_letivo', v_row ->> 'school_year')), ''), v_school_year),
          'status', 'active'
        )), true);
    end if;

    if v_type in ('guardian', 'guardian_student_link') and coalesce(nullif(btrim(coalesce(v_row ->> 'nome_responsavel', v_row ->> 'guardian_name', v_row ->> 'responsavel')), ''), nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'guardian_email')), '')) is not null then
      v_student_reference := nullif(btrim(coalesce(v_row ->> 'nome_aluno', v_row ->> 'student_name', v_row ->> 'aluno')), '');

      if v_type <> 'guardian_student_link' then
        continue;
      end if;

      v_raw_relationship := nullif(btrim(coalesce(v_row ->> 'parentesco', v_row ->> 'relationship')), '');
      v_relationship := coalesce(public.admin_normalize_guardian_relationship(v_raw_relationship), case when v_raw_relationship is null then 'responsavel' else null end);
      if v_relationship is null then
        raise exception 'Vinculo de responsavel invalido para %. Use Mae, Pai, Responsavel, Avo, Tutor ou Outro.', coalesce(nullif(btrim(coalesce(v_row ->> 'nome_responsavel', v_row ->> 'guardian_name', v_row ->> 'responsavel')), ''), nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'guardian_email')), ''))
          using errcode = '22023';
      end if;

      v_packages := jsonb_set(v_packages, array[v_school_code, 'guardians'],
        coalesce(v_packages #> array[v_school_code, 'guardians'], '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'guardian_name', coalesce(nullif(btrim(coalesce(v_row ->> 'nome_responsavel', v_row ->> 'guardian_name', v_row ->> 'responsavel')), ''), nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'guardian_email')), '')),
          'email', nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'guardian_email')), ''),
          'phone', nullif(btrim(coalesce(v_row ->> 'telefone_responsavel', v_row ->> 'phone')), ''),
          'relationship', v_relationship,
          'student_reference', v_student_reference,
          'status', 'active',
          'is_primary', case lower(btrim(coalesce(v_row ->> 'principal', v_row ->> 'is_primary', 'true')))
            when 'false' then false
            when 'falso' then false
            when 'nao' then false
            when 'não' then false
            when '0' then false
            else true
          end
        )), true);
    end if;
  end loop;

  for v_key, v_package in select key, value from jsonb_each(v_packages) loop
    select s.id into v_school_id
    from public.schools s
    where lower(btrim(coalesce(s.codigo_inep, ''))) = lower(v_key)
    order by s.created_at
    limit 1;

    if v_school_id is null then
      raise exception 'Escola do pacote nao encontrada: %', v_key using errcode = '22023';
    end if;

    v_report := public.admin_confirm_rs_school_import(v_school_id, v_package, false);
    v_reports := v_reports || jsonb_build_array(jsonb_build_object(
      'school_code', v_key,
      'school_id', v_school_id,
      'report', v_report
    ));
  end loop;

  update public.admin_network_bulk_import_batches
     set status = 'confirmed',
         confirmed_by = auth.uid(),
         confirmed_at = now(),
         preview_report = preview_report || jsonb_build_object(
           'confirmed', true,
           'schools_created', v_school_created,
           'schools_existing', v_school_existing,
           'school_reports', v_reports
         )
   where id = v_batch.id
   returning * into v_batch;

  return jsonb_build_object(
    'batch_id', v_batch.id,
    'status', 'confirmed',
    'report', v_batch.preview_report,
    'errors', v_batch.errors
  );
end;
$$;

revoke all on function public.admin_confirm_network_bulk_import(uuid) from public, anon, authenticated;
grant execute on function public.admin_confirm_network_bulk_import(uuid) to authenticated;

comment on function public.admin_confirm_network_bulk_import(uuid) is
  'Admin hotfix: confirms network bulk implantation with strict entity routing between unified import sheets.';
