-- Review candidate rebuilt in isolated cloud from inspected institutional schema.
-- No student data, assignments, catalog, credentials, or XP seeded. Apply only after review.
begin;
create schema mission_private;
revoke all on schema mission_private from public,anon,authenticated;
grant usage on schema mission_private to authenticated;
-- Fail-closed staging control. Enabling requires separate reviewed entitlement binding and explicit release decision.
create table mission_private.release_control(singleton boolean primary key default true check(singleton),enabled boolean not null default false,reason text not null default 'pending_entitlement_binding_and_release_review',changed_at timestamptz not null default now());
insert into mission_private.release_control(singleton) values(true);
alter table mission_private.release_control enable row level security;
revoke all on mission_private.release_control from public,anon,authenticated;
create function mission_private.release_enabled() returns boolean language sql stable security definer set search_path='' as $$select coalesce((select enabled from mission_private.release_control where singleton),false)$$;
revoke all on function mission_private.release_enabled() from public,anon,authenticated;
create table mission_private.revisions(
 id uuid primary key default gen_random_uuid(),activity_key text not null,revision text not null,title text not null,engine text not null,
 grade text check(grade in ('infantil','1','2','3','4','5','6','7','8','9','EM1','EM2','EM3')),
 age_ranges text[] not null default '{}',content_hash text not null check(content_hash ~ '^[a-f0-9]{64}$'),
 source_json text not null check(octet_length(source_json)<=2097152 and jsonb_typeof(source_json::jsonb)='object'),
 snapshot jsonb generated always as(source_json::jsonb) stored,
 source_sha256 text not null check(source_sha256=encode(sha256(convert_to(source_json,'UTF8')),'hex')),
 published boolean not null default false,owner_auth_id uuid,author_draft_id uuid unique,root_source_revision_id uuid references mission_private.revisions(id),
 pedagogical_status text not null default 'draft' check(pedagogical_status='draft'),created_at timestamptz not null default now(),
 unique(activity_key,revision),check(age_ranges <@ array['2-3','4-5']::text[]),
 check(engine<>'colorir' or (grade='infantil' and cardinality(age_ranges)>0))
);
-- Provenance only: these links NEVER grant a license or upgrade pedagogical status.
create table mission_private.source_bindings(root_revision_id uuid primary key references mission_private.revisions(id),source_content_item_id uuid not null references public.content_items(id),source_reference text not null,verification_batch text not null,verified_at timestamptz not null default now());
alter table mission_private.source_bindings enable row level security;
revoke all on mission_private.source_bindings from public,anon,authenticated;
create index source_bindings_content_idx on mission_private.source_bindings(source_content_item_id);
create index revisions_root_source_idx on mission_private.revisions(root_source_revision_id);
create table mission_private.assignments(
 id uuid primary key default gen_random_uuid(),class_id uuid not null references public.classes(id),school_id uuid not null references public.schools(id),
 revision_id uuid not null references mission_private.revisions(id),teacher_auth_id uuid not null,request_id uuid not null,
 age_range text check(age_range in ('2-3','4-5')),starts_at timestamptz not null,ends_at timestamptz,timezone text not null,
 assigned_at timestamptz not null default clock_timestamp(),cancelled_at timestamptz,
 unique(teacher_auth_id,request_id),check(isfinite(starts_at) and (ends_at is null or (isfinite(ends_at) and ends_at>starts_at)))
);
create table mission_private.drafts(
 id uuid primary key default gen_random_uuid(),class_id uuid not null references public.classes(id),base_revision_id uuid not null references mission_private.revisions(id),
 teacher_auth_id uuid not null,request_id uuid not null,source_json text not null check(octet_length(source_json)<=2097152 and jsonb_typeof(source_json::jsonb)='object'),
 created_at timestamptz not null default clock_timestamp(),unique(teacher_auth_id,request_id)
);
create table mission_private.artworks(user_id uuid not null,revision_id uuid not null references mission_private.revisions(id),document jsonb not null,
 version integer not null check(version>0),updated_at timestamptz not null default clock_timestamp(),primary key(user_id,revision_id));
create table mission_private.plans(teacher_auth_id uuid not null,class_id uuid not null references public.classes(id),week_start date not null,document jsonb not null,
 version integer not null check(version>0),updated_at timestamptz not null default clock_timestamp(),primary key(teacher_auth_id,class_id,week_start));
create function mission_private.immutable() returns trigger language plpgsql set search_path='' as $$begin raise exception 'MISSION_IMMUTABLE';end$$;
create function mission_private.assignment_immutable() returns trigger language plpgsql set search_path='' as $$begin
 if tg_op='DELETE' then raise exception 'MISSION_HISTORY_IMMUTABLE';end if;
 if to_jsonb(new)-'cancelled_at' is distinct from to_jsonb(old)-'cancelled_at' or old.cancelled_at is not null or new.cancelled_at is null then raise exception 'MISSION_IMMUTABLE';end if;return new;end$$;
create trigger source_binding_immutable before update or delete on mission_private.source_bindings for each row execute function mission_private.immutable();
create trigger revision_immutable before update or delete on mission_private.revisions for each row execute function mission_private.immutable();
create trigger draft_immutable before update or delete on mission_private.drafts for each row execute function mission_private.immutable();
create trigger assignment_immutable before update or delete on mission_private.assignments for each row execute function mission_private.assignment_immutable();
create function mission_private.teacher_allowed(c_id uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.teachers t join public.profiles p on p.id=t.profile_id
 join public.class_teacher_memberships m on m.teacher_id=t.id join public.classes c on c.id=m.class_id and c.school_id=t.school_id
 join public.schools s on s.id=c.school_id join public.school_memberships sm on sm.profile_id=p.id and sm.school_id=s.id
 where c.id=c_id and p.id=auth.uid() and p.platform_role='professor' and p.status='active' and t.status='active' and c.status='active' and s.status='active'
 and m.status='active' and m.started_at<=clock_timestamp() and (m.ended_at is null or m.ended_at>clock_timestamp())
 and sm.status='active' and sm.started_at<=clock_timestamp() and (sm.ended_at is null or sm.ended_at>clock_timestamp()));$$;
