-- RS-SCHOOL-TEMPLATE V2
-- Student institutional credential foundation.
--
-- This migration creates the canonical server-side model for student
-- institutional logins. It intentionally does not change Web/Mobile login
-- screens and does not provision existing students automatically.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.school_auth_namespaces (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  namespace text not null,
  source text not null default 'admin',
  next_sequence bigint not null default 1,
  locked boolean not null default true,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_auth_namespaces_school_unique unique (school_id),
  constraint school_auth_namespaces_school_id_id_unique unique (school_id, id),
  constraint school_auth_namespaces_namespace_unique unique (namespace),
  constraint school_auth_namespaces_namespace_format
    check (namespace ~ '^[A-Z0-9]{2,12}$'),
  constraint school_auth_namespaces_next_sequence_check
    check (next_sequence > 0)
);

comment on table public.school_auth_namespaces is
  'Immutable namespace used to generate permanent student institutional logins.';

create index if not exists school_auth_namespaces_namespace_idx
  on public.school_auth_namespaces (namespace);

drop trigger if exists school_auth_namespaces_touch_updated_at on public.school_auth_namespaces;
create trigger school_auth_namespaces_touch_updated_at
before update on public.school_auth_namespaces
for each row
execute function public.institutional_touch_updated_at();

create or replace function public.prevent_school_auth_namespace_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.school_id is distinct from new.school_id then
    raise exception 'SCHOOL_NAMESPACE_IMMUTABLE';
  end if;

  if old.namespace is distinct from new.namespace then
    raise exception 'SCHOOL_NAMESPACE_IMMUTABLE';
  end if;

  if new.next_sequence < old.next_sequence then
    raise exception 'SCHOOL_NAMESPACE_SEQUENCE_CANNOT_REWIND';
  end if;

  return new;
end;
$$;

drop trigger if exists school_auth_namespaces_prevent_identity_mutation on public.school_auth_namespaces;
create trigger school_auth_namespaces_prevent_identity_mutation
before update on public.school_auth_namespaces
for each row
execute function public.prevent_school_auth_namespace_mutation();

create table if not exists public.student_institutional_credentials (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  namespace_id uuid not null references public.school_auth_namespaces(id) on delete restrict,
  login text not null,
  sequence_no bigint not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  technical_email text,
  password_hash text,
  password_hash_algorithm text not null default 'pgcrypto_bf',
  password_version integer not null default 0,
  status text not null default 'pending_auth',
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  technical_auth_created_at timestamptz,
  password_changed_at timestamptz,
  last_reset_at timestamptz,
  last_sign_in_at timestamptz,
  blocked_at timestamptz,
  unblocked_at timestamptz,
  constraint student_institutional_credentials_student_unique unique (student_id),
  constraint student_institutional_credentials_login_unique unique (login),
  constraint student_institutional_credentials_auth_user_unique unique (auth_user_id),
  constraint student_institutional_credentials_technical_email_unique unique (technical_email),
  constraint student_institutional_credentials_sequence_unique unique (namespace_id, sequence_no),
  constraint student_institutional_credentials_login_format
    check (login ~ '^[A-Z0-9]{2,12}-[0-9]{6}$'),
  constraint student_institutional_credentials_status_check
    check (status in ('pending_auth', 'active', 'blocked', 'archived')),
  constraint student_institutional_credentials_hash_check
    check (
      (status = 'pending_auth' and password_hash is null)
      or
      (status <> 'pending_auth' and password_hash is not null)
    ),
  constraint student_institutional_credentials_school_match
    foreign key (school_id, namespace_id)
    references public.school_auth_namespaces (school_id, id)
    deferrable initially immediate
);

comment on table public.student_institutional_credentials is
  'Canonical student institutional login identity. Stores password hashes only, never plaintext passwords.';

create index if not exists student_institutional_credentials_school_idx
  on public.student_institutional_credentials (school_id, status, created_at desc);

create index if not exists student_institutional_credentials_login_lower_idx
  on public.student_institutional_credentials (lower(login));

drop trigger if exists student_institutional_credentials_touch_updated_at on public.student_institutional_credentials;
create trigger student_institutional_credentials_touch_updated_at
before update on public.student_institutional_credentials
for each row
execute function public.institutional_touch_updated_at();

