# Motor Universal de Atividades

O Motor Universal de Atividades transforma qualquer item publicado no Banco de Atividades Imprimiveis em uma atividade digital editavel pelo aluno.

## Camadas

1. Atividade base: imagem original/A4 cadastrada no banco.
2. Producao do aluno: tracos normalizados, borrachas e objetos de colagem salvos separadamente.
3. Interface: ferramentas grandes, paleta simples, comandos de salvar, limpar, desfazer, refazer e concluir.

## Dados locais

Enquanto o backend definitivo nao esta conectado, o motor usa `localStorage` em `raizes:universal-activity-engine:v1`.

Estruturas principais:

- `assignments`: atividade indicada por professor para turma, grupo ou aluno.
- `submissions`: producao do aluno, com `canvasData`, `objectsData`, `preview` e `finalArtwork`.
- `metrics`: reservado para eventos futuros.

## Perfis

Os perfis `ei2`, `ei3`, `ei4` e `ei5` ficam em `universalActivityToolProfiles`.

V1 funcional:

- pincel
- dedo
- rolinho
- esponja
- algodao
- papel
- barbante
- bolinhas
- borracha

## Rotas estaticas

- Professor indica pelo Banco de Atividades: `atividades.html`
- Aluno visualiza cards em `aluno.html`
- Motor abre em `motor-atividade.html?assignment=ID`

## Backend preparado

A migration `supabase/migrations/202608190002_universal_activity_engine.sql` cria tabelas para atribuições, submissões e logs, mantendo a imagem original separada da producao do aluno.
