-- HOTFIX VISTORIA 01 - Admin Habite-se.
-- Finalizes operational role changes, permission flags, settings and audit readout.

create table if not exists public.admin_operational_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid default auth.uid(),
  actor_role text,
  target_profile_id uuid,
  school_id uuid references public.schools(id) on delete set null,
  module text not null,
  action text not null,
  result text not null default 'success',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_operational_audit_events_result_check
    check (result in ('success', 'blocked', 'failed')),
  constraint admin_operational_audit_events_no_secret_check
    check (coalesce(details::text, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)')
);

create index if not exists admin_operational_audit_events_created_idx
  on public.admin_operational_audit_events (created_at desc);

create index if not exists admin_operational_audit_events_actor_idx
  on public.admin_operational_audit_events (actor_profile_id, created_at desc);

alter table public.admin_operational_audit_events enable row level security;

drop policy if exists admin_operational_audit_events_admin_select on public.admin_operational_audit_events;
create policy admin_operational_audit_events_admin_select
on public.admin_operational_audit_events
for select
to authenticated
using (public.is_platform_admin());

revoke all on table public.admin_operational_audit_events from public, anon, authenticated;
grant select on table public.admin_operational_audit_events to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.admin_operational_audit_events to postgres, service_role;

create table if not exists public.admin_feature_permission_flags (
  id uuid primary key default gen_random_uuid(),
  feature_key text not null,
  role_key text not null,
  permission_scope text not null,
  enabled boolean not null default false,
  locked boolean not null default false,
  description text,
  updated_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_feature_permission_flags_scope_check
    check (permission_scope in ('administrar', 'utilizar')),
  constraint admin_feature_permission_flags_role_check
    check (role_key in ('admin', 'secretaria', 'gestor', 'rede_municipal', 'professor', 'aluno', 'familia')),
  constraint admin_feature_permission_flags_unique
    unique (feature_key, role_key, permission_scope)
);

drop trigger if exists admin_feature_permission_flags_touch_updated_at on public.admin_feature_permission_flags;
create trigger admin_feature_permission_flags_touch_updated_at
before update on public.admin_feature_permission_flags
for each row
execute function public.institutional_touch_updated_at();

alter table public.admin_feature_permission_flags enable row level security;

drop policy if exists admin_feature_permission_flags_admin_select on public.admin_feature_permission_flags;
create policy admin_feature_permission_flags_admin_select
on public.admin_feature_permission_flags
for select
to authenticated
using (public.is_platform_admin());

revoke all on table public.admin_feature_permission_flags from public, anon, authenticated;
grant select on table public.admin_feature_permission_flags to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.admin_feature_permission_flags to postgres, service_role;

insert into public.admin_feature_permission_flags (feature_key, role_key, permission_scope, enabled, locked, description)
select feature_key, role_key, permission_scope, enabled, locked, description
from (
  values
    ('admin_dashboard', 'admin', 'administrar', true, true, 'Administração da plataforma'),
    ('admin_dashboard', 'secretaria', 'utilizar', false, true, 'Secretaria usa seus ambientes próprios'),
    ('secretaria', 'secretaria', 'administrar', true, true, 'Operação escolar'),
    ('secretaria', 'gestor', 'utilizar', true, false, 'Consulta e acompanhamento escolar'),
    ('rede_municipal', 'rede_municipal', 'administrar', true, true, 'Gestão de rede autorizada'),
    ('professor_web', 'professor', 'utilizar', true, true, 'Ambiente Professor'),
    ('aluno_web', 'aluno', 'utilizar', true, true, 'Ambiente Aluno'),
    ('familia_web', 'familia', 'utilizar', true, true, 'Ambiente Família'),
    ('biblioteca', 'professor', 'utilizar', true, false, 'Biblioteca autorizada'),
    ('biblioteca', 'aluno', 'utilizar', true, false, 'Biblioteca autorizada'),
    ('avalia_plus', 'professor', 'administrar', true, false, 'Aplicação e acompanhamento Avalia+'),
    ('avalia_plus', 'aluno', 'utilizar', true, false, 'Avaliações destinadas ao aluno'),
    ('comunicacoes', 'professor', 'administrar', true, false, 'Comunicação conforme política institucional'),
    ('comunicacoes', 'familia', 'utilizar', true, false, 'Recebimento de comunicados'),
    ('gamificacao', 'aluno', 'utilizar', true, false, 'XP, conquistas e trilhas'),
    ('suporte', 'admin', 'administrar', true, true, 'Console Help Desk'),
    ('suporte', 'professor', 'utilizar', true, false, 'Abertura e acompanhamento de chamados'),
    ('suporte', 'familia', 'utilizar', true, false, 'Abertura e acompanhamento de chamados')
) as seed(feature_key, role_key, permission_scope, enabled, locked, description)
on conflict (feature_key, role_key, permission_scope) do update
set enabled = excluded.enabled,
    locked = excluded.locked,
    description = excluded.description,
    updated_at = now();

