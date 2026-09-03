-- RS-SCHOOL-TEMPLATE V1
-- Communication lifecycle RPCs for Secretaria.
-- Keeps the existing status model:
-- draft = Rascunho, published = Publicado, archived = Retirado.

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

  if not public.secretaria_can_manage_school(v_comm.school_id) then
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
  set status = v_to_status
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
begin
  if v_author is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_comm
  from public.communications
  where id = p_communication_id;

  if v_comm.id is null then
    raise exception 'Comunicado nao encontrado.' using errcode = '22023';
  end if;

  if not public.secretaria_can_manage_school(v_comm.school_id) then
    raise exception 'Usuario sem permissao para excluir este comunicado.' using errcode = '42501';
  end if;

  delete from public.communications
  where id = v_comm.id;

  return jsonb_build_object(
    'communication_id', v_comm.id,
    'deleted', true
  );
end;
$$;

REVOKE ALL ON FUNCTION public.secretaria_set_communication_status(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_delete_communication(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.secretaria_set_communication_status(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.secretaria_delete_communication(uuid) FROM anon;

GRANT EXECUTE ON FUNCTION public.secretaria_set_communication_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secretaria_delete_communication(uuid) TO authenticated;
