-- Raizes e Saberes - IA Pedagogica V1
-- Assistente, contexto, recomendacoes, RAG institucional e auditoria.
-- Sem provedor externo configurado: AI_PROVIDER=EMPTY_REAL.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.assessment_results') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_results nao existe';
  end if;
  if to_regclass('public.recomposition_plans') is null then
    raise exception 'PRE-CHECK bloqueado: public.recomposition_plans nao existe';
  end if;
  if to_regclass('public.pedagogical_recommendations') is null then
    raise exception 'PRE-CHECK bloqueado: public.pedagogical_recommendations nao existe';
  end if;
  if to_regprocedure('public.recomposition_get_learning_gap_map(uuid,date,date,numeric,numeric)') is null then
    raise exception 'PRE-CHECK bloqueado: recomposition_get_learning_gap_map nao existe';
  end if;
end $$;

create table if not exists public.ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique,
  provider_label text not null,
  status text not null default 'empty_real',
  model_name text,
  endpoint_ref text,
  secret_ref text,
  data_minimization_policy jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_provider_configs_status_check
    check (status in ('empty_real', 'configured', 'disabled')),
  constraint ai_provider_configs_no_raw_secret_check
    check (
      secret_ref is null
      or (
        secret_ref !~* '^(sk-|eyJ|ghp_|AIza|xox[baprs]-)'
        and length(secret_ref) <= 180
      )
    )
);

create table if not exists public.ai_interaction_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  user_role text not null,
  school_id uuid references public.schools(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  request_type text not null,
  audience text not null,
  prompt_hash text,
  prompt_excerpt text,
  provider_key text,
  model_name text,
  status text not null default 'provider_empty_real',
  context_summary jsonb not null default '{}'::jsonb,
  references_used jsonb not null default '[]'::jsonb,
  active_assessment_protected boolean not null default false,
  error_code text,
  created_at timestamptz not null default now(),
  constraint ai_interaction_logs_type_check
    check (request_type in ('student_question', 'teacher_support', 'recommendation', 'rag_context')),
  constraint ai_interaction_logs_audience_check
    check (audience in ('student', 'teacher', 'management')),
  constraint ai_interaction_logs_status_check
    check (status in ('provider_empty_real', 'prepared', 'blocked', 'completed', 'failed'))
);

create table if not exists public.ai_context_references (
  id uuid primary key default gen_random_uuid(),
  interaction_id uuid not null references public.ai_interaction_logs(id) on delete cascade,
  school_id uuid references public.schools(id) on delete set null,
  source_type text not null,
  source_id text,
  title text not null,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_context_references_type_check
    check (source_type in ('assessment_result', 'learning_gap', 'recomposition_plan', 'pedagogical_recommendation', 'library', 'activity', 'bncc_skill', 'teacher_note', 'other'))
);

create table if not exists public.ai_recommendation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  user_role text not null,
  school_id uuid references public.schools(id) on delete set null,
  class_id uuid references public.classes(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  source_context text not null default 'learning_gap',
  target_skill text,
  status text not null default 'empty_real',
  recommendations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint ai_recommendation_runs_status_check
    check (status in ('pass', 'empty_real', 'blocked', 'failed'))
);

create index if not exists ai_provider_configs_status_idx
  on public.ai_provider_configs (status, provider_key);
create index if not exists ai_interaction_logs_user_created_idx
  on public.ai_interaction_logs (user_id, created_at desc);
create index if not exists ai_interaction_logs_school_created_idx
  on public.ai_interaction_logs (school_id, created_at desc);
create index if not exists ai_context_references_interaction_idx
  on public.ai_context_references (interaction_id);
create index if not exists ai_recommendation_runs_student_idx
  on public.ai_recommendation_runs (student_id, created_at desc);
create index if not exists ai_recommendation_runs_class_idx
  on public.ai_recommendation_runs (class_id, created_at desc);

