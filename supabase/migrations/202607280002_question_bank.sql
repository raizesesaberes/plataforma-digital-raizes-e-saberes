-- Banco Inteligente de Questoes e Atividades
-- Missao 01 - arquitetura tecnica, curadoria, rastreabilidade e base demonstrativa.
-- Nenhum item externo e publicado automaticamente por esta migration.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'question_legal_classification') then
    create type public.question_legal_classification as enum (
      'ITEM_OFICIAL_PUBLICAMENTE_LIBERADO',
      'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
      'ITEM_ADAPTADO_LICENCA_COMPATIVEL',
      'ITEM_EM_ANALISE_DIREITOS',
      'ITEM_BLOQUEADO_PUBLICACAO'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'question_curation_status') then
    create type public.question_curation_status as enum (
      'RASCUNHO',
      'COLETADO',
      'LICENCA_EM_ANALISE',
      'BLOQUEADO_POR_LICENCA',
      'AGUARDANDO_REVISAO_PEDAGOGICA',
      'EM_REVISAO',
      'CORRECAO_SOLICITADA',
      'APROVADO',
      'PUBLICADO',
      'HOMOLOGADO',
      'DESATUALIZADO',
      'ARQUIVADO',
      'REPROVADO'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'question_publication_status') then
    create type public.question_publication_status as enum (
      'NAO_PUBLICADO',
      'PUBLICADO',
      'SUSPENSO',
      'ARQUIVADO'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'assessment_status') then
    create type public.assessment_status as enum (
      'RASCUNHO',
      'PRONTA',
      'ATRIBUIDA',
      'APLICADA',
      'ARQUIVADA'
    );
  end if;
end $$;

create or replace function public.has_question_bank_role(required_roles text[])
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'app_role', auth.jwt() ->> 'role', '') = any(required_roles);
$$;

create table if not exists public.question_licenses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  license_type text not null,
  license_url text,
  allows_adaptation boolean not null default false,
  allows_commercial_use boolean not null default false,
  requires_attribution boolean not null default true,
  publication_allowed boolean not null default false,
  legal_notes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null,
  institution_name text,
  official_url text,
  author_name text,
  license_id uuid not null references public.question_licenses(id),
  legal_status text not null,
  curation_status public.question_curation_status not null default 'LICENCA_EM_ANALISE',
  source_checked_at timestamptz,
  responsible_user_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (official_url is null or official_url ~* '^https://')
);

create table if not exists public.question_items (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  internal_title text not null,
  component text not null,
  stage text not null,
  school_year text not null,
  thematic_unit text,
  knowledge_object text,
  bncc_skill text,
  reference_matrix text,
  proficiency_level text,
  difficulty text,
  cognitive_process text,
  question_type text not null,
  statement text not null,
  base_text text,
  correct_answer text,
  justification text,
  success_feedback text,
  error_feedback text,
  recommended_intervention text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  accessibility_notes text,
  source_id uuid not null references public.question_sources(id),
  author_name text not null,
  license_id uuid not null references public.question_licenses(id),
  legal_classification public.question_legal_classification not null,
  curation_status public.question_curation_status not null default 'RASCUNHO',
  publication_status public.question_publication_status not null default 'NAO_PUBLICADO',
  version text not null default '1.0',
  reviewer_user_id uuid,
  reviewer_name text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (
    publication_status <> 'PUBLICADO'
    or curation_status in ('APROVADO', 'PUBLICADO', 'HOMOLOGADO')
  ),
  check (
    legal_classification <> 'ITEM_BLOQUEADO_PUBLICACAO'
    or publication_status <> 'PUBLICADO'
  )
);

create table if not exists public.question_alternatives (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_items(id) on delete cascade,
  label text not null,
  body text not null,
  is_correct boolean not null default false,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (question_id, label),
  unique (question_id, position)
);

