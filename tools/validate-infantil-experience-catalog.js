#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const catalog = require(path.join(projectRoot, "infantil-experience-catalog.js"));

const errors = [];
const warnings = [];
const seenAssetCodes = new Set();
const seenExperienceIds = new Set();
const seenBookIds = new Set();
const seenActivityCodes = new Set();

const addError = (message) => errors.push(message);
const addWarning = (message) => warnings.push(message);
const exists = (relativePath) => fs.existsSync(path.join(projectRoot, relativePath));

const allowedAssetTypes = new Set(["video", "audio", "image", "lottie", "sprite"]);
const allowedFileTypes = new Set(["mp4", "webm", "mp3", "wav", "png", "webp", "json"]);
const allowedCategories = new Set(["opening", "instruction", "transition", "success", "retry", "completion", "ambient", "character", "interaction", "content"]);
const allowedSharedScopes = new Set(["collection", "age-group", "volume", "exclusive"]);
const allowedAssetStatuses = new Set(["awaiting-upload", "available", "review", "approved"]);
const allowedExperienceStatuses = new Set(catalog.EDITORIAL_STATUSES || ["planned", "in_production", "review", "approved", "published", "archived"]);
const allowedAvailability = new Set(["unavailable", "in-production", "available"]);
const allowedResourceTypes = new Set(["video", "audio", "image", "lottie", "sprite", "interactive", "printable"]);
const allowedResourceRoles = new Set(["opening", "main", "support", "completion", "reward", "instruction", "print"]);
const allowedActivityTypes = new Set(catalog.INTERACTIVE_ACTIVITY_TYPES || ["select_option", "count_and_select"]);
const allowedCompletionRules = new Set(["correct_answer", "all_correct_answers", "correct_selection", "all_items_placed", "all_pairs_matched", "correct_order", "all_items_classified", "word_completed", "path_completed", "all_steps_completed", "score_threshold"]);

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

  if (asset.status !== "awaiting-upload" && asset.filePath && !exists(asset.filePath) && !asset.provisionalFilePath) {
    addError(`${asset.code}: arquivo aprovado/disponivel nao encontrado em ${asset.filePath}`);
  }

  if (asset.provisionalFilePath && !exists(asset.provisionalFilePath)) {
    addError(`${asset.code}: arquivo provisorio nao encontrado em ${asset.provisionalFilePath}`);
  }

  if (asset.status === "awaiting-upload" && asset.filePath && exists(asset.filePath)) {
    addWarning(`${asset.code}: arquivo ja existe, avaliar mudanca de status`);
  }
}

