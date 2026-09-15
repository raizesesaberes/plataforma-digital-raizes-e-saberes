begin;

-- Communication V1 P0 hardening.
-- No new communication behavior is introduced here: this only removes
-- unnecessary public/anon execution and direct table writes.

revoke all on function public.publish_communication(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  date,
  timestamp with time zone
) from public, anon, authenticated;

revoke all on function public.secretaria_set_communication_status(uuid, text) from public, anon, authenticated;
revoke all on function public.secretaria_delete_communication(uuid) from public, anon, authenticated;
revoke all on function public.secretaria_list_communications() from public, anon, authenticated;
revoke all on function public.secretaria_list_communication_events() from public, anon, authenticated;
revoke all on function public.communication_can_read(public.communications) from public, anon, authenticated;
revoke all on function public.communication_current_student_can_read(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.communication_guardian_can_read(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.communication_teacher_can_target(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.institutional_guardian_can_access_calendar_entry(uuid, uuid) from public, anon, authenticated;
revoke all on function public.institutional_student_can_access_calendar_entry(uuid, uuid) from public, anon, authenticated;

grant execute on function public.publish_communication(
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  date,
  timestamp with time zone
) to authenticated;

grant execute on function public.secretaria_set_communication_status(uuid, text) to authenticated;
grant execute on function public.secretaria_delete_communication(uuid) to authenticated;
grant execute on function public.secretaria_list_communications() to authenticated;
grant execute on function public.secretaria_list_communication_events() to authenticated;
grant execute on function public.communication_can_read(public.communications) to authenticated;
grant execute on function public.communication_current_student_can_read(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.communication_guardian_can_read(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.communication_teacher_can_target(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.institutional_guardian_can_access_calendar_entry(uuid, uuid) to authenticated;
grant execute on function public.institutional_student_can_access_calendar_entry(uuid, uuid) to authenticated;

revoke all on table public.communications from public, anon, authenticated;
revoke all on table public.communication_events from public, anon, authenticated;
revoke all on table public.class_calendar_entries from public, anon, authenticated;

grant select on table public.communications to authenticated;
grant select on table public.communication_events to authenticated;

-- Current Minha Semana / agenda publication still writes class_calendar_entries
-- through existing authenticated RLS policies. Remove unsafe extras only.
grant select, insert, update on table public.class_calendar_entries to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('communications', 'communication_events', 'class_calendar_entries')
      and grantee = 'anon'
  ) then
    raise exception 'VALIDACAO bloqueada: anon ainda possui privilegios em tabelas de comunicacao/calendario';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('communications', 'communication_events')
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
  ) then
    raise exception 'VALIDACAO bloqueada: authenticated ainda possui escrita direta em communications/communication_events';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'class_calendar_entries'
      and grantee = 'authenticated'
      and privilege_type not in ('SELECT', 'INSERT', 'UPDATE')
  ) then
    raise exception 'VALIDACAO bloqueada: class_calendar_entries ainda possui grants autenticados excessivos';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'publish_communication',
        'secretaria_set_communication_status',
        'secretaria_delete_communication',
        'secretaria_list_communications',
        'secretaria_list_communication_events',
        'communication_can_read',
        'communication_current_student_can_read',
        'communication_guardian_can_read',
        'communication_teacher_can_target',
        'institutional_guardian_can_access_calendar_entry',
        'institutional_student_can_access_calendar_entry'
      )
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'VALIDACAO bloqueada: anon ainda executa RPC/helper de comunicacao';
  end if;
end $$;

commit;
