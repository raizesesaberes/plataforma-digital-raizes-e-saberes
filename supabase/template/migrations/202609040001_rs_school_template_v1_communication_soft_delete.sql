-- RS-SCHOOL-TEMPLATE V1
-- Canonical soft-delete lifecycle for communications.
-- "Excluir" in the UI marks a communication as deleted without physical DELETE.

ALTER TABLE public.communications
  ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

ALTER TABLE public.communications
  DROP CONSTRAINT IF EXISTS communications_status_check;

ALTER TABLE public.communications
  ADD CONSTRAINT communications_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'deleted'::text]));

ALTER TABLE public.communication_events
  DROP CONSTRAINT IF EXISTS communication_events_status_check;

ALTER TABLE public.communication_events
  ADD CONSTRAINT communication_events_status_check
  CHECK (
    ((from_status IS NULL) OR (from_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'deleted'::text])))
    AND
    ((to_status IS NULL) OR (to_status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'deleted'::text])))
  );

ALTER TABLE public.communication_events
  DROP CONSTRAINT IF EXISTS communication_events_type_check;

ALTER TABLE public.communication_events
  ADD CONSTRAINT communication_events_type_check
  CHECK (event_type = ANY (ARRAY['created'::text, 'published'::text, 'edited'::text, 'archived'::text, 'deleted'::text]));

CREATE OR REPLACE FUNCTION public.communication_can_read(p_communication public.communications) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public', 'pg_temp'
    AS $$
  select
    case
      when p_communication.status = 'deleted' then public.secretaria_can_manage_school(p_communication.school_id)
      else
        p_communication.author_profile_id = auth.uid()
        or public.secretaria_can_manage_school(p_communication.school_id)
        or (
          p_communication.status = 'published'
          and (p_communication.expires_at is null or p_communication.expires_at > now())
          and (
            public.communication_teacher_can_target(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
            or public.communication_current_student_can_read(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
            or public.communication_guardian_can_read(p_communication.school_id, p_communication.class_id, p_communication.student_id, p_communication.audience_type)
          )
        )
    end;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_set_communication_status(
  p_communication_id uuid,
  p_to_status text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_author uuid := auth.uid();
  v_to_status text := lower(nullif(trim(p_to_status), ''));
  v_comm public.communications%rowtype;
  v_from_status text;
  v_event_type text;
begin
  if v_author is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_to_status not in ('published', 'archived') then
    raise exception 'Status de comunicacao invalido.' using errcode = '22023';
  end if;

  select * into v_comm
  from public.communications
  where id = p_communication_id
  for update;

  if v_comm.id is null then
    raise exception 'Comunicado nao encontrado.' using errcode = '22023';
  end if;

  if v_comm.status = 'deleted' then
    raise exception 'Comunicado excluido nao pode ser republicado.' using errcode = '42501';
  end if;

  if not (
    public.secretaria_can_manage_school(v_comm.school_id)
    or (
      v_comm.author_profile_id = v_author
      and public.communication_teacher_can_target(v_comm.school_id, v_comm.class_id, v_comm.student_id, v_comm.audience_type)
    )
  ) then
    raise exception 'Usuario sem permissao para alterar este comunicado.' using errcode = '42501';
  end if;

  if v_comm.status = v_to_status then
    return jsonb_build_object(
      'communication_id', v_comm.id,
      'from_status', v_comm.status,
      'to_status', v_to_status,
      'changed', false
    );
  end if;

  if v_comm.status = 'published' and v_to_status <> 'archived' then
    raise exception 'Comunicado publicado permite somente retirada da publicacao.' using errcode = '22023';
  end if;

  if v_comm.status in ('draft', 'archived') and v_to_status <> 'published' then
    raise exception 'Rascunho ou comunicado retirado permite somente publicacao.' using errcode = '22023';
  end if;

  v_from_status := v_comm.status;

  update public.communications
  set status = v_to_status,
      deleted_at = null,
      deleted_by = null
  where id = v_comm.id
  returning * into v_comm;

  v_event_type := case
    when v_to_status = 'published' then 'published'
    when v_to_status = 'archived' then 'archived'
    else 'edited'
  end;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, v_event_type, v_from_status, v_to_status, v_author);

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'from_status', v_from_status,
    'to_status', v_to_status,
    'changed', true
  );
end;
$$;

CREATE OR REPLACE FUNCTION public.secretaria_delete_communication(
  p_communication_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
declare
  v_author uuid := auth.uid();
  v_comm public.communications%rowtype;
  v_from_status text;
begin
  if v_author is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_comm
  from public.communications
  where id = p_communication_id
  for update;

  if v_comm.id is null then
    raise exception 'Comunicado nao encontrado.' using errcode = '22023';
  end if;

  if v_comm.status = 'deleted' then
    return jsonb_build_object(
      'communication_id', v_comm.id,
      'deleted', true,
      'changed', false
    );
  end if;

  if not (
    public.secretaria_can_manage_school(v_comm.school_id)
    or (
      v_comm.author_profile_id = v_author
      and public.communication_teacher_can_target(v_comm.school_id, v_comm.class_id, v_comm.student_id, v_comm.audience_type)
    )
  ) then
    raise exception 'Usuario sem permissao para excluir este comunicado.' using errcode = '42501';
  end if;

  v_from_status := v_comm.status;

  update public.communications
  set status = 'deleted',
      deleted_at = now(),
      deleted_by = v_author
  where id = v_comm.id
  returning * into v_comm;

  insert into public.communication_events (communication_id, event_type, from_status, to_status, performed_by)
  values (v_comm.id, 'deleted', v_from_status, 'deleted', v_author);

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'deleted', true,
    'changed', true
  );
end;
$$;

REVOKE ALL ON FUNCTION public.secretaria_set_communication_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_delete_communication(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_set_communication_status(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.secretaria_delete_communication(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.secretaria_set_communication_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secretaria_delete_communication(uuid) TO authenticated;
