-- Seed idempotente do lote EDU-001.
-- Execute apos supabase/migrations/202607280001_curation_pipeline.sql.
-- Todos os cursos entram como AGUARDANDO_REVISAO. Nada e publicado por este seed.

with providers(name, acronym, official_site_url, provider_type, source_url) as (
  values
    ('Escola Virtual.Gov', 'EV.G', 'https://www.escolavirtual.gov.br/', 'Plataforma publica federal', 'https://www.escolavirtual.gov.br/'),
    ('ESKADA - Universidade Estadual do Maranhao', 'ESKADA/UEMA', 'https://eskadauema.com/', 'Plataforma universitaria publica', 'https://eskadauema.com/theme/olm/catalog.php?category=21&lang=en'),
    ('Mundi - Instituto Federal Sul-rio-grandense', 'Mundi/IFSul', 'https://mundi.ifsul.edu.br/', 'Plataforma de cursos online', 'https://mundi.ifsul.edu.br/portal/')
)
insert into public.course_providers (name, acronym, official_site_url, provider_type, source_url, status, last_verified_at, notes, tags)
select name, acronym, official_site_url, provider_type, source_url, 'AGUARDANDO_REVISAO', '2026-07-28T00:00:00-03:00', 'Fornecedor real identificado em pagina oficial publica; pendente de homologacao interna.', array['educacao', 'curso-gratuito']
from providers
on conflict (name) do update set
  acronym = excluded.acronym,
  official_site_url = excluded.official_site_url,
  provider_type = excluded.provider_type,
  source_url = excluded.source_url,
  status = excluded.status,
  updated_at = now();

with categories(name, slug) as (
  values
    ('Educacao Inclusiva', 'educacao-inclusiva'),
    ('Alfabetizacao', 'alfabetizacao'),
    ('BNCC e Curriculo', 'bncc-e-curriculo'),
    ('Tecnologia Educacional', 'tecnologia-educacional'),
    ('Gestao Escolar', 'gestao-escolar'),
    ('Formacao Docente', 'formacao-docente'),
    ('Educacao Financeira', 'educacao-financeira')
)
insert into public.course_categories (name, slug, status)
select name, slug, 'AGUARDANDO_REVISAO'
from categories
on conflict (slug) do update set name = excluded.name, updated_at = now();

with tags(name, slug) as (
  values
    ('educacao inclusiva', 'educacao-inclusiva'), ('bilinguismo', 'bilinguismo'), ('formacao docente', 'formacao-docente'),
    ('gestao escolar', 'gestao-escolar'), ('colaboracao', 'colaboracao'), ('familias', 'familias'),
    ('acolhimento', 'acolhimento'), ('educacao basica', 'educacao-basica'), ('educacao financeira', 'educacao-financeira'),
    ('ead', 'ead'), ('coordenacao', 'coordenacao'), ('tecnologia educacional', 'tecnologia-educacional'),
    ('ia', 'ia'), ('pnld', 'pnld'), ('curriculo', 'curriculo'), ('ensino remoto', 'ensino-remoto'),
    ('metodologias ativas', 'metodologias-ativas'), ('planejamento', 'planejamento'), ('pdca', 'pdca'),
    ('alfabetizacao', 'alfabetizacao'), ('letramento', 'letramento'), ('tecnologias digitais', 'tecnologias-digitais'),
    ('surdos', 'surdos'), ('gamificacao', 'gamificacao'), ('psicologia da educacao', 'psicologia-da-educacao'),
    ('desenho didatico', 'desenho-didatico'), ('videoaulas', 'videoaulas'), ('mediacao', 'mediacao'),
    ('tutoria', 'tutoria'), ('legislacao', 'legislacao'), ('politicas publicas', 'politicas-publicas'),
    ('tea', 'tea'), ('educacao especial', 'educacao-especial'), ('tecnologia assistiva', 'tecnologia-assistiva'),
    ('acessibilidade', 'acessibilidade')
)
insert into public.course_tags (name, slug, status)
select name, slug, 'AGUARDANDO_REVISAO'
from tags
on conflict (slug) do update set name = excluded.name, updated_at = now();

