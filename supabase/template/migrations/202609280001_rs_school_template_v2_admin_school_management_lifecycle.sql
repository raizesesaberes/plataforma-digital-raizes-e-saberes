-- HOTFIX VISTORIA — Admin school management lifecycle.
-- Adds server-side lifecycle commands for Admin > Escolas without destructive
-- cascades or a second school-management engine.

alter table public.admin_school_deployment_events
  drop constraint if exists admin_school_deployment_events_action_check;

alter table public.admin_school_deployment_events
  add constraint admin_school_deployment_events_action_check
  check (action = any (array[
    'school_created'::text,
    'duplicate_blocked'::text,
    'creation_failed'::text,
    'school_import_validated'::text,
    'school_import_confirmed'::text,
    'school_import_blocked'::text,
    'school_activation_validated'::text,
    'school_activated'::text,
    'school_activation_blocked'::text,
    'school_updated'::text,
    'school_validated'::text,
    'school_deactivated'::text,
    'school_reactivated'::text,
    'school_delete_attempt'::text,
    'school_delete_blocked'::text,
    'school_deleted'::text
  ]));

create or replace function public.admin_manage_school_lifecycle(
  p_school_id uuid,
  p_action text,
  p_confirmation_code text default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_admin_user_id uuid := auth.uid();
  v_admin_role text;
  v_school public.schools%rowtype;
  v_installation public.rs_school_installations%rowtype;
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_school_code text;
  v_dependencies jsonb := '{}'::jsonb;
  v_dependency_total integer := 0;
  v_count integer := 0;
  v_result jsonb;
begin
  if v_admin_user_id is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select p.platform_role
    into v_admin_role
    from public.profiles p
   where p.id = v_admin_user_id
     and p.status = 'active';

  if coalesce(v_admin_role, '') not in ('admin', 'admin_ti', 'administrador', 'administrador_nacional') then
    raise exception 'Perfil sem permissao administrativa para ciclo de vida da escola.' using errcode = '42501';
  end if;

  select *
    into v_school
    from public.schools s
   where s.id = p_school_id
   for update;

  if v_school.id is null then
    raise exception 'Escola nao encontrada.' using errcode = '22023';
  end if;

  select *
    into v_installation
    from public.rs_school_installations i
   where i.school_id = p_school_id
   for update;

  v_school_code := coalesce(v_installation.school_code, v_school.codigo_inep, v_school.nome);

  if v_action in ('deactivate', 'desativar') then
    update public.schools
       set status = 'inactive',
           updated_at = now()
     where id = p_school_id;

    update public.rs_school_installations
       set current_stage = 'arquivada',
           updated_at = now()
     where school_id = p_school_id;

    insert into public.admin_school_deployment_events (
      admin_user_id, school_id, school_code, action, stage, result, reason
    ) values (
      v_admin_user_id,
      p_school_id,
      v_school_code,
      'school_deactivated',
      'arquivada',
      'created',
      jsonb_build_object('previous_status', v_school.status, 'preserve_history', true)::text
    );

    return jsonb_build_object(
      'ok', true,
      'action', 'deactivate',
      'school_id', p_school_id,
      'status', 'inactive',
      'stage', 'arquivada'
    );
  end if;

  if v_action in ('reactivate', 'reativar') then
    update public.schools
       set status = 'active',
           updated_at = now()
     where id = p_school_id;

    update public.rs_school_installations
       set current_stage = case
             when validation_status = 'passed' then 'ativa'
             else coalesce(nullif(current_stage, 'arquivada'), 'em_configuracao')
           end,
           updated_at = now()
     where school_id = p_school_id;

    insert into public.admin_school_deployment_events (
      admin_user_id, school_id, school_code, action, stage, result, reason
    ) values (
      v_admin_user_id,
      p_school_id,
      v_school_code,
      'school_reactivated',
      case when coalesce(v_installation.validation_status, '') = 'passed' then 'ativa' else 'em_configuracao' end,
      'created',
      jsonb_build_object('previous_status', v_school.status)::text
    );

    return jsonb_build_object(
      'ok', true,
      'action', 'reactivate',
      'school_id', p_school_id,
      'status', 'active'
    );
  end if;

  if v_action not in ('delete', 'excluir') then
    raise exception 'Ação de ciclo de vida não reconhecida.' using errcode = '22023';
  end if;

  select count(*) into v_count from public.classes where school_id = p_school_id and coalesce(status, 'active') <> 'archived';
  v_dependencies := v_dependencies || jsonb_build_object('classes', v_count);
  v_dependency_total := v_dependency_total + v_count;

  select count(*) into v_count from public.enrollments where school_id = p_school_id and coalesce(status, 'active') <> 'archived';
  v_dependencies := v_dependencies || jsonb_build_object('enrollments', v_count);
  v_dependency_total := v_dependency_total + v_count;

  select count(*) into v_count from public.students where school_id = p_school_id and coalesce(status, 'active') <> 'archived';
  v_dependencies := v_dependencies || jsonb_build_object('students', v_count);
  v_dependency_total := v_dependency_total + v_count;

  select count(*) into v_count from public.teachers where school_id = p_school_id and coalesce(status, 'active') <> 'archived';
  v_dependencies := v_dependencies || jsonb_build_object('teachers', v_count);
  v_dependency_total := v_dependency_total + v_count;

  select count(*) into v_count from public.guardians where school_id = p_school_id and coalesce(status, 'active') <> 'archived';
  v_dependencies := v_dependencies || jsonb_build_object('guardians', v_count);
  v_dependency_total := v_dependency_total + v_count;

  select count(*) into v_count
    from public.student_guardian_links sgl
    join public.students s on s.id = sgl.student_id
   where s.school_id = p_school_id
     and coalesce(sgl.status, 'active') <> 'archived';
  v_dependencies := v_dependencies || jsonb_build_object('guardian_student_links', v_count);
  v_dependency_total := v_dependency_total + v_count;

  select count(*) into v_count from public.school_memberships where school_id = p_school_id and coalesce(status, 'active') <> 'archived';
  v_dependencies := v_dependencies || jsonb_build_object('school_memberships', v_count);
  v_dependency_total := v_dependency_total + v_count;

  select count(*) into v_count from public.admin_school_deployment_events where school_id = p_school_id;
  v_dependencies := v_dependencies || jsonb_build_object('audit_events', v_count);
  v_dependency_total := v_dependency_total + v_count;

  if to_regclass('public.communications') is not null then
    execute 'select count(*) from public.communications where school_id = $1 and coalesce(status, ''active'') <> ''deleted'''
      into v_count using p_school_id;
    v_dependencies := v_dependencies || jsonb_build_object('communications', v_count);
    v_dependency_total := v_dependency_total + v_count;
  end if;

  if to_regclass('public.assessment_assignments') is not null then
    execute 'select count(*) from public.assessment_assignments where school_id = $1'
      into v_count using p_school_id;
    v_dependencies := v_dependencies || jsonb_build_object('assessments', v_count);
    v_dependency_total := v_dependency_total + v_count;
  end if;

  if to_regclass('public.school_content_availability') is not null then
    execute 'select count(*) from public.school_content_availability where school_id = $1 and deleted_at is null'
      into v_count using p_school_id;
    v_dependencies := v_dependencies || jsonb_build_object('content_links', v_count);
    v_dependency_total := v_dependency_total + v_count;
  end if;

  insert into public.admin_school_deployment_events (
    admin_user_id, school_id, school_code, action, stage, result, reason
  ) values (
    v_admin_user_id,
    case when v_dependency_total > 0 then p_school_id else null end,
    v_school_code,
    'school_delete_attempt',
    coalesce(v_installation.current_stage, 'em_configuracao'),
    case when v_dependency_total > 0 then 'blocked' else 'created' end,
    jsonb_build_object('dependencies', v_dependencies, 'dependency_total', v_dependency_total)::text
  );

  if v_dependency_total > 0 then
    insert into public.admin_school_deployment_events (
      admin_user_id, school_id, school_code, action, stage, result, reason
    ) values (
      v_admin_user_id,
      p_school_id,
      v_school_code,
      'school_delete_blocked',
      coalesce(v_installation.current_stage, 'em_configuracao'),
      'blocked',
      jsonb_build_object('delete_blocked', true, 'dependencies', v_dependencies, 'dependency_total', v_dependency_total)::text
    );

    return jsonb_build_object(
      'ok', false,
      'action', 'delete',
      'status', 'DELETE_BLOCKED',
      'school_id', p_school_id,
      'dependencies', v_dependencies,
      'dependency_total', v_dependency_total,
      'message', 'Exclusão bloqueada: a escola possui dependências institucionais.'
    );
  end if;

  if nullif(btrim(coalesce(p_confirmation_code, '')), '') is null
    or btrim(p_confirmation_code) <> coalesce(v_school.codigo_inep, v_school.nome) then
    return jsonb_build_object(
      'ok', false,
      'action', 'delete',
      'status', 'CONFIRMATION_REQUIRED',
      'school_id', p_school_id,
      'required_confirmation', coalesce(v_school.codigo_inep, v_school.nome),
      'message', 'Digite exatamente o código institucional da escola para confirmar a exclusão.'
    );
  end if;

  v_result := jsonb_build_object(
    'ok', true,
    'action', 'delete',
    'status', 'deleted',
    'school_id', p_school_id,
    'school_code', v_school_code
  );

  insert into public.admin_school_deployment_events (
    admin_user_id, school_id, school_code, action, stage, result, reason
  ) values (
    v_admin_user_id,
    null,
    v_school_code,
    'school_deleted',
    'arquivada',
    'created',
    jsonb_build_object('deleted_school_id', p_school_id, 'school_name', v_school.nome)::text
  );

  delete from public.rs_school_installations where school_id = p_school_id;
  delete from public.schools where id = p_school_id;

  return v_result;
end;
$$;

revoke all on function public.admin_manage_school_lifecycle(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_manage_school_lifecycle(uuid, text, text) to authenticated;

comment on function public.admin_manage_school_lifecycle(uuid, text, text) is
  'Admin-only lifecycle controls for schools: deactivate/reactivate/delete with dependency checks, strong confirmation and audit trail.';
