# AUDITORIA TECNICA COMPLETA DA BIBLIOTECA VIVA

Data da auditoria: 31/07/2026  
Projeto: Plataforma Digital Raizes e Saberes  
Escopo: Biblioteca Viva, catalogo de livros, Book Viewer, assets, persistencia, Supabase, integracoes com aluno/professor/familia/universidade/gamificacao.

## A. Resumo executivo

A Biblioteca Viva ja possui uma base visual e funcional relevante, concentrada principalmente em `biblioteca.html`, `book-viewer.html`, `app-pages.js`, `master-pack.css`, `styles.css` e assets locais em `assets/`.

O modulo atual funciona como uma plataforma estatica premium/prototipada: os livros sao cadastrados em arrays JavaScript, as capas/paginas/miniaturas/PDFs ficam em pastas locais, e a experiencia de leitura usa imagens JPG geradas a partir dos PDFs. Nao ha, no estado atual, uma camada real de banco de dados da Biblioteca, tabelas Supabase especificas para livros/leitura/favoritos, bucket privado, RLS da Biblioteca, API de catalogo, PDF.js, busca textual completa no conteudo do PDF ou IA conectada ao livro.

Status geral por maturidade:

| Area | Status | Percentual estimado |
|---|---|---:|
| Interface principal da Biblioteca | IMPLEMENTADO PARCIALMENTE | 70% |
| Catalogo e acervo local | IMPLEMENTADO PARCIALMENTE | 65% |
| Book Viewer/leitura | IMPLEMENTADO PARCIALMENTE | 72% |
| Persistencia de leitura/favoritos | MOCKADO / LOCAL | 35% |
| Supabase da Biblioteca | NAO IMPLEMENTADO | 5% |
| Area do professor/familia/universidade integrada a leitura | APENAS VISUAL / MOCKADO | 25% |
| Gamificacao de leitura | APENAS VISUAL / LOCAL | 25% |
| Pergunte ao Livro | APENAS VISUAL / PREPARADO | 15% |
| Testes/homologacao automatica | NAO IMPLEMENTADO | 10% |

Ponto critico: a Biblioteca ja esta boa para demonstracao navegavel, mas ainda nao esta pronta como produto multiusuario com persistencia real, seguranca de conteudo, historico sincronizado e recomendacoes por perfil.

## B. Inventario tecnico encontrado

### Paginas e rotas

| Arquivo | Funcao |
|---|---|
| `biblioteca.html` | Rota principal da Biblioteca Viva. Carrega `master-pack.css`, `styles.css`, `app-pages.js` e `script.js`. |
| `book-viewer.html` | Rota do leitor. Usa parametro `?book=...` e renderiza o livro ativo pelo `app-pages.js`. |
| `aluno.html` | Painel do aluno, com atalhos e fixtures que citam biblioteca, leitura, XP e medalhas. |
| `professor.html` | Painel do professor, com links/atalhos para biblioteca, sem fluxo real de indicacao de livros. |
| `familia.html` | Painel da familia, com links para biblioteca, sem acompanhamento real sincronizado. |
| `universidade.html` | Universidade/curadoria de cursos; possui conexao mockada com material da Biblioteca. |
| `login.html` / `login.js` | Porta de acesso demonstrativa e login Supabase opcional para areas de avaliacao. |

### Codigo principal

| Arquivo | Papel real |
|---|---|
| `app-pages.js` | Fonte principal da Biblioteca: catalogo, cards, hero, carrosseis, leitor, localStorage, busca, favoritos e integracoes visuais. |
| `master-pack.css` | Estilo principal da plataforma e ajustes recentes da Biblioteca/Book Viewer. |
| `styles.css` | Estilos legados/publicos e possiveis classes antigas da Biblioteca. |
| `script.js` | Logica legada/publica, principalmente Universidade e catalogos demonstrativos; tambem contem funcoes antigas que podem nao afetar a Biblioteca atual. |
| `supabase-config.js` | Configuracao publica Supabase. Biblioteca nao consome diretamente essa configuracao para catalogo/leitura. |

