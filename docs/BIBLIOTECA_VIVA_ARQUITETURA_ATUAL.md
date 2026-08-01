# Biblioteca Viva - Arquitetura Atual

Data: 31/07/2026  
Escopo: estado atual apos a Missao 01 de estabilizacao e saneamento.

## Visao geral

A Biblioteca Viva funciona como um modulo front-end estatico da plataforma. O catalogo, a Biblioteca e o Book Viewer ficam centralizados em `app-pages.js`, com estilos em `master-pack.css` e assets locais em `assets/`.

Nao ha, nesta fase, banco Supabase especifico da Biblioteca, bucket privado, PDF.js ou IA conectada ao conteudo dos PDFs.

## Laboratorio de experiencias digitais infantis

A infraestrutura oficial das experiencias digitais da Educacao Infantil fica em `infantil-experience-catalog.js`.

Ela define:

- faixas etarias `EI2`, `EI3`, `EI4` e `EI5`;
- volumes `V1` e `V2`;
- experiencias `RS-EI*-V*-EXP-001`;
- ativos exclusivos de volume `RS-EI*-V*-001`;
- ativos compartilhados por faixa etaria `RS-EI*-C-001`;
- ativos universais da Educacao Infantil `RS-EI-C-001`;
- funcoes `getExperienceAsset`, `getAssetsByAgeGroup`, `getAssetsByVolume` e `getSharedInfantilAssets`.

As paginas `biblioteca.html`, `jogos.html` e `missao.html` carregam esse catalogo antes dos scripts principais. O motor de jogos expoe `window.RSGameEngine.infantilExperiences` e `window.RSGameEngine.getExperienceAsset(code)` para que novos componentes resolvam arquivos por codigo, sem receber caminho solto.

A estrutura oficial de assets foi criada em `assets/experiencias/infantil/`, com pastas compartilhadas e volumes para `EI2`, `EI3`, `EI4` e `EI5`. Arquivos ainda nao enviados permanecem no catalogo com status `awaiting-upload`.

Para validar a camada de experiencias:

```bash
node tools/validate-infantil-experience-catalog.js
```

### Fase 02 - primeira experiencia funcional

A experiencia piloto real e:

- codigo: `RS-EI4-V1-EXP-001`;
- titulo: `A Caixa Misteriosa`;
- livro: `livro-005` (`Educacao Infantil 4 anos - Volume 1`);
- paginas vinculadas: 18, 19, 20 e 21;
- campo de experiencia: escuta, fala, pensamento e imaginacao; espacos, tempos, quantidades, relacoes e transformacoes;
- objetivo: estimular observacao, escuta atenta, formulacao de hipoteses e ampliacao de vocabulario;
- tipo: `video-guided-exploration`;
- ativo oficial definitivo: `RS-EI4-V1-001`;
- caminho definitivo preparado: `assets/experiencias/infantil/ei4/volume-1/videos/rs-ei4-v1-001-caixa-misteriosa.mp4`;
- MP4 provisorio para homologacao: `assets/video/RS-020-video-institucional.mp4`;
- status editorial atual: `published`;
- disponibilidade: `available`.

O MP4 institucional e usado apenas como ativo provisorio identificado para homologacao funcional. O contrato definitivo do ativo continua preparado para receber o video final no caminho oficial.

### Player oficial de experiencias

O player reutilizavel fica em `game-engine.js`, no controlador `experiencePlayerController`. Ele abre qualquer experiencia cadastrada em `infantil-experience-catalog.js`, desde que exista um `openingAssetCode`.

Controles implementados:

- reproduzir;
- pausar;
- reiniciar;
- ativar/desativar audio;
- tela cheia;
- fechar;
- repetir experiencia;
- link para localizar a atividade no Book Viewer.

Estados centralizados no catalogo:

- `unavailable`;
- `in-production`;
- `available`;
- `loading`;
- `running`;
- `paused`;
- `completed`;
- `error`.

### Metodos publicos

`window.RSGameEngine` expoe:

