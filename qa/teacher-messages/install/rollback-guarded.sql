-- Recovery template only: execute via a reviewed compensating migration, never automatically.
-- Do not remove scope protection after any new message/request exists.
begin;
do $$ begin
 if exists(select 1 from public.communications where recipient_scope<>'legacy')
 or exists(select 1 from school_category_private.teacher_message_requests)
 then raise exception 'ROLLBACK_REQUIRES_SCOPED_DATA_REVIEW';end if;
end $$;
CREATE OR REPLACE FUNCTION public.communication_can_read(p_communication communications)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    case
      when p_communication.status = 'deleted' then public.secretaria_can_manage_school(p_communication.school_id)
      else
        p_communication.author_profile_id = auth.uid()
        or public.secretaria_can_manage_school(p_communication.school_id)
        or (
          p_communication.status = 'published'
          and (p_communication.expires_at is null or p_communication.expires_at > now())
          and (
            public.communication_teacher_can_target(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
            or public.communication_current_student_can_read(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
            or public.communication_guardian_can_read(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
          )
        )
    end;
$function$
;
CREATE OR REPLACE FUNCTION school_category_private.communication_edit_allowed(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
 select exists(select 1 from public.communications c join public.profiles p on p.id=auth.uid() and p.status='active'
 where c.id=p_id and c.source_type is null and public.communication_delivery_is_active(c) and (
 public.secretaria_can_manage_school(c.school_id) or (
 c.author_profile_id=auth.uid() and exists(select 1 from public.teachers t where t.profile_id=auth.uid() and t.school_id=c.school_id and t.status='active')
 and public.communication_teacher_can_target(c.school_id,c.class_id,c.student_id,c.audience_type))));
$function$
;
CREATE OR REPLACE FUNCTION public.communication_generate_deliveries(p_communication_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_comm public.communications%rowtype;
  v_inserted integer := 0;
begin
  select * into v_comm from public.communications where id = p_communication_id;
  if v_comm.id is null or not public.communication_delivery_is_active(v_comm) then
    return 0;
  end if;

  with eligible as (
    select distinct g.profile_id as recipient_profile_id, e.student_id, e.school_id
    from public.enrollments e
    join public.student_guardian_links sgl on sgl.student_id = e.student_id
    join public.guardians g on g.id = sgl.guardian_id
    join public.profiles p on p.id = g.profile_id
    where g.profile_id is not null and g.status = 'active' and sgl.status = 'active'
      and e.status = 'active' and e.ended_at is null and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
        or (v_comm.audience_type = 'grade' and exists (select 1 from public.classes c where c.id = e.class_id and c.ano_escolar = v_comm.grade_label))
        or (v_comm.audience_type = 'group' and exists (select 1 from public.recomposition_intervention_group_students gs where gs.group_id = v_comm.target_group_id and gs.student_id = e.student_id and gs.status = 'active'))
      )
    union
    select distinct sg.profile_id, e.student_id, e.school_id
    from public.enrollments e
    join public.student_guardians sg on sg.student_id = e.student_id
    join public.profiles p on p.id = sg.profile_id
    where sg.status = 'active' and e.status = 'active' and e.ended_at is null and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
        or (v_comm.audience_type = 'grade' and exists (select 1 from public.classes c where c.id = e.class_id and c.ano_escolar = v_comm.grade_label))
        or (v_comm.audience_type = 'group' and exists (select 1 from public.recomposition_intervention_group_students gs where gs.group_id = v_comm.target_group_id and gs.student_id = e.student_id and gs.status = 'active'))
      )
    union
    select distinct s.user_id, e.student_id, e.school_id
    from public.enrollments e
    join public.students s on s.id = e.student_id
    join public.profiles p on p.id = s.user_id and p.platform_role = 'aluno'
    where s.user_id is not null and e.status = 'active' and e.ended_at is null and e.school_id = v_comm.school_id
      and (
        v_comm.audience_type = 'school'
        or (v_comm.audience_type = 'class' and e.class_id = v_comm.class_id)
        or (v_comm.audience_type = 'student' and e.student_id = v_comm.student_id)
        or (v_comm.audience_type = 'grade' and exists (select 1 from public.classes c where c.id = e.class_id and c.ano_escolar = v_comm.grade_label))
        or (v_comm.audience_type = 'group' and exists (select 1 from public.recomposition_intervention_group_students gs where gs.group_id = v_comm.target_group_id and gs.student_id = e.student_id and gs.status = 'active'))
      )
    union
    select distinct sm.profile_id, null::uuid, sm.school_id
    from public.school_memberships sm
    join public.profiles p on p.id = sm.profile_id
    where v_comm.audience_type = 'staff'
      and sm.school_id = v_comm.school_id
      and sm.status = 'active'
      and sm.membership_role = v_comm.staff_role
      and sm.started_at <= now()
      and (sm.ended_at is null or sm.ended_at > now())
  )
  insert into public.communication_deliveries (
    communication_id, recipient_profile_id, student_id, school_id, delivered_at, notification_status
  )
  select v_comm.id, eligible.recipient_profile_id, eligible.student_id, eligible.school_id, now(), 'unread'
  from eligible
  where eligible.recipient_profile_id is not null
  on conflict (communication_id, recipient_profile_id, (coalesce(student_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.communication_get_inbox(p_student_id uuid DEFAULT NULL::uuid, p_read_filter text DEFAULT 'all'::text, p_period_days integer DEFAULT 90, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(delivery_id uuid, communication_id uuid, school_id uuid, student_id uuid, title text, body text, communication_type text, audience_type text, author_profile_id uuid, author_role text, author_name text, communication_date date, created_at timestamp with time zone, delivered_at timestamp with time zone, read_at timestamp with time zone, notification_status text, child_name text, class_name text, context_label text, unread_count integer, action_label text, href text, source_type text, source_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.communication_list_delivery_summaries()
 RETURNS TABLE(communication_id uuid, delivered_count integer, read_count integer, unread_count integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.communication_list_reply_threads(p_communication_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.communications%rowtype; payload jsonb;
begin
 select * into c from public.communications where id=p_communication_id;
 if auth.uid() is null or c.id is null or not public.communication_delivery_is_active(c)
  or not exists(select 1 from public.profiles where id=auth.uid() and status='active')
  or not ((c.author_profile_id=auth.uid() and exists(select 1 from public.teachers t where t.profile_id=auth.uid() and t.school_id=c.school_id and t.status='active') and public.communication_teacher_can_target(c.school_id,c.class_id,c.student_id,c.audience_type))
   or public.secretaria_can_manage_school(c.school_id)) then
  raise exception 'COMMUNICATION_THREADS_FORBIDDEN' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('delivery_id',d.id,'recipient_name',p.display_name,'student_id',d.student_id,
  'student_name',(select s.nome from public.students s where s.id=d.student_id),
  'reply_count',(select count(*) from public.communication_replies r where r.delivery_id=d.id)) order by p.display_name,d.id),'[]'::jsonb)
 into payload from public.communication_deliveries d join public.profiles p on p.id=d.recipient_profile_id
 where d.communication_id=c.id and school_category_private.communication_reply_allowed(d.id);
 return payload;
end $function$
;
CREATE OR REPLACE FUNCTION public.communication_mark_read(p_delivery_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION school_category_private.communication_reply_allowed(p_delivery_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select auth.uid() is not null and exists(
  select 1 from public.communication_deliveries d
  join public.communications c on c.id=d.communication_id and c.school_id=d.school_id
  join public.profiles p on p.id=auth.uid() and p.status='active'
  where d.id=p_delivery_id and public.communication_delivery_is_active(c)
  and c.communication_type in('message','notice','weekly_information','institutional_announcement')
  and c.source_type is null
  and (
   (d.recipient_profile_id=auth.uid() and (
    (d.student_id is not null and exists(
     select 1 from public.students s
     join public.enrollments e on e.student_id=s.id and e.school_id=c.school_id
     where s.id=d.student_id and s.school_id=d.school_id and s.status='active'
      and e.status='active' and e.enrolled_at<=now() and (e.ended_at is null or e.ended_at>now())
      and (
       c.audience_type='school'
       or (c.audience_type='class' and e.class_id=c.class_id)
       or (c.audience_type='student' and s.id=c.student_id and (c.class_id is null or e.class_id=c.class_id))
       or (c.audience_type='grade' and exists(select 1 from public.classes cl where cl.id=e.class_id and cl.ano_escolar=c.grade_label))
       or (c.audience_type='group' and exists(select 1 from public.recomposition_intervention_group_students gs where gs.group_id=c.target_group_id and gs.student_id=s.id and gs.status='active'))
      )
      and (
       s.user_id=auth.uid()
       or exists(select 1 from public.student_guardians sg where sg.student_id=s.id and sg.profile_id=auth.uid() and sg.status='active')
       or exists(select 1 from public.student_guardian_links sg join public.guardians g on g.id=sg.guardian_id
        where sg.student_id=s.id and sg.status='active' and g.profile_id=auth.uid()
         and g.school_id=d.school_id and g.status='active' and g.access_status='active')
      )
    ))
    or (d.student_id is null and c.audience_type='staff' and exists(
     select 1 from public.school_memberships sm where sm.profile_id=auth.uid() and sm.school_id=c.school_id
      and sm.membership_role=c.staff_role and sm.status='active' and sm.started_at<=now()
      and (sm.ended_at is null or sm.ended_at>now())
      and (c.staff_role<>'professor' or exists(select 1 from public.teachers t where t.profile_id=auth.uid() and t.school_id=c.school_id and t.status='active'))
    ))
   ))
   or (c.author_profile_id=auth.uid() and exists(select 1 from public.teachers t where t.profile_id=auth.uid() and t.school_id=c.school_id and t.status='active') and public.communication_teacher_can_target(c.school_id,c.class_id,c.student_id,c.audience_type))
   or public.secretaria_can_manage_school(c.school_id)
  )
 );
$function$
;
CREATE OR REPLACE FUNCTION public.communication_report_delivery(p_delivery_id uuid, p_reason text, p_description text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_delivery public.communication_deliveries%rowtype;
  v_report public.communication_moderation_reports%rowtype;
begin
  select * into v_delivery
  from public.communication_deliveries
  where id = p_delivery_id;

  if v_delivery.id is null or v_delivery.recipient_profile_id <> auth.uid() then
    raise exception 'Entrega nao encontrada ou nao autorizada';
  end if;

  insert into public.communication_moderation_reports (
    communication_id, delivery_id, school_id, reporter_profile_id, reason, description
  )
  values (v_delivery.communication_id, v_delivery.id, v_delivery.school_id, auth.uid(), p_reason, p_description)
  returning * into v_report;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_delivery.communication_id, 'reported', null, 'REPORTADO', auth.uid());

  return jsonb_build_object('report', to_jsonb(v_report));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.communication_review_report(p_report_id uuid, p_status text, p_resolution_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_report public.communication_moderation_reports%rowtype;
begin
  select * into v_report
  from public.communication_moderation_reports
  where id = p_report_id
  for update;

  if v_report.id is null then
    raise exception 'Denuncia nao encontrada';
  end if;

  if not public.secretaria_can_manage_school(v_report.school_id) then
    raise exception 'Acesso negado para moderacao';
  end if;

  update public.communication_moderation_reports
     set status = p_status,
         reviewed_by = auth.uid(),
         reviewed_at = case when p_status = 'RESOLVIDO' then now() else reviewed_at end,
         resolution_notes = p_resolution_notes
   where id = p_report_id
   returning * into v_report;

  return jsonb_build_object('report', to_jsonb(v_report));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.communication_teacher_can_target(p_school_id uuid, p_class_id uuid, p_student_id uuid, p_audience_type text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t on t.id = ctm.teacher_id
    join public.classes c on c.id = ctm.class_id
    where t.profile_id = auth.uid()
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
      and c.status = 'active'
      and c.school_id = p_school_id
      and c.id = p_class_id
      and p_audience_type in ('class', 'student')
      and (
        p_audience_type = 'class'
        or exists (
          select 1
          from public.enrollments e
          where e.student_id = p_student_id
            and e.class_id = p_class_id
            and e.school_id = p_school_id
            and e.status = 'active'
            and e.ended_at is null
        )
      )
  );
$function$
;
CREATE OR REPLACE FUNCTION public.communication_user_can_access_advanced(p_communication communications)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select
    public.communication_can_read(p_communication)
    or exists (
      select 1
      from public.communication_deliveries d
      where d.communication_id = p_communication.id
        and d.recipient_profile_id = auth.uid()
    )
    or (
      p_communication.audience_type = 'staff'
      and exists (
        select 1
        from public.school_memberships sm
        where sm.school_id = p_communication.school_id
          and sm.profile_id = auth.uid()
          and sm.status = 'active'
          and sm.membership_role = p_communication.staff_role
          and sm.started_at <= now()
          and (sm.ended_at is null or sm.ended_at > now())
      )
    );
$function$
;
CREATE OR REPLACE FUNCTION public.notification_get_center(p_student_id uuid DEFAULT NULL::uuid, p_read_filter text DEFAULT 'all'::text, p_period_days integer DEFAULT 90, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(item_type text, delivery_id uuid, source_type text, source_id uuid, school_id uuid, student_id uuid, title text, summary text, origin_label text, priority text, deep_link text, delivered_at timestamp with time zone, read_at timestamp with time zone, notification_status text, child_name text, class_name text, unread_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$
;
CREATE OR REPLACE FUNCTION public.secretaria_delete_communication(p_communication_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_author uuid := auth.uid();
  v_comm public.communications%rowtype;
  v_from_status text;
begin
  if v_author is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_comm
  from public.communications
  where id = p_communication_id
  for update;

  if v_comm.id is null then
    raise exception 'Comunicado nao encontrado.' using errcode = '22023';
  end if;

  if v_comm.status = 'deleted' then
    return jsonb_build_object(
      'communication_id', v_comm.id,
      'deleted', true,
      'changed', false
    );
  end if;

  if not (
    public.secretaria_can_manage_school(v_comm.school_id)
    or (
      v_comm.author_profile_id = v_author
      and public.communication_teacher_can_target(v_comm.school_id, v_comm.class_id, v_comm.student_id, v_comm.audience_type)
    )
  ) then
    raise exception 'Usuario sem permissao para excluir este comunicado.' using errcode = '42501';
  end if;

  v_from_status := v_comm.status;

  update public.communications
  set status = 'deleted',
      deleted_at = now(),
      deleted_by = v_author
  where id = v_comm.id
  returning * into v_comm;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, 'deleted', v_from_status, 'deleted', v_author);

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'deleted', true,
    'changed', true
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.secretaria_list_communication_events()
 RETURNS SETOF communication_events
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select ce.*
  from public.communication_events ce
  join public.communications c on c.id = ce.communication_id
  where public.secretaria_can_manage_school(c.school_id)
  order by ce.created_at desc;
$function$
;
CREATE OR REPLACE FUNCTION public.secretaria_list_communications()
 RETURNS SETOF communications
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select c.*
  from public.communications c
  where public.secretaria_can_manage_school(c.school_id)
  order by c.communication_date desc, c.created_at desc;
$function$
;
CREATE OR REPLACE FUNCTION public.secretaria_set_communication_status(p_communication_id uuid, p_to_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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

  select * into v_comm from public.communications where id = p_communication_id for update;

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
    return jsonb_build_object('communication_id', v_comm.id, 'from_status', v_comm.status, 'to_status', v_to_status, 'changed', false, 'deliveries_created', v_deliveries);
  end if;

  if v_comm.status = 'published' and v_to_status <> 'archived' then
    raise exception 'Comunicado publicado permite somente retirada da publicacao.' using errcode = '22023';
  end if;

  if v_comm.status in ('draft', 'archived') and v_to_status <> 'published' then
    raise exception 'Rascunho ou comunicado retirado permite somente publicacao.' using errcode = '22023';
  end if;

  v_from_status := v_comm.status;

  update public.communications
  set status = v_to_status, deleted_at = null, deleted_by = null
  where id = v_comm.id
  returning * into v_comm;

  v_event_type := case when v_to_status = 'published' then 'published' when v_to_status = 'archived' then 'archived' else 'edited' end;
  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, v_event_type, v_from_status, v_to_status, v_author);

  if v_to_status = 'published' then
    v_deliveries := public.communication_generate_deliveries(v_comm.id);
  end if;

  return jsonb_build_object('communication_id', v_comm.id, 'from_status', v_from_status, 'to_status', v_to_status, 'changed', true, 'deliveries_created', v_deliveries);
end;
$function$
;
alter policy communication_deliveries_select_own on public.communication_deliveries using ((recipient_profile_id = ( SELECT auth.uid() AS uid)));
alter policy communication_reports_select_authorized on public.communication_moderation_reports using (((reporter_profile_id = auth.uid()) OR secretaria_can_manage_school(school_id)));
drop trigger messages_preserve_audience on public.communications;
drop function public.teacher_publish_message(uuid,jsonb);
drop function public.teacher_get_message_request(uuid);
drop function public.communication_scope_allows_current_actor(uuid);
drop function school_category_private.message_preserve_audience();
drop function school_category_private.message_scope_access(public.communications);
drop function school_category_private.message_recipient_matches(public.communications,uuid);
drop table school_category_private.teacher_message_requests;
alter table public.communications drop column recipient_scope;
commit;
-- Keep migration history; use a new compensating migration if this recovery is approved.
