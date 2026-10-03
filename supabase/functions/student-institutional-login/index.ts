import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type LoginPayload = {
  login?: string;
  password?: string;
};

type JsonRecord = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: JsonRecord, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });

const normalizeLogin = (value = "") => value.trim().toUpperCase();

const safeMessage = (code = "") => {
  const messages: Record<string, string> = {
    invalid_credentials: "Login ou senha inválidos. Confira os dados impressos pela Secretaria.",
    blocked: "Este acesso está bloqueado. Procure a Secretaria da escola.",
    pending_auth: "Este acesso ainda não está liberado. Procure a Secretaria da escola.",
    temporary_lockout: "Muitas tentativas incorretas. Aguarde alguns minutos antes de tentar novamente.",
    server_misconfigured: "Serviço de acesso temporariamente indisponível.",
    session_failed: "Não foi possível iniciar a sessão do aluno agora.",
    invalid_payload: "Informe login e senha do aluno.",
  };
  return messages[code] || messages.invalid_credentials;
};

const publicFailureCode = (code = "") => {
  if (code === "blocked" || code === "pending_auth" || code === "temporary_lockout") return code;
  return "invalid_credentials";
};

const sha256Hex = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const getRequestFingerprint = async (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || "";
  const userAgent = request.headers.get("user-agent") || "";
  const language = request.headers.get("accept-language") || "";
  return sha256Hex(`${forwardedFor.split(",")[0].trim()}|${userAgent}|${language}`);
};

const sanitizeUser = (user: JsonRecord | null | undefined) => {
  if (!user) return null;
  return {
    id: user.id,
    aud: user.aud,
    role: user.role,
    app_metadata: user.app_metadata || {},
    user_metadata: user.user_metadata || {},
  };
};

const sanitizeSession = (session: JsonRecord | null | undefined) => {
  if (!session?.access_token || !session?.refresh_token) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    expires_at: session.expires_at,
    token_type: session.token_type || "bearer",
    user: sanitizeUser(session.user as JsonRecord),
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, code: "invalid_method", message: safeMessage("invalid_credentials") }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ ok: false, code: "server_misconfigured", message: safeMessage("server_misconfigured") }, 500);
  }

  let payload: LoginPayload;
  try {
    payload = await request.json();
  } catch (_error) {
    return json({ ok: false, code: "invalid_payload", message: safeMessage("invalid_payload") }, 400);
  }

  const login = normalizeLogin(payload.login || "");
  const password = String(payload.password || "");
  if (!login || !password) {
    return json({ ok: false, code: "invalid_payload", message: safeMessage("invalid_payload") }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const requestFingerprint = await getRequestFingerprint(request);
  const userAgent = request.headers.get("user-agent") || "";

  const { data: checkResult, error: checkError } = await adminClient.rpc("student_institutional_login_check", {
    p_login: login,
    p_plain_password: password,
    p_request_fingerprint: requestFingerprint,
    p_user_agent: userAgent,
  });

  if (checkError || !checkResult?.ok) {
    const code = publicFailureCode(String(checkResult?.code || "invalid_credentials"));
    const status = code === "temporary_lockout" ? 429 : code === "blocked" || code === "pending_auth" ? 403 : 401;
    const headers =
      code === "temporary_lockout" && checkResult?.retry_after_seconds
        ? { "Retry-After": String(checkResult.retry_after_seconds) }
        : {};
    return json({ ok: false, code, message: safeMessage(code) }, status, headers);
  }

  const technicalEmail = String(checkResult.technical_email || "").trim().toLowerCase();
  if (!technicalEmail) {
    return json({ ok: false, code: "session_failed", message: safeMessage("session_failed") }, 502);
  }

  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: technicalEmail,
    password,
  });

  const session = sanitizeSession(authData?.session as JsonRecord);
  if (authError || !session) {
    return json({ ok: false, code: "session_failed", message: safeMessage("session_failed") }, 502);
  }

  return json({
    ok: true,
    session,
    student: {
      id: checkResult.student_id,
      school_id: checkResult.school_id,
      login: checkResult.login,
      status: checkResult.status,
    },
  });
});
