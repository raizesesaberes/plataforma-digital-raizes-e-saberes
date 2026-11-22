"""Local smoke: TLS HTTP route and browser, using only exact fixture roles and an in-memory catalog double."""
import json
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory

from admin_fixture import serve_admin

base = Path(__file__).resolve().parent
entry = subprocess.check_output(['node', str(base / 'native-entry.mjs')])
manifest = {'label': 'Aula fictícia 4 e 5', 'sha': 'a'*64}
users = {role: (role+'-mock', role+'-id') for role in ('reviewer', 'publisher', 'other')}
record = {'phase': 'review', 'receipt': None}
receipt = 'fixture-123456789abc'
calls = []

def auth_user(token):
    return next((uid for key, uid in users.values() if key == token), None)

def operation(name, token):
    calls.append((name, token))
    if name == 'approver_fixture' and token == users['reviewer'][0] and record['phase'] == 'review':
        record['phase'] = 'approved'
        return 'approved'
    if name == 'publisher_fixture' and token == users['publisher'][0] and record['phase'] == 'approved':
        record.update(phase='published', receipt=receipt)
        return 'published'
    raise ValueError('unexpected operation')

with TemporaryDirectory(prefix='rs-native-admin-') as tmp:
    cert = Path(tmp) / 'cert.pem'
    key = Path(tmp) / 'key.pem'
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '1',
                    '-subj', '/CN=synthetic-loopback', '-addext', 'subjectAltName=IP:127.0.0.1',
                    '-keyout', str(key), '-out', str(cert)], check=True, capture_output=True)
    for mode, desired in [('before-restart', {'ok': True, 'ambiguous': True, 'firstReadbackFailed': True}),
                          ('after-restart', {'ok': True, 'readback': True, 'guard': True})]:
        with serve_admin(str(cert), str(key), manifest, auth_user, users, operation, lambda: dict(record),
                         native_entry=entry) as (url, evidence):
            args = {'mode': mode, 'url': url, 'nativeEntry': True}
            if mode == 'after-restart':
                args['receipt'] = receipt
            result = subprocess.run(['node', str(base / 'chromium-admin-fixture.mjs'), '/usr/bin/chromium', str(cert)],
                                    input=json.dumps(args), text=True, capture_output=True, timeout=45)
            if result.returncode:
                raise RuntimeError(result.stderr.strip())
            assert json.loads(result.stdout) == desired
    assert calls == [('approver_fixture', 'reviewer-mock'), ('publisher_fixture', 'publisher-mock')]
    assert record == {'phase': 'published', 'receipt': receipt}
    print('PASS: native Acervo Mestre card to HTTPS fixture, distinct roles, separate approval, synthetic publication, restart receipt recovered with no second write.')
