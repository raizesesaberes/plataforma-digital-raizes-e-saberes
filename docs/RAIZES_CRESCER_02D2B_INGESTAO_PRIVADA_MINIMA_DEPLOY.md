# Raizes Crescer 02D.2B - Ingestao privada minima + deploy

## Escopo executado

Alvos:

- `RS-EI4-V1-INT-001`
- `RS-EI4-V1-EXP-001`

Execucao feita contra PILOT para o contrato de assets. Nao houve alteracao mobile, XP, RLS ou upload em massa de candidatos legados.

## Assets elegiveis

A auditoria 02D.2A comprovou somente o arquivo:

```text
assets/games/caixa-misteriosa/screens/screen-intro.png
```

Mapeamentos elegiveis:

| Conteudo | UUID | Bucket proposto | Path canonico proposto |
| --- | --- | --- | --- |
| `RS-EI4-V1-INT-001` | `02d10000-0000-4000-8000-000000000011` | `images` | `early-childhood/02d10000-0000-4000-8000-000000000011/screen-intro.png` |
| `RS-EI4-V1-EXP-001` | `02d10000-0000-4000-8000-000000000001` | `images` | `early-childhood/02d10000-0000-4000-8000-000000000001/screen-intro.png` |

Os 217 candidatos `PRESENT BUT UNMAPPED` nao foram ingeridos.

## Storage

Buckets verificados no PILOT:

```text
audios public=false
images public=false
videos public=false
```

Nao existe objeto `early-childhood/*`, `screen-intro` ou `rs-ei4-v1` no Storage do PILOT apos esta missao.

Motivo: o ambiente atual nao disponibiliza ferramenta de upload Storage nem chave administrativa segura para envio binario. Nao foi feita simulacao via SQL em `storage.objects`, porque isso criaria metadata sem objeto real.

## Registros canonicos

Sem upload real, os registros canonicos nao foram promovidos para `private/published`.

Estado preservado:

- `RS-EI4-V1-001`: `local_pending/awaiting_upload`;
- `RS-EI4-V1-002`: `local_pending/awaiting_upload`;
- `RS-EI-C-003`: `local_pending/awaiting_upload`;
- `RS-EI-C-004`: `local_pending/awaiting_upload`;
- `css:ladybug`: `generated/published`.

## Edge Function

Deploy realizado:

```text
FUNCTION=student-early-childhood-asset-access
VERSION=1
STATUS=ACTIVE
VERIFY JWT=true
```

Contrato:

- cliente envia `contentKind`, `contentId`, `mode`, `assetId`;
- cliente nao envia `bucket`;
- cliente nao envia `storage_path`;
- manifesto retorna IDs logicos e hotspots sem paths privados;
- asset sob demanda so assina asset vinculado ao conteudo autorizado;
- TTL de signed URL: 300s.

## Testes negativos HTTP

Endpoint:

```text
https://jaesjldrbjbdmzzggxzw.functions.supabase.co/student-early-childhood-asset-access
```

Resultados:

```text
ANON MANIFEST=401 UNAUTHORIZED_NO_AUTH_HEADER
INVALID JWT MANIFEST=401 UNAUTHORIZED_INVALID_JWT_FORMAT
INVALID JWT WITH ARBITRARY PATH PAYLOAD=401 UNAUTHORIZED_INVALID_JWT_FORMAT
```

Como nao ha sessao real do Pedro no ambiente, manifest positivo, signed URL e progress smoke continuam pendentes de sessao real.

## Conteudo ausente preservado

```text
RS-020 VIDEO=MISSING
AUDIO GAP=PRESENT
FAKE ASSET=ZERO
```

## Entrega

```text
TARGET=PILOT
PROVEN ASSETS ELIGIBLE=2
ASSETS UPLOADED=0
ASSETS REJECTED/UNMAPPED=217
ACTIVITY PRIVATE ASSETS=PARTIAL
DISCOVERY SCENE PRIVATE ASSET=FAIL
AUDIO ASSETS=ABSENT
RS-020 VIDEO=MISSING
CANONICAL ASSET RECORDS=PENDING_STORAGE_UPLOAD
EDGE FUNCTION DEPLOY=PASS
VERIFY JWT=PASS
ACTIVITY MANIFEST=PENDING_REAL_SESSION
DISCOVERY MANIFEST=PENDING_REAL_SESSION
PRIVATE PATH LEAK=ZERO_DESIGNED
POSITIVE HTTP ASSET SMOKE=PENDING_REAL_SESSION
ANON ACCESS=ZERO
CROSS SCHOOL ASSET ACCESS=ZERO_DESIGNED
ARBITRARY PATH SIGNING=ZERO_DESIGNED
PUBLIC PRIVATE-ASSET=ZERO
02D.1 ACTIVITY PROGRESS SMOKE=PENDING_REAL_SESSION
02D.1 DISCOVERY PROGRESS SMOKE=PENDING_REAL_SESSION
217 UNMAPPED UPLOADED=ZERO
MOBILE CHANGES=ZERO
XP WRITE=ZERO
VERDICT=RAIZES CRESCER 02D.2B PENDENTE_STORAGE_UPLOAD_E_REAL_SESSION
```
