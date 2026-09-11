-- RS-SCHOOL-TEMPLATE V1 - Canonical school content availability
-- Content metadata stays in its original catalog. This table only grants school availability.

CREATE TABLE IF NOT EXISTS public.school_content_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id text NOT NULL,
  status text NOT NULL DEFAULT 'available',
  available_from timestamptz,
  available_until timestamptz,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT school_content_availability_content_type_check
    CHECK (content_type IN ('book', 'activity', 'game', 'experience', 'video', 'other')),
  CONSTRAINT school_content_availability_status_check
    CHECK (status IN ('available', 'unavailable')),
  CONSTRAINT school_content_availability_content_id_not_blank
    CHECK (length(btrim(content_id)) > 0),
  CONSTRAINT school_content_availability_window_check
    CHECK (available_from IS NULL OR available_until IS NULL OR available_until >= available_from),
  CONSTRAINT school_content_availability_no_secret_id_check
    CHECK (content_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)')
);

COMMENT ON TABLE public.school_content_availability IS
  'Disponibilidade canonica de conteudo por escola. Nao copia catalogo editorial nem metadados sensiveis.';

CREATE UNIQUE INDEX IF NOT EXISTS school_content_availability_active_unique_idx
  ON public.school_content_availability (school_id, content_type, lower(btrim(content_id)))
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS school_content_availability_school_status_idx
  ON public.school_content_availability (school_id, status, content_type);

CREATE INDEX IF NOT EXISTS school_content_availability_content_idx
  ON public.school_content_availability (content_type, lower(btrim(content_id)));

DROP TRIGGER IF EXISTS school_content_availability_touch_updated_at
  ON public.school_content_availability;

CREATE TRIGGER school_content_availability_touch_updated_at
  BEFORE UPDATE ON public.school_content_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE TABLE IF NOT EXISTS public.admin_content_availability_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  school_id uuid REFERENCES public.schools(id) ON DELETE SET NULL,
  availability_id uuid REFERENCES public.school_content_availability(id) ON DELETE SET NULL,
  content_type text NOT NULL,
  content_id text NOT NULL,
  action text NOT NULL,
  from_status text,
  to_status text,
  available_from timestamptz,
  available_until timestamptz,
  result text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_content_availability_events_action_check
    CHECK (action IN ('set_available', 'set_unavailable', 'period_updated', 'noop', 'failed')),
  CONSTRAINT admin_content_availability_events_result_check
    CHECK (result IN ('created', 'updated', 'removed', 'noop', 'blocked', 'failed')),
  CONSTRAINT admin_content_availability_events_no_secret_check
    CHECK (
      content_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      AND metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    )
);

