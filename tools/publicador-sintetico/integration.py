import base64
import hashlib
import json
import os
import pathlib
import re
import secrets
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
for field, schemes, port in [('API_URL', ('http',), 54321), ('DB_URL', ('postgresql', 'postgres'), 54322)]:
    url = urlsplit(status[field])
    check(url.hostname in ('127.0.0.1', 'localhost') and url.scheme in schemes and url.port == port
          and not url.query and not url.fragment, 'nonlocal or unexpected endpoint')
db = urlsplit(status['DB_URL'])
check(db.username == 'postgres' and db.path == '/postgres' and db.password, 'unexpected database identity')
api = 'http://127.0.0.1:54321'
anon = status['ANON_KEY']
service = status['SERVICE_ROLE_KEY']


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


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
sql(schema, 'original v3.1 schema')
pub, app, reader, wrong = [create(name) for name in ('publisher', 'approver', 'reader', 'other')]
publisher, approver, reader_id = pub[0], app[0], reader[0]
check(len({user[0] for user in (pub, app, reader, wrong)}) == 4, 'synthetic identities not distinct')

batch = 'fixture-' + secrets.token_hex(6)
bucket = 'publisher-fixture'
key = batch + '.mp4'
# One generated 16x16 blue MPEG-4 frame, 986 bytes, no source media or audio.
media = base64.b64decode("AAAAHGZ0eXBpc281AAACAGlzbzVpc282bXA0MQAAAvdtb292AAAAbG12aGQAAAAAAAAAAAAAAAAAAAPoAAAAAAABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAACHnRyYWsAAABcdGtoZAAAAAMAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAEAAAABAAAAAAAbptZGlhAAAAIG1kaGQAAAAAAAAAAAAAAAAAAEAAAAAAAFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAFlbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAABJXN0YmwAAADZc3RzZAAAAAAAAAABAAAAyW1wNHYAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAEAAQAEgAAABIAAAAAAAAAAEKTGF2YyBtcGVnNAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAABPZXNkcwAAAAADgICAPgABAASAgIAwIBEAAAAAAw1AAAMNQAWAgIAeAAABsAEAAAG1iRMAAAEAAAABIADEjYgADQCEAhRjBoCAgAECAAAAEHBhc3AAAAABAAAAAQAAABRidHJ0AAAAAAADDUAAAw1AAAAAEHN0dHMAAAAAAAAAAAAAABBzdHNjAAAAAAAAAAAAAAAUc3RzegAAAAAAAAAAAAAAAAAAABBzdGNvAAAAAAAAAAAAAAAobXZleAAAACB0cmV4AAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAPXVkdGEAAAA1bWV0YQAAAAAAAAAhaGRscgAAAAAAAAAAbWRpcmFwcGwAAAAAAAAAAAAAAAAIaWxzdAAAAGhtb29mAAAAEG1maGQAAAAAAAAAAQAAAFB0cmFmAAAAHHRmaGQAAgA4AAAAAQAAQAAAAAAUAQEAAAAAABR0ZmR0AQAAAAAAAAAAAAAAAAAAGHRydW4AAAAFAAAAAQAAAHACAAAAAAAAHG1kYXQAAAGzABAHAAABthYFGCobYHgFrwAAAENtZnJhAAAAK3RmcmEBAAAAAAAAAQAAAAAAAAABAAAAAAAAAAAAAAAAAAADEwEBAQAAABBtZnJvAAAAAAAAAEM=")
check(len(media) == 986 and hashlib.sha256(media).hexdigest() ==
      "53e69e5ed987d6aeca2f263ece6290b348e45e49f19ac764bc02afb0157618cc", "unexpected fixture bytes")
