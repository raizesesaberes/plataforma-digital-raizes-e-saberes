import { createClient } from "npm:@supabase/supabase-js@2.57.4";

type JsonRecord = Record<string, unknown>;
type ReportFormat = "pdf" | "xlsx";
type ReportType = "attendance" | "diary" | "avalia" | "school-analytics" | "network-analytics";

type GeneratePayload = {
  action?: "generate" | "list";
  format?: ReportFormat;
  reportType?: ReportType;
  audience?: "teacher" | "secretaria" | "municipal";
  title?: string;
  subtitle?: string;
  scope?: {
    kind?: "class" | "school" | "network";
    schoolId?: string | null;
    classId?: string | null;
    studentId?: string | null;
    networkId?: string | null;
  };
  period?: {
    from?: string | null;
    to?: string | null;
  };
  params?: JsonRecord;
  limit?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: JsonRecord, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const textEncoder = new TextEncoder();
const safeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, "")
    .trim();

const xmlEscape = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const pdfEscape = (value: unknown) => safeText(value).replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");

const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
};

const sha256Hex = async (bytes: Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const flattenRows = (snapshot: JsonRecord) => {
  const rows =
    (Array.isArray(snapshot.rows) && snapshot.rows) ||
    (Array.isArray(snapshot.assignments) && snapshot.assignments) ||
    (Array.isArray(snapshot.entries) && snapshot.entries) ||
    (Array.isArray(snapshot.schools) && snapshot.schools) ||
    [];
  return rows as JsonRecord[];
};

const summaryRows = (summary: JsonRecord = {}) =>
  Object.entries(summary)
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== "object")
    .map(([key, value]) => ({ indicador: key.replaceAll("_", " "), valor: String(value ?? "") }));

