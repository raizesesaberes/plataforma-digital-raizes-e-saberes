-- REVIEW ONLY. Depends on reviewed PR3; no production application or rollout.
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
   raise exception 'FASE3_EDIT_BASE_CHANGED: %',expected->>'proname';
  end if;
 end loop;
end $preflight$;
do $$ begin
 if not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='school_category_private' and p.proname='communication_reply_allowed' and md5(p.prosrc)='8750e1eecfaa1099a807c43022338a53' and p.prosecdef and p.proconfig=array['search_path=""']::text[] and not has_function_privilege('authenticated',p.oid,'EXECUTE') and not has_function_privilege('anon',p.oid,'EXECUTE')) then raise exception 'FASE3_REVIEWED_REPLY_DEPENDENCY_REQUIRED';end if;
end $$;
-- Refuse unexpected user triggers that could deliver external side effects.
do $$ begin
 if exists(select 1 from pg_trigger where tgrelid='public.communications'::regclass and not tgisinternal and (tgname<>'communications_touch_updated_at' or tgfoid<>'public.institutional_touch_updated_at()'::regprocedure)) or not exists(select 1 from pg_proc where oid='public.institutional_touch_updated_at()'::regprocedure and md5(prosrc)='9b1889f56258bf9d6554213c05019c76') then raise exception 'FASE3_NOTICE_TRIGGER_REVIEW_REQUIRED';end if;
end $$;
alter table public.communications add column content_revision integer not null default 1 check(content_revision>0);
create table public.communication_revisions (
 communication_id uuid not null references public.communications(id),
 revision integer not null check(revision>0), title text not null, body text not null,
 editor_profile_id uuid not null references public.profiles(id), edited_at timestamptz not null,
 request_id uuid, primary key(communication_id,revision), unique(communication_id,editor_profile_id,request_id)
);
create table public.communication_revision_reads (
 delivery_id uuid not null references public.communication_deliveries(id),
 revision integer not null check(revision>0), read_at timestamptz not null default now(),
 primary key(delivery_id,revision)
);
alter table public.communication_revisions enable row level security;
alter table public.communication_revision_reads enable row level security;
revoke all on public.communication_revisions,public.communication_revision_reads from public,anon,authenticated,service_role;

create function school_category_private.communication_edit_allowed(p_id uuid) returns boolean
language sql stable security definer set search_path='' set jit='off' as $$
 select exists(select 1 from public.communications c join public.profiles p on p.id=auth.uid() and p.status='active'
 where c.id=p_id and c.source_type is null and public.communication_delivery_is_active(c) and (
 public.secretaria_can_manage_school(c.school_id) or (
 c.author_profile_id=auth.uid() and exists(select 1 from public.teachers t where t.profile_id=auth.uid() and t.school_id=c.school_id and t.status='active')
 and public.communication_teacher_can_target(c.school_id,c.class_id,c.student_id,c.audience_type))));
$$;
revoke all on function school_category_private.communication_edit_allowed(uuid) from public,anon,authenticated,service_role;

