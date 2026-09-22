-- RS-SCHOOL-TEMPLATE V1 - Gamification backend contract
-- Scope: local contract for Raizes Crescer XP + achievements.
-- Do not apply to PILOT without explicit authorization.
-- Does not change mobile, game/activity/discovery content, or Storage objects.

CREATE OR REPLACE FUNCTION public.student_gamification_current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT s.id
  FROM public.students s
  WHERE s.user_id = auth.uid()
    AND COALESCE(s.status, 'active') = 'active'
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;
$$;

CREATE TABLE IF NOT EXISTS public.student_xp_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  source_type text NOT NULL,
  source_id uuid,
  source_legacy_id text,
  event_type text NOT NULL,
  event_key text NOT NULL,
  reward_rule text NOT NULL,
  xp_amount integer NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_xp_ledger_source_type_check CHECK (
    source_type IN ('activity', 'discovery', 'game', 'library', 'avalia_plus', 'system')
  ),
  CONSTRAINT student_xp_ledger_event_type_not_blank CHECK (length(btrim(event_type)) > 0),
  CONSTRAINT student_xp_ledger_event_key_not_blank CHECK (length(btrim(event_key)) > 0),
  CONSTRAINT student_xp_ledger_reward_rule_not_blank CHECK (length(btrim(reward_rule)) > 0),
  CONSTRAINT student_xp_ledger_xp_amount_check CHECK (xp_amount > 0 AND xp_amount <= 1000),
  CONSTRAINT student_xp_ledger_no_secret_check CHECK (
    source_type !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(source_legacy_id, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND event_type !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND event_key !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND reward_rule !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_xp_ledger_student_event_uidx
  ON public.student_xp_ledger (student_id, lower(btrim(event_key)));

CREATE INDEX IF NOT EXISTS student_xp_ledger_student_created_idx
  ON public.student_xp_ledger (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS student_xp_ledger_source_idx
  ON public.student_xp_ledger (source_type, source_id, event_type);

CREATE TABLE IF NOT EXISTS public.achievement_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id text NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'technical',
  unlock_rule jsonb NOT NULL DEFAULT '{}'::jsonb,
  reward_rule text,
  is_technical_test boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT achievement_catalog_legacy_id_not_blank CHECK (length(btrim(legacy_id)) > 0),
  CONSTRAINT achievement_catalog_status_check CHECK (status IN ('draft', 'published', 'archived')),
  CONSTRAINT achievement_catalog_no_secret_check CHECK (
    legacy_id !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND title !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(description, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND unlock_rule::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND coalesce(reward_rule, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS achievement_catalog_legacy_id_uidx
  ON public.achievement_catalog (lower(btrim(legacy_id)));

CREATE INDEX IF NOT EXISTS achievement_catalog_status_idx
  ON public.achievement_catalog (status, active, sort_order);

CREATE TABLE IF NOT EXISTS public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievement_catalog(id) ON DELETE CASCADE,
  unlocked_from_ledger_id uuid REFERENCES public.student_xp_ledger(id) ON DELETE SET NULL,
  source_event_key text,
  status text NOT NULL DEFAULT 'UNLOCKED',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT student_achievements_status_check CHECK (status IN ('UNLOCKED', 'REVOKED')),
  CONSTRAINT student_achievements_no_secret_check CHECK (
    coalesce(source_event_key, '') !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
    AND metadata::text !~* '(password|senha|token|secret|service_role|access_token|refresh_token)'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS student_achievements_student_catalog_uidx
  ON public.student_achievements (student_id, achievement_id);

CREATE INDEX IF NOT EXISTS student_achievements_student_unlocked_idx
  ON public.student_achievements (student_id, unlocked_at DESC);

DROP TRIGGER IF EXISTS achievement_catalog_touch_updated_at ON public.achievement_catalog;
CREATE TRIGGER achievement_catalog_touch_updated_at
  BEFORE UPDATE ON public.achievement_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

DROP TRIGGER IF EXISTS student_achievements_touch_updated_at ON public.student_achievements;
CREATE TRIGGER student_achievements_touch_updated_at
  BEFORE UPDATE ON public.student_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.institutional_touch_updated_at();

CREATE OR REPLACE FUNCTION public.student_unlock_achievements_for_ledger(p_ledger_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_ledger public.student_xp_ledger;
  v_total_xp integer;
  v_total_credits integer;
  v_unlocked integer := 0;
  v_achievement public.achievement_catalog;
BEGIN
  SELECT * INTO v_ledger
  FROM public.student_xp_ledger
  WHERE id = p_ledger_id;

  IF v_ledger.id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT
    COALESCE(SUM(xp_amount), 0)::integer,
    COUNT(*)::integer
    INTO v_total_xp, v_total_credits
  FROM public.student_xp_ledger
  WHERE student_id = v_ledger.student_id;

  FOR v_achievement IN
    SELECT *
    FROM public.achievement_catalog
    WHERE active = true
      AND status = 'published'
    ORDER BY sort_order, legacy_id
  LOOP
    IF (
      v_achievement.unlock_rule->>'type' = 'ledger_credit_count'
      AND v_total_credits >= COALESCE(NULLIF(v_achievement.unlock_rule->>'minimum_credits', '')::integer, 1)
    ) OR (
      v_achievement.unlock_rule->>'type' = 'total_xp'
      AND v_total_xp >= COALESCE(NULLIF(v_achievement.unlock_rule->>'minimum_xp', '')::integer, 0)
    ) OR (
      v_achievement.unlock_rule->>'type' = 'event_type'
      AND v_ledger.event_type = v_achievement.unlock_rule->>'event_type'
    ) THEN
      INSERT INTO public.student_achievements (
        student_id,
        achievement_id,
        unlocked_from_ledger_id,
        source_event_key,
        metadata
      )
      VALUES (
        v_ledger.student_id,
        v_achievement.id,
        v_ledger.id,
        v_ledger.event_key,
        jsonb_build_object(
          'unlock_engine', '02F.1',
          'technical_test', v_achievement.is_technical_test
        )
      )
      ON CONFLICT (student_id, achievement_id) DO NOTHING;

      IF FOUND THEN
        v_unlocked := v_unlocked + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_unlocked;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_emit_reward(
  p_student_id uuid,
  p_source_type text,
  p_source_id uuid,
  p_source_legacy_id text,
  p_event_type text,
  p_event_key text,
  p_reward_rule text,
  p_xp_amount integer,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  ledger_id uuid,
  xp_amount integer,
  inserted boolean,
  achievements_unlocked integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_ledger_id uuid;
  v_inserted boolean := false;
  v_unlocked integer := 0;
BEGIN
  IF p_student_id IS NULL THEN
    RAISE EXCEPTION 'student_id obrigatorio.' USING errcode = '22023';
  END IF;

  IF p_xp_amount IS NULL OR p_xp_amount <= 0 OR p_xp_amount > 1000 THEN
    RAISE EXCEPTION 'xp_amount invalido.' USING errcode = '22023';
  END IF;

  IF p_event_key IS NULL OR length(btrim(p_event_key)) = 0 THEN
    RAISE EXCEPTION 'event_key obrigatorio.' USING errcode = '22023';
  END IF;

  INSERT INTO public.student_xp_ledger (
    student_id,
    source_type,
    source_id,
    source_legacy_id,
    event_type,
    event_key,
    reward_rule,
    xp_amount,
    metadata
  )
  VALUES (
    p_student_id,
    lower(btrim(p_source_type)),
    p_source_id,
    NULLIF(btrim(coalesce(p_source_legacy_id, '')), ''),
    upper(btrim(p_event_type)),
    btrim(p_event_key),
    btrim(p_reward_rule),
    p_xp_amount,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (student_id, (lower(btrim(event_key)))) DO NOTHING
  RETURNING id INTO v_ledger_id;

  IF v_ledger_id IS NOT NULL THEN
    v_inserted := true;
    v_unlocked := public.student_unlock_achievements_for_ledger(v_ledger_id);
  ELSE
    SELECT id INTO v_ledger_id
    FROM public.student_xp_ledger
    WHERE student_id = p_student_id
      AND lower(btrim(event_key)) = lower(btrim(p_event_key))
    LIMIT 1;
  END IF;

  RETURN QUERY
  SELECT v_ledger_id, p_xp_amount, v_inserted, v_unlocked;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_get_xp_summary()
RETURNS TABLE (
  student_id uuid,
  total_xp integer,
  level_number integer,
  level_floor_xp integer,
  next_level_xp integer,
  credits_count integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_total integer;
  v_count integer;
  v_updated timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  v_student_id := public.student_gamification_current_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

  SELECT
    COALESCE(SUM(xp_amount), 0)::integer,
    COUNT(*)::integer,
    MAX(created_at)
    INTO v_total, v_count, v_updated
  FROM public.student_xp_ledger
  WHERE student_xp_ledger.student_id = v_student_id;

  RETURN QUERY
  SELECT
    v_student_id,
    v_total,
    (v_total / 100) + 1,
    (v_total / 100) * 100,
    ((v_total / 100) + 1) * 100,
    v_count,
    v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_get_xp_history(p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  source_type text,
  source_id uuid,
  source_legacy_id text,
  event_type text,
  event_key text,
  reward_rule text,
  xp_amount integer,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  v_student_id := public.student_gamification_current_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.source_type,
    l.source_id,
    l.source_legacy_id,
    l.event_type,
    l.event_key,
    l.reward_rule,
    l.xp_amount,
    l.metadata,
    l.created_at
  FROM public.student_xp_ledger l
  WHERE l.student_id = v_student_id
  ORDER BY l.created_at DESC
  LIMIT v_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_get_achievements()
RETURNS TABLE (
  achievement_id uuid,
  legacy_id text,
  title text,
  description text,
  category text,
  is_technical_test boolean,
  unlocked boolean,
  unlocked_at timestamptz,
  source_event_key text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_student_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  v_student_id := public.student_gamification_current_student_id();
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'Aluno ativo nao encontrado.' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.legacy_id,
    c.title,
    c.description,
    c.category,
    c.is_technical_test,
    (sa.id IS NOT NULL) AS unlocked,
    sa.unlocked_at,
    sa.source_event_key,
    COALESCE(sa.metadata, '{}'::jsonb) AS metadata
  FROM public.achievement_catalog c
  LEFT JOIN public.student_achievements sa
    ON sa.achievement_id = c.id
   AND sa.student_id = v_student_id
   AND sa.status = 'UNLOCKED'
  WHERE c.active = true
    AND c.status = 'published'
  ORDER BY c.sort_order, c.legacy_id;
END;
$$;

ALTER TABLE public.student_xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_xp_ledger_select_own ON public.student_xp_ledger;
CREATE POLICY student_xp_ledger_select_own
  ON public.student_xp_ledger
  FOR SELECT
  TO authenticated
  USING (student_id = public.student_gamification_current_student_id());

DROP POLICY IF EXISTS achievement_catalog_select_published ON public.achievement_catalog;
CREATE POLICY achievement_catalog_select_published
  ON public.achievement_catalog
  FOR SELECT
  TO authenticated
  USING (active = true AND status = 'published');

DROP POLICY IF EXISTS student_achievements_select_own ON public.student_achievements;
CREATE POLICY student_achievements_select_own
  ON public.student_achievements
  FOR SELECT
  TO authenticated
  USING (student_id = public.student_gamification_current_student_id());

DROP POLICY IF EXISTS "Allow authenticated users read xp_records" ON public.xp_records;
DROP POLICY IF EXISTS "Allow authenticated users read medals" ON public.medals;
DROP POLICY IF EXISTS "Allow authenticated users read student_medals" ON public.student_medals;

DROP POLICY IF EXISTS xp_records_select_own_legacy_compat ON public.xp_records;
CREATE POLICY xp_records_select_own_legacy_compat
  ON public.xp_records
  FOR SELECT
  TO authenticated
  USING (student_id = public.student_gamification_current_student_id());

DROP POLICY IF EXISTS medals_select_legacy_catalog ON public.medals;

DROP POLICY IF EXISTS student_medals_select_own_legacy_compat ON public.student_medals;
CREATE POLICY student_medals_select_own_legacy_compat
  ON public.student_medals
  FOR SELECT
  TO authenticated
  USING (student_id = public.student_gamification_current_student_id());

REVOKE ALL ON TABLE public.student_xp_ledger FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.achievement_catalog FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.student_achievements FROM PUBLIC, anon, authenticated;

REVOKE ALL ON TABLE public.xp_records FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.medals FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.student_medals FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.student_gamification_current_student_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_unlock_achievements_for_ledger(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_emit_reward(uuid, text, uuid, text, text, text, text, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_xp_summary() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_xp_history(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.student_get_achievements() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.student_gamification_current_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_xp_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_xp_history(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_get_achievements() TO authenticated;

INSERT INTO public.achievement_catalog (
  legacy_id,
  title,
  description,
  category,
  unlock_rule,
  reward_rule,
  is_technical_test,
  status,
  active,
  sort_order
)
VALUES (
  'RS-TECH-ACHIEVEMENT-FIRST-XP-CREDIT',
  'Primeiro crédito técnico',
  'Conquista técnica mínima para homologar o motor de gamificação.',
  'technical',
  jsonb_build_object('type', 'ledger_credit_count', 'minimum_credits', 1),
  'technical_first_credit',
  true,
  'published',
  true,
  10
)
ON CONFLICT ((lower(btrim(legacy_id))))
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  unlock_rule = EXCLUDED.unlock_rule,
  reward_rule = EXCLUDED.reward_rule,
  is_technical_test = EXCLUDED.is_technical_test,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
