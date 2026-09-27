-- Gamificacao 2.0 V1
-- Evolui XP/conquistas existentes com carteira, loja, avatar, rankings e trilhas.

create extension if not exists pgcrypto;

do $$
begin
  if to_regclass('public.medals') is null then
    raise exception 'PRE-CHECK bloqueado: public.medals nao existe';
  end if;
  if to_regclass('public.student_medals') is null then
    raise exception 'PRE-CHECK bloqueado: public.student_medals nao existe';
  end if;
  if to_regclass('public.recomposition_plans') is null then
    raise exception 'PRE-CHECK bloqueado: Recomposicao/Nivelamento V1 nao existe';
  end if;
end $$;

alter table public.student_medals
  add column if not exists source_type text,
  add column if not exists source_id text,
  add column if not exists xp_awarded integer not null default 0,
  add column if not exists coins_awarded integer not null default 0,
  add column if not exists awarded_by uuid references auth.users(id) on delete set null,
  add column if not exists idempotency_key text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists student_medals_idempotency_key_idx
  on public.student_medals (idempotency_key)
  where idempotency_key is not null;

create table if not exists public.gamification_settings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  rankings_enabled boolean not null default true,
  store_enabled boolean not null default true,
  wallet_enabled boolean not null default true,
  paths_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id)
);

create table if not exists public.student_gamification_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  xp_total bigint not null default 0,
  level_number integer not null default 1,
  level_label text not null default 'Nivel 1',
  coin_balance bigint not null default 0,
  goals jsonb not null default '{}'::jsonb,
  avatar_config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id),
  constraint student_gamification_non_negative_check check (xp_total >= 0 and coin_balance >= 0 and level_number >= 1)
);

create table if not exists public.gamification_transactions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  transaction_type text not null,
  currency text not null,
  amount integer not null,
  balance_after bigint not null,
  reason text not null,
  source_type text not null,
  source_id text,
  idempotency_key text not null,
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint gamification_transactions_type_check check (transaction_type in ('credit', 'debit', 'adjustment')),
  constraint gamification_transactions_currency_check check (currency in ('XP', 'COIN')),
  constraint gamification_transactions_amount_check check (amount > 0),
  unique (idempotency_key)
);

create table if not exists public.gamification_reward_rules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  event_type text not null,
  source_module text not null,
  xp_amount integer not null default 0,
  coin_amount integer not null default 0,
  medal_id uuid references public.medals(id) on delete set null,
  conditions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamification_reward_rules_module_check check (source_module in ('ATIVIDADES', 'BIBLIOTECA', 'AVALIA_PLUS', 'RECOMPOSICAO', 'TRILHA', 'CONQUISTA', 'MANUAL', 'OTHER')),
  constraint gamification_reward_rules_amount_check check (xp_amount >= 0 and coin_amount >= 0),
  unique (school_id, source_module, event_type)
);

create table if not exists public.gamification_store_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  item_key text not null,
  name text not null,
  category text not null,
  price_coins integer not null default 0,
  availability text not null default 'draft',
  asset_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamification_store_items_category_check check (category in ('avatar_skin', 'avatar_hair', 'avatar_clothing', 'avatar_accessory', 'badge', 'theme', 'other')),
  constraint gamification_store_items_status_check check (availability in ('draft', 'available', 'archived')),
  constraint gamification_store_items_price_check check (price_coins >= 0),
  unique (school_id, item_key)
);

create table if not exists public.student_gamification_inventory (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  item_id uuid not null references public.gamification_store_items(id) on delete restrict,
  acquired_at timestamptz not null default now(),
  acquisition_type text not null default 'purchase',
  transaction_id uuid references public.gamification_transactions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  constraint student_inventory_acquisition_check check (acquisition_type in ('purchase', 'reward', 'admin')),
  unique (student_id, item_id)
);