insert into public.curation_batches (
  batch_code,
  title,
  description,
  area,
  status,
  source_policy,
  started_at,
  finished_at,
  verification_date,
  found_count,
  imported_count,
  discarded_count,
  duplicate_count,
  metadata
) values (
  'EDU-001',
  'Primeiro lote real controlado - cursos gratuitos de educacao',
  'Lote inicial de cursos gratuitos de educacao coletados em paginas oficiais publicas e mantidos para homologacao humana.',
  'Educacao',
  'AGUARDANDO_REVISAO',
  'Apenas paginas oficiais publicas; sem reproducao de conteudo didatico; publicacao bloqueada ate aprovacao.',
  '2026-07-28T00:00:00-03:00',
  '2026-07-28T00:00:00-03:00',
  '2026-07-28',
  25,
  22,
  3,
  1,
  '{"published_count":0,"items_with_alerts":9,"default_image_url":"assets/universidade/material-pdf.webp"}'::jsonb
)
on conflict (batch_code) do update set
  status = excluded.status,
  found_count = excluded.found_count,
  imported_count = excluded.imported_count,
  discarded_count = excluded.discarded_count,
  duplicate_count = excluded.duplicate_count,
  metadata = excluded.metadata,
  updated_at = now();

with course_seed as (
  select *
  from jsonb_to_recordset('[
    {"slug":"docencia-plural-interculturalidade-bilinguismo","title":"Docencia Plural - Formacao em Interculturalidade e Bilinguismo","provider":"EV.G","category":"Educacao Inclusiva","official_url":"https://www.escolavirtual.gov.br/curso/918","workload_hours":40,"theme":"Interculturalidade e bilinguismo","level":"Intermediario","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["educacao-inclusiva","bilinguismo","formacao-docente"]},
    {"slug":"desenvolvimento-profissional-cooperativo-na-escola","title":"Desenvolvimento profissional cooperativo na escola","provider":"EV.G","category":"Gestao Escolar","official_url":"https://www.brasil.escolavirtual.gov.br/curso/906","workload_hours":15,"theme":"Desenvolvimento profissional","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["gestao-escolar","formacao-docente","colaboracao"]},
    {"slug":"atencao-individualizada-estudantes-familias","title":"Atencao individualizada a estudantes e suas familias","provider":"EV.G","category":"Educacao Inclusiva","official_url":"https://www.evgdmz002.escolavirtual.gov.br/curso/907","workload_hours":15,"theme":"Acolhimento e acompanhamento","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"MEDIA","tags":["familias","acolhimento","educacao-basica"]},
    {"slug":"formacao-professores-programa-aprender-valor","title":"Formacao de Professores do Programa Aprender Valor","provider":"EV.G","category":"Educacao Financeira","official_url":"https://www.escolavirtual.gov.br/curso/1072","workload_hours":40,"theme":"Educacao financeira escolar","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["educacao-financeira","educacao-basica","formacao-docente"]},
    {"slug":"nocoes-basicas-coordenar-cursos-online","title":"Nocoes Basicas para Coordenar Cursos On-line","provider":"EV.G","category":"Tecnologia Educacional","official_url":"https://www.escolavirtual.gov.br/curso/198","workload_hours":20,"theme":"Coordenacao de cursos online","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["ead","coordenacao","tecnologia-educacional"]},
    {"slug":"fluencia-educadores","title":"FluencIA Educadores","provider":"EV.G","category":"Tecnologia Educacional","official_url":"https://www.escolavirtual.gov.br/curso/1419","workload_hours":3,"theme":"Inteligencia artificial na educacao","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["ia","tecnologia-educacional","formacao-docente"]},
    {"slug":"pnld-programa-nacional-livro-material-didatico","title":"PNLD - Programa Nacional do Livro e do Material Didatico","provider":"EV.G","category":"BNCC e Curriculo","official_url":"https://www.escolavirtual.gov.br/curso/396","workload_hours":30,"theme":"Material didatico e politicas publicas","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"MEDIA","tags":["pnld","curriculo","material-didatico"]},
    {"slug":"aulas-remotas-e-agora","title":"Temos que dar aulas remotas... E agora?","provider":"EV.G","category":"Tecnologia Educacional","official_url":"https://www.escolavirtual.gov.br/curso/313","workload_hours":10,"theme":"Ensino remoto","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"MEDIA","tags":["ensino-remoto","ead","formacao-docente"]},
    {"slug":"estrategias-metodologias-ativas","title":"Estrategias de Metodologias Ativas","provider":"EV.G","category":"Formacao Docente","official_url":"https://www.escolavirtual.gov.br/curso/436/governoto","workload_hours":30,"theme":"Metodologias ativas","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["metodologias-ativas","planejamento","praticas-pedagogicas"]},
    {"slug":"projetos-escolares-educacao-financeira","title":"Elaboracao de Projetos Escolares com Educacao Financeira","provider":"EV.G","category":"Educacao Financeira","official_url":"https://www.escolavirtual.gov.br/curso/1181/governorn","workload_hours":30,"theme":"Projetos escolares","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["educacao-financeira","projetos","educacao-basica"]},
    {"slug":"pdca-aplicado-educacao-basica","title":"PDCA Aplicado a Educacao Basica","provider":"EV.G","category":"Gestao Escolar","official_url":"https://www.spoc41.escolavirtual.gov.br/curso/1184","workload_hours":25,"theme":"Gestao e melhoria continua","level":"Introdutorio","cert":true,"url_confidence":"MEDIA","workload_confidence":"ALTA","certificate_confidence":"ALTA","classification_confidence":"ALTA","tags":["gestao-escolar","pdca","educacao-basica"]},
    {"slug":"alfabetizacao-letramento-tecnologias-digitais","title":"Alfabetizacao, Letramento e Tecnologias Digitais","provider":"ESKADA/UEMA","category":"Alfabetizacao","official_url":"https://eskadauema.com/course/view.php?id=94","workload_hours":null,"theme":"Alfabetizacao e tecnologias digitais","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["alfabetizacao","letramento","tecnologias-digitais"]},
    {"slug":"gamificacao-ensino-inclusivo-surdos","title":"Gamificacao no Ensino Inclusivo de Surdos","provider":"ESKADA/UEMA","category":"Educacao Inclusiva","official_url":"https://eskadauema.com/course/view.php?id=88","workload_hours":null,"theme":"Inclusao de estudantes surdos","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["educacao-inclusiva","surdos","gamificacao"]},
    {"slug":"gestao-escolar-educacao-basica","title":"Gestao Escolar da Educacao Basica","provider":"ESKADA/UEMA","category":"Gestao Escolar","official_url":"https://eskadauema.com/course/view.php?id=79","workload_hours":null,"theme":"Gestao da educacao basica","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["gestao-escolar","educacao-basica"]},
    {"slug":"psicologia-da-educacao","title":"Psicologia da Educacao","provider":"ESKADA/UEMA","category":"Formacao Docente","official_url":"https://eskadauema.com/course/view.php?id=61","workload_hours":null,"theme":"Psicologia educacional","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"MEDIA","tags":["psicologia-da-educacao","formacao-docente"]},
    {"slug":"desenho-didatico-ensino-online","title":"Desenho Didatico para o Ensino On-line","provider":"ESKADA/UEMA","category":"Tecnologia Educacional","official_url":"https://eskadauema.com/course/view.php?id=57","workload_hours":null,"theme":"Desenho didatico","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["ead","desenho-didatico","tecnologia-educacional"]},
    {"slug":"como-produzir-videoaulas","title":"Como Produzir Videoaulas","provider":"ESKADA/UEMA","category":"Tecnologia Educacional","official_url":"https://eskadauema.com/course/view.php?id=56","workload_hours":null,"theme":"Producao de videoaulas","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["videoaulas","ead","tecnologia-educacional"]},
    {"slug":"mediacao-em-ead","title":"Mediacao em EaD","provider":"ESKADA/UEMA","category":"Tecnologia Educacional","official_url":"https://eskadauema.com/course/view.php?id=55","workload_hours":null,"theme":"Mediacao online","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"MEDIA","tags":["ead","mediacao","tutoria"]},
    {"slug":"metodologias-ativas-na-educacao","title":"Metodologias Ativas na Educacao","provider":"ESKADA/UEMA","category":"Formacao Docente","official_url":"https://eskadauema.com/course/view.php?id=67","workload_hours":null,"theme":"Metodologias ativas","level":"Introdutorio","cert":true,"url_confidence":"ALTA","workload_confidence":"NAO_CONFIRMADA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["metodologias-ativas","formacao-docente"]},
    {"slug":"legislacao-educacional-contemporanea","title":"Legislacao Educacional Contemporanea","provider":"Mundi/IFSul","category":"BNCC e Curriculo","official_url":"https://mundi.ifsul.edu.br/portal/","workload_hours":40,"theme":"Legislacao educacional","level":"Basico","cert":true,"url_confidence":"MEDIA","workload_confidence":"ALTA","certificate_confidence":"MEDIA","classification_confidence":"MEDIA","tags":["legislacao","politicas-publicas","gestao-escolar"]},
    {"slug":"transtorno-espectro-autista","title":"Transtorno do Espectro Autista","provider":"Mundi/IFSul","category":"Educacao Inclusiva","official_url":"https://mundi.ifsul.edu.br/portal/","workload_hours":30,"theme":"TEA","level":"Basico","cert":true,"url_confidence":"MEDIA","workload_confidence":"ALTA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["tea","educacao-inclusiva","educacao-especial"]},
    {"slug":"tecnologia-assistiva","title":"Tecnologia Assistiva","provider":"Mundi/IFSul","category":"Educacao Inclusiva","official_url":"https://mundi.ifsul.edu.br/portal/","workload_hours":30,"theme":"Tecnologia assistiva","level":"Basico","cert":true,"url_confidence":"MEDIA","workload_confidence":"ALTA","certificate_confidence":"MEDIA","classification_confidence":"ALTA","tags":["tecnologia-assistiva","educacao-inclusiva","acessibilidade"]}
  ]'::jsonb) as x(slug text, title text, provider text, category text, official_url text, workload_hours numeric, theme text, level text, cert boolean, url_confidence text, workload_confidence text, certificate_confidence text, classification_confidence text, tags jsonb)
)
insert into public.curated_courses (
  provider_id,
  category_id,
  title,
  slug,
  short_description,
  full_description,
  image_url,
  workload_hours,
  workload_text,
  theme,
  level,
  language,
  modality,
  certificate_available,
  certificate_text,
  official_url,
  status,
  pipeline_status,
  knowledge_center,
  curator_notes,
  source_url,
  source_checked_at,
  last_reviewed_at,
  url_confidence,
  workload_confidence,
  certificate_confidence,
  classification_confidence
)
select
  p.id,
  c.id,
  s.title,
  s.slug,
  'Metadados reais coletados em pagina oficial publica; descricao editorial resumida para revisao humana.',
  'Registro do lote EDU-001. Nao reproduz conteudo didatico da instituicao; direciona para URL oficial apos aprovacao.',
  'assets/universidade/material-pdf.webp',
  s.workload_hours,
  case when s.workload_hours is null then 'Nao confirmado' else s.workload_hours::text || 'h' end,
  s.theme,
  s.level,
  'pt-BR',
  'Online',
  s.cert,
  case when s.cert then 'Certificado informado pela plataforma ou pagina oficial; revisar antes de publicar.' else 'Nao informado' end,
  s.official_url,
  'AGUARDANDO_REVISAO',
  'AGUARDANDO_REVISAO',
  s.category,
  'Pendente de homologacao editorial pela Curadoria Raizes e Saberes.',
  s.official_url,
  '2026-07-28T00:00:00-03:00',
  '2026-07-28T00:00:00-03:00',
  s.url_confidence::public.confidence_level,
  s.workload_confidence::public.confidence_level,
  s.certificate_confidence::public.confidence_level,
  s.classification_confidence::public.confidence_level
from course_seed s
join public.course_providers p on p.acronym = s.provider
join public.course_categories c on c.name = s.category
on conflict (slug) do update set
  provider_id = excluded.provider_id,
  category_id = excluded.category_id,
  official_url = excluded.official_url,
  status = 'AGUARDANDO_REVISAO',
  pipeline_status = 'AGUARDANDO_REVISAO',
  updated_at = now();

with batch as (
  select id from public.curation_batches where batch_code = 'EDU-001'
), courses as (
  select id, title, official_url, slug, status, url_confidence, workload_confidence, certificate_confidence, classification_confidence
  from public.curated_courses
  where slug in (
    'docencia-plural-interculturalidade-bilinguismo',
    'desenvolvimento-profissional-cooperativo-na-escola',
    'atencao-individualizada-estudantes-familias',
    'formacao-professores-programa-aprender-valor',
    'nocoes-basicas-coordenar-cursos-online',
    'fluencia-educadores',
    'pnld-programa-nacional-livro-material-didatico',
    'aulas-remotas-e-agora',
    'estrategias-metodologias-ativas',
    'projetos-escolares-educacao-financeira',
    'pdca-aplicado-educacao-basica',
    'alfabetizacao-letramento-tecnologias-digitais',
    'gamificacao-ensino-inclusivo-surdos',
    'gestao-escolar-educacao-basica',
    'psicologia-da-educacao',
    'desenho-didatico-ensino-online',
    'como-produzir-videoaulas',
    'mediacao-em-ead',
    'metodologias-ativas-na-educacao',
    'legislacao-educacional-contemporanea',
    'transtorno-espectro-autista',
    'tecnologia-assistiva'
  )
)
insert into public.curation_batch_items (
  batch_id,
  course_id,
  source_url,
  normalized_title,
  status,
  action_required,
  confidence,
  raw_metadata
)
select
  batch.id,
  courses.id,
  courses.official_url,
  courses.title,
  'AGUARDANDO_REVISAO',
  'Homologar metadados, URL, certificado e classificacao antes de aprovar.',
  jsonb_build_object(
    'url', courses.url_confidence,
    'workload', courses.workload_confidence,
    'certificate', courses.certificate_confidence,
    'classification', courses.classification_confidence
  ),
  jsonb_build_object('source', 'EDU-001 seed', 'course_slug', courses.slug)
from batch, courses
on conflict do nothing;

with batch as (
  select id from public.curation_batches where batch_code = 'EDU-001'
), discarded(title, provider, url, reason, status) as (
  values
    ('Formacao para a Docencia Digital em Rede', 'ESKADA/UEMA', 'https://eskadauema.com/course/view.php?id=75', 'Catalogo oficial informa inscricoes encerradas.', 'REJEITADO'),
    ('Multimeios em Educacao', 'ESKADA/UEMA', 'https://eskadauema.com/course/view.php?id=54', 'Pagina oficial informa inscricoes suspensas e sem novos cursistas.', 'REJEITADO'),
    ('Alimentacao Saudavel na Escola - Edicao 2023', 'Lumina/UFRGS', 'https://lumina.ufrgs.br/course/view.php?id=221', 'Certificado ausente e edicao antiga exigem avaliacao em lote futuro.', 'REVISAO_NECESSARIA')
)
insert into public.curation_batch_items (
  batch_id,
  source_url,
  normalized_title,
  provider_name,
  status,
  discard_reason,
  action_required,
  raw_metadata
)
select batch.id, discarded.url, discarded.title, discarded.provider, discarded.status::public.curation_pipeline_status, discarded.reason, 'Nao importar sem nova revisao humana.', jsonb_build_object('discarded', true)
from batch, discarded
on conflict do nothing;

with batch as (
  select id from public.curation_batches where batch_code = 'EDU-001'
), issues(issue_type, severity, description) as (
  values
    ('MISSING_WORKLOAD', 'MEDIA', 'Cursos ESKADA importados sem carga horaria confirmada no catalogo aberto.'),
    ('URL_REVIEW', 'MEDIA', 'Cursos Mundi/IFSul precisam de URL individual oficial antes de aprovacao.'),
    ('POSSIBLE_DUPLICATE', 'BAIXA', 'Metodologias ativas aparece em EV.G e ESKADA com nomes semelhantes.'),
    ('NO_AUTO_PUBLICATION', 'ALTA', 'Todos os itens permanecem AGUARDANDO_REVISAO ate homologacao humana.')
)
insert into public.curation_issues (batch_id, issue_type, severity, description, status)
select batch.id, issues.issue_type, issues.severity, issues.description, 'REVISAO_NECESSARIA'
from batch, issues
on conflict do nothing;

with batch as (
  select id from public.curation_batches where batch_code = 'EDU-001'
)
insert into public.curation_logs (batch_id, action, previous_status, new_status, details)
select id, 'SEED_LOTE_EDU_001', 'DESCOBERTO', 'AGUARDANDO_REVISAO', '{"imported":22,"discarded":3,"published":0}'::jsonb
from batch
on conflict do nothing;
