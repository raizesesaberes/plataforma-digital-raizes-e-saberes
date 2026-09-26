-- Raízes e Saberes — V2 school access control
-- Canonical student entry/exit control with opaque QR/barcode identifiers.

create table if not exists public.school_access_identifiers (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  code_public text not null unique,
  token_hash text not null,
  barcode_value text not null unique,
  status text not null default 'active' check (status in ('active', 'inactive', 'revoked')),
  issued_by uuid default auth.uid(),
  issued_at timestamp with time zone not null default now(),
  revoked_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create unique index if not exists idx_school_access_identifiers_active_student
  on public.school_access_identifiers (school_id, student_id)
  where status = 'active' and revoked_at is null;

create index if not exists idx_school_access_identifiers_school_student
  on public.school_access_identifiers (school_id, student_id, status);

create table if not exists public.school_access_events (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  identifier_id uuid references public.school_access_identifiers(id) on delete set null,
  event_type text not null check (event_type in ('entry', 'exit')),
  occurred_at timestamp with time zone not null default now(),
  operator_profile_id uuid default auth.uid(),
  origin text not null default 'manual_code' check (origin in ('qr_camera', 'manual_code', 'barcode', 'admin', 'api')),
  source_hint text,
  status text not null default 'recorded' check (status in ('recorded', 'duplicate', 'rejected', 'cancelled')),
  duplicate_of uuid references public.school_access_events(id) on delete set null,
  communication_id uuid references public.communications(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_school_access_events_school_day
  on public.school_access_events (school_id, occurred_at desc);

create index if not exists idx_school_access_events_student_day
  on public.school_access_events (student_id, occurred_at desc);

create index if not exists idx_school_access_events_class_day
  on public.school_access_events (class_id, occurred_at desc);

create table if not exists public.school_access_event_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.school_access_events(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  action text not null,
  actor_profile_id uuid default auth.uid(),
  details jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_school_access_event_audit_event
  on public.school_access_event_audit (event_id, created_at desc);

create or replace function public.school_access_operator_can_manage(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(public.is_platform_admin(), false)
    or coalesce(public.secretaria_can_manage_school(p_school_id), false);
$$;

create or replace function public.school_access_current_enrollment(p_student_id uuid, p_school_id uuid)
returns table(enrollment_id uuid, class_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select e.id, e.class_id
  from public.enrollments e
  where e.student_id = p_student_id
    and e.school_id = p_school_id
    and coalesce(e.status, 'active') in ('active', 'ativo')
    and e.ended_at is null
  order by e.enrolled_at desc nulls last, e.created_at desc nulls last
  limit 1;
$$;

create or replace function public.school_access_normalize_code(p_code text)
returns text
language plpgsql
immutable
set search_path to 'public', 'pg_temp'
as $$
declare
  v_code text := btrim(coalesce(p_code, ''));
begin
  if left(v_code, 9) = 'RSACCESS:' then
    v_code := substr(v_code, 10);
  end if;
  return upper(regexp_replace(v_code, '\s+', '', 'g'));
end;
$$;

create or replace function public.school_access_issue_student_identifier(
  p_student_id uuid,
  p_status text default 'active'
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_student public.students%rowtype;
  v_enrollment record;
  v_code text;
  v_identifier public.school_access_identifiers%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if coalesce(p_status, 'active') <> 'active' then
    raise exception 'Somente identificadores ativos sao emitidos por este fluxo.' using errcode = '22023';
  end if;

  select * into v_student from public.students where id = p_student_id;
  if v_student.id is null or v_student.school_id is null then
    raise exception 'Aluno nao encontrado.' using errcode = '22023';
  end if;

  if not public.school_access_operator_can_manage(v_student.school_id) then
    raise exception 'Operador sem permissao para emitir identificador escolar.' using errcode = '42501';
  end if;

  select * into v_enrollment
  from public.school_access_current_enrollment(v_student.id, v_student.school_id);

  if v_enrollment.class_id is null then
    raise exception 'Aluno sem matricula ativa para emissao de identificador.' using errcode = '22023';
  end if;

  update public.school_access_identifiers
  set status = 'revoked',
      revoked_at = now(),
      updated_at = now(),
      metadata = metadata || jsonb_build_object('revoked_reason', 'replaced_by_new_identifier')
  where school_id = v_student.school_id
    and student_id = v_student.id
    and status = 'active'
    and revoked_at is null;

  v_code := 'RS-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));

  insert into public.school_access_identifiers (
    school_id,
    student_id,
    code_public,
    token_hash,
    barcode_value,
    status,
    issued_by,
    metadata
  ) values (
    v_student.school_id,
    v_student.id,
    v_code,
    encode(digest(v_code, 'sha256'), 'hex'),
    v_code,
    'active',
    auth.uid(),
    jsonb_build_object('payload_version', 1, 'contains_personal_data', false)
  )
  returning * into v_identifier;

  return jsonb_build_object(
    'identifier_id', v_identifier.id,
    'student_id', v_identifier.student_id,
    'school_id', v_identifier.school_id,
    'class_id', v_enrollment.class_id,
    'qr_payload', 'RSACCESS:' || v_identifier.code_public,
    'barcode_value', v_identifier.barcode_value,
    'status', v_identifier.status,
    'contains_personal_data', false
  );
end;
$$;

create or replace function public.school_access_register_event(
  p_code text,
  p_event_type text,
  p_origin text default 'manual_code',
  p_occurred_at timestamp with time zone default now()
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_code text := public.school_access_normalize_code(p_code);
  v_identifier public.school_access_identifiers%rowtype;
  v_enrollment record;
  v_event_type text := lower(coalesce(p_event_type, ''));
  v_origin text := lower(coalesce(p_origin, 'manual_code'));
  v_duplicate public.school_access_events%rowtype;
  v_event public.school_access_events%rowtype;
  v_comm jsonb := null;
  v_comm_id uuid := null;
  v_title text;
  v_body text;
begin
  if auth.uid() is null then
    raise exception 'Usuario autenticado obrigatorio.' using errcode = '42501';
  end if;

  if v_event_type not in ('entry', 'exit') then
    raise exception 'Tipo de evento invalido.' using errcode = '22023';
  end if;

  if v_origin not in ('qr_camera', 'manual_code', 'barcode', 'admin', 'api') then
    v_origin := 'manual_code';
  end if;

  select * into v_identifier
  from public.school_access_identifiers
  where code_public = v_code
    and status = 'active'
    and revoked_at is null;

  if v_identifier.id is null then
    raise exception 'Identificador escolar invalido ou inativo.' using errcode = '22023';
  end if;

  if not public.school_access_operator_can_manage(v_identifier.school_id) then
    raise exception 'Operador sem permissao para registrar entrada/saida.' using errcode = '42501';
  end if;

  select * into v_enrollment
  from public.school_access_current_enrollment(v_identifier.student_id, v_identifier.school_id);

  if v_enrollment.class_id is null then
    raise exception 'Aluno sem matricula ativa para registro de entrada/saida.' using errcode = '22023';
  end if;

  select * into v_duplicate
  from public.school_access_events sae
  where sae.school_id = v_identifier.school_id
    and sae.student_id = v_identifier.student_id
    and sae.event_type = v_event_type
    and sae.status = 'recorded'
    and sae.occurred_at >= coalesce(p_occurred_at, now()) - interval '2 minutes'
  order by sae.occurred_at desc
  limit 1;

  insert into public.school_access_events (
    school_id,
    student_id,
    class_id,
    identifier_id,
    event_type,
    occurred_at,
    operator_profile_id,
    origin,
    source_hint,
    status,
    duplicate_of,
    metadata
  ) values (
    v_identifier.school_id,
    v_identifier.student_id,
    v_enrollment.class_id,
    v_identifier.id,
    v_event_type,
    coalesce(p_occurred_at, now()),
    auth.uid(),
    v_origin,
    right(v_code, 4),
    case when v_duplicate.id is null then 'recorded' else 'duplicate' end,
    v_duplicate.id,
    jsonb_build_object('duplicate_control_window_minutes', 2)
  )
  returning * into v_event;

  insert into public.school_access_event_audit (event_id, school_id, action, actor_profile_id, details)
  values (
    v_event.id,
    v_event.school_id,
    case when v_event.status = 'duplicate' then 'duplicate_scan_controlled' else 'event_registered' end,
    auth.uid(),
    jsonb_build_object('event_type', v_event.event_type, 'origin', v_event.origin, 'student_id', v_event.student_id)
  );

  if v_event.status = 'recorded' then
    v_title := case when v_event_type = 'entry' then 'Entrada registrada' else 'Saída registrada' end;
    v_body := case when v_event_type = 'entry'
      then 'A entrada do estudante foi registrada pela escola.'
      else 'A saída do estudante foi registrada pela escola.'
    end;

    begin
      v_comm := public.publish_communication(
        v_event.school_id,
        'notice',
        'student',
        v_title,
        v_body,
        v_event.class_id,
        v_event.student_id,
        'published',
        current_date,
        null
      );
      v_comm_id := nullif(v_comm ->> 'communication_id', '')::uuid;
      update public.school_access_events
      set communication_id = v_comm_id,
          metadata = metadata || jsonb_build_object('notification_status', 'published')
      where id = v_event.id;
      v_event.communication_id := v_comm_id;
    exception when others then
      update public.school_access_events
      set metadata = metadata || jsonb_build_object('notification_status', 'failed', 'notification_error', sqlerrm)
      where id = v_event.id;
    end;
  end if;

  return jsonb_build_object(
    'event_id', v_event.id,
    'school_id', v_event.school_id,
    'student_id', v_event.student_id,
    'class_id', v_event.class_id,
    'event_type', v_event.event_type,
    'occurred_at', v_event.occurred_at,
    'status', v_event.status,
    'duplicate_of', v_event.duplicate_of,
    'communication_id', v_event.communication_id
  );
end;
$$;

create or replace function public.school_access_list_daily_events(
  p_school_id uuid,
  p_event_date date default current_date,
  p_class_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.school_access_operator_can_manage(p_school_id) then
    raise exception 'Usuario sem permissao para consultar movimentacoes escolares.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'event_id', sae.id,
        'student_id', sae.student_id,
        'student_name', s.nome,
        'class_id', sae.class_id,
        'class_name', c.nome,
        'event_type', sae.event_type,
        'occurred_at', sae.occurred_at,
        'operator_profile_id', sae.operator_profile_id,
        'origin', sae.origin,
        'status', sae.status,
        'duplicate_of', sae.duplicate_of,
        'communication_id', sae.communication_id
      )
      order by sae.occurred_at desc
    )
    from public.school_access_events sae
    join public.students s on s.id = sae.student_id
    left join public.classes c on c.id = sae.class_id
    where sae.school_id = p_school_id
      and sae.occurred_at >= p_event_date::timestamp with time zone
      and sae.occurred_at < (p_event_date + 1)::timestamp with time zone
      and (p_class_id is null or sae.class_id = p_class_id)
  ), '[]'::jsonb);
end;
$$;

create or replace function public.school_access_get_history(
  p_school_id uuid,
  p_student_id uuid default null,
  p_date_from date default (current_date - 30),
  p_date_to date default current_date,
  p_class_id uuid default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.school_access_operator_can_manage(p_school_id) then
    raise exception 'Usuario sem permissao para consultar historico escolar.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'event_id', sae.id,
        'student_id', sae.student_id,
        'student_name', s.nome,
        'class_id', sae.class_id,
        'class_name', c.nome,
        'event_type', sae.event_type,
        'occurred_at', sae.occurred_at,
        'origin', sae.origin,
        'status', sae.status
      )
      order by sae.occurred_at desc
    )
    from public.school_access_events sae
    join public.students s on s.id = sae.student_id
    left join public.classes c on c.id = sae.class_id
    where sae.school_id = p_school_id
      and (p_student_id is null or sae.student_id = p_student_id)
      and (p_class_id is null or sae.class_id = p_class_id)
      and sae.occurred_at >= p_date_from::timestamp with time zone
      and sae.occurred_at < (p_date_to + 1)::timestamp with time zone
  ), '[]'::jsonb);
end;
$$;

create or replace function public.family_get_school_access_events(
  p_student_id uuid,
  p_date_from date default (current_date - 30),
  p_date_to date default current_date
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_student public.students%rowtype;
  v_enrollment record;
begin
  select * into v_student from public.students where id = p_student_id;
  if v_student.id is null then
    raise exception 'Aluno nao encontrado.' using errcode = '22023';
  end if;

  select * into v_enrollment
  from public.school_access_current_enrollment(v_student.id, v_student.school_id);

  if v_enrollment.class_id is null or not public.communication_guardian_can_read(v_student.school_id, v_enrollment.class_id, v_student.id, 'student') then
    raise exception 'Responsavel sem permissao para consultar movimentacoes deste aluno.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'event_id', sae.id,
        'student_id', sae.student_id,
        'class_id', sae.class_id,
        'event_type', sae.event_type,
        'occurred_at', sae.occurred_at,
        'origin', sae.origin,
        'status', sae.status
      )
      order by sae.occurred_at desc
    )
    from public.school_access_events sae
    where sae.student_id = p_student_id
      and sae.school_id = v_student.school_id
      and sae.status = 'recorded'
      and sae.occurred_at >= p_date_from::timestamp with time zone
      and sae.occurred_at < (p_date_to + 1)::timestamp with time zone
  ), '[]'::jsonb);
