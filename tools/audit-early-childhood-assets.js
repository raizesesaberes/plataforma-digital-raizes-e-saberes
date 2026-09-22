#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const catalog = require(path.join(repoRoot, "infantil-experience-catalog.js"));

const TARGET_DISCOVERY_ID = "RS-EI4-V1-EXP-001";
const TARGET_ACTIVITY_ID = "RS-EI4-V1-INT-001";
const CANONICAL_UUID_BY_ID = {
  [TARGET_ACTIVITY_ID]: "02d10000-0000-4000-8000-000000000011",
  [TARGET_DISCOVERY_ID]: "02d10000-0000-4000-8000-000000000001",
};

const scanRoots = [
  "assets/experiencias/infantil/ei4",
  "assets/experiencias/infantil/compartilhados",
  "assets/games/caixa-misteriosa",
  "assets/builds/caixa-misteriosa-avaliacao-01",
  "assets/builds/caixa-misteriosa-premium-01",
  "assets/experiencias/jardim-das-descobertas",
  "assets/game-engine-2/assets/caixa-misteriosa",
];

const mimeByExt = new Map([
  [".css", "text/css"],
  [".js", "application/javascript"],
  [".json", "application/json"],
  [".md", "text/markdown"],
  [".mp3", "audio/mpeg"],
  [".mp4", "video/mp4"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

function fileInfo(relativePath, role, canonicalContentId, relation) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return {
      sourcePath: relativePath,
      present: false,
      type: classify(relativePath),
      mime: mimeByExt.get(path.extname(relativePath).toLowerCase()) || "application/octet-stream",
      size: null,
      role,
      canonicalContentId,
      relation,
    };
  }

  const stat = fs.statSync(absolutePath);
  return {
    sourcePath: relativePath,
    present: true,
    type: classify(relativePath),
    mime: mimeByExt.get(path.extname(relativePath).toLowerCase()) || "application/octet-stream",
    size: stat.size,
    role,
    canonicalContentId,
    relation,
  };
}

function classify(relativePath) {
  const ext = path.extname(relativePath).toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) return "image";
  if ([".mp3", ".wav", ".ogg", ".m4a"].includes(ext)) return "audio";
  if ([".mp4", ".webm", ".mov"].includes(ext)) return "video";
  if (ext === ".json") return "animation-or-data";
  if (ext === ".css") return "style";
  if (ext === ".js") return "config-or-code";
  return "other";
}

function walk(relativeRoot, files = []) {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return files;

  for (const entry of fs.readdirSync(absoluteRoot, { withFileTypes: true })) {
    const relativePath = path.join(relativeRoot, entry.name);
    if (entry.isDirectory()) {
      walk(relativePath, files);
    } else if (!entry.name.endsWith(".gitkeep")) {
      files.push(relativePath);
    }
  }

  return files;
}

function catalogAsset(code) {
  return catalog.getExperienceAsset(code);
}

function declaredAssetPaths(code, role, canonicalContentId) {
  const asset = catalogAsset(code);
  if (!asset) return [];

  const paths = [];
  if (asset.filePath) paths.push(fileInfo(asset.filePath, role, canonicalContentId, `${code}:filePath`));
  if (asset.provisionalFilePath) paths.push(fileInfo(asset.provisionalFilePath, role, canonicalContentId, `${code}:provisionalFilePath`));
  if (asset.coverPath) paths.push(fileInfo(asset.coverPath, "cover/poster", canonicalContentId, `${code}:coverPath`));
  return paths;
}

