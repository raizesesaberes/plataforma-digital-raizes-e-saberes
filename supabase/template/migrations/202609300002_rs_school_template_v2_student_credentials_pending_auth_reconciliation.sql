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
  v_reusable_auth_user_id uuid;
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
    if v_credential.auth_user_id is null and nullif(btrim(v_credential.technical_email), '') is not null then
      select au.id into v_reusable_auth_user_id
      from auth.users au
      where lower(au.email) = lower(v_credential.technical_email)
      order by au.created_at
      limit 1;
    end if;

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
      jsonb_build_object(
        'login', v_credential.login,
        'status', v_credential.status,
        'auth_reconciled', v_reusable_auth_user_id is not null
      )
    );

    return jsonb_build_object(
      'ok', true,
      'existing', true,
      'credential_id', v_credential.id,
      'student_id', v_credential.student_id,
      'school_id', v_credential.school_id,
      'login', v_credential.login,
      'status', v_credential.status,
      'auth_user_id', coalesce(v_credential.auth_user_id, v_reusable_auth_user_id),
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