drop trigger if exists ai_provider_configs_touch_updated_at on public.ai_provider_configs;
create trigger ai_provider_configs_touch_updated_at
before update on public.ai_provider_configs
for each row execute function public.institutional_touch_updated_at();

create or replace function public.ai_current_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select lower(coalesce(
    (select p.platform_role from public.profiles p where p.id = auth.uid() and p.status = 'active'),
    (select u.perfil from public.users u where u.id = auth.uid() and coalesce(u.ativo, true)),
    ''
  ));
$$;

create or replace function public.ai_current_student_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select s.id
  from public.students s
  where s.user_id = auth.uid()
    and coalesce(s.status, 'active') in ('active', 'ativo')
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;
$$;

create or replace function public.ai_provider_status()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'status', case when status = 'configured' then 'PASS' else 'EMPTY_REAL' end,
        'provider_key', provider_key,
        'provider_label', provider_label,
        'model_name', model_name,
        'configured', status = 'configured'
      )
      from public.ai_provider_configs
      where status = 'configured'
      order by updated_at desc
      limit 1
    ),
    jsonb_build_object(
      'status', 'EMPTY_REAL',
      'provider_key', null,
      'provider_label', null,
      'model_name', null,
      'configured', false
    )
  );
$$;

create or replace function public.ai_can_access_student_context(
  p_student_id uuid,
  p_class_id uuid default null,
  p_school_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and (
      public.is_platform_admin()
      or (p_school_id is not null and public.secretaria_can_manage_school(p_school_id))
      or public.institutional_is_current_student(p_student_id)
      or exists (
        select 1
        from public.enrollments e
        where e.student_id = p_student_id
          and (p_class_id is null or e.class_id = p_class_id)
          and (p_school_id is null or e.school_id = p_school_id)
          and public.avalia_plus_teacher_can_manage_class(e.class_id, e.school_id)
      )
      or exists (
        select 1
        from public.enrollments e
        where e.student_id = p_student_id
          and (p_class_id is null or e.class_id = p_class_id)
          and (p_school_id is null or e.school_id = p_school_id)
          and public.communication_guardian_can_read(e.school_id, e.class_id, e.student_id, 'student')
      )
    );
$$;

create or replace function public.ai_has_active_assessment(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.assessment_assignments aa
    join public.enrollments e
      on e.student_id = p_student_id
     and e.school_id = aa.school_id
     and e.class_id = aa.class_id
     and e.status in ('active', 'ativo')
    where aa.status = 'published'
      and aa.available_from <= now()
      and (aa.available_until is null or aa.available_until >= now())
      and (
        aa.target_type = 'class'
        or (aa.target_type = 'student' and aa.student_id = p_student_id)
      )
      and not exists (
        select 1
        from public.assessment_results ar
        where ar.assignment_id = aa.id
          and ar.student_id = p_student_id
      )
  );
$$;

create or replace function public.ai_pedagogy_build_context(
  p_audience text,
  p_student_id uuid default null,
  p_class_id uuid default null,
  p_component text default null,
  p_skill text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_audience text := lower(btrim(coalesce(p_audience, '')));
  v_role text := public.ai_current_role();
  v_student_id uuid := p_student_id;
  v_student public.students%rowtype;
  v_enrollment public.enrollments%rowtype;
  v_class public.classes%rowtype;
  v_teacher_id uuid;
  v_gap_map jsonb := null;
  v_recommendations jsonb := jsonb_build_object('status', 'EMPTY_REAL', 'items', '[]'::jsonb);
  v_active_assessment boolean := false;
  v_recent_results jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if v_audience not in ('student', 'teacher', 'management') then
    raise exception 'AI_AUDIENCE_INVALID' using errcode = '22023';
  end if;

  if v_audience = 'student' then
    v_student_id := coalesce(v_student_id, public.ai_current_student_id());
    if v_student_id is null then
      raise exception 'STUDENT_CONTEXT_REQUIRED' using errcode = '22023';
    end if;

    select * into v_student
    from public.students
    where id = v_student_id;

    if v_student.id is null then
      raise exception 'STUDENT_NOT_FOUND' using errcode = '22023';
    end if;

    select * into v_enrollment
    from public.enrollments e
    where e.student_id = v_student.id
      and e.status in ('active', 'ativo')
    order by e.enrolled_at desc
    limit 1;

    if v_enrollment.id is null then
      raise exception 'ACTIVE_ENROLLMENT_REQUIRED' using errcode = '22023';
    end if;

    if not public.ai_can_access_student_context(v_student.id, v_enrollment.class_id, v_enrollment.school_id) then
      raise exception 'AI_STUDENT_CONTEXT_FORBIDDEN' using errcode = '42501';
    end if;

    select coalesce(jsonb_agg(to_jsonb(src)), '[]'::jsonb)
      into v_recent_results
    from (
      select ar.assessment_id, ar.assignment_id, ar.score_percentage, ar.status, ar.finalized_at
      from public.assessment_results ar
      where ar.student_id = v_student.id
        and ar.school_id = v_enrollment.school_id
      order by ar.finalized_at desc
      limit 5
    ) src;

    v_active_assessment := public.ai_has_active_assessment(v_student.id);

    select jsonb_build_object(
      'status', case when count(*) > 0 then 'PASS' else 'EMPTY_REAL' end,
      'items', coalesce(jsonb_agg(jsonb_build_object(
        'content_type', pr.content_type,
        'content_id', pr.content_id,
        'content_title', pr.content_title,
        'source', 'pedagogical_recommendations',
        'recommendation_id', pr.id,
        'note', pr.note
      ) order by pr.created_at desc), '[]'::jsonb)
    )
    into v_recommendations
    from (
      select *
      from public.pedagogical_recommendations pr
      where pr.school_id = v_enrollment.school_id
        and pr.class_id = v_enrollment.class_id
        and pr.status = 'published'
        and pr.deleted_at is null
        and (
          pr.target_type = 'class'
          or (pr.target_type = 'student' and pr.student_id = v_student.id)
        )
        and (
          nullif(btrim(coalesce(p_skill, '')), '') is null
          or pr.content_title ilike '%' || p_skill || '%'
          or coalesce(pr.note, '') ilike '%' || p_skill || '%'
        )
      order by pr.created_at desc
      limit 8
    ) pr;

    return jsonb_build_object(
      'audience', v_audience,
      'role', v_role,
      'student', jsonb_build_object('id', v_student.id, 'name', v_student.nome, 'school_id', v_enrollment.school_id, 'class_id', v_enrollment.class_id),
      'component', p_component,
      'skill', p_skill,
      'recent_results', v_recent_results,
      'recommendations', v_recommendations,
      'active_assessment', v_active_assessment,
      'provider', public.ai_provider_status()
    );
  end if;

  v_teacher_id := public.avalia_current_teacher_id();
  if v_audience = 'teacher' and v_teacher_id is null and not public.is_platform_admin() then
    raise exception 'TEACHER_CONTEXT_REQUIRED' using errcode = '42501';
  end if;

  if p_class_id is not null then
    select * into v_class from public.classes where id = p_class_id;
  elsif v_teacher_id is not null then
    select c.* into v_class
    from public.teacher_class_links tcl
    join public.classes c on c.id = tcl.class_id
    where tcl.teacher_id = v_teacher_id
      and tcl.status = 'active'
      and c.status = 'active'
    order by c.nome
    limit 1;
  end if;

  if v_class.id is not null then
    if not (
      public.is_platform_admin()
      or public.secretaria_can_manage_school(v_class.school_id)
      or public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id)
    ) then
      raise exception 'AI_CLASS_CONTEXT_FORBIDDEN' using errcode = '42501';
    end if;

    v_gap_map := public.recomposition_get_learning_gap_map(v_class.id);
    v_recommendations := public.recomposition_content_recommendations(v_class.id, p_skill, 8);
  end if;

  return jsonb_build_object(
    'audience', v_audience,
    'role', v_role,
    'teacher_id', v_teacher_id,
    'class', case when v_class.id is null then null else jsonb_build_object('id', v_class.id, 'name', v_class.nome, 'school_id', v_class.school_id) end,
    'component', p_component,
    'skill', p_skill,
    'learning_gap_map', v_gap_map,
    'recommendations', v_recommendations,
    'provider', public.ai_provider_status()
  );
end;
$$;

create or replace function public.ai_pedagogy_recommendations(
  p_audience text,
  p_student_id uuid default null,
  p_class_id uuid default null,
  p_skill text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_context jsonb;
  v_items jsonb;
  v_status text;
  v_role text := public.ai_current_role();
  v_school_id uuid;
  v_run_id uuid;
begin
  v_context := public.ai_pedagogy_build_context(p_audience, p_student_id, p_class_id, null, p_skill);
  v_items := coalesce(v_context #> '{recommendations,items}', '[]'::jsonb);
  v_status := case when jsonb_array_length(v_items) > 0 then 'pass' else 'empty_real' end;
  v_school_id := coalesce((v_context #>> '{student,school_id}')::uuid, (v_context #>> '{class,school_id}')::uuid);

  insert into public.ai_recommendation_runs (
    user_role,
    school_id,
    class_id,
    student_id,
    target_skill,
    status,
    recommendations
  ) values (
    v_role,
    v_school_id,
    coalesce(p_class_id, nullif(v_context #>> '{student,class_id}', '')::uuid),
    p_student_id,
    p_skill,
    v_status,
    v_items
  )
  returning id into v_run_id;

  return jsonb_build_object(
    'run_id', v_run_id,
    'status', upper(v_status),
    'items', v_items,
    'source_context', 'AVALIA+ ANALYTICS + LEARNING GAP MAP + RECOMPOSICAO + ATIVIDADES/BIBLIOTECA'
  );
end;
$$;

create or replace function public.ai_pedagogy_prepare_request(
  p_audience text,
  p_prompt text,
  p_student_id uuid default null,
  p_class_id uuid default null,
  p_component text default null,
  p_skill text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_audience text := lower(btrim(coalesce(p_audience, '')));
  v_prompt text := coalesce(p_prompt, '');
  v_role text := public.ai_current_role();
  v_context jsonb;
  v_provider jsonb;
  v_status text := 'provider_empty_real';
  v_blocked boolean := false;
  v_active_assessment boolean := false;
  v_log_id uuid;
  v_refs jsonb := '[]'::jsonb;
  v_school_id uuid;
  v_student_id uuid;
  v_class_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '42501';
  end if;

  if length(btrim(v_prompt)) = 0 then
    raise exception 'PROMPT_REQUIRED' using errcode = '22023';
  end if;

  v_context := public.ai_pedagogy_build_context(v_audience, p_student_id, p_class_id, p_component, p_skill);
  v_provider := public.ai_provider_status();
  v_active_assessment := coalesce((v_context ->> 'active_assessment')::boolean, false);
  v_school_id := coalesce(nullif(v_context #>> '{student,school_id}', '')::uuid, nullif(v_context #>> '{class,school_id}', '')::uuid);
  v_student_id := coalesce(p_student_id, nullif(v_context #>> '{student,id}', '')::uuid);
  v_class_id := coalesce(p_class_id, nullif(v_context #>> '{student,class_id}', '')::uuid, nullif(v_context #>> '{class,id}', '')::uuid);
  v_refs := coalesce(v_context #> '{recommendations,items}', '[]'::jsonb);

  if v_audience = 'student'
    and v_active_assessment
    and v_prompt ~* '(gabarito|resposta\\s+correta|qual\\s+alternativa|resolver\\s+a\\s+prova|responda\\s+a\\s+questao|responda\\s+a\\s+questão)' then
    v_blocked := true;
    v_status := 'blocked';
  elsif coalesce((v_provider ->> 'configured')::boolean, false) then
    v_status := 'prepared';
  end if;

  insert into public.ai_interaction_logs (
    user_role,
    school_id,
    class_id,
    student_id,
    request_type,
    audience,
    prompt_hash,
    prompt_excerpt,
    provider_key,
    model_name,
    status,
    context_summary,
    references_used,
    active_assessment_protected,
    error_code
  ) values (
    v_role,
    v_school_id,
    v_class_id,
    v_student_id,
    case when v_audience = 'teacher' then 'teacher_support' else 'student_question' end,
    v_audience,
    encode(digest(v_prompt, 'sha256'), 'hex'),
    left(regexp_replace(v_prompt, '\\s+', ' ', 'g'), 160),
    v_provider ->> 'provider_key',
    v_provider ->> 'model_name',
    v_status,
    jsonb_build_object(
      'component', p_component,
      'skill', p_skill,
      'provider_status', v_provider ->> 'status',
      'active_assessment', v_active_assessment
    ),
    v_refs,
    v_blocked,
    case when v_blocked then 'ACTIVE_ASSESSMENT_PROTECTION' else null end
  )
  returning id into v_log_id;

  insert into public.ai_context_references (
    interaction_id,
    school_id,
    source_type,
    source_id,
    title,
    href,
    metadata
  )
  select
    v_log_id,
    v_school_id,
    case
      when item ->> 'content_type' = 'book' then 'library'
      when item ->> 'content_type' in ('activity', 'printable_activity') then 'activity'
      else 'pedagogical_recommendation'
    end,
    coalesce(item ->> 'content_id', item ->> 'recommendation_id'),
    coalesce(item ->> 'content_title', 'Referencia pedagogica'),
    item ->> 'href',
    item
  from jsonb_array_elements(v_refs) item
  where jsonb_typeof(v_refs) = 'array';

  return jsonb_build_object(
    'interaction_id', v_log_id,
    'status', case when v_status = 'prepared' then 'PASS' when v_status = 'blocked' then 'BLOCKED' else 'EMPTY_REAL' end,
    'provider', v_provider,
    'active_assessment_protection', case when v_blocked then 'PASS' else 'NOT_TRIGGERED' end,
    'context', v_context,
    'references', v_refs,
    'response_contract', jsonb_build_object(
      'server_side_provider_required', true,
      'no_frontend_secret', true,
      'do_not_answer_active_assessment', true,
      'trace_sources', true
    )
  );
end;
$$;

alter table public.ai_provider_configs enable row level security;
alter table public.ai_interaction_logs enable row level security;
alter table public.ai_context_references enable row level security;
alter table public.ai_recommendation_runs enable row level security;

drop policy if exists ai_provider_configs_admin_select on public.ai_provider_configs;
create policy ai_provider_configs_admin_select
on public.ai_provider_configs
for select
to authenticated
using (public.is_platform_admin() or public.ai_current_role() in ('admin', 'admin_ti', 'administrador', 'administrador_nacional'));

drop policy if exists ai_interaction_logs_scope_select on public.ai_interaction_logs;
create policy ai_interaction_logs_scope_select
on public.ai_interaction_logs
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.ai_can_access_student_context(student_id, class_id, school_id)
);

drop policy if exists ai_context_references_scope_select on public.ai_context_references;
create policy ai_context_references_scope_select
on public.ai_context_references
for select
to authenticated
using (
  exists (
    select 1
    from public.ai_interaction_logs l
    where l.id = interaction_id
      and (
        l.user_id = auth.uid()
        or public.is_platform_admin()
        or public.secretaria_can_manage_school(l.school_id)
        or public.ai_can_access_student_context(l.student_id, l.class_id, l.school_id)
      )
  )
);

drop policy if exists ai_recommendation_runs_scope_select on public.ai_recommendation_runs;
create policy ai_recommendation_runs_scope_select
on public.ai_recommendation_runs
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.ai_can_access_student_context(student_id, class_id, school_id)
);

revoke all on table public.ai_provider_configs from public, anon, authenticated;
revoke all on table public.ai_interaction_logs from public, anon, authenticated;
revoke all on table public.ai_context_references from public, anon, authenticated;
revoke all on table public.ai_recommendation_runs from public, anon, authenticated;

grant select on table public.ai_interaction_logs to authenticated;
grant select on table public.ai_context_references to authenticated;
grant select on table public.ai_recommendation_runs to authenticated;

revoke all on function public.ai_current_role() from public, anon;
revoke all on function public.ai_current_student_id() from public, anon;
revoke all on function public.ai_provider_status() from public, anon;
revoke all on function public.ai_can_access_student_context(uuid, uuid, uuid) from public, anon;
revoke all on function public.ai_has_active_assessment(uuid) from public, anon;
revoke all on function public.ai_pedagogy_build_context(text, uuid, uuid, text, text) from public, anon;
revoke all on function public.ai_pedagogy_recommendations(text, uuid, uuid, text) from public, anon;
revoke all on function public.ai_pedagogy_prepare_request(text, text, uuid, uuid, text, text) from public, anon;

grant execute on function public.ai_current_role() to authenticated, service_role;
grant execute on function public.ai_current_student_id() to authenticated, service_role;
grant execute on function public.ai_provider_status() to authenticated, service_role;
grant execute on function public.ai_can_access_student_context(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.ai_has_active_assessment(uuid) to authenticated, service_role;
grant execute on function public.ai_pedagogy_build_context(text, uuid, uuid, text, text) to authenticated, service_role;
grant execute on function public.ai_pedagogy_recommendations(text, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.ai_pedagogy_prepare_request(text, text, uuid, uuid, text, text) to authenticated, service_role;

comment on table public.ai_provider_configs is
  'Configuracao server-side de provedores de IA. Nao armazena chave bruta; usa secret_ref/metadata institucional.';
comment on table public.ai_interaction_logs is
  'Auditoria de solicitacoes de IA Pedagogica com hash do prompt, contexto minimo, papel, referencias e protecao de avaliacao ativa.';
comment on function public.ai_pedagogy_prepare_request(text, text, uuid, uuid, text, text) is
  'Prepara contexto canônico e registra auditoria para assistente pedagogico. Retorna EMPTY_REAL quando nao houver provedor IA configurado.';
comment on function public.ai_pedagogy_recommendations(text, uuid, uuid, text) is
  'Recomendacoes personalizadas usando Avalia+, learning gap map, recomposicao e recomendacoes pedagogicas reais.';

do $$
declare
  v_anon_tables integer;
  v_anon_functions integer;
  v_raw_secret_columns integer;
begin
  select count(*)
    into v_anon_tables
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name like 'ai_%'
    and grantee = 'anon';

  if v_anon_tables <> 0 then
    raise exception 'VALIDACAO bloqueada: tabelas ai_* expostas para anon';
  end if;

  select count(*)
    into v_anon_functions
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name like 'ai_%'
    and grantee in ('PUBLIC', 'anon');

  if v_anon_functions <> 0 then
    raise exception 'VALIDACAO bloqueada: funcoes ai_* expostas para PUBLIC/anon';
  end if;

  select count(*)
    into v_raw_secret_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name like 'ai_%'
    and column_name in ('api_key', 'secret_key', 'token', 'password');

  if v_raw_secret_columns <> 0 then
    raise exception 'VALIDACAO bloqueada: coluna sensivel bruta em tabela ai_*';
  end if;
end $$;
