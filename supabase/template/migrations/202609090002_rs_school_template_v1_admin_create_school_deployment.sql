-- RS-SCHOOL-TEMPLATE V1 - Admin/TI controlled school creation and deployment state.
-- Creates a minimal audited RPC for new schools without exposing privileged keys.

CREATE TABLE IF NOT EXISTS public.rs_school_installations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  school_code text NOT NULL,
  deployment_mode text NOT NULL DEFAULT 'test',
  schema_version text NOT NULL DEFAULT 'RS-SCHOOL-TEMPLATE V1',
  package_version text NOT NULL DEFAULT 'RS-SCHOOL-V1-DEPLOYMENT-2026-09-01',
  school_year text NOT NULL,
  current_stage text NOT NULL DEFAULT 'em_configuracao',
  validation_status text NOT NULL DEFAULT 'pending',
  activated_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rs_school_installations_pkey PRIMARY KEY (id),
  CONSTRAINT rs_school_installations_school_id_key UNIQUE (school_id),
  CONSTRAINT rs_school_installations_school_code_key UNIQUE (school_code),
  CONSTRAINT rs_school_installations_school_id_fkey
    FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
  CONSTRAINT rs_school_installations_school_code_not_blank
    CHECK (length(btrim(school_code)) > 0),
  CONSTRAINT rs_school_installations_mode_check
    CHECK (deployment_mode = ANY (ARRAY['production'::text, 'pilot'::text, 'demo'::text, 'test'::text])),
  CONSTRAINT rs_school_installations_stage_check
    CHECK (current_stage = ANY (ARRAY[
      'em_configuracao'::text,
      'dados_parciais'::text,
      'pronta_para_validacao'::text,
      'ativa'::text,
      'arquivada'::text
    ])),
  CONSTRAINT rs_school_installations_validation_status_check
    CHECK (validation_status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text])),
  CONSTRAINT rs_school_installations_year_not_blank
    CHECK (length(btrim(school_year)) > 0)
);

CREATE INDEX IF NOT EXISTS rs_school_installations_schema_version_idx
  ON public.rs_school_installations (schema_version);

CREATE INDEX IF NOT EXISTS rs_school_installations_school_code_idx
  ON public.rs_school_installations (lower(school_code));

DROP TRIGGER IF EXISTS rs_school_installations_touch_updated_at ON public.rs_school_installations;
CREATE TRIGGER rs_school_installations_touch_updated_at
  BEFORE UPDATE ON public.rs_school_installations
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

ALTER TABLE public.rs_school_installations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rs_school_installations_select_admin_or_school_manager ON public.rs_school_installations;
CREATE POLICY rs_school_installations_select_admin_or_school_manager
ON public.rs_school_installations
FOR SELECT
TO authenticated
USING (
  public.is_platform_admin()
  OR public.secretaria_can_manage_school(school_id)
);

REVOKE ALL ON TABLE public.rs_school_installations FROM PUBLIC;
REVOKE ALL ON TABLE public.rs_school_installations FROM anon;
REVOKE ALL ON TABLE public.rs_school_installations FROM authenticated;
GRANT SELECT ON TABLE public.rs_school_installations TO authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE public.rs_school_installations TO postgres, service_role;

CREATE TABLE IF NOT EXISTS public.admin_school_deployment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id),
  school_id uuid REFERENCES public.schools(id),
  school_code text,
  action text NOT NULL DEFAULT 'school_created',
  stage text NOT NULL DEFAULT 'em_configuracao',
  result text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admin_school_deployment_events_pkey PRIMARY KEY (id),
  CONSTRAINT admin_school_deployment_events_action_check
    CHECK (action = ANY (ARRAY['school_created'::text, 'duplicate_blocked'::text, 'creation_failed'::text])),
  CONSTRAINT admin_school_deployment_events_stage_check
    CHECK (stage = ANY (ARRAY[
      'em_configuracao'::text,
      'dados_parciais'::text,
      'pronta_para_validacao'::text,
      'ativa'::text,
      'arquivada'::text
    ])),
  CONSTRAINT admin_school_deployment_events_result_check
    CHECK (result = ANY (ARRAY['created'::text, 'blocked'::text, 'failed'::text])),
  CONSTRAINT admin_school_deployment_events_no_secret_check
    CHECK (coalesce(reason, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)')
);

ALTER TABLE public.admin_school_deployment_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.admin_school_deployment_events FROM PUBLIC;
REVOKE ALL ON TABLE public.admin_school_deployment_events FROM anon;
REVOKE ALL ON TABLE public.admin_school_deployment_events FROM authenticated;
GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
  ON TABLE public.admin_school_deployment_events TO postgres, service_role;

