BEGIN;

DO $$
BEGIN
  IF to_regclass('public.attendance_records') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.attendance_records nao existe';
  END IF;
  IF to_regclass('public.assessment_results') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.assessment_results nao existe';
  END IF;
  IF to_regclass('public.class_diary_entries') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.class_diary_entries nao existe';
  END IF;
  IF to_regprocedure('public.secretaria_can_manage_school(uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.secretaria_can_manage_school(uuid) nao existe';
  END IF;
  IF to_regprocedure('public.institutional_teacher_can_manage_class(uuid, uuid, uuid)') IS NULL THEN
    RAISE EXCEPTION 'PRE-CHECK bloqueado: public.institutional_teacher_can_manage_class(uuid, uuid, uuid) nao existe';
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.secretaria_list_attendance_records() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.secretaria_list_attendance_records() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.secretaria_can_manage_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.secretaria_can_manage_school(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.analytics_current_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT t.id
  FROM public.teachers t
  WHERE t.profile_id = auth.uid()
    AND coalesce(t.status, 'active') = 'active'
  ORDER BY t.created_at NULLS LAST
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.analytics_assigned_student_count(
  p_assignment_id uuid,
  p_school_year text DEFAULT NULL
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce((
    SELECT CASE
      WHEN aa.target_type = 'student' THEN 1
      WHEN aa.target_type = 'class' THEN (
        SELECT count(*)::integer
        FROM public.enrollments e
        JOIN public.students s ON s.id = e.student_id
        JOIN public.classes c ON c.id = e.class_id
        WHERE e.class_id = aa.class_id
          AND e.school_id = aa.school_id
          AND e.status = 'active'
          AND coalesce(s.status, 'active') = 'active'
          AND (p_school_year IS NULL OR e.school_year = p_school_year OR c.school_year = p_school_year)
          AND e.enrolled_at <= now()
          AND (e.ended_at IS NULL OR e.ended_at > now())
      )
      ELSE 0
    END
    FROM public.assessment_assignments aa
    WHERE aa.id = p_assignment_id
  ), 0);
$$;

CREATE OR REPLACE FUNCTION public.analytics_get_school_overview(
  p_school_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_school_year text DEFAULT NULL
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
  v_school public.schools%ROWTYPE;
  v_payload jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_school_id IS NULL THEN
    RAISE EXCEPTION 'SCHOOL_REQUIRED';
  END IF;
  IF v_from > v_to THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  SELECT * INTO v_school
  FROM public.schools
  WHERE id = p_school_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SCHOOL_NOT_FOUND';
  END IF;

  IF NOT (public.is_platform_admin() OR public.secretaria_can_manage_school(p_school_id)) THEN
    RAISE EXCEPTION 'SCHOOL_ANALYTICS_FORBIDDEN';
  END IF;

  WITH
  active_classes AS (
    SELECT c.*
    FROM public.classes c
    WHERE c.school_id = p_school_id
      AND coalesce(c.status, 'active') = 'active'
      AND (p_school_year IS NULL OR c.school_year = p_school_year OR c.ano_escolar = p_school_year)
  ),
  active_enrollments AS (
    SELECT e.*
    FROM public.enrollments e
    JOIN active_classes c ON c.id = e.class_id
    JOIN public.students s ON s.id = e.student_id
    WHERE e.school_id = p_school_id
      AND e.status = 'active'
      AND coalesce(s.status, 'active') = 'active'
      AND (p_school_year IS NULL OR e.school_year = p_school_year OR c.school_year = p_school_year)
      AND e.enrolled_at <= now()
      AND (e.ended_at IS NULL OR e.ended_at > now())
  ),
  attendance AS (
    SELECT
      count(*)::integer AS total_records,
      count(*) FILTER (WHERE ar.status = 'present')::integer AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::integer AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::integer AS justified,
      CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE ar.status = 'present')::numeric / count(*)) * 100, 2)
        ELSE 0
      END AS attendance_rate
    FROM public.attendance_records ar
    WHERE ar.school_id = p_school_id
      AND ar.attendance_date BETWEEN v_from AND v_to
  ),
  assignment_scope AS (
    SELECT aa.*
    FROM public.assessment_assignments aa
    WHERE aa.school_id = p_school_id
      AND aa.status = 'published'
      AND coalesce(aa.available_from, aa.created_at)::date <= v_to
      AND coalesce(aa.available_until, v_to::timestamptz)::date >= v_from
  ),
  assessment_summary AS (
    SELECT
      count(*)::integer AS assignments,
      coalesce(sum(public.analytics_assigned_student_count(aa.id, p_school_year)), 0)::integer AS assigned_students,
      count(distinct res.student_id)::integer AS completed_students,
      CASE WHEN coalesce(sum(public.analytics_assigned_student_count(aa.id, p_school_year)), 0) > 0
        THEN round((count(distinct res.student_id)::numeric / sum(public.analytics_assigned_student_count(aa.id, p_school_year))) * 100, 2)
        ELSE 0
      END AS participation_percentage,
      coalesce(round(avg(res.score_percentage), 2), 0) AS average_percentage
    FROM assignment_scope aa
    LEFT JOIN public.assessment_results res
      ON res.assignment_id = aa.id
      AND res.school_id = p_school_id
      AND res.finalized_at::date BETWEEN v_from AND v_to
  ),
  bncc AS (
    SELECT
      count(distinct nullif(btrim(qi.bncc_skill), ''))::integer AS skills,
      count(distinct aq.question_id)::integer AS questions,
      count(resp.id)::integer AS responses,
      count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::integer AS correct,
      CASE WHEN count(resp.id) > 0
        THEN round((count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::numeric / count(resp.id)) * 100, 2)
        ELSE 0
      END AS percentage
    FROM public.assessment_results res
    JOIN public.assessment_responses resp ON resp.attempt_id = res.attempt_id
    JOIN public.assessment_questions aq ON aq.assessment_id = res.assessment_id AND aq.question_id = resp.question_id
    JOIN public.question_items qi ON qi.id = aq.question_id
    WHERE res.school_id = p_school_id
      AND res.finalized_at::date BETWEEN v_from AND v_to
      AND nullif(btrim(coalesce(qi.bncc_skill, '')), '') IS NOT NULL
  ),
  diary AS (
    SELECT
      count(*)::integer AS entries,
      count(distinct cde.entry_date)::integer AS days_with_diary,
      count(*) FILTER (WHERE cde.status = 'closed')::integer AS closed_entries,
      count(cdal.id)::integer AS activity_links
    FROM public.class_diary_entries cde
    LEFT JOIN public.class_diary_activity_links cdal ON cdal.diary_entry_id = cde.id
    WHERE cde.school_id = p_school_id
      AND cde.deleted_at IS NULL
      AND cde.entry_date BETWEEN v_from AND v_to
  ),
  class_rows AS (
    SELECT
      c.id,
      c.nome AS name,
      count(distinct e.student_id)::integer AS active_students,
      coalesce(att.attendance_rate, 0) AS attendance_rate,
      coalesce(asm.average_percentage, 0) AS average_percentage,
      coalesce(asm.completed_students, 0) AS completed_students,
      coalesce(d.entries, 0) AS diary_entries
    FROM active_classes c
    LEFT JOIN active_enrollments e ON e.class_id = c.id
    LEFT JOIN LATERAL (
      SELECT CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE ar.status = 'present')::numeric / count(*)) * 100, 2)
        ELSE 0 END AS attendance_rate
      FROM public.attendance_records ar
      WHERE ar.class_id = c.id
        AND ar.attendance_date BETWEEN v_from AND v_to
    ) att ON true
    LEFT JOIN LATERAL (
      SELECT
        count(distinct res.student_id)::integer AS completed_students,
        coalesce(round(avg(res.score_percentage), 2), 0) AS average_percentage
      FROM public.assessment_results res
      JOIN public.assessment_assignments aa ON aa.id = res.assignment_id
      WHERE aa.class_id = c.id
        AND res.finalized_at::date BETWEEN v_from AND v_to
    ) asm ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS entries
      FROM public.class_diary_entries cde
      WHERE cde.class_id = c.id
        AND cde.deleted_at IS NULL
        AND cde.entry_date BETWEEN v_from AND v_to
    ) d ON true
    GROUP BY c.id, c.nome, att.attendance_rate, asm.average_percentage, asm.completed_students, d.entries
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to, 'school_year', p_school_year),
    'school', jsonb_build_object('id', v_school.id, 'name', v_school.nome, 'status', v_school.status),
    'summary', jsonb_build_object(
      'active_students', (SELECT count(distinct student_id) FROM active_enrollments),
      'active_classes', (SELECT count(*) FROM active_classes),
      'teachers', (SELECT count(*) FROM public.teachers t WHERE t.school_id = p_school_id AND coalesce(t.status, 'active') = 'active'),
      'attendance_rate', (SELECT attendance_rate FROM attendance),
      'assessment_participation', (SELECT participation_percentage FROM assessment_summary),
      'assessment_average', (SELECT average_percentage FROM assessment_summary),
      'diary_entries', (SELECT entries FROM diary),
      'bncc_skills', (SELECT skills FROM bncc)
    ),
    'attendance', (SELECT to_jsonb(attendance) FROM attendance),
    'assessment', (SELECT to_jsonb(assessment_summary) FROM assessment_summary),
    'bncc', (SELECT to_jsonb(bncc) FROM bncc),
    'diary', (SELECT to_jsonb(diary) FROM diary),
    'classes', coalesce((SELECT jsonb_agg(to_jsonb(class_rows) ORDER BY name) FROM class_rows), '[]'::jsonb)
  ) INTO v_payload;

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_get_class_overview(
  p_class_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_school_year text DEFAULT NULL
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
  v_class public.classes%ROWTYPE;
  v_teacher_id uuid := public.analytics_current_teacher_id();
  v_payload jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_class_id IS NULL THEN
    RAISE EXCEPTION 'CLASS_REQUIRED';
  END IF;
  IF v_from > v_to THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  SELECT * INTO v_class
  FROM public.classes
  WHERE id = p_class_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLASS_NOT_FOUND';
  END IF;

  IF NOT (
    public.is_platform_admin()
    OR public.secretaria_can_manage_school(v_class.school_id)
    OR (v_teacher_id IS NOT NULL AND public.institutional_teacher_can_manage_class(v_teacher_id, p_class_id, v_class.school_id))
  ) THEN
    RAISE EXCEPTION 'CLASS_ANALYTICS_FORBIDDEN';
  END IF;

  WITH
  active_enrollments AS (
    SELECT e.*, s.nome AS student_name
    FROM public.enrollments e
    JOIN public.students s ON s.id = e.student_id
    WHERE e.class_id = p_class_id
      AND e.school_id = v_class.school_id
      AND e.status = 'active'
      AND coalesce(s.status, 'active') = 'active'
      AND (p_school_year IS NULL OR e.school_year = p_school_year OR v_class.school_year = p_school_year)
      AND e.enrolled_at <= now()
      AND (e.ended_at IS NULL OR e.ended_at > now())
  ),
  attendance AS (
    SELECT
      count(*)::integer AS total_records,
      count(*) FILTER (WHERE ar.status = 'present')::integer AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::integer AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::integer AS justified,
      CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE ar.status = 'present')::numeric / count(*)) * 100, 2)
        ELSE 0
      END AS attendance_rate
    FROM public.attendance_records ar
    WHERE ar.class_id = p_class_id
      AND ar.attendance_date BETWEEN v_from AND v_to
  ),
  assignment_scope AS (
    SELECT aa.*
    FROM public.assessment_assignments aa
    WHERE aa.school_id = v_class.school_id
      AND aa.status = 'published'
      AND (
        (aa.target_type = 'class' AND aa.class_id = p_class_id)
        OR (aa.target_type = 'student' AND EXISTS (SELECT 1 FROM active_enrollments e WHERE e.student_id = aa.student_id))
      )
      AND coalesce(aa.available_from, aa.created_at)::date <= v_to
      AND coalesce(aa.available_until, v_to::timestamptz)::date >= v_from
  ),
  assessment_summary AS (
    SELECT
      count(*)::integer AS assignments,
      coalesce(sum(public.analytics_assigned_student_count(aa.id, p_school_year)), 0)::integer AS assigned_students,
      count(distinct res.student_id)::integer AS completed_students,
      CASE WHEN coalesce(sum(public.analytics_assigned_student_count(aa.id, p_school_year)), 0) > 0
        THEN round((count(distinct res.student_id)::numeric / sum(public.analytics_assigned_student_count(aa.id, p_school_year))) * 100, 2)
        ELSE 0
      END AS participation_percentage,
      coalesce(round(avg(res.score_percentage), 2), 0) AS average_percentage
    FROM assignment_scope aa
    LEFT JOIN public.assessment_results res
      ON res.assignment_id = aa.id
      AND res.finalized_at::date BETWEEN v_from AND v_to
  ),
  bncc_skills AS (
    SELECT
      nullif(btrim(qi.bncc_skill), '') AS bncc_skill,
      count(distinct aq.question_id)::integer AS questions,
      count(resp.id)::integer AS responses,
      count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::integer AS correct,
      CASE WHEN count(resp.id) > 0
        THEN round((count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::numeric / count(resp.id)) * 100, 2)
        ELSE 0
      END AS percentage
    FROM public.assessment_results res
    JOIN assignment_scope aa ON aa.id = res.assignment_id
    JOIN public.assessment_responses resp ON resp.attempt_id = res.attempt_id
    JOIN public.assessment_questions aq ON aq.assessment_id = res.assessment_id AND aq.question_id = resp.question_id
    JOIN public.question_items qi ON qi.id = aq.question_id
    WHERE res.finalized_at::date BETWEEN v_from AND v_to
      AND nullif(btrim(coalesce(qi.bncc_skill, '')), '') IS NOT NULL
    GROUP BY nullif(btrim(qi.bncc_skill), '')
  ),
  diary AS (
    SELECT
      count(*)::integer AS entries,
      count(distinct cde.entry_date)::integer AS days_with_diary,
      count(*) FILTER (WHERE cde.status = 'closed')::integer AS closed_entries,
      count(cdal.id)::integer AS activity_links
    FROM public.class_diary_entries cde
    LEFT JOIN public.class_diary_activity_links cdal ON cdal.diary_entry_id = cde.id
    WHERE cde.class_id = p_class_id
      AND cde.deleted_at IS NULL
      AND cde.entry_date BETWEEN v_from AND v_to
  ),
  student_rows AS (
    SELECT
      e.student_id,
      e.student_name,
      coalesce(sa.attendance_rate, 0) AS attendance_rate,
      coalesce(sr.completed_assessments, 0) AS completed_assessments,
      coalesce(sr.average_percentage, 0) AS average_percentage
    FROM active_enrollments e
    LEFT JOIN LATERAL (
      SELECT CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE ar.status = 'present')::numeric / count(*)) * 100, 2)
        ELSE 0 END AS attendance_rate
      FROM public.attendance_records ar
      WHERE ar.student_id = e.student_id
        AND ar.attendance_date BETWEEN v_from AND v_to
    ) sa ON true
    LEFT JOIN LATERAL (
      SELECT count(*)::integer AS completed_assessments, coalesce(round(avg(res.score_percentage), 2), 0) AS average_percentage
      FROM public.assessment_results res
      JOIN assignment_scope aa ON aa.id = res.assignment_id
      WHERE res.student_id = e.student_id
        AND res.finalized_at::date BETWEEN v_from AND v_to
    ) sr ON true
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to, 'school_year', p_school_year),
    'class', jsonb_build_object('id', v_class.id, 'name', v_class.nome, 'school_id', v_class.school_id, 'school_year', v_class.school_year),
    'summary', jsonb_build_object(
      'active_students', (SELECT count(*) FROM active_enrollments),
      'attendance_rate', (SELECT attendance_rate FROM attendance),
      'assessment_participation', (SELECT participation_percentage FROM assessment_summary),
      'assessment_average', (SELECT average_percentage FROM assessment_summary),
      'diary_entries', (SELECT entries FROM diary),
      'bncc_skills', (SELECT count(*) FROM bncc_skills)
    ),
    'attendance', (SELECT to_jsonb(attendance) FROM attendance),
    'assessment', (SELECT to_jsonb(assessment_summary) FROM assessment_summary),
    'bncc', coalesce((SELECT jsonb_agg(to_jsonb(bncc_skills) ORDER BY percentage ASC, bncc_skill) FROM bncc_skills), '[]'::jsonb),
    'diary', (SELECT to_jsonb(diary) FROM diary),
    'students', coalesce((SELECT jsonb_agg(to_jsonb(student_rows) ORDER BY student_name) FROM student_rows), '[]'::jsonb)
  ) INTO v_payload;

  RETURN v_payload;
