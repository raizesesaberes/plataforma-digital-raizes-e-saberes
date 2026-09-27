-- Comunicacao Avancada + Aulas ao Vivo V1
-- Evolui communications -> communication_deliveries sem criar segundo motor de mensagens.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.communications') is null then
    raise exception 'PRE-CHECK bloqueado: communications nao existe';
  end if;
  if to_regclass('public.communication_deliveries') is null then
    raise exception 'PRE-CHECK bloqueado: communication_deliveries nao existe';
  end if;
end $$;

alter table public.communications
  add column if not exists target_group_id uuid references public.recomposition_intervention_groups(id) on delete set null,
  add column if not exists grade_label text,
  add column if not exists staff_role text,
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists media jsonb not null default '[]'::jsonb,
  add column if not exists advanced_metadata jsonb not null default '{}'::jsonb;

alter table public.communications drop constraint if exists communications_audience_check;
alter table public.communications drop constraint if exists communications_audience_shape_check;
alter table public.communications
  add constraint communications_audience_check
    check (audience_type = any (array['student'::text, 'class'::text, 'school'::text, 'group'::text, 'grade'::text, 'staff'::text])),
  add constraint communications_audience_shape_check
    check (
      ((audience_type = 'school') and class_id is null and student_id is null and target_group_id is null and grade_label is null and staff_role is null)
      or ((audience_type = 'class') and class_id is not null and student_id is null)
      or ((audience_type = 'student') and class_id is not null and student_id is not null)
      or ((audience_type = 'group') and target_group_id is not null)
      or ((audience_type = 'grade') and grade_label is not null)
      or ((audience_type = 'staff') and staff_role is not null)
    );

alter table public.communication_events drop constraint if exists communication_events_type_check;
alter table public.communication_events drop constraint if exists communication_events_status_check;
alter table public.communication_events
  add constraint communication_events_type_check
    check (event_type = any (array['created'::text, 'published'::text, 'edited'::text, 'archived'::text, 'deleted'::text, 'reported'::text, 'moderation_updated'::text])),
  add constraint communication_events_status_check
    check (
      ((from_status is null) or (from_status = any (array['draft'::text, 'published'::text, 'archived'::text, 'deleted'::text, 'REPORTADO'::text, 'EM_ANALISE'::text, 'RESOLVIDO'::text])))
      and ((to_status is null) or (to_status = any (array['draft'::text, 'published'::text, 'archived'::text, 'deleted'::text, 'REPORTADO'::text, 'EM_ANALISE'::text, 'RESOLVIDO'::text])))
    );

create table if not exists public.communication_attachments (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  file_size_bytes bigint,
  visibility text not null default 'private',
  uploaded_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint communication_attachments_visibility_check check (visibility in ('private', 'restricted')),
  constraint communication_attachments_private_path_check check (storage_path !~* '(^|/)public(/|$)')
);

create table if not exists public.communication_moderation_reports (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications(id) on delete cascade,
  delivery_id uuid references public.communication_deliveries(id) on delete set null,
  school_id uuid not null references public.schools(id) on delete cascade,
  reporter_profile_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  reason text not null,
  description text,
  status text not null default 'REPORTADO',
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  resolution_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint communication_reports_reason_check check (reason in ('bullying', 'spam', 'conteudo_improprio', 'outro')),
  constraint communication_reports_status_check check (status in ('REPORTADO', 'EM_ANALISE', 'RESOLVIDO'))
);

create table if not exists public.communication_permission_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  professor_student_enabled boolean not null default true,
  professor_professor_enabled boolean not null default true,
  professor_coordination_enabled boolean not null default true,
  student_student_enabled boolean not null default false,
  external_guest_messages_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id)
);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  host_teacher_id uuid references public.teachers(id) on delete set null,
  host_profile_id uuid not null default auth.uid() references auth.users(id) on delete restrict,
  audience_type text not null default 'class',
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  duration_minutes integer,
  status text not null default 'SCHEDULED',
  provider text,
  provider_status text not null default 'EMPTY_REAL',
  room_url text,
  room_external_id text,
  recording_url text,
  replay_available boolean not null default false,
  capabilities jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_sessions_audience_check check (audience_type in ('class', 'school', 'group')),
  constraint live_sessions_status_check check (status in ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'ARCHIVED')),
  constraint live_sessions_provider_check check (provider_status in ('PASS', 'EMPTY_REAL', 'FAIL')),
  constraint live_sessions_duration_check check (duration_minutes is null or duration_minutes > 0)
);

