-- RS-SCHOOL-TEMPLATE V1
-- Allow the Admin/TI Auth source to authorize the canonical Admin profile
-- when legacy Auth app_metadata does not carry platform_role.

CREATE OR REPLACE FUNCTION public.admin_list_auth_users()
RETURNS TABLE (
  auth_user_id uuid,
  email text,
  email_confirmed boolean,
  last_sign_in_at timestamptz,
  created_at timestamptz,
  banned_until timestamptz,
  deleted_at timestamptz,
  auth_status text,
  auth_platform_role text,
  profile_id uuid,
  display_name text,
  platform_role text,
  profile_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para listar acessos Auth.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles caller_profile
      WHERE caller_profile.id = auth.uid()
        AND caller_profile.status = 'active'
        AND caller_profile.platform_role = ANY (ARRAY[
          'admin',
          'admin_ti',
          'administrador',
          'administrador_nacional',
          'ti'
        ])
    )
  ) THEN
    RAISE EXCEPTION 'Acesso restrito ao Admin/TI.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    au.id AS auth_user_id,
    au.email::text AS email,
    (COALESCE(au.email_confirmed_at, au.confirmed_at) IS NOT NULL) AS email_confirmed,
    au.last_sign_in_at,
    au.created_at,
    au.banned_until,
    au.deleted_at,
    CASE
      WHEN au.deleted_at IS NOT NULL THEN 'deleted'
      WHEN au.banned_until IS NOT NULL AND au.banned_until > now() THEN 'banned'
      WHEN COALESCE(au.email_confirmed_at, au.confirmed_at) IS NULL THEN 'pending_confirmation'
      ELSE 'active'
    END::text AS auth_status,
    NULLIF(au.raw_app_meta_data ->> 'platform_role', '')::text AS auth_platform_role,
    p.id AS profile_id,
    p.display_name,
    p.platform_role,
    p.status AS profile_status
  FROM auth.users au
  LEFT JOIN public.profiles p ON p.id = au.id
  ORDER BY lower(au.email::text) ASC NULLS LAST, au.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_auth_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_list_auth_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_auth_users() TO authenticated;

COMMENT ON FUNCTION public.admin_list_auth_users() IS
  'Admin-only read RPC exposing minimal Auth user status for the Admin/TI console.';
