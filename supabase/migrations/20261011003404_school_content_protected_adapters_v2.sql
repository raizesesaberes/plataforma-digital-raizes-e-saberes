-- REVIEW ONLY. Existing private signing services retain their own authorization too.
begin;
create unique index category_delivery_binding_once on public.content_items ((metadata->'delivery_adapter'->>'kind'),(metadata->'delivery_adapter'->>'resource_id')) where metadata ? 'delivery_adapter';
create function public.content_category_legacy_resource_allowed(p_kind text,p_resource_id uuid) returns boolean
language plpgsql stable security definer set search_path='' set jit='off' as $$
declare ci public.content_items%rowtype;
begin
 if auth.uid() is null or p_kind not in('library_book','game','activity','discovery') or p_resource_id is null then return false;end if;
 select * into ci from public.content_items where metadata->'delivery_adapter'->>'kind'=p_kind and metadata->'delivery_adapter'->>'resource_id'=p_resource_id::text;
 if ci.id is null then return not school_category_private.has_dynamic_membership();end if;
 if ci.editorial_status<>'PUBLISHED' or ci.published_at is null or ci.published_at>now() then return false;end if;
 if not school_category_private.has_dynamic_membership() then return true;end if;
 return exists(select 1 from school_category_private.authorized_items('{}',ci.id));
exception when insufficient_privilege then return false;
end $$;
create or replace function public.content_get_category_item(p_content_item_id uuid,p_context jsonb default '{}')
returns jsonb language plpgsql stable security definer set search_path='' set jit='off' as $$
declare item record;ctx jsonb;question jsonb;binding jsonb;delivery text;
begin
 ctx:=school_category_private.actor_context(p_context);
 if not school_category_private.dynamic_school(p_context) then raise exception 'CATEGORY_NOT_CONFIGURED' using errcode='42501';end if;
 select * into item from school_category_private.authorized_items(p_context,p_content_item_id);
 if not found then raise exception 'CONTENT_ACCESS_DENIED' using errcode='42501';end if;
 if item.content_type='QUESTION' then
  select jsonb_build_object('id',q.id,'statement',q.statement,'command_text',q.command_text,'base_text',q.base_text,'question_type',q.question_type,'alternatives',(select coalesce(jsonb_agg(jsonb_build_object('label',a.label,'body',a.body) order by a.position),'[]') from public.question_alternatives a where a.question_id=q.id)) into question from public.question_items q where q.id=item.question_item_id;
  delivery:='INLINE_QUESTION';
 else
  select jsonb_build_object('kind',metadata->'delivery_adapter'->>'kind','resource_id',metadata->'delivery_adapter'->>'resource_id') into binding from public.content_items where id=p_content_item_id and metadata->'delivery_adapter'->>'kind' in('library_book','game','activity','discovery');
  delivery:=case when binding is not null then 'EXISTING_PROTECTED_ADAPTER' else 'PROTECTED_DELIVERY_REQUIRED' end;
 end if;
 return jsonb_build_object('status','PASS','item',to_jsonb(item),'question',question,'delivery_status',delivery,'adapter',binding);
