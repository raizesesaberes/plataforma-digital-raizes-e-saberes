-- Avalia+ 2.0 Fase 1 - Banco de Itens, workflow editorial e montagem de provas.
-- Evolui o motor canonico existente sem criar um segundo Avalia+.

create extension if not exists pgcrypto;

alter table public.question_items
  add column if not exists school_id uuid references public.schools(id) on delete set null,
  add column if not exists curriculum_matrix text,
  add column if not exists curriculum_source text not null default 'BNCC',
  add column if not exists command_text text,
  add column if not exists pedagogical_comment text,
  add column if not exists distractor_comment text,
  add column if not exists author_user_id uuid,
  add column if not exists approver_user_id uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists workflow_status text not null default 'EM_ELABORACAO',
  add column if not exists workflow_version integer not null default 1,
  add column if not exists locked_after_use boolean not null default false,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.assessments
  add column if not exists school_id uuid references public.schools(id) on delete set null,
  add column if not exists assessment_year text,
  add column if not exists matrix text,
  add column if not exists max_booklets integer not null default 1,
  add column if not exists skill_map jsonb not null default '[]'::jsonb,
  add column if not exists item_version_policy text not null default 'SNAPSHOT_ON_INSERT',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'question_items_curriculum_source_check'
      and conrelid = 'public.question_items'::regclass
  ) then
    alter table public.question_items
      add constraint question_items_curriculum_source_check
      check (curriculum_source in ('BNCC', 'SAEB', 'CURRICULO_PROPRIO', 'BNCC_SAEB', 'OUTRO'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_items_workflow_status_check'
      and conrelid = 'public.question_items'::regclass
  ) then
    alter table public.question_items
      add constraint question_items_workflow_status_check
      check (workflow_status in ('EM_ELABORACAO', 'EM_REVISAO', 'APROVADO', 'ARQUIVADO'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_items_workflow_version_check'
      and conrelid = 'public.question_items'::regclass
  ) then
    alter table public.question_items
      add constraint question_items_workflow_version_check
      check (workflow_version > 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'assessments_max_booklets_check'
      and conrelid = 'public.assessments'::regclass
  ) then
    alter table public.assessments
      add constraint assessments_max_booklets_check
      check (max_booklets between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'assessments_item_version_policy_check'
      and conrelid = 'public.assessments'::regclass
  ) then
    alter table public.assessments
      add constraint assessments_item_version_policy_check
      check (item_version_policy in ('SNAPSHOT_ON_INSERT'));
  end if;
end $$;

update public.question_items
set
  curriculum_matrix = coalesce(curriculum_matrix, reference_matrix),
  command_text = coalesce(command_text, statement),
  pedagogical_comment = coalesce(pedagogical_comment, justification),
  author_user_id = coalesce(author_user_id, created_by),
  workflow_status = case
    when publication_status = 'PUBLICADO' or curation_status in ('APROVADO', 'PUBLICADO', 'HOMOLOGADO') then 'APROVADO'
    when curation_status in ('EM_REVISAO', 'AGUARDANDO_REVISAO_PEDAGOGICA', 'CORRECAO_SOLICITADA') then 'EM_REVISAO'
    when curation_status = 'ARQUIVADO' then 'ARQUIVADO'
    else 'EM_ELABORACAO'
  end,
  approved_at = case
    when approved_at is null and (publication_status = 'PUBLICADO' or curation_status in ('APROVADO', 'PUBLICADO', 'HOMOLOGADO')) then coalesce(published_at, last_reviewed_at, updated_at)
    else approved_at
  end,
  locked_after_use = locked_after_use or exists (
    select 1 from public.assessment_questions aq where aq.question_id = question_items.id
  )
where true;

create table if not exists public.question_item_versions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_items(id) on delete cascade,
  version_number integer not null,
  version_label text not null,
  workflow_status text not null,
  publication_status public.question_publication_status not null,
  curation_status public.question_curation_status not null,
  snapshot jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  reason text,
  unique (question_id, version_number)
);

create table if not exists public.question_workflow_events (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_items(id) on delete cascade,
  from_status text,
  to_status text not null,
  actor_user_id uuid,
  actor_role text,
  comment text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_booklets (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  code text not null,
  title text,
  position integer not null,
  question_count integer not null default 0,
  skill_map jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, code),
  unique (assessment_id, position),
  check (position between 1 and 5)
);

create table if not exists public.assessment_booklet_questions (
  id uuid primary key default gen_random_uuid(),
  booklet_id uuid not null references public.assessment_booklets(id) on delete cascade,
  assessment_question_id uuid not null references public.assessment_questions(id) on delete cascade,
  question_id uuid not null references public.question_items(id),
  position integer not null,
  version_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (booklet_id, position),
  unique (booklet_id, question_id)
);

create index if not exists idx_question_items_curriculum_v2 on public.question_items (school_year, component, curriculum_source, curriculum_matrix, difficulty, workflow_status);
create index if not exists idx_question_items_skill_v2 on public.question_items (bncc_skill, reference_matrix, thematic_unit, knowledge_object);
create index if not exists idx_question_item_versions_question on public.question_item_versions (question_id, version_number desc);
create index if not exists idx_question_workflow_events_question on public.question_workflow_events (question_id, created_at desc);
create index if not exists idx_assessment_booklets_assessment on public.assessment_booklets (assessment_id, position);
create index if not exists idx_assessment_booklet_questions_booklet on public.assessment_booklet_questions (booklet_id, position);

alter table public.question_item_versions enable row level security;
alter table public.question_workflow_events enable row level security;
alter table public.assessment_booklets enable row level security;
alter table public.assessment_booklet_questions enable row level security;

create or replace function public.avalia_plus_current_role()
returns text
language sql
stable
as $$
  select coalesce(public.current_question_bank_role(), '');
$$;

create or replace function public.avalia_plus_can_author_items()
returns boolean
language sql
stable
as $$
  select public.has_question_bank_role(array[
    'admin',
    'administrador',
    'administrador_nacional',
    'curator',
    'curador',
    'professor',
    'elaborador',
    'service_role'
  ]);
$$;

create or replace function public.avalia_plus_can_review_items()
returns boolean
language sql
stable
as $$
  select public.has_question_bank_role(array[
    'admin',
    'administrador',
    'administrador_nacional',
    'curator',
    'curador',
    'revisor',
    'revisor_pedagogico',
    'service_role'
  ]);
$$;

create or replace function public.avalia_plus_can_approve_items()
returns boolean
language sql
stable
as $$
  select public.has_question_bank_role(array[
    'admin',
    'administrador',
    'administrador_nacional',
    'aprovador',
    'curator',
    'curador',
    'service_role'
  ]);
$$;

create or replace function public.avalia_plus_item_is_used(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.assessment_questions aq where aq.question_id = p_question_id)
    or exists (select 1 from public.assessment_booklet_questions abq where abq.question_id = p_question_id);
$$;

create or replace function public.avalia_plus_question_snapshot(p_question_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'question', to_jsonb(qi),
    'alternatives', coalesce((
      select jsonb_agg(to_jsonb(qa) order by qa.position)
      from public.question_alternatives qa
      where qa.question_id = qi.id
    ), '[]'::jsonb),
    'media', coalesce((
      select jsonb_agg(to_jsonb(qm) order by qm.created_at)
      from public.question_media qm
      where qm.question_id = qi.id
    ), '[]'::jsonb),
    'version_number', qi.workflow_version,
    'snapshot_at', now()
  )
  from public.question_items qi
  where qi.id = p_question_id;
$$;

create or replace function public.avalia_plus_record_item_version(
  p_question_id uuid,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.question_items%rowtype;
  v_version_id uuid;
begin
  select * into v_item from public.question_items where id = p_question_id;
  if not found then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  insert into public.question_item_versions (
    question_id,
    version_number,
    version_label,
    workflow_status,
    publication_status,
    curation_status,
    snapshot,
    created_by,
    reason
  )
  values (
    p_question_id,
    v_item.workflow_version,
    v_item.version,
    v_item.workflow_status,
    v_item.publication_status,
    v_item.curation_status,
    public.avalia_plus_question_snapshot(p_question_id),
    auth.uid(),
    p_reason
  )
  on conflict (question_id, version_number) do update
  set
    snapshot = excluded.snapshot,
    reason = coalesce(excluded.reason, public.question_item_versions.reason)
  returning id into v_version_id;

  return v_version_id;
end;
$$;

create or replace function public.avalia_plus_set_item_workflow(
  p_question_id uuid,
  p_status text,
  p_comment text default null
)
returns public.question_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.question_items%rowtype;
  v_previous text;
  v_next_curation public.question_curation_status;
  v_next_publication public.question_publication_status;
begin
  if p_status not in ('EM_ELABORACAO', 'EM_REVISAO', 'APROVADO', 'ARQUIVADO') then
    raise exception 'INVALID_WORKFLOW_STATUS';
  end if;

  if p_status = 'APROVADO' and not public.avalia_plus_can_approve_items() then
    raise exception 'UNAUTHORIZED_APPROVAL';
  elsif p_status = 'EM_REVISAO' and not (public.avalia_plus_can_author_items() or public.avalia_plus_can_review_items()) then
    raise exception 'UNAUTHORIZED_REVIEW';
  elsif p_status in ('EM_ELABORACAO', 'ARQUIVADO') and not (public.avalia_plus_can_author_items() or public.avalia_plus_can_review_items() or public.avalia_plus_can_approve_items()) then
    raise exception 'UNAUTHORIZED_ITEM_EDIT';
  end if;

  select * into v_item from public.question_items where id = p_question_id for update;
  if not found then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  v_previous := v_item.workflow_status;
  perform public.avalia_plus_record_item_version(p_question_id, 'workflow:' || coalesce(v_previous, '') || '->' || p_status);

  v_next_curation := case p_status
    when 'APROVADO' then 'APROVADO'::public.question_curation_status
    when 'EM_REVISAO' then 'EM_REVISAO'::public.question_curation_status
    when 'ARQUIVADO' then 'ARQUIVADO'::public.question_curation_status
    else 'RASCUNHO'::public.question_curation_status
  end;
  v_next_publication := case p_status
    when 'APROVADO' then 'PUBLICADO'::public.question_publication_status
    when 'ARQUIVADO' then 'ARQUIVADO'::public.question_publication_status
    else 'NAO_PUBLICADO'::public.question_publication_status
  end;

  update public.question_items
  set
    workflow_status = p_status,
    curation_status = v_next_curation,
    publication_status = v_next_publication,
    approver_user_id = case when p_status = 'APROVADO' then auth.uid() else approver_user_id end,
    approved_at = case when p_status = 'APROVADO' then coalesce(approved_at, now()) else approved_at end,
    published_at = case when p_status = 'APROVADO' then coalesce(published_at, now()) else published_at end,
    last_reviewed_at = case when p_status in ('EM_REVISAO', 'APROVADO') then now() else last_reviewed_at end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_question_id
  returning * into v_item;

  insert into public.question_workflow_events (
    question_id,
    from_status,
    to_status,
    actor_user_id,
    actor_role,
    comment,
    snapshot
  )
  values (
    p_question_id,
    v_previous,
    p_status,
    auth.uid(),
    public.avalia_plus_current_role(),
    p_comment,
    public.avalia_plus_question_snapshot(p_question_id)
  );

  if p_status = 'APROVADO' then
    perform public.avalia_plus_record_item_version(p_question_id, 'approved');
  end if;

  return v_item;
end;
$$;

create or replace function public.avalia_plus_create_item(p_item jsonb)
returns public.question_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.question_items%rowtype;
begin
  if not public.avalia_plus_can_author_items() then
    raise exception 'UNAUTHORIZED_ITEM_EDIT';
  end if;

  insert into public.question_items (
    code,
    internal_title,
    component,
    stage,
    school_year,
    thematic_unit,
    knowledge_object,
    bncc_skill,
    reference_matrix,
    curriculum_matrix,
    curriculum_source,
    proficiency_level,
    difficulty,
    cognitive_process,
    question_type,
    statement,
    command_text,
    base_text,
    correct_answer,
    justification,
    pedagogical_comment,
    success_feedback,
    error_feedback,
    recommended_intervention,
    estimated_minutes,
    accessibility_notes,
    source_id,
    author_name,
    author_user_id,
    license_id,
    legal_classification,
    curation_status,
    publication_status,
    workflow_status,
    created_by,
    updated_by,
    metadata
  )
  values (
    coalesce(nullif(p_item->>'code', ''), 'RS-' || upper(substr(gen_random_uuid()::text, 1, 8))),
    p_item->>'internal_title',
    p_item->>'component',
    p_item->>'stage',
    p_item->>'school_year',
    p_item->>'thematic_unit',
    p_item->>'knowledge_object',
    p_item->>'bncc_skill',
    p_item->>'reference_matrix',
    coalesce(p_item->>'curriculum_matrix', p_item->>'reference_matrix'),
    coalesce(nullif(p_item->>'curriculum_source', ''), 'BNCC'),
    p_item->>'proficiency_level',
    p_item->>'difficulty',
    p_item->>'cognitive_process',
    coalesce(nullif(p_item->>'question_type', ''), 'multipla_escolha'),
    p_item->>'statement',
    coalesce(p_item->>'command_text', p_item->>'statement'),
    p_item->>'base_text',
    p_item->>'correct_answer',
    p_item->>'justification',
    coalesce(p_item->>'pedagogical_comment', p_item->>'justification'),
    p_item->>'success_feedback',
    p_item->>'error_feedback',
    p_item->>'recommended_intervention',
    nullif(p_item->>'estimated_minutes', '')::integer,
    p_item->>'accessibility_notes',
    nullif(p_item->>'source_id', '')::uuid,
    coalesce(nullif(p_item->>'author_name', ''), 'Raizes e Saberes'),
    auth.uid(),
    nullif(p_item->>'license_id', '')::uuid,
    coalesce(nullif(p_item->>'legal_classification', ''), 'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB')::public.question_legal_classification,
    'RASCUNHO',
    'NAO_PUBLICADO',
    'EM_ELABORACAO',
    auth.uid(),
    auth.uid(),
    coalesce(p_item->'metadata', '{}'::jsonb)
  )
  returning * into v_item;

  insert into public.question_workflow_events (
    question_id,
    to_status,
    actor_user_id,
    actor_role,
    comment,
    snapshot
  )
  values (
    v_item.id,
    'EM_ELABORACAO',
    auth.uid(),
    public.avalia_plus_current_role(),
    'Item criado no Avalia+ 2.0',
    public.avalia_plus_question_snapshot(v_item.id)
  );

  return v_item;
end;
$$;

create or replace function public.avalia_plus_touch_item_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and (
    old.statement is distinct from new.statement
    or old.command_text is distinct from new.command_text
    or old.correct_answer is distinct from new.correct_answer
    or old.justification is distinct from new.justification
    or old.bncc_skill is distinct from new.bncc_skill
    or old.reference_matrix is distinct from new.reference_matrix
    or old.curriculum_matrix is distinct from new.curriculum_matrix
    or old.difficulty is distinct from new.difficulty
  ) then
    if public.avalia_plus_item_is_used(old.id) or old.workflow_status = 'APROVADO' then
      perform public.avalia_plus_record_item_version(old.id, 'before-content-update');
      new.workflow_version := old.workflow_version + 1;
      new.version := split_part(coalesce(old.version, '1.0'), '.', 1) || '.' || new.workflow_version::text;
      new.workflow_status := 'EM_ELABORACAO';
      new.curation_status := 'RASCUNHO';
      new.publication_status := 'NAO_PUBLICADO';
      new.approved_at := null;
      new.approver_user_id := null;
      new.published_at := null;
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_avalia_plus_touch_item_version on public.question_items;
create trigger trg_avalia_plus_touch_item_version
before update on public.question_items
for each row
execute function public.avalia_plus_touch_item_version();

create or replace function public.avalia_plus_fill_assessment_question_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.version_snapshot is null or new.version_snapshot = '{}'::jsonb then
    new.version_snapshot := public.avalia_plus_question_snapshot(new.question_id);
  end if;
  update public.question_items
  set locked_after_use = true
  where id = new.question_id;
  return new;
end;
$$;

drop trigger if exists trg_avalia_plus_assessment_question_snapshot on public.assessment_questions;
create trigger trg_avalia_plus_assessment_question_snapshot
before insert or update of question_id, version_snapshot on public.assessment_questions
for each row
execute function public.avalia_plus_fill_assessment_question_snapshot();

create or replace function public.avalia_plus_build_skill_map(p_assessment_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'skill', skill,
      'descriptor', descriptor,
      'questions', question_count,
      'points', points
    )
    order by skill, descriptor
  ), '[]'::jsonb)
  from (
    select
      coalesce(nullif(qi.bncc_skill, ''), 'NAO_INFORMADA') as skill,
      coalesce(nullif(qi.reference_matrix, ''), nullif(qi.curriculum_matrix, ''), 'NAO_INFORMADO') as descriptor,
      count(*)::integer as question_count,
      coalesce(sum(aq.points), 0) as points
    from public.assessment_questions aq
    join public.question_items qi on qi.id = aq.question_id
    where aq.assessment_id = p_assessment_id
    group by 1, 2
  ) mapped;
