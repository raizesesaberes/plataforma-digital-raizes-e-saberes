-- ARQUITETURA DE CONTEUDO 04 — FASE 1 BANCO DE QUESTOES
-- Infraestrutura vazia e backward-compatible:
-- tenant -> contrato -> produto -> colecao -> entitlement -> acervo mestre -> resolver -> health check.
-- Nao cataloga questoes, nao cria produto/contrato comercial, nao ativa feature flag.

begin;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_tenant_type') then
    create type public.rs_tenant_type as enum ('NETWORK', 'SCHOOL');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_content_type') then
    create type public.rs_content_type as enum (
      'QUESTION',
      'BOOK',
      'BOOK_PAGE',
      'VIDEO',
      'ASSESSMENT_TEMPLATE',
      'ACTIVITY',
      'PRINTABLE',
      'GAME',
      'INTERACTION',
      'TRAINING'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_content_owner_scope') then
    create type public.rs_content_owner_scope as enum ('GLOBAL_RAIZES', 'NETWORK', 'SCHOOL', 'TEACHER');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_content_editorial_status') then
    create type public.rs_content_editorial_status as enum ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_product_status') then
    create type public.rs_product_status as enum ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_contract_status') then
    create type public.rs_contract_status as enum ('DRAFT', 'ACTIVE', 'SUSPENDED', 'ENDED', 'CANCELLED');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_entitlement_status') then
    create type public.rs_entitlement_status as enum ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_requirement_level') then
    create type public.rs_requirement_level as enum ('REQUIRED', 'RECOMMENDED', 'OPTIONAL');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'rs_content_exception_action') then
    create type public.rs_content_exception_action as enum ('ALLOW', 'BLOCK', 'PILOT', 'EMBARGO');
  end if;
end $$;

create or replace function public.rs_content_normalize_code(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      upper(
        translate(
          btrim(coalesce(p_value, '')),
          'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäåéèêëíìîïóòôõöúùûüçñ',
          'AAAAAAEEEEIIIIOOOOOUUUUCNaaaaaaeeeeiiiiooooouuuucn'
        )
      ),
      '[^A-Z0-9]+',
      '_',
      'g'
    ),
    ''
  );
$$;

comment on function public.rs_content_normalize_code(text) is
  'Normaliza codigos pedagogicos para evitar texto livre divergente em taxonomias de conteudo.';

create table if not exists public.content_segments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_segments_code_normalized check (code = public.rs_content_normalize_code(code)),
  constraint content_segments_status_check check (status in ('active', 'inactive', 'archived'))
);

create table if not exists public.content_grades (
  id uuid primary key default gen_random_uuid(),
  segment_id uuid not null references public.content_segments(id) on delete restrict,
  code text not null,
  name text not null,
  sort_order integer not null default 0,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_grades_code_normalized check (code = public.rs_content_normalize_code(code)),
  constraint content_grades_status_check check (status in ('active', 'inactive', 'archived')),
  unique (segment_id, code)
);

create table if not exists public.content_subjects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_subjects_code_normalized check (code = public.rs_content_normalize_code(code)),
  constraint content_subjects_status_check check (status in ('active', 'inactive', 'archived'))
);

create table if not exists public.content_grade_aliases (
  id uuid primary key default gen_random_uuid(),
  grade_id uuid not null references public.content_grades(id) on delete cascade,
  alias_code text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint content_grade_aliases_code_normalized check (alias_code = public.rs_content_normalize_code(alias_code)),
  unique (alias_code)
);

create table if not exists public.content_subject_aliases (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.content_subjects(id) on delete cascade,
  alias_code text not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint content_subject_aliases_code_normalized check (alias_code = public.rs_content_normalize_code(alias_code)),
  unique (alias_code)
);

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  tenant_type public.rs_tenant_type not null,
  network_id uuid references public.education_networks(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenants_status_check check (status in ('active', 'inactive', 'archived')),
  constraint tenants_exactly_one_target check (
    (tenant_type = 'NETWORK' and network_id is not null and school_id is null)
    or
    (tenant_type = 'SCHOOL' and school_id is not null and network_id is null)
  )
);

create unique index if not exists tenants_network_unique_idx
  on public.tenants(network_id)
  where tenant_type = 'NETWORK' and network_id is not null;

create unique index if not exists tenants_school_unique_idx
  on public.tenants(school_id)
  where tenant_type = 'SCHOOL' and school_id is not null;

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  content_type public.rs_content_type not null,
  segment_id uuid references public.content_segments(id) on delete restrict,
  grade_id uuid references public.content_grades(id) on delete restrict,
  subject_id uuid references public.content_subjects(id) on delete restrict,
  bncc_codes text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  title text,
  owner_scope public.rs_content_owner_scope not null default 'GLOBAL_RAIZES',
  owner_tenant_id uuid references public.tenants(id) on delete restrict,
  owner_user_id uuid references auth.users(id) on delete set null,
  editorial_status public.rs_content_editorial_status not null default 'DRAFT',
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_version_check check (version > 0),
  constraint content_items_published_at_check check (
    (editorial_status = 'PUBLISHED' and published_at is not null)
    or
    (editorial_status <> 'PUBLISHED')
  ),
  constraint content_items_owner_scope_check check (
    (owner_scope = 'GLOBAL_RAIZES' and owner_tenant_id is null)
    or
    (owner_scope in ('NETWORK', 'SCHOOL') and owner_tenant_id is not null)
    or
    (owner_scope = 'TEACHER' and owner_user_id is not null)
  )
);

