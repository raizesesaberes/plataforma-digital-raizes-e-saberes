# Universidade Raizes e Saberes - Fase 01

## Nucleo do catalogo de cursos gratuitos

Esta fase implementa a experiencia publica de descoberta de cursos gratuitos externos. A plataforma nao hospeda aulas, nao emite certificados proprios para esses cursos e nao registra conclusao automaticamente por clique no link externo.

## Rotas e telas

- `universidade.html`: pagina publica da Universidade.
- `#formacao-raizes`: area institucional em preparacao para cursos proprios, trilhas, assessorias, encontros, historico e certificados internos.
- `#catalogo`: catalogo publico gratuito com busca, filtros, rankings e cards.
- `#detalhes-{courseId}`: painel de detalhes renderizado no cliente.
- `#administracao`: estrutura inicial de administracao e curadoria.
- `#estrutura-dados`: resumo das entidades do banco.

## Dados de demonstracao

Os itens exibidos no catalogo sao demonstrativos. Instituicoes, cursos e URLs usam nomes e enderecos de homologacao, sem apresentacao como oferta real. Cursos reais devem ser cadastrados apenas apos validacao editorial e verificacao manual do link oficial.

## Estados do curso

- `rascunho`
- `aguardando revisao`
- `publicado`
- `temporariamente indisponivel`
- `inscricoes encerradas`
- `link com problema`
- `arquivado`

## Tabelas propostas

### `course_providers`

- `id uuid primary key`
- `name text not null`
- `slug text unique not null`
- `official_website_url text`
- `logo_url text`
- `description text`
- `provider_type text`
- `country text`
- `is_highlighted boolean default false`
- `status text default 'ativo'`
- `created_by uuid`
- `updated_by uuid`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### `curated_courses`

- `id uuid primary key`
- `title text not null`
- `slug text unique not null`
- `provider_id uuid references course_providers(id)`
- `summary text`
- `full_description text`
- `objectives text[]`
- `syllabus text[]`
- `target_audience text`
- `requirements text`
- `workload_hours integer`
- `modality text`
- `level text`
- `certificate_available boolean default false`
- `self_paced boolean default false`
- `enrollment_status text`
- `enrollment_deadline date`
- `course_url text not null`
- `image_url text`
- `language text default 'pt-BR'`
- `is_free boolean default true`
- `curator_notes text`
- `verification_status text default 'aguardando revisao'`
- `last_verified_at timestamptz`
- `published_at timestamptz`
- `status text default 'rascunho'`
- `created_by uuid`
- `updated_by uuid`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### Demais tabelas

- `course_categories`: `id`, `name`, `slug`, `parent_id`, `sort_order`, auditoria.
- `course_tags`: `id`, `name`, `slug`, `status`, auditoria.
- `course_tag_relations`: `course_id`, `tag_id`, `created_at`.
- `course_reviews`: `id`, `course_id`, `user_id`, `rating`, `comment`, `status`, auditoria.
- `course_favorites`: `course_id`, `user_id`, `created_at`.
- `course_clicks`: `id`, `course_id`, `user_id nullable`, `event_type`, `referrer`, `created_at`.
- `course_verifications`: `id`, `course_id`, `verified_by`, `status`, `notes`, `checked_url`, `created_at`.
- `learning_paths`: `id`, `title`, `slug`, `description`, `area`, `status`, auditoria.
- `learning_path_courses`: `learning_path_id`, `course_id`, `sort_order`, `created_at`.

## Indices recomendados

- `curated_courses(slug)`
- `curated_courses(provider_id)`
- `curated_courses(status, published_at)`
- `curated_courses(area, theme, level, modality)`
- `curated_courses(certificate_available, self_paced, enrollment_status, is_free)`
- `course_reviews(course_id, status)`
- `course_favorites(user_id, course_id)` unique
- `course_clicks(course_id, created_at)`
- `course_tag_relations(course_id, tag_id)` unique

## Politicas de acesso

- Leitura publica: `course_providers` ativos e `curated_courses` com `status = 'publicado'`.
- Visitantes: podem pesquisar, filtrar, visualizar detalhes e clicar no link externo.
- Visitantes: nao podem avaliar, favoritar, registrar inicio, registrar conclusao ou enviar certificado.
- Usuarios autenticados: podem favoritar, avaliar, comentar e declarar inicio/conclusao.
- Usuarios autenticados: podem enviar certificado externo para analise futura.
- Curadoria/admin: pode criar, editar, publicar, despublicar, destacar, arquivar, verificar links e registrar notas internas.
- Dados internos de curadoria: visiveis apenas para equipe autorizada.
- Conclusao: nunca deve ser inferida por clique no curso externo.

