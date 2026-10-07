-- CONTEUDOS CONTRATADOS 02 — MACRO V1
-- Modelo macro de modulos contratados, sem copiar conteudo e sem autorizacao item a item.

begin;

create table if not exists public.content_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  content_types public.rs_content_type[] not null default '{}'::public.rs_content_type[],
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_modules_code_normalized check (code = public.rs_content_normalize_code(code)),
  constraint content_modules_status_check check (status in ('active', 'inactive', 'archived')),
  constraint content_modules_types_check check (cardinality(content_types) > 0)
);

create table if not exists public.product_content_modules (
  product_id uuid not null references public.products(id) on delete cascade,
  content_module_id uuid not null references public.content_modules(id) on delete restrict,
  requirement_level public.rs_requirement_level not null default 'REQUIRED',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (product_id, content_module_id)
);

create table if not exists public.platform_modules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_modules_code_normalized check (code = public.rs_content_normalize_code(code)),
  constraint platform_modules_status_check check (status in ('active', 'inactive', 'archived'))
);

create table if not exists public.product_platform_modules (
  product_id uuid not null references public.products(id) on delete cascade,
  platform_module_id uuid not null references public.platform_modules(id) on delete restrict,
  requirement_level public.rs_requirement_level not null default 'REQUIRED',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (product_id, platform_module_id)
);

create table if not exists public.tenant_product_content_modules (
  entitlement_id uuid not null references public.tenant_product_entitlements(id) on delete cascade,
  content_module_id uuid not null references public.content_modules(id) on delete restrict,
  enabled boolean not null default true,
  source text not null default 'contract',
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (entitlement_id, content_module_id),
  constraint tenant_product_content_modules_source_check check (source in ('contract', 'manual', 'inherited', 'pilot', 'embargo'))
);

create table if not exists public.tenant_product_platform_modules (
  entitlement_id uuid not null references public.tenant_product_entitlements(id) on delete cascade,
  platform_module_id uuid not null references public.platform_modules(id) on delete restrict,
  enabled boolean not null default true,
  source text not null default 'contract',
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (entitlement_id, platform_module_id),
  constraint tenant_product_platform_modules_source_check check (source in ('contract', 'manual', 'inherited', 'pilot', 'embargo'))
);

drop trigger if exists content_modules_touch_updated_at on public.content_modules;
create trigger content_modules_touch_updated_at
  before update on public.content_modules
  for each row execute function public.content_touch_updated_at();

drop trigger if exists platform_modules_touch_updated_at on public.platform_modules;
create trigger platform_modules_touch_updated_at
  before update on public.platform_modules
  for each row execute function public.content_touch_updated_at();

drop trigger if exists tenant_product_content_modules_touch_updated_at on public.tenant_product_content_modules;
create trigger tenant_product_content_modules_touch_updated_at
  before update on public.tenant_product_content_modules
  for each row execute function public.content_touch_updated_at();

drop trigger if exists tenant_product_platform_modules_touch_updated_at on public.tenant_product_platform_modules;
create trigger tenant_product_platform_modules_touch_updated_at
  before update on public.tenant_product_platform_modules
  for each row execute function public.content_touch_updated_at();

create index if not exists product_content_modules_module_idx on public.product_content_modules(content_module_id, requirement_level);
create index if not exists product_platform_modules_module_idx on public.product_platform_modules(platform_module_id, requirement_level);
create index if not exists tenant_product_content_modules_module_idx on public.tenant_product_content_modules(content_module_id, enabled);
create index if not exists tenant_product_platform_modules_module_idx on public.tenant_product_platform_modules(platform_module_id, enabled);

alter table public.content_modules enable row level security;
alter table public.product_content_modules enable row level security;
alter table public.platform_modules enable row level security;
alter table public.product_platform_modules enable row level security;
alter table public.tenant_product_content_modules enable row level security;
alter table public.tenant_product_platform_modules enable row level security;

drop policy if exists content_modules_admin_all on public.content_modules;
create policy content_modules_admin_all on public.content_modules for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists product_content_modules_admin_all on public.product_content_modules;
create policy product_content_modules_admin_all on public.product_content_modules for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists platform_modules_admin_all on public.platform_modules;
create policy platform_modules_admin_all on public.platform_modules for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists product_platform_modules_admin_all on public.product_platform_modules;
create policy product_platform_modules_admin_all on public.product_platform_modules for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists tenant_product_content_modules_admin_all on public.tenant_product_content_modules;
create policy tenant_product_content_modules_admin_all on public.tenant_product_content_modules for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

