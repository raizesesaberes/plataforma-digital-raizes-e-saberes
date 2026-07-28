#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const root = process.cwd();
const inputPaths = process.argv.slice(2);

const sourceName = "Raizes e Saberes - Banco Demonstrativo Ficticio";
const licenseName = "Uso interno demonstrativo Raizes e Saberes";
const authorName = "Equipe Pedagogica Raizes e Saberes";

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
  token: process.env.SUPABASE_IMPORT_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN_CURATOR || process.env.SUPABASE_ACCESS_TOKEN_ADMIN,
  email: process.env.SUPABASE_IMPORT_EMAIL || process.env.SUPABASE_TEST_EMAIL_CURATOR || process.env.SUPABASE_TEST_EMAIL_ADMIN,
  password: process.env.SUPABASE_IMPORT_PASSWORD || process.env.SUPABASE_TEST_PASSWORD_CURATOR || process.env.SUPABASE_TEST_PASSWORD_ADMIN,
};

const normalize = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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
  if (env.token) return env.token;
  if (!env.email || !env.password) {
    throw new Error("Informe SUPABASE_IMPORT_EMAIL/SUPABASE_IMPORT_PASSWORD ou SUPABASE_IMPORT_ACCESS_TOKEN no ambiente local.");
  }
  const response = await fetch(`${env.url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: env.email, password: env.password }),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok || !body?.access_token) {
    throw new Error(`Falha ao autenticar usuario de importacao: ${response.status} ${response.statusText}`);
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
      Prefer: options.prefer || "return=representation",
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
  if (!response.ok) {
    const error = new Error(`${table}: ${response.status} ${response.statusText} ${text}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
};

const secondsToMinutes = (seconds) => Math.max(1, Math.ceil(Number(seconds || 60) / 60));

const mapDifficulty = (value) => {
  const clean = normalize(value);
  if (clean === "facil") return "Facil";
  if (clean === "media") return "Media";
  if (clean === "dificil") return "Dificil";
  return value || "Nao informada";
};

const normalizeComponent = (value) => (normalize(value).includes("matematica") ? "Matematica" : "Lingua Portuguesa");

const normalizeYear = (value) => {
  if (Number(value) === 2 || normalize(value).startsWith("2")) return "2o ano";
  return String(value || "");
};

const defaultCode = (item) => {
  if (item.codigo) return item.codigo;
  const component = normalizeComponent(item.disciplina);
  if (component === "Matematica" && Number.isFinite(Number(item.id))) {
    return `RS-MA2-${String(item.id).padStart(3, "0")}`;
  }
  return null;
};

const normalizeAlternatives = (item) => {
  if (Array.isArray(item.alternativas)) {
    return item.alternativas.map((alternative, index) => ({
      id: alternative.id || String.fromCharCode(65 + index),
      texto: alternative.texto,
    }));
  }
  if (item.alternativas && typeof item.alternativas === "object") {
    return Object.entries(item.alternativas).map(([id, texto]) => ({ id, texto }));
  }
  return [];
};

const normalizeItem = (item) => {
  const component = normalizeComponent(item.disciplina);
  const code = defaultCode(item);
  const correctAnswer = item.resposta_correta || item.correta;
  const alternatives = normalizeAlternatives(item);
  const correctText = alternatives.find((alternative) => alternative.id === correctAnswer)?.texto;
  return {
    ...item,
    code,
    originalCode: item.codigo || item.id,
    component,
    schoolYear: normalizeYear(item.ano),
    thematicUnit: item.eixo || item.bloco || component,
    knowledgeObject:
      Array.isArray(item.tags) && item.tags.length
        ? item.tags.join(", ")
        : item.bloco || item.eixo || (component === "Matematica" ? "Matematica - 2o ano" : "Leitura e escrita"),
    alternatives,
    correctAnswer,
    explanation: item.explicacao || (correctText ? `A alternativa ${correctAnswer} esta correta: ${correctText}.` : ""),
    estimatedSeconds: item.tempo_estimado_segundos || 60,
    reportTag: component === "Matematica" ? "MAT" : "LP",
    codeWasGenerated: !item.codigo && Boolean(code),
  };
};

const getReportPath = (rows) => {
  const component = rows[0]?.normalized.component;
  return component === "Matematica"
    ? "docs/RELATORIO-VALIDACAO-LOTE-001-MAT-2ANO.md"
    : "docs/RELATORIO-VALIDACAO-LOTE-001-LP-2ANO.md";
};

