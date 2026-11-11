-- EMERGENCY REVERSIBLE ROLLBACK: disable feature access, retain all user records
-- and certificate bytes. Do not delete buckets or objects with SQL.
begin;
revoke all on public.personal_learning_courses, public.personal_learning_certificates from authenticated, anon, public, service_role;
-- Existing signed links expire within 60 seconds. Disable the personal-learning
-- Edge function and remove the UI entry points along with this database rollback.
commit;
-- To restore after review: grant select on both tables to authenticated and
-- grant all to service_role. Policies remain intact. For a completely empty
-- never-used staging install only, a DBA may separately drop the two tables,
-- four named storage policies, and empty bucket after verifying no user data.