comment on table public.content_items is
  'Registro mestre de catalogo/governanca. Nao duplica payload dos motores canonicos.';

create table if not exists public.content_question_items (
  content_item_id uuid primary key references public.content_items(id) on delete cascade,
  question_item_id uuid not null references public.question_items(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (question_item_id)
);

create table if not exists public.content_collections (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  segment_id uuid references public.content_segments(id) on delete restrict,
  grade_id uuid references public.content_grades(id) on delete restrict,
  subject_id uuid references public.content_subjects(id) on delete restrict,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_collections_code_normalized check (code = public.rs_content_normalize_code(code)),
  constraint content_collections_status_check check (status in ('draft', 'active', 'inactive', 'archived'))
);

create table if not exists public.content_collection_items (
  collection_id uuid not null references public.content_collections(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  sort_order integer not null default 0,
  required boolean not null default false,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (collection_id, content_item_id)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status public.rs_product_status not null default 'DRAFT',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_code_normalized check (code = public.rs_content_normalize_code(code))
);

create table if not exists public.product_collections (
  product_id uuid not null references public.products(id) on delete cascade,
  collection_id uuid not null references public.content_collections(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_id, collection_id)
);

create table if not exists public.product_content_requirements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  segment_id uuid references public.content_segments(id) on delete restrict,
  grade_id uuid references public.content_grades(id) on delete restrict,
  subject_id uuid references public.content_subjects(id) on delete restrict,
  content_type public.rs_content_type not null,
  requirement_level public.rs_requirement_level not null,
  min_count integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_content_requirements_min_count_check check (min_count >= 0),
  unique (product_id, segment_id, grade_id, subject_id, content_type)
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  contract_ref text not null,
  starts_at date not null,
  ends_at date,
  status public.rs_contract_status not null default 'DRAFT',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_ref_not_blank check (length(btrim(contract_ref)) > 0),
  constraint contracts_dates_check check (ends_at is null or ends_at >= starts_at)
);

create unique index if not exists contracts_tenant_ref_unique_idx
  on public.contracts(tenant_id, lower(btrim(contract_ref)));

create table if not exists public.contract_products (
  contract_id uuid not null references public.contracts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (contract_id, product_id),
  constraint contract_products_status_check check (status in ('active', 'inactive', 'ended'))
);

create table if not exists public.tenant_product_entitlements (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  starts_at date not null,
  ends_at date,
  status public.rs_entitlement_status not null default 'ACTIVE',
  segment_ids uuid[] not null default '{}'::uuid[],
  grade_ids uuid[] not null default '{}'::uuid[],
  subject_ids uuid[] not null default '{}'::uuid[],
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenant_product_entitlements_dates_check check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.content_access_exceptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  action public.rs_content_exception_action not null,
  reason text,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_access_exceptions_scope_check check (tenant_id is not null or school_id is not null),
  constraint content_access_exceptions_window_check check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table if not exists public.content_feature_flags (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  tenant_id uuid references public.tenants(id) on delete cascade,
  enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_feature_flags_key_normalized check (flag_key = public.rs_content_normalize_code(flag_key)),
  unique (flag_key, tenant_id)
);

create unique index if not exists content_feature_flags_global_unique_idx
  on public.content_feature_flags(flag_key)
  where tenant_id is null;

create table if not exists public.content_editorial_events (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid references public.content_items(id) on delete cascade,
  event_type text not null,
  from_status public.rs_content_editorial_status,
  to_status public.rs_content_editorial_status,
  actor_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint content_editorial_events_type_not_blank check (length(btrim(event_type)) > 0)
);

create table if not exists public.contract_entitlement_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete set null,
  entitlement_id uuid references public.tenant_product_entitlements(id) on delete set null,
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint contract_entitlement_events_type_not_blank check (length(btrim(event_type)) > 0)
);

create or replace function public.content_item_is_type(p_content_item_id uuid, p_content_type public.rs_content_type)
returns boolean
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1
    from public.content_items ci
    where ci.id = p_content_item_id
      and ci.content_type = p_content_type
  );
$$;

create or replace function public.content_validate_question_adapter()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.content_item_is_type(new.content_item_id, 'QUESTION') then
    raise exception 'CONTENT_ITEM_NOT_QUESTION';
  end if;

  return new;
end;
$$;

