-- Recomposicao / Nivelamento / Intervencao Pedagogica V1
-- Conecta inteligencia pedagogica do Avalia+ a grupos, planos,
-- recomendacoes canonicas e acompanhamento de evolucao.

begin;

do $$
begin
  if to_regclass('public.assessment_results') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_results nao existe';
  end if;
  if to_regclass('public.assessment_responses') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_responses nao existe';
  end if;
  if to_regclass('public.assessment_questions') is null then
    raise exception 'PRE-CHECK bloqueado: public.assessment_questions nao existe';
  end if;
  if to_regclass('public.question_items') is null then
    raise exception 'PRE-CHECK bloqueado: public.question_items nao existe';
  end if;
  if to_regclass('public.pedagogical_recommendations') is null then
    raise exception 'PRE-CHECK bloqueado: public.pedagogical_recommendations nao existe';
  end if;
  if to_regprocedure('public.avalia_plus_teacher_can_manage_class(uuid, uuid)') is null then
    raise exception 'PRE-CHECK bloqueado: public.avalia_plus_teacher_can_manage_class(uuid, uuid) nao existe';
  end if;
end $$;

create table if not exists public.recomposition_intervention_groups (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  title text not null,
  target_skill text,
  descriptor text,
  source text not null default 'assessment_gap',
  status text not null default 'active',
  created_by uuid default auth.uid(),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint recomposition_groups_status_check check (status in ('draft', 'active', 'completed', 'archived')),
  constraint recomposition_groups_title_check check (length(btrim(title)) > 0)
);