create function mission_private.student_allowed(c_id uuid,s_id uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.students s join public.enrollments e on e.student_id=s.id
 join public.classes c on c.id=e.class_id and c.school_id=e.school_id join public.schools sc on sc.id=c.school_id
 where s.user_id=auth.uid() and s.status='active' and e.status='active' and c.status='active' and sc.status='active'
 and e.class_id=c_id and e.school_id=s_id and e.enrolled_at<=clock_timestamp() and (e.ended_at is null or e.ended_at>clock_timestamp()));$$;
create function mission_private.class_grade(c_id uuid) returns text language sql stable security definer set search_path='' as $$
 select case when count(distinct mapped)=1 then min(mapped) end from (
 select case when seg.code='EDUCACAO_INFANTIL' then 'infantil'
 when seg.code in('FUNDAMENTAL','FUNDAMENTAL_ANOS_FINAIS') and g.code in('1_ANO','2_ANO','3_ANO','4_ANO','5_ANO','6_ANO','7_ANO','8_ANO','9_ANO') then split_part(g.code,'_',1)
 when seg.code='ENSINO_MEDIO' and g.code in('EM_1','EM_2','EM_3') then replace(g.code,'_','') end mapped
 from public.classes c join public.content_grade_aliases a on a.alias_code=public.rs_content_normalize_code(c.ano_escolar::text)
 join public.content_grades g on g.id=a.grade_id and g.status='active' join public.content_segments seg on seg.id=g.segment_id and seg.status='active' where c.id=c_id)x;$$;
create function mission_private.revision_json(r mission_private.revisions) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('id',r.id,'root_source_revision_id',coalesce(r.root_source_revision_id,r.id),'source_binding_status',case when exists(select 1 from mission_private.source_bindings sb where sb.root_revision_id=coalesce(r.root_source_revision_id,r.id)) then 'verified_source_only' else 'unmapped' end,'activity_key',r.activity_key,'revision',r.revision,'title',r.title,'engine',r.engine,'grade',r.grade,'ageRanges',r.age_ranges,
 'content_hash',r.content_hash,'source_sha256',r.source_sha256,'snapshot_json',r.source_json,'pedagogical_status',r.pedagogical_status,
 'review_status',case when r.owner_auth_id is null then 'source_draft' else 'teacher_authored' end,'institutional_release_enabled',mission_private.release_enabled(),'assignable',r.published and r.grade is not null and mission_private.release_enabled(),'xp_enabled',false,'completion_enabled',false);$$;
create function mission_private.assignment_json(a mission_private.assignments) returns jsonb language sql stable set search_path='' as $$
 select mission_private.revision_json(r)||jsonb_build_object('id',a.id,'revision_id',a.revision_id,'class_id',a.class_id,'starts_at',a.starts_at,'ends_at',a.ends_at,
 'timezone',a.timezone,'assigned_at',a.assigned_at,'cancelled_at',a.cancelled_at,'ageRange',a.age_range,
 'state',case when a.cancelled_at is not null then 'cancelled' when a.starts_at>now() then 'scheduled' when a.ends_at<=now() then 'expired' else 'active' end)
 from mission_private.revisions r where r.id=a.revision_id;$$;
