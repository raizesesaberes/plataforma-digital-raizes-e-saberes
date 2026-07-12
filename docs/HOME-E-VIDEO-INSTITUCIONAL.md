# Home e video institucional

Resumo extraido do chat pesado "Criar plataforma educacional".

## Decisao aprovada

A Direcao do Projeto aprovou uma mudanca de estrategia da Home: o video institucional passou a ser um dos principais elementos comerciais da pagina.

## Nova ordem obrigatoria da Home

1. Hero.
2. Ecossistema Educacional.
3. Conheca o Ecossistema em Acao, com Video Institucional.
4. Educacao Infantil.
5. Plataforma Digital.
6. Universidade.
7. Avalia+.
8. Resultados.
9. CTA Final.
10. Rodape.

## Requisitos do video

- Nao usar iframe simples solto na pagina.
- Criar secao premium para o video.
- Usar headline, texto de apoio, thumbnail personalizada e botao Play.
- Abrir o video em modal.
- Reproduzir o YouTube sem tirar o usuario da Home.
- Transformar o video em argumento comercial da apresentacao.

## Implementacao feita no chat antigo

Foram alterados:

- `index.html`
- `styles.css`

Foi validado:

- ordem oficial da Home correta;
- HTML sem erro;
- JavaScript sem erro;
- botao Play abrindo o video oficial;
- modal fechando sem sair da pagina.

## Video oficial

O teste do chat antigo validou o embed do YouTube com o ID:

`w4BPUg2x_O8`

## Arquivos de captura gerados no chat antigo

No ambiente antigo foram gerados prints em:

- `/Users/danielhenrique/Documents/Codex/2026-07-04/files-mentioned-by-the-user-relat/outputs/site-raizes-e-saberes/screenshots/sprint-video-home-desktop.png`
- `/Users/danielhenrique/Documents/Codex/2026-07-04/files-mentioned-by-the-user-relat/outputs/site-raizes-e-saberes/screenshots/sprint-video-home-mobile.png`

## Proximo passo recomendado

Quando esta frente for retomada, verificar se os arquivos atuais do projeto possuem a versao final de `index.html`, `styles.css` e `script.js`. Se ainda estiverem apenas na pasta antiga de outputs, trazer esses arquivos para o repositorio principal antes de seguir.

## Universidade Viva

A secao Universidade Raizes e Saberes da Home foi preparada para funcionar como ambiente vivo de formacao continuada.

Padrao aprovado:

1. Exibir Destaque do Curso da Semana.
2. Exibir automaticamente os cursos mais recentemente publicados.
3. Sugerir a proxima aula da mesma trilha em Continue Aprendendo.
4. Marcar trilhas em desenvolvimento com selo discreto "Em expansao".
5. Atualizar automaticamente numero de cursos, horas de formacao e certificados emitidos.
6. Manter metadados prontos para videos reais, PDFs, avaliacoes e certificados.
7. Preservar o Design System e nao alterar a experiencia visual aprovada.

## Universidade Premium Definitiva

A versao provisoria da Universidade foi substituida por uma experiencia premium completa dentro da Home, mantendo a arquitetura estatica atual e o `id="universidade"` usado pela navegacao.

Entrega implementada:

1. Nova Home da Universidade.
2. Hero premium com curso em destaque, progresso e aulas da trilha.
3. Pesquisa por cursos, trilhas e videoaulas.
4. Categorias por area: Todos, Docente, Gestao, Avaliacao e Tecnologia.
5. Trilhas de aprendizagem com selo "Em expansao".
6. Cursos em andamento com barra de progresso e botao "Continuar Aprendendo".
7. Proximos cursos.
8. Novos cursos.
9. Certificados.
10. Professor em destaque.
11. Videoaulas.
12. Materiais complementares.
13. Avaliacoes.
14. Estrutura de dados preparada para receber cursos reais, videos, PDFs, avaliacoes e certificados.

Prints gerados:

- `prints/universidade-premium-desktop.png`
- `prints/universidade-premium-mobile.png`
