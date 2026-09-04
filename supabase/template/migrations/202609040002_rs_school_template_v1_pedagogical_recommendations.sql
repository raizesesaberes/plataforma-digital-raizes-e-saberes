-- RS-SCHOOL-TEMPLATE V1 - Canonical pedagogical recommendations engine
-- Recommendations are editorial highlights only. They do not grant access to paid/contracted content.

CREATE TABLE IF NOT EXISTS public.pedagogical_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  content_type text NOT NULL,
  content_id text NOT NULL,
  content_title text NOT NULL,
  target_type text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  student_id uuid REFERENCES public.students(id) ON DELETE RESTRICT,
  note text,
  status text NOT NULL DEFAULT 'published',
  published_at timestamptz,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedagogical_recommendations_content_type_check
    CHECK (content_type IN ('printable_activity', 'book', 'game', 'experience', 'activity', 'free_proposal', 'other')),
  CONSTRAINT pedagogical_recommendations_target_type_check
    CHECK (target_type IN ('class', 'student')),
  CONSTRAINT pedagogical_recommendations_status_check
    CHECK (status IN ('published', 'archived', 'deleted')),
  CONSTRAINT pedagogical_recommendations_target_shape_check
    CHECK (
      (target_type = 'class' AND student_id IS NULL)
      OR
      (target_type = 'student' AND student_id IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.pedagogical_recommendation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.pedagogical_recommendations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  performed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pedagogical_recommendation_events_event_type_check
    CHECK (event_type IN ('created', 'published', 'archived', 'deleted', 'edited')),
  CONSTRAINT pedagogical_recommendation_events_from_status_check
    CHECK (from_status IS NULL OR from_status IN ('published', 'archived', 'deleted')),
  CONSTRAINT pedagogical_recommendation_events_to_status_check
    CHECK (to_status IS NULL OR to_status IN ('published', 'archived', 'deleted'))
);

CREATE INDEX IF NOT EXISTS pedagogical_recommendations_school_idx
  ON public.pedagogical_recommendations (school_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pedagogical_recommendations_teacher_idx
  ON public.pedagogical_recommendations (teacher_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pedagogical_recommendations_class_idx
  ON public.pedagogical_recommendations (class_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS pedagogical_recommendations_student_idx
  ON public.pedagogical_recommendations (student_id, status, created_at DESC)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS pedagogical_recommendations_active_unique_idx
  ON public.pedagogical_recommendations (
    school_id,
    teacher_id,
    content_type,
    content_id,
    target_type,
    class_id,
    COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid)
  )
  WHERE status <> 'deleted';

DROP TRIGGER IF EXISTS pedagogical_recommendations_touch_updated_at
  ON public.pedagogical_recommendations;

CREATE TRIGGER pedagogical_recommendations_touch_updated_at
  BEFORE UPDATE ON public.pedagogical_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE OR REPLACE FUNCTION public.pedagogical_recommendation_current_teacher(
  p_school_id uuid
)
RETURNS public.teachers
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT t
  FROM public.teachers t
  JOIN public.profiles p ON p.id = t.profile_id
  WHERE p.id = auth.uid()
    AND p.status = 'active'
    AND p.platform_role IN ('professor', 'teacher')
    AND t.school_id = p_school_id
    AND t.status = 'active'
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.pedagogical_recommendation_teacher_can_target(
  p_teacher_id uuid,
  p_school_id uuid,
  p_class_id uuid,
  p_student_id uuid,
  p_target_type text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_teacher_memberships ctm
    JOIN public.classes c ON c.id = ctm.class_id
    WHERE ctm.teacher_id = p_teacher_id
      AND ctm.class_id = p_class_id
      AND ctm.status = 'active'
      AND c.school_id = p_school_id
      AND c.status = 'active'
      AND (
        p_target_type = 'class'
        OR EXISTS (
          SELECT 1
          FROM public.enrollments e
          JOIN public.students s ON s.id = e.student_id
          WHERE e.class_id = p_class_id
            AND e.student_id = p_student_id
            AND e.school_id = p_school_id
            AND e.status = 'active'
            AND s.school_id = p_school_id
            AND s.status = 'active'
        )
      )
  )
$$;

CREATE OR REPLACE FUNCTION public.pedagogical_recommendation_can_read(
  p_recommendation public.pedagogical_recommendations
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.secretaria_can_manage_school(p_recommendation.school_id)
      OR EXISTS (
        SELECT 1
        FROM public.teachers t
        WHERE t.id = p_recommendation.teacher_id
          AND t.profile_id = auth.uid()
          AND t.school_id = p_recommendation.school_id
      )
      OR (
        p_recommendation.status = 'published'
        AND (
          public.communication_current_student_can_read(
            p_recommendation.school_id,
            p_recommendation.class_id,
            p_recommendation.student_id,
            p_recommendation.target_type
          )
          OR public.communication_guardian_can_read(
            p_recommendation.school_id,
            p_recommendation.class_id,
            p_recommendation.student_id,
            p_recommendation.target_type
          )
        )
      )
    )
$$;

CREATE OR REPLACE FUNCTION public.teacher_create_pedagogical_recommendation(
  p_school_id uuid,
  p_class_id uuid,
  p_content_type text,
  p_content_id text,
  p_content_title text,
  p_target_type text DEFAULT 'class',
  p_student_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_teacher public.teachers;
  v_existing public.pedagogical_recommendations;
  v_recommendation_id uuid;
  v_previous_status text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para recomendar atividade.';
  END IF;

  IF p_content_type NOT IN ('printable_activity', 'book', 'game', 'experience', 'activity', 'free_proposal', 'other') THEN
    RAISE EXCEPTION 'Tipo de conteudo invalido para recomendacao.';
  END IF;

  IF NULLIF(trim(p_content_id), '') IS NULL OR NULLIF(trim(p_content_title), '') IS NULL THEN
    RAISE EXCEPTION 'Conteudo obrigatorio para recomendacao.';
  END IF;

  IF p_target_type NOT IN ('class', 'student') THEN
    RAISE EXCEPTION 'Destino invalido para recomendacao.';
  END IF;

  IF (p_target_type = 'class' AND p_student_id IS NOT NULL)
    OR (p_target_type = 'student' AND p_student_id IS NULL) THEN
    RAISE EXCEPTION 'Destino da recomendacao incompativel com aluno informado.';
  END IF;

  SELECT * INTO v_teacher
  FROM public.pedagogical_recommendation_current_teacher(p_school_id);

  IF v_teacher.id IS NULL THEN
    RAISE EXCEPTION 'Perfil de professor sem permissao para recomendar nesta escola.';
  END IF;

  IF NOT public.pedagogical_recommendation_teacher_can_target(
    v_teacher.id,
    p_school_id,
    p_class_id,
    p_student_id,
    p_target_type
  ) THEN
    RAISE EXCEPTION 'Professor sem permissao para recomendar para este destino.';
  END IF;

  SELECT * INTO v_existing
  FROM public.pedagogical_recommendations pr
  WHERE pr.school_id = p_school_id
    AND pr.teacher_id = v_teacher.id
    AND pr.content_type = p_content_type
    AND pr.content_id = p_content_id
    AND pr.target_type = p_target_type
    AND pr.class_id = p_class_id
    AND COALESCE(pr.student_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = COALESCE(p_student_id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND pr.status <> 'deleted'
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    v_previous_status := v_existing.status;

    UPDATE public.pedagogical_recommendations
    SET
      content_title = trim(p_content_title),
      note = NULLIF(trim(COALESCE(p_note, '')), ''),
      status = 'published',
      published_at = COALESCE(published_at, now()),
      updated_by = auth.uid()
    WHERE id = v_existing.id
    RETURNING id INTO v_recommendation_id;

    INSERT INTO public.pedagogical_recommendation_events (
      recommendation_id,
      event_type,
      from_status,
      to_status,
      performed_by
    )
    VALUES (
      v_recommendation_id,
      CASE WHEN v_previous_status = 'published' THEN 'edited' ELSE 'published' END,
      v_previous_status,
      'published',
      auth.uid()
    );
  ELSE
    INSERT INTO public.pedagogical_recommendations (
      school_id,
      teacher_id,
      content_type,
      content_id,
      content_title,
      target_type,
      class_id,
      student_id,
      note,
      status,
      published_at,
      created_by,
      updated_by
    )
    VALUES (
      p_school_id,
      v_teacher.id,
      p_content_type,
      trim(p_content_id),
      trim(p_content_title),
      p_target_type,
      p_class_id,
      p_student_id,
      NULLIF(trim(COALESCE(p_note, '')), ''),
      'published',
      now(),
      auth.uid(),
      auth.uid()
    )
    RETURNING id INTO v_recommendation_id;

    INSERT INTO public.pedagogical_recommendation_events (
      recommendation_id,
      event_type,
      to_status,
      performed_by
    )
    VALUES (v_recommendation_id, 'created', 'published', auth.uid());
  END IF;

  RETURN jsonb_build_object(
    'recommendation_id', v_recommendation_id,
    'teacher_id', v_teacher.id,
    'school_id', p_school_id,
    'class_id', p_class_id,
    'target_type', p_target_type,
    'student_id', p_student_id,
    'status', 'published'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_set_pedagogical_recommendation_status(
  p_recommendation_id uuid,
  p_to_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.pedagogical_recommendations;
  v_teacher public.teachers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para alterar recomendacao.';
  END IF;

  IF p_to_status NOT IN ('published', 'archived') THEN
    RAISE EXCEPTION 'Status invalido para recomendacao.';
  END IF;

  SELECT * INTO v_row
  FROM public.pedagogical_recommendations
  WHERE id = p_recommendation_id
    AND status <> 'deleted';

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Recomendacao nao encontrada.';
  END IF;

  SELECT * INTO v_teacher
  FROM public.pedagogical_recommendation_current_teacher(v_row.school_id);

  IF v_teacher.id IS NULL OR v_teacher.id <> v_row.teacher_id THEN
    RAISE EXCEPTION 'Professor sem permissao para alterar esta recomendacao.';
  END IF;

  IF NOT public.pedagogical_recommendation_teacher_can_target(
    v_teacher.id,
    v_row.school_id,
    v_row.class_id,
    v_row.student_id,
    v_row.target_type
  ) THEN
    RAISE EXCEPTION 'Professor sem permissao para alterar esta recomendacao.';
  END IF;

  UPDATE public.pedagogical_recommendations
  SET
    status = p_to_status,
    published_at = CASE WHEN p_to_status = 'published' THEN now() ELSE published_at END,
    updated_by = auth.uid()
  WHERE id = p_recommendation_id;

  INSERT INTO public.pedagogical_recommendation_events (
    recommendation_id,
    event_type,
    from_status,
    to_status,
    performed_by
  )
  VALUES (
    p_recommendation_id,
    CASE WHEN p_to_status = 'published' THEN 'published' ELSE 'archived' END,
    v_row.status,
    p_to_status,
    auth.uid()
  );

  RETURN jsonb_build_object(
    'recommendation_id', p_recommendation_id,
    'status', p_to_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_delete_pedagogical_recommendation(
  p_recommendation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_row public.pedagogical_recommendations;
  v_teacher public.teachers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para excluir recomendacao.';
  END IF;

  SELECT * INTO v_row
  FROM public.pedagogical_recommendations
  WHERE id = p_recommendation_id
    AND status <> 'deleted';

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Recomendacao nao encontrada.';
  END IF;

  SELECT * INTO v_teacher
  FROM public.pedagogical_recommendation_current_teacher(v_row.school_id);

  IF v_teacher.id IS NULL OR v_teacher.id <> v_row.teacher_id THEN
    RAISE EXCEPTION 'Professor sem permissao para excluir esta recomendacao.';
  END IF;

  IF NOT public.pedagogical_recommendation_teacher_can_target(
    v_teacher.id,
    v_row.school_id,
    v_row.class_id,
    v_row.student_id,
    v_row.target_type
  ) THEN
    RAISE EXCEPTION 'Professor sem permissao para excluir esta recomendacao.';
  END IF;

  UPDATE public.pedagogical_recommendations
  SET
    status = 'deleted',
    deleted_at = now(),
    deleted_by = auth.uid(),
    updated_by = auth.uid()
  WHERE id = p_recommendation_id;

  INSERT INTO public.pedagogical_recommendation_events (
    recommendation_id,
    event_type,
    from_status,
    to_status,
    performed_by
  )
  VALUES (p_recommendation_id, 'deleted', v_row.status, 'deleted', auth.uid());

  RETURN jsonb_build_object(
    'recommendation_id', p_recommendation_id,
    'status', 'deleted'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_list_pedagogical_recommendations(
  p_class_id uuid
)
RETURNS TABLE (
  id uuid,
  school_id uuid,
  teacher_id uuid,
  content_type text,
  content_id text,
  content_title text,
  target_type text,
  class_id uuid,
  class_name text,
  student_id uuid,
  student_name text,
  note text,
  status text,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_school_id uuid;
  v_teacher public.teachers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para listar recomendacoes.';
  END IF;

  SELECT c.school_id INTO v_school_id
  FROM public.classes c
  WHERE c.id = p_class_id
    AND c.status = 'active';

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Turma nao encontrada.';
  END IF;

  SELECT * INTO v_teacher
  FROM public.pedagogical_recommendation_current_teacher(v_school_id);

  IF v_teacher.id IS NULL
    OR NOT public.pedagogical_recommendation_teacher_can_target(
      v_teacher.id,
      v_school_id,
      p_class_id,
      NULL,
      'class'
    ) THEN
    RAISE EXCEPTION 'Professor sem permissao para listar recomendacoes desta turma.';
  END IF;

  RETURN QUERY
  SELECT
    pr.id,
    pr.school_id,
    pr.teacher_id,
    pr.content_type,
    pr.content_id,
    pr.content_title,
    pr.target_type,
    pr.class_id,
    c.nome AS class_name,
    pr.student_id,
    s.nome AS student_name,
    pr.note,
    pr.status,
    pr.published_at,
    pr.created_at,
    pr.updated_at
  FROM public.pedagogical_recommendations pr
  JOIN public.classes c ON c.id = pr.class_id
  LEFT JOIN public.students s ON s.id = pr.student_id
  WHERE pr.class_id = p_class_id
    AND pr.teacher_id = v_teacher.id
    AND pr.status <> 'deleted'
  ORDER BY pr.created_at DESC, pr.content_title ASC;
END;
$$;

ALTER TABLE public.pedagogical_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedagogical_recommendation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pedagogical recommendations authenticated read"
  ON public.pedagogical_recommendations;

CREATE POLICY "pedagogical recommendations authenticated read"
  ON public.pedagogical_recommendations
  FOR SELECT
  TO authenticated
  USING (public.pedagogical_recommendation_can_read(pedagogical_recommendations));

DROP POLICY IF EXISTS "pedagogical recommendation events authenticated read"
  ON public.pedagogical_recommendation_events;

CREATE POLICY "pedagogical recommendation events authenticated read"
  ON public.pedagogical_recommendation_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.pedagogical_recommendations pr
      WHERE pr.id = recommendation_id
        AND public.pedagogical_recommendation_can_read(pr)
    )
  );

REVOKE ALL ON public.pedagogical_recommendations FROM PUBLIC;
REVOKE ALL ON public.pedagogical_recommendation_events FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pedagogical_recommendation_current_teacher(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pedagogical_recommendation_teacher_can_target(uuid, uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pedagogical_recommendation_can_read(public.pedagogical_recommendations) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_create_pedagogical_recommendation(uuid, uuid, text, text, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_set_pedagogical_recommendation_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_delete_pedagogical_recommendation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) FROM PUBLIC;

GRANT SELECT ON public.pedagogical_recommendations TO authenticated;
GRANT SELECT ON public.pedagogical_recommendation_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_create_pedagogical_recommendation(uuid, uuid, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_set_pedagogical_recommendation_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_delete_pedagogical_recommendation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) TO authenticated;