- `openExperience(code)`;
- `closeExperience()`;
- `startExperience(code)`;
- `pauseExperience(code)`;
- `restartExperience(code)`;
- `completeExperience(code)`;
- `getExperienceProgress(code)`;
- `getExperienceAsset(code)`.
- `getOfficialBook(bookId)`;
- `getExperiencesByBook(bookId)`;
- `getExperiencesByPage(bookId, page)`;
- `getBookUnits(bookId)`;
- `getExperiencePublicUrl(code, baseUrl)`;
- `getExperienceQrPayload(code, baseUrl)`;
- `getExperienceResources(code)`.

As paginas nao devem duplicar logica do player. A Biblioteca apenas renderiza o card e chama `openExperience(code)`.

### Armazenamento local de progresso

Enquanto a persistencia remota nao existe, o progresso usa:

```text
raizes:infantil-experience-progress:v1
```

Cada registro armazena codigo da experiencia, usuario local demonstrativo, inicio, ultimo inicio, conclusao, quantidade de inicios, conclusoes, repeticoes, percentual assistido, status e data de atualizacao.

Essa camada fica isolada em `experienceProgressStore`, preparada para ser trocada por Supabase depois.

### Como cadastrar a segunda experiencia

1. Adicionar ou atualizar o ativo em `experienceAssets`, mantendo o codigo oficial.
2. Definir `filePath` no caminho oficial da pasta da faixa/volume.
3. Usar `provisionalFilePath` somente se o MP4 definitivo ainda nao existir.
4. Atualizar a experiencia em `experienceDefinitions` com titulo, descricao, objetivo, campo, paginas, livro, tipo, duracao, disponibilidade e instrucoes.
5. Vincular `openingAssetCode`, `successAssetCode`, `retryAssetCode` e `completionAssetCode`.
6. Rodar `node tools/validate-infantil-experience-catalog.js` quando o Node do ambiente estiver normal.
7. Abrir `biblioteca.html`, localizar o card e testar abrir, reproduzir, pausar, reiniciar, fechar e recarregar.

Nao e necessario alterar o player para a segunda experiencia.

### Validacao da Fase 02

No ambiente atual, o binario externo do Node responde a `node --version` (`v24.14.0`), mas fica preso ate com `node -e "console.log('node-ok')"`. O mesmo ocorre com `node --check` e com os validadores. A execucao com subprocesso Python e timeout confirma que o travamento acontece antes da logica dos validadores.

A validacao do catalogo foi executada no runtime JS do Codex (`node_repl`) e retornou:

- 36 ativos;
- 8 experiencias;
- nenhum codigo duplicado;
- nenhum caminho provisorio ausente;
- referencias de ativos validas;
- piloto `RS-EI4-V1-EXP-001` vinculado a `RS-EI4-V1-001`.

### Fase 03 - ambiente premium

A Biblioteca Viva passou a ter uma home premium orientada por experiencias, renderizada por `renderPremiumLibrary()` em `app-pages.js`.

Fluxo atual:

1. `biblioteca.html` abre a home premium.
2. O aluno ve saudacao personalizada, destaque da semana, progresso visual, busca, filtros, continuar de onde parou, recomendadas, recentes, favoritos e mapa hierarquico.
3. Cada experiencia usa o mesmo componente `renderExperienceOfficialCard()`.
4. O clique em `Viver esta experiencia` abre a pagina propria da experiencia em `biblioteca.html?experience=CODIGO`.
5. A pagina propria exibe descricao, objetivo pedagogico, paginas do livro, habilidades BNCC, materiais complementares, experiencias relacionadas e botao `Iniciar experiencia`.
6. Somente o botao `Iniciar experiencia` abre o player audiovisual.

Busca e filtros:

- titulo;
- codigo;
- idade;
- volume;
- unidade;
- livro;
- habilidade BNCC;
- palavra-chave;
- status visual (`nao iniciada`, `em andamento`, `concluida`, `recentes`).

Navegacao hierarquica:

```text
Educacao Infantil -> idade -> volume -> unidade -> experiencia
```

O mapa ja nasce com `EI2`, `EI3`, `EI4` e `EI5`, `V1` e `V2`, usando os mesmos dados do catalogo.

