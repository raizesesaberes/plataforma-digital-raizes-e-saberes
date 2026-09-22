-- RS-SCHOOL-TEMPLATE V1 - Early Childhood canonical content backend
-- Scope: local contract for Raizes Crescer activities and discoveries.
-- Do not expose legacy private paths to clients and do not apply without PILOT authorization.

CREATE TABLE IF NOT EXISTS public.student_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text NOT NULL,
  title text NOT NULL,
  description text,
  student_instruction text,
  segment text NOT NULL DEFAULT 'educacao_infantil',
  age_group text,
  school_year text,
  discovery_type text NOT NULL DEFAULT 'experience',
  book_legacy_id text,
  page_start integer,
  page_end integer,
  unit_code text,
  unit_title text,
  sequence_code text,
  sequence_title text,
  bncc_codes text[] NOT NULL DEFAULT '{}'::text[],
  bncc_skills text[] NOT NULL DEFAULT '{}'::text[],
  experience_fields text[] NOT NULL DEFAULT '{}'::text[],
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  completion_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'draft',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_discoveries_legacy_id_not_blank CHECK (length(btrim(legacy_id)) > 0),
  CONSTRAINT student_discoveries_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT student_discoveries_page_range_check CHECK (
    page_start IS NULL OR page_end IS NULL OR page_end >= page_start
  ),
  CONSTRAINT student_discoveries_no_secret_check CHECK (
    legacy_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND resources::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_discoveries_legacy_id_uidx
  ON public.student_discoveries (lower(btrim(legacy_id)));

CREATE INDEX IF NOT EXISTS student_discoveries_catalog_idx
  ON public.student_discoveries (segment, age_group, status, active, sort_order);

CREATE TABLE IF NOT EXISTS public.student_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text NOT NULL,
  discovery_id uuid REFERENCES public.student_discoveries(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  instruction text,
  narration_text text,
  segment text NOT NULL DEFAULT 'educacao_infantil',
  age_group text,
  school_year text,
  activity_type text NOT NULL,
  book_legacy_id text,
  page_start integer,
  page_end integer,
  unit_code text,
  unit_title text,
  sequence_code text,
  sequence_title text,
  bncc_codes text[] NOT NULL DEFAULT '{}'::text[],
  bncc_skills text[] NOT NULL DEFAULT '{}'::text[],
  asset jsonb NOT NULL DEFAULT '{}'::jsonb,
  engine_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  completion_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'draft',
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_activities_legacy_id_not_blank CHECK (length(btrim(legacy_id)) > 0),
  CONSTRAINT student_activities_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT student_activities_page_range_check CHECK (
    page_start IS NULL OR page_end IS NULL OR page_end >= page_start
  ),
  CONSTRAINT student_activities_no_secret_check CHECK (
    legacy_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND asset::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND engine_metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_activities_legacy_id_uidx
  ON public.student_activities (lower(btrim(legacy_id)));

CREATE INDEX IF NOT EXISTS student_activities_catalog_idx
  ON public.student_activities (segment, age_group, status, active, sort_order);

CREATE INDEX IF NOT EXISTS student_activities_discovery_idx
  ON public.student_activities (discovery_id, sort_order)
  WHERE discovery_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.early_childhood_content_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text NOT NULL,
  asset_type text NOT NULL,
  title text,
  bucket text,
  storage_path text,
  local_path text,
  mime_type text,
  storage_access text NOT NULL DEFAULT 'private',
  status text NOT NULL DEFAULT 'awaiting_upload',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT early_childhood_content_assets_legacy_id_not_blank CHECK (length(btrim(legacy_id)) > 0),
  CONSTRAINT early_childhood_content_assets_type_check CHECK (
    asset_type IN ('video', 'audio', 'image', 'lottie', 'sprite', 'css', 'interactive', 'other')
  ),
  CONSTRAINT early_childhood_content_assets_access_check CHECK (
    storage_access IN ('private', 'public', 'local_pending', 'generated')
  ),
  CONSTRAINT early_childhood_content_assets_status_check CHECK (
    status IN ('awaiting_upload', 'ready', 'published', 'archived')
  ),
  CONSTRAINT early_childhood_content_assets_no_secret_check CHECK (
    legacy_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(bucket, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(storage_path, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(local_path, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS early_childhood_content_assets_legacy_id_uidx
  ON public.early_childhood_content_assets (lower(btrim(legacy_id)));

CREATE TABLE IF NOT EXISTS public.discovery_hotspots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discovery_id uuid NOT NULL REFERENCES public.student_discoveries(id) ON DELETE CASCADE,
  legacy_id text NOT NULL,
  title text,
  description text,
  x_percent numeric(6,3),
  y_percent numeric(6,3),
  width_percent numeric(6,3),
  height_percent numeric(6,3),
  action_type text NOT NULL DEFAULT 'inspect',
  target_type text,
  target_legacy_id text,
  asset_legacy_id text,
  audio_asset_legacy_id text,
  accessibility_label text,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT discovery_hotspots_position_check CHECK (
    (x_percent IS NULL OR (x_percent >= 0 AND x_percent <= 100))
    AND (y_percent IS NULL OR (y_percent >= 0 AND y_percent <= 100))
    AND (width_percent IS NULL OR (width_percent >= 0 AND width_percent <= 100))
    AND (height_percent IS NULL OR (height_percent >= 0 AND height_percent <= 100))
  ),
  CONSTRAINT discovery_hotspots_action_type_check CHECK (
    action_type IN ('inspect', 'open_activity', 'play_audio', 'open_asset', 'complete_hotspot')
  ),
  CONSTRAINT discovery_hotspots_no_secret_check CHECK (
    legacy_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(target_legacy_id, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS discovery_hotspots_legacy_uidx
  ON public.discovery_hotspots (discovery_id, lower(btrim(legacy_id)));

CREATE INDEX IF NOT EXISTS discovery_hotspots_discovery_idx
  ON public.discovery_hotspots (discovery_id, sort_order);

CREATE TABLE IF NOT EXISTS public.student_activity_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.student_activities(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NOT_STARTED',
  percent_complete integer NOT NULL DEFAULT 0,
  progress_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_activity_progress_status_check CHECK (
    status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')
  ),
  CONSTRAINT student_activity_progress_percent_check CHECK (
    percent_complete >= 0 AND percent_complete <= 100
  ),
  CONSTRAINT student_activity_progress_no_secret_check CHECK (
    progress_data::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_activity_progress_student_activity_uidx
  ON public.student_activity_progress (student_id, activity_id);

CREATE TABLE IF NOT EXISTS public.student_discovery_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  discovery_id uuid NOT NULL REFERENCES public.student_discoveries(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'NOT_STARTED',
  discovered_hotspots jsonb NOT NULL DEFAULT '[]'::jsonb,
  progress_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_discovery_progress_status_check CHECK (
    status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')
  ),
  CONSTRAINT student_discovery_progress_no_secret_check CHECK (
    discovered_hotspots::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND progress_data::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_discovery_progress_student_discovery_uidx
  ON public.student_discovery_progress (student_id, discovery_id);

DROP TRIGGER IF EXISTS student_discoveries_touch_updated_at ON public.student_discoveries;
CREATE TRIGGER student_discoveries_touch_updated_at
  BEFORE UPDATE ON public.student_discoveries
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS student_activities_touch_updated_at ON public.student_activities;
CREATE TRIGGER student_activities_touch_updated_at
  BEFORE UPDATE ON public.student_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS early_childhood_content_assets_touch_updated_at ON public.early_childhood_content_assets;
CREATE TRIGGER early_childhood_content_assets_touch_updated_at
  BEFORE UPDATE ON public.early_childhood_content_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS discovery_hotspots_touch_updated_at ON public.discovery_hotspots;
CREATE TRIGGER discovery_hotspots_touch_updated_at
  BEFORE UPDATE ON public.discovery_hotspots
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS student_activity_progress_touch_updated_at ON public.student_activity_progress;
CREATE TRIGGER student_activity_progress_touch_updated_at
  BEFORE UPDATE ON public.student_activity_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS student_discovery_progress_touch_updated_at ON public.student_discovery_progress;
CREATE TRIGGER student_discovery_progress_touch_updated_at
  BEFORE UPDATE ON public.student_discovery_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE OR REPLACE FUNCTION public.current_early_childhood_student_context()
RETURNS TABLE (
  student_id uuid,
  school_id uuid,
  class_id uuid,
  age_group text,
  school_year text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    s.id AS student_id,
    e.school_id,
    e.class_id,
    c.age_group,
    COALESCE(c.school_year, e.school_year) AS school_year
  FROM public.students s
  JOIN public.enrollments e ON e.student_id = s.id
  JOIN public.classes c ON c.id = e.class_id
  WHERE s.user_id = auth.uid()
    AND COALESCE(s.status, 'active') = 'active'
    AND e.status = 'active'
    AND e.enrolled_at <= now()
    AND (e.ended_at IS NULL OR e.ended_at > now())
    AND COALESCE(c.status, 'active') = 'active'
  ORDER BY e.enrolled_at DESC, e.created_at DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.student_can_read_activity(p_activity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.student_activities a
      JOIN public.current_early_childhood_student_context() ctx ON true
      WHERE a.id = p_activity_id
        AND a.active = true
        AND a.status = 'published'
        AND public.is_content_available_for_school(ctx.school_id, 'activity', a.legacy_id)
        AND (
          a.segment IS NULL
          OR a.segment = 'educacao_infantil'
        )
        AND (
          a.age_group IS NULL
          OR ctx.age_group IS NULL
          OR lower(a.age_group) = lower(ctx.age_group)
          OR lower(a.age_group) = lower(replace(ctx.age_group, ' ', ''))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.student_can_read_discovery(p_discovery_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.student_discoveries d
      JOIN public.current_early_childhood_student_context() ctx ON true
      WHERE d.id = p_discovery_id
        AND d.active = true
        AND d.status = 'published'
        AND public.is_content_available_for_school(ctx.school_id, 'experience', d.legacy_id)
        AND (
          d.segment IS NULL
          OR d.segment = 'educacao_infantil'
        )
        AND (
          d.age_group IS NULL
          OR ctx.age_group IS NULL
          OR lower(d.age_group) = lower(ctx.age_group)
          OR lower(d.age_group) = lower(replace(ctx.age_group, ' ', ''))
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.student_get_activities()
RETURNS TABLE (
  id uuid,
  legacy_id text,
  title text,
  description text,
  instruction text,
  activity_type text,
  segment text,
  age_group text,
  book_legacy_id text,
  page_start integer,
  page_end integer,
  bncc_codes text[],
  asset jsonb,
  sort_order integer,
  duration_seconds integer,
  progress_status text,
  percent_complete integer,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    a.id,
    a.legacy_id,
    a.title,
    a.description,
    a.instruction,
    a.activity_type,
    a.segment,
    a.age_group,
    a.book_legacy_id,
    a.page_start,
    a.page_end,
    a.bncc_codes,
    a.asset,
    a.sort_order,
    a.duration_seconds,
    COALESCE(p.status, 'NOT_STARTED') AS progress_status,
    COALESCE(p.percent_complete, 0) AS percent_complete,
    COALESCE(p.updated_at, a.updated_at) AS updated_at
  FROM public.current_early_childhood_student_context() ctx
  JOIN public.student_activities a ON true
  LEFT JOIN public.student_activity_progress p
    ON p.student_id = ctx.student_id
   AND p.activity_id = a.id
  WHERE a.active = true
    AND a.status = 'published'
    AND public.is_content_available_for_school(ctx.school_id, 'activity', a.legacy_id)
    AND (
      a.age_group IS NULL
      OR ctx.age_group IS NULL
      OR lower(a.age_group) = lower(ctx.age_group)
      OR lower(a.age_group) = lower(replace(ctx.age_group, ' ', ''))
    )
  ORDER BY a.sort_order, a.title;
$$;

CREATE OR REPLACE FUNCTION public.student_get_activity(p_activity_id uuid)
RETURNS TABLE (
  id uuid,
  legacy_id text,
  discovery_id uuid,
  title text,
  description text,
  instruction text,
  narration_text text,
  activity_type text,
  segment text,
  age_group text,
  book_legacy_id text,
  page_start integer,
  page_end integer,
  bncc_codes text[],
  bncc_skills text[],
  asset jsonb,
  engine_metadata jsonb,
  completion_rule jsonb,
  reward jsonb,
  progress_status text,
  percent_complete integer,
  progress_data jsonb,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    a.id,
    a.legacy_id,
    a.discovery_id,
    a.title,
    a.description,
    a.instruction,
    a.narration_text,
    a.activity_type,
    a.segment,
    a.age_group,
    a.book_legacy_id,
    a.page_start,
    a.page_end,
    a.bncc_codes,
    a.bncc_skills,
    a.asset,
    a.engine_metadata,
    a.completion_rule,
    a.reward,
    COALESCE(p.status, 'NOT_STARTED') AS progress_status,
    COALESCE(p.percent_complete, 0) AS percent_complete,
    COALESCE(p.progress_data, '{}'::jsonb) AS progress_data,
    COALESCE(p.updated_at, a.updated_at) AS updated_at
  FROM public.current_early_childhood_student_context() ctx
  JOIN public.student_activities a ON a.id = p_activity_id
  LEFT JOIN public.student_activity_progress p
    ON p.student_id = ctx.student_id
   AND p.activity_id = a.id
  WHERE public.student_can_read_activity(a.id);
$$;

CREATE OR REPLACE FUNCTION public.student_get_discoveries()
RETURNS TABLE (
  id uuid,
  legacy_id text,
  title text,
  description text,
  student_instruction text,
  discovery_type text,
  segment text,
  age_group text,
  book_legacy_id text,
  page_start integer,
  page_end integer,
  bncc_codes text[],
  experience_fields text[],
  resources jsonb,
  sort_order integer,
  duration_seconds integer,
  progress_status text,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    d.id,
    d.legacy_id,
    d.title,
    d.description,
    d.student_instruction,
    d.discovery_type,
    d.segment,
    d.age_group,
    d.book_legacy_id,
    d.page_start,
    d.page_end,
    d.bncc_codes,
    d.experience_fields,
    d.resources,
    d.sort_order,
    d.duration_seconds,
    COALESCE(p.status, 'NOT_STARTED') AS progress_status,
    COALESCE(p.updated_at, d.updated_at) AS updated_at
  FROM public.current_early_childhood_student_context() ctx
  JOIN public.student_discoveries d ON true
  LEFT JOIN public.student_discovery_progress p
    ON p.student_id = ctx.student_id
   AND p.discovery_id = d.id
  WHERE d.active = true
    AND d.status = 'published'
    AND public.is_content_available_for_school(ctx.school_id, 'experience', d.legacy_id)
    AND (
      d.age_group IS NULL
      OR ctx.age_group IS NULL
      OR lower(d.age_group) = lower(ctx.age_group)
      OR lower(d.age_group) = lower(replace(ctx.age_group, ' ', ''))
    )
  ORDER BY d.sort_order, d.title;
$$;

CREATE OR REPLACE FUNCTION public.student_get_discovery(p_discovery_id uuid)
RETURNS TABLE (
  id uuid,
  legacy_id text,
  title text,
  description text,
  student_instruction text,
  discovery_type text,
  segment text,
  age_group text,
  book_legacy_id text,
  page_start integer,
  page_end integer,
  bncc_codes text[],
  bncc_skills text[],
  experience_fields text[],
  resources jsonb,
  completion_rule jsonb,
  reward jsonb,
  metadata jsonb,
  hotspots jsonb,
  progress_status text,
  discovered_hotspots jsonb,
  progress_data jsonb,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT
    d.id,
    d.legacy_id,
    d.title,
    d.description,
    d.student_instruction,
    d.discovery_type,
    d.segment,
    d.age_group,
    d.book_legacy_id,
    d.page_start,
    d.page_end,
    d.bncc_codes,
    d.bncc_skills,
    d.experience_fields,
    d.resources,
    d.completion_rule,
    d.reward,
    d.metadata,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', h.id,
            'legacy_id', h.legacy_id,
            'title', h.title,
            'description', h.description,
            'x_percent', h.x_percent,
            'y_percent', h.y_percent,
            'width_percent', h.width_percent,
            'height_percent', h.height_percent,
            'action_type', h.action_type,
            'target_type', h.target_type,
            'target_legacy_id', h.target_legacy_id,
            'asset_legacy_id', h.asset_legacy_id,
            'audio_asset_legacy_id', h.audio_asset_legacy_id,
            'accessibility_label', h.accessibility_label,
            'metadata', h.metadata
          )
          ORDER BY h.sort_order, h.legacy_id
        )
        FROM public.discovery_hotspots h
        WHERE h.discovery_id = d.id
      ),
      '[]'::jsonb
    ) AS hotspots,
    COALESCE(p.status, 'NOT_STARTED') AS progress_status,
    COALESCE(p.discovered_hotspots, '[]'::jsonb) AS discovered_hotspots,
    COALESCE(p.progress_data, '{}'::jsonb) AS progress_data,
    COALESCE(p.updated_at, d.updated_at) AS updated_at
  FROM public.current_early_childhood_student_context() ctx
  JOIN public.student_discoveries d ON d.id = p_discovery_id
  LEFT JOIN public.student_discovery_progress p
    ON p.student_id = ctx.student_id
   AND p.discovery_id = d.id
  WHERE public.student_can_read_discovery(d.id);
$$;

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

  SELECT ctx.student_id INTO v_student_id
  FROM public.current_early_childhood_student_context() ctx
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

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
  ON CONFLICT (student_id, activity_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    percent_complete = EXCLUDED.percent_complete,
    progress_data = EXCLUDED.progress_data,
    started_at = COALESCE(public.student_activity_progress.started_at, EXCLUDED.started_at),
    completed_at = CASE
      WHEN EXCLUDED.status = 'COMPLETED' THEN COALESCE(public.student_activity_progress.completed_at, now())
      ELSE NULL
    END,
    updated_at = now()
  RETURNING *
    INTO v_progress;

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

  SELECT ctx.student_id INTO v_student_id
  FROM public.current_early_childhood_student_context() ctx
  LIMIT 1;

  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

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
  ON CONFLICT (student_id, discovery_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    discovered_hotspots = EXCLUDED.discovered_hotspots,
    progress_data = EXCLUDED.progress_data,
    started_at = COALESCE(public.student_discovery_progress.started_at, EXCLUDED.started_at),
    completed_at = CASE
      WHEN EXCLUDED.status = 'COMPLETED' THEN COALESCE(public.student_discovery_progress.completed_at, now())
      ELSE NULL
    END,
    updated_at = now()
  RETURNING *
    INTO v_progress;

  RETURN QUERY
  SELECT
    v_progress.discovery_id,
    v_progress.status,
    v_progress.discovered_hotspots,
    v_progress.progress_data,
    v_progress.updated_at;
END;
$$;

ALTER TABLE public.student_discoveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.early_childhood_content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discovery_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_activity_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_discovery_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_discoveries_select_authorized_student ON public.student_discoveries;
CREATE POLICY student_discoveries_select_authorized_student
  ON public.student_discoveries
  FOR SELECT
  TO authenticated
  USING (public.student_can_read_discovery(id));

DROP POLICY IF EXISTS student_activities_select_authorized_student ON public.student_activities;
CREATE POLICY student_activities_select_authorized_student
  ON public.student_activities
  FOR SELECT
  TO authenticated
  USING (public.student_can_read_activity(id));

DROP POLICY IF EXISTS discovery_hotspots_select_authorized_student ON public.discovery_hotspots;
CREATE POLICY discovery_hotspots_select_authorized_student
  ON public.discovery_hotspots
  FOR SELECT
  TO authenticated
  USING (public.student_can_read_discovery(discovery_id));

DROP POLICY IF EXISTS student_activity_progress_select_own ON public.student_activity_progress;
CREATE POLICY student_activity_progress_select_own
  ON public.student_activity_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_activity_progress.student_id
    )
  );

DROP POLICY IF EXISTS student_activity_progress_insert_own ON public.student_activity_progress;
CREATE POLICY student_activity_progress_insert_own
  ON public.student_activity_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.student_can_read_activity(activity_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_activity_progress.student_id
    )
  );

DROP POLICY IF EXISTS student_activity_progress_update_own ON public.student_activity_progress;
CREATE POLICY student_activity_progress_update_own
  ON public.student_activity_progress
  FOR UPDATE
  TO authenticated
  USING (
    public.student_can_read_activity(activity_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_activity_progress.student_id
    )
  )
  WITH CHECK (
    public.student_can_read_activity(activity_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_activity_progress.student_id
    )
  );

DROP POLICY IF EXISTS student_discovery_progress_select_own ON public.student_discovery_progress;
CREATE POLICY student_discovery_progress_select_own
  ON public.student_discovery_progress
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_discovery_progress.student_id
    )
  );

DROP POLICY IF EXISTS student_discovery_progress_insert_own ON public.student_discovery_progress;
CREATE POLICY student_discovery_progress_insert_own
  ON public.student_discovery_progress
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.student_can_read_discovery(discovery_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_discovery_progress.student_id
    )
  );

DROP POLICY IF EXISTS student_discovery_progress_update_own ON public.student_discovery_progress;
CREATE POLICY student_discovery_progress_update_own
  ON public.student_discovery_progress
  FOR UPDATE
  TO authenticated
  USING (
    public.student_can_read_discovery(discovery_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_discovery_progress.student_id
    )
  )
  WITH CHECK (
    public.student_can_read_discovery(discovery_id)
    AND EXISTS (
      SELECT 1
      FROM public.current_early_childhood_student_context() ctx
      WHERE ctx.student_id = student_discovery_progress.student_id
    )
  );

DROP POLICY IF EXISTS activities_authenticated_read_active ON public.activities;
DROP POLICY IF EXISTS "Allow authenticated users read activities" ON public.activities;
DROP POLICY IF EXISTS "Allow authenticated users read xp_records" ON public.activities;

REVOKE ALL ON TABLE public.student_discoveries FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.student_activities FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.early_childhood_content_assets FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.discovery_hotspots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.student_activity_progress FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.student_discovery_progress FROM PUBLIC, anon, authenticated;
REVOKE SELECT ON TABLE public.activities FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.current_early_childhood_student_context() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_can_read_activity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_can_read_discovery(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_activities() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_activity(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_discoveries() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_discovery(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_upsert_activity_progress(uuid, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_upsert_discovery_progress(uuid, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.student_get_activities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_activity(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_discoveries() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_discovery(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_upsert_activity_progress(uuid, text, integer, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_upsert_discovery_progress(uuid, text, jsonb, jsonb) TO authenticated;

INSERT INTO public.early_childhood_content_assets (
  id,
  legacy_id,
  asset_type,
  title,
  local_path,
  mime_type,
  storage_access,
  status,
  metadata
)
VALUES
  (
    '02d10000-0000-4000-8000-000000000101',
    'RS-EI4-V1-001',
    'video',
    'A Caixa Misteriosa',
    'assets/experiencias/infantil/ei4/volume-1/videos/rs-ei4-v1-001-caixa-misteriosa.mp4',
    'video/mp4',
    'local_pending',
    'awaiting_upload',
    jsonb_build_object(
      'provisional_local_path', 'assets/video/RS-020-video-institucional.mp4',
      'cover_path', 'assets/games/caixa-misteriosa/screens/screen-intro.png'
    )
  ),
  (
    '02d10000-0000-4000-8000-000000000102',
    'RS-EI4-V1-002',
    'audio',
    'Narracao de apoio',
    'assets/experiencias/infantil/ei4/volume-1/audios/rs-ei4-v1-002.mp3',
    'audio/mpeg',
    'local_pending',
    'awaiting_upload',
    '{}'::jsonb
  ),
  (
    '02d10000-0000-4000-8000-000000000103',
    'RS-EI-C-003',
    'audio',
    'Feedback correto',
    'assets/experiencias/infantil/compartilhados/audios/rs-ei-c-003-acerto.mp3',
    'audio/mpeg',
    'local_pending',
    'awaiting_upload',
    '{}'::jsonb
  ),
  (
    '02d10000-0000-4000-8000-000000000104',
    'RS-EI-C-004',
    'audio',
    'Feedback tentar novamente',
    'assets/experiencias/infantil/compartilhados/audios/rs-ei-c-004-tentar-novamente.mp3',
    'audio/mpeg',
    'local_pending',
    'awaiting_upload',
    '{}'::jsonb
  ),
  (
    '02d10000-0000-4000-8000-000000000105',
    'css:ladybug',
    'css',
    'Joaninha CSS',
    NULL,
    NULL,
    'generated',
    'published',
    jsonb_build_object('kind', 'generated_css_object')
  )
ON CONFLICT ((lower(btrim(legacy_id)))) DO UPDATE
SET
  asset_type = EXCLUDED.asset_type,
  title = EXCLUDED.title,
  local_path = EXCLUDED.local_path,
  mime_type = EXCLUDED.mime_type,
  storage_access = EXCLUDED.storage_access,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.student_discoveries (
  id,
  legacy_id,
  title,
  description,
  student_instruction,
  age_group,
  school_year,
  discovery_type,
  book_legacy_id,
  page_start,
  page_end,
  unit_code,
  unit_title,
  sequence_code,
  sequence_title,
  bncc_codes,
  bncc_skills,
  experience_fields,
  resources,
  completion_rule,
  reward,
  metadata,
  sort_order,
  duration_seconds,
  status,
  active
)
VALUES (
  '02d10000-0000-4000-8000-000000000001',
  'RS-EI4-V1-EXP-001',
  'A Caixa Misteriosa',
  'Experiencia audiovisual de investigacao sensorial.',
  'Assista ao video, observe as pistas da caixa e depois volte ao livro para registrar sua descoberta.',
  '4 anos',
  '2026',
  'video-guided-exploration',
  'livro-005',
  18,
  21,
  'EI4-V1-U1',
  'Unidade 1 - Sala das Descobertas',
  'EI4-V1-SEQ-001',
  'Investigar, levantar hipoteses e registrar descobertas',
  ARRAY['EI03EF01', 'EI03EO04', 'EI03ET01'],
  ARRAY['EI03EF01', 'EI03EO04', 'EI03ET01'],
  ARRAY['Escuta, fala, pensamento e imaginacao', 'Espacos, tempos, quantidades, relacoes e transformacoes'],
  jsonb_build_array(
    jsonb_build_object('type', 'video', 'asset_legacy_id', 'RS-EI4-V1-001', 'role', 'opening'),
    jsonb_build_object('type', 'interactive', 'activity_legacy_id', 'RS-EI4-V1-INT-001', 'role', 'main'),
    jsonb_build_object('type', 'audio', 'asset_legacy_id', 'RS-EI4-V1-002', 'role', 'support')
  ),
  jsonb_build_object('type', 'interactive_activity_completed', 'activity_legacy_id', 'RS-EI4-V1-INT-001'),
  jsonb_build_object('xp', 20, 'stars', 3),
  jsonb_build_object(
    'book_title', 'Educacao Infantil 4 anos - Volume 1',
    'activity_title', 'A Caixa Misteriosa',
    'field_of_experience', 'Escuta, fala, pensamento e imaginacao; espacos, tempos, quantidades, relacoes e transformacoes.',
    'storage_strategy', 'assets remain local_pending/private until 02D.2 ingestion'
  ),
  10,
  72,
  'published',
  true
)
ON CONFLICT ((lower(btrim(legacy_id)))) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  student_instruction = EXCLUDED.student_instruction,
  age_group = EXCLUDED.age_group,
  school_year = EXCLUDED.school_year,
  discovery_type = EXCLUDED.discovery_type,
  book_legacy_id = EXCLUDED.book_legacy_id,
  page_start = EXCLUDED.page_start,
  page_end = EXCLUDED.page_end,
  unit_code = EXCLUDED.unit_code,
  unit_title = EXCLUDED.unit_title,
  sequence_code = EXCLUDED.sequence_code,
  sequence_title = EXCLUDED.sequence_title,
  bncc_codes = EXCLUDED.bncc_codes,
  bncc_skills = EXCLUDED.bncc_skills,
  experience_fields = EXCLUDED.experience_fields,
  resources = EXCLUDED.resources,
  completion_rule = EXCLUDED.completion_rule,
  reward = EXCLUDED.reward,
  metadata = EXCLUDED.metadata,
  sort_order = EXCLUDED.sort_order,
  duration_seconds = EXCLUDED.duration_seconds,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.student_activities (
  id,
  legacy_id,
  discovery_id,
  title,
  description,
  instruction,
  narration_text,
  age_group,
  school_year,
  activity_type,
  book_legacy_id,
  page_start,
  page_end,
  unit_code,
  unit_title,
  sequence_code,
  sequence_title,
  bncc_codes,
  bncc_skills,
  asset,
  engine_metadata,
  completion_rule,
  reward,
  sort_order,
  status,
  active
)
VALUES (
  '02d10000-0000-4000-8000-000000000011',
  'RS-EI4-V1-INT-001',
  '02d10000-0000-4000-8000-000000000001',
  'AS JOANINHAS QUE VOARAM',
  'Atividade interativa de contagem e selecao vinculada a A Caixa Misteriosa.',
  'OBSERVE E RESPONDA.',
  'HAVIA CINCO JOANINHAS. DUAS JOANINHAS VOARAM. QUANTAS JOANINHAS RESTARAM?',
  '4 anos',
  '2026',
  'count_and_select',
  'livro-005',
  18,
  21,
  'EI4-V1-U1',
  'Unidade 1 - Sala das Descobertas',
  'EI4-V1-SEQ-001',
  'Investigar, levantar hipoteses e registrar descobertas',
  ARRAY['EI03EF01', 'EI03EO04', 'EI03ET01'],
  ARRAY['EI03EF01', 'EI03EO04', 'EI03ET01'],
  jsonb_build_object('opening_asset_legacy_id', 'RS-EI4-V1-001', 'primary_asset', 'css:ladybug'),
  jsonb_build_object(
    'scene', jsonb_build_object(
      'background', 'garden',
      'objects', jsonb_build_array(
        jsonb_build_object('id', 'ladybug-1', 'type', 'animated_object', 'asset', 'css:ladybug', 'x', 16, 'y', 58, 'width', 12, 'height', 12, 'initialState', 'visible', 'animation', jsonb_build_object('type', 'stay'), 'accessibilityLabel', 'JOANINHA 1'),
        jsonb_build_object('id', 'ladybug-2', 'type', 'animated_object', 'asset', 'css:ladybug', 'x', 32, 'y', 44, 'width', 12, 'height', 12, 'initialState', 'visible', 'animation', jsonb_build_object('type', 'fly_away', 'trigger', 'start', 'delay', 280), 'accessibilityLabel', 'JOANINHA 2'),
        jsonb_build_object('id', 'ladybug-3', 'type', 'animated_object', 'asset', 'css:ladybug', 'x', 48, 'y', 60, 'width', 12, 'height', 12, 'initialState', 'visible', 'animation', jsonb_build_object('type', 'stay'), 'accessibilityLabel', 'JOANINHA 3'),
        jsonb_build_object('id', 'ladybug-4', 'type', 'animated_object', 'asset', 'css:ladybug', 'x', 64, 'y', 46, 'width', 12, 'height', 12, 'initialState', 'visible', 'animation', jsonb_build_object('type', 'fly_away', 'trigger', 'start', 'delay', 520), 'accessibilityLabel', 'JOANINHA 4'),
        jsonb_build_object('id', 'ladybug-5', 'type', 'animated_object', 'asset', 'css:ladybug', 'x', 78, 'y', 58, 'width', 12, 'height', 12, 'initialState', 'visible', 'animation', jsonb_build_object('type', 'stay'), 'accessibilityLabel', 'JOANINHA 5')
      )
    ),
    'question', jsonb_build_object(
      'context', 'HAVIA 5 JOANINHAS. 2 JOANINHAS VOARAM.',
      'text', 'QUANTAS JOANINHAS RESTARAM?',
      'options', jsonb_build_array(2, 3, 5),
      'correctAnswer', 3
    ),
    'feedback', jsonb_build_object(
      'correct', jsonb_build_object('message', 'MUITO BEM!', 'audioAsset', 'RS-EI-C-003'),
      'incorrect', jsonb_build_object('message', 'VAMOS OBSERVAR NOVAMENTE?', 'audioAsset', 'RS-EI-C-004')
    )
  ),
  jsonb_build_object('type', 'correct_answer'),
  jsonb_build_object('xp', 20, 'stars', 3),
  10,
  'published',
  true
)
ON CONFLICT ((lower(btrim(legacy_id)))) DO UPDATE
SET
  discovery_id = EXCLUDED.discovery_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  instruction = EXCLUDED.instruction,
  narration_text = EXCLUDED.narration_text,
  age_group = EXCLUDED.age_group,
  school_year = EXCLUDED.school_year,
  activity_type = EXCLUDED.activity_type,
  book_legacy_id = EXCLUDED.book_legacy_id,
  page_start = EXCLUDED.page_start,
  page_end = EXCLUDED.page_end,
  unit_code = EXCLUDED.unit_code,
  unit_title = EXCLUDED.unit_title,
  sequence_code = EXCLUDED.sequence_code,
  sequence_title = EXCLUDED.sequence_title,
  bncc_codes = EXCLUDED.bncc_codes,
  bncc_skills = EXCLUDED.bncc_skills,
  asset = EXCLUDED.asset,
  engine_metadata = EXCLUDED.engine_metadata,
  completion_rule = EXCLUDED.completion_rule,
  reward = EXCLUDED.reward,
  sort_order = EXCLUDED.sort_order,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  updated_at = now();

INSERT INTO public.discovery_hotspots (
  discovery_id,
  legacy_id,
  title,
  description,
  x_percent,
  y_percent,
  width_percent,
  height_percent,
  action_type,
  target_type,
  target_legacy_id,
  asset_legacy_id,
  audio_asset_legacy_id,
  accessibility_label,
  sort_order,
  metadata
)
VALUES
  (
    '02d10000-0000-4000-8000-000000000001',
    'rs-ei4-v1-exp-001-opening',
    'Assistir abertura',
    'Abre o video da experiencia A Caixa Misteriosa.',
    12,
    16,
    76,
    48,
    'open_asset',
    'asset',
    'RS-EI4-V1-001',
    'RS-EI4-V1-001',
    NULL,
    'Assistir abertura da Caixa Misteriosa',
    10,
    jsonb_build_object('role', 'opening')
  ),
  (
    '02d10000-0000-4000-8000-000000000001',
    'rs-ei4-v1-exp-001-main-activity',
    'AS JOANINHAS QUE VOARAM',
    'Abre a atividade interativa principal.',
    18,
    68,
    64,
    20,
    'open_activity',
    'activity',
    'RS-EI4-V1-INT-001',
    'css:ladybug',
    'RS-EI4-V1-002',
    'Abrir atividade das joaninhas',
    20,
    jsonb_build_object('role', 'main')
  )
ON CONFLICT (discovery_id, (lower(btrim(legacy_id)))) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  x_percent = EXCLUDED.x_percent,
  y_percent = EXCLUDED.y_percent,
  width_percent = EXCLUDED.width_percent,
  height_percent = EXCLUDED.height_percent,
  action_type = EXCLUDED.action_type,
  target_type = EXCLUDED.target_type,
  target_legacy_id = EXCLUDED.target_legacy_id,
  asset_legacy_id = EXCLUDED.asset_legacy_id,
  audio_asset_legacy_id = EXCLUDED.audio_asset_legacy_id,
  accessibility_label = EXCLUDED.accessibility_label,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = now();

COMMENT ON TABLE public.student_activities IS
  'Catalogo canonico de atividades do aluno. Identidade mobile por UUID; legacy_id preserva mapeamento com catalogos locais.';
COMMENT ON TABLE public.student_discoveries IS
  'Catalogo canonico de descobertas/experiencias do aluno, separado de atividades e jogos.';
COMMENT ON TABLE public.early_childhood_content_assets IS
  'Metadados de assets da Educacao Infantil. Storage privado/publico sera definido na fase de ingestao segura.';
COMMENT ON TABLE public.discovery_hotspots IS
  'Hotspots canonicos de descobertas, com coordenadas percentuais e alvos declarativos.';
COMMENT ON TABLE public.student_activity_progress IS
  'Progresso proprio do aluno em atividades. Escrita via RPC segura.';
COMMENT ON TABLE public.student_discovery_progress IS
  'Progresso proprio do aluno em descobertas/experiencias. Escrita via RPC segura.';
