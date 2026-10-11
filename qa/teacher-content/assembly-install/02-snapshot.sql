BEGIN READ ONLY;
SELECT p.oid::regprocedure::text signature,pg_get_functiondef(p.oid) definition,p.proacl::text acl,p.proconfig,pg_get_userbyid(p.proowner) owner FROM pg_proc p WHERE p.oid IN ('public.avalia_plus_create_assessment_from_bank(jsonb)'::regprocedure,'public.avalia_plus_replace_assessment_items(uuid,jsonb)'::regprocedure);
ROLLBACK;