create table if not exists public.recomposition_intervention_group_students (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.recomposition_intervention_groups(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'active',
  added_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint recomposition_group_students_status_check check (status in ('active', 'completed', 'removed')),
  unique (group_id, student_id)
);

create table if not exists public.recomposition_plans (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  group_id uuid references public.recomposition_intervention_groups(id) on delete set null,
  target_type text not null,
  title text not null,
  target_skill text,
  descriptor text,
  objective text,
  period_start date,
  period_end date,
  status text not null default 'active',
  responsible_teacher_id uuid references public.teachers(id) on delete set null,
  created_by uuid default auth.uid(),
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint recomposition_plans_target_type_check check (target_type in ('student', 'group', 'class')),
  constraint recomposition_plans_status_check check (status in ('draft', 'active', 'in_progress', 'completed', 'archived')),
  constraint recomposition_plans_title_check check (length(btrim(title)) > 0),
  constraint recomposition_plans_period_check check (period_end is null or period_start is null or period_end >= period_start)
);

create table if not exists public.recomposition_plan_students (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.recomposition_plans(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint recomposition_plan_students_status_check check (status in ('active', 'completed', 'removed')),
  unique (plan_id, student_id)
);

create table if not exists public.recomposition_plan_resources (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.recomposition_plans(id) on delete cascade,
  content_type text not null,
  content_id text,
  content_title text not null,
  recommendation_id uuid references public.pedagogical_recommendations(id) on delete set null,
  source text not null default 'manual',
  status text not null default 'assigned',
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint recomposition_plan_resources_type_check check (content_type in ('printable_activity', 'activity', 'book', 'game', 'experience', 'assessment', 'video', 'material', 'free_proposal', 'other')),
  constraint recomposition_plan_resources_status_check check (status in ('assigned', 'completed', 'removed')),
  constraint recomposition_plan_resources_title_check check (length(btrim(content_title)) > 0)
);

create table if not exists public.recomposition_tracking_events (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.recomposition_plans(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  evidence jsonb not null default '{}'::jsonb,
  performed_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint recomposition_tracking_events_type_check check (event_type in ('diagnosis', 'intervention', 'assignment', 'execution', 'reassessment', 'evolution', 'status_change', 'note'))
);

create index if not exists idx_recomposition_groups_class_status on public.recomposition_intervention_groups (school_id, class_id, status, created_at desc);
create index if not exists idx_recomposition_group_students_student on public.recomposition_intervention_group_students (student_id, status);
create index if not exists idx_recomposition_plans_class_status on public.recomposition_plans (school_id, class_id, status, created_at desc);
create index if not exists idx_recomposition_plans_group on public.recomposition_plans (group_id);
create index if not exists idx_recomposition_plan_students_student on public.recomposition_plan_students (student_id, status);
create index if not exists idx_recomposition_plan_resources_plan on public.recomposition_plan_resources (plan_id, status);
create index if not exists idx_recomposition_tracking_plan on public.recomposition_tracking_events (plan_id, created_at desc);

drop trigger if exists recomposition_groups_touch_updated_at on public.recomposition_intervention_groups;
create trigger recomposition_groups_touch_updated_at
before update on public.recomposition_intervention_groups
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists recomposition_plans_touch_updated_at on public.recomposition_plans;
create trigger recomposition_plans_touch_updated_at
before update on public.recomposition_plans
for each row execute function public.institutional_touch_updated_at();

create or replace function public.recomposition_current_teacher_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.avalia_current_teacher_id();
$$;

create or replace function public.recomposition_student_in_class(
  p_school_id uuid,
  p_class_id uuid,
  p_student_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.school_id = p_school_id
      and e.class_id = p_class_id
      and e.student_id = p_student_id
      and e.status in ('active', 'ativo')
      and coalesce(s.status, 'active') in ('active', 'ativo')
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  );
$$;

create or replace function public.recomposition_can_read_plan(p_plan public.recomposition_plans)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
    and (
      public.is_platform_admin()
      or public.secretaria_can_manage_school(p_plan.school_id)
      or public.avalia_plus_teacher_can_manage_class(p_plan.class_id, p_plan.school_id)
      or exists (
        select 1
        from public.recomposition_plan_students rps
        where rps.plan_id = p_plan.id
          and rps.status <> 'removed'
          and (
            public.institutional_is_current_student(rps.student_id)
            or public.communication_guardian_can_read(p_plan.school_id, p_plan.class_id, rps.student_id, 'student')
          )
      )
    );
$$;

create or replace function public.recomposition_get_learning_gap_map(
  p_class_id uuid,
  p_date_from date default null,
  p_date_to date default null,
  p_threshold_developing numeric default 80,
  p_threshold_critical numeric default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_from date := coalesce(p_date_from, current_date - 89);
  v_to date := coalesce(p_date_to, current_date);
  v_class public.classes%rowtype;
  v_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if p_class_id is null then
    raise exception 'CLASS_REQUIRED';
  end if;
  if v_from > v_to then
    raise exception 'INVALID_PERIOD';
  end if;

  select * into v_class from public.classes where id = p_class_id;
  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;

  if not (
    public.is_platform_admin()
    or public.secretaria_can_manage_school(v_class.school_id)
    or public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id)
  ) then
    raise exception 'RECOMPOSITION_CLASS_FORBIDDEN';
  end if;

  with active_students as (
    select s.id as student_id, s.nome as student_name
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.school_id = v_class.school_id
      and e.class_id = v_class.id
      and e.status in ('active', 'ativo')
      and coalesce(s.status, 'active') in ('active', 'ativo')
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now())
  ),
  response_scope as (
    select
      ar.student_id,
      ast.student_name,
      nullif(btrim(coalesce(qi.bncc_skill, qi.reference_matrix, qi.curriculum_matrix, 'SEM_DESCRITOR')), '') as skill_code,
      nullif(btrim(coalesce(qi.knowledge_object, qi.thematic_unit, qi.internal_title, 'Habilidade avaliada')), '') as skill_label,
      count(resp.id)::integer as responses,
      count(resp.id) filter (where resp.is_correct is true)::integer as correct,
      round(avg(
        case
          when aq.points > 0 and resp.score_awarded is not null then greatest(0, least(100, (resp.score_awarded / aq.points) * 100))
          when resp.is_correct is true then 100
          else 0
        end
      ), 2) as mastery_percentage,
      max(ar.finalized_at) as last_result_at
    from public.assessment_results ar
    join public.assessment_assignments aa on aa.id = ar.assignment_id
    join active_students ast on ast.student_id = ar.student_id
    join public.assessment_responses resp on resp.attempt_id = ar.attempt_id
    join public.assessment_questions aq on aq.assessment_id = ar.assessment_id and aq.question_id = resp.question_id
    join public.question_items qi on qi.id = aq.question_id
    where aa.class_id = v_class.id
      and ar.finalized_at::date between v_from and v_to
    group by ar.student_id, ast.student_name, skill_code, skill_label
  ),
  classified as (
    select
      *,
      case
        when responses < 2 then 'AMOSTRA_INSUFICIENTE'
        when mastery_percentage < p_threshold_critical then 'CRITICA'
        when mastery_percentage < p_threshold_developing then 'EM_DESENVOLVIMENTO'
        else 'CONSOLIDADA'
      end as gap_status
    from response_scope
  ),
  skill_summary as (
    select
      skill_code,
      skill_label,
      count(distinct student_id)::integer as students_evaluated,
      round(avg(mastery_percentage), 2) as mastery_percentage,
      count(*) filter (where gap_status = 'CRITICA')::integer as critical_students,
      count(*) filter (where gap_status = 'EM_DESENVOLVIMENTO')::integer as developing_students,
      count(*) filter (where gap_status = 'CONSOLIDADA')::integer as consolidated_students
    from classified
    group by skill_code, skill_label
  ),
  student_rows as (
    select
      student_id,
      student_name,
      coalesce(jsonb_agg(
        jsonb_build_object(
          'skill_code', skill_code,
          'skill_label', skill_label,
          'responses', responses,
          'correct', correct,
          'mastery_percentage', mastery_percentage,
          'status', gap_status,
          'last_result_at', last_result_at
        )
        order by
          case gap_status when 'CRITICA' then 1 when 'EM_DESENVOLVIMENTO' then 2 when 'AMOSTRA_INSUFICIENTE' then 3 else 4 end,
          skill_code
      ), '[]'::jsonb) as skills
    from classified
    group by student_id, student_name
  )
  select jsonb_build_object(
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'class', jsonb_build_object('id', v_class.id, 'name', v_class.nome, 'school_id', v_class.school_id),
    'thresholds', jsonb_build_object('critical', p_threshold_critical, 'developing', p_threshold_developing),
    'summary', jsonb_build_object(
      'students', (select count(*) from active_students),
      'students_with_results', (select count(distinct student_id) from classified),
      'skills', (select count(*) from skill_summary),
      'critical_skills', (select count(*) from skill_summary where critical_students > 0),
      'developing_skills', (select count(*) from skill_summary where developing_students > 0)
    ),
    'skills', coalesce((select jsonb_agg(to_jsonb(skill_summary) order by critical_students desc, mastery_percentage asc, skill_code) from skill_summary), '[]'::jsonb),
    'students', coalesce((select jsonb_agg(to_jsonb(student_rows) order by student_name) from student_rows), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

create or replace function public.recomposition_content_recommendations(
  p_class_id uuid,
  p_skill text default null,
  p_limit integer default 12
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_items jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  select * into v_class from public.classes where id = p_class_id;
  if not found then
    raise exception 'CLASS_NOT_FOUND';
  end if;
  if not (
    public.is_platform_admin()
    or public.secretaria_can_manage_school(v_class.school_id)
    or public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id)
  ) then
    raise exception 'RECOMPOSITION_CLASS_FORBIDDEN';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'content_type', pr.content_type,
    'content_id', pr.content_id,
    'content_title', pr.content_title,
    'source', 'pedagogical_recommendations',
    'recommendation_id', pr.id,
    'note', pr.note
  ) order by pr.created_at desc), '[]'::jsonb)
  into v_items
  from (
    select *
    from public.pedagogical_recommendations pr
    where pr.school_id = v_class.school_id
      and pr.class_id = v_class.id
      and pr.status = 'published'
      and (
        nullif(btrim(coalesce(p_skill, '')), '') is null
        or pr.content_title ilike '%' || p_skill || '%'
        or coalesce(pr.note, '') ilike '%' || p_skill || '%'
      )
    order by pr.created_at desc
    limit greatest(1, least(coalesce(p_limit, 12), 50))
  ) pr;

  return jsonb_build_object(
    'status', case when jsonb_array_length(v_items) > 0 then 'PASS' else 'EMPTY_REAL' end,
    'items', v_items
  );
end;
$$;

create or replace function public.teacher_create_recomposition_group(
  p_class_id uuid,
  p_title text,
  p_target_skill text default null,
  p_descriptor text default null,
  p_student_ids uuid[] default '{}'::uuid[],
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_teacher_id uuid := public.recomposition_current_teacher_id();
  v_group_id uuid;
  v_student_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_teacher_id is null then raise exception 'TEACHER_CONTEXT_REQUIRED'; end if;
  select * into v_class from public.classes where id = p_class_id;
  if not found then raise exception 'CLASS_NOT_FOUND'; end if;
  if not public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id) then
    raise exception 'RECOMPOSITION_CLASS_FORBIDDEN';
  end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then raise exception 'TITLE_REQUIRED'; end if;

  insert into public.recomposition_intervention_groups (
    school_id, class_id, teacher_id, title, target_skill, descriptor, metadata
  ) values (
    v_class.school_id, v_class.id, v_teacher_id, btrim(p_title), nullif(btrim(coalesce(p_target_skill, '')), ''), nullif(btrim(coalesce(p_descriptor, '')), ''), coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_group_id;

  foreach v_student_id in array coalesce(p_student_ids, '{}'::uuid[]) loop
    if not public.recomposition_student_in_class(v_class.school_id, v_class.id, v_student_id) then
      raise exception 'STUDENT_OUT_OF_CLASS';
    end if;
    insert into public.recomposition_intervention_group_students (group_id, student_id)
    values (v_group_id, v_student_id)
    on conflict (group_id, student_id) do update set status = 'active';
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('group_id', v_group_id, 'student_count', v_count, 'status', 'PASS');
end;
$$;

create or replace function public.teacher_create_recomposition_plan(
  p_class_id uuid,
  p_title text,
  p_target_type text,
  p_target_skill text default null,
  p_descriptor text default null,
  p_objective text default null,
  p_period_start date default null,
  p_period_end date default null,
  p_student_ids uuid[] default null,
  p_group_id uuid default null,
  p_resources jsonb default '[]'::jsonb,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_teacher_id uuid := public.recomposition_current_teacher_id();
  v_plan_id uuid;
  v_student_ids uuid[] := '{}'::uuid[];
  v_student_id uuid;
  v_resource jsonb;
  v_resource_id uuid;
  v_rec jsonb;
  v_rec_ids jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_teacher_id is null then raise exception 'TEACHER_CONTEXT_REQUIRED'; end if;
  select * into v_class from public.classes where id = p_class_id;
  if not found then raise exception 'CLASS_NOT_FOUND'; end if;
  if not public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id) then
    raise exception 'RECOMPOSITION_CLASS_FORBIDDEN';
  end if;
  if p_target_type not in ('student', 'group', 'class') then raise exception 'INVALID_TARGET_TYPE'; end if;
  if nullif(btrim(coalesce(p_title, '')), '') is null then raise exception 'TITLE_REQUIRED'; end if;

  if p_target_type = 'class' then
    select coalesce(array_agg(e.student_id), '{}'::uuid[]) into v_student_ids
    from public.enrollments e
    join public.students s on s.id = e.student_id
    where e.school_id = v_class.school_id
      and e.class_id = v_class.id
      and e.status in ('active', 'ativo')
      and coalesce(s.status, 'active') in ('active', 'ativo')
      and e.enrolled_at <= now()
      and (e.ended_at is null or e.ended_at > now());
  elsif p_target_type = 'group' then
    if p_group_id is null then raise exception 'GROUP_REQUIRED'; end if;
    if not exists (
      select 1 from public.recomposition_intervention_groups g
      where g.id = p_group_id and g.school_id = v_class.school_id and g.class_id = v_class.id and g.teacher_id = v_teacher_id and g.status <> 'archived'
    ) then
      raise exception 'GROUP_FORBIDDEN';
    end if;
    select coalesce(array_agg(gs.student_id), '{}'::uuid[]) into v_student_ids
    from public.recomposition_intervention_group_students gs
    where gs.group_id = p_group_id and gs.status = 'active';
  else
    v_student_ids := coalesce(p_student_ids, '{}'::uuid[]);
  end if;

  if coalesce(array_length(v_student_ids, 1), 0) = 0 then
    raise exception 'NO_STUDENTS_SELECTED';
  end if;
  foreach v_student_id in array v_student_ids loop
    if not public.recomposition_student_in_class(v_class.school_id, v_class.id, v_student_id) then
      raise exception 'STUDENT_OUT_OF_CLASS';
    end if;
  end loop;

  insert into public.recomposition_plans (
    school_id, class_id, teacher_id, group_id, target_type, title, target_skill,
    descriptor, objective, period_start, period_end, responsible_teacher_id, metadata
  ) values (
    v_class.school_id, v_class.id, v_teacher_id, p_group_id, p_target_type, btrim(p_title),
    nullif(btrim(coalesce(p_target_skill, '')), ''), nullif(btrim(coalesce(p_descriptor, '')), ''),
    nullif(btrim(coalesce(p_objective, '')), ''), p_period_start, p_period_end, v_teacher_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_plan_id;

  foreach v_student_id in array v_student_ids loop
    insert into public.recomposition_plan_students (plan_id, student_id)
    values (v_plan_id, v_student_id)
    on conflict (plan_id, student_id) do nothing;
  end loop;

  insert into public.recomposition_tracking_events (plan_id, event_type, to_status, evidence)
  values (v_plan_id, 'diagnosis', 'active', jsonb_build_object('target_skill', p_target_skill, 'descriptor', p_descriptor, 'student_count', coalesce(array_length(v_student_ids, 1), 0)));

  if jsonb_typeof(coalesce(p_resources, '[]'::jsonb)) = 'array' then
    for v_resource in select * from jsonb_array_elements(coalesce(p_resources, '[]'::jsonb)) loop
      v_rec_ids := '[]'::jsonb;
      insert into public.recomposition_plan_resources (
        plan_id, content_type, content_id, content_title, source, metadata
      ) values (
        v_plan_id,
        lower(coalesce(v_resource ->> 'content_type', 'other')),
        nullif(btrim(coalesce(v_resource ->> 'content_id', '')), ''),
        btrim(coalesce(v_resource ->> 'content_title', v_resource ->> 'title', 'Conteudo de recomposicao')),
        coalesce(nullif(btrim(v_resource ->> 'source'), ''), 'manual'),
        v_resource
      )
      returning id into v_resource_id;

      if lower(coalesce(v_resource ->> 'content_type', 'other')) in ('printable_activity', 'activity', 'book', 'game', 'experience', 'free_proposal', 'other') then
        if p_target_type = 'class' then
          v_rec := public.teacher_create_pedagogical_recommendation(
            v_class.school_id, v_class.id, lower(coalesce(v_resource ->> 'content_type', 'other')),
            coalesce(v_resource ->> 'content_id', v_resource_id::text),
            btrim(coalesce(v_resource ->> 'content_title', v_resource ->> 'title', 'Conteudo de recomposicao')),
            'class', null,
            coalesce(v_resource ->> 'note', 'Plano de recomposicao: ' || btrim(p_title))
          );
          v_rec_ids := jsonb_build_array(v_rec ->> 'recommendation_id');
        else
          foreach v_student_id in array v_student_ids loop
            v_rec := public.teacher_create_pedagogical_recommendation(
              v_class.school_id, v_class.id, lower(coalesce(v_resource ->> 'content_type', 'other')),
              coalesce(v_resource ->> 'content_id', v_resource_id::text),
              btrim(coalesce(v_resource ->> 'content_title', v_resource ->> 'title', 'Conteudo de recomposicao')),
              'student', v_student_id,
              coalesce(v_resource ->> 'note', 'Plano de recomposicao: ' || btrim(p_title))
            );
            v_rec_ids := v_rec_ids || jsonb_build_array(v_rec ->> 'recommendation_id');
          end loop;
        end if;

        update public.recomposition_plan_resources
        set recommendation_id = nullif(v_rec_ids ->> 0, '')::uuid,
            metadata = metadata || jsonb_build_object('recommendation_ids', v_rec_ids)
        where id = v_resource_id;
      end if;
    end loop;
  end if;

  insert into public.recomposition_tracking_events (plan_id, event_type, to_status, evidence)
  values (v_plan_id, 'intervention', 'active', jsonb_build_object('resources', jsonb_array_length(coalesce(p_resources, '[]'::jsonb))));

  return jsonb_build_object('plan_id', v_plan_id, 'student_count', coalesce(array_length(v_student_ids, 1), 0), 'status', 'PASS');
end;
$$;

create or replace function public.teacher_add_recomposition_tracking_event(
  p_plan_id uuid,
  p_student_id uuid default null,
  p_event_type text default 'note',
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.recomposition_plans%rowtype;
  v_event_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_plan from public.recomposition_plans where id = p_plan_id;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  if not public.avalia_plus_teacher_can_manage_class(v_plan.class_id, v_plan.school_id) then
    raise exception 'PLAN_FORBIDDEN';
  end if;
  if p_student_id is not null and not exists (
    select 1 from public.recomposition_plan_students where plan_id = p_plan_id and student_id = p_student_id and status <> 'removed'
  ) then
    raise exception 'STUDENT_NOT_IN_PLAN';
  end if;

  insert into public.recomposition_tracking_events (plan_id, student_id, event_type, evidence)
  values (p_plan_id, p_student_id, coalesce(p_event_type, 'note'), coalesce(p_evidence, '{}'::jsonb))
  returning id into v_event_id;

  return jsonb_build_object('event_id', v_event_id, 'status', 'PASS');
end;
$$;

create or replace function public.teacher_update_recomposition_plan_status(
  p_plan_id uuid,
  p_to_status text,
  p_evidence jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan public.recomposition_plans%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_to_status not in ('draft', 'active', 'in_progress', 'completed', 'archived') then raise exception 'INVALID_STATUS'; end if;
  select * into v_plan from public.recomposition_plans where id = p_plan_id for update;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  if not public.avalia_plus_teacher_can_manage_class(v_plan.class_id, v_plan.school_id) then
    raise exception 'PLAN_FORBIDDEN';
  end if;

  update public.recomposition_plans
  set status = p_to_status, updated_by = auth.uid()
  where id = p_plan_id;

  insert into public.recomposition_tracking_events (plan_id, event_type, from_status, to_status, evidence)
  values (p_plan_id, 'status_change', v_plan.status, p_to_status, coalesce(p_evidence, '{}'::jsonb));

  return jsonb_build_object('plan_id', p_plan_id, 'status', p_to_status);
end;
$$;

create or replace function public.teacher_list_recomposition_context(
  p_class_id uuid,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_class public.classes%rowtype;
  v_gap_map jsonb;
  v_groups jsonb;
  v_plans jsonb;
  v_recommendations jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_class from public.classes where id = p_class_id;
  if not found then raise exception 'CLASS_NOT_FOUND'; end if;
  if not public.avalia_plus_teacher_can_manage_class(v_class.id, v_class.school_id) then
    raise exception 'RECOMPOSITION_CLASS_FORBIDDEN';
  end if;

  v_gap_map := public.recomposition_get_learning_gap_map(p_class_id, p_date_from, p_date_to);
  v_recommendations := public.recomposition_content_recommendations(p_class_id, null, 12);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'title', g.title,
    'target_skill', g.target_skill,
    'descriptor', g.descriptor,
    'status', g.status,
    'student_count', (select count(*) from public.recomposition_intervention_group_students gs where gs.group_id = g.id and gs.status = 'active'),
    'created_at', g.created_at
  ) order by g.created_at desc), '[]'::jsonb)
  into v_groups
  from public.recomposition_intervention_groups g
  where g.class_id = v_class.id and g.school_id = v_class.school_id and g.status <> 'archived';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'target_type', p.target_type,
    'target_skill', p.target_skill,
    'descriptor', p.descriptor,
    'objective', p.objective,
    'status', p.status,
    'student_count', (select count(*) from public.recomposition_plan_students ps where ps.plan_id = p.id and ps.status <> 'removed'),
    'resource_count', (select count(*) from public.recomposition_plan_resources pr where pr.plan_id = p.id and pr.status <> 'removed'),
    'last_event_at', (select max(te.created_at) from public.recomposition_tracking_events te where te.plan_id = p.id),
    'created_at', p.created_at
  ) order by p.created_at desc), '[]'::jsonb)
  into v_plans
  from public.recomposition_plans p
  where p.class_id = v_class.id and p.school_id = v_class.school_id and p.status <> 'archived';

  return jsonb_build_object(
    'gap_map', v_gap_map,
    'groups', v_groups,
    'plans', v_plans,
    'recommendations', v_recommendations
  );