create table if not exists public.gamification_paths (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade,
  group_id uuid references public.recomposition_intervention_groups(id) on delete set null,
  title text not null,
  description text,
  target_type text not null default 'class',
  status text not null default 'draft',
  reward_xp integer not null default 0,
  reward_coins integer not null default 0,
  medal_id uuid references public.medals(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gamification_paths_target_check check (target_type in ('class', 'group', 'student', 'school')),
  constraint gamification_paths_status_check check (status in ('draft', 'published', 'archived')),
  constraint gamification_paths_rewards_check check (reward_xp >= 0 and reward_coins >= 0)
);

create table if not exists public.gamification_path_steps (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.gamification_paths(id) on delete cascade,
  position integer not null,
  source_module text not null,
  source_id text,
  title text not null,
  goal jsonb not null default '{}'::jsonb,
  reward_xp integer not null default 0,
  reward_coins integer not null default 0,
  required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint gamification_path_steps_module_check check (source_module in ('ATIVIDADES', 'BIBLIOTECA', 'AVALIA_PLUS', 'RECOMPOSICAO')),
  constraint gamification_path_steps_position_check check (position > 0),
  constraint gamification_path_steps_rewards_check check (reward_xp >= 0 and reward_coins >= 0),
  unique (path_id, position)
);

create table if not exists public.student_gamification_path_progress (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.gamification_paths(id) on delete cascade,
  step_id uuid references public.gamification_path_steps(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'not_started',
  progress_value numeric(5,2) not null default 0,
  completed_at timestamptz,
  reward_transaction_id uuid references public.gamification_transactions(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_gamification_progress_status_check check (status in ('not_started', 'in_progress', 'completed', 'skipped')),
  constraint student_gamification_progress_value_check check (progress_value >= 0 and progress_value <= 100)
);

create unique index if not exists student_gamification_path_progress_path_student_idx
  on public.student_gamification_path_progress (path_id, student_id)
  where step_id is null;

create unique index if not exists student_gamification_path_progress_step_student_idx
  on public.student_gamification_path_progress (path_id, step_id, student_id)
  where step_id is not null;

create table if not exists public.gamification_audit_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists gamification_profiles_school_class_idx
  on public.student_gamification_profiles (school_id, class_id, xp_total desc);
create index if not exists gamification_transactions_student_idx
  on public.gamification_transactions (student_id, created_at desc);
create index if not exists gamification_reward_rules_lookup_idx
  on public.gamification_reward_rules (school_id, source_module, event_type, active);
create index if not exists gamification_store_items_lookup_idx
  on public.gamification_store_items (school_id, availability, category);
create index if not exists student_inventory_student_idx
  on public.student_gamification_inventory (student_id, acquired_at desc);
create index if not exists gamification_paths_school_class_idx
  on public.gamification_paths (school_id, class_id, status, created_at desc);
create index if not exists gamification_path_steps_path_idx
  on public.gamification_path_steps (path_id, position);
create index if not exists gamification_audit_school_idx
  on public.gamification_audit_events (school_id, created_at desc);

drop trigger if exists gamification_settings_touch_updated_at on public.gamification_settings;
create trigger gamification_settings_touch_updated_at
before update on public.gamification_settings
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists student_gamification_profiles_touch_updated_at on public.student_gamification_profiles;
create trigger student_gamification_profiles_touch_updated_at
before update on public.student_gamification_profiles
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists gamification_reward_rules_touch_updated_at on public.gamification_reward_rules;
create trigger gamification_reward_rules_touch_updated_at
before update on public.gamification_reward_rules
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists gamification_store_items_touch_updated_at on public.gamification_store_items;
create trigger gamification_store_items_touch_updated_at
before update on public.gamification_store_items
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists gamification_paths_touch_updated_at on public.gamification_paths;
create trigger gamification_paths_touch_updated_at
before update on public.gamification_paths
for each row execute function public.institutional_touch_updated_at();

drop trigger if exists student_gamification_path_progress_touch_updated_at on public.student_gamification_path_progress;
create trigger student_gamification_path_progress_touch_updated_at
before update on public.student_gamification_path_progress
for each row execute function public.institutional_touch_updated_at();

create or replace function public.gamification_student_context(p_student_id uuid)
returns table(student_id uuid, school_id uuid, class_id uuid)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select
    s.id,
    coalesce(e.school_id, s.school_id),
    coalesce(e.class_id, s.class_id)
  from public.students s
  left join lateral (
    select e.school_id, e.class_id
    from public.enrollments e
    where e.student_id = s.id
      and e.status = 'active'
      and e.ended_at is null
    order by e.enrolled_at desc, e.created_at desc
    limit 1
  ) e on true
  where s.id = p_student_id
    and coalesce(s.status, 'active') in ('active', 'ativo')
  limit 1;
$$;

create or replace function public.gamification_can_read_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with ctx as (
    select * from public.gamification_student_context(p_student_id)
  )
  select exists (select 1 from ctx)
     and (
       public.institutional_is_current_student(p_student_id)
       or exists (
         select 1
         from ctx
         where public.communication_guardian_can_read(ctx.school_id, ctx.class_id, p_student_id, 'student')
       )
       or exists (
         select 1
         from public.class_teacher_memberships ctm
         join public.teachers t on t.id = ctm.teacher_id
         join ctx on ctx.class_id = ctm.class_id
         where t.profile_id = auth.uid()
           and coalesce(t.status, 'active') = 'active'
           and ctm.status = 'active'
           and ctm.started_at <= now()
           and (ctm.ended_at is null or ctm.ended_at > now())
       )
       or exists (
         select 1
         from ctx
         where public.secretaria_can_manage_school(ctx.school_id)
       )
     );
$$;

create or replace function public.gamification_can_manage_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  with ctx as (
    select * from public.gamification_student_context(p_student_id)
  )
  select exists (select 1 from ctx)
     and (
       exists (
         select 1
         from public.class_teacher_memberships ctm
         join public.teachers t on t.id = ctm.teacher_id
         join ctx on ctx.class_id = ctm.class_id
         where t.profile_id = auth.uid()
           and coalesce(t.status, 'active') = 'active'
           and ctm.status = 'active'
           and ctm.started_at <= now()
           and (ctm.ended_at is null or ctm.ended_at > now())
       )
       or exists (
         select 1
         from ctx
         where public.secretaria_can_manage_school(ctx.school_id)
       )
     );
$$;

create or replace function public.gamification_rankings_enabled(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(
    (select gs.rankings_enabled from public.gamification_settings gs where gs.school_id = p_school_id),
    (select gs.rankings_enabled from public.gamification_settings gs where gs.school_id is null limit 1),
    true
  );
$$;

create or replace function public.gamification_log_event(
  p_student_id uuid,
  p_school_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
begin
  insert into public.gamification_audit_events (student_id, school_id, actor_user_id, event_type, details)
  values (p_student_id, p_school_id, auth.uid(), p_event_type, coalesce(p_details, '{}'::jsonb));
end;
$$;

create or replace function public.gamification_ensure_profile(p_student_id uuid)
returns public.student_gamification_profiles
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_ctx record;
  v_profile public.student_gamification_profiles%rowtype;
begin
  select * into v_ctx
  from public.gamification_student_context(p_student_id);

  if v_ctx.student_id is null then
    raise exception 'Aluno nao encontrado ou inativo';
  end if;

  insert into public.student_gamification_profiles (
    student_id, school_id, class_id, xp_total, level_number, level_label
  )
  select
    s.id,
    v_ctx.school_id,
    v_ctx.class_id,
    greatest(coalesce(s.xp_total, 0), 0),
    greatest(coalesce(s.nivel, 1), 1)::integer,
    'Nivel ' || greatest(coalesce(s.nivel, 1), 1)::text
  from public.students s
  where s.id = p_student_id
  on conflict (student_id) do update
    set school_id = excluded.school_id,
        class_id = excluded.class_id,
        xp_total = greatest(public.student_gamification_profiles.xp_total, excluded.xp_total),
        level_number = greatest(public.student_gamification_profiles.level_number, excluded.level_number),
        level_label = 'Nivel ' || greatest(public.student_gamification_profiles.level_number, excluded.level_number)::text,
        updated_at = now()
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.gamification_award_event(
  p_student_id uuid,
  p_source_module text,
  p_event_type text,
  p_source_id text,
  p_reason text default null,
  p_xp integer default null,
  p_coins integer default null,
  p_medal_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_profile public.student_gamification_profiles%rowtype;
  v_rule public.gamification_reward_rules%rowtype;
  v_xp integer := 0;
  v_coins integer := 0;
  v_level integer;
  v_xp_tx public.gamification_transactions%rowtype;
  v_coin_tx public.gamification_transactions%rowtype;
  v_idem_base text;
begin
  if not public.gamification_can_manage_student(p_student_id) then
    raise exception 'Acesso negado para recompensar aluno';
  end if;

  if p_source_module not in ('ATIVIDADES', 'BIBLIOTECA', 'AVALIA_PLUS', 'RECOMPOSICAO', 'TRILHA', 'CONQUISTA', 'MANUAL', 'OTHER') then
    raise exception 'Modulo de origem invalido: %', p_source_module;
  end if;

  v_profile := public.gamification_ensure_profile(p_student_id);

  select *
    into v_rule
  from public.gamification_reward_rules grr
  where grr.active
    and grr.source_module = p_source_module
    and grr.event_type = p_event_type
    and (grr.school_id = v_profile.school_id or grr.school_id is null)
  order by grr.school_id is null, grr.created_at desc
  limit 1;

  v_xp := greatest(coalesce(p_xp, v_rule.xp_amount, 0), 0);
  v_coins := greatest(coalesce(p_coins, v_rule.coin_amount, 0), 0);
  p_medal_id := coalesce(p_medal_id, v_rule.medal_id);
  v_idem_base := p_student_id::text || ':' || p_source_module || ':' || p_event_type || ':' || coalesce(p_source_id, 'sem-origem');

  if exists (
    select 1
    from public.gamification_transactions gt
    where gt.idempotency_key in (v_idem_base || ':XP', v_idem_base || ':COIN')
  )
  or exists (
    select 1
    from public.student_medals sm
    where sm.idempotency_key = v_idem_base || ':MEDAL'
  ) then
    return jsonb_build_object(
      'status', 'IDEMPOTENT_REPLAY',
      'profile', to_jsonb(v_profile),
      'idempotency_key', v_idem_base
    );
  end if;

  if v_xp > 0 then
    update public.student_gamification_profiles
       set xp_total = xp_total + v_xp,
           level_number = greatest(1, floor((xp_total + v_xp) / 1000)::integer + 1),
           level_label = 'Nivel ' || greatest(1, floor((xp_total + v_xp) / 1000)::integer + 1)::text,
           updated_at = now()
     where student_id = p_student_id
     returning * into v_profile;

    update public.students
       set xp_total = v_profile.xp_total,
           nivel = v_profile.level_number,
           updated_at = now()
     where id = p_student_id;

    insert into public.gamification_transactions (
      student_id, school_id, class_id, transaction_type, currency, amount,
      balance_after, reason, source_type, source_id, idempotency_key, created_by, metadata
    )
    values (
      p_student_id, v_profile.school_id, v_profile.class_id, 'credit', 'XP', v_xp,
      v_profile.xp_total, coalesce(p_reason, p_event_type), p_source_module, p_source_id,
      v_idem_base || ':XP', auth.uid(), coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (idempotency_key) do nothing
    returning * into v_xp_tx;
  end if;

  if v_coins > 0 then
    update public.student_gamification_profiles
       set coin_balance = coin_balance + v_coins,
           updated_at = now()
     where student_id = p_student_id
     returning * into v_profile;

    insert into public.gamification_transactions (
      student_id, school_id, class_id, transaction_type, currency, amount,
      balance_after, reason, source_type, source_id, idempotency_key, created_by, metadata
    )
    values (
      p_student_id, v_profile.school_id, v_profile.class_id, 'credit', 'COIN', v_coins,
      v_profile.coin_balance, coalesce(p_reason, p_event_type), p_source_module, p_source_id,
      v_idem_base || ':COIN', auth.uid(), coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (idempotency_key) do nothing
    returning * into v_coin_tx;
  end if;

  if p_medal_id is not null then
    insert into public.student_medals (
      student_id, medal_id, data_conquista, source_type, source_id,
      xp_awarded, coins_awarded, awarded_by, idempotency_key, metadata
    )
    values (
      p_student_id, p_medal_id, now(), p_source_module, p_source_id,
      v_xp, v_coins, auth.uid(), v_idem_base || ':MEDAL', coalesce(p_metadata, '{}'::jsonb)
    )
    on conflict (idempotency_key) do nothing;
  end if;

  perform public.gamification_log_event(
    p_student_id,
    v_profile.school_id,
    'REWARD_GRANTED',
    jsonb_build_object(
      'source_module', p_source_module,
      'event_type', p_event_type,
      'source_id', p_source_id,
      'xp', v_xp,
      'coins', v_coins,
      'medal_id', p_medal_id
    )
  );

  return jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'xp_transaction', to_jsonb(v_xp_tx),
    'coin_transaction', to_jsonb(v_coin_tx),
    'idempotency_key', v_idem_base
  );
end;
$$;

create or replace function public.student_get_gamification_profile(p_student_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_student_id uuid;
  v_profile public.student_gamification_profiles%rowtype;
begin
  if p_student_id is null then
    select s.id
      into v_student_id
    from public.students s
    where s.user_id = auth.uid()
      and coalesce(s.status, 'active') in ('active', 'ativo')
    order by s.updated_at desc nulls last, s.created_at desc nulls last
    limit 1;
  else
    v_student_id := p_student_id;
  end if;

  if v_student_id is null or not public.gamification_can_read_student(v_student_id) then
    raise exception 'Acesso negado ao perfil de gamificacao';
  end if;

  v_profile := public.gamification_ensure_profile(v_student_id);

  return jsonb_build_object(
    'profile', to_jsonb(v_profile),
    'transactions', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.created_at desc)
      from (
        select *
        from public.gamification_transactions gt
        where gt.student_id = v_student_id
        order by gt.created_at desc
        limit 50
      ) t
    ), '[]'::jsonb),
    'medals', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', sm.id,
          'medal_id', sm.medal_id,
          'nome', m.nome,
          'descricao', m.descricao,
          'data_conquista', sm.data_conquista,
          'source_type', sm.source_type
        )
        order by sm.data_conquista desc
      )
      from public.student_medals sm
      join public.medals m on m.id = sm.medal_id
      where sm.student_id = v_student_id
    ), '[]'::jsonb),
    'inventory', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'item_id', i.item_id,
          'item', to_jsonb(gsi),
          'acquired_at', i.acquired_at
        )
        order by i.acquired_at desc
      )
      from public.student_gamification_inventory i
      join public.gamification_store_items gsi on gsi.id = i.item_id
      where i.student_id = v_student_id
    ), '[]'::jsonb),
    'paths', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'path_id', p.path_id,
          'status', p.status,
          'progress_value', p.progress_value,
          'completed_at', p.completed_at
        )
        order by p.updated_at desc
      )
      from public.student_gamification_path_progress p
      where p.student_id = v_student_id
        and p.step_id is null
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.student_purchase_store_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_student_id uuid;
  v_profile public.student_gamification_profiles%rowtype;
  v_item public.gamification_store_items%rowtype;
  v_tx public.gamification_transactions%rowtype;
  v_idem text;
