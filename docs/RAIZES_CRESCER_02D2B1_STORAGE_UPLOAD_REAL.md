# Raizes Crescer 02D.2B.1 - Upload real de Storage

## Escopo

Objetivo: ingerir no PILOT somente os 2 assets comprovados pela 02D.2A, sem bulk upload dos 217 candidatos e sem fabricar audio/video ausente.

## Mecanismo usado

Nao havia Supabase CLI, ferramenta MCP de Storage upload ou chave administrativa local segura.

Foi usada uma Edge Function administrativa temporaria e allowlisted:

```text
early-childhood-minimal-storage-ingest
```

Propriedades:

- aceitou somente os 2 assets previamente aprovados;
- validou token temporario por hash;
- validou source path, MIME, tamanho e SHA-256;
- nao aceitou bucket/path arbitrarios;
- fez upload real via Supabase Storage API;
- verificou o binario baixando o objeto e comparando tamanho/hash;
- atualizou registros canonicos somente depois da verificacao fisica;
- foi desativada imediatamente apos a ingestao.

Estado final da funcao temporaria:

```text
VERSION=2
VERIFY_JWT=true
BODY=410 ingest_endpoint_disabled
TEMP ADMIN ENDPOINT=DISABLED
```

## Assets ingeridos

Fonte fisica:

```text
assets/games/caixa-misteriosa/screens/screen-intro.png
MIME=image/png
SIZE=374615
SHA256=af2e507ed80d986b5e873cce86c786626f73e223024da47559448c2bc9ae70be
```

Uploads:

| Asset canonico | Bucket | Path | Size |
| --- | --- | --- | --- |
| `RS-EI4-V1-INT-001-SCENE` | `images` | `early-childhood/02d10000-0000-4000-8000-000000000011/screen-intro.png` | 374615 |
| `RS-EI4-V1-EXP-001-SCENE` | `images` | `early-childhood/02d10000-0000-4000-8000-000000000001/screen-intro.png` | 374615 |

## Registros canonicos

Criados como assets privados reais:

```text
RS-EI4-V1-INT-001-SCENE storage_access=private status=published
RS-EI4-V1-EXP-001-SCENE storage_access=private status=published
```

Vinculos:

- `student_activities.asset.scene_asset_legacy_id=RS-EI4-V1-INT-001-SCENE`;
- `student_activities.asset.cover_asset_legacy_id=RS-EI4-V1-INT-001-SCENE`;
- `student_discoveries.resources[]` recebeu `{ type: "image", role: "scene", asset_legacy_id: "RS-EI4-V1-EXP-001-SCENE" }`.

Preservados como gaps reais:

```text
RS-EI4-V1-001 video local_pending/awaiting_upload
RS-EI4-V1-002 audio local_pending/awaiting_upload
RS-EI-C-003 audio local_pending/awaiting_upload
RS-EI-C-004 audio local_pending/awaiting_upload
RS-020 VIDEO=MISSING
AUDIO GAP=PRESENT
```

## Validacoes

Storage:

```text
REAL BINARY OBJECT=PASS
OBJECT SIZE>0=PASS
PRIVATE BUCKET=PASS
PUBLIC BUCKET=ZERO
PUBLIC URL=ZERO
SIGNED URL PERSISTED=ZERO
```

Contrato:

```text
student-early-childhood-asset-access VERIFY_JWT=PASS
ANON ASSET ACCESS=ZERO
ARBITRARY PATH SIGNING=ZERO
ARBITRARY BUCKET=ZERO
PRIVATE PATH LEAK=ZERO_DESIGNED
```

Chamadas negativas:

```text
asset contract without JWT=401 UNAUTHORIZED_NO_AUTH_HEADER
temporary ingest endpoint without JWT=401 UNAUTHORIZED_NO_AUTH_HEADER
```

Sessao real do Pedro:

```text
REAL PEDRO SESSION=UNAVAILABLE
POSITIVE HTTP ASSET SMOKE=PENDING_REAL_SESSION
02D.1 ACTIVITY PROGRESS SMOKE=PENDING_REAL_SESSION
02D.1 DISCOVERY PROGRESS SMOKE=PENDING_REAL_SESSION
```

## Entrega

```text
UPLOAD MECHANISM=TEMP_ALLOWLISTED_EDGE_FUNCTION_DISABLED_AFTER_USE
PROVEN ASSETS=2
REAL ASSETS UPLOADED=2
REAL BINARY VERIFIED=PASS
CANONICAL ASSET RECORDS=PASS
DISCOVERY SCENE PRIVATE=PASS
ACTIVITY PRIVATE ASSET=PASS
217 UNMAPPED UPLOADED=ZERO
FAKE/MISSING ASSET CREATED=ZERO
PUBLIC STORAGE=ZERO
TEMP ADMIN ENDPOINT=DISABLED
POSITIVE HTTP ASSET SMOKE=PENDING_REAL_SESSION
02D.1 ACTIVITY PROGRESS SMOKE=PENDING_REAL_SESSION
02D.1 DISCOVERY PROGRESS SMOKE=PENDING_REAL_SESSION
MOBILE CHANGES=ZERO
VERDICT=02D.2B INGESTAO PRIVADA HOMOLOGADA_COM_SMOKE_REAL_PENDENTE
```
