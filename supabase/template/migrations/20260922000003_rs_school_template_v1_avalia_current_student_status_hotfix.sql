-- FASE 03D.1 - hotfix de compatibilidade do status do aluno no Avalia+.
-- Ajusta somente avalia_current_student_id para aceitar estados ativos
-- usados pelo modelo atual: active e ativo.

CREATE OR REPLACE FUNCTION public.avalia_current_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT s.id
  FROM public.students s
  LEFT JOIN public.users u ON u.id = s.user_id
  WHERE lower(coalesce(s.status, 'active')) IN ('active', 'ativo')
    AND (
      s.user_id = auth.uid()
      OR lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      OR lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  ORDER BY s.updated_at DESC NULLS LAST, s.created_at DESC NULLS LAST
  LIMIT 1;
$$;
