-- Avalia+ V1 - remove escrita direta autenticada no banco de questoes usado pelo aluno.
-- Escritas de aplicacao permanecem por RPCs server-side ja homologadas.

revoke insert, update, delete, truncate on public.assessment_questions from authenticated;
revoke insert, update, delete, truncate on public.question_items from authenticated;
revoke insert, update, delete, truncate on public.question_alternatives from authenticated;