## Eventos de acesso

Registrar separadamente:

- visualizacao da ficha;
- clique no curso externo;
- favorito;
- inicio declarado;
- conclusao declarada;
- certificado enviado;
- certificado validado.

## Separacao de informacoes

- Informacoes oficiais: titulo, instituicao, descricao, objetivos, conteudos, requisitos, carga horaria, certificado e URL oficial.
- Curadoria Raizes e Saberes: area, tema, nivel, publico, tags, status de verificacao, notas internas e destaque.
- Usuarios: avaliacoes, comentarios, favoritos e progresso declarado.

## Limitacoes atuais

- Implementacao frontend demonstrativa, sem banco conectado.
- Dados ficticios de homologacao.
- Acoes autenticadas sao simuladas via `localStorage`.
- Links externos usam URLs demonstrativas.
- Sem coleta automatica em massa de cursos.
- Sem LMS interno, aulas, modulos ou certificados proprios nesta fase.

## Homologacao

1. Abrir `universidade.html` como visitante e confirmar acesso publico.
2. Testar busca por tema, instituicao, publico e titulo.
3. Validar todos os filtros exigidos.
4. Validar rankings: destaques, mais acessados, mais bem avaliados, recentes e certificado.
5. Abrir detalhes e verificar separacao entre dados oficiais, curadoria e usuarios.
6. Clicar em salvar, avaliar ou progresso como visitante e confirmar redirecionamento para login.
7. Confirmar que clique externo nao registra conclusao.
8. Revisar responsividade em desktop e mobile.
9. Substituir demonstracoes por cursos reais apenas apos verificacao manual.

## Fase 02 - Homologacao visual

### Catalogo

- A apresentacao do catalogo prioriza busca, temas rapidos, cursos em destaque, rankings, cursos com certificado, instituicoes em destaque e catalogo completo.
- Os indicadores demonstrativos permanecem, mas com peso visual menor que a busca e os cursos.
- Os cards do catalogo exibem capa, selo gratuito, titulo, instituicao, categoria, carga horaria, modalidade, certificado, avaliacao visual, total de avaliacoes, acessos, detalhe e favoritar.

### Filtros

- Desktop mostra inicialmente: area, tema, carga horaria e certificado.
- O botao `Mais filtros` revela: instituicao, modalidade, nivel, publico, autoinstrucional, situacao da inscricao, avaliacao, data de inclusao e gratuidade.
- Mobile usa painel inferior de filtros com todos os criterios disponiveis.
- Filtros ativos aparecem como etiquetas removiveis.
- `Limpar filtros` zera filtros e busca.

### Menu da Universidade

O menu lateral foi separado em dois blocos:

- Formacao Raizes e Saberes: inicio, trilhas, meus cursos, certificados, videoaulas, avaliacoes, eventos e historico formativo.
- Catalogo Gratuito: encontrar cursos, categorias, instituicoes, rankings, favoritos e cursos acessados.

### Ficha do curso

- Rota por hash: `universidade.html#curso-{slug}`.
- A ficha inclui cabecalho com imagem, titulo, instituicao, selo gratuito, avaliacao, avaliacoes, carga, modalidade, certificado e CTA externo.
- Conteudo separado em informacoes oficiais da instituicao, dados do curso, transparencia, analise da curadoria, comunidade e cursos relacionados.
- As acoes de comunidade continuam restritas a usuarios autenticados.

### Clique externo

Ao clicar em `Acessar curso na instituicao`, a interface registra localmente:

- `courseId`;
- data do clique;
- usuario demonstrativo quando autenticado;
- contador local por curso.

Esse evento nao altera inicio, conclusao ou certificado.

## Fase 03 - Motor de descoberta do conhecimento

### Nova entidade: Centro de Conhecimento

Campos preparados:

- `title`
- `slug`
- `short_description`
- `full_description`
- `image_url`
- `category`
- `keywords`
- `level`
- `audience`
- `color`
- `icon`
- `featured`
- `status`
- `created_at`
- `updated_at`

### Rotas

- `universidade.html#centros-conhecimento`: lista de temas demonstrativos.
- `universidade.html#centro-{slug}`: pagina individual do Centro de Conhecimento.

### Tabelas futuras

