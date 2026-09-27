-- Player Educacional de Video + Analytics V1
-- Motor canonico para videos de Biblioteca, Universidade/Formacao, Recomposicao e futuros conteudos.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.schools') is null then
    raise exception 'PRE-CHECK bloqueado: schools nao existe';
  end if;
  if to_regclass('public.school_content_availability') is null then
    raise exception 'PRE-CHECK bloqueado: school_content_availability nao existe';
  end if;
end $$;

create table if not exists public.educational_video_assets (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  source_module text not null,
  source_id text not null,
  title text not null,
  description text,
  format text not null default 'MP4',
  duration_seconds integer,
  poster_url text,
  mp4_url text,
  hls_manifest_url text,
  storage_bucket text,
  storage_path text,
  is_private boolean not null default true,
  signed_url_required boolean not null default true,
  hls_status text not null default 'EMPTY_REAL',
  cdn_status text not null default 'EMPTY_REAL',
  quality_options jsonb not null default '[]'::jsonb,
  playback_speed_options jsonb not null default '[0.75,1,1.25,1.5,2]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint educational_video_source_module_check
    check (source_module in ('BIBLIOTECA', 'UNIVERSIDADE', 'FORMACAO', 'RECOMPOSICAO', 'CONTEUDO_PEDAGOGICO', 'LIVE_REPLAY', 'OTHER')),
  constraint educational_video_format_check check (format in ('MP4', 'HLS', 'MIXED', 'EXTERNAL')),
  constraint educational_video_status_check check (status in ('draft', 'active', 'archived')),
  constraint educational_video_hls_status_check check (hls_status in ('PASS', 'EMPTY_REAL', 'FAIL')),
  constraint educational_video_cdn_status_check check (cdn_status in ('PASS', 'EMPTY_REAL', 'FAIL')),
  constraint educational_video_duration_check check (duration_seconds is null or duration_seconds > 0),
  constraint educational_video_source_id_not_blank check (length(btrim(source_id)) > 0),
  constraint educational_video_no_secret_check
    check (
      coalesce(source_id, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and coalesce(mp4_url, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and coalesce(hls_manifest_url, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    ),
  constraint educational_video_private_asset_check
    check (
      is_private is false
      or (
        signed_url_required is true
        and mp4_url is null
        and hls_manifest_url is null
        and storage_bucket is not null
        and storage_path is not null
        and storage_path !~* '(^|/)public(/|$)'
      )
    )
);

create table if not exists public.educational_video_captions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.educational_video_assets(id) on delete cascade,
  language_code text not null default 'pt-BR',
  label text not null default 'Português',
  kind text not null default 'subtitles',
  storage_bucket text,
  storage_path text,
  vtt_url text,
  is_private boolean not null default true,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint educational_video_captions_kind_check check (kind in ('subtitles', 'captions', 'descriptions')),
  constraint educational_video_captions_status_check check (status in ('active', 'archived')),
  constraint educational_video_captions_private_check
    check (
      is_private is false
      or (
        vtt_url is null
        and storage_bucket is not null
        and storage_path is not null
        and storage_path !~* '(^|/)public(/|$)'
      )
    )
);

create table if not exists public.educational_video_progress (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.educational_video_assets(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  source_module text not null,
  source_id text not null,
  user_profile_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  student_key uuid generated always as (coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)) stored,
  last_position_seconds integer not null default 0,
  duration_seconds integer,
  percent_watched numeric(5,2) not null default 0,
  max_percent_watched numeric(5,2) not null default 0,
  total_watch_seconds integer not null default 0,
  status text not null default 'not_started',
  first_started_at timestamptz,
  last_played_at timestamptz,
  completed_at timestamptz,
  event_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint educational_video_progress_status_check check (status in ('not_started', 'in_progress', 'completed')),
  constraint educational_video_progress_values_check
    check (
      last_position_seconds >= 0
      and (duration_seconds is null or duration_seconds > 0)
      and percent_watched >= 0 and percent_watched <= 100
      and max_percent_watched >= 0 and max_percent_watched <= 100
      and total_watch_seconds >= 0
    ),
  constraint educational_video_progress_asset_user_student_unique unique (asset_id, user_profile_id, student_key)
);

create table if not exists public.educational_video_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.educational_video_assets(id) on delete cascade,
  progress_id uuid references public.educational_video_progress(id) on delete set null,
  school_id uuid references public.schools(id) on delete cascade,
  source_module text not null,
  source_id text not null,
  user_profile_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  event_type text not null,
  position_seconds integer not null default 0,
  duration_seconds integer,
  percent_watched numeric(5,2) not null default 0,
  playback_rate numeric(4,2),
  quality_label text,
  client_event_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint educational_video_events_type_check
    check (event_type in ('PLAY', 'PAUSE', 'SEEK', 'PROGRESS', 'COMPLETE', 'SPEED_CHANGE')),
  constraint educational_video_events_values_check
    check (
      position_seconds >= 0
      and (duration_seconds is null or duration_seconds > 0)
      and percent_watched >= 0
      and percent_watched <= 100
      and (playback_rate is null or (playback_rate > 0 and playback_rate <= 4))
    )
);

create table if not exists public.educational_video_analytics_snapshots (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  source_module text,
  source_id text,
  asset_id uuid references public.educational_video_assets(id) on delete cascade,
  period_start date,
  period_end date,
  views integer not null default 0,
  unique_viewers integer not null default 0,
  total_watch_seconds integer not null default 0,
  average_percent numeric(5,2) not null default 0,
  completions integer not null default 0,
  abandonments integer not null default 0,
  resumes integer not null default 0,
  scope text not null default 'computed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint educational_video_snapshot_values_check
    check (
      views >= 0
      and unique_viewers >= 0
      and total_watch_seconds >= 0
      and average_percent >= 0
      and average_percent <= 100
      and completions >= 0
      and abandonments >= 0
      and resumes >= 0
    )
);

create index if not exists educational_video_assets_school_module_idx
  on public.educational_video_assets (school_id, source_module, source_id, status);
create index if not exists educational_video_captions_asset_idx
  on public.educational_video_captions (asset_id, language_code, status);
create index if not exists educational_video_progress_student_idx
  on public.educational_video_progress (student_id, source_module, updated_at desc);
create index if not exists educational_video_progress_school_idx
  on public.educational_video_progress (school_id, source_module, source_id, status);
create index if not exists educational_video_events_asset_idx
  on public.educational_video_events (asset_id, event_type, created_at desc);
create unique index if not exists educational_video_events_client_event_idx
  on public.educational_video_events (asset_id, user_profile_id, coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid), client_event_id)
  where client_event_id is not null;

