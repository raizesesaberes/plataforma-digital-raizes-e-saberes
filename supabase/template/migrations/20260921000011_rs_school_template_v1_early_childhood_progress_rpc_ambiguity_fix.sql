-- RS-SCHOOL-TEMPLATE V1 - Early childhood progress RPC ambiguity hotfix
-- Scope: fixes only activity/discovery progress RPC writes after 02D.3 mobile smoke.

CREATE OR REPLACE FUNCTION public.student_upsert_activity_progress(
  p_activity_id uuid,
  p_status text DEFAULT 'IN_PROGRESS',
  p_percent_complete integer DEFAULT 0,
  p_progress_data jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  activity_id uuid,
  status text,
  percent_complete integer,
  progress_data jsonb,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_status text := upper(btrim(coalesce(p_status, 'IN_PROGRESS')));
  v_percent integer := least(greatest(coalesce(p_percent_complete, 0), 0), 100);
  v_progress public.student_activity_progress;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  IF v_status NOT IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') THEN
    RAISE EXCEPTION 'Status de progresso invalido.' USING errcode = '22023';
  END IF;

  IF p_progress_data::text ~* '(password|senha|token|secret|service_role|access_token|refresh_token)' THEN
    RAISE EXCEPTION 'progress_data contem termo sensivel.' USING errcode = '22023';
  END IF;

  IF NOT public.student_can_read_activity(p_activity_id) THEN
    RAISE EXCEPTION 'Atividade nao autorizada para este aluno.' USING errcode = '42501';
  END IF;

  SELECT ctx.student_id
    INTO v_student_id
  FROM public.current_early_childhood_student_context() ctx
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

  UPDATE public.student_activity_progress sap
     SET status = v_status,
         percent_complete = CASE WHEN v_status = 'COMPLETED' THEN 100 ELSE v_percent END,
         progress_data = COALESCE(p_progress_data, '{}'::jsonb),
         started_at = CASE
           WHEN v_status <> 'NOT_STARTED' THEN COALESCE(sap.started_at, now())
           ELSE NULL
         END,
         completed_at = CASE
           WHEN v_status = 'COMPLETED' THEN COALESCE(sap.completed_at, now())
           ELSE NULL
         END,
         updated_at = now()
   WHERE sap.student_id = v_student_id
     AND sap.activity_id = p_activity_id
   RETURNING sap.*
    INTO v_progress;

  IF NOT FOUND THEN
    INSERT INTO public.student_activity_progress (
      student_id,
      activity_id,
      status,
      percent_complete,
      progress_data,
      started_at,
      completed_at,
      updated_at
    )
    VALUES (
      v_student_id,
      p_activity_id,
      v_status,
      CASE WHEN v_status = 'COMPLETED' THEN 100 ELSE v_percent END,
      COALESCE(p_progress_data, '{}'::jsonb),
      CASE WHEN v_status <> 'NOT_STARTED' THEN now() ELSE NULL END,
      CASE WHEN v_status = 'COMPLETED' THEN now() ELSE NULL END,
      now()
    )
    RETURNING public.student_activity_progress.*
      INTO v_progress;
  END IF;

  RETURN QUERY
  SELECT
    v_progress.activity_id,
    v_progress.status,
    v_progress.percent_complete,
    v_progress.progress_data,
    v_progress.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_upsert_discovery_progress(
  p_discovery_id uuid,
  p_status text DEFAULT 'IN_PROGRESS',
  p_discovered_hotspots jsonb DEFAULT '[]'::jsonb,
  p_progress_data jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  discovery_id uuid,
  status text,
  discovered_hotspots jsonb,
  progress_data jsonb,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_status text := upper(btrim(coalesce(p_status, 'IN_PROGRESS')));
  v_progress public.student_discovery_progress;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  IF v_status NOT IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED') THEN
    RAISE EXCEPTION 'Status de progresso invalido.' USING errcode = '22023';
  END IF;

  IF p_discovered_hotspots::text ~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
     OR p_progress_data::text ~* '(password|senha|token|secret|service_role|access_token|refresh_token)' THEN
    RAISE EXCEPTION 'Dados de progresso contem termo sensivel.' USING errcode = '22023';
  END IF;

  IF NOT public.student_can_read_discovery(p_discovery_id) THEN
    RAISE EXCEPTION 'Descoberta nao autorizada para este aluno.' USING errcode = '42501';
  END IF;

  SELECT ctx.student_id
    INTO v_student_id
  FROM public.current_early_childhood_student_context() ctx
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

  UPDATE public.student_discovery_progress sdp
     SET status = v_status,
         discovered_hotspots = COALESCE(p_discovered_hotspots, '[]'::jsonb),
         progress_data = COALESCE(p_progress_data, '{}'::jsonb),
         started_at = CASE
           WHEN v_status <> 'NOT_STARTED' THEN COALESCE(sdp.started_at, now())
           ELSE NULL
         END,
         completed_at = CASE
           WHEN v_status = 'COMPLETED' THEN COALESCE(sdp.completed_at, now())
           ELSE NULL
         END,
         updated_at = now()
   WHERE sdp.student_id = v_student_id
     AND sdp.discovery_id = p_discovery_id
   RETURNING sdp.*
    INTO v_progress;

  IF NOT FOUND THEN
    INSERT INTO public.student_discovery_progress (
      student_id,
      discovery_id,
      status,
      discovered_hotspots,
      progress_data,
      started_at,
      completed_at,
      updated_at
    )
    VALUES (
      v_student_id,
      p_discovery_id,
      v_status,
      COALESCE(p_discovered_hotspots, '[]'::jsonb),
      COALESCE(p_progress_data, '{}'::jsonb),
      CASE WHEN v_status <> 'NOT_STARTED' THEN now() ELSE NULL END,
      CASE WHEN v_status = 'COMPLETED' THEN now() ELSE NULL END,
      now()
    )
    RETURNING public.student_discovery_progress.*
      INTO v_progress;
  END IF;

  RETURN QUERY
  SELECT
    v_progress.discovery_id,
    v_progress.status,
    v_progress.discovered_hotspots,
    v_progress.progress_data,
    v_progress.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.student_upsert_activity_progress(uuid, text, integer, jsonb)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.student_upsert_discovery_progress(uuid, text, jsonb, jsonb)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.student_upsert_activity_progress(uuid, text, integer, jsonb)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.student_upsert_discovery_progress(uuid, text, jsonb, jsonb)
  TO authenticated, service_role;
