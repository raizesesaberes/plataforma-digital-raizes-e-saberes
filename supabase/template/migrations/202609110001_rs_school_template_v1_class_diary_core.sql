-- RS-SCHOOL-TEMPLATE V1 - Diario de Classe core.
-- Registro oficial da aula realizada, reaproveitando frequencia, planejamento,
-- agenda e atividades sem duplicar os motores existentes.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.profiles nao existe';
  END IF;

  IF to_regclass('public.schools') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.schools nao existe';
  END IF;

  IF to_regclass('public.classes') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.classes nao existe';
  END IF;

  IF to_regclass('public.teachers') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.teachers nao existe';
  END IF;

  IF to_regclass('public.class_teacher_memberships') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.class_teacher_memberships nao existe';
  END IF;

  IF to_regclass('public.attendance_records') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.attendance_records nao existe';
  END IF;

  IF to_regclass('public.teacher_plans') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.teacher_plans nao existe';
  END IF;

  IF to_regclass('public.class_calendar_entries') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.class_calendar_entries nao existe';
  END IF;

  IF to_regprocedure('public.institutional_touch_updated_at()') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.institutional_touch_updated_at() nao existe';
  END IF;

  IF to_regprocedure('public.institutional_teacher_can_manage_class(uuid, uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.institutional_teacher_can_manage_class(uuid, uuid, uuid) nao existe';
  END IF;

  IF to_regprocedure('public.secretaria_can_manage_school(uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.secretaria_can_manage_school(uuid) nao existe';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.class_diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  entry_date date NOT NULL,
  title text NOT NULL DEFAULT 'Diario de Classe',
  taught_content text NOT NULL DEFAULT '',
  pedagogical_notes text NOT NULL DEFAULT '',
  plan_id uuid REFERENCES public.teacher_plans(id) ON DELETE SET NULL,
  calendar_entry_id uuid REFERENCES public.class_calendar_entries(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  closed_at timestamptz,
  closed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_diary_entries_status_check CHECK (status IN ('draft', 'closed', 'deleted')),
  CONSTRAINT class_diary_entries_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT class_diary_entries_closed_shape_check CHECK (
    (status <> 'closed') OR (closed_at IS NOT NULL AND closed_by IS NOT NULL)
  ),
  CONSTRAINT class_diary_entries_deleted_shape_check CHECK (
    (status <> 'deleted') OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
  )
);

COMMENT ON TABLE public.class_diary_entries IS
  'Registro oficial da aula realizada. Nao duplica frequencia, planejamento nem atividades.';
COMMENT ON COLUMN public.class_diary_entries.taught_content IS
  'Conteudo efetivamente ministrado na aula.';
COMMENT ON COLUMN public.class_diary_entries.pedagogical_notes IS
  'Registro pedagogico coletivo da aula/turma. Observacoes individuais ficam fora desta V1.';

CREATE TABLE IF NOT EXISTS public.class_diary_activity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id uuid NOT NULL REFERENCES public.class_diary_entries(id) ON DELETE CASCADE,
  activity_type text NOT NULL,
  activity_id text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_diary_activity_links_type_check CHECK (
    activity_type IN ('printable_activity', 'activity', 'game', 'experience', 'book', 'assessment', 'other')
  ),
  CONSTRAINT class_diary_activity_links_id_not_blank CHECK (length(btrim(activity_id)) > 0)
);

COMMENT ON TABLE public.class_diary_activity_links IS
  'Vinculos do Diario com atividades/conteudos existentes. Nao copia o conteudo original.';

CREATE TABLE IF NOT EXISTS public.class_diary_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_entry_id uuid NOT NULL REFERENCES public.class_diary_entries(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_diary_events_type_check CHECK (event_type IN ('created', 'updated', 'closed', 'reopened', 'soft_deleted')),
  CONSTRAINT class_diary_events_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS class_diary_entries_school_date_idx
  ON public.class_diary_entries (school_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS class_diary_entries_class_date_idx
  ON public.class_diary_entries (class_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS class_diary_entries_teacher_date_idx
  ON public.class_diary_entries (teacher_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS class_diary_entries_status_idx
  ON public.class_diary_entries (status);
CREATE UNIQUE INDEX IF NOT EXISTS class_diary_entries_one_active_day_idx
  ON public.class_diary_entries (school_id, class_id, teacher_id, entry_date)
  WHERE status <> 'deleted' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS class_diary_activity_links_entry_idx
  ON public.class_diary_activity_links (diary_entry_id);
CREATE UNIQUE INDEX IF NOT EXISTS class_diary_activity_links_unique_idx
  ON public.class_diary_activity_links (diary_entry_id, activity_type, activity_id);

CREATE INDEX IF NOT EXISTS class_diary_events_entry_created_idx
  ON public.class_diary_events (diary_entry_id, created_at DESC);

DROP TRIGGER IF EXISTS class_diary_entries_touch_updated_at ON public.class_diary_entries;
CREATE TRIGGER class_diary_entries_touch_updated_at
  BEFORE UPDATE ON public.class_diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE OR REPLACE FUNCTION public.class_diary_teacher_can_manage(
  p_school_id uuid,
  p_class_id uuid,
  p_teacher_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teachers t
    WHERE t.id = p_teacher_id
      AND t.school_id = p_school_id
      AND t.profile_id = auth.uid()
      AND t.status = 'active'
      AND public.institutional_teacher_can_manage_class(t.id, p_class_id, p_school_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.class_diary_validate_links(
  p_school_id uuid,
  p_class_id uuid,
  p_teacher_id uuid,
  p_plan_id uuid,
  p_calendar_entry_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    (
      p_plan_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.teacher_plans tp
        WHERE tp.id = p_plan_id
          AND tp.school_id = p_school_id
          AND tp.class_id = p_class_id
          AND tp.teacher_id = p_teacher_id
          AND tp.status <> 'archived'
      )
    )
    AND
    (
      p_calendar_entry_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.class_calendar_entries cce
        WHERE cce.id = p_calendar_entry_id
          AND cce.school_id = p_school_id
          AND cce.class_id = p_class_id
          AND cce.teacher_id = p_teacher_id
          AND cce.status = 'published'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.class_diary_can_read(
  p_school_id uuid,
  p_class_id uuid,
  p_teacher_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_platform_admin()
    OR public.secretaria_can_manage_school(p_school_id)
    OR public.class_diary_teacher_can_manage(p_school_id, p_class_id, p_teacher_id);
$$;

CREATE OR REPLACE FUNCTION public.class_diary_apply_activity_links(
  p_entry_id uuid,
  p_links jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link jsonb;
  v_count integer := 0;
  v_type text;
  v_id text;
BEGIN
  IF p_links IS NULL THEN
    RETURN 0;
  END IF;

  IF jsonb_typeof(p_links) <> 'array' THEN
    RAISE EXCEPTION 'Atividades vinculadas devem ser enviadas como array.' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.class_diary_activity_links
  WHERE diary_entry_id = p_entry_id;

  FOR v_link IN SELECT * FROM jsonb_array_elements(p_links)
  LOOP
    v_type := lower(nullif(trim(coalesce(v_link ->> 'activity_type', v_link ->> 'type')), ''));
    v_id := nullif(trim(coalesce(v_link ->> 'activity_id', v_link ->> 'id')), '');

    IF v_type IS NULL OR v_id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_type NOT IN ('printable_activity', 'activity', 'game', 'experience', 'book', 'assessment', 'other') THEN
      RAISE EXCEPTION 'Tipo de atividade invalido para Diario de Classe.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.class_diary_activity_links (diary_entry_id, activity_type, activity_id, created_by)
    VALUES (p_entry_id, v_type, v_id, auth.uid())
    ON CONFLICT (diary_entry_id, activity_type, activity_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_upsert_class_diary_entry(
  p_entry_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL,
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
  v_entry public.class_diary_entries%ROWTYPE;
  v_existing public.class_diary_entries%ROWTYPE;
  v_event_type text := 'created';
  v_link_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = '42501';
  END IF;

  IF p_school_id IS NULL OR p_class_id IS NULL OR p_teacher_id IS NULL OR p_entry_date IS NULL THEN
    RAISE EXCEPTION 'Escola, turma, professor e data sao obrigatorios.' USING ERRCODE = '22023';
  END IF;

  IF NOT public.class_diary_teacher_can_manage(p_school_id, p_class_id, p_teacher_id) THEN
    RAISE EXCEPTION 'Professor sem permissao para registrar Diario desta turma.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.class_diary_validate_links(p_school_id, p_class_id, p_teacher_id, p_plan_id, p_calendar_entry_id) THEN
    RAISE EXCEPTION 'Planejamento ou agenda nao pertencem a esta turma/professor.' USING ERRCODE = '42501';
  END IF;

  IF p_entry_id IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.class_diary_entries
    WHERE id = p_entry_id
    FOR UPDATE;
  ELSE
    SELECT * INTO v_existing
    FROM public.class_diary_entries
    WHERE school_id = p_school_id
      AND class_id = p_class_id
      AND teacher_id = p_teacher_id
      AND entry_date = p_entry_date
      AND status <> 'deleted'
      AND deleted_at IS NULL
    FOR UPDATE;
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
      p_school_id,
      p_class_id,
      p_teacher_id,
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

CREATE OR REPLACE FUNCTION public.teacher_close_class_diary_entry(
  p_entry_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_entry public.class_diary_entries%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_entry
  FROM public.class_diary_entries
  WHERE id = p_entry_id
  FOR UPDATE;

  IF v_entry.id IS NULL THEN
    RAISE EXCEPTION 'Diario de Classe nao encontrado.' USING ERRCODE = '22023';
  END IF;

  IF NOT public.class_diary_teacher_can_manage(v_entry.school_id, v_entry.class_id, v_entry.teacher_id) THEN
    RAISE EXCEPTION 'Professor sem permissao para fechar este Diario.' USING ERRCODE = '42501';
  END IF;

  IF v_entry.status = 'closed' THEN
    RETURN jsonb_build_object('diary_entry_id', v_entry.id, 'status', v_entry.status, 'changed', false);
  END IF;

  IF v_entry.status = 'deleted' OR v_entry.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Diario excluido nao pode ser fechado.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.class_diary_entries
  SET status = 'closed',
    closed_at = now(),
    closed_by = auth.uid(),
    updated_at = now()
  WHERE id = v_entry.id
  RETURNING * INTO v_entry;

  INSERT INTO public.class_diary_events (diary_entry_id, event_type, actor_id, metadata)
  VALUES (
    v_entry.id,
    'closed',
    auth.uid(),
    jsonb_build_object(
      'school_id', v_entry.school_id,
      'class_id', v_entry.class_id,
      'teacher_id', v_entry.teacher_id,
      'entry_date', v_entry.entry_date
    )
  );

  RETURN jsonb_build_object('diary_entry_id', v_entry.id, 'status', v_entry.status, 'changed', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_list_class_diary_entries(
  p_class_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  school_id uuid,
  class_id uuid,
  teacher_id uuid,
  entry_date date,
  title text,
  taught_content text,
  pedagogical_notes text,
  plan_id uuid,
  plan_title text,
  calendar_entry_id uuid,
  calendar_title text,
  status text,
  closed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  activity_link_count bigint,
  attendance_total bigint,
  attendance_present bigint,
  attendance_absent bigint,
  attendance_justified bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    cde.id,
    cde.school_id,
    cde.class_id,
    cde.teacher_id,
    cde.entry_date,
    cde.title,
    cde.taught_content,
    cde.pedagogical_notes,
    cde.plan_id,
    tp.title AS plan_title,
    cde.calendar_entry_id,
    cce.title AS calendar_title,
    cde.status,
    cde.closed_at,
    cde.created_at,
    cde.updated_at,
    COALESCE(links.count, 0) AS activity_link_count,
    COALESCE(attendance.total, 0) AS attendance_total,
    COALESCE(attendance.present, 0) AS attendance_present,
    COALESCE(attendance.absent, 0) AS attendance_absent,
    COALESCE(attendance.justified, 0) AS attendance_justified
  FROM public.class_diary_entries cde
  LEFT JOIN public.teacher_plans tp ON tp.id = cde.plan_id
  LEFT JOIN public.class_calendar_entries cce ON cce.id = cde.calendar_entry_id
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint
    FROM public.class_diary_activity_links l
    WHERE l.diary_entry_id = cde.id
  ) links(count) ON true
  LEFT JOIN LATERAL (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE ar.status = 'present')::bigint AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::bigint AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::bigint AS justified
    FROM public.attendance_records ar
    WHERE ar.school_id = cde.school_id
      AND ar.class_id = cde.class_id
      AND ar.attendance_date = cde.entry_date
  ) attendance ON true
  WHERE cde.status <> 'deleted'
    AND (p_class_id IS NULL OR cde.class_id = p_class_id)
    AND (p_from IS NULL OR cde.entry_date >= p_from)
    AND (p_to IS NULL OR cde.entry_date <= p_to)
    AND public.class_diary_teacher_can_manage(cde.school_id, cde.class_id, cde.teacher_id)
  ORDER BY cde.entry_date DESC, cde.updated_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_list_class_diary_entries(
  p_class_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  school_id uuid,
  school_name text,
  class_id uuid,
  class_name text,
  teacher_id uuid,
  teacher_name text,
  entry_date date,
  title text,
  taught_content text,
  pedagogical_notes text,
  plan_id uuid,
  plan_title text,
  calendar_entry_id uuid,
  calendar_title text,
  status text,
  closed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  activity_link_count bigint,
  attendance_total bigint,
  attendance_present bigint,
  attendance_absent bigint,
  attendance_justified bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    cde.id,
    cde.school_id,
    s.nome AS school_name,
    cde.class_id,
    c.nome AS class_name,
    cde.teacher_id,
    COALESCE(p.display_name, t.full_name, 'Professor') AS teacher_name,
    cde.entry_date,
    cde.title,
    cde.taught_content,
    cde.pedagogical_notes,
    cde.plan_id,
    tp.title AS plan_title,
    cde.calendar_entry_id,
    cce.title AS calendar_title,
    cde.status,
    cde.closed_at,
    cde.created_at,
    cde.updated_at,
    COALESCE(links.count, 0) AS activity_link_count,
    COALESCE(attendance.total, 0) AS attendance_total,
    COALESCE(attendance.present, 0) AS attendance_present,
    COALESCE(attendance.absent, 0) AS attendance_absent,
    COALESCE(attendance.justified, 0) AS attendance_justified
  FROM public.class_diary_entries cde
  JOIN public.schools s ON s.id = cde.school_id
  JOIN public.classes c ON c.id = cde.class_id
  JOIN public.teachers t ON t.id = cde.teacher_id
  LEFT JOIN public.profiles p ON p.id = t.profile_id
  LEFT JOIN public.teacher_plans tp ON tp.id = cde.plan_id
  LEFT JOIN public.class_calendar_entries cce ON cce.id = cde.calendar_entry_id
  LEFT JOIN LATERAL (
    SELECT count(*)::bigint
    FROM public.class_diary_activity_links l
    WHERE l.diary_entry_id = cde.id
  ) links(count) ON true
  LEFT JOIN LATERAL (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE ar.status = 'present')::bigint AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::bigint AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::bigint AS justified
    FROM public.attendance_records ar
    WHERE ar.school_id = cde.school_id
      AND ar.class_id = cde.class_id
      AND ar.attendance_date = cde.entry_date
  ) attendance ON true
  WHERE cde.status <> 'deleted'
    AND (p_class_id IS NULL OR cde.class_id = p_class_id)
    AND (p_from IS NULL OR cde.entry_date >= p_from)
    AND (p_to IS NULL OR cde.entry_date <= p_to)
    AND (
      public.is_platform_admin()
      OR public.secretaria_can_manage_school(cde.school_id)
    )
  ORDER BY cde.entry_date DESC, cde.updated_at DESC;
$$;

REVOKE ALL ON public.class_diary_entries FROM PUBLIC;
REVOKE ALL ON public.class_diary_activity_links FROM PUBLIC;
REVOKE ALL ON public.class_diary_events FROM PUBLIC;
REVOKE ALL ON public.class_diary_entries FROM anon;
REVOKE ALL ON public.class_diary_activity_links FROM anon;
REVOKE ALL ON public.class_diary_events FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.class_diary_entries TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.class_diary_activity_links TO authenticated;
GRANT SELECT, INSERT ON public.class_diary_events TO authenticated;

REVOKE ALL ON FUNCTION public.class_diary_teacher_can_manage(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.class_diary_validate_links(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.class_diary_can_read(uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.class_diary_apply_activity_links(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.class_diary_apply_activity_links(uuid, jsonb) FROM authenticated, service_role;
REVOKE ALL ON FUNCTION public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_close_class_diary_entry(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_list_class_diary_entries(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_list_class_diary_entries(uuid, date, date) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.class_diary_teacher_can_manage(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.class_diary_validate_links(uuid, uuid, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.class_diary_can_read(uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_upsert_class_diary_entry(uuid, uuid, uuid, uuid, date, text, text, text, uuid, uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_close_class_diary_entry(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_list_class_diary_entries(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_list_class_diary_entries(uuid, date, date) TO authenticated, service_role;

ALTER TABLE public.class_diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_diary_activity_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_diary_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_diary_entries_select_authorized ON public.class_diary_entries;
CREATE POLICY class_diary_entries_select_authorized
ON public.class_diary_entries
FOR SELECT
TO authenticated
USING (
  status <> 'deleted'
  AND public.class_diary_can_read(school_id, class_id, teacher_id)
);

DROP POLICY IF EXISTS class_diary_entries_insert_teacher ON public.class_diary_entries;
CREATE POLICY class_diary_entries_insert_teacher
ON public.class_diary_entries
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'draft'
  AND created_by = auth.uid()
  AND public.class_diary_teacher_can_manage(school_id, class_id, teacher_id)
  AND public.class_diary_validate_links(school_id, class_id, teacher_id, plan_id, calendar_entry_id)
);

DROP POLICY IF EXISTS class_diary_entries_update_teacher ON public.class_diary_entries;
CREATE POLICY class_diary_entries_update_teacher
ON public.class_diary_entries
FOR UPDATE
TO authenticated
USING (
  public.class_diary_teacher_can_manage(school_id, class_id, teacher_id)
)
WITH CHECK (
  public.class_diary_teacher_can_manage(school_id, class_id, teacher_id)
  AND public.class_diary_validate_links(school_id, class_id, teacher_id, plan_id, calendar_entry_id)
);

DROP POLICY IF EXISTS class_diary_activity_links_select_authorized ON public.class_diary_activity_links;
CREATE POLICY class_diary_activity_links_select_authorized
ON public.class_diary_activity_links
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_diary_entries cde
    WHERE cde.id = diary_entry_id
      AND cde.status <> 'deleted'
      AND public.class_diary_can_read(cde.school_id, cde.class_id, cde.teacher_id)
  )
);

DROP POLICY IF EXISTS class_diary_activity_links_insert_teacher ON public.class_diary_activity_links;
CREATE POLICY class_diary_activity_links_insert_teacher
ON public.class_diary_activity_links
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.class_diary_entries cde
    WHERE cde.id = diary_entry_id
      AND cde.status = 'draft'
      AND public.class_diary_teacher_can_manage(cde.school_id, cde.class_id, cde.teacher_id)
  )
);

DROP POLICY IF EXISTS class_diary_activity_links_delete_teacher ON public.class_diary_activity_links;
CREATE POLICY class_diary_activity_links_delete_teacher
ON public.class_diary_activity_links
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_diary_entries cde
    WHERE cde.id = diary_entry_id
      AND cde.status = 'draft'
      AND public.class_diary_teacher_can_manage(cde.school_id, cde.class_id, cde.teacher_id)
  )
);

DROP POLICY IF EXISTS class_diary_events_select_authorized ON public.class_diary_events;
CREATE POLICY class_diary_events_select_authorized
ON public.class_diary_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_diary_entries cde
    WHERE cde.id = diary_entry_id
      AND cde.status <> 'deleted'
      AND public.class_diary_can_read(cde.school_id, cde.class_id, cde.teacher_id)
  )
);

DROP POLICY IF EXISTS class_diary_events_insert_authorized ON public.class_diary_events;
CREATE POLICY class_diary_events_insert_authorized
ON public.class_diary_events
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.class_diary_entries cde
    WHERE cde.id = diary_entry_id
      AND public.class_diary_teacher_can_manage(cde.school_id, cde.class_id, cde.teacher_id)
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('class_diary_entries', 'class_diary_activity_links', 'class_diary_events')
      AND (
        coalesce(qual, '') = 'true'
        OR coalesce(with_check, '') = 'true'
      )
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: existe policy USING(true) ou WITH CHECK(true) no Diario de Classe';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name IN ('class_diary_entries', 'class_diary_activity_links', 'class_diary_events')
      AND grantee = 'anon'
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: anon possui privilegios em tabelas do Diario de Classe';
  END IF;
END $$;

COMMIT;