END;
$$;

CREATE OR REPLACE FUNCTION public.analytics_get_student_snapshot(
  p_student_id uuid,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_school_year text DEFAULT NULL
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
  v_student public.students%ROWTYPE;
  v_enrollment public.enrollments%ROWTYPE;
  v_class public.classes%ROWTYPE;
  v_teacher_id uuid := public.analytics_current_teacher_id();
  v_payload jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'STUDENT_REQUIRED';
  END IF;
  IF v_from > v_to THEN
    RAISE EXCEPTION 'INVALID_PERIOD';
  END IF;

  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id
    AND coalesce(status, 'active') = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'STUDENT_NOT_FOUND';
  END IF;

  SELECT e.* INTO v_enrollment
  FROM public.enrollments e
  WHERE e.student_id = p_student_id
    AND e.school_id = v_student.school_id
    AND e.status = 'active'
    AND (p_school_year IS NULL OR e.school_year = p_school_year)
    AND e.enrolled_at <= now()
    AND (e.ended_at IS NULL OR e.ended_at > now())
  ORDER BY e.enrolled_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACTIVE_ENROLLMENT_NOT_FOUND';
  END IF;

  SELECT * INTO v_class
  FROM public.classes
  WHERE id = v_enrollment.class_id;

  IF NOT (
    public.is_platform_admin()
    OR public.secretaria_can_manage_school(v_student.school_id)
    OR public.institutional_is_current_student(p_student_id)
    OR (v_teacher_id IS NOT NULL AND public.institutional_teacher_can_manage_class(v_teacher_id, v_enrollment.class_id, v_student.school_id))
  ) THEN
    RAISE EXCEPTION 'STUDENT_ANALYTICS_FORBIDDEN';
  END IF;

  WITH
  attendance AS (
    SELECT
      count(*)::integer AS total_records,
      count(*) FILTER (WHERE ar.status = 'present')::integer AS present,
      count(*) FILTER (WHERE ar.status = 'absent')::integer AS absent,
      count(*) FILTER (WHERE ar.status = 'justified')::integer AS justified,
      CASE WHEN count(*) > 0
        THEN round((count(*) FILTER (WHERE ar.status = 'present')::numeric / count(*)) * 100, 2)
        ELSE 0
      END AS attendance_rate
    FROM public.attendance_records ar
    WHERE ar.student_id = p_student_id
      AND ar.attendance_date BETWEEN v_from AND v_to
  ),
  assignment_scope AS (
    SELECT aa.*
    FROM public.assessment_assignments aa
    WHERE aa.school_id = v_student.school_id
      AND aa.status = 'published'
      AND (
        (aa.target_type = 'student' AND aa.student_id = p_student_id)
        OR (aa.target_type = 'class' AND aa.class_id = v_enrollment.class_id)
      )
      AND coalesce(aa.available_from, aa.created_at)::date <= v_to
      AND coalesce(aa.available_until, v_to::timestamptz)::date >= v_from
  ),
  assessment AS (
    SELECT
      count(distinct aa.id)::integer AS assigned_assessments,
      count(distinct res.id)::integer AS completed_assessments,
      coalesce(round(avg(res.score_percentage), 2), 0) AS average_percentage
    FROM assignment_scope aa
    LEFT JOIN public.assessment_results res
      ON res.assignment_id = aa.id
      AND res.student_id = p_student_id
      AND res.finalized_at::date BETWEEN v_from AND v_to
  ),
  bncc_skills AS (
    SELECT
      nullif(btrim(qi.bncc_skill), '') AS bncc_skill,
      count(distinct aq.question_id)::integer AS questions,
      count(resp.id)::integer AS responses,
      count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::integer AS correct,
      CASE WHEN count(resp.id) > 0
        THEN round((count(resp.id) FILTER (WHERE resp.is_correct IS TRUE)::numeric / count(resp.id)) * 100, 2)
        ELSE 0
      END AS percentage
    FROM public.assessment_results res
    JOIN public.assessment_responses resp ON resp.attempt_id = res.attempt_id
    JOIN public.assessment_questions aq ON aq.assessment_id = res.assessment_id AND aq.question_id = resp.question_id
    JOIN public.question_items qi ON qi.id = aq.question_id
    WHERE res.student_id = p_student_id
      AND res.finalized_at::date BETWEEN v_from AND v_to
      AND nullif(btrim(coalesce(qi.bncc_skill, '')), '') IS NOT NULL
    GROUP BY nullif(btrim(qi.bncc_skill), '')
  ),
  recommendation_summary AS (
    SELECT count(*)::integer AS recommendations
    FROM public.pedagogical_recommendations pr
    WHERE pr.school_id = v_student.school_id
      AND pr.status = 'published'
      AND pr.deleted_at IS NULL
      AND (
        (pr.target_type = 'student' AND pr.student_id = p_student_id)
        OR (pr.target_type = 'class' AND pr.class_id = v_enrollment.class_id)
      )
      AND pr.published_at::date BETWEEN v_from AND v_to
  ),
  diary_notes AS (
    SELECT count(*)::integer AS notes_count
    FROM public.class_diary_student_notes cdn
    WHERE cdn.student_id = p_student_id
      AND cdn.school_id = v_student.school_id
      AND cdn.status = 'active'
      AND cdn.deleted_at IS NULL
      AND cdn.note_date BETWEEN v_from AND v_to
  )
  SELECT jsonb_build_object(
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to, 'school_year', coalesce(p_school_year, v_enrollment.school_year)),
    'student', jsonb_build_object('id', v_student.id, 'name', v_student.nome, 'school_id', v_student.school_id, 'class_id', v_enrollment.class_id),
    'class', jsonb_build_object('id', v_class.id, 'name', v_class.nome, 'school_year', v_class.school_year),
    'attendance', (SELECT to_jsonb(attendance) FROM attendance),
    'assessment', (SELECT to_jsonb(assessment) FROM assessment),
    'bncc', coalesce((SELECT jsonb_agg(to_jsonb(bncc_skills) ORDER BY percentage ASC, bncc_skill) FROM bncc_skills), '[]'::jsonb),
    'recommendations', (SELECT to_jsonb(recommendation_summary) FROM recommendation_summary),
    'diary', (SELECT to_jsonb(diary_notes) FROM diary_notes)
  ) INTO v_payload;

  RETURN v_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.analytics_current_teacher_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_assigned_student_count(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_get_school_overview(uuid, date, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analytics_get_class_overview(uuid, date, date, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.analytics_get_student_snapshot(uuid, date, date, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.analytics_get_school_overview(uuid, date, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_get_class_overview(uuid, date, date, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.analytics_get_student_snapshot(uuid, date, date, text) TO authenticated, service_role;

COMMIT;
