export type StudentAssessmentAssignment = {
  id: string;
  assessmentId: string;
  title: string;
  description: string;
  component: string | null;
  schoolYear: string | null;
  status: string;
  availableFrom: string | null;
  availableUntil: string | null;
  questionCount: number;
  attemptStatus: string | null;
  answeredCount: number;
  submittedAt: string | null;
  scorePercent: number | null;
};

type RpcAssessmentAssignment = {
  id?: string | null;
  assignment_id?: string | null;
  assessment_id?: string | null;
  status?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  assessment?: {
    id?: string | null;
    title?: string | null;
    description?: string | null;
    component?: string | null;
    school_year?: string | null;
    question_count?: number | null;
    questions?: unknown;
  } | null;
};

type RpcAssessmentAttempt = {
  assignment_id?: string | null;
  assessment_id?: string | null;
  status?: string | null;
  answered_count?: number | null;
  submitted_at?: string | null;
  score_percentage?: number | string | null;
  responses?: unknown;
};

export type RpcAssessmentAssignmentsPayload = {
  assignments?: RpcAssessmentAssignment[];
  attempts?: RpcAssessmentAttempt[];
};

// The RPC returns attempts newest-first. An assessment can have multiple assignments;
// only assignment_id identifies the matching attempt, never assessment_id.
export function mapStudentAssessmentAssignments(payload: RpcAssessmentAssignmentsPayload): StudentAssessmentAssignment[] {
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
  return assignments
    .filter((assignment) => Boolean(assignment.id || assignment.assignment_id))
    .map((assignment) => mapAssessmentAssignment(assignment, attempts));
}

function mapAssessmentAssignment(assignment: RpcAssessmentAssignment, attempts: RpcAssessmentAttempt[]): StudentAssessmentAssignment {
  const assessment = assignment.assessment || {};
  const assignmentId = assignment.id || assignment.assignment_id || "";
  const assessmentId = assignment.assessment_id || assessment.id || "";
  const attempt = attempts.find((item) => item.assignment_id === assignmentId) || null;
  const questionCount = nullableNumber(assessment.question_count) ?? countUnknownArray(assessment.questions);
  const answeredCount = nullableNumber(attempt?.answered_count) ?? countUnknownArray(attempt?.responses);

  return {
    id: assignmentId,
    assessmentId,
    title: assessment.title || "Avaliação",
    description: assessment.description || "",
    component: assessment.component ?? null,
    schoolYear: assessment.school_year ?? null,
    status: assignment.status || "available",
    availableFrom: assignment.available_from ?? null,
    availableUntil: assignment.available_until ?? null,
    questionCount,
    attemptStatus: attempt?.status ?? null,
    answeredCount,
    submittedAt: attempt?.submitted_at ?? null,
    scorePercent: nullableNumber(attempt?.score_percentage)
  };
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === "string" && !value.trim()) return null;
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function countUnknownArray(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export function normalizeAssessmentState(assessment: StudentAssessmentAssignment) {
  const status = (assessment.attemptStatus || assessment.status).trim().toLowerCase();
  if (["completed", "submitted", "graded", "concluida", "concluída"].includes(status)) return "Concluída";
  if (status === "expired") return "Expirada";
  if (status === "cancelled") return "Cancelada";
  if (["in_progress", "started", "em_andamento"].includes(status) || assessment.answeredCount > 0) return "Em andamento";
  return "Disponível";
}

export function assessmentSection(assessment: StudentAssessmentAssignment) {
  const state = normalizeAssessmentState(assessment);
  if (["Concluída", "Expirada", "Cancelada"].includes(state)) return "closed";
  return state === "Em andamento" ? "in_progress" : "available";
}

export function assessmentActionLabel(assessment: StudentAssessmentAssignment) {
  const state = normalizeAssessmentState(assessment);
  if (state === "Cancelada") return "Avaliação cancelada";
  if (assessmentSection(assessment) === "closed" && assessment.scorePercent !== null) return "Resultado disponível";
  if (state === "Expirada") return "Prazo encerrado";
  return state === "Concluída" ? "Aguardar resultado" : "Aguardar orientação";
}
