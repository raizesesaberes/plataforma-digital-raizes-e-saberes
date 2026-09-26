begin;

-- Notificacoes V1 fechamento: Agenda e Avalia+ passam pelo motor canonico
-- communications -> communication_deliveries, sem criar uma segunda central.

alter table public.communications
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists action_label text,
  add column if not exists href text;

create unique index if not exists communications_source_unique_idx
  on public.communications (source_type, source_id)
  where source_type is not null and source_id is not null;

create or replace function public.communication_upsert_system_notification(
  p_source_type text,
  p_source_id uuid,
  p_school_id uuid,
  p_author_profile_id uuid,
  p_author_role text,
  p_audience_type text,
  p_class_id uuid,
  p_student_id uuid,
  p_title text,
  p_body text,
  p_communication_date date default current_date,
  p_action_label text default null,
  p_href text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_source_type text := lower(nullif(btrim(coalesce(p_source_type, '')), ''));
  v_audience_type text := lower(nullif(btrim(coalesce(p_audience_type, '')), ''));
  v_comm public.communications%rowtype;
  v_deliveries integer := 0;
begin
  if v_source_type not in ('calendar', 'assessment') then
    raise exception 'Fonte de notificacao invalida.' using errcode = '22023';
  end if;

  if p_source_id is null or p_school_id is null then
    raise exception 'Origem e escola sao obrigatorias para notificacao.' using errcode = '22023';
  end if;

  if p_author_profile_id is null then
    raise exception 'Autor da notificacao obrigatorio.' using errcode = '42501';
  end if;

  if v_audience_type not in ('class', 'student') then
    raise exception 'Notificacao automatica deve ser de turma ou aluno.' using errcode = '22023';
  end if;

  if v_audience_type = 'class' and (p_class_id is null or p_student_id is not null) then
    raise exception 'Notificacao de turma deve informar somente class_id.' using errcode = '22023';
  end if;

  if v_audience_type = 'student' and (p_class_id is null or p_student_id is null) then
    raise exception 'Notificacao individual deve informar class_id e student_id.' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 or length(btrim(coalesce(p_body, ''))) = 0 then
    raise exception 'Titulo e corpo sao obrigatorios para notificacao.' using errcode = '22023';
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
    status,
    source_type,
    source_id,
    action_label,
    href
  )
  values (
    p_school_id,
    p_author_profile_id,
    coalesce(nullif(btrim(coalesce(p_author_role, '')), ''), 'system'),
    'notice',
    v_audience_type,
    p_class_id,
    p_student_id,
    btrim(p_title),
    btrim(p_body),
    coalesce(p_communication_date, current_date),
    'published',
    v_source_type,
    p_source_id,
    nullif(btrim(coalesce(p_action_label, '')), ''),
    nullif(btrim(coalesce(p_href, '')), '')
  )
  on conflict (source_type, source_id)
  where source_type is not null and source_id is not null
  do update set
    school_id = excluded.school_id,
    author_profile_id = excluded.author_profile_id,
    author_role = excluded.author_role,
    communication_type = excluded.communication_type,
    audience_type = excluded.audience_type,
    class_id = excluded.class_id,
    student_id = excluded.student_id,
    title = excluded.title,
    body = excluded.body,
    communication_date = excluded.communication_date,
    status = 'published',
    deleted_at = null,
    deleted_by = null,
    action_label = excluded.action_label,
    href = excluded.href,
    updated_at = now()
  returning * into v_comm;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, 'published', null, 'published', p_author_profile_id);

  v_deliveries := public.communication_generate_deliveries(v_comm.id);

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'source_type', v_comm.source_type,
    'source_id', v_comm.source_id,
    'deliveries_created', v_deliveries
  );
end;
$$;