end;
$$;

create or replace function public.management_get_school_access_summary(
  p_school_id uuid,
  p_date_from date default current_date,
  p_date_to date default current_date
) returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.school_access_operator_can_manage(p_school_id) then
    raise exception 'Usuario sem permissao para consultar resumo de acesso escolar.' using errcode = '42501';
  end if;

  return coalesce((
    select jsonb_build_object(
      'school_id', p_school_id,
      'date_from', p_date_from,
      'date_to', p_date_to,
      'entries', count(*) filter (where event_type = 'entry' and status = 'recorded'),
      'exits', count(*) filter (where event_type = 'exit' and status = 'recorded'),
      'duplicates', count(*) filter (where status = 'duplicate'),
      'students_moved', count(distinct student_id) filter (where status = 'recorded')
    )
    from public.school_access_events
    where school_id = p_school_id
      and occurred_at >= p_date_from::timestamp with time zone
      and occurred_at < (p_date_to + 1)::timestamp with time zone
  ), jsonb_build_object('school_id', p_school_id, 'entries', 0, 'exits', 0, 'duplicates', 0, 'students_moved', 0));
end;
$$;

alter table public.school_access_identifiers enable row level security;
alter table public.school_access_events enable row level security;
alter table public.school_access_event_audit enable row level security;

