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
- status: `review`;
- disponibilidade: `in-production`.

O MP4 institucional e usado apenas como ativo provisorio identificado. A experiencia nao deve ser tratada como publicada enquanto o video definitivo nao estiver no caminho oficial.

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

## Como funciona o progresso

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

## Como funcionam favoritos

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
