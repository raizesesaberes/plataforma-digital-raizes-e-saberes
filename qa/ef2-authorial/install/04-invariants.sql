-- Run before/after; compare locally. Returns hashes/counts, no personal records.
BEGIN READ ONLY;
SELECT 'contracts' object,count(*) rows,md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) digest FROM public.contracts t
UNION ALL SELECT 'contract_products',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by contract_id,product_id)::text,'')) FROM public.contract_products t
UNION ALL SELECT 'entitlements',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) FROM public.tenant_product_entitlements t
UNION ALL SELECT 'exceptions',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) FROM public.content_access_exceptions t
UNION ALL SELECT 'shared_demo_source',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) FROM public.question_sources t WHERE id='f4039b27-3fe7-4446-94c4-66d9a31ddcb5'
UNION ALL SELECT 'shared_demo_license',count(*),md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) FROM public.question_licenses t WHERE id='00d2716c-942d-496f-ae49-aa4db37a5228'
UNION ALL SELECT 'EF5_questions',count(*),md5(coalesce(jsonb_agg(to_jsonb(q) order by q.id)::text,'')) FROM public.question_items q JOIN public.content_question_items a ON a.question_item_id=q.id JOIN public.content_items c ON c.id=a.content_item_id JOIN public.content_grades g ON g.id=c.grade_id WHERE g.code='5_ANO';
ROLLBACK;
