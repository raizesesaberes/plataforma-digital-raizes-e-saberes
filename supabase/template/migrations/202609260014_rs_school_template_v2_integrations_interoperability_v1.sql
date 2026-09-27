-- Raizes e Saberes - Integracoes e Interoperabilidade V1
-- API institucional versionada, importacao, sync, webhooks e preparo SSO.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.schools') is null then
    raise exception 'PRE-CHECK bloqueado: public.schools nao existe';
  end if;
  if to_regclass('public.students') is null then
    raise exception 'PRE-CHECK bloqueado: public.students nao existe';
  end if;
  if to_regclass('public.enrollments') is null then
    raise exception 'PRE-CHECK bloqueado: public.enrollments nao existe';
  end if;
  if to_regprocedure('public.admin_confirm_rs_school_import(uuid,jsonb,boolean)') is null then
    raise exception 'PRE-CHECK bloqueado: importador canonico admin_confirm_rs_school_import nao existe';
  end if;
end $$;

create table if not exists public.integration_api_clients (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_code text not null unique,
  school_id uuid references public.schools(id) on delete restrict,
  direction text not null default 'inbound',
  scopes text[] not null default '{}',
  status text not null default 'active',
  token_hash text not null unique,
  token_hint text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_api_clients_direction_check
    check (direction in ('inbound', 'outbound', 'bidirectional')),
  constraint integration_api_clients_status_check
    check (status in ('active', 'inactive', 'revoked')),
  constraint integration_api_clients_scopes_not_empty
    check (array_length(scopes, 1) is not null and array_length(scopes, 1) > 0),
  constraint integration_api_clients_token_hash_not_secret_like
    check (length(token_hash) >= 32)
);

create table if not exists public.integration_api_audit_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.integration_api_clients(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  endpoint text not null,
  method text not null default 'RPC',
  status_code integer not null default 200,
  request_hash text,
  response_summary jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.integration_external_mappings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.integration_api_clients(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  external_system text not null,
  external_id text not null,
  direction text not null default 'external_to_raizes',
  sync_status text not null default 'pending',
  last_synced_at timestamptz,
  last_error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_external_mappings_direction_check
    check (direction in ('external_to_raizes', 'raizes_to_external', 'bidirectional')),
  constraint integration_external_mappings_status_check
    check (sync_status in ('pending', 'synced', 'error', 'disabled')),
  constraint integration_external_mappings_unique
    unique (client_id, entity_type, external_system, external_id)
);

create table if not exists public.integration_sync_batches (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.integration_api_clients(id) on delete cascade,
  school_id uuid references public.schools(id) on delete restrict,
  source_system text not null,
  direction text not null default 'external_to_raizes',
  entity_type text not null,
  status text not null default 'draft',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  error_rows integer not null default 0,
  idempotency_key text,
  preview jsonb not null default '{}'::jsonb,
  errors jsonb not null default '[]'::jsonb,
  report jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_sync_batches_direction_check
    check (direction in ('external_to_raizes', 'raizes_to_external')),
  constraint integration_sync_batches_status_check
    check (status in ('draft', 'validated', 'confirmed', 'failed', 'cancelled'))
);

create unique index if not exists integration_sync_batches_client_idempotency_idx
  on public.integration_sync_batches (client_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.integration_webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.integration_api_clients(id) on delete cascade,
  school_id uuid references public.schools(id) on delete restrict,
  endpoint_url text not null,
  secret_hash text not null,
  events text[] not null default '{}',
  status text not null default 'active',
  created_by uuid default auth.uid(),
  last_delivery_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_webhook_endpoints_status_check
    check (status in ('active', 'paused', 'revoked')),
  constraint integration_webhook_endpoints_https_check
    check (endpoint_url ~* '^https://'),
  constraint integration_webhook_endpoints_events_not_empty
    check (array_length(events, 1) is not null and array_length(events, 1) > 0)
);

create table if not exists public.integration_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.integration_webhook_endpoints(id) on delete cascade,
  event_type text not null,
  entity_type text not null,
  entity_id uuid,
  school_id uuid references public.schools(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  signature text not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  constraint integration_webhook_deliveries_status_check
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  constraint integration_webhook_deliveries_attempts_check
    check (attempts >= 0)
);

create table if not exists public.integration_sso_providers (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  school_id uuid references public.schools(id) on delete restrict,
  status text not null default 'empty_real',
  issuer_url text,
  client_id_hint text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint integration_sso_providers_provider_check
    check (provider in ('google_workspace', 'microsoft_entra')),
  constraint integration_sso_providers_status_check
    check (status in ('empty_real', 'configured', 'disabled'))
);

create unique index if not exists integration_sso_provider_scope_idx
  on public.integration_sso_providers (provider, coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid));

