-- REVIEW ONLY — apply only after independent review. Tested in disposable Docker DB.
-- No Auth users/claims, passwords, data imports, public grants or RLS policies changed.
begin;

-- Pin observed dependencies before installing reviewed SQL. This is not a full
-- schema attestation; table/trigger/RLS and operational review remain required.
do $preflight$
declare expected jsonb; actual jsonb;
begin
 for expected in select value from jsonb_array_elements($observed$[{"proname":"avalia_current_student_id","args":"","body_md5":"99d05b069c9e0fd4ea608d40643cf1a3","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"avalia_plus_create_assessment_from_bank","args":"p_payload jsonb","body_md5":"dd108be00647e4e653a4c1b7dda5f24e","security_definer":true,"proconfig":["search_path=public"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"avalia_plus_replace_assessment_items","args":"p_assessment_id uuid, p_payload jsonb","body_md5":"c5537e9ae3e9178c62df6ab779a3b211","security_definer":true,"proconfig":["search_path=public"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"avalia_student_can_access_assignment","args":"p_assignment_id uuid, p_student_id uuid","body_md5":"32295b90fb740ac5399c40cbfd71e33a","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"content_resolve_for_user","args":"p_context jsonb","body_md5":"a0c56d9589ed5086441b602d71a221d0","security_definer":true,"proconfig":["search_path=\"\"","jit=off"],"acl":"{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":true},{"proname":"content_resolve_question_details_for_user","args":"p_context jsonb","body_md5":"fe26d0f36ab83603ed090c6f6b9983af","security_definer":true,"proconfig":["search_path=public"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"teacher_create_assessment_assignment","args":"p_assessment_id uuid, p_target_type text, p_class_id uuid, p_student_id uuid, p_available_from timestamp with time zone, p_available_until timestamp with time zone, p_time_limit_minutes integer, p_max_attempts integer, p_status text","body_md5":"4cfb02542717041dedf06879ae07ff32","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"teacher_schedule_assessment_application_v2","args":"p_assessment_id uuid, p_target_type text, p_class_id uuid, p_student_id uuid, p_available_from timestamp with time zone, p_available_until timestamp with time zone, p_time_limit_minutes integer, p_max_attempts integer, p_cycle_name text, p_school_year text, p_booklet_id uuid, p_token_required boolean, p_shuffle_questions boolean, p_shuffle_alternatives boolean","body_md5":"a4169395436da02526ff02a867ba1886","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"active_rules","args":"p_context jsonb","body_md5":"da6a2950c152ca297f61e70a7b168d34","security_definer":true,"proconfig":["search_path=\"\"","jit=off","plan_cache_mode=force_custom_plan"],"acl":"{postgres=X/postgres}","authenticated_execute":false,"anon_execute":false},{"proname":"actor_context","args":"p_context jsonb","body_md5":"f6a7f42cdd1bc1c915305845da58c57c","security_definer":true,"proconfig":["search_path=\"\"","jit=off"],"acl":"{postgres=X/postgres}","authenticated_execute":false,"anon_execute":false},{"proname":"authorized_items","args":"p_context jsonb, p_item uuid","body_md5":"849f5ffcee863c786252c3a75ae2a15d","security_definer":true,"proconfig":["search_path=\"\"","jit=off","plan_cache_mode=force_custom_plan"],"acl":"{postgres=X/postgres}","authenticated_execute":false,"anon_execute":false},{"proname":"school_contract","args":"p_school uuid, p_contract uuid","body_md5":"6124eacadbbf7838b0670e1ca0c6b203","security_definer":true,"proconfig":["search_path=\"\""],"acl":"{postgres=X/postgres}","authenticated_execute":false,"anon_execute":false}]$observed$::jsonb) loop
  select jsonb_build_object('proname',p.proname,'args',pg_get_function_identity_arguments(p.oid),
   'body_md5',md5(p.prosrc),'security_definer',p.prosecdef,'proconfig',p.proconfig,'acl',p.proacl::text,
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE')) into actual
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','school_category_private') and p.proname=expected->>'proname'
   and pg_get_function_identity_arguments(p.oid)=expected->>'args';
  if actual is distinct from expected then
   raise exception 'FASE3_REVIEW_BASE_CHANGED: %',expected->>'proname';
  end if;
 end loop;
end $preflight$;

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
    -- Moving an item also locks its old parent, preventing concurrent publication
    -- of the source assessment while its item set is changing.
    if tg_op='UPDATE' then
      perform 1 from public.assessments where id in (old.assessment_id,new.assessment_id) order by id for update;
    end if;
    -- Serialize item mutations and publication on the same parent row.
    select * into a from public.assessments
    where id=case when tg_op='DELETE' then old.assessment_id else new.assessment_id end
    for update;
    if a.id is null then raise exception 'ASSESSMENT_NOT_FOUND' using errcode='42501'; end if;
    -- An assignment is a historical snapshot boundary, including archived/closed
    -- assignments. Never rewrite its item set, positions, points or snapshots.
    -- Prepare a new assessment to change content after assignment.
    if exists(select 1 from public.assessment_assignments where assessment_id=a.id)
       or (tg_op='UPDATE' and exists(select 1 from public.assessment_assignments where assessment_id=old.assessment_id)) then
      raise exception 'ASSESSMENT_ASSIGNED_CONTENT_IMMUTABLE' using errcode='42501';
    end if;
    if tg_op='DELETE' then return old; end if;
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
    select * into a from public.assessments where id=new.assessment_id for update;
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
before insert or update or delete on public.assessment_questions
for each row execute function school_category_private.assessment_content_write_guard();
create trigger fase3_assessment_publication_guard
before insert or update of assessment_id,school_id,class_id,status on public.assessment_assignments
for each row execute function school_category_private.assessment_content_write_guard();

-- CREATE OR REPLACE preserves the two existing public function ACLs.
-- Helpers remain inaccessible through Data API and have no application EXECUTE grants.
commit;
