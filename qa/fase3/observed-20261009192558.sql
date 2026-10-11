-- Production ledger source; replay ONLY in disposable synthetic database.
-- Local review only: reuse the canonical resolver; do not create a legacy open mode.
begin;
-- Fail atomically on an incomplete base instead of creating unreviewed APIs.
do $preconditions$
begin
  if to_regprocedure('public.content_resolve_for_user(jsonb)') is null
    or to_regprocedure('public.avalia_plus_question_snapshot(uuid)') is null
    or to_regprocedure('public.avalia_plus_record_item_version(uuid,text)') is null
    or to_regprocedure('public.avalia_plus_update_question_item(uuid,jsonb,jsonb)') is null
    or to_regprocedure('public.avalia_plus_replace_question_alternatives(uuid,jsonb)') is null
    or to_regprocedure('public.avalia_plus_set_item_workflow(uuid,text,text)') is null then
    raise exception 'QUESTION_ACCESS_BASE_REQUIRED';
  end if;
  if exists (select 1 from pg_class where oid in (
    'public.question_items'::regclass, 'public.question_alternatives'::regclass,
    'public.question_media'::regclass, 'public.question_distractor_analyses'::regclass,
    'public.question_item_versions'::regclass, 'public.question_workflow_events'::regclass,
    'public.question_curation_history'::regclass) and not relrowsecurity) then
    raise exception 'QUESTION_ACCESS_RLS_REQUIRED';
  end if;
  -- Never overwrite a newer/different production editor definition silently.
  if exists (select 1 from (values
    ('public.avalia_plus_update_question_item(uuid,jsonb,jsonb)', 'b4a678faabe922491e61d709efb2361a'),
    ('public.avalia_plus_replace_question_alternatives(uuid,jsonb)', 'fa8b8f4e981391295be4c25512a87dd7'),
    ('public.avalia_plus_set_item_workflow(uuid,text,text)', 'fdc0fee07c742683470bc7335cc676ee')
  ) expected(signature, body_hash)
    join pg_proc p on p.oid = to_regprocedure(expected.signature)
    where md5(p.prosrc) <> expected.body_hash or not p.prosecdef) then
    raise exception 'QUESTION_EDITOR_BASE_REVIEW_REQUIRED';
  end if;
end;
$preconditions$;
create or replace function public.question_bank_access_editor()
returns boolean language sql stable security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  select public.is_platform_admin() or public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede',
    'curator','curador','revisor','revisor_pedagogico','service_role'
  ]);
$$;
-- No caller-supplied identity. All pages are necessary: authorization cannot be
-- inferred from just the first 100 items. No class filter is imposed on polyvalent teachers.
create or replace function public.question_bank_authorized_teacher_ids(p_school_id uuid default null)
returns uuid[] language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_school_id uuid;
  v_result jsonb;
  v_offset integer;
  v_ids uuid[] := array[]::uuid[];
  v_page uuid[];
begin
  if auth.uid() is null then return v_ids; end if;
  for v_school_id in
    select distinct t.school_id from public.teachers t
    where t.profile_id = auth.uid() and t.status = 'active'
      and (p_school_id is null or t.school_id = p_school_id)
  loop
    v_offset := 0;
    loop
      v_result := public.content_resolve_for_user(jsonb_build_object(
        'content_type','QUESTION','school_id',v_school_id,'limit',100,'offset',v_offset));
      exit when v_result->>'status' is distinct from 'PASS';
      select coalesce(array_agg((e->>'question_item_id')::uuid),array[]::uuid[])
        into v_page from jsonb_array_elements(v_result->'items') e;
      v_ids := v_ids || v_page;
      v_offset := v_offset + 100;
      exit when cardinality(v_page) = 0 or v_offset >= (v_result->>'total')::integer;
    end loop;
  end loop;
  return v_ids;
end;
$$;
-- Own authoring remains available; another teacher's draft is never licensed content.
-- to_jsonb also supports the baseline without optional adaptation columns.
create or replace function public.question_bank_owns_authored_item(q public.question_items)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select auth.uid() is not null
    and (q.author_user_id = auth.uid() or q.created_by = auth.uid()
      or to_jsonb(q)->>'owner_user_id' = auth.uid()::text)
    and exists (select 1 from public.teachers t
      where t.profile_id = auth.uid() and t.status = 'active'
        and (q.school_id is null or t.school_id = q.school_id));
