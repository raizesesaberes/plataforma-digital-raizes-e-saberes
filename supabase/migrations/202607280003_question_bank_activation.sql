-- Banco Inteligente de Questoes e Atividades
-- Missao 01.1 - ajustes de ativacao real, perfis e persistencia do construtor.

create or replace function public.current_question_bank_role()
returns text
language sql
stable
as $$
  select lower(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'app_role',
      auth.jwt() -> 'user_metadata' ->> 'app_role',
      auth.jwt() ->> 'app_role',
      auth.jwt() ->> 'role',
      ''
    )
  );
$$;

create or replace function public.has_question_bank_role(required_roles text[])
returns boolean
language sql
stable
as $$
  select public.current_question_bank_role() = any(required_roles)
    or (
      public.current_question_bank_role() = 'authenticated'
      and 'professor' = any(required_roles)
    );
$$;

alter table public.assessments
  add column if not exists component text,
  add column if not exists school_year text,
  add column if not exists archived_at timestamptz,
  add column if not exists duplicated_from_id uuid references public.assessments(id) on delete set null;

create unique index if not exists idx_question_sources_unique_name on public.question_sources (lower(name));
create index if not exists idx_assessments_owner_status on public.assessments (owner_user_id, status, updated_at desc);
create index if not exists idx_assessments_component_year on public.assessments (component, school_year);

drop policy if exists "question sources readable by staff" on public.question_sources;
create policy "question sources readable by staff" on public.question_sources
for select using (
  public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede','curator','curador',
    'revisor','revisor_pedagogico','professor','aplicador','visualizador','service_role'
  ])
);

drop policy if exists "question sources managed by curators" on public.question_sources;
create policy "question sources managed by curators" on public.question_sources
for all using (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','service_role'])
)
with check (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','service_role'])
);

drop policy if exists "published questions readable by educators" on public.question_items;
create policy "published questions readable by educators" on public.question_items
for select using (
  publication_status = 'PUBLICADO'
  or public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede','curator','curador',
    'revisor','revisor_pedagogico','service_role'
  ])
);

drop policy if exists "questions inserted by curators and reviewers" on public.question_items;
create policy "questions inserted by curators and reviewers" on public.question_items
for insert with check (
  public.has_question_bank_role(array[
    'admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','professor','service_role'
  ])
);

drop policy if exists "questions managed before publication" on public.question_items;
create policy "questions managed before publication" on public.question_items
for update using (
  public.has_question_bank_role(array[
    'admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'
  ])
)
with check (
  public.has_question_bank_role(array[
    'admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'
  ])
);

drop policy if exists "question children managed by curators" on public.question_alternatives;
create policy "question children managed by curators" on public.question_alternatives
for all using (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
)
with check (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
);

drop policy if exists "question distractors managed by curators" on public.question_distractor_analyses;
create policy "question distractors managed by curators" on public.question_distractor_analyses
for all using (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
)
with check (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
);

drop policy if exists "question media managed by curators" on public.question_media;
create policy "question media managed by curators" on public.question_media
for all using (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
)
with check (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
);

drop policy if exists "question history readable by staff" on public.question_curation_history;
create policy "question history readable by staff" on public.question_curation_history
for select using (
  public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede','curator','curador',
    'revisor','revisor_pedagogico','professor','service_role'
  ])
);

drop policy if exists "question history managed by curators" on public.question_curation_history;
create policy "question history managed by curators" on public.question_curation_history
for insert with check (
  public.has_question_bank_role(array['admin','administrador_nacional','curator','curador','revisor','revisor_pedagogico','service_role'])
);

drop policy if exists "assessments readable by owners and managers" on public.assessments;
create policy "assessments readable by owners and managers" on public.assessments
for select using (
  owner_user_id = auth.uid()
  or public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede','curator','curador',
    'revisor','revisor_pedagogico','aplicador','service_role'
  ])
);

drop policy if exists "teachers manage own assessments" on public.assessments;
create policy "teachers manage own assessments" on public.assessments
for all using (
  owner_user_id = auth.uid()
  or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','service_role'])
)
with check (
  owner_user_id = auth.uid()
  or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','professor','service_role'])
);

drop policy if exists "assessment questions follow assessment" on public.assessment_questions;
create policy "assessment questions follow assessment" on public.assessment_questions
for all using (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and (
        a.owner_user_id = auth.uid()
        or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','service_role'])
      )
  )
)
with check (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and (
        a.owner_user_id = auth.uid()
        or public.has_question_bank_role(array['admin','administrador_nacional','gestor','gestor_da_rede','service_role'])
      )
  )
  and exists (
    select 1
    from public.question_items qi
    where qi.id = question_id
      and qi.publication_status = 'PUBLICADO'
      and qi.curation_status in ('APROVADO','PUBLICADO','HOMOLOGADO')
      and qi.legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
  )
);

drop policy if exists "usage logs readable by staff" on public.question_usage_logs;
create policy "usage logs readable by staff" on public.question_usage_logs
for select using (
  public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede','curator','curador',
    'revisor','revisor_pedagogico','professor','service_role'
  ])
);

drop policy if exists "usage logs inserted by educators" on public.question_usage_logs;
create policy "usage logs inserted by educators" on public.question_usage_logs
for insert with check (
  public.has_question_bank_role(array[
    'admin','administrador_nacional','gestor','gestor_da_rede','professor','aplicador','service_role'
  ])
);
