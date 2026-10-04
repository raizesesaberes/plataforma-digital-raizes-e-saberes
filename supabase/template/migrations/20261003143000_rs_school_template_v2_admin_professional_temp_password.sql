-- RS-SCHOOL-TEMPLATE V2
-- Admin/TI audit trail for professional temporary password issuance.

create table if not exists public.admin_professional_password_events (
  id uuid default gen_random_uuid() primary key,
  admin_user_id uuid references auth.users(id),
  target_type text not null default 'teacher',
  target_institutional_id uuid,
  target_auth_user_id uuid references auth.users(id),
  target_email text,
  school_id uuid references public.schools(id),
  action text not null,
  result text not null,
  reason text,
  created_at timestamptz default now() not null,
  constraint admin_professional_password_events_target_type_check
    check (target_type = any (array['teacher'::text])),
  constraint admin_professional_password_events_action_check
    check (action = any (array['temporary_password_created'::text, 'temporary_password_reset'::text])),
  constraint admin_professional_password_events_result_check
    check (result = any (array['created'::text, 'blocked'::text, 'failed'::text])),
  constraint admin_professional_password_events_no_secret_check
    check (
      coalesce(target_email, '') !~* '(access_token|refresh_token|otp|password|senha|token=|#)'
      and coalesce(reason, '') !~* '(access_token|refresh_token|otp|password|senha|token=|#)'
    )
);

alter table public.admin_professional_password_events enable row level security;

revoke all on table public.admin_professional_password_events from public;
revoke all on table public.admin_professional_password_events from anon;
revoke all on table public.admin_professional_password_events from authenticated;

create index if not exists admin_professional_password_events_admin_idx
  on public.admin_professional_password_events(admin_user_id, created_at desc);

create index if not exists admin_professional_password_events_target_idx
  on public.admin_professional_password_events(target_type, target_institutional_id, created_at desc);

create index if not exists admin_professional_password_events_auth_user_idx
  on public.admin_professional_password_events(target_auth_user_id, created_at desc);

comment on table public.admin_professional_password_events is
  'Admin-only audit trail for teacher temporary password creation/reset. Stores no plaintext passwords, hashes, tokens or recovery links.';
