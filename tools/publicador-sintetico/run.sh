#!/bin/bash
set -euo pipefail
umask 077
base=$(cd "$(dirname "$0")" && pwd)
pgbin=${PGBIN:-/usr/lib/postgresql/16/bin}
[[ "$pgbin" == /* && -x "$pgbin/initdb" && -x "$pgbin/pg_ctl" && -x "$pgbin/psql" ]]
scratch=$(mktemp -d /tmp/rs-pg-ci.XXXXXXXX)
cleanup() {
  if [[ -f "$scratch/data/postmaster.pid" ]]; then
    "$pgbin/pg_ctl" -D "$scratch/data" -m immediate -w stop >/dev/null || return 1
  fi
  rm -rf -- "$scratch"
}
trap cleanup EXIT
mkdir "$scratch/sock"
# Empty environment prevents inheriting any hosted database credentials/URLs.
env -i PATH=/usr/bin:/bin LC_ALL=C "$pgbin/initdb" --no-locale -A trust -U fixture_admin -D "$scratch/data" >/dev/null
env -i PATH=/usr/bin:/bin LC_ALL=C "$pgbin/pg_ctl" -D "$scratch/data" -l "$scratch/server.log" -o "-c listen_addresses='' -k '$scratch/sock' -p 55483" -w start >/dev/null
[[ -S "$scratch/sock/.s.PGSQL.55483" ]]
run_sql() {
  env -i PATH=/usr/bin:/bin LC_ALL=C "$pgbin/psql" -X -qAt -v ON_ERROR_STOP=1 -h "$scratch/sock" -p 55483 -U fixture_admin -d postgres "$@"
}
run_sql -f "$base/schema.sql"
run_sql -f "$base/smoke.sql"
