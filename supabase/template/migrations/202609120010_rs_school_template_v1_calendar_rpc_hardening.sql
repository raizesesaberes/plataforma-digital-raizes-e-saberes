-- Agenda e Calendario V1 - Fase 02
-- RPC segura para escrita, hardening de escrita direta e eventos institucionais da escola.

do $$
begin
  if to_regclass('public.class_calendar_entries') is null then
    raise exception 'PRE-CHECK bloqueado: public.class_calendar_entries nao existe';
  end if;

  if to_regprocedure('public.institutional_teacher_can_manage_class(uuid, uuid, uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: institutional_teacher_can_manage_class(uuid, uuid, uuid) nao existe';
  end if;

  if to_regprocedure('public.secretaria_can_manage_school(uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: secretaria_can_manage_school(uuid) nao existe';
  end if;
end $$;

create table if not exists public.school_calendar_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete restrict,
  class_id uuid references public.classes(id) on delete restrict,
  created_by uuid not null default auth.uid(),
  event_date date not null,
  start_time time,
  end_time time,
  title text not null,
  description text,
  event_type text not null default 'evento',
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint school_calendar_events_title_not_blank check (length(btrim(title)) > 0),
  constraint school_calendar_events_status_check check (status in ('published', 'cancelled', 'archived')),
  constraint school_calendar_events_type_check check (event_type in ('aula', 'atividade', 'avaliacao', 'lembrete', 'evento', 'reuniao', 'outro')),
  constraint school_calendar_events_time_check check (end_time is null or start_time is null or end_time > start_time),
  constraint school_calendar_events_class_school_fkey foreign key (class_id, school_id) references public.classes(id, school_id) on delete restrict
);

create index if not exists school_calendar_events_school_date_idx
  on public.school_calendar_events (school_id, event_date, status);

create index if not exists school_calendar_events_class_date_idx
  on public.school_calendar_events (class_id, event_date, status)
  where class_id is not null;

drop trigger if exists school_calendar_events_touch_updated_at on public.school_calendar_events;
create trigger school_calendar_events_touch_updated_at
before update on public.school_calendar_events
for each row execute function public.institutional_touch_updated_at();

alter table public.school_calendar_events enable row level security;

create or replace function public.calendar_student_can_read_school_event(
  p_school_id uuid,
  p_class_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.students s
    join public.enrollments e on e.student_id = s.id
    left join public.users u on u.id = s.user_id
    where e.school_id = p_school_id
      and (p_class_id is null or e.class_id = p_class_id)
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
      and (
        s.user_id = auth.uid()
        or lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

create or replace function public.calendar_guardian_can_read_school_event(
  p_school_id uuid,
  p_class_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.guardians g
    join public.student_guardian_links sgl on sgl.guardian_id = g.id
    join public.enrollments e on e.student_id = sgl.student_id
    join public.students s on s.id = e.student_id
    where g.profile_id = auth.uid()
      and g.school_id = p_school_id
      and g.status = 'active'
      and sgl.status = 'active'
      and e.school_id = p_school_id
      and (p_class_id is null or e.class_id = p_class_id)
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
  )
  or exists (
    select 1
    from public.student_guardians sg
    join public.enrollments e on e.student_id = sg.student_id
    join public.students s on s.id = e.student_id
    where sg.profile_id = auth.uid()
      and sg.status = 'active'
      and e.school_id = p_school_id
      and (p_class_id is null or e.class_id = p_class_id)
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
  );
$$;

create or replace function public.calendar_teacher_can_read_school_event(
  p_school_id uuid,
  p_class_id uuid default null
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.teachers t
    left join public.class_teacher_memberships ctm
      on ctm.teacher_id = t.id
     and ctm.status = 'active'
     and ctm.started_at <= now()
     and (ctm.ended_at is null or ctm.ended_at > now())
    where t.profile_id = auth.uid()
      and t.school_id = p_school_id
      and coalesce(t.status, 'active') = 'active'
      and (
        p_class_id is null
        or ctm.class_id = p_class_id
      )
  );
$$;

drop policy if exists school_calendar_events_select_institutional on public.school_calendar_events;
create policy school_calendar_events_select_institutional
on public.school_calendar_events
for select
to authenticated
using (
  status = 'published'
  and (
    public.is_platform_admin()
    or public.secretaria_can_manage_school(school_id)
    or public.calendar_teacher_can_read_school_event(school_id, class_id)
    or public.calendar_student_can_read_school_event(school_id, class_id)
    or public.calendar_guardian_can_read_school_event(school_id, class_id)
  )
);

create or replace function public.teacher_upsert_calendar_entry(
  p_entry_id uuid default null,
  p_plan_id uuid default null,
  p_class_id uuid default null,
  p_entry_date date default current_date,
  p_start_time time default null,
  p_end_time time default null,
  p_title text default '',
  p_description text default null,
  p_entry_type text default 'outro'
) returns public.class_calendar_entries
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_teacher public.teachers%rowtype;
  v_entry public.class_calendar_entries%rowtype;
  v_type text := lower(coalesce(nullif(btrim(p_entry_type), ''), 'outro'));
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if p_class_id is null then
    raise exception 'Turma obrigatoria.' using errcode = '22023';
  end if;

  select * into v_class
  from public.classes
  where id = p_class_id
    and coalesce(status, 'active') = 'active';

  if v_class.id is null or v_class.school_id is null then
    raise exception 'Turma institucional nao encontrada.' using errcode = '22023';
  end if;

  select t.* into v_teacher
  from public.teachers t
  join public.class_teacher_memberships ctm on ctm.teacher_id = t.id
  where t.profile_id = auth.uid()
    and t.school_id = v_class.school_id
    and coalesce(t.status, 'active') = 'active'
    and ctm.class_id = v_class.id
    and ctm.status = 'active'
    and ctm.started_at <= now()
    and (ctm.ended_at is null or ctm.ended_at > now())
  order by ctm.started_at desc
  limit 1;

  if v_teacher.id is null and public.is_platform_admin() then
    select t.* into v_teacher
    from public.teachers t
    where t.school_id = v_class.school_id
      and coalesce(t.status, 'active') = 'active'
    order by t.created_at asc
    limit 1;
  end if;

  if v_teacher.id is null then
    raise exception 'Professor nao autorizado para esta turma.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'Titulo obrigatorio.' using errcode = '22023';
  end if;

  if v_type not in ('atividade', 'aula', 'lembrete', 'livro', 'experiencia', 'atividade_online', 'outro') then
    v_type := 'outro';
  end if;

  if p_end_time is not null and p_start_time is not null and p_end_time <= p_start_time then
    raise exception 'Horario final deve ser posterior ao inicial.' using errcode = '22023';
  end if;

  if p_plan_id is not null and not public.institutional_plan_matches_publication(p_plan_id, v_teacher.id, v_class.id, v_class.school_id) then
    raise exception 'Planejamento nao pertence a esta turma/professor.' using errcode = '42501';
  end if;

  if p_entry_id is not null then
    update public.class_calendar_entries
    set
      plan_id = p_plan_id,
      entry_date = p_entry_date,
      start_time = p_start_time,
      end_time = p_end_time,
      title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      entry_type = v_type,
      status = 'published',
      updated_at = now()
    where id = p_entry_id
      and class_id = v_class.id
      and school_id = v_class.school_id
      and teacher_id = v_teacher.id
    returning * into v_entry;

    if v_entry.id is null then
      raise exception 'Publicacao de agenda nao encontrada para este professor/turma.' using errcode = '42501';
    end if;
  else
    insert into public.class_calendar_entries (
      class_id, school_id, teacher_id, plan_id, entry_date, start_time, end_time,
      title, description, entry_type, status
    ) values (
      v_class.id, v_class.school_id, v_teacher.id, p_plan_id, p_entry_date, p_start_time, p_end_time,
      btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), v_type, 'published'
    )
    returning * into v_entry;
  end if;

  return v_entry;
end;
$$;

create or replace function public.teacher_archive_calendar_entry(
  p_entry_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_entry public.class_calendar_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_entry
  from public.class_calendar_entries
  where id = p_entry_id;

  if v_entry.id is null then
    raise exception 'Publicacao de agenda nao encontrada.' using errcode = 'P0002';
  end if;

  if not (
    public.is_platform_admin()
    or public.institutional_teacher_can_manage_class(v_entry.teacher_id, v_entry.class_id, v_entry.school_id)
  ) then
    raise exception 'Professor nao autorizado para arquivar esta agenda.' using errcode = '42501';
  end if;

  update public.class_calendar_entries
  set status = 'archived',
      updated_at = now()
  where id = p_entry_id;

  return jsonb_build_object('entry_id', p_entry_id, 'status', 'archived');
end;
$$;

create or replace function public.secretaria_upsert_school_calendar_event(
  p_event_id uuid default null,
  p_school_id uuid default null,
  p_class_id uuid default null,
  p_event_date date default current_date,
  p_start_time time default null,
  p_end_time time default null,
  p_title text default '',
  p_description text default null,
  p_event_type text default 'evento',
  p_status text default 'published'
) returns public.school_calendar_events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.school_calendar_events%rowtype;
  v_type text := lower(coalesce(nullif(btrim(p_event_type), ''), 'evento'));
  v_status text := lower(coalesce(nullif(btrim(p_status), ''), 'published'));
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if p_school_id is null or not (public.is_platform_admin() or public.secretaria_can_manage_school(p_school_id)) then
    raise exception 'Secretaria nao autorizada para esta escola.' using errcode = '42501';
  end if;

  if p_class_id is not null and not exists (
    select 1 from public.classes c
    where c.id = p_class_id
      and c.school_id = p_school_id
      and coalesce(c.status, 'active') = 'active'
  ) then
    raise exception 'Turma nao pertence a escola informada.' using errcode = '42501';
  end if;

  if length(btrim(coalesce(p_title, ''))) = 0 then
    raise exception 'Titulo obrigatorio.' using errcode = '22023';
  end if;

  if v_type not in ('aula', 'atividade', 'avaliacao', 'lembrete', 'evento', 'reuniao', 'outro') then
    v_type := 'evento';
  end if;

  if v_status not in ('published', 'cancelled', 'archived') then
    v_status := 'published';
  end if;

  if p_end_time is not null and p_start_time is not null and p_end_time <= p_start_time then
    raise exception 'Horario final deve ser posterior ao inicial.' using errcode = '22023';
  end if;

  if p_event_id is not null then
    update public.school_calendar_events
    set
      class_id = p_class_id,
      event_date = p_event_date,
      start_time = p_start_time,
      end_time = p_end_time,
      title = btrim(p_title),
      description = nullif(btrim(coalesce(p_description, '')), ''),
      event_type = v_type,
      status = v_status,
      updated_at = now()
    where id = p_event_id
      and school_id = p_school_id
    returning * into v_event;

    if v_event.id is null then
      raise exception 'Evento institucional nao encontrado para esta escola.' using errcode = '42501';
    end if;
  else
    insert into public.school_calendar_events (
      school_id, class_id, created_by, event_date, start_time, end_time,
      title, description, event_type, status
    ) values (
      p_school_id, p_class_id, auth.uid(), p_event_date, p_start_time, p_end_time,
      btrim(p_title), nullif(btrim(coalesce(p_description, '')), ''), v_type, v_status
    )
    returning * into v_event;
  end if;

  return v_event;
end;
$$;

create or replace function public.secretaria_archive_school_calendar_event(
  p_event_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.school_calendar_events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  select * into v_event
  from public.school_calendar_events
  where id = p_event_id;

  if v_event.id is null then
    raise exception 'Evento institucional nao encontrado.' using errcode = 'P0002';
  end if;

  if not (public.is_platform_admin() or public.secretaria_can_manage_school(v_event.school_id)) then
    raise exception 'Secretaria nao autorizada para este evento.' using errcode = '42501';
  end if;

  update public.school_calendar_events
  set status = 'archived',
      updated_at = now()
  where id = p_event_id;

  return jsonb_build_object('event_id', p_event_id, 'status', 'archived');
end;
$$;

create or replace function public.calendar_family_can_access_student(
  p_student_id uuid
) returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.guardians g
    join public.student_guardian_links sgl on sgl.guardian_id = g.id
    where g.profile_id = auth.uid()
      and g.status = 'active'
      and sgl.status = 'active'
      and sgl.student_id = p_student_id
  )
  or exists (
    select 1
    from public.student_guardians sg
    where sg.profile_id = auth.uid()
      and sg.status = 'active'
      and sg.student_id = p_student_id
  );
$$;

create or replace function public.calendar_list_family_events(
  p_student_id uuid,
  p_from date,
  p_to date
) returns table (
  source_type text,
  source_id uuid,
  school_id uuid,
  class_id uuid,
  student_id uuid,
  event_date date,
  start_time time,
  end_time time,
  title text,
  description text,
  event_type text,
  status text,
  action_label text,
  href text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with active_enrollment as (
    select e.student_id, e.school_id, e.class_id
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.student_id = p_student_id
      and e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
      and public.calendar_family_can_access_student(p_student_id)
    order by e.enrolled_at desc
    limit 1
  ),
  events as (
    select
      'class_calendar'::text as source_type,
      cce.id as source_id,
      cce.school_id,
      cce.class_id,
      ae.student_id,
      cce.entry_date as event_date,
      cce.start_time,
      cce.end_time,
      cce.title,
      cce.description,
      cce.entry_type as event_type,
      cce.status,
      'Ver na Minha Semana'::text as action_label,
      null::text as href,
      cce.created_at
    from active_enrollment ae
    join public.class_calendar_entries cce
      on cce.class_id = ae.class_id
     and cce.school_id = ae.school_id
    where cce.status = 'published'
      and cce.entry_date between p_from and p_to

    union all

    select
      'school_calendar'::text,
      sce.id,
      sce.school_id,
      sce.class_id,
      ae.student_id,
      sce.event_date,
      sce.start_time,
      sce.end_time,
      sce.title,
      sce.description,
      sce.event_type,
      sce.status,
      'Ver na agenda'::text,
      null::text,
      sce.created_at
    from active_enrollment ae
    join public.school_calendar_events sce
      on sce.school_id = ae.school_id
     and (sce.class_id is null or sce.class_id = ae.class_id)
    where sce.status = 'published'
      and sce.event_date between p_from and p_to

    union all

    select
      'assessment_available'::text,
      aa.id,
      aa.school_id,
      aa.class_id,
      ae.student_id,
      aa.available_from::date,
      aa.available_from::time,
      null::time,
      ('Avaliação disponível: ' || coalesce(a.title, 'Avalia+'))::text,
      coalesce(a.description, 'Avaliação publicada para a turma.')::text,
      'avaliacao'::text,
      aa.status,
      'Abrir Avalia+'::text,
      'aluno.html?view=avaliacoes'::text,
      aa.created_at
    from active_enrollment ae
    join public.assessment_assignments aa
      on aa.school_id = ae.school_id
     and aa.class_id = ae.class_id
     and (
       (aa.target_type = 'class' and aa.student_id is null)
       or (aa.target_type = 'student' and aa.student_id = ae.student_id)
     )
    join public.assessments a on a.id = aa.assessment_id
    where aa.status = 'published'
      and aa.available_from::date between p_from and p_to

    union all

    select
      'assessment_deadline'::text,
      aa.id,
      aa.school_id,
      aa.class_id,
      ae.student_id,
      aa.available_until::date,
      aa.available_until::time,
      null::time,
      ('Prazo da avaliação: ' || coalesce(a.title, 'Avalia+'))::text,
      coalesce(a.description, 'Prazo para entrega da avaliação.')::text,
      'avaliacao'::text,
      aa.status,
      'Abrir Avalia+'::text,
      'aluno.html?view=avaliacoes'::text,
      aa.created_at
    from active_enrollment ae
    join public.assessment_assignments aa
      on aa.school_id = ae.school_id
     and aa.class_id = ae.class_id
     and (
       (aa.target_type = 'class' and aa.student_id is null)
       or (aa.target_type = 'student' and aa.student_id = ae.student_id)
     )
    join public.assessments a on a.id = aa.assessment_id
    where aa.status = 'published'
      and aa.available_until is not null
      and aa.available_until::date between p_from and p_to
  )
  select *
  from events
  order by event_date asc, start_time asc nulls last, created_at asc;
$$;

create or replace function public.student_list_calendar_events(
  p_from date,
  p_to date
) returns table (
  source_type text,
  source_id uuid,
  school_id uuid,
  class_id uuid,
  student_id uuid,
  event_date date,
  start_time time,
  end_time time,
  title text,
  description text,
  event_type text,
  status text,
  action_label text,
  href text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with current_student as (
    select s.id as student_id, e.school_id, e.class_id
    from public.students s
    join public.enrollments e on e.student_id = s.id
    left join public.users u on u.id = s.user_id
    where e.status = 'active'
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
      and coalesce(s.status, 'active') = 'active'
      and (
        s.user_id = auth.uid()
        or lower(coalesce(u.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
    order by e.enrolled_at desc
    limit 1
  ),
  events as (
    select
      'class_calendar'::text as source_type,
      cce.id as source_id,
      cce.school_id,
      cce.class_id,
      cs.student_id,
      cce.entry_date as event_date,
      cce.start_time,
      cce.end_time,
      cce.title,
      cce.description,
      cce.entry_type as event_type,
      cce.status,
      'Ver na Minha Semana'::text as action_label,
      null::text as href,
      cce.created_at
    from current_student cs
    join public.class_calendar_entries cce
      on cce.class_id = cs.class_id
     and cce.school_id = cs.school_id
    where cce.status = 'published'
      and cce.entry_date between p_from and p_to

    union all

    select
      'school_calendar'::text,
      sce.id,
      sce.school_id,
      sce.class_id,
      cs.student_id,
      sce.event_date,
      sce.start_time,
      sce.end_time,
      sce.title,
      sce.description,
      sce.event_type,
      sce.status,
      'Ver na agenda'::text,
      null::text,
      sce.created_at
    from current_student cs
    join public.school_calendar_events sce
      on sce.school_id = cs.school_id
     and (sce.class_id is null or sce.class_id = cs.class_id)
    where sce.status = 'published'
      and sce.event_date between p_from and p_to

    union all

    select
      'assessment_available'::text,
      aa.id,
      aa.school_id,
      aa.class_id,
      cs.student_id,
      aa.available_from::date,
      aa.available_from::time,
      null::time,
      ('Avaliação disponível: ' || coalesce(a.title, 'Avalia+'))::text,
      coalesce(a.description, 'Avaliação publicada para a turma.')::text,
      'avaliacao'::text,
      aa.status,
      'Abrir Avalia+'::text,
      'aluno.html?view=avaliacoes'::text,
      aa.created_at
    from current_student cs
    join public.assessment_assignments aa
      on aa.school_id = cs.school_id
     and aa.class_id = cs.class_id
     and (
       (aa.target_type = 'class' and aa.student_id is null)
       or (aa.target_type = 'student' and aa.student_id = cs.student_id)
     )
    join public.assessments a on a.id = aa.assessment_id
    where aa.status = 'published'
      and aa.available_from::date between p_from and p_to

    union all

    select
      'assessment_deadline'::text,
      aa.id,
      aa.school_id,
      aa.class_id,
      cs.student_id,
      aa.available_until::date,
      aa.available_until::time,
      null::time,
      ('Prazo da avaliação: ' || coalesce(a.title, 'Avalia+'))::text,
      coalesce(a.description, 'Prazo para entrega da avaliação.')::text,
      'avaliacao'::text,
      aa.status,
      'Abrir Avalia+'::text,
      'aluno.html?view=avaliacoes'::text,
      aa.created_at
    from current_student cs
    join public.assessment_assignments aa
      on aa.school_id = cs.school_id
     and aa.class_id = cs.class_id
     and (
       (aa.target_type = 'class' and aa.student_id is null)
       or (aa.target_type = 'student' and aa.student_id = cs.student_id)
     )
    join public.assessments a on a.id = aa.assessment_id
    where aa.status = 'published'
      and aa.available_until is not null
      and aa.available_until::date between p_from and p_to
  )
  select *
  from events
  order by event_date asc, start_time asc nulls last, created_at asc;
$$;

create or replace function public.secretaria_list_calendar_events(
  p_school_id uuid,
  p_from date,
  p_to date,
  p_class_id uuid default null
) returns table (
  source_type text,
  source_id uuid,
  school_id uuid,
  class_id uuid,
  event_date date,
  start_time time,
  end_time time,
  title text,
  description text,
  event_type text,
  status text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with allowed as (
    select 1
    where auth.uid() is not null
      and (public.is_platform_admin() or public.secretaria_can_manage_school(p_school_id))
  ),
  events as (
    select
      'class_calendar'::text as source_type,
      cce.id as source_id,
      cce.school_id,
      cce.class_id,
      cce.entry_date as event_date,
      cce.start_time,
      cce.end_time,
      cce.title,
      cce.description,
      cce.entry_type as event_type,
      cce.status,
      cce.created_at
    from allowed
    join public.class_calendar_entries cce on cce.school_id = p_school_id
    where cce.status = 'published'
      and cce.entry_date between p_from and p_to
      and (p_class_id is null or cce.class_id = p_class_id)

    union all

    select
      'school_calendar'::text,
      sce.id,
      sce.school_id,
      sce.class_id,
      sce.event_date,
      sce.start_time,
      sce.end_time,
      sce.title,
      sce.description,
      sce.event_type,
      sce.status,
      sce.created_at
    from allowed
    join public.school_calendar_events sce on sce.school_id = p_school_id
    where sce.status = 'published'
      and sce.event_date between p_from and p_to
      and (p_class_id is null or sce.class_id is null or sce.class_id = p_class_id)

    union all

    select
      'assessment_available'::text,
      aa.id,
      aa.school_id,
      aa.class_id,
      aa.available_from::date,
      aa.available_from::time,
      null::time,
      ('Avaliação disponível: ' || coalesce(a.title, 'Avalia+'))::text,
      coalesce(a.description, 'Avaliação publicada.')::text,
      'avaliacao'::text,
      aa.status,
      aa.created_at
    from allowed
    join public.assessment_assignments aa on aa.school_id = p_school_id
    join public.assessments a on a.id = aa.assessment_id
    where aa.status = 'published'
      and aa.available_from::date between p_from and p_to
      and (p_class_id is null or aa.class_id = p_class_id)
  )
  select *
  from events
  order by event_date asc, start_time asc nulls last, created_at asc;
$$;

revoke all on table public.school_calendar_events from public, anon, authenticated;
grant select on table public.school_calendar_events to authenticated;

revoke insert, update, delete, truncate on table public.class_calendar_entries from authenticated;
grant select on table public.class_calendar_entries to authenticated;

revoke all on function public.calendar_student_can_read_school_event(uuid, uuid) from public, anon, authenticated;
revoke all on function public.calendar_guardian_can_read_school_event(uuid, uuid) from public, anon, authenticated;
revoke all on function public.calendar_teacher_can_read_school_event(uuid, uuid) from public, anon, authenticated;
revoke all on function public.calendar_family_can_access_student(uuid) from public, anon, authenticated;
revoke all on function public.teacher_upsert_calendar_entry(uuid, uuid, uuid, date, time, time, text, text, text) from public, anon, authenticated;
revoke all on function public.teacher_archive_calendar_entry(uuid) from public, anon, authenticated;
revoke all on function public.secretaria_upsert_school_calendar_event(uuid, uuid, uuid, date, time, time, text, text, text, text) from public, anon, authenticated;
revoke all on function public.secretaria_archive_school_calendar_event(uuid) from public, anon, authenticated;
revoke all on function public.calendar_list_family_events(uuid, date, date) from public, anon, authenticated;
revoke all on function public.student_list_calendar_events(date, date) from public, anon, authenticated;
revoke all on function public.secretaria_list_calendar_events(uuid, date, date, uuid) from public, anon, authenticated;

grant execute on function public.calendar_student_can_read_school_event(uuid, uuid) to authenticated;
grant execute on function public.calendar_guardian_can_read_school_event(uuid, uuid) to authenticated;
grant execute on function public.calendar_teacher_can_read_school_event(uuid, uuid) to authenticated;
grant execute on function public.calendar_family_can_access_student(uuid) to authenticated;
grant execute on function public.teacher_upsert_calendar_entry(uuid, uuid, uuid, date, time, time, text, text, text) to authenticated;
grant execute on function public.teacher_archive_calendar_entry(uuid) to authenticated;
grant execute on function public.secretaria_upsert_school_calendar_event(uuid, uuid, uuid, date, time, time, text, text, text, text) to authenticated;
grant execute on function public.secretaria_archive_school_calendar_event(uuid) to authenticated;
grant execute on function public.calendar_list_family_events(uuid, date, date) to authenticated;
grant execute on function public.student_list_calendar_events(date, date) to authenticated;
grant execute on function public.secretaria_list_calendar_events(uuid, date, date, uuid) to authenticated;

do $$
begin
  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('class_calendar_entries', 'school_calendar_events')
      and grantee = 'anon'
  ) then
    raise exception 'VALIDACAO bloqueada: anon ainda possui acesso direto a tabelas de calendario';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'class_calendar_entries'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) then
    raise exception 'VALIDACAO bloqueada: class_calendar_entries ainda permite escrita direta autenticada';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name = 'school_calendar_events'
      and grantee = 'authenticated'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
  ) then
    raise exception 'VALIDACAO bloqueada: school_calendar_events permite escrita direta autenticada';
  end if;
end $$;