const buildReportLines = (meta: JsonRecord, snapshot: JsonRecord) => {
  const lines = [
    "Raizes e Saberes",
    safeText(meta.title || "Relatorio oficial"),
    safeText(meta.subtitle || ""),
    `Identificador: ${safeText(meta.reportIdentifier)}`,
    `Periodo: ${safeText(meta.dateFrom)} a ${safeText(meta.dateTo)}`,
    `Emissao: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "Resumo",
  ].filter((line) => line !== "");

  summaryRows((snapshot.summary || {}) as JsonRecord).forEach((row) => {
    lines.push(`${safeText(row.indicador)}: ${safeText(row.valor)}`);
  });
  lines.push("", "Dados");
  flattenRows(snapshot).slice(0, 120).forEach((row, index) => {
    const title =
      row.student_name ||
      row.class_name ||
      row.school_name ||
      row.assessment_title ||
      row.title ||
      row.entry_date ||
      `Registro ${index + 1}`;
    const detail = Object.entries(row)
      .filter(([, value]) => value !== null && value !== undefined && typeof value !== "object")
      .slice(0, 8)
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(" | ");
    lines.push(`${index + 1}. ${safeText(title)} - ${safeText(detail)}`);
  });
  if (!flattenRows(snapshot).length) lines.push("Sem linhas para o periodo selecionado.");
  return lines;
};

const buildPdf = (meta: JsonRecord, snapshot: JsonRecord) => {
  const allLines = buildReportLines(meta, snapshot);
  const pageLineCount = 32;
  const pages: string[][] = [];
  for (let i = 0; i < allLines.length; i += pageLineCount) pages.push(allLines.slice(i, i + pageLineCount));
  if (!pages.length) pages.push(["Sem dados."]);

  const objects: string[] = [];
  const addObject = (body: string) => {
    objects.push(body);
    return objects.length;
  };
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  const contentIds: number[] = [];
  pages.forEach((lines, pageIndex) => {
    const text = [
      "BT",
      "/F1 11 Tf",
      "50 790 Td",
      "14 TL",
      ...lines.map((line) => `(${pdfEscape(line).slice(0, 145)}) Tj T*`),
      "ET",
      "BT",
      "/F1 9 Tf",
      "50 30 Td",
      `(${pdfEscape(`Relatorio ${meta.reportIdentifier} - pagina ${pageIndex + 1} de ${pages.length}`)}) Tj`,
      "ET",
    ].join("\n");
    const stream = `<< /Length ${textEncoder.encode(text).length} >>\nstream\n${text}\nendstream`;
    contentIds.push(addObject(stream));
    pageIds.push(0);
  });
  const pagesIdPlaceholder = -1;
  pages.forEach((_lines, index) => {
    pageIds[index] = addObject(`<< /Type /Page /Parent ${pagesIdPlaceholder} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`);
  });
  const pagesBody = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  const pagesId = addObject(pagesBody);
  for (const pageId of pageIds) objects[pageId - 1] = objects[pageId - 1].replace(`${pagesIdPlaceholder} 0 R`, `${pagesId} 0 R`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(textEncoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = textEncoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return textEncoder.encode(pdf);
};

const crcTable = new Uint32Array(256).map((_value, index) => {
  let c = index;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  bytes.forEach((byte) => {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  });
  return (crc ^ 0xffffffff) >>> 0;
};
const u16 = (value: number) => [value & 0xff, (value >>> 8) & 0xff];
const u32 = (value: number) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff];
const concatBytes = (parts: Uint8Array[]) => {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  parts.forEach((part) => {
    out.set(part, offset);
    offset += part.length;
  });
  return out;
};
const zipStore = (files: { name: string; content: string }[]) => {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  files.forEach((file) => {
    const name = textEncoder.encode(file.name);
    const content = textEncoder.encode(file.content);
    const crc = crc32(content);
    const local = new Uint8Array([
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc),
      ...u32(content.length), ...u32(content.length), ...u16(name.length), ...u16(0),
    ]);
    localParts.push(local, name, content);
    const central = new Uint8Array([
      ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(crc),
      ...u32(content.length), ...u32(content.length), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0),
      ...u16(0), ...u32(0), ...u32(offset),
    ]);
    centralParts.push(central, name);
    offset += local.length + name.length + content.length;
  });
  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array([
    ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
    ...u32(centralSize), ...u32(offset), ...u16(0),
  ]);
  return concatBytes([...localParts, ...centralParts, end]);
};

const buildXlsx = (meta: JsonRecord, snapshot: JsonRecord) => {
  const rows: (string | number)[][] = [
    ["Relatorio", safeText(meta.title)],
    ["Identificador", safeText(meta.reportIdentifier)],
    ["Periodo", `${safeText(meta.dateFrom)} a ${safeText(meta.dateTo)}`],
    [],
    ["Resumo", "Valor"],
    ...summaryRows((snapshot.summary || {}) as JsonRecord).map((row) => [row.indicador, row.valor]),
    [],
  ];
  const dataRows = flattenRows(snapshot);
  const keys = Array.from(new Set(dataRows.flatMap((row) => Object.keys(row).filter((key) => typeof row[key] !== "object")))).slice(0, 20);
  if (keys.length) {
    rows.push(keys);
    dataRows.forEach((row) => rows.push(keys.map((key) => String(row[key] ?? ""))));
  } else {
    rows.push(["Dados"], ["Sem linhas para o periodo selecionado."]);
  }
  const sheetData = rows.map((row, rIndex) => {
    const cells = row.map((cell, cIndex) => {
      const col = String.fromCharCode(65 + cIndex);
      return `<c r="${col}${rIndex + 1}" t="inlineStr"><is><t>${xmlEscape(cell)}</t></is></c>`;
    }).join("");
    return `<row r="${rIndex + 1}">${cells}</row>`;
  }).join("");
  const files = [
    { name: "[Content_Types].xml", content: `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { name: "_rels/.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", content: `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatorio" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", content: `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", content: `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Arial"/></font></fonts><fills count="1"><fill><patternFill patternType="none"/></fill></fills><borders count="1"><border/></borders><cellXfs count="1"><xf/></cellXfs></styleSheet>` },
    { name: "xl/worksheets/sheet1.xml", content: `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>` },
  ];
  return zipStore(files);
};

const pickReportRpc = (payload: GeneratePayload) => {
  const scope = payload.scope || {};
  const period = payload.period || {};
  if (payload.reportType === "attendance") {
    return {
      rpc: "report_get_attendance",
      args: {
        p_scope: scope.kind === "class" ? "class" : scope.kind === "network" ? "network" : "school",
        p_school_id: scope.schoolId || null,
        p_class_id: scope.classId || null,
        p_student_id: scope.studentId || null,
        p_network_id: scope.networkId || null,
        p_date_from: period.from || null,
        p_date_to: period.to || null,
      },
    };
  }
  if (payload.reportType === "diary") {
    return {
      rpc: "report_get_class_diary",
      args: {
        p_school_id: scope.schoolId || null,
        p_class_id: scope.classId || null,
        p_teacher_id: null,
        p_date_from: period.from || null,
        p_date_to: period.to || null,
      },
    };
  }
  if (payload.reportType === "avalia") {
    return {
      rpc: "report_get_avalia",
      args: {
        p_school_id: scope.schoolId || null,
        p_class_id: scope.classId || null,
        p_assignment_id: null,
        p_date_from: period.from || null,
        p_date_to: period.to || null,
      },
    };
  }
  if (payload.reportType === "school-analytics") {
    return {
      rpc: "analytics_get_school_overview",
      args: {
        p_school_id: scope.schoolId || null,
        p_date_from: period.from || null,
        p_date_to: period.to || null,
      },
    };
  }
  return {
    rpc: "network_get_overview",
    args: {
      p_network_id: scope.networkId || null,
      p_date_from: period.from || null,
      p_date_to: period.to || null,
    },
  };
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ ok: false, code: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ ok: false, code: "server_misconfigured", message: "Servico de relatorios indisponivel." }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "");
  if (!callerToken) return json({ ok: false, code: "missing_session", message: "Sessao obrigatoria." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${callerToken}` } },
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data: callerData, error: callerError } = await userClient.auth.getUser(callerToken);
  const caller = callerData?.user;
  if (callerError || !caller?.id) return json({ ok: false, code: "invalid_session", message: "Sessao invalida." }, 401);

  const payload = (await request.json().catch(() => ({}))) as GeneratePayload;
  if (payload.action === "list") {
    const limit = Math.min(Math.max(Number(payload.limit || 8), 1), 25);
    const { data, error } = await userClient
      .from("official_report_exports")
      .select("id,report_identifier,status,report_type,format,scope_kind,school_id,class_id,network_id,date_from,date_to,file_name,mime_type,file_size,sha256,ready_at,created_at,requested_by")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return json({ ok: false, code: "history_failed", message: error.message }, 400);
    return json({ ok: true, reports: data || [] });
  }

  if (!payload.reportType || !payload.format || !["pdf", "xlsx"].includes(payload.format)) {
    return json({ ok: false, code: "invalid_payload", message: "Relatorio e formato obrigatorios." }, 400);
  }

  const scope = payload.scope || {};
  const period = payload.period || {};
  const { rpc, args } = pickReportRpc(payload);
  const { data: snapshot, error: liveError } = await userClient.rpc(rpc, args);
  if (liveError) return json({ ok: false, code: "live_report_blocked", message: liveError.message }, 403);

  const insertPayload = {
    status: "processing",
    report_type: payload.reportType,
    format: payload.format,
    scope_kind: scope.kind || (payload.reportType === "network-analytics" ? "network" : scope.classId ? "class" : "school"),
    school_id: scope.schoolId || null,
    class_id: scope.classId || null,
    student_id: scope.studentId || null,
    network_id: scope.networkId || null,
    date_from: period.from || null,
    date_to: period.to || null,
    requested_by: caller.id,
    requested_role: String(caller.app_metadata?.platform_role || caller.app_metadata?.role || ""),
    params: { ...(payload.params || {}), rpc, args, audience: payload.audience || null },
    snapshot_json: snapshot || {},
    source: "live_rpc",
  };

  const { data: job, error: jobError } = await adminClient
    .from("official_report_exports")
    .insert(insertPayload)
    .select("*")
    .single();
  if (jobError || !job) return json({ ok: false, code: "snapshot_failed", message: jobError?.message || "Falha ao criar snapshot." }, 500);

  const meta = {
    title: payload.title || "Relatorio oficial",
    subtitle: payload.subtitle || "",
    reportIdentifier: job.report_identifier,
    dateFrom: period.from || "",
    dateTo: period.to || "",
  };
  const snapshotHash = await sha256Hex(textEncoder.encode(JSON.stringify(snapshot || {})));
  const bytes = payload.format === "pdf" ? buildPdf(meta, (snapshot || {}) as JsonRecord) : buildXlsx(meta, (snapshot || {}) as JsonRecord);
  const fileHash = await sha256Hex(bytes);
  const fileName = `${job.report_identifier}.${payload.format}`;
  const mimeType =
    payload.format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const { error: fileError } = await adminClient.from("official_report_files").insert({
    report_id: job.id,
    format: payload.format,
    file_name: fileName,
    mime_type: mimeType,
    file_bytes: `\\x${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("")}`,
    file_size: bytes.length,
    sha256: fileHash,
  });
  if (fileError) {
    await adminClient.from("official_report_exports").update({ status: "failed", failed_reason: fileError.message }).eq("id", job.id);
    return json({ ok: false, code: "file_failed", message: fileError.message }, 500);
  }

  const { data: readyJob, error: readyError } = await adminClient
    .from("official_report_exports")
    .update({
      status: "ready",
      snapshot_hash: snapshotHash,
      file_name: fileName,
      mime_type: mimeType,
      file_size: bytes.length,
      sha256: fileHash,
      ready_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .select("*")
    .single();
  if (readyError) return json({ ok: false, code: "ready_failed", message: readyError.message }, 500);

  await adminClient.from("official_report_events").insert({
    report_id: job.id,
    actor_user_id: caller.id,
    action: "generated",
    details: { format: payload.format, report_type: payload.reportType, file_size: bytes.length },
  });

  return json({
    ok: true,
    report: readyJob,
    file: {
      name: fileName,
      mimeType,
      size: bytes.length,
      sha256: fileHash,
      base64: toBase64(bytes),
    },
  });
});
