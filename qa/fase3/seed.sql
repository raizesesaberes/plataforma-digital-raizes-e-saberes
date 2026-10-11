-- Only fictional identities and two schools, inside the disposable test container.
insert into auth.users(id) select ('00000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid from generate_series(1,6) n;
insert into public.profiles(id, display_name, platform_role) select id, 'SYNTHETIC ' || right(id::text,1), case right(id::text,1) when '1' then 'professor' when '2' then 'aluno' when '3' then 'secretaria' when '4' then 'professor' when '5' then 'aluno' else 'familia' end from auth.users;
insert into public.users(id,nome,perfil) select id,display_name,platform_role from public.profiles;
insert into public.schools(id,nome) values ('10000000-0000-0000-0000-000000000001','SYNTHETIC SCHOOL A'),('10000000-0000-0000-0000-000000000002','SYNTHETIC SCHOOL B');
insert into public.teachers(id,user_id,profile_id,school_id) values
('20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),
('20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000002');
insert into public.classes(id,school_id,teacher_id,nome,school_year,ano_escolar) select ('30000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid, ('10000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid, ('20000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid, 'SYNTHETIC CLASS ' || n, '5', '5' from generate_series(1,2) n;
insert into public.class_teacher_memberships(class_id,teacher_id) select id,teacher_id from public.classes;
insert into public.school_memberships(school_id,profile_id,membership_role) select school_id,profile_id,'professor' from public.teachers;
insert into public.school_memberships(school_id,profile_id,membership_role) values('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','secretaria');
insert into public.students(id,user_id,school_id,class_id,nome,status) values
('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-000000000001','SYNTHETIC STUDENT A','active'),
('40000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000002','30000000-0000-0000-0000-000000000002','SYNTHETIC STUDENT B','active');
insert into public.enrollments(student_id,class_id,school_id,school_year) select id,class_id,school_id,'2026' from public.students;
insert into public.question_licenses(id,name,license_type,legal_notes,publication_allowed,allows_commercial_use) values('50000000-0000-0000-0000-000000000001','Synthetic license','autoral','Fictional fixture',true,true);
insert into public.question_sources(id,name,source_type,license_id,legal_status,curation_status) values('60000000-0000-0000-0000-000000000001','Synthetic source','autoral','50000000-0000-0000-0000-000000000001','authorized','APROVADO');
insert into public.question_items(id,code,internal_title,component,stage,school_year,question_type,statement,correct_answer,source_id,author_name,license_id,legal_classification,curation_status,publication_status,workflow_status) values('70000000-0000-0000-0000-000000000001','FASE3-SYNTHETIC-001','Synthetic arithmetic','Matemática','Ensino Fundamental','5','multipla_escolha','Quanto é 1 + 1?','B','60000000-0000-0000-0000-000000000001','Synthetic author','50000000-0000-0000-0000-000000000001','ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB','APROVADO','PUBLICADO','APROVADO');
insert into public.question_alternatives(id,question_id,label,body,is_correct,position) values
('80000000-0000-0000-0000-000000000001','70000000-0000-0000-0000-000000000001','A','1',false,1),
('80000000-0000-0000-0000-000000000002','70000000-0000-0000-0000-000000000001','B','2',true,2);
-- Minimal synthetic authorization context; no FASE2 operational code is loaded.
do $$
declare grade uuid;segment uuid;tenant uuid;product uuid;contract uuid;module uuid;item uuid;
begin
 select g.id,g.segment_id into strict grade,segment from public.content_grades g join public.content_segments s on s.id=g.segment_id where g.code='5_ANO' and s.code='FUNDAMENTAL';
 update public.classes set school_year='5_ANO',ano_escolar='5_ANO';
 insert into public.tenants(tenant_type,school_id,metadata) values('SCHOOL','10000000-0000-0000-0000-000000000001','{"category_entitlements_enabled":true}') returning id into tenant;
 insert into public.tenants(tenant_type,school_id,metadata) values('SCHOOL','10000000-0000-0000-0000-000000000002','{"category_entitlements_enabled":true}');
 insert into public.products(code,name,status) values('FASE3_SYNTHETIC','Synthetic product','ACTIVE') returning id into product;
 insert into public.contracts(tenant_id,contract_ref,starts_at,status) values(tenant,'FASE3_SYNTHETIC',current_date-1,'ACTIVE') returning id into contract;
 insert into public.contract_products(contract_id,product_id,metadata) values(contract,product,jsonb_build_object('authorized_grade_ids',jsonb_build_array(grade)));
 insert into public.content_modules(code,name,content_types) values('FASE3_SYNTHETIC','Synthetic questions',array['QUESTION']::public.rs_content_type[]) returning id into module;
 insert into public.product_content_modules(product_id,content_module_id) values(product,module);
 insert into public.tenant_product_entitlements(contract_id,tenant_id,product_id,starts_at,grade_ids,metadata) values(contract,tenant,product,current_date-1,array[grade],jsonb_build_object('source','school_content_category_v1','category_rules',jsonb_build_array(jsonb_build_object('module_id',module,'content_type','QUESTION','grade_id',grade,'kind','STANDARD'))));
 insert into public.content_items(content_type,segment_id,grade_id,title,editorial_status,published_at) values('QUESTION',segment,grade,'Synthetic arithmetic','PUBLISHED',now()) returning id into item;
 insert into public.content_question_items(content_item_id,question_item_id) values(item,'70000000-0000-0000-0000-000000000001');
end $$;
