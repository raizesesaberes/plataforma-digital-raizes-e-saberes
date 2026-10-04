import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type ContentKind = "activity" | "discovery" | "game";
type RequestMode = "manifest" | "asset";

type AssetAccessPayload = {
  contentKind?: ContentKind;
  contentId?: string;
  mode?: RequestMode;
  assetId?: string;
};

type ContentAsset = {
  legacy_id: string;
  asset_type: string;
  title: string | null;
  bucket: string | null;
  storage_path: string | null;
  mime_type: string | null;
  storage_access: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

type GameAsset = ContentAsset & {
  role: string;
  sort_order?: number | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const assetIdPattern = /^(RS-EI[0-9A-Z-]+|css:[a-z0-9-]+)$/i;

const getSecretKey = () => {
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, string>;
      if (parsed.default) return parsed.default;
      const firstKey = Object.values(parsed).find(Boolean);
      if (firstKey) return firstKey;
    } catch (_error) {
      // Fall through to legacy names below.
    }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY") || "";
};

const collectAssetIds = (value: unknown, output = new Set<string>()) => {
  if (typeof value === "string") {
    if (assetIdPattern.test(value)) output.add(value);
    return output;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectAssetIds(item, output));
    return output;
  }

  if (value && typeof value === "object") {
    Object.values(value as Record<string, unknown>).forEach((item) => collectAssetIds(item, output));
  }

  return output;
};

const blockedManifestKeys = new Set([
  "bucket",
  "storage_path",
  "storagePath",
  "local_path",
  "localPath",
  "signedUrl",
  "signed_url",
  "url",
  "path",
]);

const sanitizeManifestValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => sanitizeManifestValue(item));
  if (!value || typeof value !== "object") return value;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((safe, [key, item]) => {
    if (blockedManifestKeys.has(key)) return safe;
    if (/(password|senha|token|secret|service_role|access_token|refresh_token)/i.test(key)) return safe;
    safe[key] = sanitizeManifestValue(item);
    return safe;
  }, {});
};

const publicManifestFor = (contentKind: ContentKind, content: Record<string, unknown>) => {
  const base = {
    id: content.id,
    legacyId: content.legacy_id,
    title: content.title,
    type:
      contentKind === "activity"
        ? content.activity_type
        : contentKind === "discovery"
          ? content.discovery_type
          : content.game_type,
    status: content.status,
    progressStatus: content.progress_status,
    assetIds: [...collectAssetIds(content)].sort(),
  };

  if (contentKind === "activity") {
    return {
      ...base,
      instruction: content.instruction,
      narrationText: content.narration_text,
      engineMetadata: content.engine_metadata,
      completionRule: content.completion_rule,
    };
  }

  if (contentKind === "game") {
    const assets = Array.isArray(content.assets) ? content.assets : [];
    const gameAssets = assets
      .map((asset) => asset as Record<string, unknown>)
      .filter((asset) => asset.storage_access === "private" && asset.status === "published");
    return {
      ...base,
      assetIds: gameAssets.map((asset) => String(asset.legacy_id || "")).filter(Boolean).sort(),
      studentInstruction: content.student_instruction,
      engine: content.engine,
      entrypoint: content.entrypoint,
      orientation: content.orientation,
      engineConfig: sanitizeManifestValue(content.engine_config),
      completionRule: content.completion_rule,
      scoreRule: content.score_rule,
      assets: gameAssets.map((row) => {
        return {
          id: row.legacy_id,
          legacyId: row.legacy_id,
          role: row.role,
          type: row.asset_type,
          title: row.title,
          mimeType: row.mime_type,
          storageAccess: row.storage_access,
          status: row.status,
          metadata: sanitizeManifestValue(row.metadata),
        };
      }),
    };
  }

  const hotspots = Array.isArray(content.hotspots) ? content.hotspots : [];
  return {
    ...base,
    studentInstruction: content.student_instruction,
    resources: content.resources,
    completionRule: content.completion_rule,
    hotspots: hotspots.map((hotspot) => ({
      id: hotspot.id,
      legacyId: hotspot.legacy_id,
      title: hotspot.title,
      sortOrder: hotspot.sort_order,
      xPercent: hotspot.x_percent,
      yPercent: hotspot.y_percent,
      widthPercent: hotspot.width_percent,
      heightPercent: hotspot.height_percent,
      actionType: hotspot.action_type,
      targetType: hotspot.target_type,
      targetLegacyId: hotspot.target_legacy_id,
      assetLegacyId: hotspot.asset_legacy_id,
      audioAssetLegacyId: hotspot.audio_asset_legacy_id,
      accessibilityLabel: hotspot.accessibility_label,
      metadata: hotspot.metadata,
    })),
  };
};