end;
$$;

create or replace function public.secretaria_get_recomposition_overview(
  p_school_id uuid,
  p_date_from date default null,
  p_date_to date default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_from date := coalesce(p_date_from, current_date - 89);
  v_to date := coalesce(p_date_to, current_date);
  v_payload jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_school_id is null then raise exception 'SCHOOL_REQUIRED'; end if;
  if not (public.is_platform_admin() or public.secretaria_can_manage_school(p_school_id)) then
    raise exception 'RECOMPOSITION_SCHOOL_FORBIDDEN';
  end if;

  with plans as (
    select p.*, c.nome as class_name
    from public.recomposition_plans p
    join public.classes c on c.id = p.class_id
    where p.school_id = p_school_id
      and p.created_at::date between v_from and v_to
  ),
  skills as (
    select target_skill, count(*)::integer as plans, count(distinct class_id)::integer as classes
    from plans
    where target_skill is not null
    group by target_skill
  )
  select jsonb_build_object(
    'period', jsonb_build_object('date_from', v_from, 'date_to', v_to),
    'summary', jsonb_build_object(
      'plans', (select count(*) from plans),
      'active_plans', (select count(*) from plans where status in ('active', 'in_progress')),
      'completed_plans', (select count(*) from plans where status = 'completed'),
      'students', (select count(distinct ps.student_id) from public.recomposition_plan_students ps join plans p on p.id = ps.plan_id where ps.status <> 'removed'),
      'classes', (select count(distinct class_id) from plans)
    ),
    'skills', coalesce((select jsonb_agg(to_jsonb(skills) order by plans desc, target_skill) from skills), '[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id,
      'title', title,
      'class_id', class_id,
      'class_name', class_name,
      'target_type', target_type,
      'target_skill', target_skill,
      'status', status,
      'created_at', created_at
    ) order by created_at desc) from plans), '[]'::jsonb)
  ) into v_payload;

  return v_payload;
