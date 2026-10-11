-- REVIEW PROPOSAL: catalog only. Not a migration until an official CLI version
-- is assigned and the exact package is reviewed. No grants, ACL or resolver edits.
BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.products,public.content_modules,public.product_content_modules IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.contracts,public.contract_products,public.tenant_product_entitlements,public.tenant_product_content_modules,public.contract_entitlement_events IN SHARE MODE;
DO $catalog$
DECLARE pid uuid; mid uuid; row record; wanted public.rs_content_type[];
  marker constant jsonb := '{"source":"banco_completo_catalog_v1","scope":"catalog_only_no_grants"}';
BEGIN
  IF (SELECT count(*) FROM school_category_private.taxonomy() WHERE institutional AND grade_code='UNIVERSIDADE_CAPACITACAO')<>1
    OR (SELECT count(*) FROM school_category_private.taxonomy() WHERE NOT institutional)<>16 THEN
    RAISE EXCEPTION 'CATALOG_TAXONOMY_REVIEW_REQUIRED';
  END IF;
  FOR row IN SELECT * FROM (VALUES
    ('BANCO_QUESTOES',ARRAY['QUESTION']),('AVALIACOES_PROVAS',ARRAY['ASSESSMENT_TEMPLATE']),
    ('BIBLIOTECA_LIVROS',ARRAY['BOOK','BOOK_PAGE']),('ATIVIDADES',ARRAY['ACTIVITY','PRINTABLE']),
    ('VIDEOS',ARRAY['VIDEO']),('JOGOS_INTERACOES',ARRAY['GAME','INTERACTION'])
  ) expected(code,types) LOOP
    IF NOT EXISTS(SELECT 1 FROM public.content_modules m WHERE m.code=row.code AND m.status='active'
      AND m.content_types::text[] @> row.types AND m.content_types::text[] <@ row.types
      AND cardinality(m.content_types)=cardinality(row.types)) THEN
      RAISE EXCEPTION 'CATALOG_MODULE_REVIEW_REQUIRED: %',row.code;
    END IF;
  END LOOP;
  SELECT id INTO pid FROM public.products WHERE code='RS_BANCO_COMPLETO';
  IF pid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.products WHERE id=pid
    AND name='Raízes e Saberes — Banco Completo' AND status='ACTIVE' AND metadata=marker) THEN
    RAISE EXCEPTION 'CATALOG_PRODUCT_COLLISION';
  END IF;
  IF EXISTS(SELECT 1 FROM public.products WHERE name='Raízes e Saberes — Banco Completo' AND code<>'RS_BANCO_COMPLETO') THEN
    RAISE EXCEPTION 'CATALOG_PRODUCT_NAME_COLLISION';
  END IF;
  IF pid IS NOT NULL AND (EXISTS(SELECT 1 FROM public.contract_products WHERE product_id=pid)
    OR EXISTS(SELECT 1 FROM public.tenant_product_entitlements WHERE product_id=pid)
    OR EXISTS(SELECT 1 FROM public.product_collections WHERE product_id=pid)
    OR EXISTS(SELECT 1 FROM public.product_platform_modules WHERE product_id=pid)) THEN
    RAISE EXCEPTION 'CATALOG_PRODUCT_ALREADY_IN_USE';
  END IF;
  SELECT id INTO mid FROM public.content_modules WHERE code='UNIVERSIDADE_CAPACITACAO';
  IF EXISTS(SELECT 1 FROM public.content_modules WHERE name='Universidade / capacitação' AND code<>'UNIVERSIDADE_CAPACITACAO') THEN
    RAISE EXCEPTION 'CATALOG_TRAINING_NAME_COLLISION';
  END IF;
  IF mid IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.content_modules WHERE id=mid
    AND name='Universidade / capacitação' AND status='active' AND content_types=ARRAY['TRAINING']::public.rs_content_type[] AND metadata=marker) THEN
    RAISE EXCEPTION 'CATALOG_TRAINING_COLLISION';
  END IF;
  IF EXISTS(SELECT 1 FROM public.content_modules WHERE 'TRAINING'=ANY(content_types) AND id IS DISTINCT FROM mid) THEN
    RAISE EXCEPTION 'CATALOG_EXISTING_TRAINING_REQUIRES_REVIEW';
  END IF;
  IF mid IS NOT NULL AND EXISTS(SELECT 1 FROM public.product_content_modules WHERE content_module_id=mid AND product_id IS DISTINCT FROM pid) THEN
    RAISE EXCEPTION 'CATALOG_TRAINING_ALREADY_SHARED';
  END IF;
  IF pid IS NULL THEN
    INSERT INTO public.products(code,name,status,metadata)
    VALUES('RS_BANCO_COMPLETO','Raízes e Saberes — Banco Completo','ACTIVE',marker) RETURNING id INTO pid;
  END IF;
  IF mid IS NULL THEN
    INSERT INTO public.content_modules(code,name,content_types,status,metadata)
    VALUES('UNIVERSIDADE_CAPACITACAO','Universidade / capacitação',ARRAY['TRAINING']::public.rs_content_type[],'active',marker) RETURNING id INTO mid;
  END IF;
  IF EXISTS(SELECT 1 FROM public.product_content_modules pm JOIN public.content_modules m ON m.id=pm.content_module_id WHERE pm.product_id=pid
    AND (m.code NOT IN ('BANCO_QUESTOES','AVALIACOES_PROVAS','BIBLIOTECA_LIVROS','ATIVIDADES','VIDEOS','JOGOS_INTERACOES','UNIVERSIDADE_CAPACITACAO')
      OR pm.requirement_level::text<>'REQUIRED' OR pm.metadata<>marker)) THEN
    RAISE EXCEPTION 'CATALOG_ASSOCIATION_COLLISION';
  END IF;
  INSERT INTO public.product_content_modules(product_id,content_module_id,requirement_level,metadata)
  SELECT pid,id,'REQUIRED',marker FROM public.content_modules
  WHERE code IN ('BANCO_QUESTOES','AVALIACOES_PROVAS','BIBLIOTECA_LIVROS','ATIVIDADES','VIDEOS','JOGOS_INTERACOES','UNIVERSIDADE_CAPACITACAO')
  ON CONFLICT (product_id,content_module_id) DO NOTHING;
  IF (SELECT count(*) FROM public.product_content_modules WHERE product_id=pid)<>7 THEN RAISE EXCEPTION 'CATALOG_ASSOCIATION_COUNT';END IF;
END $catalog$;
COMMIT;
