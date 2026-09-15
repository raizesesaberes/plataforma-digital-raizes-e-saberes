import { demoProfiles, type DemoProfile, type DemoRole } from "../data/fixtures";

export type MobileRoute = DemoRole | "institutional";

type AuthSession = {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  expires_in?: number;
  token_type?: string;
  user?: SupabaseUser;
};

type SupabaseUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type ProfileRow = {
  id?: string;
  display_name?: string | null;
  platform_role?: string | null;
  status?: string | null;
};

type StudentRow = {
  id?: string;
  nome?: string | null;
  school_id?: string | null;
  class_id?: string | null;
  turma?: string | null;
  status?: string | null;
};

type TeacherRow = {
  id?: string;
  school_id?: string | null;
  full_name?: string | null;
  disciplina?: string | null;
  status?: string | null;
};

type ClassRow = {
  id?: string;
  nome?: string | null;
  school_id?: string | null;
  school_year?: string | null;
  ano_escolar?: string | null;
};

type SchoolRow = {
  id?: string;
  nome?: string | null;
};

type EnrollmentRow = {
  id?: string;
  student_id?: string | null;
  class_id?: string | null;
  school_id?: string | null;
  school_year?: string | null;
  status?: string | null;
  classes?: ClassRow | null;
  schools?: SchoolRow | null;
};

export type StudentCalendarEventRow = {
  source_type?: string | null;
  source_id?: string | null;
  school_id?: string | null;
  class_id?: string | null;
  student_id?: string | null;
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  title?: string | null;
  description?: string | null;
  event_type?: string | null;
  status?: string | null;
  action_label?: string | null;
  href?: string | null;
  created_at?: string | null;
};

export type NotificationCenterRow = {
  item_type?: string | null;
  delivery_id?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  school_id?: string | null;
  student_id?: string | null;
  title?: string | null;
  summary?: string | null;
  origin_label?: string | null;
  priority?: string | null;
  deep_link?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  notification_status?: string | null;
  child_name?: string | null;
  class_name?: string | null;
  unread_count?: number | null;
};

export type AuthContext = {
  userId: string;
  email?: string;
  displayName?: string;
  platformRole?: string;
  route: MobileRoute;
  enrollmentId?: string;
  enrollmentStatus?: string;
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  studentId?: string;
  studentContextStatus?: "ready" | "empty";
  teacherId?: string;
};

const runtimeEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const SUPABASE_URL = runtimeEnv.EXPO_PUBLIC_SUPABASE_URL ?? "https://jaesjldrbjbdmzzggxzw.supabase.co";
const SUPABASE_ANON_KEY =
  runtimeEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_YzHPXWp_L-QFAQYaGz_3dQ_K07Ni9Hz";
const SESSION_STORAGE_KEY = "raizes:mobile:supabase-auth-session";

export function hasSupabaseClientConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.toLowerCase().includes("service_role"));
}

export async function signInWithPassword(email: string, password: string): Promise<AuthContext> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    throw new Error("Informe e-mail e senha para entrar.");
  }

  const session = await authRequest<AuthSession>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email: trimmedEmail, password })
  });

  await saveSession(session);
  return resolveAuthContext(session);
}

export async function restoreAuthSession(): Promise<AuthContext | null> {
  const stored = readStoredSession();
  if (!stored?.access_token) {
    return null;
  }

  const validSession = await refreshIfNeeded(stored);
  if (!validSession?.access_token) {
    clearStoredSession();
    return null;
  }

  return resolveAuthContext(validSession);
}

export async function requestPasswordRecovery(email: string) {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    throw new Error("Informe o e-mail para recuperar a senha.");
  }

  await authRequest("/auth/v1/recover", {
    method: "POST",
    body: JSON.stringify({ email: trimmedEmail })
  });
}

export async function signOut() {
  const session = readStoredSession();
  if (session?.access_token) {
    try {
      await authRequest(
        "/auth/v1/logout",
        {
          method: "POST"
        },
        session
      );
    } catch {
      // Local cleanup is still required even when the remote token is already expired.
    }
  }

  clearStoredSession();
}

