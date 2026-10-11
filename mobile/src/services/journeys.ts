declare const process: { env: Record<string, string | undefined> };
import { rpc, restGet, type MobileSession } from "./library.ts";
export const journeyGates = {
  assessments: process.env.EXPO_PUBLIC_FASE3_ASSESSMENTS === "true",
  replies: process.env.EXPO_PUBLIC_FASE3_REPLIES === "true",
  editing: process.env.EXPO_PUBLIC_FASE3_NOTICE_EDITING === "true",
};
export type Gates = typeof journeyGates;
export type Question = {
  question_id: string;
  position: number;
  question: {
    statement: string;
    base_text?: string;
    question_type: string;
    alternatives: { id: string; label: string; body: string }[];
  };
};
export type Assignment = {
  id: string;
  assessment_id: string;
  token_required: boolean;
  assessment: { title: string; questions: Question[] };
};
export type Response = {
  question_id: string;
  selected_alternative_id: string | null;
  response_text: string | null;
  autosave_sequence: number;
};
export type Attempt = {
  id: string;
  assignment_id: string;
  status: string;
  score_percentage: number | null;
  deadline_at: string | null;
  responses: Response[];
};
export type StudentWork = { assignments: Assignment[]; attempts: Attempt[] };
export type Published = {
  id: string;
  assessment_id: string;
  class_id: string;
  target_type: string;
  student_id: string | null;
  available_from: string | null;
  available_until: string | null;
  status: string;
  application_status: string;
};
export type Results = {
  summary: {
    assigned_students: number;
    completed_students: number;
    average_percentage: number | null;
  };
  students: {
    student_id: string;
    student_name: string;
    status: string;
    score_percentage: number | null;
    correct_count: number;
    incorrect_count: number;
  }[];
};
export type Inbox = {
  communication_id: string;
  delivery_id: string;
  title: string;
  body: string;
  source_type: string | null;
  read_at: string | null;
  child_name: string | null;
  revision?: number;
};
export type Thread = {
  delivery_id: string;
  title: string;
  body: string;
  messages: { id: string; body: string; author_name: string; own: boolean }[];
};
export type Notice = {
  revision: number;
  title: string;
  body: string;
  can_edit: boolean;
  current_revision_read_at: string | null;
  current_revision_read_count: number | null;
  history: { revision: number; title: string; body: string }[];
};
export function requireGate(enabled: boolean) {
  if (!enabled) throw new Error("feature_disabled");
}
export const finished = (a?: Attempt) =>
  Boolean(a && ["submitted", "graded"].includes(a.status));
export const latestAttempt = (work: StudentWork, id: string) =>
  work.attempts.find((a) => a.assignment_id === id && a.status !== "cancelled");