const mapQuestion = (normalized, sourceId, licenseId, status) => ({
  code: normalized.code,
  internal_title: `${normalized.thematicUnit} - ${normalized.code}`,
  component: normalized.component,
  stage: "Ensino Fundamental - Anos Iniciais",
  school_year: normalized.schoolYear,
  thematic_unit: normalized.thematicUnit,
  knowledge_object: normalized.knowledgeObject,
  bncc_skill: normalized.habilidade_bncc,
  reference_matrix: normalized.tags?.length ? `Descritores internos: ${normalized.tags.join(", ")}` : "Referencia SAEB nao informada no JSON",
  proficiency_level: "Basico",
  difficulty: mapDifficulty(normalized.dificuldade),
  cognitive_process: normalized.thematicUnit,
  question_type: normalized.tipo === "multipla_escolha" ? "Multipla escolha" : normalized.tipo || "Multipla escolha",
  statement: normalized.enunciado,
  base_text: normalized.texto_base || null,
  correct_answer: normalized.correctAnswer,
  justification: normalized.explanation,
  success_feedback: "Resposta correta.",
  error_feedback: "Releia o enunciado e compare as alternativas.",
  recommended_intervention: `Retomar ${String(normalized.thematicUnit || "a habilidade trabalhada").toLowerCase()} com exemplos curtos e mediacao oral.`,
  estimated_minutes: secondsToMinutes(normalized.estimatedSeconds),
  accessibility_notes: normalized.texto_base ? "Texto-base curto adequado para leitura mediada no 2o ano." : "Item sem texto-base, adequado para leitura mediada no 2o ano.",
  source_id: sourceId,
  author_name: authorName,
  license_id: licenseId,
  legal_classification: "ITEM_AUTORAL_RAIZES_SABERES_ALINHADO_SAEB",
  curation_status: status.approved ? "HOMOLOGADO" : "CORRECAO_SOLICITADA",
  publication_status: status.approved ? "PUBLICADO" : "NAO_PUBLICADO",
  version: "1.0",
  reviewer_name: "Importacao automatizada homologada",
  last_reviewed_at: new Date().toISOString(),
  published_at: status.approved ? new Date().toISOString() : null,
});

const validateQuestion = (normalized, seenCodes) => {
  const errors = [];
  if (!normalized.code) errors.push("codigo ausente");
  if (seenCodes.has(normalized.code)) errors.push("codigo duplicado no lote");
  if (normalized.schoolYear !== "2o ano") errors.push("ano diferente de 2");
  if (!["Lingua Portuguesa", "Matematica"].includes(normalized.component)) errors.push("componente desconhecido");
  if (!normalized.enunciado) errors.push("enunciado ausente");
  if (!normalized.habilidade_bncc) errors.push("habilidade BNCC ausente");
  if (!normalized.knowledgeObject) errors.push("objeto de conhecimento ausente");
  if (!normalized.thematicUnit) errors.push("unidade tematica ausente");
  if (!normalized.dificuldade) errors.push("dificuldade ausente");
  if (!normalized.explanation) errors.push("justificativa/explicacao ausente");
  if (!Array.isArray(normalized.alternatives) || normalized.alternatives.length !== 4) errors.push("alternativas diferentes de 4");
  if (Array.isArray(normalized.alternatives)) {
    const labels = normalized.alternatives.map((alternative) => alternative.id);
    if (new Set(labels).size !== labels.length) errors.push("alternativas com ids duplicados");
    if (normalized.alternatives.some((alternative) => !alternative.id || !String(alternative.texto || "").trim())) errors.push("alternativa vazia");
    if (!normalized.alternatives.some((alternative) => alternative.id === normalized.correctAnswer)) errors.push("gabarito sem alternativa correspondente");
  }
  return {
    approved: errors.length === 0,
    errors,
    category: errors.length === 0 ? "aprovada" : "rejeitada",
  };
};

const loadQuestions = () => {
  if (!inputPaths.length) {
    throw new Error("Uso: node scripts/import-question-bank-json.mjs CAMINHO_DO_ARQUIVO_JSON [...outros.json]");
  }
  return inputPaths.flatMap((path) => {
    const absolute = resolve(root, path);
    if (!existsSync(absolute)) throw new Error(`Arquivo nao encontrado: ${path}`);
    const parsed = JSON.parse(readFileSync(absolute, "utf8"));
    if (!Array.isArray(parsed)) throw new Error(`JSON precisa ser uma lista: ${path}`);
    return parsed.map((item) => ({ ...item, __file: absolute }));
  });
};

