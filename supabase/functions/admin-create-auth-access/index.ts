import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type TargetType = "teacher" | "student" | "guardian";

type CreateAccessPayload = {
  targetType?: TargetType;
  targetInstitutionalId?: string;
  email?: string;
  expectedRole?: string;
  schoolId?: string;
  redirectTo?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const normalizeEmail = (value = "") => value.trim().toLowerCase();
const isValidEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const adminRoles = new Set(["admin", "admin_ti", "administrador", "administrador_nacional", "ti"]);
const passwordWords = [
  "ARTE", "AULA", "BRISA", "CASA", "CEDRO", "CLARO", "CONTO", "ESTUDO",
  "FLOR", "FOLHA", "FONTE", "LIVRO", "MAPA", "MUNDO", "NOTA", "PONTE",
  "RAIZ", "REDE", "RIO", "RODA", "SABER", "SEMENTE", "SOL", "TEXTO",
  "TRILHA", "VIDA", "VOZ", "ZELAR", "CAMPO", "JARDIM", "LUA", "PATIO",
];

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

const expectedRoleByTarget: Record<TargetType, string> = {
  teacher: "professor",
  student: "aluno",
  guardian: "educacao_infantil",
};

const profileRoleByTarget: Record<TargetType, string> = {
  teacher: "professor",
  student: "aluno",
  guardian: "educacao_infantil",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const safeErrorCode = (error: unknown) => {
  if (isRecord(error)) {
    const code = typeof error.code === "string" ? error.code : null;
    const name = typeof error.name === "string" ? error.name : null;
    return code || name || "unknown_error";
  }
  return error instanceof Error ? error.name : "unknown_error";
};

const isSameInstitutionalTarget = (
  user: { raw_user_meta_data?: unknown; raw_app_meta_data?: unknown },
  targetType: TargetType,
  targetInstitutionalId: string
) => {
  const userMeta = isRecord(user.raw_user_meta_data) ? user.raw_user_meta_data : {};
  const appMeta = isRecord(user.raw_app_meta_data) ? user.raw_app_meta_data : {};
  return (
    userMeta.institutional_target_type === targetType &&
    userMeta.institutional_target_id === targetInstitutionalId &&
    appMeta.platform_role === profileRoleByTarget[targetType]
  );
};

const audit = async (
  adminClient: ReturnType<typeof createClient>,
  event: {
    adminUserId: string | null;
    targetType: string;
    targetInstitutionalId: string | null;
    targetAuthUserId?: string | null;
    targetEmail?: string | null;
    derivedRole?: string | null;
    schoolId?: string | null;
    result: "created" | "blocked" | "failed";
    reason?: string | null;
  }
) => {
  const { error } = await adminClient.from("admin_auth_access_events").insert({
    admin_user_id: event.adminUserId,
    target_type: event.targetType,
    target_institutional_id: event.targetInstitutionalId,
    target_auth_user_id: event.targetAuthUserId || null,
    target_email: event.targetEmail || null,
    derived_role: event.derivedRole || null,
    school_id: event.schoolId || null,
    result: event.result,
    reason: event.reason || null,
  });
  if (error) throw error;
};

const auditBestEffort = async (
  adminClient: ReturnType<typeof createClient>,
  event: Parameters<typeof audit>[1]
) => {
  try {
    await audit(adminClient, event);
    return null;
  } catch (error) {
    return error;
  }
};

const auditTemporaryPasswordCreated = async (
  adminClient: ReturnType<typeof createClient>,
  event: {
    adminUserId: string;
    targetInstitutionalId: string;
    targetAuthUserId: string;
    targetEmail: string;
    schoolId: string;
  }
) => {
  const insertResult = adminClient.from("admin_professional_password_events").insert({
    admin_user_id: event.adminUserId,
    target_type: "teacher",
    target_institutional_id: event.targetInstitutionalId,
    target_auth_user_id: event.targetAuthUserId,
    target_email: event.targetEmail,
    school_id: event.schoolId,
    action: "temporary_password_created",
    result: "created",
  });
  const { error } = await insertResult;
  if (error) throw error;
};

const fail = async (
  adminClient: ReturnType<typeof createClient>,
  status: number,
  code: string,
  message: string,
  event: Parameters<typeof audit>[1]
) => {
  await auditBestEffort(adminClient, { ...event, result: status >= 500 ? "failed" : "blocked", reason: code });
  return json({ ok: false, code, message }, status);
};

const getTarget = async (adminClient: ReturnType<typeof createClient>, targetType: TargetType, id: string) => {
  if (targetType === "teacher") {
    const { data, error } = await adminClient
      .from("teachers")
      .select("id, school_id, profile_id, user_id, full_name, email, status")
      .eq("id", id)
      .maybeSingle();
    return { data, error };
  }
  if (targetType === "student") {
    const { data, error } = await adminClient
      .from("students")
      .select("id, school_id, user_id, nome, email, status")
      .eq("id", id)
      .maybeSingle();
    return { data, error };
  }
  const { data, error } = await adminClient
    .from("guardians")
    .select("id, school_id, profile_id, full_name, email, status")
    .eq("id", id)
    .maybeSingle();
  return { data, error };
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

  const payload = (await request.json().catch(() => ({}))) as CreateAccessPayload;
  const targetType = payload.targetType;
  const targetInstitutionalId = payload.targetInstitutionalId || null;
  const email = normalizeEmail(payload.email || "");
  const auditBase = {
    adminUserId: null,
    targetType: targetType || "unknown",
    targetInstitutionalId,
    targetEmail: email || null,
    derivedRole: targetType ? expectedRoleByTarget[targetType] : null,
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

  if (!targetType || !["teacher", "student", "guardian"].includes(targetType)) {
    return fail(adminClient, 400, "invalid_target_type", "Tipo institucional invalido.", { ...auditBase, adminUserId: caller.id });
  }
  if (!targetInstitutionalId) {
    return fail(adminClient, 400, "missing_target", "Usuario institucional obrigatorio.", { ...auditBase, adminUserId: caller.id });
  }
  if (!isValidEmail(email)) {
    return fail(adminClient, 400, "invalid_email", "E-mail invalido.", { ...auditBase, adminUserId: caller.id });
  }

  const derivedRole = expectedRoleByTarget[targetType];
  if (!derivedRole || payload.expectedRole !== derivedRole || adminRoles.has(String(payload.expectedRole || "").toLowerCase())) {
    return fail(adminClient, 400, "invalid_role", "Papel deve ser derivado do vinculo institucional.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
    });
  }

  const { data: target, error: targetError } = await getTarget(adminClient, targetType, targetInstitutionalId);
  if (targetError) {
    return fail(adminClient, 500, "target_lookup_failed", "Nao foi possivel validar o usuario institucional.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
    });
  }
  if (!target) {
    return fail(adminClient, 404, "target_not_found", "Usuario institucional inexistente.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
    });
  }
  if (String(target.status || "active").toLowerCase() !== "active") {
    return fail(adminClient, 409, "target_inactive", "Usuario institucional nao esta ativo.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
    });
  }
  if (payload.schoolId && target.school_id !== payload.schoolId) {
    return fail(adminClient, 403, "cross_school_blocked", "Escola informada nao corresponde ao vinculo institucional.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
    });
  }
  const { data: school, error: schoolError } = await adminClient
    .from("schools")
    .select("id, status")
    .eq("id", target.school_id)
    .maybeSingle();
  if (schoolError || !school) {
    return fail(adminClient, 404, "school_not_found", "Escola institucional nao encontrada.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
    });
  }
  let duplicate: { id: string; email?: string } | undefined;
  let duplicateByTarget: { id: string; email?: string } | undefined;
  let linkedAuthExists = false;
  const possibleLinkedIds = [target.profile_id, target.user_id].filter(Boolean);
  for (let page = 1; page <= 10 && !(duplicate && duplicateByTarget); page += 1) {
    const { data: authPage, error: authListError } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (authListError) {
      return fail(adminClient, 500, "auth_duplicate_check_failed", "Nao foi possivel validar duplicidade de Auth.", {
        ...auditBase,
        adminUserId: caller.id,
        derivedRole,
        schoolId: target.school_id,
      });
    }
    duplicate = duplicate || authPage.users.find((user) => normalizeEmail(user.email || "") === email);
    duplicateByTarget = duplicateByTarget || authPage.users.find((user) =>
      isSameInstitutionalTarget(user, targetType, targetInstitutionalId)
    );
    linkedAuthExists = linkedAuthExists || authPage.users.some((user) => possibleLinkedIds.includes(user.id));
    if (authPage.users.length < 1000) break;
  }
  if (targetType === "student" && target.user_id) {
    return fail(adminClient, 409, "auth_already_configured", "Este usuario ja possui acesso Auth configurado.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
    });
  }
  if (linkedAuthExists || (targetType !== "student" && target.user_id)) {
    return fail(adminClient, 409, "auth_already_configured", "Este usuario ja possui acesso Auth configurado.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
    });
  }
  if (duplicateByTarget) {
    return fail(adminClient, 409, "orphan_auth_recovery_required", "Ja existe Auth pendente de recuperacao para este usuario institucional.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
      targetAuthUserId: duplicateByTarget.id,
    });
  }
  if (duplicate) {
    return fail(adminClient, 409, "email_already_used", "Este e-mail ja esta utilizado por outro Auth.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
      targetAuthUserId: duplicate.id,
    });
  }
  if (targetType === "student") {
    const { data: existingPublicUsers, error: publicUserDuplicateError } = await adminClient
      .from("users")
      .select("id, email")
      .ilike("email", email)
      .limit(2);
    if (publicUserDuplicateError) {
      return fail(adminClient, 500, "public_user_duplicate_check_failed", "Nao foi possivel validar duplicidade do usuario legado.", {
        ...auditBase,
        adminUserId: caller.id,
        derivedRole,
        schoolId: target.school_id,
      });
    }
    if ((existingPublicUsers || []).length) {
      return fail(adminClient, 409, "public_user_email_already_used", "Este e-mail ja esta utilizado por outro usuario legado.", {
        ...auditBase,
        adminUserId: caller.id,
        derivedRole,
        schoolId: target.school_id,
      });
    }
  }

  const displayName = target.full_name || target.nome || email;
  const reusableProfileId = targetType !== "student" ? target.profile_id || null : null;
  const temporaryPassword = targetType === "teacher" ? generateTemporaryPassword() : "";
  const createAttributes = {
    ...(reusableProfileId ? { id: reusableProfileId } : {}),
    email,
    email_confirm: true,
    ...(temporaryPassword ? { password: temporaryPassword } : {}),
    app_metadata: { platform_role: profileRoleByTarget[targetType] },
    user_metadata: {
      display_name: displayName,
      institutional_target_type: targetType,
      institutional_target_id: targetInstitutionalId,
      ...(temporaryPassword
        ? {
            password_change_required: true,
            temporary_password_issued_at: new Date().toISOString(),
            temporary_password_reason: "admin_initial_access",
          }
        : {}),
    },
  };
  const { data: createData, error: createError } = await adminClient.auth.admin.createUser(createAttributes);
  const authUser = createData?.user;
  if (createError || !authUser?.id) {
    return fail(adminClient, 502, "auth_create_failed", "Nao foi possivel criar o usuario Auth.", {
      ...auditBase,
      adminUserId: caller.id,
      derivedRole,
      schoolId: target.school_id,
    });
  }

  const authUserId = authUser.id;
  let initialRecoverySent = false;
  let insertedPublicUser = false;
  let successAuditWarning: string | null = null;
  const insertedGuardianStudentIds: string[] = [];
  try {
    if (reusableProfileId) {
      const { data: updatedProfile, error: profileError } = await adminClient
        .from("profiles")
        .update({
          display_name: displayName,
          platform_role: profileRoleByTarget[targetType],
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", reusableProfileId)
        .select("id")
        .maybeSingle();
      if (profileError) throw profileError;
      if (!updatedProfile) throw new Error("profile_reuse_failed");
    } else {
      const { error: profileError } = await adminClient.from("profiles").insert({
        id: authUserId,
        display_name: displayName,
        platform_role: profileRoleByTarget[targetType],
        status: "active",
      });
      if (profileError) throw profileError;
    }

    if (targetType === "teacher") {
      let teacherUpdate = adminClient
        .from("teachers")
        .update({ profile_id: authUserId, email, updated_at: new Date().toISOString() })
        .eq("id", targetInstitutionalId);
      teacherUpdate = reusableProfileId ? teacherUpdate.eq("profile_id", reusableProfileId) : teacherUpdate.is("profile_id", null);
      const { data: updatedTeacher, error } = await teacherUpdate
        .is("user_id", null)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedTeacher) throw new Error("teacher_link_not_updated");
      const { data: existingMembership } = await adminClient
        .from("school_memberships")
        .select("id")
        .eq("school_id", target.school_id)
        .eq("profile_id", authUserId)
        .eq("membership_role", "professor")
        .maybeSingle();
      if (!existingMembership) {
        const { error: membershipError } = await adminClient.from("school_memberships").insert({
          school_id: target.school_id,
          profile_id: authUserId,
          membership_role: "professor",
          status: "active",
        });
        if (membershipError) throw membershipError;
      }
    }

    if (targetType === "student") {
      const { data: existingPublicUser, error: existingPublicUserError } = await adminClient
        .from("users")
        .select("id, nome, email, perfil, school_id, class_id, ativo")
        .eq("id", authUserId)
        .maybeSingle();
      if (existingPublicUserError) throw existingPublicUserError;
      if (existingPublicUser) {
        const publicEmail = normalizeEmail(existingPublicUser.email || "");
        const publicRole = String(existingPublicUser.perfil || "").toLowerCase();
        if ((publicEmail && publicEmail !== email) || (publicRole && publicRole !== "aluno")) {
          throw new Error("public_user_conflict");
        }
      } else {
        const { data: activeEnrollments, error: enrollmentError } = await adminClient
          .from("enrollments")
          .select("class_id")
          .eq("student_id", targetInstitutionalId)
          .eq("status", "active")
          .limit(2);
        if (enrollmentError) throw enrollmentError;
        const classId = activeEnrollments?.[0]?.class_id || null;
        const { error: publicUserError } = await adminClient.from("users").insert({
          id: authUserId,
          nome: displayName,
          email,
          perfil: "aluno",
          school_id: target.school_id,
          class_id: classId,
          ativo: true,
        });
        if (publicUserError) throw publicUserError;
        insertedPublicUser = true;
      }
      const { data: updatedStudent, error } = await adminClient
        .from("students")
        .update({ user_id: authUserId, email, updated_at: new Date().toISOString() })
        .eq("id", targetInstitutionalId)
        .is("user_id", null)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedStudent) throw new Error("student_link_not_updated");
    }

    if (targetType === "guardian") {
      let guardianUpdate = adminClient
        .from("guardians")
        .update({ profile_id: authUserId, email, access_status: "active", updated_at: new Date().toISOString() })
        .eq("id", targetInstitutionalId);
      guardianUpdate = reusableProfileId ? guardianUpdate.eq("profile_id", reusableProfileId) : guardianUpdate.is("profile_id", null);
      const { data: updatedGuardian, error } = await guardianUpdate
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updatedGuardian) throw new Error("guardian_link_not_updated");

      const { data: links, error: linksError } = await adminClient
        .from("student_guardian_links")
        .select("student_id, relationship, status")
        .eq("guardian_id", targetInstitutionalId)
        .eq("status", "active");
      if (linksError) throw linksError;
      if (links?.length) {
        const studentIds = links.map((link) => link.student_id).filter(Boolean);
        const { data: existingLinks, error: existingLinksError } = await adminClient
          .from("student_guardians")
          .select("student_id")
          .eq("profile_id", authUserId)
          .in("student_id", studentIds);
        if (existingLinksError) throw existingLinksError;
        const existingStudentIds = new Set((existingLinks || []).map((link) => link.student_id));
        const missingLinks = links.filter((link) => !existingStudentIds.has(link.student_id));
        if (missingLinks.length) {
          const { error: insertLinksError } = await adminClient.from("student_guardians").insert(
            missingLinks.map((link) => ({
              student_id: link.student_id,
              profile_id: authUserId,
              relationship: link.relationship || "responsavel",
              status: "active",
            }))
          );
          if (insertLinksError) throw insertLinksError;
          insertedGuardianStudentIds.push(...missingLinks.map((link) => link.student_id).filter(Boolean));
        }
      }
    }

    if (temporaryPassword) {
      await auditTemporaryPasswordCreated(adminClient, {
        adminUserId: caller.id,
        targetInstitutionalId,
        targetAuthUserId: authUserId,
        targetEmail: email,
        schoolId: target.school_id,
      });
    } else {
      const recoveryResponse = await fetch(`${supabaseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(payload.redirectTo || "")}`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      initialRecoverySent = recoveryResponse.ok;
    }
    const successAuditError = await auditBestEffort(adminClient, {
      adminUserId: caller.id,
      targetType,
      targetInstitutionalId,
      targetAuthUserId: authUserId,
      targetEmail: email,
      derivedRole,
      schoolId: target.school_id,
      result: "created",
    });
    successAuditWarning = successAuditError ? safeErrorCode(successAuditError) : null;
  } catch (error) {
    const failureCode = safeErrorCode(error);
    const rollbackErrors: string[] = [];
    if (targetType === "teacher") {
      const { error: teacherRollbackError } = await adminClient
        .from("teachers")
        .update({ profile_id: reusableProfileId, email: target.email || null, updated_at: new Date().toISOString() })
        .eq("id", targetInstitutionalId)
        .eq("profile_id", authUserId);
      if (teacherRollbackError) rollbackErrors.push(`teacher:${safeErrorCode(teacherRollbackError)}`);
      if (!reusableProfileId) {
        const { error: membershipRollbackError } = await adminClient
          .from("school_memberships")
          .delete()
          .eq("school_id", target.school_id)
          .eq("profile_id", authUserId)
          .eq("membership_role", "professor");
        if (membershipRollbackError) rollbackErrors.push(`school_membership:${safeErrorCode(membershipRollbackError)}`);
      }
    }
    if (targetType === "student") {
      const { error: studentRollbackError } = await adminClient
        .from("students")
        .update({ user_id: null, email: target.email || null, updated_at: new Date().toISOString() })
        .eq("id", targetInstitutionalId)
        .eq("user_id", authUserId);
      if (studentRollbackError) rollbackErrors.push(`student:${safeErrorCode(studentRollbackError)}`);
      if (insertedPublicUser) {
        const { error: publicUserRollbackError } = await adminClient.from("users").delete().eq("id", authUserId);
        if (publicUserRollbackError) rollbackErrors.push(`public_user:${safeErrorCode(publicUserRollbackError)}`);
      }
    }
    if (targetType === "guardian") {
      if (insertedGuardianStudentIds.length) {
        const { error: guardianLinksRollbackError } = await adminClient
          .from("student_guardians")
          .delete()
          .eq("profile_id", authUserId)
          .in("student_id", insertedGuardianStudentIds);
        if (guardianLinksRollbackError) rollbackErrors.push(`student_guardians:${safeErrorCode(guardianLinksRollbackError)}`);
      }
      const { error: guardianRollbackError } = await adminClient
        .from("guardians")
        .update({
          profile_id: reusableProfileId,
          email: target.email || null,
          access_status: reusableProfileId ? "active" : "not_configured",
          updated_at: new Date().toISOString(),
        })
        .eq("id", targetInstitutionalId)
        .eq("profile_id", authUserId);
      if (guardianRollbackError) rollbackErrors.push(`guardian:${safeErrorCode(guardianRollbackError)}`);
    }
    if (!reusableProfileId) {
      const { error: profileRollbackError } = await adminClient.from("profiles").delete().eq("id", authUserId);
      if (profileRollbackError) rollbackErrors.push(`profile:${safeErrorCode(profileRollbackError)}`);
    }
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(authUserId);
    if (deleteAuthError) rollbackErrors.push(`auth:${safeErrorCode(deleteAuthError)}`);

    const authRollbackFailed = Boolean(deleteAuthError);
    const reason = authRollbackFailed
      ? `link_failed_auth_rollback_failed:${failureCode}`
      : `link_failed_auth_rollback_ok:${failureCode}`;
    await auditBestEffort(adminClient, {
      adminUserId: caller.id,
      targetType,
      targetInstitutionalId,
      targetAuthUserId: authRollbackFailed ? authUserId : null,
      targetEmail: email,
      derivedRole,
      schoolId: target.school_id,
      result: "failed",
      reason,
    });
    return json({
      ok: false,
      code: authRollbackFailed ? "link_failed_auth_rollback_failed" : "link_failed",
      message: authRollbackFailed
        ? "Auth criado, mas o vinculo institucional nao foi concluido. Recuperacao administrativa obrigatoria."
        : "Auth criado, mas o vinculo institucional nao foi concluido.",
      rollback: {
        authDeleted: !authRollbackFailed,
        requiresAdminRecovery: authRollbackFailed || rollbackErrors.length > 0,
      },
    }, 500);
  }

  return json({
    ok: true,
    authUserId,
    targetType,
    targetInstitutionalId,
    email,
    derivedRole,
    schoolId: target.school_id,
    initialRecoverySent,
    temporaryPassword: temporaryPassword || null,
    mustChangePassword: Boolean(temporaryPassword),
    auditWarning: successAuditWarning,
    message: initialRecoverySent
      ? "Acesso criado com sucesso. O usuario recebera instrucoes para definir a senha."
      : temporaryPassword
        ? "Acesso criado com sucesso. Entregue a senha provisoria ao professor."
        : "Acesso criado com sucesso. Envie a recuperacao de senha para o usuario definir a senha.",
  });
});
