-- Raízes e Saberes — V2 Help Desk / Suporte / SLA V1
-- Canonical support ticket engine with user portal, admin queue, SLA and official report payload.

create sequence if not exists public.support_ticket_protocol_seq;

create table if not exists public.support_sla_policies (
  id uuid primary key default gen_random_uuid(),
  priority text not null unique check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  first_response_minutes integer not null,
  resolution_minutes integer not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

insert into public.support_sla_policies (priority, first_response_minutes, resolution_minutes)
values
  ('baixa', 1440, 10080),
  ('normal', 480, 4320),
  ('alta', 120, 1440),
  ('urgente', 60, 480)
on conflict (priority) do update
set first_response_minutes = excluded.first_response_minutes,
    resolution_minutes = excluded.resolution_minutes,
    status = 'active',
    updated_at = now();

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  school_id uuid references public.schools(id) on delete set null,
  requester_profile_id uuid not null default auth.uid(),
  requester_role text,
  requester_email text,
  category text not null,
  subject text not null,
  description text not null,
  priority text not null default 'normal' check (priority in ('baixa', 'normal', 'alta', 'urgente')),
  status text not null default 'aberto' check (status in ('aberto', 'em_atendimento', 'aguardando_solicitante', 'resolvido', 'encerrado')),
  assigned_to uuid,
  first_response_at timestamp with time zone,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  due_first_response_at timestamp with time zone,
  due_resolution_at timestamp with time zone,
  solution text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_support_tickets_requester on public.support_tickets (requester_profile_id, created_at desc);
create index if not exists idx_support_tickets_school on public.support_tickets (school_id, created_at desc) where school_id is not null;
create index if not exists idx_support_tickets_status on public.support_tickets (status, priority, created_at desc);

create table if not exists public.support_ticket_interactions (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_profile_id uuid not null default auth.uid(),
  author_role text,
  interaction_type text not null default 'message' check (interaction_type in ('message', 'internal_note', 'status_change', 'solution')),
  body text not null,
  is_internal boolean not null default false,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_support_ticket_interactions_ticket on public.support_ticket_interactions (ticket_id, created_at asc);

create table if not exists public.support_ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  actor_profile_id uuid default auth.uid(),
  event_type text not null,
  from_status text,
  to_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_support_ticket_events_ticket on public.support_ticket_events (ticket_id, created_at desc);

create table if not exists public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  uploaded_by uuid not null default auth.uid(),
  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size_bytes bigint,
  visibility text not null default 'ticket' check (visibility in ('ticket', 'internal')),
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_support_ticket_attachments_ticket on public.support_ticket_attachments (ticket_id, created_at desc);

create or replace function public.support_current_role()
returns text
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select lower(coalesce(
    auth.jwt() -> 'app_metadata' ->> 'platform_role',
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() ->> 'role',
    ''
  ));
$$;

create or replace function public.support_is_agent()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(public.is_platform_admin(), false)
    or public.support_current_role() in ('admin', 'secretaria', 'gestor', 'coordenador', 'secretaria_municipal', 'suporte', 'support');
$$;

create or replace function public.support_agent_can_manage_school(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(public.is_platform_admin(), false)
    or (p_school_id is null and public.support_is_agent())
    or coalesce(public.secretaria_can_manage_school(p_school_id), false);
$$;

create or replace function public.support_can_read_ticket(p_ticket_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  if auth.uid() is null then
    return false;
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id;
  if v_ticket.id is null then
    return false;
  end if;

  return v_ticket.requester_profile_id = auth.uid()
    or public.support_agent_can_manage_school(v_ticket.school_id);
end;
$$;

create or replace function public.support_ticket_next_protocol()
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  return 'RS-SUP-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.support_ticket_protocol_seq')::text, 6, '0');
end;
$$;

create or replace function public.support_create_ticket(
  p_school_id uuid,
  p_category text,
  p_subject text,
  p_description text,
  p_priority text default 'normal',
  p_attachments jsonb default '[]'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_priority text := lower(coalesce(nullif(trim(p_priority), ''), 'normal'));
  v_policy public.support_sla_policies%rowtype;
  v_ticket public.support_tickets%rowtype;
  v_role text := public.support_current_role();
  v_email text := coalesce(auth.jwt() ->> 'email', '');
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_priority not in ('baixa', 'normal', 'alta', 'urgente') then
    raise exception 'Prioridade invalida.' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_category, ''))) = 0 or length(btrim(coalesce(p_subject, ''))) = 0 or length(btrim(coalesce(p_description, ''))) = 0 then
    raise exception 'Categoria, assunto e descricao sao obrigatorios.' using errcode = '22023';
  end if;

  select * into v_policy
  from public.support_sla_policies
  where priority = v_priority and status = 'active';

  insert into public.support_tickets (
    protocol,
    school_id,
    requester_profile_id,
    requester_role,
    requester_email,
    category,
    subject,
    description,
    priority,
    due_first_response_at,
    due_resolution_at,
    metadata
  ) values (
    public.support_ticket_next_protocol(),
    p_school_id,
    auth.uid(),
    v_role,
    v_email,
    btrim(p_category),
    btrim(p_subject),
    btrim(p_description),
    v_priority,
    now() + make_interval(mins => coalesce(v_policy.first_response_minutes, 480)),
    now() + make_interval(mins => coalesce(v_policy.resolution_minutes, 4320)),
    jsonb_build_object('attachments_requested', jsonb_array_length(coalesce(p_attachments, '[]'::jsonb)))
  )
  returning * into v_ticket;

  insert into public.support_ticket_interactions (ticket_id, author_profile_id, author_role, interaction_type, body, is_internal)
  values (v_ticket.id, auth.uid(), v_role, 'message', btrim(p_description), false);

  insert into public.support_ticket_events (ticket_id, actor_profile_id, event_type, to_status, details)
  values (v_ticket.id, auth.uid(), 'created', v_ticket.status, jsonb_build_object('priority', v_ticket.priority, 'category', v_ticket.category));

  return jsonb_build_object('ticket_id', v_ticket.id, 'protocol', v_ticket.protocol, 'status', v_ticket.status, 'priority', v_ticket.priority);