export function newRequestId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    return (c === "x" ? r : (r & 3) | 8).toString(16);
  });
} // Idempotency identifier, never a credential.
export function isUncertain(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      (error.name === "AbortError" || /:(5\d\d|408)(:|$)/.test(error.message)))
  );
}
export function journeyApi(
  session: MobileSession,
  gates: Gates = journeyGates,
) {
  const assessment = <T>(name: string, body: Record<string, unknown> = {}) => {
    requireGate(gates.assessments);
    return rpc<T>(session, name, body);
  };
  const communication = <T>(
    gate: boolean,
    name: string,
    body: Record<string, unknown>,
  ) => {
    requireGate(gate);
    return rpc<T>(session, name, body);
  };
  const work = () =>
    assessment<StudentWork>("student_list_assessment_assignments");
  const published = async () => {
    requireGate(gates.assessments);
    return restGet<Published[]>(
      session,
      "assessment_assignments?select=id,assessment_id,class_id,target_type,student_id,available_from,available_until,status,application_status&order=created_at.desc",
    );
  };
  return {
    work,
    published,
    drafts: async () => {
      requireGate(gates.assessments);
      return restGet<{ id: string; title: string }[]>(
        session,
        `assessments?select=id,title&owner_user_id=eq.${encodeURIComponent(session.userId)}&order=created_at.desc`,
      );
    },
    questions: async (school: string, classId: string) => {
      const result = await assessment<{
        status: string;
        items: { id: string; internal_title: string }[];
      }>("content_resolve_question_details_for_user", {
        p_context: {
          school_id: school,
          class_id: classId,
          content_type: "QUESTION",
          limit: 100,
        },
      });
      return {
        ...result,
        items: result.items.map((q) => ({
          question_item_id: q.id,
          title: q.internal_title,
        })),
      };
    },
    assemble: (school: string, classId: string, title: string, ids: string[]) =>
      assessment<{ assessment: { id: string } }>(
        "avalia_plus_create_assessment_from_bank",
        {
          p_payload: {
            school_id: school,
            class_id: classId,
            title,
            questions: ids.map((question_id) => ({ question_id, points: 1 })),
          },
        },
      ),
    publish: async (id: string, classId: string) => {
      const matchesClass = (a: Published) =>
        a.assessment_id === id &&
        a.class_id === classId &&
        a.target_type === "class" &&
        !a.student_id &&
        a.status === "published";
      const availableNow = (a: Published) =>
        ["AGENDADA", "EM_ANDAMENTO"].includes(a.application_status) &&
        Boolean(a.available_from) &&
        Date.parse(a.available_from!) <= Date.now() &&
        (!a.available_until || Date.parse(a.available_until) > Date.now());
      const existing = (await published()).find(matchesClass);
      if (existing) {
        if (!availableNow(existing)) throw new Error("assignment_not_current");
        return existing;
      }
      try {
        return (
          await assessment<{ assignment: Published }>(
            "teacher_schedule_assessment_application_v2",
            {
              p_assessment_id: id,
              p_target_type: "class",
              p_class_id: classId,
            },
          )
        ).assignment;
      } catch (error) {
        if (!isUncertain(error)) throw error;
        const found = (await published()).find(
          (a) => matchesClass(a) && availableNow(a),
        );
        if (found) return found;
        throw error;
      }
    },
    results: (id: string) =>
      assessment<Results>("teacher_get_assessment_class_results", {
        p_assignment_id: id,
      }),
    start: async (id: string, token: string) => {
      const current = await work();
      if (!current.assignments.some((a) => a.id === id))
        throw new Error("assignment_access:403");
      const existing = latestAttempt(current, id);
      if (existing) return existing;
      try {
        return (
          await assessment<{ attempt: Attempt }>(
            "student_start_assessment_attempt_v2",
            { p_assignment_id: id, p_application_token: token || null },
          )
        ).attempt;
      } catch (error) {
        if (!isUncertain(error)) throw error;
        const found = latestAttempt(await work(), id);
        if (found) return found;
        throw error;
      }
    },
    save: async (
      attempt: Attempt,
      questionId: string,
      alternative: string | null,
      text: string | null,
    ) => {
      const body = {
        p_attempt_id: attempt.id,
        p_question_id: questionId,
        p_selected_alternative_id: alternative,
        p_response_text: text,
        p_autosave_sequence:
          (attempt.responses?.find((r) => r.question_id === questionId)
            ?.autosave_sequence || 0) + 1,
      };
      try {
        await assessment("student_save_assessment_response_v2", body);
      } catch (error) {
        if (!isUncertain(error)) throw error;
        const saved = (await work()).attempts
          .find((a) => a.id === attempt.id)
          ?.responses.find((r) => r.question_id === questionId);
        if (
          !saved ||
          saved.selected_alternative_id !== alternative ||
          (saved.response_text || null) !== (text || null)
        )
          throw error;
      }
    },
    submit: async (id: string) => {
      try {
        await assessment("student_submit_assessment_attempt_v2", {
          p_attempt_id: id,
        });
      } catch (error) {
        if (!isUncertain(error)) throw error;
        if (!(await work()).attempts.some((a) => a.id === id && finished(a)))
          throw error;
      }
    },
    inbox: async () => {
      requireGate(gates.replies || gates.editing);
      const rows = await rpc<Inbox[]>(session, "communication_get_inbox", {});
      const checked = await Promise.all(
        rows.map(async (row): Promise<Inbox | null> => {
          if (row.source_type) return row;
          try {
            if (!gates.editing) {
              const thread = await rpc<Thread>(
                session,
                "communication_get_reply_thread",
                { p_delivery_id: row.delivery_id },
              );
              return { ...row, title: thread.title, body: thread.body };
            }
            const version = await rpc<Notice>(
              session,
              "communication_get_notice_versions",
              {
                p_communication_id: row.communication_id,
                p_delivery_id: row.delivery_id,
              },
            );
            return {
              ...row,
              title: version.title,
              body: version.body,
              revision: version.revision,
              read_at:
                version.revision > 1
                  ? version.current_revision_read_at
                  : row.read_at,
            };
          } catch (error) {
            // Legacy inbox can still contain a delivery whose child link was revoked.
            // Exclude that forbidden delivery, without hiding transport/backend errors.
            if (error instanceof Error && /:403(?::|$)/.test(error.message))
              return null;
            throw error;
          }
        }),
      );
      return checked.filter((row): row is Inbox => row !== null);
    },
    teacherNotices: async () => {
      requireGate(gates.replies || gates.editing);
      const summaries = await rpc<
        {
          communication_id: string;
          delivered_count: number;
          read_count: number;
          unread_count: number;
        }[]
      >(session, "communication_list_delivery_summaries", {});
      if (!summaries.length) return [];
      const rows = await restGet<
        {
          id: string;
          title: string;
          body: string;
          source_type: string | null;
          status: string;
        }[]
      >(
        session,
        `communications?select=id,title,body,source_type,status&id=in.(${summaries.map((x) => x.communication_id).join(",")})&status=eq.published&or=(expires_at.is.null,expires_at.gt.${encodeURIComponent(new Date().toISOString())})&order=created_at.desc`,
      );
      return Promise.all(
        rows
          .filter((r) => r.status === "published")
          .map(async (row) => {
            const summary = summaries.find(
              (x) => x.communication_id === row.id,
            )!;
            const v =
              gates.editing && !row.source_type
                ? await rpc<Notice>(
                    session,
                    "communication_get_notice_versions",
                    { p_communication_id: row.id },
                  )
                : null;
            return {
              ...row,
              revision: v?.revision || 1,
              delivered: summary.delivered_count,
              read:
                v && v.revision > 1
                  ? v.current_revision_read_count
                  : summary.read_count,
            };
          }),
      );
    },
    threads: (id: string) =>
      communication<
        {
          delivery_id: string;
          recipient_name: string;
          student_name: string | null;
          reply_count: number;
        }[]
      >(gates.replies, "communication_list_reply_threads", {
        p_communication_id: id,
      }),
    thread: (id: string) =>
      communication<Thread>(gates.replies, "communication_get_reply_thread", {
        p_delivery_id: id,
      }),
    reply: (id: string, body: string, requestId: string) =>
      communication(gates.replies, "communication_send_reply", {
        p_delivery_id: id,
        p_body: body,
        p_request_id: requestId,
      }),
    notice: (id: string, delivery: string | null) =>
      communication<Notice>(
        gates.editing,
        "communication_get_notice_versions",
        { p_communication_id: id, p_delivery_id: delivery },
      ),
    edit: (
      id: string,
      revision: number,
      title: string,
      body: string,
      requestId: string,
    ) =>
      communication<{ revision: number }>(
        gates.editing,
        "communication_edit_notice",
        {
          p_communication_id: id,
          p_expected_revision: revision,
          p_title: title,
          p_body: body,
          p_request_id: requestId,
        },
      ),
    read: (id: string, revision: number) =>
      communication(gates.editing, "communication_mark_revision_read", {
        p_delivery_id: id,
        p_revision: revision,
      }),
  };
}
