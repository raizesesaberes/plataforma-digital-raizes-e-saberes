#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const lotPrefix = process.argv[2] || "LP2-L";
const inferredComponent = lotPrefix.startsWith("RS-MA2") ? "Matematica" : "Lingua Portuguesa";
const assessmentTitle =
  process.env.QUESTION_LOT_ASSESSMENT_TITLE ||
  (inferredComponent === "Matematica"
    ? "SIMULADO DEMONSTRATIVO — MATEMÁTICA — 2º ANO"
    : "SIMULADO DEMONSTRATIVO — LÍNGUA PORTUGUESA — 2º ANO");
const usageType =
  inferredComponent === "Matematica"
    ? "simulado_demonstrativo_mat2_lote_001"
    : "simulado_demonstrativo_lp2_lote_001";

const readLocalPublicConfig = () => {
  const configPath = resolve(root, "supabase-config.js");
  if (!existsSync(configPath)) return {};
  const source = readFileSync(configPath, "utf8");
  return {
    url: source.match(/url:\s*["']([^"']+)["']/)?.[1],
    anonKey: source.match(/anonKey:\s*["']([^"']+)["']/)?.[1],
  };
};

const config = readLocalPublicConfig();
const env = {
  url: process.env.SUPABASE_URL || config.url,
  anonKey: process.env.SUPABASE_ANON_KEY || config.anonKey,
  professorEmail: process.env.SUPABASE_TEST_EMAIL_PROFESSOR || process.env.SUPABASE_IMPORT_EMAIL,
  professorPassword: process.env.SUPABASE_TEST_PASSWORD_PROFESSOR || process.env.SUPABASE_IMPORT_PASSWORD,
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
  };
};

const authenticate = async () => {
  if (!env.url || !env.anonKey) throw new Error("Supabase URL/anon key nao configurados.");
  if (!env.professorEmail || !env.professorPassword) {
    throw new Error("Informe SUPABASE_TEST_EMAIL_PROFESSOR e SUPABASE_TEST_PASSWORD_PROFESSOR no ambiente local.");
  }
  const response = await fetch(`${env.url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: env.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: env.professorEmail, password: env.professorPassword }),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok || !body?.access_token) {
    throw new Error(`Falha ao autenticar professor: ${response.status} ${response.statusText}`);
  }
  return body.access_token;
};

const rest = async (table, params = "", token, options = {}) => {
  const response = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/${table}${params}`, {
    ...options,
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${token}`,
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
  if (!response.ok) throw new Error(`${table}: ${response.status} ${response.statusText} ${text}`);
  return { body, count: response.headers.get("content-range")?.split("/")?.[1] || null };
};

const main = async () => {
  const token = await authenticate();
  const profile = tokenSummary(token);
  if (profile.role !== "professor") throw new Error(`Perfil esperado professor, recebido: ${profile.role || "desconhecido"}`);

  const lotQuestions = await rest(
    "question_items",
    `?code=like.${encodeURIComponent(`${lotPrefix}*`)}&component=eq.${encodeURIComponent(inferredComponent)}&school_year=eq.2o%20ano&publication_status=eq.PUBLICADO&select=id,code,publication_status,curation_status&order=code.asc`,
    token
  );
  const selected = lotQuestions.body.slice(0, 10);
  if (selected.length < 10) throw new Error(`Menos de 10 questoes publicadas encontradas para ${lotPrefix}: ${selected.length}`);

  const created = await rest("assessments", "", token, {
    method: "POST",
    body: JSON.stringify({
      owner_user_id: profile.userId,
      owner_role: profile.role,
      title: assessmentTitle,
      component: inferredComponent,
      school_year: "2o ano",
      instructions: "Leia cada questao com atencao e marque apenas uma alternativa.",
      status: "RASCUNHO",
    }),
  });
  const assessment = created.body[0];

  for (const [index, question] of selected.entries()) {
    await rest("assessment_questions", "", token, {
      method: "POST",
      body: JSON.stringify({
        assessment_id: assessment.id,
        question_id: question.id,
        position: index + 1,
        points: 1,
        version_snapshot: question,
      }),
    });
    await rest("question_usage_logs", "", token, {
      method: "POST",
      body: JSON.stringify({
        question_id: question.id,
        assessment_id: assessment.id,
        user_id: profile.userId,
        user_role: profile.role,
        usage_type: usageType,
        metadata: { code: question.code, lot_prefix: lotPrefix },
      }),
    });
  }

  const reopened = await rest(
    "assessments",
    `?id=eq.${assessment.id}&select=id,title,component,school_year,questions:assessment_questions(position,question:question_items(code))`,
    token
  );
  const reopenedAssessment = reopened.body[0];
  const order = [...reopenedAssessment.questions].sort((a, b) => a.position - b.position).map((item) => item.question.code);
  const logs = await rest("question_usage_logs", `?assessment_id=eq.${assessment.id}&select=id,usage_type`, token);

  console.log(
    JSON.stringify(
      {
        authenticatedRole: profile.role,
        lotPrefix,
        component: inferredComponent,
        professorVisiblePublishedLotQuestions: lotQuestions.body.length,
        assessmentId: assessment.id,
        title: assessment.title,
        selectedCodes: selected.map((question) => question.code),
        persistedAfterReload: reopened.body.length === 1 && order.length === selected.length,
        recoveredOrder: order,
        usageLogsForAssessment: logs.body.length,
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
