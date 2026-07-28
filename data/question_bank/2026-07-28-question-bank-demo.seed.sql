-- Seed idempotente do Banco de Questoes - Missao 01.1.
-- Conteudo 100% ficticio, autoral Raizes e Saberes, sem copia externa.
-- Execute apos as migrations 202607280002_question_bank.sql e 202607280003_question_bank_activation.sql.

with license_row as (
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
  on conflict (name) do update set
    license_type = excluded.license_type,
    allows_adaptation = excluded.allows_adaptation,
    publication_allowed = excluded.publication_allowed,
    legal_notes = excluded.legal_notes,
    updated_at = now()
  returning id
), source_row as (
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
    license_row.id,
    'Autorizado para demonstracao interna',
    'HOMOLOGADO',
    '2026-07-28T00:00:00-03:00',
    'Todos os itens deste seed sao ficticios e autorais.'
  from license_row
  where not exists (
    select 1 from public.question_sources where name = 'Raizes e Saberes - Banco Demonstrativo Ficticio'
  )
  returning id, license_id
), source_selected as (
  select id, license_id from source_row
  union all
  select id, license_id
  from public.question_sources
  where name = 'Raizes e Saberes - Banco Demonstrativo Ficticio'
  limit 1
), question_seed as (
  select *
  from (values
    ('RS-DEMO-LP2-001','Localizar informacao explicita em bilhete','Lingua Portuguesa','2o ano','Leitura/escuta','Compreensao em leitura','EF02LP12','Matriz SAEB - localizar informacao explicita em texto curto','Basico','Facil','Localizar informacao','Multipla escolha','Leia o bilhete e responda.','Lia, leve seu caderno azul para a aula de leitura. Professora Ana.','A','O bilhete pede que Lia leve o caderno azul.','Voce localizou a informacao pedida no bilhete.','Volte ao bilhete e procure o objeto que Lia deve levar.','Reler bilhetes curtos destacando palavras-chave.',4,'Texto curto, linguagem simples e alternativas objetivas','HOMOLOGADO','PUBLICADO'),
    ('RS-DEMO-MA2-001','Resolver adicao com dezenas exatas','Matematica','2o ano','Numeros','Calculo de adicao','EF02MA05','Matriz SAEB - resolver problema envolvendo adicao','Basico','Facil','Resolver problema','Multipla escolha','Em uma caixa havia 20 lapis. A professora colocou mais 10 lapis. Quantos lapis ficaram na caixa?',null,'C','20 + 10 = 30.','Voce somou as dezenas corretamente.','Monte a conta 20 + 10 e conte as dezenas.','Usar material dourado ou quadro de dezenas para compor 20 + 10.',5,'Numeros inteiros pequenos e enunciado direto','HOMOLOGADO','PUBLICADO'),
    ('RS-DEMO-LP5-001','Inferir sentido de expressao em conto curto','Lingua Portuguesa','5o ano','Leitura/escuta','Estrategias de leitura','EF35LP04','Matriz SAEB - inferir sentido de palavra ou expressao','Adequado','Media','Inferir','Multipla escolha','No trecho, o que significa a expressao destacada?','Quando viu o resultado da feira de ciencias, Bia ficou com os olhos brilhando.','B','A expressao indica entusiasmo e alegria com o resultado.','Voce usou o contexto para entender a expressao.','Observe o que aconteceu antes da expressao e o sentimento esperado.','Comparar expressoes figuradas com situacoes do cotidiano.',6,'Texto curto, alternativas sem ambiguidade e contraste semantico','APROVADO','PUBLICADO'),
    ('RS-DEMO-MA5-001','Ler grafico de barras simples','Matematica','5o ano','Probabilidade e estatistica','Leitura de grafico','EF05MA24','Matriz SAEB - ler informacoes em graficos e tabelas','Adequado','Media','Interpretar informacao','Leitura de grafico','A turma registrou os livros lidos no mes: aventura 12, poesia 8, conto 10. Qual tipo teve mais leituras?','Dados demonstrativos em formato textual para representar um grafico de barras.','A','Aventura tem 12 leituras, maior valor entre os dados.','Voce comparou os valores do grafico corretamente.','Compare os tres numeros e encontre o maior.','Construir grafico com barras fisicas e ordenar os valores.',7,'Grafico descrito em texto alternativo e dados em tabela','AGUARDANDO_REVISAO_PEDAGOGICA','NAO_PUBLICADO')
  ) as q(code, internal_title, component, school_year, thematic_unit, knowledge_object, bncc_skill, reference_matrix, proficiency_level, difficulty, cognitive_process, question_type, statement, base_text, correct_answer, justification, success_feedback, error_feedback, recommended_intervention, estimated_minutes, accessibility_notes, curation_status, publication_status)
), upserted_questions as (
  insert into public.question_items (
    code,
    internal_title,
    component,
    stage,
    school_year,
    thematic_unit,
    knowledge_object,
    bncc_skill,
    reference_matrix,
    proficiency_level,
    difficulty,
    cognitive_process,
    question_type,
    statement,
    base_text,
    correct_answer,
    justification,
    success_feedback,
    error_feedback,
    recommended_intervention,
    estimated_minutes,
    accessibility_notes,
    source_id,
    author_name,
    license_id,
    legal_classification,
    curation_status,
    publication_status,
    version,
    reviewer_name,
    last_reviewed_at,
    published_at
  )
  select
    q.code,
    q.internal_title,
    q.component,
    'Ensino Fundamental - Anos Iniciais',
    q.school_year,
    q.thematic_unit,
    q.knowledge_object,
    q.bncc_skill,
    q.reference_matrix,
    q.proficiency_level,
    q.difficulty,
    q.cognitive_process,
    q.question_type,
    q.statement,
    q.base_text,
    q.correct_answer,
    q.justification,
    q.success_feedback,
    q.error_feedback,
    q.recommended_intervention,
    q.estimated_minutes,
    q.accessibility_notes,
    s.id,
    'Equipe Pedagogica Raizes e Saberes',
    s.license_id,
    'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
    q.curation_status::public.question_curation_status,
    q.publication_status::public.question_publication_status,
    '1.0',
    'Revisao pedagogica demonstrativa',
    '2026-07-28T00:00:00-03:00',
    case when q.publication_status = 'PUBLICADO' then '2026-07-28T00:00:00-03:00'::timestamptz else null end
  from question_seed q
  cross join source_selected s
  on conflict (code) do update set
    internal_title = excluded.internal_title,
    component = excluded.component,
    school_year = excluded.school_year,
    thematic_unit = excluded.thematic_unit,
    knowledge_object = excluded.knowledge_object,
    bncc_skill = excluded.bncc_skill,
    reference_matrix = excluded.reference_matrix,
    curation_status = excluded.curation_status,
    publication_status = excluded.publication_status,
    updated_at = now()
  returning id, code, curation_status
)
insert into public.question_curation_history (question_id, actor_role, new_status, legal_classification, comment, snapshot)
select
  id,
  'system_seed',
  curation_status,
  'ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB',
  'Seed demonstrativo ficticio reaplicavel. Nao publicar itens externos sem curadoria.',
  jsonb_build_object('code', code, 'demo', true)
from upserted_questions
where not exists (
  select 1
  from public.question_curation_history h
  where h.question_id = upserted_questions.id
    and h.actor_role = 'system_seed'
    and h.comment like 'Seed demonstrativo ficticio%'
);

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
), alternatives as (
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
    and qda.analysis = alt_seed.analysis
);
