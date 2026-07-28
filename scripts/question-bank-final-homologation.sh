#!/usr/bin/env bash
set -euo pipefail

NODE_BIN="${NODE_BIN:-/Users/danielhenrique/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"
VERIFY_SCRIPT="scripts/question-bank-remote-homologation.mjs"
LOCAL_ENV_FILE="${QUESTION_BANK_TEST_ENV_FILE:-.env.question-bank-test}"

if [[ -f "$LOCAL_ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$LOCAL_ENV_FILE"
  set +a
fi

prompt_email() {
  local var_name="$1"
  local label="$2"
  local fallback="$3"
  if [[ -n "${!var_name:-}" ]]; then
    return
  fi
  local answer
  read -r -p "E-mail ${label} [${fallback}]: " answer
  export "$var_name=${answer:-$fallback}"
}

prompt_password() {
  local var_name="$1"
  local label="$2"
  if [[ -n "${!var_name:-}" ]]; then
    return
  fi
  local answer
  read -r -s -p "Senha ${label}: " answer
  printf '\n'
  if [[ -z "$answer" ]]; then
    echo "Credenciais invalidas: senha ausente para ${label}." >&2
    exit 1
  fi
  export "$var_name=$answer"
}

echo "Homologacao final autenticada do Banco de Questoes"
echo "Credenciais locais: ${LOCAL_ENV_FILE} quando existir, ou prompt oculto."
echo "Senhas e JWTs nao sao gravados nem impressos."
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
echo "Validando credenciais e executando testes finais..."
echo

"$NODE_BIN" "$VERIFY_SCRIPT" verify

unset SUPABASE_TEST_PASSWORD_ADMIN
unset SUPABASE_TEST_PASSWORD_PROFESSOR
unset SUPABASE_TEST_PASSWORD_CURATOR
unset SUPABASE_TEST_PASSWORD_VIEWER
