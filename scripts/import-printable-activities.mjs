#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative } from "node:path";

const allowedExtensions = new Set([".png", ".pdf", ".jpg", ".jpeg", ".webp"]);
const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};
const source = getArg("--source");
const shouldCommit = args.includes("--commit");
const dryRun = args.includes("--dry-run") || !shouldCommit;
const catalogPath = "printable-activities-catalog.js";
const jsonCatalogPath = "data/atividades-imprimiveis/catalog.json";
const assetRoot = "assets/atividades-imprimiveis/educacao-infantil";

const report = {
  mode: dryRun ? "dry-run" : "commit",
  source,
  success: [],
  warnings: [],
  errors: [],
};

const fail = (message) => report.errors.push(message);
const warn = (message) => report.warnings.push(message);

const walkFiles = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walkFiles(path);
    return entry.isFile() ? [path] : [];
  });
};

const splitList = (value) =>
  Array.isArray(value)
    ? value.map(String).map((item) => item.trim()).filter(Boolean)
    : String(value || "")
        .split(/[;|]/)
        .map((item) => item.trim())
        .filter(Boolean);

const normalizeAgeGroup = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("ei2")) return "ei2";
  if (normalized.includes("ei3")) return "ei3";
  if (normalized.includes("ei4")) return "ei4";
  if (normalized.includes("ei5")) return "ei5";
  return String(value || "").trim();
};

const normalizeAge = (value, faixaEtaria) => {
  const text = String(value || "").trim();
  if (text) return text;
  return { ei2: "2 anos", ei3: "3 anos", ei4: "4 anos", ei5: "5 anos" }[faixaEtaria] || "";
};

const normalizeStatus = (value) => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  if (["PUBLICADO", "PUBLICADA", "PRODUCAO VISUAL ATUAL"].includes(normalized)) return "PUBLICADO";
  if (normalized.includes("PENDENTE")) return "PENDENTE_DE_METADADOS";
  if (normalized.includes("ARQUIV")) return "ARQUIVADO";
  if (normalized.includes("REVISAO")) return "EM_REVISAO";
  return normalized || "RASCUNHO";
};

const titleFromCode = (codigo) => `Atividade ${codigo}`;

const parseCsv = (text) => {
  const [headerLine, ...lines] = text.split(/\r?\n/).filter((line) => line.trim());
  const headers = headerLine.split(",").map((item) => item.trim());
  return lines.map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]));
  });
};

const loadManifest = (dir) => {
  const jsonPath = join(dir, "manifest.json");
  const csvPath = join(dir, "manifest.csv");
  if (existsSync(jsonPath)) {
    const parsed = JSON.parse(readFileSync(jsonPath, "utf8"));
    return Array.isArray(parsed) ? parsed : parsed.atividades || [];
  }
  if (existsSync(csvPath)) {
    return parseCsv(readFileSync(csvPath, "utf8"));
  }
  warn("Manifesto nao encontrado. Os registros serao inferidos pelos nomes dos arquivos e ficarao pendentes de metadados.");
  return null;
};

const extractCodeFromFilename = (path) => {
  const name = basename(path, extname(path));
  const match = name.match(/[A-Z]{2,4}\d?[-_][A-Z0-9-_.]+|\bEI[2-5][-_][A-Z0-9-_.]+/i);
  return match ? match[0].replaceAll("_", "-") : "";
};

const checksum = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

