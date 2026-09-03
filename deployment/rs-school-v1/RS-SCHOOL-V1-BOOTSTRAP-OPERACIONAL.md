# Bootstrap Operacional RS-SCHOOL V1

Usar o bootstrap canonico:

`supabase/template/bootstrap/rs_school_template_bootstrap.sql`

## Parametros

- `school_name`
- `school_code`
- `school_year`
- `admin_user_id`
- `admin_display_name`
- `deployment_mode` opcional, padrao `production`
- `admin_membership_role` opcional, padrao `admin`

## Regras

- Criar Auth Admin antes do bootstrap.
- Nao passar senha para o bootstrap.
- Nao gravar senha em arquivo.
- Conferir project-ref antes da execucao.
- Rodar uma vez e validar.
- Reexecutar somente para testar idempotencia em ambiente de validacao.

## Helper Local

```bash
node deployment/rs-school-v1/scripts/render-bootstrap-command.mjs \
  --school-name "Nome da Escola" \
  --school-code "COD001" \
  --school-year 2026 \
  --admin-user-id "<uuid-auth>" \
  --admin-display-name "Administrador Inicial"
```

O helper apenas monta o comando. Ele nao conecta no banco.