create table if not exists public.student_credential_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid references public.student_institutional_credentials(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  actor_profile_id uuid references auth.users(id) on delete set null default auth.uid(),
  action text not null,
  result text not null default 'success',
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint student_credential_events_action_check
    check (action in (
      'CREDENTIAL_CREATED',
      'PASSWORD_RESET',
      'ACCESS_BLOCKED',
      'ACCESS_UNBLOCKED',
      'IDEMPOTENT_REPLAY',
      'PROVISIONING_BLOCKED',
      'PROVISIONING_FAILED'
    )),
  constraint student_credential_events_result_check
    check (result in ('success', 'blocked', 'failed')),
  constraint student_credential_events_no_secret_check
    check (
      coalesce(reason, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and coalesce(metadata::text, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    )
);

create index if not exists student_credential_events_student_idx
  on public.student_credential_events (student_id, created_at desc);

create index if not exists student_credential_events_school_idx
  on public.student_credential_events (school_id, created_at desc);

alter table public.school_auth_namespaces enable row level security;
alter table public.student_institutional_credentials enable row level security;
alter table public.student_credential_events enable row level security;

drop policy if exists school_auth_namespaces_authorized_select on public.school_auth_namespaces;
create policy school_auth_namespaces_authorized_select
on public.school_auth_namespaces
for select
to authenticated
using (public.secretaria_can_manage_school(school_id));

drop policy if exists student_institutional_credentials_authorized_select on public.student_institutional_credentials;
create policy student_institutional_credentials_authorized_select
on public.student_institutional_credentials
for select
to authenticated
using (public.secretaria_can_manage_school(school_id));

drop policy if exists student_credential_events_authorized_select on public.student_credential_events;
create policy student_credential_events_authorized_select
on public.student_credential_events
for select
to authenticated
using (public.secretaria_can_manage_school(school_id));

revoke all on table public.school_auth_namespaces from public, anon, authenticated;
revoke all on table public.student_institutional_credentials from public, anon, authenticated;
revoke all on table public.student_credential_events from public, anon, authenticated;

grant select on table public.school_auth_namespaces to authenticated;
grant select on table public.student_institutional_credentials to authenticated;
grant select on table public.student_credential_events to authenticated;

grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.school_auth_namespaces to postgres, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.student_institutional_credentials to postgres, service_role;
grant delete, insert, maintain, references, select, trigger, truncate, update
  on table public.student_credential_events to postgres, service_role;

create or replace function public.normalize_school_auth_namespace(p_value text)
returns text
language sql
immutable
as $$
  select nullif(
    substring(
      upper(
        regexp_replace(
          translate(
            coalesce(p_value, ''),
            'ÁÀÃÂÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇÑáàãâäéèêëíìîïóòõôöúùûüçñ',
            'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'
          ),
          '[^A-Za-z0-9]',
          '',
          'g'
        )
      )
      from 1 for 12
    ),
    ''
  );
$$;

create or replace function public.derive_school_auth_namespace(p_school_id uuid)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_school public.schools%rowtype;
  v_candidate text;
  v_words text[];
  v_word text;
begin
  select * into v_school
  from public.schools
  where id = p_school_id;

  if v_school.id is null then
    raise exception 'SCHOOL_NOT_FOUND';
  end if;

  v_candidate := public.normalize_school_auth_namespace(split_part(coalesce(v_school.codigo_inep, ''), '-', 1));
  if length(coalesce(v_candidate, '')) >= 2 then
    return v_candidate;
  end if;

  v_words := regexp_split_to_array(coalesce(v_school.nome, ''), '\s+');
  v_candidate := '';
  foreach v_word in array v_words loop
    if length(v_word) >= 3 and lower(v_word) not in ('escola', 'municipal', 'estadual', 'de', 'da', 'do', 'das', 'dos', 'e') then
      v_candidate := v_candidate || left(public.normalize_school_auth_namespace(v_word), 1);
    end if;
    exit when length(v_candidate) >= 6;
  end loop;

  v_candidate := public.normalize_school_auth_namespace(v_candidate);
  if length(coalesce(v_candidate, '')) < 2 then
    v_candidate := 'ESC' || substring(replace(p_school_id::text, '-', '') from 1 for 6);
  end if;

  return substring(v_candidate from 1 for 12);
end;
$$;

create or replace function public.ensure_school_auth_namespace(
  p_school_id uuid,
  p_namespace text default null,
  p_actor_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_namespace public.school_auth_namespaces%rowtype;
  v_school public.schools%rowtype;
  v_requested text;
begin
  if public.current_platform_role() <> 'service_role' and not public.secretaria_can_manage_school(p_school_id) then
    raise exception 'UNAUTHORIZED_SCHOOL_NAMESPACE' using errcode = '42501';
  end if;

  select * into v_school
  from public.schools
  where id = p_school_id;

  if v_school.id is null then
    raise exception 'SCHOOL_NOT_FOUND';
  end if;

  select * into v_namespace
  from public.school_auth_namespaces
  where school_id = p_school_id
  for update;

  if v_namespace.id is not null then
    return jsonb_build_object(
      'ok', true,
      'namespace_id', v_namespace.id,
      'school_id', v_namespace.school_id,
      'namespace', v_namespace.namespace,
      'existing', true,
      'next_sequence', v_namespace.next_sequence
    );
  end if;

  v_requested := coalesce(public.normalize_school_auth_namespace(p_namespace), public.derive_school_auth_namespace(p_school_id));
  if v_requested is null or v_requested !~ '^[A-Z0-9]{2,12}$' then
    raise exception 'INVALID_SCHOOL_NAMESPACE';
  end if;

  insert into public.school_auth_namespaces (
    school_id,
    namespace,
    source,
    next_sequence,
    locked,
    created_by
  ) values (
    p_school_id,
    v_requested,
    case when p_namespace is null then 'derived' else 'admin' end,
    1,
    true,
    coalesce(p_actor_id, auth.uid())
  )
  returning * into v_namespace;

  return jsonb_build_object(
    'ok', true,
    'namespace_id', v_namespace.id,
    'school_id', v_namespace.school_id,
    'namespace', v_namespace.namespace,
    'existing', false,
    'next_sequence', v_namespace.next_sequence
  );
end;
$$;

create or replace function public.admin_prepare_student_credential_provisioning(
  p_student_id uuid,
  p_actor_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_student public.students%rowtype;
  v_namespace public.school_auth_namespaces%rowtype;
  v_credential public.student_institutional_credentials%rowtype;
  v_sequence bigint;
  v_login text;
begin
  select * into v_student
  from public.students
  where id = p_student_id
  for update;

  if v_student.id is null then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  if public.current_platform_role() <> 'service_role' and not public.secretaria_can_manage_school(v_student.school_id) then
    raise exception 'UNAUTHORIZED_PROVISIONING' using errcode = '42501';
  end if;

  select * into v_credential
  from public.student_institutional_credentials
  where student_id = p_student_id
  for update;

  if v_credential.id is not null then
    insert into public.student_credential_events (
      credential_id,
      student_id,
      school_id,
      actor_profile_id,
      action,
      result,
      metadata
    ) values (
      v_credential.id,
      v_credential.student_id,
      v_credential.school_id,
      coalesce(p_actor_id, auth.uid()),
      'IDEMPOTENT_REPLAY',
      'success',
      jsonb_build_object('login', v_credential.login, 'status', v_credential.status)
    );

    return jsonb_build_object(
      'ok', true,
      'existing', true,
      'credential_id', v_credential.id,
      'student_id', v_credential.student_id,
      'school_id', v_credential.school_id,
      'login', v_credential.login,
      'status', v_credential.status,
      'auth_user_id', v_credential.auth_user_id,
      'technical_email', v_credential.technical_email
    );
  end if;

  perform public.ensure_school_auth_namespace(v_student.school_id, null, coalesce(p_actor_id, auth.uid()));

  select * into v_namespace
  from public.school_auth_namespaces
  where school_id = v_student.school_id
  for update;

  v_sequence := v_namespace.next_sequence;
  v_login := v_namespace.namespace || '-' || lpad(v_sequence::text, 6, '0');

  update public.school_auth_namespaces
  set next_sequence = next_sequence + 1
  where id = v_namespace.id;

  insert into public.student_institutional_credentials (
    student_id,
    school_id,
    namespace_id,
    login,
    sequence_no,
    technical_email,
    status,
    created_by
  ) values (
    v_student.id,
    v_student.school_id,
    v_namespace.id,
    v_login,
    v_sequence,
    lower(v_login) || '@students.raizes.invalid',
    'pending_auth',
    coalesce(p_actor_id, auth.uid())
  )
  returning * into v_credential;

  return jsonb_build_object(
    'ok', true,
    'existing', false,
    'credential_id', v_credential.id,
    'student_id', v_credential.student_id,
    'school_id', v_credential.school_id,
    'login', v_credential.login,
    'status', v_credential.status,
    'technical_email', lower(v_credential.login) || '@students.raizes.invalid'
  );
end;
$$;

create or replace function public.admin_finalize_student_credential_provisioning(
  p_credential_id uuid,
  p_auth_user_id uuid,
  p_technical_email text,
  p_plain_password text,
  p_actor_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_credential public.student_institutional_credentials%rowtype;
  v_student public.students%rowtype;
  v_display_name text;
begin
  if length(coalesce(p_plain_password, '')) < 10 then
    raise exception 'WEAK_INITIAL_PASSWORD';
  end if;

  select * into v_credential
  from public.student_institutional_credentials
  where id = p_credential_id
  for update;

  if v_credential.id is null then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  if public.current_platform_role() <> 'service_role' and not public.secretaria_can_manage_school(v_credential.school_id) then
    raise exception 'UNAUTHORIZED_PROVISIONING' using errcode = '42501';
  end if;

  select * into v_student
  from public.students
  where id = v_credential.student_id
  for update;

  v_display_name := coalesce(nullif(btrim(v_student.nome), ''), v_credential.login);

  insert into public.profiles (id, display_name, platform_role, status)
  values (p_auth_user_id, v_display_name, 'aluno', 'active')
  on conflict (id) do update
  set display_name = excluded.display_name,
      platform_role = 'aluno',
      status = 'active',
      updated_at = now();

  update public.students
  set user_id = p_auth_user_id,
      updated_at = now()
  where id = v_credential.student_id;

  update public.student_institutional_credentials
  set auth_user_id = p_auth_user_id,
      technical_email = lower(nullif(btrim(p_technical_email), '')),
      password_hash = extensions.crypt(p_plain_password, extensions.gen_salt('bf', 10)),
      password_hash_algorithm = 'pgcrypto_bf',
      password_version = password_version + 1,
      status = 'active',
      technical_auth_created_at = coalesce(technical_auth_created_at, now()),
      password_changed_at = now(),
      last_reset_at = coalesce(last_reset_at, now()),
      blocked_at = null,
      unblocked_at = null,
      updated_at = now()
  where id = v_credential.id
  returning * into v_credential;

  insert into public.student_credential_events (
    credential_id,
    student_id,
    school_id,
    actor_profile_id,
    action,
    result,
    metadata
  ) values (
    v_credential.id,
    v_credential.student_id,
    v_credential.school_id,
    coalesce(p_actor_id, auth.uid()),
    'CREDENTIAL_CREATED',
    'success',
    jsonb_build_object('login', v_credential.login)
  );

  return jsonb_build_object(
    'ok', true,
    'credential_id', v_credential.id,
    'student_id', v_credential.student_id,
    'school_id', v_credential.school_id,
    'login', v_credential.login,
    'status', v_credential.status,
    'auth_user_id', v_credential.auth_user_id
  );
end;
$$;

create or replace function public.admin_reset_student_credential_password(
  p_student_id uuid,
  p_plain_password text,
  p_actor_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_credential public.student_institutional_credentials%rowtype;
begin
  if length(coalesce(p_plain_password, '')) < 10 then
    raise exception 'WEAK_RESET_PASSWORD';
  end if;

  select * into v_credential
  from public.student_institutional_credentials
  where student_id = p_student_id
  for update;

  if v_credential.id is null then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  if public.current_platform_role() <> 'service_role' and not public.secretaria_can_manage_school(v_credential.school_id) then
    raise exception 'UNAUTHORIZED_RESET' using errcode = '42501';
  end if;

  update public.student_institutional_credentials
  set password_hash = extensions.crypt(p_plain_password, extensions.gen_salt('bf', 10)),
      password_hash_algorithm = 'pgcrypto_bf',
      password_version = password_version + 1,
      status = case when status = 'pending_auth' then 'active' else status end,
      password_changed_at = now(),
      last_reset_at = now(),
      updated_at = now()
  where id = v_credential.id
  returning * into v_credential;

  insert into public.student_credential_events (
    credential_id,
    student_id,
    school_id,
    actor_profile_id,
    action,
    result,
    metadata
  ) values (
    v_credential.id,
    v_credential.student_id,
    v_credential.school_id,
    coalesce(p_actor_id, auth.uid()),
    'PASSWORD_RESET',
    'success',
    jsonb_build_object('login', v_credential.login, 'credential_version', v_credential.password_version)
  );

  return jsonb_build_object(
    'ok', true,
    'credential_id', v_credential.id,
    'student_id', v_credential.student_id,
    'school_id', v_credential.school_id,
    'login', v_credential.login,
    'status', v_credential.status,
    'auth_user_id', v_credential.auth_user_id,
    'technical_email', v_credential.technical_email,
    'password_version', v_credential.password_version
  );
end;
$$;

create or replace function public.admin_set_student_credential_status(
  p_student_id uuid,
  p_status text,
  p_actor_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_credential public.student_institutional_credentials%rowtype;
  v_status text := lower(btrim(coalesce(p_status, '')));
  v_action text;
begin
  if v_status not in ('active', 'blocked') then
    raise exception 'INVALID_CREDENTIAL_STATUS';
  end if;

  select * into v_credential
  from public.student_institutional_credentials
  where student_id = p_student_id
  for update;

  if v_credential.id is null then
    raise exception 'CREDENTIAL_NOT_FOUND';
  end if;

  if public.current_platform_role() <> 'service_role' and not public.secretaria_can_manage_school(v_credential.school_id) then
    raise exception 'UNAUTHORIZED_STATUS_CHANGE' using errcode = '42501';
  end if;

  v_action := case when v_status = 'blocked' then 'ACCESS_BLOCKED' else 'ACCESS_UNBLOCKED' end;

  update public.student_institutional_credentials
  set status = v_status,
      blocked_at = case when v_status = 'blocked' then now() else blocked_at end,
      unblocked_at = case when v_status = 'active' then now() else unblocked_at end,
      updated_at = now()
  where id = v_credential.id
  returning * into v_credential;

  insert into public.student_credential_events (
    credential_id,
    student_id,
    school_id,
    actor_profile_id,
    action,
    result,
    metadata
  ) values (
    v_credential.id,
    v_credential.student_id,
    v_credential.school_id,
    coalesce(p_actor_id, auth.uid()),
    v_action,
    'success',
    jsonb_build_object('login', v_credential.login, 'status', v_credential.status)
  );

  return jsonb_build_object(
    'ok', true,
    'credential_id', v_credential.id,
    'student_id', v_credential.student_id,
    'school_id', v_credential.school_id,
    'login', v_credential.login,
    'status', v_credential.status,
    'auth_user_id', v_credential.auth_user_id
  );
end;
$$;

create or replace function public.admin_list_students_without_credentials(
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_limit integer default 1000
) returns table(student_id uuid, school_id uuid, class_id uuid, student_name text)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if p_school_id is null and p_class_id is null then
    raise exception 'SCHOOL_OR_CLASS_REQUIRED';
  end if;

  if p_school_id is not null and public.current_platform_role() <> 'service_role' and not public.secretaria_can_manage_school(p_school_id) then
    raise exception 'UNAUTHORIZED_PROVISIONING' using errcode = '42501';
  end if;

  if p_class_id is not null and public.current_platform_role() <> 'service_role' and not exists (
    select 1
    from public.classes c
    where c.id = p_class_id
      and public.secretaria_can_manage_school(c.school_id)
  ) then
    raise exception 'UNAUTHORIZED_PROVISIONING' using errcode = '42501';
  end if;

  return query
  select s.id, s.school_id, s.class_id, s.nome::text
  from public.students s
  where (p_school_id is null or s.school_id = p_school_id)
    and (p_class_id is null or s.class_id = p_class_id)
    and coalesce(lower(s.status), 'ativo') in ('ativo', 'active')
    and not exists (
      select 1
      from public.student_institutional_credentials sic
      where sic.student_id = s.id
    )
  order by s.nome nulls last, s.created_at
  limit greatest(1, least(coalesce(p_limit, 1000), 5000));
end;
$$;

revoke all on function public.normalize_school_auth_namespace(text) from public, anon, authenticated;
revoke all on function public.derive_school_auth_namespace(uuid) from public, anon, authenticated;
revoke all on function public.ensure_school_auth_namespace(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_prepare_student_credential_provisioning(uuid, uuid) from public, anon, authenticated;
revoke all on function public.admin_finalize_student_credential_provisioning(uuid, uuid, text, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_reset_student_credential_password(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_set_student_credential_status(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.admin_list_students_without_credentials(uuid, uuid, integer) from public, anon, authenticated;

grant execute on function public.ensure_school_auth_namespace(uuid, text, uuid) to service_role;
grant execute on function public.admin_prepare_student_credential_provisioning(uuid, uuid) to service_role;
grant execute on function public.admin_finalize_student_credential_provisioning(uuid, uuid, text, text, uuid) to service_role;
grant execute on function public.admin_reset_student_credential_password(uuid, text, uuid) to service_role;
grant execute on function public.admin_set_student_credential_status(uuid, text, uuid) to service_role;
grant execute on function public.admin_list_students_without_credentials(uuid, uuid, integer) to service_role;
