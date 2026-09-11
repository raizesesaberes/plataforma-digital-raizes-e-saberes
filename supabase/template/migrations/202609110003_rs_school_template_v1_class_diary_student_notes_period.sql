-- RS-SCHOOL-TEMPLATE V1 - Diario de Classe Fase 03.
-- Observacoes individuais, consolidacao por periodo e ponte para Avalia+ sem
-- criar notas, boletim, analytics ou fechamento oficial de periodo.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.class_diary_entries') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.class_diary_entries nao existe';
  END IF;

  IF to_regclass('public.class_diary_activity_links') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.class_diary_activity_links nao existe';
  END IF;

  IF to_regclass('public.attendance_records') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.attendance_records nao existe';
  END IF;

  IF to_regclass('public.enrollments') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.enrollments nao existe';
  END IF;

  IF to_regprocedure('public.class_diary_teacher_can_manage(uuid, uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.class_diary_teacher_can_manage(uuid, uuid, uuid) nao existe';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.class_diary_student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE RESTRICT,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE RESTRICT,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE RESTRICT,
  diary_entry_id uuid REFERENCES public.class_diary_entries(id) ON DELETE SET NULL,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  note_text text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_diary_student_notes_status_check CHECK (status IN ('active', 'deleted')),
  CONSTRAINT class_diary_student_notes_text_not_blank CHECK (length(btrim(note_text)) > 0),
  CONSTRAINT class_diary_student_notes_deleted_shape_check CHECK (
    (status <> 'deleted') OR (deleted_at IS NOT NULL AND deleted_by IS NOT NULL)
  )
);

COMMENT ON TABLE public.class_diary_student_notes IS
  'Observacoes pedagogicas individuais vinculadas a aluno/turma/escola. Base preparatoria para Avalia+, sem nota, boletim ou analytics.';
COMMENT ON COLUMN public.class_diary_student_notes.diary_entry_id IS
  'Vinculo opcional ao registro coletivo do Diario de Classe.';

CREATE TABLE IF NOT EXISTS public.class_diary_student_note_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_note_id uuid NOT NULL REFERENCES public.class_diary_student_notes(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE RESTRICT,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_diary_student_note_events_type_check CHECK (event_type IN ('created', 'updated', 'soft_deleted')),
  CONSTRAINT class_diary_student_note_events_metadata_object_check CHECK (jsonb_typeof(metadata) = 'object')
);

CREATE INDEX IF NOT EXISTS class_diary_student_notes_school_date_idx
  ON public.class_diary_student_notes (school_id, note_date DESC);
CREATE INDEX IF NOT EXISTS class_diary_student_notes_class_date_idx
  ON public.class_diary_student_notes (class_id, note_date DESC);
CREATE INDEX IF NOT EXISTS class_diary_student_notes_student_date_idx
  ON public.class_diary_student_notes (student_id, note_date DESC);
CREATE INDEX IF NOT EXISTS class_diary_student_notes_teacher_date_idx
  ON public.class_diary_student_notes (teacher_id, note_date DESC);
CREATE INDEX IF NOT EXISTS class_diary_student_notes_entry_idx
  ON public.class_diary_student_notes (diary_entry_id);
CREATE INDEX IF NOT EXISTS class_diary_student_note_events_note_created_idx
  ON public.class_diary_student_note_events (student_note_id, created_at DESC);

DROP TRIGGER IF EXISTS class_diary_student_notes_touch_updated_at ON public.class_diary_student_notes;
CREATE TRIGGER class_diary_student_notes_touch_updated_at
  BEFORE UPDATE ON public.class_diary_student_notes
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE OR REPLACE FUNCTION public.class_diary_student_note_can_manage(
  p_school_id uuid,
  p_class_id uuid,
  p_teacher_id uuid,
  p_student_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.class_diary_teacher_can_manage(p_school_id, p_class_id, p_teacher_id)
    AND EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.enrollments e ON e.student_id = s.id
      WHERE s.id = p_student_id
        AND s.school_id = p_school_id
        AND e.school_id = p_school_id
        AND e.class_id = p_class_id
        AND e.status = 'active'
        AND coalesce(s.status, 'active') IN ('active', 'ativo')
    );