create or replace function public.teacher_upsert_calendar_entry(
  p_entry_id uuid default null,
  p_plan_id uuid default null,
  p_class_id uuid default null,
  p_entry_date date default current_date,
  p_start_time time default null,
  p_end_time time default null,
  p_title text default '',
  p_description text default null,
  p_entry_type text default 'outro'
) returns public.class_calendar_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_teacher public.teachers%rowtype;
  v_entry public.class_calendar_entries%rowtype;
  v_type text := lower(coalesce(nullif(btrim(p_entry_type), ''), 'outro'));
  v_time text;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if p_class_id is null then
    raise exception 'Turma obrigatoria.' using errcode = '22023';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
    and coalesce(status, 'active') = 'active';

  if v_class.id is null or v_class.school_id is null then
    raise exception 'Turma institucional nao encontrada.' using errcode = '22023';
  end if;

  select t.* into v_teacher
  from public.teachers t
  join public.class_teacher_memberships ctm on ctm.teacher_id = t.id
  where t.profile_id = auth.uid()
    and t.school_id = v_class.school_id
    and coalesce(t.status, 'active') = 'active'
    and ctm.class_id = v_class.id
    and ctm.status = 'active'
    and ctm.started_at <= now()
    and (ctm.ended_at is null or ctm.ended_at > now())
  order by ctm.started_at desc
  limit 1;

  if v_teacher.id is null and public.is_platform_admin() then
    select t.* into v_teacher
    from public.teachers t
    where t.school_id = v_class.school_id
      and coalesce(t.status, 'active') = 'active'
    order by t.created_at asc
    limit 1;
  end if;

  if v_teacher.id is null then
    raise exception 'Professor nao autorizado para esta turma.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'Titulo obrigatorio.' using errcode = '22023';
  end if;

  if v_type not in ('atividade', 'aula', 'lembrete', 'livro', 'experiencia', 'atividade_online', 'outro') then
    v_type := 'outro';
  end if;

  if p_end_time is not null and p_start_time is not null and p_end_time <= p_start_time then
    raise exception 'Horario final deve ser posterior ao inicial.' using errcode = '22023';
  end if;

  if p_plan_id is not null and not public.institutional_plan_matches_publication(p_plan_id, v_teacher.id, v_class.id, v_class.school_id) then
    raise exception 'Planejamento nao pertence a esta turma/professor.' using errcode = '42501';
  end if;

  if p_entry_id is not null then
    update public.class_calendar_entries
    set
      plan_id = p_plan_id,
      entry_date = p_entry_date,
      start_time = p_start_time,
      end_time = p_end_time,
      title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      entry_type = v_type,
      status = 'published',
      updated_at = now()
    where id = p_entry_id
      and class_id = v_class.id
      and school_id = v_class.school_id
      and teacher_id = v_teacher.id
    returning * into v_entry;

    if v_entry.id is null then
      raise exception 'Publicacao de agenda nao encontrada para este professor/turma.' using errcode = '42501';
    end if;
  else
    insert into public.class_calendar_entries (
      class_id, school_id, teacher_id, plan_id, entry_date, start_time, end_time,
      title, description, entry_type, status
    ) values (
      v_class.id, v_class.school_id, v_teacher.id, p_plan_id, p_entry_date, p_start_time, p_end_time,
      btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), v_type, 'published'
    )
    returning * into v_entry;
  end if;

  v_time := case
    when v_entry.start_time is not null then ' às ' || to_char(v_entry.start_time, 'HH24:MI')
    else ''
  end;

  perform public.communication_upsert_system_notification(
    'calendar',
    v_entry.id,
    v_entry.school_id,
    auth.uid(),
    'professor',
    'class',
    v_entry.class_id,
    null,
    'Agenda: ' || v_entry.title,
    coalesce(nullif(v_entry.description, ''), 'Novo compromisso publicado para a turma.') || ' Data: ' || to_char(v_entry.entry_date, 'DD/MM/YYYY') || v_time || '.',
    v_entry.entry_date,
    'Abrir agenda',
    'agenda'
  );

  return v_entry;
end;
$$;

