begin;

-- Hotfix cirurgico: estabiliza os tipos retornados por communication_get_inbox.
-- A migration anterior adicionou campos de deep link/source e a chamada real da RPC
-- revelou incompatibilidade de tipos text/varchar em RETURNS TABLE.

drop function if exists public.communication_get_inbox(uuid, text, integer, integer, integer);

create function public.communication_get_inbox(
  p_student_id uuid default null,
  p_read_filter text default 'all',
  p_period_days integer default 90,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  delivery_id uuid,
  communication_id uuid,
  school_id uuid,
  student_id uuid,
  title text,
  body text,
  communication_type text,
  audience_type text,
  author_profile_id uuid,
  author_role text,
  author_name text,
  communication_date date,
  created_at timestamp with time zone,
  delivered_at timestamp with time zone,
  read_at timestamp with time zone,
  notification_status text,
  child_name text,
  class_name text,
  context_label text,
  unread_count integer,
  action_label text,
  href text,
  source_type text,
  source_id uuid
)
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
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

  if p_student_id is not null and v_role = 'educacao_infantil' and not exists (
    select 1
    from public.guardians g
    join public.student_guardian_links sgl on sgl.guardian_id = g.id
    where g.profile_id = v_profile_id
      and g.status = 'active'
      and sgl.status = 'active'
      and sgl.student_id = p_student_id
  ) and not exists (
    select 1
    from public.student_guardians sg
    where sg.profile_id = v_profile_id
      and sg.status = 'active'
      and sg.student_id = p_student_id
  ) then
    raise exception 'Crianca fora do vinculo familiar.' using errcode = '42501';
  end if;

  return query
  with scoped as (
    select
      d.*,
      c.title,
      c.body,
      c.communication_type,
      c.audience_type,
      c.author_profile_id,
      c.author_role,
      c.communication_date,
      c.created_at as communication_created_at,
      c.action_label,
      c.href,
      c.source_type,
      c.source_id,
      s.nome as child_name,
      cl.nome as class_name,
      p.display_name as author_display_name,
      count(*) filter (where d.read_at is null) over ()::integer as total_unread
    from public.communication_deliveries d
    join public.communications c on c.id = d.communication_id
    left join public.students s on s.id = d.student_id
    left join public.enrollments e on e.student_id = d.student_id
      and e.school_id = d.school_id
      and e.status = 'active'
      and e.ended_at is null
    left join public.classes cl on cl.id = e.class_id
    left join public.profiles p on p.id = c.author_profile_id
    where d.recipient_profile_id = v_profile_id
      and public.communication_delivery_is_active(c)
      and d.delivered_at >= now() - make_interval(days => v_days)
      and (p_student_id is null or d.student_id = p_student_id)
      and (v_filter = 'all' or (v_filter = 'read' and d.read_at is not null) or (v_filter = 'unread' and d.read_at is null))
  )
  select
    scoped.id,
    scoped.communication_id,
    scoped.school_id,
    scoped.student_id,
    scoped.title::text,
    scoped.body::text,
    scoped.communication_type::text,
    scoped.audience_type::text,
    scoped.author_profile_id,
    scoped.author_role::text,
    coalesce(scoped.author_display_name, scoped.author_role, 'Equipe escolar')::text,
    scoped.communication_date,
    scoped.communication_created_at,
    scoped.delivered_at,
    scoped.read_at,
    (case when scoped.read_at is null then 'unread' else 'read' end)::text,
    scoped.child_name::text,
    scoped.class_name::text,
    (case
      when scoped.audience_type = 'student' then coalesce('Individual: ' || scoped.child_name, 'Individual')
      when scoped.audience_type = 'class' then coalesce('Turma: ' || scoped.class_name, 'Turma')
      else 'Comunicado da escola'
    end)::text,
    scoped.total_unread,
    scoped.action_label::text,
    scoped.href::text,
    scoped.source_type::text,
    scoped.source_id
  from scoped
  order by scoped.delivered_at desc, scoped.communication_created_at desc
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.communication_get_inbox(uuid, text, integer, integer, integer)
  from public, anon, authenticated;

grant execute on function public.communication_get_inbox(uuid, text, integer, integer, integer)
  to authenticated;

do $$
begin
  if has_function_privilege('anon', 'public.communication_get_inbox(uuid, text, integer, integer, integer)', 'EXECUTE') then
    raise exception 'VALIDACAO bloqueada: anon executa communication_get_inbox';
  end if;
end $$;

commit;
