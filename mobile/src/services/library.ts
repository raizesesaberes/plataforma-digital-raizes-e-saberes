export type MobileSession = {
  accessToken: string;
  refreshToken?: string;
  userId: string;
  email?: string;
};

export type SessionAppRole = "crescer" | "fundamental" | "professor";

export type LibraryBook = {
  id: string;
  legacyId: string | null;
  title: string;
  description: string;
  category: string;
  segment: string | null;
  schoolYear: string | null;
  coverUrl: string | null;
  hasCover: boolean;
  hasReadingAsset: boolean;
  currentPage: number;
  percentComplete: number;
  updatedAt: string | null;
};

export type LibraryManifest = {
  pageCount: number;
  firstPage: number;
  lastPage: number;
  currentPage: number;
  hasPages: boolean;
  hasThumbs: boolean;
  expiresIn: number;
};

export type LibraryReadAsset = {
  kind: "page" | "thumb" | "paged_images";
  pageNumber?: number;
  pageCount?: number;
  mimeType: string;
  signedUrl: string;
  expiresIn: number;
};

export type EarlyChildhoodActivityStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type EarlyChildhoodDiscoveryStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
export type EarlyChildhoodGameAttemptStatus = "STARTED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export type EarlyChildhoodActivity = {
  id: string;
  legacyId: string;
  title: string;
  description: string;
  instruction: string;
  activityType: string | null;
  ageGroup: string | null;
  asset: Record<string, unknown>;
  sceneAssetId: string | null;
  coverAssetId: string | null;
  progressStatus: EarlyChildhoodActivityStatus;
  percentComplete: number;
  updatedAt: string | null;
};

export type EarlyChildhoodAsset = {
  id: string;
  type: string | null;
  title: string | null;
  mimeType: string | null;
  signedUrl: string | null;
  expiresIn: number;
};

export type ActivityProgressResult = {
  activityId: string;
  status: EarlyChildhoodActivityStatus;
  percentComplete: number;
  updatedAt: string | null;
};

export type EarlyChildhoodDiscoveryResource = {
  type: string | null;
  role: string | null;
  assetLegacyId: string | null;
  activityLegacyId: string | null;
};

export type EarlyChildhoodDiscoveryHotspot = {
  id: string;
  legacyId: string;
  title: string;
  description: string;
  sortOrder: number;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  actionType: string | null;
  targetType: string | null;
  targetLegacyId: string | null;
  assetLegacyId: string | null;
  audioAssetLegacyId: string | null;
  accessibilityLabel: string;
};

export type EarlyChildhoodDiscovery = {
  id: string;
  legacyId: string;
  title: string;
  description: string;
  studentInstruction: string;
  discoveryType: string | null;
  ageGroup: string | null;
  resources: EarlyChildhoodDiscoveryResource[];
  completionRule: Record<string, unknown>;
  hotspots: EarlyChildhoodDiscoveryHotspot[];
  sceneAssetId: string | null;
  progressStatus: EarlyChildhoodDiscoveryStatus;
  discoveredHotspots: string[];
  updatedAt: string | null;
};

export type DiscoveryProgressResult = {
  discoveryId: string;
  status: EarlyChildhoodDiscoveryStatus;
  discoveredHotspots: string[];
  updatedAt: string | null;
};

export type EarlyChildhoodGame = {
  id: string;
  legacyId: string;
  title: string;
  description: string;
  studentInstruction: string;
  gameType: string | null;
  engine: string | null;
  entrypoint: string | null;
  orientation: string | null;
  ageGroup: string | null;
  engineConfig: Record<string, unknown>;
  completionRule: Record<string, unknown>;
  scoreRule: Record<string, unknown>;
  latestAttemptStatus: string | null;
  latestScorePercent: number | null;
  latestCompletedAt: string | null;
  updatedAt: string | null;
};

export type EarlyChildhoodGameManifestAsset = {
  id: string;
  legacyId: string;
  role: string | null;
  type: string | null;
  title: string | null;
  mimeType: string | null;
  storageAccess: string | null;
  status: string | null;
  metadata: Record<string, unknown>;
};

export type EarlyChildhoodGameManifest = {
  id: string;
  legacyId: string;
  title: string;
  type: string | null;
  status: string | null;
  progressStatus: string | null;
  assetIds: string[];
  assets: EarlyChildhoodGameManifestAsset[];
  expiresIn: number;
};

export type EarlyChildhoodGameAttempt = {
  attemptId: string;
  gameId: string;
  attemptNumber?: number;
  status: EarlyChildhoodGameAttemptStatus;
  scorePercent?: number;
  durationSeconds?: number;
  canonicalResult?: Record<string, unknown>;
  resultEventType?: string | null;
  resultEventKey?: string | null;
  startedAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
};

export type StudentXpSummary = {
  studentId: string;
  totalXp: number;
  levelNumber: number;
  levelFloorXp: number;
  nextLevelXp: number;
  creditsCount: number;
  updatedAt: string | null;
};

export type StudentXpHistoryItem = {
  id: string;
  sourceType: string;
  sourceId: string | null;
  sourceLegacyId: string | null;
  eventType: string;
  eventKey: string;
  rewardRule: string;
  xpAmount: number;
  metadata: Record<string, unknown>;
  createdAt: string | null;
};

export type StudentAchievement = {
  id: string;
  legacyId: string;
  title: string;
  description: string;
  category: string;
  isTechnicalTest: boolean;
  unlocked: boolean;
  unlockedAt: string | null;
  sourceEventKey: string | null;
  metadata: Record<string, unknown>;
};