create or replace function public.teacher_create_assessment_assignment(
  p_assessment_id uuid,
  p_target_type text,
  p_class_id uuid,
  p_student_id uuid default null,
  p_available_from timestamptz default now(),
  p_available_until timestamptz default null,
  p_time_limit_minutes integer default null,
  p_max_attempts integer default 1,
  p_status text default 'published'
)
returns public.assessment_assignments
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_teacher_id uuid;
  v_school_id uuid;
  v_target_type text := nullif(btrim(coalesce(p_target_type, '')), '');
  v_status text := coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'published');
  v_assignment public.assessment_assignments%rowtype;
  v_assessment_title text;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_target_type not in ('class', 'student') then
    raise exception 'target_type deve ser class ou student.' using errcode = '22023';
  end if;

  if v_status not in ('draft', 'published') then
    raise exception 'Criacao permite somente draft ou published.' using errcode = '22023';
  end if;

  if p_max_attempts is null or p_max_attempts <= 0 then
    raise exception 'max_attempts deve ser maior que zero.' using errcode = '22023';
  end if;

  if p_time_limit_minutes is not null and p_time_limit_minutes <= 0 then
    raise exception 'time_limit_minutes deve ser nulo ou maior que zero.' using errcode = '22023';
  end if;

  if p_available_until is not null and p_available_until <= coalesce(p_available_from, now()) then
    raise exception 'available_until deve ser posterior a available_from.' using errcode = '22023';
  end if;

  select c.school_id
    into v_school_id
  from public.classes c
  where c.id = p_class_id
    and coalesce(c.status, 'active') = 'active';

  if v_school_id is null then
    raise exception 'Turma ativa nao encontrada.' using errcode = '42501';
  end if;

  select public.avalia_current_teacher_id() into v_teacher_id;

  if v_teacher_id is null then
    raise exception 'Professor institucional ativo nao encontrado.' using errcode = '42501';
  end if;

  if not public.institutional_teacher_can_manage_class(v_teacher_id, p_class_id, v_school_id) then
    raise exception 'Professor nao gerencia esta turma/escola.' using errcode = '42501';
  end if;

  if not public.avalia_assessment_is_assignable(p_assessment_id) then
    raise exception 'Avaliacao nao esta disponivel para aplicacao.' using errcode = '42501';
  end if;

  select coalesce(nullif(title, ''), 'Avalia+') into v_assessment_title
  from public.assessments
  where id = p_assessment_id;

  if v_target_type = 'student' then
    if p_student_id is null then
      raise exception 'student_id e obrigatorio para alvo student.' using errcode = '22023';
    end if;

    if not exists (
      select 1
      from public.enrollments e
      join public.students s on s.id = e.student_id
      where e.student_id = p_student_id
        and e.class_id = p_class_id
        and e.school_id = v_school_id
        and e.status = 'active'
        and e.enrolled_at <= now()
        and (e.ended_at is null or e.ended_at > now())
        and coalesce(s.status, 'active') = 'active'
    ) then
      raise exception 'Aluno nao pertence a turma/escola alvo.' using errcode = '42501';
    end if;
  elsif p_student_id is not null then
    raise exception 'student_id deve ser nulo para alvo class.' using errcode = '22023';
  end if;

  if v_target_type = 'class' then
    select *
      into v_assignment
    from public.assessment_assignments aa
    where aa.school_id = v_school_id
      and aa.assessment_id = p_assessment_id
      and aa.class_id = p_class_id
      and aa.target_type = 'class'
      and aa.status in ('draft', 'published')
    limit 1;

    update public.assessment_assignments
       set assigned_by = auth.uid(),
           available_from = coalesce(p_available_from, now()),
           available_until = p_available_until,
           time_limit_minutes = p_time_limit_minutes,
           max_attempts = p_max_attempts,
           status = v_status,
           published_at = case
             when v_status = 'published' then coalesce(published_at, now())
             else null
           end
     where id = v_assignment.id
     returning * into v_assignment;
  elsif v_target_type = 'student' then
    select *
      into v_assignment
    from public.assessment_assignments aa
    where aa.school_id = v_school_id
      and aa.assessment_id = p_assessment_id
      and aa.class_id = p_class_id
      and aa.student_id = p_student_id
      and aa.target_type = 'student'
      and aa.status in ('draft', 'published')
    limit 1;

    update public.assessment_assignments
       set assigned_by = auth.uid(),
           available_from = coalesce(p_available_from, now()),
           available_until = p_available_until,
           time_limit_minutes = p_time_limit_minutes,
           max_attempts = p_max_attempts,
           status = v_status,
           published_at = case
             when v_status = 'published' then coalesce(published_at, now())
             else null
           end
     where id = v_assignment.id
     returning * into v_assignment;
  end if;

  if v_assignment.id is null then
    insert into public.assessment_assignments (
      school_id,
      assessment_id,
      assigned_by,
      target_type,
      class_id,
      student_id,
      available_from,
      available_until,
      time_limit_minutes,
      max_attempts,
      status,
      published_at
    )
    values (
      v_school_id,
      p_assessment_id,
      auth.uid(),
      v_target_type,
      p_class_id,
      p_student_id,
      coalesce(p_available_from, now()),
      p_available_until,
      p_time_limit_minutes,
      p_max_attempts,
      v_status,
      case when v_status = 'published' then now() else null end
    )
    returning * into v_assignment;
  end if;

  if v_assignment.status = 'published' then
    perform public.communication_upsert_system_notification(
      'assessment',
      v_assignment.id,
      v_assignment.school_id,
      auth.uid(),
      'professor',
      v_assignment.target_type,
      v_assignment.class_id,
      v_assignment.student_id,
      'Avalia+: ' || coalesce(v_assessment_title, 'avaliação disponível'),
      'Nova avaliação disponível no Avalia+. Acesse para responder dentro do prazo.',
      current_date,
      'Abrir Avalia+',
      'avaliacoes'
    );
  end if;

  return v_assignment;
end;
$$;

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
    scoped.total_unread,
    scoped.action_label,
    scoped.href,
    scoped.source_type,
    scoped.source_id
  from scoped
  order by scoped.delivered_at desc, scoped.communication_created_at desc
  limit v_limit offset v_offset;
end;
$$;

revoke all on function public.communication_upsert_system_notification(text, uuid, uuid, uuid, text, text, uuid, uuid, text, text, date, text, text)
  from public, anon, authenticated;
revoke all on function public.communication_get_inbox(uuid, text, integer, integer, integer)
  from public, anon, authenticated;

grant execute on function public.communication_get_inbox(uuid, text, integer, integer, integer)
  to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('communication_upsert_system_notification', 'communication_get_inbox')
      and has_function_privilege('anon', p.oid, 'EXECUTE')
  ) then
    raise exception 'VALIDACAO bloqueada: anon executa RPC/helper de notificacoes';
  end if;
end $$;

commit;
