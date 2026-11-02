-- Additive integration. No editions are inserted/published by this migration.
create schema if not exists library_edition_private;
revoke all on schema library_edition_private from public,anon,authenticated;
create table library_edition_private.editions (
 book_id uuid primary key references public.books(id),
 audience text not null check(audience in('student','teacher')),
 source_id text not null unique,
 source_sha256 text not null check(source_sha256 ~ '^[a-f0-9]{64}$'),
 page_count integer not null check(page_count between 1 and 999),
 published boolean not null default false
);
alter table library_edition_private.editions enable row level security;
revoke all on library_edition_private.editions from public,anon,authenticated;

create function public.library_authorize_edition(p_book_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare edition library_edition_private.editions%rowtype;ctx jsonb;
begin
 if auth.uid() is null then return false;end if;
 select * into edition from library_edition_private.editions where book_id=p_book_id and published;
 if not found then return false;end if;
 if not exists(select 1 from public.books where id=p_book_id and ativo) then return false;end if;
 -- This established context resolves active school, enrollment/class memberships
 -- and canonical grades from server records, not client-provided role claims.
 ctx:=school_category_private.actor_context('{}');
 if coalesce((ctx->>'institutional')::boolean,true) then return false;end if;
 if jsonb_array_length(coalesce(ctx->'grade_ids','[]'))=0 then return false;end if;
 if edition.audience='teacher' and not coalesce((ctx->>'teacher')::boolean,false) then return false;end if;
 -- New editions require a published canonical category binding, even on legacy
 -- schools; absence of a binding must never fall through to a permissive gate.
 if not exists(select 1 from public.content_items ci
   where ci.metadata->'delivery_adapter'->>'kind'='library_book'
     and ci.metadata->'delivery_adapter'->>'resource_id'=p_book_id::text
     and ci.editorial_status='PUBLISHED' and ci.published_at<=now()) then return false;end if;
 if not school_category_private.has_dynamic_membership() then return false;end if;
 return public.content_category_legacy_resource_allowed('library_book',p_book_id);
exception when insufficient_privilege then return false;
end $$;
revoke all on function public.library_authorize_edition(uuid) from public,anon,authenticated;
grant execute on function public.library_authorize_edition(uuid) to authenticated;

create function public.library_list_editions()
returns table(book_id uuid,title text,audience text,page_count integer)
language sql stable security definer set search_path='' as $$
 select e.book_id,b.titulo::text,e.audience,e.page_count
 from library_edition_private.editions e join public.books b on b.id=e.book_id
 where public.library_authorize_edition(e.book_id) order by b.titulo;
$$;
revoke all on function public.library_list_editions() from public,anon,authenticated;
grant execute on function public.library_list_editions() to authenticated;

create function public.library_edition_manifest(p_book_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare n integer;
begin
 if not public.library_authorize_edition(p_book_id) then raise exception 'EDITION_ACCESS_DENIED' using errcode='42501';end if;
 select page_count into n from library_edition_private.editions where book_id=p_book_id;
 return jsonb_build_object('pageCount',n,'firstPage',1,'lastPage',n,'hasPages',true,'hasThumbs',true);
end $$;
revoke all on function public.library_edition_manifest(uuid) from public,anon,authenticated;
grant execute on function public.library_edition_manifest(uuid) to authenticated;
