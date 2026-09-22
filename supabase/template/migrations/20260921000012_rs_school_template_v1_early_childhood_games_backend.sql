-- RS-SCHOOL-TEMPLATE V1 - Early Childhood canonical games backend
-- Scope: local contract for Raizes Crescer games.
-- Do not apply to PILOT without explicit authorization.
-- Does not change XP, medals, achievements, mobile, or Storage objects.

CREATE TABLE IF NOT EXISTS public.student_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text NOT NULL,
  title text NOT NULL,
  description text,
  student_instruction text,
  segment text NOT NULL DEFAULT 'educacao_infantil',
  age_group text,
  school_year text,
  game_type text NOT NULL,
  engine text NOT NULL DEFAULT 'game-engine.js',
  entrypoint text,
  orientation text NOT NULL DEFAULT 'portrait',
  bncc_codes text[] NOT NULL DEFAULT '{}'::text[],
  bncc_skills text[] NOT NULL DEFAULT '{}'::text[],
  pedagogical_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  asset_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_candidate jsonb NOT NULL DEFAULT '{}'::jsonb,
  related_content jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'draft',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_games_legacy_id_not_blank CHECK (length(btrim(legacy_id)) > 0),
  CONSTRAINT student_games_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT student_games_orientation_check CHECK (orientation IN ('portrait', 'landscape', 'any')),
  CONSTRAINT student_games_no_secret_check CHECK (
    legacy_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(entrypoint, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND pedagogical_metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND engine_config::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND asset_manifest::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND completion_rule::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND score_rule::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND result_schema::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND reward_candidate::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND related_content::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_games_legacy_id_uidx
  ON public.student_games (lower(btrim(legacy_id)));

CREATE INDEX IF NOT EXISTS student_games_catalog_idx
  ON public.student_games (segment, age_group, status, active, sort_order);

CREATE TABLE IF NOT EXISTS public.student_game_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES public.student_games(id) ON DELETE CASCADE,
  legacy_id text NOT NULL,
  role text NOT NULL,
  asset_type text NOT NULL,
  title text,
  bucket text,
  storage_path text,
  local_path text,
  mime_type text,
  storage_access text NOT NULL DEFAULT 'local_pending',
  status text NOT NULL DEFAULT 'awaiting_upload',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_game_assets_legacy_id_not_blank CHECK (length(btrim(legacy_id)) > 0),
  CONSTRAINT student_game_assets_type_check CHECK (
    asset_type IN ('image', 'video', 'audio', 'sprite', 'atlas', 'html', 'css', 'js', 'json', 'other')
  ),
  CONSTRAINT student_game_assets_access_check CHECK (
    storage_access IN ('private', 'public', 'local_pending', 'generated')
  ),
  CONSTRAINT student_game_assets_status_check CHECK (
    status IN ('awaiting_upload', 'ready', 'published', 'missing', 'archived')
  ),
  CONSTRAINT student_game_assets_private_path_check CHECK (
    (storage_access <> 'private')
    OR (bucket IS NOT NULL AND storage_path IS NOT NULL)
  ),
  CONSTRAINT student_game_assets_no_secret_check CHECK (
    legacy_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND role !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(bucket, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(storage_path, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(local_path, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_game_assets_game_legacy_uidx
  ON public.student_game_assets (game_id, lower(btrim(legacy_id)));

CREATE INDEX IF NOT EXISTS student_game_assets_game_role_idx
  ON public.student_game_assets (game_id, role, sort_order);

CREATE TABLE IF NOT EXISTS public.student_game_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES public.student_games(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL,
  status text NOT NULL DEFAULT 'STARTED',
  started_at timestamptz NOT NULL DEFAULT now(),
  last_event_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  client_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  canonical_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  score_percent integer,
  duration_seconds integer,
  result_event_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_game_attempts_attempt_number_check CHECK (attempt_number > 0),
  CONSTRAINT student_game_attempts_status_check CHECK (
    status IN ('STARTED', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'ABANDONED')
  ),
  CONSTRAINT student_game_attempts_score_check CHECK (
    score_percent IS NULL OR (score_percent >= 0 AND score_percent <= 100)
  ),
  CONSTRAINT student_game_attempts_duration_check CHECK (
    duration_seconds IS NULL OR duration_seconds >= 0
  ),
  CONSTRAINT student_game_attempts_completed_at_check CHECK (
    (status = 'COMPLETED' AND completed_at IS NOT NULL)
    OR (status <> 'COMPLETED')
  ),
  CONSTRAINT student_game_attempts_no_secret_check CHECK (
    client_state::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND raw_result::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND canonical_result::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(result_event_key, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_game_attempts_student_game_attempt_uidx
  ON public.student_game_attempts (student_id, game_id, attempt_number);

CREATE INDEX IF NOT EXISTS student_game_attempts_student_game_idx
  ON public.student_game_attempts (student_id, game_id, updated_at DESC);

DROP TRIGGER IF EXISTS student_games_touch_updated_at ON public.student_games;
CREATE TRIGGER student_games_touch_updated_at
  BEFORE UPDATE ON public.student_games
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS student_game_assets_touch_updated_at ON public.student_game_assets;
CREATE TRIGGER student_game_assets_touch_updated_at
  BEFORE UPDATE ON public.student_game_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS student_game_attempts_touch_updated_at ON public.student_game_attempts;
CREATE TRIGGER student_game_attempts_touch_updated_at
  BEFORE UPDATE ON public.student_game_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE OR REPLACE FUNCTION public.student_can_read_game(p_game_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.student_games g
      JOIN public.current_early_childhood_student_context() ctx ON true
      WHERE g.id = p_game_id
        AND g.active = true
        AND g.status = 'published'
        AND public.is_content_available_for_school(ctx.school_id, 'game', g.legacy_id)
        AND (
          g.segment IS NULL
          OR g.segment = 'educacao_infantil'
        )
        AND (
          g.age_group IS NULL
          OR ctx.age_group IS NULL
          OR lower(g.age_group) = lower(ctx.age_group)
          OR lower(g.age_group) = lower(replace(ctx.age_group, ' ', ''))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.student_game_next_attempt_number(
  p_student_id uuid,
  p_game_id uuid
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT COALESCE(MAX(a.attempt_number), 0) + 1
  FROM public.student_game_attempts a
  WHERE a.student_id = p_student_id
    AND a.game_id = p_game_id;
$$;

CREATE OR REPLACE FUNCTION public.student_game_canonical_result(
  p_game public.student_games,
  p_raw_result jsonb,
  p_client_state jsonb,
  p_complete boolean
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_raw jsonb := COALESCE(p_raw_result, '{}'::jsonb);
  v_state jsonb := COALESCE(p_client_state, '{}'::jsonb);
  v_rule jsonb := COALESCE(p_game.score_rule, '{}'::jsonb);
  v_max_score integer := LEAST(GREATEST(COALESCE((v_rule->>'max_score')::integer, 100), 0), 100);
  v_reported_score integer := NULL;
  v_score integer := NULL;
  v_duration integer := NULL;
  v_event_key text;
BEGIN
  IF v_raw::text ~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
     OR v_state::text ~* '(password|senha|token|secret|service_role|access_token|refresh_token)' THEN
    RAISE EXCEPTION 'Resultado do jogo contem termo sensivel.' USING errcode = '22023';
  END IF;

  IF jsonb_typeof(v_raw) <> 'object' OR jsonb_typeof(v_state) <> 'object' THEN
    RAISE EXCEPTION 'Resultado do jogo deve ser objeto JSON.' USING errcode = '22023';
  END IF;

  IF v_raw ? 'score' THEN
    v_reported_score := LEAST(GREATEST(COALESCE((v_raw->>'score')::integer, 0), 0), 100);
  ELSIF v_raw ? 'score_percent' THEN
    v_reported_score := LEAST(GREATEST(COALESCE((v_raw->>'score_percent')::integer, 0), 0), 100);
  END IF;

  IF p_complete THEN
    v_score := LEAST(COALESCE(v_reported_score, v_max_score), v_max_score);
  END IF;

  IF v_raw ? 'duration_seconds' THEN
    v_duration := LEAST(GREATEST(COALESCE((v_raw->>'duration_seconds')::integer, 0), 0), 86400);
  END IF;

  v_event_key := COALESCE(NULLIF(v_raw->>'event_key', ''), 'GAME_COMPLETED:' || p_game.legacy_id || ':ATTEMPT_SCOPED');

  RETURN jsonb_build_object(
    'game_id', p_game.id,
    'legacy_id', p_game.legacy_id,
    'status', CASE WHEN p_complete THEN 'COMPLETED' ELSE 'IN_PROGRESS' END,
    'score_percent', v_score,
    'duration_seconds', v_duration,
    'result_event_type', CASE WHEN p_complete THEN 'GAME_COMPLETED' ELSE NULL END,
    'result_event_key', CASE WHEN p_complete THEN v_event_key ELSE NULL END,
    'trust_strategy', COALESCE(v_rule->>'trust_strategy', 'server_bounded_client_events'),
    'raw_client_score_accepted', false,
    'xp_write', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.student_get_games()
RETURNS TABLE (
  id uuid,
  legacy_id text,
  title text,
  description text,
  student_instruction text,
  game_type text,
  engine text,
  entrypoint text,
  orientation text,
  segment text,
  age_group text,
  bncc_codes text[],
  sort_order integer,
  duration_seconds integer,
  latest_attempt_status text,
  latest_score_percent integer,
  latest_completed_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    g.id,
    g.legacy_id,
    g.title,
    g.description,
    g.student_instruction,
    g.game_type,
    g.engine,
    g.entrypoint,
    g.orientation,
    g.segment,
    g.age_group,
    g.bncc_codes,
    g.sort_order,
    g.duration_seconds,
    latest.status AS latest_attempt_status,
    latest.score_percent AS latest_score_percent,
    latest.completed_at AS latest_completed_at,
    COALESCE(latest.updated_at, g.updated_at) AS updated_at
  FROM public.current_early_childhood_student_context() ctx
  JOIN public.student_games g ON true
  LEFT JOIN LATERAL (
    SELECT a.status, a.score_percent, a.completed_at, a.updated_at
    FROM public.student_game_attempts a
    WHERE a.student_id = ctx.student_id
      AND a.game_id = g.id
    ORDER BY a.updated_at DESC
    LIMIT 1
  ) latest ON true
  WHERE g.active = true
    AND g.status = 'published'
    AND public.is_content_available_for_school(ctx.school_id, 'game', g.legacy_id)
    AND (
      g.age_group IS NULL
      OR ctx.age_group IS NULL
      OR lower(g.age_group) = lower(ctx.age_group)
      OR lower(g.age_group) = lower(replace(ctx.age_group, ' ', ''))
    )
  ORDER BY g.sort_order, g.title;
$$;

CREATE OR REPLACE FUNCTION public.student_get_game(p_game_id uuid)
RETURNS TABLE (
  id uuid,
  legacy_id text,
  title text,
  description text,
  student_instruction text,
  game_type text,
  engine text,
  entrypoint text,
  orientation text,
  segment text,
  age_group text,
  bncc_codes text[],
  bncc_skills text[],
  pedagogical_metadata jsonb,
  engine_config jsonb,
  asset_manifest jsonb,
  assets jsonb,
  completion_rule jsonb,
  score_rule jsonb,
  result_schema jsonb,
  reward_candidate jsonb,
  related_content jsonb,
  latest_attempt jsonb,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    g.id,
    g.legacy_id,
    g.title,
    g.description,
    g.student_instruction,
    g.game_type,
    g.engine,
    g.entrypoint,
    g.orientation,
    g.segment,
    g.age_group,
    g.bncc_codes,
    g.bncc_skills,
    g.pedagogical_metadata,
    g.engine_config,
    g.asset_manifest,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'legacy_id', a.legacy_id,
            'role', a.role,
            'asset_type', a.asset_type,
            'title', a.title,
            'mime_type', a.mime_type,
            'storage_access', a.storage_access,
            'status', a.status,
            'metadata', a.metadata
          )
          ORDER BY a.sort_order, a.legacy_id
        )
        FROM public.student_game_assets a
        WHERE a.game_id = g.id
      ),
      '[]'::jsonb
    ) AS assets,
    g.completion_rule,
    g.score_rule,
    g.result_schema,
    g.reward_candidate,
    g.related_content,
    COALESCE(
      (
        SELECT jsonb_build_object(
          'id', a.id,
          'attempt_number', a.attempt_number,
          'status', a.status,
          'score_percent', a.score_percent,
          'duration_seconds', a.duration_seconds,
          'started_at', a.started_at,
          'completed_at', a.completed_at,
          'canonical_result', a.canonical_result
        )
        FROM public.current_early_childhood_student_context() ctx
        JOIN public.student_game_attempts a
          ON a.student_id = ctx.student_id
         AND a.game_id = g.id
        ORDER BY a.updated_at DESC
        LIMIT 1
      ),
      '{}'::jsonb
    ) AS latest_attempt,
    g.updated_at
  FROM public.student_games g
  WHERE g.id = p_game_id
    AND public.student_can_read_game(g.id);
$$;

CREATE OR REPLACE FUNCTION public.student_start_game_attempt(p_game_id uuid)
RETURNS TABLE (
  attempt_id uuid,
  game_id uuid,
  attempt_number integer,
  status text,
  started_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_attempt public.student_game_attempts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  IF NOT public.student_can_read_game(p_game_id) THEN
    RAISE EXCEPTION 'Jogo nao autorizado para este aluno.' USING errcode = '42501';
  END IF;

  SELECT ctx.student_id INTO v_student_id
  FROM public.current_early_childhood_student_context() ctx
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

  SELECT *
    INTO v_attempt
  FROM public.student_game_attempts a
  WHERE a.student_id = v_student_id
    AND a.game_id = p_game_id
    AND a.status IN ('STARTED', 'IN_PROGRESS', 'PAUSED')
  ORDER BY a.updated_at DESC
  LIMIT 1;

  IF v_attempt.id IS NULL THEN
    INSERT INTO public.student_game_attempts (
      student_id,
      game_id,
      attempt_number,
      status,
      started_at,
      last_event_at
    )
    VALUES (
      v_student_id,
      p_game_id,
      public.student_game_next_attempt_number(v_student_id, p_game_id),
      'STARTED',
      now(),
      now()
    )
    RETURNING * INTO v_attempt;
  END IF;

  RETURN QUERY
  SELECT
    v_attempt.id,
    v_attempt.game_id,
    v_attempt.attempt_number,
    v_attempt.status,
    v_attempt.started_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_update_game_attempt(
  p_attempt_id uuid,
  p_status text DEFAULT 'IN_PROGRESS',
  p_client_state jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  attempt_id uuid,
  game_id uuid,
  status text,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_status text := upper(btrim(coalesce(p_status, 'IN_PROGRESS')));
  v_attempt public.student_game_attempts;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  IF v_status NOT IN ('IN_PROGRESS', 'PAUSED', 'ABANDONED') THEN
    RAISE EXCEPTION 'Status de tentativa invalido.' USING errcode = '22023';
  END IF;

  IF COALESCE(p_client_state, '{}'::jsonb)::text ~* '(password|senha|token|secret|service_role|access_token|refresh_token)' THEN
    RAISE EXCEPTION 'Estado do jogo contem termo sensivel.' USING errcode = '22023';
  END IF;

  SELECT ctx.student_id INTO v_student_id
  FROM public.current_early_childhood_student_context() ctx
  LIMIT 1;

  SELECT *
    INTO v_attempt
  FROM public.student_game_attempts a
  WHERE a.id = p_attempt_id
    AND a.student_id = v_student_id
  LIMIT 1;

  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Tentativa nao encontrada para este aluno.' USING errcode = '42501';
  END IF;

  IF v_attempt.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Tentativa ja concluida.' USING errcode = '22023';
  END IF;

  IF NOT public.student_can_read_game(v_attempt.game_id) THEN
    RAISE EXCEPTION 'Jogo nao autorizado para este aluno.' USING errcode = '42501';
  END IF;

  UPDATE public.student_game_attempts
     SET status = v_status,
         client_state = COALESCE(p_client_state, '{}'::jsonb),
         last_event_at = now(),
         updated_at = now()
   WHERE id = v_attempt.id
   RETURNING * INTO v_attempt;

  RETURN QUERY
  SELECT
    v_attempt.id,
    v_attempt.game_id,
    v_attempt.status,
    v_attempt.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_complete_game_attempt(
  p_attempt_id uuid,
  p_raw_result jsonb DEFAULT '{}'::jsonb,
  p_client_state jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  attempt_id uuid,
  game_id uuid,
  status text,
  score_percent integer,
  duration_seconds integer,
  canonical_result jsonb,
  result_event_type text,
  result_event_key text,
  completed_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_attempt public.student_game_attempts;
  v_game public.student_games;
  v_result jsonb;
  v_score integer;
  v_duration integer;
  v_event_key text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  SELECT ctx.student_id INTO v_student_id
  FROM public.current_early_childhood_student_context() ctx
  LIMIT 1;

  SELECT *
    INTO v_attempt
  FROM public.student_game_attempts a
  WHERE a.id = p_attempt_id
    AND a.student_id = v_student_id
  LIMIT 1;

  IF v_attempt.id IS NULL THEN
    RAISE EXCEPTION 'Tentativa nao encontrada para este aluno.' USING errcode = '42501';
  END IF;

  SELECT *
    INTO v_game
  FROM public.student_games g
  WHERE g.id = v_attempt.game_id;

  IF v_game.id IS NULL OR NOT public.student_can_read_game(v_game.id) THEN
    RAISE EXCEPTION 'Jogo nao autorizado para este aluno.' USING errcode = '42501';
  END IF;

  IF v_attempt.status = 'COMPLETED' THEN
    RETURN QUERY
    SELECT
      v_attempt.id,
      v_attempt.game_id,
      v_attempt.status,
      v_attempt.score_percent,
      v_attempt.duration_seconds,
      v_attempt.canonical_result,
      v_attempt.canonical_result->>'result_event_type',
      v_attempt.result_event_key,
      v_attempt.completed_at;
    RETURN;
  END IF;

  v_result := public.student_game_canonical_result(v_game, p_raw_result, p_client_state, true);
  v_score := NULLIF(v_result->>'score_percent', '')::integer;
  v_duration := NULLIF(v_result->>'duration_seconds', '')::integer;
  v_event_key := v_result->>'result_event_key';

  UPDATE public.student_game_attempts
     SET status = 'COMPLETED',
         client_state = COALESCE(p_client_state, '{}'::jsonb),
         raw_result = COALESCE(p_raw_result, '{}'::jsonb),
         canonical_result = v_result,
         score_percent = v_score,
         duration_seconds = v_duration,
         result_event_key = v_event_key,
         completed_at = now(),
         last_event_at = now(),
         updated_at = now()
   WHERE id = v_attempt.id
   RETURNING * INTO v_attempt;

  RETURN QUERY
  SELECT
    v_attempt.id,
    v_attempt.game_id,
    v_attempt.status,
    v_attempt.score_percent,
    v_attempt.duration_seconds,
    v_attempt.canonical_result,
    v_attempt.canonical_result->>'result_event_type',
    v_attempt.result_event_key,
    v_attempt.completed_at;
END;
$$;

ALTER TABLE public.student_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_game_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_game_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_games_select_authorized_student ON public.student_games;
CREATE POLICY student_games_select_authorized_student
  ON public.student_games
  FOR SELECT
  TO authenticated
  USING (public.student_can_read_game(id));

DROP POLICY IF EXISTS student_game_assets_select_authorized_student ON public.student_game_assets;
CREATE POLICY student_game_assets_select_authorized_student
  ON public.student_game_assets
  FOR SELECT
  TO authenticated
  USING (public.student_can_read_game(game_id));

DROP POLICY IF EXISTS student_game_attempts_select_own ON public.student_game_attempts;
CREATE POLICY student_game_attempts_select_own
  ON public.student_game_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_game_attempts.student_id
    )
  );

DROP POLICY IF EXISTS student_game_attempts_insert_own ON public.student_game_attempts;
CREATE POLICY student_game_attempts_insert_own
  ON public.student_game_attempts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.student_can_read_game(game_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_game_attempts.student_id
    )
  );

DROP POLICY IF EXISTS student_game_attempts_update_own ON public.student_game_attempts;
CREATE POLICY student_game_attempts_update_own
  ON public.student_game_attempts
  FOR UPDATE
  TO authenticated
  USING (
    public.student_can_read_game(game_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_game_attempts.student_id
    )
  )
  WITH CHECK (
    public.student_can_read_game(game_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_game_attempts.student_id
    )
  );

REVOKE ALL ON TABLE public.student_games FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.student_game_assets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.student_game_attempts FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.student_can_read_game(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_game_next_attempt_number(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_game_canonical_result(public.student_games, jsonb, jsonb, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_games() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_game(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_start_game_attempt(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_update_game_attempt(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_complete_game_attempt(uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.student_get_games() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_start_game_attempt(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_update_game_attempt(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_complete_game_attempt(uuid, jsonb, jsonb) TO authenticated;

INSERT INTO public.student_games (
  id,
  legacy_id,
  title,
  description,
  student_instruction,
  segment,
  age_group,
  school_year,
  game_type,
  engine,
  entrypoint,
  orientation,
  bncc_codes,
  pedagogical_metadata,
  engine_config,
  asset_manifest,
  completion_rule,
  score_rule,
  result_schema,
  reward_candidate,
  related_content,
  sort_order,
  duration_seconds,
  status,
  active
)
VALUES
  (
    '02e10000-0000-4000-8000-000000000001',
    'RS-EI-GAME-ORGANIZANDO-CESTA',
    'Organizando a Cesta',
    'Jogo de organizacao e classificacao de frutas em cestos.',
    'Observe as frutas e coloque cada uma no cesto correto.',
    'educacao_infantil',
    NULL,
    NULL,
    'drag_drop_classification',
    'game-engine.js',
    'jogos.html?game=organizando-cesta',
    'landscape',
    '{}'::text[],
    jsonb_build_object(
      'legacy_engine_id', 'organizando-cesta',
      'category', 'Matematica',
      'scenario', 'Jardim das Descobertas',
      'character', 'Bia',
      'mascot', 'Pipo e Tico',
      'bncc_status', 'absent_in_legacy_audit'
    ),
    jsonb_build_object(
      'engine_id', 'organizando-cesta',
      'engine_source', 'game-engine.js',
      'local_storage_key_legacy', 'raizes:game-progress:v1',
      'client_responsibility', 'interaction_only'
    ),
    jsonb_build_object(
      'physical_inventory_count', 126,
      'declared_roots', jsonb_build_array('assets/games/organizando-cesta', 'assets/game-engine-2/assets/organizando-cesta'),
      'ingestion_status', 'local_pending',
      'audit_strategy', 'declared_vs_used_before_storage_ingestion'
    ),
    jsonb_build_object(
      'type', 'all_required_classifications',
      'required_groups', jsonb_build_array('apple', 'banana', 'grape'),
      'minimum_completed_groups', 3
    ),
    jsonb_build_object(
      'trust_strategy', 'server_bounded_client_events',
      'max_score', 100,
      'client_score_trusted', false,
      'accepted_metrics', jsonb_build_array('completed_groups', 'attempts', 'duration_seconds')
    ),
    jsonb_build_object(
      'raw_client_event', 'stored_for_audit',
      'canonical_result', jsonb_build_array('status', 'score_percent', 'duration_seconds', 'result_event_key')
    ),
    jsonb_build_object(
      'future_event_type', 'GAME_COMPLETED',
      'xp_write_now', false,
      'legacy_xp_hint', 20,
      'legacy_medal_hint', 'Pequeno Organizador'
    ),
    '[]'::jsonb,
    20,
    NULL,
    'published',
    true
  ),
  (
    '02e10000-0000-4000-8000-000000000002',
    'RS-EI-GAME-JARDIM-DESCOBERTAS',
    'O Jardim das Descobertas',
    'Jogo de exploracao visual para encontrar elementos do jardim.',
    'Explore o jardim e encontre os elementos indicados.',
    'educacao_infantil',
    NULL,
    NULL,
    'find_objects',
    'game-engine.js',
    'jogos.html?game=jardim-descobertas',
    'landscape',
    '{}'::text[],
    jsonb_build_object(
      'legacy_engine_id', 'jardim-descobertas',
      'category', 'Exploracao',
      'scenario', 'Jardim das Descobertas',
      'character', 'Bia',
      'mascot', 'Pipo e Tito',
      'bncc_status', 'absent_in_legacy_audit'
    ),
    jsonb_build_object(
      'engine_id', 'jardim-descobertas',
      'engine_source', 'game-engine.js',
      'local_storage_key_legacy', 'raizes:game-progress:v1',
      'client_responsibility', 'interaction_only'
    ),
    jsonb_build_object(
      'physical_inventory_count', 10,
      'declared_roots', jsonb_build_array('assets/games/jardim-descobertas'),
      'ingestion_status', 'local_pending',
      'audit_strategy', 'declared_vs_used_before_storage_ingestion'
    ),
    jsonb_build_object(
      'type', 'find_all_rounds',
      'required_rounds', jsonb_build_array('folha', 'flor', 'caracol', 'gotinha'),
      'minimum_completed_rounds', 4
    ),
    jsonb_build_object(
      'trust_strategy', 'server_bounded_client_events',
      'max_score', 100,
      'client_score_trusted', false,
      'accepted_metrics', jsonb_build_array('completed_rounds', 'attempts', 'duration_seconds')
    ),
    jsonb_build_object(
      'raw_client_event', 'stored_for_audit',
      'canonical_result', jsonb_build_array('status', 'score_percent', 'duration_seconds', 'result_event_key')
    ),
    jsonb_build_object(
      'future_event_type', 'GAME_COMPLETED',
      'xp_write_now', false,
      'legacy_xp_hint', 20,
      'legacy_medal_hint', 'Pequeno Observador'
    ),
    '[]'::jsonb,
    30,
    NULL,
    'published',
    true
  ),
  (
    '02e10000-0000-4000-8000-000000000003',
    'RS-EI-GAME-ATELIE-BIA',
    'O Atelie da Bia',
    'Jogo criativo de pintura guiada com personagens do jardim.',
    'Escolha, pinte e complete sua criacao com cuidado.',
    'educacao_infantil',
    NULL,
    NULL,
    'guided_painting',
    'game-engine.js',
    'jogos.html?game=atelie-bia',
    'landscape',
    '{}'::text[],
    jsonb_build_object(
      'legacy_engine_id', 'atelie-bia',
      'category', 'Criatividade',
      'scenario', 'Atelie de Artes',
      'character', 'Bia',
      'mascot', 'Pipo',
      'bncc_status', 'absent_in_legacy_audit'
    ),
    jsonb_build_object(
      'engine_id', 'atelie-bia',
      'engine_source', 'game-engine.js',
      'local_storage_key_legacy', 'raizes:game-progress:v1',
      'client_responsibility', 'interaction_only'
    ),
    jsonb_build_object(
      'physical_inventory_count', 83,
      'declared_roots', jsonb_build_array('assets/games/atelie-bia'),
      'ingestion_status', 'local_pending',
      'audit_strategy', 'declared_vs_used_before_storage_ingestion'
    ),
    jsonb_build_object(
      'type', 'guided_painting_steps',
      'required_steps', jsonb_build_array('cabeca', 'corpo-pernas', 'asas', 'pintinhas', 'antenas'),
      'minimum_completed_steps', 5
    ),
    jsonb_build_object(
      'trust_strategy', 'server_bounded_client_events',
      'max_score', 100,
      'client_score_trusted', false,
      'accepted_metrics', jsonb_build_array('completed_steps', 'coverage', 'duration_seconds')
    ),
    jsonb_build_object(
      'raw_client_event', 'stored_for_audit',
      'canonical_result', jsonb_build_array('status', 'score_percent', 'duration_seconds', 'result_event_key')
    ),
    jsonb_build_object(
      'future_event_type', 'GAME_COMPLETED',
      'xp_write_now', false,
      'legacy_xp_hint', 20,
      'legacy_medal_hint', 'Pequeno Artista da Natureza'
    ),
    '[]'::jsonb,
    40,
    NULL,
    'published',
    true
  )
ON CONFLICT ((lower(btrim(legacy_id))))
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  student_instruction = EXCLUDED.student_instruction,
  game_type = EXCLUDED.game_type,
  engine = EXCLUDED.engine,
  entrypoint = EXCLUDED.entrypoint,
  orientation = EXCLUDED.orientation,
  pedagogical_metadata = EXCLUDED.pedagogical_metadata,
  engine_config = EXCLUDED.engine_config,
  asset_manifest = EXCLUDED.asset_manifest,
  completion_rule = EXCLUDED.completion_rule,
  score_rule = EXCLUDED.score_rule,
  result_schema = EXCLUDED.result_schema,
  reward_candidate = EXCLUDED.reward_candidate,
  related_content = EXCLUDED.related_content,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.student_game_assets (
  game_id,
  legacy_id,
  role,
  asset_type,
  title,
  local_path,
  mime_type,
  storage_access,
  status,
  metadata,
  sort_order
)
SELECT g.id, asset.legacy_id, asset.role, asset.asset_type, asset.title, asset.local_path, asset.mime_type,
       'local_pending', 'awaiting_upload', asset.metadata, asset.sort_order
FROM public.student_games g
JOIN (
  VALUES
    ('RS-EI-GAME-ORGANIZANDO-CESTA', 'RS-EI-GAME-ORGANIZANDO-CESTA-ENTRYPOINT', 'entrypoint', 'html', 'Entrypoint Organizando a Cesta', 'jogos.html?game=organizando-cesta', 'text/html', jsonb_build_object('used_by_engine', true), 10),
    ('RS-EI-GAME-ORGANIZANDO-CESTA', 'RS-EI-GAME-ORGANIZANDO-CESTA-CARD', 'card', 'image', 'Card Organizando a Cesta', 'assets/game-engine-2/assets/organizando-cesta/custom/intro-banner.png', 'image/png', jsonb_build_object('used_by_engine', true), 20),
    ('RS-EI-GAME-ORGANIZANDO-CESTA', 'RS-EI-GAME-ORGANIZANDO-CESTA-ATLAS', 'atlas', 'image', 'Atlas Organizando a Cesta', 'assets/game-engine-2/assets/organizando-cesta/custom/interaction-board-fruit-top-basket-bottom.png', 'image/png', jsonb_build_object('used_by_engine', true), 30),
    ('RS-EI-GAME-JARDIM-DESCOBERTAS', 'RS-EI-GAME-JARDIM-DESCOBERTAS-ENTRYPOINT', 'entrypoint', 'html', 'Entrypoint Jardim das Descobertas', 'jogos.html?game=jardim-descobertas', 'text/html', jsonb_build_object('used_by_engine', true), 10),
    ('RS-EI-GAME-JARDIM-DESCOBERTAS', 'RS-EI-GAME-JARDIM-DESCOBERTAS-CARD', 'card', 'image', 'Card Jardim das Descobertas', 'assets/games/jardim-descobertas/screens/screen-intro.png', 'image/png', jsonb_build_object('used_by_engine', true), 20),
    ('RS-EI-GAME-JARDIM-DESCOBERTAS', 'RS-EI-GAME-JARDIM-DESCOBERTAS-ATLAS', 'atlas', 'image', 'Atlas Jardim das Descobertas', 'assets/games/jardim-descobertas/atlas.png', 'image/png', jsonb_build_object('used_by_engine', true), 30),
    ('RS-EI-GAME-ATELIE-BIA', 'RS-EI-GAME-ATELIE-BIA-ENTRYPOINT', 'entrypoint', 'html', 'Entrypoint Atelie da Bia', 'jogos.html?game=atelie-bia', 'text/html', jsonb_build_object('used_by_engine', true), 10),
    ('RS-EI-GAME-ATELIE-BIA', 'RS-EI-GAME-ATELIE-BIA-CARD', 'card', 'image', 'Card Atelie da Bia', 'assets/games/atelie-bia/screens/screen-intro.png', 'image/png', jsonb_build_object('used_by_engine', true), 20),
    ('RS-EI-GAME-ATELIE-BIA', 'RS-EI-GAME-ATELIE-BIA-ATLAS', 'atlas', 'image', 'Atlas Atelie da Bia', 'assets/games/atelie-bia/atlas.png', 'image/png', jsonb_build_object('used_by_engine', true), 30)
) AS asset(game_legacy_id, legacy_id, role, asset_type, title, local_path, mime_type, metadata, sort_order)
  ON asset.game_legacy_id = g.legacy_id
ON CONFLICT (game_id, (lower(btrim(legacy_id))))
DO UPDATE SET
  role = EXCLUDED.role,
  asset_type = EXCLUDED.asset_type,
  title = EXCLUDED.title,
  local_path = EXCLUDED.local_path,
  mime_type = EXCLUDED.mime_type,
  storage_access = EXCLUDED.storage_access,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

INSERT INTO public.school_content_availability (
  school_id,
  content_type,
  content_id,
  status,
  available_from
)
SELECT DISTINCT
  sca.school_id,
  'game',
  g.legacy_id,
  'available',
  COALESCE(sca.available_from, now())
FROM public.student_games g
JOIN public.school_content_availability sca
  ON sca.content_type = 'game'
 AND sca.content_id IN ('caixa-misteriosa', 'jardim-descobertas')
 AND sca.deleted_at IS NULL
WHERE g.legacy_id IN ('RS-EI-GAME-ORGANIZANDO-CESTA', 'RS-EI-GAME-JARDIM-DESCOBERTAS', 'RS-EI-GAME-ATELIE-BIA')
ON CONFLICT DO NOTHING;
