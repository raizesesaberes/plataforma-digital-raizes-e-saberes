-- Avalia+ 2.0 Fase 3 - prova impressa, folha de respostas e importacao offline.
-- Evolui o Avalia+ canonico sem criar motor paralelo de resultados.

create extension if not exists pgcrypto;

create table if not exists public.assessment_print_exports (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assignment_id uuid references public.assessment_assignments(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  booklet_id uuid references public.assessment_booklets(id) on delete set null,
  export_type text not null,
  format text not null,
  status text not null default 'ready',
  file_name text,
  content_type text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  constraint assessment_print_exports_type_check check (export_type in ('STUDENT_TEST', 'TEACHER_KEY', 'ANSWER_SHEET', 'ATTENDANCE_LIST')),
  constraint assessment_print_exports_format_check check (format in ('PDF', 'DOCX', 'HTML')),
  constraint assessment_print_exports_status_check check (status in ('ready', 'failed', 'archived'))
);

create table if not exists public.assessment_offline_import_batches (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid references public.classes(id) on delete set null,
  booklet_id uuid references public.assessment_booklets(id) on delete set null,
  source_format text not null,
  file_name text,
  status text not null default 'preview',
  summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  consolidated_by uuid,
  consolidated_at timestamptz,
  constraint assessment_offline_import_batches_source_check check (source_format in ('CSV', 'XLSX')),
  constraint assessment_offline_import_batches_status_check check (status in ('preview', 'validated', 'consolidated', 'rejected'))
);

create table if not exists public.assessment_offline_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.assessment_offline_import_batches(id) on delete cascade,
  row_number integer not null,
  student_id uuid references public.students(id) on delete set null,
  student_external_ref text,
  question_id uuid references public.question_items(id) on delete set null,
  assessment_question_id uuid references public.assessment_questions(id) on delete set null,
  alternative_id uuid references public.question_alternatives(id) on delete set null,
  answer_label text,
  response_text text,
  status text not null default 'valid',
  error_code text,
  error_message text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  consolidated_at timestamptz,
  constraint assessment_offline_import_rows_status_check check (status in ('valid', 'invalid', 'duplicate', 'rejected', 'consolidated')),
  unique (batch_id, row_number)
);

alter table public.assessment_attempts
  add column if not exists origin text not null default 'ONLINE',
  add column if not exists offline_import_batch_id uuid references public.assessment_offline_import_batches(id) on delete set null,
  add column if not exists imported_by uuid,
  add column if not exists imported_at timestamptz;

alter table public.assessment_responses
  add column if not exists origin text not null default 'ONLINE',
  add column if not exists offline_import_row_id uuid references public.assessment_offline_import_rows(id) on delete set null;

