import base64
import hashlib
import json
import os
import pathlib
import re
import secrets
import ssl
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from urllib.parse import unquote, urlsplit


def check(condition, label):
    if not condition:
        raise SystemExit(label)


status = json.load(sys.stdin)
for field, schemes, port in [('API_URL', ('https',), 54321), ('DB_URL', ('postgresql', 'postgres'), 54322)]:
    url = urlsplit(status[field])
    check(url.hostname in ('127.0.0.1', 'localhost') and url.scheme in schemes and url.port == port
          and not url.query and not url.fragment, 'nonlocal or unexpected endpoint')
db = urlsplit(status['DB_URL'])
check(db.username == 'postgres' and db.path == '/postgres' and db.password, 'unexpected database identity')
api = 'https://127.0.0.1:54321'
cert = pathlib.Path(sys.argv[2]).resolve(strict=True)
policy = pathlib.Path(sys.argv[3]).resolve(strict=True)
adapter = pathlib.Path(sys.argv[4]).resolve(strict=True)
motion_fixture = pathlib.Path(sys.argv[5]).resolve(strict=True)
chromium_test = pathlib.Path(sys.argv[6]).resolve(strict=True)
chromium = pathlib.Path(sys.argv[7]).resolve(strict=True)
check(hashlib.sha256(policy.read_bytes()).hexdigest() == 'a0e22d40e092b4ae6155309e5f2937f10175533a32ca15ad8d6b36fb7638c3d9', 'unexpected deployed v7 policy core hash')
tls = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
tls.load_verify_locations(cafile=str(cert))
anon = status['ANON_KEY']
service = status['SERVICE_ROLE_KEY']


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(), urllib.request.HTTPSHandler(context=tls))


def req(path, token=None, method='GET', data=None, key=None, mime='application/json'):
    check(path.startswith('/') and not path.startswith('//'), 'absolute request denied')
    headers = {'apikey': key or anon, 'Content-Type': mime}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(api + path, headers=headers,
                                     data=json.dumps(data).encode() if isinstance(data, dict) else data,
                                     method=method)
    try:
        with opener.open(request, timeout=20) as response:
            return response.status, response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.read()
    except (urllib.error.URLError, TimeoutError):
        raise SystemExit('local HTTPS request failed, details suppressed') from None


def ok(result, label):
    check(200 <= result[0] < 300, label + ' HTTP ' + str(result[0]))
    return json.loads(result[1]) if result[1] else {}


def create(name):
    email = name + '-' + secrets.token_hex(4) + '@example.test'
    password = secrets.token_urlsafe(32)
    response = ok(req('/auth/v1/admin/users', service, 'POST',
                      {'email': email, 'password': password, 'email_confirm': True}, service), 'seed synthetic identity')
    return str(uuid.UUID(response['id'])), email, password


def login(user, role):
    user_id, email, password = user
    response = ok(req('/auth/v1/token?grant_type=password', method='POST',
                      data={'email': email, 'password': password}), 'authenticate synthetic identity')
    token = response['access_token']
    # Check what Auth issued; actual signature verification is by each target service.
    encoded = token.split('.')[1]
    claims = json.loads(base64.urlsafe_b64decode(encoded + '=' * (-len(encoded) % 4)))
    check(claims['sub'] == user_id and claims['role'] == role, 'unexpected issued identity or role')
    return token


