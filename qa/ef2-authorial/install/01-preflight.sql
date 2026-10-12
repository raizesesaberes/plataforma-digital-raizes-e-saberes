-- READ ONLY; strict baseline BEFORE the two resolver patches and data batch.
BEGIN READ ONLY;
DO $$ BEGIN
 IF (SELECT count(*)<>157 OR max(version)<>'20261012173004' OR md5(string_agg(version||':'||coalesce(name,''),',' ORDER BY version))<>'b0566e64fedca9a16267505415c15050' FROM supabase_migrations.schema_migrations) THEN RAISE EXCEPTION 'EF2_LEDGER157_DRIFT_STOP';END IF;
 IF (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('school_category_private.authorized_items(jsonb,uuid)')) IS DISTINCT FROM '849f5ffcee863c786252c3a75ae2a15d' OR (SELECT md5(prosrc) FROM pg_proc WHERE oid=to_regprocedure('school_category_private.legacy_resolver(jsonb)')) IS DISTINCT FROM 'bf45a14cbcb7ed66b08049c1ef7a5e0b' THEN RAISE EXCEPTION 'EF2_BASELINE_FUNCTION_DRIFT';END IF;
END $$;
SELECT count(*) ledger_count,max(version) latest,md5(string_agg(version||':'||coalesce(name,''),',' ORDER BY version)) ledger_digest FROM supabase_migrations.schema_migrations;
SELECT p.oid::regprocedure signature,md5(prosrc) body_md5,proacl,proconfig,prosecdef,pg_get_userbyid(proowner) owner,pg_get_functiondef(p.oid) definition FROM pg_proc p WHERE p.oid IN(to_regprocedure('school_category_private.authorized_items(jsonb,uuid)'),to_regprocedure('school_category_private.legacy_resolver(jsonb)'));
ROLLBACK;
