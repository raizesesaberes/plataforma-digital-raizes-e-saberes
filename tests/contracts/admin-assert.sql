-- Exact definitions/ACLs captured via read-only pg_catalog query on 2026-10-11.
-- LOCAL SYNTHETIC RESTORE ONLY. Never apply these fixtures to production.
CREATE OR REPLACE FUNCTION public.school_content_assert_admin()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
 SET jit TO 'off'
AS $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id=auth.uid() and p.status='active'
    and lower(p.platform_role) in ('admin','admin_ti','administrador','administrador_nacional')
  ) then raise exception 'SCHOOL_CONTENT_ADMIN_REQUIRED' using errcode='42501'; end if;
end $function$
;
revoke all on function public.school_content_assert_admin() from public,anon,authenticated,service_role;
grant execute on function public.school_content_assert_admin() to service_role;
