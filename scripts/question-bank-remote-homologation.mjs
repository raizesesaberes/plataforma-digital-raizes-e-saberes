#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const migrations = [
  "supabase/migrations/202607280002_question_bank.sql",
  "supabase/migrations/202607280003_question_bank_activation.sql",
  "supabase/migrations/202607280004_question_bank_auth_roles.sql",
];
const seed = "data/question_bank/2026-07-28-question-bank-demo.seed.sql";
const requiredTables = [
  "question_licenses",
  "question_sources",
  "question_items",
  "question_alternatives",
  "question_distractor_analyses",
  "question_media",
  "question_curation_history",
  "assessments",
  "assessment_sections",
  "assessment_questions",
  "question_usage_logs",
];
const optionalTables = [
  // Pertence a supabase/migrations/202607280001_curation_pipeline.sql,
  // nao ao Banco de Questoes da Missao 01.2.
  "curation_batches",
];

const env = {
  url: process.env.SUPABASE_URL,
  anonKey: process.env.SUPABASE_ANON_KEY,
  dbUrl: process.env.SUPABASE_DB_URL || process.env.DATABASE_URL,
  tokens: {
    admin: process.env.SUPABASE_ACCESS_TOKEN_ADMIN,
    professor: process.env.SUPABASE_ACCESS_TOKEN_PROFESSOR,
    curator: process.env.SUPABASE_ACCESS_TOKEN_CURATOR,
    viewer: process.env.SUPABASE_ACCESS_TOKEN_VIEWER,
    aplicador: process.env.SUPABASE_ACCESS_TOKEN_APLICADOR,
  },
  credentials: {
    admin: {
      email: process.env.SUPABASE_TEST_EMAIL_ADMIN,
      password: process.env.SUPABASE_TEST_PASSWORD_ADMIN,
    },
    professor: {
      email: process.env.SUPABASE_TEST_EMAIL_PROFESSOR,
      password: process.env.SUPABASE_TEST_PASSWORD_PROFESSOR,
    },
    curator: {
      email: process.env.SUPABASE_TEST_EMAIL_CURATOR,
      password: process.env.SUPABASE_TEST_PASSWORD_CURATOR,
    },
    viewer: {
      email: process.env.SUPABASE_TEST_EMAIL_VIEWER,
      password: process.env.SUPABASE_TEST_PASSWORD_VIEWER,
    },
  },
};

const readLocalPublicConfig = () => {
  const configPath = resolve(root, "supabase-config.js");
  if (!existsSync(configPath)) return {};
  const source = readFileSync(configPath, "utf8");
  const url = source.match(/url:\s*["']([^"']+)["']/)?.[1];
  const anonKey = source.match(/anonKey:\s*["']([^"']+)["']/)?.[1];
  return { url, anonKey };
};

const localPublicConfig = readLocalPublicConfig();
env.url ||= localPublicConfig.url;
env.anonKey ||= localPublicConfig.anonKey;

const usage = () => {
  console.log(`Uso:
  node scripts/question-bank-remote-homologation.mjs verify
  node scripts/question-bank-remote-homologation.mjs apply
  node scripts/question-bank-remote-homologation.mjs all

Variaveis:
  SUPABASE_URL                    URL publica do projeto
  SUPABASE_ANON_KEY               anon key publica
  SUPABASE_DB_URL ou DATABASE_URL URL Postgres segura, somente ambiente local/CI
  SUPABASE_ACCESS_TOKEN_ADMIN     JWT de usuario admin para testes RLS
  SUPABASE_ACCESS_TOKEN_PROFESSOR JWT de professor para testes RLS
  SUPABASE_ACCESS_TOKEN_CURATOR   JWT de curador/revisor para testes RLS
  SUPABASE_ACCESS_TOKEN_VIEWER    JWT de visualizador/aplicador para testes RLS
  SUPABASE_TEST_EMAIL_ADMIN       E-mail local do usuario admin de homologacao
  SUPABASE_TEST_PASSWORD_ADMIN    Senha local do usuario admin de homologacao
  SUPABASE_TEST_EMAIL_PROFESSOR   E-mail local do usuario professor de homologacao
  SUPABASE_TEST_PASSWORD_PROFESSOR Senha local do usuario professor de homologacao
  SUPABASE_TEST_EMAIL_CURATOR     E-mail local do usuario curador de homologacao
  SUPABASE_TEST_PASSWORD_CURATOR  Senha local do usuario curador de homologacao
  SUPABASE_TEST_EMAIL_VIEWER      E-mail local do usuario visualizador de homologacao
  SUPABASE_TEST_PASSWORD_VIEWER   Senha local do usuario visualizador de homologacao
`);
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = String(token || "").split(".");
    if (!payload) return {};
    return JSON.parse(Buffer.from(payload.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString("utf8"));
  } catch {
    return {};
  }
};

