-- RS-SCHOOL-TEMPLATE V1 - Hardening do helper interno de vinculos do Diario.
-- class_diary_apply_activity_links e chamado apenas por teacher_upsert_class_diary_entry.

BEGIN;

REVOKE ALL ON FUNCTION public.class_diary_apply_activity_links(uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.class_diary_apply_activity_links(uuid, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.class_diary_apply_activity_links(uuid, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION public.class_diary_apply_activity_links(uuid, jsonb) FROM service_role;

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.class_diary_apply_activity_links(uuid, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: anon ainda executa class_diary_apply_activity_links';
  END IF;

  IF has_function_privilege('authenticated', 'public.class_diary_apply_activity_links(uuid, jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'VALIDACAO bloqueada: authenticated ainda executa class_diary_apply_activity_links';
  END IF;
END $$;

COMMIT;