drop trigger if exists educational_video_assets_touch_updated_at on public.educational_video_assets;
create trigger educational_video_assets_touch_updated_at
before update on public.educational_video_assets
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists educational_video_progress_touch_updated_at on public.educational_video_progress;
create trigger educational_video_progress_touch_updated_at
before update on public.educational_video_progress
for each row execute function public.institutional_touch_updated_at();

create or replace function public.video_user_can_access(p_asset_id uuid, p_student_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_asset public.educational_video_assets%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_asset
  from public.educational_video_assets
  where id = p_asset_id
    and status = 'active';

  if v_asset.id is null then
    return false;
  end if;

  if public.is_platform_admin() then
    return true;
  end if;

  if v_asset.school_id is null then
    return v_asset.is_private is false;
  end if;

  if public.secretaria_can_manage_school(v_asset.school_id) then
    return true;
  end if;

  if exists (
    select 1
    from public.current_institutional_school_ids() ids
    where ids.school_id = v_asset.school_id
  ) then
    if p_student_id is null then
      return true;
    end if;

    return exists (
      select 1
      from public.enrollments e
      where e.student_id = p_student_id
        and e.school_id = v_asset.school_id
        and e.status = 'active'
        and e.ended_at is null
        and (
          public.institutional_is_current_student(p_student_id)
          or public.communication_guardian_can_read(e.school_id, e.class_id, p_student_id, 'student')
          or public.communication_teacher_can_target(e.school_id, e.class_id, p_student_id, 'student')
        )
    );
  end if;

  return false;
end;
$$;

create or replace function public.video_register_asset(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_school_id uuid := nullif(p_payload->>'school_id', '')::uuid;
  v_asset public.educational_video_assets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_school_id is not null and not public.secretaria_can_manage_school(v_school_id) and not public.is_platform_admin() then
    raise exception 'UNAUTHORIZED_VIDEO_ASSET_MANAGEMENT';
  end if;

  if v_school_id is null and not public.is_platform_admin() then
    raise exception 'GLOBAL_VIDEO_ASSET_REQUIRES_ADMIN';
  end if;

  insert into public.educational_video_assets (
    school_id, source_module, source_id, title, description, format, duration_seconds,
    poster_url, mp4_url, hls_manifest_url, storage_bucket, storage_path,
    is_private, signed_url_required, hls_status, cdn_status,
    quality_options, playback_speed_options, metadata, status, created_by, updated_by
  )
  values (
    v_school_id,
    upper(coalesce(nullif(p_payload->>'source_module', ''), 'OTHER')),
    btrim(coalesce(p_payload->>'source_id', '')),
    btrim(coalesce(p_payload->>'title', 'Video educacional')),
    p_payload->>'description',
    upper(coalesce(nullif(p_payload->>'format', ''), 'MP4')),
    nullif(p_payload->>'duration_seconds', '')::integer,
    p_payload->>'poster_url',
    p_payload->>'mp4_url',
    p_payload->>'hls_manifest_url',
    p_payload->>'storage_bucket',
    p_payload->>'storage_path',
    coalesce((p_payload->>'is_private')::boolean, true),
    coalesce((p_payload->>'signed_url_required')::boolean, true),
    coalesce(nullif(p_payload->>'hls_status', ''), 'EMPTY_REAL'),
    coalesce(nullif(p_payload->>'cdn_status', ''), 'EMPTY_REAL'),
    coalesce(p_payload->'quality_options', '[]'::jsonb),
    coalesce(p_payload->'playback_speed_options', '[0.75,1,1.25,1.5,2]'::jsonb),
    coalesce(p_payload->'metadata', '{}'::jsonb),
    coalesce(nullif(p_payload->>'status', ''), 'active'),
    auth.uid(),
    auth.uid()
  )
  returning * into v_asset;

  return jsonb_build_object('asset', to_jsonb(v_asset));
end;
$$;

create or replace function public.video_record_event(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_asset public.educational_video_assets%rowtype;
  v_progress public.educational_video_progress%rowtype;
  v_event public.educational_video_events%rowtype;
  v_student_id uuid := nullif(p_payload->>'student_id', '')::uuid;
  v_event_type text := upper(coalesce(nullif(p_payload->>'event_type', ''), 'PROGRESS'));
  v_position integer := greatest(coalesce(nullif(p_payload->>'position_seconds', '')::integer, 0), 0);
  v_duration integer;
  v_percent numeric(5,2) := 0;
  v_increment integer := 0;
  v_status text := 'in_progress';
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_asset
  from public.educational_video_assets
  where id = nullif(p_payload->>'asset_id', '')::uuid;

  if v_asset.id is null then
    raise exception 'VIDEO_ASSET_NOT_FOUND';
  end if;

  if not public.video_user_can_access(v_asset.id, v_student_id) then
    raise exception 'UNAUTHORIZED_VIDEO_ACCESS';
  end if;

  if v_event_type not in ('PLAY', 'PAUSE', 'SEEK', 'PROGRESS', 'COMPLETE', 'SPEED_CHANGE') then
    raise exception 'INVALID_VIDEO_EVENT';
  end if;

  v_duration := coalesce(nullif(p_payload->>'duration_seconds', '')::integer, v_asset.duration_seconds);
  if v_duration is not null then
    v_position := least(v_position, v_duration);
    v_percent := round(((v_position::numeric / greatest(v_duration, 1)) * 100)::numeric, 2);
  end if;

  select * into v_progress
  from public.educational_video_progress
  where asset_id = v_asset.id
    and user_profile_id = auth.uid()
    and student_key = coalesce(v_student_id, '00000000-0000-0000-0000-000000000000'::uuid)
  for update;

  if v_progress.id is not null and v_event_type in ('PLAY', 'PAUSE', 'PROGRESS', 'SPEED_CHANGE', 'COMPLETE') then
    v_increment := greatest(0, least(v_position - v_progress.last_position_seconds, 60));
  end if;

  if v_duration is not null and (v_percent >= 95 or (v_event_type = 'COMPLETE' and v_position >= floor(v_duration * 0.9))) then
    v_status := 'completed';
  end if;

  insert into public.educational_video_progress (
    asset_id, school_id, source_module, source_id, user_profile_id, student_id,
    last_position_seconds, duration_seconds, percent_watched, max_percent_watched,
    total_watch_seconds, status, first_started_at, last_played_at, completed_at, event_count
  )
  values (
    v_asset.id, v_asset.school_id, v_asset.source_module, v_asset.source_id, auth.uid(), v_student_id,
    v_position, v_duration, v_percent, v_percent, v_increment,
    v_status, now(), now(), case when v_status = 'completed' then now() else null end, 1
  )
  on conflict on constraint educational_video_progress_asset_user_student_unique
  do update set
    last_position_seconds = excluded.last_position_seconds,
    duration_seconds = coalesce(public.educational_video_progress.duration_seconds, excluded.duration_seconds),
    percent_watched = excluded.percent_watched,
    max_percent_watched = greatest(public.educational_video_progress.max_percent_watched, excluded.max_percent_watched),
    total_watch_seconds = public.educational_video_progress.total_watch_seconds + excluded.total_watch_seconds,
    status = case
      when public.educational_video_progress.status = 'completed' or excluded.status = 'completed' then 'completed'
      else 'in_progress'
    end,
    first_started_at = coalesce(public.educational_video_progress.first_started_at, excluded.first_started_at),
    last_played_at = now(),
    completed_at = coalesce(public.educational_video_progress.completed_at, excluded.completed_at),
    event_count = public.educational_video_progress.event_count + 1,
    updated_at = now()
  returning * into v_progress;

  insert into public.educational_video_events (
    asset_id, progress_id, school_id, source_module, source_id, user_profile_id, student_id,
    event_type, position_seconds, duration_seconds, percent_watched, playback_rate,
    quality_label, client_event_id, metadata
  )
  values (
    v_asset.id, v_progress.id, v_asset.school_id, v_asset.source_module, v_asset.source_id, auth.uid(), v_student_id,
    v_event_type, v_position, v_duration, v_percent,
    nullif(p_payload->>'playback_rate', '')::numeric,
    nullif(p_payload->>'quality_label', ''),
    nullif(p_payload->>'client_event_id', ''),
    coalesce(p_payload->'metadata', '{}'::jsonb)
  )
  on conflict do nothing
  returning * into v_event;

  return jsonb_build_object('progress', to_jsonb(v_progress), 'event_recorded', v_event.id is not null);
end;
$$;

create or replace function public.video_get_progress(p_asset_id uuid, p_student_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select case
    when not public.video_user_can_access(p_asset_id, p_student_id) then
      jsonb_build_object('authorized', false)
    else
      jsonb_build_object(
        'authorized', true,
        'progress', (
          select to_jsonb(p)
          from public.educational_video_progress p
          where p.asset_id = p_asset_id
            and p.user_profile_id = auth.uid()
            and p.student_key = coalesce(p_student_id, '00000000-0000-0000-0000-000000000000'::uuid)
          order by p.updated_at desc
          limit 1
        )
      )
    end;
$$;

create or replace function public.video_analytics_summary(
  p_school_id uuid,
  p_source_module text default null,
  p_source_id text default null,
  p_student_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not (
    public.is_platform_admin()
    or public.secretaria_can_manage_school(p_school_id)
    or exists (select 1 from public.current_institutional_school_ids() ids where ids.school_id = p_school_id)
  ) then
    raise exception 'UNAUTHORIZED_VIDEO_ANALYTICS';
  end if;

  return (
    with scoped as (
      select p.*
      from public.educational_video_progress p
      where p.school_id = p_school_id
        and (p_source_module is null or p.source_module = upper(p_source_module))
        and (p_source_id is null or p.source_id = p_source_id)
        and (p_student_id is null or p.student_id = p_student_id)
    ), events as (
      select e.*
      from public.educational_video_events e
      where e.school_id = p_school_id
        and (p_source_module is null or e.source_module = upper(p_source_module))
        and (p_source_id is null or e.source_id = p_source_id)
        and (p_student_id is null or e.student_id = p_student_id)
    )
    select jsonb_build_object(
      'views', coalesce((select count(*) from events where event_type = 'PLAY'), 0),
      'unique_viewers', coalesce((select count(distinct user_profile_id) from scoped), 0),
      'total_watch_seconds', coalesce((select sum(total_watch_seconds) from scoped), 0),
      'average_percent', coalesce((select round(avg(max_percent_watched)::numeric, 2) from scoped), 0),
      'completions', coalesce((select count(*) from scoped where status = 'completed'), 0),
      'abandonments', coalesce((select count(*) from scoped where status <> 'completed' and max_percent_watched between 1 and 94.99), 0),
      'resumes', coalesce((select count(*) from events where event_type = 'PLAY'), 0)
    )
  );
end;
$$;

create or replace function public.video_official_report_payload(
  p_school_id uuid,
  p_source_module text default null,
  p_source_id text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  return jsonb_build_object(
    'engine', 'official_reports_p0_live',
    'report_type', 'VIDEO_PLAYER_ANALYTICS_V1',
    'school_id', p_school_id,
    'source_module', p_source_module,
    'source_id', p_source_id,
    'summary', public.video_analytics_summary(p_school_id, p_source_module, p_source_id, null)
  );
end;
$$;

alter table public.educational_video_assets enable row level security;
alter table public.educational_video_captions enable row level security;
alter table public.educational_video_progress enable row level security;
alter table public.educational_video_events enable row level security;
alter table public.educational_video_analytics_snapshots enable row level security;

drop policy if exists educational_video_assets_select_authorized on public.educational_video_assets;
create policy educational_video_assets_select_authorized on public.educational_video_assets
for select to authenticated
using (public.video_user_can_access(id, null));

drop policy if exists educational_video_captions_select_authorized on public.educational_video_captions;
create policy educational_video_captions_select_authorized on public.educational_video_captions
for select to authenticated
using (exists (select 1 from public.educational_video_assets a where a.id = asset_id and public.video_user_can_access(a.id, null)));

drop policy if exists educational_video_progress_select_authorized on public.educational_video_progress;
create policy educational_video_progress_select_authorized on public.educational_video_progress
for select to authenticated
using (
  user_profile_id = auth.uid()
  or public.institutional_is_current_student(student_id)
  or public.communication_guardian_can_read(school_id, null, student_id, 'student')
  or public.secretaria_can_manage_school(school_id)
  or exists (select 1 from public.current_institutional_school_ids() ids where ids.school_id = educational_video_progress.school_id)
);

drop policy if exists educational_video_events_select_authorized on public.educational_video_events;
create policy educational_video_events_select_authorized on public.educational_video_events
for select to authenticated
using (
  user_profile_id = auth.uid()
  or public.secretaria_can_manage_school(school_id)
  or exists (select 1 from public.current_institutional_school_ids() ids where ids.school_id = educational_video_events.school_id)
);

drop policy if exists educational_video_snapshots_select_authorized on public.educational_video_analytics_snapshots;
create policy educational_video_snapshots_select_authorized on public.educational_video_analytics_snapshots
for select to authenticated
using (
  school_id is null
  or public.secretaria_can_manage_school(school_id)
  or exists (select 1 from public.current_institutional_school_ids() ids where ids.school_id = educational_video_analytics_snapshots.school_id)
);

revoke all on public.educational_video_assets from public, anon, authenticated;
revoke all on public.educational_video_captions from public, anon, authenticated;
revoke all on public.educational_video_progress from public, anon, authenticated;
revoke all on public.educational_video_events from public, anon, authenticated;
revoke all on public.educational_video_analytics_snapshots from public, anon, authenticated;

grant select on public.educational_video_assets to authenticated;
grant select on public.educational_video_captions to authenticated;
grant select on public.educational_video_progress to authenticated;
grant select on public.educational_video_events to authenticated;
grant select on public.educational_video_analytics_snapshots to authenticated;

grant all on public.educational_video_assets to service_role;
grant all on public.educational_video_captions to service_role;
grant all on public.educational_video_progress to service_role;
grant all on public.educational_video_events to service_role;
grant all on public.educational_video_analytics_snapshots to service_role;

revoke all on function public.video_user_can_access(uuid, uuid) from public, anon;
revoke all on function public.video_register_asset(jsonb) from public, anon;
revoke all on function public.video_record_event(jsonb) from public, anon;
revoke all on function public.video_get_progress(uuid, uuid) from public, anon;
revoke all on function public.video_analytics_summary(uuid, text, text, uuid) from public, anon;
revoke all on function public.video_official_report_payload(uuid, text, text) from public, anon;

grant execute on function public.video_user_can_access(uuid, uuid) to authenticated, service_role;
grant execute on function public.video_register_asset(jsonb) to authenticated, service_role;
grant execute on function public.video_record_event(jsonb) to authenticated, service_role;
grant execute on function public.video_get_progress(uuid, uuid) to authenticated, service_role;
grant execute on function public.video_analytics_summary(uuid, text, text, uuid) to authenticated, service_role;
grant execute on function public.video_official_report_payload(uuid, text, text) to authenticated, service_role;

do $$
begin
  if (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'educational_video_assets',
        'educational_video_captions',
        'educational_video_progress',
        'educational_video_events',
        'educational_video_analytics_snapshots'
      )
  ) <> 5 then
    raise exception 'VALIDACAO bloqueada: tabelas de video incompletas';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and lower(grantee) in ('anon', 'public')
      and table_name like 'educational_video_%'
  ) then
    raise exception 'VALIDACAO bloqueada: anon/public com grants no motor de video';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name like 'educational_video_%'
      and column_name in ('api_key', 'secret', 'token', 'provider_secret', 'access_token')
  ) then
    raise exception 'VALIDACAO bloqueada: segredo no schema de video';
  end if;

  if exists (
    select 1
    from public.educational_video_assets
    where is_private is true
      and (mp4_url is not null or hls_manifest_url is not null or signed_url_required is false)
  ) then
    raise exception 'VALIDACAO bloqueada: video privado com URL permanente exposta';
  end if;
end $$;

comment on table public.educational_video_assets is
  'Catalogo tecnico canonico para player educacional reutilizavel. Conteudo/acervo entra na mobilizacao.';
comment on table public.educational_video_progress is
  'Progresso server-side de consumo de video por usuario/aluno/conteudo.';
comment on table public.educational_video_events is
  'Eventos canonicos de playback: PLAY, PAUSE, SEEK, PROGRESS, COMPLETE e SPEED_CHANGE.';