Validacao da Fase 03:

- home premium carregada em `biblioteca.html`;
- 11 cards renderizados na home com o componente oficial;
- busca por `caixa` retornou somente `RS-EI4-V1-EXP-001`;
- perfil proprio abriu em `biblioteca.html?experience=RS-EI4-V1-EXP-001`;
- perfil nao renderiza video antes do inicio;
- botao `Iniciar experiencia` abriu o player;
- mobile 390px sem overflow horizontal;
- console sem erros ou avisos durante o fluxo testado.

### Fase 04 - progresso, favoritos e continuidade

A Biblioteca Viva agora possui um modelo unico de acompanhamento por usuario e experiencia, centralizado em `experienceProgressStore` dentro de `game-engine.js`.

Formato normalizado de cada registro:

```js
{
  userId,
  experienceCode,
  status,
  progressPercent,
  currentTime,
  duration,
  startedAt,
  lastAccessedAt,
  completedAt,
  repeatCount,
  isFavorite,
  accessCount,
  history
}
```

Status oficiais:

- `not_started`;
- `in_progress`;
- `completed`.

A conclusao acontece quando o aluno assiste pelo menos 90% do video ou quando o player dispara o evento de fim. Abrir o perfil registra acesso recente, mas nao marca a experiencia como iniciada. O status `in_progress` nasce no player, a partir de iniciar, retomar, pausar ou salvar progresso real de reproducao.

Metodos publicos expostos por `window.RSGameEngine`:

- `getUserExperienceProgress(userId, experienceCode)`;
- `saveUserExperienceProgress(userId, experienceCode, data)`;
- `getUserExperienceHistory(userId)`;
- `getUserFavorites(userId)`;
- `toggleExperienceFavorite(userId, experienceCode)`;
- `getContinueWatching(userId)`;
- `getExperienceSummary(userId, experiences)`.

A home premium usa esses dados para renderizar:

- percentual concluido;
- experiencias iniciadas;
- experiencias concluidas;
- experiencias em andamento;
- favoritos;
- experiencias disponiveis;
- continuar de onde parou;
- ultimas acessadas;
- favoritos salvos;
- recomendacoes deterministicas a partir da ultima experiencia e da faixa/volume.

Os cards oficiais e o perfil da experiencia refletem o mesmo registro: barra de progresso, status visual, botao contextual (`Viver esta experiencia`, `Continuar experiencia` ou `Viver novamente`) e favorito. O player salva inicio, pausa, retomada, repeticao, conclusao, erro e fechamento, com persistencia progressiva durante a reproducao.

### Fase 05 - integracao livro, pagina e experiencia

A integracao editorial definitiva fica no catalogo central `infantil-experience-catalog.js`; nao existe catalogo paralelo de experiencias.

Hierarquia usada:

```text
colecao -> segmento -> faixa etaria -> livro -> volume -> unidade -> sequencia -> paginas -> atividade -> recurso digital
```

Contrato oficial de livros:

```js
{
  bookId,
  collectionCode,
  segment,
  ageGroup,
  volume,
  semester,
  title,
  subtitle,
  coverAsset,
  teacherBookId,
  status,
  units
}
```

O catalogo exporta `officialBooks` e os metodos `getOfficialBook(bookId)`, `getExperiencesByBook(bookId)`, `getExperiencesByPage(bookId, page)` e `getBookUnits(bookId)`.

Contrato editorial das experiencias:

```js
{
  id,
  code,
  bookId,
  ageGroup,
  volume,
  unitCode,
  unitTitle,
  sequenceCode,
  sequenceTitle,
  pageStart,
  pageEnd,
  activityTitle,
  activityDescription,
  studentInstruction,
  pedagogicalObjective,
  experienceFields,
  bnccCodes,
  keywords,
  experienceType,
  resources,
  openingAssetCode,
  relatedExperienceCodes,
  teacherGuidance,
  status
}
```

`openingAssetCode` foi mantido por compatibilidade. O player prioriza `resources[]` quando ha um recurso de video com papel `opening` ou `main`.

Rotas implementadas:

- `biblioteca.html`: home premium;
- `biblioteca.html?book=livro-005`: pagina editorial do livro;
- `biblioteca.html?book=livro-005&page=18`: experiencias vinculadas a pagina;
- `biblioteca.html?experience=RS-EI4-V1-EXP-001`: perfil proprio da experiencia;
- `book-viewer.html?book=livro-005&page=18`: leitura digital da pagina.

A pagina do livro mostra capa, nome oficial, faixa etaria, volume, semestre, unidades, quantidade de experiencias, progresso do aluno no livro, experiencias disponiveis/concluidas e botao para continuar o percurso. Cada unidade e expansivel e possui codigo, titulo, descricao, quantidade de experiencias, progresso e estado visual.

Status editorial aceitos:

- `planned`;
- `in_production`;
- `review`;
- `approved`;
- `published`;
- `archived`.

Esse status e separado do progresso do aluno (`not_started`, `in_progress`, `completed`). Uma experiencia em `in_production` nao deve usar `availability: "available"`.

URL publica e QR Code:

- `getExperiencePublicUrl(code, baseUrl)`;
- `getExperienceQrPayload(code, baseUrl)`.

A base padrao e `https://app.raizesesaberes.com.br`, configuravel por `window.RAIZES_EXPERIENCE_PUBLIC_BASE_URL` ou pelo argumento `baseUrl`. O payload de QR Code nao usa `localhost` nem `127.0.0.1` por padrao.

Vinculo futuro com Livro do Professor:

Cada experiencia pode declarar `teacherGuidance` com `teacherBookId`, paginas, mediacao, preparacao, materiais, pontos de observacao e sugestoes avaliativas. A Biblioteca ja exibe o resumo desse contrato no perfil da experiencia.

Para cadastrar um novo livro:

1. Adicionar o registro em `officialBooks`, com `bookId`, faixa, volume, semestre, capa, status e unidades.
2. Garantir que exista rota de leitura no `bookCatalog` quando houver Book Viewer correspondente.
3. Vincular experiencias futuras usando o mesmo `bookId`.
4. Rodar `node tools/validate-infantil-experience-catalog.js`.

Para vincular uma experiencia a uma atividade:

1. Preencher `bookId`, `unitCode`, `unitTitle`, `sequenceCode`, `sequenceTitle`, `pageStart`, `pageEnd`, `activityTitle` e `activityDescription`.
2. Declarar `studentInstruction`, `pedagogicalObjective`, `experienceFields`, `bnccCodes` e `keywords`.
3. Declarar `resources[]`; manter `openingAssetCode` apontando para o recurso principal de video quando existir.
4. Definir `status` editorial e `availability` coerentes.
5. Rodar o validador e testar `biblioteca.html?book=ID&page=NUMERO`.

Validacao da Fase 05:

- `biblioteca.html?book=livro-005` abriu a pagina editorial do livro;
- unidade `EI4-V1-U1` apareceu expansivel;
- `biblioteca.html?book=livro-005&page=18` localizou `RS-EI4-V1-EXP-001`;
- `biblioteca.html?book=livro-005&page=99` mostrou mensagem sem erro;
- livro inexistente mostrou estado vazio;
- perfil exibiu localizacao editorial, recursos digitais, URL publica, QR payload e Livro do Professor;
- player abriu o recurso de video principal;
- console sem novos erros no fluxo testado;
- validador do catalogo retornou `exitCode=0` no runtime JS do Codex.

### Fase 06 - motor universal de atividades interativas

A Biblioteca Viva agora possui um motor reutilizavel para atividades interativas dentro de `game-engine.js`, integrado ao mesmo catalogo, perfil de experiencia e progresso local.

Metodos publicos em `window.RSGameEngine`:

- `openInteractiveActivity(code)`;
- `startInteractiveActivity(code)`;
- `submitInteractiveAnswer(code, answer)`;
- `restartInteractiveActivity(code)`;
- `completeInteractiveActivity(code)`;
- `closeInteractiveActivity()`;
- `getInteractiveActivityState(code)`;
- `getInteractiveActivity(code)`;
- `getInteractiveActivitiesByExperience(experienceCode)`.

