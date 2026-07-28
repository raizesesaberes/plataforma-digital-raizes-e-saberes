#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
HOMOLOGATE_SCRIPT="scripts/homologate-question-lot.mjs"

if [[ -z "${SUPABASE_TEST_EMAIL_PROFESSOR:-}" ]]; then
  read -r -p "E-mail professor [professor.banco@raizesesaberes.com]: " professor_email
  export SUPABASE_TEST_EMAIL_PROFESSOR="${professor_email:-professor.banco@raizesesaberes.com}"
fi

if [[ -z "${SUPABASE_TEST_PASSWORD_PROFESSOR:-}" ]]; then
  read -r -s -p "Senha professor: " professor_password
  printf '\n'
  if [[ -z "$professor_password" ]]; then
    echo "Senha nao informada." >&2
    exit 1
  fi
  export SUPABASE_TEST_PASSWORD_PROFESSOR="$professor_password"
fi

"$NODE_BIN" "$HOMOLOGATE_SCRIPT" "${1:-LP2-L}"

unset SUPABASE_TEST_PASSWORD_PROFESSOR
