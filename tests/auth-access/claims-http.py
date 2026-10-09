"""Actual local HTTP via PostgREST; disposable internal Docker network only.
No remote Supabase, real credentials, host ports or persistent DB/ACLs.
Official images must already exist. The original RPC is never modified.
"""
from pathlib import Path
import base64
import hashlib
import hmac
import http.client
import io
import json
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
PG = 'postgres@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24'
REST = 'postgrest/postgrest@sha256:d155c6718ed9a9f990d159a2ab7c0a3f16944dbb6d0a0344557421042acfe0df'
PREFIX = 'rs-http-' + uuid.uuid4().hex[:10]
NET, DB, API = PREFIX + '-net', PREFIX + '-db', PREFIX + '-api'
SECRET = 'synthetic-local-only-never-a-production-secret-2026'
TARGET = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
results = {}

def run(*args, **kwargs):
    result = subprocess.run(args, capture_output=True, text=True, **kwargs)
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return result

def sql(text):
    return run('docker', 'exec', '-i', DB, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1',
               '-U', 'postgres', '-d', 'postgres', input=text).stdout.strip()

def token(role):
    encode = lambda data: base64.urlsafe_b64encode(data).rstrip(b'=')
    header = encode(b'{"alg":"HS256","typ":"JWT"}')
    payload = encode(json.dumps({'role': role, 'exp': int(time.time()) + 300}).encode())
    data = header + b'.' + payload
    return (data + b'.' + encode(hmac.new(SECRET.encode(), data, hashlib.sha256).digest())).decode()

class MemorySocket:
    def __init__(self, data):
        self.data = data
    def makefile(self, *_args):
        return io.BytesIO(self.data)

def request(path, role='service_role', payload=None):
    body = json.dumps(payload or {})
    raw = (f'POST /rpc/{path} HTTP/1.1\r\nHost: api:3000\r\n'
           f'Authorization: Bearer {token(role)}\r\nContent-Type: application/json\r\n'
           f'Content-Length: {len(body.encode())}\r\nConnection: close\r\n\r\n{body}')
    proc = subprocess.run(['docker', 'exec', '-i', DB, 'nc', '-w', '5', 'api', '3000'],
                          input=raw.encode(), capture_output=True, timeout=10)
    if proc.returncode:
        raise RuntimeError('Local HTTP connection unavailable')
    response = http.client.HTTPResponse(MemorySocket(proc.stdout))
    response.begin()
    return {'status': response.status, 'body': json.loads(response.read())}

