-- REVIEW ONLY: exact two existing function replacements; no ACL/Auth/global role changes.
BEGIN;
DO $preflight$
DECLARE actual jsonb;
BEGIN
 SELECT snapshot INTO actual FROM (select jsonb_build_object('functions',(select jsonb_object_agg(p.oid::regprocedure::text,jsonb_build_object('body_md5',md5(p.prosrc),'acl',p.proacl::text,'config',p.proconfig,'owner',pg_get_userbyid(p.proowner),'security_definer',p.prosecdef)) from pg_proc p where p.oid in ('public.avalia_plus_create_assessment_from_bank(jsonb)'::regprocedure,'public.avalia_plus_replace_assessment_items(uuid,jsonb)'::regprocedure,'public.current_question_bank_role()'::regprocedure,'public.avalia_plus_can_author_items()'::regprocedure,'public.has_question_bank_role(text[])'::regprocedure,'school_category_private.actor_context(jsonb)'::regprocedure,'school_category_private.assessment_assert_question(uuid,uuid,uuid)'::regprocedure,'school_category_private.assessment_content_write_guard()'::regprocedure)),'triggers',(select jsonb_object_agg(t.tgname,jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled)) from pg_trigger t where t.tgname in ('fase3_assessment_question_guard','fase3_assessment_delete_guard','fase3_assessment_publication_guard'))) as snapshot) catalog;
 IF actual IS DISTINCT FROM '{"triggers":{"fase3_assessment_delete_guard":{"enabled":"O","definition":"CREATE TRIGGER fase3_assessment_delete_guard BEFORE DELETE ON public.assessments FOR EACH ROW EXECUTE FUNCTION school_category_private.assessment_content_write_guard()"},"fase3_assessment_question_guard":{"enabled":"O","definition":"CREATE TRIGGER fase3_assessment_question_guard BEFORE INSERT OR DELETE OR UPDATE ON public.assessment_questions FOR EACH ROW EXECUTE FUNCTION school_category_private.assessment_content_write_guard()"},"fase3_assessment_publication_guard":{"enabled":"O","definition":"CREATE TRIGGER fase3_assessment_publication_guard BEFORE INSERT OR UPDATE OF assessment_id, school_id, class_id, status ON public.assessment_assignments FOR EACH ROW EXECUTE FUNCTION school_category_private.assessment_content_write_guard()"}},"functions":{"current_question_bank_role()":{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":null,"body_md5":"05a3314b0f14e2b33d6b25ed0a508d0f","security_definer":false},"avalia_plus_can_author_items()":{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":null,"body_md5":"e412292d6269c8e87251e3f8948408fc","security_definer":false},"has_question_bank_role(text[])":{"acl":"{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":null,"body_md5":"4d7dd8436492fd34b8877fd7ba9f1bf8","security_definer":false},"school_category_private.actor_context(jsonb)":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=\"\"","jit=off"],"body_md5":"f6a7f42cdd1bc1c915305845da58c57c","security_definer":true},"avalia_plus_create_assessment_from_bank(jsonb)":{"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"body_md5":"dd108be00647e4e653a4c1b7dda5f24e","security_definer":true},"avalia_plus_replace_assessment_items(uuid,jsonb)":{"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","owner":"postgres","config":["search_path=public"],"body_md5":"c5537e9ae3e9178c62df6ab779a3b211","security_definer":true},"school_category_private.assessment_content_write_guard()":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=\"\""],"body_md5":"ca421399a763594a7d95556d18f5e93e","security_definer":true},"school_category_private.assessment_assert_question(uuid,uuid,uuid)":{"acl":"{postgres=X/postgres}","owner":"postgres","config":["search_path=\"\"","jit=off"],"body_md5":"81ecb872a7fabccc1cf04ecfcccb6a0d","security_definer":true}}}'::jsonb THEN RAISE EXCEPTION 'ASSEMBLY_CATALOG_DRIFT_REVIEW_REQUIRED'; END IF;