$$;

CREATE OR REPLACE FUNCTION public.class_diary_student_note_can_read(
  p_school_id uuid,
  p_class_id uuid,
  p_teacher_id uuid,
  p_student_id uuid
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
    OR public.class_diary_student_note_can_manage(p_school_id, p_class_id, p_teacher_id, p_student_id);
$$;

CREATE OR REPLACE FUNCTION public.class_diary_validate_student_note_links(
  p_school_id uuid,
  p_class_id uuid,
  p_teacher_id uuid,
  p_student_id uuid,
  p_diary_entry_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    public.class_diary_student_note_can_manage(p_school_id, p_class_id, p_teacher_id, p_student_id)
    AND (
      p_diary_entry_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.class_diary_entries cde
        WHERE cde.id = p_diary_entry_id
          AND cde.school_id = p_school_id
          AND cde.class_id = p_class_id
          AND cde.teacher_id = p_teacher_id
          AND cde.status <> 'deleted'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.teacher_upsert_class_diary_student_note(
  p_note_id uuid DEFAULT NULL,
  p_school_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_diary_entry_id uuid DEFAULT NULL,
  p_note_date date DEFAULT CURRENT_DATE,
  p_note_text text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_note public.class_diary_student_notes%ROWTYPE;
  v_event_type text := 'created';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING ERRCODE = '42501';
  END IF;

  IF p_school_id IS NULL OR p_class_id IS NULL OR p_teacher_id IS NULL OR p_student_id IS NULL OR p_note_date IS NULL THEN
    RAISE EXCEPTION 'Escola, turma, professor, aluno e data sao obrigatorios.' USING ERRCODE = '22023';
  END IF;

  IF nullif(btrim(coalesce(p_note_text, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Observacao individual nao pode ficar vazia.' USING ERRCODE = '22023';
  END IF;

  IF NOT public.class_diary_validate_student_note_links(p_school_id, p_class_id, p_teacher_id, p_student_id, p_diary_entry_id) THEN
    RAISE EXCEPTION 'Professor sem permissao para observar este aluno ou vinculo invalido.' USING ERRCODE = '42501';
  END IF;

  IF p_note_id IS NOT NULL THEN
    SELECT * INTO v_note
    FROM public.class_diary_student_notes
    WHERE id = p_note_id
    FOR UPDATE;

    IF v_note.id IS NULL THEN
      RAISE EXCEPTION 'Observacao individual nao encontrada.' USING ERRCODE = '22023';
    END IF;

    IF v_note.status = 'deleted' OR v_note.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Observacao excluida nao pode ser editada.' USING ERRCODE = '42501';
    END IF;

    IF NOT public.class_diary_student_note_can_manage(v_note.school_id, v_note.class_id, v_note.teacher_id, v_note.student_id) THEN
      RAISE EXCEPTION 'Professor sem permissao para editar esta observacao.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.class_diary_student_notes
    SET diary_entry_id = p_diary_entry_id,
      note_date = p_note_date,
      note_text = btrim(p_note_text),
      updated_at = now()
    WHERE id = v_note.id
    RETURNING * INTO v_note;

    v_event_type := 'updated';
  ELSE
    INSERT INTO public.class_diary_student_notes (
      school_id,
      class_id,
      teacher_id,
      student_id,
      diary_entry_id,
      note_date,
      note_text,
      created_by
    )
    VALUES (
      p_school_id,
      p_class_id,
      p_teacher_id,
      p_student_id,
      p_diary_entry_id,
      p_note_date,
      btrim(p_note_text),
      auth.uid()
    )
    RETURNING * INTO v_note;
  END IF;

  INSERT INTO public.class_diary_student_note_events (student_note_id, event_type, actor_id, metadata)
  VALUES (
    v_note.id,
    v_event_type,
    auth.uid(),
    jsonb_build_object(
      'school_id', v_note.school_id,
      'class_id', v_note.class_id,
      'teacher_id', v_note.teacher_id,
      'student_id', v_note.student_id,
      'note_date', v_note.note_date,
      'diary_entry_id', v_note.diary_entry_id
    )
  );

  RETURN jsonb_build_object(
    'student_note_id', v_note.id,
    'status', v_note.status,
    'event_type', v_event_type
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_list_class_diary_student_notes(
  p_class_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  school_id uuid,
  class_id uuid,
  teacher_id uuid,
  student_id uuid,
  student_name text,
  diary_entry_id uuid,
  diary_entry_title text,
  note_date date,
  note_text text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    cdn.id,
    cdn.school_id,
    cdn.class_id,
    cdn.teacher_id,
    cdn.student_id,
    coalesce(st.nome, 'Aluno')::text AS student_name,
    cdn.diary_entry_id,
    cde.title AS diary_entry_title,
    cdn.note_date,
    cdn.note_text,
    cdn.status,
    cdn.created_at,
    cdn.updated_at
  FROM public.class_diary_student_notes cdn
  JOIN public.students st ON st.id = cdn.student_id
  LEFT JOIN public.class_diary_entries cde ON cde.id = cdn.diary_entry_id
  WHERE cdn.status <> 'deleted'
    AND (p_class_id IS NULL OR cdn.class_id = p_class_id)
    AND (p_student_id IS NULL OR cdn.student_id = p_student_id)
    AND (p_from IS NULL OR cdn.note_date >= p_from)
    AND (p_to IS NULL OR cdn.note_date <= p_to)
    AND public.class_diary_student_note_can_manage(cdn.school_id, cdn.class_id, cdn.teacher_id, cdn.student_id)
  ORDER BY cdn.note_date DESC, cdn.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_list_class_diary_student_notes(
  p_class_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
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
  student_id uuid,
  student_name text,
  diary_entry_id uuid,
  diary_entry_title text,
  note_date date,
  note_text text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    cdn.id,
    cdn.school_id,
    sc.nome::text AS school_name,
    cdn.class_id,
    cl.nome::text AS class_name,
    cdn.teacher_id,
    coalesce(p.display_name, 'Professor')::text AS teacher_name,
    cdn.student_id,
    coalesce(st.nome, 'Aluno')::text AS student_name,
    cdn.diary_entry_id,
    cde.title AS diary_entry_title,
    cdn.note_date,
    cdn.note_text,
    cdn.status,
    cdn.created_at,
    cdn.updated_at
  FROM public.class_diary_student_notes cdn
  JOIN public.schools sc ON sc.id = cdn.school_id
  JOIN public.classes cl ON cl.id = cdn.class_id
  JOIN public.students st ON st.id = cdn.student_id
  JOIN public.teachers t ON t.id = cdn.teacher_id
  LEFT JOIN public.profiles p ON p.id = t.profile_id
  LEFT JOIN public.class_diary_entries cde ON cde.id = cdn.diary_entry_id
  WHERE cdn.status <> 'deleted'
    AND (p_class_id IS NULL OR cdn.class_id = p_class_id)
    AND (p_student_id IS NULL OR cdn.student_id = p_student_id)
    AND (p_from IS NULL OR cdn.note_date >= p_from)
    AND (p_to IS NULL OR cdn.note_date <= p_to)
    AND (
      public.is_platform_admin()
      OR public.secretaria_can_manage_school(cdn.school_id)
    )
  ORDER BY cdn.note_date DESC, cdn.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_class_diary_period_summary(
  p_class_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH ctx AS (
    SELECT
      cl.id AS class_id,
      cl.school_id,
      t.id AS teacher_id,
      cl.nome::text AS class_name,
      sc.nome::text AS school_name
    FROM public.classes cl
    JOIN public.schools sc ON sc.id = cl.school_id
    JOIN public.teachers t ON t.school_id = cl.school_id AND t.profile_id = auth.uid() AND t.status = 'active'
    WHERE cl.id = p_class_id
      AND public.class_diary_teacher_can_manage(cl.school_id, cl.id, t.id)
    LIMIT 1
  ),
  diary AS (
    SELECT cde.*
    FROM public.class_diary_entries cde
    JOIN ctx ON ctx.class_id = cde.class_id AND ctx.teacher_id = cde.teacher_id
    WHERE cde.status <> 'deleted'
      AND cde.entry_date BETWEEN p_from AND p_to
  ),
  attendance AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE ar.status = 'present')::bigint AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::bigint AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::bigint AS justified
    FROM public.attendance_records ar
    JOIN ctx ON ctx.school_id = ar.school_id AND ctx.class_id = ar.class_id
    WHERE ar.attendance_date BETWEEN p_from AND p_to
  ),
  plans AS (
    SELECT tp.*
    FROM public.teacher_plans tp
    JOIN ctx ON ctx.school_id = tp.school_id AND ctx.class_id = tp.class_id AND ctx.teacher_id = tp.teacher_id
    WHERE tp.status <> 'archived'
      AND tp.plan_date BETWEEN p_from AND p_to
  ),
  published AS (
    SELECT cce.*
    FROM public.class_calendar_entries cce
    JOIN ctx ON ctx.school_id = cce.school_id AND ctx.class_id = cce.class_id AND ctx.teacher_id = cce.teacher_id
    WHERE cce.status = 'published'
      AND cce.entry_date BETWEEN p_from AND p_to
  ),
  links AS (
    SELECT count(*)::bigint AS total
    FROM public.class_diary_activity_links cdl
    JOIN diary ON diary.id = cdl.diary_entry_id
  ),
  notes AS (
    SELECT cdn.*, st.nome AS student_name
    FROM public.class_diary_student_notes cdn
    JOIN ctx ON ctx.school_id = cdn.school_id AND ctx.class_id = cdn.class_id AND ctx.teacher_id = cdn.teacher_id
    JOIN public.students st ON st.id = cdn.student_id
    WHERE cdn.status <> 'deleted'
      AND cdn.note_date BETWEEN p_from AND p_to
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM ctx) THEN
      jsonb_build_object('error', 'Professor sem permissao para consolidar esta turma.')
    ELSE
      jsonb_build_object(
        'class_id', (SELECT class_id FROM ctx),
        'school_id', (SELECT school_id FROM ctx),
        'teacher_id', (SELECT teacher_id FROM ctx),
        'class_name', (SELECT class_name FROM ctx),
        'school_name', (SELECT school_name FROM ctx),
        'from', p_from,
        'to', p_to,
        'registered_classes', (SELECT count(*) FROM diary),
        'attendance_total', coalesce((SELECT total FROM attendance), 0),
        'attendance_present', coalesce((SELECT present FROM attendance), 0),
        'attendance_absent', coalesce((SELECT absent FROM attendance), 0),
        'attendance_justified', coalesce((SELECT justified FROM attendance), 0),
        'planned_count', (SELECT count(*) FROM plans),
        'published_count', (SELECT count(*) FROM published),
        'activity_link_count', coalesce((SELECT total FROM links), 0),
        'individual_note_count', (SELECT count(*) FROM notes),
        'diary_entries', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'entry_date', entry_date,
          'title', title,
          'status', status,
          'taught_content', taught_content,
          'pedagogical_notes', pedagogical_notes
        ) ORDER BY entry_date DESC, updated_at DESC) FROM diary), '[]'::jsonb),
        'planned_items', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'plan_date', plan_date,
          'title', title,
          'resource_type', resource_type,
          'status', status
        ) ORDER BY plan_date ASC, created_at ASC) FROM plans), '[]'::jsonb),
        'published_items', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'entry_date', entry_date,
          'title', title,
          'entry_type', entry_type,
          'status', status
        ) ORDER BY entry_date ASC, created_at ASC) FROM published), '[]'::jsonb),
        'individual_notes', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'note_date', note_date,
          'student_id', student_id,
          'student_name', student_name,
          'note_text', note_text,
          'diary_entry_id', diary_entry_id
        ) ORDER BY note_date DESC, created_at DESC) FROM notes), '[]'::jsonb)
      )
    END;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_get_class_diary_period_summary(
  p_class_id uuid,
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH ctx AS (
    SELECT
      cl.id AS class_id,
      cl.school_id,
      cl.nome::text AS class_name,
      sc.nome::text AS school_name
    FROM public.classes cl
    JOIN public.schools sc ON sc.id = cl.school_id
    WHERE cl.id = p_class_id
      AND (
        public.is_platform_admin()
        OR public.secretaria_can_manage_school(cl.school_id)
      )
    LIMIT 1
  ),
  diary AS (
    SELECT cde.*
    FROM public.class_diary_entries cde
    JOIN ctx ON ctx.class_id = cde.class_id AND ctx.school_id = cde.school_id
    WHERE cde.status <> 'deleted'
      AND cde.entry_date BETWEEN p_from AND p_to
  ),
  attendance AS (
    SELECT
      count(*)::bigint AS total,
      count(*) FILTER (WHERE ar.status = 'present')::bigint AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::bigint AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::bigint AS justified
    FROM public.attendance_records ar
    JOIN ctx ON ctx.school_id = ar.school_id AND ctx.class_id = ar.class_id
    WHERE ar.attendance_date BETWEEN p_from AND p_to
  ),
  plans AS (
    SELECT tp.*
    FROM public.teacher_plans tp
    JOIN ctx ON ctx.school_id = tp.school_id AND ctx.class_id = tp.class_id
    WHERE tp.status <> 'archived'
      AND tp.plan_date BETWEEN p_from AND p_to
  ),
  published AS (
    SELECT cce.*
    FROM public.class_calendar_entries cce
    JOIN ctx ON ctx.school_id = cce.school_id AND ctx.class_id = cce.class_id
    WHERE cce.status = 'published'
      AND cce.entry_date BETWEEN p_from AND p_to
  ),
  links AS (
    SELECT count(*)::bigint AS total
    FROM public.class_diary_activity_links cdl
    JOIN diary ON diary.id = cdl.diary_entry_id
  ),
  notes AS (
    SELECT cdn.*, st.nome AS student_name
    FROM public.class_diary_student_notes cdn
    JOIN ctx ON ctx.school_id = cdn.school_id AND ctx.class_id = cdn.class_id
    JOIN public.students st ON st.id = cdn.student_id
    WHERE cdn.status <> 'deleted'
      AND cdn.note_date BETWEEN p_from AND p_to
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM ctx) THEN
      jsonb_build_object('error', 'Secretaria sem permissao para consolidar esta turma.')
    ELSE
      jsonb_build_object(
        'class_id', (SELECT class_id FROM ctx),
        'school_id', (SELECT school_id FROM ctx),
        'class_name', (SELECT class_name FROM ctx),
        'school_name', (SELECT school_name FROM ctx),
        'from', p_from,
        'to', p_to,
        'registered_classes', (SELECT count(*) FROM diary),
        'attendance_total', coalesce((SELECT total FROM attendance), 0),
        'attendance_present', coalesce((SELECT present FROM attendance), 0),
        'attendance_absent', coalesce((SELECT absent FROM attendance), 0),
        'attendance_justified', coalesce((SELECT justified FROM attendance), 0),
        'planned_count', (SELECT count(*) FROM plans),
        'published_count', (SELECT count(*) FROM published),
        'activity_link_count', coalesce((SELECT total FROM links), 0),
        'individual_note_count', (SELECT count(*) FROM notes),
        'diary_entries', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'entry_date', entry_date,
          'title', title,
          'status', status,
          'taught_content', taught_content,
          'pedagogical_notes', pedagogical_notes
        ) ORDER BY entry_date DESC, updated_at DESC) FROM diary), '[]'::jsonb),
        'planned_items', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'plan_date', plan_date,
          'title', title,
          'resource_type', resource_type,
          'status', status
        ) ORDER BY plan_date ASC, created_at ASC) FROM plans), '[]'::jsonb),
        'published_items', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'entry_date', entry_date,
          'title', title,
          'entry_type', entry_type,
          'status', status
        ) ORDER BY entry_date ASC, created_at ASC) FROM published), '[]'::jsonb),
        'individual_notes', coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id', id,
          'note_date', note_date,
          'student_id', student_id,
          'student_name', student_name,
          'note_text', note_text,
          'diary_entry_id', diary_entry_id
        ) ORDER BY note_date DESC, created_at DESC) FROM notes), '[]'::jsonb)
      )
    END;
