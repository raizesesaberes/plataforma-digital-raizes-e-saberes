begin;

-- Segurança P0: remove policies legadas com USING (true) em medalhas.
-- `medals` é catálogo; sem policy ampla aqui para evitar reabrir leitura direta.
-- `student_medals` permanece acessível somente ao aluno autenticado dono do vínculo.

drop policy if exists "Allow authenticated users read medals" on public.medals;
drop policy if exists "Allow authenticated users read student_medals" on public.student_medals;

create or replace function public.student_gamification_current_student_id()
returns uuid
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
  select s.id
  from public.students s
  where s.user_id = auth.uid()
    and coalesce(s.status, 'active') in ('active', 'ativo')
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;
$$;

revoke all on function public.student_gamification_current_student_id()
  from public, anon, authenticated;
grant execute on function public.student_gamification_current_student_id()
  to authenticated, service_role;

drop policy if exists student_medals_select_own_legacy_compat on public.student_medals;
create policy student_medals_select_own_legacy_compat
  on public.student_medals
  for select
  to authenticated
  using (student_id = public.student_gamification_current_student_id());

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('medals', 'student_medals')
      and (
        lower(coalesce(qual, '')) in ('true', '(true)')
        or lower(coalesce(with_check, '')) in ('true', '(true)')
      )
  ) then
    raise exception 'VALIDACAO bloqueada: policy medals/student_medals ainda usa TRUE';
  end if;
end $$;

commit;