- `knowledge_centers`
- `knowledge_categories`
- `knowledge_resources`
- `knowledge_resource_types`
- `knowledge_tags`
- `knowledge_relations`
- `knowledge_books`
- `knowledge_videos`
- `knowledge_podcasts`
- `knowledge_laws`
- `knowledge_events`
- `knowledge_experts`
- `knowledge_faq`
- `knowledge_guides`
- `knowledge_documents`

### Relacionamentos preparados

Centro de Conhecimento -> Cursos -> Categorias -> Instituicoes -> Tags -> Materiais -> Especialistas -> Eventos -> Legislacao -> Videos -> Livros.

### Busca inteligente preparada

A busca principal passa a preparar resultados por tipo:

- Centros de Conhecimento;
- Cursos;
- Instituicoes;
- Categorias;
- Trilhas;
- Materiais futuros.

Nao ha IA nesta fase. A busca usa correspondencia local demonstrativa e deixa a arquitetura pronta para evolucao.

### Conteudo demonstrativo

Foram criados centros demonstrativos para Educacao Inclusiva, BNCC, Alfabetizacao, Tecnologias Educacionais, Gestao Escolar e Avaliacao Formativa. Nenhum livro, legislacao, evento, especialista ou material real foi cadastrado. Esses blocos ficam estruturados para expansao e aparecem individualmente apenas quando houver conteudo curado.

## Fase 04 - Experiencia de aprendizagem

### Mapa do Conhecimento

Cada Centro de Conhecimento possui um roteiro visual demonstrativo, em formato de jornada, com etapas como conceito, contexto, curso introdutorio, materiais, videos, aprofundamento, comunidade e continuidade. O mapa mostra tipo, tempo estimado e status preparado/disponivel/futuro.

### Trilhas de Aprendizagem

Foram preparadas trilhas por perfil:

- Professor da Educacao Infantil;
- Coordenador Pedagogico;
- Gestor Escolar.

Cada trilha exibe resumo, progresso demonstrativo, tempo estimado e etapas com icone, tipo, tempo e status. A estrutura ainda nao integra progresso real do usuario.

### Niveis

Cada Centro passa a organizar a experiencia em:

- Iniciante;
- Intermediario;
- Avancado.

Os niveis sao demonstrativos e preparados para receber regras futuras de classificacao.

### Recomendacoes

O bloco `Voce tambem pode aprender` recomenda Centros relacionados por categoria e tags demonstrativas. Nao ha IA nesta fase.

### Busca unificada

A busca principal apresenta grupos separados:

- Centros;
- Cursos;
- Trilhas;
- Materiais;
- Instituicoes;
- Especialistas;
- Eventos.

Especialistas e eventos permanecem como estrutura preparada, sem conteudo real.

### SEO e compartilhamento

Cada Centro exibe estrutura preparada para:

- slug;
- title;
- description;
- keywords;
- canonical;
- Open Graph futuro;
- JSON-LD futuro;
- breadcrumb futuro;
- compartilhar centro;
- copiar link;
- QR Code.

Esses componentes sao demonstrativos e nao publicam metadados dinamicos reais no documento HTML nesta fase.

## Fase 05 - Central de Curadoria

### Rota administrativa

- `curadoria.html`: ambiente interno demonstrativo para administradores e curadores.
- A pagina nao fica publica. Ela exige autenticacao e credencial demonstrativa de curadoria.

Credencial demonstrativa:

- E-mail: `curadoria@raizesesaberes.com.br`
- Senha: `Curadoria2026`

### Dashboard

A Central exibe indicadores demonstrativos para:

- instituicoes cadastradas;
- cursos cadastrados;
- Centros de Conhecimento;
- materiais;
- livros;
- videos;
- eventos;
- especialistas;
- links pendentes de verificacao;
- cursos aguardando revisao;
- cursos publicados;
- cursos arquivados;
- ultima atualizacao;
- usuarios curadores;
- atividades recentes.

### Navegacao da curadoria

Menu proprio com:

- Dashboard;
- Instituicoes;
- Cursos;
- Centros de Conhecimento;
- Categorias;
- Tags;
- Trilhas;
- Materiais;
- Legislacao;
- Livros;
- Videos;
- Podcasts;
- Eventos;
- Especialistas;
- Usuarios;
- Relatorios;
- Configuracoes;
- Logs.

### Formularios e estruturas preparadas

Foram criados blocos demonstrativos para:

