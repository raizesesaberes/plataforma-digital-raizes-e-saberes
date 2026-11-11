-- Reuse active platform teacher authorization. No additional login/license.
-- Existing private media and five-minute signatures remain unchanged.
begin;

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

commit;
