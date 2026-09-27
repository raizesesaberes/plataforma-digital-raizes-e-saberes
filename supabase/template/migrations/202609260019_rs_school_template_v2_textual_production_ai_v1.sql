-- Producao Textual + Correcao por IA V1
-- Motor canonico integrado a Aluno, Professor, IA Pedagogica, OCR e analytics.

create extension if not exists pgcrypto;

do $$
begin
  if to_regprocedure('public.ai_provider_status()') is null then
    raise exception 'PRE-CHECK bloqueado: IA Pedagogica V1 nao existe';
  end if;
  if to_regprocedure('public.ai_pedagogy_prepare_request(text,text,uuid,uuid,text,text)') is null then
    raise exception 'PRE-CHECK bloqueado: ai_pedagogy_prepare_request nao existe';
  end if;
  if to_regclass('public.assessment_scan_files') is null then
    raise exception 'PRE-CHECK bloqueado: OCR Prova Fisica V1 nao existe';
  end if;
  if to_regprocedure('public.avalia_plus_teacher_can_manage_class(uuid,uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: avalia_plus_teacher_can_manage_class nao existe';
  end if;
end $$;

create table if not exists public.writing_prompts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  teacher_id uuid references public.teachers(id) on delete set null,
  title text not null,
  textual_genre text not null,
  theme text not null,
  prompt_command text not null,
  school_year text,
  component text,
  bncc_codes text[] not null default '{}'::text[],
  rubric jsonb not null default '[]'::jsonb,
  correction_modes text[] not null default array['DOCENTE']::text[],
  due_at timestamptz,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_prompts_status_check check (status in ('draft', 'published', 'closed', 'archived')),
  constraint writing_prompts_title_check check (length(btrim(title)) > 0),
  constraint writing_prompts_mode_check check (
    correction_modes <@ array['DOCENTE', 'IA', 'HIBRIDA_IA_DOCENTE']::text[]
  )
);

