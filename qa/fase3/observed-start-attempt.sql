-- Read-only schema observation from jaesjldrbjbdmzzggxzw on 2026-10-11.
-- TEST FIXTURE ONLY: production already has this correction; baseline is stale.
-- prosrc MD5: 4f11c798067d92f253b929fea32f6004
CREATE OR REPLACE FUNCTION public.student_start_assessment_attempt_v2(p_assignment_id uuid, p_application_token text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_student_id uuid;
  v_assignment public.assessment_assignments%rowtype;
  v_attempt public.assessment_attempts%rowtype;
  v_attempt_count integer;
  v_question_count integer;
  v_token_id uuid;
  v_order uuid[];
  v_deadline timestamptz;
begin
  if auth.uid() is null then raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501'; end if;
  select public.avalia_current_student_id() into v_student_id;
  select * into v_assignment from public.assessment_assignments where id = p_assignment_id for update;
  if v_student_id is null or v_assignment.id is null or not public.avalia_student_can_access_assignment(p_assignment_id, v_student_id) then
    raise exception 'Aluno nao autorizado para esta avaliacao.' using errcode = '42501';
  end if;
  if not public.avalia_plus_assignment_is_open(v_assignment) then
    raise exception 'Aplicacao fora do periodo autorizado.' using errcode = '42501';
  end if;
  v_token_id := public.avalia_plus_validate_token(p_assignment_id, v_student_id, p_application_token);
  select count(*) into v_attempt_count from public.assessment_attempts where assignment_id = p_assignment_id and student_id = v_student_id and status <> 'cancelled';
  if v_attempt_count >= v_assignment.max_attempts then raise exception 'Limite de tentativas atingido.' using errcode = '42501'; end if;
  select count(*) into v_question_count from public.assessment_questions aq where aq.assessment_id = v_assignment.assessment_id;
  v_deadline := case when v_assignment.time_limit_minutes is null then null else now() + make_interval(mins => v_assignment.time_limit_minutes) end;
  insert into public.assessment_attempts (assignment_id, assessment_id, school_id, student_id, attempt_number, status, booklet_id, access_token_id, application_status, deadline_at, started_at, remaining_seconds, question_count)
  values (p_assignment_id, v_assignment.assessment_id, v_assignment.school_id, v_student_id, v_attempt_count + 1, 'in_progress', v_assignment.booklet_id, v_token_id, 'EM_ANDAMENTO', v_deadline, now(), case when v_assignment.time_limit_minutes is null then null else v_assignment.time_limit_minutes * 60 end, v_question_count)
  returning * into v_attempt;
  v_order := public.avalia_plus_question_order(v_assignment.assessment_id, v_assignment.booklet_id, v_attempt.id, v_assignment.shuffle_questions);
  update public.assessment_attempts
     set question_order = v_order,
         alternative_order = public.avalia_plus_alternative_order(v_order, v_attempt.id, v_assignment.shuffle_alternatives),
         progress = public.avalia_plus_build_progress(v_attempt.id)
   where id = v_attempt.id returning * into v_attempt;
  update public.assessment_assignments set application_status = 'EM_ANDAMENTO', updated_at = now() where id = p_assignment_id;
  insert into public.assessment_attempt_events (attempt_id, assignment_id, student_id, actor_user_id, event_type) values (v_attempt.id, p_assignment_id, v_student_id, auth.uid(), 'STARTED');
  return jsonb_build_object('attempt', to_jsonb(v_attempt));
end;
$function$
;