function uniqueBySourcePath(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.sourcePath}:${item.role}:${item.canonicalContentId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function main() {
  const discovery = catalog.getExperienceDefinition(TARGET_DISCOVERY_ID);
  const activity = catalog.getInteractiveActivityDefinition(TARGET_ACTIVITY_ID);
  if (!discovery || !activity) {
    throw new Error("Target EI4 content was not found in infantil-experience-catalog.js.");
  }

  const activityAssets = uniqueBySourcePath([
    ...declaredAssetPaths(activity.openingResource?.assetCode, "opening resource", TARGET_ACTIVITY_ID),
    ...declaredAssetPaths(activity.feedback?.correct?.audioAsset, "correct feedback audio", TARGET_ACTIVITY_ID),
    ...declaredAssetPaths(activity.feedback?.incorrect?.audioAsset, "retry feedback audio", TARGET_ACTIVITY_ID),
    fileInfo("css:ladybug", "generated scene object", TARGET_ACTIVITY_ID, "css generated asset"),
  ]);

  const discoveryAssetCodes = new Set();
  if (discovery.coverAssetCode) discoveryAssetCodes.add(discovery.coverAssetCode);
  if (discovery.openingAssetCode) discoveryAssetCodes.add(discovery.openingAssetCode);
  if (discovery.instructionAudioCode) discoveryAssetCodes.add(discovery.instructionAudioCode);
  if (discovery.completionAssetCode) discoveryAssetCodes.add(discovery.completionAssetCode);
  for (const code of discovery.sharedAssetCodes || []) discoveryAssetCodes.add(code);
  for (const resource of discovery.resources || []) {
    if (resource.assetCode) discoveryAssetCodes.add(resource.assetCode);
  }

  const discoveryAssets = uniqueBySourcePath(
    [...discoveryAssetCodes].flatMap((code) => declaredAssetPaths(code, "declared discovery asset", TARGET_DISCOVERY_ID)),
  );

  const declaredPhysical = uniqueBySourcePath([...activityAssets, ...discoveryAssets]).filter((item) => item.sourcePath !== "css:ladybug");
  const declaredButMissing = declaredPhysical.filter((item) => !item.present);
  const declaredAndPresent = declaredPhysical.filter((item) => item.present);

  const allCandidates = scanRoots.flatMap((root) => walk(root));
  const declaredPaths = new Set(declaredPhysical.map((item) => item.sourcePath));
  const presentButUnmapped = allCandidates
    .filter((item) => !declaredPaths.has(item))
    .map((item) => fileInfo(item, "unmapped candidate", "UNMAPPED", "physical candidate only"));

  const ingestionCandidates = declaredAndPresent.map((item) => {
    const bucket = item.type === "video" ? "videos" : item.type === "audio" ? "audios" : "images";
    const contentUuid = CANONICAL_UUID_BY_ID[item.canonicalContentId] || item.canonicalContentId;
    return {
      sourcePath: item.sourcePath,
      bucket,
      storagePath: `early-childhood/${contentUuid}/${path.basename(item.sourcePath)}`,
      mime: item.mime,
      size: item.size,
      canonicalContentId: item.canonicalContentId,
      contentUuid,
      role: item.role,
      status: "ready_for_private_upload",
    };
  });

  const result = {
    generatedAt: new Date().toISOString(),
    targets: {
      activity: TARGET_ACTIVITY_ID,
      discovery: TARGET_DISCOVERY_ID,
    },
    summary: {
      declaredAndPresentCount: declaredAndPresent.length,
      declaredButMissingCount: declaredButMissing.length,
      presentButUnmappedCount: presentButUnmapped.length,
      activityRealAssetsCount: activityAssets.filter((item) => item.present || item.sourcePath === "css:ladybug").length,
      discoveryRealAssetsCount: discoveryAssets.filter((item) => item.present).length,
      videoRs020: exists("assets/video/RS-020-video-institucional.mp4") ? "PRESENT" : "MISSING",
      audioAssets: declaredPhysical.some((item) => item.type === "audio" && item.present) ? "PRESENT" : "ABSENT",
    },
    declaredAndPresent,
    declaredButMissing,
    presentButUnmapped,
    ingestionCandidates,
    notes: [
      "This script does not upload files.",
      "Unmapped candidates require editorial/engineering mapping before private ingestion.",
      "Generated CSS assets do not require Storage ingestion.",
    ],
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main();