create or replace function public.content_touch_updated_at()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.content_assert_platform_admin()
returns void
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'UNAUTHORIZED_CONTENT_ADMIN';
  end if;
end;
$$;

create or replace function public.content_tenant_matches_contract_scope(p_contract_tenant_id uuid, p_beneficiary_tenant_id uuid)
returns boolean
language sql
stable
set search_path to 'public', 'pg_temp'
as $$
  with contract_tenant as (
    select *
    from public.tenants
    where id = p_contract_tenant_id
      and status = 'active'
  ),
  beneficiary as (
    select *
    from public.tenants
    where id = p_beneficiary_tenant_id
      and status = 'active'
  )
  select exists (
    select 1
    from contract_tenant ct
    join beneficiary bt on true
    where bt.id = ct.id
       or (
         ct.tenant_type = 'NETWORK'
         and bt.tenant_type = 'SCHOOL'
         and exists (
           select 1
           from public.network_school_memberships nsm
           where nsm.network_id = ct.network_id
             and nsm.school_id = bt.school_id
             and nsm.status = 'active'
             and (nsm.ended_at is null or nsm.ended_at > now())
         )
       )
  );
$$;

create or replace function public.content_validate_entitlement()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_contract public.contracts%rowtype;
begin
  select *
  into v_contract
  from public.contracts
  where id = new.contract_id;

  if not found then
    raise exception 'CONTRACT_NOT_FOUND';
  end if;

  if new.status = 'ACTIVE' and v_contract.status <> 'ACTIVE' then
    raise exception 'CONTRACT_NOT_ACTIVE';
  end if;

  if not exists (
    select 1
    from public.contract_products cp
    where cp.contract_id = new.contract_id
      and cp.product_id = new.product_id
      and cp.status = 'active'
  ) then
    raise exception 'PRODUCT_NOT_IN_CONTRACT';
  end if;

  if not public.content_tenant_matches_contract_scope(v_contract.tenant_id, new.tenant_id) then
    raise exception 'ENTITLEMENT_TENANT_OUT_OF_CONTRACT_SCOPE';
  end if;

  if new.starts_at < v_contract.starts_at then
    raise exception 'ENTITLEMENT_STARTS_BEFORE_CONTRACT';
  end if;

  if v_contract.ends_at is not null and (new.ends_at is null or new.ends_at > v_contract.ends_at) then
    raise exception 'ENTITLEMENT_ENDS_AFTER_CONTRACT';
  end if;

  return new;
end;
$$;

create or replace function public.admin_create_or_update_tenant_product_entitlement(
  p_entitlement_id uuid,
  p_contract_id uuid,
  p_tenant_id uuid,
  p_product_id uuid,
  p_starts_at date,
  p_ends_at date default null,
  p_status public.rs_entitlement_status default 'ACTIVE',
  p_segment_ids uuid[] default '{}'::uuid[],
  p_grade_ids uuid[] default '{}'::uuid[],
  p_subject_ids uuid[] default '{}'::uuid[],
  p_metadata jsonb default '{}'::jsonb
)
returns public.tenant_product_entitlements
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_entitlement public.tenant_product_entitlements%rowtype;
begin
  perform public.content_assert_platform_admin();

  if p_entitlement_id is null then
    insert into public.tenant_product_entitlements (
      contract_id, tenant_id, product_id, starts_at, ends_at, status,
      segment_ids, grade_ids, subject_ids, metadata, created_by, updated_by
    )
    values (
      p_contract_id, p_tenant_id, p_product_id, p_starts_at, p_ends_at, p_status,
      coalesce(p_segment_ids, '{}'::uuid[]),
      coalesce(p_grade_ids, '{}'::uuid[]),
      coalesce(p_subject_ids, '{}'::uuid[]),
      coalesce(p_metadata, '{}'::jsonb),
      auth.uid(),
      auth.uid()
    )
    returning * into v_entitlement;
  else
    update public.tenant_product_entitlements
    set contract_id = p_contract_id,
        tenant_id = p_tenant_id,
        product_id = p_product_id,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        status = p_status,
        segment_ids = coalesce(p_segment_ids, '{}'::uuid[]),
        grade_ids = coalesce(p_grade_ids, '{}'::uuid[]),
        subject_ids = coalesce(p_subject_ids, '{}'::uuid[]),
        metadata = coalesce(p_metadata, '{}'::jsonb),
        updated_by = auth.uid(),
        updated_at = now()
    where id = p_entitlement_id
    returning * into v_entitlement;

    if not found then
      raise exception 'ENTITLEMENT_NOT_FOUND';
    end if;
  end if;

  insert into public.contract_entitlement_events (
    contract_id, entitlement_id, event_type, actor_user_id, details
  )
  values (
    v_entitlement.contract_id,
    v_entitlement.id,
    case when p_entitlement_id is null then 'ENTITLEMENT_CREATED' else 'ENTITLEMENT_UPDATED' end,
    auth.uid(),
    jsonb_build_object('product_id', v_entitlement.product_id, 'tenant_id', v_entitlement.tenant_id, 'status', v_entitlement.status)
  );

  return v_entitlement;