begin
  select s.id into v_student_id
  from public.students s
  where s.user_id = auth.uid()
    and coalesce(s.status, 'active') in ('active', 'ativo')
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;

  if v_student_id is null or not public.institutional_is_current_student(v_student_id) then
    raise exception 'Aluno autenticado nao encontrado';
  end if;

  select * into v_item
  from public.gamification_store_items
  where id = p_item_id
    and availability = 'available';

  if v_item.id is null then
    raise exception 'Item indisponivel';
  end if;

  v_profile := public.gamification_ensure_profile(v_student_id);

  if v_item.school_id is not null and v_item.school_id <> v_profile.school_id then
    raise exception 'Item nao pertence a escola do aluno';
  end if;

  if exists (
    select 1 from public.student_gamification_inventory
    where student_id = v_student_id and item_id = p_item_id
  ) then
    raise exception 'Item ja adquirido';
  end if;

  if v_profile.coin_balance < v_item.price_coins then
    raise exception 'Saldo insuficiente';
  end if;

  update public.student_gamification_profiles
     set coin_balance = coin_balance - v_item.price_coins,
         updated_at = now()
   where student_id = v_student_id
   returning * into v_profile;

  v_idem := v_student_id::text || ':STORE_PURCHASE:' || p_item_id::text;

  insert into public.gamification_transactions (
    student_id, school_id, class_id, transaction_type, currency, amount,
    balance_after, reason, source_type, source_id, idempotency_key, created_by, metadata
  )
  values (
    v_student_id, v_profile.school_id, v_profile.class_id, 'debit', 'COIN',
    v_item.price_coins, v_profile.coin_balance, 'Compra na loja virtual',
    'STORE', p_item_id::text, v_idem, auth.uid(), jsonb_build_object('item_key', v_item.item_key)
  )
  returning * into v_tx;

  insert into public.student_gamification_inventory (
    student_id, school_id, item_id, acquisition_type, transaction_id
  )
  values (v_student_id, v_profile.school_id, p_item_id, 'purchase', v_tx.id);

  perform public.gamification_log_event(
    v_student_id,
    v_profile.school_id,
    'STORE_PURCHASE',
    jsonb_build_object('item_id', p_item_id, 'price_coins', v_item.price_coins)
  );

  return jsonb_build_object('transaction', to_jsonb(v_tx), 'item', to_jsonb(v_item), 'profile', to_jsonb(v_profile));