### Assets da Biblioteca

Pastas ativas encontradas:

| Pasta | Conteudo |
|---|---|
| `assets/biblioteca` | Capas/cards da Biblioteca. |
| `assets/livro-005` a `assets/livro-008` | Livros do aluno Infantil 4 e 5, com `pages`, `thumbs` e `pdf`. |
| `assets/guia-professor-004-v1` a `assets/guia-professor-005-v2` | Guias do Professor Infantil 4 e 5, com `pages`, `thumbs` e `pdf`. |
| `assets/avalia-portugues-2ano`, `assets/avalia-matematica-2ano`, `assets/avalia-matematica-6ano`, `assets/avalia-portugues-6ano` | Livros Avalia+, com `pages`, `thumbs` e `pdf`. |
| `assets/colecoes` | Imagens provisorias de colecoes. |
| `assets/aluno`, `assets/professor`, `assets/familia`, `assets/universidade` | Assets dos paineis integrados. |

Contagem conferida dos assets ativos:

| Livro | Paginas JPG | Thumbs | PDF |
|---|---:|---:|---:|
| `livro-005` | 120 | 120 | 1 |
| `livro-006` | 122 | 122 | 1 |
| `livro-007` | 128 | 128 | 1 |
| `livro-008` | 155 | 155 | 1 |
| `guia-professor-004-v1` | 93 | 93 | 1 |
| `guia-professor-004-v2` | 93 | 93 | 1 |
| `guia-professor-005-v1` | 99 | 99 | 1 |
| `guia-professor-005-v2` | 113 | 113 | 1 |
| `avalia-portugues-2ano` | 160 | 160 | 1 |
| `avalia-matematica-2ano` | 56 | 56 | 1 |
| `avalia-matematica-6ano` | 13 | 13 | 1 |
| `avalia-portugues-6ano` | 19 | 19 | 1 |

### Supabase, seeds e migrations

Arquivos encontrados:

| Arquivo | Relacao com Biblioteca |
|---|---|
| `supabase/migrations/202607280001_curation_pipeline.sql` | Universidade/curadoria de cursos, nao Biblioteca. |
| `supabase/migrations/202607280002_question_bank.sql` | Banco de Questoes, nao Biblioteca. |
| `supabase/migrations/202607280003_question_bank_activation.sql` | Ativacao/RLS do Banco de Questoes, nao Biblioteca. |
| `supabase/migrations/202607280004_question_bank_auth_roles.sql` | Perfis seguros do Banco de Questoes, nao Biblioteca. |
| `supabase/migrations/202607290001_digital_assessment_application.sql` | Aplicacao digital Avalia+, nao Biblioteca. |
| `data/curation_batches/*` | Seeds de curadoria/universidade. |
| `data/question_bank/*` | Seeds do banco de questoes. |

Nao foram encontradas migrations especificas para `books`, `book_pages`, `reading_progress`, `book_favorites`, `book_assignments`, `book_annotations`, `book_recommendations`, `book_ai_index` ou buckets privados da Biblioteca.

## C. Matriz funcional

### Pagina principal da Biblioteca

