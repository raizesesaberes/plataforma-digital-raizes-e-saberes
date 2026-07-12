# Fluxo de chats e divisao do projeto

Este arquivo organiza como dividir o chat pesado em chats menores dentro do projeto.

## Objetivo

Evitar que todas as informacoes da Plataforma Digital Raizes e Saberes fiquem concentradas em um unico chat pesado.

## Chat pesado de origem

- Titulo: `Criar plataforma educacional`
- ID local encontrado: `019f2f7b-3a6f-7533-bf90-0a5e541607c9`

## Estrategia recomendada

Manter este projeto como centro e abrir chats menores por frente de trabalho. Cada chat deve receber apenas o contexto da sua area, mais a memoria geral.

## Divisao recomendada

### 1. Memoria geral e direcao

Usar para decisoes amplas, prioridades, mudancas de estrategia e organizacao geral.

Arquivos de contexto:

- `docs/MEMORIA-GERAL-RAIZES-E-SABERES.md`

### 2. Home e showroom comercial

Usar para Hero, Ecossistema, Video Institucional, secoes comerciais, CTA e ajustes da Home.

Arquivos de contexto:

- `docs/MEMORIA-GERAL-RAIZES-E-SABERES.md`
- `docs/HOME-E-VIDEO-INSTITUCIONAL.md`

### 3. Biblioteca Digital Premium

Usar somente para Biblioteca, capas oficiais, filtros, responsividade e Book Viewer quando chegar a hora.

Arquivos de contexto:

- `docs/MEMORIA-GERAL-RAIZES-E-SABERES.md`
- `docs/BIBLIOTECA-DIGITAL-PREMIUM.md`

### 4. Deploy, GitHub e Vercel

Usar para organizar publicacao, commits, estrutura de arquivos, Vercel e atualizacoes do site no ar.

Arquivos de contexto:

- `docs/MEMORIA-GERAL-RAIZES-E-SABERES.md`

### 5. Supabase e FlutterFlow

Usar para banco de dados, autenticacao, usuarios, dados da plataforma e integracoes.

Observacao: o chat antigo mencionou FlutterFlow e Supabase, mas os detalhes dessa parte ainda precisam ser extraidos se forem importantes.

## Prompt base para novo chat

Use este modelo ao abrir um novo chat:

```text
Estamos trabalhando na Plataforma Digital Raizes e Saberes.

Este chat e dedicado a: [NOME DA FRENTE].

Leia primeiro:
- docs/MEMORIA-GERAL-RAIZES-E-SABERES.md
- [arquivo especifico da frente, se houver]

Nao misture outras frentes neste chat.
Preserve as decisoes ja aprovadas.
Quando houver tela aprovada pelo Design Studio/QG, trate como referencia visual absoluta.
```