end;
$$;

create or replace function public.admin_set_content_editorial_status(
  p_content_item_id uuid,
  p_to_status public.rs_content_editorial_status,
  p_details jsonb default '{}'::jsonb
)
returns public.content_items
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_item public.content_items%rowtype;
  v_from public.rs_content_editorial_status;
begin
  perform public.content_assert_platform_admin();

  select *
  into v_item
  from public.content_items
  where id = p_content_item_id
  for update;

  if not found then
    raise exception 'CONTENT_ITEM_NOT_FOUND';
  end if;

  if v_item.owner_scope = 'GLOBAL_RAIZES' and not public.is_platform_admin() then
    raise exception 'GLOBAL_PUBLISH_UNAUTHORIZED';
  end if;

  v_from := v_item.editorial_status;

  if not (
    (v_from = 'DRAFT' and p_to_status in ('IN_REVIEW', 'ARCHIVED'))
    or (v_from = 'IN_REVIEW' and p_to_status in ('APPROVED', 'DRAFT', 'ARCHIVED'))
    or (v_from = 'APPROVED' and p_to_status in ('PUBLISHED', 'IN_REVIEW', 'ARCHIVED'))
    or (v_from = 'PUBLISHED' and p_to_status = 'ARCHIVED')
    or (v_from = p_to_status)
  ) then
    raise exception 'INVALID_EDITORIAL_TRANSITION';
  end if;

  update public.content_items
  set editorial_status = p_to_status,
      published_at = case when p_to_status = 'PUBLISHED' and published_at is null then now() else published_at end,
      archived_at = case when p_to_status = 'ARCHIVED' then now() else archived_at end,
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_content_item_id
  returning * into v_item;

  insert into public.content_editorial_events (
    content_item_id, event_type, from_status, to_status, actor_user_id, details
  )
  values (
    p_content_item_id,
    'EDITORIAL_STATUS_CHANGED',
    v_from,
    p_to_status,
    auth.uid(),
    coalesce(p_details, '{}'::jsonb)
  );

  return v_item;
end;
$$;

create or replace function public.content_feature_enabled_for_school(
  p_flag_key text,
  p_school_id uuid
)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with normalized as (
    select public.rs_content_normalize_code(p_flag_key) as flag_key
  ),
  school_tenant as (
    select t.id
    from public.tenants t
    where t.tenant_type = 'SCHOOL'
      and t.school_id = p_school_id
      and t.status = 'active'
    limit 1
  ),
  network_tenants as (
    select t.id
    from public.tenants t
    join public.network_school_memberships nsm on nsm.network_id = t.network_id
    where t.tenant_type = 'NETWORK'
      and t.status = 'active'
      and nsm.school_id = p_school_id
      and nsm.status = 'active'
      and (nsm.ended_at is null or nsm.ended_at > now())
  )
  select coalesce((
    select cff.enabled
    from public.content_feature_flags cff, normalized n
    where cff.flag_key = n.flag_key
      and (
        cff.tenant_id in (select id from school_tenant)
        or cff.tenant_id in (select id from network_tenants)
        or cff.tenant_id is null
      )
    order by
      case
        when cff.tenant_id in (select id from school_tenant) then 1
        when cff.tenant_id in (select id from network_tenants) then 2
        else 3
      end
    limit 1
  ), false);
$$;

