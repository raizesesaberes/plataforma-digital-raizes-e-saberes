-- Synthetic fixture ONLY. The repository's older local migration creates this
-- legacy trigger/function; the current production catalog has neither. The
-- canonical trg_question_access_boundary from 20261009192558 remains enabled.
DROP TRIGGER trg_avalia_plus_assessment_question_access ON public.assessment_questions;
DROP TRIGGER trg_avalia_plus_booklet_question_access ON public.assessment_booklet_questions;
DROP FUNCTION public.avalia_plus_assert_question_usable_for_assessment();

-- Exact current catalog definitions and ACLs. Synthetic environment only.
CREATE OR REPLACE FUNCTION public.avalia_plus_fill_assessment_question_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.version_snapshot is null or new.version_snapshot = '{}'::jsonb then
    new.version_snapshot := public.avalia_plus_question_snapshot(new.question_id);
  end if;
  update public.question_items
  set locked_after_use = true
  where id = new.question_id;
  return new;
end;
$function$
;
ALTER FUNCTION public.avalia_plus_fill_assessment_question_snapshot() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() TO anon;
GRANT EXECUTE ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() TO service_role;
CREATE OR REPLACE FUNCTION public.avalia_plus_question_snapshot(p_question_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$
;
ALTER FUNCTION public.avalia_plus_question_snapshot(p_question_id uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.avalia_plus_question_snapshot(p_question_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avalia_plus_question_snapshot(p_question_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avalia_plus_question_snapshot(p_question_id uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.avalia_plus_record_item_version(p_question_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;
ALTER FUNCTION public.avalia_plus_record_item_version(p_question_id uuid, p_reason text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.avalia_plus_record_item_version(p_question_id uuid, p_reason text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avalia_plus_record_item_version(p_question_id uuid, p_reason text) TO service_role;
CREATE OR REPLACE FUNCTION public.current_platform_role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select lower(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'platform_role',
      auth.jwt() -> 'app_metadata' ->> 'app_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      case when auth.role() = 'service_role' then 'service_role' else '' end
    )
  );
$function$
;
ALTER FUNCTION public.current_platform_role() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.current_platform_role() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_platform_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_platform_role() TO service_role;
CREATE OR REPLACE FUNCTION public.has_question_bank_role(required_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select public.current_question_bank_role() = any(required_roles)
    or (
      public.current_question_bank_role() in ('admin','administrador','administrador_nacional')
      and 'administrador_nacional' = any(required_roles)
    )
    or (
      public.current_question_bank_role() in ('curator','curador','revisor','revisor_pedagogico')
      and (
        'curator' = any(required_roles)
        or 'curador' = any(required_roles)
        or 'revisor' = any(required_roles)
        or 'revisor_pedagogico' = any(required_roles)
      )
    )
    or (
      public.current_question_bank_role() in ('viewer','visualizador','aplicador')
      and (
        'viewer' = any(required_roles)
        or 'visualizador' = any(required_roles)
        or 'aplicador' = any(required_roles)
      )
    );
$function$
;
ALTER FUNCTION public.has_question_bank_role(required_roles text[]) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.has_question_bank_role(required_roles text[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_question_bank_role(required_roles text[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_question_bank_role(required_roles text[]) TO anon;
GRANT EXECUTE ON FUNCTION public.has_question_bank_role(required_roles text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_question_bank_role(required_roles text[]) TO service_role;
CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select public.current_platform_role() = any(array[
    'admin',
    'admin_ti',
    'administrador',
    'administrador_nacional',
    'ti',
    'service_role'
  ]);
$function$
;
ALTER FUNCTION public.is_platform_admin() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;
CREATE OR REPLACE FUNCTION public.question_bank_access_editor()
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  select public.is_platform_admin() or public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede',
    'curator','curador','revisor','revisor_pedagogico','service_role'
  ]);
$function$
;
ALTER FUNCTION public.question_bank_access_editor() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.question_bank_access_editor() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.question_bank_access_editor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.question_bank_access_editor() TO service_role;
CREATE OR REPLACE FUNCTION public.question_bank_assert_assessment_item_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
$function$
;
ALTER FUNCTION public.question_bank_assert_assessment_item_access() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.question_bank_assert_assessment_item_access() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.question_bank_assert_assessment_item_access() TO service_role;
CREATE OR REPLACE FUNCTION public.question_bank_assert_item_editable(p_question_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
begin
  if not coalesce(public.question_bank_access_editor()
    or public.has_question_bank_role(array['elaborador','aprovador']) or exists (
    select 1 from public.question_items qi where qi.id = p_question_id
      and public.question_bank_owns_authored_item(qi)),false) then
    raise exception 'QUESTION_EDIT_ACCESS_DENIED' using errcode = '42501';
  end if;
end;
$function$
;
ALTER FUNCTION public.question_bank_assert_item_editable(p_question_id uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.question_bank_assert_item_editable(p_question_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.question_bank_assert_item_editable(p_question_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.question_bank_assert_item_editable(p_question_id uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.question_bank_authorized_teacher_ids(p_school_id uuid DEFAULT NULL::uuid)
 RETURNS uuid[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
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
$function$
;
ALTER FUNCTION public.question_bank_authorized_teacher_ids(p_school_id uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.question_bank_authorized_teacher_ids(p_school_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.question_bank_authorized_teacher_ids(p_school_id uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.question_bank_authorized_teacher_ids(p_school_id uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.question_bank_can_read_item(q question_items)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  select coalesce(public.question_bank_access_editor()
    or public.question_bank_owns_authored_item(q)
    or (q.publication_status = 'PUBLICADO'
      and q.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
      and q.id = any(public.question_bank_authorized_teacher_ids())),false);
$function$
;
ALTER FUNCTION public.question_bank_can_read_item(q question_items) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.question_bank_can_read_item(q question_items) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.question_bank_can_read_item(q question_items) TO authenticated;
GRANT EXECUTE ON FUNCTION public.question_bank_can_read_item(q question_items) TO service_role;
CREATE OR REPLACE FUNCTION public.question_bank_owns_authored_item(q question_items)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'pg_temp'
AS $function$
  select auth.uid() is not null
    and (q.author_user_id = auth.uid() or q.created_by = auth.uid()
      or to_jsonb(q)->>'owner_user_id' = auth.uid()::text)
    and exists (select 1 from public.teachers t
      where t.profile_id = auth.uid() and t.status = 'active'
        and (q.school_id is null or t.school_id = q.school_id));
$function$
;
ALTER FUNCTION public.question_bank_owns_authored_item(q question_items) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.question_bank_owns_authored_item(q question_items) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.question_bank_owns_authored_item(q question_items) TO authenticated;
GRANT EXECUTE ON FUNCTION public.question_bank_owns_authored_item(q question_items) TO service_role;
CREATE OR REPLACE FUNCTION public.student_list_assessment_assignments()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_student_id uuid;
  v_payload jsonb;
begin
  if auth.uid() is null then raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501'; end if;
  select public.avalia_current_student_id() into v_student_id;
  if v_student_id is null then raise exception 'Aluno institucional ativo nao encontrado.' using errcode = '42501'; end if;
  select jsonb_build_object(
    'assignments', coalesce((
      select jsonb_agg(row_payload order by available_from desc)
      from (
        select aa.available_from,
          jsonb_build_object(
            'id', aa.id,
            'school_id', aa.school_id,
            'assessment_id', aa.assessment_id,
            'target_type', aa.target_type,
            'class_id', aa.class_id,
            'student_id', aa.student_id,
            'available_from', aa.available_from,
            'available_until', aa.available_until,
            'time_limit_minutes', aa.time_limit_minutes,
            'max_attempts', aa.max_attempts,
            'status', aa.status,
            'application_status', aa.application_status,
            'token_required', aa.token_required,
            'shuffle_questions', aa.shuffle_questions,
            'shuffle_alternatives', aa.shuffle_alternatives,
            'assessment', jsonb_build_object(
              'id', a.id,
              'title', a.title,
              'description', a.description,
              'component', a.component,
              'school_year', a.school_year,
              'instructions', a.instructions,
              'total_points', a.total_points,
              'status', a.status,
              'questions', coalesce(q.questions, '[]'::jsonb)
            )
          ) as row_payload
        from public.assessment_assignments aa
        join public.assessments a on a.id = aa.assessment_id
        left join lateral (
          select at.* from public.assessment_attempts at
          where at.assignment_id = aa.id and at.student_id = v_student_id
          order by at.started_at desc limit 1
        ) at on true
        left join lateral (
          select jsonb_agg(
            jsonb_build_object(
              'id', aq.id,
              'question_id', aq.question_id,
              'position', aq.position,
              'points', aq.points,
              'question', jsonb_build_object(
                'id', qi.id,
                'code', qi.code,
                'internal_title', qi.internal_title,
                'statement', qi.statement,
                'base_text', qi.base_text,
                'bncc_skill', qi.bncc_skill,
                'question_type', qi.question_type,
                'alternatives', coalesce(alt.alternatives, '[]'::jsonb)
              )
            )
            order by case when at.question_order is not null and aq.question_id = any(at.question_order) then array_position(at.question_order, aq.question_id) else aq.position end
          ) as questions
          from public.assessment_questions aq
          join public.question_items qi on qi.id = aq.question_id
          left join lateral (
            select jsonb_agg(
              jsonb_build_object('id', qa.id, 'label', qa.label, 'body', qa.body, 'position', qa.position)
              order by case
                when at.alternative_order ? qi.id::text then (
                  select ordinality
                  from jsonb_array_elements_text(at.alternative_order -> qi.id::text) with ordinality alt_order(id, ordinality)
                  where alt_order.id::uuid = qa.id limit 1
                )
                else qa.position
              end
            ) as alternatives
            from public.question_alternatives qa
            where qa.question_id = qi.id
          ) alt on true
          where aq.assessment_id = a.id
            and (aa.booklet_id is null or exists (select 1 from public.assessment_booklet_questions abq where abq.booklet_id = aa.booklet_id and abq.assessment_question_id = aq.id))
        ) q on true
        where public.avalia_student_can_access_assignment(aa.id, v_student_id)
      ) assignments_scope
    ), '[]'::jsonb),
    'attempts', coalesce((
      select jsonb_agg(to_jsonb(at) || jsonb_build_object('progress', public.avalia_plus_build_progress(at.id), 'responses', coalesce((select jsonb_agg(to_jsonb(ar) order by ar.answered_at asc) from public.assessment_responses ar where ar.attempt_id = at.id), '[]'::jsonb)) order by at.started_at desc)
      from public.assessment_attempts at where at.student_id = v_student_id
    ), '[]'::jsonb)
  ) into v_payload;
  return v_payload;
end;
$function$
;
ALTER FUNCTION public.student_list_assessment_assignments() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.student_list_assessment_assignments() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_list_assessment_assignments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_list_assessment_assignments() TO service_role;
CREATE OR REPLACE FUNCTION public.avalia_plus_replace_question_alternatives(p_question_id uuid, p_alternatives jsonb)
 RETURNS SETOF question_alternatives
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
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
$function$
;
ALTER FUNCTION public.avalia_plus_replace_question_alternatives(p_question_id uuid, p_alternatives jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.avalia_plus_replace_question_alternatives(p_question_id uuid, p_alternatives jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avalia_plus_replace_question_alternatives(p_question_id uuid, p_alternatives jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avalia_plus_replace_question_alternatives(p_question_id uuid, p_alternatives jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.avalia_plus_set_item_workflow(p_question_id uuid, p_status text, p_comment text DEFAULT NULL::text)
 RETURNS question_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$
;
ALTER FUNCTION public.avalia_plus_set_item_workflow(p_question_id uuid, p_status text, p_comment text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.avalia_plus_set_item_workflow(p_question_id uuid, p_status text, p_comment text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avalia_plus_set_item_workflow(p_question_id uuid, p_status text, p_comment text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avalia_plus_set_item_workflow(p_question_id uuid, p_status text, p_comment text) TO service_role;
CREATE OR REPLACE FUNCTION public.avalia_plus_update_question_item(p_question_id uuid, p_item jsonb DEFAULT '{}'::jsonb, p_alternatives jsonb DEFAULT NULL::jsonb)
 RETURNS question_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if p_item ? 'canonical_category' or public.is_platform_admin() or exists(select 1 from public.content_question_items a join public.content_items c on c.id=a.content_item_id where a.question_item_id=p_question_id and c.owner_scope='GLOBAL_RAIZES') then
  return school_category_private.save_native_question(p_question_id,p_item,p_alternatives);
 end if;
 return school_category_private.legacy_avalia_plus_update_question_item(p_question_id,p_item,p_alternatives);
end $function$
;
ALTER FUNCTION public.avalia_plus_update_question_item(p_question_id uuid, p_item jsonb, p_alternatives jsonb) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.avalia_plus_update_question_item(p_question_id uuid, p_item jsonb, p_alternatives jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avalia_plus_update_question_item(p_question_id uuid, p_item jsonb, p_alternatives jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.avalia_plus_update_question_item(p_question_id uuid, p_item jsonb, p_alternatives jsonb) TO service_role;

REVOKE ALL ON FUNCTION public.has_question_bank_role(required_roles text[]) FROM PUBLIC, postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_question_bank_role(required_roles text[]) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_question_bank_role(required_roles text[]) TO postgres, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() FROM PUBLIC, postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.avalia_plus_fill_assessment_question_snapshot() TO postgres, anon, authenticated, service_role;

-- Replace only divergent older fixture policies with exact observed policies.
DROP POLICY "published questions readable by educators" ON public.question_items;
CREATE POLICY "published questions readable by educators" ON public.question_items AS PERMISSIVE FOR SELECT TO authenticated USING ((is_platform_admin() OR has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'professor'::text, 'aplicador'::text, 'visualizador'::text, 'viewer'::text, 'service_role'::text])));
DROP POLICY "questions inserted by curators and reviewers" ON public.question_items;
CREATE POLICY "questions inserted by curators and reviewers" ON public.question_items AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'professor'::text, 'service_role'::text]));
DROP POLICY "teachers update own private question adaptations" ON public.question_items;
DROP POLICY "question media readable with question" ON public.question_media;
CREATE POLICY "question media readable with question" ON public.question_media AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM question_items qi
  WHERE (qi.id = question_media.question_id))));
DROP POLICY "question children readable with question" ON public.question_alternatives;
CREATE POLICY "question children readable with question" ON public.question_alternatives AS PERMISSIVE FOR SELECT TO authenticated USING ((is_platform_admin() OR has_question_bank_role(ARRAY['admin'::text, 'administrador_nacional'::text, 'gestor'::text, 'gestor_da_rede'::text, 'curator'::text, 'curador'::text, 'revisor'::text, 'revisor_pedagogico'::text, 'professor'::text, 'aplicador'::text, 'visualizador'::text, 'viewer'::text, 'service_role'::text])));
DROP POLICY "question distractors readable with question" ON public.question_distractor_analyses;
CREATE POLICY "question distractors readable with question" ON public.question_distractor_analyses AS PERMISSIVE FOR SELECT TO PUBLIC USING ((EXISTS ( SELECT 1
   FROM (question_alternatives qa
     JOIN question_items qi ON ((qi.id = qa.question_id)))
  WHERE (qa.id = question_distractor_analyses.alternative_id))));
-- Optional adaptation columns exist only in the older repo fixture, not production.
ALTER TABLE public.question_items DROP COLUMN "source_question_id";
ALTER TABLE public.question_items DROP COLUMN "owner_user_id";
ALTER TABLE public.question_items DROP COLUMN "ownership_scope";
ALTER TABLE public.question_items DROP COLUMN "origin_type";
ALTER TABLE public.question_items DROP COLUMN "adaptation_version";
ALTER TABLE public.question_items DROP COLUMN "adapted_from_version";
ALTER TABLE public.question_items DROP COLUMN "adapted_at";
ALTER TABLE public.question_items DROP COLUMN "provenance";
