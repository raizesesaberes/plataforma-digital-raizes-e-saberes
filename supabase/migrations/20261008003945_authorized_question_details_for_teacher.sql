-- Authorized question details for the teacher Question Bank.
-- Keeps content_resolve_for_user as the canonical entitlement resolver and
-- avoids broad professor SELECT access to question_items.

create or replace function public.content_resolve_question_details_for_user(p_context jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_teacher_id uuid;
  v_resolved jsonb;
  v_status text;
  v_ids uuid[];
  v_items jsonb := '[]'::jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTHENTICATION_REQUIRED';
  end if;

  select t.id
  into v_teacher_id
  from public.teachers t
  where t.profile_id = v_user_id
    and t.status = 'active'
  limit 1;

  if v_teacher_id is null then
    raise exception 'AUTHORIZED_TEACHER_CONTEXT_NOT_FOUND';
  end if;

  v_resolved := public.content_resolve_for_user(p_context);
  v_status := coalesce(v_resolved ->> 'status', 'FAILED');

  if v_status <> 'PASS' then
    return v_resolved || jsonb_build_object('items', '[]'::jsonb, 'detail_source', 'content_resolve_question_details_for_user');
  end if;

  select coalesce(array_agg(distinct (entry.value ->> 'question_item_id')::uuid), array[]::uuid[])
  into v_ids
  from jsonb_array_elements(coalesce(v_resolved -> 'items', '[]'::jsonb)) as entry(value)
  where entry.value ? 'question_item_id'
    and nullif(entry.value ->> 'question_item_id', '') is not null;

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return v_resolved || jsonb_build_object('items', '[]'::jsonb, 'detail_source', 'content_resolve_question_details_for_user');
  end if;

  with resolved_order as (
    select
      (entry.value ->> 'question_item_id')::uuid as question_id,
      entry.ordinality::integer as position
    from jsonb_array_elements(coalesce(v_resolved -> 'items', '[]'::jsonb)) with ordinality as entry(value, ordinality)
    where entry.value ? 'question_item_id'
      and nullif(entry.value ->> 'question_item_id', '') is not null
  ),
  question_rows as (
    select distinct on (qi.id)
      ro.position,
      qi.*
    from resolved_order ro
    join public.question_items qi on qi.id = ro.question_id
    where qi.publication_status = 'PUBLICADO'
    order by qi.id, ro.position
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', qr.id,
    'code', qr.code,
    'internal_title', qr.internal_title,
    'component', qr.component,
    'stage', qr.stage,
    'school_year', qr.school_year,
    'thematic_unit', qr.thematic_unit,
    'knowledge_object', qr.knowledge_object,
    'bncc_skill', qr.bncc_skill,
    'reference_matrix', qr.reference_matrix,
    'curriculum_matrix', qr.curriculum_matrix,
    'curriculum_source', qr.curriculum_source,
    'proficiency_level', qr.proficiency_level,
    'difficulty', qr.difficulty,
    'cognitive_process', qr.cognitive_process,
    'question_type', qr.question_type,
    'statement', qr.statement,
    'base_text', qr.base_text,
    'command_text', qr.command_text,
    'justification', qr.justification,
    'pedagogical_comment', qr.pedagogical_comment,
    'success_feedback', qr.success_feedback,
    'error_feedback', qr.error_feedback,
    'recommended_intervention', qr.recommended_intervention,
    'estimated_minutes', qr.estimated_minutes,
    'accessibility_notes', qr.accessibility_notes,
    'origin_type', coalesce(qr.metadata ->> 'origin', 'GLOBAL_RAIZES'),
    'ownership_scope', coalesce(qr.metadata ->> 'ownership_scope', 'GLOBAL_RAIZES'),
    'legal_classification', qr.legal_classification,
    'curation_status', qr.curation_status,
    'publication_status', qr.publication_status,
    'workflow_status', qr.workflow_status,
    'workflow_version', qr.workflow_version,
    'version', qr.version,
    'author_name', qr.author_name,
    'created_at', qr.created_at,
    'last_reviewed_at', qr.last_reviewed_at,
    'updated_at', qr.updated_at,
    'published_at', qr.published_at,
    'source_id', qr.source_id,
    'license_id', qr.license_id,
    'source', case when qs.id is null then null else jsonb_build_object(
      'id', qs.id,
      'name', qs.name,
      'source_type', qs.source_type,
      'institution_name', qs.institution_name,
      'author_name', qs.author_name,
      'legal_status', qs.legal_status,
      'curation_status', qs.curation_status,
      'license_id', qs.license_id,
      'license', case when qsl.id is null then null else jsonb_build_object(
        'id', qsl.id,
        'name', qsl.name,
        'license_type', qsl.license_type,
        'publication_allowed', qsl.publication_allowed
      ) end
    ) end,
    'license', case when ql.id is null then null else jsonb_build_object(
      'id', ql.id,
      'name', ql.name,
      'license_type', ql.license_type,
      'publication_allowed', ql.publication_allowed
    ) end,
    'alternatives', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qa.id,
        'question_id', qa.question_id,
        'label', qa.label,
        'body', qa.body,
        'is_correct', qa.is_correct,
        'position', qa.position,
        'distractor', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', qda.id,
            'alternative_id', qda.alternative_id,
            'analysis', qda.analysis
          ) order by qda.created_at, qda.id)
          from public.question_distractor_analyses qda
          where qda.alternative_id = qa.id
        ), '[]'::jsonb)
      ) order by qa.position, qa.label)
      from public.question_alternatives qa
      where qa.question_id = qr.id
    ), '[]'::jsonb),
    'media', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qm.id,
        'question_id', qm.question_id,
        'media_type', qm.media_type,
        'url', qm.url,
        'alt_text', qm.alt_text,
        'transcript', qm.transcript,
        'license_id', qm.license_id
      ) order by qm.created_at, qm.id)
      from public.question_media qm
      where qm.question_id = qr.id
    ), '[]'::jsonb),
    'metadata', jsonb_build_object(
      'content_resolver', 'content_resolve_question_details_for_user',
      'resolver_status', v_status
    )
  ) order by qr.position), '[]'::jsonb)
  into v_items
  from question_rows qr
  left join public.question_sources qs on qs.id = qr.source_id
  left join public.question_licenses ql on ql.id = qr.license_id
  left join public.question_licenses qsl on qsl.id = qs.license_id;

  return v_resolved || jsonb_build_object(
    'items', coalesce(v_items, '[]'::jsonb),
    'detail_source', 'content_resolve_question_details_for_user',
    'details_total', jsonb_array_length(coalesce(v_items, '[]'::jsonb))
  );
end;
$$;

revoke all on function public.content_resolve_question_details_for_user(jsonb) from public;
revoke all on function public.content_resolve_question_details_for_user(jsonb) from anon;
grant execute on function public.content_resolve_question_details_for_user(jsonb) to authenticated;
grant execute on function public.content_resolve_question_details_for_user(jsonb) to service_role;

comment on function public.content_resolve_question_details_for_user(jsonb) is
  'Returns display-safe question details for an authenticated active teacher after content_resolve_for_user authorizes the school/class entitlement context.';
