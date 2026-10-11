-- REVIEW ONLY: new private reply threads. No production application authorized here.
begin;
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
   (d.recipient_profile_id=auth.uid() and public.communication_can_read(c))
   or (c.author_profile_id=auth.uid() and public.communication_teacher_can_target(c.school_id,c.class_id,c.student_id,c.audience_type))
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
  or not ((c.author_profile_id=auth.uid() and public.communication_teacher_can_target(c.school_id,c.class_id,c.student_id,c.audience_type))
   or public.secretaria_can_manage_school(c.school_id)) then
  raise exception 'COMMUNICATION_THREADS_FORBIDDEN' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('delivery_id',d.id,'recipient_name',p.display_name,
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
