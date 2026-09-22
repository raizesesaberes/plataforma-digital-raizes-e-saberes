-- Biblioteca V1 - contrato local para entrega privada de arquivo.
-- Prepara metadados canonicos de assets e RPC de autorizacao server-side.
-- Nao cria bucket publico, nao persiste signed URL e nao corrige legados.

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS cover_asset_bucket text,
  ADD COLUMN IF NOT EXISTS cover_asset_path text,
  ADD COLUMN IF NOT EXISTS reading_asset_bucket text,
  ADD COLUMN IF NOT EXISTS reading_asset_path text,
  ADD COLUMN IF NOT EXISTS reading_asset_kind text,
  ADD COLUMN IF NOT EXISTS reading_asset_mime_type text;

COMMENT ON COLUMN public.books.cover_asset_bucket IS
  'Bucket privado opcional da capa canonica do livro.';
COMMENT ON COLUMN public.books.cover_asset_path IS
  'Path privado opcional da capa canonica do livro.';
COMMENT ON COLUMN public.books.reading_asset_bucket IS
  'Bucket privado do conteudo principal de leitura.';
COMMENT ON COLUMN public.books.reading_asset_path IS
  'Path privado do conteudo principal de leitura, derivado server-side.';
COMMENT ON COLUMN public.books.reading_asset_kind IS
  'Tipo do asset de leitura: pdf, paged_images ou outro formato homologado.';
COMMENT ON COLUMN public.books.reading_asset_mime_type IS
  'MIME type esperado do asset principal de leitura.';

ALTER TABLE public.books
  DROP CONSTRAINT IF EXISTS books_reading_asset_kind_check;

ALTER TABLE public.books
  ADD CONSTRAINT books_reading_asset_kind_check
  CHECK (
    reading_asset_kind IS NULL
    OR reading_asset_kind = ANY (ARRAY['pdf'::text, 'paged_images'::text])
  );

CREATE INDEX IF NOT EXISTS books_reading_asset_idx
  ON public.books (reading_asset_bucket, reading_asset_path)
  WHERE reading_asset_bucket IS NOT NULL
    AND btrim(reading_asset_bucket) <> ''
    AND reading_asset_path IS NOT NULL
    AND btrim(reading_asset_path) <> '';

CREATE OR REPLACE FUNCTION public.student_get_library_read_asset(p_book_id uuid)
RETURNS TABLE (
  book_id uuid,
  legacy_id text,
  title text,
  asset_kind text,
  asset_bucket text,
  asset_path text,
  mime_type text,
  expires_in_seconds integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_book public.books;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  IF NOT public.student_can_read_library_book(p_book_id) THEN
    RAISE EXCEPTION 'Livro nao autorizado para este aluno.' USING errcode = '42501';
  END IF;

  SELECT *
    INTO v_book
  FROM public.books b
  WHERE b.id = p_book_id
    AND coalesce(b.ativo, false) = true
  LIMIT 1;

  IF v_book.id IS NULL THEN
    RAISE EXCEPTION 'Livro nao encontrado.' USING errcode = 'P0002';
  END IF;

  IF nullif(btrim(v_book.reading_asset_bucket), '') IS NULL
     OR nullif(btrim(v_book.reading_asset_path), '') IS NULL THEN
    RAISE EXCEPTION 'Asset de leitura nao configurado.' USING errcode = 'P0002';
  END IF;

  RETURN QUERY
  SELECT
    v_book.id AS book_id,
    nullif(btrim(v_book.legacy_id), '') AS legacy_id,
    v_book.titulo::text AS title,
    coalesce(nullif(btrim(v_book.reading_asset_kind), ''), 'pdf')::text AS asset_kind,
    btrim(v_book.reading_asset_bucket)::text AS asset_bucket,
    btrim(v_book.reading_asset_path)::text AS asset_path,
    coalesce(nullif(btrim(v_book.reading_asset_mime_type), ''), 'application/pdf')::text AS mime_type,
    300 AS expires_in_seconds;
END;
$$;

REVOKE ALL ON FUNCTION public.student_get_library_read_asset(uuid)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.student_get_library_read_asset(uuid)
  TO authenticated;
