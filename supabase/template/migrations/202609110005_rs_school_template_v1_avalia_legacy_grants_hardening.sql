-- Avalia+ V1 - Fase 02
-- Hardening complementar dos grants legados do banco editorial.
-- Mantem escrita autenticada atual para preservar o Banco de Questoes ate existirem RPCs editoriais equivalentes.

do $$
begin
  if to_regclass('public.assessments') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessments nao existe';
  end if;

  if to_regclass('public.assessment_questions') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_questions nao existe';
  end if;

  if to_regclass('public.question_items') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_items nao existe';
  end if;

  if to_regclass('public.question_alternatives') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_alternatives nao existe';
  end if;
end
$$;

revoke all on public.assessments from anon;
revoke all on public.assessment_questions from anon;
revoke all on public.question_items from anon;
revoke all on public.question_alternatives from anon;

revoke all on public.assessments from public;
revoke all on public.assessment_questions from public;
revoke all on public.question_items from public;
revoke all on public.question_alternatives from public;

revoke truncate on public.assessments from authenticated;
revoke truncate on public.assessment_questions from authenticated;
revoke truncate on public.question_items from authenticated;
revoke truncate on public.question_alternatives from authenticated;

grant select on public.assessments to authenticated;
grant select on public.assessment_questions to authenticated;
grant select on public.question_items to authenticated;
grant select on public.question_alternatives to authenticated;