export type InstitutionalActivity = {
  id: string;
  title: string;
  description: string;
  schoolYear: string | null;
  xp: number;
  status: string;
  progressStatus: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

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

export type TeacherMobileClass = {
  id: string;
  schoolId: string;
  name: string;
  stage: string;
  schedule: string;
  studentCount: number;
};

export type TeacherContext = {
  teacherId: string;
  teacherName: string;
  schoolId: string;
  schoolName: string;
  role: string;
  discipline: string | null;
  activeClassLinks: number;
};

export type TeacherHomeSummary = {
  teacherName: string;
  schoolName: string;
  activeClassLinks: number;
  totalStudents: number;
  todaysCalendarCount: number;
  unreadNotifications: number;
};

export type TeacherClassStudent = {
  id: string;
  name: string;
  status: string;
};

export type TeacherCalendarEntry = {
  id: string;
  classId: string;
  className: string;
  title: string;
  description: string;
  entryDate: string;
  startTime: string | null;
  endTime: string | null;
  entryType: string;
  status: string;
};

export type TeacherCommunicationSummary = {
  communicationId: string;
  title: string;
  audienceType: string;
  audienceLabel: string;
  body: string;
  communicationDate: string | null;
  status: string;
  deliveredCount: number;
  readCount: number;
  unreadCount: number;
};

export type TeacherDiaryEntry = {
  id: string;
  classId: string;
  title: string;
  entryDate: string;
  taughtContent: string;
  pedagogicalNotes: string;
  status: string;
  attendancePresent: number;
  attendanceAbsent: number;
  attendanceJustified: number;
};

export type TeacherDiaryPeriodSummary = {
  attendancePresent: number;
  attendanceAbsent: number;
  attendanceJustified: number;
  registeredClasses: number;
  plannedCount: number;
  publishedCount: number;
};

export type TeacherNotificationCenterItem = {
  id: string;
  title: string;
  summary: string;
  deliveredAt: string | null;
  unread: boolean;
};

export type TeacherAssessmentAssignment = {
  id: string;
  title: string;
  description: string;
  subject: string;
  classId: string;
  className: string;
  schoolYear: string | null;
  status: string;
  availableFrom: string | null;
  availableUntil: string | null;
};

export type TeacherTrackingOverview = {
  classId: string;
  attendanceRate: number;
  assessmentParticipation: number;
  assessmentAverage: number;
  diaryEntriesCount: number;
};

export type TeacherTrackingAlert = {
  id: string;
  title: string;
  body: string;
};

export type TeacherAttendanceRecordInput = {
  studentId: string;
  status: "present" | "absent" | "justified";
  notes?: string;
};

export type TeacherCalendarDraft = {
  entryId?: string | null;
  classId: string;
  entryDate: string;
  startTime?: string | null;
  endTime?: string | null;
  title: string;
  description?: string | null;
  entryType: string;
};

export type TeacherCommunicationDraft = {
  schoolId: string;
  classId: string;
  studentId?: string | null;
  audienceType: "class" | "student";
  title: string;
  body: string;
};

export type CrescerStudentProfile = {
  name: string;
  initials: string;
  className: string;
  schoolName: string;
  schoolYear: string | null;
  ageGroup: string | null;
  attendancePercent: number | null;
  presentClasses: number | null;
  totalClasses: number | null;
  levelNumber: number | null;
};

export type StudentProfile = CrescerStudentProfile;

export type CrescerCalendarEvent = {
  title: string;
  description: string;
  eventDate: string;
  startTime: string | null;
  endTime: string | null;
  eventType: string;
  actionLabel: string;
};

export type CrescerFamilyMessage = {
  title: string;
  body: string;
  origin: string;
  date: string | null;
  unread: boolean;
  contextLabel: string;
};

export type CrescerNotificationCenterItem = {
  title: string;
  summary: string;
  origin: string;
  deliveredAt: string | null;
  unread: boolean;
};

const SUPABASE_URL = "https://jaesjldrbjbdmzzggxzw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YzHPXWp_L-QFAQYaGz_3dQ_K07Ni9Hz";

type RpcBookRow = {
  book_id: string;
  legacy_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  segment: string | null;
  school_year: string | null;
  cover_url: string | null;
  has_cover: boolean | null;
  has_reading_asset: boolean | null;
  current_page: number | null;
  percent_complete: number | null;
  updated_at: string | null;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  user?: {
    id?: string;
    email?: string;
  };
};

type ProfileRouteRow = {
  platform_role: string | null;
  status: string | null;
};

type StudentRouteRow = {
  id: string;
  enrollments?: Array<{
    status: string | null;
    classes?: {
      nome: string | null;
      ano_escolar: string | null;
      school_year: string | null;
    } | null;
  }>;
};

type ManifestResponse = {
  manifest?: Partial<LibraryManifest>;
};

type AssetResponse = {
  asset?: Partial<LibraryReadAsset>;
};

type RpcActivityRow = {
  id: string;
  legacy_id: string | null;
  title: string | null;
  description: string | null;
  instruction: string | null;
  activity_type: string | null;
  age_group: string | null;
  asset: Record<string, unknown> | null;
  progress_status: string | null;
  percent_complete: number | null;
  updated_at: string | null;
};

type EarlyChildhoodAssetResponse = {
  asset?: Partial<EarlyChildhoodAsset>;
};

type RpcActivityProgressRow = {
  activity_id: string;
  status: string | null;
  percent_complete: number | null;
  updated_at: string | null;
};

type RpcActivityProgressPayload = RpcActivityProgressRow[] | RpcActivityProgressRow;

type RpcDiscoveryRow = {
  id: string;
  legacy_id: string | null;
  title: string | null;
  description: string | null;
  student_instruction: string | null;
  discovery_type: string | null;
  age_group: string | null;
  resources: unknown;
  completion_rule?: Record<string, unknown> | null;
  hotspots?: unknown;
  progress_status: string | null;
  discovered_hotspots?: unknown;
  updated_at: string | null;
};

type RpcDiscoveryProgressRow = {
  discovery_id: string;
  status: string | null;
  discovered_hotspots: unknown;
  updated_at: string | null;
};

type RpcDiscoveryProgressPayload = RpcDiscoveryProgressRow[] | RpcDiscoveryProgressRow;

type RpcGameRow = {
  id: string;
  legacy_id: string | null;
  title: string | null;
  description: string | null;
  student_instruction: string | null;
  game_type: string | null;
  engine: string | null;
  entrypoint: string | null;
  orientation: string | null;
  age_group: string | null;
  engine_config?: Record<string, unknown> | null;
  completion_rule?: Record<string, unknown> | null;
  score_rule?: Record<string, unknown> | null;
  latest_attempt_status?: string | null;
  latest_score_percent?: number | null;
  latest_completed_at?: string | null;
  updated_at: string | null;
};

type EarlyChildhoodGameManifestResponse = {
  content?: {
    id?: string;
    legacyId?: string;
    title?: string;
    type?: string | null;
    status?: string | null;
    progressStatus?: string | null;
    assetIds?: unknown;
    assets?: unknown;
  };
  contract?: {
    expiresIn?: number;
  };
};

type RpcGameAttemptStartRow = {
  attempt_id: string;
  game_id: string;
  attempt_number: number | null;
  status: string | null;
  started_at: string | null;
};

type RpcGameAttemptUpdateRow = {
  attempt_id: string;
  game_id: string;
  status: string | null;
  updated_at: string | null;
};

type RpcGameAttemptCompleteRow = {
  attempt_id: string;
  game_id: string;
  status: string | null;
  score_percent: number | null;
  duration_seconds: number | null;
  canonical_result: Record<string, unknown> | null;
  result_event_type: string | null;
  result_event_key: string | null;
  completed_at: string | null;
};

type RpcGameAttemptPayload = RpcGameAttemptStartRow[] | RpcGameAttemptUpdateRow[] | RpcGameAttemptCompleteRow[] | RpcGameAttemptStartRow | RpcGameAttemptUpdateRow | RpcGameAttemptCompleteRow;

type RpcXpSummaryRow = {
  student_id: string;
  total_xp: number | null;
  level_number: number | null;
  level_floor_xp: number | null;
  next_level_xp: number | null;
  credits_count: number | null;
  updated_at: string | null;
};

type RpcXpHistoryRow = {
  id: string;
  source_type: string | null;
  source_id: string | null;
  source_legacy_id: string | null;
  event_type: string | null;
  event_key: string | null;
  reward_rule: string | null;
  xp_amount: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
};

type RpcAchievementRow = {
  achievement_id: string;
  legacy_id: string | null;
  title: string | null;
  description: string | null;
  category: string | null;
  is_technical_test: boolean | null;
  unlocked: boolean | null;
  unlocked_at: string | null;
  source_event_key: string | null;
  metadata: Record<string, unknown> | null;
};

type RpcInstitutionalActivityRow = {
  activity_id: string;
  title: string | null;
  description: string | null;
  school_year: string | null;
  xp: number | null;
  status: string | null;
  progress_status: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
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
  score_percent?: number | null;
  responses?: unknown;
};

type RpcAssessmentAssignmentsPayload = {
  assignments?: RpcAssessmentAssignment[];
  attempts?: RpcAssessmentAttempt[];
};

type RpcTeacherMobileClassRow = {
  class_id: string;
  school_id: string;
  class_name: string | null;
  school_year: string | null;
  shift: string | null;
  student_count: number | null;
};

type RpcTeacherContextRow = {
  teacher_id: string;
  teacher_name: string | null;
  school_id: string;
  school_name: string | null;
  role: string | null;
  discipline: string | null;
  active_class_links: number | null;
};

type RpcTeacherHomeSummaryRow = {
  teacher_name: string | null;
  school_name: string | null;
  active_class_links: number | null;
  total_students: number | null;
  todays_calendar_count: number | null;
  unread_notifications: number | null;
};

type RestTeacherClassStudentRow = {
  student_id: string;
  students?: {
    nome?: string | null;
    status?: string | null;
  } | Array<{
    nome?: string | null;
    status?: string | null;
  }> | null;
};

type RestTeacherCalendarRow = {
  id: string;
  class_id: string;
  entry_date: string | null;
  start_time: string | null;
  end_time: string | null;
  title: string | null;
  description: string | null;
  entry_type: string | null;
  status: string | null;
  classes?: {
    nome?: string | null;
  } | Array<{
    nome?: string | null;
  }> | null;
};

type RpcCommunicationSummaryRow = {
  communication_id: string;
  delivered_count: number | null;
  read_count: number | null;
  unread_count: number | null;
};

type RestCommunicationRow = {
  id: string;
  title: string | null;
  body: string | null;
  audience_type: string | null;
  class_id: string | null;
  student_id: string | null;
  communication_date: string | null;
  status: string | null;
  classes?: {
    nome?: string | null;
  } | Array<{
    nome?: string | null;
  }> | null;
  students?: {
    nome?: string | null;
  } | Array<{
    nome?: string | null;
  }> | null;
};

type RpcTeacherDiaryEntryRow = {
  id: string;
  class_id: string;
  entry_date: string | null;
  title: string | null;
  taught_content: string | null;
  pedagogical_notes: string | null;
  status: string | null;
  attendance_present: number | null;
  attendance_absent: number | null;
  attendance_justified: number | null;
};

type RpcTeacherNotificationRow = {
  notification_id: string;
  title: string | null;
  summary: string | null;
  delivered_at: string | null;
  notification_status: string | null;
};

type RestTeacherAssessmentAssignmentRow = {
  id: string;
  class_id: string;
  status: string | null;
  available_from: string | null;
  available_until: string | null;
  assessments?: {
    title?: string | null;
    description?: string | null;
    component?: string | null;
    school_year?: string | null;
  } | Array<{
    title?: string | null;
    description?: string | null;
    component?: string | null;
    school_year?: string | null;
  }> | null;
  classes?: {
    nome?: string | null;
  } | Array<{
    nome?: string | null;
  }> | null;
};

type RestStudentProfileRow = {
  nome: string | null;
  frequencia_percent: number | null;
  aulas_presentes: number | null;
  total_aulas: number | null;
  nivel: number | null;
  school?: { nome?: string | null } | Array<{ nome?: string | null }> | null;
  class?: { nome?: string | null; age_group?: string | null; school_year?: string | null } | Array<{ nome?: string | null; age_group?: string | null; school_year?: string | null }> | null;
};

type RpcStudentContextRow = {
  student_id: string;
  student_name: string | null;
  class_id: string;
  class_name: string | null;
  school_id: string;
  school_name: string | null;
  segment: string | null;
  school_year: string | null;
  age_group: string | null;
};

type RpcCalendarEventRow = {
  title: string | null;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  action_label: string | null;
};

type RpcCommunicationRow = {
  title: string | null;
  body: string | null;
  author_name: string | null;
  communication_date: string | null;
  delivered_at: string | null;
  notification_status: string | null;
  context_label: string | null;
};

type RpcNotificationCenterRow = {
  title: string | null;
  summary: string | null;
  origin_label: string | null;
  delivered_at: string | null;
  notification_status: string | null;
};

export async function signInWithPassword(email: string, password: string): Promise<MobileSession> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({ email: email.trim(), password })
  });

  const payload = (await response.json().catch(() => ({}))) as AuthResponse;
  if (!response.ok || !payload.access_token || !payload.user?.id) {
    throw new Error("auth_failed");
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token,
    userId: payload.user.id,
    email: payload.user.email
  };
}

