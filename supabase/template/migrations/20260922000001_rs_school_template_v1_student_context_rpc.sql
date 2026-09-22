-- FASE 03C.1 - contexto canonico do aluno autenticado.
-- Contrato seguro para Home/Perfil sem abrir SELECT global em tabelas institucionais.

CREATE OR REPLACE FUNCTION public.student_get_context()
RETURNS TABLE (
  student_id uuid,
  student_name text,
  class_id uuid,
  class_name text,
  school_id uuid,
  school_name text,
  segment text,
  school_year text,
  age_group text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    s.id AS student_id,
    s.nome::text AS student_name,
    e.class_id,
    c.nome::text AS class_name,
    e.school_id,
    sc.nome::text AS school_name,
    CASE
      WHEN lower(coalesce(c.age_group, '')) IN (
        'educacao_infantil',
        'educação infantil',
        'infantil',
        'pre_escola',
        'pré-escola',
        'pre escola',
        'pré escola'
      )
        OR lower(coalesce(c.school_year, e.school_year, c.ano_escolar, s.turma, '')) SIMILAR TO '%(infantil|creche|maternal|pre|pré)%'
        THEN 'EDUCACAO_INFANTIL'
      WHEN lower(coalesce(c.school_year, e.school_year, c.ano_escolar, s.turma, '')) SIMILAR TO '%(medio|médio|ensino medio|ensino médio)%'
        THEN 'ENSINO_MEDIO'
      ELSE 'ENSINO_FUNDAMENTAL'
    END AS segment,
    coalesce(c.school_year, e.school_year, c.ano_escolar::text, s.turma::text) AS school_year,
    c.age_group
  FROM public.students s
  JOIN public.enrollments e ON e.student_id = s.id
  JOIN public.classes c ON c.id = e.class_id
  JOIN public.schools sc ON sc.id = e.school_id
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE auth.uid() IS NOT NULL
    AND (
      s.user_id = auth.uid()
      OR lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    AND coalesce(s.status, 'active') = 'active'
    AND e.status = 'active'
    AND e.enrolled_at <= now()
    AND (e.ended_at IS NULL OR e.ended_at > now())
    AND coalesce(c.status, 'active') = 'active'
    AND coalesce(sc.status, 'active') = 'active'
  ORDER BY e.enrolled_at DESC, e.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.student_get_context() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_context() TO authenticated;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.routine_privileges
    WHERE specific_schema = 'public'
      AND routine_name = 'student_get_context'
      AND grantee IN ('PUBLIC', 'anon')
  ) THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: student_get_context exposta para PUBLIC/anon';
  END IF;
END $$;
