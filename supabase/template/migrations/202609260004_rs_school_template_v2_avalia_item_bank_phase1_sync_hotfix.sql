-- Avalia+ 2.0 Fase 1 - sincronizacao segura do carrinho de montagem.
-- Mantem a escrita em assessment_questions/booklets via RPC canonico.

create or replace function public.avalia_plus_replace_assessment_items(
  p_assessment_id uuid,
  p_payload jsonb
)
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

revoke all on function public.avalia_plus_replace_assessment_items(uuid, jsonb) from public, anon;
grant execute on function public.avalia_plus_replace_assessment_items(uuid, jsonb) to authenticated;
