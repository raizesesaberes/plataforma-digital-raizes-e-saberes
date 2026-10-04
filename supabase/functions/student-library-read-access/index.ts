import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type ReadAccessPayload = {
  bookId?: string;
  assetKind?: "pdf" | "page" | "thumb" | "manifest";
  pageNumber?: number;
};

type ReadAsset = {
  book_id: string;
  legacy_id: string | null;
  title: string;
  asset_kind: "pdf" | "paged_images";
  asset_bucket: string;
  asset_path: string;
  mime_type: string;
  expires_in_seconds: number;
};

type PageRow = {
  numero_pagina: number;
  imagem_url: string | null;
};

type ProgressRow = {
  legacy_id?: string | null;
  title?: string | null;
  current_page: number | null;
  percent_complete: number | null;
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
const pagePathPattern = /^library\/[0-9a-f-]{36}\/pages\/page-\d{3}\.jpg$/i;

const toPositiveInteger = (value: unknown) => {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1) return null;
  return value;
};

const deriveThumbPath = (pagePath: string) => pagePath.replace("/pages/", "/thumbs/");

const getAuthorizedPages = async (
  userClient: ReturnType<typeof createClient>,
  adminClient: ReturnType<typeof createClient>,
  bookId: string,
) => {
  const { data: canRead, error: canReadError } = await userClient.rpc("student_can_read_library_book", {
    p_book_id: bookId,
  });

  if (canReadError) {
    return { ok: false as const, status: 400, code: "read_access_blocked", message: canReadError.message };
  }

  if (canRead !== true) {
    return { ok: false as const, status: 403, code: "read_access_blocked", message: "Livro nao autorizado para este aluno." };
  }

  const { data: pageRows, error: pagesError } = await adminClient
    .from("pages")
    .select("numero_pagina, imagem_url")
    .eq("book_id", bookId)
    .order("numero_pagina", { ascending: true });

  if (pagesError) {
    return { ok: false as const, status: 500, code: "page_manifest_failed", message: "Manifesto de paginas indisponivel." };
  }

  const pages = ((pageRows || []) as PageRow[]).filter((page) => {
    const pageNumber = toPositiveInteger(page.numero_pagina);
    const expectedPath =
      pageNumber === null ? "" : `library/${bookId}/pages/page-${String(pageNumber).padStart(3, "0")}.jpg`;
    return (
      pageNumber !== null &&
      typeof page.imagem_url === "string" &&
      page.imagem_url === expectedPath &&
      pagePathPattern.test(page.imagem_url)
    );
  });

  if (!pages.length) {
    return { ok: false as const, status: 404, code: "page_manifest_missing", message: "Paginas do livro nao configuradas." };
  }

  return { ok: true as const, pages };
};

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const secretKey = getSecretKey();
  if (!supabaseUrl || !anonKey || !secretKey) {
    return json({ ok: false, code: "server_misconfigured", message: "Servico de leitura indisponivel." }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) return json({ ok: false, code: "missing_session", message: "Sessao obrigatoria." }, 401);

  const payload = (await request.json().catch(() => ({}))) as ReadAccessPayload;
  const bookId = String(payload.bookId || "").trim();
  if (!uuidPattern.test(bookId)) {
    return json({ ok: false, code: "invalid_book_id", message: "Livro canonico obrigatorio." }, 400);
  }
  const assetKind = payload.assetKind || "pdf";
  if (!["pdf", "page", "thumb", "manifest"].includes(assetKind)) {
    return json({ ok: false, code: "invalid_asset_kind", message: "Tipo de asset invalido." }, 400);
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

  if (assetKind === "manifest" || assetKind === "page" || assetKind === "thumb") {
    const authorizedPages = await getAuthorizedPages(userClient, adminClient, bookId);
    if (!authorizedPages.ok) {
      return json({ ok: false, code: authorizedPages.code, message: authorizedPages.message }, authorizedPages.status);
    }

    const pages = authorizedPages.pages;
    const firstPage = pages[0]?.numero_pagina || 1;
    const lastPage = pages[pages.length - 1]?.numero_pagina || pages.length;
    const pageCount = pages.length;

    const { data: detailData } = await userClient.rpc("student_get_library_book", { p_book_id: bookId });
    const detail = Array.isArray(detailData) ? detailData[0] : undefined;
    const currentPage = Math.min(
      Math.max(Number((detail as ProgressRow | undefined)?.current_page || firstPage), firstPage),
      lastPage,
    );

    if (assetKind === "manifest") {
      return json({
        ok: true,
        book: {
          id: bookId,
          legacyId: detail?.legacy_id || null,
          title: detail?.title || null,
        },
        manifest: {
          pageCount,
          firstPage,
          lastPage,
          currentPage,
          hasPages: true,
          hasThumbs: true,
          expiresIn: 300,
        },
      });
    }

    const pageNumber = toPositiveInteger(payload.pageNumber);
    if (pageNumber === null || pageNumber < firstPage || pageNumber > lastPage) {
      return json({ ok: false, code: "page_out_of_range", message: "Pagina fora do intervalo autorizado." }, 400);
    }

    const page = pages.find((item) => item.numero_pagina === pageNumber);
    if (!page?.imagem_url) {
      return json({ ok: false, code: "page_missing", message: "Pagina nao configurada." }, 404);
    }

    const objectPath = assetKind === "thumb" ? deriveThumbPath(page.imagem_url) : page.imagem_url;
    const { data: signed, error: signedError } = await adminClient.storage.from("pages").createSignedUrl(objectPath, 300);

    if (signedError || !signed?.signedUrl) {
      return json({ ok: false, code: "signed_url_failed", message: signedError?.message || "Falha ao gerar acesso temporario." }, 500);
    }

    return json({
      ok: true,
      book: {
        id: bookId,
        legacyId: detail?.legacy_id || null,
        title: detail?.title || null,
      },
      asset: {
        kind: assetKind,
        pageNumber,
        pageCount,
        mimeType: "image/jpeg",
        signedUrl: signed.signedUrl,
        expiresIn: 300,
      },
    });
  }

  const { data, error } = await userClient.rpc("student_get_library_read_asset", { p_book_id: bookId });
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404 : 400;
    return json({ ok: false, code: "read_access_blocked", message: error.message }, status);
  }

  const asset = Array.isArray(data) ? (data[0] as ReadAsset | undefined) : undefined;
  if (!asset?.asset_bucket || !asset.asset_path) {
    return json({ ok: false, code: "read_asset_missing", message: "Asset de leitura nao configurado." }, 404);
  }

  const expiresIn = Math.min(Math.max(Number(asset.expires_in_seconds || 300), 60), 600);
  const { data: signed, error: signedError } = await adminClient.storage
    .from(asset.asset_bucket)
    .createSignedUrl(asset.asset_path, expiresIn);

  if (signedError || !signed?.signedUrl) {
    return json({ ok: false, code: "signed_url_failed", message: signedError?.message || "Falha ao gerar acesso temporario." }, 500);
  }

  return json({
    ok: true,
    book: {
      id: asset.book_id,
      legacyId: asset.legacy_id,
      title: asset.title,
    },
    asset: {
      kind: asset.asset_kind,
      mimeType: asset.mime_type,
      signedUrl: signed.signedUrl,
      expiresIn,
    },
  });
});
