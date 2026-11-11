-- REVIEW BEFORE RUNNING: temporary migration plus adversarial checks.
-- One transaction; all fixture/schema/publication writes ROLLBACK. Never COMMIT.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '90s';
create temp table training_access_before as select 'profiles' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.profiles t
union all
select 'teachers' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.teachers t
union all
select 'schools' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.schools t
union all
select 'school_memberships' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.school_memberships t
union all
select 'contracts' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.contracts t
union all
select 'contract_products' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.contract_products t
union all
select 'tenant_product_entitlements' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.tenant_product_entitlements t
union all
select 'tenant_product_content_modules' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.tenant_product_content_modules t;
-- Reuse active platform teacher authorization. No additional login/license.
-- Existing private media and five-minute signatures remain unchanged.

create or replace function teacher_training_private.actor_context(p_school_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); role_name text; sid uuid;
begin
  if uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  select lower(p.platform_role) into role_name from public.profiles p
    where p.id = uid and p.status = 'active';
  if role_name is null then raise exception 'ACTIVE_PROFILE_REQUIRED' using errcode = '42501'; end if;
  if role_name in ('admin', 'admin_ti', 'administrador', 'administrador_nacional') then
    return jsonb_build_object('actor', 'admin', 'school_id', null);
  end if;
  if role_name <> 'professor' then raise exception 'TEACHER_REQUIRED' using errcode = '42501'; end if;
  select t.school_id into sid
  from public.teachers t
  join public.schools s on s.id = t.school_id and s.status = 'active'
  where t.profile_id = uid and t.status = 'active'
    and (p_school_id is null or t.school_id = p_school_id)
    and exists (
      select 1 from public.school_memberships m
      where m.profile_id = uid and m.school_id = t.school_id
        and m.membership_role = 'professor' and m.status = 'active'
        and m.started_at <= now() and (m.ended_at is null or m.ended_at > now())
    )
  order by t.created_at desc nulls last, t.id limit 1;
  if sid is null then raise exception 'ACTIVE_TEACHER_MEMBERSHIP_REQUIRED' using errcode = '42501'; end if;
  return jsonb_build_object('actor', 'teacher', 'school_id', sid);
end;
$$;

-- Keep canonical publication, ownership isolation and active school/tenant
-- BLOCK/EMBARGO decisions, without requiring a separate TRAINING contract.
create function teacher_training_private.visible_to_teacher(p_item uuid, p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.content_items ci
    where ci.id = p_item and ci.content_type = 'TRAINING'
      and ci.editorial_status = 'PUBLISHED'
      and ci.published_at is not null and ci.published_at <= now()
      and ci.metadata->>'category_mode' = 'INSTITUTIONAL'
      and (ci.subject_id is null or exists (
        select 1 from public.content_subjects s where s.id = ci.subject_id and s.status = 'active'))
      and (ci.owner_scope = 'GLOBAL_RAIZES'
        or (ci.owner_scope in ('SCHOOL', 'NETWORK') and ci.owner_tenant_id in (
          select school_category_private.scope_tenants(p_school)))
        or (ci.owner_scope = 'TEACHER' and ci.owner_user_id = auth.uid()))
      and not exists (
        select 1 from public.content_access_exceptions b
        where b.content_item_id = ci.id and b.action in ('BLOCK', 'EMBARGO')
          and (b.school_id = p_school or b.tenant_id in (
            select school_category_private.scope_tenants(p_school)))
          and (b.starts_at is null or b.starts_at <= now())
          and (b.ends_at is null or b.ends_at >= now())
      )
  );
$$;
revoke all on function teacher_training_private.visible_to_teacher(uuid, uuid) from public, anon, authenticated;


