#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const migrations = [
  "supabase/migrations/202607280002_question_bank.sql",
  "supabase/migrations/202607280003_question_bank_activation.sql",
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
};

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
`);
};

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
  const response = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/${table}${params}`, {
    ...options,
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${token || env.anonKey}`,
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

const countTable = async (table, token = env.anonKey) => {
  const response = await fetch(`${env.url.replace(/\/$/, "")}/rest/v1/${table}?select=*`, {
    method: "HEAD",
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${token || env.anonKey}`,
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
    await fn();
    return { label, ok: false, detail: "OPERACAO PERMITIDA INDEVIDAMENTE" };
  } catch (error) {
    return { label, ok: [401, 403, 404].includes(error.status), detail: error.message };
  }
};

const verify = async () => {
  const evidence = {
    environment: {
      supabaseUrlHost: env.url ? new URL(env.url).host : null,
      anonKeyProvided: Boolean(env.anonKey),
      dbUrlProvided: Boolean(env.dbUrl),
      serviceRoleInFrontend: false,
    },
    tables: {},
    demoQuestions: [],
    assessments: {},
    rls: [],
  };

  for (const table of requiredTables) {
    evidence.tables[table] = await countTable(table, env.tokens.admin || env.anonKey);
  }

  evidence.demoQuestions = await rest(
    "question_items",
    "?code=in.(RS-DEMO-LP2-001,RS-DEMO-MA2-001,RS-DEMO-LP5-001,RS-DEMO-MA5-001)&select=id,code,publication_status,curation_status,legal_classification&order=code.asc",
    env.tokens.admin || env.anonKey
  );

  if (env.tokens.professor) {
    const professorVisible = await rest("question_items", "?select=code,publication_status,curation_status&order=code.asc", env.tokens.professor);
    evidence.rls.push({
      label: "Professor visualiza apenas questoes liberadas pela RLS",
      ok: !professorVisible.some((item) => item.publication_status !== "PUBLICADO"),
      detail: professorVisible.map((item) => item.code),
    });

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
  }

  if (env.tokens.viewer) {
    evidence.rls.push(
      await expectBlocked("Visualizador nao cria avaliacao", () =>
        rest("assessments", "", env.tokens.viewer, {
          method: "POST",
          body: JSON.stringify({ title: "Tentativa visualizador", status: "RASCUNHO" }),
        })
      )
    );
  }

  if (env.tokens.professor) {
    const created = await rest("assessments", "", env.tokens.professor, {
      method: "POST",
      body: JSON.stringify({
        title: "SIMULADO DE HOMOLOGACAO - 5o ANO",
        component: "MATEMATICA",
        school_year: "5o ANO",
        instructions: "Leia com atencao e resolva as questoes.",
        status: "RASCUNHO",
      }),
    });
    const assessment = created[0];
    evidence.assessments.createdId = assessment.id;
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
    }
    const reopened = await rest(
      "assessments",
      `?id=eq.${assessment.id}&select=*,questions:assessment_questions(*,question:question_items(code))`,
      env.tokens.professor
    );
    evidence.assessments.reopenedQuestionOrder = reopened[0].questions
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.question.code);

    if (publishedQuestions.length >= 2) {
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
    evidence.assessments.reorderedQuestionOrder = reordered[0].questions
      .sort((a, b) => a.position - b.position)
      .map((entry) => entry.question.code);

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
  }

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
