-- Banco de Questoes 07 - adaptacoes privadas do professor.
-- Mantem o item oficial GLOBAL_RAIZES imutavel para professor comum.

alter table public.question_items
  add column if not exists source_question_id uuid references public.question_items(id) on delete set null,
  add column if not exists owner_user_id uuid,
  add column if not exists ownership_scope text not null default 'GLOBAL_RAIZES',
  add column if not exists origin_type text not null default 'GLOBAL_RAIZES',
  add column if not exists adaptation_version integer not null default 1,
  add column if not exists adapted_from_version integer,
  add column if not exists adapted_at timestamptz,
  add column if not exists provenance jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'question_items_ownership_scope_check'
      and conrelid = 'public.question_items'::regclass
  ) then
    alter table public.question_items
      add constraint question_items_ownership_scope_check
      check (ownership_scope in ('GLOBAL_RAIZES', 'TEACHER_PRIVATE', 'SCHOOL_SHARED', 'NETWORK_SHARED'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_items_origin_type_check'
      and conrelid = 'public.question_items'::regclass
  ) then
    alter table public.question_items
      add constraint question_items_origin_type_check
      check (origin_type in ('GLOBAL_RAIZES', 'EDITORIAL', 'TEACHER_AUTHORIAL', 'TEACHER_ADAPTATION'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_items_teacher_adaptation_source_check'
      and conrelid = 'public.question_items'::regclass
  ) then
    alter table public.question_items
      add constraint question_items_teacher_adaptation_source_check
      check (
        origin_type <> 'TEACHER_ADAPTATION'
        or (source_question_id is not null and owner_user_id is not null and ownership_scope = 'TEACHER_PRIVATE')
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'question_items_adaptation_version_check'
      and conrelid = 'public.question_items'::regclass
  ) then
    alter table public.question_items
      add constraint question_items_adaptation_version_check
      check (adaptation_version > 0);
  end if;
end $$;

create index if not exists idx_question_items_source_question on public.question_items(source_question_id);
create index if not exists idx_question_items_owner_scope on public.question_items(owner_user_id, ownership_scope, origin_type, updated_at desc);
create index if not exists idx_question_items_school_scope on public.question_items(school_id, ownership_scope, origin_type);

create or replace function public.question_bank_teacher_can_use_school(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_school_id is not null
    and (
      public.is_platform_admin()
      or public.has_question_bank_role(array['admin','administrador','administrador_nacional','gestor','gestor_da_rede','service_role'])
      or public.institutional_has_active_school_membership(p_school_id)
      or exists (
        select 1
        from public.teachers t
        where t.school_id = p_school_id
          and t.profile_id = (select auth.uid())
          and coalesce(t.status, 'active') = 'active'
      )
    );
$$;

create or replace function public.question_bank_default_teacher_school()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select sm.school_id
      from public.school_memberships sm
      where sm.profile_id = (select auth.uid())
        and sm.membership_role = 'professor'
        and sm.status = 'active'
        and sm.started_at <= now()
        and (sm.ended_at is null or sm.ended_at > now())
      order by sm.started_at desc
      limit 1
    ),
    (
      select t.school_id
      from public.teachers t
      where t.profile_id = (select auth.uid())
        and coalesce(t.status, 'active') = 'active'
      order by t.updated_at desc nulls last
      limit 1
    )
  );
$$;

create or replace function public.question_bank_can_read_item(q public.question_items)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.is_platform_admin()
    or public.has_question_bank_role(array[
      'admin','administrador','administrador_nacional','gestor','gestor_da_rede',
      'curator','curador','revisor','revisor_pedagogico','service_role'
    ])
    or (
      coalesce(q.ownership_scope, 'GLOBAL_RAIZES') = 'GLOBAL_RAIZES'
      and q.publication_status = 'PUBLICADO'
      and q.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
    )
    or (
      q.owner_user_id = (select auth.uid())
      and coalesce(q.ownership_scope, 'GLOBAL_RAIZES') in ('TEACHER_PRIVATE', 'SCHOOL_SHARED', 'NETWORK_SHARED')
    )
    or (
      coalesce(q.ownership_scope, 'GLOBAL_RAIZES') = 'SCHOOL_SHARED'
      and q.school_id is not null
      and public.question_bank_teacher_can_use_school(q.school_id)
    );
$$;

create or replace function public.avalia_plus_can_use_question_in_assessment(p_question_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.question_items qi
    where qi.id = p_question_id
      and qi.workflow_status = 'APROVADO'
      and qi.publication_status = 'PUBLICADO'
      and qi.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
      and public.question_bank_can_read_item(qi)
  );
$$;

create or replace function public.avalia_plus_adapt_question(
  p_source_question_id uuid,
  p_item jsonb default '{}'::jsonb
)
returns public.question_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_source public.question_items%rowtype;
  v_item public.question_items%rowtype;
  v_school_id uuid;
  v_alternative jsonb;
  v_position integer := 0;
  v_alternatives jsonb := coalesce(p_item->'alternatives', '[]'::jsonb);
begin
  if (select auth.uid()) is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not (
    public.has_question_bank_role(array['professor','admin','administrador','administrador_nacional','curator','curador','service_role'])
    or public.is_platform_admin()
  ) then
    raise exception 'UNAUTHORIZED_ADAPTATION';
  end if;

  select * into v_source
  from public.question_items
  where id = p_source_question_id
  for share;

  if not found then
    raise exception 'SOURCE_QUESTION_NOT_FOUND';
  end if;

  if not (
    v_source.publication_status = 'PUBLICADO'
    and v_source.workflow_status = 'APROVADO'
    and v_source.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
    and public.question_bank_can_read_item(v_source)
  ) then
    raise exception 'SOURCE_QUESTION_NOT_ADAPTABLE';
  end if;

  v_school_id := coalesce(nullif(p_item->>'school_id', '')::uuid, public.question_bank_default_teacher_school());
  if not public.question_bank_teacher_can_use_school(v_school_id) then
    raise exception 'SCHOOL_REQUIRED_FOR_ADAPTATION';
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
    school_id,
    source_question_id,
    owner_user_id,
    ownership_scope,
    origin_type,
    adaptation_version,
    adapted_from_version,
    adapted_at,
    version,
    workflow_version,
    created_by,
    updated_by,
    metadata,
    provenance
  )
  values (
    coalesce(nullif(p_item->>'code', ''), 'RS-ADAPT-' || upper(substr(gen_random_uuid()::text, 1, 8))),
    coalesce(nullif(p_item->>'internal_title', ''), v_source.internal_title || ' - adaptação'),
    coalesce(nullif(p_item->>'component', ''), v_source.component),
    coalesce(nullif(p_item->>'stage', ''), v_source.stage),
    coalesce(nullif(p_item->>'school_year', ''), v_source.school_year),
    coalesce(p_item->>'thematic_unit', v_source.thematic_unit),
    coalesce(p_item->>'knowledge_object', v_source.knowledge_object),
    coalesce(p_item->>'bncc_skill', v_source.bncc_skill),
    coalesce(p_item->>'reference_matrix', v_source.reference_matrix),
    coalesce(p_item->>'curriculum_matrix', v_source.curriculum_matrix, v_source.reference_matrix),
    coalesce(nullif(p_item->>'curriculum_source', ''), v_source.curriculum_source, 'BNCC'),
    coalesce(p_item->>'proficiency_level', v_source.proficiency_level),
    coalesce(p_item->>'difficulty', v_source.difficulty),
    coalesce(p_item->>'cognitive_process', v_source.cognitive_process),
    coalesce(nullif(p_item->>'question_type', ''), v_source.question_type),
    coalesce(nullif(p_item->>'statement', ''), v_source.statement),
    coalesce(nullif(p_item->>'command_text', ''), v_source.command_text, v_source.statement),
    coalesce(p_item->>'base_text', v_source.base_text),
    coalesce(nullif(p_item->>'correct_answer', ''), v_source.correct_answer),
    coalesce(p_item->>'justification', v_source.justification),
    coalesce(p_item->>'pedagogical_comment', p_item->>'justification', v_source.pedagogical_comment, v_source.justification),
    coalesce(p_item->>'success_feedback', v_source.success_feedback),
    coalesce(p_item->>'error_feedback', v_source.error_feedback),
    coalesce(p_item->>'recommended_intervention', v_source.recommended_intervention),
    coalesce(nullif(p_item->>'estimated_minutes', '')::integer, v_source.estimated_minutes),
    coalesce(p_item->>'accessibility_notes', v_source.accessibility_notes),
    v_source.source_id,
    coalesce(nullif(p_item->>'author_name', ''), 'Professor(a) - adaptação'),
    (select auth.uid()),
    v_source.license_id,
    'ITEM_ADAPTADO_LICENCA_COMPATIVEL',
    'APROVADO',
    'PUBLICADO',
    'APROVADO',
    v_school_id,
    v_source.id,
    (select auth.uid()),
    'TEACHER_PRIVATE',
    'TEACHER_ADAPTATION',
    1,
    v_source.workflow_version,
    now(),
    '1.0',
    1,
    (select auth.uid()),
    (select auth.uid()),
    coalesce(p_item->'metadata', '{}'::jsonb) || jsonb_build_object(
      'origin', 'TEACHER_ADAPTATION',
      'source_question_id', v_source.id,
      'source_question_code', v_source.code,
      'visibility', 'TEACHER_PRIVATE'
    ),
    jsonb_build_object(
      'type', 'TEACHER_ADAPTATION',
      'source_question_id', v_source.id,
      'source_question_code', v_source.code,
      'source_workflow_version', v_source.workflow_version,
      'author_user_id', (select auth.uid()),
      'school_id', v_school_id,
      'created_at', now()
    )
  )
  returning * into v_item;

  if jsonb_array_length(v_alternatives) > 0 then
    for v_alternative in select * from jsonb_array_elements(v_alternatives)
    loop
      v_position := v_position + 1;
      insert into public.question_alternatives (question_id, label, body, is_correct, position)
      values (
        v_item.id,
        coalesce(nullif(v_alternative->>'label', ''), chr(64 + v_position)),
        v_alternative->>'body',
        coalesce((v_alternative->>'is_correct')::boolean, false),
        v_position
      );
    end loop;
  else
    insert into public.question_alternatives (question_id, label, body, is_correct, position)
    select v_item.id, label, body, is_correct, position
    from public.question_alternatives
    where question_id = v_source.id
    order by position;
  end if;

  insert into public.question_media (question_id, media_type, url, alt_text, transcript, license_id)
  select v_item.id, media_type, url, alt_text, transcript, license_id
  from public.question_media
  where question_id = v_source.id;

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
    'APROVADO',
    (select auth.uid()),
    public.avalia_plus_current_role(),
    'Adaptação privada criada a partir de ' || v_source.code,
    public.avalia_plus_question_snapshot(v_item.id)
  );

  perform public.avalia_plus_record_item_version(v_item.id, 'teacher-adaptation-created');

  return v_item;
