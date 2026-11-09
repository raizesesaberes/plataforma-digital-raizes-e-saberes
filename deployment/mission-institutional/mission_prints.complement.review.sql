-- Menu Infantil reads, without assignment, persistence, completion or XP writes.
begin;
create or replace function mission_private.print_catalog(p_revision_id uuid default null) returns jsonb
language plpgsql volatile security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if not mission_private.release_enabled() then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(mission_private.revision_json(r) order by r.activity_key,r.revision)
 from mission_private.revisions r where r.engine='colorir' and r.grade='infantil' and r.published
 and (p_revision_id is null or r.id=p_revision_id) and (r.owner_auth_id is null or r.owner_auth_id=auth.uid())
 and exists(select 1 from public.classes c where mission_private.class_grade(c.id)='infantil'
 and (mission_private.teacher_allowed(c.id) or mission_private.student_allowed(c.id,c.school_id))
 and mission_private.licensed(c.id,r.id))),'[]'::jsonb);
end$$;
create or replace function public.mission_print_catalog_v1() returns jsonb language sql volatile security invoker set search_path='' as $$select mission_private.print_catalog(null)$$;
create or replace function public.mission_print_open_v1(p_revision_id uuid) returns jsonb language sql volatile security invoker set search_path='' as $$select case when p_revision_id is null then null::jsonb else mission_private.print_catalog(p_revision_id)->0 end$$;
revoke all on function mission_private.print_catalog(uuid),public.mission_print_catalog_v1(),public.mission_print_open_v1(uuid) from public,anon,authenticated;
grant execute on function mission_private.print_catalog(uuid),public.mission_print_catalog_v1(),public.mission_print_open_v1(uuid) to authenticated;
commit;