O progresso das atividades usa chave separada:

```text
raizes:interactive-activity-progress:v1
```

Cada registro guarda `activityCode`, `experienceCode`, estado atual, status, resposta selecionada, resposta correta quando concluida, tentativas, inicio, ultimo acesso, conclusao, duracao, reinicios, abandonos e historico.

Estados do motor:

- `not_started`;
- `ready`;
- `playing_intro`;
- `presenting_question`;
- `waiting_answer`;
- `checking_answer`;
- `correct`;
- `incorrect`;
- `completed`;
- `paused`;
- `error`.

Tipos com contrato preparado:

- `select_option`;
- `count_and_select`;
- `tap_objects`;
- `drag_and_drop`;
- `match_pairs`;
- `sort_sequence`;
- `classify`;
- `complete_word`;
- `trace_path`;
- `memory_game`.

Nesta fase, o tipo funcional e `count_and_select`.

Contrato das atividades:

```js
{
  code,
  experienceCode,
  bookId,
  pageStart,
  pageEnd,
  type,
  title,
  instruction,
  narrationText,
  openingResource,
  scene,
  question,
  feedback,
  completionRule,
  maxAttempts,
  status
}
```

As cenas sao formadas por objetos configuraveis:

```js
{
  id,
  type,
  asset,
  x,
  y,
  width,
  height,
  initialState,
  animation,
  interaction,
  accessibilityLabel
}
```

As posicoes usam percentuais, nao pixels fixos, para preservar responsividade. A atividade piloto usa joaninhas desenhadas por CSS (`asset: "css:ladybug"`), com animacao tambem em CSS e respeito a `prefers-reduced-motion`.

Atividade piloto:

- codigo: `RS-EI4-V1-INT-001`;
- experiencia: `RS-EI4-V1-EXP-001`;
- livro: `livro-005`;
- paginas: 18 a 21;
- tipo: `count_and_select`;
- titulo: `AS JOANINHAS QUE VOARAM`;
- cena: 5 joaninhas;
- animacao: 2 joaninhas voam;
- pergunta: `QUANTAS JOANINHAS RESTARAM?`;
- opcoes: 2, 3 e 5;
- resposta correta: 3;
- regra de conclusao: `correct_answer`.

O perfil da experiencia exibe o recurso `interactive` e abre o motor por `data-open-interactive-activity`. Ao concluir a atividade, o motor registra o resultado da atividade e tambem marca a experiencia vinculada como concluida quando a regra editorial da experiencia exige `interactive_activity_completed`.

Para cadastrar a segunda atividade do mesmo tipo:

1. Adicionar um item em `interactiveActivityDefinitions`.
2. Vincular `experienceCode`, `bookId`, paginas e `type: "count_and_select"`.
3. Configurar `scene.objects` com os objetos visuais e animacoes.
4. Configurar `question.options` e `question.correctAnswer`.
5. Configurar mensagens em `feedback.correct` e `feedback.incorrect`.
6. Adicionar o recurso `{ type: "interactive", activityCode, role: "main" }` em `experience.resources`.
7. Rodar `node tools/validate-infantil-experience-catalog.js`.

Validacao da Fase 06:

- perfil de `RS-EI4-V1-EXP-001` exibiu o recurso `AS JOANINHAS QUE VOARAM`;
- motor abriu `RS-EI4-V1-INT-001`;
- 5 joaninhas renderizadas;
- botao `INICIAR` disparou a animacao;
- 2 joaninhas receberam estado de voo;
- opcoes ficaram habilitadas apos a animacao;
- resposta incorreta mostrou `VAMOS OBSERVAR NOVAMENTE?` e permitiu nova tentativa;
- resposta correta concluiu a atividade;
- reabertura recuperou estado `completed` e tentativas;
- validador retornou `exitCode=0`;
- console sem novos erros no fluxo testado.

### Fase 07 - pacote oficial de componentes interativos

O motor interativo passou a usar um registro central de tipos em `infantil-experience-catalog.js`:

