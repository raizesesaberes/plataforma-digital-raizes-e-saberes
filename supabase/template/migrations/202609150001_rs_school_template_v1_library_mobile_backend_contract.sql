-- Biblioteca V1 - contrato canonico seguro para Web/Mobile
-- Cria relacao canonica legacy_id <-> books.id, RPCs de leitura/progresso
-- e endurece grants sem expor catalogo global ou arquivos privados.

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_progress ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS legacy_id text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS segment text;

COMMENT ON COLUMN public.books.legacy_id IS
  'Identificador legado opcional usado pela plataforma web, por exemplo livro-005.';
COMMENT ON COLUMN public.books.category IS
  'Categoria editorial simples para apresentacao em Biblioteca.';
COMMENT ON COLUMN public.books.segment IS
  'Segmento/etapa editorial opcional para disponibilidade pedagogica.';

CREATE UNIQUE INDEX IF NOT EXISTS books_legacy_id_unique_idx
  ON public.books (lower(btrim(legacy_id)))
  WHERE legacy_id IS NOT NULL AND btrim(legacy_id) <> '';

CREATE INDEX IF NOT EXISTS books_active_school_year_idx
  ON public.books (ativo, ano_escolar);

CREATE UNIQUE INDEX IF NOT EXISTS book_progress_student_book_unique_idx
  ON public.book_progress (student_id, book_id);

CREATE INDEX IF NOT EXISTS book_progress_student_idx
  ON public.book_progress (student_id);

