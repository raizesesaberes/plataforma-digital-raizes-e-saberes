// Synthetic loopback adapter for the unmodified production delivery decision core.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const base = 'https://127.0.0.1:54321';
const sessionRequired = { status: 401, ok: false, code: 'session_required' };
const invalidSession = { status: 401, ok: false, code: 'invalid_session' };
const unavailable = { status: 503, ok: false, code: 'service_unavailable' };

async function run(payload, core, request) {
  const { token, anon, service, lessonId } = payload;
  if (!token) return sessionRequired;
  if (typeof token !== 'string' || !/^[0-9A-Za-z._-]+$/.test(token)) return invalidSession;
  const headers = (roleToken, apiKey = anon) => ({
    apikey: apiKey, Authorization: 'Bearer ' + roleToken, 'Content-Type': 'application/json',
  });
  const auth = await request(base + '/auth/v1/user', { headers: headers(token) });
  if ([400, 401, 403].includes(auth.status)) return invalidSession;
  if (!auth.ok) return unavailable;
  const user = await auth.json();
  if (typeof user?.id !== 'string' || !user.id) return invalidSession;
  const rpc = async (name, args, h) => {
    const response = await request(base + '/rest/v1/rpc/' + name,
      { method: 'POST', headers: h, body: JSON.stringify(args) });
    if (!response.ok) throw Error('fixture_rpc_failed');
    return response.json();
  };
  return core({ action: 'asset', lessonId, kind: 'video' }, {
    catalog: async () => { throw Error('not part of synthetic asset test'); },
    authorize: async (id, school) => await rpc('teacher_fixture_authorize',
      { p_lesson_id: id, p_school_id: school }, headers(token)) === true,
    binding: async (id, kind) => rpc('teacher_fixture_binding',
      { p_lesson_id: id, p_kind: kind }, headers(service, service)),
    sign: async (bucket, key, expiresIn) => {
      const response = await request(base + '/storage/v1/object/sign/' + bucket + '/' + key,
        { method: 'POST', headers: headers(service, service), body: JSON.stringify({ expiresIn }) });
      if (!response.ok) throw Error('fixture_sign_failed');
      const relative = (await response.json()).signedURL;
      if (typeof relative !== 'string') throw Error('fixture_signed_location_shape');
      const expected = '/object/sign/' + bucket + '/' + key;
      const p = new URL(relative, base);
      // Raw Storage signer emits a root-relative path. Do not rewrite foreign or HTTP URLs.
      if (!relative.startsWith(expected + '?') || p.origin !== base || p.pathname !== expected ||
          p.hash || !/^\?token=[0-9A-Za-z._~%-]+$/.test(p.search))
        throw Error('fixture_signed_location_invalid');
      return base + '/storage/v1' + expected + p.search;
    },
  });
}

export { run };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const input = JSON.parse(readFileSync(0, 'utf8'));
    const { deliverTeacherTraining } = await import(pathToFileURL(process.argv[2]).href);
    const request = (url, options) => fetch(url, { ...options, redirect: 'error',
      signal: AbortSignal.timeout(8000) });
    // Python captures the return; do not print to job log (it may contain a short-lived test URL).
    process.stdout.write(JSON.stringify(await run(input, deliverTeacherTraining, request)));
  } catch {
    process.stdout.write(JSON.stringify(unavailable));
  }
}