```js
INTERACTIVE_ACTIVITY_TYPE_REGISTRY = {
  select_option: {...},
  tap_objects: {...},
  drag_and_drop: {...},
  match_pairs: {...},
  sort_sequence: {...},
  classify: {...},
  complete_word: {...},
  trace_path: {...},
  memory_game: {...},
  count_and_select: {...}
}
```

Cada tipo declara `label`, `component`, regras de conclusao aceitas, campos obrigatorios e suporte a teclado. `INTERACTIVE_ACTIVITY_TYPES` continua existindo como lista derivada para compatibilidade com validadores e telas.

Tipos entregues no pacote oficial:

- `select_option`: opcoes de texto/numero com acerto unico;
- `tap_objects`: selecao de objetos em cena;
- `drag_and_drop`: alternativa acessivel por selecionar item e destino;
- `match_pairs`: selecao de dois elementos para formar pares;
- `sort_sequence`: ordenacao com botoes de subir/descer;
- `classify`: itens enviados para categorias;
- `complete_word`: palavra com lacuna e escolhas;
- `trace_path`: pontos tocados em ordem;
- `memory_game`: cartas com pares;
- `count_and_select`: cena contavel e resposta por opcoes.

Componentes especificos registrados:

- COMPONENTE ESPECIFICO 001: `Magic Box` V1. Componente reutilizavel da Caixa Misteriosa, preparado para animacoes por video, sprite ou sequencia de imagens, com maquina de estados propria (`idle`, `breathing`, `touch`, `shake`, `glow`, `anticipation`, `idle`) e eventos `onTouch`, `onAnimationEnd` e `onReveal`.

Personagens registrados:

- PERSONAGEM: `Bia`. Estados homologados para personagem reativo: `Idle`, `Looking`, `Inviting`, `Celebrating`.

Atividades de homologacao vinculadas a `RS-EI4-V1-EXP-001`:

- `RS-EI4-V1-INT-001`: `count_and_select`;
- `RS-EI4-V1-INT-002`: `select_option`;
- `RS-EI4-V1-INT-003`: `tap_objects`;
- `RS-EI4-V1-INT-004`: `drag_and_drop`;
- `RS-EI4-V1-INT-005`: `match_pairs`;
- `RS-EI4-V1-INT-006`: `sort_sequence`;
- `RS-EI4-V1-INT-007`: `classify`;
- `RS-EI4-V1-INT-008`: `complete_word`;
- `RS-EI4-V1-INT-009`: `trace_path`;
- `RS-EI4-V1-INT-010`: `memory_game`.

Todos usam o mesmo overlay, cabecalho, botoes de narracao/reinicio/audio, feedback, persistencia e eventos de progresso. O motor reseta `workingState` ao abrir, reiniciar e fechar para evitar residuos entre tipos diferentes.

Feedback comum:

- correto;
- incorreto;
- parcial correto, usado por pares e memoria;
- conclusao;
- orientacao/repeticao de narracao.

O feedback pode apontar para audio no catalogo, mas nesta fase nao reproduz automaticamente audio antes de uma acao do usuario.

Sistema de dicas:

- o overlay possui botao `DICA`;
- o motor usa `activity.hints[]` quando existir;
- sem dica especifica, reapresenta a instrucao/orientacao sem revelar a resposta;
- cada uso incrementa `hintsUsed`;
- o evento `hint` fica registrado no historico da atividade.

Registro de resultados:

Cada atividade salva dados compatíveis com o futuro painel do professor:

- `answers`;
- `selectedAnswer`;
- `correctAnswer`;
- `correctCount`;
- `incorrectCount`;
- `attempts`;
- `hintsUsed`;
- `score`;
- `durationMs`;
- `restartCount`;
- `abandonedCount`;
- `completedAt`;
- `history`.

Validador por tipo:

- `drag_and_drop` exige item e destino;
- `match_pairs` exige pares completos;
- `sort_sequence` exige ordem correta;
- `classify` exige categorias e itens;
- `complete_word` exige palavra, resposta e opcoes;
- `trace_path` exige pelo menos dois pontos;
- `memory_game` exige pares de cartas;
- `select_option` e `count_and_select` exigem pergunta, opcoes e resposta;
- contratos publicados precisam de feedback e regra de conclusao.

