import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type ResetPayload = {
  teacherId?: string;
  authUserId?: string;
  schoolId?: string;
};

type AdminClient = ReturnType<typeof createClient>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const adminRoles = new Set(["admin", "admin_ti", "administrador", "administrador_nacional", "ti"]);
const passwordWords = [
  "ARTE", "AULA", "BRISA", "CASA", "CEDRO", "CLARO", "CONTO", "ESTUDO",
  "FLOR", "FOLHA", "FONTE", "LIVRO", "MAPA", "MUNDO", "NOTA", "PONTE",
  "RAIZ", "REDE", "RIO", "RODA", "SABER", "SEMENTE", "SOL", "TEXTO",
  "TRILHA", "VIDA", "VOZ", "ZELAR", "CAMPO", "JARDIM", "LUA", "PATIO",
];

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const randomInt = (max: number) => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
};

const generateTemporaryPassword = () => {
  const word = passwordWords[randomInt(passwordWords.length)];
  const digits = String(randomInt(10000)).padStart(4, "0");
  const suffixAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const suffix = `${suffixAlphabet[randomInt(suffixAlphabet.length)]}${suffixAlphabet[randomInt(suffixAlphabet.length)]}`;
  return `${word}-${digits}-${suffix}`;
};

const audit = async (
  adminClient: AdminClient,
  event: {
    adminUserId: string | null;
    teacherId?: string | null;
    authUserId?: string | null;
    email?: string | null;
    schoolId?: string | null;
    result: "created" | "blocked" | "failed";
    reason?: string | null;
  }
) => {
  await adminClient.from("admin_professional_password_events").insert({
    admin_user_id: event.adminUserId,
    target_type: "teacher",
    target_institutional_id: event.teacherId || null,
    target_auth_user_id: event.authUserId || null,
    target_email: event.email || null,
    school_id: event.schoolId || null,
    action: "temporary_password_reset",
    result: event.result,
    reason: event.reason || null,
  });
};

const fail = async (
  adminClient: AdminClient,
  status: number,
  code: string,
  message: string,
  event: Parameters<typeof audit>[1]
) => {
  try {
    await audit(adminClient, { ...event, result: status >= 500 ? "failed" : "blocked", reason: code });
  } catch (_error) {
    // Audit failures should not expose internals to the browser.
  }
  return json({ ok: false, code, message }, status);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ ok: false, code: "server_misconfigured", message: "Servico administrativo indisponivel." }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const payload = (await request.json().catch(() => ({}))) as ResetPayload;
  const teacherId = payload.teacherId || null;
  const authUserId = payload.authUserId || null;
  const auditBase = {
    adminUserId: null,
    teacherId,
    authUserId,
    email: null,
    schoolId: payload.schoolId || null,
    result: "blocked" as const,
  };

  if (!callerToken) {
    return fail(adminClient, 401, "missing_session", "Sessao Admin obrigatoria.", auditBase);
  }

  const { data: callerData, error: callerError } = await callerClient.auth.getUser(callerToken);
  const caller = callerData?.user;
  if (callerError || !caller?.id) {
    return fail(adminClient, 401, "invalid_session", "Sessao Admin invalida ou expirada.", auditBase);
  }

  const { data: callerProfile } = await adminClient
    .from("profiles")
    .select("id, platform_role, status")
    .eq("id", caller.id)
    .maybeSingle();
  const callerRole = String(callerProfile?.platform_role || "").toLowerCase();
  if (callerProfile?.status !== "active" || !adminRoles.has(callerRole)) {
    return fail(adminClient, 403, "admin_required", "Acesso restrito ao Admin/TI.", { ...auditBase, adminUserId: caller.id });
  }

  if (!teacherId || !authUserId) {
    return fail(adminClient, 400, "missing_target", "Professor e identidade Auth sao obrigatorios.", {
      ...auditBase,
      adminUserId: caller.id,
    });
  }

  const { data: teacher, error: teacherError } = await adminClient
    .from("teachers")
    .select("id, school_id, profile_id, full_name, email, status")
    .eq("id", teacherId)
    .maybeSingle();
  if (teacherError) {
    return fail(adminClient, 500, "teacher_lookup_failed", "Nao foi possivel validar o professor.", {
      ...auditBase,
      adminUserId: caller.id,
    });
  }
  if (!teacher || String(teacher.status || "active").toLowerCase() !== "active") {
    return fail(adminClient, 404, "teacher_not_found", "Professor institucional ativo nao encontrado.", {
      ...auditBase,
      adminUserId: caller.id,
    });
  }
  if (payload.schoolId && teacher.school_id !== payload.schoolId) {
    return fail(adminClient, 403, "cross_school_blocked", "Escola informada nao corresponde ao professor.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
    });
  }
  if (teacher.profile_id !== authUserId) {
    return fail(adminClient, 409, "identity_mismatch", "Identidade Auth nao corresponde ao professor.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
    });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, platform_role, status")
    .eq("id", authUserId)
    .maybeSingle();
  if (profile?.status !== "active" || String(profile?.platform_role || "").toLowerCase() !== "professor") {
    return fail(adminClient, 409, "profile_not_professor", "Perfil profissional do professor nao esta ativo.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
      email: teacher.email || null,
    });
  }

  const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(authUserId);
  const authUser = authUserData?.user;
  if (authUserError || !authUser?.id || !authUser.email) {
    return fail(adminClient, 404, "auth_user_not_found", "Usuario Auth do professor nao encontrado.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
      email: teacher.email || null,
    });
  }

  const temporaryPassword = generateTemporaryPassword();
  const issuedAt = new Date().toISOString();
  const { error: updateError } = await adminClient.auth.admin.updateUserById(authUserId, {
    password: temporaryPassword,
    user_metadata: {
      ...(authUser.user_metadata || {}),
      display_name: authUser.user_metadata?.display_name || teacher.full_name || authUser.email,
      institutional_target_type: "teacher",
      institutional_target_id: teacherId,
      password_change_required: true,
      temporary_password_issued_at: issuedAt,
      temporary_password_reason: "admin_reset",
    },
    app_metadata: {
      ...(authUser.app_metadata || {}),
      platform_role: "professor",
    },
  });
  if (updateError) {
    return fail(adminClient, 500, "password_reset_failed", "Nao foi possivel gerar a senha provisoria com seguranca.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
      email: authUser.email,
    });
  }

  await audit(adminClient, {
    adminUserId: caller.id,
    teacherId,
    authUserId,
    email: authUser.email,
    schoolId: teacher.school_id,
    result: "created",
  }).catch(() => null);

  return json({
    ok: true,
    targetType: "teacher",
    teacherId,
    authUserId,
    email: authUser.email,
    schoolId: teacher.school_id,
    temporaryPassword,
    mustChangePassword: true,
    message: "Senha provisoria gerada. Entregue ao professor e oriente a troca no primeiro acesso.",
  });
});
