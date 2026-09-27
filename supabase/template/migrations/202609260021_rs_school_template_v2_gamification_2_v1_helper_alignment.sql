-- Alinhamento auxiliar da Gamificacao 2.0 V1.
-- Mantem o PILOT com os helpers presentes no contrato canonico local.

create or replace function public.gamification_rankings_enabled(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(
    (select gs.rankings_enabled from public.gamification_settings gs where gs.school_id = p_school_id),
    (select gs.rankings_enabled from public.gamification_settings gs where gs.school_id is null limit 1),
    true
  );
$$;

create or replace function public.gamification_log_event(
  p_student_id uuid,
  p_school_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  insert into public.gamification_audit_events (student_id, school_id, actor_user_id, event_type, details)
  values (p_student_id, p_school_id, auth.uid(), p_event_type, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function public.gamification_rankings_enabled(uuid) from public, anon;
revoke all on function public.gamification_log_event(uuid, uuid, text, jsonb) from public, anon;

grant execute on function public.gamification_rankings_enabled(uuid) to authenticated, service_role;
grant execute on function public.gamification_log_event(uuid, uuid, text, jsonb) to authenticated, service_role;

do $$
begin
  if to_regprocedure('public.gamification_rankings_enabled(uuid)') is null then
    raise exception 'VALIDACAO bloqueada: gamification_rankings_enabled ausente';
  end if;
  if to_regprocedure('public.gamification_log_event(uuid,uuid,text,jsonb)') is null then
    raise exception 'VALIDACAO bloqueada: gamification_log_event ausente';
  end if;
  if exists (
    select 1
    from information_schema.role_routine_grants
    where routine_schema = 'public'
      and grantee = 'anon'
      and routine_name like '%gamification%'
  ) then
    raise exception 'VALIDACAO bloqueada: RPC Gamificacao exposta para anon';
  end if;
end $$;
