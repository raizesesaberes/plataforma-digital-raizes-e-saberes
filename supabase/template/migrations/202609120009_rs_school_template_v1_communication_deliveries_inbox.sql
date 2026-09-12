begin;

-- Communication V1 Phase 02B.
-- Keep communications as the canonical message body and add per-recipient
-- delivery/read state for inboxes, unread badges and idempotent read tracking.

create table if not exists public.communication_deliveries (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references public.communications(id) on delete cascade,
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  delivered_at timestamp with time zone not null default now(),
  read_at timestamp with time zone,
  notification_status text not null default 'unread',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint communication_deliveries_status_check
    check (notification_status = any (array['unread'::text, 'read'::text, 'archived'::text]))
);

create unique index if not exists communication_deliveries_unique_context_idx
  on public.communication_deliveries (
    communication_id,
    recipient_profile_id,
    coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists communication_deliveries_recipient_status_idx
  on public.communication_deliveries (recipient_profile_id, notification_status, delivered_at desc);

create index if not exists communication_deliveries_student_idx
  on public.communication_deliveries (student_id, delivered_at desc);

create index if not exists communication_deliveries_school_idx
  on public.communication_deliveries (school_id, delivered_at desc);

drop trigger if exists communication_deliveries_touch_updated_at on public.communication_deliveries;
create trigger communication_deliveries_touch_updated_at
before update on public.communication_deliveries
for each row execute function public.institutional_touch_updated_at();

alter table public.communication_deliveries enable row level security;

drop policy if exists communication_deliveries_select_own on public.communication_deliveries;
create policy communication_deliveries_select_own
on public.communication_deliveries
for select
to authenticated
using (recipient_profile_id = (select auth.uid()));

create or replace function public.communication_delivery_is_active(p_comm public.communications)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    p_comm.status = 'published'
    and (p_comm.expires_at is null or p_comm.expires_at > now())
    and p_comm.deleted_at is null;
$$;

create or replace function public.communication_generate_deliveries(p_communication_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_comm public.communications%rowtype;
  v_inserted integer := 0;
begin
  select * into v_comm
  from public.communications
  where id = p_communication_id;

  if v_comm.id is null or not public.communication_delivery_is_active(v_comm) then
    return 0;
  end if;

  with eligible as (
    select distinct
      g.profile_id as recipient_profile_id,
      e.student_id,
      e.school_id
    from public.enrollments e
    join public.student_guardian_links sgl on sgl.student_id = e.student_id
    join public.guardians g on g.id = sgl.guardian_id
    join public.profiles p on p.id = g.profile_id
    where g.profile_id is not null
      and g.status = 'active'
      and sgl.status = 'active'
      and e.status = 'active'
      and e.ended_at is null
      and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
      )

    union

    select distinct
      sg.profile_id as recipient_profile_id,
      e.student_id,
      e.school_id
    from public.enrollments e
    join public.student_guardians sg on sg.student_id = e.student_id
    join public.profiles p on p.id = sg.profile_id
    where sg.status = 'active'
      and e.status = 'active'
      and e.ended_at is null
      and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
      )

    union

    select distinct
      s.user_id as recipient_profile_id,
      e.student_id,
      e.school_id
    from public.enrollments e
    join public.students s on s.id = e.student_id
    join public.profiles p on p.id = s.user_id and p.platform_role = 'aluno'
    where v_comm.audience_type in ('school', 'class')
      and s.user_id is not null
      and e.status = 'active'
      and e.ended_at is null
      and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
      )
  )
  insert into public.communication_deliveries (
    communication_id,
    recipient_profile_id,
    student_id,
    school_id,
    delivered_at,
    notification_status
  )
  select
    v_comm.id,
    eligible.recipient_profile_id,
    eligible.student_id,
    eligible.school_id,
    now(),
    'unread'
  from eligible
  where eligible.recipient_profile_id is not null
  on conflict (communication_id, recipient_profile_id, (coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create or replace function public.communication_get_inbox(
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
  unread_count integer
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
    scoped.title,
    scoped.body,
    scoped.communication_type,
    scoped.audience_type,
    scoped.author_profile_id,
    scoped.author_role,
    coalesce(scoped.author_display_name, scoped.author_role, 'Equipe escolar'),
    scoped.communication_date,
    scoped.communication_created_at,
    scoped.delivered_at,
    scoped.read_at,
    case when scoped.read_at is null then 'unread' else 'read' end,
    scoped.child_name,
    scoped.class_name,
    case
      when scoped.audience_type = 'student' then coalesce('Individual: ' || scoped.child_name, 'Individual')
      when scoped.audience_type = 'class' then coalesce('Turma: ' || scoped.class_name, 'Turma')
      else 'Comunicado da escola'
    end,
    scoped.total_unread
  from scoped
  order by scoped.delivered_at desc, scoped.communication_created_at desc
  limit v_limit offset v_offset;
end;
$$;

create or replace function public.communication_mark_read(p_delivery_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_profile_id uuid := auth.uid();
  v_delivery public.communication_deliveries%rowtype;
  v_changed boolean := false;
begin
  if v_profile_id is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_delivery
  from public.communication_deliveries
  where id = p_delivery_id
    and recipient_profile_id = v_profile_id
  for update;

  if v_delivery.id is null then
    raise exception 'Entrega nao encontrada para este usuario.' using errcode = '42501';
  end if;

  if v_delivery.read_at is null then
    update public.communication_deliveries
    set read_at = now(),
        notification_status = 'read'
    where id = v_delivery.id
    returning * into v_delivery;
    v_changed := true;
  end if;

  return jsonb_build_object(
    'delivery_id', v_delivery.id,
    'communication_id', v_delivery.communication_id,
    'read_at', v_delivery.read_at,
    'changed', v_changed
  );
end;
$$;

create or replace function public.communication_list_delivery_summaries()
returns table (
  communication_id uuid,
  delivered_count integer,
  read_count integer,
  unread_count integer
)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    c.id as communication_id,
    count(d.id)::integer as delivered_count,
    count(d.id) filter (where d.read_at is not null)::integer as read_count,
    count(d.id) filter (where d.read_at is null)::integer as unread_count
  from public.communications c
  left join public.communication_deliveries d on d.communication_id = c.id
  where public.secretaria_can_manage_school(c.school_id)
    or (
      c.author_profile_id = (select auth.uid())
      and public.communication_teacher_can_target(c.school_id, c.class_id, c.student_id, c.audience_type)
    )
  group by c.id;
$$;

create or replace function public.publish_communication(
  p_school_id uuid,
  p_communication_type text,
  p_audience_type text,
  p_title text,
  p_body text,
  p_class_id uuid default null,
  p_student_id uuid default null,
  p_status text default 'published',
  p_communication_date date default current_date,
  p_expires_at timestamp with time zone default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_role text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'platform_role', auth.jwt() -> 'app_metadata' ->> 'role', ''));
  v_author uuid := auth.uid();
  v_comm public.communications%rowtype;
  v_deliveries integer := 0;
begin
  if v_author is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if p_communication_type not in ('message', 'notice', 'weekly_information', 'institutional_announcement') then
    raise exception 'Tipo de comunicacao invalido.' using errcode = '22023';
  end if;

  if p_audience_type not in ('student', 'class', 'school') then
    raise exception 'Tipo de destino invalido.' using errcode = '22023';
  end if;

  if coalesce(p_status, 'published') not in ('draft', 'published', 'archived') then
    raise exception 'Status de comunicacao invalido.' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 or length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Titulo e mensagem sao obrigatorios.' using errcode = '22023';
  end if;

  if p_audience_type = 'school' and (p_class_id is not null or p_student_id is not null) then
    raise exception 'Comunicado escolar nao deve informar turma/aluno.' using errcode = '22023';
  end if;

  if p_audience_type = 'class' and (p_class_id is null or p_student_id is not null) then
    raise exception 'Comunicado de turma deve informar somente class_id.' using errcode = '22023';
  end if;

  if p_audience_type = 'student' and (p_class_id is null or p_student_id is null) then
    raise exception 'Comunicado individual deve informar class_id e student_id.' using errcode = '22023';
  end if;

  if public.secretaria_can_manage_school(p_school_id) then
    null;
  elsif v_role = 'professor' and public.communication_teacher_can_target(p_school_id, p_class_id, p_student_id, p_audience_type) then
    if p_audience_type = 'school' then
      raise exception 'Professor nao pode publicar comunicado institucional nesta V1.' using errcode = '42501';
    end if;
  else
    raise exception 'Usuario sem permissao para publicar este comunicado.' using errcode = '42501';
  end if;

  if p_audience_type in ('class', 'student') and not exists (
    select 1 from public.classes c
    where c.id = p_class_id
      and c.school_id = p_school_id
      and c.status = 'active'
  ) then
    raise exception 'Turma ativa nao pertence a escola informada.' using errcode = '42501';
  end if;

  if p_audience_type = 'student' and not exists (
    select 1 from public.enrollments e
    where e.student_id = p_student_id
      and e.class_id = p_class_id
      and e.school_id = p_school_id
      and e.status = 'active'
      and e.ended_at is null
  ) then
    raise exception 'Aluno nao possui matricula ativa nesta turma/escola.' using errcode = '42501';
  end if;

  insert into public.communications (
    school_id,
    author_profile_id,
    author_role,
    communication_type,
    audience_type,
    class_id,
    student_id,
    title,
    body,
    communication_date,
    expires_at,
    status
  )
  values (
    p_school_id,
    v_author,
    coalesce(nullif(v_role, ''), 'authenticated'),
    p_communication_type,
    p_audience_type,
    p_class_id,
    p_student_id,
    btrim(p_title),
    btrim(p_body),
    coalesce(p_communication_date, current_date),
    p_expires_at,
    coalesce(p_status, 'published')
  )
  returning * into v_comm;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, 'created', null, v_comm.status, v_author);

  if v_comm.status = 'published' then
    insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
    values (v_comm.id, 'published', 'draft', 'published', v_author);
    v_deliveries := public.communication_generate_deliveries(v_comm.id);
  elsif v_comm.status = 'archived' then
    insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
    values (v_comm.id, 'archived', 'draft', 'archived', v_author);
  end if;

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'audience_type', v_comm.audience_type,
    'communication_type', v_comm.communication_type,
    'status', v_comm.status,
    'deliveries_created', v_deliveries
  );
end;
$$;

create or replace function public.secretaria_set_communication_status(
  p_communication_id uuid,
  p_to_status text
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_author uuid := auth.uid();
  v_to_status text := lower(nullif(trim(p_to_status), ''));
  v_comm public.communications%rowtype;
  v_from_status text;
  v_event_type text;
  v_deliveries integer := 0;
begin
  if v_author is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_to_status not in ('published', 'archived') then
    raise exception 'Status de comunicacao invalido.' using errcode = '22023';
  end if;

  select * into v_comm
  from public.communications
  where id = p_communication_id
  for update;

  if v_comm.id is null then
    raise exception 'Comunicado nao encontrado.' using errcode = '22023';
  end if;

  if v_comm.status = 'deleted' then
    raise exception 'Comunicado excluido nao pode ser republicado.' using errcode = '42501';
  end if;

  if not (
    public.secretaria_can_manage_school(v_comm.school_id)
    or (
      v_comm.author_profile_id = v_author
      and public.communication_teacher_can_target(v_comm.school_id, v_comm.class_id, v_comm.student_id, v_comm.audience_type)
    )
  ) then
    raise exception 'Usuario sem permissao para alterar este comunicado.' using errcode = '42501';
  end if;

  if v_comm.status = v_to_status then
    if v_to_status = 'published' then
      v_deliveries := public.communication_generate_deliveries(v_comm.id);
    end if;
    return jsonb_build_object(
      'communication_id', v_comm.id,
      'from_status', v_comm.status,
      'to_status', v_to_status,
      'changed', false,
      'deliveries_created', v_deliveries
    );
  end if;

  if v_comm.status = 'published' and v_to_status <> 'archived' then
    raise exception 'Comunicado publicado permite somente retirada da publicacao.' using errcode = '22023';
  end if;

  if v_comm.status in ('draft', 'archived') and v_to_status <> 'published' then
    raise exception 'Rascunho ou comunicado retirado permite somente publicacao.' using errcode = '22023';
  end if;

  v_from_status := v_comm.status;

  update public.communications
  set status = v_to_status,
      deleted_at = null,
      deleted_by = null
  where id = v_comm.id
  returning * into v_comm;

  v_event_type := case
    when v_to_status = 'published' then 'published'
    when v_to_status = 'archived' then 'archived'
    else 'edited'
  end;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, v_event_type, v_from_status, v_to_status, v_author);

  if v_to_status = 'published' then
    v_deliveries := public.communication_generate_deliveries(v_comm.id);
  end if;

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'from_status', v_from_status,
    'to_status', v_to_status,
    'changed', true,
    'deliveries_created', v_deliveries
  );
