-- Auth provisioning: validate modern JWT claims, with an absent-only legacy fallback.
-- CREATE OR REPLACE preserves the existing owner and ACL; no grants are added.

begin;

-- Do not accidentally create a PUBLIC-executable function on an incomplete base.
do $precondition$
declare
  v_rpc regprocedure := to_regprocedure('public.admin_check_auth_access_duplicate(text,uuid,text,text)');
begin
  if v_rpc is null then
    raise exception 'AUTH_DUPLICATE_RPC_BASE_REQUIRED';
  end if;
  if has_function_privilege('anon', v_rpc, 'EXECUTE')
    or has_function_privilege('authenticated', v_rpc, 'EXECUTE')
    or not has_function_privilege('service_role', v_rpc, 'EXECUTE') then
    raise exception 'AUTH_DUPLICATE_RPC_ACL_REVIEW_REQUIRED';
  end if;
end;
$precondition$;

create or replace function public.admin_check_auth_access_duplicate(
  p_target_type text,
  p_target_institutional_id uuid,
  p_email text,
  p_expected_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'pg_temp'
as $$
declare
  v_claims_text text := nullif(current_setting('request.jwt.claims', true), '');
  v_legacy_role text := nullif(current_setting('request.jwt.claim.role', true), '');
  v_claims jsonb;
  v_claim_role text;
  v_target_type text := lower(btrim(coalesce(p_target_type, '')));
  v_expected_role text := lower(btrim(coalesce(p_expected_role, '')));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_target_school_id uuid;
  v_target_profile_id uuid;
  v_target_user_id uuid;
  v_target_status text;
  v_email_auth_user_id uuid;
  v_target_auth_user_id uuid;
  v_linked_auth_user_id uuid;
  v_profile_conflict_id uuid;
  v_school_membership_conflict_id uuid;
begin
  if v_claims_text is not null then
    begin
      v_claims := v_claims_text::jsonb;
    exception when invalid_text_representation then
      raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
    end;
    if jsonb_typeof(v_claims) is distinct from 'object'
      or jsonb_typeof(v_claims -> 'role') is distinct from 'string' then
      raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
    end if;
    v_claim_role := v_claims ->> 'role';
    if v_legacy_role is not null and v_legacy_role is distinct from v_claim_role then
      raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
    end if;
  else
    -- PostgREST settings may reset to empty strings after a transaction.
    -- Invalid/nonempty JSON never falls back to the legacy setting.
    v_claim_role := v_legacy_role;
  end if;
  if v_claim_role is distinct from 'service_role' then
    raise exception 'SERVICE_ROLE_REQUIRED' using errcode = '42501';
  end if;

  if v_target_type not in ('teacher', 'student', 'guardian') then
    raise exception 'INVALID_TARGET_TYPE' using errcode = '22023';
  end if;

  if p_target_institutional_id is null or v_email = '' then
    raise exception 'INVALID_DUPLICATE_CHECK_INPUT' using errcode = '22023';
  end if;

  if v_target_type = 'teacher' then
    select t.school_id, t.profile_id, t.user_id, coalesce(t.status, 'active')
      into v_target_school_id, v_target_profile_id, v_target_user_id, v_target_status
    from public.teachers t
    where t.id = p_target_institutional_id;
  elsif v_target_type = 'student' then
    select s.school_id, null::uuid, s.user_id, coalesce(s.status, 'active')
      into v_target_school_id, v_target_profile_id, v_target_user_id, v_target_status
    from public.students s
    where s.id = p_target_institutional_id;
  else
    select g.school_id, g.profile_id, null::uuid, coalesce(g.status, 'active')
      into v_target_school_id, v_target_profile_id, v_target_user_id, v_target_status
    from public.guardians g
    where g.id = p_target_institutional_id;
  end if;

  if v_target_school_id is null then
    raise exception 'TARGET_NOT_FOUND' using errcode = 'P0002';
  end if;

  select au.id
    into v_email_auth_user_id
  from auth.users au
  where lower(coalesce(au.email, '')) = v_email
    and au.deleted_at is null
  order by au.created_at asc
  limit 1;

  select au.id
    into v_linked_auth_user_id
  from auth.users au
  where au.deleted_at is null
    and au.id in (
      coalesce(v_target_profile_id, '00000000-0000-0000-0000-000000000000'::uuid),
      coalesce(v_target_user_id, '00000000-0000-0000-0000-000000000000'::uuid)
    )
  order by au.created_at asc
  limit 1;

  select au.id
    into v_target_auth_user_id
  from auth.users au
  where au.deleted_at is null
    and au.raw_user_meta_data ->> 'institutional_target_type' = v_target_type
    and au.raw_user_meta_data ->> 'institutional_target_id' = p_target_institutional_id::text
    and (
      v_expected_role = ''
      or au.raw_app_meta_data ->> 'platform_role' = v_expected_role
    )
  order by
    case
      when v_linked_auth_user_id is not null and au.id <> v_linked_auth_user_id then 0
      else 1
    end,
    au.created_at asc
  limit 1;

  if v_target_profile_id is not null then
    select p.id
      into v_profile_conflict_id
    from public.profiles p
    where p.id = v_target_profile_id
    limit 1;

    select sm.id
      into v_school_membership_conflict_id
    from public.school_memberships sm
    where sm.school_id = v_target_school_id
      and sm.profile_id = v_target_profile_id
      and sm.status = 'active'
    order by sm.created_at asc
    limit 1;
  end if;

  return jsonb_build_object(
    'ok', true,
    'target_type', v_target_type,
    'target_status', v_target_status,
    'email_already_used', v_email_auth_user_id is not null,
    'email_auth_user_id', v_email_auth_user_id,
    'institutional_target_already_linked', v_linked_auth_user_id is not null,
    'linked_auth_user_id', v_linked_auth_user_id,
    'orphan_auth_recovery_required',
      v_target_auth_user_id is not null
      and v_linked_auth_user_id is distinct from v_target_auth_user_id,
    'institutional_target_auth_user_id', v_target_auth_user_id,
    'profile_conflict', v_profile_conflict_id is not null,
    'profile_conflict_id', v_profile_conflict_id,
    'school_membership_conflict', v_school_membership_conflict_id is not null,
    'school_membership_conflict_id', v_school_membership_conflict_id
  );
end;
$$;

commit;