alter table public.assessment_results
  add column if not exists origin text not null default 'ONLINE',
  add column if not exists offline_import_batch_id uuid references public.assessment_offline_import_batches(id) on delete set null,
  add column if not exists imported_by uuid,
  add column if not exists imported_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'assessment_attempts_origin_check' and conrelid = 'public.assessment_attempts'::regclass) then
    alter table public.assessment_attempts add constraint assessment_attempts_origin_check check (origin in ('ONLINE', 'OFFLINE_IMPORT'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assessment_responses_origin_check' and conrelid = 'public.assessment_responses'::regclass) then
    alter table public.assessment_responses add constraint assessment_responses_origin_check check (origin in ('ONLINE', 'OFFLINE_IMPORT'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assessment_results_origin_check' and conrelid = 'public.assessment_results'::regclass) then
    alter table public.assessment_results add constraint assessment_results_origin_check check (origin in ('ONLINE', 'OFFLINE_IMPORT'));
  end if;
end $$;

create index if not exists idx_assessment_print_exports_assessment on public.assessment_print_exports (assessment_id, export_type, created_at desc);
create index if not exists idx_assessment_offline_batches_assignment on public.assessment_offline_import_batches (assignment_id, status, created_at desc);
create index if not exists idx_assessment_offline_rows_batch on public.assessment_offline_import_rows (batch_id, status, row_number);
create index if not exists idx_assessment_results_offline_batch on public.assessment_results (offline_import_batch_id) where offline_import_batch_id is not null;

alter table public.assessment_print_exports enable row level security;
alter table public.assessment_offline_import_batches enable row level security;
alter table public.assessment_offline_import_rows enable row level security;

create or replace function public.avalia_plus_assert_teacher_assignment(p_assignment_id uuid)
returns public.assessment_assignments
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
begin
  select * into v_assignment from public.assessment_assignments where id = p_assignment_id;
  if v_assignment.id is null or not public.avalia_plus_teacher_can_manage_class(v_assignment.class_id, v_assignment.school_id) then
    raise exception 'UNAUTHORIZED_ASSESSMENT_CONTEXT' using errcode = '42501';
  end if;
  return v_assignment;
end;
$$;

create or replace function public.teacher_generate_assessment_print_export(
  p_assessment_id uuid,
  p_export_type text,
  p_format text default 'PDF',
  p_assignment_id uuid default null,
  p_class_id uuid default null,
  p_booklet_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assessment public.assessments%rowtype;
  v_assignment public.assessment_assignments%rowtype;
  v_school_id uuid;
  v_class_id uuid;
  v_booklet_id uuid;
  v_export public.assessment_print_exports%rowtype;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_assessment from public.assessments where id = p_assessment_id;
  if v_assessment.id is null then
    raise exception 'ASSESSMENT_NOT_FOUND';
  end if;

  if p_assignment_id is not null then
    v_assignment := public.avalia_plus_assert_teacher_assignment(p_assignment_id);
    if v_assignment.assessment_id <> p_assessment_id then
      raise exception 'ASSIGNMENT_ASSESSMENT_MISMATCH';
    end if;
    v_school_id := v_assignment.school_id;
    v_class_id := v_assignment.class_id;
    v_booklet_id := coalesce(p_booklet_id, v_assignment.booklet_id);
  else
    v_school_id := v_assessment.school_id;
    v_class_id := p_class_id;
    v_booklet_id := p_booklet_id;
    if v_class_id is not null and not public.avalia_plus_teacher_can_manage_class(v_class_id, v_school_id) then
      raise exception 'UNAUTHORIZED_CLASS_EXPORT' using errcode = '42501';
    end if;
    if v_class_id is null and not (public.is_platform_admin() or public.secretaria_can_manage_school(v_school_id) or v_assessment.owner_user_id = auth.uid()) then
      raise exception 'UNAUTHORIZED_ASSESSMENT_EXPORT' using errcode = '42501';
    end if;
  end if;

  if upper(coalesce(p_export_type, '')) not in ('STUDENT_TEST', 'TEACHER_KEY', 'ANSWER_SHEET', 'ATTENDANCE_LIST') then
    raise exception 'INVALID_EXPORT_TYPE';
  end if;
  if upper(coalesce(p_format, '')) not in ('PDF', 'DOCX', 'HTML') then
    raise exception 'INVALID_EXPORT_FORMAT';
  end if;

  with selected_questions as (
    select
      aq.id as assessment_question_id,
      aq.question_id,
      coalesce(abq.position, aq.position) as position,
      aq.points,
      qi.code,
      qi.statement,
      qi.command_text,
      qi.base_text,
      qi.component,
      qi.school_year,
      qi.bncc_skill,
      qi.reference_matrix,
      qi.curriculum_matrix,
      qi.thematic_unit,
      qi.knowledge_object,
      qi.difficulty,
      aq.version_snapshot
    from public.assessment_questions aq
    join public.question_items qi on qi.id = aq.question_id
    left join public.assessment_booklet_questions abq on abq.assessment_question_id = aq.id
      and (v_booklet_id is null or abq.booklet_id = v_booklet_id)
    where aq.assessment_id = p_assessment_id
      and (v_booklet_id is null or abq.booklet_id = v_booklet_id)
  ), question_payload as (
    select jsonb_agg(
      jsonb_build_object(
        'assessment_question_id', assessment_question_id,
        'question_id', question_id,
        'position', position,
        'points', points,
        'code', code,
        'statement', statement,
        'command_text', command_text,
        'base_text', base_text,
        'component', component,
        'school_year', school_year,
        'bncc_skill', bncc_skill,
        'reference_matrix', reference_matrix,
        'curriculum_matrix', curriculum_matrix,
        'thematic_unit', thematic_unit,
        'knowledge_object', knowledge_object,
        'difficulty', difficulty,
        'version_snapshot', version_snapshot,
        'alternatives', (
          select jsonb_agg(
            jsonb_build_object(
              'id', qa.id,
              'position', qa.position,
              'label', chr(64 + qa.position),
              'body', qa.body,
              'is_correct', case when upper(p_export_type) = 'TEACHER_KEY' then qa.is_correct else null end
            )
            order by qa.position
          )
          from public.question_alternatives qa
          where qa.question_id = selected_questions.question_id
        )
      )
      order by position
    ) as questions
    from selected_questions
  ), students_payload as (
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'student_id', s.id,
        'student_name', s.nome,
        'class_id', e.class_id,
        'school_id', e.school_id
      )
      order by s.nome
    ), '[]'::jsonb) as students
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where v_class_id is not null
      and e.class_id = v_class_id
      and e.school_id = v_school_id
      and e.status = 'active'
      and coalesce(s.status, 'active') in ('active', 'ativo')
  )
  select jsonb_build_object(
    'assessment', to_jsonb(v_assessment),
    'assignment', case when v_assignment.id is null then null else to_jsonb(v_assignment) end,
    'export_type', upper(p_export_type),
    'format', upper(p_format),
    'booklet_id', v_booklet_id,
    'school_id', v_school_id,
    'class_id', v_class_id,
    'questions', coalesce((select questions from question_payload), '[]'::jsonb),
    'students', case when upper(p_export_type) in ('ANSWER_SHEET', 'ATTENDANCE_LIST') then (select students from students_payload) else '[]'::jsonb end,
    'generated_at', now()
  ) into v_payload;

  insert into public.assessment_print_exports (
    assessment_id, assignment_id, school_id, class_id, booklet_id,
    export_type, format, file_name, content_type, payload, metadata, created_by
  )
  values (
    p_assessment_id,
    p_assignment_id,
    v_school_id,
    v_class_id,
    v_booklet_id,
    upper(p_export_type),
    upper(p_format),
    lower(replace(coalesce(v_assessment.title, 'avalia'), ' ', '-')) || '-' || lower(upper(p_export_type)) || '.' || lower(upper(p_format)),
    case upper(p_format)
      when 'DOCX' then 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      when 'PDF' then 'application/pdf'
      else 'text/html'
    end,
    v_payload,
    jsonb_build_object('engine', 'AVALIA_PLUS_2_FASE_3', 'duplicate_result_engine', false),
    auth.uid()
  )
  returning * into v_export;

  return jsonb_build_object('export', to_jsonb(v_export), 'payload', v_payload);
end;
$$;

create or replace function public.teacher_preview_offline_assessment_import(
  p_assignment_id uuid,
  p_source_format text,
  p_file_name text,
  p_rows jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
  v_batch public.assessment_offline_import_batches%rowtype;
  v_row jsonb;
  v_idx integer := 0;
  v_student_id uuid;
  v_question_id uuid;
  v_assessment_question_id uuid;
  v_alternative_id uuid;
  v_answer text;
  v_status text;
  v_error text;
  v_valid integer;
  v_invalid integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  v_assignment := public.avalia_plus_assert_teacher_assignment(p_assignment_id);
  if upper(coalesce(p_source_format, '')) not in ('CSV', 'XLSX') then
    raise exception 'INVALID_IMPORT_FORMAT';
  end if;
  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' then
    raise exception 'IMPORT_ROWS_MUST_BE_ARRAY';
  end if;

  insert into public.assessment_offline_import_batches (
    assessment_id, assignment_id, school_id, class_id, booklet_id,
    source_format, file_name, status, created_by, validated_at, metadata
  )
  values (
    v_assignment.assessment_id, v_assignment.id, v_assignment.school_id, v_assignment.class_id, v_assignment.booklet_id,
    upper(p_source_format), p_file_name, 'preview', auth.uid(), now(), jsonb_build_object('engine', 'AVALIA_PLUS_2_FASE_3')
  )
  returning * into v_batch;

  for v_row in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb))
  loop
    v_idx := v_idx + 1;
    v_student_id := null;
    v_question_id := null;
    v_assessment_question_id := null;
    v_alternative_id := null;
    v_answer := upper(nullif(btrim(coalesce(v_row->>'answer', v_row->>'resposta', '')), ''));
    v_status := 'valid';
    v_error := null;

    select s.id into v_student_id
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where e.class_id = v_assignment.class_id
      and e.school_id = v_assignment.school_id
      and e.status = 'active'
      and coalesce(s.status, 'active') in ('active', 'ativo')
      and (v_assignment.target_type = 'class' or s.id = v_assignment.student_id)
      and (
        s.id::text = nullif(v_row->>'student_id', '')
        or lower(coalesce(s.email, '')) = lower(nullif(coalesce(v_row->>'student_email', v_row->>'email'), ''))
        or lower(s.nome) = lower(nullif(coalesce(v_row->>'student_name', v_row->>'aluno'), ''))
      )
    limit 1;

    if v_student_id is null then
      v_status := 'invalid';
      v_error := 'STUDENT_NOT_ELIGIBLE';
    end if;

    if nullif(v_row->>'question_id', '') is not null then
      v_question_id := nullif(v_row->>'question_id', '')::uuid;
    elsif nullif(coalesce(v_row->>'question_position', v_row->>'questao'), '') is not null then
      select aq.question_id, aq.id into v_question_id, v_assessment_question_id
      from public.assessment_questions aq
      where aq.assessment_id = v_assignment.assessment_id
        and aq.position = nullif(coalesce(v_row->>'question_position', v_row->>'questao'), '')::integer
      limit 1;
    end if;

    if v_question_id is null then
      v_status := 'invalid';
      v_error := coalesce(v_error, 'QUESTION_NOT_FOUND');
    else
      select aq.id into v_assessment_question_id
      from public.assessment_questions aq
      where aq.assessment_id = v_assignment.assessment_id
        and aq.question_id = v_question_id
      limit 1;
      if v_assessment_question_id is null then
        v_status := 'invalid';
        v_error := coalesce(v_error, 'QUESTION_NOT_IN_ASSESSMENT');
      end if;
    end if;

    if v_question_id is not null and v_answer is not null then
      select qa.id into v_alternative_id
      from public.question_alternatives qa
      where qa.question_id = v_question_id
        and chr(64 + qa.position) = v_answer
      limit 1;
      if v_alternative_id is null and nullif(v_row->>'alternative_id', '') is not null then
        select qa.id into v_alternative_id
        from public.question_alternatives qa
        where qa.id = nullif(v_row->>'alternative_id', '')::uuid
          and qa.question_id = v_question_id
        limit 1;
      end if;
      if v_alternative_id is null and nullif(coalesce(v_row->>'response_text', v_row->>'resposta_texto'), '') is null then
        v_status := 'invalid';
        v_error := coalesce(v_error, 'ANSWER_NOT_FOUND');
      end if;
    end if;

    if v_status = 'valid' and exists (
      select 1 from public.assessment_offline_import_rows r
      where r.batch_id = v_batch.id and r.student_id = v_student_id and r.question_id = v_question_id
    ) then
      v_status := 'duplicate';
      v_error := 'DUPLICATE_ROW';
    end if;

    if v_status = 'valid' and exists (
      select 1 from public.assessment_results ar
      where ar.assignment_id = v_assignment.id and ar.student_id = v_student_id
    ) then
      v_status := 'invalid';
      v_error := 'RESULT_ALREADY_CONSOLIDATED';
    end if;

    insert into public.assessment_offline_import_rows (
      batch_id, row_number, student_id, student_external_ref, question_id, assessment_question_id,
      alternative_id, answer_label, response_text, status, error_code, error_message, raw_payload
    )
    values (
      v_batch.id,
      v_idx,
      v_student_id,
      coalesce(v_row->>'student_id', v_row->>'student_email', v_row->>'student_name', v_row->>'aluno'),
      v_question_id,
      v_assessment_question_id,
      v_alternative_id,
      v_answer,
      nullif(coalesce(v_row->>'response_text', v_row->>'resposta_texto'), ''),
      v_status,
      v_error,
      v_error,
      v_row
    );
  end loop;

  select count(*) filter (where status = 'valid'), count(*) filter (where status <> 'valid')
    into v_valid, v_invalid
  from public.assessment_offline_import_rows
  where batch_id = v_batch.id;

  update public.assessment_offline_import_batches
     set status = case when v_invalid = 0 then 'validated' else 'preview' end,
         summary = jsonb_build_object('total_rows', v_idx, 'valid_rows', v_valid, 'invalid_rows', v_invalid)
   where id = v_batch.id
   returning * into v_batch;

  return jsonb_build_object(
    'batch', to_jsonb(v_batch),
    'rows', coalesce((select jsonb_agg(to_jsonb(r) order by r.row_number) from public.assessment_offline_import_rows r where r.batch_id = v_batch.id), '[]'::jsonb)
  );
end;
$$;

create or replace function public.teacher_confirm_offline_assessment_import(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch public.assessment_offline_import_batches%rowtype;
  v_assignment public.assessment_assignments%rowtype;
  v_student uuid;
  v_attempt public.assessment_attempts%rowtype;
  v_total_points numeric;
  v_question_count integer;
  v_answered integer;
  v_correct integer;
  v_incorrect integer;
  v_raw numeric;
  v_percentage numeric;
  v_created integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_batch from public.assessment_offline_import_batches where id = p_batch_id for update;
  if v_batch.id is null then
    raise exception 'IMPORT_BATCH_NOT_FOUND';
  end if;
  v_assignment := public.avalia_plus_assert_teacher_assignment(v_batch.assignment_id);
  if v_batch.status not in ('preview', 'validated') then
    raise exception 'IMPORT_BATCH_NOT_CONFIRMABLE';
  end if;
  if exists (select 1 from public.assessment_offline_import_rows where batch_id = p_batch_id and status <> 'valid') then
    raise exception 'IMPORT_HAS_INVALID_ROWS';
  end if;

  for v_student in
    select distinct student_id
    from public.assessment_offline_import_rows
    where batch_id = p_batch_id and status = 'valid' and student_id is not null
  loop
    if exists (select 1 from public.assessment_results where assignment_id = v_assignment.id and student_id = v_student) then
      raise exception 'RESULT_ALREADY_CONSOLIDATED:%', v_student;
    end if;

    insert into public.assessment_attempts (
      assignment_id, assessment_id, school_id, student_id, attempt_number, status,
      started_at, submitted_at, graded_at, question_count, origin,
      offline_import_batch_id, imported_by, imported_at
    )
    values (
      v_assignment.id, v_assignment.assessment_id, v_assignment.school_id, v_student,
      coalesce((select max(attempt_number) + 1 from public.assessment_attempts where assignment_id = v_assignment.id and student_id = v_student), 1),
      'graded', now(), now(), now(),
      (select count(*) from public.assessment_questions where assessment_id = v_assignment.assessment_id),
      'OFFLINE_IMPORT', p_batch_id, auth.uid(), now()
    )
    returning * into v_attempt;

    insert into public.assessment_responses (
      attempt_id, question_id, selected_alternative_id, response_text, is_correct,
      score_awarded, origin, offline_import_row_id
    )
    select
      v_attempt.id,
      r.question_id,
      r.alternative_id,
      r.response_text,
      case when r.alternative_id is null then null else coalesce(qa.is_correct, false) end,
      case
        when r.alternative_id is null then null
        when coalesce(qa.is_correct, false) then coalesce(aq.points, 0)
        else 0
      end,
      'OFFLINE_IMPORT',
      r.id
    from public.assessment_offline_import_rows r
    left join public.question_alternatives qa on qa.id = r.alternative_id
    left join public.assessment_questions aq on aq.id = r.assessment_question_id
    where r.batch_id = p_batch_id
      and r.student_id = v_student
      and r.status = 'valid';

    select coalesce(sum(points), 0), count(*) into v_total_points, v_question_count
    from public.assessment_questions
    where assessment_id = v_assignment.assessment_id;

    select
      count(*),
      count(*) filter (where is_correct is true),
      count(*) filter (where selected_alternative_id is not null and coalesce(is_correct, false) is false),
      coalesce(sum(coalesce(score_awarded, 0)), 0)
      into v_answered, v_correct, v_incorrect, v_raw
    from public.assessment_responses
    where attempt_id = v_attempt.id;

    v_percentage := case when v_total_points > 0 then round((v_raw / v_total_points) * 100, 2) else 0 end;

    update public.assessment_attempts
       set score_raw = v_raw,
           score_percentage = v_percentage,
           question_count = v_question_count,
           answered_count = v_answered,
           correct_count = v_correct,
           incorrect_count = v_incorrect,
           unanswered_count = greatest(v_question_count - v_answered, 0),
           application_status = 'CONCLUIDA'
     where id = v_attempt.id
     returning * into v_attempt;

    insert into public.assessment_results (
      assessment_id, assignment_id, student_id, attempt_id, school_id, status,
      score_raw, score_percentage, question_count, answered_count, correct_count,
      incorrect_count, unanswered_count, finalized_at, origin,
      offline_import_batch_id, imported_by, imported_at
    )
    values (
      v_attempt.assessment_id, v_attempt.assignment_id, v_attempt.student_id, v_attempt.id, v_attempt.school_id,
      'graded', v_attempt.score_raw, v_attempt.score_percentage, v_attempt.question_count, v_attempt.answered_count,
      v_attempt.correct_count, v_attempt.incorrect_count, v_attempt.unanswered_count, now(),
      'OFFLINE_IMPORT', p_batch_id, auth.uid(), now()
    );

    update public.assessment_offline_import_rows
       set status = 'consolidated', consolidated_at = now()
     where batch_id = p_batch_id and student_id = v_student and status = 'valid';

    v_created := v_created + 1;
  end loop;

  update public.assessment_offline_import_batches
     set status = 'consolidated',
         consolidated_by = auth.uid(),
         consolidated_at = now(),
         summary = summary || jsonb_build_object('consolidated_students', v_created)
   where id = p_batch_id
   returning * into v_batch;

  return jsonb_build_object('batch', to_jsonb(v_batch), 'consolidated_students', v_created);
end;
$$;

drop policy if exists assessment_print_exports_select_authorized on public.assessment_print_exports;
create policy assessment_print_exports_select_authorized
on public.assessment_print_exports
for select
to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or (class_id is not null and public.avalia_plus_teacher_can_manage_class(class_id, school_id))
  or created_by = auth.uid()
);

drop policy if exists assessment_offline_batches_select_authorized on public.assessment_offline_import_batches;
create policy assessment_offline_batches_select_authorized
on public.assessment_offline_import_batches
for select
to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.avalia_plus_teacher_can_manage_class(class_id, school_id)
  or created_by = auth.uid()
);