create or replace function public.content_resolve_for_user(p_context jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_uid uuid := auth.uid();
  v_content_type public.rs_content_type := coalesce((p_context ->> 'content_type')::public.rs_content_type, 'QUESTION'::public.rs_content_type);
  v_school_id uuid := nullif(p_context ->> 'school_id', '')::uuid;
  v_class_id uuid := nullif(p_context ->> 'class_id', '')::uuid;
  v_subject_code text := public.rs_content_normalize_code(p_context ->> 'subject_code');
  v_limit integer := least(greatest(coalesce((p_context ->> 'limit')::integer, 25), 1), 100);
  v_offset integer := greatest(coalesce((p_context ->> 'offset')::integer, 0), 0);
  v_teacher_id uuid;
  v_student_id uuid;
  v_grade_id uuid;
  v_subject_id uuid;
  v_items jsonb;
  v_total integer;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if v_content_type <> 'QUESTION' then
    return jsonb_build_object('status', 'UNSUPPORTED_CONTENT_TYPE', 'items', '[]'::jsonb, 'total', 0);
  end if;

  if exists (
    select 1
    from public.teachers t
    where t.profile_id = v_uid
      and coalesce(t.status, 'active') = 'active'
  ) then
    select t.id, coalesce(v_school_id, t.school_id)
    into v_teacher_id, v_school_id
    from public.teachers t
    where t.profile_id = v_uid
      and coalesce(t.status, 'active') = 'active'
      and (v_school_id is null or t.school_id = v_school_id)
    order by t.created_at desc nulls last
    limit 1;

    if v_teacher_id is null or v_school_id is null then
      raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT';
    end if;

    if v_class_id is not null then
      if not exists (
        select 1
        from public.class_teacher_memberships ctm
        join public.classes c on c.id = ctm.class_id
        where ctm.teacher_id = v_teacher_id
          and ctm.class_id = v_class_id
          and ctm.status = 'active'
          and (ctm.ended_at is null or ctm.ended_at > now())
          and c.school_id = v_school_id
          and coalesce(c.status, 'active') = 'active'
      ) then
        raise exception 'UNAUTHORIZED_CLASS_CONTEXT';
      end if;

      select cga.grade_id
      into v_grade_id
      from public.classes c
      join public.content_grade_aliases cga
        on cga.alias_code = public.rs_content_normalize_code(coalesce(c.school_year, c.ano_escolar::text))
      where c.id = v_class_id
      limit 1;
    end if;

  else
    select sgc.student_id, sgc.school_id, sgc.class_id, cga.grade_id
    into v_student_id, v_school_id, v_class_id, v_grade_id
    from public.student_get_context() sgc
    left join public.content_grade_aliases cga
      on cga.alias_code = public.rs_content_normalize_code(sgc.school_year)
    limit 1;

    if v_student_id is null then
      raise exception 'UNAUTHORIZED_STUDENT_CONTEXT';
    end if;

    if nullif(p_context ->> 'school_id', '')::uuid is not null and nullif(p_context ->> 'school_id', '')::uuid <> v_school_id then
      raise exception 'UNAUTHORIZED_SCHOOL_CONTEXT';
    end if;

    if nullif(p_context ->> 'class_id', '')::uuid is not null and nullif(p_context ->> 'class_id', '')::uuid <> v_class_id then
      raise exception 'UNAUTHORIZED_CLASS_CONTEXT';
    end if;
  end if;

  if not public.content_feature_enabled_for_school('CONTENT_RESOLVER_QUESTIONS', v_school_id) then
    return jsonb_build_object(
      'status', 'FEATURE_DISABLED',
      'feature', 'content_resolver_questions',
      'items', '[]'::jsonb,
      'total', 0
    );
  end if;

  if v_subject_code is not null then
    select csa.subject_id
    into v_subject_id
    from public.content_subject_aliases csa
    where csa.alias_code = v_subject_code
    limit 1;
  end if;

  with school_tenant as (
    select t.id
    from public.tenants t
    where t.tenant_type = 'SCHOOL'
      and t.school_id = v_school_id
      and t.status = 'active'
    limit 1
  ),
  network_tenants as (
    select t.id
    from public.tenants t
    join public.network_school_memberships nsm on nsm.network_id = t.network_id
    where t.tenant_type = 'NETWORK'
      and t.status = 'active'
      and nsm.school_id = v_school_id
      and nsm.status = 'active'
      and (nsm.ended_at is null or nsm.ended_at > now())
  ),
  entitled_products as (
    select distinct tpe.product_id
    from public.tenant_product_entitlements tpe
    where tpe.status = 'ACTIVE'
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
      and (
        tpe.tenant_id in (select id from school_tenant)
        or tpe.tenant_id in (select id from network_tenants)
      )
      and (cardinality(tpe.grade_ids) = 0 or v_grade_id is null or v_grade_id = any(tpe.grade_ids))
      and (cardinality(tpe.subject_ids) = 0 or v_subject_id is null or v_subject_id = any(tpe.subject_ids))
  ),
  allowed_by_exception as (
    select cae.content_item_id
    from public.content_access_exceptions cae
    where cae.action in ('ALLOW', 'PILOT')
      and (cae.school_id = v_school_id or cae.tenant_id in (select id from school_tenant union select id from network_tenants))
      and (cae.starts_at is null or cae.starts_at <= now())
      and (cae.ends_at is null or cae.ends_at >= now())
  ),
  blocked as (
    select cae.content_item_id
    from public.content_access_exceptions cae
    where cae.action in ('BLOCK', 'EMBARGO')
      and (cae.school_id = v_school_id or cae.tenant_id in (select id from school_tenant union select id from network_tenants))
      and (cae.starts_at is null or cae.starts_at <= now())
      and (cae.ends_at is null or cae.ends_at >= now())
  ),
  eligible as (
    select distinct
      ci.id as content_item_id,
      cqi.question_item_id,
      ci.title,
      ci.grade_id,
      ci.subject_id,
      ci.published_at
    from public.content_items ci
    join public.content_question_items cqi on cqi.content_item_id = ci.id
    left join public.content_collection_items cci on cci.content_item_id = ci.id
    left join public.product_collections pc on pc.collection_id = cci.collection_id
    where ci.content_type = 'QUESTION'
      and ci.editorial_status = 'PUBLISHED'
      and ci.published_at is not null
      and ci.id not in (select content_item_id from blocked)
      and (
        pc.product_id in (select product_id from entitled_products)
        or ci.id in (select content_item_id from allowed_by_exception)
      )
      and (v_grade_id is null or ci.grade_id is null or ci.grade_id = v_grade_id)
      and (v_subject_id is null or ci.subject_id is null or ci.subject_id = v_subject_id)
  ),
  counted as (
    select count(*)::integer as total from eligible
  ),
  paged as (
    select *
    from eligible
    order by published_at desc nulls last, content_item_id
    limit v_limit offset v_offset
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'content_item_id', p.content_item_id,
      'question_item_id', p.question_item_id,
      'title', p.title,
      'grade_id', p.grade_id,
      'subject_id', p.subject_id,
      'published_at', p.published_at
    )), '[]'::jsonb),
    (select total from counted)
  into v_items, v_total
  from paged p;

  return jsonb_build_object(
    'status', 'PASS',
    'content_type', 'QUESTION',
    'school_id', v_school_id,
    'class_id', v_class_id,
    'limit', v_limit,
    'offset', v_offset,
    'total', coalesce(v_total, 0),
    'items', coalesce(v_items, '[]'::jsonb)
  );
