-- Complement to immutable V2 review. Apply AFTER V2, catalog seed, source bindings.
-- Does NOT enable release or grant any tenant/product entitlement.
begin;
do $preflight$ begin
 if to_regprocedure('school_category_private.actor_context(jsonb)') is null or to_regprocedure('school_category_private.authorized_items_for_context(jsonb,jsonb,uuid,uuid)') is null or to_regprocedure('school_category_private.taxonomy()') is null then raise exception 'MISSION_CANONICAL_RESOLVER_REQUIRED';end if;
end $preflight$;
create or replace function mission_private.licensed(c_id uuid,r_id uuid,p_actor uuid default auth.uid()) returns boolean
language plpgsql volatile security definer set search_path='' as $$
declare r mission_private.revisions;b mission_private.revisions;ci public.content_items;ctx jsonb;grades uuid[];sid uuid;
begin
 if p_actor is null then return false;end if;
 select * into r from mission_private.revisions where id=r_id and published;
 if not found then return false;end if;
 select * into b from mission_private.revisions where id=coalesce(r.root_source_revision_id,r.id) and published and root_source_revision_id is null and owner_auth_id is null;
 if not found then return false;end if;
 select i.* into ci from mission_private.source_bindings sb join public.content_items i on i.id=sb.source_content_item_id where sb.root_revision_id=b.id;
 if ci.id is null or ci.owner_scope<>'GLOBAL_RAIZES' or ci.content_type::text<>(case when b.engine='colorir' then 'PRINTABLE' else 'BOOK' end) then return false;end if;
 -- Source author ownership is checked separately by author/teacher entrypoints.
 -- Student access is through the assignment, not source author identity.
 select school_id into sid from public.classes where id=c_id and status='active';
 if sid is null then return false;end if;
 if p_actor=auth.uid() then
   -- Canonical actor validation includes live teacher/student school and class context.
   ctx:=school_category_private.actor_context(jsonb_build_object('school_id',sid,'class_id',c_id));
 else
   -- Only the service finalizer passes an explicit actor. No JWT mutation/impersonation.
   if not mission_private.teacher_allowed_for(c_id,p_actor) then return false;end if;
   select array_agg(distinct tx.grade_id) into grades from public.classes c
   join public.content_grade_aliases a on a.alias_code=any(array[public.rs_content_normalize_code(c.school_year),public.rs_content_normalize_code(c.ano_escolar::text),public.rs_content_normalize_code(c.age_group)])
   join school_category_private.taxonomy() tx on tx.grade_id=a.grade_id and not tx.institutional where c.id=c_id;
   if coalesce(cardinality(grades),0)<>1 then return false;end if;
   ctx:=jsonb_build_object('school_id',sid,'class_id',c_id,'grade_ids',to_jsonb(grades),'institutional',false,'teacher',true);
 end if;
 return exists(select 1 from school_category_private.authorized_items_for_context(jsonb_build_object('school_id',sid,'class_id',c_id,'content_type',ci.content_type),ctx,ci.id));
 exception when insufficient_privilege then return false;