end;
$$;

create or replace function public.student_update_avatar_config(p_avatar jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_student_id uuid;
  v_missing integer;
  v_profile public.student_gamification_profiles%rowtype;
begin
  select s.id into v_student_id
  from public.students s
  where s.user_id = auth.uid()
    and coalesce(s.status, 'active') in ('active', 'ativo')
  order by s.updated_at desc nulls last, s.created_at desc nulls last
  limit 1;

  if v_student_id is null or not public.institutional_is_current_student(v_student_id) then
    raise exception 'Aluno autenticado nao encontrado';
  end if;

  select count(*)
    into v_missing
  from jsonb_array_elements_text(coalesce(p_avatar->'item_ids', '[]'::jsonb)) item_id
  where not exists (
    select 1
    from public.student_gamification_inventory i
    where i.student_id = v_student_id
      and i.item_id = item_id::uuid
  );

  if v_missing > 0 then
    raise exception 'Avatar contem item nao adquirido';
  end if;

  v_profile := public.gamification_ensure_profile(v_student_id);

  update public.student_gamification_profiles
     set avatar_config = coalesce(p_avatar, '{}'::jsonb),
         updated_at = now()
   where student_id = v_student_id
   returning * into v_profile;

  perform public.gamification_log_event(v_student_id, v_profile.school_id, 'AVATAR_UPDATED', coalesce(p_avatar, '{}'::jsonb));

  return jsonb_build_object('profile', to_jsonb(v_profile));
end;
$$;

create or replace function public.teacher_get_gamification_ranking(
  p_scope text,
  p_class_id uuid default null,
  p_school_id uuid default null,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_school_id uuid;
begin
  if p_scope not in ('class', 'school') then
    raise exception 'Escopo invalido';
  end if;

  if p_scope = 'class' then
    select c.school_id into v_school_id from public.classes c where c.id = p_class_id;
    if v_school_id is null then
      raise exception 'Turma nao encontrada';
    end if;
    if not exists (
      select 1
      from public.class_teacher_memberships ctm
      join public.teachers t on t.id = ctm.teacher_id
      where ctm.class_id = p_class_id
        and t.profile_id = auth.uid()
        and coalesce(t.status, 'active') = 'active'
        and ctm.status = 'active'
        and ctm.started_at <= now()
        and (ctm.ended_at is null or ctm.ended_at > now())
    ) and not public.secretaria_can_manage_school(v_school_id) then
      raise exception 'Acesso negado ao ranking da turma';
    end if;
  else
    v_school_id := p_school_id;
    if v_school_id is null or not public.secretaria_can_manage_school(v_school_id) then
      raise exception 'Acesso negado ao ranking da escola';
    end if;
  end if;

  if not public.gamification_rankings_enabled(v_school_id) then
    return jsonb_build_object('status', 'DISABLED', 'rankings', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'status', 'PASS',
    'scope', p_scope,
    'school_id', v_school_id,
    'rankings', coalesce((
      select jsonb_agg(row_to_json(r))
      from (
        select
          row_number() over (order by gp.xp_total desc, gp.coin_balance desc, s.nome asc) as rank,
          gp.student_id,
          s.nome as student_name,
          gp.class_id,
          c.nome as class_name,
          gp.xp_total,
          gp.coin_balance,
          gp.level_number
        from public.student_gamification_profiles gp
        join public.students s on s.id = gp.student_id
        left join public.classes c on c.id = gp.class_id
        where gp.school_id = v_school_id
          and (p_scope = 'school' or gp.class_id = p_class_id)
        order by gp.xp_total desc, gp.coin_balance desc, s.nome asc
        limit greatest(1, least(coalesce(p_limit, 50), 100))
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.teacher_create_gamification_path(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_class_id uuid := nullif(p_payload->>'class_id', '')::uuid;
  v_group_id uuid := nullif(p_payload->>'group_id', '')::uuid;
  v_school_id uuid;
  v_path public.gamification_paths%rowtype;
  v_step jsonb;
  v_position integer := 1;
begin
  if v_class_id is null then
    raise exception 'class_id e obrigatorio para trilha V1';
  end if;

  select c.school_id into v_school_id from public.classes c where c.id = v_class_id;
  if v_school_id is null then
    raise exception 'Turma nao encontrada';
  end if;

  if not exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t on t.id = ctm.teacher_id
    where ctm.class_id = v_class_id
      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
  ) and not public.secretaria_can_manage_school(v_school_id) then
    raise exception 'Acesso negado para criar trilha';
  end if;

  insert into public.gamification_paths (
    school_id, class_id, group_id, title, description, target_type, status,
    reward_xp, reward_coins, medal_id, metadata
  )
  values (
    v_school_id,
    v_class_id,
    v_group_id,
    coalesce(nullif(p_payload->>'title', ''), 'Trilha gamificada'),
    p_payload->>'description',
    coalesce(nullif(p_payload->>'target_type', ''), 'class'),
    coalesce(nullif(p_payload->>'status', ''), 'draft'),
    greatest(coalesce((p_payload->>'reward_xp')::integer, 0), 0),
    greatest(coalesce((p_payload->>'reward_coins')::integer, 0), 0),
    nullif(p_payload->>'medal_id', '')::uuid,
    coalesce(p_payload->'metadata', '{}'::jsonb)
  )
  returning * into v_path;

  for v_step in
    select value from jsonb_array_elements(coalesce(p_payload->'steps', '[]'::jsonb))
  loop
    insert into public.gamification_path_steps (
      path_id, position, source_module, source_id, title, goal, reward_xp, reward_coins, required, metadata
    )
    values (
      v_path.id,
      coalesce((v_step->>'position')::integer, v_position),
      v_step->>'source_module',
      v_step->>'source_id',
      coalesce(nullif(v_step->>'title', ''), 'Etapa'),
      coalesce(v_step->'goal', '{}'::jsonb),
      greatest(coalesce((v_step->>'reward_xp')::integer, 0), 0),
      greatest(coalesce((v_step->>'reward_coins')::integer, 0), 0),
      coalesce((v_step->>'required')::boolean, true),
      coalesce(v_step->'metadata', '{}'::jsonb)
    );
    v_position := v_position + 1;
  end loop;

  return jsonb_build_object('path', to_jsonb(v_path), 'steps_count', v_position - 1);
end;
$$;

create or replace function public.gamification_mark_path_step_complete(
  p_path_id uuid,
  p_step_id uuid,
  p_student_id uuid,
  p_progress numeric default 100,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_path public.gamification_paths%rowtype;
  v_step public.gamification_path_steps%rowtype;
  v_reward jsonb;
  v_required_count integer;
  v_completed_count integer;
begin
  select * into v_path from public.gamification_paths where id = p_path_id and status = 'published';
  if v_path.id is null then
    raise exception 'Trilha publicada nao encontrada';
  end if;

  if not public.gamification_can_manage_student(p_student_id) then
    raise exception 'Acesso negado para atualizar trilha do aluno';
  end if;

  select * into v_step
  from public.gamification_path_steps
  where id = p_step_id
    and path_id = p_path_id;

  if v_step.id is null then
    raise exception 'Etapa nao encontrada';
  end if;

  insert into public.student_gamification_path_progress (
    path_id, step_id, student_id, status, progress_value, completed_at, metadata
  )
  values (
    p_path_id, p_step_id, p_student_id,
    case when p_progress >= 100 then 'completed' else 'in_progress' end,
    least(greatest(coalesce(p_progress, 0), 0), 100),
    case when p_progress >= 100 then now() else null end,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (path_id, step_id, student_id) where step_id is not null
  do update
     set status = excluded.status,
         progress_value = greatest(public.student_gamification_path_progress.progress_value, excluded.progress_value),
         completed_at = coalesce(public.student_gamification_path_progress.completed_at, excluded.completed_at),
         metadata = public.student_gamification_path_progress.metadata || excluded.metadata,
         updated_at = now();

  if p_progress >= 100 and (v_step.reward_xp > 0 or v_step.reward_coins > 0) then
    v_reward := public.gamification_award_event(
      p_student_id,
      'TRILHA',
      'STEP_COMPLETED',
      p_step_id::text,
      'Etapa de trilha concluida',
      v_step.reward_xp,
      v_step.reward_coins,
      null,
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  select count(*) into v_required_count
  from public.gamification_path_steps
  where path_id = p_path_id
    and required;

  select count(*) into v_completed_count
  from public.gamification_path_steps ps
  join public.student_gamification_path_progress sp
    on sp.step_id = ps.id
   and sp.student_id = p_student_id
   and sp.status = 'completed'
  where ps.path_id = p_path_id
    and ps.required;

  if v_required_count > 0 and v_completed_count >= v_required_count then
    insert into public.student_gamification_path_progress (
      path_id, step_id, student_id, status, progress_value, completed_at, metadata
    )
    values (p_path_id, null, p_student_id, 'completed', 100, now(), jsonb_build_object('completed_steps', v_completed_count))
    on conflict (path_id, student_id) where step_id is null
    do update
       set status = 'completed',
           progress_value = 100,
           completed_at = coalesce(public.student_gamification_path_progress.completed_at, now()),
           updated_at = now();

    if v_path.reward_xp > 0 or v_path.reward_coins > 0 or v_path.medal_id is not null then
      v_reward := public.gamification_award_event(
        p_student_id,
        'TRILHA',
        'PATH_COMPLETED',
        p_path_id::text,
        'Trilha concluida',
        v_path.reward_xp,
        v_path.reward_coins,
        v_path.medal_id,
        jsonb_build_object('completed_steps', v_completed_count)
      );
    end if;
  else
    insert into public.student_gamification_path_progress (
      path_id, step_id, student_id, status, progress_value, metadata
    )
    values (
      p_path_id, null, p_student_id, 'in_progress',
      case when v_required_count = 0 then 0 else round((v_completed_count::numeric / v_required_count::numeric) * 100, 2) end,
      jsonb_build_object('completed_steps', v_completed_count, 'required_steps', v_required_count)
    )
    on conflict (path_id, student_id) where step_id is null
    do update
       set status = 'in_progress',
           progress_value = excluded.progress_value,
           metadata = excluded.metadata,
           updated_at = now();
  end if;

  return jsonb_build_object(
    'path_id', p_path_id,
    'step_id', p_step_id,
    'student_id', p_student_id,
    'completed_steps', v_completed_count,
    'required_steps', v_required_count,
    'reward', coalesce(v_reward, '{}'::jsonb)
  );
end;
$$;

alter table public.gamification_settings enable row level security;
alter table public.student_gamification_profiles enable row level security;
alter table public.gamification_transactions enable row level security;
alter table public.gamification_reward_rules enable row level security;
alter table public.gamification_store_items enable row level security;
alter table public.student_gamification_inventory enable row level security;
alter table public.gamification_paths enable row level security;
alter table public.gamification_path_steps enable row level security;
alter table public.student_gamification_path_progress enable row level security;
alter table public.gamification_audit_events enable row level security;

drop policy if exists gamification_profiles_select_authorized on public.student_gamification_profiles;
create policy gamification_profiles_select_authorized on public.student_gamification_profiles
for select to authenticated
using (public.gamification_can_read_student(student_id));

drop policy if exists gamification_transactions_select_authorized on public.gamification_transactions;
create policy gamification_transactions_select_authorized on public.gamification_transactions
for select to authenticated
using (public.gamification_can_read_student(student_id));

drop policy if exists gamification_inventory_select_authorized on public.student_gamification_inventory;
create policy gamification_inventory_select_authorized on public.student_gamification_inventory
for select to authenticated
using (public.gamification_can_read_student(student_id));

drop policy if exists gamification_path_progress_select_authorized on public.student_gamification_path_progress;
create policy gamification_path_progress_select_authorized on public.student_gamification_path_progress
for select to authenticated
using (public.gamification_can_read_student(student_id));

drop policy if exists gamification_settings_select_authorized on public.gamification_settings;
create policy gamification_settings_select_authorized on public.gamification_settings
for select to authenticated
using (school_id is null or public.secretaria_can_manage_school(school_id));

drop policy if exists gamification_store_items_select_available on public.gamification_store_items;
create policy gamification_store_items_select_available on public.gamification_store_items
for select to authenticated
using (
  availability = 'available'
  or (school_id is not null and public.secretaria_can_manage_school(school_id))
  or public.is_platform_admin()
);

drop policy if exists gamification_paths_select_authorized on public.gamification_paths;
create policy gamification_paths_select_authorized on public.gamification_paths
for select to authenticated
using (
  public.secretaria_can_manage_school(school_id)
  or exists (
    select 1
    from public.class_teacher_memberships ctm
    join public.teachers t on t.id = ctm.teacher_id
    where ctm.class_id = gamification_paths.class_id
      and t.profile_id = auth.uid()
      and coalesce(t.status, 'active') = 'active'
      and ctm.status = 'active'
      and ctm.started_at <= now()
      and (ctm.ended_at is null or ctm.ended_at > now())
  )
  or exists (
    select 1
    from public.enrollments e
    where e.class_id = gamification_paths.class_id
      and e.status = 'active'
      and e.ended_at is null
      and public.gamification_can_read_student(e.student_id)
  )
);

drop policy if exists gamification_path_steps_select_authorized on public.gamification_path_steps;
create policy gamification_path_steps_select_authorized on public.gamification_path_steps
for select to authenticated
using (
  exists (
    select 1
    from public.gamification_paths gp
    where gp.id = gamification_path_steps.path_id
      and (
        public.secretaria_can_manage_school(gp.school_id)
        or exists (
          select 1
          from public.enrollments e
          where e.class_id = gp.class_id
            and e.status = 'active'
            and e.ended_at is null
            and public.gamification_can_read_student(e.student_id)
        )
      )
  )
);

revoke all on public.gamification_settings from public, anon;
revoke all on public.student_gamification_profiles from public, anon;
revoke all on public.gamification_transactions from public, anon;
revoke all on public.gamification_reward_rules from public, anon;
revoke all on public.gamification_store_items from public, anon;
revoke all on public.student_gamification_inventory from public, anon;
revoke all on public.gamification_paths from public, anon;
revoke all on public.gamification_path_steps from public, anon;
revoke all on public.student_gamification_path_progress from public, anon;
revoke all on public.gamification_audit_events from public, anon;

grant select on public.gamification_settings to authenticated;
grant select on public.student_gamification_profiles to authenticated;
grant select on public.gamification_transactions to authenticated;
grant select on public.gamification_store_items to authenticated;
grant select on public.student_gamification_inventory to authenticated;
grant select on public.gamification_paths to authenticated;
grant select on public.gamification_path_steps to authenticated;
grant select on public.student_gamification_path_progress to authenticated;

grant all on public.gamification_settings to service_role;
grant all on public.student_gamification_profiles to service_role;
grant all on public.gamification_transactions to service_role;
grant all on public.gamification_reward_rules to service_role;
grant all on public.gamification_store_items to service_role;
grant all on public.student_gamification_inventory to service_role;
grant all on public.gamification_paths to service_role;
grant all on public.gamification_path_steps to service_role;
grant all on public.student_gamification_path_progress to service_role;
grant all on public.gamification_audit_events to service_role;

revoke all on function public.gamification_student_context(uuid) from public, anon;
revoke all on function public.gamification_can_read_student(uuid) from public, anon;
revoke all on function public.gamification_can_manage_student(uuid) from public, anon;
revoke all on function public.gamification_rankings_enabled(uuid) from public, anon;
revoke all on function public.gamification_log_event(uuid, uuid, text, jsonb) from public, anon;
revoke all on function public.gamification_ensure_profile(uuid) from public, anon;
revoke all on function public.gamification_award_event(uuid, text, text, text, text, integer, integer, uuid, jsonb) from public, anon;
revoke all on function public.student_get_gamification_profile(uuid) from public, anon;
revoke all on function public.student_purchase_store_item(uuid) from public, anon;
revoke all on function public.student_update_avatar_config(jsonb) from public, anon;
revoke all on function public.teacher_get_gamification_ranking(text, uuid, uuid, integer) from public, anon;
revoke all on function public.teacher_create_gamification_path(jsonb) from public, anon;
revoke all on function public.gamification_mark_path_step_complete(uuid, uuid, uuid, numeric, jsonb) from public, anon;

grant execute on function public.gamification_student_context(uuid) to authenticated, service_role;
grant execute on function public.gamification_can_read_student(uuid) to authenticated, service_role;
grant execute on function public.gamification_can_manage_student(uuid) to authenticated, service_role;
grant execute on function public.gamification_rankings_enabled(uuid) to authenticated, service_role;
grant execute on function public.gamification_log_event(uuid, uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.gamification_ensure_profile(uuid) to authenticated, service_role;
grant execute on function public.gamification_award_event(uuid, text, text, text, text, integer, integer, uuid, jsonb) to authenticated, service_role;
grant execute on function public.student_get_gamification_profile(uuid) to authenticated, service_role;
grant execute on function public.student_purchase_store_item(uuid) to authenticated, service_role;
grant execute on function public.student_update_avatar_config(jsonb) to authenticated, service_role;
grant execute on function public.teacher_get_gamification_ranking(text, uuid, uuid, integer) to authenticated, service_role;
grant execute on function public.teacher_create_gamification_path(jsonb) to authenticated, service_role;
grant execute on function public.gamification_mark_path_step_complete(uuid, uuid, uuid, numeric, jsonb) to authenticated, service_role;

do $$
begin
  if (
    select count(*)
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'gamification_settings',
        'student_gamification_profiles',
        'gamification_transactions',
        'gamification_reward_rules',
        'gamification_store_items',
        'student_gamification_inventory',
        'gamification_paths',
        'gamification_path_steps',
        'student_gamification_path_progress',
        'gamification_audit_events'
      )
  ) <> 10 then
    raise exception 'VALIDACAO bloqueada: tabelas Gamificacao 2.0 incompletas';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'public')
      and table_name like '%gamification%'
  ) then
    raise exception 'VALIDACAO bloqueada: tabelas Gamificacao expostas para anon/public';
  end if;

  if exists (
    select 1
    from information_schema.role_routine_grants
    where routine_schema = 'public'
      and grantee = 'anon'
      and routine_name like '%gamification%'
  ) then
    raise exception 'VALIDACAO bloqueada: RPC Gamificacao exposta para anon';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name like '%gamification%'
      and column_name in ('amount_brl', 'amount_money', 'payment_token', 'credit_card', 'real_money')
  ) then
    raise exception 'VALIDACAO bloqueada: campo de dinheiro real em Gamificacao';
  end if;

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
    raise exception 'VALIDACAO bloqueada: medals/student_medals com policy TRUE';
  end if;
end $$;

comment on table public.student_gamification_profiles is
  'Perfil canonico de gamificacao 2.0 por aluno: XP, nivel, moedas e avatar.';
comment on table public.gamification_transactions is
  'Ledger server-side de XP/moedas. Saldo nao deve ser confiado ao cliente.';
comment on table public.gamification_reward_rules is
  'Regras idempotentes de recompensa para eventos canonicos da plataforma.';
comment on table public.gamification_paths is
  'Trilhas gamificadas que integram Atividades, Biblioteca, Avalia+ e Recomposicao.';