| Item | Status | Evidencia |
|---|---|---|
| Hero principal | IMPLEMENTADO E FUNCIONAL | `library2HeroHtml` em `app-pages.js`. DOM confirmou `.library-2-hero`. |
| Livro em destaque | IMPLEMENTADO E FUNCIONAL | `featuredLibraryBook` usa livro mais recente legivel. |
| Carrosseis | IMPLEMENTADO PARCIALMENTE | `buildBookCarousel`; visual horizontal, sem controles dedicados de scroll/setas. |
| Categorias | IMPLEMENTADO PARCIALMENTE | Colecoes visuais; nao ha filtro funcional por categoria. |
| Colecoes | IMPLEMENTADO PARCIALMENTE | Cards de colecoes existem; alguns estao em expansao/provisorios. |
| Novidades | IMPLEMENTADO PARCIALMENTE | `latestLibraryBooks` existe, mas nao aparece como secao forte separada na Biblioteca 2.0. |
| Recomendados | MOCKADO | Baseado em `collection === "Educacao Infantil"`, nao em perfil real. |
| Continuar lendo | IMPLEMENTADO PARCIALMENTE | Usa `localStorage` e `lastPage`; fallback de recentes. Nao sincroniza por usuario. |
| Livros mais acessados | NAO IMPLEMENTADO | Nao ha contador real de acessos por livro. |
| Busca | IMPLEMENTADO PARCIALMENTE | Busca DOM em `.app-search input`, cards sao ocultados; nao ha busca no banco/API. |
| Filtros | APENAS VISUAL / NAO IMPLEMENTADO | Links/nav existem, mas sem filtros estruturados. |
| Ordenacao | NAO IMPLEMENTADO | Ordenacao fixa por `publishedAt`; usuario nao muda. |
| Cards de livros | IMPLEMENTADO E FUNCIONAL | DOM confirmou 29 cards `[data-library-book-card]`. |
| Favoritos | IMPLEMENTADO PARCIALMENTE | Botao salva em `localStorage("library:favorites")`; sem usuario/Supabase. |
| Responsividade | IMPLEMENTADO PARCIALMENTE | Layout responde, mas auditoria DOM detectou overflow horizontal pequeno: 1269px em viewport de 1265px. |
| Loading | NAO IMPLEMENTADO | Sem skeleton/loading de catalogo; conteudo estatico. |
| Skeleton | NAO IMPLEMENTADO | Ausente. |
| Estados vazios | IMPLEMENTADO PARCIALMENTE | Busca oculta cards, mas nao ha mensagem vazia clara na Biblioteca atual. |
| Mensagens de erro | NAO IMPLEMENTADO | Sem tratamento de falha de asset/catalogo. |
| Navegacao para livro | IMPLEMENTADO E FUNCIONAL | Cards apontam para `book-viewer.html?book=...`. |
| Navegacao para leitor | IMPLEMENTADO E FUNCIONAL | DOM validado com `guia-professor-005-v2`. |
| Download PDF | REMOVIDO DA UI / AINDA PRESENTE NOS DADOS | DOM confirmou 0 links de download; `downloadHref` ainda existe em alguns registros. |

### Catalogo de livros

Fonte atual dos dados: arrays JavaScript em `app-pages.js`.

| Fonte | Status |
|---|---|
| Array JavaScript | IMPLEMENTADO E FUNCIONAL |
| JSON externo | NAO IMPLEMENTADO |
| Banco Supabase | NAO IMPLEMENTADO |
| Storage Supabase | NAO IMPLEMENTADO |
| API | NAO IMPLEMENTADO |
| Assets locais | IMPLEMENTADO E FUNCIONAL |

Campos existentes no `bookCatalog`:

| Campo | Status |
|---|---|
| `id` | IMPLEMENTADO |
| `title` | IMPLEMENTADO |
| `subtitle` | IMPLEMENTADO |
| `catalogTitle` | IMPLEMENTADO |
| `level` / ano | IMPLEMENTADO |
| `type` | IMPLEMENTADO |
| `collection` | IMPLEMENTADO |
| `stage` | PARCIAL, mais comum em Avalia+ |
| `component` | PARCIAL, mais comum em Avalia+ |
| `totalPages` | IMPLEMENTADO |
| `cover` | IMPLEMENTADO |
| `catalogCover` | IMPLEMENTADO |
| `pdf` | PARCIAL, existe nos livros renovados/Avalia+, mas o viewer nao usa para renderizar |
| `href` | IMPLEMENTADO |
| `thumb(page)` | IMPLEMENTADO |
| `page(page)` | IMPLEMENTADO |
| `summary` | IMPLEMENTADO |

Campos ausentes ou incompletos:

