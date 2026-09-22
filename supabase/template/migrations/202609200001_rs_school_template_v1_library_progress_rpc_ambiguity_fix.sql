-- RS-SCHOOL-TEMPLATE V1 - Library progress RPC ambiguity hotfix
-- Scope: fixes only student_upsert_book_progress() after canonical book ingestion smoke.

CREATE OR REPLACE FUNCTION public.student_upsert_book_progress(
  p_book_id uuid,
  p_current_page integer DEFAULT 1,
  p_percent_complete integer DEFAULT 0
)
RETURNS TABLE(
  book_id uuid,
  current_page integer,
  percent_complete integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_page integer := greatest(coalesce(p_current_page, 1), 1);
  v_percent integer := least(greatest(coalesce(p_percent_complete, 0), 0), 100);
  v_progress public.book_progress;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  IF NOT public.student_can_read_library_book(p_book_id) THEN
    RAISE EXCEPTION 'Livro nao autorizado para este aluno.' USING errcode = '42501';
  END IF;

  SELECT ce.student_id
    INTO v_student_id
  FROM public.current_student_library_enrollments() ce
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

  UPDATE public.book_progress bp
     SET current_page = v_page,
         percent_complete = v_percent,
         updated_at = now()
   WHERE bp.student_id = v_student_id
     AND bp.book_id = p_book_id
   RETURNING bp.*
    INTO v_progress;

  IF NOT FOUND THEN
    INSERT INTO public.book_progress (
      student_id,
      book_id,
      current_page,
      percent_complete,
      updated_at
    )
    VALUES (
      v_student_id,
      p_book_id,
      v_page,
      v_percent,
      now()
    )
    RETURNING public.book_progress.*
      INTO v_progress;
  END IF;

  RETURN QUERY
  SELECT
    v_progress.book_id,
    v_progress.current_page,
    v_progress.percent_complete,
    v_progress.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.student_upsert_book_progress(uuid, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_upsert_book_progress(uuid, integer, integer)
  TO authenticated, service_role;