create index if not exists integration_api_clients_school_idx
  on public.integration_api_clients (school_id);
create index if not exists integration_api_audit_logs_client_created_idx
  on public.integration_api_audit_logs (client_id, created_at desc);
create index if not exists integration_external_mappings_entity_idx
  on public.integration_external_mappings (entity_type, entity_id);
create index if not exists integration_external_mappings_school_idx
  on public.integration_external_mappings (school_id, entity_type);
create index if not exists integration_sync_batches_school_idx
  on public.integration_sync_batches (school_id, created_at desc);
create index if not exists integration_webhook_endpoints_client_idx
  on public.integration_webhook_endpoints (client_id, status);
create index if not exists integration_webhook_deliveries_status_idx
  on public.integration_webhook_deliveries (status, created_at);

drop trigger if exists integration_api_clients_touch_updated_at on public.integration_api_clients;
create trigger integration_api_clients_touch_updated_at
before update on public.integration_api_clients
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists integration_external_mappings_touch_updated_at on public.integration_external_mappings;
create trigger integration_external_mappings_touch_updated_at
before update on public.integration_external_mappings
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists integration_sync_batches_touch_updated_at on public.integration_sync_batches;
create trigger integration_sync_batches_touch_updated_at
before update on public.integration_sync_batches
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists integration_webhook_endpoints_touch_updated_at on public.integration_webhook_endpoints;
create trigger integration_webhook_endpoints_touch_updated_at
before update on public.integration_webhook_endpoints
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists integration_sso_providers_touch_updated_at on public.integration_sso_providers;
create trigger integration_sso_providers_touch_updated_at
before update on public.integration_sso_providers
for each row execute function public.institutional_touch_updated_at();

create or replace function public.integration_current_role()
returns text
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select lower(coalesce(
    (select p.platform_role from public.profiles p where p.id = auth.uid() and p.status = 'active'),
    (select u.perfil from public.users u where u.id = auth.uid() and coalesce(u.ativo, true)),
    ''
  ));
$$;

create or replace function public.integration_is_admin()
returns boolean
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select public.is_platform_admin()
    or public.integration_current_role() in (
      'admin',
      'admin_ti',
      'administrador',
      'administrador_nacional',
      'secretaria',
      'secretaria_municipal',
      'gestor',
      'coordenador'
    );
$$;

create or replace function public.integration_can_manage_school(p_school_id uuid)
returns boolean
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select case
    when public.is_platform_admin() then true
    when p_school_id is null then public.integration_is_admin()
    else public.secretaria_can_manage_school(p_school_id)
      or exists (
        select 1
        from public.teachers t
        where t.school_id = p_school_id
          and t.status = 'active'
          and (t.profile_id = auth.uid() or t.user_id = auth.uid())
      )
  end;
$$;

create or replace function public.integration_hash_secret(p_secret text)
returns text
language sql
immutable
as $$
  select encode(digest(coalesce(p_secret, ''), 'sha256'), 'hex');
$$;

create or replace function public.integration_require_scope(p_client_id uuid, p_scope text)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_client public.integration_api_clients%rowtype;
begin
  select * into v_client
  from public.integration_api_clients
  where id = p_client_id
    and status = 'active';

  if v_client.id is null then
    raise exception 'Integracao ativa nao encontrada.' using errcode = '42501';
  end if;

  if not (p_scope = any(v_client.scopes) or '*:*' = any(v_client.scopes)) then
    raise exception 'Escopo nao autorizado: %', p_scope using errcode = '42501';
  end if;
end;
$$;