create table if not exists public.live_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  role text not null,
  join_status text not null default 'INVITED',
  joined_at timestamptz,
  left_at timestamptz,
  attendance_minutes integer not null default 0,
  muted boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_participants_role_check check (role in ('host', 'teacher', 'student', 'guardian', 'staff', 'guest')),
  constraint live_participants_status_check check (join_status in ('INVITED', 'JOINED', 'LEFT', 'ABSENT', 'BLOCKED'))
);

create table if not exists public.live_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  actor_profile_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.live_provider_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  provider text,
  provider_status text not null default 'EMPTY_REAL',
  capabilities jsonb not null default '{}'::jsonb,
  secret_configured boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id),
  constraint live_provider_status_check check (provider_status in ('PASS', 'EMPTY_REAL', 'FAIL'))
);

create index if not exists communication_attachments_comm_idx on public.communication_attachments (communication_id, created_at desc);
create index if not exists communication_reports_school_status_idx on public.communication_moderation_reports (school_id, status, created_at desc);
create index if not exists live_sessions_school_time_idx on public.live_sessions (school_id, starts_at desc, status);
create index if not exists live_sessions_class_time_idx on public.live_sessions (class_id, starts_at desc);
create index if not exists live_participants_profile_idx on public.live_session_participants (profile_id, join_status, created_at desc);
create unique index if not exists live_participants_unique_context_idx
  on public.live_session_participants (
    session_id,
    profile_id,
    coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
create index if not exists live_events_session_idx on public.live_session_events (session_id, created_at desc);

drop trigger if exists communication_reports_touch_updated_at on public.communication_moderation_reports;
create trigger communication_reports_touch_updated_at
before update on public.communication_moderation_reports
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists communication_permission_settings_touch_updated_at on public.communication_permission_settings;
create trigger communication_permission_settings_touch_updated_at
before update on public.communication_permission_settings
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists live_sessions_touch_updated_at on public.live_sessions;
create trigger live_sessions_touch_updated_at
before update on public.live_sessions
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists live_participants_touch_updated_at on public.live_session_participants;
create trigger live_participants_touch_updated_at
before update on public.live_session_participants
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists live_provider_settings_touch_updated_at on public.live_provider_settings;
create trigger live_provider_settings_touch_updated_at
before update on public.live_provider_settings
for each row execute function public.institutional_touch_updated_at();

create or replace function public.communication_permissions_for_school(p_school_id uuid)
returns public.communication_permission_settings
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_settings public.communication_permission_settings%rowtype;
begin
  select * into v_settings
  from public.communication_permission_settings
  where school_id = p_school_id;

  if v_settings.id is null then
    select * into v_settings
    from public.communication_permission_settings
    where school_id is null
    limit 1;
  end if;

  if v_settings.id is null then
    v_settings.professor_student_enabled := true;
    v_settings.professor_professor_enabled := true;
    v_settings.professor_coordination_enabled := true;
    v_settings.student_student_enabled := false;
    v_settings.external_guest_messages_enabled := false;
  end if;

  return v_settings;
end;
$$;

create or replace function public.communication_user_can_access_advanced(p_communication public.communications)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    public.communication_can_read(p_communication)
    or exists (
      select 1
      from public.communication_deliveries d
      where d.communication_id = p_communication.id
        and d.recipient_profile_id = auth.uid()
    )
    or (
      p_communication.audience_type = 'staff'
      and exists (
        select 1
        from public.school_memberships sm
        where sm.school_id = p_communication.school_id
          and sm.profile_id = auth.uid()
          and sm.status = 'active'
          and sm.membership_role = p_communication.staff_role
          and sm.started_at <= now()
          and (sm.ended_at is null or sm.ended_at > now())
      )
    );
$$;

create or replace function public.communication_generate_deliveries(p_communication_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_comm public.communications%rowtype;
  v_inserted integer := 0;
begin
  select * into v_comm from public.communications where id = p_communication_id;
  if v_comm.id is null or not public.communication_delivery_is_active(v_comm) then
    return 0;
  end if;

  with eligible as (
    select distinct g.profile_id as recipient_profile_id, e.student_id, e.school_id
    from public.enrollments e
    join public.student_guardian_links sgl on sgl.student_id = e.student_id
    join public.guardians g on g.id = sgl.guardian_id
    join public.profiles p on p.id = g.profile_id
    where g.profile_id is not null and g.status = 'active' and sgl.status = 'active'
      and e.status = 'active' and e.ended_at is null and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
        or (v_comm.audience_type = 'grade' and exists (select 1 from public.classes c where c.id = e.class_id and c.ano_escolar = v_comm.grade_label))
        or (v_comm.audience_type = 'group' and exists (select 1 from public.recomposition_intervention_group_students gs where gs.group_id = v_comm.target_group_id and gs.student_id = e.student_id and gs.status = 'active'))
      )
    union
    select distinct sg.profile_id, e.student_id, e.school_id
    from public.enrollments e
    join public.student_guardians sg on sg.student_id = e.student_id
    join public.profiles p on p.id = sg.profile_id
    where sg.status = 'active' and e.status = 'active' and e.ended_at is null and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
        or (v_comm.audience_type = 'grade' and exists (select 1 from public.classes c where c.id = e.class_id and c.ano_escolar = v_comm.grade_label))
        or (v_comm.audience_type = 'group' and exists (select 1 from public.recomposition_intervention_group_students gs where gs.group_id = v_comm.target_group_id and gs.student_id = e.student_id and gs.status = 'active'))
      )
    union
    select distinct s.user_id, e.student_id, e.school_id
    from public.enrollments e
    join public.students s on s.id = e.student_id
    join public.profiles p on p.id = s.user_id and p.platform_role = 'aluno'
    where s.user_id is not null and e.status = 'active' and e.ended_at is null and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
        or (v_comm.audience_type = 'grade' and exists (select 1 from public.classes c where c.id = e.class_id and c.ano_escolar = v_comm.grade_label))
        or (v_comm.audience_type = 'group' and exists (select 1 from public.recomposition_intervention_group_students gs where gs.group_id = v_comm.target_group_id and gs.student_id = e.student_id and gs.status = 'active'))
      )
    union
    select distinct sm.profile_id, null::uuid, sm.school_id
    from public.school_memberships sm
    join public.profiles p on p.id = sm.profile_id
    where v_comm.audience_type = 'staff'
      and sm.school_id = v_comm.school_id
      and sm.status = 'active'
      and sm.membership_role = v_comm.staff_role
      and sm.started_at <= now()
      and (sm.ended_at is null or sm.ended_at > now())
  )
  insert into public.communication_deliveries (
    communication_id, recipient_profile_id, student_id, school_id, delivered_at, notification_status
  )
  select v_comm.id, eligible.recipient_profile_id, eligible.student_id, eligible.school_id, now(), 'unread'
  from eligible
  where eligible.recipient_profile_id is not null
  on conflict (communication_id, recipient_profile_id, (coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.publish_advanced_communication(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_school_id uuid := nullif(p_payload->>'school_id', '')::uuid;
  v_class_id uuid := nullif(p_payload->>'class_id', '')::uuid;
  v_student_id uuid := nullif(p_payload->>'student_id', '')::uuid;
  v_group_id uuid := nullif(p_payload->>'target_group_id', '')::uuid;
  v_audience text := coalesce(nullif(p_payload->>'audience_type', ''), 'class');
  v_status text := coalesce(nullif(p_payload->>'status', ''), 'published');
  v_role text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', auth.jwt() -> 'app_metadata' ->> 'role', ''));
  v_settings public.communication_permission_settings%rowtype;
  v_comm public.communications%rowtype;
  v_attachment jsonb;
  v_deliveries integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio';
  end if;

  if v_school_id is null then
    raise exception 'school_id obrigatorio';
  end if;

  v_settings := public.communication_permissions_for_school(v_school_id);

  if v_audience not in ('student', 'class', 'school', 'group', 'grade', 'staff') then
    raise exception 'Tipo de destino invalido';
  end if;

  if v_role = 'aluno' and not v_settings.student_student_enabled then
    raise exception 'Comunicacao aluno-aluno bloqueada por padrao';
  end if;

  if v_role = 'professor' and v_audience in ('student', 'class', 'group', 'grade') and not v_settings.professor_student_enabled then
    raise exception 'Comunicacao professor-aluno bloqueada';
  end if;

  if public.secretaria_can_manage_school(v_school_id) then
    null;
  elsif v_role = 'professor' and v_audience in ('student', 'class') and public.communication_teacher_can_target(v_school_id, v_class_id, v_student_id, v_audience) then
    null;
  elsif v_role = 'professor' and v_audience = 'staff' and v_settings.professor_professor_enabled then
    null;
  elsif v_role = 'professor' and v_audience = 'group' and exists (
    select 1
    from public.recomposition_intervention_groups g
    where g.id = v_group_id
      and g.school_id = v_school_id
      and public.communication_teacher_can_target(v_school_id, g.class_id, null, 'class')
  ) then
    null;
  else
    raise exception 'Usuario sem permissao para publicar este comunicado';
  end if;

  insert into public.communications (
    school_id, author_profile_id, author_role, communication_type, audience_type,
    class_id, student_id, target_group_id, grade_label, staff_role,
    title, body, links, media, advanced_metadata,
    communication_date, expires_at, status
  )
  values (
    v_school_id, auth.uid(), coalesce(nullif(v_role, ''), 'authenticated'),
    coalesce(nullif(p_payload->>'communication_type', ''), 'message'),
    v_audience,
    v_class_id,
    v_student_id,
    v_group_id,
    nullif(p_payload->>'grade_label', ''),
    nullif(p_payload->>'staff_role', ''),
    btrim(coalesce(p_payload->>'title', '')),
    btrim(coalesce(p_payload->>'body', '')),
    coalesce(p_payload->'links', '[]'::jsonb),
    coalesce(p_payload->'media', '[]'::jsonb),
    coalesce(p_payload->'metadata', '{}'::jsonb),
    coalesce(nullif(p_payload->>'communication_date', '')::date, current_date),
    nullif(p_payload->>'expires_at', '')::timestamptz,
    v_status
  )
  returning * into v_comm;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, 'created', null, v_comm.status, auth.uid());

  for v_attachment in
    select value from jsonb_array_elements(coalesce(p_payload->'attachments', '[]'::jsonb))
  loop
    insert into public.communication_attachments (
      communication_id, school_id, storage_bucket, storage_path, file_name,
      mime_type, file_size_bytes, visibility, metadata
    )
    values (
      v_comm.id,
      v_school_id,
      coalesce(nullif(v_attachment->>'storage_bucket', ''), 'communication-attachments'),
      v_attachment->>'storage_path',
      coalesce(nullif(v_attachment->>'file_name', ''), 'anexo'),
      v_attachment->>'mime_type',
      nullif(v_attachment->>'file_size_bytes', '')::bigint,
      'private',
      coalesce(v_attachment->'metadata', '{}'::jsonb)
    );
  end loop;

  if v_comm.status = 'published' then
    insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
    values (v_comm.id, 'published', 'draft', 'published', auth.uid());
    v_deliveries := public.communication_generate_deliveries(v_comm.id);
  end if;

  return jsonb_build_object('communication_id', v_comm.id, 'deliveries_created', v_deliveries);
end;
$$;

create or replace function public.communication_report_delivery(
  p_delivery_id uuid,
  p_reason text,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_delivery public.communication_deliveries%rowtype;
  v_report public.communication_moderation_reports%rowtype;
begin
  select * into v_delivery
  from public.communication_deliveries
  where id = p_delivery_id;

  if v_delivery.id is null or v_delivery.recipient_profile_id <> auth.uid() then
    raise exception 'Entrega nao encontrada ou nao autorizada';
  end if;

  insert into public.communication_moderation_reports (
    communication_id, delivery_id, school_id, reporter_profile_id, reason, description
  )
  values (v_delivery.communication_id, v_delivery.id, v_delivery.school_id, auth.uid(), p_reason, p_description)
  returning * into v_report;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_delivery.communication_id, 'reported', null, 'REPORTADO', auth.uid());

  return jsonb_build_object('report', to_jsonb(v_report));
end;
$$;

create or replace function public.communication_review_report(
  p_report_id uuid,
  p_status text,
  p_resolution_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_report public.communication_moderation_reports%rowtype;
begin
  select * into v_report
  from public.communication_moderation_reports
  where id = p_report_id
  for update;

  if v_report.id is null then
    raise exception 'Denuncia nao encontrada';
  end if;

  if not public.secretaria_can_manage_school(v_report.school_id) then
    raise exception 'Acesso negado para moderacao';
  end if;

  update public.communication_moderation_reports
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = case when p_status = 'RESOLVIDO' then now() else reviewed_at end,
         resolution_notes = p_resolution_notes
   where id = p_report_id
   returning * into v_report;

  return jsonb_build_object('report', to_jsonb(v_report));
end;
$$;

create or replace function public.live_session_can_access(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.live_sessions ls
    where ls.id = p_session_id
      and (
        ls.host_profile_id = auth.uid()
        or public.secretaria_can_manage_school(ls.school_id)
        or exists (
          select 1
          from public.class_teacher_memberships ctm
          join public.teachers t on t.id = ctm.teacher_id
          where ctm.class_id = ls.class_id
            and t.profile_id = auth.uid()
            and ctm.status = 'active'
            and ctm.started_at <= now()
            and (ctm.ended_at is null or ctm.ended_at > now())
        )
        or exists (
          select 1
          from public.live_session_participants lsp
          where lsp.session_id = ls.id
            and lsp.profile_id = auth.uid()
            and lsp.join_status <> 'BLOCKED'
        )
      )
  );
$$;

create or replace function public.teacher_create_live_session(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_class_id uuid := nullif(p_payload->>'class_id', '')::uuid;
  v_school_id uuid;
  v_teacher_id uuid;
  v_provider public.live_provider_settings%rowtype;
  v_session public.live_sessions%rowtype;
  v_invited integer := 0;
begin
  select c.school_id into v_school_id from public.classes c where c.id = v_class_id;
  if v_school_id is null then
    v_school_id := nullif(p_payload->>'school_id', '')::uuid;
  end if;
  if v_school_id is null then
    raise exception 'school_id ou class_id obrigatorio';
  end if;

  select t.id into v_teacher_id
  from public.teachers t
  where t.profile_id = auth.uid()
    and t.school_id = v_school_id
    and coalesce(t.status, 'active') = 'active'
  limit 1;

  if not public.secretaria_can_manage_school(v_school_id) and not exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t on t.id = ctm.teacher_id
    where ctm.class_id = v_class_id
      and t.profile_id = auth.uid()
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
  ) then
    raise exception 'Acesso negado para criar aula ao vivo';
  end if;

  select * into v_provider
  from public.live_provider_settings
  where school_id = v_school_id;

  insert into public.live_sessions (
    school_id, class_id, host_teacher_id, host_profile_id, audience_type,
    title, description, starts_at, ends_at, duration_minutes,
    provider, provider_status, room_url, room_external_id, capabilities, metadata
  )
  values (
    v_school_id,
    v_class_id,
    v_teacher_id,
    auth.uid(),
    coalesce(nullif(p_payload->>'audience_type', ''), 'class'),
    coalesce(nullif(p_payload->>'title', ''), 'Aula ao vivo'),
    p_payload->>'description',
    coalesce(nullif(p_payload->>'starts_at', '')::timestamptz, now()),
    nullif(p_payload->>'ends_at', '')::timestamptz,
    nullif(p_payload->>'duration_minutes', '')::integer,
    v_provider.provider,
    coalesce(v_provider.provider_status, 'EMPTY_REAL'),
    p_payload->>'room_url',
    p_payload->>'room_external_id',
    jsonb_build_object(
      'chat', coalesce((p_payload->>'chat')::boolean, true),
      'attendance', true,
      'mute', coalesce((p_payload->>'mute')::boolean, true),
      'screen_share', coalesce((p_payload->>'screen_share')::boolean, false),
      'media_playback', coalesce((p_payload->>'media_playback')::boolean, false),
      'recording', coalesce((p_payload->>'recording')::boolean, false),
      'external_guest_link', coalesce((p_payload->>'external_guest_link')::boolean, false)
    ),
    coalesce(p_payload->'metadata', '{}'::jsonb)
  )
  returning * into v_session;

  insert into public.live_session_events (session_id, actor_profile_id, event_type, details)
  values (v_session.id, auth.uid(), 'CREATED', to_jsonb(v_session));

  insert into public.live_session_participants (session_id, profile_id, role, join_status)
  values (v_session.id, auth.uid(), 'host', 'INVITED')
  on conflict do nothing;

  if v_class_id is not null then
    insert into public.live_session_participants (session_id, profile_id, student_id, role, join_status)
    select distinct v_session.id, s.user_id, e.student_id, 'student', 'INVITED'
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.class_id = v_class_id
      and e.school_id = v_school_id
      and e.status = 'active'
      and e.ended_at is null
      and s.user_id is not null
    on conflict do nothing;
    get diagnostics v_invited = row_count;
  end if;

  return jsonb_build_object(
    'session', to_jsonb(v_session),
    'participants_invited', v_invited,
    'live_provider', coalesce(v_session.provider_status, 'EMPTY_REAL')
  );
end;
$$;

create or replace function public.live_join_session(p_session_id uuid, p_student_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_session public.live_sessions%rowtype;
  v_participant public.live_session_participants%rowtype;
begin
  select * into v_session
  from public.live_sessions
  where id = p_session_id;

  if v_session.id is null or not public.live_session_can_access(p_session_id) then
    raise exception 'Acesso negado a aula ao vivo';
  end if;

  select * into v_participant
  from public.live_session_participants
  where session_id = p_session_id
    and profile_id = auth.uid()
    and (p_student_id is null or student_id = p_student_id)
  order by created_at desc
  limit 1;

  if v_participant.id is null then
    raise exception 'Participante nao autorizado para esta sessao';
  end if;

  update public.live_session_participants
     set join_status = 'JOINED',
         joined_at = coalesce(joined_at, now()),
         updated_at = now()
   where id = v_participant.id
   returning * into v_participant;

  insert into public.live_session_events (session_id, actor_profile_id, event_type, details)
  values (p_session_id, auth.uid(), 'JOINED', jsonb_build_object('participant_id', v_participant.id));

  return jsonb_build_object(
    'session_id', p_session_id,
    'join_status', v_participant.join_status,
    'provider_status', v_session.provider_status,
    'room_url', case when v_session.provider_status = 'PASS' then v_session.room_url else null end,
    'capabilities', v_session.capabilities
  );
end;
$$;

create or replace function public.live_list_sessions(p_student_id uuid default null)
returns setof public.live_sessions
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select distinct ls.*
  from public.live_sessions ls
  left join public.live_session_participants lsp on lsp.session_id = ls.id
  where public.secretaria_can_manage_school(ls.school_id)
     or ls.host_profile_id = auth.uid()
     or lsp.profile_id = auth.uid()
     or (
       p_student_id is not null
       and lsp.student_id = p_student_id
       and public.communication_current_student_can_read(ls.school_id, ls.class_id, p_student_id, 'class')
     )
  order by ls.starts_at desc;
$$;

alter table public.communication_attachments enable row level security;
alter table public.communication_moderation_reports enable row level security;
alter table public.communication_permission_settings enable row level security;
alter table public.live_sessions enable row level security;
alter table public.live_session_participants enable row level security;
alter table public.live_session_events enable row level security;
alter table public.live_provider_settings enable row level security;

drop policy if exists communication_attachments_select_authorized on public.communication_attachments;
create policy communication_attachments_select_authorized on public.communication_attachments
for select to authenticated
using (
  exists (
    select 1 from public.communications c
    where c.id = communication_attachments.communication_id
      and public.communication_user_can_access_advanced(c)
  )
);

drop policy if exists communication_reports_select_authorized on public.communication_moderation_reports;
create policy communication_reports_select_authorized on public.communication_moderation_reports
for select to authenticated
using (reporter_profile_id = auth.uid() or public.secretaria_can_manage_school(school_id));

drop policy if exists communication_permissions_select_authorized on public.communication_permission_settings;
create policy communication_permissions_select_authorized on public.communication_permission_settings
for select to authenticated
using (school_id is null or public.secretaria_can_manage_school(school_id));

drop policy if exists live_sessions_select_authorized on public.live_sessions;
create policy live_sessions_select_authorized on public.live_sessions
for select to authenticated
using (public.live_session_can_access(id));

drop policy if exists live_participants_select_authorized on public.live_session_participants;
create policy live_participants_select_authorized on public.live_session_participants
for select to authenticated
using (profile_id = auth.uid() or public.live_session_can_access(session_id));

drop policy if exists live_events_select_authorized on public.live_session_events;
create policy live_events_select_authorized on public.live_session_events
for select to authenticated
using (public.live_session_can_access(session_id));

drop policy if exists live_provider_settings_select_authorized on public.live_provider_settings;
create policy live_provider_settings_select_authorized on public.live_provider_settings
for select to authenticated
using (school_id is null or public.secretaria_can_manage_school(school_id));

revoke all on public.communication_attachments from public, anon;
revoke all on public.communication_moderation_reports from public, anon;
revoke all on public.communication_permission_settings from public, anon;
revoke all on public.live_sessions from public, anon;
revoke all on public.live_session_participants from public, anon;
revoke all on public.live_session_events from public, anon;
revoke all on public.live_provider_settings from public, anon;

grant select on public.communication_attachments to authenticated;
grant select on public.communication_moderation_reports to authenticated;
grant select on public.communication_permission_settings to authenticated;
grant select on public.live_sessions to authenticated;
grant select on public.live_session_participants to authenticated;
grant select on public.live_session_events to authenticated;
grant select on public.live_provider_settings to authenticated;

grant all on public.communication_attachments to service_role;
grant all on public.communication_moderation_reports to service_role;
grant all on public.communication_permission_settings to service_role;
grant all on public.live_sessions to service_role;
grant all on public.live_session_participants to service_role;
grant all on public.live_session_events to service_role;
grant all on public.live_provider_settings to service_role;

revoke all on function public.communication_permissions_for_school(uuid) from public, anon;
revoke all on function public.communication_user_can_access_advanced(public.communications) from public, anon;
revoke all on function public.publish_advanced_communication(jsonb) from public, anon;
revoke all on function public.communication_report_delivery(uuid, text, text) from public, anon;
revoke all on function public.communication_review_report(uuid, text, text) from public, anon;
revoke all on function public.live_session_can_access(uuid) from public, anon;
revoke all on function public.teacher_create_live_session(jsonb) from public, anon;
revoke all on function public.live_join_session(uuid, uuid) from public, anon;
revoke all on function public.live_list_sessions(uuid) from public, anon;

grant execute on function public.communication_permissions_for_school(uuid) to authenticated, service_role;
grant execute on function public.communication_user_can_access_advanced(public.communications) to authenticated, service_role;
grant execute on function public.publish_advanced_communication(jsonb) to authenticated, service_role;
grant execute on function public.communication_report_delivery(uuid, text, text) to authenticated, service_role;
grant execute on function public.communication_review_report(uuid, text, text) to authenticated, service_role;
grant execute on function public.live_session_can_access(uuid) to authenticated, service_role;
grant execute on function public.teacher_create_live_session(jsonb) to authenticated, service_role;
grant execute on function public.live_join_session(uuid, uuid) to authenticated, service_role;
grant execute on function public.live_list_sessions(uuid) to authenticated, service_role;

do $$
begin
  if (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'communication_attachments',
        'communication_moderation_reports',
        'communication_permission_settings',
        'live_sessions',
        'live_session_participants',
        'live_session_events',
        'live_provider_settings'
      )
  ) <> 7 then
    raise exception 'VALIDACAO bloqueada: tabelas Comunicacao/Live incompletas';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'public')
      and (
        table_name like 'live_%'
        or table_name in ('communication_attachments', 'communication_moderation_reports', 'communication_permission_settings')
      )
  ) then
    raise exception 'VALIDACAO bloqueada: anon/public com grants em Comunicacao/Live';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('live_provider_settings', 'live_sessions')
      and column_name in ('api_key', 'secret', 'token', 'provider_secret', 'access_token')
  ) then
    raise exception 'VALIDACAO bloqueada: segredo de provider live no schema exposto';
  end if;

  if exists (
    select 1
    from public.communication_permission_settings
    where student_student_enabled is true
      and school_id is null
  ) then
    raise exception 'VALIDACAO bloqueada: aluno-aluno global nao pode iniciar habilitado';
  end if;
end $$;

comment on table public.communication_attachments is
  'Anexos privados/restritos vinculados ao motor canonico communications.';
comment on table public.communication_moderation_reports is
  'Denuncias e moderacao de comunicacoes com auditoria institucional.';
comment on table public.live_sessions is
  'Motor canonico de aulas ao vivo. Provedor externo fica desacoplado e pode permanecer EMPTY_REAL.';
