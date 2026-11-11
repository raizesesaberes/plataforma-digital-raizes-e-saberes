-- Formação > Universidade. This migration grants NO school or contract license.
-- Private media bindings stay inactive until separately uploaded and verified.
begin;

create schema if not exists teacher_training_private;
revoke all on schema teacher_training_private from public, anon, authenticated;

create table teacher_training_private.lessons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  content_item_id uuid not null unique references public.content_items(id),
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  collection text not null,
  collection_code text not null check (collection_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  subject text not null,
  subject_code text not null check (subject_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  school_year text not null,
  school_year_code text not null check (school_year_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  volume integer not null check (volume > 0),
  unit integer not null check (unit > 0),
  unit_title text not null default '',
  lesson_number integer not null check (lesson_number > 0),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (collection_code, subject_code, school_year_code, volume, unit, lesson_number)
);

create table teacher_training_private.assets (
  lesson_id uuid not null references teacher_training_private.lessons(id),
  kind text not null check (kind in ('video', 'audio')),
  bucket text not null,
  storage_path text not null unique,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  byte_size bigint not null check (byte_size > 0),
  mime_type text not null,
  duration_seconds numeric check (duration_seconds > 0),
  ready boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (lesson_id, kind),
  check (not ready or verified_at is not null),
  check ((kind = 'video' and bucket = 'videos' and mime_type = 'video/mp4')
    or (kind = 'audio' and bucket = 'audios' and mime_type in ('audio/mpeg', 'audio/mp4'))),
  check (storage_path ~ '^formacao/[a-z0-9-]+/[a-z0-9-]+/[a-z0-9-]+/volume-[1-9][0-9]*/unidade-[1-9][0-9]*/aula-[1-9][0-9]*/[0-9a-f]{64}\.(mp4|mp3|m4a)$')
);

alter table teacher_training_private.lessons enable row level security;
alter table teacher_training_private.assets enable row level security;
revoke all on all tables in schema teacher_training_private from public, anon, authenticated;

-- Profiles are authoritative. Neither editable user metadata nor caller roles
-- can grant access. A teacher must have an effective membership in this school.
create function teacher_training_private.actor_context(p_school_id uuid default null)
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

create function teacher_training_private.category_context(p_actor_context jsonb)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('school_id', p_actor_context->>'school_id',
    'mode', 'INSTITUTIONAL', 'content_type', 'TRAINING', 'module_id', m.id)
  from public.content_modules m where m.code = 'UNIVERSIDADE_CAPACITACAO' and m.status = 'active';
$$;

-- Exact same strict category/license evaluator as the established catalog:
-- active contract/product/tenant, date range, scope, institutional flag,
-- effective category rule, and module enablement. No legacy fallback.
create function teacher_training_private.licensed(p_actor_context jsonb)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from school_category_private.active_rules_for_context(
      teacher_training_private.category_context(p_actor_context), p_actor_context) r
    join public.content_modules m on m.id = r.module_id
    where m.code = 'UNIVERSIDADE_CAPACITACAO' and m.status = 'active'
      and r.institutional and 'TRAINING'::public.rs_content_type = any(r.content_types)
  );
$$;

-- This is also used at signing time. Readiness requires the exact immutable
-- hash path, matching size/mime, and a currently private bucket/object.
create function teacher_training_private.ready_assets(p_lesson_id uuid)
returns setof teacher_training_private.assets
language sql stable security definer set search_path = '' as $$
  select a.* from teacher_training_private.assets a
  join teacher_training_private.lessons l on l.id = a.lesson_id
  join storage.buckets b on b.id = a.bucket and b.public is false
  join storage.objects o on o.bucket_id = a.bucket and o.name = a.storage_path
  where a.lesson_id = p_lesson_id and a.ready and a.verified_at is not null
    and o.metadata->>'size' = a.byte_size::text
    and o.metadata->>'mimetype' = a.mime_type
    and a.storage_path = 'formacao/' || l.collection_code || '/' || l.subject_code || '/' || l.school_year_code
      || '/volume-' || l.volume || '/unidade-' || l.unit || '/aula-' || l.lesson_number || '/' || a.sha256
      || case a.mime_type when 'video/mp4' then '.mp4' when 'audio/mpeg' then '.mp3' when 'audio/mp4' then '.m4a' end;
$$;

create function public.teacher_training_catalog(p_school_id uuid default null)
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

create function public.teacher_training_authorize_lesson(p_lesson_id uuid, p_school_id uuid default null)
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

-- Internal server lookup only. The Edge Function must authorize with the
-- caller's JWT first; browser roles cannot execute this path-bearing RPC.
create function public.teacher_training_asset_binding(p_lesson_id uuid, p_kind text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('lessonId', a.lesson_id, 'kind', a.kind,
    'bucket', a.bucket, 'path', a.storage_path, 'mimeType', a.mime_type, 'sha256', a.sha256)
  from teacher_training_private.ready_assets(p_lesson_id) a
  join teacher_training_private.lessons l on l.id = a.lesson_id and l.status <> 'archived'
  where a.kind = p_kind;
$$;

revoke all on all functions in schema teacher_training_private from public, anon, authenticated;
revoke all on function public.teacher_training_catalog(uuid) from public, anon, authenticated;
revoke all on function public.teacher_training_authorize_lesson(uuid, uuid) from public, anon, authenticated;
revoke all on function public.teacher_training_asset_binding(uuid, text) from public, anon, authenticated;
grant execute on function public.teacher_training_catalog(uuid) to authenticated;
grant execute on function public.teacher_training_authorize_lesson(uuid, uuid) to authenticated;
grant execute on function public.teacher_training_asset_binding(uuid, text) to service_role;

-- Seed canonical TRAINING content, not license grants. Pending editorial
-- review remains private to active administrators until separately approved.
do $$
declare taxonomy record; subject_id uuid; ci uuid; entry record;
begin
  select * into strict taxonomy from school_category_private.taxonomy()
    where institutional and grade_code = 'UNIVERSIDADE_CAPACITACAO';
  select id into strict subject_id from public.content_subjects where code = 'MATEMATICA' and status = 'active';
  if not exists (select 1 from public.content_modules where code = 'UNIVERSIDADE_CAPACITACAO'
    and status = 'active' and 'TRAINING'::public.rs_content_type = any(content_types)) then
    raise exception 'TRAINING_TAXONOMY_REQUIRED';
  end if;
  for entry in select * from (values
    ('avalia-mais-matematica-1-ano-v1-u1-aula-1', 1, 'Corações para presentear', 'published'),
    ('avalia-mais-matematica-1-ano-v1-u1-aula-2', 2, 'Coleções de brinquedos', 'review')
  ) as v(code, lesson_number, title, status) loop
    insert into public.content_items (content_type, segment_id, grade_id, subject_id, title,
      owner_scope, editorial_status, published_at, metadata)
    values ('TRAINING', taxonomy.segment_id, taxonomy.grade_id, subject_id, entry.title,
      'GLOBAL_RAIZES', case when entry.status = 'published' then 'PUBLISHED'::public.rs_content_editorial_status
        else 'DRAFT'::public.rs_content_editorial_status end,
      case when entry.status = 'published' then now() else null end,
      jsonb_build_object('category_mode', 'INSTITUTIONAL', 'training_lesson_code', entry.code,
        'source', 'teacher_training_v1')) returning id into ci;
    insert into teacher_training_private.lessons (code, content_item_id, title, description,
      collection, collection_code, subject, subject_code, school_year, school_year_code,
      volume, unit, unit_title, lesson_number, status)
    values (entry.code, ci, entry.title, 'Formação docente para o trabalho com a unidade 1 do volume 1.',
      'Avalia+', 'avalia-mais', 'Matemática', 'matematica', '1º ano', '1-ano', 1, 1,
      'Descobertas com Lia e Davi', entry.lesson_number, entry.status);
  end loop;
end;
$$;

-- These exact local bytes have been inspected, but readiness is intentionally
-- false. A separate read-back verification activates each uploaded object.
insert into teacher_training_private.assets
  (lesson_id, kind, bucket, storage_path, sha256, byte_size, mime_type, duration_seconds, ready)
select l.id, 'video', 'videos',
  'formacao/avalia-mais/matematica/1-ano/volume-1/unidade-1/aula-' || l.lesson_number || '/' || seed.sha256 || '.mp4',
  seed.sha256, seed.byte_size, 'video/mp4', seed.duration_seconds, false
from teacher_training_private.lessons l
join (values
  ('avalia-mais-matematica-1-ano-v1-u1-aula-1', '0f9a46d6c4dfb07b12b328e98b75dabd18ec299df76f2fe8712914070f14ab2d', 7024161::bigint, 180.234::numeric),
  ('avalia-mais-matematica-1-ano-v1-u1-aula-2', '1a2a805a953b98da295f8a1b7534f16791151e2745d21a44b136783d54e9ddcb', 8498925::bigint, 201.934::numeric)
) as seed(code, sha256, byte_size, duration_seconds) on seed.code = l.code;

-- No storage.objects policies: preserve the existing deny-by-default design.
-- No UPDATE/INSERT to contracts, contract_products or any entitlement table.
commit;