end$$;
revoke all on function mission_private.licensed(uuid,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function mission_private.require_license(c_id uuid,r_id uuid,p_actor uuid default auth.uid()) returns void
language plpgsql volatile security definer set search_path='' as $$begin
 if not mission_private.licensed(c_id,r_id,p_actor) then raise exception 'MISSION_LICENSE_REQUIRED' using errcode='42501';end if;
end$$;
revoke all on function mission_private.require_license(uuid,uuid,uuid) from public,anon,authenticated,service_role;

create or replace function mission_private.check_selection(c_id uuid,r_id uuid,st timestamptz,en timestamptz,tz text,age text) returns void language plpgsql volatile security definer set search_path='' as $$
declare r mission_private.revisions;begin
 if not mission_private.teacher_allowed(c_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into r from mission_private.revisions where id=r_id and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 perform mission_private.require_license(c_id,r_id);
 if r.grade is null or r.grade is distinct from mission_private.class_grade(c_id) then raise exception 'MISSION_GRADE_MISMATCH';end if;
 if st is null or not isfinite(st) or (en is not null and(not isfinite(en) or en<=st)) or (r.grade='infantil' and en is not null) or (r.grade<>'infantil' and en is null) then raise exception 'MISSION_INVALID_INTERVAL';end if;
 if tz is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=tz) then raise exception 'MISSION_INVALID_TIMEZONE';end if;
 if (r.engine='colorir' and(age is null or not age=any(r.age_ranges))) or(r.engine<>'colorir' and age is not null) then raise exception 'MISSION_INVALID_AGE_RANGE';end if;end$$;

create or replace function mission_private.check_plan_selection(c_id uuid,i jsonb) returns void language plpgsql volatile security definer set search_path='' as $$
declare r mission_private.revisions;st timestamptz;en timestamptz;begin
 if not mission_private.teacher_allowed(c_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into r from mission_private.revisions where id=(i->>'revision_id')::uuid and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 perform mission_private.require_license(c_id,r.id);
 if r.grade is null or r.grade is distinct from mission_private.class_grade(c_id) then raise exception 'MISSION_GRADE_MISMATCH';end if;
 st:=nullif(i->>'starts_at','')::timestamptz;en:=nullif(i->>'ends_at','')::timestamptz;
 if(st is not null and not isfinite(st)) or(en is not null and(not isfinite(en) or(st is not null and en<=st))) or(r.grade='infantil' and en is not null) then raise exception 'MISSION_INVALID_INTERVAL';end if;
 if nullif(i->>'timezone','') is not null and not exists(select 1 from pg_catalog.pg_timezone_names where name=i->>'timezone') then raise exception 'MISSION_INVALID_TIMEZONE';end if;
 if nullif(i->>'ageRange','') is not null and(r.engine<>'colorir' or not(i->>'ageRange')=any(r.age_ranges)) then raise exception 'MISSION_INVALID_AGE_RANGE';end if;
 end$$;

create or replace function mission_private.teacher_catalog(p_class_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 return coalesce((select jsonb_agg(mission_private.revision_json(r) order by activity_key,revision) from mission_private.revisions r where published and(owner_auth_id is null or owner_auth_id=auth.uid()) and grade=mission_private.class_grade(p_class_id) and mission_private.licensed(p_class_id,r.id)),'[]');end$$;

create or replace function mission_private.student_list(p_assignment_id uuid default null) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if not mission_private.release_enabled() then return '[]'::jsonb;end if;
 return coalesce((select jsonb_agg(mission_private.assignment_json(a) order by a.assigned_at,a.id) from mission_private.assignments a where(p_assignment_id is null or a.id=p_assignment_id)
 and a.cancelled_at is null and a.starts_at<=now() and(a.ends_at is null or a.ends_at>now()) and mission_private.student_allowed(a.class_id,a.school_id) and mission_private.licensed(a.class_id,a.revision_id)),'[]');end$$;

create or replace function mission_private.teacher_list(p_class_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 return coalesce((select jsonb_agg(mission_private.assignment_json(a) order by a.assigned_at,a.id) from mission_private.assignments a where class_id=p_class_id and mission_private.licensed(p_class_id,a.revision_id)),'[]');end$$;

create or replace function mission_private.save_draft(p_class_id uuid,p_base_revision_id uuid,p_snapshot_json text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare r mission_private.revisions;d mission_private.drafts;payload jsonb;begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if p_request_id is null or p_snapshot_json is null or octet_length(p_snapshot_json)>2097152 then raise exception 'MISSION_INVALID_DRAFT';end if;
 perform mission_private.require_license(p_class_id,p_base_revision_id);
 payload:=p_snapshot_json::jsonb;select * into r from mission_private.revisions where id=p_base_revision_id and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found or r.grade is distinct from mission_private.class_grade(p_class_id) then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 if jsonb_typeof(payload)<>'object' or payload->>'id' is distinct from r.snapshot->>'id' or payload->>'template' is distinct from r.snapshot->>'template' or payload->>'type' is distinct from r.snapshot->>'type' or payload->>'grade' is distinct from r.snapshot->>'grade' then raise exception 'MISSION_DRAFT_IDENTITY_CHANGED';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 perform mission_private.require_license(p_class_id,p_base_revision_id);
 select * into d from mission_private.drafts where teacher_auth_id=auth.uid() and request_id=p_request_id;
 if found then
 if d.class_id is distinct from p_class_id or d.base_revision_id is distinct from p_base_revision_id or d.source_json is distinct from p_snapshot_json then raise exception 'MISSION_IDEMPOTENCY_CONFLICT';end if;
 else insert into mission_private.drafts(class_id,base_revision_id,teacher_auth_id,request_id,source_json) values(p_class_id,p_base_revision_id,auth.uid(),p_request_id,p_snapshot_json) returning * into d;end if;
 return jsonb_build_object('id',d.id,'base_revision_id',d.base_revision_id,'snapshot_json',d.source_json,'source_sha256',encode(sha256(convert_to(d.source_json,'UTF8')),'hex'),'created_at',d.created_at,'review_status','pending_validation','assignable',false);end$$;

create or replace function mission_private.list_drafts(p_class_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$begin
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'base_revision_id',d.base_revision_id,'snapshot_json',d.source_json,'source_sha256',encode(sha256(convert_to(d.source_json,'UTF8')),'hex'),'created_at',d.created_at,'review_status',case when r.id is null then 'pending_validation' else 'teacher_authored' end,'assignable',r.id is not null,'published_revision_id',r.id) order by d.created_at,d.id) from mission_private.drafts d left join mission_private.revisions r on r.author_draft_id=d.id where d.class_id=p_class_id and d.teacher_auth_id=auth.uid() and mission_private.licensed(p_class_id,d.base_revision_id)),'[]');end$$;

create or replace function mission_private.draft_for_publish(p_draft_id uuid) returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare d mission_private.drafts;b mission_private.revisions;begin
 select * into d from mission_private.drafts where id=p_draft_id and teacher_auth_id=auth.uid();
 if not found or not mission_private.teacher_allowed(d.class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 select * into b from mission_private.revisions where id=d.base_revision_id and published and(owner_auth_id is null or owner_auth_id=auth.uid());
 if not found or b.grade is distinct from mission_private.class_grade(d.class_id) then raise exception 'MISSION_REVISION_UNAVAILABLE';end if;
 perform mission_private.require_license(d.class_id,b.id);
 return jsonb_build_object('id',d.id,'class_id',d.class_id,'teacher_auth_id',d.teacher_auth_id,'snapshot_json',d.source_json,'source_sha256',encode(sha256(convert_to(d.source_json,'UTF8')),'hex'),'base_revision_id',b.id,'base_snapshot_json',b.source_json,'base_source_sha256',b.source_sha256,'engine',b.engine);end$$;

create or replace function mission_private.finalize_revision(p_teacher_auth_id uuid,p_draft_id uuid,p_draft_sha256 text,p_base_sha256 text,p_source_json text,p_content_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
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
 perform mission_private.require_license(d.class_id,b.id,p_teacher_auth_id);
 select * into r from mission_private.revisions where author_draft_id=p_draft_id;
 if found then
 if r.source_json is distinct from p_source_json or r.content_hash is distinct from p_content_hash then raise exception 'MISSION_FINALIZATION_CONFLICT';end if;
 else insert into mission_private.revisions(activity_key,revision,title,engine,grade,age_ranges,content_hash,source_json,source_sha256,published,owner_auth_id,author_draft_id,root_source_revision_id)
 values(b.activity_key,p_teacher_auth_id::text||':'||d.id::text,coalesce(p_source_json::jsonb->>'title',b.title),b.engine,b.grade,b.age_ranges,p_content_hash,p_source_json,h,true,p_teacher_auth_id,d.id,coalesce(b.root_source_revision_id,b.id)) returning * into r;end if;
 return mission_private.revision_json(r);end$$;

create or replace function mission_private.artwork(p_assignment_id uuid,p_document jsonb default null,p_expected_version integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a mission_private.assignments;r mission_private.artworks;begin
 select * into a from mission_private.assignments where id=p_assignment_id for share;
 if not found or not mission_private.release_enabled() or auth.uid() is null or not mission_private.student_allowed(a.class_id,a.school_id) or a.cancelled_at is not null or a.starts_at>clock_timestamp() or(a.ends_at is not null and a.ends_at<=clock_timestamp()) or not exists(select 1 from mission_private.revisions where id=a.revision_id and engine='colorir') then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||a.revision_id::text,0));
 if not mission_private.release_enabled() or not mission_private.student_allowed(a.class_id,a.school_id) or a.starts_at>clock_timestamp() or(a.ends_at is not null and a.ends_at<=clock_timestamp()) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 perform mission_private.require_license(a.class_id,a.revision_id);
 select * into r from mission_private.artworks where user_id=auth.uid() and revision_id=a.revision_id;
 if p_document is not null then
 if not mission_private.validate_artwork(p_document) or p_expected_version is null or p_expected_version<0 then raise exception 'MISSION_INVALID_ARTWORK';end if;
 if coalesce(r.version,0)<>p_expected_version then raise exception 'MISSION_ARTWORK_VERSION_CONFLICT';end if;
 insert into mission_private.artworks(user_id,revision_id,document,version) values(auth.uid(),a.revision_id,p_document,1) on conflict(user_id,revision_id) do update set document=excluded.document,version=mission_private.artworks.version+1,updated_at=clock_timestamp() returning * into r;end if;
 return jsonb_build_object('document',r.document,'version',coalesce(r.version,0),'updated_at',r.updated_at);end$$;

create or replace function mission_private.teacher_assign(p_class_id uuid,p_revision_id uuid,p_starts_at timestamptz,p_ends_at timestamptz,p_timezone text,p_request_id uuid,p_age_range text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare a mission_private.assignments;sid uuid;begin
 perform mission_private.check_selection(p_class_id,p_revision_id,p_starts_at,p_ends_at,p_timezone,p_age_range);
 if not mission_private.release_enabled() then raise exception 'MISSION_INSTITUTIONAL_RELEASE_BLOCKED';end if;
 if p_request_id is null then raise exception 'MISSION_INVALID_INPUT';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 if not mission_private.teacher_allowed(p_class_id) then raise exception 'MISSION_FORBIDDEN' using errcode='42501';end if;
 if not mission_private.release_enabled() then raise exception 'MISSION_INSTITUTIONAL_RELEASE_BLOCKED';end if;
 perform mission_private.require_license(p_class_id,p_revision_id);
 select * into a from mission_private.assignments where teacher_auth_id=auth.uid() and request_id=p_request_id;
 if found then
 if a.class_id is distinct from p_class_id or a.revision_id is distinct from p_revision_id or a.starts_at is distinct from p_starts_at or a.ends_at is distinct from p_ends_at or a.timezone is distinct from p_timezone or a.age_range is distinct from p_age_range then raise exception 'MISSION_IDEMPOTENCY_CONFLICT';end if;
 return mission_private.assignment_json(a);end if;
 select school_id into sid from public.classes where id=p_class_id for share;
 insert into mission_private.assignments(class_id,school_id,revision_id,teacher_auth_id,request_id,starts_at,ends_at,timezone,age_range)
 values(p_class_id,sid,p_revision_id,auth.uid(),p_request_id,p_starts_at,p_ends_at,p_timezone,p_age_range) returning * into a;return mission_private.assignment_json(a);end$$;

commit;