end;
$$;

create or replace function public.avalia_plus_assert_question_usable_for_assessment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.avalia_plus_can_use_question_in_assessment(new.question_id) then
    raise exception 'QUESTION_NOT_AVAILABLE_FOR_ASSESSMENT:%', new.question_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_avalia_plus_assessment_question_access on public.assessment_questions;
create trigger trg_avalia_plus_assessment_question_access
before insert or update of question_id on public.assessment_questions
for each row
execute function public.avalia_plus_assert_question_usable_for_assessment();

drop trigger if exists trg_avalia_plus_booklet_question_access on public.assessment_booklet_questions;
create trigger trg_avalia_plus_booklet_question_access
before insert or update of question_id on public.assessment_booklet_questions
for each row
execute function public.avalia_plus_assert_question_usable_for_assessment();

drop policy if exists "published questions readable by educators" on public.question_items;
create policy "published questions readable by educators" on public.question_items
for select to authenticated
using (public.question_bank_can_read_item(question_items));

drop policy if exists "questions inserted by curators and reviewers" on public.question_items;
create policy "questions inserted by curators and reviewers" on public.question_items
for insert to authenticated
with check (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
  or (
    owner_user_id = (select auth.uid())
    and origin_type in ('TEACHER_AUTHORIAL','TEACHER_ADAPTATION')
    and ownership_scope = 'TEACHER_PRIVATE'
    and public.question_bank_teacher_can_use_school(school_id)
  )
);

