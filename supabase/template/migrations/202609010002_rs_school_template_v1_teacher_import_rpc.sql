-- RS-SCHOOL-TEMPLATE V1 teacher import RPC.
-- Creates institutional teachers without creating auth.users or storing passwords.

CREATE OR REPLACE FUNCTION public.secretaria_create_teacher(
  p_school_id uuid,
  p_full_name text,
  p_status text DEFAULT 'active'::text,
  p_disciplina text DEFAULT NULL::text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_profile_id uuid;
  v_teacher_id uuid;
  v_membership_id uuid;
  v_full_name text := nullif(trim(p_full_name), '');
  v_status text := coalesce(nullif(trim(p_status), ''), 'active');
  v_disciplina text := nullif(trim(p_disciplina), '');
begin
  if v_full_name is null then
    raise exception 'Nome completo do professor e obrigatorio.' using errcode = '22023';
  end if;

  if v_status not in ('active', 'inactive', 'archived') then
    raise exception 'Status de professor incompativel com o schema.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.schools s where s.id = p_school_id and s.status = 'active'
  ) then
    raise exception 'Escola ativa nao encontrada.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(p_school_id) then
    raise exception 'Perfil institucional sem permissao para criar professor nesta escola.' using errcode = '42501';
  end if;

  select t.profile_id, t.id
    into v_profile_id, v_teacher_id
  from public.teachers t
  join public.profiles p on p.id = t.profile_id
  where t.school_id = p_school_id
    and lower(trim(p.display_name)) = lower(v_full_name)
    and t.status <> 'archived'
  order by case when t.status = 'active' then 0 else 1 end, t.created_at
  limit 1;

  if v_teacher_id is null then
    v_profile_id := gen_random_uuid();

    insert into public.profiles (id, display_name, platform_role, status)
    values (v_profile_id, v_full_name, 'professor', v_status);

    insert into public.teachers (school_id, profile_id, disciplina, status)
    values (p_school_id, v_profile_id, v_disciplina, v_status)
    returning id into v_teacher_id;
  else
    update public.profiles
       set display_name = v_full_name,
           platform_role = 'professor',
           status = v_status,
           updated_at = now()
     where id = v_profile_id;

    update public.teachers
       set disciplina = v_disciplina,
           status = v_status,
           updated_at = now()
     where id = v_teacher_id;
  end if;

  select id into v_membership_id
  from public.school_memberships
  where school_id = p_school_id
    and profile_id = v_profile_id
    and membership_role = 'professor'
  order by case when status = 'active' and ended_at is null then 0 else 1 end, created_at
  limit 1;

  if v_membership_id is null then
    insert into public.school_memberships (school_id, profile_id, membership_role, status, started_at)
    values (p_school_id, v_profile_id, 'professor', v_status, now())
    returning id into v_membership_id;
  else
    update public.school_memberships
       set status = v_status,
           ended_at = case when v_status = 'active' then null else ended_at end,
           updated_at = now()
     where id = v_membership_id;
  end if;

  return jsonb_build_object(
    'teacher_id', v_teacher_id,
    'profile_id', v_profile_id,
    'membership_id', v_membership_id,
    'school_id', p_school_id,
    'status', v_status,
    'created_by', auth.uid(),
    'created_at', now()
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.secretaria_create_teacher(uuid, text, text, text) TO authenticated;