end;
$$;

create or replace function public.student_get_recomposition_context()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_student_id uuid := public.avalia_current_student_id();
  v_payload jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if v_student_id is null then raise exception 'STUDENT_CONTEXT_REQUIRED'; end if;

  select jsonb_build_object(
    'student_id', v_student_id,
    'plans', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'target_skill', p.target_skill,
      'descriptor', p.descriptor,
      'objective', p.objective,
      'status', p.status,
      'period_start', p.period_start,
      'period_end', p.period_end,
      'resources', coalesce((select jsonb_agg(jsonb_build_object(
        'content_type', r.content_type,
        'content_id', r.content_id,
        'content_title', r.content_title,
        'status', r.status
      ) order by r.created_at) from public.recomposition_plan_resources r where r.plan_id = p.id and r.status <> 'removed'), '[]'::jsonb),
      'last_event_at', (select max(te.created_at) from public.recomposition_tracking_events te where te.plan_id = p.id and (te.student_id is null or te.student_id = v_student_id))
    ) order by p.created_at desc), '[]'::jsonb)
  ) into v_payload
  from public.recomposition_plans p
  join public.recomposition_plan_students ps on ps.plan_id = p.id
  where ps.student_id = v_student_id
    and ps.status <> 'removed'
    and p.status in ('active', 'in_progress', 'completed');

  return coalesce(v_payload, jsonb_build_object('student_id', v_student_id, 'plans', '[]'::jsonb));