create or replace function public.teacher_training_catalog(p_school_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare context jsonb; lessons jsonb; is_admin boolean;
begin
  context := teacher_training_private.actor_context(p_school_id);
  is_admin := context->>'actor' = 'admin';
  with visible as (
    select l.* from teacher_training_private.lessons l
    where (is_admin and l.status in ('draft', 'review', 'published'))
      or (not is_admin and l.status = 'published'
        and teacher_training_private.visible_to_teacher(l.content_item_id, (context->>'school_id')::uuid))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', l.id, 'title', l.title, 'description', l.description,
    'lessonNumber', l.lesson_number, 'status', l.status,
    'hierarchy', jsonb_build_object('collection', l.collection, 'subject', l.subject,
      'schoolYear', l.school_year, 'volume', l.volume, 'unit', l.unit, 'unitTitle', l.unit_title),
    'availableKinds', coalesce(a.kinds, '[]'::jsonb),
    'canPlay', coalesce(a.total, 0) > 0, 'durationSeconds', a.duration
  ) order by l.collection_code, l.subject_code, l.school_year_code, l.volume, l.unit, l.lesson_number), '[]'::jsonb)
  into lessons from visible l
  left join lateral (
    select jsonb_agg(x.kind order by x.kind) kinds, count(*) total,
      max(x.duration_seconds) filter (where x.kind = 'video') duration
    from teacher_training_private.ready_assets(l.id) x
  ) a on true;
  return jsonb_build_object('ok', true, 'actor', context->>'actor', 'schoolId', context->>'school_id',
    'access', 'available', 'lessons', lessons);
end;
$$;

create or replace function public.teacher_training_authorize_lesson(p_lesson_id uuid, p_school_id uuid default null)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare context jsonb; lesson teacher_training_private.lessons%rowtype;
begin
  context := teacher_training_private.actor_context(p_school_id);
  select * into lesson from teacher_training_private.lessons where id = p_lesson_id;
  if not found or lesson.status = 'archived' then return false; end if;
  if context->>'actor' = 'admin' then return lesson.status in ('draft', 'review', 'published'); end if;
  return lesson.status = 'published'
    and teacher_training_private.visible_to_teacher(lesson.content_item_id, (context->>'school_id')::uuid);
exception when insufficient_privilege then return false;
end;
$$;

-- Requested release of Aula 2. Publication is NOT a claim of pedagogical QA.
-- Do not touch readiness, storage, contracts or entitlement/module switches.
do $$
begin
  if (select count(*) from teacher_training_private.lessons
      where code = 'avalia-mais-matematica-1-ano-v1-u1-aula-2' and status = 'review') <> 1 then
    raise exception 'EXPECTED_AULA_2_REVIEW_BASELINE';
  end if;
  update public.content_items ci set editorial_status = 'PUBLISHED', published_at = now(), updated_at = now()
    from teacher_training_private.lessons l
    where l.content_item_id = ci.id and l.code = 'avalia-mais-matematica-1-ano-v1-u1-aula-2';
  update teacher_training_private.lessons set status = 'published', updated_at = now()
    where code = 'avalia-mais-matematica-1-ano-v1-u1-aula-2';
end;
$$;

-- Education-infantil is a family/student role, not an educator role.
-- Keep every other professional role and the exact same owner restriction.
alter policy personal_learning_courses_read_own on public.personal_learning_courses
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active'
  and p.platform_role in ('professor','coordenador','gestor','admin','admin_ti','administrador','administrador_nacional')
));
alter policy personal_learning_certificates_read_own on public.personal_learning_certificates
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active'
  and p.platform_role in ('professor','coordenador','gestor','admin','admin_ti','administrador','administrador_nacional')
));


