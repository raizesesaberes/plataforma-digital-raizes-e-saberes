-- RS-SCHOOL-TEMPLATE V1
-- Audit support for Admin/TI creation of Auth access for existing institutional users.

CREATE TABLE IF NOT EXISTS public.admin_auth_access_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid REFERENCES auth.users(id),
  target_type text NOT NULL,
  target_institutional_id uuid,
  target_auth_user_id uuid REFERENCES auth.users(id),
  target_email text,
  derived_role text,
  school_id uuid REFERENCES public.schools(id),
  action text DEFAULT 'auth_access_created'::text NOT NULL,
  result text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT admin_auth_access_events_target_type_check
    CHECK (target_type = ANY (ARRAY['teacher'::text, 'student'::text, 'guardian'::text, 'unknown'::text])),
  CONSTRAINT admin_auth_access_events_action_check
    CHECK (action = 'auth_access_created'),
  CONSTRAINT admin_auth_access_events_result_check
    CHECK (result = ANY (ARRAY['created'::text, 'blocked'::text, 'failed'::text])),
  CONSTRAINT admin_auth_access_events_no_secret_check
    CHECK (
      COALESCE(target_email, '') !~* '(access_token|refresh_token|otp|password|senha|token=|#)'
      AND COALESCE(reason, '') !~* '(access_token|refresh_token|otp|password|senha|token=|#)'
    )
);

ALTER TABLE public.admin_auth_access_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_auth_access_events FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_auth_access_events FROM anon;
REVOKE ALL ON TABLE public.admin_auth_access_events FROM authenticated;

CREATE INDEX IF NOT EXISTS admin_auth_access_events_admin_user_idx
  ON public.admin_auth_access_events(admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_auth_access_events_target_idx
  ON public.admin_auth_access_events(target_type, target_institutional_id, created_at DESC);

COMMENT ON TABLE public.admin_auth_access_events IS
  'Admin-only audit trail for Auth access creation. Stores no passwords, tokens, or invitation links.';
