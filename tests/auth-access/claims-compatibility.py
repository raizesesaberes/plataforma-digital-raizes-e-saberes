"""Synthetic RPC tests in a disposable PostgreSQL container, never a remote DB.
Uses reviewed repository migrations unchanged. No host mounts, published ports,
remote credentials, or network. This is a SQL/GUC simulation, not PostgREST HTTP.
Requires the pinned official image to be present; never pulls automatically.
"""
from pathlib import Path
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
IMAGE = 'postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24'
NAME = 'rs-auth-claims-' + uuid.uuid4().hex[:12]
TARGET = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
CALL = f"public.admin_check_auth_access_duplicate('teacher', '{TARGET}', 'fixture@example.invalid', 'professor')"

def run(*args, **kwargs):
    result = subprocess.run(args, text=True, capture_output=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result

def sql(text):
    return run('docker', 'exec', '-i', NAME, 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
               '-U', 'postgres', '-d', 'postgres', input=text).stdout

def literal(value):
    return "'" + value.replace("'", "''") + "'"

try:
    run('docker', 'run', '--pull=never', '--detach', '--name', NAME, '--network=none',
        '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', IMAGE)
    for _ in range(60):
        ready = subprocess.run(['docker', 'exec', NAME, 'pg_isready', '-U', 'postgres'],
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        logs = run('docker', 'logs', NAME)
        initialized = 'PostgreSQL init process complete' in logs.stdout + logs.stderr
        if initialized and ready.returncode == 0:
            break
        time.sleep(0.5)
    else:
        raise RuntimeError('Disposable PostgreSQL did not become ready')
    sql("""
CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, deleted_at timestamptz,
  created_at timestamptz DEFAULT now(), banned_until timestamptz,
  raw_user_meta_data jsonb, raw_app_meta_data jsonb);
CREATE TABLE public.teachers (id uuid PRIMARY KEY, school_id uuid, profile_id uuid, user_id uuid, status text);
CREATE TABLE public.students (LIKE public.teachers);
CREATE TABLE public.guardians (LIKE public.teachers);
CREATE TABLE public.profiles (id uuid PRIMARY KEY);
CREATE TABLE public.school_memberships (id uuid PRIMARY KEY, school_id uuid, profile_id uuid,
  status text, created_at timestamptz DEFAULT now());
INSERT INTO public.teachers (id, school_id, status) VALUES
 ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active');
""")
    for migration in ['20261008234450_admin_auth_access_duplicate_check.sql',
                      '20261008234606_admin_auth_access_duplicate_check_orphan_priority.sql']:
        sql((ROOT / 'supabase/migrations' / migration).read_text())
    cases = [
        ('legacy service_role', 'service_role', 'service_role', '', True),
        ('JSON-only service_role: compatibility gap reproduced', 'service_role', '', '{"role":"service_role"}', False),
        ('matching JSON and legacy', 'service_role', 'service_role', '{"role":"service_role"}', True),
        ('missing claims', 'service_role', '', '', False),
        ('legacy authenticated', 'service_role', 'authenticated', '', False),
        ('conflicting JSON ignored by original RPC', 'service_role', 'service_role', '{"role":"authenticated"}', True),
        ('anon ACL denies even simulated service claim', 'anon', 'service_role', '', False),
        ('authenticated ACL denies even simulated service claim', 'authenticated', 'service_role', '', False),
        ('owner without technical claim denied', 'postgres', '', '', False),
    ]
    for label, role, legacy, claims, allowed in cases:
        block = f"""
BEGIN;
SET LOCAL ROLE {role};
SELECT set_config('request.jwt.claim.role', {literal(legacy)}, true);
SELECT set_config('request.jwt.claims', {literal(claims)}, true);
DO $test$
DECLARE got jsonb; denied boolean := false;
BEGIN
  BEGIN
    got := {CALL};
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF denied = {'true' if allowed else 'false'} THEN
    RAISE EXCEPTION 'unexpected authorization result';
  END IF;
  IF NOT denied AND got->>'ok' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'unexpected RPC response';
  END IF;
END;
$test$;
ROLLBACK;
"""
        sql(block)
        print('PASS:', label)
    # A linked Auth plus a different banned orphan must remain blocked as orphan.
    sql("""
INSERT INTO auth.users (id, email, banned_until, raw_user_meta_data, raw_app_meta_data) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'linked@example.invalid', null,
 '{"institutional_target_type":"teacher","institutional_target_id":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', '{"platform_role":"professor"}'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'fixture@example.invalid', 'infinity',
 '{"institutional_target_type":"teacher","institutional_target_id":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', '{"platform_role":"professor"}');
UPDATE public.teachers SET profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
""")
    sql(f"""
BEGIN;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);
DO $test$
DECLARE got jsonb := {CALL};
BEGIN
  IF got->>'orphan_auth_recovery_required' IS DISTINCT FROM 'true'
    OR got->>'institutional_target_already_linked' IS DISTINCT FROM 'true'
    OR got->>'email_already_used' IS DISTINCT FROM 'true'
    OR got->>'institutional_target_auth_user_id' IS DISTINCT FROM 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  THEN RAISE EXCEPTION 'orphan priority regression'; END IF;
END;
$test$;
ROLLBACK;
DO $test$
BEGIN
  IF (SELECT banned_until::text FROM auth.users WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
    IS DISTINCT FROM 'infinity' THEN RAISE EXCEPTION 'ban changed'; END IF;
END;
$test$;
""")
    print('PASS: linked + banned infinity orphan prioritized; ban preserved')
    print('10 original-RPC assertions passed; JSON-only rejection reproduced.')
    metadata_query = "SELECT jsonb_build_object('owner',proowner,'acl',proacl::text,'definer',prosecdef) FROM pg_proc WHERE oid='public.admin_check_auth_access_duplicate(text,uuid,text,text)'::regprocedure;"
    before_metadata = sql(metadata_query)
    sql((ROOT / 'supabase/migrations/20261009152555_admin_auth_access_claims_compatibility.sql').read_text())
    assert sql(metadata_query) == before_metadata, 'Owner, ACL or SECURITY DEFINER changed'
    new_cases = [
        ('modern service only', 'service_role', None, '{"role":"service_role"}', True),
        ('legacy only', 'service_role', 'service_role', None, True),
        ('empty JSON setting legacy fallback', 'service_role', 'service_role', '', True),
        ('modern with reset legacy', 'service_role', '', '{"role":"service_role"}', True),
        ('matching claims', 'service_role', 'service_role', '{"role":"service_role"}', True),
        ('both absent', 'service_role', None, None, False),
        ('both empty', 'service_role', '', '', False),
        ('conflicting modern authenticated', 'service_role', 'service_role', '{"role":"authenticated"}', False),
        ('conflicting legacy authenticated', 'service_role', 'authenticated', '{"role":"service_role"}', False),
        ('malformed JSON never falls back', 'service_role', 'service_role', '{', False),
        ('JSON whitespace never falls back', 'service_role', 'service_role', ' ', False),
        ('role absent never falls back', 'service_role', 'service_role', '{}', False),
        ('role null never falls back', 'service_role', 'service_role', '{"role":null}', False),
        ('role numeric', 'service_role', None, '{"role":1}', False),
        ('role array', 'service_role', None, '{"role":["service_role"]}', False),
        ('role object', 'service_role', None, '{"role":{}}', False),
        ('role boolean', 'service_role', None, '{"role":true}', False),
        ('role empty', 'service_role', 'service_role', '{"role":""}', False),
        ('role whitespace', 'service_role', None, '{"role":" service_role"}', False),
        ('role uppercase', 'service_role', None, '{"role":"SERVICE_ROLE"}', False),
        ('JSON scalar null', 'service_role', 'service_role', 'null', False),
        ('JSON scalar string', 'service_role', 'service_role', '"service_role"', False),
        ('JSON array', 'service_role', 'service_role', '[]', False),
        ('JSON numeric', 'service_role', 'service_role', '123', False),
        ('JSON boolean', 'service_role', 'service_role', 'true', False),
        ('legacy unauthorized', 'service_role', 'authenticated', None, False),
        ('legacy whitespace', 'service_role', ' service_role', None, False),
        ('anon cannot call', 'anon', None, '{"role":"service_role"}', False),
        ('authenticated cannot call', 'authenticated', None, '{"role":"service_role"}', False),
        ('owner has no bypass', 'postgres', None, None, False),
    ]
    for label, role, legacy, claims, allowed in new_cases:
        settings = ''
        if legacy is not None:
            settings += f"SELECT set_config('request.jwt.claim.role', {literal(legacy)}, true);"
        if claims is not None:
            settings += f"SELECT set_config('request.jwt.claims', {literal(claims)}, true);"
        sql(f"""
BEGIN;
SET LOCAL ROLE {role};
{settings}
DO $test$
DECLARE got jsonb; denied boolean := false;
BEGIN
  BEGIN got := {CALL};
  EXCEPTION WHEN insufficient_privilege THEN denied := true;
  END;
  IF denied = {'true' if allowed else 'false'} THEN
    RAISE EXCEPTION 'unexpected authorization result';
  END IF;
  IF NOT denied AND (got->>'ok' IS DISTINCT FROM 'true'
    OR got->>'orphan_auth_recovery_required' IS DISTINCT FROM 'true'
    OR got->>'institutional_target_auth_user_id' IS DISTINCT FROM 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') THEN
    RAISE EXCEPTION 'orphan priority changed';
  END IF;
END;
$test$;
ROLLBACK;
""")
        print('PASS corrected RPC:', label)
    sql("""
DO $test$
BEGIN
 IF (SELECT banned_until::text FROM auth.users WHERE id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') IS DISTINCT FROM 'infinity'
 THEN RAISE EXCEPTION 'ban changed'; END IF;
 IF (SELECT proconfig FROM pg_proc WHERE oid='public.admin_check_auth_access_duplicate(text,uuid,text,text)'::regprocedure)
 IS DISTINCT FROM ARRAY['search_path=pg_catalog, pg_temp']::text[] THEN RAISE EXCEPTION 'unsafe search path'; END IF;
END;
$test$;
""")
    print('PASS: original owner/ACL/SECURITY DEFINER preserved; safe search_path; infinity unchanged')
    migration = (ROOT / 'supabase/migrations/20261009152555_admin_auth_access_claims_compatibility.sql').read_text()
    migration_body = migration.removeprefix(migration[:migration.index('begin;') + len('begin;')]).rsplit('commit;', 1)[0]
    fingerprint_query = "SELECT jsonb_build_object('definition',pg_get_functiondef(oid),'owner',proowner,'acl',proacl::text) FROM pg_proc WHERE oid='public.admin_check_auth_access_duplicate(text,uuid,text,text)'::regprocedure;"
    fingerprint = sql(fingerprint_query)
    for label, setup, expected in [
        ('missing base', 'DROP FUNCTION public.admin_check_auth_access_duplicate(text,uuid,text,text);', 'AUTH_DUPLICATE_RPC_BASE_REQUIRED'),
        ('unsafe anon ACL', 'GRANT EXECUTE ON FUNCTION public.admin_check_auth_access_duplicate(text,uuid,text,text) TO anon;', 'AUTH_DUPLICATE_RPC_ACL_REVIEW_REQUIRED'),
        ('missing service ACL', 'REVOKE EXECUTE ON FUNCTION public.admin_check_auth_access_duplicate(text,uuid,text,text) FROM service_role;', 'AUTH_DUPLICATE_RPC_ACL_REVIEW_REQUIRED'),
    ]:
        try:
            sql('BEGIN;' + setup + migration_body + 'ROLLBACK;')
        except RuntimeError as error:
            assert expected in str(error), str(error)
        else:
            raise AssertionError('Migration precondition did not reject: ' + label)
        assert sql(fingerprint_query) == fingerprint, 'Rejected migration leaked a definition/ACL change'
        print('PASS migration precondition:', label)
    print('Original 10 + corrected 30 + migration preconditions 3 passed. Remote target remains UNTESTED.')
finally:
    subprocess.run(['docker', 'rm', '--force', '--volumes', NAME], capture_output=True, check=False)
