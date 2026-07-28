#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
VERIFY_SCRIPT="scripts/question-bank-remote-homologation.mjs"

prompt_email() {
  local var_name="$1"
  local label="$2"
  local fallback="$3"
  local current="${!var_name:-}"
  if [[ -n "$current" ]]; then
    return
  fi
  local answer
  read -r -p "E-mail ${label} [${fallback}]: " answer
  export "$var_name=${answer:-$fallback}"
}

prompt_password() {
  local var_name="$1"
  local label="$2"
  local current="${!var_name:-}"
  if [[ -n "$current" ]]; then
    return
  fi
  local answer
  read -r -s -p "Senha ${label}: " answer
  printf '\n'
  if [[ -z "$answer" ]]; then
    echo "Senha nao informada para ${label}." >&2
    exit 1
  fi
  export "$var_name=$answer"
}

echo "Homologacao autenticada do Banco de Questoes"
echo "As senhas digitadas aqui nao sao gravadas e nao aparecem no log."
echo

prompt_email SUPABASE_TEST_EMAIL_ADMIN admin "admin.banco@raizesesaberes.com"
prompt_password SUPABASE_TEST_PASSWORD_ADMIN admin

prompt_email SUPABASE_TEST_EMAIL_PROFESSOR professor "professor.banco@raizesesaberes.com"
prompt_password SUPABASE_TEST_PASSWORD_PROFESSOR professor

prompt_email SUPABASE_TEST_EMAIL_CURATOR curator "curador.banco@raizesesaberes.com"
prompt_password SUPABASE_TEST_PASSWORD_CURATOR curator

prompt_email SUPABASE_TEST_EMAIL_VIEWER viewer "viewer.banco@raizesesaberes.com"
prompt_password SUPABASE_TEST_PASSWORD_VIEWER viewer

echo
echo "Executando homologacao remota autenticada..."
echo

"$NODE_BIN" "$VERIFY_SCRIPT" verify

unset SUPABASE_TEST_PASSWORD_ADMIN
unset SUPABASE_TEST_PASSWORD_PROFESSOR
unset SUPABASE_TEST_PASSWORD_CURATOR
unset SUPABASE_TEST_PASSWORD_VIEWER
