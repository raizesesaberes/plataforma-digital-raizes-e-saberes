begin;

-- Notifications V1 Phase 02 hotfix.
-- Qualify read_at inside notification_get_center to avoid ambiguity between
-- PL/pgSQL output columns and CTE columns. No schema, RLS or grant changes.

create or replace function public.notification_get_center(
  p_student_id uuid default null,
  p_read_filter text default 'all',
  p_period_days integer default 90,
  p_limit integer default 50,
  p_offset integer default 0
) returns table (
  item_type text,
  delivery_id uuid,
  source_type text,
  source_id uuid,
  school_id uuid,
  student_id uuid,
  title text,
  summary text,
  origin_label text,
  priority text,
  deep_link text,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  notification_status text,
  child_name text,
  class_name text,
  unread_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid := auth.uid();
  v_role text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', auth.jwt() -> 'app_metadata' ->> 'role', ''));
  v_filter text := lower(coalesce(nullif(trim(p_read_filter), ''), 'all'));
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
  v_days integer := greatest(1, least(coalesce(p_period_days, 90), 365));
begin
  if v_profile_id is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_filter not in ('all', 'read', 'unread') then
    raise exception 'Filtro de leitura invalido.' using errcode = '22023';
  end if;

  if p_student_id is not null and v_role = 'educacao_infantil' and not public.calendar_family_can_access_student(p_student_id) then
    raise exception 'Crianca fora do vinculo familiar.' using errcode = '42501';
  end if;

  return query
  with center_items as (
    select
      'communication'::text as item_type,
      cd.id as delivery_id,
      'communication'::text as source_type,
      c.id as source_id,
      cd.school_id,
      cd.student_id,
      c.title::text,
      c.body::text as summary,
      'Recados'::text as origin_label,
      'normal'::text as priority,
      'familia.html?view=recados'::text as deep_link,
      cd.delivered_at,
      cd.read_at,
      (case when cd.read_at is null then 'unread' else 'read' end)::text as notification_status,
      s.nome::text as child_name,
      cl.nome::text as class_name
    from public.communication_deliveries cd
    join public.communications c on c.id = cd.communication_id
    left join public.students s on s.id = cd.student_id
    left join public.enrollments e on e.student_id = cd.student_id
      and e.school_id = cd.school_id
      and e.status = 'active'
      and e.ended_at is null
    left join public.classes cl on cl.id = e.class_id
    where cd.recipient_profile_id = v_profile_id
      and public.communication_delivery_is_active(c)
      and cd.delivered_at >= now() - make_interval(days => v_days)
      and (p_student_id is null or cd.student_id = p_student_id)

    union all

    select
      'notification'::text,
      nd.id,
      ne.source_type,
      ne.source_id,
      nd.school_id,
      nd.student_id,
      ne.title::text,
      ne.summary::text,
      case
        when ne.source_type = 'calendar' then 'Agenda'
        when ne.source_type = 'assessment' then 'Avalia+'
        when ne.source_type = 'analytics_alert' then 'Analytics'
        else 'Notificacao'
      end::text,
      ne.priority::text,
      ne.deep_link::text,
      nd.delivered_at,
      nd.read_at,
      (case when nd.read_at is null then 'unread' else 'read' end)::text,
      s.nome::text,
      cl.nome::text
    from public.notification_deliveries nd
    join public.notification_events ne on ne.id = nd.notification_event_id
    left join public.students s on s.id = nd.student_id
    left join public.enrollments e on e.student_id = nd.student_id
      and e.school_id = nd.school_id
      and e.status = 'active'
      and e.ended_at is null
    left join public.classes cl on cl.id = e.class_id
    where nd.recipient_profile_id = v_profile_id
      and nd.delivered_at >= now() - make_interval(days => v_days)
      and (p_student_id is null or nd.student_id = p_student_id)
  ),
  filtered as (
    select *
    from center_items
    where v_filter = 'all'
       or (v_filter = 'read' and center_items.read_at is not null)
       or (v_filter = 'unread' and center_items.read_at is null)
  ),
  counted as (
    select
      filtered.*,
      count(*) filter (where filtered.read_at is null) over ()::integer as total_unread
    from filtered
  )
  select
    counted.item_type,
    counted.delivery_id,
    counted.source_type,
    counted.source_id,
    counted.school_id,
    counted.student_id,
    counted.title,
    counted.summary,
    counted.origin_label,
    counted.priority,
    counted.deep_link,
    counted.delivered_at,
    counted.read_at,
    counted.notification_status,
    counted.child_name,
    counted.class_name,
    counted.total_unread
  from counted
  order by counted.delivered_at desc, counted.source_id
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.notification_get_center(uuid, text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.notification_get_center(uuid, text, integer, integer, integer) to authenticated;

commit;
