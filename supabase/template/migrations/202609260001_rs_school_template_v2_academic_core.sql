-- Academic Core V2 - licitacao coverage.
-- Evolves the canonical Secretaria/Professor/Gestao engines without replacing
-- enrollment, attendance, class diary or school calendar V1.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.academic_years (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  school_year text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_years_status_check CHECK (status IN ('active', 'draft', 'closed', 'archived')),
  CONSTRAINT academic_years_dates_check CHECK (end_date >= start_date),
  CONSTRAINT academic_years_year_not_blank CHECK (length(btrim(school_year)) > 0),
  CONSTRAINT academic_years_school_year_unique UNIQUE (school_id, school_year)
);

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id uuid NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  term_name text NOT NULL,
  term_order integer NOT NULL,
  term_type text NOT NULL DEFAULT 'bimestre',
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_terms_status_check CHECK (status IN ('active', 'draft', 'closed', 'archived')),
  CONSTRAINT academic_terms_type_check CHECK (term_type IN ('bimestre', 'trimestre', 'semestre', 'periodo')),
  CONSTRAINT academic_terms_order_check CHECK (term_order > 0),
  CONSTRAINT academic_terms_dates_check CHECK (end_date >= start_date),
  CONSTRAINT academic_terms_name_not_blank CHECK (length(btrim(term_name)) > 0),
  CONSTRAINT academic_terms_unique_order UNIQUE (academic_year_id, term_order)
);

CREATE TABLE IF NOT EXISTS public.school_day_calendar (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id uuid REFERENCES public.academic_years(id) ON DELETE SET NULL,
  day_date date NOT NULL,
  day_type text NOT NULL DEFAULT 'letivo',
  title text,
  description text,
  status text NOT NULL DEFAULT 'active',
  source_event_id uuid REFERENCES public.school_calendar_events(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT school_day_calendar_status_check CHECK (status IN ('active', 'archived')),
  CONSTRAINT school_day_calendar_type_check CHECK (day_type IN ('letivo', 'recesso', 'feriado', 'evento', 'planejamento', 'nao_letivo')),
  CONSTRAINT school_day_calendar_unique_day UNIQUE (school_id, day_date)
);

CREATE TABLE IF NOT EXISTS public.class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  component_name text NOT NULL,
  component_code text,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  workload_minutes_weekly integer,
  status text NOT NULL DEFAULT 'active',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_subjects_status_check CHECK (status IN ('active', 'inactive', 'archived')),
  CONSTRAINT class_subjects_name_not_blank CHECK (length(btrim(component_name)) > 0),
  CONSTRAINT class_subjects_workload_check CHECK (workload_minutes_weekly IS NULL OR workload_minutes_weekly > 0)
);

CREATE TABLE IF NOT EXISTS public.class_schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  class_subject_id uuid REFERENCES public.class_subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  weekday integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  valid_from date,
  valid_until date,
  status text NOT NULL DEFAULT 'active',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_schedule_slots_status_check CHECK (status IN ('active', 'inactive', 'archived')),
  CONSTRAINT class_schedule_slots_weekday_check CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT class_schedule_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT class_schedule_slots_validity_check CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from)
);

CREATE TABLE IF NOT EXISTS public.academic_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  import_type text NOT NULL DEFAULT 'enrollment_csv',
  file_name text,
  status text NOT NULL DEFAULT 'pending',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid DEFAULT auth.uid(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_import_batches_type_check CHECK (import_type IN ('enrollment_csv')),
  CONSTRAINT academic_import_batches_status_check CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed', 'archived')),
  CONSTRAINT academic_import_batches_summary_object_check CHECK (jsonb_typeof(summary) = 'object')
);