create temp table training_platform_results (test text, passed boolean);
do $$
<<qa>>
declare tid uuid; sid uuid; aid uuid; outsider uuid; l1 uuid; l2 uuid; ci uuid; result jsonb; denied boolean; candidate record;
begin
 select l.id,l.content_item_id into strict l1,ci from teacher_training_private.lessons l where code='avalia-mais-matematica-1-ano-v1-u1-aula-1';
 select id into strict l2 from teacher_training_private.lessons where code='avalia-mais-matematica-1-ano-v1-u1-aula-2';
 select p.id into strict aid from public.profiles p where p.status='active' and p.platform_role='admin' limit 1;
 select t.profile_id,t.school_id into tid,sid from public.teachers t
 join public.profiles p on p.id=t.profile_id and p.status='active' and p.platform_role='professor'
 join public.schools s on s.id=t.school_id and s.status='active'
 join public.school_memberships sm on sm.profile_id=t.profile_id and sm.school_id=t.school_id
 and sm.membership_role='professor' and sm.status='active' and sm.started_at<=now() and (sm.ended_at is null or sm.ended_at>now())
 where t.status='active' order by t.id limit 1;
 if tid is null then raise exception 'EXISTING_ACTIVE_TEACHER_REQUIRED'; end if;
 -- Real baseline has zero enabled TRAINING modules. No license fixture changes.
 if exists(select 1 from public.tenant_product_content_modules tm join public.content_modules m on m.id=tm.content_module_id where m.code='UNIVERSIDADE_CAPACITACAO' and tm.enabled) then
 raise exception 'EXPECTED_DISABLED_TRAINING_BASELINE'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 perform set_config('request.jwt.claims','{}',true);
 denied:=false;
 begin perform public.teacher_training_catalog(); exception when insufficient_privilege then denied:=true; end;
 if not denied or public.teacher_training_authorize_lesson(l1) then raise exception 'ANONYMOUS_ALLOWED'; end if;
 insert into training_platform_results values ('anonymous identity denied',true);
 for candidate in select id,platform_role from public.profiles where platform_role in ('aluno','educacao_infantil','secretaria') loop
 perform set_config('request.jwt.claim.sub',candidate.id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',candidate.id,'role','authenticated','user_metadata',jsonb_build_object('platform_role','admin','school_id',sid))::text,true);
 denied:=false;
 begin perform public.teacher_training_catalog(sid); exception when insufficient_privilege then denied:=true; end;
 if not denied or public.teacher_training_authorize_lesson(l1,sid) then raise exception 'NONTEACHER_ALLOWED: %',candidate.platform_role; end if;
 end loop;
 insert into training_platform_results values ('students, family and nonteachers denied even with forged metadata',true);
 perform set_config('request.jwt.claim.sub',tid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',tid,'role','authenticated')::text,true);
 result:=public.teacher_training_catalog(sid);
 if result->>'access'<>'available' or jsonb_array_length(result->'lessons')<>2
 or not public.teacher_training_authorize_lesson(l1,sid) or not public.teacher_training_authorize_lesson(l2,sid)
 then raise exception 'TWO_LESSONS_WITHOUT_EXTRA_LICENSE_FAILED'; end if;
 if result::text ~ 'storage_path|signedUrl|sha256|"bucket"|formacao/' then raise exception 'PATH_LEAK'; end if;
 if exists(select 1 from jsonb_array_elements(result->'lessons') x where x->>'canPlay'<>'true' or x->'availableKinds'<>'["video"]'::jsonb or x->>'status'<>'published') then raise exception 'READY_PUBLISHED_VIDEO_REQUIRED'; end if;
 if jsonb_array_length(public.teacher_training_catalog()->'lessons')<>2 then raise exception 'AUTO_SCHOOL_FAILED'; end if;
 insert into training_platform_results values ('two ready published videos available without extra license and without storage paths',true);
 outsider:=gen_random_uuid();
 denied:=false;
 begin perform public.teacher_training_catalog(outsider); exception when insufficient_privilege then denied:=true; end;
 if not denied or public.teacher_training_authorize_lesson(l1,outsider) then raise exception 'CROSS_SCHOOL_ALLOWED'; end if;
 insert into training_platform_results values ('foreign school context denied',true);

 begin
  update public.profiles set status='inactive' where id=tid;
  denied:=false;
  begin perform public.teacher_training_catalog(sid); exception when insufficient_privilege then denied:=true; end;
  if not denied or public.teacher_training_authorize_lesson(l1,sid) then raise exception 'inactive profile allowed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('inactive profile denied',true);

 begin
  update public.teachers set status='inactive' where profile_id=tid and school_id=sid;
  denied:=false;
  begin perform public.teacher_training_catalog(sid); exception when insufficient_privilege then denied:=true; end;
  if not denied or public.teacher_training_authorize_lesson(l1,sid) then raise exception 'inactive teacher allowed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('inactive teacher denied',true);

 begin
  update public.schools set status='inactive' where id=sid;
  denied:=false;
  begin perform public.teacher_training_catalog(sid); exception when insufficient_privilege then denied:=true; end;
  if not denied or public.teacher_training_authorize_lesson(l1,sid) then raise exception 'inactive school allowed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('inactive school denied',true);

 begin
  update public.school_memberships set status='inactive' where profile_id=tid and school_id=sid;
  denied:=false;
  begin perform public.teacher_training_catalog(sid); exception when insufficient_privilege then denied:=true; end;
  if not denied or public.teacher_training_authorize_lesson(l1,sid) then raise exception 'inactive membership allowed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('inactive membership denied',true);

 begin
  update public.school_memberships set started_at=now()+interval '1 day',ended_at=null where profile_id=tid and school_id=sid;
  denied:=false;
  begin perform public.teacher_training_catalog(sid); exception when insufficient_privilege then denied:=true; end;
  if not denied or public.teacher_training_authorize_lesson(l1,sid) then raise exception 'future membership allowed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('future membership denied',true);

 begin
  update public.school_memberships set started_at=now()-interval '2 days',ended_at=now()-interval '1 day' where profile_id=tid and school_id=sid;
  denied:=false;
  begin perform public.teacher_training_catalog(sid); exception when insufficient_privilege then denied:=true; end;
  if not denied or public.teacher_training_authorize_lesson(l1,sid) then raise exception 'expired membership allowed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('expired membership denied',true);

 begin
  update public.content_items set editorial_status='DRAFT' where id=ci;
  if public.teacher_training_authorize_lesson(l1,sid) or exists(select 1 from jsonb_array_elements(public.teacher_training_catalog(sid)->'lessons') x where x->>'id'=l1::text) then raise exception 'unpublished canonical item disclosed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('unpublished canonical item denied for catalog and playback',true);

 begin
  update public.content_items set published_at=now()+interval '1 day' where id=ci;
  if public.teacher_training_authorize_lesson(l1,sid) or exists(select 1 from jsonb_array_elements(public.teacher_training_catalog(sid)->'lessons') x where x->>'id'=l1::text) then raise exception 'future publication disclosed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('future publication denied for catalog and playback',true);

 begin
  update public.content_items set owner_scope='TEACHER',owner_user_id=aid,owner_tenant_id=null where id=ci;
  if public.teacher_training_authorize_lesson(l1,sid) or exists(select 1 from jsonb_array_elements(public.teacher_training_catalog(sid)->'lessons') x where x->>'id'=l1::text) then raise exception 'foreign teacher owner disclosed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('foreign teacher owner denied for catalog and playback',true);

 begin
  insert into public.content_access_exceptions(school_id,content_item_id,action) values (sid,ci,'BLOCK');
  if public.teacher_training_authorize_lesson(l1,sid) or exists(select 1 from jsonb_array_elements(public.teacher_training_catalog(sid)->'lessons') x where x->>'id'=l1::text) then raise exception 'school block disclosed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('school block denied for catalog and playback',true);

 begin
  insert into public.content_access_exceptions(school_id,content_item_id,action) values (sid,ci,'EMBARGO');
  if public.teacher_training_authorize_lesson(l1,sid) or exists(select 1 from jsonb_array_elements(public.teacher_training_catalog(sid)->'lessons') x where x->>'id'=l1::text) then raise exception 'school embargo disclosed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('school embargo denied for catalog and playback',true);

 begin
  update teacher_training_private.lessons set status='review' where id=l1;
  if public.teacher_training_authorize_lesson(l1,sid) or exists(select 1 from jsonb_array_elements(public.teacher_training_catalog(sid)->'lessons') x where x->>'id'=l1::text) then raise exception 'review lesson disclosed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('review lesson denied for catalog and playback',true);

 begin
  update teacher_training_private.lessons set status='archived' where id=l1;
  if public.teacher_training_authorize_lesson(l1,sid) or exists(select 1 from jsonb_array_elements(public.teacher_training_catalog(sid)->'lessons') x where x->>'id'=l1::text) then raise exception 'archived lesson disclosed'; end if;
  raise exception using errcode='ZT001',message='ROLLBACK_FIXTURE';
 exception when sqlstate 'ZT001' then null;
 end;
 insert into training_platform_results values ('archived lesson denied for catalog and playback',true);

 perform set_config('request.jwt.claim.sub',aid::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',aid,'role','authenticated')::text,true);
 if public.teacher_training_catalog()->>'actor'<>'admin' or not public.teacher_training_authorize_lesson(l2) then raise exception 'ADMIN_REGRESSION'; end if;
 insert into training_platform_results values ('existing active administrator access preserved',true);
end;
$$;
set local role authenticated;
do $$
declare denied boolean;
begin
 denied:=false;
 begin perform public.teacher_training_asset_binding('00000000-0000-4000-8000-000000000000'::uuid,'video'); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'PRIVATE_BINDING_LEAK'; end if;
 denied:=false;
 begin perform 1 from teacher_training_private.lessons; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'PRIVATE_TABLE_LEAK'; end if;
end;
$$;
reset role;
insert into training_platform_results values ('private path RPC and tables deny browser role',true);
set local role anon;
do $$
declare denied boolean:=false;
begin
 begin perform public.teacher_training_catalog(); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'ANON_RPC_ALLOWED'; end if;
end;
$$;
reset role;
insert into training_platform_results values ('anonymous RPC execution denied',true);

-- Verify the two direct-read RLS policies with real browser role and owned fixtures.
do $$
declare teacher uuid; family uuid; course_id uuid:=gen_random_uuid(); cert_id uuid:=gen_random_uuid();
 family_course uuid:=gen_random_uuid(); family_cert uuid:=gen_random_uuid(); n integer;
begin
 select id into strict teacher from public.profiles where platform_role='professor' and status='active' limit 1;
 select id into strict family from public.profiles where platform_role='educacao_infantil' and status='active' limit 1;
 insert into public.personal_learning_courses(id,owner_id,title,provider,source_url) values
 (course_id,teacher,'Rollback teacher fixture','QA','https://example.invalid/'||course_id),
 (family_course,family,'Rollback family fixture','QA','https://example.invalid/'||family_course);
 insert into public.personal_learning_certificates(id,owner_id,course_id,original_name,mime_type,byte_size,sha256,storage_path) values
 (cert_id,teacher,course_id,'proof.pdf','application/pdf',1,repeat('a',64),teacher||'/'||course_id||'/'||cert_id||'/'||repeat('a',64)||'.pdf'),
 (family_cert,family,family_course,'proof.pdf','application/pdf',1,repeat('b',64),family||'/'||family_course||'/'||family_cert||'/'||repeat('b',64)||'.pdf');
 perform set_config('request.jwt.claim.sub',family::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',family,'role','authenticated','user_metadata',jsonb_build_object('platform_role','professor'))::text,true);
 execute 'set local role authenticated';
 select count(*) into n from public.personal_learning_courses where id in (course_id,family_course);
 if n<>0 then raise exception 'FAMILY_COURSE_RLS_ALLOWED'; end if;
 select count(*) into n from public.personal_learning_certificates where id in (cert_id,family_cert);
 if n<>0 then raise exception 'FAMILY_CERTIFICATE_RLS_ALLOWED'; end if;
 execute 'reset role';
 perform set_config('request.jwt.claim.sub',teacher::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',teacher,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 select count(*) into n from public.personal_learning_courses where id in (course_id,family_course);
 if n<>1 then raise exception 'TEACHER_OWNER_COURSE_RLS_FAILED'; end if;
 select count(*) into n from public.personal_learning_certificates where id in (cert_id,family_cert);
 if n<>1 then raise exception 'TEACHER_OWNER_CERTIFICATE_RLS_FAILED'; end if;
 execute 'reset role';
end;
$$;
insert into training_platform_results values ('family denied own course/certificate reads, teacher remains owner-isolated',true);

create temp table training_access_after as select 'profiles' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.profiles t
union all
select 'teachers' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.teachers t
union all
select 'schools' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.schools t
union all
select 'school_memberships' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.school_memberships t
union all
select 'contracts' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.contracts t
union all
select 'contract_products' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.contract_products t
union all
select 'tenant_product_entitlements' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.tenant_product_entitlements t
union all
select 'tenant_product_content_modules' as relation, count(*) as rows, md5(coalesce(string_agg(to_jsonb(t)::text, '' order by to_jsonb(t)::text), '')) as fingerprint from public.tenant_product_content_modules t;

do $$
begin
 if exists ((select * from training_access_before except select * from training_access_after)
 union all (select * from training_access_after except select * from training_access_before)) then
 raise exception 'AUTHORIZATION_OR_LICENSE_DATA_CHANGED'; end if;
end;
$$;
insert into training_platform_results values ('profiles memberships schools teachers contracts and entitlements unchanged',true);
select jsonb_agg(to_jsonb(r) order by test) as results from training_platform_results r;
rollback;