export async function getAppRoleForSession(session: MobileSession): Promise<SessionAppRole> {
  const profiles = await restGet<ProfileRouteRow[]>(
    session,
    `profiles?select=platform_role,status&id=eq.${encodeURIComponent(session.userId)}&limit=1`
  );
  const profile = profiles[0];
  const platformRole = normalizeRouteValue(profile?.platform_role);
  if (profile?.status && normalizeRouteValue(profile.status) !== "active") throw new Error("profile_inactive");
  if (platformRole === "professor") return "professor";

  if (platformRole === "aluno" || platformRole === "educacao_infantil") {
    const students = await restGet<StudentRouteRow[]>(
      session,
      `students?select=id,enrollments(status,classes(nome,ano_escolar,school_year))&user_id=eq.${encodeURIComponent(session.userId)}&limit=1`
    );
    const student = students[0];
    const activeEnrollment = student?.enrollments?.find((enrollment) => normalizeRouteValue(enrollment.status) === "active");
    const classSegment = normalizeRouteValue([
      activeEnrollment?.classes?.ano_escolar,
      activeEnrollment?.classes?.school_year,
      activeEnrollment?.classes?.nome
    ].filter(Boolean).join(" "));
    if (classSegment.includes("infantil") || platformRole === "educacao_infantil") return "crescer";
    return "fundamental";
  }

  throw new Error("unsupported_route");
}

export async function getLibraryBooks(session: MobileSession): Promise<LibraryBook[]> {
  const rows = await rpc<RpcBookRow[]>(session, "student_get_library_books", {});
  return rows.map(mapBookRow);
}

export async function getLibraryBook(session: MobileSession, bookId: string): Promise<LibraryBook> {
  const rows = await rpc<RpcBookRow[]>(session, "student_get_library_book", { p_book_id: bookId });
  const row = rows[0];
  if (!row) throw new Error("book_missing");
  return mapBookRow(row);
}

export async function getLibraryManifest(session: MobileSession, bookId: string): Promise<LibraryManifest> {
  const payload = await edgeRead<ManifestResponse>(session, { bookId, assetKind: "manifest" });
  const manifest = payload.manifest;
  if (!manifest?.pageCount || !manifest.firstPage || !manifest.lastPage) throw new Error("manifest_missing");
  return {
    pageCount: manifest.pageCount,
    firstPage: manifest.firstPage,
    lastPage: manifest.lastPage,
    currentPage: manifest.currentPage || manifest.firstPage,
    hasPages: manifest.hasPages === true,
    hasThumbs: manifest.hasThumbs === true,
    expiresIn: manifest.expiresIn || 300
  };
}

export async function getLibraryPageAsset(session: MobileSession, bookId: string, pageNumber: number): Promise<LibraryReadAsset> {
  const payload = await edgeRead<AssetResponse>(session, { bookId, assetKind: "page", pageNumber });
  return parseAsset(payload);
}

