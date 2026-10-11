-- Prerequisite currently deployed but missing from repository migration chain.
create or replace function public.school_content_assert_admin() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active' and lower(platform_role) in('admin','admin_ti','administrador','administrador_nacional')) then raise exception 'SCHOOL_CONTENT_ADMIN_REQUIRED' using errcode='42501';end if;
end $$;
revoke all on function public.school_content_assert_admin() from public,anon,authenticated,service_role;