def sql(statement, label):
    process = subprocess.run(['psql', '-X', '-qAt', '-w', '-v', 'ON_ERROR_STOP=1',
                              '-v', 'VERBOSITY=verbose', '-f', '-', '-h', '127.0.0.1', '-p', '54322',
                              '-U', 'postgres', '-d', 'postgres'],
                             env={**os.environ, 'PGPASSWORD': unquote(db.password), 'LC_ALL': 'C'},
                             input=statement, text=True, capture_output=True, timeout=25)
    if process.returncode:
        # Deliberately never log stderr/stdout, command arguments, SQL or connection status.
        match = re.search(r'(?m)^(?:psql:(?:<stdin>|/dev/stdin|-):([1-9][0-9]{0,5}):\s*)?'
                          r'(?:ERROR|FATAL|PANIC):\s+([0-9A-Z]{5})(?=[:\s]|$)', process.stderr)
        if match:
            line = ' line=' + match[1] if match[1] else ''
            check(False, 'SQL failed: ' + label + ' sqlstate=' + match[2] + line)
        category = next((key for key, canonical in (
            ('connection-refused', 'Connection refused'),
            ('authentication-failed', 'password authentication failed'),
            ('no-password', 'no password supplied'),
        ) if canonical in process.stderr), 'unclassified')
        check(False, 'SQL failed: ' + label + ' psql_rc=' + str(process.returncode) + ' category=' + category)
    return process.stdout.strip()

# Only read the role flags and allowlisted setting on the already-validated loopback endpoint.
profile = sql("""
SELECT current_setting('server_version_num') || ',' ||
       CASE WHEN rolsuper THEN '1' ELSE '0' END || ',' ||
       CASE WHEN rolcreaterole THEN '1' ELSE '0' END || ',' ||
       CASE WHEN has_database_privilege(current_database(),'CREATE') THEN '1' ELSE '0' END || ',' ||
       CASE WHEN current_setting('createrole_self_grant', true) ~ '(^|,)[[:space:]]*set[[:space:]]*(,|$)'
            THEN '1' ELSE '0' END
FROM pg_roles WHERE rolname=current_user AND current_user='postgres';
""", 'read-only fixture-role preflight')
check(re.fullmatch(r'[0-9]{5,6}(,[01]){4}', profile) is not None, 'unexpected fixture-role preflight shape')
version, superuser, create_role, create_db_schema, self_grant_set = profile.split(',')
print('Fixture role preflight: pg=' + version + ' superuser=' + superuser +
      ' createrole=' + create_role + ' database_create=' + create_db_schema +
      ' self_grant_set=' + self_grant_set, flush=True)


original = pathlib.Path(sys.argv[1]).read_bytes()
check(hashlib.sha256(original).hexdigest() == "dd0931956de9e91030a2bc180e8ac24f6cdf2f3b0354c408a8d43a1fd670fcfd",
      "unexpected v3.1 source hash")
schema = original.decode("utf-8")
check(170000 <= int(version) < 180000 and (superuser, create_role, create_db_schema, self_grant_set)
      == ('0', '1', '1', '0'), 'unexpected disposable fixture bootstrap role profile')
# Non-mutating, controlled preflight: no grants to a service/provider role, and no privileges altered.
object_acl = sql("""
SELECT CASE WHEN has_schema_privilege('public','USAGE') AND has_schema_privilege('public','CREATE')
            AND pg_has_role((SELECT nspowner FROM pg_namespace WHERE nspname='public'),'USAGE')
            THEN '1' ELSE '0' END;
""", 'read-only fixture-object preflight')
check(object_acl == '1', 'disposable bootstrap does not own the existing public DDL path')

# Preserve the versioned source byte-for-byte. Insert an explicit SET-only local bootstrap
# adapter into the in-memory schema transaction; do not use a cluster-wide setting.
anchor = "CREATE ROLE pv3_withdraw NOLOGIN NOSUPERUSER NOBYPASSRLS;\n"
check(schema.count(anchor) == 1, 'unexpected v3.1 bootstrap anchor')
fixture_memberships = (
    "GRANT pv3_owner,pv3_prepare,pv3_withdraw TO postgres WITH INHERIT FALSE GRANTED BY CURRENT_USER;\n"
    "GRANT pv3_owner,pv3_prepare,pv3_withdraw TO postgres WITH SET TRUE GRANTED BY CURRENT_USER;\n"
)
sql(schema.replace(anchor, anchor + fixture_memberships, 1), 'original v3.1 schema + scoped local bootstrap')
check(sql("""
SELECT count(*) FROM pg_auth_members m JOIN pg_roles member ON member.oid=m.member
           JOIN pg_roles granted ON granted.oid=m.roleid
WHERE member.rolname='postgres' AND granted.rolname IN ('pv3_owner','pv3_prepare','pv3_withdraw')
AND NOT m.admin_option AND NOT m.inherit_option AND m.set_option;
""", 'fixture bootstrap SET-only memberships') == '3', 'unexpected fixture bootstrap role memberships')