Para cadastrar uma nova atividade sem alterar componentes:

1. Escolher um tipo existente em `INTERACTIVE_ACTIVITY_TYPE_REGISTRY`.
2. Criar um item em `interactiveActivityDefinitions`.
3. Preencher os campos obrigatorios do tipo.
4. Vincular `{ type: "interactive", activityCode, role }` em `experience.resources`.
5. Rodar `node tools/validate-infantil-experience-catalog.js`.
6. Testar no perfil da experiencia.

Validacao da Fase 07:

- catalogo com 10 tipos registrados;
- 10 atividades publicadas, uma por tipo;
- validador retornou `exitCode=0`;
- perfil da experiencia listou os 10 codigos interativos;
- os 10 tipos abriram e fecharam consecutivamente;
- `select_option`, `complete_word` e `tap_objects` testados com erro/acerto;
- `drag_and_drop`, `sort_sequence`, `classify`, `trace_path`, `match_pairs` e `memory_game` testados ate conclusao;
- pares e memoria validaram feedback parcial sem encerrar antes da hora;
- dicas e resultados enriquecidos foram adicionados ao contrato de persistencia;
- console sem novos erros no fluxo testado.

## Onde esta o catalogo

O catalogo ativo fica em `app-pages.js`:

- `renewedInfantilBooks`: Livros do Aluno da Educacao Infantil 4 e 5 anos.
- `renewedProfessorGuideBooks`: Guias do Professor da Educacao Infantil 4 e 5 anos.
- `legacyInfantilBookCatalog`: registros legados isolados; a interface usa apenas os registros Avalia+ filtrados dessa lista.
- `bookCatalog`: fonte ativa do Book Viewer.
- `legacyLibraryBooks`: cards legados isolados; a interface reaproveita apenas registros nao infantis/nao guias antigos.
- `renewedInfantilLibraryBooks`: cards ativos dos livros do aluno renovados.
- `renewedProfessorGuideLibraryBooks`: cards ativos dos guias renovados.
- `libraryBooks`: fonte ativa dos cards da Biblioteca.

Nao existe mais `splice` para substituir livros antigos no catalogo ativo.

## Como cadastrar um livro

Para um livro abrir no Book Viewer, criar um registro em `bookCatalog` com:

- `id`: identificador publico usado em `book-viewer.html?book=ID`.
- `title`: titulo exibido no viewer.
- `subtitle`: subtitulo/volume.
- `catalogTitle`: titulo curto.
- `level`: ano/etapa.
- `type`: tipo de material.
- `collection`: colecao.
- `totalPages`: total exato de paginas.
- `cover`: caminho da primeira pagina/capa.
- `catalogCover`: imagem de card/capa da Biblioteca, quando houver.
- `pdf`: PDF local, quando declarado.
- `href`: rota do viewer.
- `thumb(page)`: funcao para resolver miniaturas.
- `page(page)`: funcao para resolver paginas JPG.
- `summary`: indice manual.

Para aparecer na Biblioteca, criar tambem um registro em `libraryBooks` com:

- `src`: capa do card.
- `year`: ano/etapa.
- `title`: titulo do card.
- `type`: tipo.
- `component`: componente curricular, quando aplicavel.
- `pages`: numero de paginas no card.
- `href`: rota do viewer ou modulo relacionado.
- `collection`: colecao.
- `stage`: etapa.
- `hierarchy`: hierarquia editorial.
- `publishedAt`: data usada para ordenacao.
- `actionLabel`: texto do botao, normalmente `Ler Agora`.
- `searchTerms`: termos extras para busca.

Campos de download nao devem ser usados nos registros ativos.

## Como as capas sao carregadas

Cards e hero usam `libraryBooks.src`. O perfil do livro dentro do viewer usa `activeBook.catalogCover || activeBook.cover`.

Se uma capa falhar, `initLibraryAssetFallbacks()` substitui a imagem por um bloco institucional com:

- Biblioteca Viva;
- titulo do livro;
- `CAPA EM ATUALIZACAO`.