create function mission_private.check_selection(c_id uuid,r_id uuid,st timestamptz,en timestamptz,tz text,age text) returns void language plpgsql stable security definer set search_path='' as $$
declare r mission_private.revisions;begin
 if not mission_private.teacher_allowed(c_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into r from mission_private.revisions where id=r_id and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 if r.grade is null or r.grade is distinct from mission_private.class_grade(c_id) then raise exception 'MISSION_GRADE_MISMATCH';end if;
 if st is null or not isfinite(st) or (en is not null and(not isfinite(en) or en<=st)) or (r.grade='infantil' and en is not null) or (r.grade<>'infantil' and en is null) then raise exception 'MISSION_INVALID_INTERVAL';end if;
 if tz is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then raise exception 'MISSION_INVALID_TIMEZONE';end if;
 if (r.engine='colorir' and(age is null or not age=any(r.age_ranges))) or(r.engine<>'colorir' and age is not null) then raise exception 'MISSION_INVALID_AGE_RANGE';end if;end$$;
create function mission_private.teacher_classes() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'school_id',c.school_id,'name',c.nome,'grade',mission_private.class_grade(c.id)) order by c.nome,c.id) from public.classes c where mission_private.teacher_allowed(c.id)),'[]');end$$;
create function mission_private.teacher_catalog(p_class_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 return coalesce((select jsonb_agg(mission_private.revision_json(r) order by activity_key,revision) from mission_private.revisions r where published and(owner_auth_id is null or owner_auth_id=auth.uid()) and grade=mission_private.class_grade(p_class_id)),'[]');end$$;
create function mission_private.teacher_assign(p_class_id uuid,p_revision_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,p_request_id uuid,p_age_range text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a mission_private.assignments;sid uuid;begin
 perform mission_private.check_selection(p_class_id,p_revision_id,p_starts_at,p_ends_at,p_timezone,p_age_range);
 if not mission_private.release_enabled() then raise exception 'MISSION_INSTITUTIONAL_RELEASE_BLOCKED';end if;
 if p_request_id is null then raise exception 'MISSION_INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into a from mission_private.assignments where teacher_auth_id=auth.uid() and request_id=p_request_id;
 if found then
 if a.class_id is distinct from p_class_id or a.revision_id is distinct from p_revision_id or a.starts_at is distinct from p_starts_at or a.ends_at is distinct from p_ends_at or a.timezone is distinct from p_timezone or a.age_range is distinct from p_age_range then raise exception 'MISSION_IDEMPOTENCY_CONFLICT';end if;
 return mission_private.assignment_json(a);end if;
 select school_id into sid from public.classes where id=p_class_id for share;
 insert into mission_private.assignments(class_id,school_id,revision_id,teacher_auth_id,request_id,starts_at,ends_at,timezone,age_range)
 values(p_class_id,sid,p_revision_id,auth.uid(),p_request_id,p_starts_at,p_ends_at,p_timezone,p_age_range) returning * into a;return mission_private.assignment_json(a);end$$;
create function mission_private.teacher_list(p_class_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 return coalesce((select jsonb_agg(mission_private.assignment_json(a) order by a.assigned_at,a.id) from mission_private.assignments a where class_id=p_class_id),'[]');end$$;
create function mission_private.teacher_cancel(p_assignment_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$declare a mission_private.assignments;begin
 select * into a from mission_private.assignments where id=p_assignment_id for update;
 if not found or not mission_private.teacher_allowed(a.class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if a.cancelled_at is null then update mission_private.assignments set cancelled_at=clock_timestamp() where id=a.id returning * into a;end if;
 return mission_private.assignment_json(a);end$$;
create function mission_private.student_list(p_assignment_id uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if not mission_private.release_enabled() then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(mission_private.assignment_json(a) order by a.assigned_at,a.id) from mission_private.assignments a where(p_assignment_id is null or a.id=p_assignment_id)
 and a.cancelled_at is null and a.starts_at<=now() and(a.ends_at is null or a.ends_at>now()) and mission_private.student_allowed(a.class_id,a.school_id)),'[]');end$$;
create function mission_private.save_draft(p_class_id uuid,p_base_revision_id uuid,p_snapshot_json text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r mission_private.revisions;d mission_private.drafts;payload jsonb;begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if p_request_id is null or p_snapshot_json is null or octet_length(p_snapshot_json)>2097152 then raise exception 'MISSION_INVALID_DRAFT';end if;
 payload:=p_snapshot_json::jsonb;select * into r from mission_private.revisions where id=p_base_revision_id and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found or r.grade is distinct from mission_private.class_grade(p_class_id) then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 if jsonb_typeof(payload)<>'object' or payload->>'id' is distinct from r.snapshot->>'id' or payload->>'template' is distinct from r.snapshot->>'template' or payload->>'type' is distinct from r.snapshot->>'type' or payload->>'grade' is distinct from r.snapshot->>'grade' then raise exception 'MISSION_DRAFT_IDENTITY_CHANGED';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into d from mission_private.drafts where teacher_auth_id=auth.uid() and request_id=p_request_id;
 if found then
 if d.class_id is distinct from p_class_id or d.base_revision_id is distinct from p_base_revision_id or d.source_json is distinct from p_snapshot_json then raise exception 'MISSION_IDEMPOTENCY_CONFLICT';end if;
 else insert into mission_private.drafts(class_id,base_revision_id,teacher_auth_id,request_id,source_json) values(p_class_id,p_base_revision_id,auth.uid(),p_request_id,p_snapshot_json) returning * into d;end if;
 return jsonb_build_object('id',d.id,'base_revision_id',d.base_revision_id,'snapshot_json',d.source_json,'source_sha256',encode(sha256(convert_to(d.source_json,'UTF8')),'hex'),'created_at',d.created_at,'review_status','pending_validation','assignable',false);end$$;
create function mission_private.list_drafts(p_class_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'base_revision_id',d.base_revision_id,'snapshot_json',d.source_json,'source_sha256',encode(sha256(convert_to(d.source_json,'UTF8')),'hex'),'created_at',d.created_at,'review_status',case when r.id is null then 'pending_validation' else 'teacher_authored' end,'assignable',r.id is not null,'published_revision_id',r.id) order by d.created_at,d.id) from mission_private.drafts d left join mission_private.revisions r on r.author_draft_id=d.id where d.class_id=p_class_id and d.teacher_auth_id=auth.uid()),'[]');end$$;
create function mission_private.safe_prose_edit(base jsonb,edited jsonb,field_name text default '') returns boolean language plpgsql immutable set search_path='' as $$
declare k text;i integer;v text;begin
 if base=edited then return true;end if;
 if jsonb_typeof(base) is distinct from jsonb_typeof(edited) then return false;end if;
 if jsonb_typeof(base)='object' then
 if(select array_agg(x order by x) from jsonb_object_keys(base)x) is distinct from(select array_agg(x order by x) from jsonb_object_keys(edited)x) then return false;end if;
 for k in select jsonb_object_keys(base) loop if not mission_private.safe_prose_edit(base->k,edited->k,k) then return false;end if;end loop;return true;
 elsif jsonb_typeof(base)='array' then
 if jsonb_array_length(base)<>jsonb_array_length(edited) then return false;end if;
 for i in 0..jsonb_array_length(base)-1 loop if not mission_private.safe_prose_edit(base->i,edited->i,field_name) then return false;end if;end loop;return true;
 elsif jsonb_typeof(base)='string' and field_name in('title','description','prompt','label','explanation','text','instruction','instructions','question') then
 v:=edited#>>'{}';return length(btrim(v)) between 1 and 8000 and v !~ '[<>]' and v !~* '(https?:|javascript:|data:|file:|vbscript:|//)' and regexp_replace(v,E'[\\n\\r\\t]','','g') !~ '[[:cntrl:]]';end if;return false;end$$;
create function mission_private.publish_draft(p_draft_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare d mission_private.drafts;b mission_private.revisions;r mission_private.revisions;h text;begin
 if auth.uid() is null then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into d from mission_private.drafts where id=p_draft_id and teacher_auth_id=auth.uid();
 if not found or not mission_private.teacher_allowed(d.class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into b from mission_private.revisions where id=d.base_revision_id;
 if not b.published or(b.owner_auth_id is not null and b.owner_auth_id<>auth.uid()) or b.grade is distinct from mission_private.class_grade(d.class_id) then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 if b.engine='colorir' or not mission_private.safe_prose_edit(b.snapshot,d.source_json::jsonb) then raise exception 'MISSION_EDIT_REQUIRES_ENGINE_REVIEW';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_draft_id::text,0));select * into r from mission_private.revisions where author_draft_id=p_draft_id;
 if not found then h:=encode(sha256(convert_to(d.source_json,'UTF8')),'hex');
 insert into mission_private.revisions(activity_key,revision,title,engine,grade,age_ranges,content_hash,source_json,source_sha256,published,owner_auth_id,author_draft_id)
 values(b.activity_key,auth.uid()::text||':'||d.id::text,coalesce(d.source_json::jsonb->>'title',b.title),b.engine,b.grade,b.age_ranges,h,d.source_json,h,true,auth.uid(),d.id) returning * into r;end if;
 return mission_private.revision_json(r);end$$;
create function mission_private.validate_artwork(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$declare a jsonb;p jsonb;begin
 if d is null or octet_length(d::text)>1048576 or jsonb_typeof(d)<>'object' or d->'version' is distinct from '1'::jsonb or jsonb_typeof(d->'actions') is distinct from 'array' or jsonb_typeof(d->'cursor') is distinct from 'number' then return false;end if;
 if exists(select 1 from jsonb_object_keys(d)k where k not in('version','actions','cursor')) or jsonb_array_length(d->'actions')>120 or(d->>'cursor')::numeric<>trunc((d->>'cursor')::numeric) or(d->>'cursor')::numeric not between 0 and jsonb_array_length(d->'actions') then return false;end if;
 for a in select value from jsonb_array_elements(d->'actions') loop
 if jsonb_typeof(a)<>'object' or exists(select 1 from jsonb_object_keys(a)k where k not in('tool','color','region','size','points')) then return false;end if;
 if a->>'tool' is null or a->>'tool' not in('fill','brush','erase') or a->>'color' is null or a->>'color' !~ '^#[0-9a-fA-F]{6}$' or jsonb_typeof(a->'region') is distinct from 'number' or jsonb_typeof(a->'size') is distinct from 'number' or jsonb_typeof(a->'points') is distinct from 'array' then return false;end if;
 if(a->>'region')::numeric<>trunc((a->>'region')::numeric) or(a->>'region')::numeric not between 1 and 1000000 or(a->>'size')::numeric not between 1 and 180 or jsonb_array_length(a->'points') not between 1 and 2000 then return false;end if;
 for p in select value from jsonb_array_elements(a->'points') loop
 if jsonb_typeof(p)<>'object' or exists(select 1 from jsonb_object_keys(p)k where k not in('x','y')) or jsonb_typeof(p->'x') is distinct from 'number' or jsonb_typeof(p->'y') is distinct from 'number' then return false;end if;
 if(p->>'x')::numeric not between 0 and 1000 or(p->>'y')::numeric not between 0 and 1000 then return false;end if;end loop;end loop;return true;end$$;
create function mission_private.artwork(p_assignment_id uuid,p_document jsonb default null,p_expected_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a mission_private.assignments;r mission_private.artworks;begin
 select * into a from mission_private.assignments where id=p_assignment_id for share;
 if not found or not mission_private.release_enabled() or auth.uid() is null or not mission_private.student_allowed(a.class_id,a.school_id) or a.cancelled_at is not null or a.starts_at>clock_timestamp() or(a.ends_at is not null and a.ends_at<=clock_timestamp()) or not exists(select 1 from mission_private.revisions where id=a.revision_id and engine='colorir') then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||a.revision_id::text,0));
 if not mission_private.release_enabled() or not mission_private.student_allowed(a.class_id,a.school_id) or a.starts_at>clock_timestamp() or(a.ends_at is not null and a.ends_at<=clock_timestamp()) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into r from mission_private.artworks where user_id=auth.uid() and revision_id=a.revision_id;
 if p_document is not null then
 if not mission_private.validate_artwork(p_document) or p_expected_version is null or p_expected_version<0 then raise exception 'MISSION_INVALID_ARTWORK';end if;
 if coalesce(r.version,0)<>p_expected_version then raise exception 'MISSION_ARTWORK_VERSION_CONFLICT';end if;
 insert into mission_private.artworks(user_id,revision_id,document,version) values(auth.uid(),a.revision_id,p_document,1) on conflict(user_id,revision_id) do update set document=excluded.document,version=mission_private.artworks.version+1,updated_at=clock_timestamp() returning * into r;end if;
 return jsonb_build_object('document',r.document,'version',coalesce(r.version,0),'updated_at',r.updated_at);end$$;
-- A planning save never assigns to pupils. Array order is teacher organization only.
create function mission_private.plan(p_class_id uuid,p_document jsonb default null,p_expected_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r mission_private.plans;i jsonb;a mission_private.assignments;begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_class_id::text,0));select * into r from mission_private.plans where teacher_auth_id=auth.uid() and class_id=p_class_id;
 if p_document is not null then
 if octet_length(p_document::text)>262144 or jsonb_typeof(p_document)<>'object' or jsonb_typeof(p_document->'items') is distinct from 'array' or jsonb_array_length(p_document->'items')>100 or p_expected_version is null or p_expected_version<0 then raise exception 'MISSION_INVALID_PLAN';end if;
 if exists(select 1 from jsonb_object_keys(p_document)k where k not in('week','items')) or coalesce(p_document->>'week','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'MISSION_INVALID_PLAN';end if;
 perform (p_document->>'week')::date;
 for i in select value from jsonb_array_elements(p_document->'items') loop
 if jsonb_typeof(i)<>'object' or exists(select 1 from jsonb_object_keys(i)k where k not in('revision_id','starts_at','ends_at','timezone','ageRange','request_id','assignment_id')) or i->>'request_id' is null then raise exception 'MISSION_INVALID_PLAN_ITEM';end if;
 perform(i->>'request_id')::uuid;
 perform mission_private.check_selection(p_class_id,(i->>'revision_id')::uuid,(i->>'starts_at')::timestamptz,(i->>'ends_at')::timestamptz,i->>'timezone',i->>'ageRange');
 if i->>'assignment_id' is not null then
 select * into a from mission_private.assignments where id=(i->>'assignment_id')::uuid and teacher_auth_id=auth.uid() and class_id=p_class_id;
 if not found or a.revision_id is distinct from(i->>'revision_id')::uuid or a.request_id is distinct from(i->>'request_id')::uuid or a.starts_at is distinct from(i->>'starts_at')::timestamptz or a.ends_at is distinct from(i->>'ends_at')::timestamptz or a.timezone is distinct from i->>'timezone' or a.age_range is distinct from i->>'ageRange' then raise exception 'MISSION_PUBLISHED_ITEM_IMMUTABLE';end if;end if;
 end loop;
 if(select count(*) from jsonb_array_elements(p_document->'items'))<>(select count(distinct value->>'request_id') from jsonb_array_elements(p_document->'items')) then raise exception 'MISSION_DUPLICATE_PLAN_ITEM';end if;
 if coalesce(r.version,0)<>p_expected_version then raise exception 'MISSION_PLAN_VERSION_CONFLICT';end if;
 insert into mission_private.plans(teacher_auth_id,class_id,document,version) values(auth.uid(),p_class_id,p_document,1) on conflict(teacher_auth_id,class_id) do update set document=excluded.document,version=mission_private.plans.version+1,updated_at=clock_timestamp() returning * into r;end if;
 return jsonb_build_object('document',r.document,'version',coalesce(r.version,0),'updated_at',r.updated_at);end$$;

create function public.mission_teacher_classes_v1() returns jsonb language sql security invoker set search_path='' as $$select mission_private.teacher_classes()$$;

create function public.mission_teacher_list_catalog_v1(p_class_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.teacher_catalog(p_class_id)$$;

create function public.mission_teacher_list_v1(p_class_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.teacher_list(p_class_id)$$;

create function public.mission_teacher_assign_v1(p_class_id uuid,p_revision_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,p_request_id uuid,p_age_range text default null) returns jsonb language sql security invoker set search_path='' as $$select mission_private.teacher_assign(p_class_id,p_revision_id,p_starts_at,p_ends_at,p_timezone,p_request_id,p_age_range)$$;

create function public.mission_teacher_cancel_v1(p_assignment_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.teacher_cancel(p_assignment_id)$$;

create function public.mission_student_list_v1() returns jsonb language sql security invoker set search_path='' as $$select mission_private.student_list(null)$$;

create function public.mission_student_open_v1(p_assignment_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.student_list(p_assignment_id)->0$$;

create function public.mission_teacher_save_revision_v1(p_class_id uuid,p_base_revision_id uuid,p_snapshot_json text,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.save_draft(p_class_id,p_base_revision_id,p_snapshot_json,p_request_id)$$;

create function public.mission_teacher_list_drafts_v1(p_class_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.list_drafts(p_class_id)$$;

create function public.mission_teacher_publish_revision_v1(p_draft_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.publish_draft(p_draft_id)$$;

create function public.mission_student_load_artwork_v1(p_assignment_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.artwork(p_assignment_id)$$;

create function public.mission_student_save_artwork_v1(p_assignment_id uuid,p_document jsonb,p_expected_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$begin if p_document is null then raise exception 'MISSION_INVALID_ARTWORK';end if;return mission_private.artwork(p_assignment_id,p_document,p_expected_version);end$$;

create function public.mission_teacher_get_plan_v1(p_class_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.plan(p_class_id)$$;

create function public.mission_teacher_save_plan_v1(p_class_id uuid,p_document jsonb,p_expected_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$begin if p_document is null then raise exception 'MISSION_INVALID_PLAN';end if;return mission_private.plan(p_class_id,p_document,p_expected_version);end$$;

revoke all on all functions in schema mission_private from public,anon,authenticated;
revoke all on function public.mission_teacher_classes_v1() from public,anon,authenticated;
grant execute on function public.mission_teacher_classes_v1() to authenticated;
revoke all on function public.mission_teacher_list_catalog_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_teacher_list_catalog_v1(uuid) to authenticated;
revoke all on function public.mission_teacher_list_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_teacher_list_v1(uuid) to authenticated;
revoke all on function public.mission_teacher_assign_v1(uuid,uuid,timestamptz,timestamptz,text,uuid,text) from public,anon,authenticated;
grant execute on function public.mission_teacher_assign_v1(uuid,uuid,timestamptz,timestamptz,text,uuid,text) to authenticated;
revoke all on function public.mission_teacher_cancel_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_teacher_cancel_v1(uuid) to authenticated;
revoke all on function public.mission_student_list_v1() from public,anon,authenticated;
grant execute on function public.mission_student_list_v1() to authenticated;
revoke all on function public.mission_student_open_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_student_open_v1(uuid) to authenticated;
revoke all on function public.mission_teacher_save_revision_v1(uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.mission_teacher_save_revision_v1(uuid,uuid,text,uuid) to authenticated;
revoke all on function public.mission_teacher_list_drafts_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_teacher_list_drafts_v1(uuid) to authenticated;
revoke all on function public.mission_teacher_publish_revision_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_teacher_publish_revision_v1(uuid) to authenticated;
revoke all on function public.mission_student_load_artwork_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_student_load_artwork_v1(uuid) to authenticated;
revoke all on function public.mission_student_save_artwork_v1(uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.mission_student_save_artwork_v1(uuid,jsonb,integer) to authenticated;
revoke all on function public.mission_teacher_get_plan_v1(uuid) from public,anon,authenticated;
grant execute on function public.mission_teacher_get_plan_v1(uuid) to authenticated;
revoke all on function public.mission_teacher_save_plan_v1(uuid,jsonb,integer) from public,anon,authenticated;
grant execute on function public.mission_teacher_save_plan_v1(uuid,jsonb,integer) to authenticated;
grant execute on function mission_private.teacher_classes() to authenticated;
grant execute on function mission_private.teacher_catalog(uuid) to authenticated;
grant execute on function mission_private.teacher_list(uuid) to authenticated;
grant execute on function mission_private.teacher_assign(uuid,uuid,timestamptz,timestamptz,text,uuid,text) to authenticated;
grant execute on function mission_private.teacher_cancel(uuid) to authenticated;
grant execute on function mission_private.student_list(uuid) to authenticated;
grant execute on function mission_private.save_draft(uuid,uuid,text,uuid) to authenticated;
grant execute on function mission_private.list_drafts(uuid) to authenticated;
grant execute on function mission_private.publish_draft(uuid) to authenticated;
grant execute on function mission_private.artwork(uuid,jsonb,integer) to authenticated;
grant execute on function mission_private.plan(uuid,jsonb,integer) to authenticated;
alter table mission_private.revisions enable row level security;
revoke all on mission_private.revisions from public,anon,authenticated;
alter table mission_private.assignments enable row level security;
revoke all on mission_private.assignments from public,anon,authenticated;
alter table mission_private.drafts enable row level security;
revoke all on mission_private.drafts from public,anon,authenticated;
alter table mission_private.artworks enable row level security;
revoke all on mission_private.artworks from public,anon,authenticated;
alter table mission_private.plans enable row level security;
revoke all on mission_private.plans from public,anon,authenticated;
create index assignments_class_id_idx on mission_private.assignments(class_id);
create index assignments_school_id_idx on mission_private.assignments(school_id);
create index assignments_revision_id_idx on mission_private.assignments(revision_id);
create index drafts_class_id_idx on mission_private.drafts(class_id);
create index drafts_base_revision_id_idx on mission_private.drafts(base_revision_id);
create index artworks_revision_id_idx on mission_private.artworks(revision_id);
create index plans_class_id_idx on mission_private.plans(class_id);

create table mission_private.plan_publications(teacher_auth_id uuid not null,request_id uuid not null,class_id uuid not null references public.classes(id),expected_version integer not null,result jsonb not null,primary key(teacher_auth_id,request_id));
alter table mission_private.plan_publications enable row level security;
revoke all on mission_private.plan_publications from public,anon,authenticated;
create index plan_publications_class_idx on mission_private.plan_publications(class_id);
create trigger publication_immutable before update or delete on mission_private.plan_publications for each row execute function mission_private.immutable();
create function mission_private.publish_plan(p_class_id uuid,p_expected_version integer,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare p mission_private.plans;receipt mission_private.plan_publications;i jsonb;a jsonb;items jsonb:='[]';result jsonb;begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if p_request_id is null or p_expected_version is null then raise exception 'MISSION_INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select * into receipt from mission_private.plan_publications where teacher_auth_id=auth.uid() and request_id=p_request_id;
 if found then
 if receipt.class_id<>p_class_id or receipt.expected_version<>p_expected_version then raise exception 'MISSION_IDEMPOTENCY_CONFLICT';end if;
 return receipt.result;end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_class_id::text,0));
 select * into p from mission_private.plans where teacher_auth_id=auth.uid() and class_id=p_class_id;
 if not found or p.version<>p_expected_version then raise exception 'MISSION_PLAN_VERSION_CONFLICT';end if;
 if jsonb_array_length(p.document->'items')=0 then raise exception 'MISSION_EMPTY_PLAN';end if;
 for i in select value from jsonb_array_elements(p.document->'items') loop
 if nullif(i->>'starts_at','') is null or nullif(i->>'timezone','') is null or(exists(select 1 from mission_private.revisions where id=(i->>'revision_id')::uuid and grade<>'infantil') and nullif(i->>'ends_at','') is null) or(exists(select 1 from mission_private.revisions where id=(i->>'revision_id')::uuid and engine='colorir') and nullif(i->>'ageRange','') is null) then raise exception 'MISSION_PLAN_INCOMPLETE';end if;
 a:=mission_private.teacher_assign(p_class_id,(i->>'revision_id')::uuid,(i->>'starts_at')::timestamptz,(i->>'ends_at')::timestamptz,i->>'timezone',(i->>'request_id')::uuid,i->>'ageRange');
 items:=items||jsonb_build_array(i||jsonb_build_object('assignment_id',a->>'id'));
 end loop;
 result:=mission_private.plan(p_class_id,jsonb_build_object('week',p.document->>'week','items',items),p.version);
 insert into mission_private.plan_publications values(auth.uid(),p_request_id,p_class_id,p_expected_version,result);
 return result;end$$;
create function public.mission_teacher_publish_plan_v1(p_class_id uuid,p_expected_version integer,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$select mission_private.publish_plan(p_class_id,p_expected_version,p_request_id)$$;
revoke all on function mission_private.publish_plan(uuid,integer,uuid),public.mission_teacher_publish_plan_v1(uuid,integer,uuid) from public,anon,authenticated;
grant execute on function mission_private.publish_plan(uuid,integer,uuid),public.mission_teacher_publish_plan_v1(uuid,integer,uuid) to authenticated;

-- Private drafts may be incomplete; publication alone requires a complete schedule.
create function mission_private.check_plan_selection(c_id uuid,i jsonb) returns void language plpgsql volatile security definer set search_path='' as $$
declare r mission_private.revisions;st timestamptz;en timestamptz;begin
 if not mission_private.teacher_allowed(c_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into r from mission_private.revisions where id=(i->>'revision_id')::uuid and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 if r.grade is null or r.grade is distinct from mission_private.class_grade(c_id) then raise exception 'MISSION_GRADE_MISMATCH';end if;
 st:=nullif(i->>'starts_at','')::timestamptz;en:=nullif(i->>'ends_at','')::timestamptz;
 if(st is not null and not isfinite(st)) or(en is not null and(not isfinite(en) or(st is not null and en<=st))) or(r.grade='infantil' and en is not null) then raise exception 'MISSION_INVALID_INTERVAL';end if;
 if nullif(i->>'timezone','') is not null and not exists(select 1 from pg_catalog.pg_timezone_names where name=i->>'timezone') then raise exception 'MISSION_INVALID_TIMEZONE';end if;
 if nullif(i->>'ageRange','') is not null and(r.engine<>'colorir' or not(i->>'ageRange')=any(r.age_ranges)) then raise exception 'MISSION_INVALID_AGE_RANGE';end if;
 end$$;
revoke all on function mission_private.check_plan_selection(uuid,jsonb) from public,anon,authenticated;
create function mission_private.plan_week(p_class_id uuid,p_week date default null,p_document jsonb default null,p_expected_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r mission_private.plans;i jsonb;a mission_private.assignments;selected_week date;begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 selected_week:=coalesce((p_document->>'week')::date,p_week);
 if selected_week is null then select week_start into selected_week from mission_private.plans where teacher_auth_id=auth.uid() and class_id=p_class_id order by updated_at desc,week_start desc limit 1;end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_class_id::text||coalesce(selected_week::text,''),0));
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;select * into r from mission_private.plans where teacher_auth_id=auth.uid() and class_id=p_class_id and week_start=selected_week;
 if p_document is not null then
 if octet_length(p_document::text)>262144 or jsonb_typeof(p_document)<>'object' or jsonb_typeof(p_document->'items') is distinct from 'array' or jsonb_array_length(p_document->'items')>100 or p_expected_version is null or p_expected_version<0 then raise exception 'MISSION_INVALID_PLAN';end if;
 if exists(select 1 from jsonb_object_keys(p_document)k where k not in('week','items','selected_revision_ids')) or coalesce(p_document->>'week','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'MISSION_INVALID_PLAN';end if;
 perform (p_document->>'week')::date;
 if p_document ? 'selected_revision_ids' then
 if jsonb_typeof(p_document->'selected_revision_ids') is distinct from 'array' or jsonb_array_length(p_document->'selected_revision_ids')>100 then raise exception 'MISSION_INVALID_PLAN';end if;
 for i in select value from jsonb_array_elements(p_document->'selected_revision_ids') loop
 if jsonb_typeof(i)<>'string' then raise exception 'MISSION_INVALID_PLAN_ITEM';end if;
 perform mission_private.check_plan_selection(p_class_id,jsonb_build_object('revision_id',i#>>'{}'));
 end loop;
 if(select count(*) from jsonb_array_elements(p_document->'selected_revision_ids'))<>(select count(distinct value) from jsonb_array_elements(p_document->'selected_revision_ids')) then raise exception 'MISSION_DUPLICATE_PLAN_ITEM';end if;
 end if;
 for i in select value from jsonb_array_elements(p_document->'items') loop
 if jsonb_typeof(i)<>'object' or exists(select 1 from jsonb_object_keys(i)k where k not in('revision_id','starts_at','ends_at','timezone','ageRange','request_id','assignment_id')) or i->>'request_id' is null then raise exception 'MISSION_INVALID_PLAN_ITEM';end if;
 perform(i->>'request_id')::uuid;
 perform mission_private.check_plan_selection(p_class_id,i);
 if i->>'assignment_id' is not null then
 select * into a from mission_private.assignments where id=(i->>'assignment_id')::uuid and teacher_auth_id=auth.uid() and class_id=p_class_id;
 if not found or a.revision_id is distinct from(i->>'revision_id')::uuid or a.request_id is distinct from(i->>'request_id')::uuid or a.starts_at is distinct from(i->>'starts_at')::timestamptz or a.ends_at is distinct from(i->>'ends_at')::timestamptz or a.timezone is distinct from i->>'timezone' or a.age_range is distinct from i->>'ageRange' then raise exception 'MISSION_PUBLISHED_ITEM_IMMUTABLE';end if;end if;
 end loop;
 if(select count(*) from jsonb_array_elements(p_document->'items'))<>(select count(distinct value->>'request_id') from jsonb_array_elements(p_document->'items')) then raise exception 'MISSION_DUPLICATE_PLAN_ITEM';end if;
 if coalesce(r.version,0)<>p_expected_version then raise exception 'MISSION_PLAN_VERSION_CONFLICT';end if;
 insert into mission_private.plans(teacher_auth_id,class_id,week_start,document,version) values(auth.uid(),p_class_id,selected_week,p_document,1) on conflict(teacher_auth_id,class_id,week_start) do update set document=excluded.document,version=mission_private.plans.version+1,updated_at=clock_timestamp() returning * into r;end if;
 return jsonb_build_object('document',r.document,'version',coalesce(r.version,0),'updated_at',r.updated_at);end$$;
create function mission_private.publish_plan_week(p_class_id uuid,p_expected_version integer,p_request_id uuid,p_week date default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare p mission_private.plans;receipt mission_private.plan_publications;i jsonb;a jsonb;items jsonb:='[]';result jsonb;selected_week date;begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if p_request_id is null or p_expected_version is null then raise exception 'MISSION_INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into receipt from mission_private.plan_publications where teacher_auth_id=auth.uid() and request_id=p_request_id;
 if found then
 if receipt.class_id<>p_class_id or receipt.expected_version<>p_expected_version or(p_week is not null and (receipt.result->'document'->>'week')::date<>p_week) then raise exception 'MISSION_IDEMPOTENCY_CONFLICT';end if;
 return receipt.result;end if;
 selected_week:=p_week;
 if selected_week is null then if(select count(*) from mission_private.plans where teacher_auth_id=auth.uid() and class_id=p_class_id)>1 then raise exception 'MISSION_WEEK_REQUIRED';end if;select week_start into selected_week from mission_private.plans where teacher_auth_id=auth.uid() and class_id=p_class_id;end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_class_id::text||coalesce(selected_week::text,''),0));
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into p from mission_private.plans where teacher_auth_id=auth.uid() and class_id=p_class_id and week_start=selected_week;
 if not found or p.version<>p_expected_version then raise exception 'MISSION_PLAN_VERSION_CONFLICT';end if;
 if jsonb_array_length(p.document->'items')=0 then raise exception 'MISSION_EMPTY_PLAN';end if;
 for i in select value from jsonb_array_elements(p.document->'items') loop
 if nullif(i->>'starts_at','') is null or nullif(i->>'timezone','') is null or(exists(select 1 from mission_private.revisions where id=(i->>'revision_id')::uuid and grade<>'infantil') and nullif(i->>'ends_at','') is null) or(exists(select 1 from mission_private.revisions where id=(i->>'revision_id')::uuid and engine='colorir') and nullif(i->>'ageRange','') is null) then raise exception 'MISSION_PLAN_INCOMPLETE';end if;
 a:=mission_private.teacher_assign(p_class_id,(i->>'revision_id')::uuid,(i->>'starts_at')::timestamptz,(i->>'ends_at')::timestamptz,i->>'timezone',(i->>'request_id')::uuid,i->>'ageRange');
 items:=items||jsonb_build_array(i||jsonb_build_object('assignment_id',a->>'id'));
 end loop;
 result:=mission_private.plan_week(p_class_id,selected_week,p.document||jsonb_build_object('items',items),p.version);
 insert into mission_private.plan_publications values(auth.uid(),p_request_id,p_class_id,p_expected_version,result);
 return result;end$$;
create function mission_private.teacher_allowed_for(c_id uuid,p_user_id uuid) returns boolean language sql volatile security definer set search_path='' as $$
 select p_user_id is not null and exists(select 1 from public.teachers t join public.profiles p on p.id=t.profile_id
 join public.class_teacher_memberships m on m.teacher_id=t.id join public.classes c on c.id=m.class_id and c.school_id=t.school_id
 join public.schools s on s.id=c.school_id join public.school_memberships sm on sm.profile_id=p.id and sm.school_id=s.id
 where c.id=c_id and p.id=p_user_id and p.platform_role='professor' and p.status='active' and t.status='active' and c.status='active' and s.status='active'
 and m.status='active' and m.started_at<=clock_timestamp() and (m.ended_at is null or m.ended_at>clock_timestamp())
 and sm.status='active' and sm.started_at<=clock_timestamp() and (sm.ended_at is null or sm.ended_at>clock_timestamp()));$$;

create function mission_private.draft_for_publish(p_draft_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d mission_private.drafts;b mission_private.revisions;begin
 select * into d from mission_private.drafts where id=p_draft_id and teacher_auth_id=auth.uid();
 if not found or not mission_private.teacher_allowed(d.class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into b from mission_private.revisions where id=d.base_revision_id and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found or b.grade is distinct from mission_private.class_grade(d.class_id) then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 return jsonb_build_object('id',d.id,'class_id',d.class_id,'teacher_auth_id',d.teacher_auth_id,'snapshot_json',d.source_json,'source_sha256',encode(sha256(convert_to(d.source_json,'UTF8')),'hex'),'base_revision_id',b.id,'base_snapshot_json',b.source_json,'base_source_sha256',b.source_sha256,'engine',b.engine);end$$;
create function mission_private.finalize_revision(p_teacher_auth_id uuid,p_draft_id uuid,p_draft_sha256 text,p_base_sha256 text,p_source_json text,p_content_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare d mission_private.drafts;b mission_private.revisions;r mission_private.revisions;h text;begin
 -- Invocable only by service_role via audited Edge handler; no client can self-attest validation.
 select * into d from mission_private.drafts where id=p_draft_id and teacher_auth_id=p_teacher_auth_id;
 if not found or not mission_private.teacher_allowed_for(d.class_id,p_teacher_auth_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into b from mission_private.revisions where id=d.base_revision_id;
 if not b.published or(b.owner_auth_id is not null and b.owner_auth_id<>p_teacher_auth_id) or b.grade is distinct from mission_private.class_grade(d.class_id) then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 if p_draft_sha256 is distinct from encode(sha256(convert_to(d.source_json,'UTF8')),'hex') or p_base_sha256 is distinct from b.source_sha256 then raise exception 'MISSION_DRAFT_HASH_MISMATCH';end if;
 if p_source_json is null or octet_length(p_source_json)>2097152 or jsonb_typeof(p_source_json::jsonb)<>'object' then raise exception 'MISSION_INVALID_SOURCE';end if;
 h:=encode(sha256(convert_to(p_source_json,'UTF8')),'hex');
 if b.engine='colorir' then
 if (p_source_json::jsonb-'contentHash') is distinct from(d.source_json::jsonb-'contentHash') or p_source_json::jsonb->>'contentHash' is distinct from p_content_hash then raise exception 'MISSION_VALIDATED_SOURCE_MISMATCH';end if;
 else if p_source_json is distinct from d.source_json or p_content_hash is distinct from h then raise exception 'MISSION_VALIDATED_SOURCE_MISMATCH';end if;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_draft_id::text,0));
 if not mission_private.teacher_allowed_for(d.class_id,p_teacher_auth_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into r from mission_private.revisions where author_draft_id=p_draft_id;
 if found then
 if r.source_json is distinct from p_source_json or r.content_hash is distinct from p_content_hash then raise exception 'MISSION_FINALIZATION_CONFLICT';end if;
 else insert into mission_private.revisions(activity_key,revision,title,engine,grade,age_ranges,content_hash,source_json,source_sha256,published,owner_auth_id,author_draft_id,root_source_revision_id)
 values(b.activity_key,p_teacher_auth_id::text||':'||d.id::text,coalesce(p_source_json::jsonb->>'title',b.title),b.engine,b.grade,b.age_ranges,p_content_hash,p_source_json,h,true,p_teacher_auth_id,d.id,coalesce(b.root_source_revision_id,b.id)) returning * into r;end if;
 return mission_private.revision_json(r);end$$;
-- No direct-client publication bypass around the full engine validator.
revoke all on function public.mission_teacher_publish_revision_v1(uuid),mission_private.publish_draft(uuid),mission_private.plan(uuid,jsonb,integer),mission_private.publish_plan(uuid,integer,uuid) from public,anon,authenticated;
drop function public.mission_teacher_get_plan_v1(uuid);
drop function public.mission_teacher_publish_plan_v1(uuid,integer,uuid);
create function public.mission_teacher_get_plan_v1(p_class_id uuid,p_week date default null) returns jsonb language sql security invoker set search_path='' as $$select mission_private.plan_week(p_class_id,p_week)$$;
create or replace function public.mission_teacher_save_plan_v1(p_class_id uuid,p_document jsonb,p_expected_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$begin if p_document is null then raise exception 'MISSION_INVALID_PLAN';end if;return mission_private.plan_week(p_class_id,(p_document->>'week')::date,p_document,p_expected_version);end$$;
create function public.mission_teacher_publish_plan_v1(p_class_id uuid,p_expected_version integer,p_request_id uuid,p_week date default null) returns jsonb language sql security invoker set search_path='' as $$select mission_private.publish_plan_week(p_class_id,p_expected_version,p_request_id,p_week)$$;
create function public.mission_teacher_get_draft_for_publish_v1(p_draft_id uuid) returns jsonb language sql stable security invoker set search_path='' as $$select mission_private.draft_for_publish(p_draft_id)$$;
create function public.mission_service_finalize_revision_v1(p_teacher_auth_id uuid,p_draft_id uuid,p_draft_sha256 text,p_base_sha256 text,p_source_json text,p_content_hash text) returns jsonb language sql security invoker set search_path='' as $$select mission_private.finalize_revision(p_teacher_auth_id,p_draft_id,p_draft_sha256,p_base_sha256,p_source_json,p_content_hash)$$;
revoke all on function mission_private.plan_week(uuid,date,jsonb,integer),mission_private.publish_plan_week(uuid,integer,uuid,date),mission_private.teacher_allowed_for(uuid,uuid),mission_private.draft_for_publish(uuid),mission_private.finalize_revision(uuid,uuid,text,text,text,text),public.mission_teacher_get_plan_v1(uuid,date),public.mission_teacher_publish_plan_v1(uuid,integer,uuid,date),public.mission_teacher_get_draft_for_publish_v1(uuid),public.mission_service_finalize_revision_v1(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function mission_private.plan_week(uuid,date,jsonb,integer),mission_private.publish_plan_week(uuid,integer,uuid,date),mission_private.draft_for_publish(uuid),public.mission_teacher_get_plan_v1(uuid,date),public.mission_teacher_publish_plan_v1(uuid,integer,uuid,date),public.mission_teacher_get_draft_for_publish_v1(uuid) to authenticated;
grant usage on schema mission_private to service_role;
grant execute on function mission_private.finalize_revision(uuid,uuid,text,text,text,text),public.mission_service_finalize_revision_v1(uuid,uuid,text,text,text,text) to service_role;
commit;