end $$;
revoke all on function public.content_category_legacy_resource_allowed(text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.content_category_legacy_resource_allowed(text,uuid) to authenticated;
CREATE OR REPLACE FUNCTION school_category_private.legacy_student_can_read_library_book(p_book_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.books b
      JOIN public.current_student_library_enrollments() ce ON true
      WHERE b.id = p_book_id
        AND coalesce(b.ativo, false) = true
        AND (
          public.is_content_available_for_school(
            ce.school_id,
            'book',
            coalesce(nullif(btrim(b.legacy_id), ''), b.id::text)
          )
          OR public.is_content_available_for_school(
            ce.school_id,
            'book',
            b.id::text
          )
        )
        AND (
          b.ano_escolar IS NULL
          OR btrim(b.ano_escolar) = ''
          OR lower(btrim(b.ano_escolar)) = lower(btrim(coalesce(ce.class_school_year, ce.school_year, '')))
        )
    );
$function$
;
create or replace function public.student_can_read_library_book(p_book_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;
begin
 if not public.content_category_legacy_resource_allowed('library_book',p_book_id) then return false;end if;
 if not school_category_private.has_dynamic_membership() then return school_category_private.legacy_student_can_read_library_book(p_book_id);end if;
 -- For adopted schools, category grants replace obsolete per-item availability while
 -- preserving the reader's student identity and native resource publication state.
 ctx:=school_category_private.actor_context('{}');
 if (ctx->>'teacher')::boolean or (ctx->>'institutional')::boolean then return false;end if;
 return exists(select 1 from public.books where id=p_book_id and coalesce(ativo,false));
exception when insufficient_privilege then return false;
end $$;
revoke all on function public.student_can_read_library_book(uuid) from public,anon;
grant execute on function public.student_can_read_library_book(uuid) to authenticated;
CREATE OR REPLACE FUNCTION school_category_private.legacy_student_can_read_game(p_game_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.student_games g
      JOIN public.current_early_childhood_student_context() ctx ON true
      WHERE g.id = p_game_id
        AND g.active = true
        AND g.status = 'published'
        AND public.is_content_available_for_school(ctx.school_id, 'game', g.legacy_id)
        AND (
          g.segment IS NULL
          OR g.segment = 'educacao_infantil'
        )
        AND (
          g.age_group IS NULL
          OR ctx.age_group IS NULL
          OR lower(g.age_group) = lower(ctx.age_group)
          OR lower(g.age_group) = lower(replace(ctx.age_group, ' ', ''))
        )
    );
$function$
;
create or replace function public.student_can_read_game(p_game_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;
begin
 if not public.content_category_legacy_resource_allowed('game',p_game_id) then return false;end if;
 if not school_category_private.has_dynamic_membership() then return school_category_private.legacy_student_can_read_game(p_game_id);end if;
 -- For adopted schools, category grants replace obsolete per-item availability while
 -- preserving the reader's student identity and native resource publication state.
 ctx:=school_category_private.actor_context('{}');
 if (ctx->>'teacher')::boolean or (ctx->>'institutional')::boolean then return false;end if;
 return exists(select 1 from public.student_games where id=p_game_id and active and status='published');
exception when insufficient_privilege then return false;
end $$;
revoke all on function public.student_can_read_game(uuid) from public,anon;
grant execute on function public.student_can_read_game(uuid) to authenticated;
CREATE OR REPLACE FUNCTION school_category_private.legacy_student_can_read_activity(p_activity_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.student_activities a
    JOIN public.current_early_childhood_student_context() ctx ON true
    WHERE a.id = p_activity_id
      AND a.active = true
      AND a.status = 'published'
      AND public.is_content_available_for_school(ctx.school_id, 'activity', a.legacy_id)
      AND (a.segment IS NULL OR a.segment = 'educacao_infantil')
      AND (a.age_group IS NULL OR ctx.age_group IS NULL OR lower(a.age_group) = lower(ctx.age_group) OR lower(a.age_group) = lower(replace(ctx.age_group, ' ', '')))
  );
$function$
;
create or replace function public.student_can_read_activity(p_activity_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;
begin
 if not public.content_category_legacy_resource_allowed('activity',p_activity_id) then return false;end if;
 if not school_category_private.has_dynamic_membership() then return school_category_private.legacy_student_can_read_activity(p_activity_id);end if;
 -- For adopted schools, category grants replace obsolete per-item availability while
 -- preserving the reader's student identity and native resource publication state.
 ctx:=school_category_private.actor_context('{}');
 if (ctx->>'teacher')::boolean or (ctx->>'institutional')::boolean then return false;end if;
 return exists(select 1 from public.student_activities where id=p_activity_id and active and status='published');
exception when insufficient_privilege then return false;
end $$;
revoke all on function public.student_can_read_activity(uuid) from public,anon;
grant execute on function public.student_can_read_activity(uuid) to authenticated;
CREATE OR REPLACE FUNCTION school_category_private.legacy_student_can_read_discovery(p_discovery_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.student_discoveries d
    JOIN public.current_early_childhood_student_context() ctx ON true
    WHERE d.id = p_discovery_id
      AND d.active = true
      AND d.status = 'published'
      AND public.is_content_available_for_school(ctx.school_id, 'experience', d.legacy_id)
      AND (d.segment IS NULL OR d.segment = 'educacao_infantil')
      AND (d.age_group IS NULL OR ctx.age_group IS NULL OR lower(d.age_group) = lower(ctx.age_group) OR lower(d.age_group) = lower(replace(ctx.age_group, ' ', '')))
  );
$function$
;
create or replace function public.student_can_read_discovery(p_discovery_id uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare ctx jsonb;
begin
 if not public.content_category_legacy_resource_allowed('discovery',p_discovery_id) then return false;end if;
 if not school_category_private.has_dynamic_membership() then return school_category_private.legacy_student_can_read_discovery(p_discovery_id);end if;
 -- For adopted schools, category grants replace obsolete per-item availability while
 -- preserving the reader's student identity and native resource publication state.
 ctx:=school_category_private.actor_context('{}');
 if (ctx->>'teacher')::boolean or (ctx->>'institutional')::boolean then return false;end if;
 return exists(select 1 from public.student_discoveries where id=p_discovery_id and active and status='published');
exception when insufficient_privilege then return false;
end $$;
revoke all on function public.student_can_read_discovery(uuid) from public,anon;
grant execute on function public.student_can_read_discovery(uuid) to authenticated;
revoke all on all functions in schema school_category_private from public,anon,authenticated,service_role;
commit;