export async function getLibraryThumbAsset(session: MobileSession, bookId: string, pageNumber: number): Promise<LibraryReadAsset> {
  const payload = await edgeRead<AssetResponse>(session, { bookId, assetKind: "thumb", pageNumber });
  return parseAsset(payload);
}

export async function saveLibraryProgress(session: MobileSession, bookId: string, currentPage: number, percentComplete: number) {
  await rpc(session, "student_upsert_book_progress", {
    p_book_id: bookId,
    p_current_page: currentPage,
    p_percent_complete: Math.max(0, Math.min(100, percentComplete))
  });
}

export async function getEarlyChildhoodActivities(session: MobileSession): Promise<EarlyChildhoodActivity[]> {
  const rows = await rpc<RpcActivityRow[]>(session, "student_get_activities", {});
  return rows.map(mapActivityRow);
}

export async function getEarlyChildhoodActivity(session: MobileSession, activityId: string): Promise<EarlyChildhoodActivity> {
  const rows = await rpc<RpcActivityRow[]>(session, "student_get_activity", { p_activity_id: activityId });
  const row = rows[0];
  if (!row) throw new Error("activity_missing");
  return mapActivityRow(row);
}

export async function getEarlyChildhoodActivityAsset(session: MobileSession, activityId: string, assetId: string): Promise<EarlyChildhoodAsset> {
  return getEarlyChildhoodContentAsset(session, "activity", activityId, assetId);
}

export async function getEarlyChildhoodDiscoveryAsset(session: MobileSession, discoveryId: string, assetId: string): Promise<EarlyChildhoodAsset> {
  return getEarlyChildhoodContentAsset(session, "discovery", discoveryId, assetId);
}

async function getEarlyChildhoodContentAsset(session: MobileSession, contentKind: "activity" | "discovery" | "game", contentId: string, assetId: string): Promise<EarlyChildhoodAsset> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/student-early-childhood-asset-access`, {
    method: "POST",
    headers: authenticatedHeaders(session),
    body: JSON.stringify({
      contentKind,
      contentId,
      mode: "asset",
      assetId
    })
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { code?: string };
    throw new Error([`${contentKind}_asset_failed`, response.status, errorBody.code].filter(Boolean).join(":"));
  }
  const payload = (await response.json()) as EarlyChildhoodAssetResponse;
  const asset = payload.asset;
  if (!asset?.id) throw new Error("activity_asset_missing");
  return {
    id: asset.id,
    type: asset.type ?? null,
    title: asset.title ?? null,
    mimeType: asset.mimeType ?? null,
    signedUrl: asset.signedUrl ?? null,
    expiresIn: asset.expiresIn ?? 0
  };
}

export async function getEarlyChildhoodDiscoveries(session: MobileSession): Promise<EarlyChildhoodDiscovery[]> {
  const rows = await rpc<RpcDiscoveryRow[]>(session, "student_get_discoveries", {});
  return rows.map(mapDiscoveryRow);
}

export async function getEarlyChildhoodDiscovery(session: MobileSession, discoveryId: string): Promise<EarlyChildhoodDiscovery> {
  const rows = await rpc<RpcDiscoveryRow[]>(session, "student_get_discovery", { p_discovery_id: discoveryId });
  const row = rows[0];
  if (!row) throw new Error("discovery_missing");
  return mapDiscoveryRow(row);
}

export async function saveEarlyChildhoodActivityProgress(
  session: MobileSession,
  activityId: string,
  status: EarlyChildhoodActivityStatus,
  percentComplete: number
): Promise<ActivityProgressResult> {
  const payload = await rpc<RpcActivityProgressPayload>(session, "student_upsert_activity_progress", {
    p_activity_id: activityId,
    p_status: status,
    p_percent_complete: Math.max(0, Math.min(100, percentComplete)),
    p_progress_data: {}
  });
  const rows = Array.isArray(payload) ? payload : [payload];
  const row = rows[0];
  if (!row) throw new Error("activity_progress_missing");
  return {
    activityId: row.activity_id,
    status: parseActivityStatus(row.status),
    percentComplete: Math.max(0, Math.min(100, row.percent_complete || 0)),
    updatedAt: row.updated_at
  };
}

export async function saveEarlyChildhoodDiscoveryProgress(
  session: MobileSession,
  discoveryId: string,
  status: EarlyChildhoodDiscoveryStatus,
  discoveredHotspots: string[]
): Promise<DiscoveryProgressResult> {
  const payload = await rpc<RpcDiscoveryProgressPayload>(session, "student_upsert_discovery_progress", {
    p_discovery_id: discoveryId,
    p_status: status,
    p_discovered_hotspots: discoveredHotspots,
    p_progress_data: {}
  });
  const rows = Array.isArray(payload) ? payload : [payload];
  const row = rows[0];
  if (!row) throw new Error("discovery_progress_missing");
  return {
    discoveryId: row.discovery_id,
    status: parseDiscoveryStatus(row.status),
    discoveredHotspots: parseStringArray(row.discovered_hotspots),
    updatedAt: row.updated_at
  };
}

export async function getEarlyChildhoodGames(session: MobileSession): Promise<EarlyChildhoodGame[]> {
  const rows = await rpc<RpcGameRow[]>(session, "student_get_games", {});
  return rows.map(mapGameRow).filter((game) => game.legacyId !== "RS-EI-GAME-CAIXA-MISTERIOSA" && game.title !== "A Caixa Misteriosa");
}

export async function getEarlyChildhoodGame(session: MobileSession, gameId: string): Promise<EarlyChildhoodGame> {
  const rows = await rpc<RpcGameRow[]>(session, "student_get_game", { p_game_id: gameId });
  const row = rows[0];
  if (!row) throw new Error("game_missing");
  return mapGameRow(row);
}

export async function getEarlyChildhoodGameManifest(session: MobileSession, gameId: string): Promise<EarlyChildhoodGameManifest> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/student-early-childhood-asset-access`, {
    method: "POST",
    headers: authenticatedHeaders(session),
    body: JSON.stringify({
      contentKind: "game",
      contentId: gameId,
      mode: "manifest"
    })
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as { code?: string };
    throw new Error(["game_manifest_failed", response.status, errorBody.code].filter(Boolean).join(":"));
  }
  const payload = (await response.json()) as EarlyChildhoodGameManifestResponse;
  const content = payload.content;
  if (!content?.id) throw new Error("game_manifest_missing");
  return {
    id: content.id,
    legacyId: content.legacyId || "",
    title: content.title || "Jogo",
    type: content.type ?? null,
    status: content.status ?? null,
    progressStatus: content.progressStatus ?? null,
    assetIds: parseStringArray(content.assetIds),
    assets: parseGameManifestAssets(content.assets),
    expiresIn: payload.contract?.expiresIn || 300
  };
}

export async function getEarlyChildhoodGameAsset(session: MobileSession, gameId: string, assetId: string): Promise<EarlyChildhoodAsset> {
  return getEarlyChildhoodContentAsset(session, "game", gameId, assetId);
}

export async function startEarlyChildhoodGameAttempt(session: MobileSession, gameId: string): Promise<EarlyChildhoodGameAttempt> {
  const payload = await rpc<RpcGameAttemptPayload>(session, "student_start_game_attempt", { p_game_id: gameId });
  return mapGameAttempt(firstRpcRow<RpcGameAttemptStartRow>(payload, "game_attempt_missing"));
}