$$;

create or replace function public.avalia_plus_create_assessment_from_bank(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assessment public.assessments%rowtype;
  v_question jsonb;
  v_question_id uuid;
  v_position integer := 0;
  v_points numeric(8,2);
  v_booklet jsonb;
  v_booklet_row public.assessment_booklets%rowtype;
  v_booklet_count integer;
  v_assessment_question_id uuid;
begin
  if not (public.avalia_plus_can_author_items() or public.has_question_bank_role(array['gestor', 'gestor_da_rede', 'administrador_nacional', 'service_role'])) then
    raise exception 'UNAUTHORIZED_ASSESSMENT_ASSEMBLY';
  end if;

  insert into public.assessments (
    title,
    description,
    owner_user_id,
    owner_role,
    class_id,
    class_name,
    status,
    cover_template,
    instructions,
    application_date,
    component,
    school_year,
    school_id,
    assessment_year,
    matrix,
    max_booklets,
    metadata
  )
  values (
    coalesce(nullif(p_payload->>'title', ''), 'Avalia+ sem titulo'),
    p_payload->>'description',
    auth.uid(),
    public.avalia_plus_current_role(),
    nullif(p_payload->>'class_id', '')::uuid,
    p_payload->>'class_name',
    'RASCUNHO',
    p_payload->>'cover_template',
    p_payload->>'instructions',
    nullif(p_payload->>'application_date', '')::date,
    p_payload->>'component',
    p_payload->>'school_year',
    nullif(p_payload->>'school_id', '')::uuid,
    p_payload->>'assessment_year',
    p_payload->>'matrix',
    least(greatest(coalesce(jsonb_array_length(coalesce(p_payload->'booklets', '[]'::jsonb)), 1), 1), 5),
    coalesce(p_payload->'metadata', '{}'::jsonb)
  )
  returning * into v_assessment;

  for v_question in select * from jsonb_array_elements(coalesce(p_payload->'questions', '[]'::jsonb))
  loop
    v_question_id := nullif(v_question->>'question_id', '')::uuid;
    v_points := coalesce(nullif(v_question->>'points', '')::numeric, 1);
    if not exists (
      select 1 from public.question_items qi
      where qi.id = v_question_id
        and qi.workflow_status = 'APROVADO'
        and qi.publication_status = 'PUBLICADO'
    ) then
      raise exception 'ONLY_APPROVED_ITEMS_CAN_BE_USED:%', v_question_id;
    end if;
    v_position := v_position + 1;
    insert into public.assessment_questions (
      assessment_id,
      question_id,
      position,
      points,
      version_snapshot
    )
    values (
      v_assessment.id,
      v_question_id,
      v_position,
      v_points,
      public.avalia_plus_question_snapshot(v_question_id)
    );
  end loop;

  v_booklet_count := jsonb_array_length(coalesce(p_payload->'booklets', '[]'::jsonb));
  if v_booklet_count = 0 then
    insert into public.assessment_booklets (assessment_id, code, title, position)
    values (v_assessment.id, 'A', 'Caderno A', 1)
    returning * into v_booklet_row;

    insert into public.assessment_booklet_questions (
      booklet_id,
      assessment_question_id,
      question_id,
      position,
      version_snapshot
    )
    select
      v_booklet_row.id,
      aq.id,
      aq.question_id,
      aq.position,
      aq.version_snapshot
    from public.assessment_questions aq
    where aq.assessment_id = v_assessment.id
    order by aq.position;

    update public.assessment_booklets
    set question_count = (select count(*) from public.assessment_booklet_questions where booklet_id = v_booklet_row.id),
        skill_map = public.avalia_plus_build_skill_map(v_assessment.id),
        updated_at = now()
    where id = v_booklet_row.id;
  else
    if v_booklet_count > 5 then
      raise exception 'MAX_FIVE_BOOKLETS';
    end if;

    for v_booklet in select * from jsonb_array_elements(p_payload->'booklets')
    loop
      insert into public.assessment_booklets (assessment_id, code, title, position)
      values (
        v_assessment.id,
        coalesce(nullif(v_booklet->>'code', ''), chr(64 + coalesce(nullif(v_booklet->>'position', '')::integer, 1))),
        coalesce(v_booklet->>'title', 'Caderno ' || coalesce(v_booklet->>'code', '')),
        coalesce(nullif(v_booklet->>'position', '')::integer, 1)
      )
      returning * into v_booklet_row;

      for v_question in select * from jsonb_array_elements(coalesce(v_booklet->'questions', '[]'::jsonb))
      loop
        v_question_id := nullif(v_question->>'question_id', '')::uuid;
        select aq.id into v_assessment_question_id
        from public.assessment_questions aq
        where aq.assessment_id = v_assessment.id
          and aq.question_id = v_question_id
        limit 1;

        if v_assessment_question_id is null then
          raise exception 'BOOKLET_QUESTION_NOT_IN_ASSESSMENT:%', v_question_id;
        end if;

        insert into public.assessment_booklet_questions (
          booklet_id,
          assessment_question_id,
          question_id,
          position,
          version_snapshot
        )
        values (
          v_booklet_row.id,
          v_assessment_question_id,
          v_question_id,
          coalesce(nullif(v_question->>'position', '')::integer, 1),
          public.avalia_plus_question_snapshot(v_question_id)
        );
      end loop;

      update public.assessment_booklets
      set question_count = (select count(*) from public.assessment_booklet_questions where booklet_id = v_booklet_row.id),
          skill_map = public.avalia_plus_build_skill_map(v_assessment.id),
          updated_at = now()
      where id = v_booklet_row.id;
    end loop;
  end if;

  update public.assessments
  set
    total_points = coalesce((select sum(points) from public.assessment_questions where assessment_id = v_assessment.id), 0),
    skill_map = public.avalia_plus_build_skill_map(v_assessment.id),
    updated_at = now()
  where id = v_assessment.id
  returning * into v_assessment;

  return jsonb_build_object(
    'assessment', to_jsonb(v_assessment),
    'questions', (
      select coalesce(jsonb_agg(to_jsonb(aq) order by aq.position), '[]'::jsonb)
      from public.assessment_questions aq
      where aq.assessment_id = v_assessment.id
    ),
    'booklets', (
      select coalesce(jsonb_agg(to_jsonb(ab) order by ab.position), '[]'::jsonb)
      from public.assessment_booklets ab
      where ab.assessment_id = v_assessment.id
    ),
    'skill_map', v_assessment.skill_map
  );
end;
$$;

drop policy if exists "question item versions readable by assessment staff" on public.question_item_versions;
create policy "question item versions readable by assessment staff" on public.question_item_versions
for select using (
  public.has_question_bank_role(array['admin','administrador','administrador_nacional','gestor','gestor_da_rede','curator','curador','revisor','revisor_pedagogico','professor','aplicador','visualizador','service_role'])
);

drop policy if exists "question workflow events readable by assessment staff" on public.question_workflow_events;
create policy "question workflow events readable by assessment staff" on public.question_workflow_events
for select using (
  public.has_question_bank_role(array['admin','administrador','administrador_nacional','gestor','gestor_da_rede','curator','curador','revisor','revisor_pedagogico','professor','aplicador','visualizador','service_role'])
);

drop policy if exists "assessment booklets follow assessment read" on public.assessment_booklets;
create policy "assessment booklets follow assessment read" on public.assessment_booklets
for select using (
  exists (
    select 1 from public.assessments a
    where a.id = assessment_id
      and (
        a.owner_user_id = auth.uid()
        or public.has_question_bank_role(array['admin','administrador','administrador_nacional','gestor','gestor_da_rede','curator','curador','revisor','revisor_pedagogico','professor','aplicador','visualizador','service_role'])
      )
  )
);

drop policy if exists "assessment booklet questions follow assessment read" on public.assessment_booklet_questions;
create policy "assessment booklet questions follow assessment read" on public.assessment_booklet_questions
for select using (
  exists (
    select 1
    from public.assessment_booklets ab
    join public.assessments a on a.id = ab.assessment_id
    where ab.id = booklet_id
      and (
        a.owner_user_id = auth.uid()
        or public.has_question_bank_role(array['admin','administrador','administrador_nacional','gestor','gestor_da_rede','curator','curador','revisor','revisor_pedagogico','professor','aplicador','visualizador','service_role'])
      )
  )
);

revoke insert, update, delete, truncate on public.question_item_versions from authenticated;
revoke insert, update, delete, truncate on public.question_workflow_events from authenticated;
revoke insert, update, delete, truncate on public.assessment_booklets from authenticated;
revoke insert, update, delete, truncate on public.assessment_booklet_questions from authenticated;

grant select on public.question_item_versions to authenticated;
grant select on public.question_workflow_events to authenticated;
grant select on public.assessment_booklets to authenticated;
grant select on public.assessment_booklet_questions to authenticated;

revoke all on function public.avalia_plus_record_item_version(uuid, text) from public, anon;
revoke all on function public.avalia_plus_set_item_workflow(uuid, text, text) from public, anon;
revoke all on function public.avalia_plus_create_item(jsonb) from public, anon;
revoke all on function public.avalia_plus_create_assessment_from_bank(jsonb) from public, anon;
revoke all on function public.avalia_plus_question_snapshot(uuid) from public, anon;
revoke all on function public.avalia_plus_build_skill_map(uuid) from public, anon;

grant execute on function public.avalia_plus_set_item_workflow(uuid, text, text) to authenticated;
grant execute on function public.avalia_plus_create_item(jsonb) to authenticated;
grant execute on function public.avalia_plus_create_assessment_from_bank(jsonb) to authenticated;
grant execute on function public.avalia_plus_question_snapshot(uuid) to authenticated;
grant execute on function public.avalia_plus_build_skill_map(uuid) to authenticated;
