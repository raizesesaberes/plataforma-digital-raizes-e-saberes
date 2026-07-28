-- Universidade Raizes e Saberes
-- Fase 05 - Esteira automatizada de curadoria e primeiro lote real
-- Esta migration cria a base operacional para coleta controlada, revisao humana,
-- auditoria e publicacao posterior de cursos gratuitos externos.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'curation_pipeline_status') then
    create type public.curation_pipeline_status as enum (
      'DESCOBERTO',
      'COLETADO',
      'NORMALIZADO',
      'CLASSIFICADO',
      'VERIFICADO',
      'AGUARDANDO_REVISAO',
      'APROVADO',
      'PUBLICADO',
      'REJEITADO',
      'REVISAO_NECESSARIA',
      'LINK_COM_PROBLEMA',
      'ARQUIVADO'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'confidence_level') then
    create type public.confidence_level as enum (
      'ALTA',
      'MEDIA',
      'BAIXA',
      'NAO_CONFIRMADA'
    );
  end if;
end $$;

create or replace function public.is_university_curator()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'app_role', auth.jwt() ->> 'role', '') in ('admin', 'curator', 'service_role');
$$;

create table if not exists public.course_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  acronym text,
  description text,
  provider_type text,
  country text default 'Brasil',
  state text,
  city text,
  official_site_url text,
  logo_url text,
  image_url text,
  contact text,
  status public.curation_pipeline_status not null default 'AGUARDANDO_REVISAO',
  notes text,
  last_verified_at timestamptz,
  responsible_user_id uuid,
  categories text[] default '{}',
  tags text[] default '{}',
  source_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  parent_id uuid references public.course_categories(id),
  status public.curation_pipeline_status not null default 'AGUARDANDO_REVISAO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  status public.curation_pipeline_status not null default 'AGUARDANDO_REVISAO',
  merged_into_id uuid references public.course_tags(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curated_courses (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references public.course_providers(id),
  category_id uuid references public.course_categories(id),
  title text not null,
  slug text not null unique,
  short_description text,
  full_description text,
  image_url text,
  workload_hours numeric(6,2),
  workload_text text,
  theme text,
  level text,
  language text default 'pt-BR',
  modality text,
  certificate_available boolean,
  certificate_text text,
  official_url text not null,
  deadline_text text,
  status public.curation_pipeline_status not null default 'AGUARDANDO_REVISAO',
  pipeline_status public.curation_pipeline_status not null default 'AGUARDANDO_REVISAO',
  target_audience text,
  prerequisites text,
  knowledge_center text,
  related_tracks text[] default '{}',
  curator_notes text,
  source_url text,
  source_excerpt text,
  source_checked_at timestamptz,
  last_reviewed_at timestamptz,
  url_confidence public.confidence_level not null default 'NAO_CONFIRMADA',
  workload_confidence public.confidence_level not null default 'NAO_CONFIRMADA',
  certificate_confidence public.confidence_level not null default 'NAO_CONFIRMADA',
  classification_confidence public.confidence_level not null default 'NAO_CONFIRMADA',
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (official_url ~* '^https://')
);

create table if not exists public.course_tag_relations (
  course_id uuid not null references public.curated_courses(id) on delete cascade,
  tag_id uuid not null references public.course_tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (course_id, tag_id)
);

create table if not exists public.course_verifications (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.curated_courses(id) on delete cascade,
  checked_at timestamptz not null default now(),
  link_status text not null default 'PENDENTE',
  http_status integer,
  responsible_user_id uuid,
  next_review_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.curation_batches (
  id uuid primary key default gen_random_uuid(),
  batch_code text not null unique,
  title text not null,
  description text,
  area text not null,
  status public.curation_pipeline_status not null default 'AGUARDANDO_REVISAO',
  source_policy text not null,
  started_at timestamptz,
  finished_at timestamptz,
  verification_date date,
  found_count integer not null default 0,
  imported_count integer not null default 0,
  discarded_count integer not null default 0,
  duplicate_count integer not null default 0,
  created_by uuid,
  approved_by uuid,
  published_by uuid,
  rollback_notes text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curation_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.curation_batches(id) on delete cascade,
  course_id uuid references public.curated_courses(id) on delete set null,
  source_url text not null,
  normalized_title text not null,
  provider_name text,
  status public.curation_pipeline_status not null default 'AGUARDANDO_REVISAO',
  action_required text,
  discard_reason text,
  confidence jsonb not null default '{}',
  raw_metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.curation_sources (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.curation_batches(id) on delete cascade,
  provider_id uuid references public.course_providers(id) on delete set null,
  source_url text not null,
  source_type text not null default 'official_course_page',
  robots_policy text not null default 'manual_public_access_only',
  accessed_at timestamptz not null default now(),
  status public.curation_pipeline_status not null default 'VERIFICADO',
  notes text
);

create table if not exists public.curation_logs (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.curation_batches(id) on delete cascade,
  entity_table text,
  entity_id uuid,
  actor_user_id uuid,
  action text not null,
  previous_status public.curation_pipeline_status,
  new_status public.curation_pipeline_status,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.curation_issues (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.curation_batches(id) on delete cascade,
  course_id uuid references public.curated_courses(id) on delete cascade,
  issue_type text not null,
  severity text not null default 'MEDIA',
  description text not null,
  status public.curation_pipeline_status not null default 'REVISAO_NECESSARIA',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.course_change_history (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.curated_courses(id) on delete cascade,
  actor_user_id uuid,
  change_type text not null,
  changed_fields jsonb not null default '{}',
  previous_snapshot jsonb,
  new_snapshot jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_course_providers_name on public.course_providers using btree (name);
create index if not exists idx_curated_courses_status on public.curated_courses using btree (status);
create index if not exists idx_curated_courses_pipeline_status on public.curated_courses using btree (pipeline_status);
create index if not exists idx_curated_courses_provider on public.curated_courses using btree (provider_id);
create index if not exists idx_curated_courses_official_url on public.curated_courses (lower(official_url));
create index if not exists idx_curation_batches_code on public.curation_batches using btree (batch_code);
create index if not exists idx_batch_items_batch on public.curation_batch_items using btree (batch_id);
create unique index if not exists idx_batch_items_unique_source on public.curation_batch_items (batch_id, source_url, normalized_title);
create index if not exists idx_sources_url on public.curation_sources (lower(source_url));
create index if not exists idx_verifications_course on public.course_verifications using btree (course_id);
create unique index if not exists idx_curation_issues_unique on public.curation_issues (batch_id, issue_type, description);
create unique index if not exists idx_curation_logs_unique_action on public.curation_logs (batch_id, action);

alter table public.course_providers enable row level security;
alter table public.course_categories enable row level security;
alter table public.course_tags enable row level security;
alter table public.curated_courses enable row level security;
alter table public.course_tag_relations enable row level security;
alter table public.course_verifications enable row level security;
alter table public.curation_batches enable row level security;
alter table public.curation_batch_items enable row level security;
alter table public.curation_sources enable row level security;
alter table public.curation_logs enable row level security;
alter table public.curation_issues enable row level security;
alter table public.course_change_history enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'curated_courses' and policyname = 'Public can read published curated courses') then
    create policy "Public can read published curated courses"
      on public.curated_courses for select
      using (status = 'PUBLICADO' and pipeline_status = 'PUBLICADO');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_providers' and policyname = 'Public can read active providers') then
    create policy "Public can read active providers"
      on public.course_providers for select
      using (status = 'PUBLICADO');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_categories' and policyname = 'Public can read published categories') then
    create policy "Public can read published categories"
      on public.course_categories for select
      using (status = 'PUBLICADO');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'course_tags' and policyname = 'Public can read published tags') then
    create policy "Public can read published tags"
      on public.course_tags for select
      using (status = 'PUBLICADO');
  end if;
end $$;

do $$
declare
  policy_table text;
begin
  foreach policy_table in array array[
    'course_providers',
    'course_categories',
    'course_tags',
    'curated_courses',
    'course_tag_relations',
    'course_verifications',
    'curation_batches',
    'curation_batch_items',
    'curation_sources',
    'curation_logs',
    'curation_issues',
    'course_change_history'
  ]
  loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = policy_table
        and policyname = 'Curators can manage ' || policy_table
    ) then
      execute format(
        'create policy %I on public.%I for all using (public.is_university_curator()) with check (public.is_university_curator())',
        'Curators can manage ' || policy_table,
        policy_table
      );
    end if;
  end loop;
end $$;
