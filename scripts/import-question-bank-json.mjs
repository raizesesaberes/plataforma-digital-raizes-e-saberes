#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const root = process.cwd();
const inputPaths = process.argv.slice(2);
const reportPath = "docs/RELATORIO-VALIDACAO-LOTE-001-LP-2ANO.md";

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

const mapQuestion = (item, sourceId, licenseId, status) => ({
  code: item.codigo,
  internal_title: `${item.eixo || "Lingua Portuguesa"} - ${item.codigo}`,
  component: "Lingua Portuguesa",
  stage: "Ensino Fundamental - Anos Iniciais",
  school_year: "2o ano",
  thematic_unit: item.eixo || "Lingua Portuguesa",
  knowledge_object: Array.isArray(item.tags) && item.tags.length ? item.tags.join(", ") : item.eixo || "Leitura e escrita",
  bncc_skill: item.habilidade_bncc,
  reference_matrix: item.tags?.length ? `Descritores internos: ${item.tags.join(", ")}` : "Referencia SAEB nao informada no JSON",
  proficiency_level: "Basico",
  difficulty: mapDifficulty(item.dificuldade),
  cognitive_process: item.eixo || "Leitura e interpretacao",
  question_type: item.tipo === "multipla_escolha" ? "Multipla escolha" : item.tipo || "Multipla escolha",
  statement: item.enunciado,
  base_text: item.texto_base || null,
  correct_answer: item.resposta_correta,
  justification: item.explicacao,
  success_feedback: "Resposta correta.",
  error_feedback: "Releia o enunciado e compare as alternativas.",
  recommended_intervention: `Retomar ${String(item.eixo || "a habilidade trabalhada").toLowerCase()} com exemplos curtos e mediacao oral.`,
  estimated_minutes: secondsToMinutes(item.tempo_estimado_segundos),
  accessibility_notes: item.texto_base ? "Texto-base curto adequado para leitura mediada no 2o ano." : "Item sem texto-base, adequado para leitura mediada no 2o ano.",
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

const validateQuestion = (item, seenCodes) => {
  const errors = [];
  if (!item.codigo) errors.push("codigo ausente");
  if (seenCodes.has(item.codigo)) errors.push("codigo duplicado no lote");
  if (item.ano !== 2) errors.push("ano diferente de 2");
  if (item.disciplina !== "Língua Portuguesa") errors.push("disciplina diferente de Lingua Portuguesa");
  if (!item.enunciado) errors.push("enunciado ausente");
  if (!item.habilidade_bncc) errors.push("habilidade BNCC ausente");
  if (!item.explicacao) errors.push("justificativa/explicacao ausente");
  if (!Array.isArray(item.alternativas) || item.alternativas.length !== 4) errors.push("alternativas diferentes de 4");
  if (Array.isArray(item.alternativas)) {
    const labels = item.alternativas.map((alternative) => alternative.id);
    if (new Set(labels).size !== labels.length) errors.push("alternativas com ids duplicados");
    if (item.alternativas.some((alternative) => !alternative.id || !alternative.texto)) errors.push("alternativa vazia");
    if (!item.alternativas.some((alternative) => alternative.id === item.resposta_correta)) errors.push("gabarito sem alternativa correspondente");
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

const writeReport = ({ rows, summary, sourceFiles }) => {
  const approved = rows.filter((row) => row.validation.approved);
  const rejected = rows.filter((row) => !row.validation.approved);
  const lines = [
    "# Relatorio de Validacao - Lote 001 LP 2o Ano",
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
    "- `disciplina` mapeada para `component = Lingua Portuguesa`.",
    "- `ano = 2` mapeado para `school_year = 2o ano`.",
    "- `tempo_estimado_segundos` convertido para `estimated_minutes` com minimo de 1 minuto.",
    "- `tags` preservadas em `knowledge_object` e `reference_matrix` quando disponiveis.",
    "- Fonte, autoria, licenca e classificacao juridica autoral padronizadas para Raizes e Saberes.",
    "",
    "## Aprovadas",
    ...approved.map((row) => `- ${row.item.codigo} (${row.item.habilidade_bncc}, ${row.item.dificuldade})`),
    "",
    "## Rejeitadas",
    ...(rejected.length ? rejected.map((row) => `- ${row.item.codigo || row.item.id}: ${row.validation.errors.join("; ")}`) : ["- Nenhuma."]),
    "",
    "## Duplicadas",
    ...(summary.duplicates.length ? summary.duplicates.map((code) => `- ${code}`) : ["- Nenhuma."]),
    "",
    "## Incompletas",
    ...(summary.incomplete.length ? summary.incomplete.map((code) => `- ${code}`) : ["- Nenhuma."]),
  ];
  writeFileSync(reportPath, `${lines.join("\n")}\n`);
};

const main = async () => {
  if (!env.url || !env.anonKey) throw new Error("Supabase URL/anon key nao configurados.");
  const items = loadQuestions();
  const seenCodes = new Set();
  const duplicates = [];
  const rows = items.map((item) => {
    const validation = validateQuestion(item, seenCodes);
    if (seenCodes.has(item.codigo)) duplicates.push(item.codigo);
    if (item.codigo) seenCodes.add(item.codigo);
    return { item, validation };
  });
  const incomplete = rows.filter((row) => row.validation.errors.some((error) => /ausente|vazia|gabarito/.test(error))).map((row) => row.item.codigo || row.item.id);
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
  writeReport({ rows, summary, sourceFiles: [...new Set(items.map((item) => item.__file))] });

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
    const payload = mapQuestion(row.item, source.id, license.id, row.validation);
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
      for (const [index, alternative] of row.item.alternativas.entries()) {
        await rest("question_alternatives", "?on_conflict=question_id,label", token, {
          method: "POST",
          headers: { Prefer: "resolution=merge-duplicates,return=representation" },
          body: JSON.stringify({
            question_id: question.id,
            label: alternative.id,
            body: alternative.texto,
            is_correct: alternative.id === row.item.resposta_correta,
            position: index + 1,
          }),
        });
        summary.alternativesImported += 1;
      }

      const alternatives = await rest("question_alternatives", `?question_id=eq.${question.id}&select=id,label`, token);
      for (const alternative of alternatives) {
        const explanation =
          alternative.label === row.item.resposta_correta
            ? `Alternativa correta: ${row.item.explicacao}`
            : `Distrator: alternativa ${alternative.label} nao corresponde ao gabarito ${row.item.resposta_correta}.`;
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

    const comment = `Importacao idempotente do lote LP 2o ano (${basename(row.item.__file)}).`;
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
          snapshot: { code: row.item.codigo, source_file: row.item.__file, validation: row.validation },
        }),
      });
      summary.historyInserted += 1;
    }
  }

  const importedCodes = rows.map((row) => row.item.codigo).filter(Boolean);
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
