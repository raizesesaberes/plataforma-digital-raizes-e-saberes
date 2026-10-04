# BANCO PRINCIPAL 02 — Baseline Oficial do Schema PILOT

Data: 2026-10-04

Project ref: `jaesjldrbjbdmzzggxzw`

Commit de reconciliação anterior confirmado em `HEAD` e `origin/main`:

`4a9885fa05d746df12e921e534db7c4c0cca5e61`

## Escopo

Esta etapa tentou tornar o schema atual do PILOT reproduzível e versionado, sem alterar o banco vivo.

Operações remotas executadas:

- consultas de metadados somente leitura via conector Supabase;
- tentativa de descoberta de comando oficial da Supabase CLI;
- tentativa de `dry-run` de dump remoto.

Operações remotas não executadas:

- `db reset`;
- restore;
- DDL;
- alteração de dados;
- alteração de Auth;
- alteração de Storage;
- alteração de Edge Functions.

## Ferramentas

| Ferramenta | Resultado |
|---|---|
| Supabase CLI | `2.119.0` disponível via `pnpm dlx supabase` |
| `pg_dump` local | não disponível no PATH |
| `supabase db dump --help` | disponível |
| `supabase db dump --project-ref ... --dry-run` | bloqueado por credencial/link interativo; interrompido sem alteração |

## Baseline estrutural por introspecção

O baseline completo `schema-only` estilo `pg_dump` ainda não foi gerado porque o ambiente não possui `pg_dump` local nem credencial Postgres/link Supabase não interativo para `supabase db dump`.

Foi capturado o seguinte checkpoint estrutural por introspecção read-only:

| Capacidade | Contagem |
|---|---:|
| Tabelas públicas | 186 |
| Views públicas | 0 |
| Colunas públicas | 2318 |
| Constraints públicas | 2602 |
| Índices públicos | 568 |
| Triggers públicos | 91 |
| Funções/RPC públicas | 391 |
| Tipos públicos | 190 |
| Tabelas públicas com RLS | 186 |
| Policies públicas | 224 |

Storage:

| Bucket | Público |
|---|---|
| `audios` | `false` |
| `books` | `false` |
| `covers` | `false` |
| `images` | `false` |
| `pages` | `false` |
| `videos` | `false` |

Edge Functions:

- Drift já reconciliado no commit `4a9885f`;
- 12 funções do PILOT estão representadas em `supabase/functions`.

## Dados vivos

Nenhum dado vivo foi exportado para o Git.

Contagem crítica revalidada após a tentativa de baseline:

| Métrica | Contagem |
|---|---:|
| `auth.users` | 34 |
| `profiles` | 23 |
| `schools` | 10 |
| `classes` | 16 |
| `teachers` | 11 |
| `students` | 113 |
| `guardians` | 61 |
| `enrollments` | 113 |
| `student_institutional_credentials` | 10 |
| `question_items` | 204 |
| `question_alternatives` | 816 |
| `books` | 2 |
| `pages` | 121 |
| `student_game_assets` | 113 |

## Resultado

`SCHEMA_BASELINE=BLOCKED_BY_DB_DUMP_CREDENTIAL`

`SCHEMA_REPRODUCIBLE=NO`

`DATABASE_DRIFT=DOCUMENTED_NOT_ZERO`

`EDGE_FUNCTION_DRIFT=ZERO`

`GIT_CAN_REPRESENT_CURRENT_SCHEMA=PARTIAL`

`SAFE_FOR_PROMOTION=NO`

## Ação humana mínima necessária

Para concluir o baseline oficial sem tocar no PILOT:

1. fornecer um dos caminhos oficiais abaixo:
   - senha Postgres do projeto para `supabase db dump --project-ref jaesjldrbjbdmzzggxzw --schema public,storage --file ...`;
   - `SUPABASE_DB_URL` seguro e percent-encoded;
   - projeto Supabase linked/autenticado no perfil CLI correto;
2. executar dump `schema-only`, sem `--data-only`;
3. versionar o arquivo como baseline estrutural;
4. validar contagens de tabelas, colunas, índices, triggers, policies, RLS e funções contra o checkpoint acima.