CREATE OR REPLACE FUNCTION public.current_student_library_enrollments()
RETURNS TABLE (
  student_id uuid,
  school_id uuid,
  class_id uuid,
  class_name text,
  school_year text,
  class_school_year text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT DISTINCT
    s.id AS student_id,
    e.school_id,
    e.class_id,
    c.nome::text AS class_name,
    e.school_year,
    c.ano_escolar::text AS class_school_year
  FROM public.students s
  JOIN public.enrollments e ON e.student_id = s.id
  LEFT JOIN public.classes c ON c.id = e.class_id
  WHERE auth.uid() IS NOT NULL
    AND s.user_id = auth.uid()
    AND coalesce(s.status, 'active') = 'active'
    AND e.status = 'active'
    AND e.ended_at IS NULL
    AND e.school_id IS NOT NULL
    AND e.class_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.student_can_read_library_book(p_book_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.books b
      JOIN public.current_student_library_enrollments() ce ON true
      WHERE b.id = p_book_id
        AND coalesce(b.ativo, false) = true
        AND (
          public.is_content_available_for_school(
            ce.school_id,
            'book',
            coalesce(nullif(btrim(b.legacy_id), ''), b.id::text)
          )
          OR public.is_content_available_for_school(
            ce.school_id,
            'book',
            b.id::text
          )
        )
        AND (
          b.ano_escolar IS NULL
          OR btrim(b.ano_escolar) = ''
          OR lower(btrim(b.ano_escolar)) = lower(btrim(coalesce(ce.class_school_year, ce.school_year, '')))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.student_get_library_books()
RETURNS TABLE (
  book_id uuid,
  legacy_id text,
  title text,
  description text,
  category text,
  segment text,
  school_year text,
  cover_url text,
  has_cover boolean,
  has_reading_asset boolean,
  current_page integer,
  percent_complete integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    b.id AS book_id,
    nullif(btrim(b.legacy_id), '') AS legacy_id,
    b.titulo::text AS title,
    b.descricao::text AS description,
    coalesce(nullif(btrim(b.category), ''), nullif(btrim(b.ano_escolar), ''), 'Biblioteca')::text AS category,
    nullif(btrim(b.segment), '') AS segment,
    b.ano_escolar::text AS school_year,
    nullif(btrim(b.capa_url), '') AS cover_url,
    nullif(btrim(b.capa_url), '') IS NOT NULL AS has_cover,
    nullif(btrim(b.pdf_url), '') IS NOT NULL AS has_reading_asset,
    coalesce(bp.current_page, 1) AS current_page,
    coalesce(bp.percent_complete, 0) AS percent_complete,
    bp.updated_at
  FROM public.books b
  JOIN public.current_student_library_enrollments() ce ON true
  LEFT JOIN public.book_progress bp
    ON bp.book_id = b.id
   AND bp.student_id = ce.student_id
  WHERE coalesce(b.ativo, false) = true
    AND (
      public.is_content_available_for_school(
        ce.school_id,
        'book',
        coalesce(nullif(btrim(b.legacy_id), ''), b.id::text)
      )
      OR public.is_content_available_for_school(
        ce.school_id,
        'book',
        b.id::text
      )
    )
    AND (
      b.ano_escolar IS NULL
      OR btrim(b.ano_escolar) = ''
      OR lower(btrim(b.ano_escolar)) = lower(btrim(coalesce(ce.class_school_year, ce.school_year, '')))
    )
  ORDER BY b.created_at DESC NULLS LAST, b.titulo ASC;
$$;

CREATE OR REPLACE FUNCTION public.student_get_library_book(p_book_id uuid)
RETURNS TABLE (
  book_id uuid,
  legacy_id text,
  title text,
  description text,
  category text,
  segment text,
  school_year text,
  cover_url text,
  has_cover boolean,
  has_reading_asset boolean,
  current_page integer,
  percent_complete integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT l.*
  FROM public.student_get_library_books() l
  WHERE l.book_id = p_book_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.student_upsert_book_progress(
  p_book_id uuid,
  p_current_page integer DEFAULT 1,
  p_percent_complete integer DEFAULT 0
)
RETURNS TABLE (
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

  INSERT INTO public.book_progress (student_id, book_id, current_page, percent_complete, updated_at)
  VALUES (v_student_id, p_book_id, v_page, v_percent, now())
  ON CONFLICT (student_id, book_id)
  DO UPDATE SET
    current_page = excluded.current_page,
    percent_complete = excluded.percent_complete,
    updated_at = now()
  RETURNING *
  INTO v_progress;

  RETURN QUERY
  SELECT
    v_progress.book_id,
    v_progress.current_page,
    v_progress.percent_complete,
    v_progress.updated_at;
END;
$$;

DROP POLICY IF EXISTS books_student_authorized_select
  ON public.books;
CREATE POLICY books_student_authorized_select
  ON public.books
  FOR SELECT
  TO authenticated
  USING (public.student_can_read_library_book(id));

DROP POLICY IF EXISTS book_progress_student_own_select
  ON public.book_progress;
CREATE POLICY book_progress_student_own_select
  ON public.book_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.current_student_library_enrollments() ce
      WHERE ce.student_id = book_progress.student_id
    )
  );

DROP POLICY IF EXISTS book_progress_student_own_insert
  ON public.book_progress;
CREATE POLICY book_progress_student_own_insert
  ON public.book_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.current_student_library_enrollments() ce
      WHERE ce.student_id = book_progress.student_id
    )
    AND public.student_can_read_library_book(book_id)
  );

DROP POLICY IF EXISTS book_progress_student_own_update
  ON public.book_progress;
CREATE POLICY book_progress_student_own_update
  ON public.book_progress
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.current_student_library_enrollments() ce
      WHERE ce.student_id = book_progress.student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.current_student_library_enrollments() ce
      WHERE ce.student_id = book_progress.student_id
    )
    AND public.student_can_read_library_book(book_id)
  );

REVOKE ALL ON TABLE public.books FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.book_progress FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.current_student_library_enrollments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_can_read_library_book(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_library_books() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_library_book(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_upsert_book_progress(uuid, integer, integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_student_library_enrollments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_library_book(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_library_books() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_library_book(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_upsert_book_progress(uuid, integer, integer) TO authenticated;