const readImageDimensions = (path) => {
  const buffer = readFileSync(path);
  const ext = extname(path).toLowerCase();
  if (ext === ".png" && buffer.length >= 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { largura: buffer.readUInt32BE(16), altura: buffer.readUInt32BE(20) };
  }
  if ((ext === ".jpg" || ext === ".jpeg") && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { altura: buffer.readUInt16BE(offset + 5), largura: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  if (ext === ".webp" && buffer.length >= 30 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buffer.toString("ascii", 12, 16);
    if (chunk === "VP8X") {
      return { largura: 1 + buffer.readUIntLE(24, 3), altura: 1 + buffer.readUIntLE(27, 3) };
    }
  }
  return { largura: 0, altura: 0 };
};

const loadCatalog = () => {
  if (existsSync(jsonCatalogPath)) {
    return JSON.parse(readFileSync(jsonCatalogPath, "utf8"));
  }
  const sourceText = readFileSync(catalogPath, "utf8");
  const match = sourceText.match(/window\.RaizesPrintableActivitiesCatalog\s*=\s*(\{[\s\S]*\});?\s*$/);
  if (!match) throw new Error(`Nao foi possivel ler ${catalogPath}`);
  return Function(`"use strict"; return (${match[1]});`)();
};

const saveCatalog = (catalog) => {
  const json = `${JSON.stringify(catalog, null, 2)}\n`;
  writeFileSync(jsonCatalogPath, json);
  writeFileSync(catalogPath, `window.RaizesPrintableActivitiesCatalog = ${json};`);
};

if (!source) {
  fail("Informe --source com a pasta do pacote.");
} else if (!existsSync(source) || !statSync(source).isDirectory()) {
  fail(`Pasta nao encontrada: ${source}`);
}

let catalog = null;
let nextActivities = [];

if (!report.errors.length) {
  catalog = loadCatalog();
  const existingCodes = new Set((catalog.activities || []).map((item) => item.codigo));
  const files = walkFiles(source).filter((path) => allowedExtensions.has(extname(path).toLowerCase()));
  const filesByBase = new Map(files.map((path) => [basename(path).toLowerCase(), path]));
  const checksums = new Map();
  const manifest = loadManifest(source);
  const rows =
    manifest ||
    files.map((path) => ({
      codigo: extractCodeFromFilename(path),
      arquivo: relative(source, path),
      status: "PENDENTE_DE_METADADOS",
      versao: "1.0",
    }));

  const seenCodes = new Set();
  for (const row of rows) {
    const codigo = String(row.codigo || "").trim();
    const arquivo = String(row.arquivo || row.arquivoOriginal || "").trim();
    if (!codigo) {
      fail(`Registro sem codigo oficial: ${JSON.stringify(row)}`);
      continue;
    }
    if (seenCodes.has(codigo) || existingCodes.has(codigo)) fail(`Codigo duplicado: ${codigo}`);
    seenCodes.add(codigo);

    const directPath = arquivo ? join(source, arquivo) : "";
    const filePath = existsSync(directPath) ? directPath : filesByBase.get(basename(arquivo).toLowerCase());
    if (!filePath) {
      fail(`Arquivo ausente para o codigo ${codigo}: ${arquivo || "(nao informado)"}`);
      continue;
    }
    const extension = extname(filePath).toLowerCase();
    if (!allowedExtensions.has(extension)) fail(`Extensao nao autorizada para ${codigo}: ${extension}`);
    const fileChecksum = checksum(filePath);
    if (checksums.has(fileChecksum)) warn(`Arquivo duplicado por checksum: ${codigo} e ${checksums.get(fileChecksum)}`);
    checksums.set(fileChecksum, codigo);
    const dimensions = readImageDimensions(filePath);
    if (extension !== ".pdf" && (!dimensions.largura || !dimensions.altura)) {
      warn(`${codigo}: dimensoes da imagem nao identificadas automaticamente.`);
    }

    const faixaEtaria = normalizeAgeGroup(row.faixaEtaria || row.faixa || row.etapa);
    const idade = normalizeAge(row.idade, faixaEtaria);
    const missingPedagogicalMetadata = ["objetivo", "camposExperiencia", "tiposAtividade", "materiais"].filter((field) => !String(row[field] || "").trim());
    if (missingPedagogicalMetadata.length) {
      warn(`${codigo}: metadados pedagogicos pendentes (${missingPedagogicalMetadata.join(", ")}).`);
    }
    const destinationDir = join(assetRoot, faixaEtaria || "ei2", "originais");
    const destinationPath = join(destinationDir, basename(filePath));
    const publicPath = destinationPath.replaceAll("\\", "/");

    nextActivities.push({
      id: codigo,
      codigo,
      slug: codigo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      titulo: row.titulo || titleFromCode(codigo),
      segmento: row.segmento || "Educacao Infantil",
      etapa: row.etapa || "Educacao Infantil",
      faixaEtaria,
      idade,
      descricao: row.descricao || "",
      objetivo: row.objetivo || "Atividade imprimivel para experiencias pedagogicas do EI2.",
      comandoCrianca: row.comandoCrianca || "",
      orientacaoProfessor: row.orientacaoProfessor || "Imprimir em A4, orientar a crianca e acompanhar a realizacao com apoio de um adulto.",
      camposExperiencia: splitList(row.camposExperiencia),
      direitosAprendizagem: splitList(row.direitosAprendizagem),
      tiposAtividade: splitList(row.tiposAtividade),
      materiais: splitList(row.materiais),
      palavrasChave: splitList(row.palavrasChave),
      arquivoOriginal: publicPath,
      arquivoPng: extension === ".png" ? publicPath : "",
      arquivoPdf: extension === ".pdf" ? relative(".", filePath) : "",
      miniatura: row.miniatura || publicPath,
      formato: extension.slice(1),
      orientacaoPagina: row.orientacaoPagina || (dimensions.largura >= dimensions.altura ? "paisagem" : "retrato"),
      largura: Number(row.largura || dimensions.largura || 0),
      altura: Number(row.altura || dimensions.altura || 0),
      versao: row.versao || row.versao === 0 ? String(row.versao) : "1.0",
      status: normalizeStatus(row.status),
      dataPublicacao: row.dataPublicacao || new Date().toISOString(),
      dataAtualizacao: row.dataAtualizacao || new Date().toISOString(),
      checksum: fileChecksum,
      visualizacoes: 0,
      downloads: 0,
      impressoes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (shouldCommit) {
      mkdirSync(destinationDir, { recursive: true });
      copyFileSync(filePath, destinationPath);
    }
    report.success.push(`${codigo}: validado.`);
  }

  for (const file of files) {
    const code = extractCodeFromFilename(file);
    if (!code) warn(`Arquivo sem codigo detectavel: ${relative(source, file)}`);
  }
}

if (!report.errors.length && shouldCommit) {
  catalog.activities = [...(catalog.activities || []), ...nextActivities];
  catalog.updatedAt = new Date().toISOString();
  saveCatalog(catalog);
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.errors.length ? 1 : 0);
