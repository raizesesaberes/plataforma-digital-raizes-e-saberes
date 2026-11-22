"""Loopback test adapter only. Browser never receives Supabase JWTs or keys."""
from contextlib import contextmanager
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import secrets
import ssl
from threading import Lock, Thread

PAGE = b"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin | Formacao Docente | Teste isolado</title>
<style>body{font:16px/1.5 system-ui;color:#19352d;background:#f3f7f4;margin:2rem auto;max-width:54rem;padding:0 1rem}main{background:white;border:1px solid #dce7e1;border-radius:1rem;padding:1.4rem}label,button,select{margin:.35rem}button{background:#0d6b4b;color:white;padding:.55rem;border:0;border-radius:.4rem}button:disabled{background:#e8f5ec;color:#456159}code{overflow-wrap:anywhere}</style>
</head><body><main><p>Admin &gt; Conteudos &gt; Formacao Docente</p>
<h1>Publicacao de videos</h1><p>Simulacao isolada. Um manifesto fixo, sem upload, sem plataforma real.</p>
<label>Conta sintetica <select id="role"><option value="">Selecione</option>
<option value="reviewer">Aprovador</option><option value="publisher">Publicadora</option>
<option value="other">Leitor sem permissao</option></select></label>
<p id="manifest"></p><p id="hash"></p><p id="stage" role="status">Escolha uma conta</p>
<button type="button" id="approve" disabled>Aprovar manifesto</button>
<label><input type="checkbox" id="confirm" disabled> Confirmo a publicacao ficticia</label>
<button type="button" id="publish" disabled>Publicar na simulacao</button>
<button type="button" id="recover" disabled>Conferir recibo (somente leitura)</button>
<p id="receipt"></p><p id="feedback" role="status"></p></main><script src="/app.js"></script></body></html>"""

APP = b"""'use strict';
const e=id=>document.getElementById(id);
let role='', data=null, busy=false, reconcileRequired=null;
async function send(path,payload) {
  const r=await fetch(path,payload?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}:{cache:'no-store'});
  const o=await r.json();
  if(!r.ok)throw Error('request_failed');
  return o;
}
function render() {
  const state=data?.state;
  e('stage').textContent=reconcileRequired?'reconcile_required':state?.phase||'Escolha uma conta';
  e('receipt').textContent=state?.receipt||'';
  e('manifest').textContent=data?.manifest?.label||'';
  e('hash').textContent=data?.manifest?.sha||'';
  e('approve').disabled=busy||role!=='reviewer'||state?.phase!=='review';
  e('publish').disabled=busy||data?.readOnly===true||Boolean(reconcileRequired)||role!=='publisher'||!(state?.phase==='published'||state?.phase==='approved'&&e('confirm').checked);
  e('confirm').disabled=busy||Boolean(reconcileRequired)||role!=='publisher'||state?.phase!=='approved';
  e('role').disabled=busy||Boolean(reconcileRequired);
  e('recover').disabled=busy||role!=='publisher'||(!reconcileRequired&&data?.readOnly!==true);
}
async function go(f) {if(busy)return;busy=true;render();
  try{await f();}catch{e('feedback').textContent=reconcileRequired?'reconcile_required':'verification_failed';}
  finally{busy=false;render();}}
