-- RS-SCHOOL-TEMPLATE V2
-- Admin/TI audit trail for canonical Auth e-mail changes.

create table if not exists public.admin_auth_email_change_events (
  id uuid default gen_random_uuid() primary key,
  admin_user_id uuid references auth.users(id),
  target_type text not null,
  target_institutional_id uuid,
  target_auth_user_id uuid references auth.users(id),
  old_email text,
  new_email text,
  school_id uuid references public.schools(id),
  result text not null,
  reason text,
  created_at timestamptz default now() not null,
  constraint admin_auth_email_change_events_target_type_check
    check (target_type = any (array['teacher'::text])),
  constraint admin_auth_email_change_events_result_check
    check (result = any (array['changed'::text, 'blocked'::text, 'failed'::text])),
  constraint admin_auth_email_change_events_no_secret_check
    check (
      coalesce(old_email, '') !~* '(access_token|refresh_token|otp|password|senha|token=|#)'
      and coalesce(new_email, '') !~* '(access_token|refresh_token|otp|password|senha|token=|#)'
      and coalesce(reason, '') !~* '(access_token|refresh_token|otp|password|senha|token=|#)'
    )
);

alter table public.admin_auth_email_change_events enable row level security;

revoke all on table public.admin_auth_email_change_events from public;
revoke all on table public.admin_auth_email_change_events from anon;
revoke all on table public.admin_auth_email_change_events from authenticated;

create index if not exists admin_auth_email_change_events_admin_user_idx
  on public.admin_auth_email_change_events(admin_user_id, created_at desc);

create index if not exists admin_auth_email_change_events_target_idx
  on public.admin_auth_email_change_events(target_type, target_institutional_id, created_at desc);

create index if not exists admin_auth_email_change_events_auth_user_idx
  on public.admin_auth_email_change_events(target_auth_user_id, created_at desc);

comment on table public.admin_auth_email_change_events is
  'Admin-only audit trail for Auth e-mail changes. Stores no passwords, tokens, recovery links, or secrets.';