end;
$$;

create or replace function public.support_list_my_tickets()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(t) order by t.created_at desc)
    from public.support_tickets t
    where t.requester_profile_id = auth.uid()
  ), '[]'::jsonb);
end;
$$;

create or replace function public.support_get_ticket_detail(p_ticket_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.support_can_read_ticket(p_ticket_id) then
    raise exception 'Usuario sem permissao para consultar chamado.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'ticket', (select to_jsonb(t) from public.support_tickets t where t.id = p_ticket_id),
    'interactions', coalesce((
      select jsonb_agg(to_jsonb(i) order by i.created_at asc)
      from public.support_ticket_interactions i
      where i.ticket_id = p_ticket_id
        and (not i.is_internal or public.support_is_agent())
    ), '[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at asc)
      from public.support_ticket_events e
      where e.ticket_id = p_ticket_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.support_list_admin_tickets(
  p_school_id uuid default null,
  p_status text default null,
  p_priority text default null,
  p_category text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.support_is_agent() then
    raise exception 'Usuario sem permissao para fila de suporte.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'protocol', t.protocol,
        'school_id', t.school_id,
        'school_name', s.nome,
        'requester_profile_id', t.requester_profile_id,
        'requester_email', t.requester_email,
        'category', t.category,
        'subject', t.subject,
        'priority', t.priority,
        'status', t.status,
        'assigned_to', t.assigned_to,
        'first_response_at', t.first_response_at,
        'resolved_at', t.resolved_at,
        'created_at', t.created_at,
        'due_first_response_at', t.due_first_response_at,
        'due_resolution_at', t.due_resolution_at,
        'first_response_sla', case when t.first_response_at is null then (case when now() <= t.due_first_response_at then 'pending' else 'breached' end) when t.first_response_at <= t.due_first_response_at then 'met' else 'breached' end,
        'resolution_sla', case when t.resolved_at is null then (case when now() <= t.due_resolution_at then 'pending' else 'breached' end) when t.resolved_at <= t.due_resolution_at then 'met' else 'breached' end
      )
      order by t.created_at desc
    )
    from public.support_tickets t
    left join public.schools s on s.id = t.school_id
    where (p_school_id is null or t.school_id = p_school_id)
      and (p_status is null or t.status = p_status)
      and (p_priority is null or t.priority = p_priority)
      and (p_category is null or t.category = p_category)
      and (public.is_platform_admin() or t.school_id is null or public.secretaria_can_manage_school(t.school_id))
  ), '[]'::jsonb);
end;
$$;

