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
  display_name?: string | null;
  platform_role?: string | null;
  status?: string | null;
};

type StudentContextRow = {
  student_id?: string | null;
  student_name?: string | null;
  segment?: string | null;
  school_id?: string | null;
  school_name?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  school_year?: string | null;
  age_group?: string | null;
  role?: string | null;
};

type TeacherContextRow = {
  teacher_id?: string | null;
  teacher_name?: string | null;
  school_id?: string | null;
  school_name?: string | null;
  role?: string | null;
  discipline?: string | null;
  active_class_links?: number | null;
};

export type AuthContext = {
  userId: string;
  email?: string;
  displayName?: string;
  platformRole?: string;
  route: MobileRoute;
  segment?: "EDUCACAO_INFANTIL" | "ENSINO_FUNDAMENTAL" | "ENSINO_MEDIO";
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  studentId?: string;
  teacherId?: string;
  activeClassLinks?: number;
};

type PublicSupabaseConfig = {
  url?: string;
  anonKey?: string;
};

const runtimeEnv = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
const globalSupabaseConfig = (globalThis as unknown as { RAIZES_SUPABASE?: PublicSupabaseConfig }).RAIZES_SUPABASE ?? {};
const SUPABASE_URL = normalizeSupabaseUrl(runtimeEnv.EXPO_PUBLIC_SUPABASE_URL || globalSupabaseConfig.url);
const SUPABASE_ANON_KEY = runtimeEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY || globalSupabaseConfig.anonKey || "";
const SESSION_STORAGE_KEY = "raizes:mobile:supabase-auth-session";

export function hasSupabaseClientConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.toLowerCase().includes("service_role"));
}

export async function signInWithPassword(email: string, password: string): Promise<AuthContext> {
  const trimmedEmail = email.trim().toLowerCase();
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
  const trimmedEmail = email.trim().toLowerCase();
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
      await authRequest("/auth/v1/logout", { method: "POST" }, session);
    } catch {
      // Local cleanup still matters when the remote token has already expired.
    }
  }

  clearStoredSession();
}

export function profileForAuthContext(context: AuthContext): DemoProfile | null {
  if (context.route === "institutional") {
    return null;
  }

  const base = demoProfiles[context.route];
  const displayName = context.displayName || base.userName;
  const firstName = displayName.split(" ")[0] || displayName;

  return {
    ...base,
    userName: displayName,
    school: context.schoolName || base.school,
    className: context.className || base.className,
    homeTitle:
      context.route === "professor"
        ? `Olá, ${displayName}`
        : context.route === "crescer"
          ? `Olá, ${firstName}!`
          : `Olá, ${firstName}!`,
    homeIntro:
      context.route === "professor"
        ? `${context.schoolName || base.school} · rotina de hoje`
        : context.route === "crescer" && context.className && context.schoolName
          ? `${context.className} · ${context.schoolName}`
          : base.homeIntro
  };
}

async function resolveAuthContext(session: AuthSession): Promise<AuthContext> {
  const user = session.user ?? (await getCurrentUser(session));
  if (!user?.id) {
    throw new Error("Não foi possível resolver o usuário autenticado.");
  }

  const profile = await getFirst<ProfileRow>(
    "profiles",
    `select=display_name,platform_role,status&id=eq.${encodeURIComponent(user.id)}&limit=1`,
    session
  );
  if (profile?.status && normalizeRole(profile.status) !== "active") {
    throw new Error("Perfil inativo. Peça ajuda à escola.");
  }

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
    const rows = await rpc<TeacherContextRow[]>(session, "teacher_get_context", {});
    const teacher = rows[0];
    if (!teacher?.teacher_id) {
      throw new Error("Não encontramos o contexto do professor.");
    }

    return {
      ...baseContext,
      route: "professor",
      displayName: stringFrom(teacher.teacher_name) || baseContext.displayName,
      schoolId: stringFrom(teacher.school_id),
      schoolName: stringFrom(teacher.school_name),
      teacherId: stringFrom(teacher.teacher_id),
      activeClassLinks: Math.max(0, teacher.active_class_links || 0)
    };
  }

  if (platformRole === "aluno" || platformRole === "educacao_infantil") {
    const rows = await rpc<StudentContextRow[]>(session, "student_get_context", {});
    const student = rows[0];
    if (!student?.student_id) {
      throw new Error("Não encontramos o contexto do estudante.");
    }

    const segment = resolveStudentSegment(platformRole, student);
    return {
      ...baseContext,
      route: segment === "EDUCACAO_INFANTIL" ? "crescer" : "fundamental",
      segment,
      displayName: stringFrom(student.student_name) || baseContext.displayName,
      schoolId: stringFrom(student.school_id),
      schoolName: stringFrom(student.school_name),
      classId: stringFrom(student.class_id),
      className: stringFrom(student.class_name),
      studentId: stringFrom(student.student_id)
    };
  }

  return baseContext;
}

function resolveStudentSegment(platformRole: string, student: StudentContextRow): AuthContext["segment"] {
  if (platformRole === "educacao_infantil") {
    return "EDUCACAO_INFANTIL";
  }

  const explicitSegment = normalizeSegment(student.segment);
  if (explicitSegment) {
    return explicitSegment;
  }

  const probe = [student.school_year, student.age_group, student.class_name].filter(Boolean).join(" ").toLowerCase();
  if (/infantil|creche|pré|pre-escola|pre escola|maternal/.test(probe)) {
    return "EDUCACAO_INFANTIL";
  }
  if (/médio|medio/.test(probe)) {
    return "ENSINO_MEDIO";
  }
  return "ENSINO_FUNDAMENTAL";
}

async function getCurrentUser(session: AuthSession): Promise<SupabaseUser> {
  const response = await authRequest<{ user?: SupabaseUser }>("/auth/v1/user", { method: "GET" }, session);
  return response.user ?? (response as SupabaseUser);
}

async function getFirst<T>(table: string, query: string, session: AuthSession): Promise<T | null> {
  const rows = await restRequest<T[]>(`/rest/v1/${table}?${query}`, session);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function rpc<T>(session: AuthSession, functionName: string, body: Record<string, unknown>): Promise<T> {
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

function normalizeRole(role?: string | null) {
  const value = (role ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (["professor", "teacher", "docente"].includes(value)) return "professor";
  if (["aluno", "student", "estudante", "ensino_fundamental", "aluno_ensino_fundamental", "ensino_medio"].includes(value)) return "aluno";
  if (["educacao_infantil", "aluno_educacao_infantil", "aluno_infantil", "infantil", "early_childhood"].includes(value)) return "educacao_infantil";
  if (value) return value;
  return "institutional";
}

function normalizeSegment(segment?: string | null): AuthContext["segment"] | null {
  const value = (segment ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  if (["educacao_infantil", "infantil", "early_childhood"].includes(value)) return "EDUCACAO_INFANTIL";
  if (["ensino_fundamental", "fundamental"].includes(value)) return "ENSINO_FUNDAMENTAL";
  if (["ensino_medio", "medio"].includes(value)) return "ENSINO_MEDIO";
  return null;
}

function normalizeSupabaseUrl(url?: string) {
  return (url || "").trim().replace(/\/$/, "");
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
