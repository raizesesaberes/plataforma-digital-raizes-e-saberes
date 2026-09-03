-- RS-SCHOOL-TEMPLATE V1
-- Authenticated read grants required for Secretaria V1 initial load.
-- RLS remains enabled and policies continue to decide visible rows.

GRANT SELECT ON public.schools TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.school_memberships TO authenticated;
GRANT SELECT ON public.teachers TO authenticated;
GRANT SELECT ON public.classes TO authenticated;
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT ON public.enrollments TO authenticated;
GRANT SELECT ON public.enrollment_movements TO authenticated;
GRANT SELECT ON public.guardians TO authenticated;
GRANT SELECT ON public.student_guardians TO authenticated;
GRANT SELECT ON public.student_guardian_links TO authenticated;
GRANT SELECT ON public.class_teacher_memberships TO authenticated;
GRANT SELECT ON public.teacher_class_movements TO authenticated;
GRANT SELECT ON public.document_types TO authenticated;
GRANT SELECT ON public.student_documents TO authenticated;
GRANT SELECT ON public.student_document_events TO authenticated;
GRANT SELECT ON public.attendance_records TO authenticated;
GRANT SELECT ON public.attendance_events TO authenticated;
GRANT SELECT ON public.communications TO authenticated;
GRANT SELECT ON public.communication_events TO authenticated;
