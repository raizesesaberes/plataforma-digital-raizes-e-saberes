"""Loopback-only HTTPS smoke. The adapter uses a synthetic in-memory catalog double."""
import http.cookiejar
import json
from pathlib import Path
import ssl
import subprocess
from tempfile import TemporaryDirectory
import urllib.error
import urllib.request

from admin_fixture import serve_admin

root = Path(__file__).resolve().parent
entry = subprocess.check_output(['node', str(root / 'native-entry.mjs')])
manifest = {'label': 'Aulas fictícias 4 e 5', 'sha': 'a'*64}
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

class Client:
    def __init__(self, cert, url):
        self.url = url
        self.opener = urllib.request.build_opener(
            urllib.request.ProxyHandler({}), urllib.request.HTTPSHandler(context=ssl.create_default_context(cafile=cert)),
            urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    def request(self, path, data=None, code=200):
        headers = {}
        body = None
        if data is not None:
            body = json.dumps(data).encode()
            headers = {'Content-Type':'application/json', 'Origin':self.url.rstrip('/')}
        request = urllib.request.Request(self.url.rstrip('/')+path, data=body, headers=headers)
        try:
            response = self.opener.open(request, timeout=4)
        except urllib.error.HTTPError as error:
            response = error
        with response:
            assert response.code == code, (path, response.code, code)
            body = response.read()
            if response.headers.get_content_type() == 'application/json':
                return json.loads(body)
            return body

with TemporaryDirectory(prefix='rs-native-admin-') as tmp:
    cert = Path(tmp) / 'cert.pem'
    key = Path(tmp) / 'key.pem'
    subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '1',
                    '-subj', '/CN=synthetic-loopback', '-addext', 'subjectAltName=IP:127.0.0.1',
                    '-keyout', str(key), '-out', str(cert)], check=True, capture_output=True)
    def serve():
        return serve_admin(str(cert), str(key), manifest, auth_user, users, operation, lambda: dict(record),
                           native_entry=entry)
    with serve() as (url, evidence):
        client = Client(str(cert), url)
        assert b'href="/formacao-docente-homologacao"' in client.request('/')
        assert b'id="publish" disabled' in client.request('/formacao-docente-homologacao')
        client.request('/state',code=401)
        client.request('/session',{'role':'other'})
        client.request('/approve',{},code=403)
        client.request('/publish',{'confirm':True},code=403)
        client.request('/session',{'role':'reviewer'})
        assert client.request('/approve',{})['ok']
        assert client.request('/state')['state']['phase']=='approved'
        client.request('/session',{'role':'publisher'})
        client.request('/publish',{'confirm':False},code=403)
        client.request('/publish',{'confirm':True},code=503)
        client.request('/state',code=503)
        assert evidence['publish']==1
    with serve() as (url, evidence):
        client = Client(str(cert), url)
        initial = client.request('/session',{'role':'publisher'})
        assert initial['readOnly'] and initial['state']['receipt']==receipt
        client.request('/publish',{'confirm':True},code=409)
        assert client.request('/state')['state']['receipt']==receipt
        assert evidence['publish']==0
    assert calls == [('approver_fixture', 'reviewer-mock'), ('publisher_fixture', 'publisher-mock')]
    print('PASS: native Admin card and HTTPS fixture; two distinct roles; explicit confirmation; receipt recovered after restart; no second write.')