| Campo | Status |
|---|---|
| autor | NAO IMPLEMENTADO no catalogo da Biblioteca |
| editora/marca | NAO IMPLEMENTADO de forma estruturada |
| descricao/sinopse | NAO IMPLEMENTADO de forma estruturada |
| BNCC/competencias | NAO IMPLEMENTADO |
| faixa etaria | PARCIAL, inferida por `level` |
| disciplina | PARCIAL, via `component` em Avalia+ |
| volume | PARCIAL, em `subtitle/catalogTitle` |
| data de publicacao | IMPLEMENTADO apenas em `libraryBooks.publishedAt` |
| status de publicacao | PARCIAL, alguns registros provisorios |
| destaque | DERIVADO, nao campo explicito |
| slug | NAO IMPLEMENTADO |
| publico autorizado | NAO IMPLEMENTADO |
| permissao por perfil | NAO IMPLEMENTADO |

Observacao tecnica: os registros antigos da Educacao Infantil continuam declarados em `bookCatalog` e `libraryBooks`, mas sao substituidos por `splice(0, 12, ...)` e `splice(0, 16, ...)`. Na pratica, o acervo ativo usa os renovados; porem manter registros legados no mesmo array aumenta risco de erro em manutencoes futuras.

### Pagina individual do livro

Nao existe rota individual separada antes da leitura, como `livro.html?id=...`. O que existe e um bloco de metadados dentro do proprio Book Viewer.

| Item | Status |
|---|---|
| Capa | IMPLEMENTADO dentro do viewer |
| Titulo | IMPLEMENTADO dentro do viewer |
| Autor | NAO IMPLEMENTADO |
| Descricao | NAO IMPLEMENTADO |
| Metadados | IMPLEMENTADO PARCIALMENTE |
| Categorias | PARCIAL |
| Faixa etaria/ano | PARCIAL |
| Disciplina | PARCIAL |
| BNCC | NAO IMPLEMENTADO |
| Quantidade de paginas | IMPLEMENTADO |
| Botao Ler | IMPLEMENTADO nos cards |
| Botao Continuar | IMPLEMENTADO PARCIALMENTE |
| Botao Favoritar | IMPLEMENTADO PARCIALMENTE |
| Progresso | IMPLEMENTADO LOCAL |
| Livros relacionados | IMPLEMENTADO PARCIALMENTE no viewer por sugestao simples |
| Compartilhamento | NAO IMPLEMENTADO |
| Recomendacoes | MOCKADO |
| Permissoes de acesso | NAO IMPLEMENTADO na Biblioteca |

### Leitor de PDF / Book Viewer

O leitor atual nao abre o PDF real dentro da interface. Ele renderiza imagens JPG por pagina (`book.page(page)`) e miniaturas (`book.thumb(page)`). O PDF existe como asset local, mas nao e usado como origem dinamica por PDF.js.

Auditoria DOM em `book-viewer.html?book=guia-professor-005-v2`:

| Evidencia | Resultado |
|---|---|
| Titulo | Guia do Professor - Educacao Infantil 5 anos |
| Total de paginas no DOM | 113 |
| Miniaturas renderizadas | 113 |
| Itens do sumario | 6 |
| Abas | Indice, Busca, Pergunte ao Livro, Conquistas |
| Pagina atual | 1 / 113 |
| Zoom inicial | 100% |
| Botao favorito | Presente |
| Link de download visivel | 0 |
| Overflow horizontal no viewer | Nao detectado |

Matriz do leitor:

| Item | Status | Observacao |
|---|---|---|
| Abertura real do PDF | NAO IMPLEMENTADO | Usa JPGs, nao PDF.js. |
| Pagina anterior | IMPLEMENTADO E FUNCIONAL | `data-prev-page`. |
| Proxima pagina | IMPLEMENTADO E FUNCIONAL | `data-next-page`. |
| Selecao direta de pagina | IMPLEMENTADO E FUNCIONAL | Miniaturas e sumario com `data-goto-page`. |
| Zoom | IMPLEMENTADO E FUNCIONAL | Ajusta CSS `--zoom`, limite 75% a 165%. |
| Ajuste a largura | NAO IMPLEMENTADO | Nao ha botao/algoritmo especifico. |
| Ajuste a pagina | NAO IMPLEMENTADO | Nao ha modo especifico. |
| Tela cheia | IMPLEMENTADO PARCIALMENTE | Usa `requestFullscreen` no stage quando disponivel. |
| Miniaturas | IMPLEMENTADO E FUNCIONAL | Gera todas por loop. |
| Indice | IMPLEMENTADO E FUNCIONAL | Usa `summary`. |
| Busca por palavra | IMPLEMENTADO PARCIALMENTE | Busca apenas no sumario/metadados, nao no texto completo do PDF. |
| Barra de progresso | IMPLEMENTADO E FUNCIONAL | Calculada por pagina atual. |
| Numero atual da pagina | IMPLEMENTADO E FUNCIONAL | `data-page-label`. |
| Total de paginas | IMPLEMENTADO E FUNCIONAL | `activeBook.totalPages`. |
| Ultima pagina lida | IMPLEMENTADO PARCIALMENTE | Salva `lastPage` em localStorage. |
| Retomada automatica | QUEBRADO / PARCIAL | A inicializacao retoma `bookmark`, nao `lastPage`; ultima pagina salva nao e usada diretamente para abrir. |
| Favoritos | IMPLEMENTADO PARCIALMENTE | `library:favorites` em localStorage. |
| Marcacao de pagina | IMPLEMENTADO PARCIALMENTE | Um marcador por livro em localStorage. |
| Anotacoes | NAO IMPLEMENTADO | Ausente. |
| Compartilhamento | NAO IMPLEMENTADO | Ausente. |
| Impressao | NAO IMPLEMENTADO | Ausente. |
| Download | NAO IMPLEMENTADO NA UI | Removido da interface; PDFs seguem acessiveis se URL direta for conhecida. |
| Controle de permissoes | NAO IMPLEMENTADO | Sem autorizacao por livro/asset. |
| Responsividade celular/tablet | IMPLEMENTADO PARCIALMENTE | CSS responsivo existe, mas sem teste automatizado formal. |
| Tratamento de erro | NAO IMPLEMENTADO | Sem fallback se pagina JPG falhar. |
| Loading | IMPLEMENTADO PARCIALMENTE | Classe `is-loading` na imagem, sem skeleton. |
| Salvamento de progresso | IMPLEMENTADO LOCAL | `localStorage`, nao usuario real. |
| Acessibilidade por teclado | IMPLEMENTADO PARCIALMENTE | Setas esquerda/direita funcionam; sem mapa completo ARIA/foco. |

## D. Percentuais por area

| Area | Implementado real | Parcial/mock/visual | Ausente |
|---|---:|---:|---:|
| UI principal da Biblioteca | 45% | 35% | 20% |
| Catalogo/acervo | 50% | 30% | 20% |
| Leitor | 55% | 30% | 15% |
| Persistencia | 15% | 30% | 55% |
| Supabase/Banco da Biblioteca | 0% | 5% | 95% |
| Seguranca de conteudo | 5% | 10% | 85% |
| Professor/Familia | 10% | 35% | 55% |
| Universidade | 15% | 35% | 50% |
| Gamificacao | 15% | 30% | 55% |
| IA/Pergunte ao Livro | 0% | 15% | 85% |
| Testes | 10% | 10% | 80% |

## E. Lista do que esta pronto