create table if not exists public.writing_prompt_targets (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.writing_prompts(id) on delete cascade,
  target_type text not null,
  class_id uuid references public.classes(id) on delete cascade,
  group_id uuid references public.recomposition_intervention_groups(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  constraint writing_prompt_targets_type_check check (target_type in ('class', 'group', 'student')),
  constraint writing_prompt_targets_status_check check (status in ('active', 'removed')),
  constraint writing_prompt_targets_scope_check check (
    (target_type = 'class' and class_id is not null and group_id is null and student_id is null)
    or (target_type = 'group' and group_id is not null and student_id is null)
    or (target_type = 'student' and student_id is not null)
  )
);

create table if not exists public.writing_submissions (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.writing_prompts(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid not null references public.classes(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete cascade,
  current_version integer not null default 1,
  status text not null default 'draft',
  correction_mode text,
  final_score numeric(6,2),
  final_feedback text,
  submitted_at timestamptz,
  corrected_at timestamptz,
  corrected_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_submissions_status_check check (status in ('draft', 'submitted', 'in_correction', 'corrected', 'revision_requested', 'resubmitted', 'archived')),
  constraint writing_submissions_mode_check check (correction_mode is null or correction_mode in ('DOCENTE', 'IA', 'HIBRIDA_IA_DOCENTE')),
  unique (prompt_id, student_id)
);

create table if not exists public.writing_submission_versions (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  version_number integer not null,
  text_content text,
  attachment jsonb,
  source_type text not null default 'typed',
  scan_file_id uuid references public.assessment_scan_files(id) on delete set null,
  word_count integer not null default 0,
  is_final boolean not null default false,
  autosaved_at timestamptz,
  submitted_at timestamptz,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint writing_versions_source_check check (source_type in ('typed', 'file', 'image', 'ocr_pending')),
  unique (submission_id, version_number)
);

create table if not exists public.writing_corrections (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.writing_submissions(id) on delete cascade,
  version_id uuid not null references public.writing_submission_versions(id) on delete cascade,
  mode text not null,
  provider_status text not null default 'EMPTY_REAL',
  ai_interaction_id uuid references public.ai_interaction_logs(id) on delete set null,
  status text not null default 'draft',
  overall_score numeric(6,2),
  general_feedback text,
  strengths jsonb not null default '[]'::jsonb,
  improvements jsonb not null default '[]'::jsonb,
  rewrite_guidance text,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  validated_by uuid references auth.users(id) on delete set null,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint writing_corrections_mode_check check (mode in ('DOCENTE', 'IA', 'HIBRIDA_IA_DOCENTE')),
  constraint writing_corrections_status_check check (status in ('draft', 'ai_prepared', 'teacher_review', 'validated', 'published', 'rejected')),
  constraint writing_corrections_provider_check check (provider_status in ('PASS', 'EMPTY_REAL', 'FAIL'))
);

create table if not exists public.writing_rubric_scores (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null references public.writing_corrections(id) on delete cascade,
  criterion_key text not null,
  criterion_label text not null,
  dimension text not null,
  score numeric(6,2),
  max_score numeric(6,2),
  feedback text,
  source text not null default 'teacher',
  created_at timestamptz not null default now(),
  constraint writing_rubric_scores_source_check check (source in ('teacher', 'ai_suggestion', 'hybrid_validated')),
  unique (correction_id, criterion_key)
);

create table if not exists public.writing_feedback_items (
  id uuid primary key default gen_random_uuid(),
  correction_id uuid not null references public.writing_corrections(id) on delete cascade,
  version_id uuid references public.writing_submission_versions(id) on delete set null,
  feedback_type text not null,
  paragraph_index integer,
  text_excerpt text,
  feedback text not null,
  suggestion text,
  source text not null default 'teacher',
  created_at timestamptz not null default now(),
  constraint writing_feedback_items_type_check check (feedback_type in ('general', 'criterion', 'paragraph', 'rewrite', 'strength', 'improvement')),
  constraint writing_feedback_items_source_check check (source in ('teacher', 'ai_suggestion', 'hybrid_validated'))
);

create table if not exists public.writing_correction_audit_events (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid references public.writing_prompts(id) on delete cascade,
  submission_id uuid references public.writing_submissions(id) on delete cascade,
  correction_id uuid references public.writing_corrections(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.writing_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  prompt_id uuid references public.writing_prompts(id) on delete cascade,
  textual_genre text,
  component text,
  criterion_key text,
  period_start date,
  period_end date,
  submission_count integer not null default 0,
  corrected_count integer not null default 0,
  average_score numeric(6,2),
  evolution jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now()
);

create index if not exists writing_prompts_class_status_idx
  on public.writing_prompts (school_id, class_id, status, created_at desc);
create index if not exists writing_prompt_targets_prompt_idx
  on public.writing_prompt_targets (prompt_id, target_type, status);
create index if not exists writing_submissions_student_idx
  on public.writing_submissions (student_id, status, updated_at desc);
create index if not exists writing_submissions_prompt_idx
  on public.writing_submissions (prompt_id, status, updated_at desc);
create index if not exists writing_versions_submission_idx
  on public.writing_submission_versions (submission_id, version_number desc);
create index if not exists writing_corrections_submission_idx
  on public.writing_corrections (submission_id, status, created_at desc);
create index if not exists writing_feedback_correction_idx
  on public.writing_feedback_items (correction_id, feedback_type);
create index if not exists writing_audit_submission_idx
  on public.writing_correction_audit_events (submission_id, created_at desc);
create index if not exists writing_analytics_scope_idx
  on public.writing_analytics_snapshots (school_id, class_id, student_id, generated_at desc);

drop trigger if exists writing_prompts_touch_updated_at on public.writing_prompts;
create trigger writing_prompts_touch_updated_at
before update on public.writing_prompts
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists writing_submissions_touch_updated_at on public.writing_submissions;
create trigger writing_submissions_touch_updated_at
before update on public.writing_submissions
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists writing_corrections_touch_updated_at on public.writing_corrections;
create trigger writing_corrections_touch_updated_at
before update on public.writing_corrections
for each row execute function public.institutional_touch_updated_at();

create or replace function public.writing_current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id
  from public.students s
  where s.user_id = auth.uid()
    and coalesce(s.status, 'active') in ('active', 'ativo')
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;
$$;

create or replace function public.writing_student_is_target(p_prompt_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.writing_prompts p
    join public.enrollments e
      on e.student_id = p_student_id
     and e.school_id = p.school_id
     and e.class_id = p.class_id
     and e.status in ('active', 'ativo')
    where p.id = p_prompt_id
      and p.status = 'published'
      and (
        exists (
          select 1 from public.writing_prompt_targets t
          where t.prompt_id = p.id
            and t.status = 'active'
            and t.target_type = 'class'
            and t.class_id = p.class_id
        )
        or exists (
          select 1 from public.writing_prompt_targets t
          where t.prompt_id = p.id
            and t.status = 'active'
            and t.target_type = 'student'
            and t.student_id = p_student_id
        )
        or exists (
          select 1
          from public.writing_prompt_targets t
          join public.recomposition_intervention_group_students gs
            on gs.group_id = t.group_id
           and gs.student_id = p_student_id
           and gs.status = 'active'
          where t.prompt_id = p.id
            and t.status = 'active'
            and t.target_type = 'group'
        )
      )
  );
$$;

create or replace function public.writing_can_read_submission(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.writing_submissions s
    where s.id = p_submission_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(s.school_id)
        or public.avalia_plus_teacher_can_manage_class(s.class_id, s.school_id)
        or public.institutional_is_current_student(s.student_id)
        or public.communication_guardian_can_read(s.school_id, s.class_id, s.student_id, 'student')
      )
  );
$$;

create or replace function public.writing_log_event(
  p_prompt_id uuid,
  p_submission_id uuid,
  p_correction_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  insert into public.writing_correction_audit_events (
    prompt_id, submission_id, correction_id, actor_user_id, event_type, details
  )
  values (p_prompt_id, p_submission_id, p_correction_id, auth.uid(), p_event_type, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.teacher_create_writing_prompt(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_prompt public.writing_prompts%rowtype;
  v_teacher_id uuid := public.avalia_current_teacher_id();
  v_status text := lower(coalesce(p_payload->>'status', 'draft'));
  v_target_type text := lower(coalesce(p_payload->>'target_type', 'class'));
  v_student jsonb;
  v_group_id uuid := nullif(p_payload->>'group_id', '')::uuid;
  v_student_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_class
  from public.classes
  where id = nullif(p_payload->>'class_id', '')::uuid;

  if v_class.id is null then
    raise exception 'CLASS_REQUIRED' using errcode = '22023';
  end if;
  if not public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id) then
    raise exception 'WRITING_CLASS_FORBIDDEN' using errcode = '42501';
  end if;
  if v_status not in ('draft', 'published') then
    raise exception 'INVALID_WRITING_PROMPT_STATUS';
  end if;

  insert into public.writing_prompts (
    school_id, class_id, teacher_id, title, textual_genre, theme, prompt_command,
    school_year, component, bncc_codes, rubric, correction_modes, due_at,
    status, metadata, created_by, published_at
  )
  values (
    v_class.school_id,
    v_class.id,
    v_teacher_id,
    coalesce(nullif(p_payload->>'title', ''), 'Producao textual'),
    coalesce(nullif(p_payload->>'textual_genre', ''), nullif(p_payload->>'genre', ''), 'texto'),
    coalesce(nullif(p_payload->>'theme', ''), 'Tema livre'),
    coalesce(nullif(p_payload->>'prompt_command', ''), nullif(p_payload->>'command', ''), 'Produza seu texto conforme a proposta.'),
    coalesce(nullif(p_payload->>'school_year', ''), v_class.ano_escolar),
    nullif(p_payload->>'component', ''),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'bncc_codes', '[]'::jsonb))), '{}'::text[]),
    coalesce(p_payload->'rubric', '[]'::jsonb),
    coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'correction_modes', '[]'::jsonb))), array['DOCENTE']::text[]),
    nullif(p_payload->>'due_at', '')::timestamptz,
    v_status,
    coalesce(p_payload->'metadata', '{}'::jsonb) || jsonb_build_object('engine', 'PRODUCAO_TEXTUAL_IA_V1'),
    auth.uid(),
    case when v_status = 'published' then now() else null end
  )
  returning * into v_prompt;

  if v_target_type = 'group' then
    if v_group_id is null or not exists (
      select 1 from public.recomposition_intervention_groups g
      where g.id = v_group_id
        and g.class_id = v_class.id
        and g.school_id = v_class.school_id
        and g.status <> 'archived'
    ) then
      raise exception 'WRITING_GROUP_TARGET_INVALID';
    end if;
    insert into public.writing_prompt_targets (prompt_id, target_type, group_id, class_id)
    values (v_prompt.id, 'group', v_group_id, v_class.id);
  elsif v_target_type = 'student' then
    for v_student in select * from jsonb_array_elements(coalesce(p_payload->'student_ids', '[]'::jsonb))
    loop
      v_student_id := trim(both '\"' from v_student::text)::uuid;
      if not exists (
        select 1 from public.enrollments e
        where e.student_id = v_student_id
          and e.class_id = v_class.id
          and e.school_id = v_class.school_id
          and e.status in ('active', 'ativo')
      ) then
        raise exception 'WRITING_STUDENT_TARGET_INVALID';
      end if;
      insert into public.writing_prompt_targets (prompt_id, target_type, student_id, class_id)
      values (v_prompt.id, 'student', v_student_id, v_class.id);
    end loop;
  else
    insert into public.writing_prompt_targets (prompt_id, target_type, class_id)
    values (v_prompt.id, 'class', v_class.id);
  end if;

  perform public.writing_log_event(v_prompt.id, null, null, 'PROMPT_CREATED', to_jsonb(v_prompt));
  return jsonb_build_object('prompt', to_jsonb(v_prompt), 'target_type', v_target_type);
