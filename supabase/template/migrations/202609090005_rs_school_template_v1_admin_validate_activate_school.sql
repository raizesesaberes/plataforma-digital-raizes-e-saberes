-- RS-SCHOOL-TEMPLATE V1 - Admin/TI final validation and controlled activation.
-- Validates persisted institutional data before activating a deployment school.

ALTER TABLE public.admin_school_deployment_events
  DROP CONSTRAINT IF EXISTS admin_school_deployment_events_action_check;

ALTER TABLE public.admin_school_deployment_events
  ADD CONSTRAINT admin_school_deployment_events_action_check
  CHECK (action = ANY (ARRAY[
    'school_created'::text,
    'duplicate_blocked'::text,
    'creation_failed'::text,
    'school_import_validated'::text,
    'school_import_confirmed'::text,
    'school_import_blocked'::text,
    'school_activation_validated'::text,
    'school_activated'::text,
    'school_activation_blocked'::text
  ]));

CREATE OR REPLACE FUNCTION public.admin_validate_activate_school(
  p_school_id uuid,
  p_activate boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_admin_user_id uuid := auth.uid();
  v_admin_role text;
  v_school public.schools%rowtype;
  v_installation public.rs_school_installations%rowtype;
  v_checks jsonb := '{}'::jsonb;
  v_failures int := 0;
  v_next_stage text := 'pronta_para_validacao';
  v_action text := 'school_activation_validated';
  v_result text := 'created';
BEGIN
  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario autenticado obrigatorio.' USING errcode = '42501';
  END IF;

  SELECT p.platform_role
    INTO v_admin_role
    FROM public.profiles p
   WHERE p.id = v_admin_user_id
     AND p.status = 'active';

  IF coalesce(v_admin_role, '') NOT IN ('admin', 'admin_ti', 'administrador', 'administrador_nacional') THEN
    RAISE EXCEPTION 'Perfil sem permissao administrativa para validar escola.' USING errcode = '42501';
  END IF;

  SELECT *
    INTO v_school
    FROM public.schools s
   WHERE s.id = p_school_id
     AND s.status <> 'archived'
   FOR UPDATE;

  IF v_school.id IS NULL THEN
    RAISE EXCEPTION 'Escola nao encontrada.' USING errcode = '22023';
  END IF;

  SELECT *
    INTO v_installation
    FROM public.rs_school_installations i
   WHERE i.school_id = p_school_id
   FOR UPDATE;

  v_checks := jsonb_build_object(
    'school_exists', v_school.id IS NOT NULL,
    'school_not_archived', coalesce(v_school.status, '') <> 'archived',
    'school_year_configured', EXISTS (
      SELECT 1 FROM public.classes c
       WHERE c.school_id = p_school_id
         AND nullif(btrim(coalesce(c.school_year::text, '')), '') IS NOT NULL
      UNION
      SELECT 1 FROM public.enrollments e
       WHERE e.school_id = p_school_id
         AND nullif(btrim(coalesce(e.school_year::text, '')), '') IS NOT NULL
      LIMIT 1
    ),
    'classes_configured', EXISTS (
      SELECT 1 FROM public.classes c
       WHERE c.school_id = p_school_id
         AND lower(coalesce(c.status, 'active')) = 'active'
    ),
    'teachers_configured', EXISTS (
      SELECT 1 FROM public.teachers t
       WHERE t.school_id = p_school_id
         AND lower(coalesce(t.status, 'active')) = 'active'
    ),
    'teacher_links_configured', EXISTS (
      SELECT 1
        FROM public.class_teacher_memberships ctm
        JOIN public.classes c ON c.id = ctm.class_id
        JOIN public.teachers t ON t.id = ctm.teacher_id
       WHERE c.school_id = p_school_id
         AND t.school_id = p_school_id
         AND lower(coalesce(ctm.status, 'active')) = 'active'
    ),
    'students_configured', EXISTS (
      SELECT 1 FROM public.students s
       WHERE s.school_id = p_school_id
         AND lower(coalesce(s.status, 'active')) = 'active'
    ),
    'enrollments_configured', EXISTS (
      SELECT 1
        FROM public.enrollments e
        JOIN public.students s ON s.id = e.student_id
        JOIN public.classes c ON c.id = e.class_id
       WHERE e.school_id = p_school_id
         AND s.school_id = p_school_id
         AND c.school_id = p_school_id
         AND lower(coalesce(e.status, 'active')) = 'active'
    ),
    'guardians_configured', EXISTS (
      SELECT 1 FROM public.guardians g
       WHERE g.school_id = p_school_id
         AND lower(coalesce(g.status, 'active')) = 'active'
    ),
    'family_links_configured', EXISTS (
      SELECT 1
        FROM public.student_guardian_links sgl
        JOIN public.students s ON s.id = sgl.student_id
        JOIN public.guardians g ON g.id = sgl.guardian_id
       WHERE s.school_id = p_school_id
         AND g.school_id = p_school_id
         AND lower(coalesce(sgl.status, 'active')) = 'active'
    ),
    'no_orphan_enrollments', NOT EXISTS (
      SELECT 1
        FROM public.enrollments e
        JOIN public.students s ON s.id = e.student_id
        JOIN public.classes c ON c.id = e.class_id
       WHERE (e.school_id = p_school_id OR s.school_id = p_school_id OR c.school_id = p_school_id)
         AND (e.school_id <> p_school_id OR s.school_id <> p_school_id OR c.school_id <> p_school_id)
    ),
    'no_orphan_teacher_links', NOT EXISTS (
      SELECT 1
        FROM public.class_teacher_memberships ctm
        JOIN public.classes c ON c.id = ctm.class_id
        JOIN public.teachers t ON t.id = ctm.teacher_id
       WHERE (c.school_id = p_school_id OR t.school_id = p_school_id)
         AND c.school_id <> t.school_id
    ),
    'no_orphan_family_links', NOT EXISTS (
      SELECT 1
        FROM public.student_guardian_links sgl
        JOIN public.students s ON s.id = sgl.student_id
        JOIN public.guardians g ON g.id = sgl.guardian_id
       WHERE (s.school_id = p_school_id OR g.school_id = p_school_id)
         AND s.school_id <> g.school_id
    ),
    'installation_package_valid', v_installation.id IS NOT NULL
      AND coalesce(v_installation.schema_version, '') = 'RS-SCHOOL-TEMPLATE V1'
      AND coalesce(v_installation.package_version, '') = 'RS-SCHOOL-V1-DEPLOYMENT-2026-09-01'
      AND coalesce(v_installation.current_stage, '') IN ('pronta_para_validacao', 'ativa')
  );

  SELECT count(*)
    INTO v_failures
    FROM jsonb_each(v_checks) AS item(key, value)
   WHERE item.value <> 'true'::jsonb;

  IF v_failures > 0 THEN
    v_action := 'school_activation_blocked';
    v_result := 'blocked';
    v_next_stage := coalesce(v_installation.current_stage, 'dados_parciais');

    INSERT INTO public.admin_school_deployment_events (
      admin_user_id,
      school_id,
      school_code,
      action,
      stage,
      result,
      reason
    ) VALUES (
      v_admin_user_id,
      p_school_id,
      coalesce(v_installation.school_code, v_school.codigo_inep, v_school.nome),
      v_action,
      v_next_stage,
      v_result,
      jsonb_build_object('activate', p_activate, 'checks', v_checks, 'failures', v_failures)::text
    );

    RETURN jsonb_build_object(
      'ok', false,
      'activated', false,
      'school_id', p_school_id,
      'stage', v_next_stage,
      'validation_status', 'failed',
      'checks', v_checks,
      'failures', v_failures
    );
  END IF;

  IF p_activate THEN
    UPDATE public.schools
       SET status = 'active',
           updated_at = now()
     WHERE id = p_school_id;

    UPDATE public.rs_school_installations
       SET current_stage = 'ativa',
           validation_status = 'passed',
           activated_at = coalesce(activated_at, now()),
           updated_at = now()
     WHERE school_id = p_school_id;

    v_action := 'school_activated';
    v_next_stage := 'ativa';
  ELSE
    UPDATE public.rs_school_installations
       SET current_stage = CASE WHEN current_stage = 'ativa' THEN 'ativa' ELSE 'pronta_para_validacao' END,
           validation_status = 'passed',
           updated_at = now()
     WHERE school_id = p_school_id;

    v_action := 'school_activation_validated';
    v_next_stage := CASE WHEN coalesce(v_installation.current_stage, '') = 'ativa' THEN 'ativa' ELSE 'pronta_para_validacao' END;
  END IF;

  INSERT INTO public.admin_school_deployment_events (
    admin_user_id,
    school_id,
    school_code,
    action,
    stage,
    result,
    reason
  ) VALUES (
    v_admin_user_id,
    p_school_id,
    coalesce(v_installation.school_code, v_school.codigo_inep, v_school.nome),
    v_action,
    v_next_stage,
    v_result,
    jsonb_build_object('activate', p_activate, 'checks', v_checks, 'failures', 0)::text
  );

  RETURN jsonb_build_object(
    'ok', true,
    'activated', p_activate,
    'school_id', p_school_id,
    'stage', v_next_stage,
    'validation_status', 'passed',
    'checks', v_checks,
    'failures', 0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_validate_activate_school(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_validate_activate_school(uuid, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.admin_validate_activate_school(uuid, boolean) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_validate_activate_school(uuid, boolean) TO authenticated;

COMMENT ON FUNCTION public.admin_validate_activate_school(uuid, boolean) IS
  'Admin-only final validation and controlled activation for RS School deployments. Does not create Auth, passwords, tokens, links, or expose service-role credentials.';
