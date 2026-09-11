-- Security Hardening V1 - Conteudo legado
--
-- Escopo: endurecer somente os catalogos legados public.books,
-- public.contents, public.activities e public.licenses.
-- A governanca canonica por escola permanece em school_content_availability.

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated users read xp_records" ON public.activities;

CREATE POLICY activities_authenticated_read_active
  ON public.activities
  FOR SELECT
  TO authenticated
  USING (COALESCE(ativa, false) = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.books FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.contents FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.activities FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.licenses FROM PUBLIC, anon, authenticated;

REVOKE SELECT ON TABLE public.books FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.contents FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.activities FROM PUBLIC, anon;
REVOKE SELECT ON TABLE public.licenses FROM PUBLIC, anon;

GRANT SELECT ON TABLE public.books TO authenticated;
GRANT SELECT ON TABLE public.contents TO authenticated;
GRANT SELECT ON TABLE public.activities TO authenticated;
GRANT SELECT ON TABLE public.licenses TO authenticated;
