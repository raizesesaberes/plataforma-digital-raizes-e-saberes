-- REVIEW ONLY — apply only after independent review. Tested in disposable Docker DB.
-- No Auth users/claims, passwords, data imports, public grants or RLS policies changed.
begin;

-- Refuse to overwrite a different deployed revision or changed execute privileges.
do $$
declare expected record; actual record;
begin
 for expected in select * from (values
  ('avalia_current_student_id','99d05b069c9e0fd4ea608d40643cf1a3'),
  ('avalia_student_can_access_assignment','32295b90fb740ac5399c40cbfd71e33a')
 ) v(name,body_md5) loop
  select md5(p.prosrc) body_md5,p.proacl::text acl into actual
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname=expected.name;
  if actual.body_md5 is distinct from expected.body_md5 or
    actual.acl is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then
   raise exception 'FASE3_REVIEW_BASE_CHANGED: %',expected.name;
  end if;
 end loop;
end $$;

-- A signed subject must identify exactly one active student. Email is not identity.
create or replace function public.avalia_current_student_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select case when count(*) = 1 then min(s.id::text)::uuid end
  from public.students s
  where auth.uid() is not null
    and s.user_id = auth.uid()
    and lower(coalesce(s.status, 'active')) in ('active', 'ativo');
$$;

create or replace function public.avalia_student_can_access_assignment(p_assignment_id uuid, p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(auth.uid() is not null
    and p_assignment_id is not null
    and p_student_id is not null
    and p_student_id = public.avalia_current_student_id()
    and exists (
      select 1 from public.assessment_assignments aa
      join public.enrollments e on e.student_id = p_student_id
        and e.class_id = aa.class_id and e.school_id = aa.school_id
        and e.status = 'active' and e.enrolled_at <= now()
        and (e.ended_at is null or e.ended_at > now())
      join public.students s on s.id = e.student_id and s.user_id = auth.uid()
      where aa.id = p_assignment_id and aa.status = 'published'
        and aa.available_from <= now()
        and (aa.available_until is null or aa.available_until > now())
        and coalesce(s.status, 'active') = 'active'
        and (aa.target_type = 'class' or aa.student_id = p_student_id)
    ), false);
$$;

-- Private guard, shared by item insertion/replacement and school publication.
-- Uses the same resolver as discovery; never treats FEATURE_DISABLED as permission.
create function school_category_private.assessment_assert_question(
  p_school_id uuid, p_class_id uuid, p_question_id uuid
) returns uuid language plpgsql security definer set search_path = '' set jit = 'off' as $$
declare ctx jsonb; page jsonb; item_id uuid; page_offset integer := 0;
begin
  if auth.uid() is null or p_question_id is null then
    raise exception 'ASSESSMENT_CONTENT_ACCESS_DENIED' using errcode = '42501';
  end if;
  ctx := school_category_private.actor_context(jsonb_strip_nulls(jsonb_build_object(
    'school_id', p_school_id, 'class_id', p_class_id)));
  if (ctx->>'teacher')::boolean is distinct from true then
    raise exception 'ASSESSMENT_TEACHER_CONTEXT_REQUIRED' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.question_items q
    join public.question_licenses l on l.id = q.license_id and l.publication_allowed
    where q.id = p_question_id and q.workflow_status = 'APROVADO'
      and q.publication_status = 'PUBLICADO' and q.curation_status = 'APROVADO'
      and q.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
  ) then
    raise exception 'ASSESSMENT_QUESTION_NOT_APPROVED' using errcode = '42501';
  end if;
  ctx := jsonb_strip_nulls(jsonb_build_object('school_id',ctx->>'school_id',
    'class_id',ctx->>'class_id','content_type','QUESTION'));
  if school_category_private.dynamic_school(ctx) then
    select content_item_id into item_id from public.content_question_items where question_item_id=p_question_id;
    if item_id is not null and exists (
      select 1 from school_category_private.authorized_items(ctx,item_id) where question_item_id=p_question_id
    ) then return (ctx->>'school_id')::uuid; end if;
  else
    -- Legacy schools retain canonical resolver semantics. Pagination avoids assuming
    -- that the first 100 authorized items are the entire catalog.
    loop
      page := public.content_resolve_for_user(ctx || jsonb_build_object('limit',100,'offset',page_offset));
      exit when page->>'status' is distinct from 'PASS';
      if exists(select 1 from jsonb_array_elements(page->'items') x where x->>'question_item_id'=p_question_id::text) then return (ctx->>'school_id')::uuid; end if;
      exit when coalesce(jsonb_array_length(page->'items'),0)<100;
      page_offset := page_offset + 100;
      exit when page_offset >= coalesce((page->>'total')::integer,0);
    end loop;
  end if;
  raise exception 'ASSESSMENT_CONTENT_ACCESS_DENIED' using errcode = '42501';
end $$;
revoke all on function school_category_private.assessment_assert_question(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create function school_category_private.assessment_content_write_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a public.assessments%rowtype; question_id uuid; resolved_school_id uuid;
begin
  if tg_table_name = 'assessment_questions' then
    select * into a from public.assessments where id=new.assessment_id;
    if a.id is null then raise exception 'ASSESSMENT_NOT_FOUND' using errcode='42501'; end if;
    -- Preserve existing global editorial assembly for trusted non-teacher roles.
    -- School publication always passes through the second branch below.
    if public.has_question_bank_role(array['admin','administrador','administrador_nacional','curator','curador','elaborador','service_role'])
       and not exists(select 1 from public.teachers where profile_id=auth.uid() and status='active') then
      return new;
    end if;
    resolved_school_id := school_category_private.assessment_assert_question(a.school_id,a.class_id,new.question_id);
    -- The web builder omits school_id: persist the verified context, never an email
    -- or client-supplied school label, so a later publication cannot change schools.
    if a.school_id is null then
      update public.assessments set school_id=resolved_school_id where id=a.id;
    end if;
  else
    if new.school_id is null or new.class_id is null or new.assessment_id is null then
      raise exception 'ASSESSMENT_TARGET_REQUIRED' using errcode='42501';
    end if;
    select * into a from public.assessments where id=new.assessment_id;
    if a.id is null or (a.school_id is not null and a.school_id <> new.school_id) then
      raise exception 'ASSESSMENT_SCHOOL_MISMATCH' using errcode='42501';
    end if;
    if new.status='published' then
      if not exists(select 1 from public.assessment_questions where assessment_id=new.assessment_id) then
        raise exception 'ASSESSMENT_EMPTY' using errcode='42501';
      end if;
      for question_id in select aq.question_id from public.assessment_questions aq where aq.assessment_id=new.assessment_id loop
        perform school_category_private.assessment_assert_question(new.school_id,new.class_id,question_id);
      end loop;
    end if;
  end if;
  return new;
end $$;
revoke all on function school_category_private.assessment_content_write_guard() from public,anon,authenticated,service_role;

-- Triggers also protect alternate definer RPCs; fixing only one public RPC leaves bypasses.
create trigger fase3_assessment_question_guard
before insert or update of assessment_id,question_id on public.assessment_questions
for each row execute function school_category_private.assessment_content_write_guard();
create trigger fase3_assessment_publication_guard
before insert or update of assessment_id,school_id,class_id,status on public.assessment_assignments
for each row execute function school_category_private.assessment_content_write_guard();

-- CREATE OR REPLACE preserves the two existing public function ACLs.
-- Helpers remain inaccessible through Data API and have no application EXECUTE grants.
commit;
