-- Student-owned weekly class schedule for Web/App Fundamental.

CREATE OR REPLACE FUNCTION public.student_personal_schedule_default_slots()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT jsonb_agg(
    jsonb_build_object(
      'slot', slot_number,
      'start_time', '',
      'end_time', '',
      'monday', '',
      'tuesday', '',
      'wednesday', '',
      'thursday', '',
      'friday', ''
    )
    ORDER BY slot_number
  )
  FROM generate_series(1, 6) AS slot_number;
$$;

CREATE OR REPLACE FUNCTION public.student_personal_schedule_is_valid(p_slots jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_item jsonb;
  v_slot integer;
  v_start text;
  v_end text;
  v_key text;
BEGIN
  IF jsonb_typeof(p_slots) <> 'array' OR jsonb_array_length(p_slots) <> 6 THEN
    RETURN false;
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_slots)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RETURN false;
    END IF;

    v_slot := NULLIF(v_item->>'slot', '')::integer;
    IF v_slot IS NULL OR v_slot < 1 OR v_slot > 6 THEN
      RETURN false;
    END IF;

    v_start := COALESCE(v_item->>'start_time', '');
    v_end := COALESCE(v_item->>'end_time', '');

    IF v_start <> '' AND v_start !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
      RETURN false;
    END IF;
    IF v_end <> '' AND v_end !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN
      RETURN false;
    END IF;
    IF v_start <> '' AND v_end <> '' AND v_end::time <= v_start::time THEN
      RETURN false;
    END IF;

    FOREACH v_key IN ARRAY ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    LOOP
      IF length(COALESCE(v_item->>v_key, '')) > 80 THEN
        RETURN false;
      END IF;
    END LOOP;
  END LOOP;

  RETURN (
    SELECT count(DISTINCT NULLIF(item->>'slot', '')::integer) = 6
    FROM jsonb_array_elements(p_slots) AS item
  );
EXCEPTION
  WHEN others THEN
    RETURN false;
END;
$$;

CREATE TABLE IF NOT EXISTS public.student_personal_schedules (
  student_id uuid PRIMARY KEY REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_year text,
  slots jsonb NOT NULL DEFAULT public.student_personal_schedule_default_slots(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  CONSTRAINT student_personal_schedules_slots_check CHECK (public.student_personal_schedule_is_valid(slots))
);

CREATE INDEX IF NOT EXISTS student_personal_schedules_school_class_idx
  ON public.student_personal_schedules (school_id, class_id);

ALTER TABLE public.student_personal_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_personal_schedules_student_select ON public.student_personal_schedules;
CREATE POLICY student_personal_schedules_student_select
ON public.student_personal_schedules
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.user_id = (SELECT auth.uid())
      AND s.school_id = school_id
      AND s.class_id = class_id
  )
);

DROP POLICY IF EXISTS student_personal_schedules_student_insert ON public.student_personal_schedules;
CREATE POLICY student_personal_schedules_student_insert
ON public.student_personal_schedules
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.user_id = (SELECT auth.uid())
      AND s.school_id = school_id
      AND s.class_id = class_id
  )
);

DROP POLICY IF EXISTS student_personal_schedules_student_update ON public.student_personal_schedules;
CREATE POLICY student_personal_schedules_student_update
ON public.student_personal_schedules
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.user_id = (SELECT auth.uid())
      AND s.school_id = school_id
      AND s.class_id = class_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = student_id
      AND s.user_id = (SELECT auth.uid())
      AND s.school_id = school_id
      AND s.class_id = class_id
  )
);

CREATE OR REPLACE FUNCTION public.student_personal_schedule_context()
RETURNS TABLE(student_id uuid, school_id uuid, class_id uuid, school_year text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    s.id,
    COALESCE(e.school_id, s.school_id) AS school_id,
    COALESCE(e.class_id, s.class_id) AS class_id,
    COALESCE(e.school_year, c.school_year, s.turma) AS school_year
  FROM public.students s
  LEFT JOIN public.enrollments e
    ON e.student_id = s.id
   AND lower(COALESCE(e.status, '')) IN ('active', 'ativo')
  LEFT JOIN public.classes c
    ON c.id = COALESCE(e.class_id, s.class_id)
  WHERE s.user_id = (SELECT auth.uid())
    AND lower(COALESCE(s.status, '')) IN ('active', 'ativo')
  ORDER BY e.created_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.student_get_personal_schedule()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_context record;
  v_schedule public.student_personal_schedules%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sessao do aluno obrigatoria.' USING errcode = '42501';
  END IF;

  SELECT * INTO v_context FROM public.student_personal_schedule_context();
  IF v_context.student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno autenticado nao encontrado.' USING errcode = '42501';
  END IF;

  SELECT * INTO v_schedule
  FROM public.student_personal_schedules
  WHERE student_id = v_context.student_id;

  RETURN jsonb_build_object(
    'student_id', v_context.student_id,
    'school_id', v_context.school_id,
    'class_id', v_context.class_id,
    'school_year', v_context.school_year,
    'slots', COALESCE(v_schedule.slots, public.student_personal_schedule_default_slots()),
    'exists', v_schedule.student_id IS NOT NULL,
    'updated_at', v_schedule.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_save_personal_schedule(p_slots jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_context record;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sessao do aluno obrigatoria.' USING errcode = '42501';
  END IF;

  IF NOT public.student_personal_schedule_is_valid(p_slots) THEN
    RAISE EXCEPTION 'Horario de aula invalido.' USING errcode = '22023';
  END IF;

  SELECT * INTO v_context FROM public.student_personal_schedule_context();
  IF v_context.student_id IS NULL OR v_context.school_id IS NULL OR v_context.class_id IS NULL THEN
    RAISE EXCEPTION 'Contexto escolar do aluno nao encontrado.' USING errcode = '42501';
  END IF;

  INSERT INTO public.student_personal_schedules (
    student_id, school_id, class_id, school_year, slots, updated_by
  )
  VALUES (
    v_context.student_id, v_context.school_id, v_context.class_id, v_context.school_year, p_slots, (SELECT auth.uid())
  )
  ON CONFLICT (student_id)
  DO UPDATE SET
    school_id = EXCLUDED.school_id,
    class_id = EXCLUDED.class_id,
    school_year = EXCLUDED.school_year,
    slots = EXCLUDED.slots,
    updated_at = now(),
    updated_by = (SELECT auth.uid());

  RETURN public.student_get_personal_schedule();
END;
$$;

REVOKE ALL ON public.student_personal_schedules FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_personal_schedules TO authenticated;

REVOKE ALL ON FUNCTION public.student_personal_schedule_default_slots() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_personal_schedule_is_valid(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_personal_schedule_context() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_personal_schedule() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_save_personal_schedule(jsonb) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.student_personal_schedule_default_slots() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_personal_schedule_is_valid(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_get_personal_schedule() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_save_personal_schedule(jsonb) TO authenticated, service_role;
