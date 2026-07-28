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