end;
$$;

create or replace function public.family_get_recomposition_context(
  p_student_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_student public.students%rowtype;
  v_class_id uuid;
  v_payload jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_student_id is null then raise exception 'STUDENT_REQUIRED'; end if;
  select * into v_student from public.students where id = p_student_id and coalesce(status, 'active') in ('active', 'ativo');
  if not found then raise exception 'STUDENT_NOT_FOUND'; end if;

  select e.class_id into v_class_id
  from public.enrollments e
  where e.student_id = p_student_id
    and e.school_id = v_student.school_id
    and e.status in ('active', 'ativo')
    and e.enrolled_at <= now()
    and (e.ended_at is null or e.ended_at > now())
  order by e.enrolled_at desc
  limit 1;

  if v_class_id is null or not public.communication_guardian_can_read(v_student.school_id, v_class_id, p_student_id, 'student') then
    raise exception 'FAMILY_RECOMPOSITION_FORBIDDEN';
  end if;

  select jsonb_build_object(
    'student_id', p_student_id,
    'plans', coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'target_skill', p.target_skill,
      'descriptor', p.descriptor,
      'objective', p.objective,
      'status', p.status,
      'period_start', p.period_start,
      'period_end', p.period_end,
      'resources', coalesce((select jsonb_agg(jsonb_build_object(
        'content_type', r.content_type,
        'content_title', r.content_title,
        'status', r.status
      ) order by r.created_at) from public.recomposition_plan_resources r where r.plan_id = p.id and r.status <> 'removed'), '[]'::jsonb)
    ) order by p.created_at desc), '[]'::jsonb)
  ) into v_payload
  from public.recomposition_plans p
  join public.recomposition_plan_students ps on ps.plan_id = p.id
  where ps.student_id = p_student_id
    and ps.status <> 'removed'
    and p.status in ('active', 'in_progress', 'completed');

  return coalesce(v_payload, jsonb_build_object('student_id', p_student_id, 'plans', '[]'::jsonb));
