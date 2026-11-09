import { rpc, type MobileSession } from "./library";

export type DiaryContext = { schoolId: string; classId: string; date: string };
export type DiaryEntry = {
  id: string; schoolId: string; classId: string; teacherId: string; date: string;
  title: string; taughtContent: string; pedagogicalNotes: string;
  planId: string | null; calendarEntryId: string | null;
  activityLinkCount: number; updatedAt: string; status: "draft" | "closed";
};
export type DiaryDraft = { title: string; taughtContent: string; pedagogicalNotes: string };
export class DiaryError extends Error {
  constructor(public readonly code: "context_changed" | "invalid_response" | "conflict" | "closed" | "busy" | "review_required" | "close_unavailable", public readonly observed?: DiaryEntry | null) {
    super(`diary_${code}`); this.name = "DiaryError";
  }
}
type Transport = typeof rpc;
const uncertain = (error: unknown) => error instanceof TypeError || (error instanceof Error && (error.name === "AbortError" || /:(5\d\d|408)(:|$)/.test(error.message)));
const revision = (entry: DiaryEntry | null) => entry ? `${entry.id}|${entry.updatedAt}` : "|";
const required = (row: Record<string, unknown>, key: string) => {
  if (typeof row[key] !== "string" || !row[key]) throw new DiaryError("invalid_response");
  return row[key] as string;
};
const optionalId = (row: Record<string, unknown>, key: string) => {
  if (!(key in row) || (row[key] !== null && typeof row[key] !== "string")) throw new DiaryError("invalid_response");
  return row[key] as string | null;
};

/** One adapter per live session + school/class/date. No automatic mutation retries.
 * After review_required, explicitly load() and review the returned record before retrying.
 * UI must supply an isCurrent guard tied to the live session and selected context.
 */
export function createHostedDiary(session: MobileSession, context: DiaryContext, isCurrent: () => boolean, transport: Transport = rpc) {
  const owner = session, ownerId = session.userId, ownerToken = session.accessToken, scope = { ...context };
  let busy = false, requiresReview = false;
  const guard = () => {
    if (owner.userId !== ownerId || owner.accessToken !== ownerToken || !owner.userId || !owner.accessToken || !scope.schoolId || !scope.classId || !/^\d{4}-\d{2}-\d{2}$/.test(scope.date) || !isCurrent()) throw new DiaryError("context_changed");
  };
  async function read(): Promise<DiaryEntry | null> {
    guard();
    const rows = await transport<unknown>(owner, "teacher_list_class_diary_entries", { p_class_id: scope.classId, p_from: scope.date, p_to: scope.date });
    guard();
    if (!Array.isArray(rows)) throw new DiaryError("invalid_response");
    const entries = rows.map((value): DiaryEntry => {
      if (!value || typeof value !== "object") throw new DiaryError("invalid_response");
      const r = value as Record<string, unknown>;
      if (r.school_id !== scope.schoolId || r.class_id !== scope.classId || r.entry_date !== scope.date || !["draft", "closed"].includes(String(r.status))) throw new DiaryError("invalid_response");
      const count = Number(r.activity_link_count);
      if (r.activity_link_count === undefined || r.activity_link_count === null || !Number.isInteger(count) || count < 0) throw new DiaryError("invalid_response");
      if (typeof r.title !== "string" || typeof r.taught_content !== "string" || typeof r.pedagogical_notes !== "string") throw new DiaryError("invalid_response");
      return { id: required(r, "id"), schoolId: scope.schoolId, classId: scope.classId, teacherId: required(r, "teacher_id"), date: scope.date,
        title: r.title, taughtContent: r.taught_content, pedagogicalNotes: r.pedagogical_notes,
        planId: optionalId(r, "plan_id"), calendarEntryId: optionalId(r, "calendar_entry_id"), activityLinkCount: count,
        updatedAt: required(r, "updated_at"), status: r.status as DiaryEntry["status"] };
    });
    if (entries.length > 1) throw new DiaryError("invalid_response");
    return entries[0] ?? null;
  }
  function checkExpected(expected: DiaryEntry | null, current: DiaryEntry | null) {
    if (expected && (expected.schoolId !== scope.schoolId || expected.classId !== scope.classId || expected.date !== scope.date)) throw new DiaryError("context_changed");
    if (revision(expected) !== revision(current)) throw new DiaryError("conflict", current);
  }
  async function exclusive<T>(action: () => Promise<T>): Promise<T> {
    guard(); if (busy) throw new DiaryError("busy"); busy = true;
    try { return await action(); } finally { busy = false; }
  }
  async function mutate(expected: DiaryEntry | null, draft: DiaryDraft): Promise<DiaryEntry> {
    return exclusive(async () => {
      if (requiresReview) throw new DiaryError("review_required");
      const before = await read(); checkExpected(expected, before);
      if (before?.status === "closed") throw new DiaryError("closed", before);
      const normalized = { title: draft.title.trim() || "Diário de Classe", taughtContent: draft.taughtContent.trim(), pedagogicalNotes: draft.pedagogicalNotes.trim() };
      const matches = (entry: DiaryEntry | null) => Boolean(entry && (!before || entry.id === before.id) && entry.status === "draft"
        && entry.title === normalized.title
        && entry.taughtContent === normalized.taughtContent
        && entry.pedagogicalNotes === normalized.pedagogicalNotes
        && entry.planId === (before?.planId ?? null) && entry.calendarEntryId === (before?.calendarEntryId ?? null)
        && entry.activityLinkCount === (before?.activityLinkCount ?? 0));
      let resultId: string | null = null;
      try {
        guard();
        const result = await transport<{ diary_entry_id: string }>(owner, "teacher_upsert_class_diary_entry", {
          p_entry_id: before?.id ?? null, p_school_id: scope.schoolId, p_class_id: scope.classId, p_entry_date: scope.date,
          p_title: normalized.title, p_taught_content: normalized.taughtContent, p_pedagogical_notes: normalized.pedagogicalNotes,
          p_plan_id: before?.planId ?? null, p_calendar_entry_id: before?.calendarEntryId ?? null,
          p_activity_links: null, // Preserve links; never substitute [] when editing.
        }, { ifMatch: `"${revision(before)}"` });
        guard();
        resultId = typeof result?.diary_entry_id === "string" ? result.diary_entry_id : null;
        if (!resultId) { requiresReview = true; throw new DiaryError("review_required"); }
      } catch (error) {
        if (!uncertain(error)) throw error; // Never reinterpret 403/409 as success.
        requiresReview = true;
        try {
          const observed = await read();
          if (matches(observed)) { requiresReview = false; return observed!; }
          throw new DiaryError("review_required", observed);
        } catch (readError) {
          if (readError instanceof DiaryError) throw readError;
          throw new DiaryError("review_required");
        }
      }
      requiresReview = true;
      let observed: DiaryEntry | null;
      try { observed = await read(); } catch (error) {
        if (error instanceof DiaryError) throw error;
        throw new DiaryError("review_required");
      }
      if (!matches(observed) || observed?.id !== resultId) throw new DiaryError("review_required", observed);
      requiresReview = false;
      return observed!;
    });
  }
  return {
    load: () => exclusive(async () => { const entry = await read(); requiresReview = false; return entry; }),
    saveDraft: (expected: DiaryEntry | null, draft: DiaryDraft) => mutate(expected, draft),
    capabilities: { close: false as const, closeReason: "O servidor ainda não verifica a revisão ao fechar o diário." },
    // The current close RPC ignores If-Match. Do not imply read-then-close is atomic.
    close: async (_expected: DiaryEntry): Promise<never> => { throw new DiaryError("close_unavailable"); },
  };
}