create or replace function public.integration_create_api_client(
  p_client_name text,
  p_client_code text,
  p_school_id uuid,
  p_scopes text[],
  p_token_hash text,
  p_token_hint text default null,
  p_direction text default 'inbound'
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid;
begin
  if not public.integration_can_manage_school(p_school_id) then
    raise exception 'Acesso negado para criar credencial de integracao.' using errcode = '42501';
  end if;

  if p_token_hash is null or length(p_token_hash) < 32 then
    raise exception 'token_hash invalido. Gere o segredo fora do frontend e armazene somente o hash.' using errcode = '22023';
  end if;

  if coalesce(array_length(p_scopes, 1), 0) = 0 then
    raise exception 'Credencial sem escopo nao permitida.' using errcode = '22023';
  end if;

  insert into public.integration_api_clients (
    client_name,
    client_code,
    school_id,
    scopes,
    token_hash,
    token_hint,
    direction,
    created_by
  ) values (
    btrim(p_client_name),
    lower(btrim(p_client_code)),
    p_school_id,
    p_scopes,
    p_token_hash,
    p_token_hint,
    p_direction,
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.integration_revoke_api_client(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_client public.integration_api_clients%rowtype;
begin
  select * into v_client
  from public.integration_api_clients
  where id = p_client_id;

  if v_client.id is null then
    raise exception 'Integracao nao encontrada.' using errcode = '22023';
  end if;

  if not public.integration_can_manage_school(v_client.school_id) then
    raise exception 'Acesso negado para revogar integracao.' using errcode = '42501';
  end if;

  update public.integration_api_clients
  set status = 'revoked',
      revoked_at = now()
  where id = p_client_id;

  return jsonb_build_object('client_id', p_client_id, 'status', 'revoked');
end;
$$;

create or replace function public.integration_log_api_access(
  p_client_id uuid,
  p_endpoint text,
  p_method text default 'RPC',
  p_status_code integer default 200,
  p_request_hash text default null,
  p_response_summary jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_client public.integration_api_clients%rowtype;
  v_log_id uuid;
begin
  select * into v_client
  from public.integration_api_clients
  where id = p_client_id;

  if v_client.id is null then
    raise exception 'Integracao nao encontrada.' using errcode = '22023';
  end if;

  if not public.integration_can_manage_school(v_client.school_id) then
    raise exception 'Acesso negado para auditar integracao.' using errcode = '42501';
  end if;

  insert into public.integration_api_audit_logs (
    client_id,
    school_id,
    endpoint,
    method,
    status_code,
    request_hash,
    response_summary
  ) values (
    p_client_id,
    v_client.school_id,
    p_endpoint,
    upper(coalesce(p_method, 'RPC')),
    p_status_code,
    p_request_hash,
    coalesce(p_response_summary, '{}'::jsonb)
  )
  returning id into v_log_id;

  update public.integration_api_clients
  set last_used_at = now()
  where id = p_client_id;

  return v_log_id;
end;
$$;

create or replace function public.integration_api_v1_catalog()
returns jsonb
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select jsonb_build_object(
    'version', 'v1',
    'authentication', 'server-side institutional token hash + scoped RPC access',
    'resources', jsonb_build_array(
      'schools',
      'users',
      'teachers',
      'students',
      'guardians',
      'classes',
      'enrollments',
      'components',
      'calendar',
      'attendance',
      'results'
    ),
    'bulk_import', jsonb_build_object(
      'formats', jsonb_build_array('CSV', 'XLSX'),
      'pipeline', jsonb_build_array('preview', 'validation', 'confirm', 'batch_report'),
      'canonical_school_importer', 'admin_confirm_rs_school_import'
    ),
    'webhooks', jsonb_build_array(
      'enrollment.created',
      'enrollment.updated',
      'user.updated',
      'result.consolidated'
    ),
    'sso', jsonb_build_object(
      'google_workspace', 'EMPTY_REAL',
      'microsoft_entra', 'EMPTY_REAL'
    )
  );
$$;

create or replace function public.integration_api_v1_read(
  p_resource text,
  p_school_id uuid default null,
  p_limit integer default 100,
  p_offset integer default 0
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_resource text := lower(btrim(coalesce(p_resource, '')));
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 500));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_data jsonb := '[]'::jsonb;
begin
  if v_resource = '' then
    raise exception 'Recurso obrigatorio.' using errcode = '22023';
  end if;

  if p_school_id is not null and not public.integration_can_manage_school(p_school_id) then
    raise exception 'Acesso negado ao escopo escolar solicitado.' using errcode = '42501';
  end if;

  if v_resource = 'schools' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select s.id, s.nome, s.codigo_inep, s.municipio, s.estado, s.status, s.updated_at
      from public.schools s
      where s.status <> 'archived'
        and (
          p_school_id is null and (public.is_platform_admin() or public.secretaria_can_manage_school(s.id))
          or p_school_id is not null and s.id = p_school_id
        )
      order by s.nome
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'users' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select u.id, u.nome, u.email, u.perfil, u.school_id, u.class_id, u.ativo
      from public.users u
      where (p_school_id is null and public.integration_can_manage_school(u.school_id))
         or (p_school_id is not null and u.school_id = p_school_id)
      order by u.nome
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'teachers' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select t.id, t.user_id, t.school_id, t.profile_id, t.disciplina, t.status, t.updated_at
      from public.teachers t
      where ((p_school_id is null and public.integration_can_manage_school(t.school_id))
         or (p_school_id is not null and t.school_id = p_school_id))
        and t.status <> 'archived'
      order by t.updated_at desc nulls last
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'students' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select s.id, s.user_id, s.school_id, s.class_id, s.matricula, s.nome, s.email, s.status, s.turma, s.updated_at
      from public.students s
      where ((p_school_id is null and public.integration_can_manage_school(s.school_id))
         or (p_school_id is not null and s.school_id = p_school_id))
        and coalesce(s.status, 'active') not in ('archived', 'arquivado')
      order by s.nome
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'guardians' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select g.id, g.school_id, g.profile_id, g.full_name, g.email, g.phone, g.status, g.access_status, g.updated_at
      from public.guardians g
      where ((p_school_id is null and public.integration_can_manage_school(g.school_id))
         or (p_school_id is not null and g.school_id = p_school_id))
        and g.status <> 'archived'
      order by g.full_name
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'classes' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select c.id, c.school_id, c.nome, c.ano_escolar, c.turno, c.teacher_id, c.age_group, c.school_year, c.status, c.updated_at
      from public.classes c
      where ((p_school_id is null and public.integration_can_manage_school(c.school_id))
         or (p_school_id is not null and c.school_id = p_school_id))
        and c.status <> 'archived'
      order by c.school_year desc nulls last, c.nome
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'enrollments' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select e.id, e.student_id, e.class_id, e.school_id, e.school_year, e.status, e.enrolled_at, e.ended_at, e.updated_at
      from public.enrollments e
      where ((p_school_id is null and public.integration_can_manage_school(e.school_id))
         or (p_school_id is not null and e.school_id = p_school_id))
      order by e.school_year desc, e.enrolled_at desc
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'components' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select distinct t.school_id, btrim(t.disciplina::text) as componente
      from public.teachers t
      where t.disciplina is not null
        and btrim(t.disciplina::text) <> ''
        and ((p_school_id is null and public.integration_can_manage_school(t.school_id))
          or (p_school_id is not null and t.school_id = p_school_id))
      order by componente
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'calendar' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select ce.id, ce.class_id, ce.school_id, ce.teacher_id, ce.entry_date, ce.start_time, ce.end_time, ce.title, ce.entry_type, ce.status, ce.updated_at
      from public.class_calendar_entries ce
      where ((p_school_id is null and public.integration_can_manage_school(ce.school_id))
         or (p_school_id is not null and ce.school_id = p_school_id))
        and ce.status <> 'archived'
      order by ce.entry_date desc, ce.start_time desc nulls last
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'attendance' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select ar.*
      from public.attendance_records ar
      where ((p_school_id is null and public.integration_can_manage_school(ar.school_id))
         or (p_school_id is not null and ar.school_id = p_school_id))
      order by ar.attendance_date desc, ar.created_at desc
      limit v_limit offset v_offset
    ) src;
  elsif v_resource = 'results' then
    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_data
    from (
      select r.id, r.assessment_id, r.assignment_id, r.student_id, r.school_id, r.status, r.score_raw, r.score_percentage, r.finalized_at, r.updated_at
      from public.assessment_results r
      where ((p_school_id is null and public.integration_can_manage_school(r.school_id))
         or (p_school_id is not null and r.school_id = p_school_id))
      order by r.finalized_at desc
      limit v_limit offset v_offset
    ) src;
  else
    raise exception 'Recurso API V1 nao suportado: %', p_resource using errcode = '22023';
  end if;

  return jsonb_build_object(
    'version', 'v1',
    'resource', v_resource,
    'school_id', p_school_id,
    'limit', v_limit,
    'offset', v_offset,
    'data', v_data
  );
end;
$$;

create or replace function public.integration_preview_bulk_import(
  p_client_id uuid,
  p_school_id uuid,
  p_entity_type text,
  p_payload jsonb,
  p_idempotency_key text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_existing public.integration_sync_batches%rowtype;
  v_client public.integration_api_clients%rowtype;
  v_entity text := lower(btrim(coalesce(p_entity_type, '')));
  v_report jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_valid integer := 0;
  v_batch_id uuid;
  v_item jsonb;
  v_idx integer := 0;
begin
  perform public.integration_require_scope(p_client_id, 'import:write');

  select * into v_client
  from public.integration_api_clients
  where id = p_client_id and status = 'active';

  if v_client.school_id is not null and v_client.school_id <> p_school_id then
    raise exception 'Credencial nao autorizada para a escola informada.' using errcode = '42501';
  end if;

  if not public.integration_can_manage_school(p_school_id) then
    raise exception 'Acesso negado ao escopo escolar solicitado.' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select * into v_existing
    from public.integration_sync_batches
    where client_id = p_client_id
      and idempotency_key = p_idempotency_key;

    if v_existing.id is not null then
      return jsonb_build_object(
        'batch_id', v_existing.id,
        'status', v_existing.status,
        'idempotent_replay', true,
        'report', v_existing.report,
        'errors', v_existing.errors
      );
    end if;
  end if;

  if v_entity = 'rs_school_package' then
    v_report := public.admin_confirm_rs_school_import(p_school_id, p_payload, true);
    v_total := coalesce((v_report #>> '{counts,valid_rows}')::integer, 0);
    v_valid := v_total;
  else
    if jsonb_typeof(coalesce(p_payload, '[]'::jsonb)) <> 'array' then
      raise exception 'Payload de CSV/XLSX deve chegar como array JSON ja parseado pelo servidor.' using errcode = '22023';
    end if;

    v_total := jsonb_array_length(p_payload);
    for v_item in select * from jsonb_array_elements(p_payload) loop
      v_idx := v_idx + 1;
      if v_entity in ('students', 'alunos') and coalesce(nullif(btrim(v_item ->> 'nome'), ''), nullif(btrim(v_item ->> 'name'), '')) is null then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'field', 'nome', 'error', 'REQUIRED'));
      elsif v_entity in ('enrollments', 'matriculas') and coalesce(nullif(btrim(v_item ->> 'student_external_id'), ''), nullif(btrim(v_item ->> 'student_id'), '')) is null then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'field', 'student_external_id', 'error', 'REQUIRED'));
      elsif v_entity in ('users', 'usuarios') and coalesce(nullif(btrim(v_item ->> 'email'), ''), nullif(btrim(v_item ->> 'nome'), '')) is null then
        v_errors := v_errors || jsonb_build_array(jsonb_build_object('row', v_idx, 'field', 'email_or_nome', 'error', 'REQUIRED'));
      else
        v_valid := v_valid + 1;
      end if;
    end loop;

    v_report := jsonb_build_object(
      'status', case when jsonb_array_length(v_errors) = 0 then 'validated' else 'validated_with_errors' end,
      'total_rows', v_total,
      'valid_rows', v_valid,
      'error_rows', jsonb_array_length(v_errors),
      'canonical_engine', case when v_entity in ('students','alunos','enrollments','matriculas') then 'admin_confirm_rs_school_import' else 'integration_mapping_validation' end
    );
  end if;

  insert into public.integration_sync_batches (
    client_id,
    school_id,
    source_system,
    direction,
    entity_type,
    status,
    total_rows,
    valid_rows,
    error_rows,
    idempotency_key,
    preview,
    errors,
    report,
    created_by
  ) values (
    p_client_id,
    p_school_id,
    v_client.client_code,
    'external_to_raizes',
    v_entity,
    case when jsonb_array_length(v_errors) = 0 then 'validated' else 'draft' end,
    v_total,
    v_valid,
    jsonb_array_length(v_errors),
    p_idempotency_key,
    jsonb_build_object('entity_type', v_entity, 'payload', p_payload, 'report', v_report),
    v_errors,
    v_report,
    auth.uid()
  )
  returning id into v_batch_id;

  return jsonb_build_object(
    'batch_id', v_batch_id,
    'status', case when jsonb_array_length(v_errors) = 0 then 'validated' else 'draft' end,
    'report', v_report,
    'errors', v_errors
  );
end;
$$;

create or replace function public.integration_confirm_bulk_import(p_batch_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_batch public.integration_sync_batches%rowtype;
  v_report jsonb;
begin
  select * into v_batch
  from public.integration_sync_batches
  where id = p_batch_id;

  if v_batch.id is null then
    raise exception 'Lote de importacao nao encontrado.' using errcode = '22023';
  end if;

  perform public.integration_require_scope(v_batch.client_id, 'import:write');

  if not public.integration_can_manage_school(v_batch.school_id) then
    raise exception 'Acesso negado ao lote informado.' using errcode = '42501';
  end if;

  if v_batch.status <> 'validated' then
    raise exception 'Somente lotes validados podem ser confirmados.' using errcode = '22023';
  end if;

  if v_batch.entity_type = 'rs_school_package' then
    v_report := public.admin_confirm_rs_school_import(
      v_batch.school_id,
      v_batch.preview -> 'payload',
      false
    );
  else
    v_report := jsonb_build_object(
      'status', 'confirmed_validation_batch',
      'note', 'Lote JSON validado para integracao. Escrita academica deve usar importador canonico ou conector homologado.',
      'canonical_engine_preserved', true,
      'total_rows', v_batch.total_rows,
      'valid_rows', v_batch.valid_rows
    );
  end if;

  update public.integration_sync_batches
  set status = 'confirmed',
      confirmed_by = auth.uid(),
      confirmed_at = now(),
      report = v_report
  where id = p_batch_id;

  return jsonb_build_object('batch_id', p_batch_id, 'status', 'confirmed', 'report', v_report);
end;
$$;

create or replace function public.integration_register_external_mapping(
  p_client_id uuid,
  p_school_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_external_system text,
  p_external_id text,
  p_direction text default 'external_to_raizes',
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid;
begin
  perform public.integration_require_scope(p_client_id, 'sync:write');

  if not public.integration_can_manage_school(p_school_id) then
    raise exception 'Acesso negado ao escopo escolar solicitado.' using errcode = '42501';
  end if;

  insert into public.integration_external_mappings (
    client_id,
    school_id,
    entity_type,
    entity_id,
    external_system,
    external_id,
    direction,
    sync_status,
    last_synced_at,
    metadata
  ) values (
    p_client_id,
    p_school_id,
    lower(btrim(p_entity_type)),
    p_entity_id,
    lower(btrim(p_external_system)),
    btrim(p_external_id),
    p_direction,
    'synced',
    now(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (client_id, entity_type, external_system, external_id)
  do update set
    entity_id = excluded.entity_id,
    school_id = excluded.school_id,
    direction = excluded.direction,
    sync_status = 'synced',
    last_synced_at = now(),
    last_error = null,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.integration_register_webhook(
  p_client_id uuid,
  p_school_id uuid,
  p_endpoint_url text,
  p_events text[],
  p_secret_hash text,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid;
begin
  perform public.integration_require_scope(p_client_id, 'webhooks:write');

  if not public.integration_can_manage_school(p_school_id) then
    raise exception 'Acesso negado ao escopo escolar solicitado.' using errcode = '42501';
  end if;

  if p_endpoint_url !~* '^https://' then
    raise exception 'Webhook deve usar HTTPS.' using errcode = '22023';
  end if;

  if p_secret_hash is null or length(p_secret_hash) < 32 then
    raise exception 'secret_hash invalido. Armazene somente hash/identificador seguro do segredo.' using errcode = '22023';
  end if;

  insert into public.integration_webhook_endpoints (
    client_id,
    school_id,
    endpoint_url,
    events,
    secret_hash,
    created_by,
    metadata
  ) values (
    p_client_id,
    p_school_id,
    p_endpoint_url,
    p_events,
    p_secret_hash,
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.integration_queue_webhook_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_school_id uuid,
  p_payload jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_endpoint record;
  v_count integer := 0;
  v_payload jsonb;
begin
  if not public.integration_can_manage_school(p_school_id) then
    raise exception 'Acesso negado ao escopo escolar solicitado.' using errcode = '42501';
  end if;

  v_payload := jsonb_build_object(
    'event_type', p_event_type,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'school_id', p_school_id,
    'occurred_at', now(),
    'data', coalesce(p_payload, '{}'::jsonb)
  );

  for v_endpoint in
    select we.*
    from public.integration_webhook_endpoints we
    join public.integration_api_clients c on c.id = we.client_id
    where we.status = 'active'
      and c.status = 'active'
      and (we.school_id is null or we.school_id = p_school_id)
      and p_event_type = any(we.events)
  loop
    insert into public.integration_webhook_deliveries (
      endpoint_id,
      event_type,
      entity_type,
      entity_id,
      school_id,
      payload,
      signature,
      status
    ) values (
      v_endpoint.id,
      p_event_type,
      p_entity_type,
      p_entity_id,
      p_school_id,
      v_payload,
      'sha256=' || encode(hmac(v_payload::text, v_endpoint.secret_hash, 'sha256'), 'hex'),
      'pending'
    );
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('queued', v_count, 'event_type', p_event_type);
end;
$$;

create or replace function public.integration_verify_webhook_signature(
  p_endpoint_id uuid,
  p_payload text,
  p_signature text
) returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_endpoint public.integration_webhook_endpoints%rowtype;
  v_expected text;
begin
  select * into v_endpoint
  from public.integration_webhook_endpoints
  where id = p_endpoint_id
    and status = 'active';

  if v_endpoint.id is null then
    return false;
  end if;

  if not public.integration_can_manage_school(v_endpoint.school_id) then
    return false;
  end if;

  v_expected := 'sha256=' || encode(hmac(coalesce(p_payload, ''), v_endpoint.secret_hash, 'sha256'), 'hex');
  return v_expected = coalesce(p_signature, '');
end;
$$;

insert into public.integration_sso_providers (provider, status, metadata)
select 'google_workspace', 'empty_real', jsonb_build_object('prepared_for', 'Google Workspace for Education')
where not exists (
  select 1
  from public.integration_sso_providers
  where provider = 'google_workspace'
    and school_id is null
);

insert into public.integration_sso_providers (provider, status, metadata)
select 'microsoft_entra', 'empty_real', jsonb_build_object('prepared_for', 'Microsoft 365 / Entra')
where not exists (
  select 1
  from public.integration_sso_providers
  where provider = 'microsoft_entra'
    and school_id is null
);

alter table public.integration_api_clients enable row level security;
alter table public.integration_api_audit_logs enable row level security;
alter table public.integration_external_mappings enable row level security;
alter table public.integration_sync_batches enable row level security;
alter table public.integration_webhook_endpoints enable row level security;
alter table public.integration_webhook_deliveries enable row level security;
alter table public.integration_sso_providers enable row level security;

drop policy if exists integration_api_clients_admin_select on public.integration_api_clients;
create policy integration_api_clients_admin_select
on public.integration_api_clients
for select
to authenticated
using (public.integration_can_manage_school(school_id));

drop policy if exists integration_api_audit_logs_admin_select on public.integration_api_audit_logs;
create policy integration_api_audit_logs_admin_select
on public.integration_api_audit_logs
for select
to authenticated
using (public.integration_can_manage_school(school_id));

drop policy if exists integration_external_mappings_admin_select on public.integration_external_mappings;
create policy integration_external_mappings_admin_select
on public.integration_external_mappings
for select
to authenticated
using (public.integration_can_manage_school(school_id));

drop policy if exists integration_sync_batches_admin_select on public.integration_sync_batches;
create policy integration_sync_batches_admin_select
on public.integration_sync_batches
for select
to authenticated
using (public.integration_can_manage_school(school_id));

drop policy if exists integration_webhook_endpoints_admin_select on public.integration_webhook_endpoints;
create policy integration_webhook_endpoints_admin_select
on public.integration_webhook_endpoints
for select
to authenticated
using (public.integration_can_manage_school(school_id));

drop policy if exists integration_webhook_deliveries_admin_select on public.integration_webhook_deliveries;
create policy integration_webhook_deliveries_admin_select
on public.integration_webhook_deliveries
for select
to authenticated
using (public.integration_can_manage_school(school_id));

drop policy if exists integration_sso_providers_admin_select on public.integration_sso_providers;
create policy integration_sso_providers_admin_select
on public.integration_sso_providers
for select
to authenticated
using (public.integration_can_manage_school(school_id));

revoke all on table public.integration_api_clients from public, anon, authenticated;
revoke all on table public.integration_api_audit_logs from public, anon, authenticated;
revoke all on table public.integration_external_mappings from public, anon, authenticated;
revoke all on table public.integration_sync_batches from public, anon, authenticated;
revoke all on table public.integration_webhook_endpoints from public, anon, authenticated;
revoke all on table public.integration_webhook_deliveries from public, anon, authenticated;
revoke all on table public.integration_sso_providers from public, anon, authenticated;

grant select on table public.integration_api_audit_logs to authenticated;
grant select on table public.integration_external_mappings to authenticated;
grant select on table public.integration_sync_batches to authenticated;
grant select on table public.integration_webhook_deliveries to authenticated;
grant select on table public.integration_sso_providers to authenticated;

revoke all on function public.integration_current_role() from public, anon;
revoke all on function public.integration_is_admin() from public, anon;
revoke all on function public.integration_can_manage_school(uuid) from public, anon;
revoke all on function public.integration_hash_secret(text) from public, anon;
revoke all on function public.integration_require_scope(uuid, text) from public, anon, authenticated;
revoke all on function public.integration_create_api_client(text, text, uuid, text[], text, text, text) from public, anon;
revoke all on function public.integration_revoke_api_client(uuid) from public, anon;
revoke all on function public.integration_log_api_access(uuid, text, text, integer, text, jsonb) from public, anon;
revoke all on function public.integration_api_v1_catalog() from public, anon;
revoke all on function public.integration_api_v1_read(text, uuid, integer, integer) from public, anon;
revoke all on function public.integration_preview_bulk_import(uuid, uuid, text, jsonb, text) from public, anon;
revoke all on function public.integration_confirm_bulk_import(uuid) from public, anon;
revoke all on function public.integration_register_external_mapping(uuid, uuid, text, uuid, text, text, text, jsonb) from public, anon;
revoke all on function public.integration_register_webhook(uuid, uuid, text, text[], text, jsonb) from public, anon;
revoke all on function public.integration_queue_webhook_event(text, text, uuid, uuid, jsonb) from public, anon;
revoke all on function public.integration_verify_webhook_signature(uuid, text, text) from public, anon;

grant execute on function public.integration_current_role() to authenticated, service_role;
grant execute on function public.integration_is_admin() to authenticated, service_role;
grant execute on function public.integration_can_manage_school(uuid) to authenticated, service_role;
grant execute on function public.integration_hash_secret(text) to authenticated, service_role;
grant execute on function public.integration_create_api_client(text, text, uuid, text[], text, text, text) to authenticated, service_role;
grant execute on function public.integration_revoke_api_client(uuid) to authenticated, service_role;
grant execute on function public.integration_log_api_access(uuid, text, text, integer, text, jsonb) to authenticated, service_role;
grant execute on function public.integration_api_v1_catalog() to authenticated, service_role;
grant execute on function public.integration_api_v1_read(text, uuid, integer, integer) to authenticated, service_role;
grant execute on function public.integration_preview_bulk_import(uuid, uuid, text, jsonb, text) to authenticated, service_role;
grant execute on function public.integration_confirm_bulk_import(uuid) to authenticated, service_role;
grant execute on function public.integration_register_external_mapping(uuid, uuid, text, uuid, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.integration_register_webhook(uuid, uuid, text, text[], text, jsonb) to authenticated, service_role;
grant execute on function public.integration_queue_webhook_event(text, text, uuid, uuid, jsonb) to authenticated, service_role;
grant execute on function public.integration_verify_webhook_signature(uuid, text, text) to authenticated, service_role;

comment on table public.integration_api_clients is
  'Integracoes institucionais API V1. Armazena somente hash de credencial e escopos revogaveis.';
comment on table public.integration_sync_batches is
  'Lotes de importacao/sincronizacao com preview, validacao, idempotencia e relatorio.';
comment on table public.integration_webhook_endpoints is
  'Configuracao de webhooks institucionais. Segredo cru fica fora do frontend; tabela usa hash/assinatura server-side.';
comment on function public.integration_api_v1_read(text, uuid, integer, integer) is
  'API V1: leitura institucional autorizada de recursos canonicos com isolamento por escola.';
comment on function public.integration_preview_bulk_import(uuid, uuid, text, jsonb, text) is
  'API V1: preview/validacao de importacao CSV/XLSX parseada em JSON. rs_school_package reutiliza admin_confirm_rs_school_import em dry-run.';
comment on function public.integration_confirm_bulk_import(uuid) is
  'API V1: confirmacao de lote validado. Pacotes escolares usam o importador canonico; sem segundo motor de matricula.';

do $$
declare
  v_anon_function_grants integer;
  v_unscoped_clients integer;
  v_frontend_table_grants integer;
begin
  select count(*)
    into v_anon_function_grants
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name like 'integration_%'
    and grantee in ('PUBLIC', 'anon');

  if v_anon_function_grants <> 0 then
    raise exception 'VALIDACAO bloqueada: funcoes integration_* expostas para PUBLIC/anon';
  end if;

  select count(*)
    into v_unscoped_clients
  from public.integration_api_clients
  where array_length(scopes, 1) is null
     or array_length(scopes, 1) = 0;

  if v_unscoped_clients <> 0 then
    raise exception 'VALIDACAO bloqueada: credencial de integracao sem escopo';
  end if;

  select count(*)
    into v_frontend_table_grants
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name like 'integration_%'
    and grantee = 'anon';

  if v_frontend_table_grants <> 0 then
    raise exception 'VALIDACAO bloqueada: tabela integration_* exposta para anon';
  end if;
end $$;