end;
$$;

alter table public.recomposition_intervention_groups enable row level security;
alter table public.recomposition_intervention_group_students enable row level security;
alter table public.recomposition_plans enable row level security;
alter table public.recomposition_plan_students enable row level security;
alter table public.recomposition_plan_resources enable row level security;
alter table public.recomposition_tracking_events enable row level security;

revoke all on public.recomposition_intervention_groups from public, anon;
revoke all on public.recomposition_intervention_group_students from public, anon;
revoke all on public.recomposition_plans from public, anon;
revoke all on public.recomposition_plan_students from public, anon;
revoke all on public.recomposition_plan_resources from public, anon;
revoke all on public.recomposition_tracking_events from public, anon;

grant select on public.recomposition_intervention_groups to authenticated;
grant select on public.recomposition_intervention_group_students to authenticated;
grant select on public.recomposition_plans to authenticated;
grant select on public.recomposition_plan_students to authenticated;
grant select on public.recomposition_plan_resources to authenticated;
grant select on public.recomposition_tracking_events to authenticated;

drop policy if exists recomposition_groups_select_authorized on public.recomposition_intervention_groups;
create policy recomposition_groups_select_authorized on public.recomposition_intervention_groups
for select to authenticated
using (
  public.is_platform_admin()
  or public.secretaria_can_manage_school(school_id)
  or public.avalia_plus_teacher_can_manage_class(class_id, school_id)
);

