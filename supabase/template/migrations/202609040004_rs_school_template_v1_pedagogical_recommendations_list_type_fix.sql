-- RS-SCHOOL-TEMPLATE V1 - Fix recommendation list return types
-- Corrects varchar-to-text mismatches in the listing RPC without changing table schema, RLS, or grants scope.

CREATE OR REPLACE FUNCTION public.teacher_list_pedagogical_recommendations(
  p_class_id uuid
)
RETURNS TABLE (
  id uuid,
  school_id uuid,
  teacher_id uuid,
  content_type text,
  content_id text,
  content_title text,
  target_type text,
  class_id uuid,
  class_name text,
  student_id uuid,
  student_name text,
  note text,
  status text,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_school_id uuid;
  v_teacher public.teachers;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para listar recomendacoes.';
  END IF;

  SELECT c.school_id INTO v_school_id
  FROM public.classes c
  WHERE c.id = p_class_id
    AND c.status = 'active';

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Turma nao encontrada.';
  END IF;

  SELECT * INTO v_teacher
  FROM public.pedagogical_recommendation_current_teacher(v_school_id);

  IF v_teacher.id IS NULL
    OR NOT public.pedagogical_recommendation_teacher_can_target(
      v_teacher.id,
      v_school_id,
      p_class_id,
      NULL,
      'class'
    ) THEN
    RAISE EXCEPTION 'Professor sem permissao para listar recomendacoes desta turma.';
  END IF;

  RETURN QUERY
  SELECT
    pr.id,
    pr.school_id,
    pr.teacher_id,
    pr.content_type,
    pr.content_id,
    pr.content_title,
    pr.target_type,
    pr.class_id,
    c.nome::text AS class_name,
    pr.student_id,
    s.nome::text AS student_name,
    pr.note,
    pr.status,
    pr.published_at,
    pr.created_at,
    pr.updated_at
  FROM public.pedagogical_recommendations pr
  JOIN public.classes c ON c.id = pr.class_id
  LEFT JOIN public.students s ON s.id = pr.student_id
  WHERE pr.class_id = p_class_id
    AND pr.teacher_id = v_teacher.id
    AND pr.status <> 'deleted'
  ORDER BY pr.created_at DESC, pr.content_title ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) TO authenticated;
