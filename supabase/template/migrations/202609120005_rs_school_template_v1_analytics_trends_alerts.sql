BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.analytics_get_school_overview(uuid, date, date, text)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: analytics_get_school_overview nao existe';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.analytics_resolve_authorized_scope(
  p_school_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_school_id uuid := p_school_id;
  v_class_id uuid := p_class_id;
  v_student_id uuid := p_student_id;
  v_teacher_id uuid := public.analytics_current_teacher_id();
  v_student_school_id uuid;
  v_student_class_id uuid;
  v_class_school_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF v_student_id IS NOT NULL THEN
    SELECT s.school_id, coalesce(e.class_id, s.class_id)
      INTO v_student_school_id, v_student_class_id
    FROM public.students s
    LEFT JOIN LATERAL (
      SELECT e.class_id
      FROM public.enrollments e
      WHERE e.student_id = s.id
        AND e.status = 'active'
        AND e.enrolled_at <= now()
        AND (e.ended_at IS NULL OR e.ended_at > now())
      ORDER BY e.enrolled_at DESC
      LIMIT 1
    ) e ON true
    WHERE s.id = v_student_id
      AND coalesce(s.status, 'active') = 'active';

    IF v_student_school_id IS NULL THEN
      RAISE EXCEPTION 'STUDENT_NOT_FOUND';
    END IF;
    IF v_school_id IS NOT NULL AND v_school_id <> v_student_school_id THEN
      RAISE EXCEPTION 'SCOPE_MISMATCH';
    END IF;
    IF v_class_id IS NOT NULL AND v_class_id <> v_student_class_id THEN
      RAISE EXCEPTION 'SCOPE_MISMATCH';
    END IF;
    v_school_id := v_student_school_id;
    v_class_id := v_student_class_id;
  END IF;

  IF v_class_id IS NOT NULL THEN
    SELECT c.school_id INTO v_class_school_id
    FROM public.classes c
    WHERE c.id = v_class_id
      AND coalesce(c.status, 'active') = 'active';

    IF v_class_school_id IS NULL THEN
      RAISE EXCEPTION 'CLASS_NOT_FOUND';
    END IF;
    IF v_school_id IS NOT NULL AND v_school_id <> v_class_school_id THEN
      RAISE EXCEPTION 'SCOPE_MISMATCH';
    END IF;
    v_school_id := v_class_school_id;
  END IF;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'SCHOOL_REQUIRED';
  END IF;

  IF v_student_id IS NOT NULL THEN
    IF NOT (
      public.is_platform_admin()
      OR public.secretaria_can_manage_school(v_school_id)
      OR public.institutional_is_current_student(v_student_id)
      OR (v_teacher_id IS NOT NULL AND v_class_id IS NOT NULL AND public.institutional_teacher_can_manage_class(v_teacher_id, v_class_id, v_school_id))
    ) THEN
      RAISE EXCEPTION 'STUDENT_ANALYTICS_FORBIDDEN';
    END IF;
  ELSIF v_class_id IS NOT NULL THEN
    IF NOT (
      public.is_platform_admin()
      OR public.secretaria_can_manage_school(v_school_id)
      OR (v_teacher_id IS NOT NULL AND public.institutional_teacher_can_manage_class(v_teacher_id, v_class_id, v_school_id))
    ) THEN
      RAISE EXCEPTION 'CLASS_ANALYTICS_FORBIDDEN';
    END IF;
  ELSE
    IF NOT (public.is_platform_admin() OR public.secretaria_can_manage_school(v_school_id)) THEN
      RAISE EXCEPTION 'SCHOOL_ANALYTICS_FORBIDDEN';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'school_id', v_school_id,
    'class_id', v_class_id,
    'student_id', v_student_id,
    'teacher_id', v_teacher_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_scope_period_metrics(
  p_school_id uuid,
  p_class_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_from date := coalesce(p_date_from, current_date - 29);
  v_to date := coalesce(p_date_to, current_date);
  v_payload jsonb;
BEGIN
  IF v_from > v_to THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  WITH
  scoped_students AS (
    SELECT DISTINCT s.id AS student_id
    FROM public.students s
    LEFT JOIN public.enrollments e ON e.student_id = s.id AND e.status = 'active'
    WHERE s.school_id = p_school_id
      AND coalesce(s.status, 'active') = 'active'
      AND (p_class_id IS NULL OR e.class_id = p_class_id OR s.class_id = p_class_id)
      AND (p_student_id IS NULL OR s.id = p_student_id)
  ),
  attendance AS (
    SELECT
      count(*)::integer AS total_records,
      count(*) FILTER (WHERE ar.status = 'present')::integer AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::integer AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::integer AS justified,
      CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE ar.status = 'present')::numeric / count(*)) * 100, 2) ELSE 0 END AS attendance_rate
    FROM public.attendance_records ar
    WHERE ar.school_id = p_school_id
      AND ar.attendance_date BETWEEN v_from AND v_to
      AND (p_class_id IS NULL OR ar.class_id = p_class_id)
      AND (p_student_id IS NULL OR ar.student_id = p_student_id)
  ),
  assignments AS (
    SELECT aa.*
    FROM public.assessment_assignments aa
    WHERE aa.school_id = p_school_id
      AND aa.status = 'published'
      AND coalesce(aa.available_from, aa.created_at)::date <= v_to
      AND coalesce(aa.available_until, v_to::timestamptz)::date >= v_from
      AND (
        p_class_id IS NULL
        OR aa.class_id = p_class_id
        OR (aa.student_id IS NOT NULL AND aa.student_id IN (SELECT student_id FROM scoped_students))
      )
      AND (
        p_student_id IS NULL
        OR aa.student_id = p_student_id
        OR (aa.target_type = 'class' AND aa.class_id IN (SELECT e.class_id FROM public.enrollments e WHERE e.student_id = p_student_id AND e.status = 'active'))
      )
  ),
  results AS (
    SELECT ar.*
    FROM public.assessment_results ar
    JOIN assignments aa ON aa.id = ar.assignment_id
    WHERE ar.school_id = p_school_id
      AND ar.finalized_at::date BETWEEN v_from AND v_to
      AND (p_student_id IS NULL OR ar.student_id = p_student_id)
      AND (p_class_id IS NULL OR ar.student_id IN (SELECT student_id FROM scoped_students))
  ),
  assessment AS (
    SELECT
      count(distinct aa.id)::integer AS assignments,
      coalesce(sum(CASE WHEN p_student_id IS NULL THEN public.analytics_assigned_student_count(aa.id, NULL) ELSE 1 END), 0)::integer AS assigned_students,
      count(distinct r.student_id)::integer AS completed_students,
      CASE WHEN coalesce(sum(CASE WHEN p_student_id IS NULL THEN public.analytics_assigned_student_count(aa.id, NULL) ELSE 1 END), 0) > 0
        THEN round((count(distinct r.student_id)::numeric / sum(CASE WHEN p_student_id IS NULL THEN public.analytics_assigned_student_count(aa.id, NULL) ELSE 1 END)) * 100, 2)
        ELSE 0
      END AS participation_percentage,
      coalesce(round(avg(r.score_percentage), 2), 0) AS average_percentage
    FROM assignments aa
    LEFT JOIN results r ON r.assignment_id = aa.id
  ),
  bncc AS (
    SELECT
      count(distinct nullif(btrim(qi.bncc_skill), ''))::integer AS skills,
      count(distinct aq.question_id)::integer AS questions,
      count(resp.id)::integer AS responses,
      count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::integer AS correct,
      CASE WHEN count(resp.id) > 0 THEN round((count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::numeric / count(resp.id)) * 100, 2) ELSE 0 END AS percentage
    FROM results r
    JOIN public.assessment_responses resp ON resp.attempt_id = r.attempt_id
    JOIN public.assessment_questions aq ON aq.assessment_id = r.assessment_id AND aq.question_id = resp.question_id
    JOIN public.question_items qi ON qi.id = aq.question_id
    WHERE nullif(btrim(coalesce(qi.bncc_skill, '')), '') IS NOT NULL
  ),
  diary AS (
    SELECT count(*)::integer AS entries
    FROM public.class_diary_entries cde
    WHERE cde.school_id = p_school_id
      AND cde.deleted_at IS NULL
      AND cde.entry_date BETWEEN v_from AND v_to
      AND (p_class_id IS NULL OR cde.class_id = p_class_id)
  )
  SELECT jsonb_build_object(
    'attendance_rate', (SELECT attendance_rate FROM attendance),
    'attendance_records', (SELECT total_records FROM attendance),
    'assessment_average', (SELECT average_percentage FROM assessment),
    'assessment_participation', (SELECT participation_percentage FROM assessment),
    'assessment_assignments', (SELECT assignments FROM assessment),
    'assessment_completed', (SELECT completed_students FROM assessment),
    'bncc_percentage', (SELECT percentage FROM bncc),
    'bncc_skills', (SELECT skills FROM bncc),
    'diary_entries_count', (SELECT entries FROM diary)
  ) INTO v_payload;

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_get_trend_series(
  p_school_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_metric text DEFAULT 'attendance_rate',
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_granularity text DEFAULT 'week',
  p_bncc_skill text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_scope jsonb := public.analytics_resolve_authorized_scope(p_school_id, p_class_id, p_student_id);
  v_school_id uuid := (v_scope->>'school_id')::uuid;
  v_class_id uuid := nullif(v_scope->>'class_id', '')::uuid;
  v_student_id uuid := nullif(v_scope->>'student_id', '')::uuid;
  v_from date := coalesce(p_date_from, current_date - 83);
  v_to date := coalesce(p_date_to, current_date);
  v_metric text := coalesce(nullif(btrim(p_metric), ''), 'attendance_rate');
  v_granularity text := coalesce(nullif(btrim(p_granularity), ''), 'week');
  v_step interval;
  v_points jsonb := '[]'::jsonb;
  v_values numeric[] := '{}';
  v_point_count integer := 0;
  v_previous numeric;
  v_current numeric;
BEGIN
  IF v_from > v_to THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;
  IF v_metric NOT IN ('attendance_rate', 'assessment_average', 'assessment_participation', 'diary_entries_count', 'bncc_skill_percentage') THEN
    RAISE EXCEPTION 'INVALID_METRIC';
  END IF;
  IF v_granularity NOT IN ('day', 'week', 'month') THEN
    RAISE EXCEPTION 'INVALID_GRANULARITY';
  END IF;
  v_step := CASE v_granularity WHEN 'day' THEN interval '1 day' WHEN 'week' THEN interval '1 week' ELSE interval '1 month' END;

  IF v_metric = 'attendance_rate' THEN
    WITH buckets AS (
      SELECT generate_series(date_trunc(v_granularity, v_from)::date, date_trunc(v_granularity, v_to)::date, v_step)::date AS bucket_start
    ),
    agg AS (
      SELECT date_trunc(v_granularity, ar.attendance_date)::date AS bucket_start,
        count(*)::integer AS sample_count,
        CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE ar.status = 'present')::numeric / count(*)) * 100, 2) ELSE 0 END AS value
      FROM public.attendance_records ar
      WHERE ar.school_id = v_school_id
        AND ar.attendance_date BETWEEN v_from AND v_to
        AND (v_class_id IS NULL OR ar.class_id = v_class_id)
        AND (v_student_id IS NULL OR ar.student_id = v_student_id)
      GROUP BY 1
    ),
    points AS (
      SELECT b.bucket_start, coalesce(a.value, 0) AS value, coalesce(a.sample_count, 0) AS sample_count
      FROM buckets b LEFT JOIN agg a USING (bucket_start)
      ORDER BY b.bucket_start
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object('period', bucket_start, 'value', value, 'sample_count', sample_count)), '[]'::jsonb),
      coalesce(array_agg(value ORDER BY bucket_start) FILTER (WHERE sample_count > 0), '{}'),
      count(*) FILTER (WHERE sample_count > 0)
    INTO v_points, v_values, v_point_count
    FROM points;
  ELSIF v_metric IN ('assessment_average', 'assessment_participation') THEN
    WITH buckets AS (
      SELECT generate_series(date_trunc(v_granularity, v_from)::date, date_trunc(v_granularity, v_to)::date, v_step)::date AS bucket_start
    ),
    scoped_students AS (
      SELECT DISTINCT s.id AS student_id
      FROM public.students s
      LEFT JOIN public.enrollments e ON e.student_id = s.id AND e.status = 'active'
      WHERE s.school_id = v_school_id
        AND coalesce(s.status, 'active') = 'active'
        AND (v_class_id IS NULL OR e.class_id = v_class_id OR s.class_id = v_class_id)
        AND (v_student_id IS NULL OR s.id = v_student_id)
    ),
    assignments AS (
      SELECT aa.*, date_trunc(v_granularity, coalesce(aa.available_from, aa.created_at))::date AS bucket_start
      FROM public.assessment_assignments aa
      WHERE aa.school_id = v_school_id
        AND aa.status = 'published'
        AND coalesce(aa.available_from, aa.created_at)::date BETWEEN v_from AND v_to
        AND (v_class_id IS NULL OR aa.class_id = v_class_id OR aa.student_id IN (SELECT student_id FROM scoped_students))
        AND (v_student_id IS NULL OR aa.student_id = v_student_id OR (aa.target_type = 'class' AND aa.class_id IN (SELECT e.class_id FROM public.enrollments e WHERE e.student_id = v_student_id AND e.status = 'active')))
    ),
    results AS (
      SELECT ar.*, date_trunc(v_granularity, ar.finalized_at)::date AS bucket_start
      FROM public.assessment_results ar
      JOIN assignments aa ON aa.id = ar.assignment_id
      WHERE ar.finalized_at::date BETWEEN v_from AND v_to
        AND (v_student_id IS NULL OR ar.student_id = v_student_id)
        AND (v_class_id IS NULL OR ar.student_id IN (SELECT student_id FROM scoped_students))
    ),
    agg AS (
      SELECT b.bucket_start,
        count(distinct r.student_id)::integer AS sample_count,
        CASE
          WHEN v_metric = 'assessment_average' THEN coalesce(round(avg(r.score_percentage), 2), 0)
          WHEN coalesce(sum(CASE WHEN v_student_id IS NULL THEN public.analytics_assigned_student_count(a.id, NULL) ELSE 1 END), 0) > 0
            THEN round((count(distinct r.student_id)::numeric / sum(CASE WHEN v_student_id IS NULL THEN public.analytics_assigned_student_count(a.id, NULL) ELSE 1 END)) * 100, 2)
          ELSE 0
        END AS value
      FROM buckets b
      LEFT JOIN assignments a ON a.bucket_start = b.bucket_start
      LEFT JOIN results r ON r.bucket_start = b.bucket_start
      GROUP BY b.bucket_start
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object('period', bucket_start, 'value', value, 'sample_count', sample_count) ORDER BY bucket_start), '[]'::jsonb),
      coalesce(array_agg(value ORDER BY bucket_start) FILTER (WHERE sample_count > 0), '{}'),
      count(*) FILTER (WHERE sample_count > 0)
    INTO v_points, v_values, v_point_count
    FROM agg;
  ELSIF v_metric = 'diary_entries_count' THEN
    WITH buckets AS (
      SELECT generate_series(date_trunc(v_granularity, v_from)::date, date_trunc(v_granularity, v_to)::date, v_step)::date AS bucket_start
    ),
    agg AS (
      SELECT date_trunc(v_granularity, cde.entry_date)::date AS bucket_start, count(*)::integer AS value, count(*)::integer AS sample_count
      FROM public.class_diary_entries cde
      WHERE cde.school_id = v_school_id
        AND cde.deleted_at IS NULL
        AND cde.entry_date BETWEEN v_from AND v_to
        AND (v_class_id IS NULL OR cde.class_id = v_class_id)
      GROUP BY 1
    ),
    points AS (
      SELECT b.bucket_start, coalesce(a.value, 0)::numeric AS value, coalesce(a.sample_count, 0) AS sample_count
      FROM buckets b LEFT JOIN agg a USING (bucket_start)
      ORDER BY b.bucket_start
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object('period', bucket_start, 'value', value, 'sample_count', sample_count)), '[]'::jsonb),
      coalesce(array_agg(value ORDER BY bucket_start) FILTER (WHERE sample_count > 0), '{}'),
      count(*) FILTER (WHERE sample_count > 0)
    INTO v_points, v_values, v_point_count
    FROM points;
  ELSE
    WITH buckets AS (
      SELECT generate_series(date_trunc(v_granularity, v_from)::date, date_trunc(v_granularity, v_to)::date, v_step)::date AS bucket_start
    ),
    scoped_students AS (
      SELECT DISTINCT s.id AS student_id
      FROM public.students s
      LEFT JOIN public.enrollments e ON e.student_id = s.id AND e.status = 'active'
      WHERE s.school_id = v_school_id
        AND coalesce(s.status, 'active') = 'active'
        AND (v_class_id IS NULL OR e.class_id = v_class_id OR s.class_id = v_class_id)
        AND (v_student_id IS NULL OR s.id = v_student_id)
    ),
    agg AS (
      SELECT date_trunc(v_granularity, res.finalized_at)::date AS bucket_start,
        count(resp.id)::integer AS sample_count,
        CASE WHEN count(resp.id) > 0 THEN round((count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::numeric / count(resp.id)) * 100, 2) ELSE 0 END AS value
      FROM public.assessment_results res
      JOIN public.assessment_responses resp ON resp.attempt_id = res.attempt_id
      JOIN public.assessment_questions aq ON aq.assessment_id = res.assessment_id AND aq.question_id = resp.question_id
      JOIN public.question_items qi ON qi.id = aq.question_id
      WHERE res.school_id = v_school_id
        AND res.finalized_at::date BETWEEN v_from AND v_to
        AND (v_student_id IS NULL OR res.student_id = v_student_id)
        AND (v_class_id IS NULL OR res.student_id IN (SELECT student_id FROM scoped_students))
        AND (p_bncc_skill IS NULL OR qi.bncc_skill = p_bncc_skill)
        AND nullif(btrim(coalesce(qi.bncc_skill, '')), '') IS NOT NULL
      GROUP BY 1
    ),
    points AS (
      SELECT b.bucket_start, coalesce(a.value, 0) AS value, coalesce(a.sample_count, 0) AS sample_count
      FROM buckets b LEFT JOIN agg a USING (bucket_start)
      ORDER BY b.bucket_start
    )
    SELECT coalesce(jsonb_agg(jsonb_build_object('period', bucket_start, 'value', value, 'sample_count', sample_count)), '[]'::jsonb),
      coalesce(array_agg(value ORDER BY bucket_start) FILTER (WHERE sample_count > 0), '{}'),
      count(*) FILTER (WHERE sample_count > 0)
    INTO v_points, v_values, v_point_count
    FROM points;
  END IF;

  IF array_length(v_values, 1) >= 2 THEN
    v_current := v_values[array_length(v_values, 1)];
    v_previous := v_values[array_length(v_values, 1) - 1];
  END IF;

  RETURN jsonb_build_object(
    'scope', v_scope,
    'metric', v_metric,
    'granularity', v_granularity,
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'points', v_points,
    'point_count', v_point_count,
    'has_trend', v_point_count >= 2,
    'current_value', v_current,
    'previous_value', v_previous,
    'delta_absolute', CASE WHEN v_point_count >= 2 THEN round(v_current - v_previous, 2) ELSE NULL END,
    'delta_percentage', CASE WHEN v_point_count >= 2 AND v_previous <> 0 THEN round(((v_current - v_previous) / abs(v_previous)) * 100, 2) ELSE NULL END,
    'message', CASE WHEN v_point_count = 0 THEN 'Sem dados no período.' WHEN v_point_count = 1 THEN 'Dados insuficientes para comparar períodos.' ELSE 'Tendência calculada com dados reais.' END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_get_period_comparison(
  p_school_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_student_id uuid DEFAULT NULL,
  p_current_from date DEFAULT NULL,
  p_current_to date DEFAULT NULL,
  p_previous_from date DEFAULT NULL,
  p_previous_to date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_scope jsonb := public.analytics_resolve_authorized_scope(p_school_id, p_class_id, p_student_id);
  v_school_id uuid := (v_scope->>'school_id')::uuid;
  v_class_id uuid := nullif(v_scope->>'class_id', '')::uuid;
  v_student_id uuid := nullif(v_scope->>'student_id', '')::uuid;
  v_current_to date := coalesce(p_current_to, current_date);
  v_current_from date := coalesce(p_current_from, v_current_to - 29);
  v_previous_to date := coalesce(p_previous_to, v_current_from - 1);
  v_previous_from date := coalesce(p_previous_from, v_previous_to - (v_current_to - v_current_from));
  v_current jsonb;
  v_previous jsonb;
BEGIN
  v_current := public.analytics_scope_period_metrics(v_school_id, v_class_id, v_student_id, v_current_from, v_current_to);
  v_previous := public.analytics_scope_period_metrics(v_school_id, v_class_id, v_student_id, v_previous_from, v_previous_to);

  RETURN jsonb_build_object(
    'scope', v_scope,
    'current_period', jsonb_build_object('date_from', v_current_from, 'date_to', v_current_to),
    'previous_period', jsonb_build_object('date_from', v_previous_from, 'date_to', v_previous_to),
    'metrics', (
      SELECT jsonb_object_agg(metric, jsonb_build_object(
        'current', (v_current->>metric)::numeric,
        'previous', (v_previous->>metric)::numeric,
        'delta_absolute', round(((v_current->>metric)::numeric - (v_previous->>metric)::numeric), 2),
        'delta_percentage', CASE WHEN (v_previous->>metric)::numeric <> 0 THEN round((((v_current->>metric)::numeric - (v_previous->>metric)::numeric) / abs((v_previous->>metric)::numeric)) * 100, 2) ELSE NULL END
      ))
      FROM (VALUES
        ('attendance_rate'),
        ('assessment_participation'),
        ('assessment_average'),
        ('bncc_percentage'),
        ('diary_entries_count')
      ) m(metric)
    ),
    'message', 'Comparativo objetivo entre períodos, sem inferência automática.'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_get_class_comparison(
  p_school_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_metric text DEFAULT 'attendance_rate'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_from date := coalesce(p_date_from, current_date - 29);
  v_to date := coalesce(p_date_to, current_date);
  v_metric text := coalesce(nullif(btrim(p_metric), ''), 'attendance_rate');
  v_teacher_id uuid := public.analytics_current_teacher_id();
  v_can_school boolean := public.is_platform_admin() OR public.secretaria_can_manage_school(p_school_id);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_school_id IS NULL THEN
    RAISE EXCEPTION 'SCHOOL_REQUIRED';
  END IF;
  IF v_metric NOT IN ('attendance_rate', 'assessment_average', 'assessment_participation', 'diary_entries_count', 'bncc_percentage') THEN
    RAISE EXCEPTION 'INVALID_METRIC';
  END IF;
  IF NOT v_can_school AND v_teacher_id IS NULL THEN
    RAISE EXCEPTION 'CLASS_COMPARISON_FORBIDDEN';
  END IF;

  RETURN jsonb_build_object(
    'school_id', p_school_id,
    'metric', v_metric,
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'school_comparison', 'FUTURE_AFTER_NETWORK_MODEL',
    'classes', coalesce((
      SELECT jsonb_agg(payload ORDER BY (payload->>'value')::numeric ASC, payload->>'class_name')
      FROM (
        SELECT jsonb_build_object(
          'class_id', c.id,
          'class_name', c.nome,
          'value', (metrics->>v_metric)::numeric,
          'attendance_rate', (metrics->>'attendance_rate')::numeric,
          'assessment_average', (metrics->>'assessment_average')::numeric,
          'assessment_participation', (metrics->>'assessment_participation')::numeric,
          'diary_entries_count', (metrics->>'diary_entries_count')::numeric,
          'bncc_percentage', (metrics->>'bncc_percentage')::numeric
        ) AS payload
        FROM public.classes c
        CROSS JOIN LATERAL public.analytics_scope_period_metrics(p_school_id, c.id, NULL, v_from, v_to) metrics
        WHERE c.school_id = p_school_id
          AND coalesce(c.status, 'active') = 'active'
          AND (v_can_school OR public.institutional_teacher_can_manage_class(v_teacher_id, c.id, p_school_id))
      ) rows
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_get_alerts(
  p_school_id uuid DEFAULT NULL,
  p_class_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_attendance_threshold numeric DEFAULT 80,
  p_assessment_participation_threshold numeric DEFAULT 70,
  p_assessment_average_threshold numeric DEFAULT 60,
  p_bncc_threshold numeric DEFAULT 60,
  p_require_diary boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_scope jsonb := public.analytics_resolve_authorized_scope(p_school_id, p_class_id, NULL);
  v_school_id uuid := (v_scope->>'school_id')::uuid;
  v_class_id uuid := nullif(v_scope->>'class_id', '')::uuid;
  v_from date := coalesce(p_date_from, current_date - 29);
  v_to date := coalesce(p_date_to, current_date);
  v_alerts jsonb := '[]'::jsonb;
BEGIN
  WITH eligible_classes AS (
    SELECT c.*
    FROM public.classes c
    WHERE c.school_id = v_school_id
      AND coalesce(c.status, 'active') = 'active'
      AND (v_class_id IS NULL OR c.id = v_class_id)
  ),
  class_metrics AS (
    SELECT c.id, c.nome, public.analytics_scope_period_metrics(v_school_id, c.id, NULL, v_from, v_to) AS metrics
    FROM eligible_classes c
  ),
  class_alerts AS (
    SELECT jsonb_build_object('level', 'ATENÇÃO', 'scope', 'class', 'class_id', id, 'class_name', nome, 'type', 'ATTENDANCE_BELOW_THRESHOLD', 'message', nome || ' — frequência abaixo do limiar definido', 'value', (metrics->>'attendance_rate')::numeric, 'threshold', p_attendance_threshold) AS alert
    FROM class_metrics WHERE (metrics->>'attendance_records')::numeric > 0 AND (metrics->>'attendance_rate')::numeric < p_attendance_threshold
    UNION ALL
    SELECT jsonb_build_object('level', 'ATENÇÃO', 'scope', 'class', 'class_id', id, 'class_name', nome, 'type', 'ASSESSMENT_PARTICIPATION_BELOW_THRESHOLD', 'message', nome || ' — participação Avalia+ abaixo do limiar definido', 'value', (metrics->>'assessment_participation')::numeric, 'threshold', p_assessment_participation_threshold)
    FROM class_metrics WHERE (metrics->>'assessment_assignments')::numeric > 0 AND (metrics->>'assessment_participation')::numeric < p_assessment_participation_threshold
    UNION ALL
    SELECT jsonb_build_object('level', 'ATENÇÃO', 'scope', 'class', 'class_id', id, 'class_name', nome, 'type', 'ASSESSMENT_AVERAGE_BELOW_THRESHOLD', 'message', nome || ' — média Avalia+ abaixo do limiar definido', 'value', (metrics->>'assessment_average')::numeric, 'threshold', p_assessment_average_threshold)
    FROM class_metrics WHERE (metrics->>'assessment_completed')::numeric > 0 AND (metrics->>'assessment_average')::numeric < p_assessment_average_threshold
    UNION ALL
    SELECT jsonb_build_object('level', 'ATENÇÃO', 'scope', 'class', 'class_id', id, 'class_name', nome, 'type', 'BNCC_BELOW_THRESHOLD', 'message', nome || ' — habilidade BNCC abaixo do limiar definido', 'value', (metrics->>'bncc_percentage')::numeric, 'threshold', p_bncc_threshold)
    FROM class_metrics WHERE (metrics->>'bncc_skills')::numeric > 0 AND (metrics->>'bncc_percentage')::numeric < p_bncc_threshold
    UNION ALL
    SELECT jsonb_build_object('level', 'ATENÇÃO', 'scope', 'class', 'class_id', id, 'class_name', nome, 'type', 'DIARY_WITHOUT_RECORDS', 'message', nome || ' — Diário sem registro no período selecionado', 'value', 0, 'threshold', 1)
    FROM class_metrics WHERE p_require_diary IS TRUE AND (metrics->>'diary_entries_count')::numeric = 0
  ),
  scoped_students AS (
    SELECT DISTINCT s.id, s.nome, c.id AS class_id, c.nome AS class_name
    FROM public.students s
    JOIN public.enrollments e ON e.student_id = s.id AND e.status = 'active'
    JOIN eligible_classes c ON c.id = e.class_id
    WHERE coalesce(s.status, 'active') = 'active'
  ),
  student_attendance AS (
    SELECT st.*,
      count(ar.id)::integer AS records,
      CASE WHEN count(ar.id) > 0 THEN round((count(ar.id) FILTER (WHERE ar.status = 'present')::numeric / count(ar.id)) * 100, 2) ELSE 0 END AS attendance_rate
    FROM scoped_students st
    LEFT JOIN public.attendance_records ar ON ar.student_id = st.id AND ar.attendance_date BETWEEN v_from AND v_to
    GROUP BY st.id, st.nome, st.class_id, st.class_name
  ),
  student_alerts AS (
    SELECT jsonb_build_object('level', 'ATENÇÃO', 'scope', 'student', 'student_id', id, 'student_name', nome, 'class_id', class_id, 'class_name', class_name, 'type', 'STUDENT_ATTENDANCE_BELOW_THRESHOLD', 'message', nome || ' — frequência abaixo de ' || p_attendance_threshold || '%', 'value', attendance_rate, 'threshold', p_attendance_threshold) AS alert
    FROM student_attendance
    WHERE records > 0 AND attendance_rate < p_attendance_threshold
  )
  SELECT coalesce(jsonb_agg(alert), '[]'::jsonb)
  INTO v_alerts
  FROM (
    SELECT alert FROM class_alerts
    UNION ALL
    SELECT alert FROM student_alerts
  ) all_alerts;

  RETURN jsonb_build_object(
    'scope', v_scope,
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'thresholds', jsonb_build_object(
      'attendance', p_attendance_threshold,
      'assessment_participation', p_assessment_participation_threshold,
      'assessment_average', p_assessment_average_threshold,
      'bncc', p_bncc_threshold,
      'diary_required', p_require_diary
    ),
    'alerts', v_alerts,
    'alert_count', jsonb_array_length(v_alerts),
    'language', 'ATENÇÃO / REQUER ACOMPANHAMENTO'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_resolve_authorized_scope(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_scope_period_metrics(uuid, uuid, uuid, date, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_get_trend_series(uuid, uuid, uuid, text, date, date, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analytics_get_period_comparison(uuid, uuid, uuid, date, date, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analytics_get_class_comparison(uuid, date, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analytics_get_alerts(uuid, uuid, date, date, numeric, numeric, numeric, numeric, boolean) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.analytics_get_trend_series(uuid, uuid, uuid, text, date, date, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_get_period_comparison(uuid, uuid, uuid, date, date, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_get_class_comparison(uuid, date, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_get_alerts(uuid, uuid, date, date, numeric, numeric, numeric, numeric, boolean) TO authenticated, service_role;

COMMIT;
