import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type ChangeEmailPayload = {
  targetType?: "teacher";
  targetInstitutionalId?: string;
  targetAuthUserId?: string;
  schoolId?: string;
  newEmail?: string;
  redirectTo?: string;
  sendRecovery?: boolean;
};

type AdminClient = ReturnType<typeof createClient>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const adminRoles = new Set(["admin", "admin_ti", "administrador", "administrador_nacional", "ti"]);
const normalizeEmail = (value = "") => value.trim().toLowerCase();
const isValidEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const audit = async (
  adminClient: AdminClient,
  event: {
    adminUserId: string | null;
    targetInstitutionalId?: string | null;
    targetAuthUserId?: string | null;
    oldEmail?: string | null;
    newEmail?: string | null;
    schoolId?: string | null;
    result: "changed" | "blocked" | "failed";
    reason?: string | null;
  }
) => {
  await adminClient.from("admin_auth_email_change_events").insert({
    admin_user_id: event.adminUserId,
    target_type: "teacher",
    target_institutional_id: event.targetInstitutionalId || null,
    target_auth_user_id: event.targetAuthUserId || null,
    old_email: event.oldEmail || null,
    new_email: event.newEmail || null,
    school_id: event.schoolId || null,
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
    // Audit failures should not leak internals to the browser.
  }
  return json({ ok: false, code, message }, status);
};

const findAuthUserByEmail = async (adminClient: AdminClient, email: string) => {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => normalizeEmail(user.email || "") === email);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
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

  const payload = (await request.json().catch(() => ({}))) as ChangeEmailPayload;
  const targetInstitutionalId = payload.targetInstitutionalId || null;
  const targetAuthUserId = payload.targetAuthUserId || null;
  const newEmail = normalizeEmail(payload.newEmail || "");
  const auditBase = {
    adminUserId: null,
    targetInstitutionalId,
    targetAuthUserId,
    oldEmail: null,
    newEmail: newEmail || null,
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

  if (payload.targetType !== "teacher") {
    return fail(adminClient, 400, "invalid_target_type", "Alteracao de e-mail disponivel apenas para professor.", {
      ...auditBase,
      adminUserId: caller.id,
    });
  }
  if (!targetInstitutionalId || !targetAuthUserId) {
    return fail(adminClient, 400, "missing_target", "Professor e identidade Auth sao obrigatorios.", {
      ...auditBase,
      adminUserId: caller.id,
    });
  }
  if (!isValidEmail(newEmail)) {
    return fail(adminClient, 400, "invalid_email", "Novo e-mail invalido.", {
      ...auditBase,
      adminUserId: caller.id,
    });
  }

  const { data: teacher, error: teacherError } = await adminClient
    .from("teachers")
    .select("id, school_id, profile_id, user_id, full_name, email, status")
    .eq("id", targetInstitutionalId)
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
  if (teacher.profile_id !== targetAuthUserId) {
    return fail(adminClient, 409, "identity_mismatch", "Identidade Auth nao corresponde ao professor.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
    });
  }

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, platform_role, status")
    .eq("id", targetAuthUserId)
    .maybeSingle();
  if (profile?.status !== "active" || String(profile?.platform_role || "").toLowerCase() !== "professor") {
    return fail(adminClient, 409, "profile_not_professor", "Perfil profissional do professor nao esta ativo.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
    });
  }

  const { data: authUserData, error: authUserError } = await adminClient.auth.admin.getUserById(targetAuthUserId);
  const authUser = authUserData?.user;
  if (authUserError || !authUser?.id) {
    return fail(adminClient, 404, "auth_user_not_found", "Usuario Auth do professor nao encontrado.", {
      ...auditBase,
      adminUserId: caller.id,
      schoolId: teacher.school_id,
    });
  }

  const oldEmail = normalizeEmail(authUser.email || teacher.email || "");
  const fullAuditBase = {
    ...auditBase,
    adminUserId: caller.id,
    targetInstitutionalId,
    targetAuthUserId,
    oldEmail: oldEmail || null,
    newEmail,
    schoolId: teacher.school_id,
  };
  if (oldEmail === newEmail) {
    return fail(adminClient, 409, "same_email", "O novo e-mail e igual ao e-mail atual.", fullAuditBase);
  }

  let duplicate;
  try {
    duplicate = await findAuthUserByEmail(adminClient, newEmail);
  } catch (_error) {
    return fail(adminClient, 500, "duplicate_check_failed", "Nao foi possivel validar duplicidade de e-mail.", fullAuditBase);
  }
  if (duplicate && duplicate.id !== targetAuthUserId) {
    return fail(adminClient, 409, "email_already_used", "Este e-mail ja esta utilizado por outro usuario.", {
      ...fullAuditBase,
      targetAuthUserId: duplicate.id,
    });
  }

  let authChanged = false;
  try {
    const { error: updateAuthError } = await adminClient.auth.admin.updateUserById(targetAuthUserId, {
      email: newEmail,
      email_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata || {}),
        display_name: authUser.user_metadata?.display_name || teacher.full_name || newEmail,
        institutional_target_type: "teacher",
        institutional_target_id: targetInstitutionalId,
      },
      app_metadata: {
        ...(authUser.app_metadata || {}),
        platform_role: "professor",
      },
    });
    if (updateAuthError) throw updateAuthError;
    authChanged = true;

    const { data: updatedTeacher, error: teacherUpdateError } = await adminClient
      .from("teachers")
      .update({ email: newEmail, updated_at: new Date().toISOString() })
      .eq("id", targetInstitutionalId)
      .eq("profile_id", targetAuthUserId)
      .select("id")
      .maybeSingle();
    if (teacherUpdateError) throw teacherUpdateError;
    if (!updatedTeacher) throw new Error("teacher_email_sync_failed");

    await audit(adminClient, { ...fullAuditBase, result: "changed", reason: null }).catch(() => null);
  } catch (_error) {
    if (authChanged) {
      await adminClient.auth.admin.updateUserById(targetAuthUserId, {
        email: oldEmail,
        email_confirm: true,
        user_metadata: authUser.user_metadata || {},
        app_metadata: authUser.app_metadata || {},
      }).catch(() => null);
    }
    return fail(adminClient, 500, "email_change_failed", "Nao foi possivel concluir a troca de e-mail com seguranca.", fullAuditBase);
  }

  let recoverySent = false;
  if (payload.sendRecovery !== false) {
    const recoveryResponse = await fetch(`${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(payload.redirectTo || "")}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: newEmail }),
    });
    recoverySent = recoveryResponse.ok;
  }

  return json({
    ok: true,
    targetType: "teacher",
    targetInstitutionalId,
    targetAuthUserId,
    oldEmail,
    newEmail,
    schoolId: teacher.school_id,
    recoverySent,
    message: recoverySent
      ? "E-mail de acesso alterado. O professor recebera instrucoes para definir ou recuperar a senha."
      : "E-mail de acesso alterado. Envie recuperação de senha quando necessario.",
  });
});