- cadastro completo de instituicoes;
- formulario editorial de cursos;
- gerenciamento de Centros de Conhecimento;
- tags e categorias;
- editor visual de trilhas;
- materiais;
- legislacao;
- livros;
- videos;
- podcasts;
- especialistas;
- eventos;
- status editorial;
- historico/auditoria;
- verificacao de links e revisoes.

### Fluxo editorial

Status preparados:

- Rascunho;
- Em revisao;
- Aguardando publicacao;
- Publicado;
- Arquivado;
- Link quebrado;
- Revisao necessaria.

### Limitacoes da fase

- Sem importacao automatica.
- Sem IA.
- Sem crawler.
- Sem robos.
- Sem integracoes externas.
- Sem conteudo real.
- Sem usuarios reais.
- Sem banco definitivo.
- Os formularios sao demonstrativos e ainda nao persistem dados em backend.

## Fase 05B - Esteira Automatizada de Curadoria e Primeiro Lote Real

### Objetivo operacional

A Central de Curadoria recebeu uma esteira controlada para administrar lotes reais de cursos gratuitos antes da publicacao.

O fluxo foi preparado para:

- descoberta manual/assistida em paginas oficiais publicas;
- coleta de metadados;
- normalizacao;
- classificacao;
- verificacao;
- revisao humana;
- aprovacao;
- publicacao posterior apenas por decisao administrativa.

### Status da esteira

Status oficiais preparados:

- DESCOBERTO;
- COLETADO;
- NORMALIZADO;
- CLASSIFICADO;
- VERIFICADO;
- AGUARDANDO_REVISAO;
- APROVADO;
- PUBLICADO;
- REJEITADO;
- REVISAO_NECESSARIA;
- LINK_COM_PROBLEMA;
- ARQUIVADO.

### Banco e persistencia

Foi criada a migration Supabase:

- `supabase/migrations/202607280001_curation_pipeline.sql`

A migration prepara:

- `course_providers`;
- `curated_courses`;
- `course_categories`;
- `course_tags`;
- `course_tag_relations`;
- `course_verifications`;
- `curation_batches`;
- `curation_batch_items`;
- `curation_sources`;
- `curation_logs`;
- `curation_issues`;
- `course_change_history`.

Tambem foram incluidos:

- RLS para separar leitura publica de cursos publicados e operacao restrita a curadores;
- funcao `public.is_university_curator()`;
- indices de status, fornecedor, lote e URL oficial;
- validacao basica de URL HTTPS para cursos curados.

### Primeiro lote real

Arquivo do lote:

- `data/curation_batches/2026-07-28-educacao-lote-001.json`

Seed SQL:

- `data/curation_batches/2026-07-28-educacao-lote-001.seed.sql`

Relatorio:

- `docs/RELATORIO-LOTE-CURADORIA-EDU-001.md`

Resumo do EDU-001:

- 25 cursos encontrados;
- 22 cursos importados para revisao;
- 3 itens descartados ou adiados;
- 0 cursos publicados;
- 1 possivel duplicidade;
- 9 alertas de metadados.

Todos os cursos importados permanecem em `AGUARDANDO_REVISAO`.

### Central de Curadoria

A rota `curadoria.html` recebeu a secao `#lotes`.

O menu administrativo agora inclui:

- Lotes de Curadoria.

A tela mostra:

- resumo do lote EDU-001;
- status de revisao;
- alertas;
- duplicidades;
- acoes administrativas;
- lista inicial de itens para homologacao.

### Ferramenta local

Foi criado o script:

- `scripts/curation-pipeline.mjs`

Comandos:

```bash
node scripts/curation-pipeline.mjs validate data/curation_batches/2026-07-28-educacao-lote-001.json
node scripts/curation-pipeline.mjs report data/curation_batches/2026-07-28-educacao-lote-001.json
node scripts/curation-pipeline.mjs rollback-sql EDU-001
```

### Limites preservados

- Sem publicacao automatica.
- Sem coleta agressiva.
- Sem crawler.
- Sem IA classificando sozinha.
- Sem copia de conteudo didatico.
- Sem imagens oficiais copiadas sem permissao.
- Sem comentarios, avaliacoes ou acessos ficticios.
- Sem conclusao automatica de cursos externos.

### Limitacao tecnica atual

O workspace nao contem URL, chave ou configuracao de projeto Supabase.

Por isso, a migration e o seed foram entregues prontos para aplicacao, mas nao foram executados contra um banco remoto nesta etapa.