export async function updateEarlyChildhoodGameAttempt(
  session: MobileSession,
  attemptId: string,
  status: "IN_PROGRESS",
  clientState: Record<string, unknown>
): Promise<EarlyChildhoodGameAttempt> {
  const payload = await rpc<RpcGameAttemptPayload>(session, "student_update_game_attempt", {
    p_attempt_id: attemptId,
    p_status: status,
    p_client_state: clientState
  });
  return mapGameAttempt(firstRpcRow<RpcGameAttemptUpdateRow>(payload, "game_attempt_missing"));
}

export async function completeEarlyChildhoodGameAttempt(
  session: MobileSession,
  attemptId: string,
  rawResult: Record<string, unknown>,
  clientState: Record<string, unknown>
): Promise<EarlyChildhoodGameAttempt> {
  const payload = await rpc<RpcGameAttemptPayload>(session, "student_complete_game_attempt", {
    p_attempt_id: attemptId,
    p_raw_result: rawResult,
    p_client_state: clientState
  });
  return mapGameAttempt(firstRpcRow<RpcGameAttemptCompleteRow>(payload, "game_attempt_missing"));
}

export async function getStudentXpSummary(session: MobileSession): Promise<StudentXpSummary> {
  const rows = await rpc<RpcXpSummaryRow[]>(session, "student_get_xp_summary", {});
  const row = rows[0];
  if (!row) throw new Error("xp_summary_missing");
  return {
    studentId: row.student_id,
    totalXp: Math.max(0, row.total_xp || 0),
    levelNumber: Math.max(1, row.level_number || 1),
    levelFloorXp: Math.max(0, row.level_floor_xp || 0),
    nextLevelXp: Math.max(1, row.next_level_xp || 100),
    creditsCount: Math.max(0, row.credits_count || 0),
    updatedAt: row.updated_at
  };
}

export async function getStudentXpHistory(session: MobileSession, limit = 20): Promise<StudentXpHistoryItem[]> {
  const rows = await rpc<RpcXpHistoryRow[]>(session, "student_get_xp_history", { p_limit: limit });
  return rows.map((row) => ({
    id: row.id,
    sourceType: row.source_type || "",
    sourceId: row.source_id,
    sourceLegacyId: row.source_legacy_id,
    eventType: row.event_type || "",
    eventKey: row.event_key || "",
    rewardRule: row.reward_rule || "",
    xpAmount: Math.max(0, row.xp_amount || 0),
    metadata: row.metadata || {},
    createdAt: row.created_at
  }));
}

export async function getStudentAchievements(session: MobileSession): Promise<StudentAchievement[]> {
  const rows = await rpc<RpcAchievementRow[]>(session, "student_get_achievements", {});
  return rows.map((row) => ({
    id: row.achievement_id,
    legacyId: row.legacy_id || "",
    title: row.title || "Conquista",
    description: row.description || "",
    category: row.category || "",
    isTechnicalTest: row.is_technical_test === true,
    unlocked: row.unlocked === true,
    unlockedAt: row.unlocked_at,
    sourceEventKey: row.source_event_key,
    metadata: row.metadata || {}
  }));
}

export async function getInstitutionalActivities(session: MobileSession): Promise<InstitutionalActivity[]> {
  const rows = await rpc<RpcInstitutionalActivityRow[]>(session, "student_list_institutional_activities", {});
  return rows.map(mapInstitutionalActivityRow);
}

export async function getInstitutionalActivity(session: MobileSession, activityId: string): Promise<InstitutionalActivity> {
  const rows = await rpc<RpcInstitutionalActivityRow[]>(session, "student_get_institutional_activity", { p_activity_id: activityId });
  const row = rows[0];
  if (!row) throw new Error("institutional_activity_missing");
  return mapInstitutionalActivityRow(row);
}

export async function getStudentAssessmentAssignments(session: MobileSession): Promise<StudentAssessmentAssignment[]> {
  const payload = await rpc<RpcAssessmentAssignmentsPayload>(session, "student_list_assessment_assignments", {});
  const assignments = Array.isArray(payload.assignments) ? payload.assignments : [];
  const attempts = Array.isArray(payload.attempts) ? payload.attempts : [];
  return assignments.map((assignment) => mapAssessmentAssignment(assignment, attempts));
}

export async function getTeacherMobileClasses(session: MobileSession): Promise<TeacherMobileClass[]> {
  const rows = await rpc<RpcTeacherMobileClassRow[]>(session, "teacher_list_classes_for_mobile", {});
  return rows.map((row) => ({
    id: row.class_id,
    schoolId: row.school_id,
    name: row.class_name || "Turma",
    stage: row.school_year || "Turma",
    schedule: row.shift || "Turno",
    studentCount: Math.max(0, row.student_count || 0)
  }));
}

export async function getTeacherContext(session: MobileSession): Promise<TeacherContext> {
  const rows = await rpc<RpcTeacherContextRow[]>(session, "teacher_get_context", {});
  const row = rows[0];
  if (!row?.teacher_id) throw new Error("teacher_context_missing");
  return {
    teacherId: row.teacher_id,
    teacherName: row.teacher_name || "Professor",
    schoolId: row.school_id,
    schoolName: row.school_name || "Escola",
    role: row.role || "professor",
    discipline: row.discipline,
    activeClassLinks: Math.max(0, row.active_class_links || 0)
  };
}

export async function getTeacherHomeSummary(session: MobileSession): Promise<TeacherHomeSummary> {
  const rows = await rpc<RpcTeacherHomeSummaryRow[]>(session, "teacher_get_home_summary", {});
  const row = rows[0];
  if (!row) throw new Error("teacher_home_missing");
  return {
    teacherName: row.teacher_name || "Professor",
    schoolName: row.school_name || "Escola",
    activeClassLinks: Math.max(0, row.active_class_links || 0),
    totalStudents: Math.max(0, row.total_students || 0),
    todaysCalendarCount: Math.max(0, row.todays_calendar_count || 0),
    unreadNotifications: Math.max(0, row.unread_notifications || 0)
  };
}

export async function getTeacherClassStudents(session: MobileSession, classId: string): Promise<TeacherClassStudent[]> {
  const rows = await restGet<RestTeacherClassStudentRow[]>(
    session,
    [
      "enrollments?select=student_id,students(nome,status)",
      `class_id=eq.${encodeURIComponent(classId)}`,
      "status=eq.active",
      "order=created_at.asc"
    ].join("&")
  );
  return rows.map((row) => {
    const student = firstEmbedded(row.students);
    return {
      id: row.student_id,
      name: stringValue(student.nome) || "Aluno",
      status: stringValue(student.status) || "active"
    };
  });
}

export async function getTeacherNotificationCenter(session: MobileSession): Promise<TeacherNotificationCenterItem[]> {
  const rows = await rpc<RpcTeacherNotificationRow[]>(session, "teacher_get_notification_center", {
    p_read_filter: "all",
    p_limit: 50,
    p_offset: 0
  });
  return rows.map((row) => ({
    id: row.notification_id,
    title: row.title || "Notificação",
    summary: row.summary || "",
    deliveredAt: row.delivered_at,
    unread: row.notification_status !== "read"
  }));
}