def owner_read(statement, label):
    # Direct verifier reads explicitly assume the existing owner with FORCE RLS. No read grant.
    return sql('BEGIN READ ONLY; SET LOCAL ROLE pv3_owner;\n' + statement + ';\nCOMMIT;', label)
pub, app, reader, wrong = [create(name) for name in ('publisher', 'approver', 'reader', 'other')]
publisher, approver, reader_id = pub[0], app[0], reader[0]
check(len({user[0] for user in (pub, app, reader, wrong)}) == 4, 'synthetic identities not distinct')

batch = 'fixture-' + secrets.token_hex(6)
bucket = 'videos'
lesson_id = str(uuid.uuid4())
# Original six-second synthetic motion + tone MP4, no external footage or voices.
media = motion_fixture.read_bytes()
check(len(media) == 75782
      and hashlib.sha256(media).hexdigest() == '9db7e9e991d9274a33c9ea911cb9d36dfda2e17b735f024968f934b8ce3ad5de',
      'unexpected synthetic browser fixture bytes')
sha = hashlib.sha256(media).hexdigest()
key = 'formacao/fixture/fixture/fixture/volume-1/unidade-1/aula-4/' + sha + '.mp4'
payload = json.dumps([dict(id=lesson_id, title='Synthetic local fixture', path=key, sha=sha, edition='fixture',
                           subject='fixture', volume=1, unit=1, audience='teacher', covered=[4, 5])],
                     separators=(',', ':'))