CREATE TABLE IF NOT EXISTS public.academic_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.academic_import_batches(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  raw_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  target_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  target_enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  movement_id uuid REFERENCES public.enrollment_movements(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academic_import_rows_status_check CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
  CONSTRAINT academic_import_rows_raw_object_check CHECK (jsonb_typeof(raw_data) = 'object'),
  CONSTRAINT academic_import_rows_unique_row UNIQUE (batch_id, row_number)
);

CREATE INDEX IF NOT EXISTS academic_years_school_status_idx
  ON public.academic_years (school_id, status, school_year);
CREATE INDEX IF NOT EXISTS academic_terms_school_dates_idx
  ON public.academic_terms (school_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS school_day_calendar_school_date_idx
  ON public.school_day_calendar (school_id, day_date);
CREATE INDEX IF NOT EXISTS class_subjects_class_status_idx
  ON public.class_subjects (class_id, status);
CREATE INDEX IF NOT EXISTS class_schedule_slots_class_weekday_idx
  ON public.class_schedule_slots (class_id, weekday, start_time);
CREATE INDEX IF NOT EXISTS academic_import_batches_school_created_idx
  ON public.academic_import_batches (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS academic_import_rows_batch_status_idx
  ON public.academic_import_rows (batch_id, status);

DROP TRIGGER IF EXISTS academic_years_touch_updated_at ON public.academic_years;
CREATE TRIGGER academic_years_touch_updated_at
  BEFORE UPDATE ON public.academic_years
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS academic_terms_touch_updated_at ON public.academic_terms;
CREATE TRIGGER academic_terms_touch_updated_at
  BEFORE UPDATE ON public.academic_terms
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS school_day_calendar_touch_updated_at ON public.school_day_calendar;
CREATE TRIGGER school_day_calendar_touch_updated_at
  BEFORE UPDATE ON public.school_day_calendar
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS class_subjects_touch_updated_at ON public.class_subjects;
CREATE TRIGGER class_subjects_touch_updated_at
  BEFORE UPDATE ON public.class_subjects
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS class_schedule_slots_touch_updated_at ON public.class_schedule_slots;
CREATE TRIGGER class_schedule_slots_touch_updated_at
  BEFORE UPDATE ON public.class_schedule_slots
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS academic_import_batches_touch_updated_at ON public.academic_import_batches;
CREATE TRIGGER academic_import_batches_touch_updated_at
  BEFORE UPDATE ON public.academic_import_batches
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS academic_import_rows_touch_updated_at ON public.academic_import_rows;
CREATE TRIGGER academic_import_rows_touch_updated_at
  BEFORE UPDATE ON public.academic_import_rows
  FOR EACH ROW EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE OR REPLACE FUNCTION public.academic_core_teacher_can_read_class(p_school_id uuid, p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teachers t
    JOIN public.class_teacher_memberships ctm ON ctm.teacher_id = t.id
    WHERE t.profile_id = auth.uid()
      AND t.school_id = p_school_id
      AND ctm.class_id = p_class_id
      AND ctm.status = 'active'
      AND ctm.started_at <= now()
      AND (ctm.ended_at IS NULL OR ctm.ended_at > now())
  );
$$;

CREATE OR REPLACE FUNCTION public.academic_core_can_read_class(p_school_id uuid, p_class_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    public.secretaria_can_manage_school(p_school_id)
    OR public.academic_core_teacher_can_read_class(p_school_id, p_class_id)
    OR EXISTS (
      SELECT 1
      FROM public.students s
      JOIN public.enrollments e ON e.student_id = s.id
      WHERE s.user_id = auth.uid()
        AND e.school_id = p_school_id
        AND e.class_id = p_class_id
        AND e.status = 'active'
        AND e.ended_at IS NULL
    )
    OR EXISTS (
      SELECT 1
      FROM public.guardians g
      JOIN public.student_guardian_links sgl ON sgl.guardian_id = g.id AND sgl.status = 'active'
      JOIN public.enrollments e ON e.student_id = sgl.student_id
      WHERE g.profile_id = auth.uid()
        AND e.school_id = p_school_id
        AND e.class_id = p_class_id
        AND e.status = 'active'
        AND e.ended_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.secretaria_list_academic_core(
  p_school_id uuid DEFAULT NULL,
  p_school_year text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_school_ids uuid[];
BEGIN
  SELECT array_agg(s.id ORDER BY s.nome)
    INTO v_school_ids
  FROM public.schools s
  WHERE (p_school_id IS NULL OR s.id = p_school_id)
    AND public.secretaria_can_manage_school(s.id);

  IF coalesce(array_length(v_school_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'academic_years', '[]'::jsonb,
      'academic_terms', '[]'::jsonb,
      'school_days', '[]'::jsonb,
      'class_subjects', '[]'::jsonb,
      'class_schedule_slots', '[]'::jsonb,
      'import_batches', '[]'::jsonb,
      'import_rows', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'academic_years', COALESCE((
      SELECT jsonb_agg(to_jsonb(ay) ORDER BY ay.school_year DESC, ay.start_date)
      FROM public.academic_years ay
      WHERE ay.school_id = ANY(v_school_ids)
        AND (p_school_year IS NULL OR ay.school_year = p_school_year)
    ), '[]'::jsonb),
    'academic_terms', COALESCE((
      SELECT jsonb_agg(to_jsonb(atm) ORDER BY atm.start_date, atm.term_order)
      FROM public.academic_terms atm
      JOIN public.academic_years ay ON ay.id = atm.academic_year_id
      WHERE atm.school_id = ANY(v_school_ids)
        AND (p_school_year IS NULL OR ay.school_year = p_school_year)
    ), '[]'::jsonb),
    'school_days', COALESCE((
      SELECT jsonb_agg(to_jsonb(sdc) ORDER BY sdc.day_date)
      FROM public.school_day_calendar sdc
      LEFT JOIN public.academic_years ay ON ay.id = sdc.academic_year_id
      WHERE sdc.school_id = ANY(v_school_ids)
        AND (p_school_year IS NULL OR ay.school_year = p_school_year)
    ), '[]'::jsonb),
    'class_subjects', COALESCE((
      SELECT jsonb_agg(to_jsonb(cs) ORDER BY cs.component_name)
      FROM public.class_subjects cs
      JOIN public.classes c ON c.id = cs.class_id
      WHERE cs.school_id = ANY(v_school_ids)
        AND (p_school_year IS NULL OR c.school_year = p_school_year)
    ), '[]'::jsonb),
    'class_schedule_slots', COALESCE((
      SELECT jsonb_agg(to_jsonb(slot) ORDER BY slot.weekday, slot.start_time)
      FROM public.class_schedule_slots slot
      JOIN public.classes c ON c.id = slot.class_id
      WHERE slot.school_id = ANY(v_school_ids)
        AND (p_school_year IS NULL OR c.school_year = p_school_year)
    ), '[]'::jsonb),
    'import_batches', COALESCE((
      SELECT jsonb_agg(to_jsonb(batch) ORDER BY batch.created_at DESC)
      FROM public.academic_import_batches batch
      WHERE batch.school_id = ANY(v_school_ids)
    ), '[]'::jsonb),
    'import_rows', COALESCE((
      SELECT jsonb_agg(to_jsonb(row_item) ORDER BY row_item.created_at DESC, row_item.row_number)
      FROM public.academic_import_rows row_item
      WHERE row_item.school_id = ANY(v_school_ids)
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_upsert_academic_year(
  p_school_id uuid,
  p_school_year text,
  p_start_date date,
  p_end_date date,
  p_status text DEFAULT 'active',
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_row public.academic_years%ROWTYPE;
BEGIN
  IF NOT public.secretaria_can_manage_school(p_school_id) THEN
    RAISE EXCEPTION 'Perfil sem permissao para configurar ano letivo.' USING errcode = '42501';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Data final deve ser maior ou igual a inicial.' USING errcode = '22023';
  END IF;

  INSERT INTO public.academic_years (id, school_id, school_year, start_date, end_date, status, created_by)
  VALUES (COALESCE(p_id, gen_random_uuid()), p_school_id, btrim(p_school_year), p_start_date, p_end_date, COALESCE(NULLIF(btrim(p_status), ''), 'active'), auth.uid())
  ON CONFLICT (school_id, school_year) DO UPDATE
    SET start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_upsert_academic_term(
  p_academic_year_id uuid,
  p_term_name text,
  p_term_order integer,
  p_start_date date,
  p_end_date date,
  p_term_type text DEFAULT 'bimestre',
  p_status text DEFAULT 'active',
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_year public.academic_years%ROWTYPE;
  v_row public.academic_terms%ROWTYPE;
BEGIN
  SELECT * INTO v_year FROM public.academic_years WHERE id = p_academic_year_id;
  IF v_year.id IS NULL THEN
    RAISE EXCEPTION 'Ano letivo nao encontrado.' USING errcode = '22023';
  END IF;
  IF NOT public.secretaria_can_manage_school(v_year.school_id) THEN
    RAISE EXCEPTION 'Perfil sem permissao para configurar periodo letivo.' USING errcode = '42501';
  END IF;
  IF p_start_date < v_year.start_date OR p_end_date > v_year.end_date OR p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Periodo fora dos limites do ano letivo.' USING errcode = '22023';
  END IF;

  INSERT INTO public.academic_terms (
    id, academic_year_id, school_id, term_name, term_order, term_type, start_date, end_date, status, created_by
  )
  VALUES (
    COALESCE(p_id, gen_random_uuid()), v_year.id, v_year.school_id, btrim(p_term_name), p_term_order,
    COALESCE(NULLIF(btrim(p_term_type), ''), 'bimestre'), p_start_date, p_end_date,
    COALESCE(NULLIF(btrim(p_status), ''), 'active'), auth.uid()
  )
  ON CONFLICT (academic_year_id, term_order) DO UPDATE
    SET term_name = EXCLUDED.term_name,
        term_type = EXCLUDED.term_type,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_upsert_school_day(
  p_school_id uuid,
  p_day_date date,
  p_day_type text,
  p_academic_year_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_row public.school_day_calendar%ROWTYPE;
BEGIN
  IF NOT public.secretaria_can_manage_school(p_school_id) THEN
    RAISE EXCEPTION 'Perfil sem permissao para configurar dia letivo.' USING errcode = '42501';
  END IF;

  INSERT INTO public.school_day_calendar (
    id, school_id, academic_year_id, day_date, day_type, title, description, status, created_by
  )
  VALUES (
    COALESCE(p_id, gen_random_uuid()), p_school_id, p_academic_year_id, p_day_date,
    COALESCE(NULLIF(btrim(p_day_type), ''), 'letivo'), NULLIF(btrim(p_title), ''),
    NULLIF(btrim(p_description), ''), COALESCE(NULLIF(btrim(p_status), ''), 'active'), auth.uid()
  )
  ON CONFLICT (school_id, day_date) DO UPDATE
    SET academic_year_id = EXCLUDED.academic_year_id,
        day_type = EXCLUDED.day_type,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        status = EXCLUDED.status
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_upsert_class_subject(
  p_school_id uuid,
  p_class_id uuid,
  p_component_name text,
  p_component_code text DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL,
  p_workload_minutes_weekly integer DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_class public.classes%ROWTYPE;
  v_row public.class_subjects%ROWTYPE;
BEGIN
  IF NOT public.secretaria_can_manage_school(p_school_id) THEN
    RAISE EXCEPTION 'Perfil sem permissao para configurar componente.' USING errcode = '42501';
  END IF;
  SELECT * INTO v_class FROM public.classes WHERE id = p_class_id AND school_id = p_school_id;
  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'Turma nao pertence a escola informada.' USING errcode = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.class_subjects (
      school_id, class_id, component_name, component_code, teacher_id, workload_minutes_weekly, status, created_by
    )
    VALUES (
      p_school_id, p_class_id, btrim(p_component_name), NULLIF(btrim(p_component_code), ''), p_teacher_id,
      p_workload_minutes_weekly, COALESCE(NULLIF(btrim(p_status), ''), 'active'), auth.uid()
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.class_subjects
      SET component_name = btrim(p_component_name),
          component_code = NULLIF(btrim(p_component_code), ''),
          teacher_id = p_teacher_id,
          workload_minutes_weekly = p_workload_minutes_weekly,
          status = COALESCE(NULLIF(btrim(p_status), ''), 'active')
    WHERE id = p_id
      AND school_id = p_school_id
    RETURNING * INTO v_row;
  END IF;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Componente nao encontrado para atualização.' USING errcode = '22023';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_upsert_class_schedule_slot(
  p_school_id uuid,
  p_class_id uuid,
  p_weekday integer,
  p_start_time time,
  p_end_time time,
  p_class_subject_id uuid DEFAULT NULL,
  p_teacher_id uuid DEFAULT NULL,
  p_room text DEFAULT NULL,
  p_valid_from date DEFAULT NULL,
  p_valid_until date DEFAULT NULL,
  p_status text DEFAULT 'active',
  p_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_class public.classes%ROWTYPE;
  v_row public.class_schedule_slots%ROWTYPE;
BEGIN
  IF NOT public.secretaria_can_manage_school(p_school_id) THEN
    RAISE EXCEPTION 'Perfil sem permissao para configurar horario.' USING errcode = '42501';
  END IF;
  SELECT * INTO v_class FROM public.classes WHERE id = p_class_id AND school_id = p_school_id;
  IF v_class.id IS NULL THEN
    RAISE EXCEPTION 'Turma nao pertence a escola informada.' USING errcode = '22023';
  END IF;

  IF p_class_subject_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.class_subjects cs
    WHERE cs.id = p_class_subject_id AND cs.school_id = p_school_id AND cs.class_id = p_class_id
  ) THEN
    RAISE EXCEPTION 'Componente nao pertence a turma informada.' USING errcode = '22023';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.class_schedule_slots (
      school_id, class_id, class_subject_id, teacher_id, weekday, start_time, end_time, room, valid_from, valid_until, status, created_by
    )
    VALUES (
      p_school_id, p_class_id, p_class_subject_id, p_teacher_id, p_weekday, p_start_time, p_end_time,
      NULLIF(btrim(p_room), ''), p_valid_from, p_valid_until, COALESCE(NULLIF(btrim(p_status), ''), 'active'), auth.uid()
    )
    RETURNING * INTO v_row;
  ELSE
    UPDATE public.class_schedule_slots
      SET class_subject_id = p_class_subject_id,
          teacher_id = p_teacher_id,
          weekday = p_weekday,
          start_time = p_start_time,
          end_time = p_end_time,
          room = NULLIF(btrim(p_room), ''),
          valid_from = p_valid_from,
          valid_until = p_valid_until,
          status = COALESCE(NULLIF(btrim(p_status), ''), 'active')
    WHERE id = p_id
      AND school_id = p_school_id
    RETURNING * INTO v_row;
  END IF;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Horario nao encontrado para atualização.' USING errcode = '22023';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_create_enrollment_import_batch(
  p_school_id uuid,
  p_file_name text,
  p_rows jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_batch_id uuid;
  v_row jsonb;
  v_row_number integer := 0;
  v_success integer := 0;
  v_failed integer := 0;
  v_result jsonb;
  v_row_id uuid;
BEGIN
  IF NOT public.secretaria_can_manage_school(p_school_id) THEN
    RAISE EXCEPTION 'Perfil sem permissao para importar matriculas.' USING errcode = '42501';
  END IF;
  IF jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Linhas CSV devem chegar como array JSON.' USING errcode = '22023';
  END IF;

  INSERT INTO public.academic_import_batches (school_id, file_name, status, summary, created_by)
  VALUES (p_school_id, NULLIF(btrim(p_file_name), ''), 'processing', jsonb_build_object('total', jsonb_array_length(p_rows)), auth.uid())
  RETURNING id INTO v_batch_id;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_row_number := v_row_number + 1;
    INSERT INTO public.academic_import_rows (batch_id, school_id, row_number, raw_data, status)
    VALUES (v_batch_id, p_school_id, v_row_number, v_row, 'pending')
    RETURNING id INTO v_row_id;

    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM public.classes c
        WHERE c.id = (v_row ->> 'class_id')::uuid
          AND c.school_id = p_school_id
          AND c.status = 'active'
      ) THEN
        RAISE EXCEPTION 'Turma ativa da escola nao encontrada.' USING errcode = '22023';
      END IF;

      v_result := public.secretaria_create_student_enrollment(
        v_row ->> 'nome',
        NULLIF(v_row ->> 'data_nascimento', '')::date,
        (v_row ->> 'class_id')::uuid,
        v_row ->> 'school_year',
        COALESCE(NULLIF(v_row ->> 'status', ''), 'active')
      );

      UPDATE public.academic_import_rows
        SET status = 'completed',
            target_student_id = (v_result ->> 'student_id')::uuid,
            target_enrollment_id = (v_result ->> 'enrollment_id')::uuid,
            movement_id = (v_result ->> 'movement_id')::uuid
      WHERE id = v_row_id;
      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.academic_import_rows
        SET status = 'failed',
            error_message = SQLERRM
      WHERE id = v_row_id;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  UPDATE public.academic_import_batches
    SET status = CASE
          WHEN v_failed = 0 THEN 'completed'
          WHEN v_success = 0 THEN 'failed'
          ELSE 'completed_with_errors'
        END,
        summary = jsonb_build_object('total', v_row_number, 'completed', v_success, 'failed', v_failed),
        processed_at = now()
  WHERE id = v_batch_id;

  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'total', v_row_number,
    'completed', v_success,
    'failed', v_failed,
    'status', CASE WHEN v_failed = 0 THEN 'completed' WHEN v_success = 0 THEN 'failed' ELSE 'completed_with_errors' END
  );
END;
$$;

REVOKE ALL ON public.academic_years FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academic_terms FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_day_calendar FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.class_subjects FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.class_schedule_slots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academic_import_batches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academic_import_rows FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.academic_years TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academic_terms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.school_day_calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_schedule_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academic_import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academic_import_rows TO authenticated;

REVOKE ALL ON FUNCTION public.academic_core_teacher_can_read_class(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.academic_core_can_read_class(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_list_academic_core(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_upsert_academic_year(uuid, text, date, date, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_upsert_academic_term(uuid, text, integer, date, date, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_upsert_school_day(uuid, date, text, uuid, text, text, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_upsert_class_subject(uuid, uuid, text, text, uuid, integer, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_upsert_class_schedule_slot(uuid, uuid, integer, time, time, uuid, uuid, text, date, date, text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.secretaria_create_enrollment_import_batch(uuid, text, jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.academic_core_teacher_can_read_class(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.academic_core_can_read_class(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_list_academic_core(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_upsert_academic_year(uuid, text, date, date, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_upsert_academic_term(uuid, text, integer, date, date, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_upsert_school_day(uuid, date, text, uuid, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_upsert_class_subject(uuid, uuid, text, text, uuid, integer, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_upsert_class_schedule_slot(uuid, uuid, integer, time, time, uuid, uuid, text, date, date, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.secretaria_create_enrollment_import_batch(uuid, text, jsonb) TO authenticated, service_role;

ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_day_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedule_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_import_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_years_secretaria_manage ON public.academic_years;
CREATE POLICY academic_years_secretaria_manage
ON public.academic_years
FOR ALL TO authenticated
USING (public.secretaria_can_manage_school(school_id))
WITH CHECK (public.secretaria_can_manage_school(school_id));

DROP POLICY IF EXISTS academic_terms_secretaria_manage ON public.academic_terms;
CREATE POLICY academic_terms_secretaria_manage
ON public.academic_terms
FOR ALL TO authenticated
USING (public.secretaria_can_manage_school(school_id))
WITH CHECK (public.secretaria_can_manage_school(school_id));

DROP POLICY IF EXISTS school_day_calendar_secretaria_manage ON public.school_day_calendar;
CREATE POLICY school_day_calendar_secretaria_manage
ON public.school_day_calendar
FOR ALL TO authenticated
USING (public.secretaria_can_manage_school(school_id))
WITH CHECK (public.secretaria_can_manage_school(school_id));

DROP POLICY IF EXISTS class_subjects_select_authorized ON public.class_subjects;
CREATE POLICY class_subjects_select_authorized
ON public.class_subjects
FOR SELECT TO authenticated
USING (public.academic_core_can_read_class(school_id, class_id));

DROP POLICY IF EXISTS class_subjects_secretaria_manage ON public.class_subjects;
CREATE POLICY class_subjects_secretaria_manage
ON public.class_subjects
FOR ALL TO authenticated
USING (public.secretaria_can_manage_school(school_id))
WITH CHECK (public.secretaria_can_manage_school(school_id));

DROP POLICY IF EXISTS class_schedule_slots_select_authorized ON public.class_schedule_slots;
CREATE POLICY class_schedule_slots_select_authorized
ON public.class_schedule_slots
FOR SELECT TO authenticated
USING (public.academic_core_can_read_class(school_id, class_id));

DROP POLICY IF EXISTS class_schedule_slots_secretaria_manage ON public.class_schedule_slots;
CREATE POLICY class_schedule_slots_secretaria_manage
ON public.class_schedule_slots
FOR ALL TO authenticated
USING (public.secretaria_can_manage_school(school_id))
WITH CHECK (public.secretaria_can_manage_school(school_id));

DROP POLICY IF EXISTS academic_import_batches_secretaria_manage ON public.academic_import_batches;
CREATE POLICY academic_import_batches_secretaria_manage
ON public.academic_import_batches
FOR ALL TO authenticated
USING (public.secretaria_can_manage_school(school_id))
WITH CHECK (public.secretaria_can_manage_school(school_id));

DROP POLICY IF EXISTS academic_import_rows_secretaria_manage ON public.academic_import_rows;
CREATE POLICY academic_import_rows_secretaria_manage
ON public.academic_import_rows
FOR ALL TO authenticated
USING (public.secretaria_can_manage_school(school_id))
WITH CHECK (public.secretaria_can_manage_school(school_id));