drop policy if exists "teachers update own private question adaptations" on public.question_items;
create policy "teachers update own private question adaptations" on public.question_items
for update to authenticated
using (
  owner_user_id = (select auth.uid())
  and ownership_scope = 'TEACHER_PRIVATE'
  and origin_type in ('TEACHER_AUTHORIAL','TEACHER_ADAPTATION')
)
with check (
  owner_user_id = (select auth.uid())
  and ownership_scope = 'TEACHER_PRIVATE'
  and origin_type in ('TEACHER_AUTHORIAL','TEACHER_ADAPTATION')
  and public.question_bank_teacher_can_use_school(school_id)
);

drop policy if exists "question children readable with question" on public.question_alternatives;
create policy "question children readable with question" on public.question_alternatives
for select to authenticated
using (exists (select 1 from public.question_items qi where qi.id = question_id));

drop policy if exists "question media readable with question" on public.question_media;
create policy "question media readable with question" on public.question_media
for select to authenticated
using (exists (select 1 from public.question_items qi where qi.id = question_id));

drop policy if exists "question distractors readable with question" on public.question_distractor_analyses;
create policy "question distractors readable with question" on public.question_distractor_analyses
for select to authenticated
using (
  exists (
    select 1
    from public.question_alternatives qa
    join public.question_items qi on qi.id = qa.question_id
    where qa.id = alternative_id
  )
);

revoke all on function public.avalia_plus_adapt_question(uuid, jsonb) from public, anon;
revoke all on function public.avalia_plus_assert_question_usable_for_assessment() from public, anon;
grant execute on function public.avalia_plus_adapt_question(uuid, jsonb) to authenticated;
grant execute on function public.avalia_plus_can_use_question_in_assessment(uuid) to authenticated;
grant execute on function public.question_bank_can_read_item(public.question_items) to authenticated;