end;
$$;

create or replace function public.content_health_check_tenant(p_tenant_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_tenant public.tenants%rowtype;
  v_blocked jsonb := '[]'::jsonb;
  v_warning jsonb := '[]'::jsonb;
  v_status text := 'READY';
begin
  select * into v_tenant from public.tenants where id = p_tenant_id;
  if not found or v_tenant.status <> 'active' then
    return jsonb_build_object('status', 'BLOCKED', 'codes', jsonb_build_array('TENANT_NOT_ACTIVE'));
  end if;

  if not exists (
    select 1
    from public.tenant_product_entitlements tpe
    where tpe.tenant_id = p_tenant_id
      and tpe.status = 'ACTIVE'
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
  ) then
    v_blocked := v_blocked || jsonb_build_array('NO_ACTIVE_ENTITLEMENT');
  end if;

  with requirements as (
    select
      tpe.product_id,
      pcr.id as requirement_id,
      pcr.requirement_level,
      pcr.min_count,
      pcr.content_type,
      pcr.segment_id,
      pcr.grade_id,
      pcr.subject_id,
      (
        select count(distinct ci.id)
        from public.product_collections pc
        join public.content_collection_items cci on cci.collection_id = pc.collection_id
        join public.content_items ci on ci.id = cci.content_item_id
        where pc.product_id = pcr.product_id
          and ci.content_type = pcr.content_type
          and ci.editorial_status = 'PUBLISHED'
          and ci.published_at is not null
          and (pcr.segment_id is null or ci.segment_id = pcr.segment_id)
          and (pcr.grade_id is null or ci.grade_id = pcr.grade_id)
          and (pcr.subject_id is null or ci.subject_id = pcr.subject_id)
      ) as available_count
    from public.tenant_product_entitlements tpe
    join public.product_content_requirements pcr on pcr.product_id = tpe.product_id
    where tpe.tenant_id = p_tenant_id
      and tpe.status = 'ACTIVE'
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
  ),
  missing_required as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'code', 'REQUIRED_CONTENT_BELOW_MINIMUM',
      'requirement_id', requirement_id,
      'product_id', product_id,
      'content_type', content_type,
      'min_count', min_count,
      'available_count', available_count
    )), '[]'::jsonb) as payload
    from requirements
    where requirement_level = 'REQUIRED'
      and available_count < min_count
  ),
  missing_recommended as (
    select coalesce(jsonb_agg(jsonb_build_object(
      'code', 'RECOMMENDED_CONTENT_BELOW_MINIMUM',
      'requirement_id', requirement_id,
      'product_id', product_id,
      'content_type', content_type,
      'min_count', min_count,
      'available_count', available_count
    )), '[]'::jsonb) as payload
    from requirements
    where requirement_level = 'RECOMMENDED'
      and available_count < min_count
  )
  select
    v_blocked || (select payload from missing_required),
    v_warning || (select payload from missing_recommended)
  into v_blocked, v_warning;

  if jsonb_array_length(v_blocked) > 0 then
    v_status := 'BLOCKED';
  elsif jsonb_array_length(v_warning) > 0 then
    v_status := 'WARNING';
  end if;

  return jsonb_build_object(
    'status', v_status,
    'tenant_id', p_tenant_id,
    'blocked', v_blocked,
    'warnings', v_warning
  );
end;
$$;