export async function saveTeacherAttendanceRecords(
  session: MobileSession,
  classId: string,
  attendanceDate: string,
  records: TeacherAttendanceRecordInput[]
): Promise<void> {
  await rpc(session, "teacher_set_attendance_records", {
    p_class_id: classId,
    p_attendance_date: attendanceDate,
    p_records: records.map((record) => ({
      student_id: record.studentId,
      status: record.status,
      notes: record.notes || null
    }))
  });
}

export async function getTeacherCalendarEntries(session: MobileSession, classes: TeacherMobileClass[]): Promise<TeacherCalendarEntry[]> {
  if (classes.length === 0) return [];
  const classIds = classes.map((item) => item.id);
  const classNames = new Map(classes.map((item) => [item.id, item.name]));
  const today = new Date();
  const rows = await restGet<RestTeacherCalendarRow[]>(
    session,
    [
      "class_calendar_entries?select=id,class_id,entry_date,start_time,end_time,title,description,entry_type,status,classes(nome)",
      `class_id=in.(${classIds.join(",")})`,
      `entry_date=gte.${isoDate(addDays(today, -7))}`,
      `entry_date=lte.${isoDate(addDays(today, 21))}`,
      "status=eq.published",
      "order=entry_date.asc"
    ].join("&")
  );
  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    className: classNames.get(row.class_id) || stringValue(firstEmbedded(row.classes).nome) || "Turma",
    title: row.title || "Compromisso",
    description: row.description || "",
    entryDate: row.entry_date || isoDate(today),
    startTime: row.start_time,
    endTime: row.end_time,
    entryType: row.entry_type || "outro",
    status: row.status || "published"
  }));
}

export async function saveTeacherCalendarEntry(session: MobileSession, draft: TeacherCalendarDraft): Promise<void> {
  await rpc(session, "teacher_upsert_calendar_entry", {
    p_entry_id: draft.entryId || null,
    p_plan_id: null,
    p_class_id: draft.classId,
    p_entry_date: draft.entryDate,
    p_start_time: draft.startTime || null,
    p_end_time: draft.endTime || null,
    p_title: draft.title,
    p_description: draft.description || null,
    p_entry_type: draft.entryType
  });
}

export async function getTeacherCommunicationSummaries(session: MobileSession): Promise<TeacherCommunicationSummary[]> {
  const summaries = await rpc<RpcCommunicationSummaryRow[]>(session, "communication_list_delivery_summaries", {});
  if (summaries.length === 0) return [];
  const byId = new Map(summaries.map((row) => [row.communication_id, row]));
  const rows = await restGet<RestCommunicationRow[]>(
    session,
    [
      "communications?select=id,title,body,audience_type,class_id,student_id,communication_date,status,classes(nome),students(nome)",
      `id=in.(${summaries.map((row) => row.communication_id).join(",")})`,
      "order=communication_date.desc"
    ].join("&")
  );
  return rows.map((row) => {
    const summary = byId.get(row.id);
    const className = stringValue(firstEmbedded(row.classes).nome);
    const studentName = stringValue(firstEmbedded(row.students).nome);
    return {
      communicationId: row.id,
      title: row.title || "Recado",
      audienceType: row.audience_type || "class",
      audienceLabel: studentName || className || "Turma",
      body: row.body || "",
      communicationDate: row.communication_date,
      status: row.status || "published",
      deliveredCount: Math.max(0, summary?.delivered_count || 0),
      readCount: Math.max(0, summary?.read_count || 0),
      unreadCount: Math.max(0, summary?.unread_count || 0)
    };
  });
}

export async function publishTeacherCommunication(session: MobileSession, draft: TeacherCommunicationDraft): Promise<void> {
  await rpc(session, "publish_communication", {
    p_school_id: draft.schoolId,
    p_communication_type: "message",
    p_audience_type: draft.audienceType,
    p_title: draft.title,
    p_body: draft.body,
    p_class_id: draft.classId,
    p_student_id: draft.audienceType === "student" ? draft.studentId || null : null,
    p_status: "published",
    p_communication_date: isoDate(new Date()),
    p_expires_at: null
  });
}

export async function getTeacherDiaryEntries(session: MobileSession, classId: string): Promise<TeacherDiaryEntry[]> {
  const today = new Date();
  const rows = await rpc<RpcTeacherDiaryEntryRow[]>(session, "teacher_list_class_diary_entries", {
    p_class_id: classId,
    p_from: isoDate(addDays(today, -30)),
    p_to: isoDate(addDays(today, 7))
  });
  return rows.map((row) => ({
    id: row.id,
    classId: row.class_id,
    title: row.title || "Diário de Classe",
    entryDate: row.entry_date || isoDate(today),
    taughtContent: row.taught_content || "",
    pedagogicalNotes: row.pedagogical_notes || "",
    status: row.status || "draft",
    attendancePresent: Math.max(0, row.attendance_present || 0),
    attendanceAbsent: Math.max(0, row.attendance_absent || 0),
    attendanceJustified: Math.max(0, row.attendance_justified || 0)
  }));
}

export async function getTeacherDiaryPeriodSummary(session: MobileSession, classId: string): Promise<TeacherDiaryPeriodSummary> {
  const today = new Date();
  const payload = await rpc<Record<string, unknown>>(session, "teacher_get_class_diary_period_summary", {
    p_class_id: classId,
    p_from: isoDate(addDays(today, -30)),
    p_to: isoDate(addDays(today, 7))
  });
  return {
    attendancePresent: Math.max(0, numberValue(payload.attendance_present, 0)),
    attendanceAbsent: Math.max(0, numberValue(payload.attendance_absent, 0)),
    attendanceJustified: Math.max(0, numberValue(payload.attendance_justified, 0)),
    registeredClasses: Math.max(0, numberValue(payload.registered_classes, 0)),
    plannedCount: Math.max(0, numberValue(payload.planned_count, 0)),
    publishedCount: Math.max(0, numberValue(payload.published_count, 0))
  };
}

export async function getTeacherAssessmentAssignments(session: MobileSession): Promise<TeacherAssessmentAssignment[]> {
  const rows = await restGet<RestTeacherAssessmentAssignmentRow[]>(
    session,
    [
      "assessment_assignments?select=id,class_id,status,available_from,available_until,assessments(title,description,component,school_year),classes(nome)",
      "order=available_from.desc.nullslast"
    ].join("&")
  );
  return rows.map((row) => {
    const assessment = firstEmbedded(row.assessments);
    const schoolClass = firstEmbedded(row.classes);
    return {
      id: row.id,
      title: stringValue(assessment.title) || "Avaliação",
      description: stringValue(assessment.description) || "",
      subject: stringValue(assessment.component) || "Avalia+",
      classId: row.class_id,
      className: stringValue(schoolClass.nome) || "Turma",
      schoolYear: stringValue(assessment.school_year),
      status: row.status || "published",
      availableFrom: row.available_from,
      availableUntil: row.available_until
    };
  });
}

export async function getTeacherTrackingOverview(session: MobileSession, classId: string): Promise<TeacherTrackingOverview> {
  const today = new Date();
  const payload = await rpc<Record<string, unknown>>(session, "analytics_get_class_overview", {
    p_class_id: classId,
    p_date_from: isoDate(addDays(today, -30)),
    p_date_to: isoDate(today),
    p_school_year: null
  });
  const summary = payload.summary && typeof payload.summary === "object" ? recordValue(payload.summary) : payload;
  return {
    classId,
    attendanceRate: Math.max(0, numberValue(summary.attendance_rate, 0)),
    assessmentParticipation: Math.max(0, numberValue(summary.assessment_participation, 0)),
    assessmentAverage: Math.max(0, numberValue(summary.assessment_average, 0)),
    diaryEntriesCount: Math.max(0, numberValue(summary.diary_entries_count, 0))
  };
}