end;
$$;

create or replace function public.student_save_writing_draft(
  p_prompt_id uuid,
  p_text_content text,
  p_attachment jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_student_id uuid := public.writing_current_student_id();
  v_prompt public.writing_prompts%rowtype;
  v_submission public.writing_submissions%rowtype;
  v_version public.writing_submission_versions%rowtype;
  v_version_number integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  if v_student_id is null then
    raise exception 'STUDENT_CONTEXT_REQUIRED' using errcode = '22023';
  end if;

  select * into v_prompt from public.writing_prompts where id = p_prompt_id;
  if v_prompt.id is null or not public.writing_student_is_target(p_prompt_id, v_student_id) then
    raise exception 'WRITING_PROMPT_NOT_AVAILABLE' using errcode = '42501';
  end if;

  insert into public.writing_submissions (prompt_id, school_id, class_id, student_id, status)
  values (v_prompt.id, v_prompt.school_id, v_prompt.class_id, v_student_id, 'draft')
  on conflict (prompt_id, student_id) do update
    set status = case when public.writing_submissions.status in ('submitted', 'corrected') then public.writing_submissions.status else 'draft' end,
        updated_at = now()
  returning * into v_submission;

  if v_submission.status in ('submitted', 'corrected') then
    raise exception 'WRITING_SUBMISSION_LOCKED';
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
  from public.writing_submission_versions
  where submission_id = v_submission.id;

  insert into public.writing_submission_versions (
    submission_id, version_number, text_content, attachment, source_type,
    word_count, is_final, autosaved_at, created_by
  )
  values (
    v_submission.id,
    v_version_number,
    p_text_content,
    p_attachment,
    case when p_attachment is null then 'typed' when coalesce(p_attachment->>'mime_type', '') like 'image/%' then 'image' else 'file' end,
    array_length(regexp_split_to_array(btrim(coalesce(p_text_content, '')), '\\s+'), 1),
    false,
    now(),
    auth.uid()
  )
  returning * into v_version;

  update public.writing_submissions
     set current_version = v_version.version_number,
         updated_at = now()
   where id = v_submission.id
   returning * into v_submission;

  perform public.writing_log_event(v_prompt.id, v_submission.id, null, 'DRAFT_AUTOSAVED', jsonb_build_object('version_id', v_version.id));
  return jsonb_build_object('submission', to_jsonb(v_submission), 'version', to_jsonb(v_version));
end;
$$;

create or replace function public.student_submit_writing(
  p_prompt_id uuid,
  p_text_content text default null,
  p_attachment jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_saved jsonb;
  v_submission_id uuid;
  v_version_id uuid;
  v_submission public.writing_submissions%rowtype;
begin
  v_saved := public.student_save_writing_draft(p_prompt_id, p_text_content, p_attachment);
  v_submission_id := (v_saved #>> '{submission,id}')::uuid;
  v_version_id := (v_saved #>> '{version,id}')::uuid;

  update public.writing_submission_versions
     set is_final = true,
         submitted_at = now()
   where id = v_version_id;

  update public.writing_submissions
     set status = 'submitted',
         submitted_at = now(),
         updated_at = now()
   where id = v_submission_id
   returning * into v_submission;

  perform public.writing_log_event(v_submission.prompt_id, v_submission.id, null, 'FINAL_SUBMISSION', jsonb_build_object('version_id', v_version_id));
  return jsonb_build_object('submission', to_jsonb(v_submission), 'version_id', v_version_id);
end;
$$;

create or replace function public.teacher_prepare_writing_ai_correction(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_submission public.writing_submissions%rowtype;
  v_prompt public.writing_prompts%rowtype;
  v_version public.writing_submission_versions%rowtype;
  v_ai jsonb;
  v_provider jsonb;
  v_correction public.writing_corrections%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_submission from public.writing_submissions where id = p_submission_id for update;
  if v_submission.id is null then
    raise exception 'WRITING_SUBMISSION_NOT_FOUND';
  end if;
  if not public.avalia_plus_teacher_can_manage_class(v_submission.class_id, v_submission.school_id) then
    raise exception 'WRITING_CORRECTION_FORBIDDEN' using errcode = '42501';
  end if;
  select * into v_prompt from public.writing_prompts where id = v_submission.prompt_id;
  select * into v_version
  from public.writing_submission_versions
  where submission_id = v_submission.id
  order by version_number desc
  limit 1;

  v_provider := public.ai_provider_status();
  v_ai := public.ai_pedagogy_prepare_request(
    'teacher',
    'Preparar correcao de producao textual sem substituir o texto do aluno. Genero: ' || v_prompt.textual_genre || '. Criterios: ' || v_prompt.rubric::text,
    v_submission.student_id,
    v_submission.class_id,
    v_prompt.component,
    array_to_string(v_prompt.bncc_codes, ',')
  );

  insert into public.writing_corrections (
    submission_id, version_id, mode, provider_status, ai_interaction_id,
    status, created_by, strengths, improvements
  )
  values (
    v_submission.id,
    v_version.id,
    case when 'HIBRIDA_IA_DOCENTE' = any(v_prompt.correction_modes) then 'HIBRIDA_IA_DOCENTE' else 'IA' end,
    coalesce(v_provider->>'status', 'EMPTY_REAL'),
    nullif(v_ai->>'interaction_id', '')::uuid,
    case when coalesce(v_provider->>'status', 'EMPTY_REAL') = 'PASS' then 'ai_prepared' else 'teacher_review' end,
    auth.uid(),
    '[]'::jsonb,
    '[]'::jsonb
  )
  returning * into v_correction;

  update public.writing_submissions
     set status = 'in_correction',
         correction_mode = v_correction.mode,
         updated_at = now()
   where id = v_submission.id;

  perform public.writing_log_event(v_prompt.id, v_submission.id, v_correction.id, 'AI_CORRECTION_PREPARED', jsonb_build_object('provider', v_provider, 'ai', v_ai));
  return jsonb_build_object(
    'correction', to_jsonb(v_correction),
    'ai_correction_provider', coalesce(v_provider->>'status', 'EMPTY_REAL'),
    'ai_request', v_ai
  );
end;
$$;

create or replace function public.teacher_correct_writing_submission(
  p_submission_id uuid,
  p_correction jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_submission public.writing_submissions%rowtype;
  v_prompt public.writing_prompts%rowtype;
  v_version public.writing_submission_versions%rowtype;
  v_correction public.writing_corrections%rowtype;
  v_mode text := upper(coalesce(p_correction->>'mode', 'DOCENTE'));
  v_provider jsonb := public.ai_provider_status();
  v_item jsonb;
  v_overall numeric := nullif(p_correction->>'overall_score', '')::numeric;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  select * into v_submission from public.writing_submissions where id = p_submission_id for update;
  if v_submission.id is null then
    raise exception 'WRITING_SUBMISSION_NOT_FOUND';
  end if;
  if not public.avalia_plus_teacher_can_manage_class(v_submission.class_id, v_submission.school_id) then
    raise exception 'WRITING_CORRECTION_FORBIDDEN' using errcode = '42501';
  end if;
  if v_mode not in ('DOCENTE', 'IA', 'HIBRIDA_IA_DOCENTE') then
    raise exception 'INVALID_WRITING_CORRECTION_MODE';
  end if;
  if v_mode = 'IA' and coalesce(v_provider->>'status', 'EMPTY_REAL') <> 'PASS' then
    raise exception 'AI_CORRECTION_PROVIDER_EMPTY_REAL';
  end if;

  select * into v_prompt from public.writing_prompts where id = v_submission.prompt_id;
  select * into v_version
  from public.writing_submission_versions
  where submission_id = v_submission.id
  order by version_number desc
  limit 1;

  insert into public.writing_corrections (
    submission_id, version_id, mode, provider_status, status, overall_score,
    general_feedback, strengths, improvements, rewrite_guidance,
    created_by, validated_by, validated_at
  )
  values (
    v_submission.id,
    v_version.id,
    v_mode,
    case when v_mode = 'DOCENTE' then 'EMPTY_REAL' else coalesce(v_provider->>'status', 'EMPTY_REAL') end,
    case when v_mode = 'IA' then 'published' else 'validated' end,
    v_overall,
    nullif(p_correction->>'general_feedback', ''),
    coalesce(p_correction->'strengths', '[]'::jsonb),
    coalesce(p_correction->'improvements', '[]'::jsonb),
    nullif(p_correction->>'rewrite_guidance', ''),
    auth.uid(),
    auth.uid(),
    now()
  )
  returning * into v_correction;

  for v_item in select * from jsonb_array_elements(coalesce(p_correction->'rubric_scores', '[]'::jsonb))
  loop
    insert into public.writing_rubric_scores (
      correction_id, criterion_key, criterion_label, dimension, score, max_score, feedback, source
    )
    values (
      v_correction.id,
      coalesce(nullif(v_item->>'criterion_key', ''), nullif(v_item->>'key', ''), gen_random_uuid()::text),
      coalesce(nullif(v_item->>'criterion_label', ''), nullif(v_item->>'label', ''), 'Criterio'),
      coalesce(nullif(v_item->>'dimension', ''), 'criterio_configuravel'),
      nullif(v_item->>'score', '')::numeric,
      nullif(v_item->>'max_score', '')::numeric,
      nullif(v_item->>'feedback', ''),
      case when v_mode = 'HIBRIDA_IA_DOCENTE' then 'hybrid_validated' else 'teacher' end
    );
  end loop;

  for v_item in select * from jsonb_array_elements(coalesce(p_correction->'feedback_items', '[]'::jsonb))
  loop
    insert into public.writing_feedback_items (
      correction_id, version_id, feedback_type, paragraph_index,
      text_excerpt, feedback, suggestion, source
    )
    values (
      v_correction.id,
      v_version.id,
      coalesce(nullif(v_item->>'feedback_type', ''), 'paragraph'),
      nullif(v_item->>'paragraph_index', '')::integer,
      nullif(v_item->>'text_excerpt', ''),
      coalesce(nullif(v_item->>'feedback', ''), 'Feedback registrado.'),
      nullif(v_item->>'suggestion', ''),
      case when v_mode = 'HIBRIDA_IA_DOCENTE' then 'hybrid_validated' else 'teacher' end
    );
  end loop;

  update public.writing_submissions
     set status = case when nullif(v_correction.rewrite_guidance, '') is not null then 'revision_requested' else 'corrected' end,
         correction_mode = v_mode,
         final_score = v_overall,
         final_feedback = v_correction.general_feedback,
         corrected_at = now(),
         corrected_by = auth.uid(),
         updated_at = now()
   where id = v_submission.id
   returning * into v_submission;

  insert into public.writing_analytics_snapshots (
    school_id, class_id, student_id, prompt_id, textual_genre, component,
    submission_count, corrected_count, average_score, evolution
  )
  values (
    v_submission.school_id,
    v_submission.class_id,
    v_submission.student_id,
    v_submission.prompt_id,
    v_prompt.textual_genre,
    v_prompt.component,
    1,
    1,
    v_overall,
    jsonb_build_object('source', 'writing_correction', 'correction_id', v_correction.id)
  );

  perform public.writing_log_event(v_prompt.id, v_submission.id, v_correction.id, 'CORRECTION_PUBLISHED', jsonb_build_object('mode', v_mode, 'score', v_overall));
  return jsonb_build_object('submission', to_jsonb(v_submission), 'correction', to_jsonb(v_correction));
end;
$$;

create or replace function public.student_start_writing_rewrite(
  p_submission_id uuid,
  p_text_content text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_submission public.writing_submissions%rowtype;
  v_version public.writing_submission_versions%rowtype;
  v_version_number integer;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_submission
  from public.writing_submissions
  where id = p_submission_id
    and public.institutional_is_current_student(student_id)
  for update;
  if v_submission.id is null then
    raise exception 'WRITING_SUBMISSION_NOT_FOUND' using errcode = '42501';
  end if;
  if v_submission.status not in ('revision_requested', 'corrected') then
    raise exception 'WRITING_REWRITE_NOT_AVAILABLE';
  end if;

  select coalesce(max(version_number), 0) + 1
    into v_version_number
  from public.writing_submission_versions
  where submission_id = v_submission.id;

  insert into public.writing_submission_versions (
    submission_id, version_number, text_content, source_type,
    word_count, is_final, autosaved_at, created_by
  )
  values (
    v_submission.id,
    v_version_number,
    p_text_content,
    'typed',
    array_length(regexp_split_to_array(btrim(coalesce(p_text_content, '')), '\\s+'), 1),
    false,
    now(),
    auth.uid()
  )
  returning * into v_version;

  update public.writing_submissions
     set status = 'resubmitted',
         current_version = v_version.version_number,
         updated_at = now()
   where id = v_submission.id
   returning * into v_submission;

  perform public.writing_log_event(v_submission.prompt_id, v_submission.id, null, 'REWRITE_VERSION_CREATED', jsonb_build_object('version_id', v_version.id));
  return jsonb_build_object('submission', to_jsonb(v_submission), 'version', to_jsonb(v_version));
end;
$$;

create or replace function public.teacher_get_writing_analytics(
  p_class_id uuid,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_summary jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;
  select * into v_class from public.classes where id = p_class_id;
  if v_class.id is null then
    raise exception 'CLASS_NOT_FOUND';
  end if;
  if not (
    public.is_platform_admin()
    or public.secretaria_can_manage_school(v_class.school_id)
    or public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id)
  ) then
    raise exception 'WRITING_ANALYTICS_FORBIDDEN' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'status', case when count(*) > 0 then 'PASS' else 'EMPTY_REAL' end,
    'class_id', p_class_id,
    'submission_count', count(*),
    'corrected_count', count(*) filter (where s.status in ('corrected', 'revision_requested')),
    'average_score', round(avg(s.final_score) filter (where s.final_score is not null), 2),
    'by_genre', coalesce(jsonb_agg(distinct jsonb_build_object('genre', p.textual_genre, 'component', p.component)) filter (where p.id is not null), '[]'::jsonb)
  )
  into v_summary
  from public.writing_submissions s
  join public.writing_prompts p on p.id = s.prompt_id
  where s.class_id = p_class_id
    and (p_date_from is null or s.created_at::date >= p_date_from)
    and (p_date_to is null or s.created_at::date <= p_date_to);

  return coalesce(v_summary, jsonb_build_object('status', 'EMPTY_REAL', 'class_id', p_class_id));
end;
$$;

alter table public.writing_prompts enable row level security;
alter table public.writing_prompt_targets enable row level security;
alter table public.writing_submissions enable row level security;
alter table public.writing_submission_versions enable row level security;
alter table public.writing_corrections enable row level security;
alter table public.writing_rubric_scores enable row level security;
alter table public.writing_feedback_items enable row level security;
alter table public.writing_correction_audit_events enable row level security;
alter table public.writing_analytics_snapshots enable row level security;

drop policy if exists writing_prompts_select_authorized on public.writing_prompts;
create policy writing_prompts_select_authorized
on public.writing_prompts
for select
to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.avalia_plus_teacher_can_manage_class(class_id, school_id)
  or exists (
    select 1
    from public.students s
    where s.user_id = auth.uid()
      and public.writing_student_is_target(writing_prompts.id, s.id)
  )
);

drop policy if exists writing_targets_select_authorized on public.writing_prompt_targets;
create policy writing_targets_select_authorized
on public.writing_prompt_targets
for select
to authenticated
using (
  exists (
    select 1 from public.writing_prompts p
    where p.id = prompt_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(p.school_id)
        or public.avalia_plus_teacher_can_manage_class(p.class_id, p.school_id)
        or exists (
          select 1
          from public.students s
          where s.user_id = auth.uid()
            and coalesce(s.status, 'active') in ('active', 'ativo')
            and (
              writing_prompt_targets.target_type = 'class'
              or (writing_prompt_targets.target_type = 'student' and writing_prompt_targets.student_id = s.id)
              or (
                writing_prompt_targets.target_type = 'group'
                and exists (
                  select 1
                  from public.recomposition_intervention_group_students gs
                  where gs.group_id = writing_prompt_targets.group_id
                    and gs.student_id = s.id
                    and gs.status = 'active'
                )
              )
            )
        )
      )
  )
);

drop policy if exists writing_submissions_select_authorized on public.writing_submissions;
create policy writing_submissions_select_authorized
on public.writing_submissions
for select
to authenticated
using (public.writing_can_read_submission(id));

drop policy if exists writing_versions_select_authorized on public.writing_submission_versions;
create policy writing_versions_select_authorized
on public.writing_submission_versions
for select
to authenticated
using (exists (select 1 from public.writing_submissions s where s.id = submission_id and public.writing_can_read_submission(s.id)));

drop policy if exists writing_corrections_select_authorized on public.writing_corrections;
create policy writing_corrections_select_authorized
on public.writing_corrections
for select
to authenticated
using (exists (select 1 from public.writing_submissions s where s.id = submission_id and public.writing_can_read_submission(s.id)));

drop policy if exists writing_rubric_scores_select_authorized on public.writing_rubric_scores;
create policy writing_rubric_scores_select_authorized
on public.writing_rubric_scores
for select
to authenticated
using (
  exists (
    select 1
    from public.writing_corrections c
    join public.writing_submissions s on s.id = c.submission_id
    where c.id = correction_id
      and public.writing_can_read_submission(s.id)
  )
);

drop policy if exists writing_feedback_items_select_authorized on public.writing_feedback_items;
create policy writing_feedback_items_select_authorized
on public.writing_feedback_items
for select
to authenticated
using (
  exists (
    select 1
    from public.writing_corrections c
    join public.writing_submissions s on s.id = c.submission_id
    where c.id = correction_id
      and public.writing_can_read_submission(s.id)
  )
);

drop policy if exists writing_audit_select_authorized on public.writing_correction_audit_events;
create policy writing_audit_select_authorized
on public.writing_correction_audit_events
for select
to authenticated
using (
  actor_user_id = auth.uid()
  or (submission_id is not null and public.writing_can_read_submission(submission_id))
  or exists (
    select 1 from public.writing_prompts p
    where p.id = prompt_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(p.school_id)
        or public.avalia_plus_teacher_can_manage_class(p.class_id, p.school_id)
      )
  )
);

drop policy if exists writing_analytics_select_authorized on public.writing_analytics_snapshots;
create policy writing_analytics_select_authorized
on public.writing_analytics_snapshots
for select
to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or (class_id is not null and public.avalia_plus_teacher_can_manage_class(class_id, school_id))
  or (student_id is not null and public.ai_can_access_student_context(student_id, class_id, school_id))
);

revoke all on table public.writing_prompts from public, anon, authenticated;
revoke all on table public.writing_prompt_targets from public, anon, authenticated;
revoke all on table public.writing_submissions from public, anon, authenticated;
revoke all on table public.writing_submission_versions from public, anon, authenticated;
revoke all on table public.writing_corrections from public, anon, authenticated;
revoke all on table public.writing_rubric_scores from public, anon, authenticated;
revoke all on table public.writing_feedback_items from public, anon, authenticated;
revoke all on table public.writing_correction_audit_events from public, anon, authenticated;
revoke all on table public.writing_analytics_snapshots from public, anon, authenticated;

grant select on table public.writing_prompts to authenticated;
grant select on table public.writing_prompt_targets to authenticated;
grant select on table public.writing_submissions to authenticated;
grant select on table public.writing_submission_versions to authenticated;
grant select on table public.writing_corrections to authenticated;
grant select on table public.writing_rubric_scores to authenticated;
grant select on table public.writing_feedback_items to authenticated;
grant select on table public.writing_correction_audit_events to authenticated;
grant select on table public.writing_analytics_snapshots to authenticated;

grant all on table public.writing_prompts to service_role;
grant all on table public.writing_prompt_targets to service_role;
grant all on table public.writing_submissions to service_role;
grant all on table public.writing_submission_versions to service_role;
grant all on table public.writing_corrections to service_role;
grant all on table public.writing_rubric_scores to service_role;
grant all on table public.writing_feedback_items to service_role;
grant all on table public.writing_correction_audit_events to service_role;
grant all on table public.writing_analytics_snapshots to service_role;

revoke all on function public.writing_current_student_id() from public, anon;
revoke all on function public.writing_student_is_target(uuid, uuid) from public, anon;
revoke all on function public.writing_can_read_submission(uuid) from public, anon;
revoke all on function public.writing_log_event(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.teacher_create_writing_prompt(jsonb) from public, anon;
revoke all on function public.student_save_writing_draft(uuid, text, jsonb) from public, anon;
revoke all on function public.student_submit_writing(uuid, text, jsonb) from public, anon;
revoke all on function public.teacher_prepare_writing_ai_correction(uuid) from public, anon;
revoke all on function public.teacher_correct_writing_submission(uuid, jsonb) from public, anon;
revoke all on function public.student_start_writing_rewrite(uuid, text) from public, anon;
revoke all on function public.teacher_get_writing_analytics(uuid, date, date) from public, anon;

grant execute on function public.writing_current_student_id() to authenticated, service_role;
grant execute on function public.writing_student_is_target(uuid, uuid) to authenticated, service_role;
grant execute on function public.writing_can_read_submission(uuid) to authenticated, service_role;
grant execute on function public.writing_log_event(uuid, uuid, uuid, text, jsonb) to service_role;
grant execute on function public.teacher_create_writing_prompt(jsonb) to authenticated, service_role;
grant execute on function public.student_save_writing_draft(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.student_submit_writing(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.teacher_prepare_writing_ai_correction(uuid) to authenticated, service_role;
grant execute on function public.teacher_correct_writing_submission(uuid, jsonb) to authenticated, service_role;
grant execute on function public.student_start_writing_rewrite(uuid, text) to authenticated, service_role;
grant execute on function public.teacher_get_writing_analytics(uuid, date, date) to authenticated, service_role;

comment on table public.writing_prompts is
  'Producao Textual V1: propostas docentes por genero, tema, BNCC, rubrica e prazo.';
comment on table public.writing_submissions is
  'Producao Textual V1: entrega canonica do aluno com rascunho, autosave, envio final e status de correcao.';
comment on table public.writing_corrections is
  'Producao Textual V1: correcao docente, IA ou hibrida. IA usa ai_* e permanece EMPTY_REAL sem provedor.';
comment on table public.writing_analytics_snapshots is
  'Producao Textual V1: snapshots de evolucao por aluno, turma, escola, genero e criterio.';

do $$
declare
  v_anon_tables integer;
  v_anon_functions integer;
  v_writing_tables integer;
  v_secret_columns integer;
begin
  select count(*) into v_writing_tables
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in (
      'writing_prompts',
      'writing_prompt_targets',
      'writing_submissions',
      'writing_submission_versions',
      'writing_corrections',
      'writing_rubric_scores',
      'writing_feedback_items',
      'writing_correction_audit_events',
      'writing_analytics_snapshots'
    );
  if v_writing_tables <> 9 then
    raise exception 'VALIDACAO bloqueada: tabelas writing_* incompletas';
  end if;

  select count(*) into v_anon_tables
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name like 'writing_%'
    and grantee = 'anon';
  if v_anon_tables <> 0 then
    raise exception 'VALIDACAO bloqueada: tabelas writing_* expostas para anon';
  end if;

  select count(*) into v_anon_functions
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and (routine_name like 'writing_%' or routine_name like 'teacher_%writing%' or routine_name like 'student_%writing%')
    and grantee in ('PUBLIC', 'anon');
  if v_anon_functions <> 0 then
    raise exception 'VALIDACAO bloqueada: funcoes de producao textual expostas para PUBLIC/anon';
  end if;

  select count(*) into v_secret_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name like 'writing_%'
    and column_name in ('api_key', 'secret_key', 'token', 'password');
  if v_secret_columns <> 0 then
    raise exception 'VALIDACAO bloqueada: coluna sensivel em writing_*';
  end if;
end $$;