drop policy if exists "school_access_identifiers_manage" on public.school_access_identifiers;
create policy "school_access_identifiers_manage"
on public.school_access_identifiers
for select
to authenticated
using (public.school_access_operator_can_manage(school_id));

drop policy if exists "school_access_events_manage" on public.school_access_events;
create policy "school_access_events_manage"
on public.school_access_events
for select
to authenticated
using (
  public.school_access_operator_can_manage(school_id)
  or public.communication_guardian_can_read(school_id, class_id, student_id, 'student')
);

drop policy if exists "school_access_event_audit_manage" on public.school_access_event_audit;
create policy "school_access_event_audit_manage"
on public.school_access_event_audit
for select
to authenticated
using (public.school_access_operator_can_manage(school_id));

grant select on public.school_access_identifiers to authenticated;
grant select on public.school_access_events to authenticated;
grant select on public.school_access_event_audit to authenticated;

revoke all on function public.school_access_operator_can_manage(uuid) from public, anon;
revoke all on function public.school_access_current_enrollment(uuid, uuid) from public, anon;
revoke all on function public.school_access_normalize_code(text) from public, anon;
revoke all on function public.school_access_issue_student_identifier(uuid, text) from public, anon;
revoke all on function public.school_access_register_event(text, text, text, timestamp with time zone) from public, anon;
revoke all on function public.school_access_list_daily_events(uuid, date, uuid) from public, anon;
revoke all on function public.school_access_get_history(uuid, uuid, date, date, uuid) from public, anon;
revoke all on function public.family_get_school_access_events(uuid, date, date) from public, anon;
revoke all on function public.management_get_school_access_summary(uuid, date, date) from public, anon;

grant execute on function public.school_access_operator_can_manage(uuid) to authenticated, service_role;
grant execute on function public.school_access_current_enrollment(uuid, uuid) to authenticated, service_role;
grant execute on function public.school_access_normalize_code(text) to authenticated, service_role;
grant execute on function public.school_access_issue_student_identifier(uuid, text) to authenticated, service_role;
grant execute on function public.school_access_register_event(text, text, text, timestamp with time zone) to authenticated, service_role;
grant execute on function public.school_access_list_daily_events(uuid, date, uuid) to authenticated, service_role;
grant execute on function public.school_access_get_history(uuid, uuid, date, date, uuid) to authenticated, service_role;
grant execute on function public.family_get_school_access_events(uuid, date, date) to authenticated, service_role;
grant execute on function public.management_get_school_access_summary(uuid, date, date) to authenticated, service_role;

comment on table public.school_access_identifiers is 'Opaque QR/barcode identifiers for student school entry/exit control. QR payload stores no personal data.';
comment on table public.school_access_events is 'Canonical school entry/exit events with duplicate scan control and notification bridge.';
comment on function public.school_access_register_event(text, text, text, timestamp with time zone) is 'Registers entry/exit from QR/barcode/manual code and publishes a canonical notice when applicable.';