create or replace function public.support_add_ticket_interaction(
  p_ticket_id uuid,
  p_body text,
  p_is_internal boolean default false,
  p_next_status text default null,
  p_solution text default null,
  p_assigned_to uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_is_agent boolean := public.support_is_agent();
  v_status text := lower(nullif(trim(coalesce(p_next_status, '')), ''));
  v_interaction_type text := case when coalesce(p_solution, '') <> '' then 'solution' when coalesce(p_is_internal, false) then 'internal_note' else 'message' end;
  v_old_status text;
begin
  if not public.support_can_read_ticket(p_ticket_id) then
    raise exception 'Usuario sem permissao para interagir com chamado.' using errcode = '42501';
  end if;

  if coalesce(p_is_internal, false) and not v_is_agent then
    raise exception 'Nota interna permitida somente ao suporte.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_body, p_solution, ''))) = 0 then
    raise exception 'Mensagem ou solucao obrigatoria.' using errcode = '22023';
  end if;

  select * into v_ticket from public.support_tickets where id = p_ticket_id for update;
  v_old_status := v_ticket.status;

  if v_status is not null and v_status not in ('aberto', 'em_atendimento', 'aguardando_solicitante', 'resolvido', 'encerrado') then
    raise exception 'Status invalido.' using errcode = '22023';
  end if;

  if v_status is not null and not v_is_agent and v_status not in ('aberto') then
    raise exception 'Alteracao de status permitida somente ao suporte.' using errcode = '42501';
  end if;

  insert into public.support_ticket_interactions (ticket_id, author_profile_id, author_role, interaction_type, body, is_internal)
  values (p_ticket_id, auth.uid(), public.support_current_role(), v_interaction_type, btrim(coalesce(p_body, p_solution)), coalesce(p_is_internal, false));

  if v_is_agent and not coalesce(p_is_internal, false) and v_ticket.first_response_at is null and v_ticket.requester_profile_id <> auth.uid() then
    v_ticket.first_response_at := now();
  end if;

  update public.support_tickets
  set status = coalesce(v_status, status),
      assigned_to = coalesce(p_assigned_to, assigned_to, case when v_is_agent then auth.uid() else assigned_to end),
      first_response_at = coalesce(v_ticket.first_response_at, first_response_at),
      resolved_at = case when coalesce(v_status, status) = 'resolvido' then coalesce(resolved_at, now()) else resolved_at end,
      closed_at = case when coalesce(v_status, status) = 'encerrado' then coalesce(closed_at, now()) else closed_at end,
      solution = coalesce(nullif(trim(p_solution), ''), solution),
      updated_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  if v_status is not null and v_status <> v_old_status then
    insert into public.support_ticket_events (ticket_id, actor_profile_id, event_type, from_status, to_status, details)
    values (p_ticket_id, auth.uid(), 'status_changed', v_old_status, v_status, jsonb_build_object('solution_present', coalesce(p_solution, '') <> ''));
  else
    insert into public.support_ticket_events (ticket_id, actor_profile_id, event_type, details)
    values (p_ticket_id, auth.uid(), 'interaction_added', jsonb_build_object('internal', coalesce(p_is_internal, false)));
  end if;

  return jsonb_build_object('ticket_id', v_ticket.id, 'protocol', v_ticket.protocol, 'status', v_ticket.status, 'first_response_at', v_ticket.first_response_at, 'resolved_at', v_ticket.resolved_at);
end;
$$;

create or replace function public.support_get_indicators(
  p_school_id uuid default null,
  p_date_from date default (current_date - 30),
  p_date_to date default current_date
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.support_is_agent() then
    raise exception 'Usuario sem permissao para indicadores de suporte.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_build_object(
      'total', count(*),
      'open', count(*) filter (where status in ('aberto', 'em_atendimento', 'aguardando_solicitante')),
      'closed', count(*) filter (where status in ('resolvido', 'encerrado')),
      'avg_first_response_minutes', round(avg(extract(epoch from (first_response_at - created_at)) / 60) filter (where first_response_at is not null), 2),
      'avg_resolution_minutes', round(avg(extract(epoch from (resolved_at - created_at)) / 60) filter (where resolved_at is not null), 2),
      'first_response_sla_met', count(*) filter (where first_response_at is not null and first_response_at <= due_first_response_at),
      'resolution_sla_met', count(*) filter (where resolved_at is not null and resolved_at <= due_resolution_at),
      'by_category', coalesce(jsonb_object_agg(category, category_count), '{}'::jsonb)
    )
    from (
      select t.*, count(*) over (partition by category) as category_count
      from public.support_tickets t
      where (p_school_id is null or t.school_id = p_school_id)
        and t.created_at >= p_date_from::timestamp with time zone
        and t.created_at < (p_date_to + 1)::timestamp with time zone
        and (public.is_platform_admin() or t.school_id is null or public.secretaria_can_manage_school(t.school_id))
    ) scoped
  ), jsonb_build_object('total', 0, 'open', 0, 'closed', 0, 'by_category', '{}'::jsonb));
