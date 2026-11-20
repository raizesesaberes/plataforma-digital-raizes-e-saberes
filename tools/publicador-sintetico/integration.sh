#!/bin/bash
set -euo pipefail
umask 077
[[ ${GITHUB_REF:-} == refs/heads/homologacao-publicador-videos ]]
base=$(cd "$(dirname "$0")" && pwd)
for exe in docker psql python3 npx; do command -v "$exe" >/dev/null; done
docker info >/dev/null 2>&1
work=$(mktemp -d /tmp/rs-supabase-fixture.XXXXXXXX)
mkdir "$work/home"
sandbox() { env -i HOME="$work/home" PATH="$PATH" CI=true LC_ALL=C "$@"; }
sb() { sandbox npx --yes supabase@2.122.0 "$@"; }
cleanup() { if [[ -f "$work/supabase/config.toml" ]]; then (cd "$work"; sb stop --no-backup >/dev/null 2>&1) || :; fi; rm -rf -- "$work"; }
trap cleanup EXIT
cd "$work"
[[ $(sb --version) == 2.122.0 ]]
sb init >/dev/null 2>&1 || { echo 'Local Supabase init failed'; exit 1; }
[[ -f supabase/config.toml && ! -e supabase/.temp/project-ref ]]
cat >> supabase/config.toml <<'TOML'

[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/fixture_auth/issue"
TOML
sandbox python3 - <<'PY'
import pathlib, tomllib
c = tomllib.loads(pathlib.Path("supabase/config.toml").read_text())
assert c["api"]["schemas"] == ["public", "graphql_public"], "Unexpected API schema configuration"
assert c["api"]["port"] == 54321 and c["db"]["port"] == 54322, "Unexpected local endpoints"
PY
sb start >/dev/null 2>&1 || { echo 'Local Supabase stack did not start'; exit 1; }
sb status -o json 2>/dev/null | sandbox python3 "$base/integration.py" "$base/schema.sql"
