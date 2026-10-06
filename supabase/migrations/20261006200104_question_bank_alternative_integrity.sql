-- BANCO DE QUESTOES 12 - INTEGRIDADE DE ALTERNATIVAS
-- Corrige a causa estrutural do bug em que question_items podiam ser criados
-- e publicados sem question_alternatives validas.

begin;

create or replace function public.avalia_plus_is_objective_question(p_question_type text)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(public.rs_content_normalize_code(p_question_type), '') in (
    'MULTIPLA_ESCOLHA',
    'LEITURA_DE_GRAFICO',
    'OBJETIVA',
    'QUESTAO_OBJETIVA'
  )
  or coalesce(public.rs_content_normalize_code(p_question_type), '') like '%MULTIPLA%'
  or coalesce(public.rs_content_normalize_code(p_question_type), '') like '%OBJET%'
  or coalesce(public.rs_content_normalize_code(p_question_type), '') like '%ALTERNATIVA%';
$$;

create or replace function public.avalia_plus_assert_objective_alternatives_payload(
  p_question_type text,
  p_alternatives jsonb
)
returns void
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  v_total integer := 0;
  v_correct integer := 0;
  v_blank integer := 0;
begin
  if not public.avalia_plus_is_objective_question(p_question_type) then
    return;
  end if;

  if jsonb_typeof(coalesce(p_alternatives, '[]'::jsonb)) <> 'array' then
    raise exception 'OBJECTIVE_QUESTION_ALTERNATIVES_MUST_BE_ARRAY';
  end if;

  select
    count(*)::integer,
    count(*) filter (where coalesce((alternative->>'is_correct')::boolean, false))::integer,
    count(*) filter (where nullif(btrim(coalesce(alternative->>'body', '')), '') is null)::integer
  into v_total, v_correct, v_blank
  from jsonb_array_elements(coalesce(p_alternatives, '[]'::jsonb)) alternative;

  if v_total < 2 then
    raise exception 'OBJECTIVE_QUESTION_REQUIRES_ALTERNATIVES';
  end if;

  if v_blank > 0 then
    raise exception 'OBJECTIVE_QUESTION_ALTERNATIVE_BODY_REQUIRED';
  end if;

  if v_correct <> 1 then
    raise exception 'OBJECTIVE_QUESTION_REQUIRES_EXACTLY_ONE_CORRECT_ALTERNATIVE';
  end if;
end;
$$;

create or replace function public.avalia_plus_assert_objective_alternatives(p_question_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.question_items%rowtype;
  v_total integer := 0;
  v_correct integer := 0;
  v_blank integer := 0;
begin
  select *
  into v_item
  from public.question_items
  where id = p_question_id;

  if not found then
    raise exception 'QUESTION_NOT_FOUND';
  end if;

  if not public.avalia_plus_is_objective_question(v_item.question_type) then
    return;
  end if;

  select
    count(*)::integer,
    count(*) filter (where is_correct)::integer,
    count(*) filter (where nullif(btrim(coalesce(body, '')), '') is null)::integer
  into v_total, v_correct, v_blank
  from public.question_alternatives
  where question_id = p_question_id;

  if v_total < 2 then
    raise exception 'OBJECTIVE_QUESTION_REQUIRES_ALTERNATIVES';
  end if;

  if v_blank > 0 then
    raise exception 'OBJECTIVE_QUESTION_ALTERNATIVE_BODY_REQUIRED';
  end if;

  if v_correct <> 1 then
    raise exception 'OBJECTIVE_QUESTION_REQUIRES_EXACTLY_ONE_CORRECT_ALTERNATIVE';
  end if;
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

create or replace function public.avalia_plus_create_item(p_item jsonb)
returns public.question_items
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item public.question_items%rowtype;
  v_alternatives jsonb := coalesce(p_item->'alternatives', '[]'::jsonb);
  v_alternative jsonb;
  v_position integer := 0;
  v_question_type text := coalesce(nullif(p_item->>'question_type', ''), 'multipla_escolha');
begin
  if not public.avalia_plus_can_author_items() then
    raise exception 'UNAUTHORIZED_ITEM_EDIT';
  end if;

  perform public.avalia_plus_assert_objective_alternatives_payload(v_question_type, v_alternatives);

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
    v_question_type,
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

  perform public.avalia_plus_assert_objective_alternatives(v_item.id);

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

revoke all on function public.avalia_plus_is_objective_question(text) from public, anon;
revoke all on function public.avalia_plus_assert_objective_alternatives_payload(text, jsonb) from public, anon;
revoke all on function public.avalia_plus_assert_objective_alternatives(uuid) from public, anon;
revoke all on function public.avalia_plus_replace_question_alternatives(uuid, jsonb) from public, anon;

grant execute on function public.avalia_plus_is_objective_question(text) to authenticated, service_role;
grant execute on function public.avalia_plus_assert_objective_alternatives_payload(text, jsonb) to authenticated, service_role;
grant execute on function public.avalia_plus_assert_objective_alternatives(uuid) to authenticated, service_role;
grant execute on function public.avalia_plus_replace_question_alternatives(uuid, jsonb) to authenticated, service_role;

comment on function public.avalia_plus_assert_objective_alternatives(uuid) is
  'Valida integridade server-side de alternativas/gabarito antes de revisão/publicação.';

comment on function public.avalia_plus_replace_question_alternatives(uuid, jsonb) is
  'Substitui alternativas de uma questão de forma transacional e valida objetivas.';

commit;
