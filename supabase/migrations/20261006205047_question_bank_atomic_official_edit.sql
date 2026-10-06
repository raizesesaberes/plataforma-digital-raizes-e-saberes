-- BANCO DE QUESTOES 14 - EDICAO OFICIAL ATOMICA
-- Evita PATCH direto em question_items pelo frontend e garante que item +
-- alternativas sejam atualizados de forma consistente.

begin;

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

revoke all on function public.avalia_plus_update_question_item(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.avalia_plus_update_question_item(uuid, jsonb, jsonb) to authenticated, service_role;

comment on function public.avalia_plus_update_question_item(uuid, jsonb, jsonb) is
  'Atualiza questao oficial e alternativas em uma unica transacao server-side.';

commit;