setup = f"""
BEGIN;
-- Role assignments are server-owned and inaccessible from the Data API.
CREATE SCHEMA fixture_auth;
REVOKE ALL ON SCHEMA fixture_auth FROM PUBLIC, anon, authenticated, service_role;
CREATE TABLE fixture_auth.identity (
  uid uuid PRIMARY KEY,
  role_name text NOT NULL UNIQUE CHECK (role_name IN ('pv3_publish','pv3_approve'))
);
INSERT INTO fixture_auth.identity VALUES ('{publisher}','pv3_publish'), ('{approver}','pv3_approve');
REVOKE ALL ON TABLE fixture_auth.identity FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA fixture_auth TO supabase_auth_admin;
GRANT SELECT ON fixture_auth.identity TO supabase_auth_admin;
CREATE FUNCTION fixture_auth.issue(event jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
DECLARE u uuid := (event->>'user_id')::uuid; r text;
BEGIN
 IF u IS NULL OR u IS DISTINCT FROM (event#>>'{{claims,sub}}')::uuid
    OR event#>>'{{claims,role}}' IS DISTINCT FROM 'authenticated' THEN
  RAISE EXCEPTION 'unexpected fixture claim identity';
 END IF;
 SELECT role_name INTO r FROM fixture_auth.identity WHERE uid=u;
 IF r IS NOT NULL THEN event:=jsonb_set(event,'{{claims,role}}',to_jsonb(r)); END IF;
 RETURN event;
END $f$;
REVOKE ALL ON FUNCTION fixture_auth.issue(jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fixture_auth.issue(jsonb) TO supabase_auth_admin;
DO $g$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticator' AND NOT rolinherit AND NOT rolsuper AND NOT rolbypassrls) THEN
  RAISE EXCEPTION 'unexpected authenticator flags';
 END IF;
END $g$;
GRANT pv3_publish,pv3_approve TO authenticator WITH ADMIN FALSE;
GRANT pv3_publish,pv3_approve TO authenticator WITH INHERIT FALSE;
GRANT pv3_publish,pv3_approve TO authenticator WITH SET TRUE;
GRANT USAGE ON SCHEMA public TO pv3_publish,pv3_approve;

-- The existing permissive policies stay intact. These local restrictive policies add intersecting checks.
SET LOCAL ROLE pv3_owner;
DO $g$ DECLARE t text; rr record; BEGIN
 FOR rr IN SELECT * FROM (VALUES ('pv3_publish','{publisher}'), ('pv3_approve','{approver}')) x(role_name,uid)
 LOOP
  FOREACH t IN ARRAY ARRAY['manifest','approval','revocation','content','asset','coverage','receipt','withdrawal'] LOOP
   EXECUTE format($q$CREATE POLICY %I ON pv3.%I AS RESTRICTIVE FOR ALL TO %I
     USING (batch = %L AND (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub') = %L)
     WITH CHECK (batch = %L AND (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub') = %L)$q$,
      rr.role_name||'_fixture_limit',t,rr.role_name,'{batch}',rr.uid,'{batch}',rr.uid);
  END LOOP;
 END LOOP;
END $g$;
RESET ROLE;

CREATE FUNCTION public.publisher_fixture() RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
BEGIN
 IF current_user <> 'pv3_publish' OR
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub') IS DISTINCT FROM '{publisher}' THEN
  RAISE EXCEPTION 'fixture publisher denied' USING ERRCODE='42501';
 END IF;
 RETURN pv3.publish('{batch}');
END $f$;
CREATE FUNCTION public.approver_fixture() RETURNS text
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $f$
BEGIN
 IF current_user <> 'pv3_approve' OR
    (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub') IS DISTINCT FROM '{approver}' THEN
  RAISE EXCEPTION 'fixture approver denied' USING ERRCODE='42501';
 END IF;
 INSERT INTO pv3.approval(batch,payload,expires)
 SELECT batch,payload,clock_timestamp()+interval '10 minutes'
 FROM pv3.manifest WHERE batch='{batch}' AND payload='{payload}' AND NOT revoked;
 IF NOT FOUND THEN RAISE EXCEPTION 'fixture manifest unavailable'; END IF;
 RETURN 'approved';
END $f$;
REVOKE ALL ON FUNCTION public.publisher_fixture(),public.approver_fixture()
 FROM PUBLIC, anon, authenticated, service_role, pv3_publish, pv3_approve;
GRANT EXECUTE ON FUNCTION public.publisher_fixture() TO pv3_publish;
GRANT EXECUTE ON FUNCTION public.approver_fixture() TO pv3_approve;

-- Storage policy exposes no catalog privileges to authenticated.
-- The boolean helper is owned by a dedicated no-login role with scoped SELECT only.
CREATE ROLE pv3_fixture_media NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT;
GRANT pv3_fixture_media TO postgres WITH INHERIT FALSE GRANTED BY CURRENT_USER;
GRANT pv3_fixture_media TO postgres WITH SET TRUE GRANTED BY CURRENT_USER;
GRANT USAGE,CREATE ON SCHEMA public TO pv3_fixture_media;
SET LOCAL ROLE pv3_owner;
GRANT USAGE ON SCHEMA pv3 TO pv3_fixture_media;
GRANT SELECT (batch,id,path,sha) ON pv3.asset TO pv3_fixture_media;
GRANT SELECT (batch,id) ON pv3.content TO pv3_fixture_media;
GRANT SELECT (batch) ON pv3.receipt,pv3.withdrawal TO pv3_fixture_media;
DO $g$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['asset','content','receipt','withdrawal'] LOOP
  EXECUTE format('CREATE POLICY fixture_media_limit ON pv3.%I AS RESTRICTIVE FOR SELECT TO pv3_fixture_media USING (batch = %L)',t,'{batch}');
 END LOOP;
END $g$;
RESET ROLE;

-- Synthetic adapters for the production delivery core. Neither endpoint grants catalog
-- tables to callers. Neither Storage roles, policies nor RLS settings are changed.
SET LOCAL ROLE pv3_fixture_media;
CREATE FUNCTION public.teacher_fixture_authorize(p_lesson_id uuid, p_school_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
 SELECT p_school_id IS NULL AND p_lesson_id = '{lesson_id}'::uuid
   AND (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub')='{reader_id}'
   AND EXISTS(
     SELECT 1 FROM pv3.content c JOIN pv3.receipt r USING(batch)
     WHERE c.batch='{batch}' AND c.id='{lesson_id}'
       AND NOT EXISTS (SELECT 1 FROM pv3.withdrawal w WHERE w.batch=c.batch)
   );
$f$;
CREATE FUNCTION public.teacher_fixture_binding(p_lesson_id uuid,p_kind text) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
 SELECT jsonb_build_object('lessonId',a.id,'kind','video','bucket','{bucket}',
                           'path',a.path,'sha256',a.sha,'mimeType','video/mp4')
 FROM pv3.asset a JOIN pv3.content c USING(id,batch) JOIN pv3.receipt r USING(batch)
 WHERE p_lesson_id='{lesson_id}'::uuid AND p_kind='video' AND a.id='{lesson_id}'
   AND a.batch='{batch}' AND a.path='{key}' AND a.sha='{sha}'
   AND NOT EXISTS (SELECT 1 FROM pv3.withdrawal w WHERE w.batch=a.batch);
$f$;
REVOKE ALL ON FUNCTION public.teacher_fixture_authorize(uuid,uuid),public.teacher_fixture_binding(uuid,text)
 FROM PUBLIC, anon, authenticated, service_role, pv3_publish, pv3_approve;
GRANT EXECUTE ON FUNCTION public.teacher_fixture_authorize(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_fixture_binding(uuid,text) TO service_role;
RESET ROLE;
REVOKE CREATE ON SCHEMA public FROM pv3_fixture_media;
REVOKE pv3_fixture_media FROM postgres GRANTED BY CURRENT_USER;

SET LOCAL ROLE pv3_prepare;
INSERT INTO pv3.manifest(batch,payload) VALUES ('{batch}','{payload}');
COMMIT;
NOTIFY pgrst, 'reload schema';
"""
sql(setup, 'fixture precise roles, scoped API, catalog-linked Storage policy')
# Verify effective ACLs on exact fixture RPCs, including role inheritance/default ACLs.
helper_acl = sql("""
SELECT count(*)=2
 AND bool_and(p.proowner = 'pv3_fixture_media'::regrole AND p.prosecdef)
 AND bool_and(has_function_privilege(
     CASE p.proname WHEN 'teacher_fixture_authorize' THEN 'authenticated' ELSE 'service_role' END::name,
     p.oid,'EXECUTE'))
 AND bool_and(NOT EXISTS (
    SELECT 1 FROM unnest(ARRAY['anon','pv3_publish','pv3_approve',
       CASE p.proname WHEN 'teacher_fixture_authorize' THEN 'service_role' ELSE 'authenticated' END])
       AS d(role_name)
    WHERE has_function_privilege(d.role_name::name,p.oid,'EXECUTE')))
 AND NOT has_schema_privilege('pv3_fixture_media','public','CREATE')
 AND NOT pg_has_role('postgres','pv3_fixture_media','SET')
FROM pg_proc p WHERE p.oid IN (to_regprocedure('public.teacher_fixture_authorize(uuid,uuid)'),
                             to_regprocedure('public.teacher_fixture_binding(uuid,text)'));
""", 'read-only final fixture delivery ACL')
check(helper_acl == 't', 'unexpected effective fixture delivery ACL or ownership')
pjwt = login(pub, 'pv3_publish')
ajwt = login(app, 'pv3_approve')
rjwt = login(reader, 'authenticated')
njwt = login(wrong, 'authenticated')


