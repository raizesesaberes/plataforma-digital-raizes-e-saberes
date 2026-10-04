# BANCO PRINCIPAL 01 — Snapshot e Reconciliação PILOT ↔ Git

Data: 2026-10-04

Project ref auditado: `jaesjldrbjbdmzzggxzw`

## Decisão

O Supabase PILOT é a base operacional mais completa identificada e deve ser preparado como futura Base Principal Raízes e Saberes.

Esta reconciliação não promoveu o ambiente, não migrou dados e não alterou banco, Auth, Storage, Vercel, URLs ou secrets.

## Snapshot lógico

Snapshot de segurança nesta fase:

- inventário de migrations aplicadas;
- inventário de tabelas públicas e RLS;
- inventário agregado de dados críticos;
- inventário de buckets;
- inventário de Edge Functions;
- recuperação das Edge Functions que existiam no PILOT e estavam ausentes no Git.

Não foram exportadas senhas, tokens, service-role keys, hashes, JWTs nem dados pessoais linha a linha.

## Dados críticos — baseline

Contagens agregadas obtidas em leitura no PILOT:

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
| `student_personal_schedules` | 1 |
| `assessment_assignments` | 3 |
| `question_items` | 204 |
| `question_alternatives` | 816 |
| `books` | 2 |
| `pages` | 121 |
| `student_game_assets` | 113 |

## Storage

Buckets identificados no PILOT:

| Bucket | Público |
|---|---|
| `audios` | `false` |
| `books` | `false` |
| `covers` | `false` |
| `images` | `false` |
| `pages` | `false` |
| `videos` | `false` |

Observação: os arquivos binários não foram copiados para Git. A reconstrução completa de acervo físico exige backup/restore de Storage fora do repositório.

## Edge Functions

O PILOT possui 12 Edge Functions ativas. O Git possuía 6 antes desta missão.

| Function | PILOT version | JWT | Git antes | Ação |
|---|---:|---|---|---|
| `admin-create-auth-access` | 3 | `true` | presente | `KEEP` |
| `official-report-export` | 2 | `true` | presente | `KEEP` |
| `student-institutional-credentials` | 3 | `true` | presente | `KEEP` |
| `student-institutional-login` | 1 | `false` | presente | `KEEP` |
| `admin-change-auth-email` | 1 | `true` | presente | `KEEP` |
| `admin-reset-professor-temp-password` | 1 | `true` | presente | `KEEP` |
| `student-library-read-access` | 2 | `true` | ausente | `RECOVER` |
| `book005-private-storage-ingest` | 2 | `true` | ausente | `RECOVER` |
| `student-early-childhood-asset-access` | 5 | `true` | ausente | `RECOVER` |
| `early-childhood-minimal-storage-ingest` | 2 | `true` | ausente | `RECOVER` |
| `game-cesta-private-storage-ingest` | 2 | `true` | ausente | `RECOVER` |
| `game-real-v1-private-storage-ingest` | 6 | `true` | ausente | `RECOVER` |

As 6 funções ausentes foram recuperadas para `supabase/functions/<slug>/index.ts` a partir da fonte disponível no PILOT.

## Migration ledger

Resumo:

- `MIGRATIONS_DB_TOTAL=133`
- `MIGRATIONS_GIT_TOTAL=100 arquivos SQL`
- `MIGRATIONS_GIT_UNIQUE_VERSIONS=99`
- `MIGRATIONS_MATCHED_BY_EXACT_VERSION=1`
- `MIGRATIONS_DB_ONLY_BY_EXACT_VERSION=132`
- `MIGRATIONS_GIT_ONLY_BY_EXACT_VERSION=98`

Interpretação:

O drift é principalmente de histórico/versionamento. O PILOT usa versões/timestamps reais aplicados pelo ambiente remoto, enquanto o Git usa migrations canônicas nomeadas por missão/template. Portanto, o baixo número de matches por versão exata não significa ausência de capacidade no Git, mas significa que o histórico do banco vivo ainda não é reproduzível fielmente apenas pelos arquivos atuais.

Versão aplicada mais recente no PILOT:

`20261004014306`

Versões locais mais recentes no Git antes desta reconciliação:

- `20261003103218`
- `20261003120000`
- `20261003133000`
- `20261003143000`

## Estado de schema

O PILOT tem:

- RLS habilitada nas tabelas públicas inventariadas;
- `public` com 391 funções/RPCs;
- `storage` com 19 funções;
- tabelas de módulos recentes como credenciais institucionais, horário pessoal, Avalia+ 2.x, produção textual, OCR, TRI, gamificação, comunicação/live, vídeo analytics, integrações, IA, equidade, Help Desk e importação unificada.

Sem Supabase CLI ou `pg_dump` disponível neste ambiente, esta missão não gerou um dump SQL completo do schema. Por isso, o schema atual ficou protegido por inventário e recuperação parcial de código, mas ainda requer um dump oficial ou baseline SQL gerado por ferramenta apropriada antes de declarar promoção segura.

## Resultado

`DATABASE_DRIFT=DOCUMENTED_NOT_ZERO`

`EDGE_FUNCTION_DRIFT=ZERO_AFTER_RECOVERY`

`GIT_CAN_REPRESENT_CURRENT_SCHEMA=PARTIAL`

`SAFE_FOR_PROMOTION=NO`

Motivo: as Edge Functions foram reconciliadas, mas o histórico/schema do banco vivo ainda precisa de dump oficial/baseline SQL reprodutível antes da promoção formal.

## Próximo passo recomendado

Executar uma etapa dedicada com Supabase CLI ou dump oficial autenticado:

1. instalar/disponibilizar Supabase CLI ou conexão Postgres segura;
2. gerar dump schema-only do PILOT;
3. salvar como baseline controlado, sem dados vivos nem secrets;
4. comparar baseline contra migrations canônicas;
5. só então declarar `GIT_CAN_REPRESENT_CURRENT_SCHEMA=YES`.