- Biblioteca principal abre e renderiza uma experiencia premium com hero, indicadores, continuar leitura, recomendados, guias do professor, colecoes e acervo completo.
- Cards do acervo navegam para `book-viewer.html?book=...`.
- Book Viewer abre o livro ativo por parametro de URL.
- Miniaturas sao geradas para todas as paginas cadastradas.
- Sumario navega para paginas.
- Botoes de pagina anterior/proxima funcionam.
- Zoom basico funciona.
- Tela cheia basica esta implementada quando o navegador suporta `requestFullscreen`.
- Progresso visual da leitura funciona durante a sessao.
- Ultima pagina e historico sao salvos localmente.
- Favoritos funcionam localmente.
- Aba "Pergunte ao Livro" existe como preparacao visual.
- Aba "Conquistas" existe e reage ao progresso local.
- Links de download nao aparecem no DOM da Biblioteca/Viewer auditados.
- `node --check app-pages.js` passou sem erro de sintaxe.

## F. Lista do que esta parcial, mockado ou apenas visual

- Recomendacoes sao deterministicas por colecao, nao por perfil.
- Continuar lendo depende de localStorage do dispositivo.
- Favoritos nao sao sincronizados por usuario.
- Historico nao e multiusuario.
- XP de leitura e calculado localmente no viewer.
- Conquistas nao sao registradas em perfil real.
- Area do professor mostra intencao de indicar livros, mas nao possui fluxo de atribuicao para turmas.
- Area da familia mostra intencao de acompanhamento, mas nao recebe dados reais de leitura.
- Universidade possui conexao pontual mockada com `livro-005`, nao recomendacao real por curso.
- Busca da Biblioteca filtra DOM local.
- Busca do leitor pesquisa apenas sumario/metadados.
- Login protege rotas por front-end/localStorage; nao protege assets nem PDFs.
- `downloadHref` ainda existe em registros de dados, embora a UI nao renderize download.

## G. Lista do que nao existe

- Tabelas Supabase de livros/catalogo da Biblioteca.
- Tabelas Supabase de progresso de leitura.
- Tabelas Supabase de favoritos.
- Tabelas Supabase de historico de leitura.
- Tabelas Supabase de indicacoes professor-turma.
- Tabelas Supabase de acompanhamento familiar.
- Tabelas Supabase de recomendacoes.
- Tabelas Supabase de anotacoes.
- Tabelas Supabase de eventos de XP/conquistas por leitura.
- Buckets privados e politicas Storage para PDFs/paginas.
- RLS especifica da Biblioteca.
- API/servico de catalogo.
- PDF.js ou abertura real do PDF no leitor.
- Extracao de texto do PDF no front-end.
- Indice textual completo.
- Vetorizacao/embeddings do PDF.
- IA real na aba "Pergunte ao Livro".
- Pagina individual de livro antes da leitura.
- Filtros estruturados e ordenacao pelo usuario.
- Estados de erro/loading robustos.
- Testes automatizados de Biblioteca/Viewer.

## H. Bugs e riscos tecnicos

1. Pequeno overflow horizontal na Biblioteca: auditoria DOM registrou viewport de 1265px com `scrollWidth` de 1269px.
2. Retomada automatica da ultima pagina esta incompleta: o reader salva `${book.id}:lastPage`, mas na entrada retoma `bookmark`, nao `lastPage`.
3. Registros antigos da Infantil continuam no codigo e sao substituidos por `splice`; isso torna o catalogo dificil de auditar e arriscado para futuras inclusoes.
4. `downloadHref` segue presente em varios registros, apesar de a interface nao mostrar download.
5. PDFs e paginas ficam em assets publicos; concorrentes ou usuarios podem acessar arquivos por URL direta se conhecerem o caminho.
6. O termo "PDF reader" pode gerar expectativa incorreta, porque o leitor nao renderiza PDF real, mas imagens derivadas.
7. Busca do leitor nao consulta texto completo do livro.
8. Nao ha tratamento se uma imagem de pagina/thumb/capa nao carregar.
9. Nao ha testes automatizados nem build formal; `package.json` esta ausente.
10. `script.js` mantem logicas legadas que podem conflitar ou confundir manutencao futura.

## I. Plano executivo recomendado

