-- Production ledger source; replay ONLY in disposable synthetic database.
-- Raw assessment snapshots contain answer keys. Student payloads are already
-- served by student_list_assessment_assignments, not by these raw tables.
begin;
do $preconditions$
begin
  if to_regprocedure('public.student_list_assessment_assignments()') is null
    or to_regprocedure('public.student_start_assessment_attempt_v2(uuid,text)') is null
    or to_regprocedure('public.student_save_assessment_response_v2(uuid,uuid,uuid,text,integer,jsonb)') is null
    or to_regprocedure('public.student_submit_assessment_attempt_v2(uuid)') is null then
    raise exception 'ASSESSMENT_STUDENT_RPC_BASE_REQUIRED';
  end if;
  if exists (select 1 from pg_class where oid in (
    'public.assessment_questions'::regclass,
    'public.assessment_booklet_questions'::regclass,
    'public.assessments'::regclass) and not relrowsecurity) then
    raise exception 'ASSESSMENT_SNAPSHOT_RLS_REQUIRED';
  end if;
end;
$preconditions$;
drop policy if exists assessment_questions_student_assigned_select on public.assessment_questions;
-- This is an intersection with existing policies, never a new staff grant.
-- The explicit staff predicate prevents a permissive student policy from
-- reopening the raw payload; visible assessment scope still limits teachers.
create policy assessment_raw_snapshot_staff_boundary on public.assessment_questions
as restrictive for select to public
using (
  (public.is_platform_admin()
    or public.current_platform_role() in ('professor','teacher')
    or public.has_question_bank_role(array[
      'admin','administrador','administrador_nacional','gestor','gestor_da_rede',
      'curator','curador','revisor','revisor_pedagogico','professor','aplicador',
      'visualizador','viewer','elaborador','aprovador','service_role'
    ]))
  and exists (select 1 from public.assessments a where a.id = assessment_id)
);
create policy assessment_booklet_raw_snapshot_staff_boundary on public.assessment_booklet_questions
as restrictive for select to public
using (
  (public.is_platform_admin()
    or public.current_platform_role() in ('professor','teacher')
    or public.has_question_bank_role(array[
      'admin','administrador','administrador_nacional','gestor','gestor_da_rede',
      'curator','curador','revisor','revisor_pedagogico','professor','aplicador',
      'visualizador','viewer','elaborador','aprovador','service_role'
    ]))
  and exists (select 1 from public.assessment_booklets b
    join public.assessments a on a.id = b.assessment_id where b.id = booklet_id)
);
-- No column removal, payload rewrite, new grant, result-release rule or mutation
-- of existing snapshots. SECURITY DEFINER grading/student RPCs are unchanged.
commit
