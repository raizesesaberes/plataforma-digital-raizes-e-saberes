-- HOTFIX VISTORIA 02
-- Secretaria: seletor operacional de escola com autorização server-side.

create or replace function public.secretaria_can_manage_school(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    coalesce(public.is_platform_admin(), false)
    or exists (
      select 1
      from public.school_memberships sm
      where sm.school_id = p_school_id
        and sm.profile_id = auth.uid()
        and sm.status = 'active'
        and sm.membership_role in ('gestor', 'coordenador', 'direcao', 'secretaria', 'admin', 'admin_ti')
        and sm.started_at <= now()
        and (sm.ended_at is null or sm.ended_at > now())
    )
    or exists (
      select 1
      from public.current_network_school_ids() cns
      where cns.school_id = p_school_id
    );
$$;

create or replace function public.secretaria_list_authorized_schools()
returns table(
  id uuid,
  nome varchar,
  codigo_inep varchar,
  municipio varchar,
  estado text,
  status text
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    s.id,
    s.nome,
    s.codigo_inep,
    s.municipio,
    s.estado,
    s.status
  from public.schools s
  where public.secretaria_can_manage_school(s.id)
  order by s.nome asc;
$$;

revoke all on function public.secretaria_can_manage_school(uuid) from public, anon;
revoke all on function public.secretaria_list_authorized_schools() from public, anon;

grant execute on function public.secretaria_can_manage_school(uuid) to authenticated, service_role;
grant execute on function public.secretaria_list_authorized_schools() to authenticated, service_role;