try:
    results['postgrest_version'] = run('docker', 'run', '--rm', '--pull=never', '--network=none',
                                      REST, 'postgrest', '--version').stdout.strip()
    run('docker', 'network', 'create', '--internal', NET)
    run('docker', 'run', '--detach', '--pull=never', '--name', DB, '--network', NET,
        '--network-alias', 'db', '--tmpfs', '/var/lib/postgresql/data',
        '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', PG)
    for _ in range(60):
        logs = run('docker', 'logs', DB)
        ready = subprocess.run(['docker', 'exec', DB, 'pg_isready', '-U', 'postgres'], capture_output=True)
        if 'PostgreSQL init process complete' in logs.stdout + logs.stderr and ready.returncode == 0:
            break
        time.sleep(0.5)
    else:
        raise RuntimeError('PostgreSQL initialization timeout')
    results['postgres_version'] = sql('SHOW server_version;')
    sql("""
CREATE ROLE authenticator LOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
GRANT service_role, anon, authenticated TO authenticator;
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
 ('cccccccc-cccc-cccc-cccc-cccccccccccc','dddddddd-dddd-dddd-dddd-dddddddddddd','active');
CREATE FUNCTION public.synthetic_claim_probe() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER AS $$
 SELECT jsonb_build_object('json_role', current_setting('request.jwt.claims',true)::jsonb->>'role',
 'legacy_role', nullif(current_setting('request.jwt.claim.role',true),''), 'effective_role', current_user);
$$;
REVOKE ALL ON FUNCTION public.synthetic_claim_probe() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.synthetic_claim_probe() TO service_role;
""")
    for name in ['20261008234450_admin_auth_access_duplicate_check.sql',
                 '20261008234606_admin_auth_access_duplicate_check_orphan_priority.sql']:
        sql((ROOT / 'supabase/migrations' / name).read_text())
    snapshot_query = """SELECT jsonb_build_object(
      'auth_count',(SELECT count(*) FROM auth.users),
      'teachers',(SELECT jsonb_agg(to_jsonb(t)) FROM public.teachers t),
      'rpc_md5',md5(pg_get_functiondef('public.admin_check_auth_access_duplicate(text,uuid,text,text)'::regprocedure)),
      'rpc_acl',(SELECT proacl::text FROM pg_proc WHERE oid='public.admin_check_auth_access_duplicate(text,uuid,text,text)'::regprocedure));"""
    before = sql(snapshot_query)
    run('docker', 'run', '--detach', '--pull=never', '--name', API, '--network', NET,
        '--network-alias', 'api', '-e', 'PGRST_DB_URI=postgres://authenticator@db:5432/postgres',
        '-e', 'PGRST_DB_SCHEMAS=public', '-e', 'PGRST_DB_ANON_ROLE=anon',
        '-e', 'PGRST_JWT_SECRET=' + SECRET, REST, 'postgrest')
    for _ in range(30):
        try:
            probe = request('synthetic_claim_probe')
            if probe['status'] == 200:
                break
        except (RuntimeError, http.client.HTTPException, json.JSONDecodeError):
            pass
        time.sleep(0.5)
    else:
        raise RuntimeError('PostgREST HTTP initialization timeout')
    results['http_claim_probe'] = probe
    assert probe == {'status': 200, 'body': {'json_role': 'service_role', 'legacy_role': None, 'effective_role': 'service_role'}}
    payload = {'p_target_type': 'teacher', 'p_target_institutional_id': TARGET,
               'p_email': 'fixture@example.invalid', 'p_expected_role': 'professor'}
    for role in ['service_role', 'anon', 'authenticated']:
        response = request('admin_check_auth_access_duplicate', role, payload)
        results['http_rpc_' + role] = response
        expected_status = 401 if role == 'anon' else 403
        assert response['status'] == expected_status and response['body']['code'] == '42501', (role, response)
        if role == 'service_role':
            assert response['body']['message'] == 'SERVICE_ROLE_REQUIRED'
        else:
            assert 'permission denied' in response['body']['message']
    # Compare with the old SQL simulation on the SAME original function.
    simulated = sql(f"""BEGIN; SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role','service_role',true);
SELECT public.admin_check_auth_access_duplicate('teacher','{TARGET}','fixture@example.invalid','professor');
ROLLBACK;""")
    parsed = [json.loads(line) for line in simulated.splitlines() if line.startswith('{')]
    assert len(parsed) == 1 and parsed[0]['ok'] is True
    results['sql_legacy_simulation'] = parsed[0]
    assert sql(snapshot_query) == before
    results['original_rpc_and_fixtures_unchanged'] = True
    before_fix = json.loads(sql(snapshot_query))
    security_query = "SELECT jsonb_build_object('owner',proowner,'acl',proacl::text,'definer',prosecdef) FROM pg_proc WHERE oid='public.admin_check_auth_access_duplicate(text,uuid,text,text)'::regprocedure;"
    security_before = sql(security_query)
    sql((ROOT / 'supabase/migrations/20261009152555_admin_auth_access_claims_compatibility.sql').read_text())
    assert sql(security_query) == security_before
    after_fix = json.loads(sql(snapshot_query))
    assert before_fix.pop('rpc_md5') != after_fix.pop('rpc_md5'), 'Expected only reviewed definition update'
    assert before_fix == after_fix, 'Migration changed ACL or fixtures'
    results['http_after_claim_probe'] = request('synthetic_claim_probe')
    assert results['http_after_claim_probe'] == probe
    free = request('admin_check_auth_access_duplicate', 'service_role', payload)
    results['http_after_service_role'] = free
    assert free['status'] == 200 and free['body'] == parsed[0], 'Response drift from original SQL result'
    for role in ['anon', 'authenticated']:
        response = request('admin_check_auth_access_duplicate', role, payload)
        results['http_after_' + role] = response
        assert response['status'] == (401 if role == 'anon' else 403)
        assert response['body']['code'] == '42501' and 'permission denied' in response['body']['message']
    # Synthetic linked Auth and banned orphan; no real users and no GoTrue service.
    sql("""
INSERT INTO auth.users (id,email,banned_until,raw_user_meta_data,raw_app_meta_data) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','linked@example.invalid',null,
 '{"institutional_target_type":"teacher","institutional_target_id":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', '{"platform_role":"professor"}'),
 ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb','fixture@example.invalid','infinity',
 '{"institutional_target_type":"teacher","institutional_target_id":"cccccccc-cccc-cccc-cccc-cccccccccccc"}', '{"platform_role":"professor"}');
UPDATE public.teachers SET profile_id='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
""")
    auth_snapshot = "SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM auth.users u;"
    auth_before = sql(auth_snapshot)
    fixtures_before = sql(snapshot_query)
    orphan = request('admin_check_auth_access_duplicate', 'service_role', payload)
    results['http_after_linked_and_infinity_orphan'] = orphan
    assert orphan['status'] == 200
    assert orphan['body']['orphan_auth_recovery_required'] is True
    assert orphan['body']['institutional_target_already_linked'] is True
    assert orphan['body']['email_already_used'] is True
    assert orphan['body']['institutional_target_auth_user_id'] == 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    assert sql(auth_snapshot) == auth_before and sql(snapshot_query) == fixtures_before
    assert sql(security_query) == security_before
    results['owner_acl_definer_and_fixtures_preserved'] = True
    results['conclusion'] = 'Local HTTP before 403, after 200 with identical free response; negatives and infinity orphan preserved. Remote target untested.'
    print(json.dumps(results, ensure_ascii=False, indent=2))
finally:
    for name in [API, DB]:
        subprocess.run(['docker', 'rm', '--force', '--volumes', name], capture_output=True)
    subprocess.run(['docker', 'network', 'rm', NET], capture_output=True)