export function profileForAuthContext(context: AuthContext): DemoProfile | null {
  if (context.route === "institutional") {
    return null;
  }

  const base = demoProfiles[context.route];
  const crescerRoute = context.route === "crescer";
  const rawDisplayName = context.displayName || base.userName;
  const displayName = crescerRoute && rawDisplayName.includes("@") ? "Criança" : rawDisplayName;
  const firstName = displayName.split(" ")[0] || displayName;
  const schoolName = crescerRoute ? context.schoolName || "Escola não encontrada" : context.schoolName || base.school;
  const className = crescerRoute ? context.className || "Turma não encontrada" : context.className || base.className;
  const crescerIntro =
    context.className && context.schoolName
      ? `${context.className} · ${context.schoolName}`
      : "Não encontramos todos os dados da sua turma. Peça ajuda à escola.";

  return {
    ...base,
    userName: displayName,
    school: schoolName,
    className,
    homeTitle:
      context.route === "professor"
        ? `Olá, ${displayName}`
        : context.route === "crescer"
          ? `Olá, ${displayName}!`
          : `Olá, ${firstName}!`,
    homeIntro:
      context.route === "professor"
        ? `${context.schoolName || base.school} · rotina de hoje`
        : crescerRoute
          ? crescerIntro
        : base.homeIntro
  };
}

export async function listStudentCalendarEvents(pFrom: string, pTo: string): Promise<StudentCalendarEventRow[]> {
  const rows = await authenticatedRpc<StudentCalendarEventRow[]>("student_list_calendar_events", {
    p_from: pFrom,
    p_to: pTo
  });
  return Array.isArray(rows) ? rows : [];
}

export async function listNotificationCenter(): Promise<NotificationCenterRow[]> {
  const rows = await authenticatedRpc<NotificationCenterRow[]>("notification_get_center", {
    p_student_id: null,
    p_read_filter: "all",
    p_period_days: 90,
    p_limit: 80,
    p_offset: 0
  });
  return Array.isArray(rows) ? rows : [];
}

export async function markNotificationDeliveryRead(deliveryId: string, itemType = "notification") {
  if (!deliveryId) {
    throw new Error("Notificação não encontrada.");
  }

  await authenticatedRpc(itemType === "communication" ? "communication_mark_read" : "notification_mark_read", {
    p_delivery_id: deliveryId
  });
}

async function resolveAuthContext(session: AuthSession): Promise<AuthContext> {
  const user = session.user ?? (await getCurrentUser(session));
  if (!user?.id) {
    throw new Error("Não foi possível resolver o usuário autenticado.");
  }

  const profile = await getFirst<ProfileRow>(
    "profiles",
    `select=id,display_name,platform_role,status&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    session
  );

  const jwtPayload = decodeJwtPayload(session.access_token);
  const platformRole = normalizeRole(
    stringFrom(profile?.platform_role) ||
      metadataRole(user.app_metadata) ||
      metadataRole(jwtPayload?.app_metadata as Record<string, unknown> | undefined)
  );

  const baseContext: AuthContext = {
    userId: user.id,
    email: user.email,
    displayName: stringFrom(profile?.display_name) || metadataName(user.user_metadata) || user.email,
    platformRole,
    route: "institutional"
  };

  if (platformRole === "professor") {
    const teacher = await getFirst<TeacherRow>(
      "teachers",
      `select=id,school_id,full_name,disciplina,status&profile_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      session
    );
    const school = teacher?.school_id
      ? await getFirst<SchoolRow>("schools", `select=id,nome&id=eq.${encodeURIComponent(teacher.school_id)}&limit=1`, session)
      : null;

    return {
      ...baseContext,
      route: "professor",
      displayName: stringFrom(teacher?.full_name) || baseContext.displayName,
      teacherId: teacher?.id,
      schoolName: stringFrom(school?.nome)
    };
  }

  if (platformRole === "aluno" || platformRole === "educacao_infantil") {
    const student = await getFirst<StudentRow>(
      "students",
      `select=id,nome,school_id,class_id,turma,status&user_id=eq.${encodeURIComponent(user.id)}&limit=1`,
      session
    );
    const enrollment = student?.id
      ? await getFirst<EnrollmentRow>(
          "enrollments",
          `select=id,student_id,class_id,school_id,school_year,status,classes(id,nome,school_id,school_year,ano_escolar),schools(id,nome)&student_id=eq.${encodeURIComponent(student.id)}&status=eq.active&limit=1`,
          session
        )
      : null;
    const classId = stringFrom(enrollment?.class_id) || stringFrom(student?.class_id);
    const classRow = enrollment?.classes || (classId
      ? await getFirst<ClassRow>(
          "classes",
          `select=id,nome,school_id,school_year,ano_escolar&id=eq.${encodeURIComponent(classId)}&limit=1`,
          session
        )
      : null);
    const schoolId = stringFrom(enrollment?.school_id) || stringFrom(student?.school_id) || stringFrom(classRow?.school_id);
    const school = enrollment?.schools || (schoolId
      ? await getFirst<SchoolRow>("schools", `select=id,nome&id=eq.${encodeURIComponent(schoolId)}&limit=1`, session)
      : null);
    const className = stringFrom(classRow?.nome) || stringFrom(student?.turma);
    const route = platformRole === "educacao_infantil" || isEarlyChildhood(className, classRow, student) ? "crescer" : "fundamental";

    return {
      ...baseContext,
      route,
      displayName: stringFrom(student?.nome) || baseContext.displayName,
      studentId: student?.id,
      enrollmentId: enrollment?.id,
      enrollmentStatus: stringFrom(enrollment?.status),
      schoolId,
      schoolName: stringFrom(school?.nome),
      classId,
      className,
      studentContextStatus: student?.id && className && stringFrom(school?.nome) ? "ready" : "empty"
    };
  }

  return baseContext;
}