export async function getTeacherTrackingAlerts(session: MobileSession, classId?: string): Promise<TeacherTrackingAlert[]> {
  const today = new Date();
  const payload = await rpc<Record<string, unknown>>(session, "analytics_get_alerts", {
    p_school_id: null,
    p_class_id: classId || null,
    p_date_from: isoDate(addDays(today, -30)),
    p_date_to: isoDate(today),
    p_attendance_threshold: 80,
    p_assessment_participation_threshold: 70,
    p_assessment_average_threshold: 60,
    p_bncc_threshold: 60,
    p_require_diary: true
  });
  const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
  return alerts.map((item, index) => {
    const row = recordValue(item);
    return {
      id: stringValue(row.type) || `alert-${index + 1}`,
      title: stringValue(row.type)?.replace(/_/g, " ") || "Alerta",
      body: stringValue(row.message) || ""
    };
  });
}

export async function getCrescerStudentProfile(session: MobileSession): Promise<CrescerStudentProfile> {
  const query = [
    "select=nome,frequencia_percent,aulas_presentes,total_aulas,nivel,school:schools(nome),class:classes(nome,age_group,school_year)",
    `user_id=eq.${encodeURIComponent(session.userId)}`,
    "limit=1"
  ].join("&");
  const rows = await restGet<RestStudentProfileRow[]>(session, `students?${query}`);
  const row = rows[0];
  if (!row?.nome) throw new Error("student_profile_missing");
  const school = firstEmbedded(row.school);
  const schoolClass = firstEmbedded(row.class);
  return {
    name: row.nome,
    initials: initialsFromName(row.nome),
    className: stringValue(schoolClass.nome) || "Turma",
    schoolName: stringValue(school.nome) || "Escola",
    schoolYear: stringValue(schoolClass.school_year),
    ageGroup: stringValue(schoolClass.age_group),
    attendancePercent: nullableNumber(row.frequencia_percent),
    presentClasses: nullableNumber(row.aulas_presentes),
    totalClasses: nullableNumber(row.total_aulas),
    levelNumber: nullableNumber(row.nivel)
  };
}

export async function getStudentProfile(session: MobileSession): Promise<StudentProfile> {
  const rows = await rpc<RpcStudentContextRow[]>(session, "student_get_context", {});
  const row = rows[0];
  if (!row?.student_name) throw new Error("student_profile_missing");
  return {
    name: row.student_name,
    initials: initialsFromName(row.student_name),
    className: stringValue(row.class_name) || "Turma",
    schoolName: stringValue(row.school_name) || "Escola",
    schoolYear: stringValue(row.school_year),
    ageGroup: stringValue(row.age_group),
    attendancePercent: null,
    presentClasses: null,
    totalClasses: null,
    levelNumber: null
  };
}

export async function getCrescerCalendarEvents(session: MobileSession): Promise<CrescerCalendarEvent[]> {
  const today = new Date();
  const from = isoDate(addDays(today, -7));
  const to = isoDate(addDays(today, 21));
  const rows = await rpc<RpcCalendarEventRow[]>(session, "student_list_calendar_events", { p_from: from, p_to: to });
  return rows.map((row) => ({
    title: row.title || "Agenda",
    description: row.description || "",
    eventDate: row.event_date || from,
    startTime: row.start_time,
    endTime: row.end_time,
    eventType: row.event_type || "agenda",
    actionLabel: row.action_label || "Ver agenda"
  }));
}

export async function getCrescerFamilyMessages(session: MobileSession): Promise<CrescerFamilyMessage[]> {
  const rows = await rpc<RpcCommunicationRow[]>(session, "communication_get_inbox", {
    p_student_id: null,
    p_read_filter: "all",
    p_period_days: 90,
    p_limit: 5,
    p_offset: 0
  });
  return rows.map((row) => ({
    title: row.title || "Recado",
    body: row.body || "",
    origin: row.author_name || "Equipe escolar",
    date: row.communication_date || row.delivered_at,
    unread: row.notification_status === "unread",
    contextLabel: row.context_label || "Comunicado da escola"
  }));
}

export async function getCrescerNotificationCenter(session: MobileSession): Promise<CrescerNotificationCenterItem[]> {
  const rows = await rpc<RpcNotificationCenterRow[]>(session, "notification_get_center", {
    p_student_id: null,
    p_read_filter: "all",
    p_period_days: 90,
    p_limit: 5,
    p_offset: 0
  });
  return rows.map((row) => ({
    title: row.title || "Notificação",
    summary: row.summary || "",
    origin: row.origin_label || "Escola",
    deliveredAt: row.delivered_at,
    unread: row.notification_status === "unread"
  }));
}

async function rpc<T>(session: MobileSession, name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: authenticatedHeaders(session),
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new Error([`rpc_failed:${name}`, response.status, payload.code, payload.message].filter(Boolean).join(":"));
  }
  return (await response.json()) as T;
}

async function restGet<T>(session: MobileSession, path: string): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: "GET",
    headers: authenticatedHeaders(session)
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    throw new Error([`rest_failed:${path.split("?")[0]}`, response.status, payload.code, payload.message].filter(Boolean).join(":"));
  }
  return (await response.json()) as T;
}