const assetBelongsToContent = (
  asset: ContentAsset,
  contentKind: ContentKind,
  contentId: string,
  content: Record<string, unknown>,
  allowedAssetIds: Set<string>,
) => {
  if (allowedAssetIds.has(asset.legacy_id)) return true;

  const metadata = asset.metadata || {};
  const ownerKind = typeof metadata.owner_kind === "string" ? metadata.owner_kind : null;
  const ownerUuid = typeof metadata.owner_uuid === "string" ? metadata.owner_uuid : null;
  const ownerLegacyId = typeof metadata.owner_legacy_id === "string" ? metadata.owner_legacy_id : null;
  const expectedKind = contentKind === "activity" ? "activity" : contentKind === "discovery" ? "discovery" : "game";
  const contentLegacyId = typeof content.legacy_id === "string" ? content.legacy_id : null;

  return ownerKind === expectedKind && ownerUuid === contentId && (!ownerLegacyId || ownerLegacyId === contentLegacyId);
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = getSecretKey();
  if (!supabaseUrl || !anonKey || !secretKey) {
    return json({ ok: false, code: "server_misconfigured", message: "Servico de assets indisponivel." }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) return json({ ok: false, code: "missing_session", message: "Sessao obrigatoria." }, 401);

  const payload = (await request.json().catch(() => ({}))) as AssetAccessPayload;
  const contentKind = payload.contentKind;
  const contentId = String(payload.contentId || "").trim();
  const mode = payload.mode || "manifest";

  if (contentKind !== "activity" && contentKind !== "discovery" && contentKind !== "game") {
    return json({ ok: false, code: "invalid_content_kind", message: "Tipo de conteudo invalido." }, 400);
  }
  if (!uuidPattern.test(contentId)) {
    return json({ ok: false, code: "invalid_content_id", message: "Conteudo canonico obrigatorio." }, 400);
  }
  if (mode !== "manifest" && mode !== "asset") {
    return json({ ok: false, code: "invalid_mode", message: "Modo invalido." }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const adminClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser(callerToken);
  const caller = callerData?.user;
  if (callerError || !caller?.id) {
    return json({ ok: false, code: "invalid_session", message: "Sessao invalida." }, 401);
  }

  const getRpc =
    contentKind === "activity"
      ? "student_get_activity"
      : contentKind === "discovery"
        ? "student_get_discovery"
        : "student_get_game";
  const getArgs =
    contentKind === "activity"
      ? { p_activity_id: contentId }
      : contentKind === "discovery"
        ? { p_discovery_id: contentId }
        : { p_game_id: contentId };

  const { data: contentData, error: contentError } = await userClient.rpc(getRpc, getArgs);
  const content = Array.isArray(contentData) ? (contentData[0] as Record<string, unknown> | undefined) : undefined;
  if (contentError) return json({ ok: false, code: "content_read_failed", message: contentError.message }, 400);
  if (!content) return json({ ok: false, code: "content_not_authorized", message: "Conteudo nao autorizado para este aluno." }, 403);

  const allowedAssetIds = collectAssetIds(content);
  if (mode === "manifest") {
    return json({
      ok: true,
      contentKind,
      content: publicManifestFor(contentKind, content),
      contract: {
        assetAccess: "on_demand",
        privatePathLeak: false,
        expiresIn: 300,
      },
    });
  }

  const assetId = String(payload.assetId || "").trim();
  if (!assetIdPattern.test(assetId)) {
    return json({ ok: false, code: "invalid_asset_id", message: "Asset canonico obrigatorio." }, 400);
  }
  if (assetId.startsWith("css:")) {
    if (!allowedAssetIds.has(assetId)) {
      return json({ ok: false, code: "asset_not_bound_to_content", message: "Asset nao pertence ao conteudo autorizado." }, 403);
    }
    return json({
      ok: true,
      contentKind,
      asset: {
        id: assetId,
        kind: "generated",
        signedUrl: null,
        expiresIn: 0,
      },
    });
  }

  const assetQuery =
    contentKind === "game"
      ? adminClient
          .from("student_game_assets")
          .select("legacy_id, role, asset_type, title, bucket, storage_path, mime_type, storage_access, status, metadata")
          .eq("game_id", contentId)
          .eq("legacy_id", assetId)
          .limit(1)
      : adminClient
          .from("early_childhood_content_assets")
          .select("legacy_id, asset_type, title, bucket, storage_path, mime_type, storage_access, status, metadata")
          .eq("legacy_id", assetId)
          .limit(1);

  const { data: assetRows, error: assetError } = await assetQuery;

  if (assetError) return json({ ok: false, code: "asset_lookup_failed", message: "Asset indisponivel." }, 500);
  const asset = Array.isArray(assetRows) ? (assetRows[0] as ContentAsset | GameAsset | undefined) : undefined;
  if (!asset) return json({ ok: false, code: "asset_not_found", message: "Asset nao encontrado." }, 404);
  if (contentKind !== "game" && !assetBelongsToContent(asset, contentKind, contentId, content, allowedAssetIds)) {
    return json({ ok: false, code: "asset_not_bound_to_content", message: "Asset nao pertence ao conteudo autorizado." }, 403);
  }
  if (asset.storage_access !== "private" || asset.status !== "published" || !asset.bucket || !asset.storage_path) {
    return json({ ok: false, code: "asset_not_ingested", message: "Asset privado ainda nao ingerido." }, 404);
  }

  const { data: signed, error: signedError } = await adminClient.storage.from(asset.bucket).createSignedUrl(asset.storage_path, 300);
  if (signedError || !signed?.signedUrl) {
    return json({ ok: false, code: "signed_url_failed", message: "Falha ao gerar acesso temporario." }, 500);
  }

  return json({
    ok: true,
    contentKind,
    asset: {
      id: asset.legacy_id,
      type: asset.asset_type,
      title: asset.title,
      mimeType: asset.mime_type,
      signedUrl: signed.signedUrl,
      expiresIn: 300,
    },
  });
});
