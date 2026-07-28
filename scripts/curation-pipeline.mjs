#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const VALID_STATUSES = new Set([
  "DESCOBERTO",
  "COLETADO",
  "NORMALIZADO",
  "CLASSIFICADO",
  "VERIFICADO",
  "AGUARDANDO_REVISAO",
  "APROVADO",
  "PUBLICADO",
  "REJEITADO",
  "REVISAO_NECESSARIA",
  "LINK_COM_PROBLEMA",
  "ARQUIVADO",
]);

const [command, filePath] = process.argv.slice(2);

if (!command || !["validate", "report", "rollback-sql"].includes(command)) {
  printUsage();
  process.exit(1);
}

if (!filePath && command !== "rollback-sql") {
  printUsage();
  process.exit(1);
}

if (command === "rollback-sql") {
  const batchCode = filePath || "EDU-001";
  printRollbackSql(batchCode);
  process.exit(0);
}

const batch = readBatch(filePath);
const result = validateBatch(batch);

if (command === "validate") {
  printValidation(result);
  process.exit(result.errors.length ? 1 : 0);
}

printReport(batch, result);
process.exit(result.errors.length ? 1 : 0);

function readBatch(inputPath) {
  const absolute = path.resolve(process.cwd(), inputPath);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function validateBatch(batch) {
  const errors = [];
  const warnings = [];
  const imported = batch.imported_courses || [];
  const discarded = batch.discarded_items || [];
  const urls = new Map();
  const slugs = new Set();

  if (!VALID_STATUSES.has(batch.status)) {
    errors.push(`Status de lote invalido: ${batch.status}`);
  }

  imported.forEach((course, index) => {
    const label = `${index + 1}. ${course.title || "sem titulo"}`;
    requireField(course, "slug", label, errors);
    requireField(course, "title", label, errors);
    requireField(course, "provider", label, errors);
    requireField(course, "official_url", label, errors);
    requireField(course, "knowledge_center", label, errors);

    if (course.status !== "AGUARDANDO_REVISAO") {
      errors.push(`${label}: curso importado deve permanecer AGUARDANDO_REVISAO.`);
    }

    if (course.official_url && !course.official_url.startsWith("https://")) {
      errors.push(`${label}: URL oficial precisa usar HTTPS.`);
    }

    if (course.slug && slugs.has(course.slug)) {
      errors.push(`${label}: slug duplicado (${course.slug}).`);
    }
    slugs.add(course.slug);

    if (course.official_url) {
      const current = urls.get(course.official_url) || [];
      current.push(course.title);
      urls.set(course.official_url, current);
    }

    const confidence = course.confidence || {};
    ["url", "workload", "certificate", "classification"].forEach((key) => {
      if (!confidence[key]) {
        warnings.push(`${label}: confianca ausente para ${key}.`);
      }
      if (confidence[key] === "NAO_CONFIRMADA") {
        warnings.push(`${label}: ${key} nao confirmado.`);
      }
    });
  });

  for (const [url, titles] of urls.entries()) {
    if (titles.length > 1) {
      warnings.push(`Possivel URL compartilhada/duplicada: ${url} (${titles.join("; ")}).`);
    }
  }

  discarded.forEach((item, index) => {
    const label = `descartado ${index + 1}. ${item.title || "sem titulo"}`;
    requireField(item, "official_url", label, errors);
    requireField(item, "reason", label, errors);
    if (!VALID_STATUSES.has(item.status)) {
      errors.push(`${label}: status invalido (${item.status}).`);
    }
  });

  if (batch.summary) {
    if (batch.summary.imported_count !== imported.length) {
      warnings.push(`Resumo indica ${batch.summary.imported_count} importados, mas o JSON tem ${imported.length}.`);
    }
    if (batch.summary.discarded_count !== discarded.length) {
      warnings.push(`Resumo indica ${batch.summary.discarded_count} descartados, mas o JSON tem ${discarded.length}.`);
    }
  }

  return { errors, warnings, imported, discarded };
}

function requireField(entity, field, label, errors) {
  if (entity[field] === undefined || entity[field] === null || entity[field] === "") {
    errors.push(`${label}: campo obrigatorio ausente (${field}).`);
  }
}

function printValidation(result) {
  console.log(`Cursos importados: ${result.imported.length}`);
  console.log(`Itens descartados: ${result.discarded.length}`);
  console.log(`Erros: ${result.errors.length}`);
  console.log(`Alertas: ${result.warnings.length}`);
  result.errors.forEach((error) => console.log(`ERRO: ${error}`));
  result.warnings.forEach((warning) => console.log(`ALERTA: ${warning}`));
}

function printReport(batch, result) {
  console.log(`# ${batch.batch_code} - ${batch.title}`);
  console.log(`Status: ${batch.status}`);
  console.log(`Verificacao: ${batch.verification_date}`);
  console.log(`Encontrados: ${batch.summary?.found_count ?? "n/a"}`);
  console.log(`Importados: ${result.imported.length}`);
  console.log(`Descartados: ${result.discarded.length}`);
  console.log(`Alertas: ${result.warnings.length}`);
  console.log("");
  result.imported.forEach((course) => {
    console.log(`- ${course.title} | ${course.provider} | ${course.knowledge_center} | ${course.status}`);
  });
}

function printRollbackSql(batchCode) {
  console.log(`-- Rollback controlado do lote ${batchCode}`);
  console.log("begin;");
  console.log(`with batch as (select id from public.curation_batches where batch_code = '${escapeSql(batchCode)}')`);
  console.log("delete from public.course_change_history where course_id in (select course_id from public.curation_batch_items where batch_id in (select id from batch) and course_id is not null);");
  console.log(`with batch as (select id from public.curation_batches where batch_code = '${escapeSql(batchCode)}')`);
  console.log("delete from public.course_verifications where course_id in (select course_id from public.curation_batch_items where batch_id in (select id from batch) and course_id is not null);");
  console.log(`with batch as (select id from public.curation_batches where batch_code = '${escapeSql(batchCode)}')`);
  console.log("delete from public.course_tag_relations where course_id in (select course_id from public.curation_batch_items where batch_id in (select id from batch) and course_id is not null);");
  console.log(`with batch as (select id from public.curation_batches where batch_code = '${escapeSql(batchCode)}')`);
  console.log("delete from public.curated_courses where id in (select course_id from public.curation_batch_items where batch_id in (select id from batch) and course_id is not null) and status <> 'PUBLICADO';");
  console.log(`delete from public.curation_batches where batch_code = '${escapeSql(batchCode)}';`);
  console.log("commit;");
}

function escapeSql(value) {
  return String(value).replaceAll("'", "''");
}

function printUsage() {
  console.log("Uso:");
  console.log("  node scripts/curation-pipeline.mjs validate data/curation_batches/2026-07-28-educacao-lote-001.json");
  console.log("  node scripts/curation-pipeline.mjs report data/curation_batches/2026-07-28-educacao-lote-001.json");
  console.log("  node scripts/curation-pipeline.mjs rollback-sql EDU-001");
}