### Fase 1 - Acertos imediatos sem mudar arquitetura

- Corrigir overflow horizontal da Biblioteca.
- Ajustar retomada automatica para usar `lastPage` quando nao houver `page` na URL.
- Remover `downloadHref` dos registros ou garantir que nunca seja renderizado.
- Limpar ou isolar registros legados da Educacao Infantil substituidos por `splice`.
- Adicionar estado vazio da busca.
- Adicionar fallback visual para erro de capa/pagina/thumb.

### Fase 2 - Organizar catalogo

- Extrair catalogo para `data/library-catalog.js` ou JSON estruturado.
- Separar campos editoriais: titulo, subtitulo, autor, editora, segmento, ano, disciplina, tipo, volume, BNCC, paginas, status, publico autorizado.
- Criar validacao local de consistencia: totalPages = quantidade de JPGs = quantidade de thumbs.
- Criar relatorio automatico de assets faltantes.

### Fase 3 - Supabase Biblioteca

- Criar migrations para `library_books`, `library_book_assets`, `library_categories`, `library_collections`, `reading_progress`, `reading_history`, `book_favorites`, `book_assignments`, `book_recommendations`, `book_annotations`.
- Criar politicas RLS por perfil: aluno, professor, familia, gestor, admin.
- Migrar PDFs/paginas para Storage com buckets e politicas adequadas.
- Sincronizar favoritos, historico, progresso e XP por usuario.

### Fase 4 - Leitor real e busca

- Decidir entre continuar com JPGs otimizados ou adotar PDF.js.
- Se continuar com JPGs, criar indice textual extraido dos PDFs no backend.
- Implementar busca textual completa com pagina e trecho.
- Adicionar anotacoes, marcadores multiplos e compartilhamento controlado.

### Fase 5 - IA, professor/familia/universidade e gamificacao

- Implementar "Pergunte ao Livro" com extracao de texto, embeddings, citacoes por pagina e controle de acesso.
- Criar fluxo do professor para indicar livros a turmas.
- Criar acompanhamento familiar por estudante.
- Integrar Universidade com recomendacoes reais por curso/trilha/material.
- Registrar eventos de leitura para XP, medalhas e conquistas reais.

## J. Checklist de homologacao

### Homologado nesta auditoria

- [x] Estrutura principal localizada.
- [x] Catalogo atual identificado como arrays JavaScript.
- [x] Assets ativos conferidos por contagem de paginas, thumbs e PDFs.
- [x] Supabase auditado em migrations existentes.
- [x] Confirmado que nao ha migrations especificas da Biblioteca.
- [x] Confirmado que a Biblioteca abre com hero, cards, carrosseis e acervo.
- [x] Confirmado que o Book Viewer abre `guia-professor-005-v2` com 113 miniaturas.
- [x] Confirmado que nao ha botao/link visivel de download na Biblioteca/Viewer auditados.
- [x] Confirmado `node --check app-pages.js` sem erro de sintaxe.

### Pendente para homologacao completa

- [ ] Teste visual automatizado em desktop, notebook, tablet e mobile.
- [ ] Suite de regressao da Biblioteca.
- [ ] Teste automatizado de busca com termos principais.
- [ ] Teste automatizado de navegacao por todos os livros ativos.
- [ ] Teste de imagens quebradas.
- [ ] Teste de persistencia cross-device com Supabase.
- [ ] Teste de permissoes por perfil.
- [ ] Teste de acesso direto aos PDFs/assets.
- [ ] Teste real da futura IA "Pergunte ao Livro".

## Conclusao

A Biblioteca Viva 2.0 esta em bom estagio para showroom e demonstracao premium, mas sua arquitetura ainda e majoritariamente estatica/local. A proxima etapa nao deve reconstruir a experiencia visual; deve consolidar a base tecnica: limpar catalogo legado, corrigir pequenas quebras de layout, tornar a retomada de leitura real, separar dados do codigo e iniciar a camada Supabase propria da Biblioteca.