$$;
create or replace function public.question_bank_can_read_item(q public.question_items)
returns boolean language sql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(public.question_bank_access_editor()
    or public.question_bank_owns_authored_item(q)
    or (q.publication_status = 'PUBLICADO'
      and q.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
      and q.id = any(public.question_bank_authorized_teacher_ids())),false);
$$;
-- Restrictive boundaries also cover installations with the older permissive policies.
create policy question_access_boundary on public.question_items
as restrictive for select to public
using (public.question_bank_access_editor() or public.question_bank_owns_authored_item(question_items)
  or (publication_status = 'PUBLICADO' and legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
    and id = any((select public.question_bank_authorized_teacher_ids())::uuid[])));
create policy question_alternative_access_boundary on public.question_alternatives
as restrictive for select to public
using (exists (select 1 from public.question_items qi where qi.id = question_id));
create policy question_media_access_boundary on public.question_media
as restrictive for select to public
using (exists (select 1 from public.question_items qi where qi.id = question_id));
create policy question_distractor_access_boundary on public.question_distractor_analyses
as restrictive for select to public
using (exists (select 1 from public.question_alternatives qa where qa.id = alternative_id));
-- Historical snapshots may contain unpublished earlier text even when the current
-- item is published. Preserve editorial/own history, never grant it by current license.
create policy question_version_access_boundary on public.question_item_versions
as restrictive for select to public
using (public.question_bank_access_editor() or exists (
  select 1 from public.question_items qi where qi.id = question_id
    and public.question_bank_owns_authored_item(qi)));
create policy question_workflow_access_boundary on public.question_workflow_events
as restrictive for select to public
using (public.question_bank_access_editor() or exists (
  select 1 from public.question_items qi where qi.id = question_id
    and public.question_bank_owns_authored_item(qi)));
create policy question_history_access_boundary on public.question_curation_history
as restrictive for select to public
using (public.question_bank_access_editor() or exists (
  select 1 from public.question_items qi where qi.id = question_id
    and public.question_bank_owns_authored_item(qi)));
-- Direct calls now obey RLS. SECURITY DEFINER editorial/version/assessment callers
-- retain their own privileges, so their internal snapshots remain complete.
alter function public.avalia_plus_question_snapshot(uuid) security invoker;
revoke all on function public.avalia_plus_question_snapshot(uuid) from public, anon;
-- record_item_version has no caller guard and is an internal writer, not a reader API.
revoke all on function public.avalia_plus_record_item_version(uuid,text) from public, anon, authenticated;
create or replace function public.question_bank_assert_assessment_item_access()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_school_id uuid;
  v_question public.question_items%rowtype;
begin
  if public.question_bank_access_editor() then return new; end if;
  if tg_table_name = 'assessment_questions' then
    select school_id into v_school_id from public.assessments where id = new.assessment_id;
  else
    select a.school_id into v_school_id from public.assessment_booklets b
      join public.assessments a on a.id = b.assessment_id where b.id = new.booklet_id;
  end if;
  if v_school_id is not null and not exists (
    select 1 from public.teachers t where t.profile_id = auth.uid()
      and t.status = 'active' and t.school_id = v_school_id
  ) then
    raise exception 'QUESTION_ACCESS_DENIED' using errcode = '42501';
  end if;
  select * into v_question from public.question_items where id = new.question_id;
  if not coalesce(v_question.publication_status = 'PUBLICADO'
    and v_question.workflow_status = 'APROVADO'
    and v_question.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
    and (public.question_bank_owns_authored_item(v_question)
      or new.question_id = any(public.question_bank_authorized_teacher_ids(v_school_id))),false) then
    raise exception 'QUESTION_ACCESS_DENIED' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger trg_question_access_boundary before insert or update of question_id
