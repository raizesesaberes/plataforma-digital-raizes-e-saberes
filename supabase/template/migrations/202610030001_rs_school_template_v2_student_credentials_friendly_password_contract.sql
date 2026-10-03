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
  v_technical_email text;
begin
  if not (
    length(coalesce(p_plain_password, '')) >= 10
    or coalesce(p_plain_password, '') ~ '^[A-Z]{3,12}-[0-9]{4}$'
  ) then
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

  if v_student.id is null then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  v_display_name := coalesce(nullif(btrim(v_student.nome), ''), v_credential.login);
  v_technical_email := lower(nullif(btrim(p_technical_email), ''));

  insert into public.users (id, nome, email, perfil, school_id, class_id, ativo)
  values (
    p_auth_user_id,
    v_display_name,
    v_technical_email,
    'aluno',
    v_student.school_id,
    v_student.class_id,
    true
  )
  on conflict (id) do update
  set nome = excluded.nome,
      email = excluded.email,
      perfil = 'aluno',
      school_id = excluded.school_id,
      class_id = excluded.class_id,
      ativo = true;

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
      technical_email = v_technical_email,
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

revoke all on function public.admin_finalize_student_credential_provisioning(uuid, uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_finalize_student_credential_provisioning(uuid, uuid, text, text, uuid) to service_role;
