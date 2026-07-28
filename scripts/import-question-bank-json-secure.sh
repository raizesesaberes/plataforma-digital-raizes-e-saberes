#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
IMPORT_SCRIPT="scripts/import-question-bank-json.mjs"

if [[ "$#" -lt 1 ]]; then
  echo "Uso: bash scripts/import-question-bank-json-secure.sh CAMINHO_DO_ARQUIVO_JSON [...outros.json]" >&2
  exit 1
fi

if [[ -z "${SUPABASE_IMPORT_EMAIL:-}" && -z "${SUPABASE_TEST_EMAIL_CURATOR:-}" ]]; then
  read -r -p "E-mail do usuario autorizado [curador.banco@raizesesaberes.com]: " import_email
  export SUPABASE_IMPORT_EMAIL="${import_email:-curador.banco@raizesesaberes.com}"
fi

if [[ -z "${SUPABASE_IMPORT_PASSWORD:-}" && -z "${SUPABASE_TEST_PASSWORD_CURATOR:-}" && -z "${SUPABASE_IMPORT_ACCESS_TOKEN:-}" ]]; then
  read -r -s -p "Senha do usuario autorizado: " import_password
  printf '\n'
  if [[ -z "$import_password" ]]; then
    echo "Senha nao informada." >&2
    exit 1
  fi
  export SUPABASE_IMPORT_PASSWORD="$import_password"
fi

"$NODE_BIN" "$IMPORT_SCRIPT" "$@"

unset SUPABASE_IMPORT_PASSWORD