$$;

REVOKE ALL ON public.class_diary_student_notes FROM PUBLIC;
REVOKE ALL ON public.class_diary_student_note_events FROM PUBLIC;
REVOKE ALL ON public.class_diary_student_notes FROM anon;
REVOKE ALL ON public.class_diary_student_note_events FROM anon;

GRANT SELECT, INSERT, UPDATE ON public.class_diary_student_notes TO authenticated;
GRANT SELECT, INSERT ON public.class_diary_student_note_events TO authenticated;

REVOKE ALL ON FUNCTION public.class_diary_student_note_can_manage(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.class_diary_student_note_can_read(uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.class_diary_validate_student_note_links(uuid, uuid, uuid, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_upsert_class_diary_student_note(uuid, uuid, uuid, uuid, uuid, uuid, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_list_class_diary_student_notes(uuid, uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_list_class_diary_student_notes(uuid, uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.teacher_get_class_diary_period_summary(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_get_class_diary_period_summary(uuid, date, date) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.class_diary_student_note_can_manage(uuid, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.class_diary_student_note_can_read(uuid, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.class_diary_validate_student_note_links(uuid, uuid, uuid, uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_upsert_class_diary_student_note(uuid, uuid, uuid, uuid, uuid, uuid, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_list_class_diary_student_notes(uuid, uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_list_class_diary_student_notes(uuid, uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.teacher_get_class_diary_period_summary(uuid, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_get_class_diary_period_summary(uuid, date, date) TO authenticated, service_role;

ALTER TABLE public.class_diary_student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_diary_student_note_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_diary_student_notes_select_authorized ON public.class_diary_student_notes;
CREATE POLICY class_diary_student_notes_select_authorized
ON public.class_diary_student_notes
FOR SELECT
TO authenticated
USING (
  status <> 'deleted'
  AND public.class_diary_student_note_can_read(school_id, class_id, teacher_id, student_id)
);

DROP POLICY IF EXISTS class_diary_student_notes_insert_teacher ON public.class_diary_student_notes;
CREATE POLICY class_diary_student_notes_insert_teacher
ON public.class_diary_student_notes
FOR INSERT
TO authenticated
WITH CHECK (
  status = 'active'
  AND created_by = auth.uid()
  AND public.class_diary_validate_student_note_links(school_id, class_id, teacher_id, student_id, diary_entry_id)
);

DROP POLICY IF EXISTS class_diary_student_notes_update_teacher ON public.class_diary_student_notes;
CREATE POLICY class_diary_student_notes_update_teacher
ON public.class_diary_student_notes
FOR UPDATE
TO authenticated
USING (
  public.class_diary_student_note_can_manage(school_id, class_id, teacher_id, student_id)
)
WITH CHECK (
  public.class_diary_validate_student_note_links(school_id, class_id, teacher_id, student_id, diary_entry_id)
);

DROP POLICY IF EXISTS class_diary_student_note_events_select_authorized ON public.class_diary_student_note_events;
CREATE POLICY class_diary_student_note_events_select_authorized
ON public.class_diary_student_note_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.class_diary_student_notes cdn
    WHERE cdn.id = student_note_id
      AND cdn.status <> 'deleted'
      AND public.class_diary_student_note_can_read(cdn.school_id, cdn.class_id, cdn.teacher_id, cdn.student_id)
  )
);

DROP POLICY IF EXISTS class_diary_student_note_events_insert_teacher ON public.class_diary_student_note_events;
CREATE POLICY class_diary_student_note_events_insert_teacher
ON public.class_diary_student_note_events
FOR INSERT
TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.class_diary_student_notes cdn
    WHERE cdn.id = student_note_id
      AND public.class_diary_student_note_can_manage(cdn.school_id, cdn.class_id, cdn.teacher_id, cdn.student_id)
  )
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('class_diary_student_notes', 'class_diary_student_note_events')
      AND (
        coalesce(qual, '') = 'true'
        OR coalesce(with_check, '') = 'true'
      )
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: existe policy USING(true) ou WITH CHECK(true) em observacoes individuais';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_privileges
    WHERE table_schema = 'public'
      AND table_name IN ('class_diary_student_notes', 'class_diary_student_note_events')
      AND grantee = 'anon'
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: anon possui privilegios em observacoes individuais';
  END IF;
END $$;

COMMIT;