def rpc(name, token):
    return req('/rest/v1/rpc/' + name, token, 'POST', {})


def counts():
    return owner_read("SELECT " + "||','||".join(f"(SELECT count(*) FROM pv3.{t} WHERE batch='{batch}')"
                                         for t in ('content', 'asset', 'coverage', 'receipt')), 'counts')


def denied(result, code, label):
    check(result[0] in (400, 401, 403) and json.loads(result[1]).get('code') == code,
          label + ' unexpected HTTP ' + str(result[0]))


def read(token):
    return req('/storage/v1/object/authenticated/' + bucket + '/' + key, token)


def storage_denied(result, label):
    check(result[0] in (400, 401, 403, 404) and result[1] != media, label + ' not denied')


def delivery(token):
    # Local credentials enter the isolated child through stdin only.
    result = subprocess.run(['node', str(adapter), str(policy), str(cert)],
                            env={**os.environ, 'NODE_EXTRA_CA_CERTS': str(cert)},
                            input=json.dumps({'token': token, 'anon': anon, 'service': service,
                                              'lessonId': lesson_id}), text=True, capture_output=True,
                            timeout=35)
    check(result.returncode == 0, 'local delivery adapter failed, details suppressed')
    try:
        value = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise SystemExit('invalid local delivery adapter response') from None
    return value


