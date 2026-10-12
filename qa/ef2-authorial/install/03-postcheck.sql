BEGIN READ ONLY;
SELECT count(*) ledger_count,max(version) latest FROM supabase_migrations.schema_migrations;
SELECT event_type,count(*) FROM public.content_editorial_events WHERE event_type IN('EF2_AUTHORIAL_ITEM_RECONCILED','EF2_AUTHORIAL_BATCH_COMPLETED') GROUP BY event_type;
SELECT details FROM public.content_editorial_events WHERE event_type='EF2_AUTHORIAL_BATCH_COMPLETED';
SELECT g.code, count(*) FROM public.content_items c JOIN public.content_grades g ON g.id=c.grade_id JOIN public.content_question_items a ON a.content_item_id=c.id JOIN public.question_items q ON q.id=a.question_item_id WHERE c.content_type='QUESTION' AND c.editorial_status='PUBLISHED' AND q.publication_status='PUBLICADO' AND q.curation_status='APROVADO' GROUP BY g.code;
SELECT p.oid::regprocedure signature,md5(prosrc) body_md5,proacl,proconfig,prosecdef,pg_get_userbyid(proowner) owner FROM pg_proc p WHERE p.oid IN(to_regprocedure('school_category_private.authorized_items(jsonb,uuid)'),to_regprocedure('school_category_private.legacy_resolver(jsonb)'));
-- School / active EF2 class-membership counts only; no teacher names or student data.
SELECT s.id school_id,s.status,count(DISTINCT c.id) active_ef2_classes,count(DISTINCT t.id) linked_active_teachers
FROM public.schools s LEFT JOIN public.classes c ON c.school_id=s.id AND c.status='active' AND EXISTS(SELECT 1 FROM public.content_grade_aliases a JOIN public.content_grades g ON g.id=a.grade_id WHERE g.code='2_ANO' AND a.alias_code IN(public.rs_content_normalize_code(c.ano_escolar),public.rs_content_normalize_code(c.school_year)))
LEFT JOIN public.class_teacher_memberships m ON m.class_id=c.id AND m.ended_at IS NULL
LEFT JOIN public.teachers t ON t.id=m.teacher_id AND t.status='active'
WHERE s.id IN('11111111-1111-1111-1111-111111111111','b0a57810-342b-4c83-b8dd-453f3e1688b0') GROUP BY s.id,s.status;
ROLLBACK;
