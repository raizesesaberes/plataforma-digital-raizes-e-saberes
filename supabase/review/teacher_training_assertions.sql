-- Test-only assertions. MUST run inside a transaction ending in ROLLBACK.
-- No auth.users writes or sessions are created. Fixture changes are invisible
-- outside this transaction and the inactive-state fixtures also roll back in
-- their own nested subtransactions. No external side-effect triggers exist on
-- the touched tables at the preflight audit (2026-11-11).
create temporary table training_qa_results (test text primary key, passed boolean not null) on commit drop;

do $$
<<qa>>
declare admin_id uuid; teacher_id uuid; school_id uuid; student_id uuid;
  entitlement_id uuid; contract_id uuid; product_id uuid; module_id uuid;
  institutional_grade uuid; institutional_segment uuid; math_subject uuid;
  lesson_one uuid; lesson_two uuid; result jsonb; denied boolean;
begin
  if has_function_privilege('anon', 'public.teacher_training_catalog(uuid)', 'EXECUTE')
    or has_function_privilege('anon', 'public.teacher_training_authorize_lesson(uuid,uuid)', 'EXECUTE')
    or has_function_privilege('authenticated', 'public.teacher_training_asset_binding(uuid,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.teacher_training_asset_binding(uuid,text)', 'EXECUTE') then
    raise exception 'QA_UNEXPECTED_RPC_PERMISSION';
  end if;
  if has_schema_privilege('anon', 'teacher_training_private', 'USAGE')
    or has_schema_privilege('authenticated', 'teacher_training_private', 'USAGE') then
    raise exception 'QA_PRIVATE_SCHEMA_EXPOSED';
  end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='teacher_training_private' and c.relname in ('lessons','assets') and c.relrowsecurity) <> 2 then
    raise exception 'QA_RLS_MISSING';
  end if;
  insert into training_qa_results values ('private schema, RLS and function ACLs', true);

  select id into strict lesson_one from teacher_training_private.lessons where code='avalia-mais-matematica-1-ano-v1-u1-aula-1';
  select id into strict lesson_two from teacher_training_private.lessons where code='avalia-mais-matematica-1-ano-v1-u1-aula-2';
  select id into admin_id from public.profiles where status='active'
    and lower(platform_role) in ('admin','admin_ti','administrador','administrador_nacional') order by id limit 1;
  if admin_id is null then raise exception 'QA_EXISTING_ADMIN_REQUIRED'; end if;

  select t.profile_id, t.school_id, e.id, e.contract_id, e.product_id
  into teacher_id, school_id, entitlement_id, contract_id, product_id
  from public.teachers t join public.profiles p on p.id=t.profile_id and p.status='active' and lower(p.platform_role)='professor'
  join public.schools s on s.id=t.school_id and s.status='active'
  join public.tenants tn on tn.school_id=s.id and tn.tenant_type='SCHOOL' and tn.status='active'
  join public.tenant_product_entitlements e on e.tenant_id=tn.id and e.status='ACTIVE' and e.metadata->>'source'='school_content_category_v1'
  join public.contract_products cp on cp.contract_id=e.contract_id and cp.product_id=e.product_id and cp.status='active'
  join public.products pd on pd.id=e.product_id and pd.status='ACTIVE'
  join public.content_modules m on m.code='UNIVERSIDADE_CAPACITACAO' and m.status='active'
  join public.product_content_modules pcm on pcm.product_id=e.product_id and pcm.content_module_id=m.id
  join public.tenant_product_content_modules tm on tm.entitlement_id=e.id and tm.content_module_id=m.id
  where t.status='active' and school_category_private.school_contract(t.school_id,e.contract_id)
    and e.starts_at <= (now() at time zone 'America/Sao_Paulo')::date
    and (e.ends_at is null or e.ends_at >= (now() at time zone 'America/Sao_Paulo')::date)
    and exists (select 1 from public.school_memberships sm where sm.profile_id=t.profile_id and sm.school_id=t.school_id
      and sm.status='active' and sm.membership_role='professor' and sm.started_at<=now() and (sm.ended_at is null or sm.ended_at>now()))
  order by t.id,e.id limit 1;
  if teacher_id is null then raise exception 'QA_EXISTING_TEACHER_AND_ENTITLEMENT_REQUIRED'; end if;
  select id into student_id from public.profiles where status='active' and lower(platform_role) in ('aluno','student') order by id limit 1;
  if student_id is null then raise exception 'QA_EXISTING_STUDENT_REQUIRED'; end if;

  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  denied:=false;
  begin perform public.teacher_training_catalog(); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA_ANONYMOUS_ALLOWED'; end if;
  insert into training_qa_results values ('anonymous identity rejected', true);

  perform set_config('request.jwt.claim.sub',student_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',student_id,'role','authenticated','user_metadata',jsonb_build_object('platform_role','admin'))::text,true);
  denied:=false;
  begin perform public.teacher_training_catalog(); exception when insufficient_privilege then denied:=true; end;
  if not denied or public.teacher_training_authorize_lesson(lesson_one) then raise exception 'QA_STUDENT_OR_FORGED_ROLE_ALLOWED'; end if;
  insert into training_qa_results values ('student and forged metadata role rejected', true);

  perform set_config('request.jwt.claim.sub',teacher_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher_id,'role','authenticated')::text,true);
  result:=public.teacher_training_catalog(school_id);
  if result->>'access'<>'license_required' or jsonb_array_length(result->'lessons')<>0
    or public.teacher_training_authorize_lesson(lesson_one,school_id) then raise exception 'QA_UNLICENSED_TEACHER_ALLOWED'; end if;
  insert into training_qa_results values ('teacher without TRAINING license is locked with no metadata', true);
  denied:=false;
  begin perform public.teacher_training_catalog(gen_random_uuid()); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA_WRONG_SCHOOL_ALLOWED'; end if;
  insert into training_qa_results values ('wrong school context rejected', true);

  -- Each sentinel exception rolls back the UPDATE and all nested test writes.
  begin
    update public.profiles set status='inactive' where id=teacher_id;
    denied:=false;
    begin perform public.teacher_training_catalog(school_id); exception when insufficient_privilege then denied:=true; end;
    if not denied then raise exception 'QA_INACTIVE_PROFILE_ALLOWED'; end if;
    raise exception using errcode='ZT001',message='ROLLBACK_INACTIVE_PROFILE_FIXTURE';
  exception when sqlstate 'ZT001' then null;
  end;
  insert into training_qa_results values ('inactive profile rejected', true);
  begin
    update public.school_memberships sm set status='inactive' where sm.profile_id=qa.teacher_id and sm.school_id=qa.school_id;
    denied:=false;
    begin perform public.teacher_training_catalog(school_id); exception when insufficient_privilege then denied:=true; end;
    if not denied then raise exception 'QA_INACTIVE_MEMBERSHIP_ALLOWED'; end if;
    raise exception using errcode='ZT002',message='ROLLBACK_INACTIVE_MEMBERSHIP_FIXTURE';
  exception when sqlstate 'ZT002' then null;
  end;
  insert into training_qa_results values ('inactive school membership rejected', true);

  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  result:=public.teacher_training_catalog();
  if result->>'actor'<>'admin' or jsonb_array_length(result->'lessons')<>2
    or not public.teacher_training_authorize_lesson(lesson_one) or not public.teacher_training_authorize_lesson(lesson_two)
    or not exists(select 1 from jsonb_array_elements(result->'lessons') x where x->>'id'=lesson_two::text and x->>'status'='review') then
    raise exception 'QA_ADMIN_REVIEW_CATALOG_FAILED';
  end if;
  if result::text ~ 'storage_path|signedUrl|sha256|"bucket"|formacao/' then raise exception 'QA_CATALOG_PATH_LEAK'; end if;
  if exists(select 1 from jsonb_array_elements(result->'lessons') x where x->>'canPlay'<>'true' or x->'availableKinds'<>'["video"]'::jsonb) then
    raise exception 'QA_VERIFIED_MEDIA_NOT_READY';
  end if;
  insert into training_qa_results values ('active admin sees two ready lessons, including review, without paths', true);

  -- Temporary positive-license fixture. It must NEVER be run with COMMIT.
  select id into strict module_id from public.content_modules where code='UNIVERSIDADE_CAPACITACAO';
  select grade_id,segment_id into strict institutional_grade,institutional_segment from school_category_private.taxonomy()
    where institutional and grade_code='UNIVERSIDADE_CAPACITACAO';
  select id into strict math_subject from public.content_subjects where code='MATEMATICA' and status='active';
  update public.contract_products cp set metadata = cp.metadata || jsonb_build_object(
    'institutional_training_authorized',true,
    'authorized_grade_ids',coalesce(cp.metadata->'authorized_grade_ids','[]'::jsonb)||jsonb_build_array(institutional_grade::text)
  ) || case when cp.metadata ? 'authorized_subject_ids' then jsonb_build_object(
    'authorized_subject_ids',cp.metadata->'authorized_subject_ids'||jsonb_build_array(math_subject::text)) else '{}'::jsonb end
  where cp.contract_id=qa.contract_id and cp.product_id=qa.product_id;
  update public.tenant_product_entitlements e set
    grade_ids = array_append(e.grade_ids,institutional_grade), segment_ids = array_append(e.segment_ids,institutional_segment),
    metadata = jsonb_set(e.metadata,'{category_rules}',coalesce(e.metadata->'category_rules','[]'::jsonb)||jsonb_build_array(
      jsonb_build_object('kind','STANDARD','grade_id',institutional_grade,'module_id',module_id,'subject_id',math_subject,'content_type','TRAINING')))
  where e.id=entitlement_id;
  update public.tenant_product_content_modules tm set enabled=true where tm.entitlement_id=qa.entitlement_id and tm.content_module_id=qa.module_id;

  perform set_config('request.jwt.claim.sub',teacher_id::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher_id,'role','authenticated')::text,true);
  result:=public.teacher_training_catalog(school_id);
  if result->>'access'<>'available' or jsonb_array_length(result->'lessons')<>1
    or result->'lessons'->0->>'id'<>lesson_one::text
    or not public.teacher_training_authorize_lesson(lesson_one,school_id)
    or public.teacher_training_authorize_lesson(lesson_two,school_id) then raise exception 'QA_LICENSED_TEACHER_VISIBILITY_FAILED'; end if;
  insert into training_qa_results values ('licensed teacher sees published Aula 1, not pending Aula 2', true);

  update public.tenant_product_content_modules tm set enabled=false where tm.entitlement_id=qa.entitlement_id and tm.content_module_id=qa.module_id;
  if public.teacher_training_authorize_lesson(lesson_one,school_id) then raise exception 'QA_LICENSE_REVOCATION_IGNORED'; end if;
  insert into training_qa_results values ('module revocation blocks next access immediately', true);
end;
$$;

-- Exercise actual execution privilege failures under the browser roles.
set local role authenticated;
do $$
declare denied boolean:=false;
begin
  begin perform public.teacher_training_asset_binding('00000000-0000-4000-8000-000000000000'::uuid,'video');
  exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA_AUTHENTICATED_PATH_RPC_ALLOWED'; end if;
  denied:=false;
  begin perform 1 from teacher_training_private.lessons; exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA_PRIVATE_TABLE_ALLOWED'; end if;
end;
$$;
reset role;
insert into training_qa_results values ('authenticated path RPC and direct private table access rejected',true);

set local role anon;
do $$
declare denied boolean:=false;
begin
  begin perform public.teacher_training_catalog(); exception when insufficient_privilege then denied:=true; end;
  if not denied then raise exception 'QA_ANON_CATALOG_RPC_ALLOWED'; end if;
end;
$$;
reset role;
insert into training_qa_results values ('anonymous catalog RPC execution rejected',true);
select jsonb_agg(to_jsonb(t) order by test) as training_qa_results from training_qa_results t;
