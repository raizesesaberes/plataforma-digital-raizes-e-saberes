-- REVIEW ONLY. Atomic native authoring using existing question and content records.
begin;
CREATE OR REPLACE FUNCTION school_category_private.legacy_avalia_plus_create_item(p_item jsonb)
 RETURNS public.question_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION school_category_private.legacy_avalia_plus_update_question_item(p_question_id uuid, p_item jsonb DEFAULT '{}'::jsonb, p_alternatives jsonb DEFAULT NULL::jsonb)
 RETURNS public.question_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION school_category_private.legacy_avalia_plus_set_item_workflow(p_question_id uuid, p_status text, p_comment text DEFAULT NULL::text)
 RETURNS public.question_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;
create function school_category_private.question_revision(p_id uuid) returns text
language sql stable security definer set search_path='' as $$
 select md5(jsonb_build_object('question',to_jsonb(q),'alternatives',(select jsonb_agg(to_jsonb(a) order by a.position,a.id) from public.question_alternatives a where a.question_id=q.id))::text) from public.question_items q where q.id=p_id;
$$;
create function public.admin_get_question_category(p_question_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cid uuid;result jsonb;q public.question_items%rowtype;
begin
 perform public.school_content_assert_admin();
 if p_question_id is not null then
  select * into q from public.question_items where id=p_question_id;
  if not found then raise exception 'QUESTION_NOT_FOUND';end if;
  select content_item_id into cid from public.content_question_items where question_item_id=p_question_id;
  if cid is not null and not exists(select 1 from public.content_items where id=cid and owner_scope='GLOBAL_RAIZES') then raise exception 'ROOT_CONTENT_REQUIRED';end if;
 end if;
 result:=public.admin_get_content_category(cid);
 return result||jsonb_build_object('question_id',p_question_id,'question_revision',school_category_private.question_revision(p_question_id),'classification_state',case when cid is null then 'REQUIRES_EXPLICIT_CLASSIFICATION' else 'CANONICAL' end);
end $$;

create unique index category_native_request_once on public.content_editorial_events(actor_user_id,(details->>'request_id')) where event_type='NATIVE_QUESTION_CATEGORY_SAVED';
create function school_category_private.save_native_question(p_id uuid,p_item jsonb,p_alternatives jsonb default null)
returns public.question_items language plpgsql security definer set search_path='' as $$
declare q public.question_items%rowtype;ci public.content_items%rowtype;doc jsonb;res jsonb;rid uuid;reason text;hash text;receipt jsonb;payload jsonb;cat jsonb;t record;before_category jsonb;
begin
 perform public.school_content_assert_admin();
 perform school_category_private.assert_writes_open();
 if jsonb_typeof(p_item->'canonical_category') is distinct from 'object' then raise exception 'EXPLICIT_CANONICAL_CLASSIFICATION_REQUIRED';end if;
 rid:=nullif(p_item->>'category_request_id','')::uuid;reason:=p_item->>'category_reason';
 if rid is null or length(btrim(coalesce(reason,''))) not between 5 and 500 then raise exception 'CATEGORY_REASON_AND_REQUEST_REQUIRED';end if;
 if not pg_try_advisory_xact_lock(81261013) then raise exception 'NATIVE_CATEGORY_WRITE_BUSY';end if;
 hash:=md5(jsonb_build_array(p_id,p_item,p_alternatives)::text);
 select details into receipt from public.content_editorial_events where event_type='NATIVE_QUESTION_CATEGORY_SAVED' and actor_user_id=auth.uid() and details->>'request_id'=rid::text;
 if found then if receipt->>'input_hash'<>hash then raise exception 'REQUEST_ID_REUSED';end if;return jsonb_populate_record(null::public.question_items,receipt->'result');end if;
 payload:=p_item-array['canonical_category','category_request_id','category_reason','question_revision','category_revision'];
 cat:=p_item->'canonical_category';
 -- Pedagogical display labels are derived from the canonical choice, never used as grants.
 if coalesce(cat->>'category_mode','GRADE') in('GRADE','INSTITUTIONAL') then
  select * into t from school_category_private.taxonomy() where grade_id=(cat->>'grade_id')::uuid;
  if not found then raise exception 'CANONICAL_STAGE_GRADE_REQUIRED';end if;
  payload:=payload||jsonb_build_object('stage',t.stage_name,'school_year',t.grade_name);
 elsif cat->>'category_mode'='TRANSVERSAL' then payload:=payload||'{"stage":"Transversal delimitado","school_year":"Faixas canônicas explícitas"}';end if;
 if p_id is null then
  q:=school_category_private.legacy_avalia_plus_create_item(payload);
 else
  select * into q from public.question_items where id=p_id for update;
  if not found then raise exception 'QUESTION_NOT_FOUND';end if;
  if p_item->>'question_revision' is null or p_item->>'question_revision'<>school_category_private.question_revision(p_id) then raise exception 'STALE_NATIVE_QUESTION';end if;
  select c.* into ci from public.content_question_items a join public.content_items c on c.id=a.content_item_id where a.question_item_id=p_id for update of c;
  if ci.id is not null and ci.owner_scope<>'GLOBAL_RAIZES' then raise exception 'ROOT_CONTENT_REQUIRED';end if;
  if (ci.id is not null and (p_item->>'category_revision' is null or p_item->>'category_revision'<>md5(to_jsonb(ci)::text))) or (ci.id is null and p_item->>'category_revision' is not null) then raise exception 'STALE_CONTENT_CLASSIFICATION';end if;
  before_category:=to_jsonb(ci);
  q:=school_category_private.legacy_avalia_plus_update_question_item(p_id,payload,p_alternatives);
  -- Any root edit returns to review; the native writer keeps its ID and version history.
  update public.question_items set publication_status='NAO_PUBLICADO',curation_status='RASCUNHO',workflow_status='EM_ELABORACAO',updated_by=auth.uid() where id=p_id returning * into q;
 end if;
 doc:=cat||jsonb_build_object('title',q.internal_title,'content_type','QUESTION','question_item_id',q.id);
 res:=public.admin_save_content_category(ci.id,case when ci.id is null then null else md5(to_jsonb(ci)::text) end,doc,reason);
 update public.content_items set title=q.internal_title,editorial_status=case when editorial_status='DRAFT' then editorial_status else 'IN_REVIEW'::public.rs_content_editorial_status end where id=(res->>'content_item_id')::uuid;
 insert into public.content_editorial_events(content_item_id,event_type,actor_user_id,details)
 values((res->>'content_item_id')::uuid,'NATIVE_QUESTION_CATEGORY_SAVED',auth.uid(),jsonb_build_object('request_id',rid,'input_hash',hash,'reason',reason,'question_id',q.id,'result',to_jsonb(q),'before_category',before_category,'after_category',res,'per_school_writes',0));
 return q;
end $$;

create or replace function public.avalia_plus_create_item(p_item jsonb) returns public.question_items
language plpgsql security definer set search_path='' as $$
begin
 if p_item ? 'canonical_category' or public.is_platform_admin() then return school_category_private.save_native_question(null,p_item,null);end if;
 -- Existing non-root authoring remains unchanged and creates no root/category mapping.
 return school_category_private.legacy_avalia_plus_create_item(p_item);
end $$;
create or replace function public.avalia_plus_update_question_item(p_question_id uuid,p_item jsonb default '{}',p_alternatives jsonb default null) returns public.question_items
language plpgsql security definer set search_path='' as $$
begin
 if p_item ? 'canonical_category' or public.is_platform_admin() or exists(select 1 from public.content_question_items a join public.content_items c on c.id=a.content_item_id where a.question_item_id=p_question_id and c.owner_scope='GLOBAL_RAIZES') then
  return school_category_private.save_native_question(p_question_id,p_item,p_alternatives);
 end if;
 return school_category_private.legacy_avalia_plus_update_question_item(p_question_id,p_item,p_alternatives);
end $$;
create or replace function public.avalia_plus_set_item_workflow(p_question_id uuid,p_status text,p_comment text default null) returns public.question_items
language plpgsql security definer set search_path='' as $$
declare q public.question_items%rowtype;ci public.content_items%rowtype;target public.rs_content_editorial_status;paused boolean;
begin
 if not pg_try_advisory_xact_lock(81261013) then raise exception 'NATIVE_CATEGORY_WRITE_BUSY';end if;
 select c.* into ci from public.content_question_items a join public.content_items c on c.id=a.content_item_id where a.question_item_id=p_question_id and c.metadata->>'classification_source'='canonical_category_v1';
 if ci.id is not null then perform school_category_private.assert_writes_open();end if;
 q:=school_category_private.legacy_avalia_plus_set_item_workflow(p_question_id,p_status,p_comment);
 if ci.id is not null then
  select * into ci from public.content_items where id=ci.id for update;
  select event_type='ROOT_CONTENT_SUSPENDED' into paused from public.content_editorial_events where content_item_id=ci.id and event_type in('ROOT_CONTENT_SUSPENDED','ROOT_CONTENT_REPUBLISHED') order by created_at desc,id desc limit 1;
  target:=case when p_status='APROVADO' and not coalesce(paused,false) then 'PUBLISHED'::public.rs_content_editorial_status when ci.editorial_status='DRAFT' and p_status='EM_ELABORACAO' then 'DRAFT'::public.rs_content_editorial_status else 'IN_REVIEW'::public.rs_content_editorial_status end;
  update public.content_items set editorial_status=target,published_at=case when target='PUBLISHED' then now() else published_at end,updated_by=auth.uid() where id=ci.id;
  insert into public.content_editorial_events(content_item_id,event_type,from_status,to_status,actor_user_id,details) values(ci.id,'NATIVE_QUESTION_EDITORIAL_SYNC',ci.editorial_status,target,auth.uid(),jsonb_build_object('question_id',q.id,'native_status',p_status,'reason',p_comment,'global_pause_preserved',coalesce(paused,false),'version',ci.version));
 end if;
 return q;
end $$;

-- Deliberately read-only backfill plan. Never infer grade from names, years or codes.
create function public.admin_preview_question_category_backfill(p_question_ids uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform public.school_content_assert_admin();
 if p_question_ids is null or cardinality(p_question_ids) not between 1 and 100 then raise exception 'EXPLICIT_QUESTION_IDS_REQUIRED';end if;
 select jsonb_build_object('status','PASS','writes',0,'items',jsonb_agg(jsonb_build_object('question_id',ids.id,'content_item_id',a.content_item_id,'title',q.internal_title,'legacy_stage',q.stage,'legacy_year',q.school_year,'state',case when q.id is null then 'NOT_FOUND' when c.metadata->>'classification_source'='canonical_category_v1' then 'CANONICAL' else 'QUARANTINED_REVIEW_REQUIRED' end,'action','Abrir edição nativa, selecionar IDs canônicos e revisar antes de publicar.') order by ids.id)) into result
 from (select distinct unnest(p_question_ids) id) ids left join public.question_items q on q.id=ids.id left join public.content_question_items a on a.question_item_id=q.id left join public.content_items c on c.id=a.content_item_id;
 return result;
end $$;
revoke all on all functions in schema school_category_private from public,anon,authenticated,service_role;
revoke all on function public.admin_get_question_category(uuid),public.admin_preview_question_category_backfill(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.admin_get_question_category(uuid),public.admin_preview_question_category_backfill(uuid[]) to authenticated;
revoke all on function public.avalia_plus_create_item(jsonb),public.avalia_plus_update_question_item(uuid,jsonb,jsonb),public.avalia_plus_set_item_workflow(uuid,text,text) from public,anon;
grant execute on function public.avalia_plus_create_item(jsonb),public.avalia_plus_update_question_item(uuid,jsonb,jsonb),public.avalia_plus_set_item_workflow(uuid,text,text) to authenticated;
commit;