end;
$$;

create or replace function public.support_get_report_payload(
  p_school_id uuid default null,
  p_date_from date default (current_date - 30),
  p_date_to date default current_date,
  p_format text default 'PDF'
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  return jsonb_build_object(
    'engine', 'official_reports_p0_live',
    'report_type', 'support_sla',
    'format', upper(coalesce(p_format, 'PDF')),
    'generated_at', now(),
    'filters', jsonb_build_object('school_id', p_school_id, 'date_from', p_date_from, 'date_to', p_date_to),
    'indicators', public.support_get_indicators(p_school_id, p_date_from, p_date_to),
    'rows', public.support_list_admin_tickets(p_school_id, null, null, null)
  );
end;
$$;

alter table public.support_sla_policies enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_interactions enable row level security;
alter table public.support_ticket_events enable row level security;
alter table public.support_ticket_attachments enable row level security;

drop policy if exists support_sla_policies_read on public.support_sla_policies;
create policy support_sla_policies_read on public.support_sla_policies for select to authenticated using (true);

drop policy if exists support_tickets_read on public.support_tickets;
create policy support_tickets_read on public.support_tickets for select to authenticated using (public.support_can_read_ticket(id));

drop policy if exists support_ticket_interactions_read on public.support_ticket_interactions;
create policy support_ticket_interactions_read on public.support_ticket_interactions for select to authenticated using (
  public.support_can_read_ticket(ticket_id) and (not is_internal or public.support_is_agent())
);

drop policy if exists support_ticket_events_read on public.support_ticket_events;
create policy support_ticket_events_read on public.support_ticket_events for select to authenticated using (public.support_can_read_ticket(ticket_id));

drop policy if exists support_ticket_attachments_read on public.support_ticket_attachments;
create policy support_ticket_attachments_read on public.support_ticket_attachments for select to authenticated using (
  public.support_can_read_ticket(ticket_id) and (visibility <> 'internal' or public.support_is_agent())
);

grant select on public.support_sla_policies to authenticated;
grant select on public.support_tickets to authenticated;
grant select on public.support_ticket_interactions to authenticated;
grant select on public.support_ticket_events to authenticated;
grant select on public.support_ticket_attachments to authenticated;

revoke all on function public.support_current_role() from public, anon;
revoke all on function public.support_is_agent() from public, anon;
revoke all on function public.support_agent_can_manage_school(uuid) from public, anon;
revoke all on function public.support_can_read_ticket(uuid) from public, anon;
revoke all on function public.support_ticket_next_protocol() from public, anon, authenticated;
revoke all on function public.support_create_ticket(uuid, text, text, text, text, jsonb) from public, anon;
revoke all on function public.support_list_my_tickets() from public, anon;
revoke all on function public.support_get_ticket_detail(uuid) from public, anon;
revoke all on function public.support_list_admin_tickets(uuid, text, text, text) from public, anon;
revoke all on function public.support_add_ticket_interaction(uuid, text, boolean, text, text, uuid) from public, anon;
revoke all on function public.support_get_indicators(uuid, date, date) from public, anon;
revoke all on function public.support_get_report_payload(uuid, date, date, text) from public, anon;

grant execute on function public.support_current_role() to authenticated, service_role;
grant execute on function public.support_is_agent() to authenticated, service_role;
grant execute on function public.support_agent_can_manage_school(uuid) to authenticated, service_role;
grant execute on function public.support_can_read_ticket(uuid) to authenticated, service_role;
grant execute on function public.support_create_ticket(uuid, text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.support_list_my_tickets() to authenticated, service_role;
grant execute on function public.support_get_ticket_detail(uuid) to authenticated, service_role;
grant execute on function public.support_list_admin_tickets(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.support_add_ticket_interaction(uuid, text, boolean, text, text, uuid) to authenticated, service_role;
grant execute on function public.support_get_indicators(uuid, date, date) to authenticated, service_role;
grant execute on function public.support_get_report_payload(uuid, date, date, text) to authenticated, service_role;

comment on table public.support_tickets is 'Canonical Help Desk tickets with protocol, status workflow, SLA timestamps and requester ownership.';
comment on function public.support_get_report_payload(uuid, date, date, text) is 'Official Reports engine payload for support/SLA reports; does not create a parallel report engine.';