END $preflight$;
CREATE OR REPLACE FUNCTION "public"."avalia_plus_create_assessment_from_bank"("p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_institutional_teacher boolean;
  v_actor_context jsonb;
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
  -- Institutional teachers never gain authority from legacy JWT role claims alone.
  if exists(select 1 from public.profiles where id=auth.uid() and status<>'active') then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode='42501';
  end if;
  v_institutional_teacher := public.current_question_bank_role()='professor'
    or exists(select 1 from public.profiles where id=auth.uid() and platform_role='professor')
    or exists(select 1 from public.teachers where profile_id=auth.uid());
  if v_institutional_teacher then
    if not exists(select 1 from public.profiles where id=auth.uid() and platform_role='professor' and status='active')
       or not exists(select 1 from public.teachers where profile_id=auth.uid() and status='active') then
      raise exception 'ASSESSMENT_TEACHER_CONTEXT_REQUIRED' using errcode='42501';
    end if;
    v_actor_context := school_category_private.actor_context(jsonb_strip_nulls(jsonb_build_object('school_id',nullif(p_payload->>'school_id',''),'class_id',nullif(p_payload->>'class_id',''))));
    if (v_actor_context->>'teacher')::boolean is distinct from true
       or jsonb_array_length(v_actor_context->'grade_ids')=0 then
      raise exception 'ASSESSMENT_TEACHER_CONTEXT_REQUIRED' using errcode='42501';
    end if;
  end if;
  if not v_institutional_teacher and not (public.avalia_plus_can_author_items() or public.has_question_bank_role(array['gestor', 'gestor_da_rede', 'administrador_nacional', 'service_role'])) then
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
    case when v_institutional_teacher then 'professor' else public.avalia_plus_current_role() end,
    nullif(p_payload->>'class_id', '')::uuid,
    p_payload->>'class_name',
    'RASCUNHO',
    p_payload->>'cover_template',
    p_payload->>'instructions',
    nullif(p_payload->>'application_date', '')::date,
    p_payload->>'component',
    p_payload->>'school_year',
    case when v_institutional_teacher then (v_actor_context->>'school_id')::uuid else nullif(p_payload->>'school_id', '')::uuid end,
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

CREATE OR REPLACE FUNCTION "public"."avalia_plus_replace_assessment_items"("p_assessment_id" "uuid", "p_payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_institutional_teacher boolean;
  v_actor_context jsonb;
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
  select * into v_assessment
  from public.assessments
  where id = p_assessment_id
  for update;

  if not found then
    raise exception 'ASSESSMENT_NOT_FOUND';
  end if;

  if not (
    v_assessment.owner_user_id = auth.uid()
    or public.has_question_bank_role(array['admin', 'administrador', 'administrador_nacional', 'gestor', 'gestor_da_rede', 'service_role'])
  ) then
    raise exception 'UNAUTHORIZED_ASSESSMENT_ASSEMBLY';
  end if;

  -- Institutional teachers never gain authority from legacy JWT role claims alone.
  if exists(select 1 from public.profiles where id=auth.uid() and status<>'active') then
    raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode='42501';
  end if;
  v_institutional_teacher := public.current_question_bank_role()='professor'
    or exists(select 1 from public.profiles where id=auth.uid() and platform_role='professor')
    or exists(select 1 from public.teachers where profile_id=auth.uid());
  if v_institutional_teacher then
    if not exists(select 1 from public.profiles where id=auth.uid() and platform_role='professor' and status='active')
       or not exists(select 1 from public.teachers where profile_id=auth.uid() and status='active') then
      raise exception 'ASSESSMENT_TEACHER_CONTEXT_REQUIRED' using errcode='42501';
    end if;
    v_actor_context := school_category_private.actor_context(jsonb_strip_nulls(jsonb_build_object('school_id',v_assessment.school_id,'class_id',v_assessment.class_id)));
    if (v_actor_context->>'teacher')::boolean is distinct from true
       or jsonb_array_length(v_actor_context->'grade_ids')=0 then
      raise exception 'ASSESSMENT_TEACHER_CONTEXT_REQUIRED' using errcode='42501';
    end if;
  end if;

  update public.assessments
  set
    title = coalesce(nullif(p_payload->>'title', ''), title),
    description = coalesce(p_payload->>'description', description),
    instructions = coalesce(p_payload->>'instructions', instructions),
    application_date = coalesce(nullif(p_payload->>'application_date', '')::date, application_date),
    component = coalesce(p_payload->>'component', component),
    school_year = coalesce(p_payload->>'school_year', school_year),
    class_name = coalesce(p_payload->>'class_name', class_name),
    cover_template = coalesce(p_payload->>'cover_template', cover_template),
    assessment_year = coalesce(p_payload->>'assessment_year', assessment_year),
    matrix = coalesce(p_payload->>'matrix', matrix),
    max_booklets = least(greatest(coalesce(jsonb_array_length(coalesce(p_payload->'booklets', '[]'::jsonb)), 1), 1), 5),
    metadata = coalesce(p_payload->'metadata', metadata),
    updated_at = now()
  where id = p_assessment_id
  returning * into v_assessment;

  delete from public.assessment_booklets where assessment_id = p_assessment_id;
  delete from public.assessment_questions where assessment_id = p_assessment_id;

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
      p_assessment_id,
      v_question_id,
      v_position,
      v_points,
      public.avalia_plus_question_snapshot(v_question_id)
    );
  end loop;

  v_booklet_count := jsonb_array_length(coalesce(p_payload->'booklets', '[]'::jsonb));
  if v_booklet_count > 5 then
    raise exception 'MAX_FIVE_BOOKLETS';
  end if;

  if v_booklet_count = 0 then
    insert into public.assessment_booklets (assessment_id, code, title, position)
    values (p_assessment_id, 'A', 'Caderno A', 1)
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
    where aq.assessment_id = p_assessment_id
    order by aq.position;

    update public.assessment_booklets
    set question_count = (select count(*) from public.assessment_booklet_questions where booklet_id = v_booklet_row.id),
        skill_map = public.avalia_plus_build_skill_map(p_assessment_id),
        updated_at = now()
    where id = v_booklet_row.id;
  else
    for v_booklet in select * from jsonb_array_elements(p_payload->'booklets')
    loop
      insert into public.assessment_booklets (assessment_id, code, title, position)
      values (
        p_assessment_id,
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
        where aq.assessment_id = p_assessment_id
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
          skill_map = public.avalia_plus_build_skill_map(p_assessment_id),
          updated_at = now()
      where id = v_booklet_row.id;
    end loop;
  end if;

  update public.assessments
  set
    total_points = coalesce((select sum(points) from public.assessment_questions where assessment_id = p_assessment_id), 0),
    skill_map = public.avalia_plus_build_skill_map(p_assessment_id),
    updated_at = now()
  where id = p_assessment_id
  returning * into v_assessment;

  return jsonb_build_object(
    'assessment', to_jsonb(v_assessment),
    'questions', (
      select coalesce(jsonb_agg(to_jsonb(aq) order by aq.position), '[]'::jsonb)
      from public.assessment_questions aq
      where aq.assessment_id = p_assessment_id
    ),
    'booklets', (
      select coalesce(jsonb_agg(to_jsonb(ab) order by ab.position), '[]'::jsonb)
      from public.assessment_booklets ab
      where ab.assessment_id = p_assessment_id
    ),
    'skill_map', v_assessment.skill_map
  );
end;
$$;
COMMIT;