const tokenSummary = (token) => {
  const payload = decodeJwtPayload(token);
  const appMetadata = payload.app_metadata || {};
  return {
    userId: payload.sub || null,
    role:
      appMetadata.question_bank_role ||
      appMetadata.app_role ||
      appMetadata.role ||
      payload.question_bank_role ||
      payload.app_role ||
      (payload.role === "service_role" ? "service_role" : "anonymous"),
    jwtRole: payload.role || null,
    hasUserMetadataAppRole: Boolean(payload.user_metadata?.app_role),
  };
};

const authToken = async (profile) => {
  if (env.tokens[profile]) return { token: env.tokens[profile], source: "env_token" };
  const credentials = env.credentials[profile];
  if (!credentials?.email || !credentials?.password) return null;
  const response = await fetch(`${env.url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
    }),
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = {};
  }
  if (!response.ok || !body?.access_token) {
    return {
      error: `${response.status} ${response.statusText}`,
      errorCode: body?.error_code || body?.code || body?.error || null,
      message: body?.msg || body?.message || null,
    };
  }
  return { token: body.access_token, source: "password_grant" };
};

const resolveTokens = async () => {
  const auth = {
    profiles: {},
    login: {},
  };
  for (const profile of ["admin", "professor", "curator", "viewer"]) {
    const result = await authToken(profile);
    if (!result) {
      auth.login[profile] = { ok: false, reason: "missing_local_credentials_or_token" };
      continue;
    }
    if (result.error) {
      auth.login[profile] = {
        ok: false,
        error: result.error,
        errorCode: result.errorCode,
        message: result.message,
      };
      continue;
    }
    env.tokens[profile] = result.token;
    const summary = tokenSummary(result.token);
    auth.login[profile] = { ok: true, source: result.source };
    auth.profiles[profile] = summary;
  }
  return auth;
};

const isExpectedRole = (actual, accepted) => accepted.includes(String(actual || "").toLowerCase());

const assertFile = (path) => {
  const absolute = resolve(root, path);
  if (!existsSync(absolute)) {
    throw new Error(`Arquivo nao encontrado: ${path}`);
  }
  return absolute;
};

const runPsqlFile = (path) => {
  const absolute = assertFile(path);
  if (!env.dbUrl) {
    throw new Error("SUPABASE_DB_URL ou DATABASE_URL nao informado. Nao e possivel aplicar SQL remoto.");
  }
  const result = spawnSync("psql", [env.dbUrl, "-v", "ON_ERROR_STOP=1", "-f", absolute], {
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.error?.code === "ENOENT") {
    throw new Error("psql nao encontrado no PATH. Instale PostgreSQL client ou execute os SQLs no painel Supabase.");
  }
  if (result.status !== 0) {
    throw new Error(`Falha ao executar ${path}\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
};

const rest = async (table, params = "", token = env.anonKey, options = {}) => {
  if (!env.url || !env.anonKey) {
    throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios para verificacao REST.");
  }
  const authHeaders = token && !String(token).startsWith("sb_") ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/${table}${params}`, {
    ...options,
    headers: {
      apikey: env.anonKey,
      ...authHeaders,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(`${response.status} ${response.statusText}: ${text}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
};

const restRaw = async (table, params = "", token = env.anonKey, options = {}) => {
  const authHeaders = token && !String(token).startsWith("sb_") ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/${table}${params}`, {
    ...options,
    headers: {
      apikey: env.anonKey,
      ...authHeaders,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation,count=exact",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {
    status: response.status,
    ok: response.ok,
    contentRange: response.headers.get("content-range"),
    count: response.headers.get("content-range")?.split("/")?.[1] || null,
    body,
  };
};

const countTable = async (table, token = env.anonKey) => {
  const authHeaders = token && !String(token).startsWith("sb_") ? { Authorization: `Bearer ${token}` } : {};
  const response = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/${table}?select=*`, {
    method: "HEAD",
    headers: {
      apikey: env.anonKey,
      ...authHeaders,
      Prefer: "count=exact",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table}: ${response.status} ${response.statusText} ${body}`);
  }
  return Number(response.headers.get("content-range")?.split("/")?.[1] || 0);
};

const expectBlocked = async (label, fn) => {
  try {
    const result = await fn();
    if (Array.isArray(result) && result.length === 0) {
      return {
        label,
        status: "BLOQUEOU — operacao proibida corretamente",
        ok: true,
        detail: "0 registros alterados",
      };
    }
    return {
      label,
      status: "FALHOU — comportamento inesperado",
      ok: false,
      detail: "OPERACAO PERMITIDA INDEVIDAMENTE",
    };
  } catch (error) {
    const ok = [401, 403, 404].includes(error.status);
    return {
      label,
      status: ok ? "BLOQUEOU — operacao proibida corretamente" : "FALHOU — comportamento inesperado",
      ok,
      detail: error.message,
    };
  }
};

const verify = async () => {
  if (!env.url || !env.anonKey) {
    throw new Error("SUPABASE_URL e SUPABASE_ANON_KEY nao informados. Nao e possivel homologar o Supabase remoto neste workspace.");
  }
  const authEvidence = await resolveTokens();
  const evidence = {
    environment: {
      supabaseUrlHost: env.url ? new URL(env.url).host : null,
      anonKeyProvided: Boolean(env.anonKey),
      dbUrlProvided: Boolean(env.dbUrl),
      serviceRoleInFrontend: false,
    },
    tables: {},
    tableHttp: {},
    optionalTables: {},
    demoQuestions: [],
    assessments: {},
    sources: {},
    licenses: {},
    history: {},
    usageLogs: {},
    rls: [],
    auth: authEvidence,
  };

  for (const table of requiredTables) {
    const raw = await restRaw(table, "?select=*&limit=1", env.tokens.admin || env.anonKey);
    evidence.tableHttp[table] = {
      status: raw.status,
      ok: raw.ok,
      contentRange: raw.contentRange,
      count: raw.count,
      errorCode: raw.ok ? null : raw.body?.code || null,
    };
    evidence.tables[table] = await countTable(table, env.tokens.admin || env.anonKey);
  }

  for (const table of optionalTables) {
    try {
      evidence.optionalTables[table] = await countTable(table, env.tokens.admin || env.anonKey);
    } catch (error) {
      evidence.optionalTables[table] = { optional: true, error: error.message };
    }
  }

  evidence.demoQuestions = await rest(
    "question_items",
    "?code=in.(RS-DEMO-LP2-001,RS-DEMO-MA2-001,RS-DEMO-LP5-001,RS-DEMO-MA5-001)&select=id,code,publication_status,curation_status,legal_classification&order=code.asc",
    env.tokens.admin || env.anonKey
  );

  evidence.auth.claimsRecognized = {
    admin: isExpectedRole(evidence.auth.profiles.admin?.role, ["admin", "administrador", "administrador_nacional"]),
    professor: isExpectedRole(evidence.auth.profiles.professor?.role, ["professor"]),
    curator: isExpectedRole(evidence.auth.profiles.curator?.role, ["curator", "curador", "revisor", "revisor_pedagogico"]),
    viewer: isExpectedRole(evidence.auth.profiles.viewer?.role, ["viewer", "visualizador", "aplicador"]),
  };

  evidence.rls.push(
    await expectBlocked("Anonimo nao cria avaliacao", () =>
      rest("assessments", "", env.anonKey, {
        method: "POST",
        body: JSON.stringify({ title: "Tentativa anonima", status: "RASCUNHO" }),
      })
    )
  );

  const missingProfiles = ["admin", "professor", "curator", "viewer"].filter((profile) => !env.tokens[profile]);
  if (missingProfiles.length) {
    evidence.auth.missingAuthenticatedProfiles = missingProfiles;
    evidence.auth.blocker =
      "Configure variaveis SUPABASE_TEST_EMAIL_* e SUPABASE_TEST_PASSWORD_* locais, ou SUPABASE_ACCESS_TOKEN_* locais, para homologar fluxos autenticados.";
  }

  if (env.tokens.admin) {
    const adminQuestions = await rest(
      "question_items",
      "?code=in.(RS-DEMO-LP2-001,RS-DEMO-MA2-001,RS-DEMO-LP5-001,RS-DEMO-MA5-001)&select=id,code,publication_status,curation_status&order=code.asc",
      env.tokens.admin
    );
    evidence.rls.push({
      label: "Admin visualiza quatro questoes incluindo nao publicada",
      status: adminQuestions.length === 4 && adminQuestions.some((item) => item.publication_status !== "PUBLICADO")
        ? "PASSOU — operacao permitida corretamente"
        : "FALHOU — comportamento inesperado",
      ok: adminQuestions.length === 4 && adminQuestions.some((item) => item.publication_status !== "PUBLICADO"),
      detail: adminQuestions.map((item) => `${item.code}:${item.publication_status}`),
    });
    const sources = await rest("question_sources", "?select=id,name,license:question_licenses(id,name)&order=name.asc", env.tokens.admin);
    const licenses = await rest("question_licenses", "?select=id,name,license_type,publication_allowed&order=name.asc", env.tokens.admin);
    const history = await rest("question_curation_history", "?select=id,question_id,actor_role,new_status,created_at&limit=20", env.tokens.admin);
    evidence.sources.adminVisible = sources.map((source) => ({ id: source.id, name: source.name, license: source.license?.name || null }));
    evidence.licenses.adminVisible = licenses.map((license) => ({ id: license.id, name: license.name, type: license.license_type }));
    evidence.history.adminCount = history.length;
  }

  if (env.tokens.curator) {
    const curatorQuestions = await rest(
      "question_items",
      "?code=in.(RS-DEMO-LP2-001,RS-DEMO-MA2-001,RS-DEMO-LP5-001,RS-DEMO-MA5-001)&select=id,code,publication_status,curation_status&order=code.asc",
      env.tokens.curator
    );
    evidence.rls.push({
      label: "Curador visualiza item nao publicado",
      status: curatorQuestions.length === 4 && curatorQuestions.some((item) => item.publication_status !== "PUBLICADO")
        ? "PASSOU — operacao permitida corretamente"
        : "FALHOU — comportamento inesperado",
      ok: curatorQuestions.length === 4 && curatorQuestions.some((item) => item.publication_status !== "PUBLICADO"),
      detail: curatorQuestions.map((item) => `${item.code}:${item.publication_status}`),
    });
    const unpublished = curatorQuestions.find((item) => item.code === "RS-DEMO-MA5-001");
    if (unpublished) {
      const [patched] = await rest("question_items", `?id=eq.${unpublished.id}`, env.tokens.curator, {
        method: "PATCH",
        body: JSON.stringify({ curation_status: unpublished.curation_status }),
      });
      evidence.rls.push({
        label: "Curador executa acao editorial permitida",
        status: patched?.id === unpublished.id
          ? "PASSOU — operacao permitida corretamente"
          : "FALHOU — comportamento inesperado",
        ok: patched?.id === unpublished.id,
        detail: patched?.code || unpublished.code,
      });
    }
    const curatorSources = await rest("question_sources", "?select=id,name,license:question_licenses(id,name)&order=name.asc", env.tokens.curator);
    const curatorHistory = await rest("question_curation_history", "?select=id,question_id,actor_role,new_status,created_at&limit=20", env.tokens.curator);
    evidence.sources.curatorVisibleCount = curatorSources.length;
    evidence.history.curatorCount = curatorHistory.length;
  }

  if (env.tokens.professor) {
    const professorVisible = await rest("question_items", "?select=code,publication_status,curation_status&order=code.asc", env.tokens.professor);
    evidence.rls.push({
      label: "Professor visualiza apenas questoes liberadas pela RLS",
      status: professorVisible.length === 3 && !professorVisible.some((item) => item.publication_status !== "PUBLICADO")
        ? "PASSOU — operacao permitida corretamente"
        : "FALHOU — comportamento inesperado",
      ok: professorVisible.length === 3 && !professorVisible.some((item) => item.publication_status !== "PUBLICADO"),
      detail: professorVisible.map((item) => item.code),
    });
    const professorSources = await rest("question_sources", "?select=id,name,license:question_licenses(id,name)&order=name.asc", env.tokens.professor);
    evidence.sources.professorVisible = professorSources.map((source) => ({ id: source.id, name: source.name, license: source.license?.name || null }));

    evidence.rls.push(
      await expectBlocked("Professor nao altera fonte", () =>
        rest("question_sources", "?name=eq.Raizes%20e%20Saberes%20-%20Banco%20Demonstrativo%20Ficticio", env.tokens.professor, {
          method: "PATCH",
          body: JSON.stringify({ notes: "tentativa bloqueada" }),
        })
      )
    );

    evidence.rls.push(
      await expectBlocked("Professor nao publica questao", () =>
        rest("question_items", "?code=eq.RS-DEMO-MA5-001", env.tokens.professor, {
          method: "PATCH",
          body: JSON.stringify({ publication_status: "PUBLICADO" }),
        })
      )
    );
    evidence.rls.push(
      await expectBlocked("Professor nao altera licenca", () =>
        rest("question_licenses", "?name=eq.Uso%20interno%20demonstrativo%20Raizes%20e%20Saberes", env.tokens.professor, {
          method: "PATCH",
          body: JSON.stringify({ legal_notes: "tentativa bloqueada" }),
        })
      )
    );
    const professorUnpublished = await rest(
      "question_items",
      "?code=eq.RS-DEMO-MA5-001&select=id,code,publication_status",
      env.tokens.professor
    );
    evidence.rls.push({
      label: "Professor nao visualiza item nao publicado",
      status: professorUnpublished.length === 0
        ? "BLOQUEOU — operacao proibida corretamente"
        : "FALHOU — comportamento inesperado",
      ok: professorUnpublished.length === 0,
      detail: `${professorUnpublished.length} registros visiveis`,
    });
  }

  if (env.tokens.viewer) {
    const viewerVisible = await rest("question_items", "?select=code,publication_status&order=code.asc", env.tokens.viewer);
    evidence.rls.push({
      label: "Visualizador acessa somente leitura permitida",
      status: viewerVisible.length === 3 && !viewerVisible.some((item) => item.publication_status !== "PUBLICADO")
        ? "PASSOU — operacao permitida corretamente"
        : "FALHOU — comportamento inesperado",
      ok: viewerVisible.length === 3 && !viewerVisible.some((item) => item.publication_status !== "PUBLICADO"),
      detail: viewerVisible.map((item) => item.code),
    });
    evidence.rls.push(
      await expectBlocked("Visualizador nao cria avaliacao", () =>
        rest("assessments", "", env.tokens.viewer, {
          method: "POST",
          body: JSON.stringify({ title: "Tentativa visualizador", status: "RASCUNHO" }),
        })
      )
    );
    evidence.rls.push(
      await expectBlocked("Visualizador nao edita questao", () =>
        rest("question_items", "?code=eq.RS-DEMO-LP5-001", env.tokens.viewer, {
          method: "PATCH",
          body: JSON.stringify({ reviewer_name: "tentativa bloqueada" }),
        })
      )
    );
  }

  if (env.tokens.professor) {
    const created = await rest("assessments", "", env.tokens.professor, {
      method: "POST",
      body: JSON.stringify({
        owner_user_id: evidence.auth.profiles.professor?.userId,
        owner_role: evidence.auth.profiles.professor?.role || "professor",
        title: "SIMULADO DE HOMOLOGACAO — 5º ANO",
        component: "MATEMATICA",
        school_year: "5o ANO",
        instructions: "Leia com atencao e resolva as questoes.",
        status: "RASCUNHO",
      }),
    });
    const assessment = created[0];
    evidence.assessments.createdId = assessment.id;
    evidence.assessments.title = assessment.title;
    const publishedQuestions = await rest(
      "question_items",
      "?code=in.(RS-DEMO-MA2-001,RS-DEMO-LP5-001)&select=id,code,publication_status,curation_status",
      env.tokens.professor
    );
    for (const [index, question] of publishedQuestions.entries()) {
      await rest("assessment_questions", "", env.tokens.professor, {
        method: "POST",
        body: JSON.stringify({
          assessment_id: assessment.id,
          question_id: question.id,
          position: index + 1,
          points: 1,
          version_snapshot: question,
        }),
      });
      await rest("question_usage_logs", "", env.tokens.professor, {
        method: "POST",
        body: JSON.stringify({
          question_id: question.id,
          assessment_id: assessment.id,
          user_id: evidence.auth.profiles.professor?.userId,
          user_role: evidence.auth.profiles.professor?.role,
          usage_type: index === 0 ? "criacao_avaliacao_homologacao" : "uso_questao_homologacao",
          metadata: { script: "question-bank-remote-homologation", phase: "create" },
        }),
      });
    }
    const reopened = await rest(
      "assessments",
      `?id=eq.${assessment.id}&select=*,questions:assessment_questions(*,question:question_items(code))`,
      env.tokens.professor
    );
    evidence.assessments.persistedAfterReload = reopened.length === 1 && reopened[0].questions.length === 2;
    evidence.assessments.reopenedQuestionOrder = reopened[0].questions
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.question.code);

    if (publishedQuestions.length >= 2) {
      await rest(
        "assessment_questions",
        `?assessment_id=eq.${assessment.id}&question_id=eq.${publishedQuestions[0].id}`,
        env.tokens.professor,
        { method: "PATCH", body: JSON.stringify({ position: 101 }) }
      );
      await rest(
        "assessment_questions",
        `?assessment_id=eq.${assessment.id}&question_id=eq.${publishedQuestions[1].id}`,
        env.tokens.professor,
        { method: "PATCH", body: JSON.stringify({ position: 102 }) }
      );
      await rest(
        "assessment_questions",
        `?assessment_id=eq.${assessment.id}&question_id=eq.${publishedQuestions[0].id}`,
        env.tokens.professor,
        { method: "PATCH", body: JSON.stringify({ position: 2 }) }
      );
      await rest(
        "assessment_questions",
        `?assessment_id=eq.${assessment.id}&question_id=eq.${publishedQuestions[1].id}`,
        env.tokens.professor,
        { method: "PATCH", body: JSON.stringify({ position: 1 }) }
      );
    }
    const reordered = await rest(
      "assessments",
      `?id=eq.${assessment.id}&select=*,questions:assessment_questions(*,question:question_items(code))`,
      env.tokens.professor
    );
    evidence.assessments.reordered = true;
    evidence.assessments.reorderedQuestionOrder = reordered[0].questions
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.question.code);

    await rest(
      "assessment_questions",
      `?assessment_id=eq.${assessment.id}&question_id=eq.${publishedQuestions[0].id}`,
      env.tokens.professor,
      { method: "DELETE", prefer: "return=minimal" }
    );
    const afterRemoval = await rest(
      "assessments",
      `?id=eq.${assessment.id}&select=*,questions:assessment_questions(*,question:question_items(code))`,
      env.tokens.professor
    );
    evidence.assessments.removalValidated = afterRemoval[0].questions.length === 1;

    const [duplicate] = await rest("assessments", "", env.tokens.professor, {
      method: "POST",
      body: JSON.stringify({
        owner_user_id: evidence.auth.profiles.professor?.userId,
        owner_role: evidence.auth.profiles.professor?.role || "professor",
        title: `${assessment.title} - copia`,
        component: assessment.component,
        school_year: assessment.school_year,
        instructions: assessment.instructions,
        status: "RASCUNHO",
        duplicated_from_id: assessment.id,
      }),
    });
    for (const [index, item] of afterRemoval[0].questions.entries()) {
      await rest("assessment_questions", "", env.tokens.professor, {
        method: "POST",
        body: JSON.stringify({
          assessment_id: duplicate.id,
          question_id: item.question_id,
          position: index + 1,
          points: item.points,
          version_snapshot: item.version_snapshot || {},
        }),
      });
    }
    evidence.assessments.duplicatedId = duplicate.id;
    await rest("question_usage_logs", "", env.tokens.professor, {
      method: "POST",
      body: JSON.stringify({
        question_id: afterRemoval[0].questions[0].question_id,
        assessment_id: duplicate.id,
        user_id: evidence.auth.profiles.professor?.userId,
        user_role: evidence.auth.profiles.professor?.role,
        usage_type: "duplicacao_avaliacao_homologacao",
        metadata: { source_assessment_id: assessment.id },
      }),
    });
    const [archived] = await rest("assessments", `?id=eq.${duplicate.id}`, env.tokens.professor, {
      method: "PATCH",
      body: JSON.stringify({ status: "ARQUIVADA", archived_at: new Date().toISOString() }),
    });
    evidence.assessments.archivedId = archived.id;
    evidence.assessments.archiveValidated = archived.status === "ARQUIVADA";
    await rest("question_usage_logs", "", env.tokens.professor, {
      method: "POST",
      body: JSON.stringify({
        question_id: afterRemoval[0].questions[0].question_id,
        assessment_id: duplicate.id,
        user_id: evidence.auth.profiles.professor?.userId,
        user_role: evidence.auth.profiles.professor?.role,
        usage_type: "arquivamento_avaliacao_homologacao",
        metadata: { archived_assessment_id: duplicate.id },
      }),
    });

    evidence.rls.push(
      await expectBlocked("Professor nao adiciona questao nao publicada", () =>
        rest("assessment_questions", "", env.tokens.professor, {
          method: "POST",
          body: JSON.stringify({
            assessment_id: assessment.id,
            question_id: evidence.demoQuestions.find((item) => item.code === "RS-DEMO-MA5-001")?.id,
            position: 3,
            points: 1,
          }),
        })
      )
    );

    const logs = await rest(
      "question_usage_logs",
      `?assessment_id=in.(${assessment.id},${duplicate.id})&select=id,usage_type,assessment_id,user_role&order=used_at.asc`,
      env.tokens.professor
    );
    evidence.usageLogs.professorCount = logs.length;
    evidence.usageLogs.types = logs.map((log) => log.usage_type);
  }

  if (env.tokens.admin) {
    const adminLogs = await rest("question_usage_logs", "?select=id,usage_type,user_role&limit=50", env.tokens.admin);
    evidence.usageLogs.adminReadableCount = adminLogs.length;
  }

  for (const profile of Object.keys(env.tokens)) {
    env.tokens[profile] = undefined;
  }

  evidence.finalStatus = {
    allProfilesAuthenticated: missingProfiles.length === 0,
    allClaimsRecognized: Object.values(evidence.auth.claimsRecognized).every(Boolean),
    rlsPassed: evidence.rls.every((entry) => entry.ok),
    assessmentFlowPassed: Boolean(
      evidence.assessments.createdId &&
        evidence.assessments.persistedAfterReload &&
        evidence.assessments.removalValidated &&
        evidence.assessments.archiveValidated
    ),
    logsPassed: Number(evidence.usageLogs.professorCount || 0) >= 4,
    classification:
      missingProfiles.length === 0 &&
      Object.values(evidence.auth.claimsRecognized).every(Boolean) &&
      evidence.rls.every((entry) => entry.ok) &&
      evidence.assessments.createdId &&
      evidence.assessments.persistedAfterReload &&
      evidence.assessments.removalValidated &&
      evidence.assessments.archiveValidated &&
      Number(evidence.usageLogs.professorCount || 0) >= 4
        ? "A. CONCLUIDA E HOMOLOGADA NO SUPABASE REMOTO."
        : "C. PARCIALMENTE CONCLUIDA, COM PENDENCIAS TECNICAS.",
  };

  console.log(JSON.stringify(evidence, null, 2));
};

const apply = () => {
  for (const migration of migrations) {
    console.log(`Aplicando ${migration}...`);
    runPsqlFile(migration);
  }
  console.log(`Executando seed ${seed}...`);
  runPsqlFile(seed);
  console.log("SQL aplicado sem erros pelo psql.");
};

const command = process.argv[2] || "verify";
try {
  for (const path of [...migrations, seed]) assertFile(path);
  if (command === "help" || command === "--help" || command === "-h") usage();
  else if (command === "apply") apply();
  else if (command === "verify") await verify();
  else if (command === "all") {
    apply();
    await verify();
  } else {
    usage();
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