CREATE INDEX IF NOT EXISTS admin_content_availability_events_school_idx
  ON public.admin_content_availability_events (school_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.normalize_school_content_type(p_content_type text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_type text := lower(btrim(coalesce(p_content_type, '')));
BEGIN
  IF v_type IN ('book', 'livro') THEN
    RETURN 'book';
  ELSIF v_type IN ('activity', 'printable_activity', 'atividade', 'atividade_imprimivel') THEN
    RETURN 'activity';
  ELSIF v_type IN ('game', 'jogo') THEN
    RETURN 'game';
  ELSIF v_type IN ('experience', 'experiencia', 'experiência') THEN
    RETURN 'experience';
  ELSIF v_type IN ('video', 'videoaula') THEN
    RETURN 'video';
  ELSIF v_type IN ('other', 'outro', 'free_proposal', 'proposta_livre') THEN
    RETURN 'other';
  END IF;

  RAISE EXCEPTION 'Tipo de conteudo invalido: %', coalesce(p_content_type, '')
    USING errcode = '22023';
END;
$$;

CREATE OR REPLACE FUNCTION public.current_institutional_school_ids()
RETURNS TABLE (school_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT DISTINCT source.school_id
  FROM (
    SELECT sm.school_id
    FROM public.school_memberships sm
    WHERE sm.profile_id = auth.uid()
      AND sm.status = 'active'
      AND sm.started_at <= now()
      AND (sm.ended_at IS NULL OR sm.ended_at > now())

    UNION

    SELECT t.school_id
    FROM public.teachers t
    WHERE t.profile_id = auth.uid()
      AND t.status = 'active'

    UNION

    SELECT s.school_id
    FROM public.students s
    WHERE s.user_id = auth.uid()
      AND coalesce(s.status, 'active') = 'active'

    UNION

    SELECT g.school_id
    FROM public.guardians g
    WHERE g.profile_id = auth.uid()
      AND g.status = 'active'

    UNION

    SELECT e.school_id
    FROM public.student_guardians sg
    JOIN public.enrollments e ON e.student_id = sg.student_id
    WHERE sg.profile_id = auth.uid()
      AND sg.status = 'active'
      AND e.status = 'active'
      AND e.ended_at IS NULL
  ) source
  WHERE source.school_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_read_school_content_availability(p_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND (
      public.is_platform_admin()
      OR EXISTS (
        SELECT 1
        FROM public.current_institutional_school_ids() ids
        WHERE ids.school_id = p_school_id
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_content_available_for_school(
  p_school_id uuid,
  p_content_type text,
  p_content_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_content_availability sca
    WHERE sca.school_id = p_school_id
      AND sca.content_type = public.normalize_school_content_type(p_content_type)
      AND lower(btrim(sca.content_id)) = lower(btrim(coalesce(p_content_id, '')))
      AND sca.status = 'available'
      AND sca.deleted_at IS NULL
      AND (sca.available_from IS NULL OR sca.available_from <= now())
      AND (sca.available_until IS NULL OR sca.available_until >= now())
  );
$$;

CREATE OR REPLACE FUNCTION public.admin_set_school_content_availability(
  p_school_id uuid,
  p_content_type text,
  p_content_id text,
  p_status text DEFAULT 'available',
  p_available_from timestamptz DEFAULT NULL,
  p_available_until timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_type text;
  v_status text := lower(btrim(coalesce(p_status, 'available')));
  v_content_id text := btrim(coalesce(p_content_id, ''));
  v_existing public.school_content_availability;
  v_availability_id uuid;
  v_result text;
  v_action text;
BEGIN
  IF v_admin IS NULL OR NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Apenas Admin/TI pode alterar disponibilidade de conteudo.'
      USING errcode = '42501';
  END IF;

  v_type := public.normalize_school_content_type(p_content_type);

  IF v_content_id = '' THEN
    RAISE EXCEPTION 'content_id obrigatorio.' USING errcode = '22023';
  END IF;

  IF v_content_id ~* '(password|senha|token|secret|service_role|access_token|refresh_token)' THEN
    RAISE EXCEPTION 'content_id contem termo sensivel.' USING errcode = '22023';
  END IF;

  IF v_status NOT IN ('available', 'unavailable') THEN
    RAISE EXCEPTION 'Status de disponibilidade invalido.' USING errcode = '22023';
  END IF;

  IF p_available_from IS NOT NULL AND p_available_until IS NOT NULL AND p_available_until < p_available_from THEN
    RAISE EXCEPTION 'Janela de disponibilidade invalida.' USING errcode = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.schools s
    WHERE s.id = p_school_id
      AND coalesce(s.status, 'active') <> 'archived'
  ) THEN
    RAISE EXCEPTION 'Escola nao encontrada ou arquivada.' USING errcode = '22023';
  END IF;

  SELECT * INTO v_existing
  FROM public.school_content_availability sca
  WHERE sca.school_id = p_school_id
    AND sca.content_type = v_type
    AND lower(btrim(sca.content_id)) = lower(v_content_id)
    AND sca.deleted_at IS NULL
  LIMIT 1;

  IF v_status = 'unavailable' THEN
    IF v_existing.id IS NULL THEN
      v_result := 'noop';
      v_action := 'noop';
    ELSE
      UPDATE public.school_content_availability
      SET
        status = 'unavailable',
        available_from = p_available_from,
        available_until = p_available_until,
        updated_by = v_admin,
        deleted_by = v_admin,
        deleted_at = now()
      WHERE id = v_existing.id
      RETURNING id INTO v_availability_id;
      v_result := 'removed';
      v_action := 'set_unavailable';
    END IF;
  ELSIF v_existing.id IS NULL THEN
    INSERT INTO public.school_content_availability (
      school_id,
      content_type,
      content_id,
      status,
      available_from,
      available_until,
      created_by,
      updated_by
    )
    VALUES (
      p_school_id,
      v_type,
      v_content_id,
      'available',
      p_available_from,
      p_available_until,
      v_admin,
      v_admin
    )
    RETURNING id INTO v_availability_id;
    v_result := 'created';
    v_action := 'set_available';
  ELSE
    UPDATE public.school_content_availability
    SET
      status = 'available',
      available_from = p_available_from,
      available_until = p_available_until,
      updated_by = v_admin
    WHERE id = v_existing.id
    RETURNING id INTO v_availability_id;
    v_result := 'updated';
    v_action := CASE
      WHEN v_existing.available_from IS DISTINCT FROM p_available_from
        OR v_existing.available_until IS DISTINCT FROM p_available_until
        THEN 'period_updated'
      ELSE 'set_available'
    END;
  END IF;

  INSERT INTO public.admin_content_availability_events (
    admin_user_id,
    school_id,
    availability_id,
    content_type,
    content_id,
    action,
    from_status,
    to_status,
    available_from,
    available_until,
    result
  )
  VALUES (
    v_admin,
    p_school_id,
    v_availability_id,
    v_type,
    v_content_id,
    v_action,
    v_existing.status,
    v_status,
    p_available_from,
    p_available_until,
    v_result
  );

  RETURN jsonb_build_object(
    'ok', true,
    'availability_id', v_availability_id,
    'school_id', p_school_id,
    'content_type', v_type,
    'content_id', v_content_id,
    'status', v_status,
    'result', v_result
  );
END;
$$;

ALTER TABLE public.school_content_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_content_availability_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_content_availability_select_by_school_context
  ON public.school_content_availability;
CREATE POLICY school_content_availability_select_by_school_context
  ON public.school_content_availability
  FOR SELECT
  TO authenticated
  USING (public.can_read_school_content_availability(school_id));

DROP POLICY IF EXISTS admin_content_availability_events_admin_select
  ON public.admin_content_availability_events;
CREATE POLICY admin_content_availability_events_admin_select
  ON public.admin_content_availability_events
  FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

REVOKE ALL ON TABLE public.school_content_availability FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.admin_content_availability_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.school_content_availability TO authenticated;

REVOKE ALL ON FUNCTION public.normalize_school_content_type(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_institutional_school_ids() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_read_school_content_availability(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_content_available_for_school(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_school_content_availability(uuid, text, text, text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_school_content_type(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_institutional_school_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_school_content_availability(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_content_available_for_school(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_school_content_availability(uuid, text, text, text, timestamptz, timestamptz) TO authenticated;

INSERT INTO public.school_content_availability (
  school_id,
  content_type,
  content_id,
  status,
  created_by,
  updated_by
)
SELECT DISTINCT
  pr.school_id,
  public.normalize_school_content_type(pr.content_type),
  btrim(pr.content_id),
  'available',
  pr.created_by,
  pr.updated_by
FROM public.pedagogical_recommendations pr
WHERE pr.status = 'published'
  AND pr.deleted_at IS NULL
  AND btrim(coalesce(pr.content_id, '')) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.school_content_availability sca
    WHERE sca.school_id = pr.school_id
      AND sca.content_type = public.normalize_school_content_type(pr.content_type)
      AND lower(btrim(sca.content_id)) = lower(btrim(pr.content_id))
      AND sca.deleted_at IS NULL
  );

CREATE OR REPLACE FUNCTION public.pedagogical_recommendation_can_read(
  p_recommendation public.pedagogical_recommendations
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
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
        AND public.is_content_available_for_school(
          p_recommendation.school_id,
          p_recommendation.content_type,
          p_recommendation.content_id
        )
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
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_teacher public.teachers;
  v_existing public.pedagogical_recommendations;
  v_recommendation_id uuid;
  v_previous_status text;
  v_content_type text;
  v_content_id text := btrim(coalesce(p_content_id, ''));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para recomendar atividade.';
  END IF;

  v_content_type := public.normalize_school_content_type(p_content_type);

  IF NULLIF(v_content_id, '') IS NULL OR NULLIF(trim(p_content_title), '') IS NULL THEN
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

  IF NOT public.is_content_available_for_school(p_school_id, v_content_type, v_content_id) THEN
    RAISE EXCEPTION 'Conteudo indisponivel para esta escola.';
  END IF;

  SELECT * INTO v_existing
  FROM public.pedagogical_recommendations pr
  WHERE pr.school_id = p_school_id
    AND pr.teacher_id = v_teacher.id
    AND public.normalize_school_content_type(pr.content_type) = v_content_type
    AND lower(btrim(pr.content_id)) = lower(v_content_id)
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
      content_type = v_content_type,
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
      v_content_type,
      v_content_id,
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
    'content_type', v_content_type,
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
SET search_path = public, auth, pg_temp
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

  IF p_to_status = 'published'
    AND NOT public.is_content_available_for_school(v_row.school_id, v_row.content_type, v_row.content_id) THEN
    RAISE EXCEPTION 'Conteudo indisponivel para esta escola.';
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
