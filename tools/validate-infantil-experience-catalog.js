#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const catalog = require(path.join(projectRoot, "infantil-experience-catalog.js"));

const errors = [];
const warnings = [];
const seenAssetCodes = new Set();
const seenExperienceIds = new Set();

const addError = (message) => errors.push(message);
const addWarning = (message) => warnings.push(message);
const exists = (relativePath) => fs.existsSync(path.join(projectRoot, relativePath));

const allowedAssetTypes = new Set(["video", "audio", "image", "lottie", "sprite"]);
const allowedFileTypes = new Set(["mp4", "webm", "mp3", "wav", "png", "webp", "json"]);
const allowedCategories = new Set(["opening", "instruction", "transition", "success", "retry", "completion", "ambient", "character", "interaction", "content"]);
const allowedSharedScopes = new Set(["collection", "age-group", "volume", "exclusive"]);
const allowedAssetStatuses = new Set(["awaiting-upload", "available", "review", "approved"]);
const allowedExperienceStatuses = new Set(["draft", "review", "published"]);

const volumeCodePattern = /^RS-EI[2-5]-V[12]-\d{3}$/;
const sharedAgeCodePattern = /^RS-EI[2-5]-C-\d{3}$/;
const sharedCollectionCodePattern = /^RS-EI-C-\d{3}$/;
const experienceCodePattern = /^RS-EI[2-5]-V[12]-EXP-\d{3}$/;

for (const ageGroup of catalog.INFANTIL_AGE_GROUPS) {
  const basePath = path.join(projectRoot, catalog.ASSET_BASE_PATH, ageGroup.toLowerCase());
  if (!fs.existsSync(basePath)) addError(`pasta da faixa etaria ausente: ${basePath}`);

  for (const volume of catalog.INFANTIL_VOLUMES) {
    const volumeFolder = volume === "V1" ? "volume-1" : "volume-2";
    for (const folder of ["videos", "audios", "images", "lottie", "sprites"]) {
      const folderPath = path.join(projectRoot, catalog.ASSET_BASE_PATH, ageGroup.toLowerCase(), volumeFolder, folder);
      if (!fs.existsSync(folderPath)) addError(`pasta de volume ausente: ${folderPath}`);
    }
  }
}

for (const folder of ["videos", "audios", "imagens", "efeitos"]) {
  const folderPath = path.join(projectRoot, catalog.ASSET_BASE_PATH, "compartilhados", folder);
  if (!fs.existsSync(folderPath)) addError(`pasta compartilhada ausente: ${folderPath}`);
}

for (const asset of catalog.experienceAssets) {
  if (!asset.code) addError("ativo sem codigo");
  if (seenAssetCodes.has(asset.code)) addError(`codigo de ativo duplicado: ${asset.code}`);
  seenAssetCodes.add(asset.code);

  if (![volumeCodePattern, sharedAgeCodePattern, sharedCollectionCodePattern].some((pattern) => pattern.test(asset.code))) {
    addError(`codigo de ativo fora do padrao oficial: ${asset.code}`);
  }

  if (!asset.title) addError(`${asset.code}: titulo ausente`);
  if (!asset.filePath) addError(`${asset.code}: filePath ausente`);
  if (!allowedAssetTypes.has(asset.assetType)) addError(`${asset.code}: assetType invalido`);
  if (!allowedFileTypes.has(asset.fileType)) addError(`${asset.code}: fileType invalido`);
  if (!allowedCategories.has(asset.category)) addError(`${asset.code}: category invalida`);
  if (!allowedSharedScopes.has(asset.sharedScope)) addError(`${asset.code}: sharedScope invalido`);
  if (!allowedAssetStatuses.has(asset.status)) addError(`${asset.code}: status invalido`);
  if (!Array.isArray(asset.tags)) addError(`${asset.code}: tags precisa ser array`);

  if (asset.status !== "awaiting-upload" && asset.filePath && !exists(asset.filePath)) {
    addError(`${asset.code}: arquivo aprovado/disponivel nao encontrado em ${asset.filePath}`);
  }

  if (asset.status === "awaiting-upload" && asset.filePath && exists(asset.filePath)) {
    addWarning(`${asset.code}: arquivo ja existe, avaliar mudanca de status`);
  }
}

for (const experience of catalog.experienceDefinitions) {
  if (!experience.id) addError("experiencia sem id");
  if (seenExperienceIds.has(experience.id)) addError(`id de experiencia duplicado: ${experience.id}`);
  seenExperienceIds.add(experience.id);

  if (!experienceCodePattern.test(experience.id)) addError(`id de experiencia fora do padrao oficial: ${experience.id}`);
  if (!catalog.INFANTIL_AGE_GROUPS.includes(experience.ageGroup)) addError(`${experience.id}: ageGroup invalido`);
  if (!catalog.INFANTIL_VOLUMES.includes(experience.volume)) addError(`${experience.id}: volume invalido`);
  if (!["1", "2"].includes(experience.semester)) addError(`${experience.id}: semester invalido`);
  if (experience.collection !== catalog.COLLECTION) addError(`${experience.id}: collection invalida`);
  if (!experience.instructions) addError(`${experience.id}: instructions ausente`);
  if (!experience.interaction || typeof experience.interaction !== "object") addError(`${experience.id}: interaction ausente`);
  if (!experience.reward || !Number.isInteger(experience.reward.xp) || !Number.isInteger(experience.reward.stars)) {
    addError(`${experience.id}: reward invalido`);
  }
  if (!allowedExperienceStatuses.has(experience.status)) addError(`${experience.id}: status invalido`);

  for (const key of ["openingAssetCode", "instructionAudioCode", "successAssetCode", "retryAssetCode", "completionAssetCode"]) {
    if (experience[key] && !catalog.getExperienceAsset(experience[key])) {
      addError(`${experience.id}: ${key} referencia ativo inexistente ${experience[key]}`);
    }
  }
}

const report = {
  ageGroups: catalog.INFANTIL_AGE_GROUPS.length,
  volumes: catalog.INFANTIL_VOLUMES.length,
  assets: catalog.experienceAssets.length,
  experiences: catalog.experienceDefinitions.length,
  errors: errors.length,
  warnings: warnings.length,
};

console.log("VALIDACAO DO CATALOGO DE EXPERIENCIAS INFANTIS");
console.log(JSON.stringify(report, null, 2));

if (warnings.length) {
  console.log("\nAVISOS");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length) {
  console.error("\nERROS");
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log("\nAPROVADO: catalogo de experiencias infantis sem erros bloqueantes.");
}