e('role').addEventListener('change',()=>go(async()=>{
  if(reconcileRequired)return;
  role='';e('confirm').checked=false; e('feedback').textContent='';

  data=await send('/session',{role:e('role').value});role=data.role;
  if(data.reconcileRequired===true)reconcileRequired={prior:null,uncertain:true};
}));
e('confirm').addEventListener('change',render);
e('approve').addEventListener('click',()=>go(async()=>{
  await send('/approve',{});
  data=await send('/state');
  if(data.state.phase!=='approved'||data.state.receipt)throw Error('approval_state');
  e('feedback').textContent='approval_verified';
}));
async function recoverReceipt(){
  if(!reconcileRequired){
    if(role!=='publisher'||data?.readOnly!==true||!data.state.receipt)return;
    const prior=data.state.receipt;
    const current=await send('/state');
    if(current.readOnly!==true||current.state.phase!=='published'||current.state.receipt!==prior)
      throw Error('receipt_state');
    data=current;
    e('feedback').textContent='prior_receipt_read_only';
    return;
  }
  const pending=reconcileRequired;
  const current=await send('/state');  // never calls a write endpoint
  if(current.state.phase!=='published'||!current.state.receipt||pending.prior&&current.state.receipt!==pending.prior)
    throw Error('receipt_state');
  data=current;
  reconcileRequired=null;
  e('feedback').textContent=pending.uncertain?'receipt_recovered_without_retry':pending.prior?'same_prior_receipt':'receipt_verified';
}
e('recover').addEventListener('click',()=>go(recoverReceipt));
e('publish').addEventListener('click',()=>go(async()=>{
  if(reconcileRequired||data?.readOnly===true||role!=='publisher'||!['approved','published'].includes(data?.state?.phase))return;
  if(data.state.phase==='approved'&&!e('confirm').checked)return;
  e('confirm').checked=false;
  reconcileRequired={prior:data.state.receipt,uncertain:false};
  try {await send('/publish',{confirm:true});}catch{reconcileRequired.uncertain=true;}
  await recoverReceipt();
}));
render();
"""


@contextmanager
def serve_admin(cert, private_key, manifest, auth_user, role_tokens, invoke, state):
    """Bind exact, pre-issued local Auth identities and parameterless fixture RPCs."""
    sessions = {}
    receipt_only_sessions = set()
    evidence = {'approve': 0, 'publish': 0, 'state': 0, 'ambiguous': 0, 'failed_readback': 0, 'recovered': 0, 'auth': set()}
    origin = None
    dispatch_lock = Lock()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def response(self, code, result, kind='application/json; charset=utf-8', cookie=None):
            payload = json.dumps(result).encode() if isinstance(result, dict) else result
            self.send_response(code)
            self.send_header('Content-Type', kind)
            self.send_header('Content-Length', str(len(payload)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'")
            if cookie:
                self.send_header('Set-Cookie', 'fixture_admin=' + cookie + '; HttpOnly; Secure; SameSite=Strict; Path=/')
            self.end_headers()
            self.wfile.write(payload)

        def dispatch(self):
            if self.client_address[0] != '127.0.0.1' or self.headers.get('Host') != origin.removeprefix('https://'):
                return self.response(403, {'ok': False})
            if self.command == 'POST' and self.headers.get('Origin') != origin:
                return self.response(403, {'ok': False})
            if self.command == 'GET' and self.path == '/':
                return self.response(200, PAGE, 'text/html; charset=utf-8')
            if self.command == 'GET' and self.path == '/app.js':
                return self.response(200, APP, 'text/javascript; charset=utf-8')
            jar = SimpleCookie()
            jar.load(self.headers.get('Cookie', ''))
            cookie = jar['fixture_admin'].value if 'fixture_admin' in jar else None
            current = sessions.get(cookie)
            payload = None
            if self.command == 'POST':
                size = self.headers.get('Content-Length', '')
                if not size.isascii() or not size.isdigit() or not 1 <= int(size) <= 512 or self.headers.get_content_type() != 'application/json':
                    return self.response(400, {'ok': False})
                payload = json.loads(self.rfile.read(int(size)))
                if not isinstance(payload, dict):
                    return self.response(400, {'ok': False})
            if self.path == '/session' and self.command == 'POST':
                role = payload.get('role')
                if set(payload) != {'role'} or not isinstance(role, str) or role not in role_tokens:
                    return self.response(403, {'ok': False})
                jwt, uid = role_tokens[role]
                if auth_user(jwt) != uid:
                    return self.response(401, {'ok': False})
                evidence['auth'].add(role)
                if cookie:
                    sessions.pop(cookie, None)
                    receipt_only_sessions.discard(cookie)
                token = secrets.token_hex(32)
                sessions[token] = role
                if role == 'publisher' and evidence['ambiguous'] == 1 and evidence['recovered'] == 0:
                    return self.response(200, {'role': role, 'state': {'phase': 'reconcile_required', 'receipt': None},
                                               'manifest': manifest, 'reconcileRequired': True}, cookie=token)
                current_state = state()
                if role == 'publisher' and current_state['phase'] == 'published':
                    receipt_only_sessions.add(token)
                return self.response(200, {'role': role, 'state': current_state, 'manifest': manifest,
                                           'readOnly': token in receipt_only_sessions}, cookie=token)
            if current is None:
                return self.response(401, {'ok': False})
            if self.path == '/state' and self.command == 'GET':
                evidence['state'] += 1
                if current == 'publisher' and evidence['ambiguous'] == 1 and evidence['failed_readback'] == 0:
                    evidence['failed_readback'] += 1
                    return self.response(503, {'ok': False})
                current_state = state()
                if current == 'publisher' and evidence['ambiguous'] == 1 and evidence['recovered'] == 0:
                    if current_state['phase'] != 'published' or not current_state['receipt']:
                        return self.response(409, {'ok': False})
                    evidence['recovered'] += 1
                return self.response(200, {'role': current, 'state': current_state, 'manifest': manifest,
                                           'readOnly': cookie in receipt_only_sessions})
            if self.path == '/approve' and self.command == 'POST' and payload == {} and current == 'reviewer':
                evidence['approve'] += 1
                if invoke('approver_fixture', role_tokens[current][0]) != 'approved':
                    return self.response(409, {'ok': False})
                return self.response(200, {'ok': True})
            if self.path == '/publish' and self.command == 'POST' and set(payload) == {'confirm'} and payload['confirm'] is True and current == 'publisher':
                if cookie in receipt_only_sessions or (evidence['ambiguous'] == 1 and evidence['recovered'] == 0):
                    return self.response(409, {'ok': False})
                evidence['publish'] += 1
                commit = invoke('publisher_fixture', role_tokens[current][0])
                if evidence['publish'] == 1 and commit == 'published':
                    # PostgREST has committed. Test UI reconciliation of an ambiguous response.
                    evidence['ambiguous'] += 1
                    return self.response(503, {'ok': False})
                if evidence['publish'] == 2 and commit == 'already published':
                    return self.response(200, {'ok': True})
                return self.response(409, {'ok': False})
            return self.response(403, {'ok': False})

        def supported(self):
            try:
                with dispatch_lock:
                    return self.dispatch()
            except (Exception, SystemExit):
                return self.response(500, {'ok': False})

        do_GET = supported
        do_POST = supported

    tls = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    tls.load_cert_chain(cert, private_key)

    class AdminServer(ThreadingHTTPServer):
        daemon_threads = True

        def get_request(self):
            raw, address = super().get_request()
            raw.settimeout(8)
            # Chromium can open idle speculative sockets. Do TLS only in the worker.
            return tls.wrap_socket(raw, server_side=True, do_handshake_on_connect=False), address

        def handle_error(self, request, address):
            pass  # No raw paths, requests, certificates or tokens in output.

    server = AdminServer(('127.0.0.1', 0), Handler)
    origin = 'https://127.0.0.1:' + str(server.server_port)
    worker = Thread(target=server.serve_forever, daemon=True)
    worker.start()
    try:
        yield origin, evidence
    finally:
        server.shutdown()
        worker.join(timeout=4)
        server.server_close()
        sessions.clear()