for (const book of catalog.officialBooks || []) {
  if (!book.bookId) addError("livro oficial sem bookId");
  if (seenBookIds.has(book.bookId)) addError(`bookId duplicado: ${book.bookId}`);
  seenBookIds.add(book.bookId);
  if (book.collectionCode !== catalog.COLLECTION_CODE) addError(`${book.bookId}: collectionCode invalido`);
  if (book.segment !== catalog.SEGMENT) addError(`${book.bookId}: segment invalido`);
  if (!catalog.INFANTIL_AGE_GROUPS.includes(book.ageGroup)) addError(`${book.bookId}: ageGroup invalido`);
  if (!catalog.INFANTIL_VOLUMES.includes(book.volume)) addError(`${book.bookId}: volume invalido`);
  if (![1, 2].includes(book.semester)) addError(`${book.bookId}: semester invalido`);
  if (!book.title) addError(`${book.bookId}: titulo ausente`);
  if (!book.coverAsset) addError(`${book.bookId}: coverAsset ausente`);
  if (!["available", "planned", "archived"].includes(book.status)) addError(`${book.bookId}: status de livro invalido`);
  if (!Array.isArray(book.units) || !book.units.length) addError(`${book.bookId}: unidades ausentes`);
  for (const unit of book.units || []) {
    if (!unit.code) addError(`${book.bookId}: unidade sem codigo`);
    if (!unit.title) addError(`${book.bookId}/${unit.code}: titulo de unidade ausente`);
    if (unit.pageStart && unit.pageEnd && unit.pageStart > unit.pageEnd) addError(`${book.bookId}/${unit.code}: pagina inicial maior que pagina final`);
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
  if (experience.collectionCode !== catalog.COLLECTION_CODE) addError(`${experience.id}: collectionCode invalido`);
  if (experience.segment !== catalog.SEGMENT) addError(`${experience.id}: segment invalido`);
  if (!experience.bookId) addError(`${experience.id}: bookId ausente`);
  const book = catalog.getOfficialBook?.(experience.bookId);
  if (!book) addError(`${experience.id}: livro inexistente ${experience.bookId}`);
  if (book && book.ageGroup !== experience.ageGroup) addError(`${experience.id}: faixa etaria incompatível com ${book.bookId}`);
  if (book && book.volume !== experience.volume) addError(`${experience.id}: volume incompativel com ${book.bookId}`);
  if (!experience.unitCode || !experience.unitTitle) addError(`${experience.id}: unidade ausente`);
  if (!experience.sequenceCode || !experience.sequenceTitle) addError(`${experience.id}: sequencia ausente`);
  if (!experience.activityTitle) addError(`${experience.id}: activityTitle ausente`);
  if (!experience.studentInstruction) addError(`${experience.id}: studentInstruction ausente`);
  if (!experience.pedagogicalObjective) addError(`${experience.id}: pedagogicalObjective ausente`);
  if (!experience.instructions) addError(`${experience.id}: instructions ausente`);
  if (!experience.interaction || typeof experience.interaction !== "object") addError(`${experience.id}: interaction ausente`);
  if (!experience.reward || !Number.isInteger(experience.reward.xp) || !Number.isInteger(experience.reward.stars)) {
    addError(`${experience.id}: reward invalido`);
  }
  if (!allowedExperienceStatuses.has(experience.status)) addError(`${experience.id}: status invalido`);
  if (experience.editorialStatus && experience.editorialStatus !== experience.status) addWarning(`${experience.id}: editorialStatus difere de status`);
  if (experience.availability && !allowedAvailability.has(experience.availability)) addError(`${experience.id}: availability invalida`);
  if (experience.status === "in_production" && experience.availability === "available") {
    addError(`${experience.id}: experiencia em producao nao pode aparecer como disponivel ao aluno`);
  }
  if (experience.status === "published" && book?.status !== "available") {
    addError(`${experience.id}: experiencia publicada vinculada a livro indisponivel ${experience.bookId}`);
  }
  if (experience.pages && (!Array.isArray(experience.pages) || experience.pages.some((page) => !Number.isInteger(page)))) {
    addError(`${experience.id}: pages precisa ser array de inteiros`);
  }
  if (experience.pageStart && experience.pageEnd && experience.pageStart > experience.pageEnd) {
    addError(`${experience.id}: pageStart maior que pageEnd`);
  }
  if (experience.pageStart && experience.pages?.length && experience.pageStart !== experience.pages[0]) {
    addWarning(`${experience.id}: pageStart difere da primeira pagina em pages`);
  }
  if (experience.pageEnd && experience.pages?.length && experience.pageEnd !== experience.pages[experience.pages.length - 1]) {
    addWarning(`${experience.id}: pageEnd difere da ultima pagina em pages`);
  }
  if (!Array.isArray(experience.resources) || !experience.resources.length) {
    addError(`${experience.id}: resources ausente`);
  }
  for (const resource of experience.resources || []) {
    if (!allowedResourceTypes.has(resource.type)) addError(`${experience.id}: resource type invalido ${resource.type}`);
    if (!allowedResourceRoles.has(resource.role)) addError(`${experience.id}: resource role invalido ${resource.role}`);
    if (!resource.assetCode && !resource.activityCode) addError(`${experience.id}: resource sem assetCode/activityCode`);
    if (resource.assetCode && !catalog.getExperienceAsset(resource.assetCode)) {
      addError(`${experience.id}: resource referencia ativo inexistente ${resource.assetCode}`);
    }
  }
  const openingResource = (experience.resources || []).find((resource) => resource.role === "opening" || resource.role === "main");
  if (experience.status === "published" && !openingResource) addError(`${experience.id}: experiencia publicada sem ativo principal`);
  if (experience.status === "published" && !experience.openingAssetCode) addError(`${experience.id}: experiencia publicada sem openingAssetCode`);

  for (const key of ["openingAssetCode", "instructionAudioCode", "successAssetCode", "retryAssetCode", "completionAssetCode"]) {
    if (experience[key] && !catalog.getExperienceAsset(experience[key])) {
      addError(`${experience.id}: ${key} referencia ativo inexistente ${experience[key]}`);
    }
  }

  for (const relatedCode of experience.relatedExperienceCodes || []) {
    if (!catalog.getExperienceDefinition(relatedCode)) addError(`${experience.id}: experiencia relacionada inexistente ${relatedCode}`);
  }

  const publicUrl = catalog.getExperiencePublicUrl?.(experience.id);
  try {
    const parsed = new URL(publicUrl);
    if (/localhost|127\.0\.0\.1/.test(parsed.hostname)) addError(`${experience.id}: URL publica nao pode apontar para ambiente local`);
  } catch (error) {
    addError(`${experience.id}: URL publica invalida ${publicUrl}`);
  }
}

for (const activity of catalog.interactiveActivityDefinitions || []) {
  if (!activity.code) addError("atividade interativa sem codigo");
  if (seenActivityCodes.has(activity.code)) addError(`codigo de atividade duplicado: ${activity.code}`);
  seenActivityCodes.add(activity.code);
  if (!activity.experienceCode || !catalog.getExperienceDefinition(activity.experienceCode)) {
    addError(`${activity.code}: atividade sem experiencia valida`);
  }
  const experience = catalog.getExperienceDefinition(activity.experienceCode);
  const book = catalog.getOfficialBook?.(activity.bookId);
  if (!book) addError(`${activity.code}: livro inexistente ${activity.bookId}`);
  if (experience && activity.bookId !== experience.bookId) addError(`${activity.code}: bookId difere da experiencia vinculada`);
  if (activity.pageStart && activity.pageEnd && activity.pageStart > activity.pageEnd) addError(`${activity.code}: pagina inicial maior que pagina final`);
  if (!allowedActivityTypes.has(activity.type)) addError(`${activity.code}: tipo de atividade nao suportado ${activity.type}`);
  if (!activity.title) addError(`${activity.code}: titulo ausente`);
  if (!activity.instruction) addError(`${activity.code}: instrucao ausente`);
  if (["select_option", "count_and_select"].includes(activity.type)) {
    if (!activity.question || !activity.question.text) addError(`${activity.code}: pergunta ausente`);
    const options = activity.question?.options || [];
    if (!Array.isArray(options) || options.length < 2) addError(`${activity.code}: opcoes ausentes ou insuficientes`);
    if (new Set(options.map(String)).size !== options.length) addError(`${activity.code}: opcoes duplicadas`);
    if (activity.question && !options.map(String).includes(String(activity.question.correctAnswer))) {
      addError(`${activity.code}: resposta correta ausente das opcoes`);
    }
  }
  if (activity.type === "tap_objects" && (!activity.selection?.correctObjectIds?.length || !activity.scene?.objects?.length)) addError(`${activity.code}: tap_objects sem objetos/corretos`);
  if (activity.type === "drag_and_drop" && (!activity.draggables?.length || !activity.dropTargets?.length)) addError(`${activity.code}: drag_and_drop sem item ou destino`);
  if (activity.type === "match_pairs" && (!activity.pairs?.length || activity.pairs.some((pair) => !pair.left || !pair.right))) addError(`${activity.code}: match_pairs sem pares completos`);
  if (activity.type === "sort_sequence" && (!activity.sequence?.items?.length || !activity.sequence?.correctOrder?.length)) addError(`${activity.code}: sort_sequence sem ordem correta`);
  if (activity.type === "classify" && (!activity.categories?.length || !activity.items?.length)) addError(`${activity.code}: classify sem categorias ou itens`);
  if (activity.type === "complete_word") {
    const choices = activity.word?.choices || [];
    if (!activity.word?.prompt || !activity.word?.answer || !choices.length) addError(`${activity.code}: complete_word sem palavra/resposta`);
    if (choices.length && !choices.map(String).includes(String(activity.word.answer))) addError(`${activity.code}: resposta da palavra fora das opcoes`);
  }
  if (activity.type === "trace_path" && (!activity.path?.points?.length || activity.path.points.length < 2)) addError(`${activity.code}: trace_path sem pontos suficientes`);
  if (activity.type === "memory_game") {
    const cards = activity.memory?.cards || [];
    const pairCounts = cards.reduce((counts, card) => ({ ...counts, [card.pairId]: (counts[card.pairId] || 0) + 1 }), {});
    if (!cards.length || Object.values(pairCounts).some((count) => count !== 2)) addError(`${activity.code}: memory_game sem pares validos`);
  }
  if (!activity.feedback?.correct?.message || !activity.feedback?.incorrect?.message) addError(`${activity.code}: feedback ausente`);
  if (!activity.completionRule?.type || !allowedCompletionRules.has(activity.completionRule.type)) {
    addError(`${activity.code}: regra de conclusao invalida`);
  }
  if (activity.openingResource?.assetCode && !catalog.getExperienceAsset(activity.openingResource.assetCode)) {
    addError(`${activity.code}: openingResource referencia ativo inexistente ${activity.openingResource.assetCode}`);
  }
  for (const feedbackKey of ["correct", "incorrect"]) {
    const audioAsset = activity.feedback?.[feedbackKey]?.audioAsset;
    if (audioAsset && !catalog.getExperienceAsset(audioAsset)) addError(`${activity.code}: feedback ${feedbackKey} referencia audio inexistente ${audioAsset}`);
  }
  for (const object of activity.scene?.objects || []) {
    if (!object.id) addError(`${activity.code}: objeto sem identificador`);
    for (const key of ["x", "y", "width", "height"]) {
      const value = Number(object[key]);
      if (!Number.isFinite(value) || value < 0 || value > 100) addError(`${activity.code}/${object.id || "objeto"}: posicao/tamanho invalido em ${key}`);
    }
    if (!object.accessibilityLabel) addError(`${activity.code}/${object.id || "objeto"}: accessibilityLabel ausente`);
    if (object.asset && !String(object.asset).startsWith("css:") && !catalog.getExperienceAsset(object.asset)) {
      addError(`${activity.code}/${object.id}: ativo de objeto inexistente ${object.asset}`);
    }
  }
  if (activity.status === "published" && (!activity.feedback || !activity.completionRule?.type)) {
    addError(`${activity.code}: atividade publicada com campos obrigatorios ausentes`);
  }
}

const report = {
  ageGroups: catalog.INFANTIL_AGE_GROUPS.length,
  volumes: catalog.INFANTIL_VOLUMES.length,
  assets: catalog.experienceAssets.length,
  books: (catalog.officialBooks || []).length,
  experiences: catalog.experienceDefinitions.length,
  interactiveActivities: (catalog.interactiveActivityDefinitions || []).length,
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
