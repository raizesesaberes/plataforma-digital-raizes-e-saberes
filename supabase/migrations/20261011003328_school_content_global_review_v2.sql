-- LOCAL REVIEW ONLY. Single canonical editorial status, never a parallel suspension flag.
begin;
create function public.admin_search_root_content(p_filter jsonb default '{}',p_offset integer default 0,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path='' set jit='off' as $$
declare result jsonb;
begin
 perform public.school_content_assert_admin();
 if jsonb_typeof(p_filter) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_filter)k where k not in('content_type','grade_id','subject_id','query','editorial_status')) then raise exception 'INVALID_ROOT_FILTER';end if;
 if p_offset<0 or p_limit not between 1 and 100 or length(coalesce(p_filter->>'query',''))>200 then raise exception 'INVALID_ROOT_PAGE';end if;
 with matched as materialized (
 select ci.* from public.content_items ci where ci.owner_scope='GLOBAL_RAIZES'
 and (nullif(p_filter->>'content_type','') is null or ci.content_type=(p_filter->>'content_type')::public.rs_content_type)
 and (nullif(p_filter->>'grade_id','') is null or ci.grade_id=(p_filter->>'grade_id')::uuid or (ci.metadata->>'category_mode'='TRANSVERSAL' and ci.metadata->'category_grade_ids' ? (p_filter->>'grade_id')))
 and (nullif(p_filter->>'subject_id','') is null or ci.subject_id=(p_filter->>'subject_id')::uuid)
 and (nullif(p_filter->>'editorial_status','') is null or ci.editorial_status=(p_filter->>'editorial_status')::public.rs_content_editorial_status)
 and (nullif(btrim(p_filter->>'query'),'') is null or ci.title ilike '%'||(p_filter->>'query')||'%' or ci.id::text=p_filter->>'query')
 ),page as(select * from matched order by title,id offset p_offset limit p_limit)
 select jsonb_build_object('status','PASS','total',(select count(*) from matched),'offset',p_offset,'limit',p_limit,'items',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'content_type',p.content_type,'grade_id',p.grade_id,'subject_id',p.subject_id,'editorial_status',p.editorial_status,'version',p.version,'revision',md5(to_jsonb(p)::text),'delivery_warning',p.content_type<>'QUESTION') order by p.title,p.id),'[]')) into result from page p;
 return result;
end $$;

create unique index root_review_request_once on public.content_editorial_events(actor_user_id,(details->>'request_id')) where event_type in('ROOT_CONTENT_SUSPENDED','ROOT_CONTENT_REPUBLISHED','ROOT_CONTENT_PUBLISHED');
create function public.admin_set_root_content_state(p_content_item_id uuid,p_revision text,p_action text,p_reason text,p_request_id uuid,p_review_completed boolean default false)
returns jsonb language plpgsql security definer set search_path='' set jit='off' as $$
declare ci public.content_items%rowtype;old_status public.rs_content_editorial_status;new_status public.rs_content_editorial_status;result jsonb;receipt public.content_editorial_events%rowtype;input_hash text;
begin
 perform public.school_content_assert_admin();perform school_category_private.assert_writes_open();
 if p_request_id is null or p_action not in('SUSPEND','REPUBLISH','PUBLISH') or length(btrim(coalesce(p_reason,''))) not between 5 and 500 then raise exception 'ACTION_REASON_AND_REQUEST_REQUIRED';end if;
 input_hash:=md5(jsonb_build_array(p_content_item_id,p_revision,p_action,p_reason,p_review_completed)::text);
 perform set_config('lock_timeout','1s',true);
 if not pg_try_advisory_xact_lock(81261012) then raise exception 'ROOT_REVIEW_BUSY';end if;
 select * into receipt from public.content_editorial_events where actor_user_id=auth.uid() and event_type in('ROOT_CONTENT_SUSPENDED','ROOT_CONTENT_REPUBLISHED','ROOT_CONTENT_PUBLISHED') and details->>'request_id'=p_request_id::text;
 if found then if receipt.details->>'input_hash'<>input_hash then raise exception 'REQUEST_ID_REUSED';end if;return receipt.details->'result';end if;
 select * into ci from public.content_items where id=p_content_item_id for update;
 if ci.id is null or ci.owner_scope<>'GLOBAL_RAIZES' then raise exception 'ROOT_CONTENT_NOT_FOUND';end if;
 if p_revision is null or md5(to_jsonb(ci)::text)<>p_revision then raise exception 'STALE_ROOT_REVIEW';end if;
 old_status:=ci.editorial_status;
 if p_action='SUSPEND' then
  if old_status<>'PUBLISHED' then raise exception 'ITEM_ALREADY_NOT_PUBLISHED';end if;
  new_status:='IN_REVIEW';
 else
  if (p_action='REPUBLISH' and old_status not in('IN_REVIEW','APPROVED')) or (p_action='PUBLISH' and (ci.published_at is not null or old_status not in('DRAFT','IN_REVIEW','APPROVED'))) or p_review_completed is not true then raise exception 'COMPLETED_EDITORIAL_REVIEW_REQUIRED';end if;
  if ci.content_type='QUESTION' and not exists(select 1 from public.content_question_items a join public.question_items q on q.id=a.question_item_id where a.content_item_id=ci.id and q.publication_status='PUBLICADO' and q.curation_status='APROVADO') then raise exception 'QUESTION_EDITORIAL_REVIEW_PENDING';end if;
  if coalesce(ci.metadata->>'category_mode','GRADE') not in ('GRADE','INSTITUTIONAL','TRANSVERSAL') then raise exception 'CANONICAL_CLASSIFICATION_REQUIRED';end if;
  if (coalesce(ci.metadata->>'category_mode','GRADE') in('GRADE','INSTITUTIONAL') and not exists(select 1 from school_category_private.taxonomy()t where t.grade_id=ci.grade_id and (ci.segment_id is null or ci.segment_id=t.segment_id) and t.institutional=(coalesce(ci.metadata->>'category_mode','GRADE')='INSTITUTIONAL')))
  or (ci.metadata->>'category_mode'='TRANSVERSAL' and (jsonb_typeof(ci.metadata->'category_grade_ids') is distinct from 'array' or jsonb_array_length(ci.metadata->'category_grade_ids')=0)) then raise exception 'CANONICAL_CLASSIFICATION_REQUIRED';end if;
  new_status:='PUBLISHED';
 end if;
 update public.content_items set editorial_status=new_status,published_at=case when new_status='PUBLISHED' then now() else published_at end,updated_by=auth.uid() where id=ci.id returning * into ci;
 result:=jsonb_build_object('status','PASS','content_item_id',ci.id,'editorial_status',ci.editorial_status,'version',ci.version,'revision',md5(to_jsonb(ci)::text),'scope','ALL_SCHOOLS','school_entitlement_writes',0,'delivery_warning',ci.content_type<>'QUESTION');
 insert into public.content_editorial_events(content_item_id,event_type,from_status,to_status,actor_user_id,details)
 values(ci.id,case p_action when 'SUSPEND' then 'ROOT_CONTENT_SUSPENDED' when 'PUBLISH' then 'ROOT_CONTENT_PUBLISHED' else 'ROOT_CONTENT_REPUBLISHED' end,old_status,new_status,auth.uid(),jsonb_build_object('reason',btrim(p_reason),'request_id',p_request_id,'input_hash',input_hash,'review_completed',p_review_completed,'version',ci.version,'result',result));
 return result;