end;
$$;

grant select on table public.communication_deliveries to authenticated;
revoke all on table public.communication_deliveries from anon;
revoke insert, update, delete, truncate, references, trigger on table public.communication_deliveries from authenticated;

revoke all on function public.communication_delivery_is_active(public.communications) from public, anon, authenticated;
revoke all on function public.communication_generate_deliveries(uuid) from public, anon, authenticated;
revoke all on function public.communication_get_inbox(uuid, text, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.communication_mark_read(uuid) from public, anon, authenticated;
revoke all on function public.communication_list_delivery_summaries() from public, anon, authenticated;

grant execute on function public.communication_get_inbox(uuid, text, integer, integer, integer) to authenticated;
grant execute on function public.communication_mark_read(uuid) to authenticated;
grant execute on function public.communication_list_delivery_summaries() to authenticated;

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

do $$
begin
  perform public.communication_generate_deliveries(c.id)
  from public.communications c
  where c.status = 'published'
    and c.deleted_at is null
    and (c.expires_at is null or c.expires_at > now());

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'communication_deliveries'
      and grantee = 'anon'
  ) then
    raise exception 'VALIDACAO bloqueada: anon possui privilegios em communication_deliveries';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'communication_deliveries'
      and grantee = 'authenticated'
      and privilege_type <> 'SELECT'
  ) then
    raise exception 'VALIDACAO bloqueada: authenticated possui escrita direta em communication_deliveries';
  end if;

  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'communication_delivery_is_active',
        'communication_generate_deliveries',
        'communication_get_inbox',
        'communication_mark_read',
        'communication_list_delivery_summaries'
      )
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'VALIDACAO bloqueada: anon executa RPC/helper de deliveries';
  end if;
end $$;

commit;