sha = hashlib.sha256(media).hexdigest()
payload = json.dumps([dict(id=batch, title='Synthetic local fixture', path=key, sha=sha, edition='fixture',
                           subject='fixture', volume=1, unit=1, audience='teacher', covered=[1])],
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
GRANT USAGE ON SCHEMA fixture_auth TO authenticated, pv3_fixture_media;
GRANT USAGE ON SCHEMA pv3 TO pv3_fixture_media;
GRANT SELECT (batch,id,path,sha) ON pv3.asset TO pv3_fixture_media;
GRANT SELECT (batch,id) ON pv3.content TO pv3_fixture_media;
GRANT SELECT (batch) ON pv3.receipt,pv3.withdrawal TO pv3_fixture_media;
DO $g$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['asset','content','receipt','withdrawal'] LOOP
  EXECUTE format('CREATE POLICY fixture_media_limit ON pv3.%I AS RESTRICTIVE FOR SELECT TO pv3_fixture_media USING (batch = %L)',t,'{batch}');
 END LOOP;
END $g$;
CREATE FUNCTION fixture_auth.media_allowed(b text,k text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $f$
 SELECT b='{bucket}' AND k='{key}'
   AND (nullif(current_setting('request.jwt.claims', true),'')::jsonb->>'sub')='{reader_id}'
   AND EXISTS(
     SELECT 1 FROM pv3.asset a
     JOIN pv3.content c USING(id,batch)
     JOIN pv3.receipt r USING(batch)
     WHERE a.batch='{batch}' AND a.id='{batch}' AND a.path=k AND a.sha='{sha}'
       AND NOT EXISTS (SELECT 1 FROM pv3.withdrawal w WHERE w.batch=a.batch)
   );
$f$;
GRANT CREATE ON SCHEMA fixture_auth TO pv3_fixture_media;
ALTER FUNCTION fixture_auth.media_allowed(text,text) OWNER TO pv3_fixture_media;
REVOKE CREATE ON SCHEMA fixture_auth FROM pv3_fixture_media;
REVOKE ALL ON FUNCTION fixture_auth.media_allowed(text,text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION fixture_auth.media_allowed(text,text) TO authenticated;
CREATE POLICY fixture_storage_read ON storage.objects FOR SELECT TO authenticated
 USING (fixture_auth.media_allowed(bucket_id,name));

SET LOCAL ROLE pv3_prepare;
INSERT INTO pv3.manifest(batch,payload) VALUES ('{batch}','{payload}');
COMMIT;
NOTIFY pgrst, 'reload schema';
"""
sql(setup, 'fixture precise roles, scoped API, catalog-linked Storage policy')
pjwt = login(pub, 'pv3_publish')
ajwt = login(app, 'pv3_approve')
rjwt = login(reader, 'authenticated')
njwt = login(wrong, 'authenticated')


def rpc(name, token):
    return req('/rest/v1/rpc/' + name, token, 'POST', {})


def counts():
    return sql("SELECT " + "||','||".join(f"(SELECT count(*) FROM pv3.{t} WHERE batch='{batch}')"
                                         for t in ('content', 'asset', 'coverage', 'receipt')), 'counts')


def denied(result, code, label):
    check(result[0] in (400, 401, 403) and json.loads(result[1]).get('code') == code,
          label + ' unexpected HTTP ' + str(result[0]))


def read(token):
    return req('/storage/v1/object/authenticated/' + bucket + '/' + key, token)


def storage_denied(result, label):
    check(result[0] in (400, 401, 403, 404) and result[1] != media, label + ' not denied')


# Read-only evidence of role boundaries and no pv3 catalog grants to ordinary users.
check(sql("""SELECT count(*) FROM pg_roles WHERE rolname IN ('pv3_publish','pv3_approve','pv3_fixture_media')
           AND NOT rolcanlogin AND NOT rolbypassrls AND NOT rolsuper""", 'role flags') == '3', 'unexpected test flags')
check(sql("""SELECT has_schema_privilege('authenticated','pv3','USAGE')
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
storage_denied(read(rjwt), 'authorized reader before catalog publication')
check(ok(rpc('approver_fixture', ajwt), 'separate Auth approval') == 'approved', 'unconfirmed approval')
check(counts() == '0,0,0,0', 'approval unexpectedly wrote catalog')
check(ok(rpc('publisher_fixture', pjwt), 'first publication') == 'published', 'publication missing')
check(counts() == '1,1,1,1', 'invalid catalog cardinality')
check(ok(rpc('publisher_fixture', pjwt), 'exact retry') == 'already published', 'unexpected idempotency result')
check(counts() == '1,1,1,1', 'retry changed catalog cardinality')
check(sql(f"SELECT sha FROM pv3.asset WHERE batch='{batch}'", 'catalog digest') == sha, 'unexpected catalog digest')

authorized = read(rjwt)
check(authorized[0] == 200 and hashlib.sha256(authorized[1]).hexdigest() == sha and authorized[1] == media,
      'private authenticated read missing or digest mismatch')
# Anonymous/public and unrelated authenticated reads use ordinary service routes.
for result in [read(njwt), read(None), req('/storage/v1/object/public/' + bucket + '/' + key)]:
    storage_denied(result, 'unrelated or anonymous read after publication')
sql(f"""BEGIN; SET LOCAL ROLE pv3_withdraw;
INSERT INTO pv3.withdrawal(batch,reason) VALUES ('{batch}','synthetic withdrawal');
COMMIT;""", 'separate local withdrawal role')
check(counts() == '1,1,1,1', 'withdrawal unexpectedly deleted catalog evidence')
storage_denied(read(rjwt), 'formerly authorized reader after withdrawal')
print('PASS: separate locally issued publisher/approver JWTs; catalog and private media gated; repeat stable; withdrawal denies fresh read')
