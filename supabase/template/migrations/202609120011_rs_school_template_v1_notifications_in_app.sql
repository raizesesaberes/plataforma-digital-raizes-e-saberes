begin;

-- Notifications V1 Phase 02.
-- Generic in-app notification events and per-recipient deliveries for Agenda
-- and Avalia+. Communication remains canonical in communication_deliveries.

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid not null,
  event_type text not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  summary text,
  deep_link text,
  priority text not null default 'normal',
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint notification_events_source_type_check
    check (source_type in ('calendar', 'assessment', 'analytics_alert')),
  constraint notification_events_event_type_check
    check (event_type in ('calendar_event_created', 'calendar_event_updated', 'assessment_available', 'assessment_deadline_soon', 'analytics_alert')),
  constraint notification_events_priority_check
    check (priority in ('normal', 'important')),
  constraint notification_events_title_not_blank
    check (length(btrim(title)) > 0),
  constraint notification_events_source_unique
    unique (source_type, source_id, event_type)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_event_id uuid not null references public.notification_events(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  channel text not null default 'in_app',
  status text not null default 'unread',
  delivered_at timestamp with time zone not null default now(),
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint notification_deliveries_channel_check check (channel = 'in_app'),
  constraint notification_deliveries_status_check check (status in ('unread', 'read', 'archived'))
);

create unique index if not exists notification_deliveries_unique_context_idx
  on public.notification_deliveries (
    notification_event_id,
    recipient_profile_id,
    coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel
  );

create index if not exists notification_events_school_created_idx
  on public.notification_events (school_id, created_at desc);

create index if not exists notification_deliveries_recipient_status_idx
  on public.notification_deliveries (recipient_profile_id, status, delivered_at desc);

create index if not exists notification_deliveries_student_idx
  on public.notification_deliveries (student_id, delivered_at desc);

drop trigger if exists notification_events_touch_updated_at on public.notification_events;
create trigger notification_events_touch_updated_at
before update on public.notification_events
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists notification_deliveries_touch_updated_at on public.notification_deliveries;
create trigger notification_deliveries_touch_updated_at
before update on public.notification_deliveries
for each row execute function public.institutional_touch_updated_at();

alter table public.notification_events enable row level security;
alter table public.notification_deliveries enable row level security;

drop policy if exists notification_events_select_own_delivery on public.notification_events;
create policy notification_events_select_own_delivery
on public.notification_events
for select
to authenticated
using (
  exists (
    select 1
    from public.notification_deliveries nd
    where nd.notification_event_id = notification_events.id
      and nd.recipient_profile_id = (select auth.uid())
  )
  or public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
);

drop policy if exists notification_deliveries_select_own on public.notification_deliveries;
create policy notification_deliveries_select_own
on public.notification_deliveries
for select
to authenticated
using (recipient_profile_id = (select auth.uid()));

