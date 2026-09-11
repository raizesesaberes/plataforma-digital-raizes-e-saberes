-- RS-SCHOOL-TEMPLATE V1 - Keep assisted-import stage idempotent.
-- Recomputes installation stage from persisted institutional data after each confirmed import.

CREATE OR REPLACE FUNCTION public.admin_refresh_rs_school_import_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_has_classes boolean := false;
  v_has_teachers boolean := false;
  v_has_teacher_links boolean := false;
  v_has_students boolean := false;
  v_has_enrollments boolean := false;
  v_has_guardians boolean := false;
  v_has_family_links boolean := false;
  v_next_stage text := 'dados_parciais';
BEGIN
  IF NEW.action <> 'school_import_confirmed' OR NEW.school_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.classes c
     WHERE c.school_id = NEW.school_id
       AND lower(coalesce(c.status, 'active')) = 'active'
  ) INTO v_has_classes;

  SELECT EXISTS (
    SELECT 1
      FROM public.teachers t
     WHERE t.school_id = NEW.school_id
       AND lower(coalesce(t.status, 'active')) = 'active'
  ) INTO v_has_teachers;

  SELECT EXISTS (
    SELECT 1
      FROM public.class_teacher_memberships ctm
      JOIN public.classes c ON c.id = ctm.class_id
      JOIN public.teachers t ON t.id = ctm.teacher_id
     WHERE c.school_id = NEW.school_id
       AND t.school_id = NEW.school_id
       AND lower(coalesce(ctm.status, 'active')) = 'active'
  ) INTO v_has_teacher_links;

  SELECT EXISTS (
    SELECT 1
      FROM public.students s
     WHERE s.school_id = NEW.school_id
       AND lower(coalesce(s.status, 'active')) = 'active'
  ) INTO v_has_students;

  SELECT EXISTS (
    SELECT 1
      FROM public.enrollments e
      JOIN public.students s ON s.id = e.student_id
      JOIN public.classes c ON c.id = e.class_id
     WHERE s.school_id = NEW.school_id
       AND c.school_id = NEW.school_id
       AND lower(coalesce(e.status, 'active')) = 'active'
  ) INTO v_has_enrollments;

  SELECT EXISTS (
    SELECT 1
      FROM public.guardians g
     WHERE g.school_id = NEW.school_id
       AND lower(coalesce(g.status, 'active')) = 'active'
  ) INTO v_has_guardians;

  SELECT EXISTS (
    SELECT 1
      FROM public.student_guardian_links sgl
      JOIN public.students s ON s.id = sgl.student_id
      JOIN public.guardians g ON g.id = sgl.guardian_id
     WHERE s.school_id = NEW.school_id
       AND g.school_id = NEW.school_id
       AND lower(coalesce(sgl.status, 'active')) = 'active'
  ) INTO v_has_family_links;

  IF v_has_classes
     AND v_has_teachers
     AND v_has_teacher_links
     AND v_has_students
     AND v_has_enrollments
     AND v_has_guardians
     AND v_has_family_links THEN
    v_next_stage := 'pronta_para_validacao';
  END IF;

  UPDATE public.rs_school_installations
     SET current_stage = v_next_stage,
         validation_status = 'pending',
         updated_at = now()
   WHERE school_id = NEW.school_id
     AND current_stage <> 'ativa';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS admin_school_import_refresh_stage ON public.admin_school_deployment_events;
CREATE TRIGGER admin_school_import_refresh_stage
  AFTER INSERT ON public.admin_school_deployment_events
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_refresh_rs_school_import_stage();

REVOKE ALL ON FUNCTION public.admin_refresh_rs_school_import_stage() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_refresh_rs_school_import_stage() FROM anon;
REVOKE ALL ON FUNCTION public.admin_refresh_rs_school_import_stage() FROM authenticated;

COMMENT ON FUNCTION public.admin_refresh_rs_school_import_stage() IS
  'Internal trigger helper that recomputes RS School import stage from persisted data. Does not handle Auth, passwords, tokens, or public execution.';
