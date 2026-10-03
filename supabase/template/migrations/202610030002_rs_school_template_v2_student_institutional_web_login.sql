-- RS-SCHOOL-TEMPLATE V2
-- Student institutional Web login contract.
--
-- Adds server-side credential verification, rate limiting and audit for
-- institutional student logins. This migration does not provision, reset or
-- alter existing credentials.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.student_institutional_login_attempts (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid references public.student_institutional_credentials(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  school_id uuid references public.schools(id) on delete set null,
  normalized_login text not null,
  request_fingerprint text,
  success boolean not null default false,
  failure_code text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint student_institutional_login_attempts_no_secret_check
    check (
      coalesce(normalized_login, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and coalesce(failure_code, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
      and coalesce(metadata::text, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    )
);

comment on table public.student_institutional_login_attempts is
  'Audit and rate-limit trail for student institutional Web login attempts. Never stores plaintext passwords.';

create index if not exists student_institutional_login_attempts_login_idx
  on public.student_institutional_login_attempts (normalized_login, created_at desc);

create index if not exists student_institutional_login_attempts_fingerprint_idx
  on public.student_institutional_login_attempts (request_fingerprint, created_at desc)
  where request_fingerprint is not null;

create index if not exists student_institutional_login_attempts_student_idx
  on public.student_institutional_login_attempts (student_id, created_at desc)
  where student_id is not null;

alter table public.student_institutional_login_attempts enable row level security;

revoke all on table public.student_institutional_login_attempts from public, anon, authenticated;
grant select, insert, update, delete on table public.student_institutional_login_attempts to postgres, service_role;

create or replace function public.student_institutional_login_check(
  p_login text,
  p_plain_password text,
  p_request_fingerprint text default null,
  p_user_agent text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_temp'
as $$
declare
  v_login text := upper(btrim(coalesce(p_login, '')));
  v_password text := coalesce(p_plain_password, '');
  v_fingerprint text := nullif(btrim(coalesce(p_request_fingerprint, '')), '');
  v_credential public.student_institutional_credentials%rowtype;
  v_failed_count integer := 0;
  v_last_failure timestamptz;
  v_lockout_until timestamptz;
  v_now timestamptz := now();
  v_failure_code text;
begin
  if v_login = '' or v_password = '' then
    v_failure_code := 'invalid_credentials';
    insert into public.student_institutional_login_attempts (
      normalized_login,
      request_fingerprint,
      success,
      failure_code,
      metadata
    ) values (
      coalesce(nullif(v_login, ''), 'EMPTY'),
      v_fingerprint,
      false,
      v_failure_code,
      jsonb_build_object('reason', 'missing_login_or_password')
    );

    return jsonb_build_object('ok', false, 'code', v_failure_code);
  end if;

  select count(*)::integer, max(created_at)
    into v_failed_count, v_last_failure
  from public.student_institutional_login_attempts
  where created_at >= v_now - interval '15 minutes'
    and success = false
    and (
      normalized_login = v_login
      or (v_fingerprint is not null and request_fingerprint = v_fingerprint)
    )
    and coalesce(failure_code, '') <> 'temporary_lockout';

  if v_failed_count >= 8 then
    v_lockout_until := coalesce(v_last_failure, v_now) + interval '15 minutes';
    if v_lockout_until > v_now then
      insert into public.student_institutional_login_attempts (
        normalized_login,
        request_fingerprint,
        success,
        failure_code,
        metadata
      ) values (
        v_login,
        v_fingerprint,
        false,
        'temporary_lockout',
        jsonb_build_object(
          'failed_attempts_window', v_failed_count,
          'lockout_until', v_lockout_until,
          'ua_present', nullif(btrim(coalesce(p_user_agent, '')), '') is not null
        )
      );

      return jsonb_build_object(
        'ok', false,
        'code', 'temporary_lockout',
        'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_lockout_until - v_now)))::integer)
      );
    end if;
  end if;

  select *
    into v_credential
  from public.student_institutional_credentials
  where upper(login) = v_login
  limit 1;

  if v_credential.id is null then
    insert into public.student_institutional_login_attempts (
      normalized_login,
      request_fingerprint,
      success,
      failure_code,
      metadata
    ) values (
      v_login,
      v_fingerprint,
      false,
      'invalid_credentials',
      jsonb_build_object('credential_found', false)
    );

    return jsonb_build_object('ok', false, 'code', 'invalid_credentials');
  end if;

  if lower(coalesce(v_credential.status, '')) = 'blocked' then
    insert into public.student_institutional_login_attempts (
      credential_id,
      student_id,
      school_id,
      normalized_login,
      request_fingerprint,
      success,
      failure_code,
      metadata
    ) values (
      v_credential.id,
      v_credential.student_id,
      v_credential.school_id,
      v_login,
      v_fingerprint,
      false,
      'blocked',
      jsonb_build_object('status', v_credential.status)
    );

    return jsonb_build_object('ok', false, 'code', 'blocked');
  end if;

  if lower(coalesce(v_credential.status, '')) = 'pending_auth' then
    insert into public.student_institutional_login_attempts (
      credential_id,
      student_id,
      school_id,
      normalized_login,
      request_fingerprint,
      success,
      failure_code,
      metadata
    ) values (
      v_credential.id,
      v_credential.student_id,
      v_credential.school_id,
      v_login,
      v_fingerprint,
      false,
      'pending_auth',
      jsonb_build_object('status', v_credential.status)
    );

    return jsonb_build_object('ok', false, 'code', 'pending_auth');
  end if;

  if lower(coalesce(v_credential.status, '')) <> 'active'
    or nullif(v_credential.password_hash, '') is null
    or v_credential.auth_user_id is null
    or nullif(v_credential.technical_email, '') is null
  then
    insert into public.student_institutional_login_attempts (
      credential_id,
      student_id,
      school_id,
      normalized_login,
      request_fingerprint,
      success,
      failure_code,
      metadata
    ) values (
      v_credential.id,
      v_credential.student_id,
      v_credential.school_id,
      v_login,
      v_fingerprint,
      false,
      'credential_not_ready',
      jsonb_build_object('status', v_credential.status)
    );

    return jsonb_build_object('ok', false, 'code', 'pending_auth');
  end if;

  if v_credential.password_hash <> extensions.crypt(v_password, v_credential.password_hash) then
    insert into public.student_institutional_login_attempts (
      credential_id,
      student_id,
      school_id,
      normalized_login,
      request_fingerprint,
      success,
      failure_code,
      metadata
    ) values (
      v_credential.id,
      v_credential.student_id,
      v_credential.school_id,
      v_login,
      v_fingerprint,
      false,
      'invalid_credentials',
      jsonb_build_object('credential_found', true)
    );

    return jsonb_build_object('ok', false, 'code', 'invalid_credentials');
  end if;

  update public.student_institutional_credentials
  set last_sign_in_at = v_now,
      updated_at = now()
  where id = v_credential.id
  returning * into v_credential;

  insert into public.student_institutional_login_attempts (
    credential_id,
    student_id,
    school_id,
    normalized_login,
    request_fingerprint,
    success,
    failure_code,
    metadata
  ) values (
    v_credential.id,
    v_credential.student_id,
    v_credential.school_id,
    v_login,
    v_fingerprint,
    true,
    null,
    jsonb_build_object('auth_user_id', v_credential.auth_user_id)
  );

  return jsonb_build_object(
    'ok', true,
    'credential_id', v_credential.id,
    'student_id', v_credential.student_id,
    'school_id', v_credential.school_id,
    'login', v_credential.login,
    'status', v_credential.status,
    'auth_user_id', v_credential.auth_user_id,
    'technical_email', v_credential.technical_email
  );
end;
$$;

revoke all on function public.student_institutional_login_check(text, text, text, text) from public, anon, authenticated;
grant execute on function public.student_institutional_login_check(text, text, text, text) to service_role;
