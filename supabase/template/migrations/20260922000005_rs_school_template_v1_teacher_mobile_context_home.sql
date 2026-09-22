-- FASE 04B - contratos minimos para Professor Mobile.
-- Contexto, turmas, resumo da Home e adapter de notificacoes derivados de auth.uid().

CREATE OR REPLACE FUNCTION public.teacher_get_context()
RETURNS TABLE (
  teacher_id uuid,
  profile_id uuid,
  teacher_name text,
  school_id uuid,
  school_name text,
  role text,
  discipline text,
  active_class_links integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    t.id AS teacher_id,
    p.id AS profile_id,
    coalesce(p.display_name, 'Professor')::text AS teacher_name,
    t.school_id,
    s.nome::text AS school_name,
    p.platform_role::text AS role,
    t.disciplina::text AS discipline,
    count(ctm.id) FILTER (
      WHERE ctm.status = 'active'
        AND (ctm.ended_at IS NULL OR ctm.ended_at > now())
        AND coalesce(c.status, 'active') = 'active'
    )::integer AS active_class_links
  FROM public.teachers t
  JOIN public.profiles p ON p.id = t.profile_id
  JOIN public.schools s ON s.id = t.school_id
  LEFT JOIN public.class_teacher_memberships ctm ON ctm.teacher_id = t.id
  LEFT JOIN public.classes c ON c.id = ctm.class_id
  WHERE auth.uid() IS NOT NULL
    AND t.profile_id = auth.uid()
    AND coalesce(t.status, 'active') = 'active'
    AND coalesce(p.status, 'active') = 'active'
    AND lower(coalesce(p.platform_role, '')) = 'professor'
    AND coalesce(s.status, 'active') = 'active'
  GROUP BY t.id, p.id, p.display_name, t.school_id, s.nome, p.platform_role, t.disciplina
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.teacher_list_classes_for_mobile()
RETURNS TABLE (
  class_id uuid,
  school_id uuid,
  class_name text,
  school_year text,
  age_group text,
  shift text,
  teacher_role text,
  membership_status text,
  student_count integer,
  started_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH ctx AS (
    SELECT *
    FROM public.teacher_get_context()
    LIMIT 1
  )
  SELECT
    c.id AS class_id,
    c.school_id,
    c.nome::text AS class_name,
    coalesce(c.school_year, c.ano_escolar::text) AS school_year,
    c.age_group,
    c.turno::text AS shift,
    ctm.role::text AS teacher_role,
    ctm.status::text AS membership_status,
    count(e.student_id) FILTER (
      WHERE e.status = 'active'
        AND e.enrolled_at <= now()
        AND (e.ended_at IS NULL OR e.ended_at > now())
    )::integer AS student_count,
    ctm.started_at
  FROM ctx
  JOIN public.class_teacher_memberships ctm ON ctm.teacher_id = ctx.teacher_id
  JOIN public.classes c ON c.id = ctm.class_id AND c.school_id = ctx.school_id
  LEFT JOIN public.enrollments e ON e.class_id = c.id AND e.school_id = c.school_id
  WHERE ctm.status = 'active'
    AND (ctm.ended_at IS NULL OR ctm.ended_at > now())
    AND coalesce(c.status, 'active') = 'active'
  GROUP BY c.id, c.school_id, c.nome, c.school_year, c.ano_escolar, c.age_group, c.turno, ctm.role, ctm.status, ctm.started_at
  ORDER BY c.nome ASC;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_home_summary()
RETURNS TABLE (
  teacher_id uuid,
  teacher_name text,
  school_id uuid,
  school_name text,
  active_class_links integer,
  total_students integer,
  todays_calendar_count integer,
  unread_notifications integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH ctx AS (
    SELECT *
    FROM public.teacher_get_context()
    LIMIT 1
  ),
  classes AS (
    SELECT *
    FROM public.teacher_list_classes_for_mobile()
  ),
  class_ids AS (
    SELECT array_agg(class_id) AS ids
    FROM classes
  )
  SELECT
    ctx.teacher_id,
    ctx.teacher_name,
    ctx.school_id,
    ctx.school_name,
    ctx.active_class_links,
    coalesce(sum(classes.student_count), 0)::integer AS total_students,
    (
      SELECT count(*)::integer
      FROM public.class_calendar_entries cce
      CROSS JOIN class_ids
      WHERE cce.school_id = ctx.school_id
        AND cce.class_id = ANY (coalesce(class_ids.ids, ARRAY[]::uuid[]))
        AND cce.entry_date = current_date
        AND coalesce(cce.status, 'published') = 'published'
        AND public.calendar_teacher_can_read_school_event(cce.school_id, cce.class_id)
    ) AS todays_calendar_count,
    (
      SELECT count(*)::integer
      FROM public.notifications n
      WHERE n.user_id = ctx.profile_id
        AND coalesce(n.lida, false) = false
    ) AS unread_notifications
  FROM ctx
  LEFT JOIN classes ON true
  GROUP BY ctx.teacher_id, ctx.teacher_name, ctx.school_id, ctx.school_name, ctx.active_class_links, ctx.profile_id;
$$;

CREATE OR REPLACE FUNCTION public.teacher_get_notification_center(
  p_read_filter text DEFAULT 'all',
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  notification_id uuid,
  title text,
  summary text,
  delivered_at timestamp,
  notification_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_filter text := lower(coalesce(nullif(trim(p_read_filter), ''), 'all'));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  IF v_filter NOT IN ('all', 'read', 'unread') THEN
    RAISE EXCEPTION 'Filtro de leitura invalido.' USING errcode = '22023';
  END IF;

  RETURN QUERY
  SELECT
    n.id AS notification_id,
    coalesce(n.titulo, 'Notificacao')::text AS title,
    coalesce(n.mensagem, '')::text AS summary,
    n.created_at AS delivered_at,
    CASE WHEN coalesce(n.lida, false) THEN 'read' ELSE 'unread' END AS notification_status
  FROM public.teacher_get_context() ctx
  JOIN public.notifications n ON n.user_id = ctx.profile_id
  WHERE v_filter = 'all'
    OR (v_filter = 'read' AND coalesce(n.lida, false) = true)
    OR (v_filter = 'unread' AND coalesce(n.lida, false) = false)
  ORDER BY n.created_at DESC NULLS LAST, n.id DESC
  LIMIT v_limit
  OFFSET v_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_get_context() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_list_classes_for_mobile() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_get_home_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.teacher_get_notification_center(text, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.teacher_get_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_list_classes_for_mobile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_get_home_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_get_notification_center(text, integer, integer) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE specific_schema = 'public'
      AND routine_name IN (
        'teacher_get_context',
        'teacher_list_classes_for_mobile',
        'teacher_get_home_summary',
        'teacher_get_notification_center'
      )
      AND grantee IN ('PUBLIC', 'anon')
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: RPC Professor Mobile exposta para PUBLIC/anon';
  END IF;
END $$;