drop policy if exists recomposition_group_students_select_authorized on public.recomposition_intervention_group_students;
create policy recomposition_group_students_select_authorized on public.recomposition_intervention_group_students
for select to authenticated
using (
  exists (
    select 1 from public.recomposition_intervention_groups g
    where g.id = group_id
      and (
        public.is_platform_admin()
        or public.secretaria_can_manage_school(g.school_id)
        or public.avalia_plus_teacher_can_manage_class(g.class_id, g.school_id)
      )
  )
);

drop policy if exists recomposition_plans_select_authorized on public.recomposition_plans;
create policy recomposition_plans_select_authorized on public.recomposition_plans
for select to authenticated
using (public.recomposition_can_read_plan(recomposition_plans));

drop policy if exists recomposition_plan_students_select_authorized on public.recomposition_plan_students;
create policy recomposition_plan_students_select_authorized on public.recomposition_plan_students
for select to authenticated
using (
  exists (
    select 1 from public.recomposition_plans p
    where p.id = plan_id
      and public.recomposition_can_read_plan(p)
  )
);

drop policy if exists recomposition_plan_resources_select_authorized on public.recomposition_plan_resources;
create policy recomposition_plan_resources_select_authorized on public.recomposition_plan_resources
for select to authenticated
using (
  exists (
    select 1 from public.recomposition_plans p
    where p.id = plan_id
      and public.recomposition_can_read_plan(p)
  )
);

