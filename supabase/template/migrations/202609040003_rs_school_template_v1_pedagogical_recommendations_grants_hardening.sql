-- RS-SCHOOL-TEMPLATE V1 - Harden grants for pedagogical recommendations
-- Writes remain available only through authenticated SECURITY DEFINER RPCs.

REVOKE ALL ON public.pedagogical_recommendations FROM PUBLIC;
REVOKE ALL ON public.pedagogical_recommendation_events FROM PUBLIC;

REVOKE ALL ON public.pedagogical_recommendations FROM anon;
REVOKE ALL ON public.pedagogical_recommendation_events FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.pedagogical_recommendations
  FROM authenticated;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.pedagogical_recommendation_events
  FROM authenticated;

GRANT SELECT ON public.pedagogical_recommendations TO authenticated;
GRANT SELECT ON public.pedagogical_recommendation_events TO authenticated;

REVOKE ALL ON FUNCTION public.pedagogical_recommendation_current_teacher(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pedagogical_recommendation_teacher_can_target(uuid, uuid, uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pedagogical_recommendation_can_read(public.pedagogical_recommendations) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_create_pedagogical_recommendation(uuid, uuid, text, text, text, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_set_pedagogical_recommendation_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_delete_pedagogical_recommendation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.pedagogical_recommendation_current_teacher(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.pedagogical_recommendation_teacher_can_target(uuid, uuid, uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.pedagogical_recommendation_can_read(public.pedagogical_recommendations) FROM anon;
REVOKE ALL ON FUNCTION public.teacher_create_pedagogical_recommendation(uuid, uuid, text, text, text, text, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.teacher_set_pedagogical_recommendation_status(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.teacher_delete_pedagogical_recommendation(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.pedagogical_recommendation_current_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pedagogical_recommendation_teacher_can_target(uuid, uuid, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pedagogical_recommendation_can_read(public.pedagogical_recommendations) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_create_pedagogical_recommendation(uuid, uuid, text, text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_set_pedagogical_recommendation_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_delete_pedagogical_recommendation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_list_pedagogical_recommendations(uuid) TO authenticated;
