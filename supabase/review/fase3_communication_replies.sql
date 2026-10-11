-- REVIEW ONLY: new private reply threads. No production application authorized here.
begin;
-- Pin observed dependencies before installing reviewed SQL. This is not a full
-- schema attestation; table/trigger/RLS and operational review remain required.
do $preflight$
declare expected jsonb; actual jsonb;
begin
 for expected in select value from jsonb_array_elements($observed$[{"proname":"communication_can_read","args":"p_communication communications","body_md5":"2657d0547e189192eb36044f5cfcf88c","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"communication_current_student_can_read","args":"p_school_id uuid, p_class_id uuid, p_student_id uuid, p_audience_type text","body_md5":"a223c37655eb45fecf773839c07961b7","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"communication_delivery_is_active","args":"p_comm communications","body_md5":"8a3a7f4cdbc67a46240e3b22cad841f8","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,service_role=X/postgres}","authenticated_execute":false,"anon_execute":false},{"proname":"communication_guardian_can_read","args":"p_school_id uuid, p_class_id uuid, p_student_id uuid, p_audience_type text","body_md5":"061c6efd20010477f5cf473ad1244bda","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"communication_teacher_can_target","args":"p_school_id uuid, p_class_id uuid, p_student_id uuid, p_audience_type text","body_md5":"71d4d457d2327e019bd4bc1fdafd5da4","security_definer":true,"proconfig":["search_path=public, pg_temp"],"acl":"{postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}","authenticated_execute":true,"anon_execute":false},{"proname":"secretaria_can_manage_school","args":"p_school_id uuid","body_md5":"b19131aca5ff81d0761d2ef8f427c815","security_definer":true,"proconfig":["search_path=public, auth, pg_temp"],"acl":"{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}","authenticated_execute":true,"anon_execute":false}]$observed$::jsonb) loop
  select jsonb_build_object('proname',p.proname,'args',pg_get_function_identity_arguments(p.oid),
   'body_md5',md5(p.prosrc),'security_definer',p.prosecdef,'proconfig',p.proconfig,'acl',p.proacl::text,
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE')) into actual
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','school_category_private') and p.proname=expected->>'proname'
   and pg_get_function_identity_arguments(p.oid)=expected->>'args';
  if actual is distinct from expected then
   raise exception 'FASE3_REPLY_BASE_CHANGED: %',expected->>'proname';
  end if;
 end loop;
end $preflight$;

create table public.communication_replies (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.communication_deliveries(id) on delete cascade,
  author_profile_id uuid not null references public.profiles(id),
  request_id uuid not null,
  body text not null check(length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  unique(delivery_id,author_profile_id,request_id)
);
create index communication_replies_thread_time on public.communication_replies(delivery_id,created_at,id);
alter table public.communication_replies enable row level security;
revoke all on public.communication_replies from public,anon,authenticated,service_role;

create function school_category_private.communication_reply_allowed(p_delivery_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
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
$$;
revoke all on function school_category_private.communication_reply_allowed(uuid) from public,anon,authenticated,service_role;

create function public.communication_get_reply_thread(p_delivery_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare payload jsonb;
begin
 if not school_category_private.communication_reply_allowed(p_delivery_id) then
  raise exception 'COMMUNICATION_THREAD_FORBIDDEN' using errcode='42501';
 end if;
 select jsonb_build_object('delivery_id',d.id,'title',c.title,'body',c.body,
  'messages',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'body',r.body,
   'author_name',p.display_name,'own',r.author_profile_id=auth.uid(),'created_at',r.created_at)
   order by r.created_at,r.id) from public.communication_replies r join public.profiles p on p.id=r.author_profile_id
   where r.delivery_id=d.id),'[]'::jsonb)) into payload
 from public.communication_deliveries d join public.communications c on c.id=d.communication_id
 where d.id=p_delivery_id;
 return payload;
end $$;

create function public.communication_list_reply_threads(p_communication_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
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
end $$;

create function public.communication_send_reply(p_delivery_id uuid,p_body text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved public.communication_replies%rowtype; text_body text:=btrim(p_body);
begin
 -- Serialize reply with archive/delete; a reply after withdrawal must be denied.
 perform 1 from public.communications c join public.communication_deliveries d on d.communication_id=c.id
 where d.id=p_delivery_id for share of c;
 if not school_category_private.communication_reply_allowed(p_delivery_id) then
  raise exception 'COMMUNICATION_THREAD_FORBIDDEN' using errcode='42501';
 end if;
 if p_request_id is null or text_body is null or length(text_body) not between 1 and 1000 then
  raise exception 'COMMUNICATION_REPLY_INVALID' using errcode='22023';
 end if;
 insert into public.communication_replies(delivery_id,author_profile_id,request_id,body)
 values(p_delivery_id,auth.uid(),p_request_id,text_body)
 on conflict(delivery_id,author_profile_id,request_id) do nothing returning * into saved;
 if saved.id is null then
  select * into saved from public.communication_replies where delivery_id=p_delivery_id and author_profile_id=auth.uid() and request_id=p_request_id;
  if saved.body is distinct from text_body then raise exception 'COMMUNICATION_REPLY_REQUEST_CONFLICT' using errcode='22023'; end if;
 end if;
 return jsonb_build_object('reply_id',saved.id,'created_at',saved.created_at);
end $$;

revoke all on function public.communication_get_reply_thread(uuid) from public,anon,authenticated,service_role;
revoke all on function public.communication_list_reply_threads(uuid) from public,anon,authenticated,service_role;
revoke all on function public.communication_send_reply(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.communication_get_reply_thread(uuid) to authenticated;
grant execute on function public.communication_list_reply_threads(uuid) to authenticated;
grant execute on function public.communication_send_reply(uuid,text,uuid) to authenticated;
commit;