create or replace function public.admin_list_permission_flags()
returns setof public.admin_feature_permission_flags
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select *
  from public.admin_feature_permission_flags
  where public.is_platform_admin()
  order by feature_key, role_key, permission_scope;
$$;

create or replace function public.admin_set_permission_flag(
  p_feature_key text,
  p_role_key text,
  p_permission_scope text,
  p_enabled boolean,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_flag public.admin_feature_permission_flags%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_flag
  from public.admin_feature_permission_flags
  where feature_key = p_feature_key
    and role_key = p_role_key
    and permission_scope = p_permission_scope
  for update;

  if v_flag.id is null then
    raise exception 'PERMISSION_FLAG_NOT_FOUND';
  end if;

  if v_flag.locked then
    raise exception 'PERMISSION_FLAG_LOCKED';
  end if;

  update public.admin_feature_permission_flags
  set enabled = p_enabled,
      updated_by = auth.uid(),
      updated_at = now()
  where id = v_flag.id
  returning * into v_flag;

  insert into public.admin_operational_audit_events (
    actor_profile_id,
    actor_role,
    module,
    action,
    result,
    details
  ) values (
    auth.uid(),
    public.current_platform_role(),
    'permissoes',
    'permission_flag_updated',
    'success',
    jsonb_build_object(
      'feature_key', p_feature_key,
      'role_key', p_role_key,
      'permission_scope', p_permission_scope,
      'enabled', p_enabled,
      'reason', nullif(left(coalesce(p_reason, ''), 240), '')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'feature_key', v_flag.feature_key,
    'role_key', v_flag.role_key,
    'permission_scope', v_flag.permission_scope,
    'enabled', v_flag.enabled
  );
end;
$$;

create or replace function public.admin_change_institutional_role(
  p_profile_id uuid,
  p_new_role text,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_profile public.profiles%rowtype;
  v_old_role text;
  v_new_role text;
  v_admin_roles text[] := array['admin', 'admin_ti', 'administrador', 'administrador_nacional', 'ti'];
  v_active_admins integer;
begin
  if not public.is_platform_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  v_new_role := lower(btrim(coalesce(p_new_role, '')));
  v_new_role := case v_new_role
    when 'responsavel' then 'educacao_infantil'
    when 'familia' then 'educacao_infantil'
    when 'rede' then 'secretaria_municipal'
    when 'rede_municipal' then 'secretaria_municipal'
    else v_new_role
  end;

  if v_new_role not in ('admin', 'secretaria', 'gestor', 'secretaria_municipal', 'professor', 'aluno', 'educacao_infantil') then
    raise exception 'INVALID_ROLE';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_profile_id
  for update;

  if v_profile.id is null then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  v_old_role := lower(coalesce(v_profile.platform_role, ''));

  if v_old_role = any(v_admin_roles) and not (v_new_role = any(v_admin_roles)) then
    select count(*) into v_active_admins
    from public.profiles p
    where p.status = 'active'
      and p.id <> p_profile_id
      and lower(coalesce(p.platform_role, '')) = any(v_admin_roles);

    if v_active_admins < 1 then
      raise exception 'LAST_ADMIN_PROTECTED';
    end if;
  end if;

  update public.profiles
  set platform_role = v_new_role,
      updated_at = now()
  where id = p_profile_id;

  update auth.users
  set raw_app_meta_data = jsonb_set(
        coalesce(raw_app_meta_data, '{}'::jsonb),
        '{platform_role}',
        to_jsonb(v_new_role),
        true
      ),
      updated_at = now()
  where id = p_profile_id;

  update public.users
  set perfil = v_new_role
  where id = p_profile_id;

  insert into public.admin_operational_audit_events (
    actor_profile_id,
    actor_role,
    target_profile_id,
    module,
    action,
    result,
    details
  ) values (
    auth.uid(),
    public.current_platform_role(),
    p_profile_id,
    'usuarios',
    'role_changed',
    'success',
    jsonb_build_object(
      'old_role', v_old_role,
      'new_role', v_new_role,
      'reason', nullif(left(coalesce(p_reason, ''), 240), '')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'profile_id', p_profile_id,
    'old_role', v_old_role,
    'new_role', v_new_role
  );
end;
$$;

create or replace function public.admin_get_habite_se_settings()
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_ai jsonb := '[]'::jsonb;
  v_live jsonb := '[]'::jsonb;
  v_sso jsonb := '[]'::jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if to_regclass('public.ai_provider_configs') is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'label', provider_label,
      'status', case when status = 'configured' then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end
    ) order by provider_label), '[]'::jsonb)
    into v_ai
    from public.ai_provider_configs;
  end if;

  if to_regclass('public.live_provider_settings') is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'label', coalesce(provider, 'Aulas ao vivo'),
      'status', case when provider_status = 'PASS' and secret_configured then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end
    ) order by provider), '[]'::jsonb)
    into v_live
    from public.live_provider_settings;
  end if;

  if to_regclass('public.integration_sso_providers') is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'label', provider,
      'status', case when status = 'configured' then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end
    ) order by provider), '[]'::jsonb)
    into v_sso
    from public.integration_sso_providers;
  end if;

  return jsonb_build_object(
    'institutional', (
      select jsonb_build_object(
        'schools_total', count(*),
        'schools_active', count(*) filter (where status = 'active'),
        'states', coalesce(jsonb_agg(distinct estado) filter (where estado is not null), '[]'::jsonb)
      )
      from public.schools
    ),
    'communication_permissions', (
      select jsonb_build_object(
        'configured_schools', count(*),
        'student_to_student_default', 'BLOQUEADO',
        'student_to_student_enabled_schools', count(*) filter (where student_student_enabled)
      )
      from public.communication_permission_settings
    ),
    'gamification', (
      select jsonb_build_object(
        'settings_rows', count(*),
        'ranking_enabled_schools', count(*) filter (where rankings_enabled),
        'store_enabled_schools', count(*) filter (where store_enabled)
      )
      from public.gamification_settings
    ),
    'sla', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'priority', priority,
        'first_response_minutes', first_response_minutes,
        'resolution_minutes', resolution_minutes,
        'status', status
      ) order by case priority when 'urgente' then 1 when 'alta' then 2 when 'normal' then 3 else 4 end), '[]'::jsonb)
      from public.support_sla_policies
    ),
    'avalia_plus', jsonb_build_object(
      'item_bank', case when to_regclass('public.assessment_item_bank') is not null or to_regclass('public.question_items') is not null then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end,
      'printed_offline', case when to_regclass('public.assessment_print_batches') is not null or to_regclass('public.assessment_offline_import_batches') is not null then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end,
      'tri', case when to_regclass('public.assessment_irt_calibrations') is not null then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end
    ),
    'external_services', jsonb_build_array(
      jsonb_build_object('label', 'IA Pedagógica', 'status', case when jsonb_array_length(v_ai) > 0 then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end, 'items', v_ai),
      jsonb_build_object('label', 'OCR', 'status', 'AGUARDANDO CONFIGURACAO'),
      jsonb_build_object('label', 'Aulas ao vivo', 'status', case when jsonb_array_length(v_live) > 0 then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end, 'items', v_live),
      jsonb_build_object('label', 'SSO', 'status', case when jsonb_array_length(v_sso) > 0 then 'CONFIGURADO' else 'AGUARDANDO CONFIGURACAO' end, 'items', v_sso),
      jsonb_build_object('label', 'HLS/CDN', 'status', 'AGUARDANDO CONFIGURACAO')
    )
  );