exception when lock_not_available then raise exception 'ROOT_REVIEW_BUSY';
end $$;

-- A global pause also gates raw canonical reads for schools still on legacy entitlements.
create or replace function public.content_category_can_read(p_content_item_id uuid)
returns boolean language plpgsql stable security definer set search_path='' set jit='off' as $$
begin
 if auth.uid() is null then return false;end if;
 if exists(select 1 from public.profiles where id=auth.uid() and status='active' and lower(platform_role) in('admin','admin_ti','administrador','administrador_nacional')) then return true;end if;
 if not exists(select 1 from public.content_items where id=p_content_item_id and editorial_status='PUBLISHED' and published_at<=now()) then return false;end if;
 if not school_category_private.has_dynamic_membership() then return true;end if;
 return exists(select 1 from school_category_private.authorized_items('{}',p_content_item_id) where content_type='QUESTION');
exception when insufficient_privilege then return false;
end $$;
create or replace function public.content_category_can_read_question(p_question_id uuid)
returns boolean language plpgsql stable security definer set search_path='' set jit='off' as $$
begin
 if auth.uid() is null then return false;end if;
 if exists(select 1 from public.profiles where id=auth.uid() and status='active' and lower(platform_role) in('admin','admin_ti','administrador','administrador_nacional')) then return true;end if;
 if exists(select 1 from public.content_question_items where question_item_id=p_question_id) then
  return exists(select 1 from public.content_question_items a where a.question_item_id=p_question_id and public.content_category_can_read(a.content_item_id));
 end if;
 return not school_category_private.has_dynamic_membership();
end $$;

create function public.content_category_legacy_media_gate()
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (exists(select 1 from public.profiles where id=auth.uid() and status='active' and lower(platform_role) in('admin','admin_ti','administrador','administrador_nacional')) or not school_category_private.has_dynamic_membership());
$$;
-- Category-enabled schools must not fall back to legacy raw URL-bearing tables.
create policy category_legacy_media_gate on public.books as restrictive for select to authenticated,anon using(public.content_category_legacy_media_gate());
create policy category_legacy_media_gate on public.student_games as restrictive for select to authenticated,anon using(public.content_category_legacy_media_gate());
create policy category_legacy_media_gate on public.student_activities as restrictive for select to authenticated,anon using(public.content_category_legacy_media_gate());
create policy category_legacy_media_gate on public.student_discoveries as restrictive for select to authenticated,anon using(public.content_category_legacy_media_gate());
revoke all on function public.admin_search_root_content(jsonb,integer,integer),public.admin_set_root_content_state(uuid,text,text,text,uuid,boolean),public.content_category_legacy_media_gate() from public,anon,authenticated,service_role;
grant execute on function public.admin_search_root_content(jsonb,integer,integer),public.admin_set_root_content_state(uuid,text,text,text,uuid,boolean) to authenticated;
grant execute on function public.content_category_legacy_media_gate() to authenticated,anon;
commit;