create function public.communication_edit_notice(p_communication_id uuid,p_expected_revision integer,p_title text,p_body text,p_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' set jit='off' as $$
declare c public.communications%rowtype; previous public.communication_revisions%rowtype; t text:=btrim(p_title); b text:=btrim(p_body);
begin
 select * into c from public.communications where id=p_communication_id for update;
 if not school_category_private.communication_edit_allowed(p_communication_id) then raise exception 'COMMUNICATION_EDIT_FORBIDDEN' using errcode='42501'; end if;
 if p_request_id is null or p_expected_revision is null or t is null or b is null or length(t) not between 1 and 160 or length(b) not between 1 and 700 then raise exception 'COMMUNICATION_EDIT_INVALID' using errcode='22023';end if;
 select * into previous from public.communication_revisions where communication_id=c.id and editor_profile_id=auth.uid() and request_id=p_request_id;
 if found then
  if previous.title<>t or previous.body<>b or previous.revision<>p_expected_revision+1 then raise exception 'COMMUNICATION_EDIT_REQUEST_CONFLICT' using errcode='22023';end if;
  return jsonb_build_object('communication_id',c.id,'revision',previous.revision);
 end if;
 if c.content_revision<>p_expected_revision then raise exception 'COMMUNICATION_REVISION_CONFLICT' using errcode='PT409';end if;
 -- Snapshot original text and legacy read evidence once. Never reset old reads.
 insert into public.communication_revisions(communication_id,revision,title,body,editor_profile_id,edited_at)
 values(c.id,c.content_revision,c.title,c.body,c.author_profile_id,c.created_at) on conflict do nothing;
 if c.content_revision=1 then
  insert into public.communication_revision_reads(delivery_id,revision,read_at)
  select d.id,1,d.read_at from public.communication_deliveries d where d.communication_id=c.id and d.read_at is not null on conflict do nothing;
 end if;
 update public.communications set title=t,body=b,content_revision=content_revision+1 where id=c.id returning * into c;
 insert into public.communication_revisions(communication_id,revision,title,body,editor_profile_id,edited_at,request_id)
 values(c.id,c.content_revision,t,b,auth.uid(),now(),p_request_id);
 -- Do not regenerate deliveries or change audience, status, expiry, replies, or old read_at.
 return jsonb_build_object('communication_id',c.id,'revision',c.content_revision);
end $$;

create function public.communication_get_notice_versions(p_communication_id uuid,p_delivery_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' set jit='off' as $$
declare c public.communications%rowtype; can_edit boolean; history jsonb; current_read timestamptz; reads integer;
begin
 select * into c from public.communications where id=p_communication_id;
 can_edit:=school_category_private.communication_edit_allowed(c.id);
 if not coalesce(can_edit,false) and not exists(select 1 from public.communication_deliveries d where d.id=p_delivery_id and d.communication_id=c.id and d.recipient_profile_id=auth.uid() and school_category_private.communication_reply_allowed(d.id)) then
  raise exception 'COMMUNICATION_VERSIONS_FORBIDDEN' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('revision',r.revision,'title',r.title,'body',r.body,'edited_at',r.edited_at) order by r.revision),'[]') into history from public.communication_revisions r where r.communication_id=c.id;
 if jsonb_array_length(history)=0 then history:=jsonb_build_array(jsonb_build_object('revision',c.content_revision,'title',c.title,'body',c.body,'edited_at',c.created_at));end if;
 select r.read_at into current_read from public.communication_revision_reads r join public.communication_deliveries d on d.id=r.delivery_id where d.id=p_delivery_id and d.communication_id=c.id and d.recipient_profile_id=auth.uid() and r.revision=c.content_revision;
 if can_edit then select count(*) into reads from public.communication_revision_reads r join public.communication_deliveries d on d.id=r.delivery_id where d.communication_id=c.id and r.revision=c.content_revision;end if;
 return jsonb_build_object('communication_id',c.id,'revision',c.content_revision,'title',c.title,'body',c.body,'history',history,'can_edit',can_edit,'current_revision_read_at',current_read,'current_revision_read_count',reads);
end $$;

create function public.communication_mark_revision_read(p_delivery_id uuid,p_revision integer) returns jsonb
language plpgsql security definer set search_path='' set jit='off' as $$
declare c public.communications%rowtype; saved timestamptz;
begin
 select c0.* into c from public.communications c0 join public.communication_deliveries d on d.communication_id=c0.id where d.id=p_delivery_id for share of c0;
 if not exists(select 1 from public.communication_deliveries d where d.id=p_delivery_id and d.recipient_profile_id=auth.uid() and school_category_private.communication_reply_allowed(d.id)) then raise exception 'COMMUNICATION_READ_FORBIDDEN' using errcode='42501';end if;
 if p_revision is null or p_revision<>c.content_revision then raise exception 'COMMUNICATION_REVISION_CONFLICT' using errcode='PT409';end if;
 insert into public.communication_revision_reads(delivery_id,revision) values(p_delivery_id,p_revision) on conflict do nothing;
 select read_at into saved from public.communication_revision_reads where delivery_id=p_delivery_id and revision=p_revision;
 update public.communication_deliveries set read_at=coalesce(read_at,saved),notification_status='read' where id=p_delivery_id;
 return jsonb_build_object('revision',p_revision,'read_at',saved);
end $$;
revoke all on function public.communication_edit_notice(uuid,integer,text,text,uuid),public.communication_get_notice_versions(uuid,uuid),public.communication_mark_revision_read(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.communication_edit_notice(uuid,integer,text,text,uuid),public.communication_get_notice_versions(uuid,uuid),public.communication_mark_revision_read(uuid,integer) to authenticated;
commit;