def signed_address(result):
    asset = result.get('asset', {})
    check(result.get('status') == 200 and asset.get('expiresIn') == 300
          and asset.get('lessonId') == lesson_id and asset.get('mimeType') == 'video/mp4',
          'missing authorized signed asset')
    address = urlsplit(asset.get('signedUrl', ''))
    check(address.scheme == 'https' and address.netloc == '127.0.0.1:54321'
          and address.path == '/storage/v1/object/sign/' + bucket + '/' + key
          and re.fullmatch(r'token=[0-9A-Za-z._~%-]+', address.query) and not address.fragment,
          'unexpected local signed asset location')
    return address


def signed_bytes(result):
    address = signed_address(result)
    return req(address.path + '?' + address.query)


def browser_playback(result):
    address = signed_address(result)
    run = subprocess.run(['node', str(chromium_test), str(chromium), str(cert)],
                         input=json.dumps({'url': address.geturl()}), text=True, capture_output=True, timeout=40)
    if run.returncode:
        # The browser only emits fixed phase tokens. Never print raw child logs or a URL.
        labels = ('codec','metadata','dimensions','autoplay','playback','seek','after-seek')
        phase = next((x for x in labels if run.stderr.strip() == 'Browser playback failed: '+x), 'runner')
        raise SystemExit('synthetic Chromium playback failed phase=' + phase)
    try:
        m = json.loads(run.stdout)
        initial, after = m['initial'], m['after']
        check(m['codec'] in ('maybe','probably') and 5.9 <= m['duration'] <= 6.1
              and (m['width'],m['height']) == (160,96)
              and initial['time'] >= 1.1 and initial['frames'] >= 3 and initial['audioBytes'] > 0
              and after['time'] >= 4.85 and after['frames'] > initial['frames']
              and re.fullmatch(r'(?:Chrome|Chromium)/[0-9.]+', m['browser']),
              'unexpected synthetic Chromium playback metrics')
    except (ValueError, KeyError, TypeError):
        raise SystemExit('malformed synthetic Chromium playback evidence') from None
    print('PASS: ' + m['browser'] + ' H.264/AAC, decoded video and audio, six-second motion, seek and resume.', flush=True)


def delivery_denied(token, title, code='training_access_denied', status=403):
    result = delivery(token)
    check(result.get('status') == status and result.get('code') == code and 'asset' not in result,
          title + ' was not denied')


# Read-only evidence of role boundaries and no pv3 catalog grants to ordinary users.
check(sql("""SELECT count(*) FROM pg_roles WHERE rolname IN ('pv3_publish','pv3_approve','pv3_fixture_media')
           AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper""", 'role flags') == '3', 'unexpected test flags')
check(owner_read("""SELECT has_schema_privilege('authenticated','pv3','USAGE')
           OR has_table_privilege('authenticated','pv3.asset','SELECT')""", 'ordinary role catalog privileges') == 'f',
      'ordinary authenticated acquired catalog privileges')