const writeReport = ({ rows, summary, sourceFiles, reportPath }) => {
  const approved = rows.filter((row) => row.validation.approved);
  const rejected = rows.filter((row) => !row.validation.approved);
  const component = rows[0]?.normalized.component || "Banco de Questoes";
  const tag = component === "Matematica" ? "MAT" : "LP";
  const lines = [
    `# Relatorio de Validacao - Lote 001 ${tag} 2o Ano`,
    "",
    `Gerado em: ${new Date().toISOString()}`,
    "",
    "## Arquivos",
    ...sourceFiles.map((file) => `- ${file}`),
    "",
    "## Resumo",
    `- Total real de registros: ${rows.length}`,
    `- Aprovadas: ${approved.length}`,
    `- Aprovadas com ajuste tecnico: ${summary.technicalAdjustments}`,
    `- Rejeitadas: ${rejected.length}`,
    `- Duplicadas: ${summary.duplicates.length}`,
    `- Incompletas: ${summary.incomplete.length}`,
    "",
    "## Ajustes Tecnicos Aplicados",
    `- \`disciplina\` mapeada para \`component = ${component}\`.`,
    "- `ano` mapeado para `school_year = 2o ano`.",
    "- tempo estimado ausente ou em segundos convertido para `estimated_minutes` com minimo de 1 minuto.",
    "- `tags`, `eixo` ou `bloco` preservados em `thematic_unit`, `knowledge_object` e `reference_matrix` quando disponiveis.",
    "- Codigos ausentes foram padronizados somente quando necessario: `RS-MA2-001...`.",
    "- Justificativa ausente foi preenchida apenas com base no gabarito e no texto da alternativa correta.",
    "- Fonte, autoria, licenca e classificacao juridica autoral padronizadas para Raizes e Saberes.",
    "",
    "## Aprovadas",
    ...approved.map((row) => `- ${row.normalized.code} (${row.normalized.habilidade_bncc}, ${row.normalized.dificuldade})`),
    "",
    "## Rejeitadas",
    ...(rejected.length ? rejected.map((row) => `- ${row.normalized.code || row.normalized.originalCode}: ${row.validation.errors.join("; ")}`) : ["- Nenhuma."]),
    "",
    "## Duplicadas",
    ...(summary.duplicates.length ? summary.duplicates.map((code) => `- ${code}`) : ["- Nenhuma."]),
    "",
    "## Incompletas",
    ...(summary.incomplete.length ? summary.incomplete.map((code) => `- ${code}`) : ["- Nenhuma."]),
    "",
    "## Mapeamento de Codigos",
    ...rows
      .filter((row) => row.normalized.codeWasGenerated)
      .map((row) => `- ${row.normalized.originalCode} -> ${row.normalized.code}`),
  ];
  writeFileSync(reportPath, `${lines.join("\n")}\n`);
};

