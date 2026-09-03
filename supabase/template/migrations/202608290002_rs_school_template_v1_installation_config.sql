-- RS-SCHOOL-TEMPLATE V1 installation configuration and structural document catalog.
-- No pilot instance data is inserted here.

create table if not exists public.rs_school_installations (
  id uuid not null default gen_random_uuid(),
  school_id uuid not null,
  school_code text not null,
  deployment_mode text not null default 'production',
  schema_version text not null default 'RS-SCHOOL-TEMPLATE V1',
  school_year text not null,
  document_upload_enabled boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint rs_school_installations_pkey primary key (id),
  constraint rs_school_installations_school_id_key unique (school_id),
  constraint rs_school_installations_school_code_key unique (school_code),
  constraint rs_school_installations_school_id_fkey foreign key (school_id) references public.schools(id) on delete cascade,
  constraint rs_school_installations_school_code_not_blank check (length(btrim(school_code)) > 0),
  constraint rs_school_installations_mode_check check (deployment_mode = any (array['production'::text, 'pilot'::text, 'demo'::text, 'test'::text])),
  constraint rs_school_installations_year_not_blank check (length(btrim(school_year)) > 0)
);

create index if not exists rs_school_installations_schema_version_idx
  on public.rs_school_installations using btree (schema_version);

create index if not exists rs_school_installations_school_code_idx
  on public.rs_school_installations using btree (lower(school_code));

drop trigger if exists rs_school_installations_touch_updated_at on public.rs_school_installations;
create trigger rs_school_installations_touch_updated_at
  before update on public.rs_school_installations
  for each row
  execute function public.institutional_touch_updated_at();

alter table public.rs_school_installations enable row level security;

drop policy if exists "rs_school_installations_select_secretaria" on public.rs_school_installations;
create policy "rs_school_installations_select_secretaria"
on public.rs_school_installations
for select
to authenticated
using (public.secretaria_can_manage_school(school_id));

grant select on table public.rs_school_installations to authenticated;
grant delete, insert, maintain, references, select, trigger, truncate, update on table public.rs_school_installations to postgres, service_role;

with default_document_types(school_id, code, name, required, status) as (
  values
    (null::uuid, 'certidao_nascimento', 'Certidão de nascimento', true, 'active'),
    (null::uuid, 'documento_responsavel', 'Documento do responsável', true, 'active'),
    (null::uuid, 'comprovante_endereco', 'Comprovante de endereço', true, 'active'),
    (null::uuid, 'carteira_vacinacao', 'Carteira de vacinação', true, 'active'),
    (null::uuid, 'foto', 'Foto', false, 'active'),
    (null::uuid, 'autorizacao_saida', 'Autorização de saída', true, 'active')
),
updated_document_types as (
  update public.document_types dt
    set name = d.name,
        required = d.required,
        status = d.status,
        updated_at = now()
  from default_document_types d
  where dt.school_id is not distinct from d.school_id
    and lower(dt.code) = lower(d.code)
  returning dt.id
)
insert into public.document_types (school_id, code, name, required, status)
select d.school_id, d.code, d.name, d.required, d.status
from default_document_types d
where not exists (
  select 1
  from public.document_types dt
  where dt.school_id is not distinct from d.school_id
    and lower(dt.code) = lower(d.code)
);
