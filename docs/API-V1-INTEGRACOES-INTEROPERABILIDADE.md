# API V1 - Integracoes e Interoperabilidade

Documento tecnico da camada institucional de integracao da Plataforma Raizes e Saberes.

## Versao

`API V1`

## Autenticacao

As integracoes usam credencial institucional server-side, com hash persistido em `integration_api_clients`.

Regras:

- segredo real nunca deve ficar no frontend;
- cada credencial tem `scopes`;
- cada credencial pode ser revogada;
- todo acesso pode ser registrado em `integration_api_audit_logs`;
- chamadas publicas/anonimas nao sao permitidas.

Escopos iniciais:

- `schools:read`
- `users:read`
- `teachers:read`
- `students:read`
- `guardians:read`
- `classes:read`
- `enrollments:read`
- `calendar:read`
- `attendance:read`
- `results:read`
- `import:write`
- `sync:write`
- `webhooks:write`
- `*:*` somente para integracao administrativa homologada

## Endpoints RPC

### Catalogo

`integration_api_v1_catalog()`

Retorna recursos, formatos suportados, webhooks e status SSO.

### Leitura de Recursos

`integration_api_v1_read(resource, school_id, limit, offset)`

Recursos:

- `schools`
- `users`
- `teachers`
- `students`
- `guardians`
- `classes`
- `enrollments`
- `components`
- `calendar`
- `attendance`
- `results`

Exemplo:

```json
{
  "resource": "students",
  "school_id": "11111111-1111-1111-1111-111111111111",
  "limit": 100,
  "offset": 0
}
```

Retorno:

```json
{
  "version": "v1",
  "resource": "students",
  "school_id": "11111111-1111-1111-1111-111111111111",
  "limit": 100,
  "offset": 0,
  "data": []
}
```

## Importacao em Massa

Fluxo:

`CSV/XLSX -> parse server-side -> preview -> validation -> confirm -> batch report`

RPCs:

- `integration_preview_bulk_import(client_id, school_id, entity_type, payload, idempotency_key)`
- `integration_confirm_bulk_import(batch_id)`

O formato `entity_type=rs_school_package` reutiliza o importador canonico:

`admin_confirm_rs_school_import(school_id, package, dry_run)`

Assim a integracao nao cria segundo motor de matricula.

Estados do lote:

- `draft`
- `validated`
- `confirmed`
- `failed`
- `cancelled`

Erros por linha ficam em `integration_sync_batches.errors`.

## Sincronizacao

Tabela canonica:

`integration_external_mappings`

Campos principais:

- `external_system`
- `external_id`
- `entity_type`
- `entity_id`
- `direction`
- `sync_status`
- `last_synced_at`
- `last_error`

Fluxos preparados:

- `EXTERNAL_SYSTEM -> RAIZES`
- `RAIZES -> EXTERNAL_SYSTEM`

## Webhooks

Tabelas:

- `integration_webhook_endpoints`
- `integration_webhook_deliveries`

Eventos iniciais:

- `enrollment.created`
- `enrollment.updated`
- `user.updated`
- `result.consolidated`

RPCs:

- `integration_register_webhook(...)`
- `integration_queue_webhook_event(...)`
- `integration_verify_webhook_signature(...)`

Webhooks exigem HTTPS e assinatura `sha256=...`.

## SSO

Preparacao:

- `google_workspace`
- `microsoft_entra`

Sem credenciais institucionais reais no momento:

`SSO_PROVIDER_CONFIGURATION=EMPTY_REAL`

## Erros

Erros comuns:

- `42501`: acesso negado ou escopo insuficiente;
- `22023`: parametro invalido, payload invalido ou recurso nao suportado.

## Limites

Leituras paginadas:

- `limit` minimo: 1
- `limit` maximo: 500

Importacoes:

- devem usar `idempotency_key` por lote;
- devem passar por preview antes de confirmacao;
- nao podem sobrescrever silenciosamente estruturas academicas canonicas.

## Garantias

- `API_ANON_ACCESS=ZERO`
- `API_SECRET_FRONTEND=ZERO`
- `UNSCOPED_INTEGRATION_TOKEN=ZERO`
- `DUPLICATE_ACADEMIC_ENGINE=ZERO`
- `WEBHOOK_SPOOFING=ZERO`
