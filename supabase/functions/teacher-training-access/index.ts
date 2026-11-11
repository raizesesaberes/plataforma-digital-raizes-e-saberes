import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { deliverTeacherTraining } from '../_shared/teacher-training-policy.mjs';

const allowedOrigins = new Set([
  'https://www.raizesesaberes.com.br',
  'https://raizesesaberes.com.br',
  'https://app.raizesesaberes.com.br',
]);

// A valid user JWT and live database authorization are required independently
// of CORS. Never log tokens, private paths, or signed URLs.
Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json', 'Cache-Control': 'private, no-store',
    'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (origin && allowedOrigins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
  if (origin && !allowedOrigins.has(origin)) return reply({ ok: false, code: 'origin_not_allowed' }, 403);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply({ ok: false, code: 'method_not_allowed' }, 405);
  const authorization = request.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+$/i.test(authorization)) return reply({ ok: false, code: 'session_required' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anon || !secret) return reply({ ok: false, code: 'service_unavailable' }, 503);
  const user = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: caller, error: callerError } = await user.auth.getUser();
  if (callerError || !caller?.user?.id) return reply({ ok: false, code: 'invalid_session' }, 401);
  try {
    const text = await request.text();
    if (text.length > 2048) return reply({ ok: false, code: 'invalid_request' }, 400);
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { return reply({ ok: false, code: 'invalid_request' }, 400); }
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await deliverTeacherTraining(payload, {
      catalog: async (schoolId: string | null) => {
        const r = await user.rpc('teacher_training_catalog', { p_school_id: schoolId });
        if (r.error) throw r.error;
        return r.data;
      },
      authorize: async (lessonId: string, schoolId: string | null) => {
        const r = await user.rpc('teacher_training_authorize_lesson', { p_lesson_id: lessonId, p_school_id: schoolId });
        if (r.error) throw r.error;
        return r.data === true;
      },
      binding: async (lessonId: string, kind: string) => {
        const r = await admin.rpc('teacher_training_asset_binding', { p_lesson_id: lessonId, p_kind: kind });
        if (r.error) throw r.error;
        return r.data;
      },
      sign: async (bucket: string, path: string, ttl: number) => {
        const r = await admin.storage.from(bucket).createSignedUrl(path, ttl);
        if (r.error || !r.data?.signedUrl) throw Error('asset_unavailable');
        return r.data.signedUrl;
      },
    });
    const { status, ...body } = result;
    return reply(body, status);
  } catch {
    return reply({ ok: false, code: 'service_unavailable' }, 503);
  }
});