drop policy if exists assessment_offline_rows_select_authorized on public.assessment_offline_import_rows;
create policy assessment_offline_rows_select_authorized
on public.assessment_offline_import_rows
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_offline_import_batches b
    where b.id = batch_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(b.school_id)
        or public.avalia_plus_teacher_can_manage_class(b.class_id, b.school_id)
        or b.created_by = auth.uid()
      )
  )
);

revoke all on public.assessment_print_exports from anon, public;
revoke all on public.assessment_offline_import_batches from anon, public;
revoke all on public.assessment_offline_import_rows from anon, public;
grant select on public.assessment_print_exports to authenticated;
grant select on public.assessment_offline_import_batches to authenticated;
grant select on public.assessment_offline_import_rows to authenticated;

revoke all on function public.teacher_generate_assessment_print_export(uuid, text, text, uuid, uuid, uuid) from public, anon;
revoke all on function public.teacher_preview_offline_assessment_import(uuid, text, text, jsonb) from public, anon;
revoke all on function public.teacher_confirm_offline_assessment_import(uuid) from public, anon;
grant execute on function public.teacher_generate_assessment_print_export(uuid, text, text, uuid, uuid, uuid) to authenticated;
grant execute on function public.teacher_preview_offline_assessment_import(uuid, text, text, jsonb) to authenticated;
grant execute on function public.teacher_confirm_offline_assessment_import(uuid) to authenticated;