async function authenticatedRpc<T = unknown>(functionName: string, body: Record<string, unknown>): Promise<T> {
  const stored = readStoredSession();
  if (!stored?.access_token) {
    throw new Error("Entre novamente para continuar.");
  }

  const session = await refreshIfNeeded(stored);
  if (!session?.access_token) {
    clearStoredSession();
    throw new Error("Entre novamente para continuar.");
  }

  return authRequest<T>(
    `/rest/v1/rpc/${functionName}`,
    {
      method: "POST",
      body: JSON.stringify(body)
    },
    session
  );
}

async function refreshIfNeeded(session: AuthSession) {
  const expiresAt = session.expires_at ?? 0;
  const shouldRefresh = Boolean(session.refresh_token && expiresAt && expiresAt - Math.floor(Date.now() / 1000) < 120);
  if (!shouldRefresh) {
    return session;
  }

  try {
    const refreshed = await authRequest<AuthSession>("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    await saveSession(refreshed);
    return refreshed;
  } catch {
    return null;
  }
}

async function getCurrentUser(session: AuthSession): Promise<SupabaseUser> {
  const response = await authRequest<{ user?: SupabaseUser }>("/auth/v1/user", { method: "GET" }, session);
  return response.user ?? (response as SupabaseUser);
}

async function getFirst<T>(table: string, query: string, session: AuthSession): Promise<T | null> {
  try {
    const rows = await restRequest<T[]>(`/rest/v1/${table}?${query}`, session);
    return Array.isArray(rows) ? rows[0] ?? null : null;
  } catch {
    return null;
  }
}

async function authRequest<T = unknown>(path: string, init: RequestInit, session?: AuthSession): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    throw new Error(await friendlySupabaseError(response));
  }

  return (await response.json()) as T;
}

async function restRequest<T = unknown>(path: string, session: AuthSession): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(await friendlySupabaseError(response));
  }

  return (await response.json()) as T;
}

async function friendlySupabaseError(response: Response) {
  try {
    const payload = (await response.json()) as { error_description?: string; msg?: string; message?: string };
    return payload.error_description || payload.message || payload.msg || "Não foi possível entrar agora.";
  } catch {
    return "Não foi possível entrar agora.";
  }
}

async function saveSession(session: AuthSession) {
  const nextSession = {
    ...session,
    expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600)
  };
  writeStorage(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
}

function readStoredSession(): AuthSession | null {
  const value = readStorage(SESSION_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}

function clearStoredSession() {
  removeStorage(SESSION_STORAGE_KEY);
}

function readStorage(key: string) {
  try {
    return typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.setItem(key, value);
    }
  } catch {
    // Storage can be unavailable in private browser contexts.
  }
}

function removeStorage(key: string) {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      globalThis.localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in private browser contexts.
  }
}

function normalizeRole(role?: string) {
  const value = (role ?? "").toLowerCase().trim();
  if (["professor", "teacher", "docente"].includes(value)) return "professor";
  if (["aluno", "student", "estudante", "ensino_fundamental", "aluno_ensino_fundamental", "ensino_medio"].includes(value)) return "aluno";
  if (["educacao_infantil", "aluno_educacao_infantil", "aluno_infantil", "infantil", "early_childhood"].includes(value)) return "educacao_infantil";
  if (["familia", "responsavel", "guardian", "parent"].includes(value)) return "familia";
  if (value) return value;
  return "institutional";
}

function metadataRole(metadata?: Record<string, unknown>) {
  return stringFrom(metadata?.platform_role) || stringFrom(metadata?.role) || stringFrom(metadata?.perfil);
}

function metadataName(metadata?: Record<string, unknown>) {
  return stringFrom(metadata?.display_name) || stringFrom(metadata?.full_name) || stringFrom(metadata?.name);
}

function stringFrom(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function isEarlyChildhood(className?: string, classRow?: ClassRow | null, student?: StudentRow | null) {
  const probe = [className, classRow?.school_year, classRow?.ano_escolar, student?.turma].filter(Boolean).join(" ").toLowerCase();
  return /infantil|creche|pré|pre-escola|pre escola|maternal/.test(probe);
}

function decodeJwtPayload(token?: string) {
  if (!token) return null;
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    const decoded = globalThis.atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}
