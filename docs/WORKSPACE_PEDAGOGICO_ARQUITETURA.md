# Workspace Pedagogico

## Missao 001

O Ambiente do Professor foi estruturado como workspace principal, nao como uma pagina isolada. A tela `professor.html` carrega o Workspace Pedagogico em tela cheia e usa navegacao interna por estado, sem troca de pagina e sem recarregamento.

## Decisoes de arquitetura

- O modulo `professor` nao usa o shell generico `app-shell`, para evitar dupla navegacao e criar uma experiencia de software profissional.
- A barra superior, menu lateral, hero, recomendacoes e area central dinamica vivem dentro de `renderProfessorDashboard()`.
- As areas do professor sao abertas em `<main data-teacher-content>` por `initTeacherWorkspace()`.
- A busca global filtra os itens visiveis da area ativa por `[data-teacher-search-item]`.
- A integracao com a Biblioteca Viva consome `window.RaizesInfantilExperiences`; os dados de livros, experiencias e atividades nao foram copiados.

## Componentes base

- `TeacherCard`
- `PlanningCard`
- `ClassCard`
- `StudentCard`
- `LessonCard`
- `RecommendationCard`
- `ResourceCard`

## Areas preparadas

- Inicio
- Planejamentos
- Minhas Turmas
- Alunos
- Biblioteca Viva
- Experiencias
- Jogos
- Avaliacoes
- Relatorios
- Universidade
- Configuracoes

## Validacao

- Workspace renderiza sem `app-shell`.
- Menu lateral possui 11 areas.
- Barra superior possui 6 acoes.
- Biblioteca Viva abre dentro do workspace e exibe livros oficiais do catalogo.
- Calendario abre sem alterar a URL.
- Busca global filtra os cards da area ativa.
- Console do navegador sem erros durante a validacao local.
