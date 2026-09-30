import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type Action = "provision_student" | "provision_school" | "provision_class" | "reset_password" | "block" | "unblock";

type Payload = {
  action?: Action;
  studentId?: string;
  schoolId?: string;
  classId?: string;
  limit?: number;
};

type JsonRecord = Record<string, unknown>;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: JsonRecord, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const platformAdminRoles = new Set(["admin", "admin_ti", "administrador", "administrador_nacional", "ti"]);
const schoolOperatorRoles = new Set(["gestor", "coordenador", "direcao", "secretaria", "admin", "admin_ti"]);
const passwordAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#%";

const randomInt = (max: number) => {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] % max;
};

const generatePassword = () => {
  let password = "";
  for (let index = 0; index < 14; index += 1) {
    password += passwordAlphabet[randomInt(passwordAlphabet.length)];
  }
  return password;
};

const safeMessage = (code: string) => {
  const messages: Record<string, string> = {
    missing_session: "Sessao administrativa obrigatoria.",
    invalid_session: "Sessao administrativa invalida ou expirada.",
    unauthorized: "Usuario sem permissao para operar credenciais institucionais.",
    invalid_action: "Acao de credencial invalida.",
    missing_student: "Aluno obrigatorio.",
    missing_scope: "Informe escola ou turma.",
    server_misconfigured: "Servico administrativo indisponivel.",
    auth_create_failed: "Nao foi possivel criar o acesso tecnico do aluno.",
    auth_update_failed: "Nao foi possivel atualizar a senha tecnica do aluno.",
    finalize_failed: "Nao foi possivel concluir o vinculo institucional do aluno.",
    provisioning_failed: "Nao foi possivel provisionar a credencial institucional.",
  };
  return messages[code] || "Nao foi possivel concluir a operacao.";
};

const fail = (code: string, status = 400, details?: JsonRecord) =>
  json({ ok: false, code, message: safeMessage(code), ...(details ? { details } : {}) }, status);

const getEnv = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  return { supabaseUrl, anonKey, serviceRoleKey };
};

const platformRole = (metadata: JsonRecord | null | undefined) =>
  String(metadata?.platform_role || metadata?.role || metadata?.app_role || "").trim().toLowerCase();

const canManageSchool = async (
  adminClient: ReturnType<typeof createClient>,
  callerId: string,
  callerRole: string,
  schoolId: string | null | undefined
) => {
  if (!schoolId) return false;
  if (platformAdminRoles.has(callerRole)) return true;

  const { data, error } = await adminClient
    .from("school_memberships")
    .select("id, started_at, ended_at")
    .eq("school_id", schoolId)
    .eq("profile_id", callerId)
    .eq("status", "active")
    .in("membership_role", Array.from(schoolOperatorRoles))
    .limit(20);

  if (error || !data?.length) return false;
  const now = Date.now();
  return data.some((membership) => {
    const startedAt = membership.started_at ? Date.parse(String(membership.started_at)) : 0;
    const endedAt = membership.ended_at ? Date.parse(String(membership.ended_at)) : Number.POSITIVE_INFINITY;
    return startedAt <= now && endedAt > now;
  });
};

const getStudentSchoolId = async (adminClient: ReturnType<typeof createClient>, studentId: string) => {
  const { data, error } = await adminClient
    .from("students")
    .select("id, school_id")
    .eq("id", studentId)
    .maybeSingle();
  if (error || !data?.school_id) throw new Error("student_not_found");
  return String(data.school_id);
};

const getClassSchoolId = async (adminClient: ReturnType<typeof createClient>, classId: string) => {
  const { data, error } = await adminClient
    .from("classes")
    .select("id, school_id")
    .eq("id", classId)
    .maybeSingle();
  if (error || !data?.school_id) throw new Error("class_not_found");
  return String(data.school_id);
};