drop policy if exists tenant_product_platform_modules_admin_all on public.tenant_product_platform_modules;
create policy tenant_product_platform_modules_admin_all on public.tenant_product_platform_modules for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

revoke all on public.content_modules from public;
revoke all on public.product_content_modules from public;
revoke all on public.platform_modules from public;
revoke all on public.product_platform_modules from public;
revoke all on public.tenant_product_content_modules from public;
revoke all on public.tenant_product_platform_modules from public;

grant select on public.content_modules, public.product_content_modules to authenticated;
grant select on public.platform_modules, public.product_platform_modules to authenticated;
grant select on public.tenant_product_content_modules, public.tenant_product_platform_modules to authenticated;
grant all on public.content_modules, public.product_content_modules to service_role;
grant all on public.platform_modules, public.product_platform_modules to service_role;
grant all on public.tenant_product_content_modules, public.tenant_product_platform_modules to service_role;

insert into public.content_segments (code, name, status, metadata)
values
  ('EDUCACAO_INFANTIL', 'Educação Infantil', 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('FUNDAMENTAL', 'Ensino Fundamental — Anos Iniciais', 'active', '{"canonical_macro_v1": true, "alias_of": "FUNDAMENTAL_ANOS_INICIAIS"}'::jsonb)
on conflict (code) do update
set name = excluded.name,
    status = 'active',
    metadata = public.content_segments.metadata || excluded.metadata,
    updated_at = now();

with segments as (
  select code, id from public.content_segments where code in ('EDUCACAO_INFANTIL', 'FUNDAMENTAL')
),
grades(code, name, segment_code, sort_order) as (
  values
    ('EI2', 'Infantil 2', 'EDUCACAO_INFANTIL', 10),
    ('EI3', 'Infantil 3', 'EDUCACAO_INFANTIL', 20),
    ('EI4', 'Infantil 4', 'EDUCACAO_INFANTIL', 30),
    ('EI5', 'Infantil 5', 'EDUCACAO_INFANTIL', 40),
    ('1_ANO', '1º Ano', 'FUNDAMENTAL', 110),
    ('2_ANO', '2º Ano', 'FUNDAMENTAL', 120),
    ('3_ANO', '3º Ano', 'FUNDAMENTAL', 130),
    ('4_ANO', '4º Ano', 'FUNDAMENTAL', 140),
    ('5_ANO', '5º Ano', 'FUNDAMENTAL', 150)
)
insert into public.content_grades (segment_id, code, name, sort_order, status, metadata)
select s.id, g.code, g.name, g.sort_order, 'active', '{"canonical_macro_v1": true}'::jsonb
from grades g
join segments s on s.code = g.segment_code
on conflict (segment_id, code) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    status = 'active',
    metadata = public.content_grades.metadata || excluded.metadata,
    updated_at = now();

with grade_rows as (
  select cg.id, cg.code
  from public.content_grades cg
  join public.content_segments cs on cs.id = cg.segment_id
  where cs.code in ('EDUCACAO_INFANTIL', 'FUNDAMENTAL')
),
aliases(grade_code, alias_code) as (
  values
    ('EI2', 'INFANTIL_2'), ('EI2', '2_ANOS'),
    ('EI3', 'INFANTIL_3'), ('EI3', '3_ANOS'),
    ('EI4', 'INFANTIL_4'), ('EI4', '4_ANOS'),
    ('EI5', 'INFANTIL_5'), ('EI5', '5_ANOS'),
    ('1_ANO', '1O_ANO'), ('1_ANO', '1º_ANO'),
    ('2_ANO', '2O_ANO'), ('2_ANO', '2º_ANO'),
    ('3_ANO', '3O_ANO'), ('3_ANO', '3º_ANO'),
    ('4_ANO', '4O_ANO'), ('4_ANO', '4º_ANO'),
    ('5_ANO', '5O_ANO'), ('5_ANO', '5º_ANO')
)
insert into public.content_grade_aliases (grade_id, alias_code, source)
select gr.id, public.rs_content_normalize_code(a.alias_code), 'macro_v1'
from aliases a
join grade_rows gr on gr.code = a.grade_code
on conflict (alias_code) do nothing;

insert into public.content_modules (code, name, description, content_types, status, metadata)
values
  ('BANCO_QUESTOES', 'Banco de Questões', 'Questões editoriais e itens avaliativos canônicos.', array['QUESTION']::public.rs_content_type[], 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('AVALIACOES_PROVAS', 'Avaliações/Provas', 'Modelos de avaliação, provas e aplicações derivadas do acervo.', array['ASSESSMENT_TEMPLATE']::public.rs_content_type[], 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('BIBLIOTECA_LIVROS', 'Biblioteca/Livros', 'Livros digitais, páginas e obras da Biblioteca Viva.', array['BOOK','BOOK_PAGE']::public.rs_content_type[], 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('ATIVIDADES', 'Atividades', 'Atividades digitais, imprimíveis e propostas de apoio.', array['ACTIVITY','PRINTABLE']::public.rs_content_type[], 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('VIDEOS', 'Vídeos', 'Vídeos e mídias pedagógicas.', array['VIDEO']::public.rs_content_type[], 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('JOGOS_INTERACOES', 'Jogos e Interações', 'Jogos, experiências e objetos interativos.', array['GAME','INTERACTION']::public.rs_content_type[], 'active', '{"canonical_macro_v1": true}'::jsonb)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    content_types = excluded.content_types,
    status = 'active',
    metadata = public.content_modules.metadata || excluded.metadata,
    updated_at = now();

insert into public.platform_modules (code, name, description, status, metadata)
values
  ('GESTAO_ESCOLAR', 'Gestão escolar', 'Rotinas de secretaria, escola e administração operacional.', 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('PROFESSOR', 'Professor', 'Ambiente do professor e fluxo pedagógico.', 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('ALUNO', 'Aluno', 'Ambiente do aluno.', 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('FAMILIA', 'Família', 'Acompanhamento familiar e educação infantil.', 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('RELATORIOS', 'Relatórios', 'Dashboards, resultados e acompanhamento.', 'active', '{"canonical_macro_v1": true}'::jsonb),
  ('SUPORTE', 'Suporte', 'Atendimento, chamados e SLA.', 'active', '{"canonical_macro_v1": true}'::jsonb)
on conflict (code) do update
set name = excluded.name,
    description = excluded.description,
    status = 'active',
    metadata = public.platform_modules.metadata || excluded.metadata,
    updated_at = now();

insert into public.product_content_modules (product_id, content_module_id, requirement_level, metadata)
select p.id, cm.id, 'REQUIRED'::public.rs_requirement_level, '{"seed": "macro_v1_homologation"}'::jsonb
from public.products p
join public.content_modules cm on cm.code = 'BANCO_QUESTOES'
where p.code = 'RS_HOMOLOGACAO_FUNDAMENTAL'
on conflict (product_id, content_module_id) do update
set requirement_level = excluded.requirement_level,
    metadata = public.product_content_modules.metadata || excluded.metadata;

insert into public.product_platform_modules (product_id, platform_module_id, requirement_level, metadata)
select p.id, pm.id,
       case when pm.code in ('PROFESSOR', 'ALUNO') then 'REQUIRED'::public.rs_requirement_level else 'RECOMMENDED'::public.rs_requirement_level end,
       '{"seed": "macro_v1_homologation"}'::jsonb
from public.products p
join public.platform_modules pm on pm.code in ('GESTAO_ESCOLAR', 'PROFESSOR', 'ALUNO', 'RELATORIOS')
where p.code = 'RS_HOMOLOGACAO_FUNDAMENTAL'
on conflict (product_id, platform_module_id) do update
set requirement_level = excluded.requirement_level,
    metadata = public.product_platform_modules.metadata || excluded.metadata;

insert into public.tenant_product_content_modules (entitlement_id, content_module_id, enabled, source, metadata)
select tpe.id, cm.id, true, 'contract', '{"seed": "macro_v1_homologation", "human_test_initial_state": "ON"}'::jsonb
from public.tenant_product_entitlements tpe
join public.products p on p.id = tpe.product_id
join public.content_modules cm on cm.code = 'BANCO_QUESTOES'
join public.tenants t on t.id = tpe.tenant_id
join public.schools s on s.id = t.school_id
where p.code = 'RS_HOMOLOGACAO_FUNDAMENTAL'
  and t.tenant_type = 'SCHOOL'
  and tpe.status = 'ACTIVE'
  and lower(coalesce(s.nome, '')) like '%caminhos%'
on conflict (entitlement_id, content_module_id) do update
set enabled = true,
    source = 'contract',
    metadata = public.tenant_product_content_modules.metadata || excluded.metadata,
    updated_at = now();

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
    join public.product_content_modules pcm on pcm.product_id = tpe.product_id
    join public.content_modules cm on cm.id = pcm.content_module_id
    left join public.tenant_product_content_modules tpcm
      on tpcm.entitlement_id = tpe.id
     and tpcm.content_module_id = cm.id
    where tpe.status = 'ACTIVE'
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
      and cm.status = 'active'
      and v_content_type = any(cm.content_types)
      and coalesce(tpcm.enabled, true) = true
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
  v_products jsonb := '[]'::jsonb;
  v_content_modules jsonb := '[]'::jsonb;
  v_platform_modules jsonb := '[]'::jsonb;
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

  with active_entitlements as (
    select tpe.id as entitlement_id, tpe.product_id
    from public.tenant_product_entitlements tpe
    where tpe.tenant_id = p_tenant_id
      and tpe.status = 'ACTIVE'
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
  ),
  requirements as (
    select
      ae.product_id,
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
    from active_entitlements ae
    join public.product_content_requirements pcr on pcr.product_id = ae.product_id
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

  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'product_id', p.id,
    'code', p.code,
    'name', p.name,
    'status', p.status
  )), '[]'::jsonb)
  into v_products
  from public.tenant_product_entitlements tpe
  join public.products p on p.id = tpe.product_id
  where tpe.tenant_id = p_tenant_id
    and tpe.status = 'ACTIVE'
    and tpe.starts_at <= current_date
    and (tpe.ends_at is null or tpe.ends_at >= current_date);

  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'code', cm.code,
    'name', cm.name,
    'requirement_level', pcm.requirement_level,
    'enabled', coalesce(tpcm.enabled, true),
    'content_types', to_jsonb(cm.content_types)
  )), '[]'::jsonb)
  into v_content_modules
  from public.tenant_product_entitlements tpe
  join public.product_content_modules pcm on pcm.product_id = tpe.product_id
  join public.content_modules cm on cm.id = pcm.content_module_id
  left join public.tenant_product_content_modules tpcm
    on tpcm.entitlement_id = tpe.id
   and tpcm.content_module_id = cm.id
  where tpe.tenant_id = p_tenant_id
    and tpe.status = 'ACTIVE'
    and tpe.starts_at <= current_date
    and (tpe.ends_at is null or tpe.ends_at >= current_date);

  select coalesce(jsonb_agg(distinct jsonb_build_object(
    'code', pm.code,
    'name', pm.name,
    'requirement_level', ppm.requirement_level,
    'enabled', coalesce(tppm.enabled, true)
  )), '[]'::jsonb)
  into v_platform_modules
  from public.tenant_product_entitlements tpe
  join public.product_platform_modules ppm on ppm.product_id = tpe.product_id
  join public.platform_modules pm on pm.id = ppm.platform_module_id
  left join public.tenant_product_platform_modules tppm
    on tppm.entitlement_id = tpe.id
   and tppm.platform_module_id = pm.id
  where tpe.tenant_id = p_tenant_id
    and tpe.status = 'ACTIVE'
    and tpe.starts_at <= current_date
    and (tpe.ends_at is null or tpe.ends_at >= current_date);

  if jsonb_array_length(v_blocked) > 0 then
    v_status := 'BLOCKED';
  elsif jsonb_array_length(v_warning) > 0 then
    v_status := 'WARNING';
  end if;

  return jsonb_build_object(
    'status', v_status,
    'tenant_id', p_tenant_id,
    'products', v_products,
    'content_modules', v_content_modules,
    'platform_modules', v_platform_modules,
    'blocked', v_blocked,
    'warnings', v_warning
  );
end;
$$;

create or replace function public.admin_set_tenant_content_module(
  p_entitlement_id uuid,
  p_module_code text,
  p_enabled boolean,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_entitlement public.tenant_product_entitlements%rowtype;
  v_contract public.contracts%rowtype;
  v_module public.content_modules%rowtype;
begin
  perform public.content_assert_platform_admin();

  select * into v_entitlement
  from public.tenant_product_entitlements
  where id = p_entitlement_id
  for update;

  if not found then
    raise exception 'ENTITLEMENT_NOT_FOUND';
  end if;

  select * into v_module
  from public.content_modules
  where code = public.rs_content_normalize_code(p_module_code)
    and status = 'active';

  if not found then
    raise exception 'CONTENT_MODULE_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.product_content_modules pcm
    where pcm.product_id = v_entitlement.product_id
      and pcm.content_module_id = v_module.id
  ) then
    raise exception 'CONTENT_MODULE_NOT_IN_PRODUCT';
  end if;

  select * into v_contract from public.contracts where id = v_entitlement.contract_id;

  insert into public.tenant_product_content_modules (
    entitlement_id, content_module_id, enabled, source, metadata, updated_by
  )
  values (
    v_entitlement.id,
    v_module.id,
    coalesce(p_enabled, false),
    'manual',
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid()
  )
  on conflict (entitlement_id, content_module_id) do update
  set enabled = excluded.enabled,
      source = excluded.source,
      metadata = public.tenant_product_content_modules.metadata || excluded.metadata,
      updated_by = auth.uid(),
      updated_at = now();

  insert into public.contract_entitlement_events (
    contract_id, entitlement_id, event_type, actor_user_id, details
  )
  values (
    v_entitlement.contract_id,
    v_entitlement.id,
    case when coalesce(p_enabled, false) then 'CONTENT_MODULE_ENABLED' else 'CONTENT_MODULE_DISABLED' end,
    auth.uid(),
    jsonb_build_object(
      'module_code', v_module.code,
      'product_id', v_entitlement.product_id,
      'tenant_id', v_entitlement.tenant_id,
      'contract_ref', v_contract.contract_ref
    )
  );

  return jsonb_build_object(
    'status', 'PASS',
    'entitlement_id', v_entitlement.id,
    'module_code', v_module.code,
    'enabled', coalesce(p_enabled, false)
  );
end;
$$;

create or replace function public.admin_get_school_contract_overview(p_school_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_school public.schools%rowtype;
  v_tenant_id uuid;
  v_health jsonb := '{}'::jsonb;
  v_entitlements jsonb := '[]'::jsonb;
begin
  perform public.content_assert_platform_admin();

  select * into v_school from public.schools where id = p_school_id;
  if not found then
    raise exception 'SCHOOL_NOT_FOUND';
  end if;

  select t.id into v_tenant_id
  from public.tenants t
  where t.tenant_type = 'SCHOOL'
    and t.school_id = p_school_id
    and t.status = 'active'
  limit 1;

  if v_tenant_id is not null then
    v_health := public.content_health_check_tenant(v_tenant_id);
  end if;

  with school_tenant as (
    select t.id
    from public.tenants t
    where t.tenant_type = 'SCHOOL'
      and t.school_id = p_school_id
      and t.status = 'active'
    limit 1
  ),
  network_tenants as (
    select t.id, nsm.network_id
    from public.tenants t
    join public.network_school_memberships nsm on nsm.network_id = t.network_id
    where t.tenant_type = 'NETWORK'
      and t.status = 'active'
      and nsm.school_id = p_school_id
      and nsm.status = 'active'
      and (nsm.ended_at is null or nsm.ended_at > now())
  ),
  active_entitlements as (
    select
      tpe.id as entitlement_id,
      tpe.tenant_id,
      tpe.product_id,
      tpe.contract_id,
      tpe.starts_at,
      tpe.ends_at,
      tpe.status,
      tpe.segment_ids,
      tpe.grade_ids,
      tpe.subject_ids,
      case
        when tpe.tenant_id in (select id from school_tenant) then 'DIRECT_SCHOOL'
        else 'INHERITED_NETWORK'
      end as source
    from public.tenant_product_entitlements tpe
    where tpe.status = 'ACTIVE'
      and tpe.starts_at <= current_date
      and (tpe.ends_at is null or tpe.ends_at >= current_date)
      and (
        tpe.tenant_id in (select id from school_tenant)
        or tpe.tenant_id in (select id from network_tenants)
      )
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'entitlement_id', ae.entitlement_id,
    'source', ae.source,
    'source_label', case when ae.source = 'INHERITED_NETWORK' then 'HERDADO DA REDE' else 'ESCOLA' end,
    'status', ae.status,
    'starts_at', ae.starts_at,
    'ends_at', ae.ends_at,
    'contract', jsonb_build_object(
      'id', c.id,
      'contract_ref', c.contract_ref,
      'status', c.status,
      'starts_at', c.starts_at,
      'ends_at', c.ends_at
    ),
    'product', jsonb_build_object(
      'id', p.id,
      'code', p.code,
      'name', p.name,
      'status', p.status,
      'description', p.description
    ),
    'segments', coalesce((
      select jsonb_agg(jsonb_build_object('id', cs.id, 'code', cs.code, 'name', cs.name) order by cs.name)
      from public.content_segments cs
      where cardinality(ae.segment_ids) = 0 or cs.id = any(ae.segment_ids)
    ), '[]'::jsonb),
    'grades', coalesce((
      select jsonb_agg(jsonb_build_object('id', cg.id, 'code', cg.code, 'name', cg.name) order by cg.sort_order, cg.name)
      from public.content_grades cg
      where cardinality(ae.grade_ids) = 0 or cg.id = any(ae.grade_ids)
    ), '[]'::jsonb),
    'content_modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', cm.code,
        'name', cm.name,
        'description', cm.description,
        'content_types', to_jsonb(cm.content_types),
        'requirement_level', pcm.requirement_level,
        'enabled', coalesce(tpcm.enabled, true),
        'scope', case when ae.source = 'INHERITED_NETWORK' then 'HERDADO DA REDE' else 'ESCOLA' end,
        'coverage_count', (
          select count(distinct ci.id)::integer
          from public.product_collections pc
          join public.content_collection_items cci on cci.collection_id = pc.collection_id
          join public.content_items ci on ci.id = cci.content_item_id
          where pc.product_id = ae.product_id
            and ci.content_type = any(cm.content_types)
            and ci.editorial_status = 'PUBLISHED'
            and ci.published_at is not null
        )
      ) order by cm.name)
      from public.product_content_modules pcm
      join public.content_modules cm on cm.id = pcm.content_module_id
      left join public.tenant_product_content_modules tpcm
        on tpcm.entitlement_id = ae.entitlement_id
       and tpcm.content_module_id = cm.id
      where pcm.product_id = ae.product_id
    ), '[]'::jsonb),
    'platform_modules', coalesce((
      select jsonb_agg(jsonb_build_object(
        'code', pm.code,
        'name', pm.name,
        'description', pm.description,
        'requirement_level', ppm.requirement_level,
        'enabled', coalesce(tppm.enabled, true)
      ) order by pm.name)
      from public.product_platform_modules ppm
      join public.platform_modules pm on pm.id = ppm.platform_module_id
      left join public.tenant_product_platform_modules tppm
        on tppm.entitlement_id = ae.entitlement_id
       and tppm.platform_module_id = pm.id
      where ppm.product_id = ae.product_id
    ), '[]'::jsonb)
  ) order by p.name), '[]'::jsonb)
  into v_entitlements
  from active_entitlements ae
  join public.contracts c on c.id = ae.contract_id
  join public.products p on p.id = ae.product_id;

  return jsonb_build_object(
    'status', 'PASS',
    'school', jsonb_build_object('id', v_school.id, 'name', v_school.nome, 'status', v_school.status),
    'tenant_id', v_tenant_id,
    'health', v_health,
    'entitlements', v_entitlements,
    'legacy_exceptions_label', 'EXCEÇÕES POR ESCOLA'
  );
end;
$$;

revoke all on function public.admin_set_tenant_content_module(uuid, text, boolean, jsonb) from public;
grant execute on function public.admin_set_tenant_content_module(uuid, text, boolean, jsonb) to authenticated, service_role;

revoke all on function public.admin_get_school_contract_overview(uuid) from public;
grant execute on function public.admin_get_school_contract_overview(uuid) to authenticated, service_role;

revoke all on function public.content_resolve_for_user(jsonb) from public;
grant execute on function public.content_resolve_for_user(jsonb) to authenticated, service_role;

revoke all on function public.content_health_check_tenant(uuid) from public;
grant execute on function public.content_health_check_tenant(uuid) to authenticated, service_role;

comment on table public.content_modules is
  'Macro módulos de conteúdo comercialmente contratáveis. Não autoriza item individual.';

comment on table public.platform_modules is
  'Módulos funcionais da plataforma contratáveis por produto/contrato.';

comment on table public.tenant_product_content_modules is
  'Estado macro por entitlement. Exceções item a item continuam em content_access_exceptions/school_content_availability.';

commit;
