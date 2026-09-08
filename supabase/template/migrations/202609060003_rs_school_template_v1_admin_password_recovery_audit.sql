-- RS-SCHOOL-TEMPLATE V1
-- Audit-only support for Admin/TI password recovery requests.

CREATE TABLE IF NOT EXISTS public.admin_access_recovery_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL REFERENCES auth.users(id),
  target_auth_user_id uuid NOT NULL REFERENCES auth.users(id),
  target_email text NOT NULL,
  action text DEFAULT 'password_recovery_requested'::text NOT NULL,
  result text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT admin_access_recovery_events_action_check
    CHECK (action = 'password_recovery_requested'),
  CONSTRAINT admin_access_recovery_events_result_check
    CHECK (result = ANY (ARRAY['sent'::text, 'failed'::text]))
);

ALTER TABLE public.admin_access_recovery_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.admin_log_access_recovery_event(
  p_target_auth_user_id uuid,
  p_target_email text,
  p_result text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_temp'
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
  v_event_id uuid;
BEGIN
  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio para registrar recuperacao de acesso.'
      USING ERRCODE = '42501';
  END IF;

  IF NOT (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles caller_profile
      WHERE caller_profile.id = v_admin_user_id
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

  IF p_target_auth_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users au WHERE au.id = p_target_auth_user_id
  ) THEN
    RAISE EXCEPTION 'Usuario Auth alvo inexistente.'
      USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.admin_access_recovery_events (
    admin_user_id,
    target_auth_user_id,
    target_email,
    result
  )
  VALUES (
    v_admin_user_id,
    p_target_auth_user_id,
    lower(btrim(p_target_email)),
    CASE WHEN p_result = 'sent' THEN 'sent' ELSE 'failed' END
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

REVOKE ALL ON TABLE public.admin_access_recovery_events FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_access_recovery_events FROM anon;
REVOKE ALL ON TABLE public.admin_access_recovery_events FROM authenticated;

REVOKE ALL ON FUNCTION public.admin_log_access_recovery_event(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_log_access_recovery_event(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_log_access_recovery_event(uuid, text, text) TO authenticated;

COMMENT ON TABLE public.admin_access_recovery_events IS
  'Admin-only audit trail for password recovery requests. Stores no passwords, tokens, or recovery links.';

COMMENT ON FUNCTION public.admin_log_access_recovery_event(uuid, text, text) IS
  'Admin-only audit RPC for password recovery requests; does not expose password or token data.';
