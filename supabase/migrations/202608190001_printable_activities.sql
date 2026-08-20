-- Banco de Atividades Imprimiveis
-- Estrutura preparada para Educacao Infantil sem inserir atividades ficticias.

create extension if not exists pgcrypto;

create or replace function public.current_printable_activities_role()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'printable_activities_role',
      auth.jwt() -> 'app_metadata' ->> 'question_bank_role',
      auth.jwt() -> 'app_metadata' ->> 'app_role',
      auth.jwt() -> 'app_metadata' ->> 'role',
      auth.jwt() ->> 'printable_activities_role',
      auth.jwt() ->> 'app_role',
      case when auth.role() = 'service_role' then 'service_role' else '' end
    )
  );
$$;

create or replace function public.has_printable_activities_role(required_roles text[])
returns boolean
language sql
stable
as $$
  select public.current_printable_activities_role() = any(required_roles)
    or public.current_printable_activities_role() = 'service_role'
    or (
      public.current_printable_activities_role() in ('admin','administrador','administrador_nacional')
      and ('admin' = any(required_roles) or 'administrador' = any(required_roles) or 'administrador_nacional' = any(required_roles))
    )
    or (
      public.current_printable_activities_role() in ('gestor','gestor_escolar')
      and ('gestor' = any(required_roles) or 'gestor_escolar' = any(required_roles))
    )
    or (
      public.current_printable_activities_role() in ('coordenador','coordenador_pedagogico')
      and ('coordenador' = any(required_roles) or 'coordenador_pedagogico' = any(required_roles))
    );
$$;

create table if not exists public.printable_activities (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  slug text not null unique,
  titulo text not null,
  segmento text not null default 'Educacao Infantil',
  etapa text not null default 'Educacao Infantil',
  faixa_etaria text not null check (faixa_etaria in ('ei2','ei3','ei4','ei5')),
  idade text not null,
  descricao text,
  objetivo text,
  comando_crianca text,
  orientacao_professor text,
  campos_experiencia text[] not null default '{}',
  direitos_aprendizagem text[] not null default '{}',
  tipos_atividade text[] not null default '{}',
  materiais text[] not null default '{}',
  palavras_chave text[] not null default '{}',
  arquivo_original text not null,
  arquivo_png text,
  arquivo_pdf text,
  miniatura text,
  formato text not null check (formato in ('png','pdf','jpg','jpeg','webp')),
  orientacao_pagina text check (orientacao_pagina is null or orientacao_pagina in ('retrato','paisagem')),
  largura integer,
  altura integer,
  versao text not null default '1.0',
  status text not null default 'RASCUNHO' check (status in ('RASCUNHO','PENDENTE_DE_METADADOS','PENDENTE_DE_ARQUIVO','EM_REVISAO','PUBLICADO','DESPUBLICADO','ARQUIVADO')),
  data_publicacao timestamptz,
  data_atualizacao timestamptz,
  checksum text,
  visualizacoes integer not null default 0,
  downloads integer not null default 0,
  impressoes integer not null default 0,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'PUBLICADO' or (codigo <> '' and titulo <> '' and arquivo_original <> ''))
);

create table if not exists public.printable_activity_versions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.printable_activities(id) on delete cascade,
  codigo text not null,
  versao text not null,
  arquivo_original text not null,
  checksum text,
  change_summary text,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (activity_id, versao)
);

create table if not exists public.printable_activity_user_state (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.printable_activities(id) on delete cascade,
  user_id uuid not null,
  is_favorite boolean not null default false,
  last_viewed_at timestamptz,
  collection_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

create table if not exists public.printable_activity_usage_logs (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.printable_activities(id) on delete set null,
  codigo text not null,
  user_id uuid,
  user_role text,
  usage_type text not null check (usage_type in ('visualizacao','download','impressao','favorito','pesquisa_sem_resultado','filtro')),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.printable_activities enable row level security;
alter table public.printable_activity_versions enable row level security;
alter table public.printable_activity_user_state enable row level security;
alter table public.printable_activity_usage_logs enable row level security;

drop policy if exists printable_activities_professor_read_published on public.printable_activities;
create policy printable_activities_professor_read_published
on public.printable_activities
for select
using (
  status = 'PUBLICADO'
  and public.has_printable_activities_role(array['professor','coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional'])
);

drop policy if exists printable_activities_admin_manage on public.printable_activities;
create policy printable_activities_admin_manage
on public.printable_activities
for all
using (public.has_printable_activities_role(array['coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional']))
with check (public.has_printable_activities_role(array['coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional']));

drop policy if exists printable_versions_admin_read on public.printable_activity_versions;
create policy printable_versions_admin_read
on public.printable_activity_versions
for select
using (public.has_printable_activities_role(array['coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional']));

drop policy if exists printable_versions_admin_write on public.printable_activity_versions;
create policy printable_versions_admin_write
on public.printable_activity_versions
for insert
with check (public.has_printable_activities_role(array['coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional']));

drop policy if exists printable_user_state_owner on public.printable_activity_user_state;
create policy printable_user_state_owner
on public.printable_activity_user_state
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists printable_usage_authorized_insert on public.printable_activity_usage_logs;
create policy printable_usage_authorized_insert
on public.printable_activity_usage_logs
for insert
with check (
  public.has_printable_activities_role(array['professor','coordenador','coordenador_pedagogico','gestor','gestor_escolar','admin','administrador','administrador_nacional'])
);
