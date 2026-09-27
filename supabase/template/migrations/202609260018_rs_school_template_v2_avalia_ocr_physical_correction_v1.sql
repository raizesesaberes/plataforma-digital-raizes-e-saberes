-- Avalia+ - OCR / Correcao Automatizada de Prova Fisica V1
-- Evolui a Fase 3 fisica sem criar segundo motor de resultados.

do $$
begin
  if to_regclass('public.assessment_offline_import_batches') is null then
    raise exception 'PRE-CHECK bloqueado: Fase 3 offline nao existe';
  end if;
  if to_regprocedure('public.avalia_plus_assert_teacher_assignment(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.avalia_plus_assert_teacher_assignment(uuid) nao existe';
  end if;
  if to_regclass('public.assessment_attempts') is null or to_regclass('public.assessment_results') is null then
    raise exception 'PRE-CHECK bloqueado: motor canonico de resultados nao existe';
  end if;
end
$$;

create table if not exists public.assessment_scan_batches (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  assignment_id uuid not null references public.assessment_assignments(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid references public.classes(id) on delete set null,
  booklet_id uuid references public.assessment_booklets(id) on delete set null,
  source_format text not null check (source_format in ('PDF', 'JPG', 'JPEG', 'PNG', 'MOBILE_PHOTO')),
  pipeline_status text not null default 'UPLOAD'
    check (pipeline_status in ('UPLOAD', 'VALIDATION', 'PROCESSING', 'REVIEW', 'CONSOLIDATION', 'CONSOLIDATED', 'REJECTED')),
  ocr_provider text,
  ocr_provider_status text not null default 'EMPTY_REAL'
    check (ocr_provider_status in ('PASS', 'EMPTY_REAL', 'FAIL')),
  summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consolidated_by uuid references auth.users(id) on delete set null,
  consolidated_at timestamptz
);

create table if not exists public.assessment_scan_files (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.assessment_scan_batches(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_bucket text,
  storage_path text,
  sha256 text,
  file_size integer,
  student_id uuid references public.students(id) on delete set null,
  identification_status text not null default 'PENDING'
    check (identification_status in ('IDENTIFIED', 'REVIEW_REQUIRED', 'PENDING', 'FAILED')),
  identification_confidence numeric(5,4),
  processing_status text not null default 'UPLOADED'
    check (processing_status in ('UPLOADED', 'VALIDATED', 'PROCESSING', 'REVIEW_REQUIRED', 'REVIEWED', 'CONSOLIDATED', 'REJECTED')),
  detected_payload jsonb not null default '{}'::jsonb,
  review_notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  consolidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_scan_files_mime_check check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  constraint assessment_scan_files_confidence_check check (identification_confidence is null or (identification_confidence >= 0 and identification_confidence <= 1))
);

create table if not exists public.assessment_scan_responses (
  id uuid primary key default gen_random_uuid(),
  scan_file_id uuid not null references public.assessment_scan_files(id) on delete cascade,
  assessment_question_id uuid references public.assessment_questions(id) on delete set null,
  question_id uuid references public.question_items(id) on delete set null,
  detected_alternative_id uuid references public.question_alternatives(id) on delete set null,
  final_alternative_id uuid references public.question_alternatives(id) on delete set null,
  detected_label text,
  final_label text,
  confidence numeric(5,4),
  detection_status text not null default 'REVIEW_REQUIRED'
    check (detection_status in ('DETECTED', 'REVIEW_REQUIRED', 'CONFIRMED', 'ADJUSTED', 'REJECTED')),
  source_payload jsonb not null default '{}'::jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assessment_scan_responses_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 1)),
  unique (scan_file_id, question_id)
);

create table if not exists public.assessment_scan_audit_events (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.assessment_scan_batches(id) on delete cascade,
  scan_file_id uuid references public.assessment_scan_files(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.assessment_attempts
  add column if not exists scan_file_id uuid references public.assessment_scan_files(id) on delete set null;
alter table public.assessment_responses
  add column if not exists scan_response_id uuid references public.assessment_scan_responses(id) on delete set null;
alter table public.assessment_results
  add column if not exists scan_file_id uuid references public.assessment_scan_files(id) on delete set null;

do $$
begin
  alter table public.assessment_attempts drop constraint if exists assessment_attempts_origin_check;
  alter table public.assessment_attempts add constraint assessment_attempts_origin_check
    check (origin in ('ONLINE', 'OFFLINE_IMPORT', 'SCANNED_PHYSICAL'));

  alter table public.assessment_responses drop constraint if exists assessment_responses_origin_check;
  alter table public.assessment_responses add constraint assessment_responses_origin_check
    check (origin in ('ONLINE', 'OFFLINE_IMPORT', 'SCANNED_PHYSICAL'));

  alter table public.assessment_results drop constraint if exists assessment_results_origin_check;
  alter table public.assessment_results add constraint assessment_results_origin_check
    check (origin in ('ONLINE', 'OFFLINE_IMPORT', 'SCANNED_PHYSICAL'));
end
$$;

create index if not exists assessment_scan_batches_assignment_idx
  on public.assessment_scan_batches (assignment_id, pipeline_status, created_at desc);
create index if not exists assessment_scan_files_batch_idx
  on public.assessment_scan_files (batch_id, processing_status, created_at desc);
create index if not exists assessment_scan_files_student_idx
  on public.assessment_scan_files (student_id, created_at desc)
  where student_id is not null;
create index if not exists assessment_scan_responses_file_idx
  on public.assessment_scan_responses (scan_file_id, detection_status);
create index if not exists assessment_scan_audit_batch_idx
  on public.assessment_scan_audit_events (batch_id, created_at desc);

create or replace function public.avalia_plus_scan_log_event(
  p_batch_id uuid,
  p_scan_file_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.assessment_scan_audit_events (batch_id, scan_file_id, actor_user_id, event_type, details)
  values (p_batch_id, p_scan_file_id, auth.uid(), p_event_type, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.teacher_create_assessment_scan_batch(
  p_assignment_id uuid,
  p_source_format text,
  p_ocr_provider text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
  v_batch public.assessment_scan_batches%rowtype;
  v_format text := upper(coalesce(nullif(p_source_format, ''), 'PDF'));
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  v_assignment := public.avalia_plus_assert_teacher_assignment(p_assignment_id);
  if v_format not in ('PDF', 'JPG', 'JPEG', 'PNG', 'MOBILE_PHOTO') then
    raise exception 'INVALID_SCAN_SOURCE_FORMAT';
  end if;

  insert into public.assessment_scan_batches (
    assessment_id, assignment_id, school_id, class_id, booklet_id,
    source_format, pipeline_status, ocr_provider, ocr_provider_status,
    metadata, created_by
  )
  values (
    v_assignment.assessment_id, v_assignment.id, v_assignment.school_id, v_assignment.class_id, v_assignment.booklet_id,
    v_format, 'UPLOAD', nullif(p_ocr_provider, ''), case when nullif(p_ocr_provider, '') is null then 'EMPTY_REAL' else 'PASS' end,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('engine', 'OCR_PROVA_FISICA_V1'),
    auth.uid()
  )
  returning * into v_batch;

  perform public.avalia_plus_scan_log_event(v_batch.id, null, 'BATCH_CREATED', to_jsonb(v_batch));
  return jsonb_build_object('batch', to_jsonb(v_batch), 'ocr_provider', coalesce(v_batch.ocr_provider_status, 'EMPTY_REAL'));
end;
$$;

create or replace function public.teacher_register_assessment_scan_file(
  p_batch_id uuid,
  p_file jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_batch public.assessment_scan_batches%rowtype;
  v_assignment public.assessment_assignments%rowtype;
  v_file public.assessment_scan_files%rowtype;
  v_student_id uuid;
  v_confidence numeric := nullif(p_file->>'identification_confidence', '')::numeric;
  v_mime text := coalesce(nullif(p_file->>'mime_type', ''), 'application/pdf');
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_batch from public.assessment_scan_batches where id = p_batch_id;
  if v_batch.id is null then
    raise exception 'SCAN_BATCH_NOT_FOUND';
  end if;
  v_assignment := public.avalia_plus_assert_teacher_assignment(v_batch.assignment_id);
  if v_mime not in ('application/pdf', 'image/jpeg', 'image/png') then
    raise exception 'INVALID_SCAN_MIME_TYPE';
  end if;

  if nullif(p_file->>'student_id', '') is not null then
    select s.id into v_student_id
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where s.id = nullif(p_file->>'student_id', '')::uuid
      and e.class_id = v_assignment.class_id
      and e.school_id = v_assignment.school_id
      and e.status = 'active'
      and (v_assignment.target_type = 'class' or s.id = v_assignment.student_id)
    limit 1;
  end if;

  insert into public.assessment_scan_files (
    batch_id, file_name, mime_type, storage_bucket, storage_path, sha256, file_size,
    student_id, identification_status, identification_confidence, processing_status,
    detected_payload, created_by
  )
  values (
    p_batch_id,
    coalesce(nullif(p_file->>'file_name', ''), 'scan'),
    v_mime,
    nullif(p_file->>'storage_bucket', ''),
    nullif(p_file->>'storage_path', ''),
    nullif(p_file->>'sha256', ''),
    nullif(p_file->>'file_size', '')::integer,
    v_student_id,
    case when v_student_id is not null and coalesce(v_confidence, 0) >= 0.95 then 'IDENTIFIED' else 'REVIEW_REQUIRED' end,
    v_confidence,
    'REVIEW_REQUIRED',
    jsonb_build_object(
      'ocr_provider_status', v_batch.ocr_provider_status,
      'student_payload', p_file - 'storage_path',
      'requires_human_review', true
    ),
    auth.uid()
  )
  returning * into v_file;

  update public.assessment_scan_batches
     set pipeline_status = 'REVIEW',
         updated_at = now(),
         summary = summary || jsonb_build_object('last_file_id', v_file.id)
   where id = p_batch_id;

  perform public.avalia_plus_scan_log_event(p_batch_id, v_file.id, 'FILE_REGISTERED', to_jsonb(v_file));
  return jsonb_build_object('file', to_jsonb(v_file), 'review_required', true);
end;
$$;

create or replace function public.teacher_record_scan_detection(
  p_scan_file_id uuid,
  p_detection jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_file public.assessment_scan_files%rowtype;
  v_batch public.assessment_scan_batches%rowtype;
  v_assignment public.assessment_assignments%rowtype;
  v_item jsonb;
  v_question_id uuid;
  v_assessment_question_id uuid;
  v_alternative_id uuid;
  v_label text;
  v_confidence numeric;
  v_created integer := 0;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_file from public.assessment_scan_files where id = p_scan_file_id for update;
  if v_file.id is null then
    raise exception 'SCAN_FILE_NOT_FOUND';
  end if;
  select * into v_batch from public.assessment_scan_batches where id = v_file.batch_id;
  v_assignment := public.avalia_plus_assert_teacher_assignment(v_batch.assignment_id);

  if jsonb_typeof(coalesce(p_detection->'responses', '[]'::jsonb)) <> 'array' then
    raise exception 'SCAN_RESPONSES_MUST_BE_ARRAY';
  end if;

  for v_item in select * from jsonb_array_elements(coalesce(p_detection->'responses', '[]'::jsonb))
  loop
    v_question_id := null;
    v_assessment_question_id := null;
    v_alternative_id := null;
    v_label := upper(nullif(btrim(coalesce(v_item->>'answer', v_item->>'detected_label', '')), ''));
    v_confidence := nullif(v_item->>'confidence', '')::numeric;

    if nullif(v_item->>'question_id', '') is not null then
      v_question_id := nullif(v_item->>'question_id', '')::uuid;
    elsif nullif(coalesce(v_item->>'question_position', v_item->>'questao'), '') is not null then
      select aq.question_id, aq.id into v_question_id, v_assessment_question_id
      from public.assessment_questions aq
      where aq.assessment_id = v_assignment.assessment_id
        and aq.position = nullif(coalesce(v_item->>'question_position', v_item->>'questao'), '')::integer
      limit 1;
    end if;

    if v_question_id is not null and v_assessment_question_id is null then
      select aq.id into v_assessment_question_id
      from public.assessment_questions aq
      where aq.assessment_id = v_assignment.assessment_id
        and aq.question_id = v_question_id
      limit 1;
    end if;

    if v_question_id is not null and v_label is not null then
      select qa.id into v_alternative_id
      from public.question_alternatives qa
      where qa.question_id = v_question_id
        and chr(64 + qa.position) = v_label
      limit 1;
    end if;

    insert into public.assessment_scan_responses (
      scan_file_id, assessment_question_id, question_id, detected_alternative_id,
      detected_label, confidence, detection_status, source_payload
    )
    values (
      p_scan_file_id,
      v_assessment_question_id,
      v_question_id,
      v_alternative_id,
      v_label,
      v_confidence,
      case when v_question_id is not null and v_alternative_id is not null and coalesce(v_confidence, 0) >= 0.95 then 'DETECTED' else 'REVIEW_REQUIRED' end,
      v_item
    )
    on conflict (scan_file_id, question_id) do update
      set assessment_question_id = excluded.assessment_question_id,
          detected_alternative_id = excluded.detected_alternative_id,
          detected_label = excluded.detected_label,
          confidence = excluded.confidence,
          detection_status = excluded.detection_status,
          source_payload = excluded.source_payload,
          updated_at = now();
    v_created := v_created + 1;
  end loop;

  update public.assessment_scan_files
     set processing_status = 'REVIEW_REQUIRED',
         detected_payload = detected_payload || jsonb_build_object('responses_detected', v_created, 'ocr_provider_status', v_batch.ocr_provider_status),
         updated_at = now()
   where id = p_scan_file_id
   returning * into v_file;

  perform public.avalia_plus_scan_log_event(v_batch.id, v_file.id, 'DETECTION_RECORDED', jsonb_build_object('responses', v_created, 'provider_status', v_batch.ocr_provider_status));
  return jsonb_build_object('file', to_jsonb(v_file), 'responses_recorded', v_created, 'review_required', true);
end;
$$;

create or replace function public.teacher_review_scan_response(
  p_scan_response_id uuid,
  p_final_answer jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_response public.assessment_scan_responses%rowtype;
  v_file public.assessment_scan_files%rowtype;
  v_batch public.assessment_scan_batches%rowtype;
  v_assignment public.assessment_assignments%rowtype;
  v_alt uuid;
  v_label text := upper(nullif(btrim(coalesce(p_final_answer->>'answer', p_final_answer->>'final_label', '')), ''));
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_response from public.assessment_scan_responses where id = p_scan_response_id for update;
  if v_response.id is null then
    raise exception 'SCAN_RESPONSE_NOT_FOUND';
  end if;
  select * into v_file from public.assessment_scan_files where id = v_response.scan_file_id;
  select * into v_batch from public.assessment_scan_batches where id = v_file.batch_id;
  v_assignment := public.avalia_plus_assert_teacher_assignment(v_batch.assignment_id);

  if nullif(p_final_answer->>'alternative_id', '') is not null then
    v_alt := nullif(p_final_answer->>'alternative_id', '')::uuid;
  elsif v_label is not null then
    select qa.id into v_alt
    from public.question_alternatives qa
    where qa.question_id = v_response.question_id
      and chr(64 + qa.position) = v_label
    limit 1;
  end if;

  update public.assessment_scan_responses
     set final_alternative_id = v_alt,
         final_label = v_label,
         detection_status = case
           when v_alt is not null and (v_alt is distinct from detected_alternative_id or v_label is distinct from detected_label) then 'ADJUSTED'
           when v_alt is not null then 'CONFIRMED'
           else 'REJECTED'
         end,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now(),
         source_payload = source_payload || jsonb_build_object('manual_review', p_final_answer)
   where id = p_scan_response_id
   returning * into v_response;

  update public.assessment_scan_files
     set processing_status = 'REVIEWED',
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = v_file.id
   returning * into v_file;

  perform public.avalia_plus_scan_log_event(v_batch.id, v_file.id, 'RESPONSE_REVIEWED', to_jsonb(v_response));
  return jsonb_build_object('response', to_jsonb(v_response), 'file', to_jsonb(v_file));
end;
$$;

create or replace function public.teacher_set_scan_file_student(
  p_scan_file_id uuid,
  p_student_id uuid,
  p_confidence numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_file public.assessment_scan_files%rowtype;
  v_batch public.assessment_scan_batches%rowtype;
  v_assignment public.assessment_assignments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_file from public.assessment_scan_files where id = p_scan_file_id for update;
  if v_file.id is null then
    raise exception 'SCAN_FILE_NOT_FOUND';
  end if;
  select * into v_batch from public.assessment_scan_batches where id = v_file.batch_id;
  v_assignment := public.avalia_plus_assert_teacher_assignment(v_batch.assignment_id);

  if not exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    where s.id = p_student_id
      and e.class_id = v_assignment.class_id
      and e.school_id = v_assignment.school_id
      and e.status = 'active'
      and (v_assignment.target_type = 'class' or s.id = v_assignment.student_id)
  ) then
    raise exception 'STUDENT_NOT_ELIGIBLE';
  end if;

  update public.assessment_scan_files
     set student_id = p_student_id,
         identification_status = 'IDENTIFIED',
         identification_confidence = greatest(least(coalesce(p_confidence, 1), 1), 0),
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         updated_at = now()
   where id = p_scan_file_id
   returning * into v_file;

  perform public.avalia_plus_scan_log_event(v_batch.id, v_file.id, 'STUDENT_IDENTIFIED', jsonb_build_object('student_id', p_student_id));
  return jsonb_build_object('file', to_jsonb(v_file));
end;
$$;

create or replace function public.teacher_confirm_scanned_assessment_file(p_scan_file_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_file public.assessment_scan_files%rowtype;
  v_batch public.assessment_scan_batches%rowtype;
  v_assignment public.assessment_assignments%rowtype;
  v_attempt public.assessment_attempts%rowtype;
  v_total_points numeric;
  v_question_count integer;
  v_answered integer;
  v_correct integer;
  v_incorrect integer;
  v_raw numeric;
  v_percentage numeric;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_file from public.assessment_scan_files where id = p_scan_file_id for update;
  if v_file.id is null then
    raise exception 'SCAN_FILE_NOT_FOUND';
  end if;
  select * into v_batch from public.assessment_scan_batches where id = v_file.batch_id for update;
  v_assignment := public.avalia_plus_assert_teacher_assignment(v_batch.assignment_id);

  if v_file.student_id is null or v_file.identification_status <> 'IDENTIFIED' then
    raise exception 'SCAN_STUDENT_REVIEW_REQUIRED';
  end if;
  if exists (
    select 1
    from public.assessment_scan_responses
    where scan_file_id = p_scan_file_id
      and detection_status not in ('CONFIRMED', 'ADJUSTED')
  ) then
    raise exception 'SCAN_RESPONSES_REVIEW_REQUIRED';
  end if;
  if not exists (
    select 1 from public.assessment_scan_responses
    where scan_file_id = p_scan_file_id and final_alternative_id is not null
  ) then
    raise exception 'SCAN_WITHOUT_CONFIRMED_RESPONSES';
  end if;
  if exists (
    select 1 from public.assessment_results
    where assignment_id = v_assignment.id and student_id = v_file.student_id
  ) then
    raise exception 'RESULT_ALREADY_CONSOLIDATED';
  end if;

  insert into public.assessment_attempts (
    assignment_id, assessment_id, school_id, student_id, attempt_number, status,
    started_at, submitted_at, graded_at, question_count, origin,
    scan_file_id, imported_by, imported_at
  )
  values (
    v_assignment.id, v_assignment.assessment_id, v_assignment.school_id, v_file.student_id,
    coalesce((select max(attempt_number) + 1 from public.assessment_attempts where assignment_id = v_assignment.id and student_id = v_file.student_id), 1),
    'graded', now(), now(), now(),
    (select count(*) from public.assessment_questions where assessment_id = v_assignment.assessment_id),
    'SCANNED_PHYSICAL', p_scan_file_id, auth.uid(), now()
  )
  returning * into v_attempt;

  insert into public.assessment_responses (
    attempt_id, question_id, selected_alternative_id, response_text, is_correct,
    score_awarded, origin, scan_response_id
  )
  select
    v_attempt.id,
    r.question_id,
    r.final_alternative_id,
    null,
    coalesce(qa.is_correct, false),
    case when coalesce(qa.is_correct, false) then coalesce(aq.points, 0) else 0 end,
    'SCANNED_PHYSICAL',
    r.id
  from public.assessment_scan_responses r
  left join public.question_alternatives qa on qa.id = r.final_alternative_id
  left join public.assessment_questions aq on aq.id = r.assessment_question_id
  where r.scan_file_id = p_scan_file_id
    and r.final_alternative_id is not null
    and r.detection_status in ('CONFIRMED', 'ADJUSTED');

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
    scan_file_id, imported_by, imported_at
  )
  values (
    v_attempt.assessment_id, v_attempt.assignment_id, v_attempt.student_id, v_attempt.id, v_attempt.school_id,
    'graded', v_attempt.score_raw, v_attempt.score_percentage, v_attempt.question_count, v_attempt.answered_count,
    v_attempt.correct_count, v_attempt.incorrect_count, v_attempt.unanswered_count, now(),
    'SCANNED_PHYSICAL', p_scan_file_id, auth.uid(), now()
  );

  update public.assessment_scan_files
     set processing_status = 'CONSOLIDATED',
         consolidated_at = now(),
         updated_at = now()
   where id = p_scan_file_id
   returning * into v_file;

  update public.assessment_scan_batches
     set pipeline_status = case
           when not exists (
             select 1
             from public.assessment_scan_files f
             where f.batch_id = v_batch.id
               and f.processing_status <> 'CONSOLIDATED'
           ) then 'CONSOLIDATED'
           else 'CONSOLIDATION'
         end,
         updated_at = now(),
         summary = summary || jsonb_build_object('last_consolidated_file_id', p_scan_file_id)
   where id = v_batch.id
   returning * into v_batch;

  perform public.avalia_plus_scan_log_event(v_batch.id, v_file.id, 'SCAN_CONSOLIDATED', jsonb_build_object('attempt_id', v_attempt.id, 'student_id', v_file.student_id, 'score_percentage', v_attempt.score_percentage));
  return jsonb_build_object('file', to_jsonb(v_file), 'attempt_id', v_attempt.id, 'result_origin', 'SCANNED_PHYSICAL', 'score_percentage', v_attempt.score_percentage);
end;
$$;

alter table public.assessment_scan_batches enable row level security;
alter table public.assessment_scan_files enable row level security;
alter table public.assessment_scan_responses enable row level security;
alter table public.assessment_scan_audit_events enable row level security;

drop policy if exists assessment_scan_batches_select_authorized on public.assessment_scan_batches;
create policy assessment_scan_batches_select_authorized
on public.assessment_scan_batches
for select
to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.avalia_plus_teacher_can_manage_class(class_id, school_id)
);

drop policy if exists assessment_scan_files_select_authorized on public.assessment_scan_files;
create policy assessment_scan_files_select_authorized
on public.assessment_scan_files
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_scan_batches b
    where b.id = batch_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(b.school_id)
        or public.avalia_plus_teacher_can_manage_class(b.class_id, b.school_id)
      )
  )
);

drop policy if exists assessment_scan_responses_select_authorized on public.assessment_scan_responses;
create policy assessment_scan_responses_select_authorized
on public.assessment_scan_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_scan_files f
    join public.assessment_scan_batches b on b.id = f.batch_id
    where f.id = scan_file_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(b.school_id)
        or public.avalia_plus_teacher_can_manage_class(b.class_id, b.school_id)
      )
  )
);

drop policy if exists assessment_scan_audit_select_authorized on public.assessment_scan_audit_events;
create policy assessment_scan_audit_select_authorized
on public.assessment_scan_audit_events
for select
to authenticated
using (
  exists (
    select 1
    from public.assessment_scan_batches b
    where b.id = batch_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(b.school_id)
        or public.avalia_plus_teacher_can_manage_class(b.class_id, b.school_id)
      )
  )
);

revoke all on table public.assessment_scan_batches from public, anon, authenticated;
revoke all on table public.assessment_scan_files from public, anon, authenticated;
revoke all on table public.assessment_scan_responses from public, anon, authenticated;
revoke all on table public.assessment_scan_audit_events from public, anon, authenticated;
grant select on table public.assessment_scan_batches to authenticated;
grant select on table public.assessment_scan_files to authenticated;
grant select on table public.assessment_scan_responses to authenticated;
grant select on table public.assessment_scan_audit_events to authenticated;
grant all on table public.assessment_scan_batches to service_role;
grant all on table public.assessment_scan_files to service_role;
grant all on table public.assessment_scan_responses to service_role;
grant all on table public.assessment_scan_audit_events to service_role;

revoke all on function public.avalia_plus_scan_log_event(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.teacher_create_assessment_scan_batch(uuid, text, text, jsonb) from public, anon;
revoke all on function public.teacher_register_assessment_scan_file(uuid, jsonb) from public, anon;
revoke all on function public.teacher_record_scan_detection(uuid, jsonb) from public, anon;
revoke all on function public.teacher_review_scan_response(uuid, jsonb) from public, anon;
revoke all on function public.teacher_set_scan_file_student(uuid, uuid, numeric) from public, anon;
revoke all on function public.teacher_confirm_scanned_assessment_file(uuid) from public, anon;
grant execute on function public.teacher_create_assessment_scan_batch(uuid, text, text, jsonb) to authenticated, service_role;
grant execute on function public.teacher_register_assessment_scan_file(uuid, jsonb) to authenticated, service_role;
grant execute on function public.teacher_record_scan_detection(uuid, jsonb) to authenticated, service_role;
grant execute on function public.teacher_review_scan_response(uuid, jsonb) to authenticated, service_role;
grant execute on function public.teacher_set_scan_file_student(uuid, uuid, numeric) to authenticated, service_role;
grant execute on function public.teacher_confirm_scanned_assessment_file(uuid) to authenticated, service_role;
grant execute on function public.avalia_plus_scan_log_event(uuid, uuid, text, jsonb) to service_role;

comment on table public.assessment_scan_batches is
  'OCR Prova Fisica V1: lote de scans/fotos vinculado ao Avalia+ canonico.';
comment on table public.assessment_scan_files is
  'OCR Prova Fisica V1: arquivos privados de prova/folha digitalizada, sempre com revisao quando OCR_PROVIDER=EMPTY_REAL ou confianca insuficiente.';
comment on table public.assessment_scan_responses is
  'OCR Prova Fisica V1: respostas detectadas/conferidas antes de consolidar no motor canonico.';
comment on function public.teacher_confirm_scanned_assessment_file(uuid) is
  'Consolida scan revisado no mesmo assessment_attempts/assessment_results com origin=SCANNED_PHYSICAL.';

do $$
declare
  v_anon_grants integer;
  v_scan_tables integer;
begin
  select count(*) into v_anon_grants
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name like 'teacher_%scan%'
    and grantee = 'anon';
  if v_anon_grants <> 0 then
    raise exception 'VALIDATION failed: anon recebeu grants em funcoes scan';
  end if;

  select count(*) into v_scan_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('assessment_scan_batches', 'assessment_scan_files', 'assessment_scan_responses', 'assessment_scan_audit_events');
  if v_scan_tables <> 4 then
    raise exception 'VALIDATION failed: tabelas de scan incompletas';
  end if;
end
$$;