check(sql("""SELECT has_function_privilege('pv3_publish','public.approver_fixture()','EXECUTE')
           OR has_function_privilege('pv3_approve','public.publisher_fixture()','EXECUTE')""", 'separation of duties') == 'f',
      'cross-role RPC privileges')

check(sql("""SELECT count(*) FROM pg_auth_members m JOIN pg_roles member ON member.oid=m.member
           JOIN pg_roles granted ON granted.oid=m.roleid
           WHERE member.rolname='authenticator' AND granted.rolname IN ('pv3_publish','pv3_approve')
             AND NOT m.admin_option AND NOT m.inherit_option AND m.set_option""", 'JWT role membership') == '2',
      'authenticator membership not limited to SET')

for _ in range(25):
    probe = rpc('publisher_fixture', pjwt)
    if probe[0] != 404:
        break
    time.sleep(.2)
denied(probe, 'P0001', 'missing approval')
denied(rpc('publisher_fixture', njwt), '42501', 'wrong user cannot publish')
denied(rpc('approver_fixture', pjwt), '42501', 'publisher cannot approve')
denied(rpc('publisher_fixture', ajwt), '42501', 'approver cannot publish')
check(counts() == '0,0,0,0', 'preapproval catalog changed')

ok(req('/storage/v1/bucket', service, 'POST', {'id': bucket, 'name': bucket, 'public': False}, service),
   'create private synthetic bucket')
ok(req('/storage/v1/object/' + bucket + '/' + key, service, 'POST', media, service, 'video/mp4'),
   'upload synthetic fixture')
storage_denied(read(rjwt), 'direct reader before catalog publication')
delivery_denied(rjwt, 'reader before approval')
delivery_denied(None, 'anonymous reader before approval','session_required',401)
check(ok(rpc('approver_fixture', ajwt), 'separate Auth approval') == 'approved', 'unconfirmed approval')
check(counts() == '0,0,0,0', 'approval unexpectedly wrote catalog')
delivery_denied(rjwt, 'reader approved but not published')
check(ok(rpc('publisher_fixture', pjwt), 'first publication') == 'published', 'publication missing')
check(counts() == '1,1,2,1', 'invalid catalog cardinality')
check(ok(rpc('publisher_fixture', pjwt), 'exact retry') == 'already published', 'unexpected idempotency result')
check(counts() == '1,1,2,1', 'retry changed catalog cardinality')
check(owner_read(f"SELECT sha FROM pv3.asset WHERE batch='{batch}'", 'catalog digest') == sha, 'unexpected catalog digest')
check(owner_read(f"SELECT array_agg(lesson ORDER BY lesson)::text FROM pv3.coverage WHERE batch='{batch}' AND id='{lesson_id}'",
                 'one asset coverage') == '{4,5}', 'synthetic asset does not cover exactly lessons 4 and 5')

ticket = delivery(rjwt)
authorized = signed_bytes(ticket)
check(authorized[0] == 200 and hashlib.sha256(authorized[1]).hexdigest() == sha and authorized[1] == media,
      'catalog-authorized private bytes missing or digest mismatch')
browser_playback(ticket)
delivery_denied(njwt,'unrelated authenticated user after publication')
delivery_denied(None,'anonymous user after publication','session_required',401)
for result in [read(rjwt), read(njwt), read(None), req('/storage/v1/object/public/' + bucket + '/' + key)]:
    storage_denied(result, 'direct or public Storage read after publication')
sql(f"""BEGIN; SET LOCAL ROLE pv3_withdraw;
INSERT INTO pv3.withdrawal(batch,reason) VALUES ('{batch}','synthetic withdrawal');
COMMIT;""", 'separate local withdrawal role')
check(counts() == '1,1,2,1', 'withdrawal unexpectedly deleted catalog evidence')
delivery_denied(rjwt,'formerly authorized reader after withdrawal')
storage_denied(read(rjwt), 'direct Storage reader after withdrawal')
print('PASS: distinct Auth approval/publication, private bytes through catalog-bound HTTPS signing only, '
      'idempotency, and no fresh signed URL after withdrawal. Previously signed URLs may remain valid until expiry.')
