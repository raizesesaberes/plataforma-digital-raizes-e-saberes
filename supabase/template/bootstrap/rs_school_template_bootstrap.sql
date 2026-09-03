-- RS-SCHOOL-TEMPLATE V1 bootstrap.
-- Required psql variables:
--   school_name, school_code, school_year, admin_user_id, admin_display_name
-- Optional psql variables:
--   deployment_mode, admin_membership_role
--
-- This file does not create auth.users and never stores passwords.

\set ON_ERROR_STOP on

create temporary table if not exists pg_temp.rs_school_template_bootstrap_input as
select
  :'school_name'::text as school_name,
  :'school_code'::text as school_code,
  :'school_year'::text as school_year,
  :'admin_user_id'::uuid as admin_user_id,
  :'admin_display_name'::text as admin_display_name,
  :'deployment_mode'::text as deployment_mode,
  :'admin_membership_role'::text as admin_membership_role;

do $$
declare
  v_school_name text;
  v_school_code text;
  v_school_year text;
  v_admin_user_id uuid;
  v_admin_display_name text;
  v_deployment_mode text;
  v_admin_role text;
  v_school_id uuid;
  v_installation_id uuid;
  v_membership_id uuid;
begin
  select
    nullif(btrim(school_name), ''),
    nullif(btrim(school_code), ''),
    nullif(btrim(school_year), ''),
    admin_user_id,
    coalesce(nullif(btrim(admin_display_name), ''), 'Administrador inicial'),
    coalesce(nullif(btrim(deployment_mode), ''), 'production'),
    coalesce(nullif(btrim(admin_membership_role), ''), 'admin')
  into
    v_school_name,
    v_school_code,
    v_school_year,
    v_admin_user_id,
    v_admin_display_name,
    v_deployment_mode,
    v_admin_role
  from pg_temp.rs_school_template_bootstrap_input
  limit 1;

  if v_school_name is null or v_school_code is null or v_school_year is null then
    raise exception 'school_name, school_code e school_year sao obrigatorios.' using errcode = '22023';
  end if;

  if v_admin_user_id is null then
    raise exception 'admin_user_id e obrigatorio e deve ser o id de um auth user existente.' using errcode = '22023';
  end if;

  if to_regclass('auth.users') is not null and not exists (
    select 1 from auth.users where id = v_admin_user_id
  ) then
    raise exception 'admin_user_id nao encontrado em auth.users.' using errcode = '22023';
  end if;

  if v_admin_role not in ('gestor', 'coordenador', 'direcao', 'secretaria', 'admin', 'admin_ti') then
    raise exception 'admin_membership_role nao e reconhecida pela Secretaria V1.' using errcode = '22023';
  end if;

  select id into v_school_id
  from public.schools
  where lower(nome) = lower(v_school_name)
  limit 1;

  if v_school_id is null then
    insert into public.schools (nome, status)
    values (v_school_name, 'active')
    returning id into v_school_id;
  else
    update public.schools
      set status = 'active',
          updated_at = now()
    where id = v_school_id;
  end if;

  update public.profiles
    set display_name = v_admin_display_name,
        platform_role = 'admin',
        status = 'active',
        updated_at = now()
  where id = v_admin_user_id;

  if not found then
    insert into public.profiles (id, display_name, platform_role, status)
    values (v_admin_user_id, v_admin_display_name, 'admin', 'active');
  end if;

  select id into v_membership_id
  from public.school_memberships
  where school_id = v_school_id
    and profile_id = v_admin_user_id
    and membership_role = v_admin_role
  order by case when status = 'active' and ended_at is null then 0 else 1 end, created_at
  limit 1;

  if v_membership_id is null then
    insert into public.school_memberships (school_id, profile_id, membership_role, status, started_at)
    values (v_school_id, v_admin_user_id, v_admin_role, 'active', now());
  else
    update public.school_memberships
      set status = 'active',
          ended_at = null,
          updated_at = now()
    where id = v_membership_id;
  end if;

  update public.rs_school_installations
    set deployment_mode = v_deployment_mode,
        school_code = v_school_code,
        schema_version = 'RS-SCHOOL-TEMPLATE V1',
        school_year = v_school_year,
        document_upload_enabled = false,
        updated_at = now()
  where school_id = v_school_id
  returning id into v_installation_id;

  if v_installation_id is null then
    insert into public.rs_school_installations (
      school_id,
      school_code,
      deployment_mode,
      schema_version,
      school_year,
      document_upload_enabled
    )
    values (
      v_school_id,
      v_school_code,
      v_deployment_mode,
      'RS-SCHOOL-TEMPLATE V1',
      v_school_year,
      false
    )
    returning id into v_installation_id;
  end if;

  raise notice 'RS-SCHOOL-TEMPLATE V1 bootstrap: school_id=%, admin_profile_id=%, school_year=%',
    v_school_id, v_admin_user_id, v_school_year;
end $$;