create or replace function public.content_health_check_network(p_network_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with network_tenant as (
    select t.id
    from public.tenants t
    where t.tenant_type = 'NETWORK'
      and t.network_id = p_network_id
      and t.status = 'active'
    limit 1
  ),
  school_tenants as (
    select t.id, t.school_id
    from public.tenants t
    join public.network_school_memberships nsm on nsm.school_id = t.school_id
    where t.tenant_type = 'SCHOOL'
      and t.status = 'active'
      and nsm.network_id = p_network_id
      and nsm.status = 'active'
      and (nsm.ended_at is null or nsm.ended_at > now())
  ),
  checks as (
    select 'NETWORK'::text as scope, null::uuid as school_id, public.content_health_check_tenant(id) as payload
    from network_tenant
    union all
    select 'SCHOOL'::text as scope, school_id, public.content_health_check_tenant(id) as payload
    from school_tenants
  )
  select jsonb_build_object(
    'network_id', p_network_id,
    'status',
      case
        when exists (select 1 from checks where payload ->> 'status' = 'BLOCKED') then 'BLOCKED'
        when exists (select 1 from checks where payload ->> 'status' = 'WARNING') then 'WARNING'
        else 'READY'
      end,
    'checks', coalesce(jsonb_agg(jsonb_build_object('scope', scope, 'school_id', school_id, 'result', payload)), '[]'::jsonb)
  )
  from checks;
$$;

create trigger content_segments_touch_updated_at
  before update on public.content_segments
  for each row execute function public.content_touch_updated_at();

create trigger content_grades_touch_updated_at
  before update on public.content_grades
  for each row execute function public.content_touch_updated_at();

create trigger content_subjects_touch_updated_at
  before update on public.content_subjects
  for each row execute function public.content_touch_updated_at();

create trigger tenants_touch_updated_at
  before update on public.tenants
  for each row execute function public.content_touch_updated_at();

create trigger content_items_touch_updated_at
  before update on public.content_items
  for each row execute function public.content_touch_updated_at();

create trigger content_collections_touch_updated_at
  before update on public.content_collections
  for each row execute function public.content_touch_updated_at();

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.content_touch_updated_at();

create trigger product_content_requirements_touch_updated_at
  before update on public.product_content_requirements
  for each row execute function public.content_touch_updated_at();

create trigger contracts_touch_updated_at
  before update on public.contracts
  for each row execute function public.content_touch_updated_at();

create trigger tenant_product_entitlements_touch_updated_at
  before update on public.tenant_product_entitlements
  for each row execute function public.content_touch_updated_at();

create trigger content_access_exceptions_touch_updated_at
  before update on public.content_access_exceptions
  for each row execute function public.content_touch_updated_at();

create trigger content_feature_flags_touch_updated_at
  before update on public.content_feature_flags
  for each row execute function public.content_touch_updated_at();

create trigger tenant_product_entitlements_validate_scope
  before insert or update on public.tenant_product_entitlements
  for each row execute function public.content_validate_entitlement();

create trigger content_question_items_validate_type
  before insert or update on public.content_question_items
  for each row execute function public.content_validate_question_adapter();

create index if not exists content_grades_segment_idx on public.content_grades(segment_id, status, sort_order);
create index if not exists content_subjects_status_idx on public.content_subjects(status, code);
create index if not exists content_items_published_taxonomy_idx on public.content_items(content_type, editorial_status, segment_id, grade_id, subject_id) where editorial_status = 'PUBLISHED';
create index if not exists content_items_owner_idx on public.content_items(owner_scope, owner_tenant_id, owner_user_id);
create index if not exists content_question_items_question_idx on public.content_question_items(question_item_id);
create index if not exists content_collection_items_content_idx on public.content_collection_items(content_item_id);
create index if not exists product_collections_collection_idx on public.product_collections(collection_id);
create index if not exists product_requirements_lookup_idx on public.product_content_requirements(product_id, content_type, requirement_level);
create index if not exists contracts_tenant_status_idx on public.contracts(tenant_id, status, starts_at, ends_at);
create index if not exists entitlements_tenant_product_status_idx on public.tenant_product_entitlements(tenant_id, product_id, status, starts_at, ends_at);
create index if not exists entitlements_contract_idx on public.tenant_product_entitlements(contract_id);
create index if not exists content_exceptions_school_content_idx on public.content_access_exceptions(school_id, content_item_id, action);
create index if not exists content_exceptions_tenant_content_idx on public.content_access_exceptions(tenant_id, content_item_id, action);
create index if not exists content_feature_flags_lookup_idx on public.content_feature_flags(flag_key, tenant_id, enabled);

alter table public.content_segments enable row level security;
alter table public.content_grades enable row level security;
alter table public.content_subjects enable row level security;
alter table public.content_grade_aliases enable row level security;
alter table public.content_subject_aliases enable row level security;
alter table public.tenants enable row level security;
alter table public.content_items enable row level security;
alter table public.content_question_items enable row level security;
alter table public.content_collections enable row level security;
alter table public.content_collection_items enable row level security;
alter table public.products enable row level security;
alter table public.product_collections enable row level security;
alter table public.product_content_requirements enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_products enable row level security;
alter table public.tenant_product_entitlements enable row level security;
alter table public.content_access_exceptions enable row level security;
alter table public.content_feature_flags enable row level security;
alter table public.content_editorial_events enable row level security;
alter table public.contract_entitlement_events enable row level security;

create policy content_segments_admin_all on public.content_segments for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_grades_admin_all on public.content_grades for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_subjects_admin_all on public.content_subjects for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_grade_aliases_admin_all on public.content_grade_aliases for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_subject_aliases_admin_all on public.content_subject_aliases for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy tenants_admin_all on public.tenants for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_items_admin_all on public.content_items for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_question_items_admin_all on public.content_question_items for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_collections_admin_all on public.content_collections for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_collection_items_admin_all on public.content_collection_items for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy products_admin_all on public.products for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy product_collections_admin_all on public.product_collections for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy product_content_requirements_admin_all on public.product_content_requirements for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy contracts_admin_all on public.contracts for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy contract_products_admin_all on public.contract_products for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy tenant_product_entitlements_admin_all on public.tenant_product_entitlements for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_access_exceptions_admin_all on public.content_access_exceptions for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_feature_flags_admin_all on public.content_feature_flags for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy content_editorial_events_admin_select on public.content_editorial_events for select to authenticated using (public.is_platform_admin());
create policy contract_entitlement_events_admin_select on public.contract_entitlement_events for select to authenticated using (public.is_platform_admin());

revoke all on public.content_segments from public;
revoke all on public.content_grades from public;
revoke all on public.content_subjects from public;
revoke all on public.content_grade_aliases from public;
revoke all on public.content_subject_aliases from public;
revoke all on public.tenants from public;
revoke all on public.content_items from public;
revoke all on public.content_question_items from public;
revoke all on public.content_collections from public;
revoke all on public.content_collection_items from public;
revoke all on public.products from public;
revoke all on public.product_collections from public;
revoke all on public.product_content_requirements from public;
revoke all on public.contracts from public;
revoke all on public.contract_products from public;
revoke all on public.tenant_product_entitlements from public;
revoke all on public.content_access_exceptions from public;
revoke all on public.content_feature_flags from public;
revoke all on public.content_editorial_events from public;
revoke all on public.contract_entitlement_events from public;

grant select on public.content_segments, public.content_grades, public.content_subjects to authenticated;
grant select on public.content_grade_aliases, public.content_subject_aliases to authenticated;
grant select on public.tenants to authenticated;
grant select on public.content_items, public.content_question_items to authenticated;
grant select on public.content_collections, public.content_collection_items to authenticated;
grant select on public.products, public.product_collections, public.product_content_requirements to authenticated;
grant select on public.contracts, public.contract_products, public.tenant_product_entitlements to authenticated;
grant select on public.content_access_exceptions, public.content_feature_flags to authenticated;
grant select on public.content_editorial_events, public.contract_entitlement_events to authenticated;

grant all on public.content_segments, public.content_grades, public.content_subjects to service_role;
grant all on public.content_grade_aliases, public.content_subject_aliases to service_role;
grant all on public.tenants to service_role;
grant all on public.content_items, public.content_question_items to service_role;
grant all on public.content_collections, public.content_collection_items to service_role;
grant all on public.products, public.product_collections, public.product_content_requirements to service_role;
grant all on public.contracts, public.contract_products, public.tenant_product_entitlements to service_role;
grant all on public.content_access_exceptions, public.content_feature_flags to service_role;
grant all on public.content_editorial_events, public.contract_entitlement_events to service_role;

revoke all on function public.admin_create_or_update_tenant_product_entitlement(uuid, uuid, uuid, uuid, date, date, public.rs_entitlement_status, uuid[], uuid[], uuid[], jsonb) from public;
grant execute on function public.admin_create_or_update_tenant_product_entitlement(uuid, uuid, uuid, uuid, date, date, public.rs_entitlement_status, uuid[], uuid[], uuid[], jsonb) to authenticated, service_role;

revoke all on function public.admin_set_content_editorial_status(uuid, public.rs_content_editorial_status, jsonb) from public;
grant execute on function public.admin_set_content_editorial_status(uuid, public.rs_content_editorial_status, jsonb) to authenticated, service_role;

revoke all on function public.content_resolve_for_user(jsonb) from public;
grant execute on function public.content_resolve_for_user(jsonb) to authenticated, service_role;

revoke all on function public.content_health_check_tenant(uuid) from public;
grant execute on function public.content_health_check_tenant(uuid) to authenticated, service_role;

revoke all on function public.content_health_check_network(uuid) from public;
grant execute on function public.content_health_check_network(uuid) to authenticated, service_role;

comment on function public.content_resolve_for_user(jsonb) is
  'Resolver canonico de conteudo autorizado. Fase 1 atende questoes e valida contexto server-side.';

comment on function public.content_health_check_tenant(uuid) is
  'Pre-flight de cobertura de conteudo por tenant, baseado em requisitos de produto.';

commit;