CREATE INDEX IF NOT EXISTS admin_school_deployment_events_admin_idx
  ON public.admin_school_deployment_events (admin_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_school_deployment_events_school_idx
  ON public.admin_school_deployment_events (school_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.admin_create_school(
  p_nome text,
  p_school_code text,
  p_school_year text,
  p_municipio text DEFAULT NULL::text,
  p_estado text DEFAULT NULL::text,
  p_diretor text DEFAULT NULL::text,
  p_deployment_mode text DEFAULT 'test'::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
  v_admin_role text;
  v_nome text := nullif(btrim(p_nome), '');
  v_school_code text := nullif(btrim(p_school_code), '');
  v_school_year text := nullif(btrim(p_school_year), '');
  v_deployment_mode text := coalesce(nullif(btrim(p_deployment_mode), ''), 'test');
  v_municipio text := nullif(btrim(p_municipio), '');
  v_estado text := nullif(btrim(p_estado), '');
  v_diretor text := nullif(btrim(p_diretor), '');
  v_school_id uuid;
  v_installation_id uuid;
BEGIN
  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Sessao autenticada obrigatoria.' USING ERRCODE = '42501';
  END IF;

  SELECT lower(platform_role)
    INTO v_admin_role
  FROM public.profiles
  WHERE id = v_admin_user_id
    AND status = 'active';

  IF v_admin_role NOT IN ('admin', 'admin_ti', 'administrador', 'administrador_nacional') THEN
    RAISE EXCEPTION 'Perfil Admin/TI obrigatorio para criar escola.' USING ERRCODE = '42501';
  END IF;

  IF v_nome IS NULL OR v_school_code IS NULL OR v_school_year IS NULL THEN
    RAISE EXCEPTION 'Nome, codigo institucional e ano letivo inicial sao obrigatorios.' USING ERRCODE = '22023';
  END IF;

  IF v_deployment_mode NOT IN ('production', 'pilot', 'demo', 'test') THEN
    RAISE EXCEPTION 'Modo de implantacao invalido.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.schools s
    WHERE lower(btrim(s.nome)) = lower(v_nome)
       OR lower(btrim(coalesce(s.codigo_inep, ''))) = lower(v_school_code)
  ) OR EXISTS (
    SELECT 1
    FROM public.rs_school_installations i
    WHERE lower(btrim(i.school_code)) = lower(v_school_code)
  ) THEN
    INSERT INTO public.admin_school_deployment_events (
      admin_user_id,
      school_code,
      action,
      stage,
      result,
      reason
    ) VALUES (
      v_admin_user_id,
      v_school_code,
      'duplicate_blocked',
      'em_configuracao',
      'blocked',
      'duplicate_school_or_code'
    );

    RAISE EXCEPTION 'Escola ou codigo institucional ja existe.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.schools (
    nome,
    codigo_inep,
    municipio,
    estado,
    diretor,
    status
  ) VALUES (
    v_nome,
    v_school_code,
    v_municipio,
    v_estado,
    v_diretor,
    'inactive'
  )
  RETURNING id INTO v_school_id;

  INSERT INTO public.rs_school_installations (
    school_id,
    school_code,
    deployment_mode,
    schema_version,
    package_version,
    school_year,
    current_stage,
    validation_status,
    created_by
  ) VALUES (
    v_school_id,
    v_school_code,
    v_deployment_mode,
    'RS-SCHOOL-TEMPLATE V1',
    'RS-SCHOOL-V1-DEPLOYMENT-2026-09-01',
    v_school_year,
    'em_configuracao',
    'pending',
    v_admin_user_id
  )
  RETURNING id INTO v_installation_id;

  INSERT INTO public.admin_school_deployment_events (
    admin_user_id,
    school_id,
    school_code,
    action,
    stage,
    result
  ) VALUES (
    v_admin_user_id,
    v_school_id,
    v_school_code,
    'school_created',
    'em_configuracao',
    'created'
  );

  RETURN jsonb_build_object(
    'ok', true,
    'school_id', v_school_id,
    'installation_id', v_installation_id,
    'school_code', v_school_code,
    'school_year', v_school_year,
    'status', 'inactive',
    'stage', 'em_configuracao'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_create_school(text, text, text, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_create_school(text, text, text, text, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_create_school(text, text, text, text, text, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_school(text, text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.admin_create_school(text, text, text, text, text, text, text) IS
  'Admin/TI controlled school creation. Requires active admin profile and creates inactive school plus deployment state and audit event. No secrets.';
