-- HOTFIX VISTORIA 01 - Admin operational network bulk import.
-- Turns Admin > Implantacao from dry-run-only into a confirmed UI workflow while
-- reusing the canonical RS-SCHOOL package importer.

create table if not exists public.admin_network_bulk_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_format text not null default 'CSV',
  import_type text not null default 'auto',
  school_year text not null default '2026',
  status text not null default 'draft',
  payload jsonb not null default '[]'::jsonb,
  column_mapping jsonb not null default '{}'::jsonb,
  preview_report jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  idempotency_key text,
  created_by uuid default auth.uid(),
  confirmed_by uuid,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint admin_network_bulk_import_batches_status_check
    check (status in ('draft', 'validated', 'confirmed', 'failed')),
  constraint admin_network_bulk_import_batches_source_check
    check (upper(source_format) in ('CSV', 'XLSX', 'JSON')),
  constraint admin_network_bulk_import_batches_payload_array
    check (jsonb_typeof(payload) = 'array'),
  constraint admin_network_bulk_import_batches_no_secret_check
    check (
      coalesce(payload::text, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and coalesce(preview_report::text, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and coalesce(errors::text, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    )
);

create unique index if not exists admin_network_bulk_import_batches_idempotency_idx
  on public.admin_network_bulk_import_batches (idempotency_key)
  where idempotency_key is not null;

create index if not exists admin_network_bulk_import_batches_created_idx
  on public.admin_network_bulk_import_batches (created_at desc);

drop trigger if exists admin_network_bulk_import_batches_touch_updated_at on public.admin_network_bulk_import_batches;
create trigger admin_network_bulk_import_batches_touch_updated_at
before update on public.admin_network_bulk_import_batches
for each row
execute function public.institutional_touch_updated_at();

alter table public.admin_network_bulk_import_batches enable row level security;

drop policy if exists admin_network_bulk_import_batches_admin_select on public.admin_network_bulk_import_batches;
create policy admin_network_bulk_import_batches_admin_select
on public.admin_network_bulk_import_batches
for select
to authenticated
using (public.is_platform_admin());

revoke all on table public.admin_network_bulk_import_batches from public, anon, authenticated;
grant select on table public.admin_network_bulk_import_batches to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.admin_network_bulk_import_batches to postgres, service_role;

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
  v_row_number integer := 0;
  v_total integer := 0;
  v_invalid integer := 0;
  v_duplicate integer := 0;
  v_new integer := 0;
  v_updates integer := 0;
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
  v_key text;
  v_school_id uuid;
  v_exists boolean;
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
    v_type := lower(btrim(coalesce(
      nullif(v_row ->> 'tipo', ''),
      nullif(v_row ->> 'entity_type', ''),
      nullif(v_row ->> 'entidade', ''),
      nullif(p_import_type, ''),
      'auto'
    )));
    v_type := translate(v_type, 'áàãâéêíóôõúç', 'aaaaeeiooouc');
    v_school_code := nullif(btrim(coalesce(v_row ->> 'codigo_escola', v_row ->> 'school_code', v_row ->> 'codigo_inep', v_row ->> 'inep')), '');
    v_school_name := nullif(btrim(coalesce(v_row ->> 'nome_escola', v_row ->> 'school_name', v_row ->> 'escola')), '');
    v_class_name := nullif(btrim(coalesce(v_row ->> 'nome_turma', v_row ->> 'class_name', v_row ->> 'turma')), '');
    v_student_name := nullif(btrim(coalesce(v_row ->> 'nome_aluno', v_row ->> 'student_name', v_row ->> 'aluno')), '');
    v_teacher_name := nullif(btrim(coalesce(v_row ->> 'nome_professor', v_row ->> 'teacher_name', v_row ->> 'professor')), '');
    v_teacher_email := nullif(btrim(coalesce(v_row ->> 'email_professor', v_row ->> 'teacher_email')), '');
    v_guardian_name := nullif(btrim(coalesce(v_row ->> 'nome_responsavel', v_row ->> 'guardian_name', v_row ->> 'responsavel')), '');
    v_guardian_email := nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'guardian_email')), '');

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
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'tipo', 'error', 'UNSUPPORTED_ENTITY'));
      continue;
    end if;

    if v_type <> 'school' and v_school_code is null then
      v_invalid := v_invalid + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'codigo_escola', 'error', 'REQUIRED'));
      continue;
    end if;

    if (v_type = 'school' and (v_school_name is null or v_school_code is null))
      or (v_type = 'class' and v_class_name is null)
      or (v_type = 'teacher' and coalesce(v_teacher_name, v_teacher_email) is null)
      or (v_type = 'student' and v_student_name is null)
      or (v_type = 'guardian' and coalesce(v_guardian_name, v_guardian_email) is null)
      or (v_type = 'enrollment' and (v_student_name is null or v_class_name is null))
      or (v_type = 'teacher_class_link' and (coalesce(v_teacher_name, v_teacher_email) is null or v_class_name is null))
      or (v_type = 'guardian_student_link' and (coalesce(v_guardian_name, v_guardian_email) is null or v_student_name is null)) then
      v_invalid := v_invalid + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'required_fields', 'error', 'MISSING_REQUIRED_DATA'));
      continue;
    end if;

    v_key := v_type || '|' || coalesce(lower(v_school_code), '') || '|' || lower(coalesce(v_school_name, v_class_name, v_student_name, v_teacher_email, v_teacher_name, v_guardian_email, v_guardian_name, ''));
    if v_key = any(v_seen) then
      v_duplicate := v_duplicate + 1;
      v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_row_number, 'field', 'row', 'error', 'DUPLICATE_IN_FILE'));
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

    select s.id into v_school_id
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

    if v_exists then
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

    if v_type in ('class', 'student', 'enrollment', 'teacher_class_link') and nullif(btrim(coalesce(v_row ->> 'nome_turma', v_row ->> 'class_name', v_row ->> 'turma')), '') is not null then
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

    if v_type in ('teacher', 'teacher_class_link') and coalesce(nullif(btrim(coalesce(v_row ->> 'nome_professor', v_row ->> 'teacher_name', v_row ->> 'professor')), ''), nullif(btrim(coalesce(v_row ->> 'email_professor', v_row ->> 'teacher_email')), '')) is not null then
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

    if v_type in ('student', 'enrollment', 'guardian_student_link') and nullif(btrim(coalesce(v_row ->> 'nome_aluno', v_row ->> 'student_name', v_row ->> 'aluno')), '') is not null then
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
      v_packages := jsonb_set(v_packages, array[v_school_code, 'guardians'],
        coalesce(v_packages #> array[v_school_code, 'guardians'], '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
          'guardian_name', coalesce(nullif(btrim(coalesce(v_row ->> 'nome_responsavel', v_row ->> 'guardian_name', v_row ->> 'responsavel')), ''), nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'guardian_email')), '')),
          'email', nullif(btrim(coalesce(v_row ->> 'email_responsavel', v_row ->> 'guardian_email')), ''),
          'phone', nullif(btrim(coalesce(v_row ->> 'telefone_responsavel', v_row ->> 'phone')), ''),
          'relationship', coalesce(nullif(btrim(coalesce(v_row ->> 'parentesco', v_row ->> 'relationship')), ''), 'responsavel'),
          'student_reference', nullif(btrim(coalesce(v_row ->> 'nome_aluno', v_row ->> 'student_name', v_row ->> 'aluno')), ''),
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

revoke all on function public.admin_preview_network_bulk_import(jsonb, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.admin_confirm_network_bulk_import(uuid) from public, anon, authenticated;
grant execute on function public.admin_preview_network_bulk_import(jsonb, text, text, text, jsonb, text) to authenticated;
grant execute on function public.admin_confirm_network_bulk_import(uuid) to authenticated;

comment on function public.admin_preview_network_bulk_import(jsonb, text, text, text, jsonb, text) is
  'Admin hotfix: operational preview/validation for network CSV/XLSX bulk implantation. Parses UI rows into canonical school-package batches without writing records.';
comment on function public.admin_confirm_network_bulk_import(uuid) is
  'Admin hotfix: confirms a validated network bulk implantation batch and persists through the canonical admin_confirm_rs_school_import importer.';