const findAuthUserByEmail = async (adminClient: ReturnType<typeof createClient>, email: string) => {
  const normalized = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("auth_lookup_failed");
    const found = data.users.find((user) => String(user.email || "").trim().toLowerCase() === normalized);
    if (found?.id) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
};

const provisionOne = async (
  adminClient: ReturnType<typeof createClient>,
  callerId: string,
  studentId: string
) => {
  const { data: prepared, error: prepareError } = await adminClient.rpc(
    "admin_prepare_student_credential_provisioning",
    { p_student_id: studentId, p_actor_id: callerId }
  );

  if (prepareError || !prepared?.ok) {
    throw new Error(prepareError?.message || "prepare_failed");
  }

  if (prepared.existing && prepared.status !== "pending_auth") {
    return {
      student_id: prepared.student_id,
      school_id: prepared.school_id,
      login: prepared.login,
      status: prepared.status,
      existing: true,
      initial_password: null,
    };
  }

  const password = generatePassword();
  const technicalEmail = String(prepared.technical_email || `${String(prepared.login).toLowerCase()}@students.raizes.invalid`);
  let authUserId = String(prepared.auth_user_id || "");

  if (!authUserId) {
    const createAttributes = {
      email: technicalEmail,
      password,
      email_confirm: true,
      app_metadata: {
        platform_role: "aluno",
        auth_mode: "student_institutional",
      },
      user_metadata: {
        display_name: prepared.login,
        institutional_login: prepared.login,
        institutional_target_type: "student",
        institutional_target_id: prepared.student_id,
      },
    };
    const { data: created, error: createError } = await adminClient.auth.admin.createUser(createAttributes);

    if (created.user?.id) {
      authUserId = created.user.id;
    } else {
      const reusableAuthUser = createError ? await findAuthUserByEmail(adminClient, technicalEmail) : null;
      if (!reusableAuthUser?.id) throw new Error("auth_create_failed");
      authUserId = reusableAuthUser.id;
      const { error: updateError } = await adminClient.auth.admin.updateUserById(authUserId, createAttributes);
      if (updateError) throw new Error("auth_update_failed");
    }
  } else {
    const { error: updateError } = await adminClient.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      app_metadata: {
        platform_role: "aluno",
        auth_mode: "student_institutional",
      },
      user_metadata: {
        display_name: prepared.login,
        institutional_login: prepared.login,
        institutional_target_type: "student",
        institutional_target_id: prepared.student_id,
      },
    });
    if (updateError) throw new Error("auth_update_failed");
  }

  const { data: finalized, error: finalizeError } = await adminClient.rpc(
    "admin_finalize_student_credential_provisioning",
    {
      p_credential_id: prepared.credential_id,
      p_auth_user_id: authUserId,
      p_technical_email: technicalEmail,
      p_plain_password: password,
      p_actor_id: callerId,
    }
  );

  if (finalizeError || !finalized?.ok) {
    throw new Error("finalize_failed");
  }

  return {
    student_id: finalized.student_id,
    school_id: finalized.school_id,
    login: finalized.login,
    status: finalized.status,
    existing: false,
    initial_password: password,
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return fail("invalid_action", 405);

  const { supabaseUrl, anonKey, serviceRoleKey } = getEnv();
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return fail("server_misconfigured", 500);

  const callerToken = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!callerToken) return fail("missing_session", 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { data: callerData, error: callerError } = await callerClient.auth.getUser(callerToken);
  const caller = callerData?.user;
  if (callerError || !caller?.id) return fail("invalid_session", 401);

  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, platform_role, status")
    .eq("id", caller.id)
    .maybeSingle();

  const callerRole = platformRole(profile as JsonRecord);
  if (profile?.status !== "active") return fail("unauthorized", 403);

  let payload: Payload;
  try {
    payload = await request.json();
  } catch (_error) {
    return fail("invalid_action", 400);
  }

  const action = payload.action;
  if (!action) return fail("invalid_action", 400);

  try {
    if (action === "provision_student") {
      if (!payload.studentId) return fail("missing_student", 400);
      const schoolId = await getStudentSchoolId(adminClient, payload.studentId);
      if (!(await canManageSchool(adminClient, caller.id, callerRole, schoolId))) return fail("unauthorized", 403);
      const credential = await provisionOne(adminClient, caller.id, payload.studentId);
      return json({ ok: true, action, credentials: [credential] });
    }

    if (action === "provision_school" || action === "provision_class") {
      if (action === "provision_school" && !payload.schoolId) return fail("missing_scope", 400);
      if (action === "provision_class" && !payload.classId) return fail("missing_scope", 400);

      const schoolId =
        action === "provision_school" ? String(payload.schoolId) : await getClassSchoolId(adminClient, String(payload.classId));
      if (!(await canManageSchool(adminClient, caller.id, callerRole, schoolId))) return fail("unauthorized", 403);

      const limit = Math.max(1, Math.min(Number(payload.limit || 1000), 5000));
      const { data: rows, error: listError } = await adminClient.rpc(
        "admin_list_students_without_credentials",
        {
          p_school_id: action === "provision_school" ? payload.schoolId : null,
          p_class_id: action === "provision_class" ? payload.classId : null,
          p_limit: limit,
        }
      );

      if (listError) throw new Error(listError.message);

      const credentials = [];
      for (const row of rows || []) {
        credentials.push(await provisionOne(adminClient, caller.id, row.student_id));
      }

      return json({
        ok: true,
        action,
        total: credentials.length,
        credentials,
      });
    }

    if (action === "reset_password") {
      if (!payload.studentId) return fail("missing_student", 400);
      const schoolId = await getStudentSchoolId(adminClient, payload.studentId);
      if (!(await canManageSchool(adminClient, caller.id, callerRole, schoolId))) return fail("unauthorized", 403);

      const { data: existing, error: existingError } = await adminClient
        .from("student_institutional_credentials")
        .select("student_id, auth_user_id, technical_email, login")
        .eq("student_id", payload.studentId)
        .maybeSingle();
      if (existingError || !existing?.auth_user_id) throw new Error("credential_not_found");

      const password = generatePassword();
      const { error: updateError } = await adminClient.auth.admin.updateUserById(existing.auth_user_id, { password });
      if (updateError) throw new Error("auth_update_failed");

      const { data: reset, error: resetError } = await adminClient.rpc(
        "admin_reset_student_credential_password",
        { p_student_id: payload.studentId, p_plain_password: password, p_actor_id: caller.id }
      );
      if (resetError || !reset?.ok) throw new Error(resetError?.message || "reset_failed");

      return json({
        ok: true,
        action,
        credential: {
          student_id: reset.student_id,
          school_id: reset.school_id,
          login: reset.login,
          status: reset.status,
          initial_password: password,
        },
      });
    }

    if (action === "block" || action === "unblock") {
      if (!payload.studentId) return fail("missing_student", 400);
      const schoolId = await getStudentSchoolId(adminClient, payload.studentId);
      if (!(await canManageSchool(adminClient, caller.id, callerRole, schoolId))) return fail("unauthorized", 403);

      const { data: result, error } = await adminClient.rpc(
        "admin_set_student_credential_status",
        {
          p_student_id: payload.studentId,
          p_status: action === "block" ? "blocked" : "active",
          p_actor_id: caller.id,
        }
      );
      if (error || !result?.ok) throw new Error(error?.message || "status_failed");
      return json({ ok: true, action, credential: result });
    }

    return fail("invalid_action", 400);
  } catch (error) {
    const code = error instanceof Error ? error.message : "provisioning_failed";
    if (code === "auth_create_failed" || code === "auth_update_failed" || code === "finalize_failed") {
      return fail(code, 502);
    }
    return fail("provisioning_failed", 500);
  }
});
