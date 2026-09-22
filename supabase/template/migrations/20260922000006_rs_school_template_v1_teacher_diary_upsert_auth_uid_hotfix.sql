-- 04D.1 - Professor Mobile: class diary write must not accept teacher_id from the client.
-- Local-only hotfix. Apply separately after approval.

DO $$
BEGIN
  IF to_regprocedure('public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: assinatura antiga de teacher_upsert_class_diary_entry nao encontrada';
  END IF;

  IF to_regprocedure('public.class_diary_teacher_can_manage(uuid, uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: class_diary_teacher_can_manage nao encontrada';
  END IF;

  IF to_regprocedure('public.class_diary_validate_links(uuid, uuid, uuid, uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: class_diary_validate_links nao encontrada';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb);

CREATE OR REPLACE FUNCTION public.teacher_upsert_class_diary_entry(
  p_entry_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_entry_date date DEFAULT CURRENT_DATE,
  p_title text DEFAULT 'Diario de Classe',
  p_taught_content text DEFAULT '',
  p_pedagogical_notes text DEFAULT '',
  p_plan_id uuid DEFAULT NULL,
  p_calendar_entry_id uuid DEFAULT NULL,
  p_activity_links jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_class public.classes%ROWTYPE;
  v_teacher public.teachers%ROWTYPE;
  v_entry public.class_diary_entries%ROWTYPE;
  v_existing public.class_diary_entries%ROWTYPE;
  v_event_type text := 'created';
  v_link_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = '42501';
  END IF;

  IF p_class_id IS NULL OR p_entry_date IS NULL THEN
    RAISE EXCEPTION 'Turma e data sao obrigatorias.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_class
  FROM public.classes c
  WHERE c.id = p_class_id
    AND coalesce(c.status, 'active') = 'active'
    AND (p_school_id IS NULL OR c.school_id = p_school_id)
  LIMIT 1;

  IF v_class.id IS NULL OR v_class.school_id IS NULL THEN
    RAISE EXCEPTION 'Turma ativa nao encontrada para esta escola.' USING ERRCODE = '22023';
  END IF;

  SELECT t.* INTO v_teacher
  FROM public.teachers t
  JOIN public.class_teacher_memberships ctm ON ctm.teacher_id = t.id
  WHERE t.profile_id = auth.uid()
    AND t.school_id = v_class.school_id
    AND coalesce(t.status, 'active') = 'active'
    AND ctm.class_id = v_class.id
    AND ctm.status = 'active'
    AND ctm.started_at <= now()
    AND (ctm.ended_at IS NULL OR ctm.ended_at > now())
  ORDER BY ctm.started_at DESC, t.created_at DESC
  LIMIT 1;

  IF v_teacher.id IS NULL THEN
    RAISE EXCEPTION 'Professor sem vinculo ativo com esta turma.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.class_diary_teacher_can_manage(v_class.school_id, v_class.id, v_teacher.id) THEN
    RAISE EXCEPTION 'Professor sem permissao para registrar Diario desta turma.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.class_diary_validate_links(v_class.school_id, v_class.id, v_teacher.id, p_plan_id, p_calendar_entry_id) THEN
    RAISE EXCEPTION 'Planejamento ou agenda nao pertencem a esta turma/professor.' USING ERRCODE = '42501';
  END IF;

  IF p_entry_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.class_diary_entries cde
    WHERE cde.id = p_entry_id
      AND cde.school_id = v_class.school_id
      AND cde.class_id = v_class.id
      AND cde.teacher_id = v_teacher.id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_existing
    FROM public.class_diary_entries cde
    WHERE cde.school_id = v_class.school_id
      AND cde.class_id = v_class.id
      AND cde.teacher_id = v_teacher.id
      AND cde.entry_date = p_entry_date
      AND cde.status <> 'deleted'
      AND cde.deleted_at IS NULL
    FOR UPDATE;
  END IF;

  IF p_entry_id IS NOT NULL AND v_existing.id IS NULL THEN
    RAISE EXCEPTION 'Diario de Classe nao encontrado para este professor/turma.' USING ERRCODE = '42501';
  END IF;

  IF v_existing.id IS NOT NULL THEN
    IF v_existing.status = 'closed' THEN
      RAISE EXCEPTION 'Diario fechado nao pode ser editado nesta versao.' USING ERRCODE = '42501';
    END IF;

    IF v_existing.status = 'deleted' OR v_existing.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Diario excluido nao pode ser editado.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.class_diary_entries
    SET title = COALESCE(NULLIF(trim(p_title), ''), 'Diario de Classe'),
      taught_content = COALESCE(p_taught_content, ''),
      pedagogical_notes = COALESCE(p_pedagogical_notes, ''),
      plan_id = p_plan_id,
      calendar_entry_id = p_calendar_entry_id,
      updated_at = now()
    WHERE id = v_existing.id
    RETURNING * INTO v_entry;

    v_event_type := 'updated';
  ELSE
    INSERT INTO public.class_diary_entries (
      school_id,
      class_id,
      teacher_id,
      entry_date,
      title,
      taught_content,
      pedagogical_notes,
      plan_id,
      calendar_entry_id,
      status,
      created_by
    )
    VALUES (
      v_class.school_id,
      v_class.id,
      v_teacher.id,
      p_entry_date,
      COALESCE(NULLIF(trim(p_title), ''), 'Diario de Classe'),
      COALESCE(p_taught_content, ''),
      COALESCE(p_pedagogical_notes, ''),
      p_plan_id,
      p_calendar_entry_id,
      'draft',
      auth.uid()
    )
    RETURNING * INTO v_entry;
  END IF;

  v_link_count := public.class_diary_apply_activity_links(v_entry.id, COALESCE(p_activity_links, '[]'::jsonb));

  INSERT INTO public.class_diary_events (diary_entry_id, event_type, actor_id, metadata)
  VALUES (
    v_entry.id,
    v_event_type,
    auth.uid(),
    jsonb_build_object(
      'status', v_entry.status,
      'school_id', v_entry.school_id,
      'class_id', v_entry.class_id,
      'teacher_id', v_entry.teacher_id,
      'entry_date', v_entry.entry_date,
      'activity_links', v_link_count
    )
  );

  RETURN jsonb_build_object(
    'diary_entry_id', v_entry.id,
    'status', v_entry.status,
    'event_type', v_event_type,
    'activity_links', v_link_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb)
  TO authenticated, service_role;

DO $$
BEGIN
  IF to_regprocedure('public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'POST-CHECK bloqueado: assinatura antiga ainda existe';
  END IF;

  IF to_regprocedure('public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb)') IS NULL THEN
    RAISE EXCEPTION 'POST-CHECK bloqueado: nova assinatura sem teacher_id nao foi criada';
  END IF;
END $$;
