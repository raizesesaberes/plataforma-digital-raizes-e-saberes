# Biblioteca Digital Premium

Resumo extraido do chat pesado "Criar plataforma educacional".

## Status

A Biblioteca Digital Premium V1 foi aprovada e implementada no ambiente antigo do Codex.

## Regra principal

A tela enviada pelo Design Studio e aprovada pelo QG deve ser tratada como referencia visual absoluta. O Codex nao deve reinterpretar o layout nem criar uma proposta visual diferente.

## Novo padrao de trabalho - Curadoria do Acervo

A Biblioteca e o Book Viewer passam a operar em missao continua de expansao do acervo. Quando o QG aprovar um novo material, o Codex deve publicar sem pedir uma nova rodada de ajustes estruturais.

Checklist obrigatorio para cada material aprovado:

1. Cadastrar o item no acervo da Biblioteca.
2. Vincular a capa oficial ou provisoria aprovada.
3. Integrar ao Book Viewer somente quando houver paginas reais do livro.
4. Atualizar colecoes, contadores e agrupamentos visuais.
5. Destacar novidades publicadas quando o material entrar no acervo.
6. Preservar o Design System, a organizacao atual e o padrao visual aprovado.

Materiais sem paginas reais podem entrar como card de colecao ou acervo em expansao, sem criar links falsos para leitura.

## Requisitos aprovados

- Reproduzir fielmente Desktop, Notebook, Tablet e Mobile.
- Usar as capas oficiais da colecao Raizes e Saberes.
- Nao usar capas genericas.
- Remover o card "Plano Premium" da barra lateral.
- Substituir esse card por um elemento institucional do Ecossistema Educacional.
- Dar mais destaque visual as capas dos livros.
- Preservar componentes e identidade visual ja aprovados.
- Aplicar o verde institucional como cor predominante.
- Manter responsividade.

## Implementacao feita no chat antigo

A Biblioteca foi transformada em uma tela com cara de plataforma real:

- barra lateral institucional;
- topo com busca/filtros;
- prateleiras/categorias de livros;
- capas maiores;
- comportamento de busca e filtro;
- categorias sem resultado escondidas durante filtro/pesquisa;
- estrutura preparada para futuro Book Viewer;
- navegacao mobile/bottom navigation preparada.

## Arquivos alterados no chat antigo

- `biblioteca.html`
- `styles.css`
- `script.js`

No ambiente antigo, esses arquivos estavam em:

`/Users/danielhenrique/Documents/Codex/2026-07-04/files-mentioned-by-the-user-relat/outputs/site-raizes-e-saberes/`

## Capas oficiais

Foram validadas 16 capas oficiais WEBP dentro da pasta `assets`.

Correcao importante feita:

- O site estava buscando capas em `assets/biblioteca/...`.
- As capas estavam no GitHub em `assets/...`.
- A correcao foi remover `biblioteca/` dos caminhos das imagens.

Arquivos corrigidos nessa etapa:

- `index.html`
- `biblioteca.html`

## Validacoes registradas

O chat antigo registrou as seguintes validacoes:

- 16 capas oficiais conferidas.
- Nenhuma imagem faltando localmente.
- Card "Plano Premium" removido.
- Bloco "Ecossistema Educacional" inserido no lugar.
- Capas com mais destaque visual.
- Capas sem recorte forcado.
- Busca e filtros mantidos.
- CSS premium aplicado com prioridade sobre estilos antigos.

## Limitacoes registradas

- O Codex antigo nao conseguiu atualizar a Vercel diretamente.
- Em uma tentativa, o navegador interno bloqueou abertura direta de arquivo local para gerar prints da Biblioteca.
- A orientacao final foi subir no GitHub os arquivos `biblioteca.html`, `styles.css` e, quando aplicavel, `script.js`.

## Proximo passo recomendado

Ao retomar esta frente:

1. Conferir se os arquivos finais da Biblioteca ja foram trazidos da pasta antiga para este projeto.
2. Validar no navegador a Biblioteca em Desktop e Mobile.
3. Confirmar que as 16 capas WEBP oficiais carregam de `assets/...`.
4. Prosseguir para o Book Viewer Premium somente depois da Biblioteca estar consolidada.