## Como as paginas sao carregadas

O Book Viewer nao abre o PDF diretamente. Ele renderiza imagens JPG por pagina:

```js
book.page(page)
```

Exemplo:

```js
assets/livro-005/pages/page-001.jpg
```

Se uma pagina falhar, o leitor mostra:

- `NAO FOI POSSIVEL CARREGAR ESTA PAGINA`;
- botao `TENTAR NOVAMENTE`;
- botao `PAGINA ANTERIOR`;
- botao `PROXIMA PAGINA`.

O erro tambem e registrado no console com ID do livro, pagina e caminho do asset.

## Como as miniaturas sao carregadas

As miniaturas sao geradas no viewer por loop de `1` ate `totalPages`, usando:

```js
book.thumb(page)
```

Se uma miniatura falhar, ela e substituida por bloco neutro com numero da pagina e `MINIATURA INDISPONIVEL`.

## Como o Book Viewer resolve o livro

O viewer le o parametro:

```text
book-viewer.html?book=livro-005
```

A funcao `getActiveBook()` procura o ID em `bookCatalog`. Se nao encontrar, usa `defaultBook`, atualmente `livro-005`.

## Chaves de localStorage

| Chave | Uso |
|---|---|
| `library:recentBooks` | Lista recente de livros abertos. |
| `library:readingHistory` | Historico local de leitura. |
| `library:favorites` | Favoritos locais. |
| `library:lastActiveBook` | Ultimo livro ativo. |
| `library:reading:${book.id}:lastPage` | Ultima pagina lida, chave atual. |
| `${book.id}:lastPage` | Chave legada mantida para compatibilidade. |
| `${book.id}:bookmark` | Marcador manual do livro. |
| `raizes:infantil-experience-progress:v1` | Progresso, continuidade, favoritos e historico das experiencias digitais. |

## Como funciona o progresso dos livros

Ao trocar de pagina, `renderPage()` calcula:

```js
Math.round((page / book.totalPages) * 100)
```

Esse valor atualiza:

- barra de progresso;
- percentual no header;
- progresso dos cards;
- historico local;
- XP visual local.

## Como funcionam favoritos dos livros

Favoritos usam `library:favorites` em `localStorage`, contendo uma lista de IDs de livros.

O mesmo armazenamento e usado nos cards e no viewer. Nao ha sincronizacao multiusuario nesta fase.

## Como funciona o marcador

Cada livro possui um marcador manual:

```text
${book.id}:bookmark
```

O marcador tem prioridade sobre a ultima pagina lida quando o livro abre sem `page` na URL.

## Como funciona o historico

Ao renderizar uma pagina, o viewer atualiza `library:readingHistory` com:

- `bookId`;
- titulo;
- subtitulo;
- pagina;
- total de paginas;
- percentual;
- data/hora.

O historico e local e limitado aos 20 registros mais recentes.

## Ordem de retomada da leitura

O Book Viewer abre a pagina nesta prioridade:

1. `page` explicito na URL;
2. marcador manual;
3. ultima pagina lida em `library:reading:${book.id}:lastPage`;
4. chave legada `${book.id}:lastPage`;
5. pagina 1.

## Como validar um novo livro

Executar:

```bash
node tools/validate-library-catalog.js
```

O script valida:

- ID unico;
- titulo;
- capa;
- rota;
- total de paginas;
- funcao de pagina;
- funcao de miniatura;
- PDF declarado;
- existencia da capa;
- primeira e ultima pagina;
- primeira e ultima miniatura;
- cards sem rota;
- cards sem capa;
- campos de download no catalogo ativo.

## Estruturas futuras para Supabase

Na proxima fase, devem migrar para Supabase:

- catalogo de livros;
- metadados editoriais;
- permissoes por perfil;
- PDFs/paginas/miniaturas em Storage protegido;
- progresso de leitura;
- favoritos;
- historico;
- marcadores;
- anotacoes;
- indicacoes professor-turma;
- acompanhamento familiar;
- recomendacoes por perfil;
- eventos de XP, medalhas e conquistas;
- indice textual/IA do `Pergunte ao Livro`.
