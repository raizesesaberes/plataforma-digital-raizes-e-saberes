-- READ ONLY. Record and inspect; do not interpret version availability as reservation.
BEGIN READ ONLY;
SELECT count(*) AS migration_count,max(version) AS latest_version,
 md5(string_agg(version||':'||coalesce(name,''),E'\n' ORDER BY version)) AS ledger_hash
FROM supabase_migrations.schema_migrations;
SELECT id,code,name,status,content_types,metadata FROM public.content_modules
WHERE code IN ('BANCO_QUESTOES','AVALIACOES_PROVAS','BIBLIOTECA_LIVROS','ATIVIDADES','VIDEOS','JOGOS_INTERACOES','UNIVERSIDADE_CAPACITACAO')
 OR 'TRAINING'=ANY(content_types) OR name='Universidade / capacitação' ORDER BY code;
SELECT id,code,name,status,metadata FROM public.products
WHERE code='RS_BANCO_COMPLETO' OR name='Raízes e Saberes — Banco Completo';
SELECT p.code,m.code AS module_code,pm.requirement_level,pm.metadata FROM public.product_content_modules pm
JOIN public.products p ON p.id=pm.product_id JOIN public.content_modules m ON m.id=pm.content_module_id
WHERE p.code IN ('RS_BANCO_COMPLETO','RS_HOMOLOGACAO_FUNDAMENTAL') ORDER BY p.code,m.code;
SELECT p.code,
 (SELECT count(*) FROM public.contract_products c WHERE c.product_id=p.id) AS contracted,
 (SELECT count(*) FROM public.tenant_product_entitlements e WHERE e.product_id=p.id) AS entitlements
FROM public.products p WHERE p.code IN ('RS_BANCO_COMPLETO','RS_HOMOLOGACAO_FUNDAMENTAL');
SELECT institutional,count(*) FROM school_category_private.taxonomy() GROUP BY institutional;
-- Inspect trigger bodies too if any new trigger appears; no trigger is bypassed.
SELECT t.tgrelid::regclass AS relation,t.tgname,t.tgenabled,pg_get_triggerdef(t.oid),
 pg_get_functiondef(t.tgfoid) FROM pg_trigger t WHERE NOT t.tgisinternal
 AND t.tgrelid IN ('public.products'::regclass,'public.content_modules'::regclass,'public.product_content_modules'::regclass)
ORDER BY 1,2;
ROLLBACK;
