# BANCO PRINCIPAL 03 — BASELINE REPRODUZIVEL

Data: 2026-10-04

## Projeto

- Projeto Supabase: `jaesjldrbjbdmzzggxzw`
- Nome operacional: Base Principal Raizes e Saberes
- Branch Git no fechamento: `main`
- Operacao remota: somente leitura

## Metodo

O baseline estrutural foi gerado a partir do projeto Supabase linked pela CLI.

Como a Supabase CLI local tentava executar `pg_dump` via Docker/Podman, e este Mac nao utiliza Docker para esta etapa, foi usado o equivalente oficial indicado pelo `supabase db dump --linked --schema public,storage --dry-run`:

1. Supabase CLI linked gerou uma credencial temporaria de login para dump.
2. `pg_dump` nativo PostgreSQL 17.11 executou o dump schema-only.
3. O arquivo temporario com variaveis `PG*` foi removido imediatamente apos a execucao.
4. O baseline final foi salvo em `supabase/baselines/20261004_pilot_schema_baseline.sql`.

Comando conceitual equivalente:

```bash
supabase db dump --linked --schema public,storage --file supabase/baselines/20261004_pilot_schema_baseline.sql
```

## Artefato

- Caminho: `supabase/baselines/20261004_pilot_schema_baseline.sql`
- Tamanho: 1.673.822 bytes
- Linhas: 38.302
- SHA-256: `e9fd584a6a43ea55431b71f34eabab5e7d21fdbc67f7c2f6e52c19629e8a5eb3`

## Escopo Capturado

Schemas versionados no baseline:

- `public`
- `storage`

O baseline inclui:

- schemas;
- tipos/enums;
- tabelas;
- sequences;
- constraints;
- indices;
- views;
- functions/RPCs;
- triggers;
- RLS;
- policies;
- grants/default privileges representados pelo dump.

O baseline nao inclui:

- dados vivos;
- dados de `auth.users`;
- senhas;
- tokens;
- service role keys;
- arquivos binarios de Storage.

## Validacao De Cobertura

Inventario vivo lido em modo read-only:

| Area | Public | Storage | Total |
| --- | ---: | ---: | ---: |
| Tabelas | 186 | 8 | 194 |
| Functions/RPCs | 391 | 19 | 410 |
| Triggers | 84 | 7 | 91 |
| RLS tables | 186 | 8 | 194 |
| Policies | 224 | 0 | 224 |
| Indexes | 568 | 20 | 588 |

Contagem no baseline:

- `CREATE TABLE IF NOT EXISTS`: 194
- `CREATE OR REPLACE FUNCTION`: 410
- `CREATE OR REPLACE TRIGGER`: 91
- `CREATE POLICY`: 224
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`: 194
- Indices: 330 `CREATE INDEX` + 194 PK + 64 UNIQUE = 588

## Checagem De Seguranca Do Arquivo

Padroes verificados no baseline:

- `INSERT INTO`: 0
- `COPY`: 0
- `CREATE TABLE IF NOT EXISTS "auth".*`: 0
- `PGPASSWORD`: 0
- `cli_login_postgres`: 0
- host pooler Supabase: 0
- `DATABASE_URL=`: 0
- `SUPABASE_SERVICE_ROLE_KEY=`: 0
- `JWT_SECRET=`: 0
- `BEGIN PRIVATE KEY`: 0

Observacao: o arquivo contem referencias estruturais legitimas a `auth.users`, `auth.uid()` e ao papel Postgres `service_role` dentro de functions, policies, grants e constraints. Isso nao representa exportacao de dados Auth nem exposicao de segredo.

## Rebuild Local

Nao foi executado restore local neste fechamento porque nao ha servidor PostgreSQL local dedicado para reconstrucao isolada. A validacao realizada foi:

- dump oficial schema-only com `pg_dump` 17.11;
- comparacao de cobertura contra catalogos do banco vivo;
- checagem de ausencia de dados vivos e segredos no arquivo.

## Politica Futura

A partir deste baseline:

1. Git passa a ser a fonte versionada da estrutura.
2. Supabase principal passa a ser o estado operacional vivo.
3. Toda mudanca estrutural futura deve nascer como migration versionada no Git.
4. A migration deve ser revisada antes de aplicacao.
5. Depois da aplicacao, um drift check deve confirmar sincronismo.
6. Nao devemos voltar a usar o banco vivo como unica fonte de alteracao estrutural.

Modelo oficial:

```text
baseline atual + migrations futuras versionadas = estrutura reproduzivel
```

