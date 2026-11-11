-- Emergency semantic rollback for 20261111114159 only.
-- Review first: this restores the former TRAINING license gate and hides Aula 2.
-- Does not erase media, lessons, publication history metadata or contracts.
begin;
create or replace function teacher_training_private.actor_context(p_school_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid(); role_name text; sid uuid; context jsonb;
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
  context := school_category_private.actor_context(jsonb_build_object('school_id', sid, 'mode', 'INSTITUTIONAL'));
  return context || jsonb_build_object('actor', 'teacher');
end;
$$;

create or replace function public.teacher_training_catalog(p_school_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare context jsonb; lessons jsonb; is_admin boolean;
begin
  context := teacher_training_private.actor_context(p_school_id);
  is_admin := context->>'actor' = 'admin';
  if not is_admin and not teacher_training_private.licensed(context) then
    return jsonb_build_object('ok', true, 'actor', 'teacher', 'schoolId', context->>'school_id',
      'access', 'license_required', 'lessons', '[]'::jsonb);
  end if;
  with authorized as materialized (
    select ai.content_item_id from school_category_private.authorized_items_for_context(
      teacher_training_private.category_context(context), context) ai where not is_admin
  ), visible as (
    select l.* from teacher_training_private.lessons l
    where (is_admin and l.status in ('draft', 'review', 'published'))
      or (not is_admin and l.status = 'published'
        and l.content_item_id in (select content_item_id from authorized))
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
  if lesson.status <> 'published' or not teacher_training_private.licensed(context) then return false; end if;
  return exists (
    select 1 from school_category_private.authorized_items_for_context(
      teacher_training_private.category_context(context), context, lesson.content_item_id) ai
    where ai.content_type = 'TRAINING'
  );
exception when insufficient_privilege then return false;
end;
$$;
drop function teacher_training_private.visible_to_teacher(uuid, uuid);
update public.content_items ci set editorial_status = 'DRAFT', published_at = null, updated_at = now()
from teacher_training_private.lessons l
where ci.id = l.content_item_id and l.code = 'avalia-mais-matematica-1-ano-v1-u1-aula-2';
update teacher_training_private.lessons set status = 'review', updated_at = now()
where code = 'avalia-mais-matematica-1-ano-v1-u1-aula-2';
commit;
