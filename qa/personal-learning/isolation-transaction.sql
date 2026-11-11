-- Run ONLY after applying the migration to a disposable local/staging database.
-- All fixtures are synthetic and rolled back. Never supplies real credentials.
-- Hosted production migration is deliberately not performed by this test file.
begin;
insert into auth.users(id,aud,role,email) values
 ('f1000000-0000-4000-8000-000000000001','authenticated','authenticated','learning-a@example.invalid'),
 ('f1000000-0000-4000-8000-000000000002','authenticated','authenticated','learning-b@example.invalid'),
 ('f1000000-0000-4000-8000-000000000003','authenticated','authenticated','learning-admin@example.invalid');
insert into public.profiles(id,platform_role,status) values
 ('f1000000-0000-4000-8000-000000000001','professor','active'),
 ('f1000000-0000-4000-8000-000000000002','professor','active'),
 ('f1000000-0000-4000-8000-000000000003','admin','active');
insert into public.personal_learning_courses(id,owner_id,title,provider,source_url) values
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Curso sintético A','Fixture','https://example.org/a'),
 ('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','Curso sintético B','Fixture','https://example.org/b');
insert into public.personal_learning_certificates(id,owner_id,course_id,original_name,mime_type,byte_size,sha256,storage_path) values
 ('f3000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000001','fixture.pdf','application/pdf',20,repeat('a',64),'f1000000-0000-4000-8000-000000000001/f2000000-0000-4000-8000-000000000001/f3000000-0000-4000-8000-000000000001/'||repeat('a',64)||'.pdf');
-- Browser A sees only A, cannot spoof owner or bypass Edge upload validation.
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$
begin
  if (select count(*) from public.personal_learning_courses) <> 1 then raise exception 'owner isolation failed'; end if;
  if (select count(*) from public.personal_learning_certificates) <> 1 then raise exception 'certificate owner visibility failed'; end if;
  begin
    insert into public.personal_learning_courses(owner_id,title,provider,source_url) values ('f1000000-0000-4000-8000-000000000002','Spoof','Fixture','https://example.org/spoof');
    raise exception 'client insert was allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.personal_learning_courses set owner_id='f1000000-0000-4000-8000-000000000002';
    raise exception 'client owner reassignment was allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects(bucket_id,name) values ('personal-learning-certificates','bypass.txt');
    raise exception 'direct client upload was allowed';
  exception when insufficient_privilege then null; end;
end;
$$;
-- Browser B cannot read A's certificate; an admin does not bypass personal ownership.
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$ begin
 if (select count(*) from public.personal_learning_certificates) <> 0 then raise exception 'cross-user certificate exposed'; end if;
end; $$;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"platform_role":"admin"}}',true);
do $$ begin
 if (select count(*) from public.personal_learning_courses) <> 0 then raise exception 'admin saw teacher personal records'; end if;
end; $$;
-- Current profile status, not stale JWT metadata, controls access.
reset role;
update public.profiles set status='blocked' where id='f1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"f1000000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"platform_role":"professor"}}',true);
do $$ begin
 if (select count(*) from public.personal_learning_courses) <> 0 then raise exception 'blocked profile still has access'; end if;
end; $$;
set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
do $$ begin
 begin
  perform 1 from public.personal_learning_courses;
  raise exception 'anonymous table access was allowed';
 exception when insufficient_privilege then null; end;
end; $$;
reset role;
do $$ begin
 if not exists (select 1 from storage.buckets where id='personal-learning-certificates' and public=false and file_size_limit=10485760) then raise exception 'private bucket invariant failed'; end if;
 if (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname like 'personal_learning_storage_%' and permissive='RESTRICTIVE') <> 4 then raise exception 'restrictive storage guards missing'; end if;
end; $$;
rollback;