drop policy if exists recomposition_tracking_events_select_authorized on public.recomposition_tracking_events;
create policy recomposition_tracking_events_select_authorized on public.recomposition_tracking_events
for select to authenticated
using (
  exists (
    select 1 from public.recomposition_plans p
    where p.id = plan_id
      and public.recomposition_can_read_plan(p)
  )
);

revoke all on function public.recomposition_current_teacher_id() from public, anon;
revoke all on function public.recomposition_student_in_class(uuid, uuid, uuid) from public, anon;
revoke all on function public.recomposition_can_read_plan(public.recomposition_plans) from public, anon;
revoke all on function public.recomposition_get_learning_gap_map(uuid, date, date, numeric, numeric) from public, anon;
revoke all on function public.recomposition_content_recommendations(uuid, text, integer) from public, anon;
revoke all on function public.teacher_create_recomposition_group(uuid, text, text, text, uuid[], jsonb) from public, anon;
revoke all on function public.teacher_create_recomposition_plan(uuid, text, text, text, text, text, date, date, uuid[], uuid, jsonb, jsonb) from public, anon;
revoke all on function public.teacher_add_recomposition_tracking_event(uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.teacher_update_recomposition_plan_status(uuid, text, jsonb) from public, anon;
revoke all on function public.teacher_list_recomposition_context(uuid, date, date) from public, anon;
revoke all on function public.secretaria_get_recomposition_overview(uuid, date, date) from public, anon;
revoke all on function public.student_get_recomposition_context() from public, anon;
revoke all on function public.family_get_recomposition_context(uuid) from public, anon;

grant execute on function public.recomposition_current_teacher_id() to authenticated, service_role;
grant execute on function public.recomposition_student_in_class(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.recomposition_can_read_plan(public.recomposition_plans) to authenticated, service_role;
grant execute on function public.recomposition_get_learning_gap_map(uuid, date, date, numeric, numeric) to authenticated, service_role;
grant execute on function public.recomposition_content_recommendations(uuid, text, integer) to authenticated, service_role;
grant execute on function public.teacher_create_recomposition_group(uuid, text, text, text, uuid[], jsonb) to authenticated, service_role;
grant execute on function public.teacher_create_recomposition_plan(uuid, text, text, text, text, text, date, date, uuid[], uuid, jsonb, jsonb) to authenticated, service_role;
grant execute on function public.teacher_add_recomposition_tracking_event(uuid, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.teacher_update_recomposition_plan_status(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.teacher_list_recomposition_context(uuid, date, date) to authenticated, service_role;
grant execute on function public.secretaria_get_recomposition_overview(uuid, date, date) to authenticated, service_role;
grant execute on function public.student_get_recomposition_context() to authenticated, service_role;
grant execute on function public.family_get_recomposition_context(uuid) to authenticated, service_role;

comment on table public.recomposition_plans is
  'Recomposicao V1: plano canonico de intervencao ligado ao diagnostico do Avalia+ e a recomendacoes pedagogicas existentes.';

commit;
