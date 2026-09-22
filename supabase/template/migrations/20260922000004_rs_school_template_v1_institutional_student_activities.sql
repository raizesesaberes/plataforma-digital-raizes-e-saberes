-- FASE 03D.2 - contrato canonico de atividades para Fundamental/Medio.
-- Preserva o motor de atividades da Educacao Infantil e usa o legado institucional.

CREATE OR REPLACE FUNCTION public.student_list_institutional_activities()
RETURNS TABLE (
  activity_id uuid,
  title text,
  description text,
  school_year text,
  xp integer,
  status text,
  progress_status text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamp
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    a.id AS activity_id,
    a.titulo::text AS title,
    a.descricao AS description,
    a.ano_escolar::text AS school_year,
    a.xp,
    CASE WHEN coalesce(a.ativa, true) THEN 'published' ELSE 'inactive' END AS status,
    coalesce(ap.status, 'pendente') AS progress_status,
    ap.iniciado_em AS started_at,
    ap.concluido_em AS completed_at,
    a.created_at
  FROM public.student_get_context() ctx
  JOIN public.activities a ON true
  LEFT JOIN public.activity_progress ap
    ON ap.student_id = ctx.student_id
   AND ap.activity_id = a.id
  WHERE auth.uid() IS NOT NULL
    AND ctx.segment IN ('ENSINO_FUNDAMENTAL', 'ENSINO_MEDIO')
    AND coalesce(a.ativa, true) = true
    AND public.is_content_available_for_school(ctx.school_id, 'activity', a.id::text)
    AND (
      a.ano_escolar IS NULL
      OR ctx.school_year IS NULL
      OR lower(a.ano_escolar::text) = lower(ctx.school_year)
      OR lower(a.ano_escolar::text) = lower(replace(ctx.school_year, ' ', ''))
    )
  ORDER BY a.created_at DESC NULLS LAST, a.titulo ASC;
$$;

CREATE OR REPLACE FUNCTION public.student_get_institutional_activity(p_activity_id uuid)
RETURNS TABLE (
  activity_id uuid,
  title text,
  description text,
  school_year text,
  xp integer,
  status text,
  progress_status text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamp
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT *
  FROM public.student_list_institutional_activities() activity
  WHERE activity.activity_id = p_activity_id
  LIMIT 1;
$$;

REVOKE ALL ON TABLE public.activity_progress FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.student_list_institutional_activities() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_institutional_activity(uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.student_list_institutional_activities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_institutional_activity(uuid) TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE specific_schema = 'public'
      AND routine_name IN ('student_list_institutional_activities', 'student_get_institutional_activity')
      AND grantee IN ('PUBLIC', 'anon')
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: RPC de atividades institucional exposta para PUBLIC/anon';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'activity_progress'
      AND grantee IN ('PUBLIC', 'anon', 'authenticated')
      AND privilege_type IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: activity_progress ainda permite escrita direta insegura';
  END IF;
END $$;