async function edgeRead<T>(session: MobileSession, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/student-library-read-access`, {
    method: "POST",
    headers: authenticatedHeaders(session),
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("library_request_failed");
  return (await response.json()) as T;
}

function authenticatedHeaders(session: MobileSession) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    authorization: `Bearer ${session.accessToken}`,
    "content-type": "application/json"
  };
}

function mapBookRow(row: RpcBookRow): LibraryBook {
  return {
    id: row.book_id,
    legacyId: row.legacy_id,
    title: row.title || "Livro",
    description: row.description || "",
    category: row.category || "Leitura",
    segment: row.segment,
    schoolYear: row.school_year,
    coverUrl: row.cover_url,
    hasCover: row.has_cover === true,
    hasReadingAsset: row.has_reading_asset === true,
    currentPage: Math.max(1, row.current_page || 1),
    percentComplete: Math.max(0, Math.min(100, row.percent_complete || 0)),
    updatedAt: row.updated_at
  };
}

function mapInstitutionalActivityRow(row: RpcInstitutionalActivityRow): InstitutionalActivity {
  return {
    id: row.activity_id,
    title: row.title || "Atividade",
    description: row.description || "",
    schoolYear: row.school_year,
    xp: Math.max(0, row.xp || 0),
    status: row.status || "active",
    progressStatus: row.progress_status || "not_started",
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at
  };
}

function mapAssessmentAssignment(assignment: RpcAssessmentAssignment, attempts: RpcAssessmentAttempt[]): StudentAssessmentAssignment {
  const assessment = assignment.assessment || {};
  const assignmentId = assignment.id || assignment.assignment_id || "";
  const assessmentId = assignment.assessment_id || assessment.id || "";
  const attempt = attempts.find((item) => item.assignment_id === assignmentId || item.assessment_id === assessmentId) || null;
  const questionCount = nullableNumber(assessment.question_count) ?? countUnknownArray(assessment.questions);
  const answeredCount = nullableNumber(attempt?.answered_count) ?? countUnknownArray(attempt?.responses);

  return {
    id: assignmentId || assessmentId,
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
    scorePercent: nullableNumber(attempt?.score_percent)
  };
}

function mapActivityRow(row: RpcActivityRow): EarlyChildhoodActivity {
  const asset = row.asset || {};
  return {
    id: row.id,
    legacyId: row.legacy_id || "",
    title: row.title || "Atividade",
    description: row.description || "",
    instruction: row.instruction || "",
    activityType: row.activity_type,
    ageGroup: row.age_group,
    asset,
    sceneAssetId: stringValue(asset.scene_asset_legacy_id) || stringValue(asset.cover_asset_legacy_id),
    coverAssetId: stringValue(asset.cover_asset_legacy_id),
    progressStatus: parseActivityStatus(row.progress_status),
    percentComplete: Math.max(0, Math.min(100, row.percent_complete || 0)),
    updatedAt: row.updated_at
  };
}

function mapDiscoveryRow(row: RpcDiscoveryRow): EarlyChildhoodDiscovery {
  const resources = parseResources(row.resources);
  const hotspots = parseHotspots(row.hotspots);
  return {
    id: row.id,
    legacyId: row.legacy_id || "",
    title: row.title || "Descoberta",
    description: row.description || "",
    studentInstruction: row.student_instruction || "",
    discoveryType: row.discovery_type,
    ageGroup: row.age_group,
    resources,
    completionRule: row.completion_rule || {},
    hotspots,
    sceneAssetId: resources.find((resource) => resource.role === "scene" && resource.assetLegacyId)?.assetLegacyId || null,
    progressStatus: parseDiscoveryStatus(row.progress_status),
    discoveredHotspots: parseStringArray(row.discovered_hotspots),
    updatedAt: row.updated_at
  };
}

function mapGameRow(row: RpcGameRow): EarlyChildhoodGame {
  return {
    id: row.id,
    legacyId: row.legacy_id || "",
    title: row.title || "Jogo",
    description: row.description || "",
    studentInstruction: row.student_instruction || "",
    gameType: row.game_type,
    engine: row.engine,
    entrypoint: row.entrypoint,
    orientation: row.orientation,
    ageGroup: row.age_group,
    engineConfig: row.engine_config || {},
    completionRule: row.completion_rule || {},
    scoreRule: row.score_rule || {},
    latestAttemptStatus: row.latest_attempt_status ?? null,
    latestScorePercent: row.latest_score_percent ?? null,
    latestCompletedAt: row.latest_completed_at ?? null,
    updatedAt: row.updated_at
  };
}

function parseActivityStatus(status: string | null | undefined): EarlyChildhoodActivityStatus {
  if (status === "IN_PROGRESS" || status === "COMPLETED") return status;
  return "NOT_STARTED";
}

function parseDiscoveryStatus(status: string | null | undefined): EarlyChildhoodDiscoveryStatus {
  if (status === "IN_PROGRESS" || status === "COMPLETED") return status;
  return "NOT_STARTED";
}

function parseResources(value: unknown): EarlyChildhoodDiscoveryResource[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const resource = recordValue(item);
    return {
      type: stringValue(resource.type),
      role: stringValue(resource.role),
      assetLegacyId: stringValue(resource.asset_legacy_id),
      activityLegacyId: stringValue(resource.activity_legacy_id)
    };
  });
}

function parseHotspots(value: unknown): EarlyChildhoodDiscoveryHotspot[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const hotspot = recordValue(item);
    const legacyId = stringValue(hotspot.legacy_id) || stringValue(hotspot.id) || `hotspot-${index + 1}`;
    return {
      id: stringValue(hotspot.id) || legacyId,
      legacyId,
      title: stringValue(hotspot.title) || "Descoberta",
      description: stringValue(hotspot.description) || "",
      sortOrder: numberValue(hotspot.sort_order, index + 1),
      xPercent: numberValue(hotspot.x_percent, 10),
      yPercent: numberValue(hotspot.y_percent, 10),
      widthPercent: numberValue(hotspot.width_percent, 30),
      heightPercent: numberValue(hotspot.height_percent, 18),
      actionType: stringValue(hotspot.action_type),
      targetType: stringValue(hotspot.target_type),
      targetLegacyId: stringValue(hotspot.target_legacy_id),
      assetLegacyId: stringValue(hotspot.asset_legacy_id),
      audioAssetLegacyId: stringValue(hotspot.audio_asset_legacy_id),
      accessibilityLabel: stringValue(hotspot.accessibility_label) || stringValue(hotspot.title) || "Ponto de descoberta"
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function parseGameManifestAssets(value: unknown): EarlyChildhoodGameManifestAsset[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = recordValue(item);
    const legacyId = stringValue(row.legacyId) || stringValue(row.id) || "";
    return {
      id: stringValue(row.id) || legacyId,
      legacyId,
      role: stringValue(row.role),
      type: stringValue(row.type),
      title: stringValue(row.title),
      mimeType: stringValue(row.mimeType),
      storageAccess: stringValue(row.storageAccess),
      status: stringValue(row.status),
      metadata: recordValue(row.metadata)
    };
  }).filter((asset) => asset.legacyId.length > 0);
}

function firstRpcRow<T>(payload: unknown, errorCode: string): T {
  const rows = Array.isArray(payload) ? payload : [payload];
  const row = rows[0] as T | undefined;
  if (!row) throw new Error(errorCode);
  return row;
}

function mapGameAttempt(row: Partial<RpcGameAttemptStartRow & RpcGameAttemptUpdateRow & RpcGameAttemptCompleteRow>): EarlyChildhoodGameAttempt {
  return {
    attemptId: row.attempt_id || "",
    gameId: row.game_id || "",
    attemptNumber: row.attempt_number ?? undefined,
    status: parseGameAttemptStatus(row.status),
    scorePercent: row.score_percent ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    canonicalResult: row.canonical_result ?? undefined,
    resultEventType: row.result_event_type ?? null,
    resultEventKey: row.result_event_key ?? null,
    startedAt: row.started_at ?? null,
    updatedAt: row.updated_at ?? null,
    completedAt: row.completed_at ?? null
  };
}

function parseGameAttemptStatus(status: string | null | undefined): EarlyChildhoodGameAttemptStatus {
  if (status === "IN_PROGRESS" || status === "COMPLETED" || status === "ABANDONED") return status;
  return "STARTED";
}

function recordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function numberValue(value: unknown, fallback: number) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function nullableNumber(value: unknown) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function countUnknownArray(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeRouteValue(value: unknown) {
  return typeof value === "string"
    ? value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
    : "";
}

function firstEmbedded<T extends Record<string, unknown>>(value: T | T[] | null | undefined): T {
  if (Array.isArray(value)) return value[0] || ({} as T);
  return value || ({} as T);
}

function initialsFromName(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "AL";
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseAsset(payload: AssetResponse): LibraryReadAsset {
  const asset = payload.asset;
  if (!asset?.signedUrl || !asset.mimeType) throw new Error("asset_missing");
  return {
    kind: asset.kind || "page",
    pageNumber: asset.pageNumber,
    pageCount: asset.pageCount,
    mimeType: asset.mimeType,
    signedUrl: asset.signedUrl,
    expiresIn: asset.expiresIn || 300
  };
}