create table if not exists public.question_distractor_analyses (
  id uuid primary key default gen_random_uuid(),
  alternative_id uuid not null references public.question_alternatives(id) on delete cascade,
  analysis text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.question_media (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_items(id) on delete cascade,
  media_type text not null check (media_type in ('imagem', 'audio', 'video', 'grafico', 'tabela', 'interativo', 'arquivo')),
  url text,
  alt_text text,
  transcript text,
  license_id uuid references public.question_licenses(id),
  created_at timestamptz not null default now()
);

create table if not exists public.question_curation_history (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_items(id) on delete cascade,
  actor_user_id uuid,
  actor_role text,
  previous_status public.question_curation_status,
  new_status public.question_curation_status not null,
  legal_classification public.question_legal_classification,
  comment text not null,
  snapshot jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  owner_user_id uuid,
  owner_role text not null default 'professor',
  class_id uuid,
  class_name text,
  status public.assessment_status not null default 'RASCUNHO',
  cover_template text,
  instructions text,
  application_date date,
  total_points numeric(8,2) not null default 0,
  digital_application_enabled boolean not null default false,
  pdf_generation_ready boolean not null default false,
  answer_key_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_sections (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  title text not null,
  instructions text,
  position integer not null,
  created_at timestamptz not null default now(),
  unique (assessment_id, position)
);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  section_id uuid references public.assessment_sections(id) on delete set null,
  question_id uuid not null references public.question_items(id),
  position integer not null,
  points numeric(8,2) not null default 1,
  version_snapshot jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (assessment_id, position)
);

create table if not exists public.question_usage_logs (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_items(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  user_id uuid,
  user_role text,
  class_id uuid,
  class_name text,
  usage_type text not null,
  used_at timestamptz not null default now(),
  metadata jsonb not null default '{}'
);

create index if not exists idx_question_items_lookup on public.question_items (component, school_year, bncc_skill, difficulty, question_type);
create index if not exists idx_question_items_curation on public.question_items (curation_status, publication_status, legal_classification);
create index if not exists idx_question_items_source on public.question_items (source_id);
create index if not exists idx_question_usage_question on public.question_usage_logs (question_id, used_at desc);
create index if not exists idx_assessment_questions_assessment on public.assessment_questions (assessment_id, position);
create index if not exists idx_question_history_question on public.question_curation_history (question_id, created_at desc);

alter table public.question_licenses enable row level security;
alter table public.question_sources enable row level security;
alter table public.question_items enable row level security;
alter table public.question_alternatives enable row level security;
alter table public.question_distractor_analyses enable row level security;
alter table public.question_media enable row level security;
alter table public.question_curation_history enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_sections enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.question_usage_logs enable row level security;

drop policy if exists "question licenses readable" on public.question_licenses;
create policy "question licenses readable" on public.question_licenses
for select using (true);

drop policy if exists "question sources readable by staff" on public.question_sources;
create policy "question sources readable by staff" on public.question_sources
for select using (public.has_question_bank_role(array['admin','gestor','curator','revisor','professor','aplicador','visualizador','service_role']));

drop policy if exists "question sources managed by curators" on public.question_sources;
create policy "question sources managed by curators" on public.question_sources
for all using (public.has_question_bank_role(array['admin','curator','service_role']))
with check (public.has_question_bank_role(array['admin','curator','service_role']));

drop policy if exists "published questions readable by educators" on public.question_items;
create policy "published questions readable by educators" on public.question_items
for select using (
  publication_status = 'PUBLICADO'
  or public.has_question_bank_role(array['admin','gestor','curator','revisor','service_role'])
);

drop policy if exists "questions inserted by curators and reviewers" on public.question_items;
create policy "questions inserted by curators and reviewers" on public.question_items
for insert with check (public.has_question_bank_role(array['admin','curator','revisor','professor','service_role']));

drop policy if exists "questions managed before publication" on public.question_items;
create policy "questions managed before publication" on public.question_items
for update using (public.has_question_bank_role(array['admin','curator','revisor','service_role']))
with check (public.has_question_bank_role(array['admin','curator','revisor','service_role']));

drop policy if exists "question children readable with question" on public.question_alternatives;
create policy "question children readable with question" on public.question_alternatives
for select using (exists (select 1 from public.question_items qi where qi.id = question_id));

drop policy if exists "question distractors readable with question" on public.question_distractor_analyses;
create policy "question distractors readable with question" on public.question_distractor_analyses
for select using (
  exists (
    select 1
    from public.question_alternatives qa
    join public.question_items qi on qi.id = qa.question_id
    where qa.id = alternative_id
  )
);

drop policy if exists "question media readable with question" on public.question_media;
create policy "question media readable with question" on public.question_media
for select using (exists (select 1 from public.question_items qi where qi.id = question_id));

drop policy if exists "question children managed by curators" on public.question_alternatives;
create policy "question children managed by curators" on public.question_alternatives
for all using (public.has_question_bank_role(array['admin','curator','revisor','service_role']))
with check (public.has_question_bank_role(array['admin','curator','revisor','service_role']));

drop policy if exists "question history readable by staff" on public.question_curation_history;
create policy "question history readable by staff" on public.question_curation_history
for select using (public.has_question_bank_role(array['admin','gestor','curator','revisor','professor','service_role']));

drop policy if exists "question history managed by curators" on public.question_curation_history;
create policy "question history managed by curators" on public.question_curation_history
for insert with check (public.has_question_bank_role(array['admin','curator','revisor','service_role']));

drop policy if exists "assessments readable by owners and managers" on public.assessments;
create policy "assessments readable by owners and managers" on public.assessments
for select using (owner_user_id = auth.uid() or public.has_question_bank_role(array['admin','gestor','curator','revisor','aplicador','service_role']));

drop policy if exists "teachers manage own assessments" on public.assessments;
create policy "teachers manage own assessments" on public.assessments
for all using (owner_user_id = auth.uid() or public.has_question_bank_role(array['admin','gestor','service_role']))
with check (owner_user_id = auth.uid() or public.has_question_bank_role(array['admin','gestor','professor','service_role']));

drop policy if exists "assessment sections follow assessment" on public.assessment_sections;
create policy "assessment sections follow assessment" on public.assessment_sections
for all using (exists (select 1 from public.assessments a where a.id = assessment_id))
with check (exists (select 1 from public.assessments a where a.id = assessment_id));

drop policy if exists "assessment questions follow assessment" on public.assessment_questions;
create policy "assessment questions follow assessment" on public.assessment_questions
for all using (exists (select 1 from public.assessments a where a.id = assessment_id))
with check (exists (select 1 from public.assessments a where a.id = assessment_id));

drop policy if exists "usage logs readable by staff" on public.question_usage_logs;
create policy "usage logs readable by staff" on public.question_usage_logs
for select using (public.has_question_bank_role(array['admin','gestor','curator','revisor','professor','service_role']));

drop policy if exists "usage logs inserted by educators" on public.question_usage_logs;
create policy "usage logs inserted by educators" on public.question_usage_logs
for insert with check (public.has_question_bank_role(array['admin','gestor','professor','aplicador','service_role']));

with demo_license as (
  insert into public.question_licenses (
    name,
    license_type,
    allows_adaptation,
    allows_commercial_use,
    requires_attribution,
    publication_allowed,
    legal_notes
  ) values (
    'Uso interno demonstrativo Raizes e Saberes',
    'Autoral demonstrativo',
    true,
    false,
    true,
    true,
    'Base ficticia criada para homologacao do modulo. Nao contem questoes externas.'
  )
  on conflict (name) do update set updated_at = now()
  returning id
), demo_source as (
  insert into public.question_sources (
    name,
    source_type,
    institution_name,
    author_name,
    license_id,
    legal_status,
    curation_status,
    source_checked_at,
    notes
  )
  select
    'Raizes e Saberes - Banco Demonstrativo Ficticio',
    'autoral',
    'Raizes e Saberes',
    'Equipe Pedagogica Raizes e Saberes',
    id,
    'Autorizado para demonstracao interna',
    'HOMOLOGADO',
    '2026-07-28T00:00:00-03:00',
    'Todos os itens deste seed sao ficticios e autorais.'
  from demo_license
  on conflict do nothing
  returning id, license_id
), source_row as (
  select id, license_id from demo_source
  union all
  select qs.id, qs.license_id
  from public.question_sources qs
  where qs.name = 'Raizes e Saberes - Banco Demonstrativo Ficticio'
  limit 1
), q as (
  insert into public.question_items (
    code, internal_title, component, stage, school_year, thematic_unit, knowledge_object,
    bncc_skill, reference_matrix, proficiency_level, difficulty, cognitive_process,
    question_type, statement, base_text, correct_answer, justification,
    success_feedback, error_feedback, recommended_intervention, estimated_minutes,
    accessibility_notes, source_id, author_name, license_id, legal_classification,
    curation_status, publication_status, version, reviewer_name, last_reviewed_at, published_at
  )
  select * from (
    select
      'RS-DEMO-LP2-001','Localizar informacao explicita em bilhete','Lingua Portuguesa','Ensino Fundamental - Anos Iniciais','2o ano','Leitura/escuta','Compreensao em leitura',
      'EF02LP12','Matriz SAEB - localizar informacao explicita em texto curto','Basico','Facil','Localizar informacao',
      'Multipla escolha','Leia o bilhete e responda.','Lia, leve seu caderno azul para a aula de leitura. Professora Ana.','A','O bilhete pede que Lia leve o caderno azul.',
      'Voce localizou a informacao pedida no bilhete.','Volte ao bilhete e procure o objeto que Lia deve levar.','Reler bilhetes curtos destacando palavras-chave.',4,
      'Texto curto, linguagem simples e alternativas objetivas', source_row.id,'Equipe Pedagogica Raizes e Saberes', source_row.license_id,'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB'::public.question_legal_classification,
      'HOMOLOGADO'::public.question_curation_status,'PUBLICADO'::public.question_publication_status,'1.0','Revisao pedagogica demonstrativa','2026-07-28T00:00:00-03:00','2026-07-28T00:00:00-03:00'
    from source_row
    union all
    select
      'RS-DEMO-MA2-001','Resolver adicao com dezenas exatas','Matematica','Ensino Fundamental - Anos Iniciais','2o ano','Numeros','Calculo de adicao',
      'EF02MA05','Matriz SAEB - resolver problema envolvendo adicao','Basico','Facil','Resolver problema',
      'Multipla escolha','Em uma caixa havia 20 lapis. A professora colocou mais 10 lapis. Quantos lapis ficaram na caixa?',null,'C','20 + 10 = 30.',
      'Voce somou as dezenas corretamente.','Monte a conta 20 + 10 e conte as dezenas.','Usar material dourado ou quadro de dezenas para compor 20 + 10.',5,
      'Numeros inteiros pequenos e enunciado direto', source_row.id,'Equipe Pedagogica Raizes e Saberes', source_row.license_id,'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
      'HOMOLOGADO','PUBLICADO','1.0','Revisao pedagogica demonstrativa','2026-07-28T00:00:00-03:00','2026-07-28T00:00:00-03:00'
    from source_row
    union all
    select
      'RS-DEMO-LP5-001','Inferir sentido de expressao em conto curto','Lingua Portuguesa','Ensino Fundamental - Anos Iniciais','5o ano','Leitura/escuta','Estrategias de leitura',
      'EF35LP04','Matriz SAEB - inferir sentido de palavra ou expressao','Adequado','Media','Inferir',
      'Multipla escolha','No trecho, o que significa a expressao destacada?','Quando viu o resultado da feira de ciencias, Bia ficou com os olhos brilhando.','B','A expressao indica entusiasmo e alegria com o resultado.',
      'Voce usou o contexto para entender a expressao.','Observe o que aconteceu antes da expressao e o sentimento esperado.','Comparar expressoes figuradas com situacoes do cotidiano.',6,
      'Texto curto, alternativas sem ambiguidade e contraste semantico', source_row.id,'Equipe Pedagogica Raizes e Saberes', source_row.license_id,'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
      'APROVADO','PUBLICADO','1.0','Revisao pedagogica demonstrativa','2026-07-28T00:00:00-03:00','2026-07-28T00:00:00-03:00'
    from source_row
    union all
    select
      'RS-DEMO-MA5-001','Ler grafico de barras simples','Matematica','Ensino Fundamental - Anos Iniciais','5o ano','Probabilidade e estatistica','Leitura de grafico',
      'EF05MA24','Matriz SAEB - ler informacoes em graficos e tabelas','Adequado','Media','Interpretar informacao',
      'Leitura de grafico','A turma registrou os livros lidos no mes: aventura 12, poesia 8, conto 10. Qual tipo teve mais leituras?','Dados demonstrativos em formato textual para representar um grafico de barras.','A','Aventura tem 12 leituras, maior valor entre os dados.',
      'Voce comparou os valores do grafico corretamente.','Compare os tres numeros e encontre o maior.','Construir grafico com barras fisicas e ordenar os valores.',7,
      'Grafico descrito em texto alternativo e dados em tabela', source_row.id,'Equipe Pedagogica Raizes e Saberes', source_row.license_id,'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
      'AGUARDANDO_REVISAO_PEDAGOGICA','NAO_PUBLICADO','1.0','Revisao pedagogica demonstrativa','2026-07-28T00:00:00-03:00',null
    from source_row
  ) seed
  on conflict (code) do update set
    internal_title = excluded.internal_title,
    curation_status = excluded.curation_status,
    publication_status = excluded.publication_status,
    updated_at = now()
  returning id, code
)
insert into public.question_curation_history (question_id, actor_role, new_status, legal_classification, comment, snapshot)
select
  id,
  'system_seed',
  case when code = 'RS-DEMO-MA5-001' then 'AGUARDANDO_REVISAO_PEDAGOGICA'::public.question_curation_status else 'HOMOLOGADO'::public.question_curation_status end,
  'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
  'Registro demonstrativo ficticio criado para Missao 01. Nao publicar itens externos sem curadoria.',
  jsonb_build_object('code', code, 'demo', true)
from q;

with alt_seed(code, label, body, is_correct, position, analysis) as (
  values
    ('RS-DEMO-LP2-001','A','O caderno azul',true,1,'Alternativa correta: recupera literalmente o objeto solicitado no bilhete.'),
    ('RS-DEMO-LP2-001','B','A mochila vermelha',false,2,'Distrator: objeto e cor nao aparecem no texto.'),
    ('RS-DEMO-LP2-001','C','O livro de matematica',false,3,'Distrator: troca aula de leitura por outro componente.'),
    ('RS-DEMO-LP2-001','D','A tesoura sem ponta',false,4,'Distrator: item escolar plausivel, mas ausente no bilhete.'),
    ('RS-DEMO-MA2-001','A','10',false,1,'Distrator: considera somente a quantidade acrescentada.'),
    ('RS-DEMO-MA2-001','B','20',false,2,'Distrator: considera somente a quantidade inicial.'),
    ('RS-DEMO-MA2-001','C','30',true,3,'Alternativa correta: soma 20 + 10.'),
    ('RS-DEMO-MA2-001','D','40',false,4,'Distrator: adiciona uma dezena alem do necessario.'),
    ('RS-DEMO-LP5-001','A','Bia ficou com sono.',false,1,'Distrator: interpreta literalmente cansaco, sem apoio no contexto.'),
    ('RS-DEMO-LP5-001','B','Bia ficou muito animada.',true,2,'Alternativa correta: infere entusiasmo a partir do resultado.'),
    ('RS-DEMO-LP5-001','C','Bia ficou com medo.',false,3,'Distrator: sentimento negativo nao indicado pelo trecho.'),
    ('RS-DEMO-LP5-001','D','Bia ficou sem entender.',false,4,'Distrator: nao ha indicio de duvida.'),
    ('RS-DEMO-MA5-001','A','Aventura',true,1,'Alternativa correta: 12 e o maior valor informado.'),
    ('RS-DEMO-MA5-001','B','Poesia',false,2,'Distrator: 8 e o menor valor.'),
    ('RS-DEMO-MA5-001','C','Conto',false,3,'Distrator: 10 e menor que 12.'),
    ('RS-DEMO-MA5-001','D','Todos tiveram a mesma quantidade',false,4,'Distrator: ignora diferenca entre 12, 8 e 10.')
), inserted_alternatives as (
  insert into public.question_alternatives (question_id, label, body, is_correct, position)
  select qi.id, alt_seed.label, alt_seed.body, alt_seed.is_correct, alt_seed.position
  from alt_seed
  join public.question_items qi on qi.code = alt_seed.code
  on conflict (question_id, label) do update set
    body = excluded.body,
    is_correct = excluded.is_correct,
    position = excluded.position
  returning id, question_id, label
)
insert into public.question_distractor_analyses (alternative_id, analysis)
select qa.id, alt_seed.analysis
from alt_seed
join public.question_items qi on qi.code = alt_seed.code
join public.question_alternatives qa on qa.question_id = qi.id and qa.label = alt_seed.label
where not exists (
  select 1
  from public.question_distractor_analyses qda
  where qda.alternative_id = qa.id
);

insert into public.question_usage_logs (question_id, user_role, class_name, usage_type, used_at, metadata)
select qi.id, 'professor', usage.class_name, 'selecionada_em_avaliacao_demo', usage.used_at::timestamptz, jsonb_build_object('demo', true)
from (
  values
    ('RS-DEMO-LP2-001','2o Ano B','2026-07-28T00:00:00-03:00'),
    ('RS-DEMO-MA2-001','2o Ano A','2026-07-28T00:00:00-03:00')
) as usage(code, class_name, used_at)
join public.question_items qi on qi.code = usage.code;
