-- Synthetic local auth scaffolding only; no production Auth changes.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role dashboard_user nologin;
create role supabase_admin nologin superuser;
create role supabase_storage_admin nologin superuser;
create schema auth;
create table auth.users(id uuid primary key,email text,raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claim.sub',true),''),nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
create function auth.role() returns text language sql stable as $$select current_user::text$$;
grant usage on schema auth to public;
grant execute on all functions in schema auth to public;
create schema extensions;
create extension pgcrypto with schema extensions;