on public.assessment_questions for each row
execute function public.question_bank_assert_assessment_item_access();
create trigger trg_question_access_boundary before insert or update of question_id
on public.assessment_booklet_questions for each row
execute function public.question_bank_assert_assessment_item_access();
revoke all on function public.question_bank_access_editor() from public, anon;
revoke all on function public.question_bank_authorized_teacher_ids(uuid) from public, anon;
revoke all on function public.question_bank_owns_authored_item(public.question_items) from public, anon;
revoke all on function public.question_bank_can_read_item(public.question_items) from public, anon;
revoke all on function public.question_bank_assert_assessment_item_access() from public, anon, authenticated;
grant execute on function public.question_bank_access_editor(),
  public.question_bank_authorized_teacher_ids(uuid),
  public.question_bank_owns_authored_item(public.question_items),
  public.question_bank_can_read_item(public.question_items) to authenticated, service_role;
-- These existing SECURITY DEFINER editors return full rows and also need a
-- target check: the existing author role includes ordinary professors.
create or replace function public.question_bank_assert_item_editable(p_question_id uuid)
returns void language plpgsql stable security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not coalesce(public.question_bank_access_editor()
    or public.has_question_bank_role(array['elaborador','aprovador']) or exists (
    select 1 from public.question_items qi where qi.id = p_question_id
      and public.question_bank_owns_authored_item(qi)),false) then
    raise exception 'QUESTION_EDIT_ACCESS_DENIED' using errcode = '42501';
  end if;
end;
$$;
revoke all on function public.question_bank_assert_item_editable(uuid) from public, anon;
grant execute on function public.question_bank_assert_item_editable(uuid) to authenticated, service_role;
create or replace function public.avalia_plus_update_question_item(
  p_question_id uuid,
  p_item jsonb default '{}'::jsonb,
  p_alternatives jsonb default null
)
returns public.question_items
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_item public.question_items%rowtype;
  v_updated public.question_items%rowtype;
begin
  perform public.question_bank_assert_item_editable(p_question_id);
  if not (
    public.avalia_plus_can_author_items()
    or public.avalia_plus_can_review_items()
    or public.avalia_plus_can_approve_items()
  ) then
    raise exception 'UNAUTHORIZED_ITEM_EDIT';
  end if;

  select *
  into v_item
  from public.question_items
  where id = p_question_id
  for update;

  if not found then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  if p_alternatives is not null then
    perform public.avalia_plus_assert_objective_alternatives_payload(
      case when p_item ? 'question_type' then p_item->>'question_type' else v_item.question_type end,
      p_alternatives
    );
  end if;

  perform public.avalia_plus_record_item_version(p_question_id, 'official-edit');

  update public.question_items
  set
    code = case when p_item ? 'code' then coalesce(nullif(p_item->>'code', ''), code) else code end,
    internal_title = case when p_item ? 'internal_title' then p_item->>'internal_title' else internal_title end,
    component = case when p_item ? 'component' then p_item->>'component' else component end,
    stage = case when p_item ? 'stage' then p_item->>'stage' else stage end,
    school_year = case when p_item ? 'school_year' then p_item->>'school_year' else school_year end,
    thematic_unit = case when p_item ? 'thematic_unit' then p_item->>'thematic_unit' else thematic_unit end,
    knowledge_object = case when p_item ? 'knowledge_object' then p_item->>'knowledge_object' else knowledge_object end,
    bncc_skill = case when p_item ? 'bncc_skill' then p_item->>'bncc_skill' else bncc_skill end,
    reference_matrix = case when p_item ? 'reference_matrix' then p_item->>'reference_matrix' else reference_matrix end,
    curriculum_matrix = case when p_item ? 'curriculum_matrix' then p_item->>'curriculum_matrix' else curriculum_matrix end,
    curriculum_source = case when p_item ? 'curriculum_source' then coalesce(nullif(p_item->>'curriculum_source', ''), curriculum_source) else curriculum_source end,
    proficiency_level = case when p_item ? 'proficiency_level' then p_item->>'proficiency_level' else proficiency_level end,
    difficulty = case when p_item ? 'difficulty' then p_item->>'difficulty' else difficulty end,
    cognitive_process = case when p_item ? 'cognitive_process' then p_item->>'cognitive_process' else cognitive_process end,
    question_type = case when p_item ? 'question_type' then coalesce(nullif(p_item->>'question_type', ''), question_type) else question_type end,
    statement = case when p_item ? 'statement' then p_item->>'statement' else statement end,
    command_text = case when p_item ? 'command_text' then p_item->>'command_text' else command_text end,
    base_text = case when p_item ? 'base_text' then p_item->>'base_text' else base_text end,
    correct_answer = case when p_item ? 'correct_answer' then p_item->>'correct_answer' else correct_answer end,
    justification = case when p_item ? 'justification' then p_item->>'justification' else justification end,
    pedagogical_comment = case when p_item ? 'pedagogical_comment' then p_item->>'pedagogical_comment' else pedagogical_comment end,
    success_feedback = case when p_item ? 'success_feedback' then p_item->>'success_feedback' else success_feedback end,
    error_feedback = case when p_item ? 'error_feedback' then p_item->>'error_feedback' else error_feedback end,
    recommended_intervention = case when p_item ? 'recommended_intervention' then p_item->>'recommended_intervention' else recommended_intervention end,
    estimated_minutes = case when p_item ? 'estimated_minutes' then nullif(p_item->>'estimated_minutes', '')::integer else estimated_minutes end,
    accessibility_notes = case when p_item ? 'accessibility_notes' then p_item->>'accessibility_notes' else accessibility_notes end,
    author_name = case when p_item ? 'author_name' then coalesce(nullif(p_item->>'author_name', ''), author_name) else author_name end,
    metadata = metadata || coalesce(p_item->'metadata', '{}'::jsonb) || jsonb_build_object('last_official_edit_at', now()),
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_question_id
  returning * into v_updated;

  if p_alternatives is not null then
    delete from public.question_alternatives
    where question_id = p_question_id;

    insert into public.question_alternatives (question_id, label, body, is_correct, position)
    select
      p_question_id,
      coalesce(nullif(alternative->>'label', ''), chr(64 + ordinality::integer)),
      alternative->>'body',
      coalesce((alternative->>'is_correct')::boolean, false),
      ordinality::integer
    from jsonb_array_elements(p_alternatives) with ordinality as payload(alternative, ordinality);

    perform public.avalia_plus_assert_objective_alternatives(p_question_id);
  end if;

  return v_updated;
