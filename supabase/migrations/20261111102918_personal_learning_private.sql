-- Personal external learning. No course completion, certificate authenticity,
-- professional recognition or institutional entitlement is inferred here.
begin;

create table public.personal_learning_courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 180),
  provider text not null check (length(btrim(provider)) between 1 and 120),
  source_url text not null check (length(source_url) <= 2048 and source_url ~ '^https://[^[:space:]]+$'),
  status text not null default 'saved' check (status in ('saved','in_progress','completed')),
  completed_on date,
  completion_declared_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (owner_id, source_url),
  check ((status = 'completed' and completed_on is not null and completion_declared_at is not null)
    or (status <> 'completed' and completed_on is null and completion_declared_at is null))
);

create table public.personal_learning_certificates (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null,
  original_name text not null check (length(original_name) between 1 and 160),
  mime_type text not null check (mime_type in ('application/pdf','image/png','image/jpeg')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null unique,
  unique (owner_id, course_id, sha256),
  created_at timestamptz not null default now(),
  foreign key (course_id, owner_id) references public.personal_learning_courses(id, owner_id) on delete cascade,
  check (storage_path = owner_id::text || '/' || course_id::text || '/' || id::text || '/' || sha256 ||
    case mime_type when 'application/pdf' then '.pdf' when 'image/png' then '.png' else '.jpg' end)
);
create index personal_learning_owner_updated on public.personal_learning_courses(owner_id, updated_at desc);
create index personal_learning_certificates_owner_course on public.personal_learning_certificates(owner_id, course_id);

-- Serialize capacity checks per owner/course so concurrent uploads cannot bypass
-- limits. Invoker security: these functions grant no table privileges.
create function public.personal_learning_course_capacity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform id from public.profiles where id = new.owner_id for update;
  if (select count(*) from public.personal_learning_courses where owner_id = new.owner_id) >= 500 then
    raise exception 'COURSE_LIMIT' using errcode = '23514';
  end if;
  return new;
end;
$$;
create function public.personal_learning_certificate_capacity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform id from public.personal_learning_courses where id = new.course_id and owner_id = new.owner_id for update;
  if exists (select 1 from public.personal_learning_courses where id = new.course_id and owner_id = new.owner_id and archived_at is not null) then
    raise exception 'COURSE_ARCHIVED' using errcode = '23514';
  end if;
  if (select count(*) from public.personal_learning_certificates where course_id = new.course_id and owner_id = new.owner_id) >= 10 then
    raise exception 'CERTIFICATE_LIMIT' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.personal_learning_course_capacity(), public.personal_learning_certificate_capacity() from public, anon, authenticated;
grant execute on function public.personal_learning_course_capacity(), public.personal_learning_certificate_capacity() to service_role;
create trigger personal_learning_course_capacity before insert on public.personal_learning_courses
for each row execute function public.personal_learning_course_capacity();
create trigger personal_learning_certificate_capacity before insert on public.personal_learning_certificates
for each row execute function public.personal_learning_certificate_capacity();

alter table public.personal_learning_courses enable row level security;
alter table public.personal_learning_certificates enable row level security;
-- Browser clients can read their own metadata only. Every mutation and all
-- Storage access go through the authenticated, owner-bound Edge handler.
revoke all on public.personal_learning_courses, public.personal_learning_certificates from public, anon, authenticated;
grant select on public.personal_learning_courses, public.personal_learning_certificates to authenticated;
grant all on public.personal_learning_courses, public.personal_learning_certificates to service_role;

create policy personal_learning_courses_read_own on public.personal_learning_courses for select to authenticated
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active'
  and p.platform_role in ('professor','educacao_infantil','coordenador','gestor','admin','admin_ti','administrador','administrador_nacional')
));
create policy personal_learning_certificates_read_own on public.personal_learning_certificates for select to authenticated
using (owner_id = (select auth.uid()) and exists (
  select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active'
  and p.platform_role in ('professor','educacao_infantil','coordenador','gestor','admin','admin_ti','administrador','administrador_nacional')
));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('personal-learning-certificates','personal-learning-certificates',false,10485760,
  array['application/pdf','image/png','image/jpeg']);
-- Restrictive guard also blocks accidentally broad permissive policies added
-- in another feature. service_role bypass is confined to the Edge function.
create policy personal_learning_storage_no_client_read on storage.objects as restrictive for select to anon, authenticated
using (bucket_id <> 'personal-learning-certificates');
create policy personal_learning_storage_no_client_insert on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id <> 'personal-learning-certificates');
create policy personal_learning_storage_no_client_update on storage.objects as restrictive for update to anon, authenticated
using (bucket_id <> 'personal-learning-certificates') with check (bucket_id <> 'personal-learning-certificates');
create policy personal_learning_storage_no_client_delete on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id <> 'personal-learning-certificates');
comment on table public.personal_learning_courses is 'Private personal organization of external courses. Completion is self-declared, never independently verified.';
comment on table public.personal_learning_certificates is 'Private external evidence uploaded by its owner. Format checks do not attest authenticity, recognition or malware safety.';
commit;