const main = async () => {
  if (!env.url || !env.anonKey) throw new Error("Supabase URL/anon key nao configurados.");
  const items = loadQuestions();
  const seenCodes = new Set();
  const duplicates = [];
  const rows = items.map((item) => {
    const normalized = normalizeItem(item);
    const validation = validateQuestion(normalized, seenCodes);
    if (seenCodes.has(normalized.code)) duplicates.push(normalized.code);
    if (normalized.code) seenCodes.add(normalized.code);
    return { item, normalized, validation };
  });
  const incomplete = rows
    .filter((row) => row.validation.errors.some((error) => /ausente|vazia|gabarito/.test(error)))
    .map((row) => row.normalized.code || row.normalized.originalCode);
  const reportPath = getReportPath(rows);
  const summary = {
    total: rows.length,
    approved: rows.filter((row) => row.validation.approved).length,
    rejected: rows.filter((row) => !row.validation.approved).length,
    duplicates,
    incomplete,
    technicalAdjustments: rows.length,
    inserted: 0,
    updated: 0,
    alternativesImported: 0,
    distractorsImported: 0,
    historyInserted: 0,
  };
  writeReport({ rows, summary, sourceFiles: [...new Set(items.map((item) => item.__file))], reportPath });

  const token = await authenticate();
  const profile = tokenSummary(token);
  if (!["admin", "administrador", "administrador_nacional", "curator", "curador", "revisor", "revisor_pedagogico"].includes(profile.role)) {
    throw new Error(`Perfil sem permissao para importacao: ${profile.role || "desconhecido"}`);
  }

  const licenses = await rest("question_licenses", `?name=eq.${encodeURIComponent(licenseName)}&select=id,name`, token);
  if (!licenses.length) throw new Error(`Licenca autoral nao encontrada: ${licenseName}`);
  const license = licenses[0];

  let sources = await rest("question_sources", `?name=eq.${encodeURIComponent(sourceName)}&select=id,name,license_id`, token);
  if (!sources.length) {
    sources = await rest("question_sources", "", token, {
      method: "POST",
      body: JSON.stringify({
        name: sourceName,
        source_type: "autoral",
        institution_name: "Raizes e Saberes",
        author_name: authorName,
        license_id: license.id,
        legal_status: "Autorizado para uso autoral interno",
        curation_status: "HOMOLOGADO",
        source_checked_at: new Date().toISOString(),
        notes: "Fonte autoral criada pelo importador do lote LP 2o ano.",
      }),
    });
  }
  const source = sources[0];

  for (const row of rows) {
    const payload = mapQuestion(row.normalized, source.id, license.id, row.validation);
    const existing = await rest("question_items", `?code=eq.${encodeURIComponent(payload.code)}&select=id,code`, token);
    const upserted = await rest("question_items", "?on_conflict=code", token, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(payload),
    });
    const question = upserted[0];
    if (existing.length) summary.updated += 1;
    else summary.inserted += 1;

    if (row.validation.approved) {
      for (const [index, alternative] of row.normalized.alternatives.entries()) {
        await rest("question_alternatives", "?on_conflict=question_id,label", token, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            question_id: question.id,
            label: alternative.id,
            body: alternative.texto,
            is_correct: alternative.id === row.normalized.correctAnswer,
            position: index + 1,
          }),
        });
        summary.alternativesImported += 1;
      }

      const alternatives = await rest("question_alternatives", `?question_id=eq.${question.id}&select=id,label`, token);
      for (const alternative of alternatives) {
        const explanation =
          alternative.label === row.normalized.correctAnswer
            ? `Alternativa correta: ${row.normalized.explanation}`
            : `Distrator: alternativa ${alternative.label} nao corresponde ao gabarito ${row.normalized.correctAnswer}.`;
        const existingAnalysis = await rest(
          "question_distractor_analyses",
          `?alternative_id=eq.${alternative.id}&analysis=eq.${encodeURIComponent(explanation)}&select=id`,
          token
        );
        if (!existingAnalysis.length) {
          await rest("question_distractor_analyses", "", token, {
            method: "POST",
            body: JSON.stringify({ alternative_id: alternative.id, analysis: explanation }),
          });
        }
        summary.distractorsImported += 1;
      }
    }

    const comment = `Importacao idempotente do lote ${row.normalized.reportTag} 2o ano (${basename(row.item.__file)}).`;
    const existingHistory = await rest(
      "question_curation_history",
      `?question_id=eq.${question.id}&comment=eq.${encodeURIComponent(comment)}&select=id`,
      token
    );
    if (!existingHistory.length) {
      await rest("question_curation_history", "", token, {
        method: "POST",
        body: JSON.stringify({
          question_id: question.id,
          actor_user_id: profile.userId,
          actor_role: profile.role,
          new_status: payload.curation_status,
          legal_classification: payload.legal_classification,
          comment,
          snapshot: {
            code: row.normalized.code,
            original_code: row.normalized.originalCode,
            source_file: row.item.__file,
            validation: row.validation,
          },
        }),
      });
      summary.historyInserted += 1;
    }
  }

  const importedCodes = rows.map((row) => row.normalized.code).filter(Boolean);
  const finalRows = await rest(
    "question_items",
    `?code=in.(${importedCodes.join(",")})&select=id,code,publication_status,curation_status&order=code.asc`,
    token
  );

  delete env.token;
  console.log(
    JSON.stringify(
      {
        sourceFiles: [...new Set(items.map((item) => item.__file))],
        reportPath,
        authenticatedRole: profile.role,
        totalValidated: summary.total,
        approved: summary.approved,
        rejected: summary.rejected,
        inserted: summary.inserted,
        updated: summary.updated,
        nonPublished: finalRows.filter((item) => item.publication_status !== "PUBLICADO").length,
        alternativesImported: summary.alternativesImported,
        distractorsImported: summary.distractorsImported,
        historyInserted: summary.historyInserted,
        duplicates,
        incomplete,
        finalRemoteCountForBatch: finalRows.length,
        importedCodes: finalRows.map((item) => item.code),
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