create or replace function public.notification_resolve_family_and_student_recipients(
  p_school_id uuid,
  p_class_id uuid default null,
  p_student_id uuid default null,
  p_include_students boolean default true
) returns table (
  recipient_profile_id uuid,
  student_id uuid,
  school_id uuid
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with eligible_enrollments as (
    select distinct e.student_id, e.school_id, e.class_id
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.school_id = p_school_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
      and (p_class_id is null or e.class_id = p_class_id)
      and (p_student_id is null or e.student_id = p_student_id)
  )
  select distinct
    g.profile_id as recipient_profile_id,
    ee.student_id,
    ee.school_id
  from eligible_enrollments ee
  join public.student_guardian_links sgl on sgl.student_id = ee.student_id
  join public.guardians g on g.id = sgl.guardian_id
  join public.profiles p on p.id = g.profile_id
  where g.profile_id is not null
    and g.status = 'active'
    and sgl.status = 'active'

  union

  select distinct
    sg.profile_id,
    ee.student_id,
    ee.school_id
  from eligible_enrollments ee
  join public.student_guardians sg on sg.student_id = ee.student_id
  join public.profiles p on p.id = sg.profile_id
  where sg.status = 'active'

  union

  select distinct
    s.user_id,
    ee.student_id,
    ee.school_id
  from eligible_enrollments ee
  join public.students s on s.id = ee.student_id
  join public.profiles p on p.id = s.user_id and p.platform_role = 'aluno'
  where p_include_students
    and s.user_id is not null;
$$;

create or replace function public.notification_generate_deliveries(
  p_notification_event_id uuid,
  p_class_id uuid default null,
  p_student_id uuid default null,
  p_include_students boolean default true
) returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.notification_events%rowtype;
  v_inserted integer := 0;
begin
  select * into v_event
  from public.notification_events
  where id = p_notification_event_id;

  if v_event.id is null then
    return 0;
  end if;

  if v_event.source_type = 'analytics_alert' then
    return 0;
  end if;

  insert into public.notification_deliveries (
    notification_event_id,
    recipient_profile_id,
    student_id,
    school_id,
    channel,
    status,
    delivered_at
  )
  select
    v_event.id,
    eligible.recipient_profile_id,
    eligible.student_id,
    eligible.school_id,
    'in_app',
    'unread',
    now()
  from public.notification_resolve_family_and_student_recipients(
    v_event.school_id,
    p_class_id,
    p_student_id,
    p_include_students
  ) eligible
  where eligible.recipient_profile_id is not null
  on conflict (
    notification_event_id,
    recipient_profile_id,
    (coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)),
    channel
  )
  do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.notification_upsert_calendar_event(
  p_source_id uuid,
  p_source_kind text,
  p_event_type text
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_class_entry public.class_calendar_entries%rowtype;
  v_school_event public.school_calendar_events%rowtype;
  v_title text;
  v_summary text;
  v_school_id uuid;
  v_class_id uuid;
  v_created_by uuid;
begin
  if p_event_type not in ('calendar_event_created', 'calendar_event_updated') then
    raise exception 'Tipo de evento de calendario invalido.' using errcode = '22023';
  end if;

  if p_source_kind = 'class_calendar' then
    select * into v_class_entry from public.class_calendar_entries where id = p_source_id;
    if v_class_entry.id is null or v_class_entry.status <> 'published' then
      return null;
    end if;
    v_title := 'Agenda da turma atualizada';
    v_summary := coalesce(v_class_entry.title, 'Novo compromisso da turma.');
    v_school_id := v_class_entry.school_id;
    v_class_id := v_class_entry.class_id;
    select t.profile_id into v_created_by
    from public.teachers t
    where t.id = v_class_entry.teacher_id;
  elsif p_source_kind = 'school_calendar' then
    select * into v_school_event from public.school_calendar_events where id = p_source_id;
    if v_school_event.id is null or v_school_event.status <> 'published' then
      return null;
    end if;
    v_title := 'Agenda da escola atualizada';
    v_summary := coalesce(v_school_event.title, 'Novo compromisso da escola.');
    v_school_id := v_school_event.school_id;
    v_class_id := v_school_event.class_id;
    v_created_by := v_school_event.created_by;
  else
    raise exception 'Origem de calendario invalida.' using errcode = '22023';
  end if;

  insert into public.notification_events (
    source_type,
    source_id,
    event_type,
    school_id,
    title,
    summary,
    deep_link,
    priority,
    created_by,
    metadata
  )
  values (
    'calendar',
    p_source_id,
    p_event_type,
    v_school_id,
    v_title,
    v_summary,
    'familia.html?view=semana',
    'normal',
    v_created_by,
    jsonb_build_object('source_kind', p_source_kind, 'class_id', v_class_id)
  )
  on conflict (source_type, source_id, event_type)
  do update set
    school_id = excluded.school_id,
    title = excluded.title,
    summary = excluded.summary,
    deep_link = excluded.deep_link,
    priority = excluded.priority,
    created_by = excluded.created_by,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_event_id;

  perform public.notification_generate_deliveries(v_event_id, v_class_id, null, true);
  return v_event_id;
end;
$$;

create or replace function public.notification_upsert_assessment_available(
  p_assignment_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assignment public.assessment_assignments%rowtype;
  v_assessment record;
  v_event_id uuid;
begin
  select * into v_assignment
  from public.assessment_assignments
  where id = p_assignment_id;

  if v_assignment.id is null
     or v_assignment.status <> 'published'
     or v_assignment.available_from > now()
     or (v_assignment.available_until is not null and v_assignment.available_until <= now()) then
    return null;
  end if;

  select a.title, a.description
    into v_assessment
  from public.assessments a
  where a.id = v_assignment.assessment_id;

  insert into public.notification_events (
    source_type,
    source_id,
    event_type,
    school_id,
    title,
    summary,
    deep_link,
    priority,
    created_by,
    metadata
  )
  values (
    'assessment',
    v_assignment.id,
    'assessment_available',
    v_assignment.school_id,
    'Nova avaliação disponível',
    coalesce(v_assessment.title, 'Avalia+'),
    'aluno.html?view=avaliacoes',
    'important',
    v_assignment.assigned_by,
    jsonb_build_object(
      'assessment_id', v_assignment.assessment_id,
      'class_id', v_assignment.class_id,
      'target_type', v_assignment.target_type
    )
  )
  on conflict (source_type, source_id, event_type)
  do update set
    school_id = excluded.school_id,
    title = excluded.title,
    summary = excluded.summary,
    deep_link = excluded.deep_link,
    priority = excluded.priority,
    created_by = excluded.created_by,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_event_id;

  perform public.notification_generate_deliveries(
    v_event_id,
    v_assignment.class_id,
    case when v_assignment.target_type = 'student' then v_assignment.student_id else null end,
    true
  );

  return v_event_id;
end;
$$;

create or replace function public.notification_calendar_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_table_name = 'class_calendar_entries' then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status or old.title is distinct from new.title or old.entry_date is distinct from new.entry_date or old.start_time is distinct from new.start_time) then
      perform public.notification_upsert_calendar_event(new.id, 'class_calendar', case when tg_op = 'INSERT' then 'calendar_event_created' else 'calendar_event_updated' end);
    end if;
  elsif tg_table_name = 'school_calendar_events' then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from new.status or old.title is distinct from new.title or old.event_date is distinct from new.event_date or old.start_time is distinct from new.start_time) then
      perform public.notification_upsert_calendar_event(new.id, 'school_calendar', case when tg_op = 'INSERT' then 'calendar_event_created' else 'calendar_event_updated' end);
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.notification_assessment_assignment_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from new.status or old.available_from is distinct from new.available_from or old.available_until is distinct from new.available_until) then
    perform public.notification_upsert_assessment_available(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists class_calendar_entries_notification_delivery on public.class_calendar_entries;
create trigger class_calendar_entries_notification_delivery
after insert or update on public.class_calendar_entries
for each row execute function public.notification_calendar_trigger();

drop trigger if exists school_calendar_events_notification_delivery on public.school_calendar_events;
create trigger school_calendar_events_notification_delivery
after insert or update on public.school_calendar_events
for each row execute function public.notification_calendar_trigger();

drop trigger if exists assessment_assignments_notification_delivery on public.assessment_assignments;
create trigger assessment_assignments_notification_delivery
after insert or update on public.assessment_assignments
for each row execute function public.notification_assessment_assignment_trigger();

create or replace function public.notification_get_center(
  p_student_id uuid default null,
  p_read_filter text default 'all',
  p_period_days integer default 90,
  p_limit integer default 50,
  p_offset integer default 0
) returns table (
  item_type text,
  delivery_id uuid,
  source_type text,
  source_id uuid,
  school_id uuid,
  student_id uuid,
  title text,
  summary text,
  origin_label text,
  priority text,
  deep_link text,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  notification_status text,
  child_name text,
  class_name text,
  unread_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_role text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', auth.jwt() -> 'app_metadata' ->> 'role', ''));
  v_filter text := lower(coalesce(nullif(trim(p_read_filter), ''), 'all'));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_days integer := greatest(1, least(coalesce(p_period_days, 90), 365));
begin
  if v_profile_id is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_filter not in ('all', 'read', 'unread') then
    raise exception 'Filtro de leitura invalido.' using errcode = '22023';
  end if;

  if p_student_id is not null and v_role = 'educacao_infantil' and not public.calendar_family_can_access_student(p_student_id) then
    raise exception 'Crianca fora do vinculo familiar.' using errcode = '42501';
  end if;

  return query
  with center_items as (
    select
      'communication'::text as item_type,
      cd.id as delivery_id,
      'communication'::text as source_type,
      c.id as source_id,
      cd.school_id,
      cd.student_id,
      c.title::text,
      c.body::text as summary,
      'Recados'::text as origin_label,
      'normal'::text as priority,
      'familia.html?view=recados'::text as deep_link,
      cd.delivered_at,
      cd.read_at,
      (case when cd.read_at is null then 'unread' else 'read' end)::text as notification_status,
      s.nome::text as child_name,
      cl.nome::text as class_name
    from public.communication_deliveries cd
    join public.communications c on c.id = cd.communication_id
    left join public.students s on s.id = cd.student_id
    left join public.enrollments e on e.student_id = cd.student_id
      and e.school_id = cd.school_id
      and e.status = 'active'
      and e.ended_at is null
    left join public.classes cl on cl.id = e.class_id
    where cd.recipient_profile_id = v_profile_id
      and public.communication_delivery_is_active(c)
      and cd.delivered_at >= now() - make_interval(days => v_days)
      and (p_student_id is null or cd.student_id = p_student_id)

    union all

    select
      'notification'::text,
      nd.id,
      ne.source_type,
      ne.source_id,
      nd.school_id,
      nd.student_id,
      ne.title::text,
      ne.summary::text,
      case
        when ne.source_type = 'calendar' then 'Agenda'
        when ne.source_type = 'assessment' then 'Avalia+'
        when ne.source_type = 'analytics_alert' then 'Analytics'
        else 'Notificacao'
      end::text,
      ne.priority::text,
      ne.deep_link::text,
      nd.delivered_at,
      nd.read_at,
      (case when nd.read_at is null then 'unread' else 'read' end)::text,
      s.nome::text,
      cl.nome::text
    from public.notification_deliveries nd
    join public.notification_events ne on ne.id = nd.notification_event_id
    left join public.students s on s.id = nd.student_id
    left join public.enrollments e on e.student_id = nd.student_id
      and e.school_id = nd.school_id
      and e.status = 'active'
      and e.ended_at is null
    left join public.classes cl on cl.id = e.class_id
    where nd.recipient_profile_id = v_profile_id
      and nd.delivered_at >= now() - make_interval(days => v_days)
      and (p_student_id is null or nd.student_id = p_student_id)
  ),
  filtered as (
    select *
    from center_items
    where v_filter = 'all'
       or (v_filter = 'read' and center_items.read_at is not null)
       or (v_filter = 'unread' and center_items.read_at is null)
  ),
  counted as (
    select
      filtered.*,
      count(*) filter (where filtered.read_at is null) over ()::integer as total_unread
    from filtered
  )
  select
    counted.item_type,
    counted.delivery_id,
    counted.source_type,
    counted.source_id,
    counted.school_id,
    counted.student_id,
    counted.title,
    counted.summary,
    counted.origin_label,
    counted.priority,
    counted.deep_link,
    counted.delivered_at,
    counted.read_at,
    counted.notification_status,
    counted.child_name,
    counted.class_name,
    counted.total_unread
  from counted
  order by counted.delivered_at desc, counted.source_id
  limit v_limit offset v_offset;
end;
$$;

create or replace function public.notification_mark_read(p_delivery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_delivery public.notification_deliveries%rowtype;
  v_changed boolean := false;
begin
  if v_profile_id is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_delivery
  from public.notification_deliveries
  where id = p_delivery_id
    and recipient_profile_id = v_profile_id
  for update;

  if v_delivery.id is null then
    raise exception 'Entrega de notificacao nao encontrada para este usuario.' using errcode = '42501';
  end if;

  if v_delivery.read_at is null then
    update public.notification_deliveries
    set read_at = now(),
        status = 'read'
    where id = v_delivery.id
    returning * into v_delivery;
    v_changed := true;
  end if;

  return jsonb_build_object(
    'delivery_id', v_delivery.id,
    'notification_event_id', v_delivery.notification_event_id,
    'read_at', v_delivery.read_at,
    'changed', v_changed
  );
end;
$$;

revoke all on table public.notification_events from public, anon, authenticated;
revoke all on table public.notification_deliveries from public, anon, authenticated;
grant select on table public.notification_events to authenticated;
grant select on table public.notification_deliveries to authenticated;

revoke all on function public.notification_resolve_family_and_student_recipients(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.notification_generate_deliveries(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.notification_upsert_calendar_event(uuid, text, text) from public, anon, authenticated;
revoke all on function public.notification_upsert_assessment_available(uuid) from public, anon, authenticated;
revoke all on function public.notification_calendar_trigger() from public, anon, authenticated;
revoke all on function public.notification_assessment_assignment_trigger() from public, anon, authenticated;
revoke all on function public.notification_get_center(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.notification_mark_read(uuid) from public, anon, authenticated;

grant execute on function public.notification_get_center(uuid, text, integer, integer, integer) to authenticated;
grant execute on function public.notification_mark_read(uuid) to authenticated;

do $$
declare
  v_unsafe_policy text;
  v_anon_tables integer;
  v_auth_write integer;
  v_public_execute integer;
begin
  select pol.polname
    into v_unsafe_policy
  from pg_policy pol
  join pg_class cls on cls.oid = pol.polrelid
  join pg_namespace nsp on nsp.oid = cls.relnamespace
  where nsp.nspname = 'public'
    and cls.relname in ('notification_events', 'notification_deliveries')
    and (
      pg_get_expr(pol.polqual, pol.polrelid) = 'true'
      or pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true'
    )
  limit 1;

  if v_unsafe_policy is not null then
    raise exception 'VALIDACAO bloqueada: policy insegura em notificacoes: %', v_unsafe_policy;
  end if;

  select count(*)
    into v_anon_tables
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('notification_events', 'notification_deliveries')
    and grantee in ('anon', 'PUBLIC');

  if v_anon_tables <> 0 then
    raise exception 'VALIDACAO bloqueada: anon/public possui acesso direto a tabelas de notificacao';
  end if;

  select count(*)
    into v_auth_write
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('notification_events', 'notification_deliveries')
    and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');

  if v_auth_write <> 0 then
    raise exception 'VALIDACAO bloqueada: authenticated possui escrita direta em notificacoes';
  end if;

  select count(*)
    into v_public_execute
  from information_schema.routine_privileges
  where specific_schema = 'public'
    and routine_name like 'notification_%'
    and grantee in ('anon', 'PUBLIC');

  if v_public_execute <> 0 then
    raise exception 'VALIDACAO bloqueada: anon/public executa RPC de notificacao';
  end if;
end $$;

commit;
