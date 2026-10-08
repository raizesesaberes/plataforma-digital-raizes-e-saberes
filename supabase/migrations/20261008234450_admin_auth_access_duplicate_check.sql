-- PROFESSOR FUNDAMENTAL — T3 ACESSOS 08
-- Minimal server-side duplicate check for Admin/TI digital access provisioning.

begin;

create or replace function public.admin_check_auth_access_duplicate(
  p_target_type text,
  p_target_institutional_id uuid,
  p_email text,
  p_expected_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_claim_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
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
  if v_claim_role <> 'service_role' then
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
    into v_target_auth_user_id
  from auth.users au
  where au.deleted_at is null
    and au.raw_user_meta_data ->> 'institutional_target_type' = v_target_type
    and au.raw_user_meta_data ->> 'institutional_target_id' = p_target_institutional_id::text
    and (
      v_expected_role = ''
      or au.raw_app_meta_data ->> 'platform_role' = v_expected_role
    )
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

revoke all on function public.admin_check_auth_access_duplicate(text, uuid, text, text) from public;
revoke all on function public.admin_check_auth_access_duplicate(text, uuid, text, text) from anon;
revoke all on function public.admin_check_auth_access_duplicate(text, uuid, text, text) from authenticated;
grant execute on function public.admin_check_auth_access_duplicate(text, uuid, text, text) to service_role;

comment on function public.admin_check_auth_access_duplicate(text, uuid, text, text) is
  'Service-role-only duplicate Auth check for Admin/TI access provisioning. Returns minimal conflict identifiers and avoids Auth Admin global user listing.';

commit;
