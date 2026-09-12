begin;

revoke all on table public.education_networks from authenticated;
revoke all on table public.network_school_memberships from authenticated;
revoke all on table public.network_user_memberships from authenticated;

grant select on table public.education_networks to authenticated;
grant select on table public.network_school_memberships to authenticated;
grant select on table public.network_user_memberships to authenticated;

commit;