end;
$$;
create or replace function public.avalia_plus_replace_question_alternatives(
  p_question_id uuid,
  p_alternatives jsonb
)
returns setof public.question_alternatives
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_item public.question_items%rowtype;
  v_alternative jsonb;
  v_position integer := 0;
begin
  perform public.question_bank_assert_item_editable(p_question_id);
  if not (
    public.avalia_plus_can_author_items()
    or public.avalia_plus_can_review_items()
    or public.avalia_plus_can_approve_items()
  ) then
    raise exception 'UNAUTHORIZED_ITEM_EDIT';
  end if;

  select *
  into v_item
  from public.question_items
  where id = p_question_id
  for update;

  if not found then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  perform public.avalia_plus_assert_objective_alternatives_payload(v_item.question_type, p_alternatives);

  delete from public.question_alternatives
  where question_id = p_question_id;

  for v_alternative in select * from jsonb_array_elements(coalesce(p_alternatives, '[]'::jsonb))
  loop
    v_position := v_position + 1;
    insert into public.question_alternatives (question_id, label, body, is_correct, position)
    values (
      p_question_id,
      coalesce(nullif(v_alternative->>'label', ''), chr(64 + v_position)),
      v_alternative->>'body',
      coalesce((v_alternative->>'is_correct')::boolean, false),
      v_position
    );
  end loop;

  perform public.avalia_plus_assert_objective_alternatives(p_question_id);

  return query
  select *
  from public.question_alternatives
  where question_id = p_question_id
  order by position;
end;
$$;
create or replace function public.avalia_plus_set_item_workflow(
  p_question_id uuid,
  p_status text,
  p_comment text default null::text
)
returns public.question_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.question_items%rowtype;
  v_previous text;
  v_next_curation public.question_curation_status;
  v_next_publication public.question_publication_status;
begin
  perform public.question_bank_assert_item_editable(p_question_id);
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

  if p_status in ('EM_REVISAO', 'APROVADO') then
    perform public.avalia_plus_assert_objective_alternatives(p_question_id);
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
commit
