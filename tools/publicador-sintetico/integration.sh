#!/bin/bash
set -euo pipefail
umask 077
[[ ${GITHUB_REF:-} == refs/heads/homologacao-publicador-videos ]]
base=$(cd "$(dirname "$0")" && pwd)
for exe in docker psql python3 npx node openssl; do command -v "$exe" >/dev/null; done
docker info >/dev/null 2>&1
# Use the browser already installed in the disposable runner. No installs or reuse of profiles.
if command -v google-chrome >/dev/null; then chrome=$(command -v google-chrome)
elif command -v chromium >/dev/null; then chrome=$(command -v chromium)
else echo 'Chromium or Google Chrome not installed in this runner'; exit 1; fi
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
# Private, ephemeral local-only trust anchor. Never print generated key material.
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 1 -subj '/CN=synthetic-loopback' \
  -addext 'subjectAltName=IP:127.0.0.1,DNS:localhost' \
  -keyout tls-key.pem -out tls-cert.pem 2>/dev/null
sandbox python3 - <<'PY'
from pathlib import Path
p = Path("supabase/config.toml")
s = p.read_text()
anchor = "[api.tls]\n# Enable HTTPS endpoints locally using a self-signed certificate.\nenabled = false\n"
assert s.count(anchor) == 1, "Unexpected generated API TLS section"
p.write_text(s.replace(anchor, '[api.tls]\nenabled = true\ncert_path = "../tls-cert.pem"\nkey_path = "../tls-key.pem"\n', 1))
PY
cat >> supabase/config.toml <<'TOML'

[auth.hook.custom_access_token]
enabled = true
uri = "pg-functions://postgres/fixture_auth/issue"
TOML
sandbox python3 - <<'PY'
import pathlib, tomllib
c = tomllib.loads(pathlib.Path("supabase/config.toml").read_text())
assert c["api"]["schemas"] == ["public", "graphql_public"], "Unexpected API schema configuration"
assert c["api"]["tls"]["enabled"] is True, "Local HTTPS only"
assert c["api"]["port"] == 54321 and c["db"]["port"] == 54322, "Unexpected local endpoints"
PY
sb start >/dev/null 2>&1 || { echo 'Local Supabase stack did not start'; exit 1; }
sb status -o json 2>/dev/null | sandbox python3 "$base/integration.py" "$base/schema.sql" "$work/tls-cert.pem" "$base/teacher-training-policy-v7.mjs" "$base/teacher-training-loopback.mjs" "$base/teacher-fixture-motion.mp4" "$base/chromium-fixture-playback.mjs" "$chrome"
