-- RS-SCHOOL-TEMPLATE V1 teacher institutional identity.
-- Teachers are institutional records first; profile_id is only for later digital access.

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_institutional_identity_check;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_institutional_identity_check
  CHECK (
    profile_id IS NOT NULL
    OR nullif(btrim(full_name), '') IS NOT NULL
  ) NOT VALID;

CREATE INDEX IF NOT EXISTS teachers_school_full_name_idx
  ON public.teachers (school_id, lower(btrim(full_name)))
  WHERE full_name IS NOT NULL;

DROP FUNCTION IF EXISTS public.secretaria_list_teachers();

CREATE FUNCTION public.secretaria_list_teachers()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  school_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  disciplina character varying,
  status text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
  select
    t.id,
    t.user_id,
    t.school_id,
    t.profile_id,
    coalesce(nullif(btrim(t.full_name), ''), p.display_name) as full_name,
    t.email,
    t.disciplina,
    t.status
  from public.teachers t
  left join public.profiles p on p.id = t.profile_id
  where public.secretaria_can_manage_school(t.school_id)
  order by coalesce(nullif(btrim(t.full_name), ''), p.display_name, t.disciplina, t.id::text) asc;
$$;

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
  v_teacher_id uuid;
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

  select t.id
    into v_teacher_id
  from public.teachers t
  left join public.profiles p on p.id = t.profile_id
  where t.school_id = p_school_id
    and lower(coalesce(nullif(btrim(t.full_name), ''), btrim(p.display_name))) = lower(v_full_name)
    and t.status <> 'archived'
  order by case when t.status = 'active' then 0 else 1 end, t.created_at
  limit 1;

  if v_teacher_id is null then
    insert into public.teachers (
      school_id,
      full_name,
      email,
      profile_id,
      disciplina,
      status
    )
    values (
      p_school_id,
      v_full_name,
      null,
      null,
      v_disciplina,
      v_status
    )
    returning id into v_teacher_id;
  else
    update public.teachers
       set full_name = v_full_name,
           disciplina = v_disciplina,
           status = v_status,
           updated_at = now()
     where id = v_teacher_id;
  end if;

  return jsonb_build_object(
    'teacher_id', v_teacher_id,
    'profile_id', null,
    'membership_id', null,
    'school_id', p_school_id,
    'status', v_status,
    'created_by', auth.uid(),
    'created_at', now()
  );
end;
$$;

GRANT EXECUTE ON FUNCTION public.secretaria_list_teachers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.secretaria_create_teacher(uuid, text, text, text) TO authenticated;
