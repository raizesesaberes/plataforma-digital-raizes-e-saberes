-- Academic Core V2 grants hardening.
-- Removes default broad table privileges for authenticated users and restores
-- only the CRUD surface used by RPC + RLS.

REVOKE ALL ON public.academic_years FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academic_terms FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.school_day_calendar FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.class_subjects FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.class_schedule_slots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academic_import_batches FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.academic_import_rows FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.academic_years TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academic_terms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.school_day_calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.class_schedule_slots TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academic_import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.academic_import_rows TO authenticated;