end;
$$;

create or replace function public.admin_list_audit_events(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_user_id uuid default null,
  p_role text default null,
  p_school_id uuid default null,
  p_module text default null,
  p_action text default null,
  p_limit integer default 100
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 100), 1), 300);
begin
  if not public.is_platform_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  return (
    with events as (
      select
        e.created_at,
        e.actor_profile_id as actor_id,
        coalesce(p.display_name, e.actor_profile_id::text, 'Sistema') as actor_name,
        coalesce(e.actor_role, p.platform_role, 'sistema') as actor_role,
        e.school_id,
        s.nome as school_name,
        e.module,
        e.action,
        e.result,
        e.details
      from public.admin_operational_audit_events e
      left join public.profiles p on p.id = e.actor_profile_id
      left join public.schools s on s.id = e.school_id

      union all

      select
        ce.created_at,
        ce.performed_by,
        coalesce(p.display_name, ce.performed_by::text, 'Sistema'),
        coalesce(p.platform_role, 'sistema'),
        c.school_id,
        s.nome,
        'comunicacoes',
        ce.event_type,
        coalesce(ce.to_status, ce.from_status, 'success'),
        jsonb_build_object('communication_id', ce.communication_id)
      from public.communication_events ce
      join public.communications c on c.id = ce.communication_id
      left join public.profiles p on p.id = ce.performed_by
      left join public.schools s on s.id = c.school_id

      union all

      select
        em.created_at,
        em.performed_by,
        coalesce(p.display_name, em.performed_by::text, 'Sistema'),
        coalesce(p.platform_role, 'sistema'),
        em.school_id,
        s.nome,
        'matriculas',
        em.movement_type,
        coalesce(em.to_status, 'success'),
        jsonb_build_object('student_id', em.student_id, 'enrollment_id', em.enrollment_id, 'reason', em.reason)
      from public.enrollment_movements em
      left join public.profiles p on p.id = em.performed_by
      left join public.schools s on s.id = em.school_id

      union all

      select
        de.created_at,
        de.admin_user_id,
        coalesce(p.display_name, de.admin_user_id::text, 'Sistema'),
        coalesce(p.platform_role, 'admin'),
        de.school_id,
        s.nome,
        'implantacao',
        de.action,
        de.result,
        jsonb_build_object('stage', de.stage, 'school_code', de.school_code, 'reason', de.reason)
      from public.admin_school_deployment_events de
      left join public.profiles p on p.id = de.admin_user_id
      left join public.schools s on s.id = de.school_id

      union all

      select
        se.created_at,
        se.actor_profile_id,
        coalesce(p.display_name, se.actor_profile_id::text, 'Sistema'),
        coalesce(p.platform_role, 'suporte'),
        st.school_id,
        s.nome,
        'suporte',
        se.event_type,
        coalesce(se.to_status, se.from_status, 'success'),
        se.details || jsonb_build_object('ticket_id', se.ticket_id, 'protocol', st.protocol)
      from public.support_ticket_events se
      join public.support_tickets st on st.id = se.ticket_id
      left join public.profiles p on p.id = se.actor_profile_id
      left join public.schools s on s.id = st.school_id

      union all

      select
        il.created_at,
        null::uuid,
        'API Institucional',
        'integracao',
        il.school_id,
        s.nome,
        'integracoes',
        il.method || ' ' || il.endpoint,
        case when il.status_code between 200 and 299 then 'success' else 'failed' end,
        jsonb_build_object('status_code', il.status_code, 'client_id', il.client_id)
      from public.integration_api_audit_logs il
      left join public.schools s on s.id = il.school_id
    ),
    filtered as (
      select *
      from events
      where (p_from is null or created_at >= p_from)
        and (p_to is null or created_at <= p_to)
        and (p_user_id is null or actor_id = p_user_id)
        and (p_role is null or p_role = '' or lower(actor_role) = lower(p_role))
        and (p_school_id is null or school_id = p_school_id)
        and (p_module is null or p_module = '' or lower(module) = lower(p_module))
        and (p_action is null or p_action = '' or action ilike '%' || p_action || '%')
      order by created_at desc
      limit v_limit
    )
    select coalesce(jsonb_agg(jsonb_build_object(
      'created_at', created_at,
      'actor_id', actor_id,
      'actor_name', actor_name,
      'actor_role', actor_role,
      'school_id', school_id,
      'school_name', school_name,
      'module', module,
      'action', action,
      'result', result,
      'details', details
    ) order by created_at desc), '[]'::jsonb)
    from filtered
  );
end;
$$;

grant execute on function public.admin_list_permission_flags() to authenticated;
grant execute on function public.admin_set_permission_flag(text, text, text, boolean, text) to authenticated;
grant execute on function public.admin_change_institutional_role(uuid, text, text) to authenticated;
grant execute on function public.admin_get_habite_se_settings() to authenticated;
grant execute on function public.admin_list_audit_events(timestamptz, timestamptz, uuid, text, uuid, text, text, integer) to authenticated;

comment on table public.admin_operational_audit_events is 'Admin-only operational audit events for role, permission and settings changes. It complements existing module trails and is surfaced through admin_list_audit_events.';
comment on table public.admin_feature_permission_flags is 'Institutional feature flags for Admin UI. These flags never bypass backend/RLS authorization.';
