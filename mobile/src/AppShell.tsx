import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import {
  AppHeader,
  Badge,
  BottomNavigation,
  EmptyState,
  HeroCard,
  ListCard,
  ModuleCard,
  PrimaryButton,
  Screen,
  SectionHeader,
  StatCard
} from "./components/MobileKit";
import { demoCollections, type AppProfile, type ModuleKey } from "./data/fixtures";
import {
  getEarlyChildhoodActivities,
  getEarlyChildhoodActivity,
  getEarlyChildhoodActivityAsset,
  getEarlyChildhoodDiscoveries,
  getEarlyChildhoodDiscovery,
  getEarlyChildhoodDiscoveryAsset,
  getEarlyChildhoodGame,
  getEarlyChildhoodGameAsset,
  getEarlyChildhoodGameManifest,
  getEarlyChildhoodGames,
  getCrescerCalendarEvents,
  getCrescerFamilyMessages,
  getCrescerNotificationCenter,
  getCrescerStudentProfile,
  getInstitutionalActivities,
  getInstitutionalActivity,
  getStudentProfile,
  getStudentAssessmentAssignments,
  getTeacherCalendarEntries,
  getTeacherClassStudents,
  getTeacherCommunicationSummaries,
  getTeacherAssessmentAssignments,
  getTeacherContext,
  getTeacherDiaryEntries,
  getTeacherDiaryPeriodSummary,
  getTeacherHomeSummary,
  getTeacherMobileClasses,
  getTeacherNotificationCenter,
  getTeacherTrackingAlerts,
  getTeacherTrackingOverview,
  publishTeacherCommunication,
  saveTeacherAttendanceRecords,
  saveTeacherCalendarEntry,
  getLibraryBook,
  getLibraryBooks,
  getLibraryManifest,
  getLibraryPageAsset,
  getStudentAchievements,
  getStudentXpHistory,
  getStudentXpSummary,
  completeEarlyChildhoodGameAttempt,
  startEarlyChildhoodGameAttempt,
  updateEarlyChildhoodGameAttempt,
  saveEarlyChildhoodActivityProgress,
  saveEarlyChildhoodDiscoveryProgress,
  saveLibraryProgress,
  type EarlyChildhoodActivity,
  type EarlyChildhoodAsset,
  type EarlyChildhoodDiscovery,
  type EarlyChildhoodDiscoveryHotspot,
  type EarlyChildhoodGame,
  type EarlyChildhoodGameAttempt,
  type EarlyChildhoodGameManifest,
  type CrescerCalendarEvent,
  type CrescerFamilyMessage,
  type CrescerNotificationCenterItem,
  type InstitutionalActivity,
  type CrescerStudentProfile,
  type LibraryBook,
  type LibraryManifest,
  type MobileSession,
  type StudentProfile,
  type StudentAssessmentAssignment,
  type StudentAchievement,
  type StudentXpHistoryItem,
  type StudentXpSummary,
  type TeacherCalendarEntry as RealTeacherCalendarEntry,
  type TeacherClassStudent as RealTeacherClassStudent,
  type TeacherCommunicationSummary as RealTeacherCommunicationSummary,
  type TeacherDiaryEntry as RealTeacherDiaryEntry,
  type TeacherDiaryPeriodSummary as RealTeacherDiaryPeriodSummary,
  type TeacherAssessmentAssignment,
  type TeacherHomeSummary,
  type TeacherMobileClass,
  type TeacherNotificationCenterItem,
  type TeacherTrackingAlert as RealTeacherTrackingAlert,
  type TeacherTrackingOverview
} from "./services/library";
import { colors, shadow, spacing } from "./theme";

const crescerHomeIcons = {
  achievements: require("../assets/crescer-home/icon_conquistas.png"),
  activities: require("../assets/crescer-home/icon_atividades.png"),
  agenda: require("../assets/crescer-home/icon_agenda.png"),
  discoveries: require("../assets/crescer-home/icon_descobertas.png"),
  family: require("../assets/crescer-home/icon_familia.png"),
  games: require("../assets/crescer-home/icon_jogos.png"),
  library: require("../assets/crescer-home/icon_biblioteca.png"),
  mission: require("../assets/crescer-home/icon_missao.png"),
  notifications: require("../assets/crescer-home/icon_notificacoes.png"),
  pending: require("../assets/crescer-home/icon_pendencias.png"),
  week: require("../assets/crescer-home/icon_semana.png")
} as const satisfies Record<string, ImageSourcePropType>;

const teacherHomeIcons = {
  avalia: require("../assets/teacher-home/icon_communication_avalia.png"),
  classes: require("../assets/teacher-home/icon_classes_tracking.png"),
  communication: require("../assets/teacher-home/icon_communication_avalia.png"),
  diary: require("../assets/teacher-home/icon_notifications_diary.png"),
  notifications: require("../assets/teacher-home/icon_notifications_diary.png"),
  peopleCalendar: require("../assets/teacher-home/icon_people_calendar.png"),
  tracking: require("../assets/teacher-home/icon_classes_tracking.png")
} as const satisfies Record<string, ImageSourcePropType>;

type TeacherSplitIcon = {
  source: ImageSourcePropType;
  side: "left" | "right";
};

type Route = {
  key: ModuleKey;
  title: string;
};

export function AppShell({ profile, session, onLogout }: { profile: AppProfile; session: MobileSession | null; onLogout: () => void }) {
  const [stack, setStack] = useState<Route[]>([{ key: "home", title: "Início" }]);
  const [readNotificationTitles, setReadNotificationTitles] = useState<string[]>([]);
  const route = stack[stack.length - 1];
  const tone = profile.accent === "child" ? "child" : profile.accent === "blue" ? "blue" : profile.role === "professor" ? "teacher" : "paper";

  const moduleMap = useMemo(() => new Map(profile.modules.map((item) => [item.key, item])), [profile.modules]);

  function goTo(key: ModuleKey) {
    const title = String(key).startsWith("notification:")
      ? "Notificação"
      : String(key).startsWith("agenda:")
      ? "Compromisso"
      : String(key).startsWith("achievement:")
      ? "Conquista"
      : String(key).startsWith("profile:")
      ? "Perfil"
      : String(key).startsWith("family:")
      ? "Família"
      : String(key).startsWith("game:")
      ? "Jogo"
      : String(key).startsWith("discovery:")
        ? "Descoberta"
      : String(key).startsWith("activity:")
        ? "Atividade"
        : String(key).startsWith("book:")
          ? "Leitura"
          : String(key).startsWith("avalia:")
            ? "Avalia+"
        : key === "home"
          ? "Início"
          : moduleMap.get(key)?.label ?? "Módulo";
    setStack((current) => [...current, { key, title }]);
  }

  function goHome() {
    setStack([{ key: "home", title: "Início" }]);
  }

  function goBack() {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function markNotificationRead(title: string) {
    setReadNotificationTitles((current) => (current.includes(title) ? current : [...current, title]));
  }

  return (
    <View style={styles.root}>
      <Screen tone={tone}>
        {profile.role === "crescer" && route.key === "home" ? null : (
          <AppHeader
            title={route.title}
            subtitle={profile.title}
            onBack={stack.length > 1 ? goBack : undefined}
            onHome={route.key !== "home" ? goHome : undefined}
            onLogout={onLogout}
          />
        )}
        {route.key === "home" ? (
          <HomeScreen profile={profile} session={session} onOpen={goTo} />
        ) : (
          <ModuleScreen
            profile={profile}
            session={session}
            activeKey={route.key}
            onOpen={goTo}
            onBack={goBack}
            onLogout={onLogout}
            readNotificationTitles={readNotificationTitles}
            onReadNotification={markNotificationRead}
          />
        )}
      </Screen>
      <BottomNavigation profile={profile} activeKey={route.key} onSelect={(key) => (key === "home" ? goHome() : goTo(key as ModuleKey))} />
    </View>
  );
}

function HomeScreen({ profile, session, onOpen }: { profile: AppProfile; session: MobileSession | null; onOpen: (key: ModuleKey) => void }) {
  if (profile.role === "crescer") {
    return <CrescerHomeScreen profile={profile} session={session} onOpen={onOpen} />;
  }

  if (profile.role === "fundamental") {
    return <FundamentalHomeScreen profile={profile} session={session} onOpen={onOpen} />;
  }

  if (profile.role === "professor") {
    return <TeacherHomeScreen profile={profile} session={session} onOpen={onOpen} />;
  }

  return (
    <View>
      <HeroCard profile={profile} />
      <SectionHeader title="Ações principais" />
      {profile.modules.map((item) => (
        <ModuleCard key={item.key} item={item} onPress={() => onOpen(item.key)} />
      ))}
    </View>
  );
}

function CrescerHomeScreen({ profile, session, onOpen }: { profile: AppProfile; session: MobileSession | null; onOpen: (key: ModuleKey) => void }) {
  const [studentProfile, setStudentProfile] = useState<CrescerStudentProfile | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CrescerCalendarEvent[]>([]);
  const [notifications, setNotifications] = useState<CrescerNotificationCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = useWindowDimensions();
  const tablet = width >= 700;

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      getCrescerStudentProfile(session).catch(() => null),
      getCrescerCalendarEvents(session).catch(() => []),
      getCrescerNotificationCenter(session).catch(() => [])
    ])
      .then(([nextProfile, nextEvents, nextNotifications]) => {
        if (!active) return;
        setStudentProfile(nextProfile);
        setCalendarEvents(nextEvents);
        setNotifications(nextNotifications);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const studentName = studentProfile?.name || profile.userName;
  const firstName = studentName.split(" ")[0] || "aluno";
  const initialsText = initials(studentName);
  const pendingCount = notifications.filter((item) => item.unread).length;
  const weekCount = countWeekDays(calendarEvents);
  const learningCards: CrescerHomeCardSpec[] = [
    { key: "discoveries", title: "Descobertas", body: "Explorar o mundo é incrível.", icon: "discoveries", tone: "mint" },
    { key: "activities", title: "Atividades", body: "Criar, aprender e evoluir.", icon: "activities", tone: "sun" },
    { key: "library", title: "Biblioteca", body: "Histórias para imaginar.", icon: "library", tone: "sky" },
    { key: "games", title: "Jogos", body: "Brincar também é aprender.", icon: "games", tone: "lilac" }
  ];
  const dayCards: CrescerHomeCardSpec[] = [
    { key: "achievements", title: "Conquistas", body: "Medalhas e progressos.", icon: "achievements", tone: "rose" },
    { key: "agenda", title: "Agenda", body: calendarEvents.length ? `${calendarEvents.length} compromisso${calendarEvents.length === 1 ? "" : "s"}.` : "Sem compromissos agora.", icon: "agenda", tone: "sky" },
    { key: "notifications", title: "Notificações", body: pendingCount ? `${pendingCount} aviso${pendingCount === 1 ? "" : "s"} novo${pendingCount === 1 ? "" : "s"}.` : "Nenhum aviso novo.", icon: "notifications", tone: "lilac" },
    { key: "family", title: "Família", body: "Juntos na mesma jornada.", icon: "family", tone: "mint" }
  ];

  return (
    <View style={styles.crescerHome}>
      <View style={styles.crescerHomeHeader}>
        <View style={styles.crescerBrandMark}>
          <Feather name="book-open" size={28} color={colors.brand} />
          <View>
            <Text style={styles.crescerBrandTitle}>Raízes e Saberes</Text>
            <Text style={styles.crescerBrandSubtitle}>Grandes futuros nascem aqui</Text>
          </View>
        </View>
      </View>

      <View style={styles.crescerWelcomeCard}>
        <View style={styles.crescerAvatar}>
          <Text style={styles.crescerAvatarText}>{initialsText}</Text>
        </View>
        <View style={styles.crescerWelcomeText}>
          <Text style={styles.crescerWelcomeTitle}>{loading ? "Carregando..." : `Olá, ${firstName}!`}</Text>
          <Text style={styles.crescerWelcomeBody}>Hoje tem espaços preparados para brincar, ler e descobrir.</Text>
        </View>
        <View style={styles.crescerEncouragement}>
          <Feather name="feather" size={18} color={colors.child} />
          <Text style={styles.crescerEncouragementText}>Você consegue!</Text>
        </View>
      </View>

      <View style={styles.crescerMissionCard}>
        <View style={styles.crescerMissionGlow} />
        <View style={styles.crescerMissionRibbon} />
        <View style={styles.crescerMissionIcon}>
          <Image source={crescerHomeIcons.mission} resizeMode="contain" style={styles.crescerMissionIconImage} />
        </View>
        <View style={styles.crescerMissionText}>
          <Text style={styles.crescerMissionLabel}>Missão de hoje</Text>
          <Text style={styles.crescerMissionTitle}>Nenhuma missão publicada para agora.</Text>
        </View>
        <View style={styles.crescerMissionBadge}>
          <Text style={styles.crescerMissionBadgeText}>Em breve</Text>
        </View>
      </View>

      <View style={styles.crescerStatsRow}>
        <CrescerStatCard icon={crescerHomeIcons.pending} value={String(pendingCount)} label="Pendências" />
        <CrescerStatCard icon={crescerHomeIcons.week} value={weekCount ? `${weekCount} dias` : "0 dias"} label="Semana" />
      </View>

      <CrescerSectionTitle title="Vamos brincar e aprender" />
      <View style={[styles.crescerLearningGrid, tablet && styles.crescerLearningGridTablet]}>
        {learningCards.map((item) => (
          <CrescerFeatureCard key={item.key} item={item} large onPress={() => onOpen(item.key)} />
        ))}
      </View>

      <CrescerSectionTitle title="Meu dia" />
      <View style={[styles.crescerDayGrid, tablet && styles.crescerDayGridTablet]}>
        {dayCards.map((item) => (
          <CrescerFeatureCard key={item.key} item={item} onPress={() => onOpen(item.key)} />
        ))}
      </View>
    </View>
  );
}

type CrescerHomeCardSpec = {
  key: ModuleKey;
  title: string;
  body: string;
  icon: "achievements" | "activities" | "agenda" | "discoveries" | "family" | "games" | "library" | "notifications";
  tone: "lilac" | "mint" | "rose" | "sky" | "sun";
};

function CrescerStatCard({ icon, value, label }: { icon: ImageSourcePropType; value: string; label: string }) {
  return (
    <View style={styles.crescerStatCard}>
      <View style={styles.crescerStatIcon}>
        <Image source={icon} resizeMode="contain" style={styles.crescerStatIconImage} />
      </View>
      <View>
        <Text style={styles.crescerStatValue}>{value}</Text>
        <Text style={styles.crescerStatLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CrescerSectionTitle({ title }: { title: string }) {
  return (
    <View style={styles.crescerSectionTitleRow}>
      <Text style={styles.crescerSectionTitle}>{title}</Text>
      <View style={styles.crescerSectionStroke} />
    </View>
  );
}

function CrescerFeatureCard({ item, large = false, onPress }: { item: CrescerHomeCardSpec; large?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.crescerFeatureCard,
        large && styles.crescerFeatureCardLarge,
        toneStyle(item.tone),
        pressed && tonePressedStyle(item.tone),
        pressed && styles.crescerFeatureCardPressed
      ]}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.crescerFeatureGlow, large && styles.crescerFeatureGlowLarge]} />
          <View style={[styles.crescerFeatureIcon, large && styles.crescerFeatureIconLarge, iconToneStyle(item.tone), pressed && styles.crescerFeatureIconPressed]}>
            <Image source={crescerHomeIcons[item.icon]} resizeMode="contain" style={[styles.crescerFeatureIconImage, large && styles.crescerFeatureIconImageLarge]} />
          </View>
          <View style={styles.crescerFeatureCopy}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.crescerFeatureTitle}>
              {item.title}
            </Text>
            <Text style={styles.crescerFeatureBody}>{item.body}</Text>
          </View>
          <View style={styles.crescerFeatureArrow}>
            <Feather name="chevron-right" size={22} color={featureInk(item.tone)} />
          </View>
        </>
      )}
    </Pressable>
  );
}

function CrescerModuleHero({
  kicker,
  title,
  body,
  icon,
  tone = "mint"
}: {
  kicker: string;
  title: string;
  body: string;
  icon: keyof typeof crescerHomeIcons;
  tone?: CrescerHomeCardSpec["tone"];
}) {
  return (
    <View style={[styles.crescerModuleHero, toneStyle(tone)]}>
      <View style={styles.crescerModuleHeroGlow} />
      <View style={styles.crescerModuleHeroCopy}>
        <Text style={[styles.discoveryKicker, { color: featureInk(tone) }]}>{kicker}</Text>
        <Text style={[styles.discoveryTitle, styles.crescerModuleHeroTitle]}>{title}</Text>
        <Text style={styles.discoveryBody}>{body}</Text>
      </View>
      <Image source={crescerHomeIcons[icon]} resizeMode="contain" style={styles.crescerModuleHeroImage} />
    </View>
  );
}

function toneStyle(tone: CrescerHomeCardSpec["tone"]) {
  if (tone === "sun") return styles.crescerToneSun;
  if (tone === "sky") return styles.crescerToneSky;
  if (tone === "lilac") return styles.crescerToneLilac;
  if (tone === "rose") return styles.crescerToneRose;
  return styles.crescerToneMint;
}

function tonePressedStyle(tone: CrescerHomeCardSpec["tone"]) {
  if (tone === "sun") return styles.crescerToneSunPressed;
  if (tone === "sky") return styles.crescerToneSkyPressed;
  if (tone === "lilac") return styles.crescerToneLilacPressed;
  if (tone === "rose") return styles.crescerToneRosePressed;
  return styles.crescerToneMintPressed;
}

function iconToneStyle(tone: CrescerHomeCardSpec["tone"]) {
  if (tone === "sun") return styles.crescerIconToneSun;
  if (tone === "sky") return styles.crescerIconToneSky;
  if (tone === "lilac") return styles.crescerIconToneLilac;
  if (tone === "rose") return styles.crescerIconToneRose;
  return styles.crescerIconToneMint;
}

function featureInk(tone: CrescerHomeCardSpec["tone"]) {
  if (tone === "sun") return colors.warning;
  if (tone === "sky") return "#1673a6";
  if (tone === "lilac") return "#6d4bb5";
  if (tone === "rose") return "#b04463";
  return colors.child;
}

function countWeekDays(events: CrescerCalendarEvent[]) {
  const days = new Set(events.map((item) => item.eventDate).filter(Boolean));
  return days.size;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function FundamentalHomeScreen({ profile, session, onOpen }: { profile: AppProfile; session: MobileSession | null; onOpen: (key: ModuleKey) => void }) {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getStudentProfile(session)
      .then((nextProfile) => {
        if (active) setStudentProfile(nextProfile);
      })
      .catch(() => {
        if (active) setStudentProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const initials = studentProfile?.initials || "--";
  const title = studentProfile ? `Olá, ${studentProfile.name.split(" ")[0]}!` : "Contexto indisponível";
  const className = studentProfile?.className || "Turma não carregada";
  const schoolName = studentProfile?.schoolName || "Escola não carregada";
  const realModules = profile.modules;

  return (
    <View>
      <View style={styles.fundamentalHero}>
        <View style={styles.fundamentalHeroTop}>
          <View style={styles.fundamentalAvatar}>
            <Text style={styles.fundamentalAvatarText}>{initials}</Text>
          </View>
          <View style={styles.fundamentalHeroCopy}>
            <Text style={styles.fundamentalKicker}>Aluno Fundamental</Text>
            <Text style={styles.fundamentalHeroTitle}>{loading ? "Carregando seu contexto" : title}</Text>
            <Text style={styles.fundamentalHeroMeta}>
              {className} · {schoolName}
            </Text>
          </View>
        </View>
        <Text style={styles.fundamentalHeroIntro}>
          {studentProfile
            ? "Escolha um espaço para continuar. Os conteúdos aparecem quando sua escola publicar para sua turma."
            : "Não foi possível carregar o contexto institucional deste acesso agora."}
        </Text>
      </View>

      <SectionHeader title="Espaços disponíveis" />
      <View style={styles.fundamentalActionGrid}>
        {realModules.map((module) => (
          <FundamentalModuleShortcutCard key={module.key} module={module} onPress={() => onOpen(module.key)} />
        ))}
      </View>
    </View>
  );
}

function FundamentalModuleShortcutCard({ module, onPress }: { module: { key: ModuleKey; label: string; description: string }; onPress: () => void }) {
  const icon = fundamentalModuleIcon(module.key);
  const tone = fundamentalModuleTone(module.key);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={module.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.fundamentalActionCard,
        toneStyle(tone),
        pressed && styles.crescerFeatureCardPressed,
        pressed && tonePressedStyle(tone)
      ]}
    >
      <View style={styles.crescerFeatureGlow} />
      <View style={styles.fundamentalActionMark}>
        <Image source={icon} resizeMode="contain" style={styles.fundamentalActionImage} />
      </View>
      <Text style={styles.fundamentalActionTitle}>{module.label}</Text>
      <Text style={styles.fundamentalActionBody}>{module.description}</Text>
    </Pressable>
  );
}

function fundamentalModuleIcon(key: ModuleKey) {
  if (key === "activities") return crescerHomeIcons.activities;
  if (key === "library") return crescerHomeIcons.library;
  if (key === "avalia") return crescerHomeIcons.achievements;
  if (key === "agenda") return crescerHomeIcons.agenda;
  if (key === "notifications") return crescerHomeIcons.notifications;
  return crescerHomeIcons.family;
}

function fundamentalModuleTone(key: ModuleKey): CrescerHomeCardSpec["tone"] {
  if (key === "activities") return "sun";
  if (key === "library") return "sky";
  if (key === "avalia") return "rose";
  if (key === "agenda") return "sky";
  if (key === "notifications") return "lilac";
  return "mint";
}

function FundamentalQuickActionCard({ action, onPress }: { action: FundamentalQuickAction; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={onPress} style={styles.fundamentalActionCard}>
      <View style={styles.fundamentalActionMark}>
        <Text style={styles.fundamentalActionMarkText}>{action.mark}</Text>
      </View>
      <Text style={styles.fundamentalActionTitle}>{action.label}</Text>
      <Text style={styles.fundamentalActionBody}>{action.description}</Text>
    </Pressable>
  );
}

function FundamentalActivityCard({ activity, onPress }: { activity: FundamentalActivity; onPress?: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir atividade ${activity.title}`} onPress={onPress} style={styles.fundamentalActivityCard}>
      <View style={styles.fundamentalActivityCopy}>
        <Text style={styles.fundamentalActivitySubject}>{activity.schoolYear || "Atividade"}</Text>
        <Text style={styles.fundamentalActivityTitle}>{activity.title}</Text>
        <Text style={styles.fundamentalActivityDue}>{formatInstitutionalActivityDate(activity.createdAt)}</Text>
        <FundamentalProgress value={progressFromInstitutionalActivity(activity)} />
      </View>
      <View style={styles.fundamentalStatePill}>
        <Text style={styles.fundamentalStateText}>{normalizeFundamentalProgressStatus(activity.progressStatus)}</Text>
      </View>
    </Pressable>
  );
}

function progressFromInstitutionalActivity(activity: FundamentalActivity) {
  const state = normalizeFundamentalProgressStatus(activity.progressStatus);
  if (state === "Concluída") return 100;
  if (state === "Em andamento") return 50;
  return 0;
}

function normalizeFundamentalProgressStatus(status: string | null | undefined) {
  const normalized = typeof status === "string" ? status.toLowerCase() : "";
  if (normalized === "completed" || normalized === "concluida" || normalized === "concluída") return "Concluída";
  if (normalized === "in_progress" || normalized === "em_andamento" || normalized === "em andamento") return "Em andamento";
  return "Nova";
}

function formatInstitutionalActivityDate(value: string | null) {
  if (!value) return "Sem data publicada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data publicada";
  return `Publicado em ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
}

function FundamentalProgress({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <View style={[styles.fundamentalProgressTrack, compact && styles.fundamentalProgressTrackCompact]}>
      <View style={[styles.fundamentalProgressFill, { width: `${Math.max(8, Math.min(value, 100))}%` }]} />
    </View>
  );
}

type TeacherTodayItem = (typeof demoCollections.teacher.today)[number];
type TeacherQuickAction = (typeof demoCollections.teacher.quickActions)[number];
type TeacherClassSummary = (typeof demoCollections.teacher.classes)[number];
type TeacherClassStudent = TeacherClassSummary["studentsList"][number];
type TeacherAgendaItem = (typeof demoCollections.teacher.agenda)[number];
type TeacherModuleListItem = (typeof demoCollections.teacher.modules.classes)[number];
type TeacherCommunicationItem = (typeof demoCollections.teacher.communication)[number];
type TeacherDiaryCurrent = typeof demoCollections.teacher.modules.diary.current;
type TeacherDiaryEntry = (typeof demoCollections.teacher.modules.diary.recent)[number];
type TeacherAvaliaAssessment = (typeof demoCollections.teacher.modules.avalia.assessments)[number];
type TeacherAvaliaStudent = TeacherAvaliaAssessment["students"][number];
type AttendanceStatus = "Presente" | "Falta" | "Justificada";
type TeacherAgendaMode = "list" | "compose" | "detail" | "edit";
type TeacherAgendaType = "Aula" | "Atividade" | "Avaliação" | "Evento" | "Lembrete";
type TeacherAgendaDay = "Seg" | "Ter" | "Qua" | "Qui" | "Sex" | "Hoje";
type TeacherCommunicationMode = "inbox" | "compose" | "detail";
type TeacherCommunicationRecipientType = "Turma" | "Aluno";
type TeacherCommunicationFilter = "Todos" | "Turmas" | "Individuais";
type TeacherDiaryMode = "form" | "confirm" | "closed" | "detail";
type TeacherAvaliaMode = "list" | "detail" | "apply" | "review" | "published" | "results" | "student";
type TeacherAvaliaFilter = "Todas" | "Disponíveis" | "Aplicadas" | "Concluídas";
type TeacherTrackingMode = "overview" | "student";
type TeacherNotificationItem = (typeof demoCollections.teacher.modules.notifications)[number];
type TeacherNotificationFilter = "Tudo" | TeacherNotificationItem["type"];

function emptyTeacherClass(): TeacherClassSummary {
  return {
    className: "Turma",
    stage: "Turma",
    schedule: "Sem horário",
    students: "0 alunos",
    studentCount: 0,
    routine: "Rotina não publicada",
    nextCommitment: "Sem compromisso publicado",
    status: "Vazio",
    room: "Sala",
    studentsList: []
  };
}

function makeTeacherClassSummary(item: TeacherMobileClass, students: RealTeacherClassStudent[]): TeacherClassSummary {
  return {
    className: item.name,
    stage: item.stage,
    schedule: item.schedule || "Turno",
    students: `${item.studentCount} alunos`,
    studentCount: item.studentCount,
    routine: "Rotina real da turma",
    nextCommitment: "Sem compromisso publicado",
    status: item.studentCount > 0 ? "Turma ativa" : "Turma vazia",
    room: "Sala",
    studentsList: students.map((student) => ({
      name: student.name,
      state: student.status === "ativo" || student.status === "active" ? "Matrícula ativa" : "Cadastro vinculado"
    }))
  };
}

function mapTeacherCalendarEntry(item: RealTeacherCalendarEntry): TeacherAgendaItem {
  const type = mapTeacherAgendaTypeFromApi(item.entryType);
  return {
    id: item.id,
    title: item.title,
    type,
    day: teacherAgendaDayFromDate(item.entryDate),
    date: formatTeacherDate(item.entryDate),
    time: formatTeacherTime(item.startTime),
    className: item.className,
    description: item.description,
    action: type === "Avaliação" ? "Abrir Avalia+" : type === "Aula" ? "Registrar aula" : "Ver detalhes",
    actionTarget: type === "Avaliação" ? "avalia" : type === "Aula" ? "diary" : "detail",
    status: item.status === "published" ? "Publicado" : "Rascunho",
    mark: getTeacherAgendaTypeMark(type)
  };
}

function mapTeacherCommunicationSummary(item: RealTeacherCommunicationSummary): TeacherCommunicationItem {
  return {
    title: item.title,
    type: item.audienceType === "student" ? "Aluno" : "Turma",
    audience: item.audienceLabel,
    date: formatTeacherDate(item.communicationDate),
    status: item.status === "published" ? "Enviado" : "Rascunho",
    summary: `${item.deliveredCount} entregues · ${item.unreadCount} não lidos`,
    message: item.body
  };
}

function mapTeacherDiaryEntry(item: RealTeacherDiaryEntry, className: string): TeacherDiaryEntry {
  return {
    id: item.id,
    title: item.title,
    className,
    date: formatTeacherDate(item.entryDate),
    state: item.status === "closed" ? "Concluído" : "Rascunho",
    summary: item.taughtContent || item.pedagogicalNotes || "Registro sem resumo publicado."
  };
}

function makeTeacherDiaryCurrent(summary: RealTeacherDiaryPeriodSummary | null, content: string, record: string): TeacherDiaryCurrent {
  return {
    date: todayIsoDate(),
    planned: summary && summary.publishedCount > 0 ? `${summary.publishedCount} compromisso(s) publicado(s)` : "Sem compromisso publicado para hoje",
    content,
    record,
    activities: ["Sem atividade vinculada"],
    attendance: {
      present: summary?.attendancePresent ?? 0,
      absent: summary?.attendanceAbsent ?? 0,
      justified: summary?.attendanceJustified ?? 0
    }
  };
}

function emptyTeacherAssessment(): TeacherAvaliaAssessment {
  return {
    id: "empty-assessment",
    title: "Sem avaliação publicada",
    subject: "Avalia+",
    description: "Quando houver avaliação para suas turmas, ela aparecerá aqui.",
    questions: 0,
    className: "",
    state: "Disponível",
    assigned: 0,
    completed: 0,
    average: "Em aberto",
    success: "Sem dados publicados",
    attention: "Sem dados publicados",
    action: "Aguardar publicação",
    availableFrom: "Sem data",
    dueDate: "Sem prazo",
    skills: [],
    students: []
  };
}

function mapTeacherAssessmentStatus(status: string | null): TeacherAvaliaAssessment["state"] {
  const normalized = (status || "").toLowerCase();
  if (normalized === "closed" || normalized === "completed" || normalized === "encerrada") return "Encerrada";
  if (normalized === "in_progress" || normalized === "active" || normalized === "applied") return "Em andamento";
  if (normalized === "published" || normalized === "available") return "Disponível";
  return "Disponível";
}

function mapTeacherAssessmentAssignment(item: TeacherAssessmentAssignment): TeacherAvaliaAssessment {
  const state = mapTeacherAssessmentStatus(item.status);
  return {
    id: item.id,
    title: item.title,
    subject: item.subject || "Avalia+",
    description: item.description || "Avaliação publicada para acompanhamento da turma.",
    questions: 0,
    className: item.className,
    state,
    assigned: 0,
    completed: 0,
    average: "Em aberto",
    success: "Sem dados publicados",
    attention: "Sem dados publicados",
    action: state === "Disponível" ? "Ver avaliação" : "Ver resultados",
    availableFrom: item.availableFrom ? formatTeacherDate(item.availableFrom) : "Sem data",
    dueDate: item.availableUntil ? formatTeacherDate(item.availableUntil) : "Sem prazo",
    skills: [],
    students: []
  };
}

function mapTeacherNotificationItem(item: TeacherNotificationCenterItem): TeacherNotificationItem {
  return {
    id: item.id,
    type: "Alertas",
    title: item.title,
    summary: item.summary,
    context: "Central do professor",
    date: formatTeacherDate(item.deliveredAt),
    unread: item.unread,
    message: item.summary || "Notificação publicada para sua rotina.",
    action: "Abrir notificações",
    actionTarget: "notifications",
    mark: "!"
  };
}

const teacherQuickActions: TeacherQuickAction[] = [
  { label: "Enviar recado", description: "Comunicar turma ou estudante.", mark: "!", target: "communication" },
  { label: "Registrar aula", description: "Atualizar o Diário de Classe.", mark: "D", target: "diary" },
  { label: "Avalia+", description: "Ver avaliações e resultados.", mark: "A+", target: "avalia" },
  { label: "Minhas turmas", description: "Ver todas as turmas.", mark: "T", target: "classes" }
];

function TeacherHomeScreen({ profile, session, onOpen }: { profile: AppProfile; session: MobileSession | null; onOpen: (key: ModuleKey) => void }) {
  const [summary, setSummary] = useState<TeacherHomeSummary | null>(null);
  const [classes, setClasses] = useState<TeacherMobileClass[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void Promise.all([getTeacherHomeSummary(session), getTeacherMobileClasses(session)])
      .then(([nextSummary, nextClasses]) => {
        if (!active) return;
        setSummary(nextSummary);
        setClasses(nextClasses);
      })
      .catch(() => {
        if (!active) return;
        setSummary(null);
        setClasses([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const firstClass = classes[0] || null;
  const homeCards: TeacherTodayItem[] = [
    { type: "Turmas", title: `${summary?.activeClassLinks ?? 0} turmas ativas`, meta: `${summary?.totalStudents ?? 0} alunos acompanhados`, mark: "T", target: "classes" },
    { type: "Agenda", title: `${summary?.todaysCalendarCount ?? 0} compromisso(s) hoje`, meta: "Agenda da escola", mark: "◷", target: "agenda" },
    { type: "Notificações", title: `${summary?.unreadNotifications ?? 0} não lidas`, meta: "Central do professor", mark: "!", target: "notifications" },
    { type: "Diário", title: "Registros da turma", meta: "Diário de Classe", mark: "D", target: "diary" }
  ];
  return (
    <View>
      <View style={styles.teacherHero}>
        <View style={styles.teacherHeroGlow} />
        <View style={styles.teacherHeroTop}>
          <View style={styles.teacherHeroCopy}>
            <Text style={styles.teacherKicker}>Professora</Text>
            <Text style={styles.teacherHeroTitle}>{loading ? "Carregando rotina" : `Olá, ${summary?.teacherName || "Professora"}`}</Text>
            <Text style={styles.teacherHeroMeta}>Juntos por uma educação que floresce.</Text>
          </View>
          <TeacherSplitIconView icon={{ source: teacherHomeIcons.peopleCalendar, side: "left" }} frameStyle={styles.teacherHeroIconFrame} imageStyle={styles.teacherHeroSplitImage} frameWidth={142} />
          <Pressable accessibilityRole="button" accessibilityLabel="Abrir notificações" onPress={() => onOpen("notifications")} style={styles.teacherBell}>
            <TeacherSplitIconView icon={{ source: teacherHomeIcons.notifications, side: "left" }} frameStyle={styles.teacherBellIconFrame} imageStyle={styles.teacherBellSplitImage} frameWidth={38} />
            {(summary?.unreadNotifications ?? 0) > 0 ? <Text style={styles.teacherBellBadge}>{summary?.unreadNotifications}</Text> : null}
          </Pressable>
        </View>
        <View style={styles.teacherQuoteBox}>
          <Text style={styles.teacherQuoteText}>Educar também é acreditar em grandes começos.</Text>
        </View>
      </View>

      <View style={styles.teacherSectionTop}>
        <Text style={styles.teacherSectionTitle}>Hoje</Text>
        <Text style={styles.teacherSectionDate}>Segunda-feira, 22 de setembro</Text>
      </View>
      <View style={styles.teacherTodayGrid}>
        {homeCards.map((item) => (
          <TeacherTodayCard key={`${item.type}-${item.title}`} item={item} onPress={() => onOpen(item.target as ModuleKey)} />
        ))}
      </View>

      <SectionHeader title="Ações rápidas" />
      <View style={styles.teacherQuickGrid}>
        {teacherQuickActions.map((action) => (
          <TeacherQuickActionCard key={action.label} action={action} onPress={() => onOpen(action.target as ModuleKey)} />
        ))}
      </View>

      <View style={styles.teacherSectionTop}>
        <Text style={styles.teacherSectionTitle}>Próxima turma</Text>
        <Text style={styles.teacherSectionAction}>Ver todas ›</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={`Abrir turma ${firstClass?.name || "turma"}`} onPress={() => onOpen("classes")} style={styles.teacherNextClassCard}>
        <View style={styles.teacherNextClassCopy}>
          <Text style={[styles.teacherCardLabel, styles.teacherCardLabelOnDark]}>{firstClass?.schedule || "Turno"}</Text>
          <Text style={styles.teacherNextClassTitle}>{firstClass?.name || "Nenhuma turma ativa"}</Text>
          <Text style={styles.teacherNextClassBody}>{firstClass ? "08h00 - 09h40" : "Quando houver turma vinculada, ela aparecerá aqui."}</Text>
          <Text style={styles.teacherNextClassStudents}>{firstClass ? `${firstClass.studentCount} alunos` : ""}</Text>
        </View>
        <TeacherSplitIconView icon={{ source: teacherHomeIcons.peopleCalendar, side: "left" }} frameStyle={styles.teacherNextClassIconFrame} imageStyle={styles.teacherNextClassSplitImage} frameWidth={176} />
        <View style={styles.teacherNextClassButton}>
          <Text style={styles.teacherNextClassButtonText}>Acessar turma ›</Text>
        </View>
      </Pressable>

      <SectionHeader title="Resumo da semana" />
      <View style={styles.teacherTrackingGrid}>
        <View style={styles.teacherWeeklyCard}>
          <Text style={styles.teacherTrackingValue}>{summary?.activeClassLinks ?? 0}</Text>
          <Text style={styles.teacherTrackingLabel}>Turmas</Text>
          <Text style={styles.teacherTrackingHelper}>Turmas ativas</Text>
        </View>
        <View style={styles.teacherWeeklyCard}>
          <Text style={styles.teacherTrackingValue}>{summary?.totalStudents ?? 0}</Text>
          <Text style={styles.teacherTrackingLabel}>Alunos</Text>
          <Text style={styles.teacherTrackingHelper}>Vínculos ativos</Text>
        </View>
        <View style={styles.teacherWeeklyCard}>
          <Text style={styles.teacherTrackingValue}>{summary?.unreadNotifications ?? 0}</Text>
          <Text style={styles.teacherTrackingLabel}>Avisos</Text>
          <Text style={styles.teacherTrackingHelper}>Não lidos</Text>
        </View>
        <View style={styles.teacherWeeklyCard}>
          <Text style={styles.teacherTrackingValue}>{summary?.todaysCalendarCount ?? 0}</Text>
          <Text style={styles.teacherTrackingLabel}>Atividades</Text>
          <Text style={styles.teacherTrackingHelper}>Planejadas</Text>
        </View>
        <View style={styles.teacherWeeklyCard}>
          <Text style={styles.teacherTrackingValue}>{summary?.unreadNotifications ?? 0}</Text>
          <Text style={styles.teacherTrackingLabel}>Avaliações</Text>
          <Text style={styles.teacherTrackingHelper}>Publicadas</Text>
        </View>
      </View>
    </View>
  );
}

function TeacherTodayCard({ item, onPress }: { item: TeacherTodayItem; onPress: () => void }) {
  const icon = teacherTodayIcon(item.type);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.type}: ${item.title}`} onPress={onPress} style={styles.teacherTodayCard}>
      <View style={styles.teacherTodayMark}>
        <TeacherSplitIconView icon={icon} frameStyle={styles.teacherTodayIconFrame} imageStyle={styles.teacherTodaySplitImage} frameWidth={76} />
      </View>
      <Text style={styles.teacherTodayType}>{item.type}</Text>
      <Text style={styles.teacherTodayTitle}>{item.title}</Text>
      <Text style={styles.teacherTodayMeta}>{item.meta}</Text>
    </Pressable>
  );
}

function TeacherQuickActionCard({ action, onPress }: { action: TeacherQuickAction; onPress: () => void }) {
  const icon = teacherQuickIcon(action.target);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={onPress} style={styles.teacherQuickCard}>
      <View style={styles.teacherQuickMark}>
        <TeacherSplitIconView icon={icon} frameStyle={styles.teacherQuickIconFrame} imageStyle={styles.teacherQuickSplitImage} frameWidth={96} />
      </View>
      <Text style={styles.teacherQuickTitle}>{action.label}</Text>
      <Text style={styles.teacherQuickBody}>{action.description}</Text>
    </Pressable>
  );
}

function TeacherSplitIconView({
  icon,
  frameStyle,
  imageStyle,
  frameWidth
}: {
  icon: TeacherSplitIcon;
  frameStyle: object;
  imageStyle: object;
  frameWidth: number;
}) {
  return (
    <View style={frameStyle}>
      <Image source={icon.source} resizeMode="contain" style={[imageStyle, { transform: [{ translateX: icon.side === "right" ? -frameWidth : 0 }] }]} />
    </View>
  );
}

function teacherTodayIcon(type: string): TeacherSplitIcon {
  if (type === "Turmas") return { source: teacherHomeIcons.peopleCalendar, side: "left" };
  if (type === "Agenda") return { source: teacherHomeIcons.peopleCalendar, side: "right" };
  if (type === "Notificações") return { source: teacherHomeIcons.notifications, side: "left" };
  return { source: teacherHomeIcons.notifications, side: "right" };
}

function teacherQuickIcon(target: ModuleKey | string): TeacherSplitIcon {
  if (target === "communication") return { source: teacherHomeIcons.communication, side: "left" };
  if (target === "diary") return { source: teacherHomeIcons.diary, side: "right" };
  if (target === "avalia") return { source: teacherHomeIcons.avalia, side: "right" };
  return { source: teacherHomeIcons.peopleCalendar, side: "left" };
}

function teacherModuleIcon(title: string): TeacherSplitIcon {
  if (title.includes("Comunicação") || title.includes("recado")) return { source: teacherHomeIcons.communication, side: "left" };
  if (title.includes("Diário")) return { source: teacherHomeIcons.diary, side: "right" };
  if (title.includes("Avalia")) return { source: teacherHomeIcons.avalia, side: "right" };
  if (title.includes("Notificações")) return { source: teacherHomeIcons.notifications, side: "left" };
  if (title.includes("Frequência") || title.includes("turmas") || title.includes("Agenda")) return { source: teacherHomeIcons.peopleCalendar, side: "right" };
  return { source: teacherHomeIcons.peopleCalendar, side: "left" };
}

function TeacherClassCard({ item, onPress }: { item: TeacherClassSummary; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${item.className}`} onPress={onPress} style={styles.teacherClassCard}>
      <View style={styles.teacherClassCopy}>
        <Text style={styles.teacherClassTitle}>{item.className}</Text>
        <Text style={styles.teacherClassMeta}>{item.schedule} · {item.students}</Text>
      </View>
      <View style={styles.teacherClassStatus}>
        <Text style={styles.teacherClassStatusText}>{item.status}</Text>
      </View>
    </Pressable>
  );
}

function TeacherAgendaRow({ item, onPress }: { item: TeacherAgendaItem; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Agenda: ${item.title}`} onPress={onPress} style={styles.teacherAgendaRow}>
      <Text style={styles.teacherAgendaTime}>{item.time}</Text>
      <View style={styles.teacherAgendaCopy}>
        <Text style={styles.teacherAgendaTitle}>{item.title}</Text>
        <Text style={styles.teacherAgendaMeta}>{item.className}</Text>
      </View>
      <Text style={styles.teacherAgendaChevron}>›</Text>
    </Pressable>
  );
}

type CrescerBook = (typeof demoCollections.books)[number];
type CrescerAchievement = StudentAchievement & {
  mark: string;
  message: string;
};
type CrescerAgendaItem = (typeof demoCollections.agenda.today)[number] | (typeof demoCollections.agenda.upcoming)[number];
type CrescerNotification = (typeof demoCollections.childNotifications)[number];
type FundamentalQuickAction = (typeof demoCollections.fundamental.quickActions)[number];
type FundamentalActivity = InstitutionalActivity;
type FundamentalBook = (typeof demoCollections.fundamental.books)[number];
type FundamentalBookCategory = (typeof demoCollections.fundamental.bookCategories)[number];
type FundamentalAssessment = (typeof demoCollections.fundamental.assessments)[number];
type FundamentalAssessmentItem = StudentAssessmentAssignment;
type FundamentalAgendaItem = (typeof demoCollections.fundamental.agenda.items)[number];
type FundamentalAgendaFilter = (typeof demoCollections.fundamental.agenda.filters)[number];
type FundamentalNotification = (typeof demoCollections.fundamental.notificationItems)[number];
type FundamentalNotificationFilter = (typeof demoCollections.fundamental.notificationFilters)[number];
type FundamentalProfileProgress = (typeof demoCollections.fundamental.profile.progress)[number];
type FundamentalProfileStudy = (typeof demoCollections.fundamental.profile.studies)[number];
type FundamentalProfileSetting = (typeof demoCollections.fundamental.profile.settings)[number];

function DiscoveryScreen({ session, onOpenDiscovery }: { session: MobileSession | null; onOpenDiscovery: (discovery: EarlyChildhoodDiscovery) => void }) {
  const [discoveries, setDiscoveries] = useState<EarlyChildhoodDiscovery[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadDiscoveries = useCallback(async () => {
    if (!session) {
      setDiscoveries([]);
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      setDiscoveries(await getEarlyChildhoodDiscoveries(session));
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadDiscoveries();
  }, [loadDiscoveries]);

  return (
    <View>
      <CrescerModuleHero kicker="Vamos descobrir" title="Descobertas" body="Escolha uma aventura para descobrir algo novo." icon="discoveries" tone="mint" />

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.child} />
          <Text style={styles.libraryStateTitle}>Carregando descobertas</Text>
          <Text style={styles.libraryStateBody}>Estamos preparando as experiências da sua turma.</Text>
        </View>
      ) : failed ? (
        <EmptyState title="Descobertas indisponíveis" body="Tente entrar novamente em alguns instantes." />
      ) : discoveries.length ? (
        <>
          <SectionHeader title="Novas aventuras" />
          <View style={styles.discoveryGrid}>
            {discoveries.map((item) => (
              <DiscoveryAdventureCard key={item.id} discovery={item} onPress={() => onOpenDiscovery(item)} />
            ))}
          </View>
        </>
      ) : (
        <EmptyState title="Nada por aqui agora" body="Quando sua turma tiver uma descoberta, ela aparece aqui." />
      )}
    </View>
  );
}

function DiscoveryDetailScreen({ session, discoveryId, onOpenActivity }: { session: MobileSession | null; discoveryId: string; onOpenActivity: (activityId: string) => void }) {
  const [discovery, setDiscovery] = useState<EarlyChildhoodDiscovery | null>(null);
  const [sceneAsset, setSceneAsset] = useState<EarlyChildhoodAsset | null>(null);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<EarlyChildhoodDiscoveryHotspot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadDiscovery = useCallback(async () => {
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    setSceneFailed(false);
    try {
      const nextDiscovery = await getEarlyChildhoodDiscovery(session, discoveryId);
      setDiscovery(nextDiscovery);
      setSelectedHotspot(nextDiscovery.hotspots[0] ?? null);
      if (nextDiscovery.sceneAssetId) {
        try {
          setSceneAsset(await getEarlyChildhoodDiscoveryAsset(session, nextDiscovery.id, nextDiscovery.sceneAssetId));
        } catch (_sceneError) {
          setSceneAsset(null);
          setSceneFailed(true);
        }
      } else {
        setSceneAsset(null);
      }
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [discoveryId, session]);

  useEffect(() => {
    void loadDiscovery();
  }, [loadDiscovery]);

  const updateDiscoveryProgress = useCallback(
    async (hotspot: EarlyChildhoodDiscoveryHotspot) => {
      if (!session || !discovery || saving || !isDiscoveryHotspotAvailable(hotspot)) return;
      const discoveredHotspots = Array.from(new Set([...discovery.discoveredHotspots, hotspot.legacyId]));
      const completionActivityId = stringValue(discovery.completionRule.activity_legacy_id);
      const shouldComplete = hotspot.targetType === "activity" && hotspot.targetLegacyId === completionActivityId;
      setSaving(true);
      try {
        const progress = await saveEarlyChildhoodDiscoveryProgress(session, discovery.id, shouldComplete ? "COMPLETED" : "IN_PROGRESS", discoveredHotspots);
        setDiscovery((current) =>
          current
            ? {
                ...current,
                progressStatus: progress.status,
                discoveredHotspots: progress.discoveredHotspots,
                updatedAt: progress.updatedAt
              }
            : current
        );
      } finally {
        setSaving(false);
      }
    },
    [discovery, saving, session]
  );

  const handleHotspotPress = useCallback(
    async (hotspot: EarlyChildhoodDiscoveryHotspot) => {
      setSelectedHotspot(hotspot);
      if (!isDiscoveryHotspotAvailable(hotspot)) return;
      await updateDiscoveryProgress(hotspot);
      if (hotspot.targetType === "activity" && hotspot.targetLegacyId === "RS-EI4-V1-INT-001") {
        onOpenActivity("02d10000-0000-4000-8000-000000000011");
      }
    },
    [onOpenActivity, updateDiscoveryProgress]
  );

  if (loading) {
    return (
      <View style={styles.libraryStateCard}>
        <ActivityIndicator color={colors.child} />
        <Text style={styles.libraryStateTitle}>Abrindo descoberta</Text>
        <Text style={styles.libraryStateBody}>Estamos preparando a experiência para você.</Text>
      </View>
    );
  }

  if (failed || !discovery) {
    return <EmptyState title="Descoberta indisponível" body="Volte e tente abrir esta experiência novamente." />;
  }

  return (
    <View>
      <View style={styles.discoveryHero}>
        <Text style={styles.discoveryKicker}>{discoveryStatusLabel(discovery)}</Text>
        <Text style={styles.discoveryTitle}>{discovery.title}</Text>
        <Text style={styles.discoveryBody}>{discovery.description}</Text>
      </View>

      <View style={styles.discoverySceneCard}>
        {sceneAsset?.signedUrl ? <Image source={{ uri: sceneAsset.signedUrl }} resizeMode="cover" style={styles.discoverySceneImage} /> : null}
        {sceneFailed ? <Text style={styles.activityAssetWarning}>Cena temporariamente indisponível. A experiência continua liberada.</Text> : null}
        {discovery.hotspots.map((hotspot) => (
          <DiscoveryHotspotButton key={hotspot.legacyId} hotspot={hotspot} completed={discovery.discoveredHotspots.includes(hotspot.legacyId)} onPress={() => handleHotspotPress(hotspot)} />
        ))}
      </View>

      <View style={styles.activityStepCard}>
        <Text style={styles.activityStepTitle}>{selectedHotspot?.title || "Explore a cena"}</Text>
        <Text style={styles.activityStepBody}>{selectedHotspot?.description || discovery.studentInstruction || "Toque nos pontos da cena para descobrir novas pistas."}</Text>
        {selectedHotspot && !isDiscoveryHotspotAvailable(selectedHotspot) ? <Text style={styles.activityAssetWarning}>Esta mídia está sendo preparada para a turma.</Text> : null}
        {saving ? <Text style={styles.activityAssetWarning}>Salvando descoberta...</Text> : null}
      </View>
    </View>
  );
}

function DiscoveryHotspotButton({ hotspot, completed, onPress }: { hotspot: EarlyChildhoodDiscoveryHotspot; completed: boolean; onPress: () => void }) {
  const available = isDiscoveryHotspotAvailable(hotspot);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hotspot.accessibilityLabel}
      onPress={onPress}
      style={[
        styles.discoveryHotspot,
        {
          left: `${Math.max(0, Math.min(hotspot.xPercent, 90))}%`,
          top: `${Math.max(0, Math.min(hotspot.yPercent, 90))}%`,
          width: `${Math.max(18, Math.min(hotspot.widthPercent, 90))}%`,
          minHeight: Math.max(44, hotspot.heightPercent * 2)
        },
        !available ? styles.discoveryHotspotUnavailable : null,
        completed ? styles.discoveryHotspotCompleted : null
      ]}
    >
      <Text style={styles.discoveryHotspotText}>{available ? hotspot.title : "Em preparação"}</Text>
    </Pressable>
  );
}

function ActivitiesScreen({ session, onOpenActivity }: { session: MobileSession | null; onOpenActivity: (activity: EarlyChildhoodActivity) => void }) {
  const [activities, setActivities] = useState<EarlyChildhoodActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadActivities = useCallback(async () => {
    if (!session) {
      setActivities([]);
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      setActivities(await getEarlyChildhoodActivities(session));
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  const featured = activities.find((activity) => activity.progressStatus === "IN_PROGRESS") ?? activities[0];
  const otherActivities = featured ? activities.filter((item) => item.id !== featured.id) : [];

  return (
    <View>
      <CrescerModuleHero kicker="Vamos brincar?" title="Atividades" body="Escolha uma atividade e continue aprendendo brincando!" icon="activities" tone="sun" />

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.child} />
          <Text style={styles.libraryStateTitle}>Carregando atividades</Text>
          <Text style={styles.libraryStateBody}>Estamos preparando as propostas da sua turma.</Text>
        </View>
      ) : failed ? (
        <EmptyState title="Atividades indisponíveis" body="Tente entrar novamente em alguns instantes." />
      ) : featured ? (
        <>
          <SectionHeader title="Que tal continuar?" />
          <FeaturedActivityCard activity={featured} onPress={() => onOpenActivity(featured)} />

          <SectionHeader title="Para você" />
          <View style={styles.activityList}>
            {otherActivities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} onPress={() => onOpenActivity(activity)} />
            ))}
          </View>
        </>
      ) : (
        <EmptyState title="Nada por aqui agora" body="Quando sua turma tiver uma atividade, ela aparece aqui." />
      )}
    </View>
  );
}

function FeaturedActivityCard({ activity, onPress }: { activity: EarlyChildhoodActivity; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${activity.title}. ${activity.description}`} onPress={onPress} style={styles.featuredActivity}>
      <View style={styles.featuredActivityMark}>
        <Text style={styles.featuredActivityMarkText}>{activityMark(activity)}</Text>
      </View>
      <Text style={styles.activityStatus}>{activityStatusLabel(activity)}</Text>
      <Text style={styles.featuredActivityTitle}>{activity.title}</Text>
      <Text style={styles.featuredActivityBody}>{activity.description}</Text>
      <ProgressPill value={activity.percentComplete} />
      <View style={styles.activityAction}>
        <Text style={styles.activityActionText}>{activityActionLabel(activity)}</Text>
      </View>
    </Pressable>
  );
}

function ActivityCard({ activity, onPress }: { activity: EarlyChildhoodActivity; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${activity.title}. ${activityStatusLabel(activity)}`} onPress={onPress} style={styles.activityCard}>
      <View style={styles.activityMark}>
        <Text style={styles.activityMarkText}>{activityMark(activity)}</Text>
      </View>
      <View style={styles.activityCopy}>
        <Text style={styles.activityStatus}>{activityStatusLabel(activity)}</Text>
        <Text style={styles.activityTitle}>{activity.title}</Text>
        <Text style={styles.activityBody}>{activity.description}</Text>
        {activity.percentComplete > 0 && activity.percentComplete < 100 ? <ProgressPill value={activity.percentComplete} compact /> : null}
        {activity.percentComplete === 100 ? <Text style={styles.activityDoneText}>Muito bem, atividade concluída!</Text> : null}
      </View>
      <Text style={styles.discoveryChevron}>›</Text>
    </Pressable>
  );
}

function ActivityDetailScreen({ session, activityId }: { session: MobileSession | null; activityId: string }) {
  const [activity, setActivity] = useState<EarlyChildhoodActivity | null>(null);
  const [privateAsset, setPrivateAsset] = useState<EarlyChildhoodAsset | null>(null);
  const [assetFailed, setAssetFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [progressError, setProgressError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadActivity = useCallback(async () => {
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    setAssetFailed(false);
    setProgressError("");
    try {
      const nextActivity = await getEarlyChildhoodActivity(session, activityId);
      setActivity(nextActivity);
      const assetId = nextActivity.sceneAssetId || nextActivity.coverAssetId;
      if (assetId) {
        try {
          setPrivateAsset(await getEarlyChildhoodActivityAsset(session, nextActivity.id, assetId));
        } catch (_assetError) {
          setPrivateAsset(null);
          setAssetFailed(true);
        }
      } else {
        setPrivateAsset(null);
      }
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [activityId, session]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const updateProgress = useCallback(
    async (complete: boolean) => {
      if (!session || !activity || saving) return;
      setSaving(true);
      setProgressError("");
      try {
        const progress = await saveEarlyChildhoodActivityProgress(session, activity.id, complete ? "COMPLETED" : "IN_PROGRESS", complete ? 100 : Math.max(35, activity.percentComplete || 0));
        setActivity((current) =>
          current
            ? {
                ...current,
                progressStatus: progress.status,
                percentComplete: progress.percentComplete,
                updatedAt: progress.updatedAt
              }
            : current
        );
        try {
          const nextActivity = await getEarlyChildhoodActivity(session, activity.id);
          setActivity(nextActivity);
        } catch (_reloadError) {
          // The progress write already succeeded; keep the optimistic state.
        }
      } catch (saveError) {
        setProgressError(saveError instanceof Error ? saveError.message : "progress_save_failed");
      } finally {
        setSaving(false);
      }
    },
    [activity, saving, session]
  );

  if (loading) {
    return (
      <View style={styles.libraryStateCard}>
        <ActivityIndicator color={colors.child} />
        <Text style={styles.libraryStateTitle}>Abrindo atividade</Text>
        <Text style={styles.libraryStateBody}>Estamos preparando a proposta para você.</Text>
      </View>
    );
  }

  if (failed || !activity) {
    return <EmptyState title="Atividade indisponível" body="Volte e tente abrir esta proposta novamente." />;
  }

  return (
    <View>
      <View style={styles.activityDetailHero}>
        <View style={styles.activityDetailMark}>
          <Text style={styles.activityDetailMarkText}>{activityMark(activity)}</Text>
        </View>
        <Text style={styles.discoveryKicker}>{activityStatusLabel(activity)}</Text>
        <Text style={styles.discoveryTitle}>{activity.title}</Text>
        <Text style={styles.discoveryBody}>{activity.description}</Text>
        {activity.percentComplete > 0 ? <ProgressPill value={activity.percentComplete} /> : null}
      </View>

      <View style={styles.activityStepCard}>
        <Text style={styles.activityStepTitle}>Preparar, apontar, brincar</Text>
        <Text style={styles.activityStepBody}>{activity.instruction || "Quando você tocar no botão, a atividade começa aqui com uma proposta simples e divertida."}</Text>
        {privateAsset?.signedUrl ? <Image source={{ uri: privateAsset.signedUrl }} resizeMode="cover" style={styles.activityPrivateImage} /> : null}
        {assetFailed ? <Text style={styles.activityAssetWarning}>Imagem privada temporariamente indisponível. A atividade continua liberada.</Text> : null}
        {progressError ? <Text style={styles.activityAssetWarning}>Não foi possível salvar o progresso agora. {progressError}</Text> : null}
      </View>

      {activity.progressStatus === "COMPLETED" ? (
        <PrimaryButton label={saving ? "Salvando..." : "Concluir novamente"} onPress={() => updateProgress(true)} />
      ) : activity.progressStatus === "IN_PROGRESS" ? (
        <PrimaryButton label={saving ? "Salvando..." : "Concluir atividade"} onPress={() => updateProgress(true)} />
      ) : (
        <PrimaryButton label={saving ? "Salvando..." : "Iniciar atividade"} onPress={() => updateProgress(false)} />
      )}
    </View>
  );
}

function activityMark(activity: EarlyChildhoodActivity) {
  if (activity.legacyId === "RS-EI4-V1-INT-001") return "✦";
  return "✓";
}

function activityStatusLabel(activity: EarlyChildhoodActivity) {
  if (activity.progressStatus === "COMPLETED") return "Concluída";
  if (activity.progressStatus === "IN_PROGRESS") return "Em andamento";
  return "Nova";
}

function discoveryStatusLabel(discovery: EarlyChildhoodDiscovery) {
  if (discovery.progressStatus === "COMPLETED") return "Concluída";
  if (discovery.progressStatus === "IN_PROGRESS") return "Em andamento";
  return "Nova";
}

function discoveryActionLabel(discovery: EarlyChildhoodDiscovery) {
  if (discovery.progressStatus === "COMPLETED") return "Rever";
  if (discovery.progressStatus === "IN_PROGRESS") return "Continuar";
  return "Explorar";
}

function discoveryMark(discovery: EarlyChildhoodDiscovery) {
  if (discovery.legacyId === "RS-EI4-V1-EXP-001") return "✦";
  return "⌕";
}

function isDiscoveryHotspotAvailable(hotspot: EarlyChildhoodDiscoveryHotspot) {
  if (hotspot.actionType === "open_activity" && hotspot.targetType === "activity") return true;
  if (hotspot.assetLegacyId?.startsWith("css:")) return true;
  return false;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function activityActionLabel(activity: EarlyChildhoodActivity) {
  if (activity.progressStatus === "COMPLETED") return "Ver";
  if (activity.progressStatus === "IN_PROGRESS") return "Continuar";
  return "Iniciar";
}

function ProgressPill({ value, compact }: { value: number; compact?: boolean }) {
  return (
    <View style={[styles.progressShell, compact ? styles.progressShellCompact : null]}>
      <View style={[styles.progressFill, { width: `${Math.max(8, Math.min(value, 100))}%` }]} />
    </View>
  );
}

function LibraryScreen({ session, onOpenBook }: { session: MobileSession | null; onOpenBook: (book: LibraryBook) => void }) {
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [coverUrls, setCoverUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadBooks = useCallback(async () => {
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const nextBooks = await getLibraryBooks(session);
      setBooks(nextBooks);
      const missingCoverBooks = nextBooks.filter((book) => !book.coverUrl);
      missingCoverBooks.forEach((book) => {
        void getLibraryPageAsset(session, book.id, 1)
          .then((asset) => setCoverUrls((current) => ({ ...current, [book.id]: asset.signedUrl })))
          .catch(() => undefined);
      });
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks]);

  const featured = books.find((book) => book.percentComplete > 0) ?? books[0];
  const shelf = featured ? books.filter((book) => book.id !== featured.id) : books;

  return (
    <View>
      <CrescerModuleHero kicker="Estante da turma" title="Biblioteca" body="Escolha uma história para ler e descobrir." icon="library" tone="sky" />

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.child} />
          <Text style={styles.libraryStateTitle}>Carregando histórias</Text>
          <Text style={styles.libraryStateBody}>Estamos abrindo a estante da sua turma.</Text>
        </View>
      ) : failed ? (
        <View style={styles.libraryStateCard}>
          <EmptyState title="Não conseguimos abrir a estante" body="Tente novamente em instantes." />
          <PrimaryButton label="Tentar novamente" onPress={loadBooks} />
        </View>
      ) : !featured ? (
        <EmptyState title="Estante vazia" body="Quando sua escola liberar novas histórias, elas aparecem aqui." />
      ) : (
        <>
          <SectionHeader title={featured.percentComplete > 0 ? "Continue lendo" : "História em destaque"} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Ler ${featured.title}`} onPress={() => onOpenBook(featured)} style={styles.featuredBook}>
            <BookCover book={{ ...featured, coverUrl: featured.coverUrl || coverUrls[featured.id] }} large />
            <View style={styles.featuredBookCopy}>
              <Text style={styles.bookCategory}>{featured.category}</Text>
              <Text style={styles.featuredBookTitle}>{featured.title}</Text>
              <Text style={styles.featuredBookBody}>{featured.description}</Text>
              {featured.percentComplete > 0 ? <ProgressPill value={featured.percentComplete} compact /> : null}
              <View style={styles.bookAction}>
                <Text style={styles.bookActionText}>{featured.percentComplete > 0 ? "Continuar leitura" : "Ler agora"}</Text>
              </View>
            </View>
          </Pressable>

          {shelf.length ? (
            <>
              <SectionHeader title="Mais histórias" />
              <View style={styles.bookShelf}>
                {shelf.map((book) => (
                  <BookCard key={book.id} book={{ ...book, coverUrl: book.coverUrl || coverUrls[book.id] }} onPress={() => onOpenBook(book)} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function BookCard({ book, onPress }: { book: LibraryBook; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${book.title}`} onPress={onPress} style={styles.bookCard}>
      <BookCover book={book} />
      <Text style={styles.bookCategory}>{book.category}</Text>
      <Text style={styles.bookCardTitle}>{book.title}</Text>
      {book.percentComplete > 0 ? <ProgressPill value={book.percentComplete} compact /> : null}
    </Pressable>
  );
}

type BookCoverModel = {
  title: string;
  coverUrl?: string | null;
  tone?: CrescerBook["tone"];
  mark?: string;
};

function getBookToneStyle(tone: BookCoverModel["tone"]) {
  if (tone === "sun") return styles.bookToneSun;
  if (tone === "sky") return styles.bookToneSky;
  if (tone === "mint") return styles.bookToneMint;
  return styles.bookToneLeaf;
}

function BookCover({ book, large }: { book: BookCoverModel; large?: boolean }) {
  const [coverFailed, setCoverFailed] = useState(false);
  const mark = book.mark || book.title.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.bookCover, large ? styles.bookCoverLarge : null, getBookToneStyle(book.tone)]}>
      {book.coverUrl && !coverFailed ? (
        <Image source={{ uri: book.coverUrl }} resizeMode="cover" onError={() => setCoverFailed(true)} style={styles.bookCoverImage} />
      ) : (
        <>
          <Text style={[styles.bookCoverMark, large ? styles.bookCoverMarkLarge : null]}>{mark}</Text>
          <View style={styles.bookCoverLine} />
        </>
      )}
    </View>
  );
}

function BookViewerScreen({ session, bookId }: { session: MobileSession | null; bookId: string }) {
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [manifest, setManifest] = useState<LibraryManifest | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageUrls, setPageUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const pageUrlsRef = useRef<Record<number, string>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPage = useRef<number | null>(null);
  const pageRef = useRef(1);

  const saveCurrentProgress = useCallback(
    async (nextPage: number, nextManifest: LibraryManifest | null = manifest) => {
      if (!session || !bookId || !nextManifest || lastSavedPage.current === nextPage) return;
      const percent = Math.round((nextPage / nextManifest.pageCount) * 100);
      lastSavedPage.current = nextPage;
      try {
        await saveLibraryProgress(session, bookId, nextPage, percent);
      } catch (_error) {
        lastSavedPage.current = null;
      }
    },
    [bookId, manifest, session]
  );

  const ensurePage = useCallback(
    async (nextPage: number, force = false) => {
      if (!session || !bookId) return;
      if (!force && pageUrlsRef.current[nextPage]) return;
      setPageLoading(true);
      try {
        const asset = await getLibraryPageAsset(session, bookId, nextPage);
        setPageUrls((current) => {
          const next = { ...current, [nextPage]: asset.signedUrl };
          pageUrlsRef.current = next;
          return next;
        });
        setFailed(false);
      } catch (_error) {
        setFailed(true);
      } finally {
        setPageLoading(false);
      }
    },
    [bookId, session]
  );

  const loadViewer = useCallback(async () => {
    if (!session || !bookId) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const [nextBook, nextManifest] = await Promise.all([getLibraryBook(session, bookId), getLibraryManifest(session, bookId)]);
      const resumePage = Math.min(Math.max(nextBook.currentPage || nextManifest.currentPage || nextManifest.firstPage, nextManifest.firstPage), nextManifest.lastPage);
      pageUrlsRef.current = {};
      setPageUrls({});
      setBook(nextBook);
      setManifest(nextManifest);
      setPageNumber(resumePage);
      pageRef.current = resumePage;
      await ensurePage(resumePage, true);
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [bookId, ensurePage, session]);

  useEffect(() => {
    void loadViewer();
  }, [loadViewer]);

  useEffect(() => {
    pageRef.current = pageNumber;
    if (!manifest || !session || !bookId) return undefined;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveCurrentProgress(pageNumber, manifest);
    }, 900);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [bookId, manifest, pageNumber, saveCurrentProgress, session]);

  useEffect(() => {
    if (!manifest) return;
    void ensurePage(pageNumber);
    if (pageNumber < manifest.lastPage) void ensurePage(pageNumber + 1);
    if (pageNumber > manifest.firstPage) void ensurePage(pageNumber - 1);
  }, [ensurePage, manifest, pageNumber]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      void saveCurrentProgress(pageRef.current, manifest);
    };
  }, [manifest, saveCurrentProgress]);

  function movePage(direction: -1 | 1) {
    if (!manifest) return;
    setPageNumber((current) => Math.min(Math.max(current + direction, manifest.firstPage), manifest.lastPage));
  }

  const pageUrl = pageUrls[pageNumber];

  if (loading) {
    return (
      <View style={styles.libraryStateCard}>
        <ActivityIndicator color={colors.child} />
        <Text style={styles.libraryStateTitle}>Abrindo livro</Text>
        <Text style={styles.libraryStateBody}>Estamos preparando a página para você.</Text>
      </View>
    );
  }

  if (failed || !book || !manifest) {
    return (
      <View style={styles.libraryStateCard}>
        <EmptyState title="Não conseguimos abrir este livro" body="Volte para a estante ou tente novamente." />
        <PrimaryButton label="Tentar novamente" onPress={loadViewer} />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.readerTop}>
        <BookCover book={{ ...book, coverUrl: book.coverUrl || pageUrls[manifest.firstPage] }} large />
        <Text style={styles.discoveryKicker}>{book.category}</Text>
        <Text style={styles.readerTitle}>{book.title}</Text>
      </View>

      <View style={styles.readerPage}>
        {pageUrl ? (
          <Image source={{ uri: pageUrl }} resizeMode="contain" onError={() => void ensurePage(pageNumber, true)} style={styles.readerPageImage} />
        ) : (
          <View style={styles.readerPageLoading}>
            <ActivityIndicator color={colors.child} />
            <Text style={styles.readerPageBody}>Carregando página...</Text>
          </View>
        )}
        {pageLoading ? <Text style={styles.readerWarmupText}>Preparando leitura...</Text> : null}
      </View>

      <View style={styles.readerControls}>
        <Pressable accessibilityRole="button" disabled={pageNumber <= manifest.firstPage} onPress={() => movePage(-1)} style={[styles.readerControlButton, pageNumber <= manifest.firstPage ? styles.readerControlButtonDisabled : null]}>
          <Text style={styles.readerControlText}>Anterior</Text>
        </Pressable>
        <Text style={styles.readerProgress}>Página {pageNumber} de {manifest.pageCount}</Text>
        <Pressable accessibilityRole="button" disabled={pageNumber >= manifest.lastPage} onPress={() => movePage(1)} style={[styles.readerControlButton, pageNumber >= manifest.lastPage ? styles.readerControlButtonDisabled : null]}>
          <Text style={styles.readerControlText}>Próxima</Text>
        </Pressable>
      </View>
    </View>
  );
}

function GamesScreen({ session, onOpenGame }: { session: MobileSession | null; onOpenGame: (game: EarlyChildhoodGame) => void }) {
  const [games, setGames] = useState<EarlyChildhoodGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadGames = useCallback(async () => {
    if (!session) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      setGames(await getEarlyChildhoodGames(session));
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  const featured = games.find((game) => game.legacyId === "RS-EI-GAME-ORGANIZANDO-CESTA") ?? games[0];
  const shelf = featured ? games.filter((game) => game.id !== featured.id) : games;

  return (
    <View>
      <CrescerModuleHero kicker="Hora de jogar" title="Jogos" body="Escolha uma brincadeira e venha se divertir!" icon="games" tone="lilac" />

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.child} />
          <Text style={styles.libraryStateTitle}>Carregando jogos</Text>
          <Text style={styles.libraryStateBody}>Estamos abrindo as brincadeiras da sua turma.</Text>
        </View>
      ) : failed ? (
        <View style={styles.libraryStateCard}>
          <EmptyState title="Não conseguimos abrir os jogos" body="Tente novamente em instantes." />
          <PrimaryButton label="Tentar novamente" onPress={loadGames} />
        </View>
      ) : !featured ? (
        <EmptyState title="Jogos indisponíveis" body="Quando sua escola liberar novas brincadeiras, elas aparecem aqui." />
      ) : (
        <>
          <SectionHeader title="Jogo em destaque" />
          <Pressable accessibilityRole="button" accessibilityLabel={`Jogar ${featured.title}`} onPress={() => onOpenGame(featured)} style={styles.featuredGame}>
            <View style={styles.featuredGameIllustration}>
              <Text style={styles.featuredGameMark}>{gameMark(featured)}</Text>
            </View>
            <View style={styles.featuredGameCopy}>
              <Text style={styles.gameTag}>{gameTag(featured)}</Text>
              <Text style={styles.featuredGameTitle}>{featured.title}</Text>
              <Text style={styles.featuredGameBody}>{featured.description}</Text>
              {featured.latestAttemptStatus === "COMPLETED" ? <ProgressPill value={featured.latestScorePercent ?? 100} compact /> : null}
              <View style={styles.gameAction}>
                <Text style={styles.gameActionText}>{gameActionLabel(featured)}</Text>
              </View>
            </View>
          </Pressable>

          {shelf.length ? (
            <>
              <SectionHeader title="Mais brincadeiras" />
              <View style={styles.gameGrid}>
                {shelf.map((game) => (
                  <GameCard key={game.id} game={game} onPress={() => onOpenGame(game)} />
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function GameCard({ game, onPress }: { game: EarlyChildhoodGame; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Jogar ${game.title}`} onPress={onPress} style={styles.gameCard}>
      <View style={styles.gameCardIllustration}>
        <Text style={styles.gameCardMark}>{gameMark(game)}</Text>
      </View>
      <Text style={styles.gameTag}>{gameTag(game)}</Text>
      <Text style={styles.gameCardTitle}>{game.title}</Text>
      <Text style={styles.gameCardBody}>{game.description}</Text>
      <Text style={styles.gameCardAction}>{gameActionLabel(game)}</Text>
    </Pressable>
  );
}

const cestaAssetIds = {
  title: "RS-EI-GAME-ORGANIZANDO-CESTA-TITLES-ORGANIZANDO-A-CESTA",
  board: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-INTERACTION-BOARD-FRUIT-TOP-BASKET-BOTTOM",
  intro: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-INTRO-BANNER",
  apple: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-APPLE-CLEAN",
  banana: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-BANANA-CLEAN",
  grape: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-GRAPE-CLEAN",
  appleEmpty: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-APPLE-BASKET-EMPTY-LABELED",
  bananaEmpty: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-BANANA-BASKET-EMPTY-LABELED",
  grapeEmpty: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-GRAPE-BASKET-EMPTY-LABELED",
  appleFull: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-APPLE-BASKET-FULL-LABELED",
  bananaFull: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-BANANA-BASKET-FULL-LABELED",
  grapeFull: "RS-EI-GAME-ORGANIZANDO-CESTA-CUSTOM-ITEMS-GRAPE-BASKET-FULL-LABELED",
  final: "RS-EI-GAME-ORGANIZANDO-CESTA-SCENARIOS-FINAL"
};

const cestaGroups = [
  { id: "apple", label: "Maçã", itemAssetId: cestaAssetIds.apple, emptyAssetId: cestaAssetIds.appleEmpty, fullAssetId: cestaAssetIds.appleFull },
  { id: "banana", label: "Banana", itemAssetId: cestaAssetIds.banana, emptyAssetId: cestaAssetIds.bananaEmpty, fullAssetId: cestaAssetIds.bananaFull },
  { id: "grape", label: "Uva", itemAssetId: cestaAssetIds.grape, emptyAssetId: cestaAssetIds.grapeEmpty, fullAssetId: cestaAssetIds.grapeFull }
] as const;

type CestaGroupId = (typeof cestaGroups)[number]["id"];

const jardimAssetIds = {
  intro: "RS-EI-GAME-JARDIM-DESCOBERTAS-CARD",
  board: "RS-EI-GAME-JARDIM-DESCOBERTAS-SCREENS-SCREEN-EXPLORE",
  final: "RS-EI-GAME-JARDIM-DESCOBERTAS-SCREENS-SCREEN-FINAL",
  folha: "RS-EI-GAME-JARDIM-DESCOBERTAS-OBJECTS-LEAF",
  flor: "RS-EI-GAME-JARDIM-DESCOBERTAS-OBJECTS-FLOWER",
  caracol: "RS-EI-GAME-JARDIM-DESCOBERTAS-OBJECTS-SNAIL",
  gotinha: "RS-EI-GAME-JARDIM-DESCOBERTAS-OBJECTS-DROP",
  passarinho: "RS-EI-GAME-JARDIM-DESCOBERTAS-OBJECTS-BIRD"
};

const jardimRounds = [
  { id: "folha", label: "Folha", assetId: jardimAssetIds.folha },
  { id: "flor", label: "Flor", assetId: jardimAssetIds.flor },
  { id: "caracol", label: "Caracol", assetId: jardimAssetIds.caracol },
  { id: "gotinha", label: "Gotinha", assetId: jardimAssetIds.gotinha }
] as const;

type JardimRoundId = (typeof jardimRounds)[number]["id"];

const atelieAssetIds = {
  intro: "RS-EI-GAME-ATELIE-BIA-CARD",
  canvas: "RS-EI-GAME-ATELIE-BIA-SCREENS-SCREEN-CANVAS",
  final: "RS-EI-GAME-ATELIE-BIA-SCREENS-SCREEN-FINAL",
  reference: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-GOLDEN-MASTER-V2",
  cabeca: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-PARTE-CABECA",
  cabecaMask: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-MASK-CABECA",
  corpoPernas: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-PARTE-CORPO-PERNAS",
  corpoPernasMask: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-MASK-CORPO-PERNAS",
  asas: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-PARTE-ASAS",
  asasMask: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-MASK-ASAS",
  pintinhas: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-PARTE-PINTINHAS",
  pintinhasMask: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-MASK-PINTINHAS",
  antenas: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-PARTE-ANTENAS",
  antenasMask: "RS-EI-GAME-ATELIE-BIA-GOLDEN-MASTER-JOANINHA-MASK-ANTENAS"
};

const atelieSteps = [
  { id: "cabeca", label: "Cabeça", assetId: atelieAssetIds.cabeca, maskAssetId: atelieAssetIds.cabecaMask },
  { id: "corpo-pernas", label: "Corpo + pernas", assetId: atelieAssetIds.corpoPernas, maskAssetId: atelieAssetIds.corpoPernasMask },
  { id: "asas", label: "Asas", assetId: atelieAssetIds.asas, maskAssetId: atelieAssetIds.asasMask },
  { id: "pintinhas", label: "Pintinhas", assetId: atelieAssetIds.pintinhas, maskAssetId: atelieAssetIds.pintinhasMask },
  { id: "antenas", label: "Antenas", assetId: atelieAssetIds.antenas, maskAssetId: atelieAssetIds.antenasMask }
] as const;

type AtelieStepId = (typeof atelieSteps)[number]["id"];

function gameKind(game: EarlyChildhoodGame | null) {
  if (game?.legacyId === "RS-EI-GAME-JARDIM-DESCOBERTAS") return "jardim";
  if (game?.legacyId === "RS-EI-GAME-ATELIE-BIA") return "atelie";
  return "cesta";
}

function gameIntroAssetId(game: EarlyChildhoodGame | null) {
  const kind = gameKind(game);
  if (kind === "jardim") return jardimAssetIds.intro;
  if (kind === "atelie") return atelieAssetIds.intro;
  return cestaAssetIds.intro;
}

function GameDetailScreen({ session, gameId }: { session: MobileSession | null; gameId: string }) {
  const [game, setGame] = useState<EarlyChildhoodGame | null>(null);
  const [manifest, setManifest] = useState<EarlyChildhoodGameManifest | null>(null);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});
  const [attempt, setAttempt] = useState<EarlyChildhoodGameAttempt | null>(null);
  const [completedGroups, setCompletedGroups] = useState<CestaGroupId[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<CestaGroupId | null>(null);
  const [completedJardimRounds, setCompletedJardimRounds] = useState<JardimRoundId[]>([]);
  const [selectedJardimRound, setSelectedJardimRound] = useState<JardimRoundId | null>(null);
  const [completedAtelieSteps, setCompletedAtelieSteps] = useState<AtelieStepId[]>([]);
  const [selectedAtelieStep, setSelectedAtelieStep] = useState<AtelieStepId | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameLoading, setGameLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [result, setResult] = useState<EarlyChildhoodGameAttempt | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const assetUrlsRef = useRef<Record<string, string>>({});

  const ensureAsset = useCallback(
    async (assetId: string) => {
      if (!session || !gameId || assetUrlsRef.current[assetId]) return;
      try {
        const asset = await getEarlyChildhoodGameAsset(session, gameId, assetId);
        if (!asset.signedUrl) return;
        setAssetUrls((current) => {
          const next = { ...current, [assetId]: asset.signedUrl || "" };
          assetUrlsRef.current = next;
          return next;
        });
      } catch (_error) {
        setFailed(true);
      }
    },
    [gameId, session]
  );

  const loadGame = useCallback(async () => {
    if (!session || !gameId) {
      setFailed(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const [nextGame, nextManifest] = await Promise.all([getEarlyChildhoodGame(session, gameId), getEarlyChildhoodGameManifest(session, gameId)]);
      setGame(nextGame);
      setManifest(nextManifest);
      await ensureAsset(gameIntroAssetId(nextGame));
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [ensureAsset, gameId, session]);

  useEffect(() => {
    void loadGame();
  }, [loadGame]);

  useEffect(() => {
    if (!playing) return;
    const kind = gameKind(game);
    if (kind === "jardim") {
      void ensureAsset(jardimAssetIds.board);
      void ensureAsset(jardimAssetIds.passarinho);
      const round = jardimRounds.find((item) => item.id === (selectedJardimRound || "folha")) || jardimRounds[0];
      void ensureAsset(round.assetId);
      if (result) void ensureAsset(jardimAssetIds.final);
      return;
    }
    if (kind === "atelie") {
      void ensureAsset(atelieAssetIds.canvas);
      void ensureAsset(atelieAssetIds.reference);
      const step = atelieSteps.find((item) => item.id === (selectedAtelieStep || "cabeca")) || atelieSteps[0];
      void ensureAsset(step.assetId);
      void ensureAsset(step.maskAssetId);
      if (result) void ensureAsset(atelieAssetIds.final);
      return;
    }
    void ensureAsset(cestaAssetIds.board);
    void ensureAsset(cestaAssetIds.title);
    const group = cestaGroups.find((item) => item.id === (selectedGroup || "apple")) || cestaGroups[0];
    void ensureAsset(group.itemAssetId);
    void ensureAsset(completedGroups.includes(group.id) ? group.fullAssetId : group.emptyAssetId);
  }, [completedGroups, completedAtelieSteps, completedJardimRounds, ensureAsset, game, playing, result, selectedAtelieStep, selectedGroup, selectedJardimRound]);

  const beginGame = useCallback(async () => {
    if (!session || !game) return;
    setGameLoading(true);
    setFailed(false);
    try {
      const nextAttempt = await startEarlyChildhoodGameAttempt(session, game.id);
      startedAtRef.current = Date.now();
      setAttempt(nextAttempt);
      setCompletedGroups([]);
      setSelectedGroup("apple");
      setCompletedJardimRounds([]);
      setSelectedJardimRound("folha");
      setCompletedAtelieSteps([]);
      setSelectedAtelieStep("cabeca");
      setResult(null);
      setPlaying(true);
      const kind = gameKind(game);
      if (kind === "jardim") {
        await ensureAsset(jardimAssetIds.board);
        await ensureAsset(jardimRounds[0].assetId);
        return;
      }
      if (kind === "atelie") {
        await ensureAsset(atelieAssetIds.canvas);
        await ensureAsset(atelieAssetIds.reference);
        await ensureAsset(atelieSteps[0].assetId);
        await ensureAsset(atelieSteps[0].maskAssetId);
        return;
      }
      await ensureAsset(cestaAssetIds.board);
      await ensureAsset(cestaGroups[0].itemAssetId);
      await ensureAsset(cestaGroups[0].emptyAssetId);
    } catch (_error) {
      setFailed(true);
    } finally {
      setGameLoading(false);
    }
  }, [ensureAsset, game, session]);

  const completeGroup = useCallback(
    async (groupId: CestaGroupId) => {
      if (!session || !attempt || result) return;
      const nextGroups = completedGroups.includes(groupId) ? completedGroups : [...completedGroups, groupId];
      setCompletedGroups(nextGroups);
      await ensureAsset(cestaGroups.find((group) => group.id === groupId)?.fullAssetId || cestaAssetIds.appleFull);
      try {
        if (nextGroups.length < 3) {
          await updateEarlyChildhoodGameAttempt(session, attempt.attemptId, "IN_PROGRESS", {
            completed_groups: nextGroups,
            required_groups: ["apple", "banana", "grape"],
            minimum_completed_groups: 3
          });
          const nextGroup = cestaGroups.find((group) => !nextGroups.includes(group.id));
          if (nextGroup) {
            setSelectedGroup(nextGroup.id);
            void ensureAsset(nextGroup.itemAssetId);
            void ensureAsset(nextGroup.emptyAssetId);
          }
          return;
        }

        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const completed = await completeEarlyChildhoodGameAttempt(
          session,
          attempt.attemptId,
          {
            completed_groups: nextGroups,
            required_groups: ["apple", "banana", "grape"],
            minimum_completed_groups: 3,
            score_percent: 100,
            duration_seconds: durationSeconds,
            event_key: `GAME_COMPLETED:${game?.legacyId || "RS-EI-GAME-ORGANIZANDO-CESTA"}:ATTEMPT_SCOPED`
          },
          {
            completed_groups: nextGroups,
            current_screen: "final"
          }
        );
        setResult(completed);
        await ensureAsset(cestaAssetIds.final);
      } catch (_error) {
        setFailed(true);
      }
    },
    [attempt, completedGroups, ensureAsset, game?.legacyId, result, session]
  );

  const completeJardimRound = useCallback(
    async (roundId: JardimRoundId) => {
      if (!session || !attempt || result) return;
      const nextRounds = completedJardimRounds.includes(roundId) ? completedJardimRounds : [...completedJardimRounds, roundId];
      setCompletedJardimRounds(nextRounds);
      try {
        if (nextRounds.length < jardimRounds.length) {
          await updateEarlyChildhoodGameAttempt(session, attempt.attemptId, "IN_PROGRESS", {
            completed_rounds: nextRounds,
            required_rounds: jardimRounds.map((round) => round.id),
            minimum_completed_rounds: jardimRounds.length
          });
          const nextRound = jardimRounds.find((round) => !nextRounds.includes(round.id));
          if (nextRound) {
            setSelectedJardimRound(nextRound.id);
            void ensureAsset(nextRound.assetId);
          }
          return;
        }

        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const completed = await completeEarlyChildhoodGameAttempt(
          session,
          attempt.attemptId,
          {
            completed_rounds: nextRounds,
            required_rounds: jardimRounds.map((round) => round.id),
            minimum_completed_rounds: jardimRounds.length,
            score_percent: 100,
            duration_seconds: durationSeconds,
            event_key: `GAME_COMPLETED:${game?.legacyId || "RS-EI-GAME-JARDIM-DESCOBERTAS"}:ATTEMPT_SCOPED`
          },
          {
            completed_rounds: nextRounds,
            current_screen: "final"
          }
        );
        setResult(completed);
        await ensureAsset(jardimAssetIds.final);
      } catch (_error) {
        setFailed(true);
      }
    },
    [attempt, completedJardimRounds, ensureAsset, game?.legacyId, result, session]
  );

  const completeAtelieStep = useCallback(
    async (stepId: AtelieStepId) => {
      if (!session || !attempt || result) return;
      const nextSteps = completedAtelieSteps.includes(stepId) ? completedAtelieSteps : [...completedAtelieSteps, stepId];
      setCompletedAtelieSteps(nextSteps);
      try {
        if (nextSteps.length < atelieSteps.length) {
          await updateEarlyChildhoodGameAttempt(session, attempt.attemptId, "IN_PROGRESS", {
            completed_steps: nextSteps,
            required_steps: atelieSteps.map((step) => step.id),
            minimum_completed_steps: atelieSteps.length
          });
          const nextStep = atelieSteps.find((step) => !nextSteps.includes(step.id));
          if (nextStep) {
            setSelectedAtelieStep(nextStep.id);
            void ensureAsset(nextStep.assetId);
            void ensureAsset(nextStep.maskAssetId);
          }
          return;
        }

        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const completed = await completeEarlyChildhoodGameAttempt(
          session,
          attempt.attemptId,
          {
            completed_steps: nextSteps,
            required_steps: atelieSteps.map((step) => step.id),
            minimum_completed_steps: atelieSteps.length,
            coverage: 1,
            score_percent: 100,
            duration_seconds: durationSeconds,
            event_key: `GAME_COMPLETED:${game?.legacyId || "RS-EI-GAME-ATELIE-BIA"}:ATTEMPT_SCOPED`
          },
          {
            completed_steps: nextSteps,
            current_screen: "final"
          }
        );
        setResult(completed);
        await ensureAsset(atelieAssetIds.final);
      } catch (_error) {
        setFailed(true);
      }
    },
    [attempt, completedAtelieSteps, ensureAsset, game?.legacyId, result, session]
  );

  const finishAndLeave = useCallback(() => {
    setPlaying(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.libraryStateCard}>
        <ActivityIndicator color={colors.child} />
        <Text style={styles.libraryStateTitle}>Abrindo jogo</Text>
        <Text style={styles.libraryStateBody}>Estamos preparando a brincadeira.</Text>
      </View>
    );
  }

  if (failed || !game || !manifest) {
    return (
      <View style={styles.libraryStateCard}>
        <EmptyState title="Não conseguimos abrir este jogo" body="Volte e tente novamente." />
        <PrimaryButton label="Tentar novamente" onPress={loadGame} />
      </View>
    );
  }

  if (playing) {
    const kind = gameKind(game);
    if (kind === "jardim") {
      const activeRound = jardimRounds.find((round) => round.id === selectedJardimRound) || jardimRounds[0];
      const boardUrl = assetUrls[jardimAssetIds.board];
      const objectUrl = assetUrls[activeRound.assetId];
      const finalUrl = assetUrls[jardimAssetIds.final];

      return (
        <View style={styles.gameLandscapeShell}>
          <View style={styles.gameLandscapeHeader}>
            <Text style={styles.gameLandscapeKicker}>Jardim das Descobertas</Text>
            <Pressable accessibilityRole="button" onPress={finishAndLeave} style={styles.gameExitButton}>
              <Text style={styles.gameExitButtonText}>Sair</Text>
            </Pressable>
          </View>

          {result ? (
            <View style={styles.cestaVictoryPanel}>
              {finalUrl ? <Image source={{ uri: finalUrl }} resizeMode="cover" style={styles.cestaVictoryImage} /> : null}
              <Text style={styles.cestaVictoryTitle}>Descobertas completas!</Text>
              <Text style={styles.cestaVictoryBody}>Você encontrou os elementos do jardim.</Text>
              <Text style={styles.cestaVictoryStatus}>Resultado salvo</Text>
              <PrimaryButton label="Voltar aos jogos" onPress={finishAndLeave} />
            </View>
          ) : (
            <View style={styles.cestaPlayfield}>
              {boardUrl ? <Image source={{ uri: boardUrl }} resizeMode="cover" style={styles.cestaBoardImage} /> : null}
              <View style={styles.cestaTaskPanel}>
                <Text style={styles.cestaTaskTitle}>Encontre no jardim</Text>
                <Text style={styles.cestaTaskBody}>Toque no item pedido para seguir a descoberta.</Text>
                <View style={styles.cestaProgressRow}>
                  {jardimRounds.map((round) => (
                    <View key={round.id} style={[styles.cestaProgressDot, completedJardimRounds.includes(round.id) ? styles.cestaProgressDotDone : null]} />
                  ))}
                </View>
              </View>
              <View style={styles.cestaActionRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Encontrar ${activeRound.label}`} onPress={() => void completeJardimRound(activeRound.id)} style={styles.cestaFruitButton}>
                  {objectUrl ? <Image source={{ uri: objectUrl }} resizeMode="contain" style={styles.cestaFruitImage} /> : <ActivityIndicator color={colors.child} />}
                  <Text style={styles.cestaFruitLabel}>{activeRound.label}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      );
    }

    if (kind === "atelie") {
      const activeStep = atelieSteps.find((step) => step.id === selectedAtelieStep) || atelieSteps[0];
      const canvasUrl = assetUrls[atelieAssetIds.canvas];
      const referenceUrl = assetUrls[atelieAssetIds.reference];
      const partUrl = assetUrls[activeStep.assetId];
      const maskUrl = assetUrls[activeStep.maskAssetId];
      const finalUrl = assetUrls[atelieAssetIds.final];

      return (
        <View style={styles.gameLandscapeShell}>
          <View style={styles.gameLandscapeHeader}>
            <Text style={styles.gameLandscapeKicker}>Ateliê da Bia</Text>
            <Pressable accessibilityRole="button" onPress={finishAndLeave} style={styles.gameExitButton}>
              <Text style={styles.gameExitButtonText}>Sair</Text>
            </Pressable>
          </View>

          {result ? (
            <View style={styles.cestaVictoryPanel}>
              {finalUrl ? <Image source={{ uri: finalUrl }} resizeMode="cover" style={styles.cestaVictoryImage} /> : null}
              <Text style={styles.cestaVictoryTitle}>Arte concluída!</Text>
              <Text style={styles.cestaVictoryBody}>A joaninha ganhou cor no Ateliê da Bia.</Text>
              <Text style={styles.cestaVictoryStatus}>Resultado salvo</Text>
              <PrimaryButton label="Voltar aos jogos" onPress={finishAndLeave} />
            </View>
          ) : (
            <View style={styles.cestaPlayfield}>
              {canvasUrl ? <Image source={{ uri: canvasUrl }} resizeMode="cover" style={styles.cestaBoardImage} /> : null}
              <View style={styles.cestaTaskPanel}>
                <Text style={styles.cestaTaskTitle}>Pinte a joaninha</Text>
                <Text style={styles.cestaTaskBody}>Etapa atual: {activeStep.label}.</Text>
                <View style={styles.cestaProgressRow}>
                  {atelieSteps.map((step) => (
                    <View key={step.id} style={[styles.cestaProgressDot, completedAtelieSteps.includes(step.id) ? styles.cestaProgressDotDone : null]} />
                  ))}
                </View>
              </View>
              <View style={styles.cestaActionRow}>
                <View style={styles.cestaBasketButton}>
                  {referenceUrl ? <Image source={{ uri: referenceUrl }} resizeMode="contain" style={styles.cestaBasketImage} /> : <ActivityIndicator color={colors.child} />}
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Concluir ${activeStep.label}`} onPress={() => void completeAtelieStep(activeStep.id)} style={styles.cestaFruitButton}>
                  {partUrl ? <Image source={{ uri: partUrl }} resizeMode="contain" style={styles.cestaFruitImage} /> : <ActivityIndicator color={colors.child} />}
                  {maskUrl ? <Image source={{ uri: maskUrl }} resizeMode="contain" style={styles.cestaFruitImage} /> : null}
                  <Text style={styles.cestaFruitLabel}>{activeStep.label}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      );
    }

    const activeGroup = cestaGroups.find((group) => group.id === selectedGroup) || cestaGroups[0];
    const isCompleted = completedGroups.includes(activeGroup.id);
    const boardUrl = assetUrls[cestaAssetIds.board];
    const itemUrl = assetUrls[activeGroup.itemAssetId];
    const basketUrl = assetUrls[isCompleted ? activeGroup.fullAssetId : activeGroup.emptyAssetId];
    const finalUrl = assetUrls[cestaAssetIds.final];

    return (
      <View style={styles.gameLandscapeShell}>
        <View style={styles.gameLandscapeHeader}>
          <Text style={styles.gameLandscapeKicker}>Organizando a Cesta</Text>
          <Pressable accessibilityRole="button" onPress={finishAndLeave} style={styles.gameExitButton}>
            <Text style={styles.gameExitButtonText}>Sair</Text>
          </Pressable>
        </View>

        {result ? (
          <View style={styles.cestaVictoryPanel}>
            {finalUrl ? <Image source={{ uri: finalUrl }} resizeMode="cover" style={styles.cestaVictoryImage} /> : null}
            <Text style={styles.cestaVictoryTitle}>Cesta organizada!</Text>
            <Text style={styles.cestaVictoryBody}>Você separou maçã, banana e uva.</Text>
            <Text style={styles.cestaVictoryStatus}>Resultado salvo</Text>
            <PrimaryButton label="Voltar aos jogos" onPress={finishAndLeave} />
          </View>
        ) : (
          <View style={styles.cestaPlayfield}>
            {boardUrl ? <Image source={{ uri: boardUrl }} resizeMode="cover" style={styles.cestaBoardImage} /> : null}
            <View style={styles.cestaTaskPanel}>
              <Text style={styles.cestaTaskTitle}>Leve a fruta para a cesta</Text>
              <Text style={styles.cestaTaskBody}>Complete as três: maçã, banana e uva.</Text>
              <View style={styles.cestaProgressRow}>
                {cestaGroups.map((group) => (
                  <View key={group.id} style={[styles.cestaProgressDot, completedGroups.includes(group.id) ? styles.cestaProgressDotDone : null]} />
                ))}
              </View>
            </View>
            <View style={styles.cestaActionRow}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Selecionar ${activeGroup.label}`} onPress={() => void completeGroup(activeGroup.id)} style={styles.cestaFruitButton}>
                {itemUrl ? <Image source={{ uri: itemUrl }} resizeMode="contain" style={styles.cestaFruitImage} /> : <ActivityIndicator color={colors.child} />}
                <Text style={styles.cestaFruitLabel}>{activeGroup.label}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Cesta de ${activeGroup.label}`} onPress={() => void completeGroup(activeGroup.id)} style={styles.cestaBasketButton}>
                {basketUrl ? <Image source={{ uri: basketUrl }} resizeMode="contain" style={styles.cestaBasketImage} /> : <ActivityIndicator color={colors.child} />}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View>
      <View style={styles.gameStage}>
        <View style={styles.gameStageIllustration}>
          {assetUrls[gameIntroAssetId(game)] ? (
            <Image source={{ uri: assetUrls[gameIntroAssetId(game)] }} resizeMode="cover" style={styles.gameStageImage} />
          ) : (
            <Text style={styles.gameStageMark}>{gameMark(game)}</Text>
          )}
        </View>
        <Text style={styles.discoveryKicker}>{gameTag(game)}</Text>
        <Text style={styles.gameStageTitle}>{game.title}</Text>
        <Text style={styles.gameStageBody}>{game.studentInstruction || game.description}</Text>
        {game.latestAttemptStatus === "COMPLETED" ? <ProgressPill value={game.latestScorePercent ?? 100} /> : null}
        <View style={styles.landscapeHint}>
          <Text style={styles.landscapeHintText}>Pronto para virar uma brincadeira em tela cheia.</Text>
        </View>
      </View>

      <PrimaryButton label={gameLoading ? "Preparando..." : game.latestAttemptStatus === "COMPLETED" ? "Jogar novamente" : "Começar"} onPress={() => void beginGame()} />
    </View>
  );
}

function gameMark(game: EarlyChildhoodGame) {
  if (game.legacyId === "RS-EI-GAME-ORGANIZANDO-CESTA") return "◌";
  if (game.title.toLowerCase().includes("jardim")) return "✿";
  return "▶";
}

function gameTag(game: EarlyChildhoodGame) {
  if (game.legacyId === "RS-EI-GAME-ORGANIZANDO-CESTA") return "Organizar";
  return game.gameType || "Jogo";
}

function gameActionLabel(game: EarlyChildhoodGame) {
  if (game.latestAttemptStatus === "COMPLETED") return "Jogar novamente";
  if (game.latestAttemptStatus === "IN_PROGRESS" || game.latestAttemptStatus === "STARTED") return "Continuar";
  return "Jogar";
}

function AchievementsScreen({ session, onOpenAchievement }: { session: MobileSession | null; onOpenAchievement: (achievement: CrescerAchievement) => void }) {
  const [summary, setSummary] = useState<StudentXpSummary | null>(null);
  const [history, setHistory] = useState<StudentXpHistoryItem[]>([]);
  const [achievements, setAchievements] = useState<CrescerAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadAchievements = useCallback(async () => {
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const [nextSummary, nextHistory, nextAchievements] = await Promise.all([
        getStudentXpSummary(session),
        getStudentXpHistory(session, 10),
        getStudentAchievements(session)
      ]);
      setSummary(nextSummary);
      setHistory(nextHistory);
      setAchievements(nextAchievements.map(mapAchievementForUi));
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  const totalXp = summary?.totalXp ?? 0;
  const levelNumber = summary?.levelNumber ?? 1;
  const levelFloor = summary?.levelFloorXp ?? 0;
  const nextLevel = summary?.nextLevelXp ?? 100;
  const levelSpan = Math.max(1, nextLevel - levelFloor);
  const levelProgress = Math.max(0, Math.min(100, ((totalXp - levelFloor) / levelSpan) * 100));
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked);

  return (
    <View>
      <CrescerModuleHero kicker="Você conseguiu" title="Conquistas" body="Veja tudo o que você já descobriu!" icon="achievements" tone="rose" />

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.child} />
          <Text style={styles.libraryStateTitle}>Carregando conquistas</Text>
          <Text style={styles.libraryStateBody}>Estamos buscando seu progresso.</Text>
        </View>
      ) : failed ? (
        <EmptyState title="Conquistas indisponíveis" body="Tente entrar novamente em alguns instantes." />
      ) : (
        <>
      <View style={styles.progressCelebrationCard}>
        <View style={styles.progressAvatarRow}>
          <View style={styles.progressAvatar}>
                <Image source={crescerHomeIcons.achievements} resizeMode="contain" style={styles.progressAvatarImage} />
          </View>
              <View style={styles.progressNameBlock}>
                <Text style={styles.progressName}>Pedro Miguel</Text>
                <Text style={styles.progressLevel}>Nível {levelNumber}</Text>
              </View>
              <View style={styles.progressPoints}>
                <Text style={styles.progressPointsText}>{totalXp} XP</Text>
              </View>
            </View>
            <Text style={styles.progressCelebrationText}>{xpCelebrationText(totalXp, unlockedAchievements.length)}</Text>
            <ProgressPill value={levelProgress} />
          </View>

          <SectionHeader title="Minhas conquistas" />
          {achievements.length ? (
            <View style={styles.medalGrid}>
              {achievements.map((achievement) => (
                <AchievementMedalCard key={achievement.id} achievement={achievement} onPress={() => onOpenAchievement(achievement)} />
              ))}
            </View>
          ) : (
            <EmptyState title="Nenhuma conquista ainda" body="Quando você desbloquear uma conquista, ela aparece aqui." />
          )}

          <SectionHeader title="Últimos XP" />
          {history.length ? (
            <View style={styles.achievementList}>
              {history.map((item) => (
                <XpHistoryCard key={item.id} item={item} />
              ))}
            </View>
          ) : (
            <EmptyState title="Sem XP por enquanto" body="Seu histórico aparece aqui quando houver recompensas." />
          )}
        </>
      )}
    </View>
  );
}

function AchievementMedalCard({ achievement, onPress }: { achievement: CrescerAchievement; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${achievement.title}. ${achievement.message}`} onPress={onPress} style={styles.medalCard}>
      <View style={[styles.medalIcon, achievement.unlocked ? styles.medalIconEarned : styles.medalIconWaiting]}>
        <Text style={styles.medalMark}>{achievement.mark}</Text>
      </View>
      <Text style={styles.medalStatus}>{achievement.unlocked ? "Conquistada" : "Continue explorando!"}</Text>
      <Text style={styles.medalTitle}>{achievement.title}</Text>
      <Text style={styles.medalMessage}>{achievement.message}</Text>
    </Pressable>
  );
}

function XpHistoryCard({ item }: { item: StudentXpHistoryItem }) {
  return (
    <View style={styles.achievementRow}>
      <View style={styles.achievementRowIcon}>
        <Text style={styles.achievementRowMark}>XP</Text>
      </View>
      <View style={styles.achievementRowCopy}>
        <Text style={styles.medalStatus}>+{item.xpAmount} XP</Text>
        <Text style={styles.achievementRowTitle}>{xpHistoryTitle(item)}</Text>
        <Text style={styles.achievementRowBody}>{xpHistoryDescription(item)}</Text>
      </View>
    </View>
  );
}

function AchievementDetailScreen({ session, achievementId }: { session: MobileSession | null; achievementId: string }) {
  const [achievement, setAchievement] = useState<CrescerAchievement | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadAchievement = useCallback(async () => {
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    try {
      const achievements = await getStudentAchievements(session);
      setAchievement(achievements.map(mapAchievementForUi).find((item) => item.id === achievementId) ?? null);
    } catch (_error) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [achievementId, session]);

  useEffect(() => {
    void loadAchievement();
  }, [loadAchievement]);

  if (loading) {
    return (
      <View style={styles.libraryStateCard}>
        <ActivityIndicator color={colors.child} />
        <Text style={styles.libraryStateTitle}>Carregando conquista</Text>
        <Text style={styles.libraryStateBody}>Estamos abrindo sua conquista.</Text>
      </View>
    );
  }

  if (failed || !achievement) {
    return <EmptyState title="Conquista indisponível" body="Volte e tente novamente em alguns instantes." />;
  }

  return (
    <View>
      <View style={styles.achievementDetailHero}>
        <View style={styles.achievementDetailIcon}>
          <Text style={styles.achievementDetailMark}>{achievement.mark}</Text>
        </View>
        <Text style={styles.achievementDetailStatus}>{achievement.unlocked ? "Conquistada" : "Continue explorando!"}</Text>
        <Text style={styles.achievementDetailTitle}>{achievement.title}</Text>
        <Text style={styles.achievementDetailBody}>{achievement.description}</Text>
      </View>

      <View style={styles.achievementDetailMessageCard}>
        <Text style={styles.achievementDetailMessageTitle}>Mensagem para você</Text>
        <Text style={styles.achievementDetailMessageBody}>{achievement.message}</Text>
      </View>

      <PrimaryButton label="Continuar explorando" onPress={() => undefined} />
    </View>
  );
}

function mapAchievementForUi(achievement: StudentAchievement): CrescerAchievement {
  return {
    ...achievement,
    mark: achievement.unlocked ? "★" : "○",
    message: achievement.unlocked ? "Você desbloqueou esta conquista." : "Continue explorando para desbloquear."
  };
}

function xpCelebrationText(totalXp: number, unlockedCount: number) {
  if (totalXp <= 0) return "Seu progresso começa aqui.";
  if (unlockedCount === 1) return "Você já tem uma conquista!";
  return `Você já somou ${totalXp} XP.`;
}

function xpHistoryTitle(item: StudentXpHistoryItem) {
  if (item.sourceLegacyId === "RS-EI-GAME-ORGANIZANDO-CESTA") return "Organizando a Cesta";
  if (item.sourceLegacyId) return item.sourceLegacyId;
  if (item.sourceType === "activity") return "Atividade concluída";
  if (item.sourceType === "discovery") return "Descoberta concluída";
  if (item.sourceType === "game") return "Jogo concluído";
  return "Recompensa";
}

function xpHistoryDescription(item: StudentXpHistoryItem) {
  if (item.eventType === "GAME_COMPLETED") return "Jogo concluído.";
  if (item.eventType === "ACTIVITY_COMPLETED") return "Atividade concluída.";
  if (item.eventType === "DISCOVERY_COMPLETED") return "Descoberta concluída.";
  return "Recompensa registrada.";
}

function AgendaScreen({ onOpenItem }: { onOpenItem: (item: CrescerAgendaItem) => void }) {
  const agenda = demoCollections.agenda;

  return (
    <View>
      <CrescerModuleHero kicker="Esta semana" title="Agenda" body="Veja o que está chegando nesta semana." icon="agenda" tone="sky" />

      <View style={styles.weekStrip}>
        {agenda.weekDays.map((day) => (
          <View key={day.short} style={[styles.weekDayCard, day.isToday ? styles.weekDayToday : null]}>
            <Text style={styles.weekDayShort}>{day.short}</Text>
            <Text style={styles.weekDayNumber}>{day.day}</Text>
            {day.isToday ? <Text style={styles.weekDayTodayText}>Hoje</Text> : <Text style={styles.weekDayLabel}>{day.label}</Text>}
          </View>
        ))}
      </View>

      <SectionHeader title="Hoje" />
      <View style={styles.todayCard}>
        {agenda.today.length === 0 ? (
          <Text style={styles.todayEmptyText}>Hoje não tem nenhum compromisso. Aproveite para explorar e brincar!</Text>
        ) : (
          agenda.today.map((item) => <AgendaItemCard key={item.title} item={item} onPress={() => onOpenItem(item)} featured />)
        )}
      </View>

      <SectionHeader title="Próximos compromissos" />
      <View style={styles.agendaList}>
        {agenda.upcoming.map((item) => (
          <AgendaItemCard key={item.title} item={item} onPress={() => onOpenItem(item)} />
        ))}
      </View>
    </View>
  );
}

function AgendaItemCard({ item, onPress, featured }: { item: CrescerAgendaItem; onPress: () => void; featured?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.type}. ${item.title}`} onPress={onPress} style={[styles.agendaItemCard, featured ? styles.agendaItemFeatured : null]}>
      <View style={styles.agendaItemIcon}>
        <Image source={crescerHomeIcons.agenda} resizeMode="contain" style={styles.crescerListIconImage} />
      </View>
      <View style={styles.agendaItemCopy}>
        <Text style={styles.agendaType}>{item.type}</Text>
        <Text style={styles.agendaItemTitle}>{item.title}</Text>
        <Text style={styles.agendaItemMeta}>
          {item.day} · {item.time}
        </Text>
        <Text style={styles.agendaItemBody}>{item.description}</Text>
      </View>
      <Text style={styles.discoveryChevron}>›</Text>
    </Pressable>
  );
}

function AgendaDetailScreen({ item, onBack }: { item: CrescerAgendaItem; onBack: () => void }) {
  return (
    <View>
      <View style={styles.agendaDetailHero}>
        <View style={styles.agendaDetailIcon}>
          <Text style={styles.agendaDetailIconText}>{getAgendaMark(item.type)}</Text>
        </View>
        <Text style={styles.agendaType}>{item.type}</Text>
        <Text style={styles.agendaDetailTitle}>{item.title}</Text>
        <Text style={styles.agendaDetailMeta}>
          {item.day} · {item.time}
        </Text>
        <Text style={styles.agendaDetailBody}>{item.description}</Text>
      </View>

      <View style={styles.agendaReminderCard}>
        <Text style={styles.agendaReminderTitle}>Combinado</Text>
        <Text style={styles.agendaReminderBody}>Você pode voltar para a semana e escolher outro compromisso quando quiser.</Text>
      </View>

      <PrimaryButton label="Voltar" onPress={onBack} />
    </View>
  );
}

function getAgendaMark(type: CrescerAgendaItem["type"]) {
  if (type === "Avaliação") return "✓";
  if (type === "Evento") return "✿";
  if (type === "Lembrete") return "!";
  return "✎";
}

function NotificationsScreen({
  readTitles,
  onOpenNotification
}: {
  readTitles: string[];
  onOpenNotification: (item: CrescerNotification) => void;
}) {
  const unreadCount = demoCollections.childNotifications.filter((item) => item.unread && !readTitles.includes(item.title)).length;

  return (
    <View>
      <CrescerModuleHero kicker="Novidades para você" title="Notificações" body="Veja as novidades que chegaram para você." icon="notifications" tone="lilac" />

      <View style={styles.notificationSummaryCard}>
        <View style={styles.notificationSummaryIcon}>
          <Image source={crescerHomeIcons.notifications} resizeMode="contain" style={styles.crescerListIconImage} />
        </View>
        <View style={styles.notificationSummaryCopy}>
          <Text style={styles.notificationSummaryLabel}>Novidades</Text>
          <Text style={styles.notificationSummaryTitle}>
            {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? "item novo" : "itens novos"}` : "Tudo visto por aqui"}
          </Text>
        </View>
        {unreadCount > 0 ? <Badge label="Novo" /> : null}
      </View>

      <SectionHeader title="Chegou para você" />
      <View style={styles.notificationList}>
        {demoCollections.childNotifications.map((item) => (
          <NotificationCard key={item.title} item={item} isRead={!item.unread || readTitles.includes(item.title)} onPress={() => onOpenNotification(item)} />
        ))}
      </View>
    </View>
  );
}

function NotificationCard({ item, isRead, onPress }: { item: CrescerNotification; isRead: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.type}. ${item.title}`} onPress={onPress} style={[styles.notificationCard, !isRead ? styles.notificationCardNew : null]}>
      <View style={styles.notificationIcon}>
        <Image source={crescerHomeIcons.notifications} resizeMode="contain" style={styles.crescerListIconImage} />
      </View>
      <View style={styles.notificationCopy}>
        <View style={styles.notificationMetaRow}>
          <Text style={styles.notificationType}>{item.type}</Text>
          {!isRead ? <Text style={styles.notificationNewPill}>Novo</Text> : null}
        </View>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationSummary}>{item.summary}</Text>
        <Text style={styles.notificationOrigin}>
          {item.origin} · {item.time}
        </Text>
      </View>
      <Text style={styles.discoveryChevron}>›</Text>
    </Pressable>
  );
}

function NotificationDetailScreen({ item, onBack }: { item: CrescerNotification; onBack: () => void }) {
  return (
    <View>
      <View style={styles.notificationDetailHero}>
        <View style={styles.notificationDetailIcon}>
          <Text style={styles.notificationDetailIconText}>{getNotificationMark(item.type)}</Text>
        </View>
        <Text style={styles.notificationType}>{item.type}</Text>
        <Text style={styles.notificationDetailTitle}>{item.title}</Text>
        <Text style={styles.notificationDetailMeta}>
          {item.origin} · {item.time}
        </Text>
        <Text style={styles.notificationDetailBody}>{item.message}</Text>
      </View>

      <View style={styles.notificationActionCard}>
        <Text style={styles.notificationActionTitle}>Próximo passo</Text>
        <Text style={styles.notificationActionBody}>{item.action}</Text>
      </View>

      <PrimaryButton label="Voltar" onPress={onBack} />
    </View>
  );
}

function getNotificationMark(type: CrescerNotification["type"]) {
  if (type === "Agenda") return "✿";
  if (type === "Avaliação") return "✓";
  if (type === "Atividade") return "✎";
  return "!";
}

function CrescerProfileScreen({ session, onLogout }: { session: MobileSession | null; onLogout: () => void }) {
  const [profile, setProfile] = useState<CrescerStudentProfile | null>(null);
  const [xpSummary, setXpSummary] = useState<StudentXpSummary | null>(null);
  const [achievements, setAchievements] = useState<StudentAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    Promise.all([
      getCrescerStudentProfile(session),
      getStudentXpSummary(session).catch(() => null),
      getStudentAchievements(session).catch(() => [])
    ])
      .then(([studentProfile, xp, studentAchievements]) => {
        if (!active) return;
        setProfile(studentProfile);
        setXpSummary(xp);
        setAchievements(studentAchievements);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const unlockedAchievements = achievements.filter((item) => item.unlocked).length;
  const progress = [
    { label: "XP", value: String(xpSummary?.totalXp ?? 0), mark: "XP" },
    { label: "Créditos", value: String(xpSummary?.creditsCount ?? 0), mark: "+" },
    { label: "Conquistas", value: String(unlockedAchievements), mark: "*" },
    { label: "Nível", value: String(xpSummary?.levelNumber ?? profile?.levelNumber ?? 1), mark: "N" }
  ];

  return (
    <View>
      <CrescerModuleHero kicker="Meu cantinho" title="Meu perfil" body="Seu espaço no Raízes Crescer com os dados da sua turma." icon="achievements" tone="mint" />

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.libraryStateTitle}>Carregando perfil</Text>
          <Text style={styles.libraryStateBody}>Estamos buscando os dados do aluno.</Text>
        </View>
      ) : failed || !profile ? (
        <EmptyState title="Perfil indisponível" body="Não foi possível carregar os dados do aluno agora." />
      ) : (
        <>
      <View style={styles.profileIdentityCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>{profile.initials}</Text>
        </View>
        <View style={styles.profileIdentityCopy}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileClass}>{profile.className}</Text>
          <Text style={styles.profileSchool}>{profile.schoolName}</Text>
          <View style={styles.profileLevelPill}>
            <Text style={styles.profileLevelText}>Nível {xpSummary?.levelNumber ?? profile.levelNumber ?? 1}</Text>
          </View>
        </View>
      </View>

      <SectionHeader title="Meu progresso" />
      <View style={styles.profileProgressGrid}>
        {progress.map((item) => (
          <View key={item.label} style={styles.profileProgressCard}>
            <View style={styles.profileProgressIcon}>
              <Text style={styles.profileProgressMark}>{item.mark}</Text>
            </View>
            <Text style={styles.profileProgressValue}>{item.value}</Text>
            <Text style={styles.profileProgressLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Minha escola" />
      <View style={styles.profileSchoolCard}>
        <View style={styles.profileSchoolIcon}>
          <Text style={styles.profileSchoolIconText}>⌂</Text>
        </View>
        <View style={styles.profileSchoolCopy}>
          <Text style={styles.profileSchoolTitle}>{profile.schoolName}</Text>
          <Text style={styles.profileSchoolBody}>
            {profile.className}{profile.schoolYear ? ` · ${profile.schoolYear}` : ""}
          </Text>
          <Text style={styles.profileSchoolAction}>Matrícula ativa</Text>
        </View>
      </View>

      <SectionHeader title="Preferências" />
      <EmptyState title="Sem ajustes personalizados" body="Quando houver preferências registradas, elas aparecem aqui." />
        </>
      )}

      <Pressable accessibilityRole="button" accessibilityLabel="Sair" onPress={onLogout} style={styles.profileLogoutButton}>
        <Text style={styles.profileLogoutText}>Sair</Text>
      </Pressable>
    </View>
  );
}

function DiscoveryAdventureCard({ discovery, onPress }: { discovery: EarlyChildhoodDiscovery; onPress: () => void }) {
  const actionLabel = discoveryActionLabel(discovery);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${discovery.title}. ${discovery.description}`} onPress={onPress} style={styles.discoveryCard}>
      <View style={styles.discoveryMark}>
        <Text style={styles.discoveryMarkText}>{discoveryMark(discovery)}</Text>
      </View>
      <View style={styles.discoveryCopy}>
        <Text style={styles.discoveryTag}>{discoveryStatusLabel(discovery)}</Text>
        <Text style={styles.discoveryCardTitle}>{discovery.title}</Text>
        <Text style={styles.discoveryCardBody}>{discovery.description}</Text>
        {discovery.discoveredHotspots.length ? <Text style={styles.discoveryCardBody}>{discovery.discoveredHotspots.length} pista explorada</Text> : null}
      </View>
      {actionLabel === "Explorar" ? (
        <Text style={styles.discoveryChevron}>›</Text>
      ) : (
        <View style={styles.discoveryActionPill}>
          <Text style={styles.discoveryActionText}>{actionLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

function ModuleScreen({
  profile,
  session,
  activeKey,
  onOpen,
  onBack,
  onLogout,
  readNotificationTitles,
  onReadNotification
}: {
  profile: AppProfile;
  session: MobileSession | null;
  activeKey: ModuleKey;
  onOpen: (key: ModuleKey) => void;
  onBack: () => void;
  onLogout: () => void;
  readNotificationTitles: string[];
  onReadNotification: (title: string) => void;
}) {
  if (profile.role === "crescer") {
    return <CrescerModule session={session} activeKey={activeKey} onOpen={onOpen} onBack={onBack} onLogout={onLogout} readNotificationTitles={readNotificationTitles} onReadNotification={onReadNotification} />;
  }

  if (profile.role === "fundamental") {
    return <FundamentalModule session={session} activeKey={activeKey} onOpen={onOpen} onBack={onBack} onLogout={onLogout} readNotificationTitles={readNotificationTitles} onReadNotification={onReadNotification} />;
  }

  if (profile.role === "professor") {
    return <TeacherModule session={session} activeKey={activeKey} onOpen={onOpen} onLogout={onLogout} />;
  }

  return <SharedModule activeKey={activeKey} audience="mobile" />;
}

function CrescerModule({
  session,
  activeKey,
  onOpen,
  onBack,
  onLogout,
  readNotificationTitles,
  onReadNotification
}: {
  session: MobileSession | null;
  activeKey: ModuleKey;
  onOpen: (key: ModuleKey) => void;
  onBack: () => void;
  onLogout: () => void;
  readNotificationTitles: string[];
  onReadNotification: (title: string) => void;
}) {
  if (activeKey === "discoveries") {
    return <DiscoveryScreen session={session} onOpenDiscovery={(discovery) => onOpen(`discovery:${discovery.id}` as ModuleKey)} />;
  }

  if (String(activeKey).startsWith("discovery:")) {
    const discoveryId = String(activeKey).replace("discovery:", "");
    return <DiscoveryDetailScreen session={session} discoveryId={discoveryId} onOpenActivity={(activityId) => onOpen(`activity:${activityId}` as ModuleKey)} />;
  }

  if (activeKey === "activities") {
    return <ActivitiesScreen session={session} onOpenActivity={(activity) => onOpen(`activity:${activity.id}` as ModuleKey)} />;
  }

  if (String(activeKey).startsWith("activity:")) {
    const activityId = String(activeKey).replace("activity:", "");
    return <ActivityDetailScreen session={session} activityId={activityId} />;
  }

  if (activeKey === "library") {
    return <LibraryScreen session={session} onOpenBook={(book) => onOpen(`book:${book.id}` as ModuleKey)} />;
  }

  if (activeKey === "book" || String(activeKey).startsWith("book:")) {
    const bookId = String(activeKey).startsWith("book:") ? String(activeKey).replace("book:", "") : "";
    return <BookViewerScreen session={session} bookId={bookId} />;
  }

  if (activeKey === "games") {
    return <GamesScreen session={session} onOpenGame={(game) => onOpen(`game:${game.id}` as ModuleKey)} />;
  }

  if (String(activeKey).startsWith("game:")) {
    const gameId = String(activeKey).replace("game:", "");
    return <GameDetailScreen session={session} gameId={gameId} />;
  }

  if (activeKey === "achievements") {
    return <AchievementsScreen session={session} onOpenAchievement={(achievement) => onOpen(`achievement:${achievement.id}` as ModuleKey)} />;
  }

  if (String(activeKey).startsWith("achievement:")) {
    const achievementId = String(activeKey).replace("achievement:", "");
    return <AchievementDetailScreen session={session} achievementId={achievementId} />;
  }

  if (activeKey === "agenda") {
    return <AgendaScreen onOpenItem={(item) => onOpen(`agenda:${item.title}` as ModuleKey)} />;
  }

  if (String(activeKey).startsWith("agenda:")) {
    const title = String(activeKey).replace("agenda:", "");
    const allItems = [...demoCollections.agenda.today, ...demoCollections.agenda.upcoming];
    const item = allItems.find((entry) => entry.title === title) ?? allItems[0];
    return <AgendaDetailScreen item={item} onBack={onBack} />;
  }

  if (activeKey === "notifications") {
    return (
      <NotificationsScreen
        readTitles={readNotificationTitles}
        onOpenNotification={(item) => {
          onReadNotification(item.title);
          onOpen(`notification:${item.title}` as ModuleKey);
        }}
      />
    );
  }

  if (String(activeKey).startsWith("notification:")) {
    const title = String(activeKey).replace("notification:", "");
    const item = demoCollections.childNotifications.find((entry) => entry.title === title) ?? demoCollections.childNotifications[0];
    return <NotificationDetailScreen item={item} onBack={onBack} />;
  }

  if (activeKey === "family") {
    return <CrescerFamilyScreen session={session} onOpen={onOpen} />;
  }

  if (String(activeKey).startsWith("family:")) {
    const section = String(activeKey).replace("family:", "");
    return <FamilySectionDetailScreen session={session} section={section} onBack={onBack} />;
  }

  if (activeKey === "profile") {
    return <CrescerProfileScreen session={session} onLogout={onLogout} />;
  }

  return <SharedModule activeKey={activeKey} audience="infantil" />;
}

function FundamentalModule({
  session,
  activeKey,
  onOpen,
  onBack,
  onLogout,
  readNotificationTitles,
  onReadNotification
}: {
  session: MobileSession | null;
  activeKey: ModuleKey;
  onOpen: (key: ModuleKey) => void;
  onBack: () => void;
  onLogout: () => void;
  readNotificationTitles: string[];
  onReadNotification: (title: string) => void;
}) {
  const data = demoCollections.fundamental;

  if (activeKey === "activities") {
    return <FundamentalActivitiesScreen session={session} onOpenActivity={(activity) => onOpen(`activity:${activity.id}` as ModuleKey)} />;
  }

  if (String(activeKey).startsWith("activity:")) {
    const activityId = String(activeKey).replace("activity:", "");
    return <FundamentalActivityDetailScreen session={session} activityId={activityId} />;
  }

  if (activeKey === "library") {
    return <FundamentalLibraryScreen session={session} onOpenBook={(book) => onOpen(`book:${book.id}` as ModuleKey)} />;
  }

  if (activeKey === "book" || String(activeKey).startsWith("book:")) {
    const bookId = String(activeKey).startsWith("book:") ? String(activeKey).replace("book:", "") : "";
    return <BookViewerScreen session={session} bookId={bookId} />;
  }

  if (activeKey === "avalia") {
    return <FundamentalAvaliaScreen session={session} />;
  }

  if (String(activeKey).startsWith("avalia:proof:")) {
    return <EmptyState title="Avaliação indisponível" body="Abra a avaliação pela lista quando ela estiver disponível." />;
  }

  if (String(activeKey).startsWith("avalia:submit:")) {
    return <EmptyState title="Envio indisponível" body="Quando houver uma avaliação publicada, o envio aparece no fluxo da própria avaliação." />;
  }

  if (String(activeKey).startsWith("avalia:result:")) {
    return <EmptyState title="Resultado indisponível" body="Os resultados aparecem quando uma avaliação real for concluída." />;
  }

  if (activeKey === "agenda") {
    return <FundamentalAgendaScreen session={session} onOpenItem={(item) => onOpen(`agenda:${item.title}` as ModuleKey)} onOpenModule={onOpen} />;
  }

  if (String(activeKey).startsWith("agenda:")) {
    const title = String(activeKey).replace("agenda:", "");
    const item = data.agenda.items.find((entry) => entry.title === title) ?? data.agenda.items[0];
    return <FundamentalAgendaDetailScreen item={item} onOpenModule={onOpen} />;
  }

  if (activeKey === "notifications") {
    return (
      <FundamentalNotificationsScreen
        session={session}
        readTitles={readNotificationTitles}
        onOpenNotification={(item) => {
          onReadNotification(item.title);
          onOpen(`notification:${item.title}` as ModuleKey);
        }}
      />
    );
  }

  if (String(activeKey).startsWith("notification:")) {
    const title = String(activeKey).replace("notification:", "");
    const item = data.notificationItems.find((entry) => entry.title === title) ?? data.notificationItems[0];
    return <FundamentalNotificationDetailScreen item={item} onOpenModule={onOpen} />;
  }

  if (activeKey === "profile") {
    return <FundamentalProfileScreen session={session} onOpenModule={onOpen} onOpenAccessibility={() => onOpen("profile:accessibility" as ModuleKey)} onLogout={onLogout} />;
  }

  if (String(activeKey).startsWith("profile:accessibility")) {
    return <FundamentalAccessibilityScreen />;
  }

  return (
    <FundamentalShell title="Aluno Fundamental" intro="Escolha uma área para continuar seus estudos.">
      <ListCard icon="check-square" title="Atividades" subtitle="Propostas e entregas prioritárias." />
      <ListCard icon="book" title="Biblioteca" subtitle="Leituras e materiais de apoio." />
    </FundamentalShell>
  );
}

function CrescerFamilyScreen({ session, onOpen }: { session: MobileSession | null; onOpen: (key: ModuleKey) => void }) {
  const [profile, setProfile] = useState<CrescerStudentProfile | null>(null);
  const [events, setEvents] = useState<CrescerCalendarEvent[]>([]);
  const [messages, setMessages] = useState<CrescerFamilyMessage[]>([]);
  const [notifications, setNotifications] = useState<CrescerNotificationCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    Promise.all([
      getCrescerStudentProfile(session),
      getCrescerCalendarEvents(session).catch(() => []),
      getCrescerFamilyMessages(session).catch(() => []),
      getCrescerNotificationCenter(session).catch(() => [])
    ])
      .then(([studentProfile, calendarEvents, familyMessages, centerItems]) => {
        if (!active) return;
        setProfile(studentProfile);
        setEvents(calendarEvents);
        setMessages(familyMessages);
        setNotifications(centerItems);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const attendance = [
    {
      label: "Frequência",
      value: profile?.attendancePercent == null ? "--" : `${Math.round(profile.attendancePercent)}%`,
      helper: "período atual"
    },
    {
      label: "Presenças",
      value: profile?.presentClasses == null ? "--" : String(profile.presentClasses),
      helper: "aulas registradas"
    },
    {
      label: "Total",
      value: profile?.totalClasses == null ? "--" : String(profile.totalClasses),
      helper: "aulas no período"
    }
  ];
  const unreadMessages = messages.filter((item) => item.unread).length + notifications.filter((item) => item.unread).length;
  const daySummary = unreadMessages > 0
    ? `${unreadMessages} recado${unreadMessages > 1 ? "s" : ""} para acompanhar.`
    : "Não há recados novos para acompanhar agora.";

  return (
    <View>
      <CrescerModuleHero kicker="Família" title="Acompanhamento da criança" body="Resumo simples da rotina, recados e agenda da turma." icon="family" tone="sun" />

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.libraryStateTitle}>Carregando acompanhamento</Text>
          <Text style={styles.libraryStateBody}>Estamos buscando os recados da escola.</Text>
        </View>
      ) : failed || !profile ? (
        <EmptyState title="Acompanhamento indisponível" body="Não foi possível carregar os dados familiares agora." />
      ) : (
        <>
      <View style={styles.familyIdentityCard}>
        <View style={styles.familyAvatar}>
          <Text style={styles.familyAvatarText}>{profile.initials}</Text>
        </View>
        <View style={styles.familyIdentityCopy}>
          <Text style={styles.familyIdentityLabel}>Criança</Text>
          <Text style={styles.familyIdentityName}>{profile.name}</Text>
          <Text style={styles.familyIdentityMeta}>
            {profile.className} · {profile.schoolName}
          </Text>
        </View>
      </View>

      <SectionHeader title="Criança" />
      <View style={styles.familyChildSwitch}>
        <View style={[styles.familyChildChip, styles.familyChildChipActive]}>
          <Text style={[styles.familyChildChipName, styles.familyChildChipNameActive]}>{profile.name}</Text>
          <Text style={[styles.familyChildChipMeta, styles.familyChildChipMetaActive]}>{profile.className}</Text>
        </View>
      </View>

      <View style={styles.familySummaryCard}>
        <Text style={styles.familySectionTitle}>Resumo do dia</Text>
        <Text style={styles.familySectionBody}>{daySummary}</Text>
      </View>

      <SectionHeader title="Frequência" />
      <View style={styles.familyMetricGrid}>
        {attendance.map((item) => (
          <FamilyMetricCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
        ))}
      </View>

      <FamilyPreviewSection title="Minha Semana" action="Ver semana" onPress={() => onOpen("family:week" as ModuleKey)}>
        {events.length > 0 ? (
          events.slice(0, 3).map((item) => (
            <FamilyTimelineCard key={`${item.eventDate}-${item.title}`} mark={formatEventDate(item.eventDate, "short")} title={item.title} meta={`${formatClock(item.startTime)} · ${item.description || item.eventType}`} />
          ))
        ) : (
          <EmptyState title="Sem agenda no período" body="A escola ainda não publicou eventos para esta janela." />
        )}
      </FamilyPreviewSection>

      <FamilyPreviewSection title="Recados" action="Ver todos" onPress={() => onOpen("family:messages" as ModuleKey)}>
        {messages.length > 0 ? (
          messages.map((item) => (
            <FamilyMessageCard key={`${item.title}-${item.date || ""}`} title={item.title} meta={`${item.origin} · ${formatFamilyDate(item.date)}`} unread={item.unread} />
          ))
        ) : (
          <EmptyState title="Sem recados" body="Quando a escola enviar recados, eles aparecem aqui." />
        )}
      </FamilyPreviewSection>

      <FamilyQuickGrid
        items={[
          { title: "Agenda", body: "Eventos e lembretes da turma.", mark: "◷", target: "family:agenda" },
          { title: "Notificações", body: `${notifications.length} ${notifications.length === 1 ? "item" : "itens"} no centro.`, mark: "!", target: "family:notifications" }
        ]}
        onOpen={onOpen}
      />
      <View style={styles.familyReadOnlyNotice}>
        <Text style={styles.familyReadOnlyTitle}>Somente acompanhamento</Text>
        <Text style={styles.familyReadOnlyBody}>Esta área não permite alterar frequência, responder avaliações, registrar diário ou enviar recados como professor.</Text>
      </View>
        </>
      )}
    </View>
  );
}

function FamilyPreviewSection({ title, action, onPress, children }: { title: string; action: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <View>
      <SectionHeader title={title} action={action} />
      <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress} style={styles.familyPreviewList}>
        {children}
      </Pressable>
    </View>
  );
}

function FamilyMetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <View style={styles.familyMetricCard}>
      <Text style={styles.familyMetricValue}>{value}</Text>
      <Text style={styles.familyMetricLabel}>{label}</Text>
      <Text style={styles.familyMetricHelper}>{helper}</Text>
    </View>
  );
}

function FamilyTimelineCard({ mark, title, meta }: { mark: string; title: string; meta: string }) {
  return (
    <View style={styles.familyTimelineCard}>
      <View style={styles.familyTimelineMark}>
        <Text style={styles.familyTimelineMarkText}>{mark}</Text>
      </View>
      <View style={styles.familyTimelineCopy}>
        <Text style={styles.familyTimelineTitle}>{title}</Text>
        <Text style={styles.familyTimelineMeta}>{meta}</Text>
      </View>
    </View>
  );
}

function FamilyMessageCard({ title, meta, unread }: { title: string; meta: string; unread?: boolean }) {
  return (
    <View style={styles.familyMessageCard}>
      <View style={[styles.familyMessageDot, unread ? styles.familyMessageDotUnread : null]} />
      <View style={styles.familyTimelineCopy}>
        <Text style={styles.familyTimelineTitle}>{title}</Text>
        <Text style={styles.familyTimelineMeta}>{meta}</Text>
      </View>
      {unread ? <Text style={styles.familyUnreadText}>Novo</Text> : <Text style={styles.familyReadText}>Lido</Text>}
    </View>
  );
}

function FamilyQuickGrid({ items, onOpen }: { items: Array<{ title: string; body: string; mark: string; target: string }>; onOpen: (key: ModuleKey) => void }) {
  return (
    <View style={styles.familyQuickGrid}>
      {items.map((item) => (
        <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={item.title} onPress={() => onOpen(item.target as ModuleKey)} style={styles.familyQuickCard}>
          <View style={styles.familyQuickMark}>
            <Text style={styles.familyQuickMarkText}>{item.mark}</Text>
          </View>
          <Text style={styles.familyQuickTitle}>{item.title}</Text>
          <Text style={styles.familyQuickBody}>{item.body}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FamilySectionDetailScreen({ session, section, onBack }: { session: MobileSession | null; section: string; onBack: () => void }) {
  const [events, setEvents] = useState<CrescerCalendarEvent[]>([]);
  const [messages, setMessages] = useState<CrescerFamilyMessage[]>([]);
  const [notifications, setNotifications] = useState<CrescerNotificationCenterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const titleMap: Record<string, string> = {
    week: "Minha Semana",
    messages: "Recados",
    agenda: "Agenda",
    notifications: "Notificações",
  };
  const title = titleMap[section] ?? "Família";
  const intro = "Acompanhamento familiar da rotina da criança.";

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    Promise.all([
      getCrescerCalendarEvents(session).catch(() => []),
      getCrescerFamilyMessages(session).catch(() => []),
      getCrescerNotificationCenter(session).catch(() => [])
    ])
      .then(([calendarEvents, familyMessages, centerItems]) => {
        if (!active) return;
        setEvents(calendarEvents);
        setMessages(familyMessages);
        setNotifications(centerItems);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const detailRows =
    section === "messages"
      ? messages.map((item) => ({ mark: item.unread ? "Novo" : "Lido", title: item.title, meta: `${item.origin} · ${formatFamilyDate(item.date)}` }))
      : section === "notifications"
        ? notifications.map((item) => ({ mark: item.unread ? "Novo" : "Lido", title: item.title, meta: `${item.origin} · ${formatFamilyDate(item.deliveredAt)}` }))
        : events.map((item) => ({ mark: formatEventDate(item.eventDate, "short"), title: item.title, meta: `${formatClock(item.startTime)} · ${item.description || item.eventType}` }));

  return (
    <View>
      <CrescerModuleHero kicker="Família" title={title} body={intro} icon="family" tone="sun" />
      <View style={styles.familyDetailList}>
        {loading ? (
          <View style={styles.libraryStateCard}>
            <ActivityIndicator color={colors.brand} />
            <Text style={styles.libraryStateTitle}>Carregando itens</Text>
            <Text style={styles.libraryStateBody}>Estamos buscando as informações da escola.</Text>
          </View>
        ) : failed ? (
          <EmptyState title="Itens indisponíveis" body="Não foi possível carregar esta área agora." />
        ) : detailRows.length > 0 ? (
          detailRows.map((item) => (
            <FamilyTimelineCard key={`${item.mark}-${item.title}-${item.meta}`} mark={item.mark} title={item.title} meta={item.meta} />
          ))
        ) : (
          <EmptyState title="Nada por aqui" body="A escola ainda não publicou itens para esta área." />
        )}
      </View>
      <View style={styles.familyReadOnlyNotice}>
        <Text style={styles.familyReadOnlyTitle}>Somente acompanhamento</Text>
        <Text style={styles.familyReadOnlyBody}>Esta área não permite alterar frequência, responder avaliações, registrar diário ou enviar recados como professor.</Text>
      </View>
      <PrimaryButton label="Voltar" onPress={onBack} />
    </View>
  );
}

function formatEventDate(value: string, mode: "short" | "long" = "long") {
  const date = parseLocalDate(value);
  if (!date) return mode === "short" ? "--" : "Data a confirmar";
  if (mode === "short") {
    return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatFamilyDate(value: string | null) {
  if (!value) return "sem data";
  const date = value.includes("T") ? new Date(value) : parseLocalDate(value);
  if (!date || Number.isNaN(date.getTime())) return "sem data";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatClock(value: string | null) {
  if (!value) return "Horário a confirmar";
  return value.slice(0, 5);
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function FundamentalShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>Aluno Fundamental</Text>
        <Text style={styles.fundamentalShellTitle}>{title}</Text>
        <Text style={styles.fundamentalShellIntro}>{intro}</Text>
      </View>
      <SectionHeader title="Conteúdo" />
      <View style={styles.fundamentalShellList}>{children}</View>
    </View>
  );
}

function FundamentalActivitiesScreen({ session, onOpenActivity }: { session: MobileSession | null; onOpenActivity: (activity: FundamentalActivity) => void }) {
  const [activities, setActivities] = useState<FundamentalActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    void getInstitutionalActivities(session)
      .then((items) => {
        if (active) setActivities(items);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const featured = activities.find((activity) => normalizeFundamentalProgressStatus(activity.progressStatus) === "Em andamento") ?? activities[0];
  const todo = activities.filter((activity) => normalizeFundamentalProgressStatus(activity.progressStatus) === "Nova");
  const inProgress = activities.filter((activity) => normalizeFundamentalProgressStatus(activity.progressStatus) === "Em andamento");
  const completed = activities.filter((activity) => normalizeFundamentalProgressStatus(activity.progressStatus) === "Concluída");

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>Aluno Fundamental</Text>
        <Text style={styles.fundamentalShellTitle}>Atividades</Text>
        <Text style={styles.fundamentalShellIntro}>Organize suas atividades e continue seus estudos.</Text>
      </View>

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.libraryStateTitle}>Carregando atividades</Text>
          <Text style={styles.libraryStateBody}>Estamos buscando as publicações da sua escola.</Text>
        </View>
      ) : failed ? (
        <EmptyState title="Atividades indisponíveis" body="Não foi possível carregar as atividades agora." />
      ) : featured ? (
        <>
          <SectionHeader title="Para fazer agora" />
          <Pressable accessibilityRole="button" accessibilityLabel={`Abrir atividade ${featured.title}`} onPress={() => onOpenActivity(featured)} style={styles.fundamentalFeaturedActivity}>
            <View style={styles.fundamentalFeaturedTop}>
              <View style={styles.fundamentalFeaturedIcon}>
                <Text style={styles.fundamentalFeaturedIconText}>✓</Text>
              </View>
              <View style={styles.fundamentalFeaturedCopy}>
                <Text style={styles.fundamentalActivitySubject}>{featured.schoolYear || "Atividade"}</Text>
                <Text style={styles.fundamentalFeaturedTitle}>{featured.title}</Text>
                <Text style={styles.fundamentalActivityDue}>{formatInstitutionalActivityDate(featured.createdAt)}</Text>
              </View>
              <View style={styles.fundamentalStatePill}>
                <Text style={styles.fundamentalStateText}>{normalizeFundamentalProgressStatus(featured.progressStatus)}</Text>
              </View>
            </View>
            <Text style={styles.fundamentalFeaturedBody}>{featured.description || "Atividade publicada pela escola."}</Text>
            <FundamentalProgress value={progressFromInstitutionalActivity(featured)} />
            <View style={styles.fundamentalFeaturedAction}>
              <Text style={styles.fundamentalFeaturedActionText}>Abrir atividade</Text>
            </View>
          </Pressable>

          <FundamentalActivitySection title="Para fazer" activities={todo} onOpenActivity={onOpenActivity} />
          <FundamentalActivitySection title="Em andamento" activities={inProgress} onOpenActivity={onOpenActivity} />
          <FundamentalActivitySection title="Concluídas" activities={completed} onOpenActivity={onOpenActivity} />
        </>
      ) : (
        <EmptyState title="Sem atividades no momento" body="Quando sua escola publicar atividades para sua turma, elas aparecem aqui." />
      )}
    </View>
  );
}

function FundamentalActivitySection({
  title,
  activities,
  onOpenActivity
}: {
  title: string;
  activities: FundamentalActivity[];
  onOpenActivity: (activity: FundamentalActivity) => void;
}) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionHeader title={title} />
      <View style={styles.fundamentalActivityList}>
        {activities.map((activity) => (
          <FundamentalActivityCard key={activity.id} activity={activity} onPress={() => onOpenActivity(activity)} />
        ))}
      </View>
    </View>
  );
}

function FundamentalActivityDetailScreen({ session, activityId }: { session: MobileSession | null; activityId: string }) {
  const [activity, setActivity] = useState<FundamentalActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session || !activityId) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    void getInstitutionalActivity(session, activityId)
      .then((item) => {
        if (active) setActivity(item);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [activityId, session]);

  if (loading) {
    return (
      <View style={styles.libraryStateCard}>
        <ActivityIndicator color={colors.brand} />
        <Text style={styles.libraryStateTitle}>Carregando atividade</Text>
        <Text style={styles.libraryStateBody}>Estamos abrindo a atividade publicada pela escola.</Text>
      </View>
    );
  }

  if (failed || !activity) {
    return <EmptyState title="Atividade indisponível" body="Não foi possível abrir esta atividade agora." />;
  }

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>{activity.schoolYear || "Atividade"}</Text>
        <Text style={styles.fundamentalShellTitle}>{activity.title}</Text>
        <Text style={styles.fundamentalShellIntro}>{activity.description || "Atividade publicada pela escola."}</Text>
      </View>
      <SectionHeader title="Orientações" />
      <View style={styles.fundamentalActivityDetailCard}>
        <View style={styles.fundamentalActivityDetailRow}>
          <Text style={styles.fundamentalDetailLabel}>Publicação</Text>
          <Text style={styles.fundamentalDetailValue}>{formatInstitutionalActivityDate(activity.createdAt)}</Text>
        </View>
        <View style={styles.fundamentalActivityDetailRow}>
          <Text style={styles.fundamentalDetailLabel}>Estado</Text>
          <Text style={styles.fundamentalDetailValue}>{normalizeFundamentalProgressStatus(activity.progressStatus)}</Text>
        </View>
        <View style={styles.fundamentalActivityDetailRow}>
          <Text style={styles.fundamentalDetailLabel}>Progresso</Text>
          <Text style={styles.fundamentalDetailValue}>{progressFromInstitutionalActivity(activity)}%</Text>
        </View>
        <FundamentalProgress value={progressFromInstitutionalActivity(activity)} />
        <View style={styles.fundamentalDetailAction}>
          <Text style={styles.fundamentalDetailActionText}>Acompanhar atividade</Text>
        </View>
      </View>
    </View>
  );
}

function FundamentalLibraryScreen({ session, onOpenBook }: { session: MobileSession | null; onOpenBook: (book: LibraryBook) => void }) {
  return <LibraryScreen session={session} onOpenBook={onOpenBook} />;
}

function FundamentalBookCard({ book, onPress }: { book: FundamentalBook; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir livro ${book.title}`} onPress={onPress} style={styles.fundamentalBookCard}>
      <FundamentalBookCover book={book} />
      <Text style={styles.fundamentalBookCategory}>{book.category}</Text>
      <Text style={styles.fundamentalBookCardTitle}>{book.title}</Text>
      <Text style={styles.fundamentalBookCardBody}>{book.description}</Text>
      {book.progress > 0 ? <FundamentalProgress value={book.progress} compact /> : null}
    </Pressable>
  );
}

function FundamentalBookCover({ book, size = "default" }: { book: FundamentalBook; size?: "default" | "large" }) {
  return (
    <View style={[styles.fundamentalBookCover, size === "large" && styles.fundamentalBookCoverLarge, getFundamentalBookToneStyle(book.tone)]}>
      <Text style={[styles.fundamentalBookCoverText, size === "large" && styles.fundamentalBookCoverTextLarge]}>{book.cover}</Text>
      <View style={styles.fundamentalBookCoverLine} />
    </View>
  );
}

function FundamentalCategoryPill({ category }: { category: FundamentalBookCategory }) {
  return (
    <View style={styles.fundamentalCategoryPill}>
      <Text style={styles.fundamentalCategoryText}>{category}</Text>
    </View>
  );
}

function FundamentalBookReaderScreen({ book }: { book: FundamentalBook }) {
  return (
    <View>
      <View style={styles.fundamentalReaderHero}>
        <FundamentalBookCover book={book} size="large" />
        <Text style={styles.fundamentalBookCategory}>{book.category}</Text>
        <Text style={styles.fundamentalReaderTitle}>{book.title}</Text>
        <Text style={styles.fundamentalReaderMeta}>Página {book.page}</Text>
      </View>

      <View style={styles.fundamentalReaderSurface}>
        <Text style={styles.fundamentalReaderKicker}>Leitura orientada</Text>
        <Text style={styles.fundamentalReaderText}>{book.sample}</Text>
      </View>

      <View style={styles.fundamentalReaderControls}>
        <Pressable accessibilityRole="button" accessibilityLabel="Página anterior" style={styles.fundamentalReaderButton}>
          <Text style={styles.fundamentalReaderButtonText}>Anterior</Text>
        </Pressable>
        <Text style={styles.fundamentalReaderProgress}>{book.progress > 0 ? `${book.progress}%` : "Início"}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Próxima página" style={styles.fundamentalReaderButton}>
          <Text style={styles.fundamentalReaderButtonText}>Próxima</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getFundamentalBookToneStyle(tone: FundamentalBook["tone"]) {
  if (tone === "green") {
    return styles.fundamentalBookToneGreen;
  }

  if (tone === "gold") {
    return styles.fundamentalBookToneGold;
  }

  if (tone === "coral") {
    return styles.fundamentalBookToneCoral;
  }

  return styles.fundamentalBookToneBlue;
}

function FundamentalAvaliaScreen({ session }: { session: MobileSession | null }) {
  const [assessments, setAssessments] = useState<FundamentalAssessmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      setFailed(true);
      return;
    }
    setLoading(true);
    setFailed(false);
    void getStudentAssessmentAssignments(session)
      .then((items) => {
        if (active) setAssessments(items);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const available = assessments.filter((assessment) => normalizeAssessmentState(assessment) === "Disponível");
  const inProgress = assessments.filter((assessment) => normalizeAssessmentState(assessment) === "Em andamento");
  const completed = assessments.filter((assessment) => normalizeAssessmentState(assessment) === "Concluída");

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>Aluno Fundamental</Text>
        <Text style={styles.fundamentalShellTitle}>Avalia+</Text>
        <Text style={styles.fundamentalShellIntro}>Acompanhe suas avaliações e resultados.</Text>
      </View>

      <View style={styles.assessmentSummaryGrid}>
        <AssessmentSummaryCard label="Disponíveis" value={available.length} />
        <AssessmentSummaryCard label="Em andamento" value={inProgress.length} />
        <AssessmentSummaryCard label="Concluídas" value={completed.length} />
      </View>

      {loading ? (
        <View style={styles.libraryStateCard}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.libraryStateTitle}>Carregando avaliações</Text>
          <Text style={styles.libraryStateBody}>Estamos buscando as avaliações publicadas pela escola.</Text>
        </View>
      ) : failed ? (
        <EmptyState title="Avalia+ indisponível" body="Não foi possível carregar as avaliações agora." />
      ) : assessments.length === 0 ? (
        <EmptyState title="Sem avaliações no momento" body="Quando sua escola publicar avaliações para sua turma, elas aparecem aqui." />
      ) : (
        <>
          <FundamentalAssessmentSection title="Disponíveis" assessments={available} />
          <FundamentalAssessmentSection title="Em andamento" assessments={inProgress} />
          <FundamentalAssessmentSection title="Concluídas" assessments={completed} />
        </>
      )}
    </View>
  );
}

function AssessmentSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.assessmentSummaryCard}>
      <Text style={styles.assessmentSummaryValue}>{value}</Text>
      <Text style={styles.assessmentSummaryLabel}>{label}</Text>
    </View>
  );
}

function FundamentalAssessmentSection({
  title,
  assessments
}: {
  title: string;
  assessments: FundamentalAssessmentItem[];
}) {
  if (assessments.length === 0) {
    return null;
  }

  return (
    <View>
      <SectionHeader title={title} />
      <View style={styles.assessmentList}>
        {assessments.map((assessment) => (
          <FundamentalAssessmentCard
            key={assessment.id}
            assessment={assessment}
          />
        ))}
      </View>
    </View>
  );
}

function FundamentalAssessmentCard({ assessment }: { assessment: FundamentalAssessmentItem }) {
  const progress = assessment.questionCount > 0 ? Math.round((assessment.answeredCount / assessment.questionCount) * 100) : 0;
  const state = normalizeAssessmentState(assessment);
  return (
    <View style={styles.assessmentCard}>
      <View style={styles.assessmentCardTop}>
        <View style={styles.assessmentIcon}>
          <Text style={styles.assessmentIconText}>A+</Text>
        </View>
        <View style={styles.assessmentCardCopy}>
          <Text style={styles.assessmentSubject}>{assessment.component || assessment.schoolYear || "Avaliação"}</Text>
          <Text style={styles.assessmentTitle}>{assessment.title}</Text>
          <Text style={styles.assessmentMeta}>{assessment.questionCount || 0} questões · {formatAssessmentAvailability(assessment)}</Text>
        </View>
        <View style={styles.assessmentStatePill}>
          <Text style={styles.assessmentStateText}>{state}</Text>
        </View>
      </View>
      {state === "Em andamento" ? <FundamentalProgress value={progress} /> : null}
      <View style={styles.assessmentAction}>
        <Text style={styles.assessmentActionText}>{state === "Concluída" ? "Resultado disponível" : "Aguardar orientação"}</Text>
      </View>
    </View>
  );
}

function normalizeAssessmentState(assessment: FundamentalAssessmentItem) {
  const status = `${assessment.attemptStatus || assessment.status}`.toLowerCase();
  if (status === "completed" || status === "submitted" || status === "concluida" || status === "concluída") return "Concluída";
  if (status === "in_progress" || status === "started" || status === "em_andamento" || assessment.answeredCount > 0) return "Em andamento";
  return "Disponível";
}

function formatAssessmentAvailability(assessment: FundamentalAssessmentItem) {
  const dateValue = assessment.availableUntil || assessment.availableFrom;
  if (!dateValue) return "Sem prazo publicado";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Sem prazo publicado";
  return assessment.availableUntil
    ? `até ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`
    : `desde ${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
}

function FundamentalAssessmentQuestionScreen({ assessment, onSubmit }: { assessment: FundamentalAssessment; onSubmit: () => void }) {
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({ 1: assessment.options[1] ?? assessment.options[0] });
  const selectedOption = answers[currentQuestion];
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / assessment.questions) * 100);
  const canGoBack = currentQuestion > 1;
  const canGoNext = currentQuestion < assessment.questions;

  return (
    <View>
      <View style={styles.assessmentQuestionHeader}>
        <Text style={styles.fundamentalKicker}>{assessment.subject}</Text>
        <Text style={styles.assessmentQuestionTitle}>{assessment.title}</Text>
        <Text style={styles.assessmentQuestionMeta}>Questão {currentQuestion} de {assessment.questions}</Text>
        <FundamentalProgress value={progress} />
      </View>

      <View style={styles.questionCard}>
        <Text style={styles.questionProgressText}>{answered} de {assessment.questions} respondidas</Text>
        <Text style={styles.questionStatement}>{assessment.statement}</Text>
      </View>

      <SectionHeader title="Alternativas" />
      <View style={styles.answerList}>
        {assessment.options.map((option, index) => {
          const selected = option === selectedOption;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Alternativa ${index + 1}: ${option}`}
              key={option}
              onPress={() => setAnswers((current) => ({ ...current, [currentQuestion]: option }))}
              style={[styles.answerOption, selected && styles.answerOptionSelected]}
            >
              <View style={[styles.answerOptionMark, selected && styles.answerOptionMarkSelected]}>
                <Text style={[styles.answerOptionMarkText, selected && styles.answerOptionMarkTextSelected]}>{String.fromCharCode(65 + index)}</Text>
              </View>
              <Text style={styles.answerOptionText}>{option}</Text>
              {selected ? <Text style={styles.answerSelectedText}>Selecionada</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.assessmentNavigationRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Questão anterior"
          disabled={!canGoBack}
          onPress={() => setCurrentQuestion((question) => Math.max(1, question - 1))}
          style={[styles.assessmentSecondaryButton, !canGoBack && styles.assessmentSecondaryButtonDisabled]}
        >
          <Text style={styles.assessmentSecondaryButtonText}>Anterior</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Próxima questão"
          disabled={!canGoNext}
          onPress={() => setCurrentQuestion((question) => Math.min(assessment.questions, question + 1))}
          style={[styles.assessmentSecondaryButton, !canGoNext && styles.assessmentSecondaryButtonDisabled]}
        >
          <Text style={styles.assessmentSecondaryButtonText}>Próxima</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Enviar avaliação" onPress={onSubmit} style={styles.assessmentSubmitButton}>
        <Text style={styles.assessmentSubmitButtonText}>Enviar avaliação</Text>
      </Pressable>
    </View>
  );
}

function FundamentalAssessmentSubmitScreen({
  assessment,
  onReview,
  onResult
}: {
  assessment: FundamentalAssessment;
  onReview: () => void;
  onResult: () => void;
}) {
  const answered = assessment.questions;
  const unanswered = 0;
  return (
    <View>
      <View style={styles.submitConfirmCard}>
        <Text style={styles.fundamentalKicker}>Revisão final</Text>
        <Text style={styles.submitConfirmTitle}>Enviar avaliação?</Text>
        <Text style={styles.submitConfirmBody}>Confira suas respostas antes de finalizar. Depois do envio, o resultado aparece nesta área.</Text>
        <View style={styles.submitStatsRow}>
          <View style={styles.submitStatCard}>
            <Text style={styles.submitStatValue}>{answered}</Text>
            <Text style={styles.submitStatLabel}>Respondidas</Text>
          </View>
          <View style={styles.submitStatCard}>
            <Text style={styles.submitStatValue}>{unanswered}</Text>
            <Text style={styles.submitStatLabel}>Não respondidas</Text>
          </View>
        </View>
      </View>
      <View style={styles.submitActionRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Revisar avaliação" onPress={onReview} style={styles.reviewButton}>
          <Text style={styles.reviewButtonText}>Revisar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar e ver resultado" onPress={onResult} style={styles.sendButton}>
          <Text style={styles.sendButtonText}>Enviar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function FundamentalAssessmentResultScreen({ assessment, onBackToAvalia }: { assessment: FundamentalAssessment; onBackToAvalia: () => void }) {
  const score = assessment.score ?? 60;
  const correct = Math.round((score / 100) * assessment.questions);
  const wrong = assessment.questions - correct;

  return (
    <View>
      <View style={styles.resultHero}>
        <Text style={styles.fundamentalKicker}>Resultado</Text>
        <Text style={styles.resultScore}>{score}%</Text>
        <Text style={styles.resultTitle}>Você concluiu a avaliação.</Text>
        <Text style={styles.resultBody}>Use o resultado para revisar com calma e continuar avançando nos estudos.</Text>
      </View>

      <View style={styles.resultStatsGrid}>
        <ResultStatCard label="Acertos" value={correct} />
        <ResultStatCard label="Erros" value={wrong} />
        <ResultStatCard label="Questões" value={assessment.questions} />
      </View>

      <SectionHeader title="Habilidades trabalhadas" />
      <View style={styles.bnccCard}>
        {assessment.skills.map((skill) => (
          <View key={skill} style={styles.bnccPill}>
            <Text style={styles.bnccPillText}>{skill}</Text>
          </View>
        ))}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para Avalia+" onPress={onBackToAvalia} style={styles.assessmentSubmitButton}>
        <Text style={styles.assessmentSubmitButtonText}>Voltar para Avalia+</Text>
      </Pressable>
    </View>
  );
}

function ResultStatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.resultStatCard}>
      <Text style={styles.resultStatValue}>{value}</Text>
      <Text style={styles.resultStatLabel}>{label}</Text>
    </View>
  );
}

function FundamentalAgendaScreen({
  session,
  onOpenItem,
  onOpenModule
}: {
  session: MobileSession | null;
  onOpenItem: (item: FundamentalAgendaItem) => void;
  onOpenModule: (key: ModuleKey) => void;
}) {
  const [items, setItems] = useState<FundamentalAgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FundamentalAgendaFilter>("Tudo");

  useEffect(() => {
    let active = true;
    if (!session) {
      setItems([]);
      setFailed(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    void getCrescerCalendarEvents(session)
      .then((events) => {
        if (active) setItems(events.map(mapCalendarEventToFundamentalAgenda));
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const filters: FundamentalAgendaFilter[] = ["Tudo", "Atividades", "Avaliações", "Eventos"];
  const todayItems = items.filter((item) => item.isToday);
  const filteredItems = items.filter((item) => {
    if (activeFilter === "Tudo") {
      return true;
    }

    if (activeFilter === "Atividades") {
      return item.type === "Atividade";
    }

    if (activeFilter === "Avaliações") {
      return item.type === "Avaliação";
    }

    return item.type === "Evento";
  });

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>Aluno Fundamental</Text>
        <Text style={styles.fundamentalShellTitle}>Agenda</Text>
        <Text style={styles.fundamentalShellIntro}>Acompanhe seus compromissos, atividades e avaliações.</Text>
      </View>

      <SectionHeader title="Hoje" />
      <View style={styles.fundamentalAgendaTodayCard}>
        {loading ? (
          <Text style={styles.fundamentalAgendaEmptyText}>Carregando agenda...</Text>
        ) : failed ? (
          <Text style={styles.fundamentalAgendaEmptyText}>Não foi possível abrir a agenda agora.</Text>
        ) : todayItems.length === 0 ? (
          <Text style={styles.fundamentalAgendaEmptyText}>Você não tem compromissos para hoje.</Text>
        ) : (
          todayItems.map((item) => (
            <FundamentalAgendaCompactItem
              key={item.title}
              item={item}
              onPress={() => (item.actionTarget === "avalia" ? onOpenModule("avalia") : item.actionTarget === "activities" ? onOpenModule("activities") : onOpenItem(item))}
            />
          ))
        )}
      </View>

      <SectionHeader title="Filtros" />
      <View style={styles.fundamentalAgendaFilterRow}>
        {filters.map((filter) => {
          const active = filter === activeFilter;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${filter}`}
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.fundamentalAgendaFilter, active && styles.fundamentalAgendaFilterActive]}
            >
              <Text style={[styles.fundamentalAgendaFilterText, active && styles.fundamentalAgendaFilterTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Próximos compromissos" />
      {loading || failed || filteredItems.length === 0 ? (
        <View style={styles.fundamentalAgendaTodayCard}>
          <Text style={styles.fundamentalAgendaEmptyText}>{loading ? "Carregando compromissos..." : failed ? "Agenda indisponível no momento." : "Nenhum compromisso publicado para este filtro."}</Text>
        </View>
      ) : (
        <View style={styles.fundamentalAgendaList}>
          {filteredItems.map((item) => (
          <FundamentalAgendaCard
            key={`${item.type}-${item.title}`}
            item={item}
            onPress={() => onOpenItem(item)}
            onAction={() => (item.actionTarget === "avalia" ? onOpenModule("avalia") : item.actionTarget === "activities" ? onOpenModule("activities") : onOpenItem(item))}
          />
          ))}
        </View>
      )}
    </View>
  );
}

function mapCalendarEventToFundamentalAgenda(event: CrescerCalendarEvent): FundamentalAgendaItem {
  const type = event.eventType === "assessment" ? "Avaliação" : event.eventType === "activity" ? "Atividade" : "Evento";
  const date = parseLocalDate(event.eventDate);
  const today = new Date();
  const isToday = date ? date.toDateString() === today.toDateString() : false;
  return {
    title: event.title,
    type,
    subject: event.actionLabel || "Escola",
    date: date ? date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Data",
    time: formatClock(event.startTime),
    due: isToday ? "Hoje" : "Publicado",
    description: event.description,
    priority: isToday,
    isToday,
    action: "Ver detalhes",
    actionTarget: "details",
    mark: type === "Avaliação" ? "A+" : type === "Atividade" ? "✓" : "◷"
  };
}

function FundamentalAgendaCompactItem({ item, onPress }: { item: FundamentalAgendaItem; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${item.action} ${item.title}`} onPress={onPress} style={styles.fundamentalAgendaCompactItem}>
      <View style={styles.fundamentalAgendaTypeMark}>
        <Text style={styles.fundamentalAgendaTypeMarkText}>{item.mark}</Text>
      </View>
      <View style={styles.fundamentalAgendaCompactCopy}>
        <Text style={styles.fundamentalAgendaTypeText}>{item.type}</Text>
        <Text style={styles.fundamentalAgendaCompactTitle}>{item.title}</Text>
        <Text style={styles.fundamentalAgendaMetaText}>{item.subject} · {item.time}</Text>
      </View>
      <Text style={styles.fundamentalAgendaActionText}>{item.action}</Text>
    </Pressable>
  );
}

function FundamentalAgendaCard({
  item,
  onPress,
  onAction
}: {
  item: FundamentalAgendaItem;
  onPress: () => void;
  onAction: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir compromisso ${item.title}`} onPress={onPress} style={styles.fundamentalAgendaCard}>
      <View style={styles.fundamentalAgendaCardTop}>
        <View style={styles.fundamentalAgendaTypeMark}>
          <Text style={styles.fundamentalAgendaTypeMarkText}>{item.mark}</Text>
        </View>
        <View style={styles.fundamentalAgendaCardCopy}>
          <View style={styles.fundamentalAgendaTypeRow}>
            <Text style={styles.fundamentalAgendaTypeText}>{item.type}</Text>
            {item.priority ? <Text style={styles.fundamentalAgendaPriority}>Hoje</Text> : null}
          </View>
          <Text style={styles.fundamentalAgendaCardTitle}>{item.title}</Text>
          <Text style={styles.fundamentalAgendaMetaText}>{item.subject} · {item.date} · {item.time}</Text>
        </View>
      </View>
      <Text style={styles.fundamentalAgendaDescription}>{item.description}</Text>
      <View style={styles.fundamentalAgendaFooter}>
        <Text style={styles.fundamentalAgendaDueText}>{item.due}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={item.action} onPress={onAction} style={styles.fundamentalAgendaAction}>
          <Text style={styles.fundamentalAgendaActionButtonText}>{item.action}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function FundamentalAgendaDetailScreen({ item, onOpenModule }: { item: FundamentalAgendaItem; onOpenModule: (key: ModuleKey) => void }) {
  const target = item.actionTarget === "avalia" ? "avalia" : item.actionTarget === "activities" ? "activities" : null;

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>{item.type}</Text>
        <Text style={styles.fundamentalShellTitle}>{item.title}</Text>
        <Text style={styles.fundamentalShellIntro}>{item.description}</Text>
      </View>

      <View style={styles.fundamentalAgendaDetailCard}>
        <View style={styles.fundamentalAgendaDetailHeader}>
          <View style={styles.fundamentalAgendaTypeMark}>
            <Text style={styles.fundamentalAgendaTypeMarkText}>{item.mark}</Text>
          </View>
          <View style={styles.fundamentalAgendaCardCopy}>
            <Text style={styles.fundamentalAgendaTypeText}>{item.subject}</Text>
            <Text style={styles.fundamentalAgendaDetailTitle}>{item.date} · {item.time}</Text>
          </View>
        </View>
        <View style={styles.fundamentalActivityDetailRow}>
          <Text style={styles.fundamentalDetailLabel}>Tipo</Text>
          <Text style={styles.fundamentalDetailValue}>{item.type}</Text>
        </View>
        <View style={styles.fundamentalActivityDetailRow}>
          <Text style={styles.fundamentalDetailLabel}>Prazo</Text>
          <Text style={styles.fundamentalDetailValue}>{item.due}</Text>
        </View>
        <View style={styles.fundamentalAgendaDescriptionBlock}>
          <Text style={styles.fundamentalDetailLabel}>Descrição</Text>
          <Text style={styles.fundamentalAgendaDescriptionText}>{item.description}</Text>
        </View>
        {target ? (
          <Pressable accessibilityRole="button" accessibilityLabel={item.action} onPress={() => onOpenModule(target)} style={styles.fundamentalDetailAction}>
            <Text style={styles.fundamentalDetailActionText}>{item.action}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function FundamentalNotificationsScreen({
  session,
  readTitles,
  onOpenNotification
}: {
  session: MobileSession | null;
  readTitles: string[];
  onOpenNotification: (item: FundamentalNotification) => void;
}) {
  const [items, setItems] = useState<FundamentalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FundamentalNotificationFilter>("Tudo");

  useEffect(() => {
    let active = true;
    if (!session) {
      setItems([]);
      setFailed(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFailed(false);
    void getCrescerNotificationCenter(session)
      .then((notifications) => {
        if (active) setItems(notifications.map(mapNotificationToFundamental));
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const filters: FundamentalNotificationFilter[] = ["Tudo", "Recados", "Agenda", "Avalia+"];
  const unreadCount = items.filter((item) => item.unread && !readTitles.includes(item.title)).length;
  const filteredItems = items.filter((item) => {
    if (activeFilter === "Tudo") {
      return true;
    }

    if (activeFilter === "Recados") {
      return item.type === "Recado";
    }

    if (activeFilter === "Agenda") {
      return item.type === "Agenda";
    }

    return item.type === "Avalia+";
  });

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>Aluno Fundamental</Text>
        <Text style={styles.fundamentalShellTitle}>Notificações</Text>
        <Text style={styles.fundamentalShellIntro}>Acompanhe recados, prazos e novidades importantes.</Text>
      </View>

      <View style={styles.fundamentalNotificationSummary}>
        <View>
          <Text style={styles.fundamentalNotificationSummaryLabel}>Novidades</Text>
          <Text style={styles.fundamentalNotificationSummaryTitle}>
            {unreadCount > 0 ? `${unreadCount} ${unreadCount === 1 ? "nova" : "novas"}` : "Tudo em dia"}
          </Text>
        </View>
        {unreadCount > 0 ? (
          <View style={styles.fundamentalNotificationBadge}>
            <Text style={styles.fundamentalNotificationBadgeText}>{unreadCount}</Text>
          </View>
        ) : null}
      </View>

      <SectionHeader title="Filtros" />
      <View style={styles.fundamentalNotificationFilterRow}>
        {filters.map((filter) => {
          const active = filter === activeFilter;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filtrar notificações por ${filter}`}
              key={filter}
              onPress={() => setActiveFilter(filter)}
              style={[styles.fundamentalNotificationFilter, active && styles.fundamentalNotificationFilterActive]}
            >
              <Text style={[styles.fundamentalNotificationFilterText, active && styles.fundamentalNotificationFilterTextActive]}>{filter}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Últimas notificações" />
      {loading || failed || filteredItems.length === 0 ? (
        <View style={styles.fundamentalNotificationEmptyCard}>
          <Text style={styles.fundamentalNotificationEmptyText}>{loading ? "Carregando notificações..." : failed ? "Notificações indisponíveis no momento." : "Você não tem novas notificações."}</Text>
        </View>
      ) : (
        <View style={styles.fundamentalNotificationList}>
          {filteredItems.map((item) => {
            const unread = item.unread && !readTitles.includes(item.title);
            return <FundamentalNotificationCard key={`${item.type}-${item.title}`} item={item} unread={unread} onPress={() => onOpenNotification(item)} />;
          })}
        </View>
      )}
    </View>
  );
}

function mapNotificationToFundamental(item: CrescerNotificationCenterItem): FundamentalNotification {
  const type = item.origin.toLowerCase().includes("agenda") ? "Agenda" : item.origin.toLowerCase().includes("avalia") ? "Avalia+" : "Recado";
  return {
    title: item.title,
    summary: item.summary,
    origin: item.origin,
    time: item.deliveredAt ? new Date(item.deliveredAt).toLocaleDateString("pt-BR") : "Agora",
    unread: item.unread,
    type,
    mark: type === "Avalia+" ? "A+" : type === "Agenda" ? "◷" : "!",
    action: "Ler recado",
    actionTarget: "details",
    message: item.summary
  };
}

function FundamentalNotificationCard({
  item,
  unread,
  onPress
}: {
  item: FundamentalNotification;
  unread: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir notificação ${item.title}`} onPress={onPress} style={[styles.fundamentalNotificationCard, unread && styles.fundamentalNotificationCardUnread]}>
      <View style={styles.fundamentalNotificationTop}>
        <View style={styles.fundamentalNotificationMark}>
          <Text style={styles.fundamentalNotificationMarkText}>{item.mark}</Text>
        </View>
        <View style={styles.fundamentalNotificationCopy}>
          <View style={styles.fundamentalNotificationTypeRow}>
            <Text style={styles.fundamentalNotificationType}>{item.type}</Text>
            {unread ? <Text style={styles.fundamentalNotificationUnreadPill}>Nova</Text> : null}
          </View>
          <Text style={styles.fundamentalNotificationTitle}>{item.title}</Text>
          <Text style={styles.fundamentalNotificationSummaryText}>{item.summary}</Text>
          <Text style={styles.fundamentalNotificationMeta}>{item.origin} · {item.time}</Text>
        </View>
      </View>
      <Text style={styles.fundamentalNotificationActionText}>{item.action}</Text>
    </Pressable>
  );
}

function FundamentalNotificationDetailScreen({ item, onOpenModule }: { item: FundamentalNotification; onOpenModule: (key: ModuleKey) => void }) {
  const target = item.actionTarget === "agenda" ? "agenda" : item.actionTarget === "avalia" ? "avalia" : item.actionTarget === "activities" ? "activities" : null;

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>{item.type}</Text>
        <Text style={styles.fundamentalShellTitle}>{item.title}</Text>
        <Text style={styles.fundamentalShellIntro}>{item.summary}</Text>
      </View>

      <View style={styles.fundamentalNotificationDetailCard}>
        <View style={styles.fundamentalNotificationDetailHeader}>
          <View style={styles.fundamentalNotificationMark}>
            <Text style={styles.fundamentalNotificationMarkText}>{item.mark}</Text>
          </View>
          <View style={styles.fundamentalNotificationCopy}>
            <Text style={styles.fundamentalNotificationType}>{item.origin}</Text>
            <Text style={styles.fundamentalNotificationDetailTime}>{item.time}</Text>
          </View>
        </View>
        <Text style={styles.fundamentalNotificationMessage}>{item.message}</Text>
        {target ? (
          <Pressable accessibilityRole="button" accessibilityLabel={item.action} onPress={() => onOpenModule(target)} style={styles.fundamentalNotificationPrimaryAction}>
            <Text style={styles.fundamentalNotificationPrimaryActionText}>{item.action}</Text>
          </Pressable>
        ) : (
          <View style={styles.fundamentalNotificationReadOnlyAction}>
            <Text style={styles.fundamentalNotificationReadOnlyActionText}>Recado lido</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function FundamentalProfileScreen({
  session,
  onOpenModule,
  onOpenAccessibility,
  onLogout
}: {
  session: MobileSession | null;
  onOpenModule: (key: ModuleKey) => void;
  onOpenAccessibility: () => void;
  onLogout: () => void;
}) {
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getStudentProfile(session)
      .then((nextProfile) => {
        if (active) setStudentProfile(nextProfile);
      })
      .catch(() => {
        if (active) setStudentProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const profile = demoCollections.fundamental.profile;
  const realName = studentProfile?.name || "Contexto indisponível";
  const realClass = studentProfile?.className || "Turma não carregada";
  const realSchool = studentProfile?.schoolName || "Escola não carregada";
  const realInitials = studentProfile?.initials || "--";

  function handleSetting(setting: FundamentalProfileSetting) {
    if (setting.target === "notifications") {
      onOpenModule("notifications");
      return;
    }

    if (setting.target === "accessibility") {
      onOpenAccessibility();
    }
  }

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>Aluno Fundamental</Text>
        <Text style={styles.fundamentalShellTitle}>Meu perfil</Text>
        <Text style={styles.fundamentalShellIntro}>{loading ? "Carregando dados do aluno." : "Dados institucionais vinculados ao seu acesso."}</Text>
      </View>

      <View style={styles.fundamentalProfileIdentityCard}>
        <View style={styles.fundamentalProfileIdentityTop}>
          <View style={styles.fundamentalProfileAvatar}>
            <Text style={styles.fundamentalProfileAvatarText}>{realInitials}</Text>
          </View>
          <View style={styles.fundamentalProfileIdentityCopy}>
            <Text style={styles.fundamentalProfileLabel}>{profile.institutionLabel}</Text>
            <Text style={styles.fundamentalProfileName}>{realName}</Text>
            <Text style={styles.fundamentalProfileMeta}>{realClass}</Text>
          </View>
        </View>
        <View style={styles.fundamentalProfileSchoolLine}>
          <Text style={styles.fundamentalProfileSchoolText}>{realSchool}</Text>
        </View>
      </View>

      <SectionHeader title="Minha escola" />
      <View style={styles.fundamentalProfileSchoolCard}>
        <Text style={styles.fundamentalProfileSchoolTitle}>{realSchool}</Text>
        <View style={styles.fundamentalProfileSchoolInfoRow}>
          <Text style={styles.fundamentalProfileSchoolInfoLabel}>Turma</Text>
          <Text style={styles.fundamentalProfileSchoolInfoValue}>{realClass}</Text>
        </View>
      </View>

      <SectionHeader title="Meus estudos" />
      <View style={styles.fundamentalProfileShortcutGrid}>
        {profile.studies.map((study) => (
          <FundamentalProfileStudyShortcut key={study.title} study={study} onPress={() => onOpenModule(study.target as ModuleKey)} />
        ))}
      </View>

      <SectionHeader title="Configurações" />
      <View style={styles.fundamentalProfileSettingsCard}>
        {profile.settings.map((setting) => (
          <FundamentalProfileSettingRow key={setting.title} setting={setting} onPress={() => handleSetting(setting)} />
        ))}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Sair" onPress={onLogout} style={styles.fundamentalProfileLogout}>
        <Text style={styles.fundamentalProfileLogoutText}>Sair</Text>
      </Pressable>
    </View>
  );
}

function FundamentalProfileProgressCard({ item }: { item: FundamentalProfileProgress }) {
  return (
    <View style={styles.fundamentalProfileProgressCard}>
      <View style={styles.fundamentalProfileProgressMark}>
        <Text style={styles.fundamentalProfileProgressMarkText}>{item.mark}</Text>
      </View>
      <Text style={styles.fundamentalProfileProgressValue}>{item.value}</Text>
      <Text style={styles.fundamentalProfileProgressLabel}>{item.label}</Text>
      <Text style={styles.fundamentalProfileProgressHelper}>{item.helper}</Text>
    </View>
  );
}

function FundamentalProfileStudyShortcut({ study, onPress }: { study: FundamentalProfileStudy; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir ${study.title}`} onPress={onPress} style={styles.fundamentalProfileShortcut}>
      <View style={styles.fundamentalProfileShortcutMark}>
        <Text style={styles.fundamentalProfileShortcutMarkText}>{study.mark}</Text>
      </View>
      <Text style={styles.fundamentalProfileShortcutTitle}>{study.title}</Text>
      <Text style={styles.fundamentalProfileShortcutBody}>{study.description}</Text>
    </Pressable>
  );
}

function FundamentalProfileSettingRow({ setting, onPress }: { setting: FundamentalProfileSetting; onPress: () => void }) {
  const disabled = setting.target === "sound";

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={setting.title} onPress={onPress} disabled={disabled} style={[styles.fundamentalProfileSettingRow, disabled && styles.fundamentalProfileSettingRowDisabled]}>
      <View style={styles.fundamentalProfileSettingMark}>
        <Text style={styles.fundamentalProfileSettingMarkText}>{setting.mark}</Text>
      </View>
      <View style={styles.fundamentalProfileSettingCopy}>
        <Text style={styles.fundamentalProfileSettingTitle}>{setting.title}</Text>
        <Text style={styles.fundamentalProfileSettingBody}>{setting.description}</Text>
      </View>
      <Text style={styles.fundamentalProfileSettingChevron}>{disabled ? "Em breve" : "›"}</Text>
    </Pressable>
  );
}

function FundamentalAccessibilityScreen() {
  const profile = demoCollections.fundamental.profile;

  return (
    <View>
      <View style={styles.fundamentalShellHero}>
        <Text style={styles.fundamentalKicker}>Configurações</Text>
        <Text style={styles.fundamentalShellTitle}>Acessibilidade</Text>
        <Text style={styles.fundamentalShellIntro}>Ajustes visuais preparados para deixar a leitura mais confortável.</Text>
      </View>

      <View style={styles.fundamentalAccessibilityList}>
        {profile.accessibility.map((item) => (
          <View key={item.title} style={styles.fundamentalAccessibilityCard}>
            <View style={styles.fundamentalProfileSettingMark}>
              <Text style={styles.fundamentalProfileSettingMarkText}>{item.mark}</Text>
            </View>
            <View style={styles.fundamentalProfileSettingCopy}>
              <Text style={styles.fundamentalProfileSettingTitle}>{item.title}</Text>
              <Text style={styles.fundamentalProfileSettingBody}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function TeacherModule({ session, activeKey, onOpen, onLogout }: { session: MobileSession | null; activeKey: ModuleKey; onOpen: (key: ModuleKey) => void; onLogout: () => void }) {
  const [operationalClasses, setOperationalClasses] = useState<TeacherClassSummary[]>([]);
  const [teacherClassRows, setTeacherClassRows] = useState<TeacherMobileClass[]>([]);
  const [teacherStudentsByClassId, setTeacherStudentsByClassId] = useState<Record<string, RealTeacherClassStudent[]>>({});
  const [teacherContext, setTeacherContext] = useState<{ teacherName: string; schoolName: string; discipline: string | null; activeClassLinks: number } | null>(null);
  const [teacherHomeSummary, setTeacherHomeSummary] = useState<TeacherHomeSummary | null>(null);
  const [teacherNotifications, setTeacherNotifications] = useState<TeacherNotificationCenterItem[]>([]);
  const [teacherAssessments, setTeacherAssessments] = useState<TeacherAvaliaAssessment[]>([]);
  const [trackingOverview, setTrackingOverview] = useState<TeacherTrackingOverview | null>(null);
  const [trackingAlerts, setTrackingAlerts] = useState<RealTeacherTrackingAlert[]>([]);
  const [operationalLoading, setOperationalLoading] = useState(true);
  const [operationalError, setOperationalError] = useState(false);
  const [agendaEvents, setAgendaEvents] = useState<TeacherAgendaItem[]>([]);
  const [communicationMessages, setCommunicationMessages] = useState<TeacherCommunicationItem[]>([]);
  const [diaryRecentEntries, setDiaryRecentEntries] = useState<TeacherDiaryEntry[]>([]);
  const [diarySummary, setDiarySummary] = useState<RealTeacherDiaryPeriodSummary | null>(null);
  const [classFilter, setClassFilter] = useState<"Todas" | "Educação Infantil" | "Fundamental">("Todas");
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [attendanceClassName, setAttendanceClassName] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceSaved, setAttendanceSaved] = useState(false);
  const [agendaMode, setAgendaMode] = useState<TeacherAgendaMode>("list");
  const [agendaSelectedDay, setAgendaSelectedDay] = useState<TeacherAgendaDay>("Hoje");
  const [agendaSelectedEventId, setAgendaSelectedEventId] = useState<string | null>(null);
  const [agendaClassName, setAgendaClassName] = useState("");
  const [agendaTitle, setAgendaTitle] = useState("Novo compromisso da turma");
  const [agendaDate, setAgendaDate] = useState(todayIsoDate());
  const [agendaTime, setAgendaTime] = useState("09:30");
  const [agendaType, setAgendaType] = useState<TeacherAgendaType>("Aula");
  const [agendaDescription, setAgendaDescription] = useState("Organizar a rotina e registrar as orientações principais.");
  const [agendaSaved, setAgendaSaved] = useState(false);
  const [communicationMode, setCommunicationMode] = useState<TeacherCommunicationMode>("inbox");
  const [communicationFilter, setCommunicationFilter] = useState<TeacherCommunicationFilter>("Todos");
  const [communicationRecipientType, setCommunicationRecipientType] = useState<TeacherCommunicationRecipientType>("Turma");
  const [communicationClassName, setCommunicationClassName] = useState("");
  const [communicationStudentName, setCommunicationStudentName] = useState("");
  const [communicationTitle, setCommunicationTitle] = useState("Lembrete da turma");
  const [communicationMessage, setCommunicationMessage] = useState("Olá! Passando para lembrar o combinado da semana.");
  const [communicationSent, setCommunicationSent] = useState(false);
  const [selectedMessageTitle, setSelectedMessageTitle] = useState<string | null>(null);
  const [diaryMode, setDiaryMode] = useState<TeacherDiaryMode>("form");
  const [diaryClassName, setDiaryClassName] = useState("");
  const [diaryDate, setDiaryDate] = useState(todayIsoDate());
  const [diaryContent, setDiaryContent] = useState("");
  const [diaryRecord, setDiaryRecord] = useState("");
  const [diaryActivity, setDiaryActivity] = useState("");
  const [diaryDraftSaved, setDiaryDraftSaved] = useState(false);
  const [selectedDiaryEntryId, setSelectedDiaryEntryId] = useState<string | null>(null);
  const [avaliaMode, setAvaliaMode] = useState<TeacherAvaliaMode>("list");
  const [avaliaFilter, setAvaliaFilter] = useState<TeacherAvaliaFilter>("Todas");
  const [avaliaClassName, setAvaliaClassName] = useState("");
  const [selectedAvaliaId, setSelectedAvaliaId] = useState("");
  const [avaliaAvailableFrom, setAvaliaAvailableFrom] = useState("13 de setembro");
  const [avaliaDueDate, setAvaliaDueDate] = useState("20 de setembro");
  const [avaliaPublished, setAvaliaPublished] = useState(false);
  const [selectedAvaliaStudentName, setSelectedAvaliaStudentName] = useState<string | null>(null);
  const [trackingClassName, setTrackingClassName] = useState("");
  const [trackingMode, setTrackingMode] = useState<TeacherTrackingMode>("overview");
  const [trackingStudentName, setTrackingStudentName] = useState<string | null>(null);
  const [teacherNotificationFilter, setTeacherNotificationFilter] = useState<TeacherNotificationFilter>("Tudo");
  const [teacherNotificationsRead, setTeacherNotificationsRead] = useState<Record<string, boolean>>({});
  const [selectedTeacherNotificationId, setSelectedTeacherNotificationId] = useState<string | null>(null);
  const realClasses = operationalClasses;
  const teacherClassRowsByName = useMemo(() => new Map(teacherClassRows.map((item) => [item.name, item])), [teacherClassRows]);
  const defaultOperationalClass = realClasses[0] ?? emptyTeacherClass();
  const hasOperationalClasses = realClasses.length > 0;
  const selectedOperationalClassName = attendanceClassName || defaultOperationalClass.className;
  const selectedAgendaClassName = agendaClassName || defaultOperationalClass.className;
  const selectedCommunicationClassName = communicationClassName || defaultOperationalClass.className;
  const selectedDiaryClassName = diaryClassName || defaultOperationalClass.className;
  const realClassesByName = useMemo(() => new Map(realClasses.map((item) => [item.className, item])), [realClasses]);
  const selectedClass = selectedClassName ? realClassesByName.get(selectedClassName) ?? null : null;
  const attendanceClass = realClassesByName.get(selectedOperationalClassName) ?? defaultOperationalClass;
  const agendaClass = realClassesByName.get(selectedAgendaClassName) ?? defaultOperationalClass;
  const selectedAgendaEvent = agendaEvents.find((item) => item.id === agendaSelectedEventId) ?? null;
  const communicationClass = realClassesByName.get(selectedCommunicationClassName) ?? defaultOperationalClass;
  const selectedMessage = communicationMessages.find((item) => item.title === selectedMessageTitle) ?? null;
  const diaryClass = realClassesByName.get(selectedDiaryClassName) ?? defaultOperationalClass;
  const selectedDiaryEntry = diaryRecentEntries.find((item) => item.id === selectedDiaryEntryId) ?? null;
  const diaryCurrent = makeTeacherDiaryCurrent(diarySummary, diaryContent, diaryRecord);
  const avaliaClass = realClassesByName.get(avaliaClassName || defaultOperationalClass.className) ?? defaultOperationalClass;
  const selectedAvalia = teacherAssessments.find((item) => item.id === selectedAvaliaId) ?? teacherAssessments[0] ?? emptyTeacherAssessment();
  const selectedAvaliaStudent = selectedAvalia?.students.find((item) => item.name === selectedAvaliaStudentName) ?? null;
  const trackingClass = realClassesByName.get(trackingClassName || defaultOperationalClass.className) ?? defaultOperationalClass;
  const selectedTrackingStudent = trackingClass.studentsList.find((item) => item.name === trackingStudentName) ?? trackingClass.studentsList[0] ?? null;
  const teacherNotificationItems = useMemo(() => teacherNotifications.map(mapTeacherNotificationItem), [teacherNotifications]);
  const selectedTeacherNotification = teacherNotificationItems.find((item) => item.id === selectedTeacherNotificationId) ?? null;

  useEffect(() => {
    let active = true;
    if (!session) {
      setOperationalLoading(false);
      setOperationalError(true);
      setOperationalClasses([]);
      setTeacherClassRows([]);
      setTeacherStudentsByClassId({});
      return;
    }
    setOperationalLoading(true);
    setOperationalError(false);
    void getTeacherMobileClasses(session)
      .then(async (classes) => {
        const studentsByClass = await Promise.all(
          classes.map((item) =>
            getTeacherClassStudents(session, item.id)
              .then((students) => [item.id, students] as const)
              .catch(() => [item.id, [] as RealTeacherClassStudent[]] as const)
          )
        );
        if (!active) return;
        const studentMap = new Map(studentsByClass);
        const nextClasses = classes.map((item) => makeTeacherClassSummary(item, studentMap.get(item.id) || []));
        setTeacherClassRows(classes);
        setTeacherStudentsByClassId(Object.fromEntries(studentsByClass));
        setOperationalClasses(nextClasses);
        const firstClassName = nextClasses[0]?.className || "";
        setAttendanceClassName((current) => current || firstClassName);
        setAgendaClassName((current) => current || firstClassName);
        setCommunicationClassName((current) => current || firstClassName);
        setCommunicationStudentName((current) => current || nextClasses[0]?.studentsList[0]?.name || "");
        setDiaryClassName((current) => current || firstClassName);
        setAvaliaClassName((current) => current || firstClassName);
        setTrackingClassName((current) => current || firstClassName);
        setTrackingStudentName((current) => current || nextClasses[0]?.studentsList[0]?.name || null);
      })
      .catch(() => {
        if (active) {
          setOperationalClasses([]);
          setTeacherClassRows([]);
          setTeacherStudentsByClassId({});
          setOperationalError(true);
        }
      })
      .finally(() => {
        if (active) setOperationalLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    let active = true;
    if (!session) {
      setTeacherContext(null);
      setTeacherHomeSummary(null);
      setTeacherNotifications([]);
      setTeacherAssessments([]);
      return;
    }
    void Promise.all([
      getTeacherContext(session),
      getTeacherHomeSummary(session),
      getTeacherNotificationCenter(session),
      getTeacherAssessmentAssignments(session)
    ])
      .then(([context, summary, notifications, assessments]) => {
        if (!active) return;
        setTeacherContext({
          teacherName: context.teacherName,
          schoolName: context.schoolName,
          discipline: context.discipline,
          activeClassLinks: context.activeClassLinks
        });
        setTeacherHomeSummary(summary);
        setTeacherNotifications(notifications);
        setTeacherAssessments(assessments.map(mapTeacherAssessmentAssignment));
        setSelectedAvaliaId((current) => current || assessments[0]?.id || "");
      })
      .catch(() => {
        if (!active) return;
        setTeacherContext(null);
        setTeacherHomeSummary(null);
        setTeacherNotifications([]);
        setTeacherAssessments([]);
      });
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    let active = true;
    if (!session || teacherClassRows.length === 0) {
      setAgendaEvents([]);
      setCommunicationMessages([]);
      return;
    }
    void getTeacherCalendarEntries(session, teacherClassRows)
      .then((entries) => {
        if (active) setAgendaEvents(entries.map(mapTeacherCalendarEntry));
      })
      .catch(() => {
        if (active) setAgendaEvents([]);
      });
    void getTeacherCommunicationSummaries(session)
      .then((messages) => {
        if (active) setCommunicationMessages(messages.map(mapTeacherCommunicationSummary));
      })
      .catch(() => {
        if (active) setCommunicationMessages([]);
      });
    return () => {
      active = false;
    };
  }, [session, teacherClassRows]);

  useEffect(() => {
    let active = true;
    const classRow = teacherClassRowsByName.get(selectedDiaryClassName);
    if (!session || !classRow) {
      setDiaryRecentEntries([]);
      setDiarySummary(null);
      return;
    }
    void getTeacherDiaryEntries(session, classRow.id)
      .then((entries) => {
        if (active) setDiaryRecentEntries(entries.map((entry) => mapTeacherDiaryEntry(entry, classRow.name)));
      })
      .catch(() => {
        if (active) setDiaryRecentEntries([]);
      });
    void getTeacherDiaryPeriodSummary(session, classRow.id)
      .then((summary) => {
        if (active) setDiarySummary(summary);
      })
      .catch(() => {
        if (active) setDiarySummary(null);
      });
    return () => {
      active = false;
    };
  }, [session, selectedDiaryClassName, teacherClassRowsByName]);

  useEffect(() => {
    let active = true;
    const classRow = teacherClassRowsByName.get(trackingClassName || defaultOperationalClass.className);
    if (!session || !classRow) {
      setTrackingOverview(null);
      setTrackingAlerts([]);
      return;
    }
    void Promise.all([getTeacherTrackingOverview(session, classRow.id), getTeacherTrackingAlerts(session, classRow.id)])
      .then(([overview, alerts]) => {
        if (!active) return;
        setTrackingOverview(overview);
        setTrackingAlerts(alerts);
      })
      .catch(() => {
        if (!active) return;
        setTrackingOverview(null);
        setTrackingAlerts([]);
      });
    return () => {
      active = false;
    };
  }, [session, trackingClassName, teacherClassRowsByName, defaultOperationalClass.className]);

  if (activeKey === "classes") {
    return selectedClass ? (
      <TeacherClassDetailScreen
        item={selectedClass}
        onBack={() => setSelectedClassName(null)}
        onOpen={(key) => {
          if (key === "communication") {
            setCommunicationClassName(selectedClass.className);
            setCommunicationRecipientType("Turma");
            setCommunicationMode("compose");
            setCommunicationSent(false);
          }
          if (key === "agenda") {
            setAgendaClassName(selectedClass.className);
            setAgendaMode("compose");
            setAgendaSaved(false);
          }
          if (key === "diary") {
            setDiaryClassName(selectedClass.className);
            setDiaryMode("form");
            setDiaryDraftSaved(false);
          }
          if (key === "avalia") {
            setAvaliaClassName(selectedClass.className);
            setAvaliaMode("list");
            setAvaliaPublished(false);
          }
          if (key === "tracking") {
            setTrackingClassName(selectedClass.className);
            setTrackingMode("overview");
            setTrackingStudentName(selectedClass.studentsList[0]?.name ?? null);
          }
          onOpen(key);
        }}
      />
    ) : (
      <TeacherClassesScreen
        classes={realClasses}
        filter={classFilter}
        onFilterChange={setClassFilter}
        onOpenClass={(item) => setSelectedClassName(item.className)}
      />
    );
  }

  if (activeKey === "attendance") {
    return (
      <TeacherAttendanceScreen
        classes={realClasses}
        selectedClass={attendanceClass}
        records={attendanceRecords}
        saved={attendanceSaved}
        loading={operationalLoading}
        error={operationalError}
        onClassChange={(className) => {
          setAttendanceClassName(className);
          setAttendanceSaved(false);
        }}
        onMarkStudent={(studentName, status) => {
          setAttendanceRecords((current) => ({ ...current, [studentName]: status }));
          setAttendanceSaved(false);
        }}
        onMarkAllPresent={() => {
          const nextRecords = Object.fromEntries(attendanceClass.studentsList.map((student) => [student.name, "Presente" as AttendanceStatus]));
          setAttendanceRecords((current) => ({ ...current, ...nextRecords }));
          setAttendanceSaved(false);
        }}
        onSave={async () => {
          const classRow = teacherClassRowsByName.get(attendanceClass.className);
          if (!session || !classRow) return;
          const students = teacherStudentsByClassId[classRow.id] || [];
          await saveTeacherAttendanceRecords(
            session,
            classRow.id,
            todayIsoDate(),
            students.map((student) => ({
              studentId: student.id,
              status: mapAttendanceStatusToApi(attendanceRecords[student.name] ?? "Presente")
            }))
          );
          setAttendanceSaved(true);
        }}
        onEdit={() => setAttendanceSaved(false)}
      />
    );
  }

  if (activeKey === "communication") {
    return (
      <TeacherCommunicationScreen
        classes={realClasses}
        messages={communicationMessages}
        mode={communicationMode}
        filter={communicationFilter}
        recipientType={communicationRecipientType}
        selectedClass={communicationClass}
        selectedStudentName={communicationStudentName}
        title={communicationTitle}
        message={communicationMessage}
        sent={communicationSent}
        selectedMessage={selectedMessage}
        loading={operationalLoading}
        error={operationalError}
        onModeChange={setCommunicationMode}
        onFilterChange={setCommunicationFilter}
        onRecipientTypeChange={(type) => {
          setCommunicationRecipientType(type);
          setCommunicationSent(false);
        }}
        onClassChange={(className) => {
          const nextClass = realClasses.find((item) => item.className === className) ?? defaultOperationalClass;
          setCommunicationClassName(nextClass.className);
          setCommunicationStudentName(nextClass.studentsList[0]?.name ?? "");
          setCommunicationSent(false);
        }}
        onStudentChange={(studentName) => {
          setCommunicationStudentName(studentName);
          setCommunicationSent(false);
        }}
        onTitleChange={(value) => {
          setCommunicationTitle(value);
          setCommunicationSent(false);
        }}
        onMessageChange={(value) => {
          setCommunicationMessage(value);
          setCommunicationSent(false);
        }}
        onSend={async () => {
          const classRow = teacherClassRowsByName.get(communicationClass.className);
          if (!session || !classRow) return;
          const student = teacherStudentsByClassId[classRow.id]?.find((item) => item.name === communicationStudentName);
          await publishTeacherCommunication(session, {
            schoolId: classRow.schoolId,
            classId: classRow.id,
            studentId: communicationRecipientType === "Aluno" ? student?.id ?? null : null,
            audienceType: communicationRecipientType === "Aluno" ? "student" : "class",
            title: communicationTitle,
            body: communicationMessage
          });
          setCommunicationSent(true);
          setCommunicationMode("inbox");
        }}
        onOpenMessage={(item) => {
          setSelectedMessageTitle(item.title);
          setCommunicationMode("detail");
        }}
      />
    );
  }

  if (activeKey === "agenda") {
    return (
      <TeacherAgendaScreen
        classes={realClasses}
        events={agendaEvents}
        mode={agendaMode}
        selectedDay={agendaSelectedDay}
        selectedEvent={selectedAgendaEvent}
        selectedClass={agendaClass}
        title={agendaTitle}
        date={agendaDate}
        time={agendaTime}
        type={agendaType}
        description={agendaDescription}
        saved={agendaSaved}
        loading={operationalLoading}
        error={operationalError}
        onDayChange={setAgendaSelectedDay}
        onModeChange={setAgendaMode}
        onOpenEvent={(item) => {
          setAgendaSelectedEventId(item.id);
          setAgendaMode("detail");
        }}
        onNewEvent={() => {
          setAgendaMode("compose");
          setAgendaSaved(false);
        }}
        onEditEvent={(item) => {
          setAgendaSelectedEventId(item.id);
          setAgendaTitle(item.title);
          setAgendaClassName(item.className === "Coordenação" ? defaultOperationalClass.className : item.className);
          setAgendaDate(item.date);
          setAgendaTime(item.time);
          setAgendaType(item.type as TeacherAgendaType);
          setAgendaDescription(item.description);
          setAgendaMode("edit");
          setAgendaSaved(false);
        }}
        onClassChange={(className) => {
          setAgendaClassName(className);
          setAgendaSaved(false);
        }}
        onTitleChange={(value) => {
          setAgendaTitle(value);
          setAgendaSaved(false);
        }}
        onDateChange={(value) => {
          setAgendaDate(value);
          setAgendaSaved(false);
        }}
        onTimeChange={(value) => {
          setAgendaTime(value);
          setAgendaSaved(false);
        }}
        onTypeChange={(value) => {
          setAgendaType(value);
          setAgendaSaved(false);
        }}
        onDescriptionChange={(value) => {
          setAgendaDescription(value);
          setAgendaSaved(false);
        }}
        onSave={async () => {
          const classRow = teacherClassRowsByName.get(agendaClass.className);
          if (!session || !classRow) return;
          await saveTeacherCalendarEntry(session, {
            entryId: agendaMode === "edit" && selectedAgendaEvent ? selectedAgendaEvent.id : null,
            classId: classRow.id,
            entryDate: normalizeTeacherDateInput(agendaDate),
            startTime: normalizeTeacherTimeInput(agendaTime),
            title: agendaTitle,
            description: agendaDescription,
            entryType: mapTeacherAgendaTypeToApi(agendaType)
          });
          setAgendaSaved(true);
          setAgendaMode("list");
        }}
        onOpenModule={onOpen}
      />
    );
  }

  if (activeKey === "diary") {
    return (
      <TeacherDiaryScreen
        classes={realClasses}
        current={diaryCurrent}
        recent={diaryRecentEntries}
        mode={diaryMode}
        selectedClass={diaryClass}
        date={diaryDate}
        content={diaryContent}
        record={diaryRecord}
        activity={diaryActivity}
        draftSaved={diaryDraftSaved}
        selectedEntry={selectedDiaryEntry}
        loading={operationalLoading}
        error={operationalError}
        writeGap
        onModeChange={setDiaryMode}
        onClassChange={(className) => {
          setDiaryClassName(className);
          setDiaryDraftSaved(false);
          setDiaryMode("form");
        }}
        onDateChange={(value) => {
          setDiaryDate(value);
          setDiaryDraftSaved(false);
        }}
        onContentChange={(value) => {
          setDiaryContent(value);
          setDiaryDraftSaved(false);
        }}
        onRecordChange={(value) => {
          setDiaryRecord(value);
          setDiaryDraftSaved(false);
        }}
        onActivityChange={(value) => {
          setDiaryActivity(value);
          setDiaryDraftSaved(false);
        }}
        onSaveDraft={() => setDiaryDraftSaved(false)}
        onOpenEntry={(entry) => {
          setSelectedDiaryEntryId(entry.id);
          setDiaryMode("detail");
        }}
        onOpenAttendance={() => {
          setAttendanceClassName(diaryClass.className);
          setAttendanceSaved(false);
          onOpen("attendance");
        }}
      />
    );
  }

  if (activeKey === "avalia") {
    return (
      <TeacherAvaliaScreen
        assessments={teacherAssessments}
        classes={realClasses}
        mode={avaliaMode}
        filter={avaliaFilter}
        selectedAssessment={selectedAvalia}
        selectedClass={avaliaClass}
        availableFrom={avaliaAvailableFrom}
        dueDate={avaliaDueDate}
        published={avaliaPublished}
        selectedStudent={selectedAvaliaStudent}
        onModeChange={setAvaliaMode}
        onFilterChange={setAvaliaFilter}
        onOpenAssessment={(assessment, nextMode) => {
          setSelectedAvaliaId(assessment.id);
          setSelectedAvaliaStudentName(null);
          setAvaliaPublished(false);
          setAvaliaMode(nextMode);
        }}
        onClassChange={(className) => {
          setAvaliaClassName(className);
          setAvaliaPublished(false);
        }}
        onAvailableFromChange={(value) => {
          setAvaliaAvailableFrom(value);
          setAvaliaPublished(false);
        }}
        onDueDateChange={(value) => {
          setAvaliaDueDate(value);
          setAvaliaPublished(false);
        }}
        onPublish={() => {
          setAvaliaPublished(false);
          setAvaliaMode("published");
        }}
        onOpenStudent={(student) => {
          setSelectedAvaliaStudentName(student.name);
          setAvaliaMode("student");
        }}
      />
    );
  }

  if (activeKey === "tracking") {
    return (
      <TeacherTrackingScreen
        classes={realClasses}
        selectedClass={trackingClass}
        selectedStudent={selectedTrackingStudent}
        mode={trackingMode}
        avaliaAssessments={teacherAssessments}
        diaryCurrent={diaryCurrent}
        diaryRecent={diaryRecentEntries}
        overview={trackingOverview}
        alerts={trackingAlerts}
        onClassChange={(className) => {
          const nextClass = realClassesByName.get(className) ?? trackingClass;
          setTrackingClassName(nextClass.className);
          setTrackingStudentName(nextClass.studentsList[0]?.name ?? null);
          setTrackingMode("overview");
        }}
        onOpenStudent={(student) => {
          setTrackingStudentName(student.name);
          setTrackingMode("student");
        }}
        onBackToOverview={() => setTrackingMode("overview")}
        onOpen={onOpen}
      />
    );
  }

  if (activeKey === "notifications") {
    return (
      <TeacherNotificationsScreen
        items={teacherNotificationItems}
        filter={teacherNotificationFilter}
        readState={teacherNotificationsRead}
        selectedItem={selectedTeacherNotification}
        onFilterChange={setTeacherNotificationFilter}
        onOpenItem={(item) => {
          setSelectedTeacherNotificationId(item.id);
          setTeacherNotificationsRead((current) => ({ ...current, [item.id]: true }));
        }}
        onBack={() => setSelectedTeacherNotificationId(null)}
        onMarkAllRead={() => {
          const nextReadState = Object.fromEntries(teacherNotificationItems.map((item) => [item.id, true]));
          setTeacherNotificationsRead(nextReadState);
        }}
        onAction={(target) => {
          setSelectedTeacherNotificationId(null);
          onOpen(target);
        }}
      />
    );
  }

  if (activeKey === "profile") {
    return (
      <TeacherProfileScreen
        context={teacherContext}
        summary={teacherHomeSummary}
        classes={realClasses}
        communicationCount={communicationMessages.length}
        diaryCount={diaryRecentEntries.length}
        avaliaCount={teacherAssessments.length}
        onOpen={onOpen}
        onOpenAccessibility={() => onOpen("profile:accessibility" as ModuleKey)}
        onLogout={onLogout}
      />
    );
  }

  if (String(activeKey).startsWith("profile:accessibility")) {
    return <TeacherProfileAccessibilityScreen onBack={() => onOpen("profile")} />;
  }

  return <TeacherShell title="Início" intro="Escolha uma área para continuar sua rotina docente." />;
}

function TeacherModuleHero({
  title,
  intro,
  kicker = "Professora",
  icon,
  children
}: {
  title: string;
  intro: string;
  kicker?: string;
  icon?: TeacherSplitIcon;
  children?: React.ReactNode;
}) {
  const heroIcon = icon ?? teacherModuleIcon(title);

  return (
    <View style={styles.teacherShellHero}>
      <View style={styles.teacherShellHeroGlow} />
      <View style={styles.teacherShellHeroTop}>
        <View style={styles.teacherShellHeroCopy}>
          <Text style={styles.teacherKicker}>{kicker}</Text>
          <Text style={styles.teacherShellTitle}>{title}</Text>
          <Text style={styles.teacherShellIntro}>{intro}</Text>
        </View>
        <TeacherSplitIconView icon={heroIcon} frameStyle={styles.teacherShellIconFrame} imageStyle={styles.teacherShellSplitImage} frameWidth={112} />
      </View>
      {children ? <View style={styles.teacherShellHeroContent}>{children}</View> : null}
    </View>
  );
}

function TeacherAttendanceScreen({
  classes,
  selectedClass,
  records,
  saved,
  loading,
  error,
  onClassChange,
  onMarkStudent,
  onMarkAllPresent,
  onSave,
  onEdit
}: {
  classes: TeacherClassSummary[];
  selectedClass: TeacherClassSummary;
  records: Record<string, AttendanceStatus>;
  saved: boolean;
  loading: boolean;
  error: boolean;
  onClassChange: (className: string) => void;
  onMarkStudent: (studentName: string, status: AttendanceStatus) => void;
  onMarkAllPresent: () => void;
  onSave: () => void;
  onEdit: () => void;
}) {
  const students = selectedClass.studentsList;
  const getStatus = (student: TeacherClassStudent) => records[student.name] ?? "Presente";
  const summary = students.reduce(
    (total, student) => {
      const status = getStatus(student);
      if (status === "Presente") total.present += 1;
      if (status === "Falta") total.absent += 1;
      if (status === "Justificada") total.justified += 1;
      return total;
    },
    { present: 0, absent: 0, justified: 0 }
  );

  return (
    <View>
      <TeacherModuleHero title="Frequência" intro="Registre a chamada da turma." icon={{ source: teacherHomeIcons.peopleCalendar, side: "right" }}>
        <View style={styles.teacherAttendanceMetaRow}>
          <View style={styles.teacherAttendanceMetaPill}>
            <Text style={styles.teacherAttendanceMetaLabel}>Turma</Text>
            <Text style={styles.teacherAttendanceMetaValue}>{selectedClass.className}</Text>
          </View>
          <View style={styles.teacherAttendanceMetaPill}>
            <Text style={styles.teacherAttendanceMetaLabel}>Data</Text>
            <Text style={styles.teacherAttendanceMetaValue}>13 de setembro</Text>
          </View>
          <View style={styles.teacherAttendanceMetaPill}>
            <Text style={styles.teacherAttendanceMetaLabel}>Alunos</Text>
            <Text style={styles.teacherAttendanceMetaValue}>{selectedClass.students}</Text>
          </View>
        </View>
      </TeacherModuleHero>

      <SectionHeader title="Turma" action="Selecionar" />
      {loading ? <EmptyState title="Carregando turmas" body="Aguarde enquanto buscamos suas turmas autorizadas." /> : null}
      {error ? <EmptyState title="Frequência indisponível" body="Não foi possível carregar suas turmas agora." /> : null}
      <View style={styles.teacherAttendanceClassRow}>
        {classes.map((item) => (
          <Pressable
            key={item.className}
            accessibilityRole="button"
            accessibilityLabel={`Selecionar ${item.className}`}
            onPress={() => onClassChange(item.className)}
            style={[styles.teacherAttendanceClassChip, selectedClass.className === item.className ? styles.teacherAttendanceClassChipActive : null]}
          >
            <Text style={[styles.teacherAttendanceClassText, selectedClass.className === item.className ? styles.teacherAttendanceClassTextActive : null]}>{item.className}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.teacherAttendanceDateCard}>
        <View>
          <Text style={styles.teacherAttendanceDateLabel}>Chamada de hoje</Text>
          <Text style={styles.teacherAttendanceDateText}>Domingo, 13 de setembro</Text>
        </View>
        <Text style={styles.teacherAttendanceDateAction}>Alterar data</Text>
      </View>

      <View style={styles.teacherAttendanceSummaryGrid}>
        <TeacherAttendanceSummaryCard label="Presentes" value={summary.present} tone="present" />
        <TeacherAttendanceSummaryCard label="Faltas" value={summary.absent} tone="absent" />
        <TeacherAttendanceSummaryCard label="Justificadas" value={summary.justified} tone="justified" />
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Marcar todos como presentes" onPress={onMarkAllPresent} disabled={students.length === 0} style={styles.teacherMarkAllButton}>
        <Text style={styles.teacherMarkAllText}>Marcar todos como presentes</Text>
      </Pressable>

      <SectionHeader title="Alunos" action="Toque rápido" />
      {students.length === 0 ? (
        <EmptyState title="Nenhum aluno nesta turma" body="Quando houver alunos vinculados, a chamada aparecerá aqui." />
      ) : (
        <View style={styles.teacherAttendanceList}>
          {students.map((student) => (
            <TeacherAttendanceStudentRow key={student.name} student={student} status={getStatus(student)} onChange={(status) => onMarkStudent(student.name, status)} />
          ))}
        </View>
      )}

      <View style={styles.teacherAttendanceReviewCard}>
        <Text style={styles.teacherAttendanceReviewTitle}>{saved ? "Chamada registrada" : "Revisar chamada"}</Text>
        <Text style={styles.teacherAttendanceReviewBody}>
          {summary.present} presentes, {summary.absent} faltas e {summary.justified} justificadas.
        </Text>
        <View style={styles.teacherAttendanceReviewActions}>
          {saved ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Editar chamada" onPress={onEdit} style={styles.teacherAttendanceSecondaryButton}>
              <Text style={styles.teacherAttendanceSecondaryText}>Editar chamada</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" accessibilityLabel="Salvar chamada" onPress={onSave} disabled={students.length === 0} style={styles.teacherAttendanceSaveButton}>
              <Text style={styles.teacherAttendanceSaveText}>Salvar chamada</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

function TeacherAttendanceSummaryCard({ label, value, tone }: { label: string; value: number; tone: "present" | "absent" | "justified" }) {
  const toneStyle =
    tone === "present"
      ? styles.teacherAttendanceSummaryCardPresent
      : tone === "absent"
        ? styles.teacherAttendanceSummaryCardAbsent
        : styles.teacherAttendanceSummaryCardJustified;

  return (
    <View style={[styles.teacherAttendanceSummaryCard, toneStyle]}>
      <Text style={styles.teacherAttendanceSummaryValue}>{value}</Text>
      <Text style={styles.teacherAttendanceSummaryLabel}>{label}</Text>
    </View>
  );
}

function TeacherAttendanceStudentRow({
  student,
  status,
  onChange
}: {
  student: TeacherClassStudent;
  status: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
}) {
  const initials = student.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <View style={styles.teacherAttendanceStudentRow}>
      <View style={styles.teacherAttendanceStudentTop}>
        <View style={styles.teacherStudentAvatar}>
          <Text style={styles.teacherStudentAvatarText}>{initials}</Text>
        </View>
        <View style={styles.teacherStudentCopy}>
          <Text style={styles.teacherStudentName}>{student.name}</Text>
          <Text style={styles.teacherStudentState}>{status}</Text>
        </View>
      </View>
      <View style={styles.teacherAttendanceSegment}>
        {(["Presente", "Falta", "Justificada"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`${student.name}: ${item}`}
            onPress={() => onChange(item)}
            style={[styles.teacherAttendanceSegmentButton, status === item ? styles.teacherAttendanceSegmentButtonActive : null]}
          >
            <Text style={[styles.teacherAttendanceSegmentText, status === item ? styles.teacherAttendanceSegmentTextActive : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      {status === "Justificada" ? (
        <View style={styles.teacherAttendanceNoteBox}>
          <Text style={styles.teacherAttendanceNoteText}>Observação opcional para acompanhar depois.</Text>
        </View>
      ) : null}
    </View>
  );
}

function TeacherClassesScreen({
  classes,
  filter,
  onFilterChange,
  onOpenClass
}: {
  classes: TeacherClassSummary[];
  filter: "Todas" | "Educação Infantil" | "Fundamental";
  onFilterChange: (filter: "Todas" | "Educação Infantil" | "Fundamental") => void;
  onOpenClass: (item: TeacherClassSummary) => void;
}) {
  const filteredClasses = classes.filter((item) => filter === "Todas" || (filter === "Fundamental" ? item.stage === "Ensino Fundamental" : item.stage === filter));

  return (
    <View>
      <TeacherModuleHero title="Minhas turmas" intro="Acesse suas turmas e as principais ações do dia." icon={{ source: teacherHomeIcons.peopleCalendar, side: "left" }} />

      <View style={styles.teacherClassFilterRow}>
        {(["Todas", "Educação Infantil", "Fundamental"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar por ${item}`}
            onPress={() => onFilterChange(item)}
            style={[styles.teacherClassFilterChip, filter === item ? styles.teacherClassFilterChipActive : null]}
          >
            <Text style={[styles.teacherClassFilterText, filter === item ? styles.teacherClassFilterTextActive : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.teacherClassesList}>
        {filteredClasses.map((item) => (
          <TeacherClassOverviewCard key={item.className} item={item} onPress={() => onOpenClass(item)} />
        ))}
      </View>
    </View>
  );
}

function TeacherClassOverviewCard({ item, onPress }: { item: TeacherClassSummary; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir turma ${item.className}`} onPress={onPress} style={styles.teacherClassOverviewCard}>
      <View style={styles.teacherClassOverviewTop}>
        <View style={styles.teacherClassAvatar}>
          <Text style={styles.teacherClassAvatarText}>{formatTeacherClassShortName(item.className)}</Text>
        </View>
        <View style={styles.teacherClassOverviewCopy}>
          <Text style={styles.teacherClassStage}>{item.stage}</Text>
          <Text style={styles.teacherClassOverviewTitle}>{item.className}</Text>
          <Text style={styles.teacherClassOverviewMeta}>
            {item.students} · {item.schedule}
          </Text>
        </View>
        <View style={styles.teacherClassStatus}>
          <Text style={styles.teacherClassStatusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.teacherClassOverviewFooter}>
        <Text style={styles.teacherClassRoutine}>{item.nextCommitment}</Text>
        <Text style={styles.teacherClassOpenText}>Abrir turma</Text>
      </View>
    </Pressable>
  );
}

function TeacherClassDetailScreen({
  item,
  onBack,
  onOpen
}: {
  item: TeacherClassSummary;
  onBack: () => void;
  onOpen: (key: ModuleKey) => void;
}) {
  const actions: Array<{ label: string; helper: string; mark: string; target: ModuleKey; primary?: boolean }> = [
    { label: "Fazer chamada", helper: "Abrir frequência da turma.", mark: "✓", target: "attendance", primary: true },
    { label: "Enviar recado", helper: "Comunicar turma ou aluno.", mark: "✉", target: "communication", primary: true },
    { label: "Registrar aula", helper: "Atualizar o Diário de Classe.", mark: "D", target: "diary", primary: true },
    { label: "Agenda", helper: "Criar compromisso para a turma.", mark: "◷", target: "agenda" },
    { label: "Abrir Avalia+", helper: "Ver avaliações e resultados.", mark: "A+", target: "avalia" },
    { label: "Acompanhamento", helper: "Indicadores essenciais da turma.", mark: "↗", target: "tracking" }
  ];

  return (
    <View>
      <View style={styles.teacherClassDetailHero}>
        <View style={styles.teacherClassDetailTop}>
          <View>
            <Text style={[styles.teacherKicker, styles.teacherKickerOnDark]}>{item.stage}</Text>
            <Text style={styles.teacherClassDetailTitle}>{item.className}</Text>
            <Text style={styles.teacherClassDetailBody}>
              {item.students} · {item.room}
            </Text>
          </View>
          <View style={styles.teacherClassDetailCount}>
            <Text style={styles.teacherClassDetailCountValue}>{item.studentCount}</Text>
            <Text style={styles.teacherClassDetailCountLabel}>alunos</Text>
          </View>
        </View>
        <View style={styles.teacherClassDetailInfo}>
          <Text style={styles.teacherClassDetailInfoLabel}>Rotina</Text>
          <Text style={styles.teacherClassDetailInfoText}>{item.routine}</Text>
          <Text style={styles.teacherClassDetailInfoMeta}>{item.schedule}</Text>
        </View>
      </View>

      <SectionHeader title="Ações rápidas" />
      <View style={styles.teacherClassActionGrid}>
        {actions.map((action) => (
          <TeacherClassActionCard key={action.label} action={action} onPress={() => onOpen(action.target)} />
        ))}
      </View>

      <SectionHeader title="Alunos" action="Acompanhamento" />
      <View style={styles.teacherStudentList}>
        {item.studentsList.map((student) => (
          <TeacherStudentRow key={student.name} student={student} />
        ))}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para minhas turmas" onPress={onBack} style={styles.teacherBackToClassesButton}>
        <Text style={styles.teacherBackToClassesText}>Voltar para turmas</Text>
      </Pressable>
    </View>
  );
}

function formatTeacherClassShortName(className: string) {
  if (className.startsWith("Infantil ")) {
    return className.replace("Infantil ", "I");
  }

  return className.replace(" Ano ", " ");
}

function TeacherClassActionCard({
  action,
  onPress
}: {
  action: { label: string; helper: string; mark: string; primary?: boolean };
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={onPress} style={[styles.teacherClassActionCard, action.primary ? styles.teacherClassActionPrimary : null]}>
      <View style={[styles.teacherClassActionMark, action.primary ? styles.teacherClassActionMarkPrimary : null]}>
        <Text style={[styles.teacherClassActionMarkText, action.primary ? styles.teacherClassActionMarkTextPrimary : null]}>{action.mark}</Text>
      </View>
      <Text style={[styles.teacherClassActionTitle, action.primary ? styles.teacherClassActionTitlePrimary : null]}>{action.label}</Text>
      <Text style={[styles.teacherClassActionBody, action.primary ? styles.teacherClassActionBodyPrimary : null]}>{action.helper}</Text>
    </Pressable>
  );
}

function TeacherStudentRow({ student }: { student: TeacherClassStudent }) {
  const initials = student.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return (
    <View style={styles.teacherStudentRow}>
      <View style={styles.teacherStudentAvatar}>
        <Text style={styles.teacherStudentAvatarText}>{initials}</Text>
      </View>
      <View style={styles.teacherStudentCopy}>
        <Text style={styles.teacherStudentName}>{student.name}</Text>
        <Text style={styles.teacherStudentState}>{student.state}</Text>
      </View>
    </View>
  );
}

function TeacherAgendaScreen({
  classes,
  events,
  mode,
  selectedDay,
  selectedEvent,
  selectedClass,
  title,
  date,
  time,
  type,
  description,
  saved,
  loading,
  error,
  onDayChange,
  onModeChange,
  onOpenEvent,
  onNewEvent,
  onEditEvent,
  onClassChange,
  onTitleChange,
  onDateChange,
  onTimeChange,
  onTypeChange,
  onDescriptionChange,
  onSave,
  onOpenModule
}: {
  classes: TeacherClassSummary[];
  events: TeacherAgendaItem[];
  mode: TeacherAgendaMode;
  selectedDay: TeacherAgendaDay;
  selectedEvent: TeacherAgendaItem | null;
  selectedClass: TeacherClassSummary;
  title: string;
  date: string;
  time: string;
  type: TeacherAgendaType;
  description: string;
  saved: boolean;
  loading: boolean;
  error: boolean;
  onDayChange: (day: TeacherAgendaDay) => void;
  onModeChange: (mode: TeacherAgendaMode) => void;
  onOpenEvent: (event: TeacherAgendaItem) => void;
  onNewEvent: () => void;
  onEditEvent: (event: TeacherAgendaItem) => void;
  onClassChange: (className: string) => void;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onTypeChange: (type: TeacherAgendaType) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  onOpenModule: (key: ModuleKey) => void;
}) {
  const visibleEvents = events.filter((item) => item.day === selectedDay);
  const upcomingEvents = events.filter((item) => item.day !== selectedDay).slice(0, 4);

  if (mode === "compose" || mode === "edit") {
    return (
      <TeacherAgendaForm
        mode={mode}
        classes={classes}
        selectedClass={selectedClass}
        title={title}
        date={date}
        time={time}
        type={type}
        description={description}
        onBack={() => onModeChange("list")}
        onClassChange={onClassChange}
        onTitleChange={onTitleChange}
        onDateChange={onDateChange}
        onTimeChange={onTimeChange}
        onTypeChange={onTypeChange}
        onDescriptionChange={onDescriptionChange}
        onSave={onSave}
      />
    );
  }

  if (mode === "detail" && selectedEvent) {
    return (
      <TeacherAgendaDetail
        item={selectedEvent}
        saved={saved}
        onBack={() => onModeChange("list")}
        onEdit={() => onEditEvent(selectedEvent)}
        onOpenModule={onOpenModule}
      />
    );
  }

  return (
    <View>
      <TeacherModuleHero title="Agenda" intro="Organize suas aulas e compromissos da semana." icon={{ source: teacherHomeIcons.peopleCalendar, side: "right" }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Novo compromisso" onPress={onNewEvent} style={styles.teacherAgendaPrimaryButton}>
          <Text style={styles.teacherAgendaPrimaryText}>Novo compromisso</Text>
        </Pressable>
      </TeacherModuleHero>

      <SectionHeader title="Semana" action="Seg a Sex" />
      <View style={styles.teacherAgendaWeekStrip}>
        {(["Seg", "Ter", "Qua", "Qui", "Sex"] as const).map((day) => {
          const dayValue: TeacherAgendaDay = day === "Seg" ? "Hoje" : day;
          const active = selectedDay === dayValue;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityLabel={`${dayValue === "Hoje" ? "Hoje" : day}`}
              onPress={() => onDayChange(dayValue)}
              style={[styles.teacherAgendaDayButton, active ? styles.teacherAgendaDayButtonActive : null]}
            >
              <Text style={[styles.teacherAgendaDayText, active ? styles.teacherAgendaDayTextActive : null]}>{day}</Text>
              <Text style={[styles.teacherAgendaDayHelper, active ? styles.teacherAgendaDayHelperActive : null]}>{dayValue === "Hoje" ? "Hoje" : "Dia"}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title={selectedDay === "Hoje" ? "Hoje" : `Compromissos de ${selectedDay}`} />
      {loading ? (
        <EmptyState title="Carregando agenda" body="Buscando compromissos autorizados." />
      ) : error ? (
        <EmptyState title="Agenda indisponível" body="Não foi possível carregar os compromissos agora." />
      ) : visibleEvents.length === 0 ? (
        <EmptyState title="Nenhum compromisso para este dia." body="Quando houver agenda publicada, ela aparecerá aqui." />
      ) : (
        <View style={styles.teacherAgendaTodayList}>
          {visibleEvents.map((item) => (
            <TeacherAgendaCard key={item.id} item={item} featured onPress={() => onOpenEvent(item)} />
          ))}
        </View>
      )}

      <SectionHeader title="Próximos compromissos" />
      <View style={styles.teacherAgendaUpcomingList}>
        {!loading && !error && upcomingEvents.length === 0 ? <EmptyState title="Sem próximos compromissos" body="A agenda real está vazia para o período." /> : null}
        {upcomingEvents.map((item) => (
          <TeacherAgendaCard key={item.id} item={item} onPress={() => onOpenEvent(item)} />
        ))}
      </View>
    </View>
  );
}

function TeacherAgendaForm({
  mode,
  classes,
  selectedClass,
  title,
  date,
  time,
  type,
  description,
  onBack,
  onClassChange,
  onTitleChange,
  onDateChange,
  onTimeChange,
  onTypeChange,
  onDescriptionChange,
  onSave
}: {
  mode: TeacherAgendaMode;
  classes: TeacherClassSummary[];
  selectedClass: TeacherClassSummary;
  title: string;
  date: string;
  time: string;
  type: TeacherAgendaType;
  description: string;
  onBack: () => void;
  onClassChange: (className: string) => void;
  onTitleChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  onTypeChange: (type: TeacherAgendaType) => void;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <View>
      <TeacherModuleHero title="Agenda" intro="Registre uma aula, atividade, avaliação, evento ou lembrete." kicker={mode === "edit" ? "Editar" : "Novo compromisso"} icon={{ source: teacherHomeIcons.peopleCalendar, side: "right" }} />

      <View style={styles.teacherAgendaFormCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Título</Text>
        <TextInput accessibilityLabel="Título do compromisso" value={title} onChangeText={onTitleChange} style={styles.teacherCommunicationInput} />

        <Text style={styles.teacherCommunicationFieldLabel}>Tipo</Text>
        <View style={styles.teacherAgendaTypeGrid}>
          {(["Aula", "Atividade", "Avaliação", "Evento", "Lembrete"] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Tipo ${item}`}
              onPress={() => onTypeChange(item)}
              style={[styles.teacherAgendaTypeButton, type === item ? styles.teacherAgendaTypeButtonActive : null]}
            >
              <Text style={[styles.teacherAgendaTypeText, type === item ? styles.teacherAgendaTypeTextActive : null]}>{getTeacherAgendaTypeMark(item)}</Text>
              <Text style={[styles.teacherAgendaTypeLabel, type === item ? styles.teacherAgendaTypeLabelActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.teacherCommunicationFieldLabel}>Turma</Text>
        <View style={styles.teacherCommunicationClassRow}>
          {classes.map((item) => (
            <Pressable
              key={item.className}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar turma ${item.className}`}
              onPress={() => onClassChange(item.className)}
              style={[styles.teacherCommunicationClassChip, selectedClass.className === item.className ? styles.teacherCommunicationClassChipActive : null]}
            >
              <Text style={[styles.teacherCommunicationClassText, selectedClass.className === item.className ? styles.teacherCommunicationClassTextActive : null]}>{item.className}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.teacherAgendaSelectedClass}>Turma selecionada: {selectedClass.className}</Text>

        <View style={styles.teacherAgendaInputRow}>
          <View style={styles.teacherAgendaInputHalf}>
            <Text style={styles.teacherCommunicationFieldLabel}>Data</Text>
            <TextInput accessibilityLabel="Data do compromisso" value={date} onChangeText={onDateChange} style={styles.teacherCommunicationInput} />
          </View>
          <View style={styles.teacherAgendaInputHalf}>
            <Text style={styles.teacherCommunicationFieldLabel}>Horário</Text>
            <TextInput accessibilityLabel="Horário do compromisso" value={time} onChangeText={onTimeChange} style={styles.teacherCommunicationInput} />
          </View>
        </View>

        <Text style={styles.teacherCommunicationFieldLabel}>Descrição curta</Text>
        <TextInput
          accessibilityLabel="Descrição do compromisso"
          value={description}
          onChangeText={onDescriptionChange}
          multiline
          style={[styles.teacherCommunicationInput, styles.teacherCommunicationMessageInput]}
        />
      </View>

      <View style={styles.teacherCommunicationComposerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para agenda" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Salvar compromisso" onPress={onSave} disabled={classes.length === 0} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Salvar compromisso</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeacherAgendaCard({ item, featured = false, onPress }: { item: TeacherAgendaItem; featured?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir compromisso ${item.title}`} onPress={onPress} style={[styles.teacherAgendaCard, featured ? styles.teacherAgendaCardFeatured : null]}>
      <View style={styles.teacherAgendaCardTop}>
        <View style={styles.teacherAgendaMark}>
          <Text style={styles.teacherAgendaMarkText}>{item.mark}</Text>
        </View>
        <View style={styles.teacherAgendaCardCopy}>
          <Text style={styles.teacherAgendaType}>{item.type}</Text>
          <Text style={styles.teacherAgendaCardTitle}>{item.title}</Text>
          <Text style={styles.teacherAgendaCardMeta}>
            {item.time} · {item.className}
          </Text>
        </View>
        <View style={styles.teacherAgendaStatusPill}>
          <Text style={styles.teacherAgendaStatusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.teacherAgendaCardBody}>{item.description}</Text>
    </Pressable>
  );
}

function TeacherAgendaDetail({
  item,
  saved,
  onBack,
  onEdit,
  onOpenModule
}: {
  item: TeacherAgendaItem;
  saved: boolean;
  onBack: () => void;
  onEdit: () => void;
  onOpenModule: (key: ModuleKey) => void;
}) {
  const canOpenModule = item.actionTarget === "avalia" || item.actionTarget === "diary" || item.actionTarget === "classes";

  return (
    <View>
      <View style={styles.teacherAgendaDetailHero}>
        <View style={styles.teacherAgendaDetailMark}>
          <Text style={styles.teacherAgendaDetailMarkText}>{item.mark}</Text>
        </View>
        <Text style={styles.teacherKickerOnDark}>{item.type}</Text>
        <Text style={styles.teacherAgendaDetailTitle}>{item.title}</Text>
        <Text style={styles.teacherAgendaDetailMeta}>
          {item.className} · {item.date} · {item.time}
        </Text>
      </View>

      {saved ? (
        <View style={styles.teacherCommunicationSentCard}>
          <Text style={styles.teacherCommunicationSentTitle}>Compromisso salvo</Text>
          <Text style={styles.teacherCommunicationSentBody}>A agenda foi atualizada para a turma selecionada.</Text>
        </View>
      ) : null}

      <View style={styles.teacherAgendaDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Descrição</Text>
        <Text style={styles.teacherAgendaDetailBody}>{item.description}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Status</Text>
        <Text style={styles.teacherCommunicationRecipientText}>{item.status}</Text>
      </View>

      <View style={styles.teacherAgendaDetailActions}>
        {canOpenModule ? (
          <Pressable accessibilityRole="button" accessibilityLabel={item.action} onPress={() => onOpenModule(item.actionTarget as ModuleKey)} style={styles.teacherCommunicationSendButton}>
            <Text style={styles.teacherCommunicationSendText}>{item.action}</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Editar compromisso" onPress={onEdit} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Editar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para agenda" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function getTeacherAgendaTypeMark(type: TeacherAgendaType) {
  if (type === "Avaliação") return "A+";
  if (type === "Atividade") return "✓";
  if (type === "Evento") return "E";
  if (type === "Lembrete") return "!";
  return "A";
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatTeacherDate(value: string | null) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatTeacherTime(value: string | null) {
  if (!value) return "Sem horário";
  return value.slice(0, 5);
}

function teacherAgendaDayFromDate(value: string) {
  const today = todayIsoDate();
  if (value === today) return "Hoje";
  const day = new Date(value).getDay();
  if (day === 1) return "Seg";
  if (day === 2) return "Ter";
  if (day === 3) return "Qua";
  if (day === 4) return "Qui";
  if (day === 5) return "Sex";
  return "Hoje";
}

function mapTeacherAgendaTypeFromApi(value: string | null): TeacherAgendaType {
  if (value === "atividade" || value === "atividade_online") return "Atividade";
  if (value === "avaliacao") return "Avaliação";
  if (value === "evento") return "Evento";
  if (value === "lembrete") return "Lembrete";
  return "Aula";
}

function mapTeacherAgendaTypeToApi(value: TeacherAgendaType) {
  if (value === "Atividade") return "atividade";
  if (value === "Avaliação") return "avaliacao";
  if (value === "Evento") return "evento";
  if (value === "Lembrete") return "lembrete";
  return "aula";
}

function normalizeTeacherDateInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
  return todayIsoDate();
}

function normalizeTeacherTimeInput(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function mapAttendanceStatusToApi(status: AttendanceStatus): "present" | "absent" | "justified" {
  if (status === "Falta") return "absent";
  if (status === "Justificada") return "justified";
  return "present";
}

function TeacherDiaryScreen({
  classes,
  current,
  recent,
  mode,
  selectedClass,
  date,
  content,
  record,
  activity,
  draftSaved,
  selectedEntry,
  loading,
  error,
  writeGap,
  onModeChange,
  onClassChange,
  onDateChange,
  onContentChange,
  onRecordChange,
  onActivityChange,
  onSaveDraft,
  onOpenEntry,
  onOpenAttendance
}: {
  classes: TeacherClassSummary[];
  current: TeacherDiaryCurrent;
  recent: TeacherDiaryEntry[];
  mode: TeacherDiaryMode;
  selectedClass: TeacherClassSummary;
  date: string;
  content: string;
  record: string;
  activity: string;
  draftSaved: boolean;
  selectedEntry: TeacherDiaryEntry | null;
  loading: boolean;
  error: boolean;
  writeGap: boolean;
  onModeChange: (mode: TeacherDiaryMode) => void;
  onClassChange: (className: string) => void;
  onDateChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onRecordChange: (value: string) => void;
  onActivityChange: (value: string) => void;
  onSaveDraft: () => void;
  onOpenEntry: (entry: TeacherDiaryEntry) => void;
  onOpenAttendance: () => void;
}) {
  if (mode === "confirm") {
    return (
      <TeacherDiaryConfirm
        selectedClass={selectedClass}
        date={date}
        content={content}
        attendance={current.attendance}
        onReview={() => onModeChange("form")}
        onClose={() => onModeChange("closed")}
      />
    );
  }

  if (mode === "closed") {
    return (
      <TeacherDiaryClosedView
        selectedClass={selectedClass}
        date={date}
        content={content}
        record={record}
        activity={activity}
        attendance={current.attendance}
        onBack={() => onModeChange("form")}
      />
    );
  }

  if (mode === "detail" && selectedEntry) {
    return <TeacherDiaryDetail entry={selectedEntry} onBack={() => onModeChange("form")} />;
  }

  return (
    <View>
      <TeacherModuleHero title="Diário de Classe" intro="Registre o que foi trabalhado na aula." icon={{ source: teacherHomeIcons.diary, side: "right" }}>
        <View style={styles.teacherDiaryMetaGrid}>
          <View style={styles.teacherDiaryMetaPill}>
            <Text style={styles.teacherDiaryMetaLabel}>Turma</Text>
            <Text style={styles.teacherDiaryMetaValue}>{selectedClass.className}</Text>
          </View>
          <View style={styles.teacherDiaryMetaPill}>
            <Text style={styles.teacherDiaryMetaLabel}>Data</Text>
            <Text style={styles.teacherDiaryMetaValue}>{date}</Text>
          </View>
        </View>
      </TeacherModuleHero>

      <SectionHeader title="Turma" action="Selecionar" />
      {loading ? <EmptyState title="Carregando turmas" body="Buscando suas turmas autorizadas." /> : null}
      {error ? <EmptyState title="Diário indisponível" body="Não foi possível carregar os registros agora." /> : null}
      <View style={styles.teacherCommunicationClassRow}>
        {classes.map((item) => (
          <Pressable
            key={item.className}
            accessibilityRole="button"
            accessibilityLabel={`Selecionar turma ${item.className}`}
            onPress={() => onClassChange(item.className)}
            style={[styles.teacherCommunicationClassChip, selectedClass.className === item.className ? styles.teacherCommunicationClassChipActive : null]}
          >
            <Text style={[styles.teacherCommunicationClassText, selectedClass.className === item.className ? styles.teacherCommunicationClassTextActive : null]}>{item.className}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.teacherAgendaSelectedClass}>Turma selecionada: {selectedClass.className}</Text>

      <View style={styles.teacherDiaryPlanCard}>
        <Text style={styles.teacherDiaryPlanLabel}>Planejado para hoje</Text>
        <Text style={styles.teacherDiaryPlanTitle}>{current.planned}</Text>
        <Text style={styles.teacherDiaryPlanBody}>Compromisso da agenda usado como referência para o registro da aula.</Text>
      </View>

      <View style={styles.teacherDiaryFormCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Data da aula</Text>
        <TextInput accessibilityLabel="Data da aula" value={date} onChangeText={onDateChange} style={styles.teacherCommunicationInput} />

        <Text style={styles.teacherCommunicationFieldLabel}>Conteúdo trabalhado</Text>
        <TextInput
          accessibilityLabel="Conteúdo trabalhado"
          value={content}
          onChangeText={onContentChange}
          multiline
          style={[styles.teacherCommunicationInput, styles.teacherDiaryTextArea]}
        />
        <Text style={styles.teacherDiaryHelpText}>Ex.: leitura, roda de conversa, números até 20...</Text>

        <Text style={styles.teacherCommunicationFieldLabel}>Registro pedagógico</Text>
        <TextInput
          accessibilityLabel="Registro pedagógico"
          value={record}
          onChangeText={onRecordChange}
          multiline
          style={[styles.teacherCommunicationInput, styles.teacherDiaryTextAreaLarge]}
        />
        <Text style={styles.teacherDiaryHelpText}>Use observações gerais da turma. Registros individuais ficam para outro fluxo.</Text>
      </View>

      <SectionHeader title="Frequência da aula" action="Resumo" />
      <View style={styles.teacherDiaryAttendanceCard}>
        <TeacherAttendanceSummaryCard label="Presentes" value={current.attendance.present} tone="present" />
        <TeacherAttendanceSummaryCard label="Faltas" value={current.attendance.absent} tone="absent" />
        <TeacherAttendanceSummaryCard label="Justificadas" value={current.attendance.justified} tone="justified" />
        <Pressable accessibilityRole="button" accessibilityLabel="Ver chamada" onPress={onOpenAttendance} style={styles.teacherDiaryAttendanceLink}>
          <Text style={styles.teacherDiaryAttendanceLinkText}>Ver chamada</Text>
        </Pressable>
      </View>

      <SectionHeader title="Atividade relacionada" />
      <View style={styles.teacherDiaryActivityGrid}>
        {current.activities.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Selecionar atividade ${item}`}
            onPress={() => onActivityChange(item)}
            style={[styles.teacherDiaryActivityChip, activity === item ? styles.teacherDiaryActivityChipActive : null]}
          >
            <Text style={[styles.teacherDiaryActivityText, activity === item ? styles.teacherDiaryActivityTextActive : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      {draftSaved ? (
        <View style={styles.teacherCommunicationSentCard}>
          <Text style={styles.teacherCommunicationSentTitle}>Rascunho salvo neste dispositivo</Text>
          <Text style={styles.teacherCommunicationSentBody}>Você pode revisar o conteúdo antes de concluir o registro.</Text>
        </View>
      ) : null}
      {writeGap ? (
        <View style={styles.teacherCommunicationSentCard}>
          <Text style={styles.teacherCommunicationSentTitle}>Edição indisponível por enquanto</Text>
          <Text style={styles.teacherCommunicationSentBody}>Você já pode consultar os registros publicados. O salvamento será liberado em uma próxima atualização.</Text>
        </View>
      ) : null}

      <View style={styles.teacherDiaryActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Salvar rascunho" onPress={onSaveDraft} disabled={writeGap} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Salvar rascunho</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Concluir registro" onPress={() => onModeChange("confirm")} disabled={writeGap} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Concluir registro</Text>
        </Pressable>
      </View>

      <SectionHeader title="Registros recentes" />
      <View style={styles.teacherDiaryRecentList}>
        {!loading && !error && recent.length === 0 ? <EmptyState title="Nenhum registro publicado" body="Quando houver diário real, os registros aparecerão aqui." /> : null}
        {recent.map((entry) => (
          <TeacherDiaryRecentCard key={entry.id} entry={entry} onPress={() => onOpenEntry(entry)} />
        ))}
      </View>
    </View>
  );
}

function TeacherDiaryConfirm({
  selectedClass,
  date,
  content,
  attendance,
  onReview,
  onClose
}: {
  selectedClass: TeacherClassSummary;
  date: string;
  content: string;
  attendance: TeacherDiaryCurrent["attendance"];
  onReview: () => void;
  onClose: () => void;
}) {
  return (
    <View>
      <View style={styles.teacherDiaryConfirmHero}>
        <Text style={styles.teacherKickerOnDark}>Revisão</Text>
        <Text style={styles.teacherAgendaDetailTitle}>Concluir registro da aula?</Text>
        <Text style={styles.teacherAgendaDetailMeta}>
          {selectedClass.className} · {date}
        </Text>
      </View>

      <View style={styles.teacherDiaryConfirmCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Conteúdo</Text>
        <Text style={styles.teacherDiaryConfirmText}>{content}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Frequência</Text>
        <Text style={styles.teacherDiaryConfirmText}>
          {attendance.present} presentes, {attendance.absent} faltas e {attendance.justified} justificadas.
        </Text>
      </View>

      <View style={styles.teacherDiaryActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Revisar registro" onPress={onReview} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Revisar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Concluir registro da aula" onPress={onClose} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Concluir</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeacherDiaryClosedView({
  selectedClass,
  date,
  content,
  record,
  activity,
  attendance,
  onBack
}: {
  selectedClass: TeacherClassSummary;
  date: string;
  content: string;
  record: string;
  activity: string;
  attendance: TeacherDiaryCurrent["attendance"];
  onBack: () => void;
}) {
  return (
    <View>
      <View style={styles.teacherDiaryClosedHero}>
        <Text style={styles.teacherKickerOnDark}>Registro concluído</Text>
        <Text style={styles.teacherAgendaDetailTitle}>{selectedClass.className}</Text>
        <Text style={styles.teacherAgendaDetailMeta}>{date}</Text>
      </View>

      <View style={styles.teacherDiaryConfirmCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Conteúdo trabalhado</Text>
        <Text style={styles.teacherDiaryConfirmText}>{content}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Registro pedagógico</Text>
        <Text style={styles.teacherDiaryConfirmText}>{record}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Atividade relacionada</Text>
        <Text style={styles.teacherDiaryConfirmText}>{activity}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Frequência</Text>
        <Text style={styles.teacherDiaryConfirmText}>
          {attendance.present} presentes, {attendance.absent} faltas e {attendance.justified} justificadas.
        </Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para o Diário" onPress={onBack} style={styles.teacherCommunicationSendButton}>
        <Text style={styles.teacherCommunicationSendText}>Voltar para o Diário</Text>
      </Pressable>
    </View>
  );
}

function TeacherDiaryRecentCard({ entry, onPress }: { entry: TeacherDiaryEntry; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir registro ${entry.title}`} onPress={onPress} style={styles.teacherDiaryRecentCard}>
      <View style={styles.teacherDiaryRecentTop}>
        <View style={styles.teacherDiaryRecentMark}>
          <Text style={styles.teacherDiaryRecentMarkText}>{entry.state === "Concluído" ? "✓" : "R"}</Text>
        </View>
        <View style={styles.teacherDiaryRecentCopy}>
          <Text style={styles.teacherDiaryRecentTitle}>{entry.title}</Text>
          <Text style={styles.teacherDiaryRecentMeta}>
            {entry.className} · {entry.date}
          </Text>
        </View>
        <View style={[styles.teacherCommunicationStatusPill, entry.state === "Rascunho" ? styles.teacherCommunicationStatusPillMuted : null]}>
          <Text style={styles.teacherCommunicationStatusText}>{entry.state}</Text>
        </View>
      </View>
      <Text style={styles.teacherDiaryRecentSummary}>{entry.summary}</Text>
    </Pressable>
  );
}

function TeacherDiaryDetail({ entry, onBack }: { entry: TeacherDiaryEntry; onBack: () => void }) {
  return (
    <View>
      <View style={styles.teacherDiaryDetailHero}>
        <Text style={styles.teacherKickerOnDark}>{entry.state}</Text>
        <Text style={styles.teacherAgendaDetailTitle}>{entry.title}</Text>
        <Text style={styles.teacherAgendaDetailMeta}>
          {entry.className} · {entry.date}
        </Text>
      </View>
      <View style={styles.teacherDiaryConfirmCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Resumo</Text>
        <Text style={styles.teacherDiaryConfirmText}>{entry.summary}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para o Diário" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
        <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
      </Pressable>
    </View>
  );
}

function TeacherAvaliaScreen({
  assessments,
  classes,
  mode,
  filter,
  selectedAssessment,
  selectedClass,
  availableFrom,
  dueDate,
  published,
  selectedStudent,
  onModeChange,
  onFilterChange,
  onOpenAssessment,
  onClassChange,
  onAvailableFromChange,
  onDueDateChange,
  onPublish,
  onOpenStudent
}: {
  assessments: TeacherAvaliaAssessment[];
  classes: TeacherClassSummary[];
  mode: TeacherAvaliaMode;
  filter: TeacherAvaliaFilter;
  selectedAssessment: TeacherAvaliaAssessment;
  selectedClass: TeacherClassSummary;
  availableFrom: string;
  dueDate: string;
  published: boolean;
  selectedStudent: TeacherAvaliaStudent | null;
  onModeChange: (mode: TeacherAvaliaMode) => void;
  onFilterChange: (filter: TeacherAvaliaFilter) => void;
  onOpenAssessment: (assessment: TeacherAvaliaAssessment, mode: TeacherAvaliaMode) => void;
  onClassChange: (className: string) => void;
  onAvailableFromChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onPublish: () => void;
  onOpenStudent: (student: TeacherAvaliaStudent) => void;
}) {
  if (mode === "detail") {
    return <TeacherAvaliaDetail assessment={selectedAssessment} onBack={() => onModeChange("list")} onApply={() => onModeChange("apply")} />;
  }

  if (mode === "apply") {
    return (
      <TeacherAvaliaApply
        assessment={selectedAssessment}
        classes={classes}
        selectedClass={selectedClass}
        availableFrom={availableFrom}
        dueDate={dueDate}
        onBack={() => onModeChange("detail")}
        onClassChange={onClassChange}
        onAvailableFromChange={onAvailableFromChange}
        onDueDateChange={onDueDateChange}
        onReview={() => onModeChange("review")}
      />
    );
  }

  if (mode === "review") {
    return (
      <TeacherAvaliaReview
        assessment={selectedAssessment}
        selectedClass={selectedClass}
        availableFrom={availableFrom}
        dueDate={dueDate}
        onBack={() => onModeChange("apply")}
        onPublish={onPublish}
      />
    );
  }

  if (mode === "published") {
    return (
      <TeacherAvaliaPublished
        assessment={selectedAssessment}
        selectedClass={selectedClass}
        availableFrom={availableFrom}
        dueDate={dueDate}
        published={published}
        onBack={() => onModeChange("list")}
        onResults={() => onModeChange("results")}
      />
    );
  }

  if (mode === "results") {
    return <TeacherAvaliaResults assessment={selectedAssessment} selectedClass={selectedClass} onBack={() => onModeChange("list")} onOpenStudent={onOpenStudent} />;
  }

  if (mode === "student" && selectedStudent) {
    return <TeacherAvaliaStudentResult student={selectedStudent} assessment={selectedAssessment} onBack={() => onModeChange("results")} />;
  }

  const available = assessments.filter((item) => item.state === "Disponível");
  const applied = assessments.filter((item) => item.state === "Aplicada" || item.state === "Em andamento");
  const inProgress = assessments.filter((item) => item.state === "Em andamento");
  const completed = assessments.filter((item) => item.state === "Encerrada");
  const visibleAssessments = assessments.filter((item) => {
    if (filter === "Disponíveis") return item.state === "Disponível";
    if (filter === "Aplicadas") return item.state === "Aplicada" || item.state === "Em andamento";
    if (filter === "Concluídas") return item.state === "Encerrada";
    return true;
  });

  return (
    <View>
      <TeacherModuleHero title="Avalia+" intro="Aplique avaliações e acompanhe os resultados das suas turmas." icon={{ source: teacherHomeIcons.avalia, side: "right" }}>
        <Text style={styles.teacherAvaliaContext}>Turma selecionada: {selectedClass.className}</Text>
      </TeacherModuleHero>

      <View style={styles.teacherAvaliaSummaryGrid}>
        <TeacherAvaliaSummaryCard label="Disponíveis" value={available.length} />
        <TeacherAvaliaSummaryCard label="Aplicadas" value={applied.length} />
        <TeacherAvaliaSummaryCard label="Em andamento" value={inProgress.length} />
        <TeacherAvaliaSummaryCard label="Concluídas" value={completed.length} />
      </View>

      <SectionHeader title="Filtros" />
      <View style={styles.teacherAvaliaFilterRow}>
        {(["Todas", "Disponíveis", "Aplicadas", "Concluídas"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar ${item}`}
            onPress={() => onFilterChange(item)}
            style={[styles.teacherAvaliaFilterChip, filter === item ? styles.teacherAvaliaFilterChipActive : null]}
          >
            <Text style={[styles.teacherAvaliaFilterText, filter === item ? styles.teacherAvaliaFilterTextActive : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Avaliações" />
      <View style={styles.teacherAvaliaList}>
        {visibleAssessments.map((assessment) => (
          <TeacherAvaliaCard
            key={assessment.id}
            assessment={assessment}
            onPress={() => onOpenAssessment(assessment, assessment.state === "Disponível" ? "detail" : "results")}
          />
        ))}
        {visibleAssessments.length === 0 ? <EmptyState title="Nenhuma avaliação publicada" body="Quando houver avaliação para suas turmas, ela aparecerá aqui." /> : null}
      </View>
    </View>
  );
}

function TeacherAvaliaSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.teacherAvaliaSummaryCard}>
      <Text style={styles.teacherAvaliaSummaryValue}>{value}</Text>
      <Text style={styles.teacherAvaliaSummaryLabel}>{label}</Text>
    </View>
  );
}

function TeacherAvaliaCard({ assessment, onPress }: { assessment: TeacherAvaliaAssessment; onPress: () => void }) {
  const participation = assessment.assigned > 0 ? Math.round((assessment.completed / assessment.assigned) * 100) : 0;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir avaliação ${assessment.title}`} onPress={onPress} style={styles.teacherAvaliaCard}>
      <View style={styles.teacherAvaliaCardTop}>
        <View style={styles.teacherAvaliaMark}>
          <Text style={styles.teacherAvaliaMarkText}>A+</Text>
        </View>
        <View style={styles.teacherAvaliaCardCopy}>
          <Text style={styles.teacherAvaliaSubject}>{assessment.subject}</Text>
          <Text style={styles.teacherAvaliaTitle}>{assessment.title}</Text>
          <Text style={styles.teacherAvaliaMeta}>
            {assessment.questions} questões{assessment.className ? ` · ${assessment.className}` : ""}
          </Text>
        </View>
        <View style={styles.teacherAvaliaStatePill}>
          <Text style={styles.teacherAvaliaStateText}>{assessment.state}</Text>
        </View>
      </View>
      {assessment.assigned > 0 ? (
        <View style={styles.teacherAvaliaParticipationBox}>
          <Text style={styles.teacherAvaliaParticipationText}>
            {assessment.completed} de {assessment.assigned} concluíram · {participation}% de participação
          </Text>
        </View>
      ) : null}
      <Text style={styles.teacherAvaliaActionText}>{assessment.action}</Text>
    </Pressable>
  );
}

function TeacherAvaliaDetail({ assessment, onBack, onApply }: { assessment: TeacherAvaliaAssessment; onBack: () => void; onApply: () => void }) {
  return (
    <View>
      <View style={styles.teacherAvaliaDetailHero}>
        <Text style={styles.teacherKickerOnDark}>{assessment.subject}</Text>
        <Text style={styles.teacherAgendaDetailTitle}>{assessment.title}</Text>
        <Text style={styles.teacherAgendaDetailMeta}>{assessment.questions} questões · avaliação disponível</Text>
      </View>

      <View style={styles.teacherAvaliaDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Descrição</Text>
        <Text style={styles.teacherAvaliaDetailText}>{assessment.description}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Habilidades trabalhadas</Text>
        <View style={styles.teacherAvaliaSkillRow}>
          {assessment.skills.map((skill) => (
            <View key={skill.code} style={styles.teacherAvaliaSkillPill}>
              <Text style={styles.teacherAvaliaSkillText}>{skill.code} · {skill.percent}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.teacherDiaryActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para Avalia+" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Aplicar avaliação" onPress={onApply} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Aplicar avaliação</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeacherAvaliaApply({
  assessment,
  classes,
  selectedClass,
  availableFrom,
  dueDate,
  onBack,
  onClassChange,
  onAvailableFromChange,
  onDueDateChange,
  onReview
}: {
  assessment: TeacherAvaliaAssessment;
  classes: TeacherClassSummary[];
  selectedClass: TeacherClassSummary;
  availableFrom: string;
  dueDate: string;
  onBack: () => void;
  onClassChange: (className: string) => void;
  onAvailableFromChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  onReview: () => void;
}) {
  return (
    <View>
      <TeacherModuleHero title={assessment.title} intro="Escolha a turma e o período de disponibilidade." kicker="Aplicar avaliação" icon={{ source: teacherHomeIcons.avalia, side: "right" }} />

      <View style={styles.teacherAvaliaDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Turma</Text>
        <View style={styles.teacherCommunicationClassRow}>
          {classes.map((item) => (
            <Pressable
              key={item.className}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar turma ${item.className}`}
              onPress={() => onClassChange(item.className)}
              style={[styles.teacherCommunicationClassChip, selectedClass.className === item.className ? styles.teacherCommunicationClassChipActive : null]}
            >
              <Text style={[styles.teacherCommunicationClassText, selectedClass.className === item.className ? styles.teacherCommunicationClassTextActive : null]}>{item.className}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.teacherAgendaSelectedClass}>Turma selecionada: {selectedClass.className}</Text>

        <Text style={styles.teacherCommunicationFieldLabel}>Disponível a partir de</Text>
        <TextInput accessibilityLabel="Data de disponibilidade" value={availableFrom} onChangeText={onAvailableFromChange} style={styles.teacherCommunicationInput} />

        <Text style={styles.teacherCommunicationFieldLabel}>Prazo</Text>
        <TextInput accessibilityLabel="Prazo da avaliação" value={dueDate} onChangeText={onDueDateChange} style={styles.teacherCommunicationInput} />
      </View>

      <View style={styles.teacherDiaryActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para detalhe da avaliação" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Revisar publicação" onPress={onReview} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Revisar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeacherAvaliaReview({
  assessment,
  selectedClass,
  availableFrom,
  dueDate,
  onBack,
  onPublish
}: {
  assessment: TeacherAvaliaAssessment;
  selectedClass: TeacherClassSummary;
  availableFrom: string;
  dueDate: string;
  onBack: () => void;
  onPublish: () => void;
}) {
  return (
    <View>
      <View style={styles.teacherAvaliaDetailHero}>
        <Text style={styles.teacherKickerOnDark}>Revisão</Text>
        <Text style={styles.teacherAgendaDetailTitle}>Publicar avaliação?</Text>
        <Text style={styles.teacherAgendaDetailMeta}>{assessment.title}</Text>
      </View>

      <View style={styles.teacherAvaliaDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Turma</Text>
        <Text style={styles.teacherAvaliaDetailText}>{selectedClass.className} · {selectedClass.students}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Período</Text>
        <Text style={styles.teacherAvaliaDetailText}>{availableFrom} até {dueDate}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Questões</Text>
        <Text style={styles.teacherAvaliaDetailText}>{assessment.questions} questões para acompanhar depois.</Text>
      </View>

      <View style={styles.teacherDiaryActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Revisar aplicação" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Revisar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Publicar avaliação" onPress={onPublish} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Publicar</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeacherAvaliaPublished({
  assessment,
  selectedClass,
  availableFrom,
  dueDate,
  published,
  onBack,
  onResults
}: {
  assessment: TeacherAvaliaAssessment;
  selectedClass: TeacherClassSummary;
  availableFrom: string;
  dueDate: string;
  published: boolean;
  onBack: () => void;
  onResults: () => void;
}) {
  return (
    <View>
      <View style={styles.teacherDiaryClosedHero}>
        <Text style={styles.teacherKickerOnDark}>{published ? "Avaliação publicada" : "Avalia+"}</Text>
        <Text style={styles.teacherAgendaDetailTitle}>{assessment.title}</Text>
        <Text style={styles.teacherAgendaDetailMeta}>{selectedClass.className} · {availableFrom} até {dueDate}</Text>
      </View>

      <View style={styles.teacherAvaliaDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Resumo</Text>
        <Text style={styles.teacherAvaliaDetailText}>
          A publicação será concluída durante o fechamento autenticado da professora.
        </Text>
      </View>

      <View style={styles.teacherDiaryActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para Avalia+" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar para Avalia+</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ver avaliação aplicada" onPress={onResults} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Ver avaliação aplicada</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeacherAvaliaResults({
  assessment,
  selectedClass,
  onBack,
  onOpenStudent
}: {
  assessment: TeacherAvaliaAssessment;
  selectedClass: TeacherClassSummary;
  onBack: () => void;
  onOpenStudent: (student: TeacherAvaliaStudent) => void;
}) {
  const assigned = assessment.assigned || selectedClass.studentCount;
  const completed = assessment.completed || 0;
  const participation = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
  const students = assessment.students;

  return (
    <View>
      <TeacherModuleHero title={assessment.title} intro={assessment.className || selectedClass.className} kicker="Resultados" icon={{ source: teacherHomeIcons.avalia, side: "right" }} />

      <View style={styles.teacherAvaliaResultGrid}>
        <TeacherAvaliaResultStat label="Atribuídos" value={assigned} />
        <TeacherAvaliaResultStat label="Concluídos" value={completed} />
        <TeacherAvaliaResultStat label="Participação" value={`${participation}%`} />
        <TeacherAvaliaResultStat label="Média" value={assessment.average || "Em aberto"} />
      </View>

      <View style={styles.teacherAvaliaDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Resultados da turma</Text>
        <Text style={styles.teacherAvaliaDetailText}>Mais acertos: {assessment.success}</Text>
        <Text style={styles.teacherAvaliaDetailText}>Merece atenção: {assessment.attention}</Text>
      </View>

      <SectionHeader title="Habilidades trabalhadas" />
      <View style={styles.teacherAvaliaSkillRow}>
        {assessment.skills.map((skill) => (
          <View key={skill.code} style={styles.teacherAvaliaSkillPill}>
            <Text style={styles.teacherAvaliaSkillText}>{skill.code} · {skill.percent}</Text>
          </View>
        ))}
      </View>

      <SectionHeader title="Alunos" action="Sem comparação" />
      <View style={styles.teacherAvaliaStudentList}>
        {students.map((student) => (
          <Pressable key={student.name} accessibilityRole="button" accessibilityLabel={`Abrir resultado de ${student.name}`} onPress={() => onOpenStudent(student)} style={styles.teacherAvaliaStudentCard}>
            <View>
              <Text style={styles.teacherAvaliaStudentName}>{student.name}</Text>
              <Text style={styles.teacherAvaliaStudentMeta}>{student.state}</Text>
            </View>
            <Text style={styles.teacherAvaliaStudentScore}>{student.score}</Text>
          </Pressable>
        ))}
        {students.length === 0 ? <EmptyState title="Sem resultados publicados" body="Os resultados aparecerão quando houver tentativas concluídas." /> : null}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para Avalia+" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
        <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
      </Pressable>
    </View>
  );
}

function TeacherAvaliaResultStat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.teacherAvaliaResultStat}>
      <Text style={styles.teacherAvaliaResultValue}>{value}</Text>
      <Text style={styles.teacherAvaliaResultLabel}>{label}</Text>
    </View>
  );
}

function TeacherAvaliaStudentResult({ student, assessment, onBack }: { student: TeacherAvaliaStudent; assessment: TeacherAvaliaAssessment; onBack: () => void }) {
  return (
    <View>
      <View style={styles.teacherAvaliaDetailHero}>
        <Text style={styles.teacherKickerOnDark}>{assessment.title}</Text>
        <Text style={styles.teacherAgendaDetailTitle}>{student.name}</Text>
        <Text style={styles.teacherAgendaDetailMeta}>{student.state}</Text>
      </View>

      <View style={styles.teacherAvaliaResultGrid}>
        <TeacherAvaliaResultStat label="Percentual" value={student.score} />
        <TeacherAvaliaResultStat label="Acertos" value={student.correct} />
        <TeacherAvaliaResultStat label="Erros" value={student.wrong} />
      </View>

      <View style={styles.teacherAvaliaDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Acompanhamento</Text>
        <Text style={styles.teacherAvaliaDetailText}>Resultado individual para orientar a devolutiva pedagógica, sem comparação com colegas.</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para resultados" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
        <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
      </Pressable>
    </View>
  );
}

function TeacherNotificationsScreen({
  items,
  filter,
  readState,
  selectedItem,
  onFilterChange,
  onOpenItem,
  onBack,
  onMarkAllRead,
  onAction
}: {
  items: TeacherNotificationItem[];
  filter: TeacherNotificationFilter;
  readState: Record<string, boolean>;
  selectedItem: TeacherNotificationItem | null;
  onFilterChange: (filter: TeacherNotificationFilter) => void;
  onOpenItem: (item: TeacherNotificationItem) => void;
  onBack: () => void;
  onMarkAllRead: () => void;
  onAction: (target: ModuleKey) => void;
}) {
  const filters: TeacherNotificationFilter[] = ["Tudo", "Comunicação", "Agenda", "Avalia+", "Alertas"];
  const isItemRead = (item: TeacherNotificationItem) => readState[item.id] ?? !item.unread;
  const unreadCount = items.filter((item) => !isItemRead(item)).length;
  const filteredItems = filter === "Tudo" ? items : items.filter((item) => item.type === filter);

  if (selectedItem) {
    const read = isItemRead(selectedItem);

    return (
      <TeacherShell title="Notificações" intro="Acompanhe recados, prazos e informações importantes.">
        <View style={styles.teacherNotificationDetailHero}>
          <View style={styles.teacherNotificationMarkLarge}>
            <Text style={styles.teacherNotificationMarkText}>{selectedItem.mark}</Text>
          </View>
          <View style={styles.teacherNotificationDetailCopy}>
            <Text style={styles.teacherNotificationTypeText}>{selectedItem.type}</Text>
            <Text style={styles.teacherNotificationDetailTitle}>{selectedItem.title}</Text>
            <Text style={styles.teacherNotificationDetailMeta}>{selectedItem.context} · {selectedItem.date}</Text>
          </View>
          {!read ? (
            <View style={styles.teacherNotificationStatePill}>
              <Text style={styles.teacherNotificationStateText}>Nova</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.teacherNotificationDetailCard}>
          <Text style={styles.teacherNotificationDetailMessage}>{selectedItem.message}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={selectedItem.action} onPress={() => onAction(selectedItem.actionTarget as ModuleKey)} style={styles.teacherNotificationPrimaryButton}>
            <Text style={styles.teacherNotificationPrimaryText}>{selectedItem.action}</Text>
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para notificações" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
        </Pressable>
      </TeacherShell>
    );
  }

  return (
    <TeacherShell title="Notificações" intro="Acompanhe recados, prazos e informações importantes.">
      <View style={styles.teacherNotificationsHero}>
        <View style={styles.teacherNotificationsHeroCopy}>
          <Text style={styles.teacherKicker}>Central do professor</Text>
          <Text style={styles.teacherNotificationsHeroTitle}>Tudo em um só lugar</Text>
          <Text style={styles.teacherNotificationsHeroBody}>Recados, agenda, Avalia+ e lembretes pedagógicos para organizar sua rotina.</Text>
        </View>
        {unreadCount > 0 ? (
          <View style={styles.teacherNotificationsBadge}>
            <Text style={styles.teacherNotificationsBadgeNumber}>{unreadCount}</Text>
            <Text style={styles.teacherNotificationsBadgeText}>{unreadCount === 1 ? "nova" : "novas"}</Text>
          </View>
        ) : null}
      </View>

      {unreadCount > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Marcar todas como lidas" onPress={onMarkAllRead} style={styles.teacherNotificationsMarkAll}>
          <Text style={styles.teacherNotificationsMarkAllText}>Marcar todas como lidas</Text>
        </Pressable>
      ) : (
        <View style={styles.teacherNotificationsEmpty}>
          <Text style={styles.teacherNotificationsEmptyTitle}>Você está em dia por aqui.</Text>
          <Text style={styles.teacherNotificationsEmptyBody}>Quando chegarem novidades importantes, elas aparecem nesta central.</Text>
        </View>
      )}

      <View style={styles.teacherNotificationsFilterRow}>
        {filters.map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por ${item}`}
              onPress={() => onFilterChange(item)}
              style={[styles.teacherNotificationsFilterChip, active && styles.teacherNotificationsFilterChipActive]}
            >
              <Text style={[styles.teacherNotificationsFilterText, active && styles.teacherNotificationsFilterTextActive]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.teacherNotificationsList}>
        {filteredItems.map((item) => {
          const read = isItemRead(item);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir notificação ${item.title}`}
              onPress={() => onOpenItem(item)}
              style={[styles.teacherNotificationCard, !read && styles.teacherNotificationCardUnread]}
            >
              <View style={styles.teacherNotificationMark}>
                <Text style={styles.teacherNotificationMarkText}>{item.mark}</Text>
              </View>
              <View style={styles.teacherNotificationCardCopy}>
                <View style={styles.teacherNotificationCardTop}>
                  <Text style={styles.teacherNotificationTypeText}>{item.type}</Text>
                  {!read ? (
                    <View style={styles.teacherNotificationStatePill}>
                      <Text style={styles.teacherNotificationStateText}>Nova</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.teacherNotificationCardTitle}>{item.title}</Text>
                <Text style={styles.teacherNotificationCardBody}>{item.summary}</Text>
                <Text style={styles.teacherNotificationCardMeta}>{item.context} · {item.date}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </TeacherShell>
  );
}

function TeacherProfileScreen({
  context,
  summary,
  classes,
  communicationCount,
  diaryCount,
  avaliaCount,
  onOpen,
  onOpenAccessibility,
  onLogout
}: {
  context: { teacherName: string; schoolName: string; discipline: string | null; activeClassLinks: number } | null;
  summary: TeacherHomeSummary | null;
  classes: TeacherClassSummary[];
  communicationCount: number;
  diaryCount: number;
  avaliaCount: number;
  onOpen: (key: ModuleKey) => void;
  onOpenAccessibility: () => void;
  onLogout: () => void;
}) {
  const highlightedClasses = classes.slice(0, 3);
  const totalStudents = classes.reduce((sum, item) => sum + item.studentCount, 0);
  const teacherName = context?.teacherName || summary?.teacherName || "Professora";
  const schoolName = context?.schoolName || summary?.schoolName || "Escola não carregada";
  const discipline = context?.discipline || "Docente";
  const activeClassLinks = context?.activeClassLinks ?? summary?.activeClassLinks ?? classes.length;

  return (
    <TeacherShell title="Meu perfil" intro="Veja suas informações e preferências do aplicativo.">
      <View style={styles.teacherProfileIdentityCard}>
        <View style={styles.teacherProfileAvatar}>
          <Text style={styles.teacherProfileAvatarText}>H</Text>
        </View>
        <View style={styles.teacherProfileIdentityCopy}>
          <Text style={styles.teacherKickerOnLight}>Professora</Text>
          <Text style={styles.teacherProfileName}>{teacherName}</Text>
          <Text style={styles.teacherProfileMeta}>{schoolName}</Text>
          <Text style={styles.teacherProfileBody}>{discipline} · {activeClassLinks} turmas ativas</Text>
        </View>
      </View>

      <View style={styles.teacherProfileClassSummary}>
        <View style={styles.teacherProfileSectionTop}>
          <View>
            <Text style={styles.teacherProfileSectionTitle}>Minhas turmas</Text>
            <Text style={styles.teacherProfileSectionBody}>{activeClassLinks} turmas · {totalStudents} alunos acompanhados</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver todas as turmas" onPress={() => onOpen("classes")} style={styles.teacherProfileSmallButton}>
            <Text style={styles.teacherProfileSmallButtonText}>Ver todas</Text>
          </Pressable>
        </View>
        <View style={styles.teacherProfileClassChips}>
          {highlightedClasses.map((item) => (
            <View key={item.className} style={styles.teacherProfileClassChip}>
              <Text style={styles.teacherProfileClassChipTitle}>{item.className}</Text>
              <Text style={styles.teacherProfileClassChipBody}>{item.students}</Text>
            </View>
          ))}
          {highlightedClasses.length === 0 ? <EmptyState title="Nenhuma turma ativa" body="Quando houver vínculo ativo, suas turmas aparecerão aqui." /> : null}
        </View>
      </View>

      <SectionHeader title="Resumo de rotina" />
      <View style={styles.teacherProfileRoutineGrid}>
        <TeacherProfileMetric mark="T" value={activeClassLinks} label="Turmas" />
        <TeacherProfileMetric mark="✓" value={summary?.todaysCalendarCount ?? 0} label="Compromissos hoje" />
        <TeacherProfileMetric mark="D" value={diaryCount} label="Registros de Diário" />
        <TeacherProfileMetric mark="A+" value={avaliaCount} label="Avaliações" />
      </View>

      <SectionHeader title="Preferências" />
      <View style={styles.teacherProfilePreferenceList}>
        <TeacherProfilePreferenceCard mark="!" title="Notificações" description="Central de recados, prazos e avisos importantes." action="Abrir notificações" onPress={() => onOpen("notifications")} />
        <TeacherProfilePreferenceCard mark="Aa" title="Acessibilidade" description="Texto, contraste e movimento para leitura confortável." action="Ajustar" onPress={onOpenAccessibility} />
        <TeacherProfilePreferenceCard mark="♪" title="Som" description="Preferência visual para alertas do aplicativo." action="Em breve" />
      </View>

      <View style={styles.teacherProfileFormationCard}>
        <View style={styles.teacherProfileFormationMark}>
          <Text style={styles.teacherProfileFormationMarkText}>F</Text>
        </View>
        <View style={styles.teacherProfileFormationCopy}>
          <Text style={styles.teacherProfileFormationTitle}>Formação</Text>
          <Text style={styles.teacherProfileFormationBody}>Espaço preparado para trilhas de formação docente em uma próxima etapa.</Text>
        </View>
        <Text style={styles.teacherProfileFormationAction}>Futuro</Text>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Sair" onPress={onLogout} style={styles.teacherLogoutButton}>
        <Text style={styles.teacherLogoutText}>Sair</Text>
      </Pressable>
    </TeacherShell>
  );
}

function TeacherProfileMetric({ mark, value, label }: { mark: string; value: string | number; label: string }) {
  return (
    <View style={styles.teacherProfileMetricCard}>
      <View style={styles.teacherProfileMetricMark}>
        <Text style={styles.teacherProfileMetricMarkText}>{mark}</Text>
      </View>
      <Text style={styles.teacherProfileMetricValue}>{value}</Text>
      <Text style={styles.teacherProfileMetricLabel}>{label}</Text>
    </View>
  );
}

function TeacherProfilePreferenceCard({
  mark,
  title,
  description,
  action,
  onPress
}: {
  mark: string;
  title: string;
  description: string;
  action: string;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View style={styles.teacherProfilePreferenceMark}>
        <Text style={styles.teacherProfilePreferenceMarkText}>{mark}</Text>
      </View>
      <View style={styles.teacherProfilePreferenceCopy}>
        <Text style={styles.teacherProfilePreferenceTitle}>{title}</Text>
        <Text style={styles.teacherProfilePreferenceBody}>{description}</Text>
      </View>
      <Text style={styles.teacherProfilePreferenceAction}>{action}</Text>
    </>
  );

  if (!onPress) {
    return <View style={styles.teacherProfilePreferenceCard}>{content}</View>;
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress} style={styles.teacherProfilePreferenceCard}>
      {content}
    </Pressable>
  );
}

function TeacherProfileAccessibilityScreen({ onBack }: { onBack: () => void }) {
  const options = [
    { mark: "Aa", title: "Texto confortável", description: "Opção visual preparada para ampliar a leitura do aplicativo." },
    { mark: "◐", title: "Contraste", description: "Preferência visual para destacar textos, cards e botões importantes." },
    { mark: "↔", title: "Redução de movimento", description: "Preparado para deixar transições mais discretas quando necessário." }
  ];

  return (
    <TeacherShell title="Acessibilidade" intro="Ajustes visuais preparados para deixar o aplicativo mais confortável.">
      <View style={styles.teacherProfileAccessibilityList}>
        {options.map((item) => (
          <View key={item.title} style={styles.teacherProfileAccessibilityCard}>
            <View style={styles.teacherProfilePreferenceMark}>
              <Text style={styles.teacherProfilePreferenceMarkText}>{item.mark}</Text>
            </View>
            <View style={styles.teacherProfilePreferenceCopy}>
              <Text style={styles.teacherProfilePreferenceTitle}>{item.title}</Text>
              <Text style={styles.teacherProfilePreferenceBody}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para Perfil" onPress={onBack} style={styles.teacherProfileAccessibilityBackButton}>
        <Text style={styles.teacherProfileAccessibilityBackText}>Voltar para Perfil</Text>
      </Pressable>
    </TeacherShell>
  );
}

function TeacherTrackingScreen({
  classes,
  selectedClass,
  selectedStudent,
  mode,
  avaliaAssessments,
  diaryCurrent,
  diaryRecent,
  overview,
  alerts,
  onClassChange,
  onOpenStudent,
  onBackToOverview,
  onOpen
}: {
  classes: TeacherClassSummary[];
  selectedClass: TeacherClassSummary;
  selectedStudent: TeacherClassStudent | null;
  mode: TeacherTrackingMode;
  avaliaAssessments: TeacherAvaliaAssessment[];
  diaryCurrent: TeacherDiaryCurrent;
  diaryRecent: TeacherDiaryEntry[];
  overview: TeacherTrackingOverview | null;
  alerts: RealTeacherTrackingAlert[];
  onClassChange: (className: string) => void;
  onOpenStudent: (student: TeacherClassStudent) => void;
  onBackToOverview: () => void;
  onOpen: (key: ModuleKey) => void;
}) {
  const classAssessments = avaliaAssessments.filter((item) => item.className === selectedClass.className);
  const recentAssessment = classAssessments[0] ?? avaliaAssessments.find((item) => item.state !== "Disponível") ?? avaliaAssessments[0];
  const attendancePercent = overview ? `${Math.round(overview.attendanceRate)}%` : "Em aberto";
  const attendanceText = overview ? "Resumo dos últimos registros" : "Sem indicador publicado";
  const participation = recentAssessment?.assigned ? `${Math.round((recentAssessment.completed / recentAssessment.assigned) * 100)}%` : "Em aberto";
  const diaryEntry = diaryRecent.find((item) => item.className === selectedClass.className) ?? diaryRecent[0];
  const skills = recentAssessment?.skills ?? avaliaAssessments[0]?.skills ?? [];
  const followStudents = selectedClass.studentsList.slice(0, 3);
  const assessmentAverage = overview && overview.assessmentAverage > 0 ? `${Math.round(overview.assessmentAverage)}%` : recentAssessment?.average || "Em aberto";
  const assessmentParticipation = overview && overview.assessmentParticipation > 0 ? `${Math.round(overview.assessmentParticipation)}%` : participation;
  const diaryEntriesCount = overview?.diaryEntriesCount ?? diaryRecent.filter((item) => item.className === selectedClass.className).length;

  if (mode === "student" && selectedStudent) {
    const focusReason = selectedStudent.state.includes("pendente")
      ? "recado e participação"
      : selectedStudent.state.includes("Avalia")
        ? "avaliação disponível"
        : selectedStudent.state.includes("frequência")
          ? "frequência"
          : "rotina da turma";

    return (
      <View>
        <View style={styles.teacherTrackingDetailHero}>
          <Text style={[styles.teacherKicker, styles.teacherKickerOnDark]}>Acompanhamento individual</Text>
          <Text style={styles.teacherCommunicationDetailTitle}>{selectedStudent.name}</Text>
          <Text style={styles.teacherCommunicationDetailMeta}>{selectedClass.className} · {focusReason}</Text>
        </View>

        <View style={styles.teacherAvaliaResultGrid}>
          <TeacherAvaliaResultStat label="Frequência" value={selectedStudent.state.includes("frequência") ? "Atenção" : "Em dia"} />
          <TeacherAvaliaResultStat label="Avalia+" value={selectedStudent.state.includes("Avalia") ? "Pendente" : "Acompanhar"} />
          <TeacherAvaliaResultStat label="Participação" value={selectedStudent.state.includes("Atividade") ? "Em curso" : "Boa"} />
          <TeacherAvaliaResultStat label="Atividades" value="Rotina" />
        </View>

        <View style={styles.teacherTrackingDetailCard}>
          <Text style={styles.teacherCommunicationFieldLabel}>Orientação</Text>
          <Text style={styles.teacherTrackingBody}>
            Resumo visual para apoiar a devolutiva pedagógica. As informações evitam comparação com colegas e não exibem observações sensíveis nesta etapa.
          </Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para acompanhamento" onPress={onBackToOverview} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.teacherTrackingHero}>
        <Text style={styles.teacherKicker}>Professor Mobile</Text>
        <Text style={styles.teacherShellTitle}>Acompanhamento</Text>
        <Text style={styles.teacherShellIntro}>Veja como sua turma está avançando.</Text>
        <Text style={styles.teacherAvaliaContext}>Turma selecionada: {selectedClass.className}</Text>
      </View>

      <SectionHeader title="Turma" />
      <View style={styles.teacherAvaliaFilterRow}>
        {classes.map((item) => {
          const active = item.className === selectedClass.className;
          return (
            <Pressable
              key={item.className}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar turma ${item.className}`}
              onPress={() => onClassChange(item.className)}
              style={[styles.teacherAvaliaFilterChip, active && styles.teacherAvaliaFilterChipActive]}
            >
              <Text style={[styles.teacherAvaliaFilterText, active && styles.teacherAvaliaFilterTextActive]}>{item.className}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.teacherTrackingSummaryCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Resumo da turma</Text>
        <Text style={styles.teacherTrackingSummaryTitle}>{selectedClass.className}</Text>
        <Text style={styles.teacherTrackingBody}>{selectedClass.students} · {selectedClass.routine}</Text>
        <View style={styles.teacherTrackingMetricGrid}>
          <TeacherTrackingMetric label="Presença" value={attendancePercent} />
          <TeacherTrackingMetric label="Avalia+" value={assessmentAverage} />
          <TeacherTrackingMetric label="Participação" value={assessmentParticipation} />
          <TeacherTrackingMetric label="Habilidades" value={`${skills.length}`} />
        </View>
      </View>

      <View style={styles.teacherTrackingBlockGrid}>
        <TeacherTrackingBlock title="Frequência" value={attendancePercent} body={`${attendanceText}. Tendência estável nos últimos encontros.`} action="Ver frequência" onPress={() => onOpen("attendance")} />
        <TeacherTrackingBlock title="Avalia+" value={assessmentAverage} body={`${recentAssessment?.title ?? "Sem avaliação publicada"} · participação ${assessmentParticipation}.`} action="Ver resultados" onPress={() => onOpen("avalia")} />
        <TeacherTrackingBlock title="Diário de Classe" value={`${diaryEntriesCount}`} body={`Último registro: ${diaryEntry?.title ?? diaryCurrent.planned}.`} action="Abrir Diário" onPress={() => onOpen("diary")} />
      </View>

      <SectionHeader title="Habilidades" />
      <View style={styles.teacherTrackingSkillList}>
        {skills.slice(0, 3).map((skill) => (
          <View key={skill.code} style={styles.teacherTrackingSkillCard}>
            <Text style={styles.teacherAvaliaSkillText}>{skill.code}</Text>
            <Text style={styles.teacherTrackingSkillBody}>Trabalhada nas avaliações recentes · {skill.percent}</Text>
          </View>
        ))}
        {skills.length === 0 ? <EmptyState title="Sem habilidades consolidadas" body="Quando houver resultados publicados, eles aparecerão aqui." /> : null}
      </View>

      <SectionHeader title="Acompanhar de perto" />
      <View style={styles.teacherAvaliaStudentList}>
        {followStudents.map((student) => (
          <Pressable key={student.name} accessibilityRole="button" accessibilityLabel={`Abrir acompanhamento de ${student.name}`} onPress={() => onOpenStudent(student)} style={styles.teacherTrackingStudentCard}>
            <View style={styles.teacherStudentAvatar}>
              <Text style={styles.teacherStudentAvatarText}>{student.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.teacherAvaliaCardCopy}>
              <Text style={styles.teacherAvaliaStudentName}>{student.name}</Text>
              <Text style={styles.teacherAvaliaStudentMeta}>{student.state}</Text>
            </View>
            <Text style={styles.teacherAvaliaStudentScore}>Ver</Text>
          </Pressable>
        ))}
        {followStudents.length === 0 ? <EmptyState title="Sem alunos vinculados" body="Quando houver alunos na turma, o acompanhamento individual aparecerá aqui." /> : null}
      </View>

      <SectionHeader title="Alertas" />
      <View style={styles.teacherTrackingAlertList}>
        {alerts.map((alert) => (
          <TeacherTrackingAlert key={alert.id} title={alert.title} body={alert.body} />
        ))}
        {alerts.length === 0 ? <EmptyState title="Nenhum alerta no período" body="Quando houver algum ponto de atenção, ele aparecerá aqui." /> : null}
      </View>
    </View>
  );
}

function TeacherTrackingMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.teacherTrackingMetric}>
      <Text style={styles.teacherTrackingMetricValue}>{value}</Text>
      <Text style={styles.teacherTrackingMetricLabel}>{label}</Text>
    </View>
  );
}

function TeacherTrackingBlock({ title, value, body, action, onPress }: { title: string; value: string; body: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.teacherTrackingBlock}>
      <View style={styles.teacherTrackingBlockTop}>
        <Text style={styles.teacherTrackingBlockTitle}>{title}</Text>
        <Text style={styles.teacherTrackingBlockValue}>{value}</Text>
      </View>
      <Text style={styles.teacherTrackingBody}>{body}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={action} onPress={onPress} style={styles.teacherTrackingLinkButton}>
        <Text style={styles.teacherTrackingLinkText}>{action}</Text>
      </Pressable>
    </View>
  );
}

function TeacherTrackingAlert({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.teacherTrackingAlert}>
      <Text style={styles.teacherTrackingAlertTitle}>{title}</Text>
      <Text style={styles.teacherTrackingAlertBody}>{body}</Text>
    </View>
  );
}

function TeacherCommunicationScreen({
  classes,
  messages,
  mode,
  filter,
  recipientType,
  selectedClass,
  selectedStudentName,
  title,
  message,
  sent,
  selectedMessage,
  loading,
  error,
  onModeChange,
  onFilterChange,
  onRecipientTypeChange,
  onClassChange,
  onStudentChange,
  onTitleChange,
  onMessageChange,
  onSend,
  onOpenMessage
}: {
  classes: TeacherClassSummary[];
  messages: TeacherCommunicationItem[];
  mode: TeacherCommunicationMode;
  filter: TeacherCommunicationFilter;
  recipientType: TeacherCommunicationRecipientType;
  selectedClass: TeacherClassSummary;
  selectedStudentName: string;
  title: string;
  message: string;
  sent: boolean;
  selectedMessage: TeacherCommunicationItem | null;
  loading: boolean;
  error: boolean;
  onModeChange: (mode: TeacherCommunicationMode) => void;
  onFilterChange: (filter: TeacherCommunicationFilter) => void;
  onRecipientTypeChange: (type: TeacherCommunicationRecipientType) => void;
  onClassChange: (className: string) => void;
  onStudentChange: (studentName: string) => void;
  onTitleChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  onOpenMessage: (item: TeacherCommunicationItem) => void;
}) {
  const filteredMessages = messages.filter((item) => {
    if (filter === "Turmas") return item.type === "Turma";
    if (filter === "Individuais") return item.type === "Aluno";
    return true;
  });

  if (mode === "compose") {
    return (
      <TeacherCommunicationComposer
        classes={classes}
        recipientType={recipientType}
        selectedClass={selectedClass}
        selectedStudentName={selectedStudentName}
        title={title}
        message={message}
        onBack={() => onModeChange("inbox")}
        onRecipientTypeChange={onRecipientTypeChange}
        onClassChange={onClassChange}
        onStudentChange={onStudentChange}
        onTitleChange={onTitleChange}
        onMessageChange={onMessageChange}
        onSend={onSend}
      />
    );
  }

  if (mode === "detail" && selectedMessage) {
    return <TeacherCommunicationDetail item={selectedMessage} onBack={() => onModeChange("inbox")} />;
  }

  return (
    <View>
      <View style={styles.teacherCommunicationHero}>
        <Text style={styles.teacherKicker}>Professor Mobile</Text>
        <Text style={styles.teacherShellTitle}>Comunicação</Text>
        <Text style={styles.teacherShellIntro}>Envie recados para suas turmas e alunos.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Novo recado" onPress={() => onModeChange("compose")} style={styles.teacherCommunicationPrimaryButton}>
          <Text style={styles.teacherCommunicationPrimaryText}>Novo recado</Text>
        </Pressable>
      </View>

      {sent ? (
        <View style={styles.teacherCommunicationSentCard}>
          <Text style={styles.teacherCommunicationSentTitle}>Recado enviado</Text>
          <Text style={styles.teacherCommunicationSentBody}>O recado foi enviado para o destino selecionado.</Text>
        </View>
      ) : null}

      <SectionHeader title="Recados recentes" action="Histórico" />
      <View style={styles.teacherCommunicationFilterRow}>
        {(["Todos", "Turmas", "Individuais"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Filtrar ${item}`}
            onPress={() => onFilterChange(item)}
            style={[styles.teacherCommunicationFilterChip, filter === item ? styles.teacherCommunicationFilterChipActive : null]}
          >
            <Text style={[styles.teacherCommunicationFilterText, filter === item ? styles.teacherCommunicationFilterTextActive : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.teacherCommunicationList}>
        {loading ? <EmptyState title="Carregando recados" body="Buscando comunicações autorizadas." /> : null}
        {error ? <EmptyState title="Comunicação indisponível" body="Não foi possível carregar os recados agora." /> : null}
        {!loading && !error && filteredMessages.length === 0 ? <EmptyState title="Nenhum recado publicado" body="Quando houver mensagens reais, elas aparecerão aqui." /> : null}
        {filteredMessages.map((item) => (
          <TeacherCommunicationCard key={item.title} item={item} onPress={() => onOpenMessage(item)} />
        ))}
      </View>
    </View>
  );
}

function TeacherCommunicationComposer({
  classes,
  recipientType,
  selectedClass,
  selectedStudentName,
  title,
  message,
  onBack,
  onRecipientTypeChange,
  onClassChange,
  onStudentChange,
  onTitleChange,
  onMessageChange,
  onSend
}: {
  classes: TeacherClassSummary[];
  recipientType: TeacherCommunicationRecipientType;
  selectedClass: TeacherClassSummary;
  selectedStudentName: string;
  title: string;
  message: string;
  onBack: () => void;
  onRecipientTypeChange: (type: TeacherCommunicationRecipientType) => void;
  onClassChange: (className: string) => void;
  onStudentChange: (studentName: string) => void;
  onTitleChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <View>
      <View style={styles.teacherCommunicationHero}>
        <Text style={styles.teacherKicker}>Novo recado</Text>
        <Text style={styles.teacherShellTitle}>Comunicação</Text>
        <Text style={styles.teacherShellIntro}>Escolha o destinatário e escreva uma mensagem objetiva.</Text>
      </View>

      <SectionHeader title="Destinatário" action={recipientType} />
      <View style={styles.teacherCommunicationTypeRow}>
        {(["Turma", "Aluno"] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityLabel={`Recado para ${item}`}
            onPress={() => onRecipientTypeChange(item)}
            style={[styles.teacherCommunicationTypeButton, recipientType === item ? styles.teacherCommunicationTypeButtonActive : null]}
          >
            <Text style={[styles.teacherCommunicationTypeText, recipientType === item ? styles.teacherCommunicationTypeTextActive : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.teacherCommunicationClassRow}>
        {classes.map((item) => (
          <Pressable
            key={item.className}
            accessibilityRole="button"
            accessibilityLabel={`Selecionar destinatário ${item.className}`}
            onPress={() => onClassChange(item.className)}
            style={[styles.teacherCommunicationClassChip, selectedClass.className === item.className ? styles.teacherCommunicationClassChipActive : null]}
          >
            <Text style={[styles.teacherCommunicationClassText, selectedClass.className === item.className ? styles.teacherCommunicationClassTextActive : null]}>{item.className}</Text>
          </Pressable>
        ))}
      </View>

      {recipientType === "Aluno" ? (
        <View style={styles.teacherCommunicationStudentRow}>
          {selectedClass.studentsList.map((student) => (
            <Pressable
              key={student.name}
              accessibilityRole="button"
              accessibilityLabel={`Selecionar aluno ${student.name}`}
              onPress={() => onStudentChange(student.name)}
              style={[styles.teacherCommunicationStudentChip, selectedStudentName === student.name ? styles.teacherCommunicationStudentChipActive : null]}
            >
              <Text style={[styles.teacherCommunicationStudentText, selectedStudentName === student.name ? styles.teacherCommunicationStudentTextActive : null]}>{student.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.teacherCommunicationComposerCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Para</Text>
        <Text style={styles.teacherCommunicationRecipientText}>{recipientType === "Turma" ? selectedClass.className : selectedStudentName}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Título</Text>
        <TextInput accessibilityLabel="Título do recado" value={title} onChangeText={onTitleChange} style={styles.teacherCommunicationInput} />
        <Text style={styles.teacherCommunicationFieldLabel}>Mensagem</Text>
        <TextInput
          accessibilityLabel="Mensagem do recado"
          value={message}
          onChangeText={onMessageChange}
          multiline
          style={[styles.teacherCommunicationInput, styles.teacherCommunicationMessageInput]}
        />
      </View>

      <View style={styles.teacherCommunicationComposerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar para recados recentes" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
          <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar recado" onPress={onSend} disabled={classes.length === 0 || (recipientType === "Aluno" && !selectedStudentName)} style={styles.teacherCommunicationSendButton}>
          <Text style={styles.teacherCommunicationSendText}>Enviar recado</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TeacherCommunicationCard({ item, onPress }: { item: TeacherCommunicationItem; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Abrir recado ${item.title}`} onPress={onPress} style={styles.teacherCommunicationCard}>
      <View style={styles.teacherCommunicationCardTop}>
        <View style={styles.teacherCommunicationMark}>
          <Text style={styles.teacherCommunicationMarkText}>{item.type === "Turma" ? "T" : "A"}</Text>
        </View>
        <View style={styles.teacherCommunicationCardCopy}>
          <Text style={styles.teacherCommunicationCardTitle}>{item.title}</Text>
          <Text style={styles.teacherCommunicationCardMeta}>
            {item.audience} · {item.date}
          </Text>
        </View>
        <View style={[styles.teacherCommunicationStatusPill, item.status === "Retirado" ? styles.teacherCommunicationStatusPillMuted : null]}>
          <Text style={styles.teacherCommunicationStatusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.teacherCommunicationSummary}>{item.summary}</Text>
    </Pressable>
  );
}

function TeacherCommunicationDetail({ item, onBack }: { item: TeacherCommunicationItem; onBack: () => void }) {
  return (
    <View>
      <View style={styles.teacherCommunicationDetailHero}>
        <Text style={styles.teacherKicker}>Recado</Text>
        <Text style={styles.teacherCommunicationDetailTitle}>{item.title}</Text>
        <Text style={styles.teacherCommunicationDetailMeta}>
          {item.audience} · {item.date}
        </Text>
      </View>
      <View style={styles.teacherCommunicationDetailCard}>
        <Text style={styles.teacherCommunicationFieldLabel}>Status</Text>
        <Text style={styles.teacherCommunicationRecipientText}>{item.status}</Text>
        <Text style={styles.teacherCommunicationFieldLabel}>Mensagem</Text>
        <Text style={styles.teacherCommunicationDetailMessage}>{item.message}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Voltar para recados recentes" onPress={onBack} style={styles.teacherCommunicationSecondaryButton}>
        <Text style={styles.teacherCommunicationSecondaryText}>Voltar</Text>
      </Pressable>
    </View>
  );
}

function TeacherShell({ title, intro, children }: { title: string; intro: string; children?: React.ReactNode }) {
  return (
    <View>
      <View style={styles.teacherShellHero}>
        <Text style={styles.teacherKicker}>Professor Mobile</Text>
        <Text style={styles.teacherShellTitle}>{title}</Text>
        <Text style={styles.teacherShellIntro}>{intro}</Text>
      </View>
      <View style={styles.teacherShellList}>{children}</View>
    </View>
  );
}

function TeacherModuleListCard({ item, icon }: { item: TeacherModuleListItem; icon: "users" | "clipboard" | "message-square" | "calendar" | "file-text" | "bar-chart-2" | "activity" | "bell" | "user" }) {
  return <ListCard title={item.title} subtitle={item.subtitle} badge={item.badge} icon={icon} />;
}

function SharedModule({ activeKey, audience }: { activeKey: ModuleKey; audience: string }) {
  if (activeKey === "agenda") {
    return (
      <ModuleLayout title="Agenda" intro={`Agenda ${audience} com semana e compromissos.`}>
        {demoCollections.week.map((item, index) => (
          <ListCard key={item} icon="calendar" title={item} subtitle={`Dia ${index + 1} da semana`} />
        ))}
      </ModuleLayout>
    );
  }

  if (activeKey === "notifications") {
    return (
      <ModuleLayout title="Notificações" intro="Central in-app visual com categorias, lido/não lido e badge.">
        <Badge label="2 não lidas" />
        {demoCollections.notifications.map((item) => (
          <ListCard key={item.title} icon="bell" title={item.title} subtitle={item.category} badge={item.unread ? "Novo" : "Lido"} />
        ))}
      </ModuleLayout>
    );
  }

  if (activeKey === "profile") {
    return (
      <ModuleLayout title="Perfil" intro="Dados institucionais sem códigos internos ou informações sensíveis.">
        <ListCard icon="user" title="Identidade" subtitle="Nome, avatar e preferências" />
        <ListCard icon="home" title="Escola e turma" subtitle="Contexto escolar" />
        <ListCard icon="settings" title="Configurações" subtitle="Acessibilidade, segurança e sessão" />
      </ModuleLayout>
    );
  }

  return <GenericModule activeKey={activeKey} fallbackAudience={audience} />;
}

function GenericModule({
  activeKey,
  titleMap,
  fallbackAudience
}: {
  activeKey: ModuleKey;
  titleMap?: Partial<Record<ModuleKey, string[]>>;
  fallbackAudience: string;
}) {
  const labels = titleMap?.[activeKey] ?? ["Resumo", "Lista principal", "Estado vazio", "Estado de erro"];
  const title = moduleTitles[activeKey] ?? "Módulo";
  return (
    <ModuleLayout title={title} intro={`Shell visual de ${title.toLowerCase()} para ${fallbackAudience}.`}>
      {labels.map((label) => (
        <ListCard key={label} icon={moduleIcons[activeKey] ?? "circle"} title={label} subtitle="Disponível quando houver dados reais publicados." />
      ))}
      <EmptyState title="Nada publicado por enquanto" body="Quando houver conteúdo real para este espaço, ele aparecerá aqui." />
    </ModuleLayout>
  );
}

function ModuleLayout({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <View>
      <View style={styles.moduleIntro}>
        <Text style={styles.moduleTitle}>{title}</Text>
        <Text style={styles.moduleBody}>{intro}</Text>
      </View>
      <SectionHeader title="Conteúdo" />
      {children}
    </View>
  );
}

const moduleTitles: Partial<Record<ModuleKey, string>> = {
  activities: "Atividades",
  library: "Biblioteca",
  avalia: "Avalia+",
  agenda: "Agenda",
  notifications: "Notificações",
  profile: "Perfil",
  classes: "Minhas Turmas",
  attendance: "Frequência",
  communication: "Comunicação",
  diary: "Diário de Classe",
  tracking: "Acompanhamento"
};

const moduleIcons: Partial<Record<ModuleKey, "book" | "calendar" | "bell" | "user" | "users" | "clipboard" | "message-square" | "file-text" | "bar-chart-2" | "activity" | "check-square" | "circle">> = {
  activities: "check-square",
  library: "book",
  avalia: "file-text",
  agenda: "calendar",
  notifications: "bell",
  profile: "user",
  classes: "users",
  attendance: "clipboard",
  communication: "message-square",
  diary: "file-text",
  tracking: "activity"
};

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  statRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  crescerHome: {
    gap: spacing.lg,
    paddingBottom: spacing.xl
  },
  crescerHomeHeader: {
    alignItems: "center",
    marginBottom: spacing.xs
  },
  crescerBrandMark: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center"
  },
  crescerBrandTitle: {
    color: colors.brand,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27
  },
  crescerBrandSubtitle: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15
  },
  crescerWelcomeCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(201, 232, 197, 0.92)",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 112,
    padding: spacing.md,
    ...shadow
  },
  crescerAvatar: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderColor: "#b9e0b8",
    borderRadius: 28,
    borderWidth: 2,
    height: 74,
    justifyContent: "center",
    width: 74
  },
  crescerAvatarText: {
    color: colors.child,
    fontSize: 23,
    fontWeight: "900"
  },
  crescerWelcomeText: {
    flex: 1,
    minWidth: 0
  },
  crescerWelcomeTitle: {
    color: colors.brand,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29
  },
  crescerWelcomeBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: spacing.xs
  },
  crescerEncouragement: {
    alignItems: "center",
    gap: 2,
    maxWidth: 72
  },
  crescerEncouragementText: {
    color: colors.child,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center"
  },
  crescerMissionCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 241, 194, 0.95)",
    borderColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 92,
    overflow: "hidden",
    padding: spacing.md,
    position: "relative",
    shadowColor: "#c78a10",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 14
  },
  crescerMissionGlow: {
    backgroundColor: "rgba(255, 255, 255, 0.42)",
    borderRadius: 999,
    height: 118,
    position: "absolute",
    right: 74,
    top: -44,
    width: 118
  },
  crescerMissionRibbon: {
    backgroundColor: "rgba(255, 222, 121, 0.46)",
    borderRadius: 999,
    height: 76,
    position: "absolute",
    right: -22,
    top: 8,
    transform: [{ rotate: "-12deg" }],
    width: 146
  },
  crescerMissionIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 28,
    height: 62,
    justifyContent: "center",
    position: "relative",
    shadowColor: "#c78a10",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    width: 62,
    zIndex: 2
  },
  crescerMissionIconImage: {
    height: 44,
    width: 44,
    zIndex: 3
  },
  crescerMissionText: {
    flex: 1,
    minWidth: 0
  },
  crescerMissionLabel: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  crescerMissionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 23,
    marginTop: spacing.xs
  },
  crescerMissionBadge: {
    backgroundColor: "#f7df92",
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  crescerMissionBadgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  crescerStatsRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  crescerStatCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "#c9e8c5",
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  crescerStatIcon: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 25,
    height: 60,
    justifyContent: "center",
    position: "relative",
    width: 60,
    zIndex: 2
  },
  crescerStatIconImage: {
    height: 62,
    width: 62,
    zIndex: 3
  },
  crescerStatValue: {
    color: colors.brand,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 29
  },
  crescerStatLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18
  },
  crescerSectionTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xs
  },
  crescerSectionTitle: {
    color: colors.brand,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 30
  },
  crescerSectionStroke: {
    backgroundColor: "#f2a20f",
    borderRadius: 999,
    height: 5,
    width: 56
  },
  crescerLearningGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  crescerLearningGridTablet: {
    gap: spacing.lg
  },
  crescerDayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  crescerDayGridTablet: {
    gap: spacing.lg
  },
  crescerFeatureCard: {
    alignItems: "center",
    borderColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 22,
    borderWidth: 2,
    flexBasis: "47%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    minHeight: 100,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: spacing.md,
    paddingRight: 48,
    position: "relative",
    ...shadow
  },
  crescerFeatureCardLarge: {
    alignItems: "stretch",
    flexDirection: "column",
    justifyContent: "flex-end",
    minHeight: 178,
    paddingHorizontal: spacing.md,
    paddingTop: 78
  },
  crescerFeatureCardPressed: {
    borderColor: "rgba(255, 255, 255, 1)",
    shadowOpacity: 0.09,
    transform: [{ translateY: 2 }, { scale: 0.985 }]
  },
  crescerFeatureGlow: {
    backgroundColor: "rgba(255, 255, 255, 0.38)",
    borderRadius: 999,
    height: 82,
    position: "absolute",
    right: -28,
    top: -28,
    width: 82
  },
  crescerFeatureGlowLarge: {
    height: 126,
    left: -18,
    right: undefined,
    top: 14,
    width: 126
  },
  crescerFeatureIcon: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 28,
    borderWidth: 0,
    height: 72,
    justifyContent: "center",
    position: "relative",
    shadowColor: "#4b6a49",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    width: 62,
    zIndex: 2
  },
  crescerFeatureIconLarge: {
    alignSelf: "center",
    borderRadius: 46,
    height: 116,
    marginBottom: spacing.sm,
    marginTop: -76,
    transform: [{ rotate: "-6deg" }],
    width: 154
  },
  crescerFeatureIconPressed: {
    shadowOpacity: 0.08,
    transform: [{ translateY: 2 }, { scale: 0.96 }]
  },
  crescerFeatureIconImage: {
    height: 74,
    width: 74,
    zIndex: 3
  },
  crescerFeatureIconImageLarge: {
    height: 116,
    width: 154,
    zIndex: 3
  },
  crescerFeatureCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 0
  },
  crescerFeatureTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 22
  },
  crescerFeatureBody: {
    color: colors.studentInk,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2
  },
  crescerFeatureArrow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderRadius: 18,
    bottom: 14,
    height: 34,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    width: 34
  },
  crescerToneMint: {
    backgroundColor: "rgba(227, 247, 221, 0.95)"
  },
  crescerToneSun: {
    backgroundColor: "rgba(255, 241, 194, 0.95)"
  },
  crescerToneSky: {
    backgroundColor: "rgba(222, 242, 255, 0.95)"
  },
  crescerToneLilac: {
    backgroundColor: "rgba(238, 230, 255, 0.95)"
  },
  crescerToneRose: {
    backgroundColor: "rgba(255, 231, 238, 0.95)"
  },
  crescerToneMintPressed: {
    backgroundColor: "rgba(204, 241, 196, 0.98)"
  },
  crescerToneSunPressed: {
    backgroundColor: "rgba(255, 229, 158, 0.98)"
  },
  crescerToneSkyPressed: {
    backgroundColor: "rgba(196, 232, 255, 0.98)"
  },
  crescerToneLilacPressed: {
    backgroundColor: "rgba(225, 211, 255, 0.98)"
  },
  crescerToneRosePressed: {
    backgroundColor: "rgba(255, 213, 226, 0.98)"
  },
  crescerIconToneMint: {
    backgroundColor: "rgba(218, 247, 212, 0.96)"
  },
  crescerIconToneSun: {
    backgroundColor: "rgba(255, 234, 168, 0.96)"
  },
  crescerIconToneSky: {
    backgroundColor: "rgba(208, 239, 255, 0.96)"
  },
  crescerIconToneLilac: {
    backgroundColor: "rgba(229, 216, 255, 0.96)"
  },
  crescerIconToneRose: {
    backgroundColor: "rgba(255, 218, 230, 0.96)"
  },
  crescerModuleHero: {
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    minHeight: 184,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
    ...shadow
  },
  crescerModuleHeroGlow: {
    backgroundColor: "rgba(255, 255, 255, 0.45)",
    borderRadius: 999,
    height: 148,
    position: "absolute",
    right: -30,
    top: -34,
    width: 148
  },
  crescerModuleHeroCopy: {
    flex: 1,
    justifyContent: "center",
    maxWidth: "62%",
    minWidth: 0,
    zIndex: 2
  },
  crescerModuleHeroTitle: {
    fontSize: 28,
    lineHeight: 33,
    marginTop: spacing.xs
  },
  crescerModuleHeroImage: {
    bottom: 0,
    height: 148,
    position: "absolute",
    right: -8,
    width: 168,
    zIndex: 1
  },
  fundamentalHero: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
    ...shadow
  },
  fundamentalHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  fundamentalAvatar: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderColor: "#c9e8c5",
    borderRadius: 20,
    borderWidth: 2,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  fundamentalAvatarText: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: "900"
  },
  fundamentalHeroCopy: {
    flex: 1
  },
  fundamentalKicker: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalHeroTitle: {
    color: colors.brand,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: 2
  },
  fundamentalHeroMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.xs
  },
  fundamentalHeroIntro: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.md
  },
  fundamentalTodayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  fundamentalTodayCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 158,
    padding: spacing.md
  },
  fundamentalTodayMark: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 48
  },
  fundamentalTodayMarkText: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: "900"
  },
  fundamentalTodayType: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalTodayTitle: {
    color: colors.studentInk,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: spacing.xs
  },
  fundamentalTodayMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  fundamentalContinueCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalContinueCopy: {
    gap: spacing.xs
  },
  fundamentalCardLabel: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalContinueTitle: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27
  },
  fundamentalContinueBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  fundamentalContinueAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  fundamentalContinueActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  fundamentalProgressTrack: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 9,
    marginTop: spacing.sm,
    overflow: "hidden",
    width: "100%"
  },
  fundamentalProgressTrackCompact: {
    height: 7
  },
  fundamentalProgressFill: {
    backgroundColor: colors.blue,
    borderRadius: 999,
    height: "100%"
  },
  fundamentalHighlightRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md
  },
  fundamentalHighlightCard: {
    backgroundColor: "rgba(222, 242, 255, 0.95)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
    minHeight: 172,
    padding: spacing.md,
    ...shadow
  },
  fundamentalBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  fundamentalUnreadBadge: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    minWidth: 26,
    paddingHorizontal: spacing.xs
  },
  fundamentalUnreadText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  fundamentalHighlightTitle: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 22,
    marginTop: spacing.md
  },
  fundamentalHighlightBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  fundamentalLinkText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.md
  },
  fundamentalActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  fundamentalActionCard: {
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 170,
    overflow: "hidden",
    padding: spacing.md,
    position: "relative",
    ...shadow
  },
  fundamentalActionMark: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 28,
    height: 74,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 86
  },
  fundamentalActionImage: {
    height: 80,
    width: 92
  },
  fundamentalActionMarkText: {
    color: colors.blue,
    fontSize: 17,
    fontWeight: "900"
  },
  fundamentalActionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 22
  },
  fundamentalActionBody: {
    color: colors.studentInk,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  fundamentalActivityList: {
    gap: spacing.md
  },
  fundamentalActivityCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 112,
    padding: spacing.md,
    ...shadow
  },
  fundamentalActivityCopy: {
    flex: 1
  },
  fundamentalActivitySubject: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalActivityTitle: {
    color: colors.studentInk,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 21,
    marginTop: spacing.xs
  },
  fundamentalActivityDue: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: spacing.xs
  },
  fundamentalStatePill: {
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  fundamentalStateText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900"
  },
  fundamentalProgressGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  fundamentalProgressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    minHeight: 96,
    padding: spacing.md
  },
  fundamentalProgressValue: {
    color: colors.studentInk,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0
  },
  fundamentalProgressLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: spacing.xs
  },
  fundamentalShellHero: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalShellTitle: {
    color: colors.brand,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.xs
  },
  fundamentalShellIntro: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.sm
  },
  fundamentalShellList: {
    gap: spacing.md
  },
  familyCrescerHero: {
    backgroundColor: colors.childSoft,
    borderColor: "#cfe8bf",
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  familyIdentityCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  familyAvatar: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderColor: "#cfe8bf",
    borderRadius: 20,
    borderWidth: 2,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  familyAvatarText: {
    color: colors.child,
    fontSize: 20,
    fontWeight: "900"
  },
  familyIdentityCopy: {
    flex: 1
  },
  familyIdentityLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  familyIdentityName: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 2
  },
  familyIdentityMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: spacing.xs
  },
  familyChildSwitch: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  familyChildChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexGrow: 1,
    minWidth: 132,
    padding: spacing.md
  },
  familyChildChipActive: {
    backgroundColor: colors.child,
    borderColor: colors.child
  },
  familyChildChipName: {
    color: colors.studentInk,
    fontSize: 14,
    fontWeight: "900"
  },
  familyChildChipNameActive: {
    color: "#ffffff"
  },
  familyChildChipMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  familyChildChipMetaActive: {
    color: "#ecfdf3"
  },
  familySummaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  familySectionTitle: {
    color: colors.studentInk,
    fontSize: 17,
    fontWeight: "900"
  },
  familySectionBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: spacing.xs
  },
  familyMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  familyMetricCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 112,
    minWidth: 104,
    padding: spacing.md,
    ...shadow
  },
  familyMetricValue: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900"
  },
  familyMetricLabel: {
    color: colors.studentInk,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.xs
  },
  familyMetricHelper: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 2
  },
  familyPreviewList: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  familyTimelineCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58
  },
  familyTimelineMark: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  familyTimelineMarkText: {
    color: colors.child,
    fontSize: 13,
    fontWeight: "900"
  },
  familyTimelineCopy: {
    flex: 1
  },
  familyTimelineTitle: {
    color: colors.studentInk,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18
  },
  familyTimelineMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2
  },
  familyMessageCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58
  },
  familyMessageDot: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 10,
    width: 10
  },
  familyMessageDotUnread: {
    backgroundColor: colors.coral
  },
  familyUnreadText: {
    color: colors.coral,
    fontSize: 11,
    fontWeight: "900"
  },
  familyReadText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  familyQuickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.md
  },
  familyQuickCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexBasis: "45%",
    flexGrow: 1,
    minHeight: 132,
    padding: spacing.md,
    ...shadow
  },
  familyQuickMark: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 42
  },
  familyQuickMarkText: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: "900"
  },
  familyQuickTitle: {
    color: colors.studentInk,
    fontSize: 15,
    fontWeight: "900"
  },
  familyQuickBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  familyDetailList: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  familyReadOnlyNotice: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d890",
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  familyReadOnlyTitle: {
    color: colors.studentInk,
    fontSize: 15,
    fontWeight: "900"
  },
  familyReadOnlyBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  fundamentalFeaturedActivity: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalFeaturedTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  fundamentalFeaturedIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  fundamentalFeaturedIconText: {
    color: colors.blue,
    fontSize: 24,
    fontWeight: "900"
  },
  fundamentalFeaturedCopy: {
    flex: 1
  },
  fundamentalFeaturedTitle: {
    color: colors.studentInk,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 26,
    marginTop: spacing.xs
  },
  fundamentalFeaturedBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  fundamentalFeaturedAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  fundamentalFeaturedActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  fundamentalActivityDetailCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalActivityDetailRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: spacing.sm
  },
  fundamentalDetailLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  fundamentalDetailValue: {
    color: colors.studentInk,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right"
  },
  fundamentalDetailAction: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 999,
    minHeight: 46,
    justifyContent: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg
  },
  fundamentalDetailActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  fundamentalSearchCard: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderColor: "#bcd4e8",
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md
  },
  fundamentalSearchIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  fundamentalSearchIconText: {
    color: colors.blue,
    fontSize: 20,
    fontWeight: "900"
  },
  fundamentalSearchText: {
    color: colors.studentInk,
    flex: 1,
    fontSize: 15,
    fontWeight: "900"
  },
  fundamentalFeaturedBook: {
    backgroundColor: colors.surface,
    borderColor: "#bcd4e8",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 220,
    padding: spacing.md
  },
  fundamentalFeaturedBookCopy: {
    flex: 1,
    justifyContent: "center"
  },
  fundamentalBookCategory: {
    alignSelf: "flex-start",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.blue,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    textTransform: "uppercase"
  },
  fundamentalFeaturedBookTitle: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27,
    marginTop: spacing.sm
  },
  fundamentalFeaturedBookBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.sm
  },
  fundamentalBookMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  fundamentalBookMetaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  fundamentalBookAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    borderRadius: 999,
    marginTop: spacing.md,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  fundamentalBookActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalBookGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  fundamentalBookCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 248,
    padding: spacing.sm
  },
  fundamentalBookCover: {
    alignItems: "center",
    borderRadius: 18,
    height: 136,
    justifyContent: "center",
    marginBottom: spacing.sm,
    overflow: "hidden",
    width: "100%"
  },
  fundamentalBookCoverLarge: {
    height: 172,
    marginBottom: 0,
    width: 116
  },
  fundamentalBookToneBlue: {
    backgroundColor: "#dfeeff"
  },
  fundamentalBookToneGreen: {
    backgroundColor: "#dff4e7"
  },
  fundamentalBookToneGold: {
    backgroundColor: colors.warningSoft
  },
  fundamentalBookToneCoral: {
    backgroundColor: "#ffe6dc"
  },
  fundamentalBookCoverText: {
    color: colors.studentInk,
    fontSize: 24,
    fontWeight: "900"
  },
  fundamentalBookCoverTextLarge: {
    fontSize: 28
  },
  fundamentalBookCoverLine: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 999,
    bottom: 18,
    height: 8,
    left: 18,
    position: "absolute",
    right: 18
  },
  fundamentalBookCardTitle: {
    color: colors.studentInk,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  fundamentalBookCardBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  fundamentalCategoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  fundamentalCategoryPill: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  fundamentalCategoryText: {
    color: colors.studentInk,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalReaderHero: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#bcd4e8",
    borderRadius: 24,
    borderWidth: 2,
    padding: spacing.lg
  },
  fundamentalReaderTitle: {
    color: colors.studentInk,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  fundamentalReaderMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.sm,
    textAlign: "center"
  },
  fundamentalReaderSurface: {
    backgroundColor: "#fffdf7",
    borderColor: "#eadfca",
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: "center",
    marginVertical: spacing.md,
    minHeight: 280,
    padding: spacing.xl
  },
  fundamentalReaderKicker: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase"
  },
  fundamentalReaderText: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 30,
    marginTop: spacing.lg,
    textAlign: "center"
  },
  fundamentalReaderControls: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.sm
  },
  fundamentalReaderButton: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  fundamentalReaderButtonText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalReaderProgress: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  assessmentSummaryGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  assessmentSummaryCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    minHeight: 90,
    padding: spacing.md,
    ...shadow
  },
  assessmentSummaryValue: {
    color: colors.blue,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0
  },
  assessmentSummaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: spacing.xs
  },
  assessmentList: {
    gap: spacing.md
  },
  assessmentCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.md,
    minHeight: 164,
    padding: spacing.md,
    ...shadow
  },
  assessmentCardTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  assessmentIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  assessmentIconText: {
    color: colors.blue,
    fontSize: 18,
    fontWeight: "900"
  },
  assessmentCardCopy: {
    flex: 1
  },
  assessmentSubject: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  assessmentTitle: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 22,
    marginTop: spacing.xs
  },
  assessmentMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  assessmentStatePill: {
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6
  },
  assessmentStateText: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "900"
  },
  assessmentAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.blue,
    borderRadius: 999,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  assessmentActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  assessmentQuestionHeader: {
    backgroundColor: colors.surface,
    borderColor: "#bcd4e8",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  assessmentQuestionTitle: {
    color: colors.studentInk,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.xs
  },
  assessmentQuestionMeta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    marginTop: spacing.sm
  },
  questionCard: {
    backgroundColor: "#fffdf7",
    borderColor: "#eadfca",
    borderRadius: 22,
    borderWidth: 2,
    marginTop: spacing.md,
    padding: spacing.lg
  },
  questionProgressText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  questionStatement: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 28,
    marginTop: spacing.md
  },
  answerList: {
    gap: spacing.sm
  },
  answerOption: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 66,
    padding: spacing.md
  },
  answerOptionSelected: {
    borderColor: colors.blue,
    borderWidth: 2
  },
  answerOptionMark: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  answerOptionMarkSelected: {
    backgroundColor: colors.blue
  },
  answerOptionMarkText: {
    color: colors.blue,
    fontSize: 15,
    fontWeight: "900"
  },
  answerOptionMarkTextSelected: {
    color: colors.surface
  },
  answerOptionText: {
    color: colors.studentInk,
    flex: 1,
    fontSize: 16,
    fontWeight: "800"
  },
  answerSelectedText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900"
  },
  assessmentNavigationRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  assessmentSecondaryButton: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  assessmentSecondaryButtonDisabled: {
    opacity: 0.45
  },
  assessmentSecondaryButtonText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  assessmentSubmitButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 999,
    minHeight: 48,
    justifyContent: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg
  },
  assessmentSubmitButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  submitConfirmCard: {
    backgroundColor: colors.surface,
    borderColor: "#bcd4e8",
    borderRadius: 24,
    borderWidth: 2,
    padding: spacing.lg
  },
  submitConfirmTitle: {
    color: colors.studentInk,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.xs
  },
  submitConfirmBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: spacing.sm
  },
  submitStatsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  submitStatCard: {
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    flex: 1,
    minHeight: 94,
    padding: spacing.md
  },
  submitStatValue: {
    color: colors.blue,
    fontSize: 26,
    fontWeight: "900"
  },
  submitStatLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  submitActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  reviewButton: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    flex: 1,
    minHeight: 48,
    justifyContent: "center"
  },
  reviewButtonText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: "900"
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 999,
    flex: 1,
    minHeight: 48,
    justifyContent: "center"
  },
  sendButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  resultHero: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#bcd4e8",
    borderRadius: 24,
    borderWidth: 2,
    padding: spacing.lg
  },
  resultScore: {
    color: colors.blue,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.sm
  },
  resultTitle: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27,
    marginTop: spacing.xs,
    textAlign: "center"
  },
  resultBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  resultStatsGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  resultStatCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    minHeight: 90,
    padding: spacing.md
  },
  resultStatValue: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900"
  },
  resultStatLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  bnccCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    padding: spacing.md
  },
  bnccPill: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  bnccPillText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "900"
  },
  fundamentalWeekStrip: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.md
  },
  fundamentalWeekDay: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#bcd4e8",
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    minHeight: 92,
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: spacing.sm
  },
  fundamentalWeekDayToday: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  fundamentalWeekDayText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  fundamentalWeekDayTextToday: {
    color: colors.surface
  },
  fundamentalWeekDateText: {
    color: colors.studentInk,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2
  },
  fundamentalWeekSummaryText: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center"
  },
  fundamentalAgendaTodayCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.sm,
    padding: spacing.md,
    ...shadow
  },
  fundamentalAgendaEmptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21
  },
  fundamentalAgendaCompactItem: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 76,
    padding: spacing.sm
  },
  fundamentalAgendaTypeMark: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 15,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  fundamentalAgendaTypeMarkText: {
    color: colors.blue,
    fontSize: 15,
    fontWeight: "900"
  },
  fundamentalAgendaCompactCopy: {
    flex: 1
  },
  fundamentalAgendaTypeText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalAgendaCompactTitle: {
    color: colors.studentInk,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 19,
    marginTop: 2
  },
  fundamentalAgendaMetaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3
  },
  fundamentalAgendaActionText: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    maxWidth: 84,
    textAlign: "right"
  },
  fundamentalAgendaFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  fundamentalAgendaFilter: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  fundamentalAgendaFilterActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  fundamentalAgendaFilterText: {
    color: colors.studentInk,
    fontSize: 12,
    fontWeight: "900"
  },
  fundamentalAgendaFilterTextActive: {
    color: colors.surface
  },
  fundamentalAgendaList: {
    gap: spacing.md
  },
  fundamentalAgendaCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  fundamentalAgendaCardTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  fundamentalAgendaCardCopy: {
    flex: 1
  },
  fundamentalAgendaTypeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  fundamentalAgendaPriority: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.studentInk,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  fundamentalAgendaCardTitle: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 22,
    marginTop: spacing.xs
  },
  fundamentalAgendaDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20
  },
  fundamentalAgendaFooter: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between"
  },
  fundamentalAgendaDueText: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "900"
  },
  fundamentalAgendaAction: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 999,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  fundamentalAgendaActionButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: "900"
  },
  fundamentalAgendaDetailCard: {
    backgroundColor: colors.surface,
    borderColor: "#bcd4e8",
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.lg
  },
  fundamentalAgendaDetailHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  fundamentalAgendaDetailTitle: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 23,
    marginTop: spacing.xs
  },
  fundamentalAgendaDescriptionBlock: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.xs,
    paddingTop: spacing.md
  },
  fundamentalAgendaDescriptionText: {
    color: colors.studentInk,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21
  },
  fundamentalNotificationSummary: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  fundamentalNotificationSummaryLabel: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalNotificationSummaryTitle: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.xs
  },
  fundamentalNotificationBadge: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  fundamentalNotificationBadgeText: {
    color: colors.surface,
    fontSize: 20,
    fontWeight: "900"
  },
  fundamentalNotificationFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  fundamentalNotificationFilter: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  fundamentalNotificationFilterActive: {
    backgroundColor: colors.blue,
    borderColor: colors.blue
  },
  fundamentalNotificationFilterText: {
    color: colors.studentInk,
    fontSize: 12,
    fontWeight: "900"
  },
  fundamentalNotificationFilterTextActive: {
    color: colors.surface
  },
  fundamentalNotificationEmptyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalNotificationEmptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21
  },
  fundamentalNotificationList: {
    gap: spacing.md
  },
  fundamentalNotificationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  fundamentalNotificationCardUnread: {
    borderColor: colors.blue,
    borderWidth: 2
  },
  fundamentalNotificationTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  fundamentalNotificationMark: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  fundamentalNotificationMarkText: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: "900"
  },
  fundamentalNotificationCopy: {
    flex: 1
  },
  fundamentalNotificationTypeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  fundamentalNotificationType: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalNotificationUnreadPill: {
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.studentInk,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4
  },
  fundamentalNotificationTitle: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 22,
    marginTop: spacing.xs
  },
  fundamentalNotificationSummaryText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  fundamentalNotificationMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: spacing.sm
  },
  fundamentalNotificationActionText: {
    alignSelf: "flex-start",
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalNotificationDetailCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalNotificationDetailHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  fundamentalNotificationDetailTime: {
    color: colors.studentInk,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 23,
    marginTop: spacing.xs
  },
  fundamentalNotificationMessage: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    color: colors.studentInk,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 23,
    paddingTop: spacing.md
  },
  fundamentalNotificationPrimaryAction: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 999,
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  fundamentalNotificationPrimaryActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  fundamentalNotificationReadOnlyAction: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  fundamentalNotificationReadOnlyActionText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalProfileIdentityCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalProfileIdentityTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  fundamentalProfileAvatar: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 24,
    height: 70,
    justifyContent: "center",
    width: 70
  },
  fundamentalProfileAvatarText: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0
  },
  fundamentalProfileIdentityCopy: {
    flex: 1
  },
  fundamentalProfileLabel: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  fundamentalProfileName: {
    color: colors.studentInk,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.xs
  },
  fundamentalProfileMeta: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: spacing.xs
  },
  fundamentalProfileSchoolLine: {
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    padding: spacing.md
  },
  fundamentalProfileSchoolText: {
    color: colors.studentInk,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  fundamentalProfileAvatarAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.blueSoft,
    borderColor: "#bcd4e8",
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  fundamentalProfileAvatarActionText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalProfileProgressGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  fundamentalProfileProgressCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 138,
    padding: spacing.md
  },
  fundamentalProfileProgressMark: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 38
  },
  fundamentalProfileProgressMarkText: {
    color: colors.blue,
    fontSize: 14,
    fontWeight: "900"
  },
  fundamentalProfileProgressValue: {
    color: colors.studentInk,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27
  },
  fundamentalProfileProgressLabel: {
    color: colors.studentInk,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: spacing.xs
  },
  fundamentalProfileProgressHelper: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2
  },
  fundamentalProfileSchoolCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  fundamentalProfileSchoolTitle: {
    color: colors.studentInk,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 24
  },
  fundamentalProfileSchoolInfoRow: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.md
  },
  fundamentalProfileSchoolInfoLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  fundamentalProfileSchoolInfoValue: {
    color: colors.studentInk,
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "right"
  },
  fundamentalProfileShortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  fundamentalProfileShortcut: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 136,
    padding: spacing.md,
    ...shadow
  },
  fundamentalProfileShortcutMark: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 38
  },
  fundamentalProfileShortcutMarkText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalProfileShortcutTitle: {
    color: colors.studentInk,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19
  },
  fundamentalProfileShortcutBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  fundamentalProfileSettingsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
    ...shadow
  },
  fundamentalProfileSettingRow: {
    alignItems: "center",
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 72,
    padding: spacing.md
  },
  fundamentalProfileSettingRowDisabled: {
    opacity: 0.74
  },
  fundamentalProfileSettingMark: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  fundamentalProfileSettingMarkText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalProfileSettingCopy: {
    flex: 1
  },
  fundamentalProfileSettingTitle: {
    color: colors.studentInk,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  fundamentalProfileSettingBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2
  },
  fundamentalProfileSettingChevron: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "900"
  },
  fundamentalProfileLogout: {
    alignItems: "center",
    backgroundColor: "#fff4f0",
    borderColor: "#ffd0c2",
    borderRadius: 999,
    borderWidth: 2,
    marginTop: spacing.lg,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  fundamentalProfileLogoutText: {
    color: colors.coral,
    fontSize: 14,
    fontWeight: "900"
  },
  fundamentalAccessibilityList: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  fundamentalAccessibilityCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  teacherHero: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 24,
    borderWidth: 2,
    marginBottom: spacing.md,
    minHeight: 176,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative",
    ...shadow
  },
  teacherHeroGlow: {
    backgroundColor: "rgba(214, 244, 220, 0.72)",
    borderRadius: 999,
    height: 150,
    position: "absolute",
    right: -36,
    top: 18,
    width: 150
  },
  teacherHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 132
  },
  teacherAvatar: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 18,
    borderWidth: 2,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  teacherAvatarText: {
    color: colors.brandDark,
    fontSize: 24,
    fontWeight: "900"
  },
  teacherHeroCopy: {
    flex: 1,
    zIndex: 2
  },
  teacherKicker: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherKickerOnDark: {
    color: "#dff0e7"
  },
  teacherKickerOnLight: {
    color: colors.brand
  },
  teacherHeroTitle: {
    color: colors.ink,
    fontSize: 31,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 36,
    marginTop: spacing.xs
  },
  teacherHeroMeta: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: spacing.xs
  },
  teacherHeroIconFrame: {
    height: 118,
    marginRight: -20,
    overflow: "hidden",
    position: "relative",
    width: 142,
    zIndex: 1
  },
  teacherHeroSplitImage: {
    height: 118,
    left: 0,
    position: "absolute",
    top: 0,
    width: 284
  },
  teacherBell: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: "rgba(255,255,255,0.96)",
    borderRadius: 16,
    borderWidth: 2,
    height: 48,
    justifyContent: "center",
    position: "relative",
    width: 42
  },
  teacherBellIconFrame: {
    height: 36,
    overflow: "hidden",
    position: "relative",
    width: 38
  },
  teacherBellSplitImage: {
    height: 36,
    left: 0,
    position: "absolute",
    top: 0,
    width: 76
  },
  teacherBellBadge: {
    backgroundColor: colors.coral,
    borderRadius: 999,
    color: colors.surface,
    fontSize: 11,
    fontWeight: "900",
    minWidth: 20,
    overflow: "hidden",
    paddingHorizontal: 5,
    paddingVertical: 2,
    position: "absolute",
    right: -8,
    textAlign: "center",
    top: -8
  },
  teacherQuoteBox: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(223, 244, 225, 0.88)",
    borderRadius: 18,
    marginTop: -16,
    maxWidth: 178,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherQuoteText: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19
  },
  teacherSectionTop: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.sm
  },
  teacherSectionTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29
  },
  teacherSectionDate: {
    color: colors.brandDark,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "right"
  },
  teacherSectionAction: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherTodayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherTodayCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 154,
    overflow: "hidden",
    padding: spacing.md,
    ...shadow
  },
  teacherTodayMark: {
    alignItems: "center",
    backgroundColor: "rgba(224, 248, 231, 0.86)",
    borderRadius: 999,
    height: 62,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 62
  },
  teacherTodayIconFrame: {
    height: 68,
    overflow: "hidden",
    position: "relative",
    width: 76
  },
  teacherTodaySplitImage: {
    height: 68,
    left: 0,
    position: "absolute",
    top: 0,
    width: 152
  },
  teacherTodayType: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    marginTop: spacing.sm,
    textTransform: "uppercase"
  },
  teacherTodayTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 2
  },
  teacherTodayMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  teacherNextClassCard: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    flexDirection: "row",
    minHeight: 140,
    marginBottom: spacing.md,
    overflow: "hidden",
    padding: spacing.lg,
    position: "relative"
  },
  teacherNextClassCopy: {
    flex: 1,
    zIndex: 2
  },
  teacherCardLabel: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherCardLabelOnDark: {
    color: "#dff0e7"
  },
  teacherNextClassTitle: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 34,
    marginTop: spacing.xs
  },
  teacherNextClassBody: {
    color: "#f0fff5",
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: spacing.xs
  },
  teacherNextClassStudents: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 2
  },
  teacherNextClassIconFrame: {
    bottom: -18,
    height: 120,
    overflow: "hidden",
    position: "absolute",
    right: 72,
    width: 176
  },
  teacherNextClassSplitImage: {
    height: 120,
    left: 0,
    position: "absolute",
    top: 0,
    width: 352
  },
  teacherNextClassButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    bottom: spacing.lg,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    position: "absolute",
    right: spacing.md
  },
  teacherNextClassButtonText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherLinkText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherQuickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherQuickCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 154,
    overflow: "hidden",
    padding: spacing.md,
    ...shadow
  },
  teacherQuickMark: {
    alignItems: "center",
    backgroundColor: "rgba(224, 248, 231, 0.88)",
    borderRadius: 999,
    height: 76,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 76
  },
  teacherQuickIconFrame: {
    height: 82,
    overflow: "hidden",
    position: "relative",
    width: 96
  },
  teacherQuickSplitImage: {
    height: 82,
    left: 0,
    position: "absolute",
    top: 0,
    width: 192
  },
  teacherQuickTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 19,
    textAlign: "center"
  },
  teacherQuickBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs,
    textAlign: "center"
  },
  teacherClassList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherClassCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  teacherClassCopy: {
    flex: 1
  },
  teacherClassTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  teacherClassMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2
  },
  teacherClassStatus: {
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherClassStatusText: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "900"
  },
  teacherAgendaList: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm
  },
  teacherAgendaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.sm
  },
  teacherAgendaTime: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "900",
    width: 50
  },
  teacherAgendaCopy: {
    flex: 1
  },
  teacherAgendaTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherAgendaMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  teacherAgendaChevron: {
    color: colors.muted,
    fontSize: 24,
    fontWeight: "700"
  },
  teacherSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherSummaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "48%",
    flexGrow: 1,
    padding: spacing.md
  },
  teacherSummaryTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: spacing.sm
  },
  teacherSummaryBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginBottom: spacing.sm,
    marginTop: spacing.xs
  },
  teacherTrackingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  teacherWeeklyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 96,
    padding: spacing.md,
    ...shadow
  },
  teacherTrackingDetailCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexBasis: "31%",
    flexGrow: 1,
    padding: spacing.md
  },
  teacherTrackingValue: {
    color: colors.brandDark,
    fontSize: 22,
    fontWeight: "900"
  },
  teacherTrackingLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: spacing.xs
  },
  teacherTrackingHelper: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 2
  },
  teacherClassesHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherClassFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherClassFilterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherClassFilterChipActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherClassFilterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherClassFilterTextActive: {
    color: colors.surface
  },
  teacherClassesList: {
    gap: spacing.md
  },
  teacherClassOverviewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherClassOverviewTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  teacherClassAvatar: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 16,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  teacherClassAvatarText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  teacherClassOverviewCopy: {
    flex: 1
  },
  teacherClassStage: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherClassOverviewTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: 2
  },
  teacherClassOverviewMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 2
  },
  teacherClassOverviewFooter: {
    alignItems: "center",
    borderTopColor: colors.line,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md
  },
  teacherClassRoutine: {
    color: colors.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  teacherClassOpenText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherClassDetailHero: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherClassDetailTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  teacherClassDetailTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29
  },
  teacherClassDetailBody: {
    color: "#dff0e7",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: spacing.xs
  },
  teacherClassDetailCount: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 16,
    minWidth: 70,
    padding: spacing.sm
  },
  teacherClassDetailCountValue: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "900"
  },
  teacherClassDetailCountLabel: {
    color: "#dff0e7",
    fontSize: 11,
    fontWeight: "900"
  },
  teacherClassDetailInfo: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    marginTop: spacing.md,
    padding: spacing.md
  },
  teacherClassDetailInfoLabel: {
    color: "#dff0e7",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherClassDetailInfoText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: spacing.xs
  },
  teacherClassDetailInfoMeta: {
    color: "#dff0e7",
    fontSize: 12,
    fontWeight: "800",
    marginTop: spacing.xs
  },
  teacherClassActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherClassActionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexBasis: "48%",
    flexGrow: 1,
    minHeight: 118,
    padding: spacing.md
  },
  teacherClassActionPrimary: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7"
  },
  teacherClassActionMark: {
    alignItems: "center",
    backgroundColor: "#f3f6f3",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  teacherClassActionMarkPrimary: {
    backgroundColor: colors.brandDark
  },
  teacherClassActionMarkText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherClassActionMarkTextPrimary: {
    color: colors.surface
  },
  teacherClassActionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: spacing.sm
  },
  teacherClassActionTitlePrimary: {
    color: colors.brandDark
  },
  teacherClassActionBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  teacherClassActionBodyPrimary: {
    color: colors.brandDark
  },
  teacherStudentList: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.sm
  },
  teacherStudentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.sm
  },
  teacherStudentAvatar: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  teacherStudentAvatarText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherStudentCopy: {
    flex: 1
  },
  teacherStudentName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  teacherStudentState: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  teacherBackToClassesButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherBackToClassesText: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherAttendanceHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherAttendanceMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  teacherAttendanceMetaPill: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 14,
    borderWidth: 2,
    flexGrow: 1,
    minWidth: 96,
    padding: spacing.sm
  },
  teacherAttendanceMetaLabel: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherAttendanceMetaValue: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: 2
  },
  teacherAttendanceClassRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAttendanceClassChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherAttendanceClassChipActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherAttendanceClassText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherAttendanceClassTextActive: {
    color: colors.surface
  },
  teacherAttendanceDateCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherAttendanceDateLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherAttendanceDateText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 2
  },
  teacherAttendanceDateAction: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherAttendanceSummaryGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAttendanceSummaryCard: {
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    padding: spacing.md
  },
  teacherAttendanceSummaryCardPresent: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7"
  },
  teacherAttendanceSummaryCardAbsent: {
    backgroundColor: "#fff3ea",
    borderColor: "#f1d0ba"
  },
  teacherAttendanceSummaryCardJustified: {
    backgroundColor: colors.blueSoft,
    borderColor: "#bcd4e8"
  },
  teacherAttendanceSummaryValue: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900"
  },
  teacherAttendanceSummaryLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
    marginTop: 2
  },
  teacherMarkAllButton: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 16,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherMarkAllText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherAttendanceList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAttendanceStudentRow: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    padding: spacing.md
  },
  teacherAttendanceStudentTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  teacherAttendanceSegment: {
    flexDirection: "row",
    gap: spacing.xs
  },
  teacherAttendanceSegmentButton: {
    alignItems: "center",
    backgroundColor: "#f3f6f3",
    borderColor: colors.line,
    borderRadius: 12,
    borderWidth: 2,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm
  },
  teacherAttendanceSegmentButtonActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherAttendanceSegmentText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900"
  },
  teacherAttendanceSegmentTextActive: {
    color: colors.surface
  },
  teacherAttendanceNoteBox: {
    backgroundColor: colors.blueSoft,
    borderColor: "#bcd4e8",
    borderRadius: 12,
    borderWidth: 2,
    padding: spacing.sm
  },
  teacherAttendanceNoteText: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17
  },
  teacherAttendanceReviewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherAttendanceReviewTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  teacherAttendanceReviewBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  teacherAttendanceReviewActions: {
    marginTop: spacing.md
  },
  teacherAttendanceSaveButton: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    padding: spacing.md
  },
  teacherAttendanceSaveText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherAttendanceSecondaryButton: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 14,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherAttendanceSecondaryText: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherCommunicationHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherCommunicationPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 16,
    marginTop: spacing.md,
    padding: spacing.md
  },
  teacherCommunicationPrimaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherCommunicationSentCard: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherCommunicationSentTitle: {
    color: colors.brandDark,
    fontSize: 16,
    fontWeight: "900"
  },
  teacherCommunicationSentBody: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  teacherCommunicationFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherCommunicationFilterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherCommunicationFilterChipActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherCommunicationFilterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherCommunicationFilterTextActive: {
    color: colors.surface
  },
  teacherCommunicationList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherCommunicationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherCommunicationCardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  teacherCommunicationMark: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  teacherCommunicationMarkText: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherCommunicationCardCopy: {
    flex: 1
  },
  teacherCommunicationCardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21
  },
  teacherCommunicationCardMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2
  },
  teacherCommunicationStatusPill: {
    backgroundColor: colors.brandSoft,
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherCommunicationStatusPillMuted: {
    backgroundColor: "#f3f6f3"
  },
  teacherCommunicationStatusText: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "900"
  },
  teacherCommunicationSummary: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.sm
  },
  teacherCommunicationTypeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherCommunicationTypeButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    flex: 1,
    padding: spacing.md
  },
  teacherCommunicationTypeButtonActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherCommunicationTypeText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherCommunicationTypeTextActive: {
    color: colors.surface
  },
  teacherCommunicationClassRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherCommunicationClassChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherCommunicationClassChipActive: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7"
  },
  teacherCommunicationClassText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherCommunicationClassTextActive: {
    color: colors.brandDark
  },
  teacherCommunicationStudentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherCommunicationStudentChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherCommunicationStudentChipActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherCommunicationStudentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherCommunicationStudentTextActive: {
    color: colors.surface
  },
  teacherCommunicationComposerCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherCommunicationFieldLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherCommunicationRecipientText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginBottom: spacing.xs
  },
  teacherCommunicationInput: {
    backgroundColor: "#f8faf8",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherCommunicationMessageInput: {
    minHeight: 116,
    textAlignVertical: "top"
  },
  teacherCommunicationComposerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherCommunicationSecondaryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    flex: 1,
    padding: spacing.md
  },
  teacherCommunicationSecondaryText: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherCommunicationSendButton: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    flex: 1,
    padding: spacing.md
  },
  teacherCommunicationSendText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherCommunicationDetailHero: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherCommunicationDetailTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.xs
  },
  teacherCommunicationDetailMeta: {
    color: "#dff0e7",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.sm
  },
  teacherCommunicationDetailCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherCommunicationDetailMessage: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22
  },
  teacherAgendaHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherAgendaPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 16,
    marginTop: spacing.md,
    padding: spacing.md
  },
  teacherAgendaPrimaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherAgendaWeekStrip: {
    flexDirection: "row",
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  teacherAgendaDayButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    flex: 1,
    minHeight: 58,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm
  },
  teacherAgendaDayButtonActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherAgendaDayText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherAgendaDayTextActive: {
    color: colors.surface
  },
  teacherAgendaDayHelper: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2
  },
  teacherAgendaDayHelperActive: {
    color: "#dff0e7"
  },
  teacherAgendaTodayList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAgendaUpcomingList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAgendaCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherAgendaCardFeatured: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7"
  },
  teacherAgendaCardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  teacherAgendaMark: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  teacherAgendaMarkText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherAgendaCardCopy: {
    flex: 1
  },
  teacherAgendaType: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherAgendaCardTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 2
  },
  teacherAgendaCardMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2
  },
  teacherAgendaStatusPill: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherAgendaStatusText: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "900"
  },
  teacherAgendaCardBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.sm
  },
  teacherAgendaFormCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherAgendaTypeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xs
  },
  teacherAgendaTypeButton: {
    alignItems: "center",
    backgroundColor: "#f8faf8",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    flexBasis: "30%",
    flexGrow: 1,
    minHeight: 68,
    justifyContent: "center",
    padding: spacing.sm
  },
  teacherAgendaTypeButtonActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherAgendaTypeText: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherAgendaTypeTextActive: {
    color: colors.surface
  },
  teacherAgendaTypeLabel: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3
  },
  teacherAgendaTypeLabelActive: {
    color: colors.surface
  },
  teacherAgendaInputRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  teacherAgendaSelectedClass: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginBottom: spacing.xs
  },
  teacherAgendaInputHalf: {
    flex: 1
  },
  teacherAgendaDetailHero: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherAgendaDetailMark: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    height: 58,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 58
  },
  teacherAgendaDetailMarkText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: "900"
  },
  teacherAgendaDetailTitle: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.xs
  },
  teacherAgendaDetailMeta: {
    color: "#dff0e7",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.sm
  },
  teacherAgendaDetailCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherAgendaDetailBody: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: spacing.xs
  },
  teacherAgendaDetailActions: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherDiaryHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherDiaryMetaGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  teacherDiaryMetaPill: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    padding: spacing.md
  },
  teacherDiaryMetaLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherDiaryMetaValue: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: 4
  },
  teacherDiaryPlanCard: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherDiaryPlanLabel: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherDiaryPlanTitle: {
    color: colors.brandDark,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
    marginTop: spacing.xs
  },
  teacherDiaryPlanBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  teacherDiaryFormCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherDiaryTextArea: {
    minHeight: 94,
    textAlignVertical: "top"
  },
  teacherDiaryTextAreaLarge: {
    minHeight: 124,
    textAlignVertical: "top"
  },
  teacherDiaryHelpText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginBottom: spacing.xs
  },
  teacherDiaryAttendanceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherDiaryAttendanceLink: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    padding: spacing.md
  },
  teacherDiaryAttendanceLinkText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherDiaryActivityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherDiaryActivityChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    flexBasis: "46%",
    flexGrow: 1,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherDiaryActivityChipActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherDiaryActivityText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center"
  },
  teacherDiaryActivityTextActive: {
    color: colors.surface
  },
  teacherDiaryActions: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherDiaryRecentList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherDiaryRecentCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherDiaryRecentTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  teacherDiaryRecentMark: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  teacherDiaryRecentMarkText: {
    color: colors.brandDark,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherDiaryRecentCopy: {
    flex: 1
  },
  teacherDiaryRecentTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22
  },
  teacherDiaryRecentMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2
  },
  teacherDiaryRecentSummary: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: spacing.sm
  },
  teacherDiaryConfirmHero: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherDiaryClosedHero: {
    backgroundColor: "#166534",
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherDiaryDetailHero: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherDiaryConfirmCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherDiaryConfirmText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: spacing.xs
  },
  teacherAvaliaHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherAvaliaContext: {
    alignSelf: "flex-start",
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 999,
    borderWidth: 2,
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900",
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherAvaliaSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAvaliaSummaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexBasis: "46%",
    flexGrow: 1,
    minHeight: 82,
    justifyContent: "center",
    padding: spacing.md
  },
  teacherAvaliaSummaryValue: {
    color: colors.brandDark,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30
  },
  teacherAvaliaSummaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: 2
  },
  teacherAvaliaFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAvaliaFilterChip: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherAvaliaFilterChipActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherAvaliaFilterText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherAvaliaFilterTextActive: {
    color: colors.surface
  },
  teacherAvaliaList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAvaliaCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherAvaliaCardTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md
  },
  teacherAvaliaMark: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  teacherAvaliaMarkText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherAvaliaCardCopy: {
    flex: 1
  },
  teacherAvaliaSubject: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  teacherAvaliaTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 2
  },
  teacherAvaliaMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2
  },
  teacherAvaliaStatePill: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherAvaliaStateText: {
    color: colors.brandDark,
    fontSize: 11,
    fontWeight: "900"
  },
  teacherAvaliaParticipationBox: {
    backgroundColor: "#f8faf8",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    marginTop: spacing.sm,
    padding: spacing.sm
  },
  teacherAvaliaParticipationText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  teacherAvaliaActionText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  teacherAvaliaDetailHero: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherAvaliaDetailCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherAvaliaDetailText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: spacing.xs
  },
  teacherAvaliaSkillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAvaliaSkillPill: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherAvaliaSkillText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherAvaliaResultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAvaliaResultStat: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexBasis: "46%",
    flexGrow: 1,
    minHeight: 84,
    justifyContent: "center",
    padding: spacing.md
  },
  teacherAvaliaResultValue: {
    color: colors.brandDark,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28
  },
  teacherAvaliaResultLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: 2
  },
  teacherAvaliaStudentList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherAvaliaStudentCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md
  },
  teacherAvaliaStudentName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  teacherAvaliaStudentMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2
  },
  teacherAvaliaStudentScore: {
    color: colors.brandDark,
    fontSize: 17,
    fontWeight: "900"
  },
  teacherTrackingHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherTrackingDetailHero: {
    backgroundColor: colors.brandDark,
    borderRadius: 22,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherTrackingSummaryCard: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherTrackingSummaryTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: spacing.xs
  },
  teacherTrackingBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19
  },
  teacherTrackingMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  teacherTrackingMetric: {
    backgroundColor: "#f8faf8",
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 2,
    flexBasis: "46%",
    flexGrow: 1,
    padding: spacing.sm
  },
  teacherTrackingMetricValue: {
    color: colors.brandDark,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24
  },
  teacherTrackingMetricLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 2
  },
  teacherTrackingBlockGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherTrackingBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.sm,
    padding: spacing.md
  },
  teacherTrackingBlockTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  teacherTrackingBlockTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22
  },
  teacherTrackingBlockValue: {
    color: colors.brandDark,
    fontSize: 20,
    fontWeight: "900"
  },
  teacherTrackingLinkButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherTrackingLinkText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherTrackingSkillList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherTrackingSkillCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherTrackingSkillBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  teacherTrackingStudentCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  teacherTrackingAlertList: {
    gap: spacing.sm,
    marginBottom: spacing.md
  },
  teacherTrackingAlert: {
    backgroundColor: "#fffaf0",
    borderColor: "#ecd6a4",
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherTrackingAlertTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19
  },
  teacherTrackingAlertBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.xs
  },
  teacherTrackingCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherShellHero: {
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherShellTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.xs
  },
  teacherShellIntro: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: spacing.sm
  },
  teacherShellList: {
    gap: spacing.md
  },
  teacherNotificationSummary: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherNotificationTitle: {
    color: colors.brandDark,
    fontSize: 18,
    fontWeight: "900"
  },
  teacherNotificationBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  teacherUnreadPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderRadius: 999,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherUnreadPillText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherNotificationsHero: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherNotificationsHeroCopy: {
    flex: 1
  },
  teacherNotificationsHeroTitle: {
    color: colors.brandDark,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 25,
    marginTop: spacing.xs
  },
  teacherNotificationsHeroBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  teacherNotificationsBadge: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderColor: "#0f5132",
    borderRadius: 18,
    borderWidth: 2,
    minWidth: 62,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm
  },
  teacherNotificationsBadgeNumber: {
    color: colors.surface,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24
  },
  teacherNotificationsBadgeText: {
    color: "#d9fbe7",
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2
  },
  teacherNotificationsMarkAll: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 999,
    borderWidth: 2,
    marginBottom: spacing.md,
    minHeight: 42,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherNotificationsMarkAllText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherNotificationsEmpty: {
    backgroundColor: "#f8fbf8",
    borderColor: "#d7eadc",
    borderRadius: 18,
    borderWidth: 2,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  teacherNotificationsEmptyTitle: {
    color: colors.brandDark,
    fontSize: 16,
    fontWeight: "900"
  },
  teacherNotificationsEmptyBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  teacherNotificationsFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  teacherNotificationsFilterChip: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#d7eadc",
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherNotificationsFilterChipActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  teacherNotificationsFilterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherNotificationsFilterTextActive: {
    color: colors.surface
  },
  teacherNotificationsList: {
    gap: spacing.md
  },
  teacherNotificationCard: {
    backgroundColor: colors.surface,
    borderColor: "#d7eadc",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 112,
    padding: spacing.md,
    ...shadow
  },
  teacherNotificationCardUnread: {
    backgroundColor: "#f5fbf4",
    borderColor: "#9acbb2",
    borderLeftColor: colors.brand,
    borderLeftWidth: 5
  },
  teacherNotificationMark: {
    alignItems: "center",
    backgroundColor: "#e7f5eb",
    borderColor: "#b8d7c7",
    borderRadius: 18,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  teacherNotificationMarkLarge: {
    alignItems: "center",
    backgroundColor: "#e7f5eb",
    borderColor: "#b8d7c7",
    borderRadius: 22,
    borderWidth: 2,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  teacherNotificationMarkText: {
    color: colors.brandDark,
    fontSize: 15,
    fontWeight: "900"
  },
  teacherNotificationCardCopy: {
    flex: 1,
    gap: 4
  },
  teacherNotificationCardTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "space-between"
  },
  teacherNotificationTypeText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  teacherNotificationStatePill: {
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 999,
    borderWidth: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4
  },
  teacherNotificationStateText: {
    color: "#9a3412",
    fontSize: 11,
    fontWeight: "900"
  },
  teacherNotificationCardTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 20
  },
  teacherNotificationCardBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  teacherNotificationCardMeta: {
    color: "#4c6b5c",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: spacing.xs
  },
  teacherNotificationDetailHero: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 24,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg
  },
  teacherNotificationDetailCopy: {
    flex: 1
  },
  teacherNotificationDetailTitle: {
    color: colors.surface,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 26,
    marginTop: 4
  },
  teacherNotificationDetailMeta: {
    color: "#d9fbe7",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: 4
  },
  teacherNotificationDetailCard: {
    backgroundColor: colors.surface,
    borderColor: "#d7eadc",
    borderRadius: 20,
    borderWidth: 2,
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  teacherNotificationDetailMessage: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  teacherNotificationPrimaryButton: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 16,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  teacherNotificationPrimaryText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  teacherProfileIdentityCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  teacherProfileAvatar: {
    alignItems: "center",
    backgroundColor: colors.brandDark,
    borderRadius: 24,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  teacherProfileAvatarText: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: "900"
  },
  teacherProfileIdentityCopy: {
    flex: 1
  },
  teacherProfileName: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 26,
    marginTop: 4
  },
  teacherProfileMeta: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 4
  },
  teacherProfileBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  teacherProfileClassSummary: {
    backgroundColor: colors.brandSoft,
    borderColor: "#b8d7c7",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.md
  },
  teacherProfileSectionTop: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between"
  },
  teacherProfileSectionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22
  },
  teacherProfileSectionBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3
  },
  teacherProfileSmallButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#b8d7c7",
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 40,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  teacherProfileSmallButtonText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherProfileClassChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.md
  },
  teacherProfileClassChip: {
    backgroundColor: colors.surface,
    borderColor: "#d7eadc",
    borderRadius: 16,
    borderWidth: 2,
    flexGrow: 1,
    minWidth: 112,
    padding: spacing.sm
  },
  teacherProfileClassChipTitle: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherProfileClassChipBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3
  },
  teacherProfileRoutineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  teacherProfileMetricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 118,
    padding: spacing.md
  },
  teacherProfileMetricMark: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  teacherProfileMetricMarkText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherProfileMetricValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
    marginTop: spacing.sm
  },
  teacherProfileMetricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 2
  },
  teacherProfilePreferenceList: {
    gap: spacing.sm
  },
  teacherProfilePreferenceCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#d7eadc",
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 78,
    padding: spacing.md
  },
  teacherProfilePreferenceMark: {
    alignItems: "center",
    backgroundColor: "#e7f5eb",
    borderColor: "#b8d7c7",
    borderRadius: 15,
    borderWidth: 2,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  teacherProfilePreferenceMarkText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherProfilePreferenceCopy: {
    flex: 1
  },
  teacherProfilePreferenceTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19
  },
  teacherProfilePreferenceBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3
  },
  teacherProfilePreferenceAction: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 76,
    textAlign: "right"
  },
  teacherProfileFormationCard: {
    alignItems: "center",
    backgroundColor: "#f8fbf8",
    borderColor: "#d7eadc",
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md
  },
  teacherProfileFormationMark: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#d7eadc",
    borderRadius: 14,
    borderWidth: 2,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  teacherProfileFormationMarkText: {
    color: colors.brandDark,
    fontSize: 13,
    fontWeight: "900"
  },
  teacherProfileFormationCopy: {
    flex: 1
  },
  teacherProfileFormationTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900"
  },
  teacherProfileFormationBody: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3
  },
  teacherProfileFormationAction: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  teacherProfileAccessibilityList: {
    gap: spacing.sm
  },
  teacherProfileAccessibilityCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#d7eadc",
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 84,
    padding: spacing.md
  },
  teacherProfileAccessibilityBackButton: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 16,
    marginTop: spacing.md,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  teacherProfileAccessibilityBackText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900"
  },
  teacherLogoutButton: {
    alignItems: "center",
    backgroundColor: "#fff7ed",
    borderColor: "#fed7aa",
    borderRadius: 16,
    borderWidth: 2,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md
  },
  teacherLogoutText: {
    color: "#9a3412",
    fontSize: 15,
    fontWeight: "900"
  },
  missionCard: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  missionIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  missionEmoji: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: "900"
  },
  missionText: {
    flex: 1
  },
  missionLabel: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  missionTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 2
  },
  discoveryHero: {
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  discoveryKicker: {
    color: colors.child,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  discoveryTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.xs
  },
  discoveryBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.sm
  },
  discoveryGrid: {
    gap: spacing.md
  },
  discoveryCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 116,
    padding: spacing.md,
    ...shadow
  },
  discoveryMark: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 18,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  discoveryMarkText: {
    color: colors.child,
    fontSize: 26,
    fontWeight: "900"
  },
  discoveryCopy: {
    flex: 1
  },
  discoveryTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.warning,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  discoveryCardTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.sm
  },
  discoveryCardBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3
  },
  discoveryChevron: {
    color: colors.muted,
    fontSize: 26,
    fontWeight: "500"
  },
  discoveryActionPill: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderColor: "#c9e8c5",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: 7
  },
  discoveryActionText: {
    color: colors.child,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0
  },
  discoverySceneCard: {
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    marginTop: spacing.md,
    minHeight: 260,
    overflow: "hidden",
    position: "relative"
  },
  discoverySceneImage: {
    height: 260,
    width: "100%"
  },
  discoveryHotspot: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    position: "absolute"
  },
  discoveryHotspotCompleted: {
    backgroundColor: colors.childSoft,
    borderColor: "#9bd59a"
  },
  discoveryHotspotUnavailable: {
    backgroundColor: colors.surface,
    borderColor: colors.line
  },
  discoveryHotspotText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center"
  },
  activitiesHero: {
    backgroundColor: colors.childSoft,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  featuredActivity: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    minHeight: 236,
    padding: spacing.lg,
    ...shadow
  },
  featuredActivityMark: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 72
  },
  featuredActivityMarkText: {
    color: colors.warning,
    fontSize: 26,
    fontWeight: "900"
  },
  featuredActivityTitle: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.sm
  },
  featuredActivityBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.sm
  },
  activityAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.child,
    borderRadius: 999,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11
  },
  activityActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  activityList: {
    gap: spacing.md
  },
  activityCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 132,
    padding: spacing.md,
    ...shadow
  },
  activityMark: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 18,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  activityMarkText: {
    color: colors.child,
    fontSize: 24,
    fontWeight: "900"
  },
  activityCopy: {
    flex: 1
  },
  activityStatus: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.warning,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  activityTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.sm
  },
  activityBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3
  },
  activityDoneText: {
    color: colors.child,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: spacing.sm
  },
  progressShell: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 10,
    marginTop: spacing.md,
    overflow: "hidden",
    width: "100%"
  },
  progressShellCompact: {
    height: 8,
    marginTop: spacing.sm
  },
  progressFill: {
    backgroundColor: colors.child,
    borderRadius: 999,
    height: "100%"
  },
  activityDetailHero: {
    alignItems: "flex-start",
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 24,
    borderWidth: 2,
    padding: spacing.lg
  },
  activityDetailMark: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 30,
    height: 92,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 92
  },
  activityDetailMarkText: {
    color: colors.child,
    fontSize: 30,
    fontWeight: "900"
  },
  activityStepCard: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 18,
    borderWidth: 2,
    marginVertical: spacing.md,
    padding: spacing.md
  },
  activityStepTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0
  },
  activityStepBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: spacing.sm
  },
  activityPrivateImage: {
    borderRadius: 14,
    height: 180,
    marginTop: spacing.md,
    width: "100%"
  },
  activityAssetWarning: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: spacing.sm
  },
  libraryHero: {
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  libraryStateCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  libraryStateTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center"
  },
  libraryStateBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    textAlign: "center"
  },
  featuredBook: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 194,
    padding: spacing.md,
    ...shadow
  },
  featuredBookCopy: {
    flex: 1,
    justifyContent: "center"
  },
  featuredBookTitle: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27,
    marginTop: spacing.sm
  },
  featuredBookBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.sm
  },
  bookAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.child,
    borderRadius: 999,
    marginTop: spacing.md,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: 10
  },
  bookActionText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: "900"
  },
  bookShelf: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  bookCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 220,
    padding: spacing.sm,
    ...shadow
  },
  bookCover: {
    alignItems: "center",
    borderRadius: 18,
    height: 132,
    justifyContent: "center",
    marginBottom: spacing.sm,
    overflow: "hidden",
    width: "100%"
  },
  bookCoverLarge: {
    height: 164,
    marginBottom: 0,
    width: 112
  },
  bookToneLeaf: {
    backgroundColor: colors.childSoft
  },
  bookToneSun: {
    backgroundColor: colors.warningSoft
  },
  bookToneSky: {
    backgroundColor: colors.blueSoft
  },
  bookToneMint: {
    backgroundColor: "#dff4e7"
  },
  bookCoverMark: {
    color: colors.ink,
    fontSize: 27,
    fontWeight: "900"
  },
  bookCoverMarkLarge: {
    fontSize: 28
  },
  bookCoverLine: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    bottom: 16,
    height: 8,
    left: 18,
    position: "absolute",
    right: 18
  },
  bookCoverImage: {
    height: "100%",
    width: "100%"
  },
  bookCategory: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.warning,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  bookCardTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 19,
    marginTop: spacing.sm
  },
  readerTop: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 24,
    borderWidth: 2,
    padding: spacing.lg
  },
  readerTitle: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 31,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  readerPage: {
    backgroundColor: "#fffaf0",
    borderColor: "#f1d985",
    borderRadius: 24,
    borderWidth: 2,
    marginVertical: spacing.md,
    minHeight: 244,
    justifyContent: "center",
    overflow: "hidden",
    padding: spacing.sm
  },
  readerPageImage: {
    aspectRatio: 0.707,
    alignSelf: "center",
    minHeight: 360,
    width: "100%"
  },
  readerPageLoading: {
    alignItems: "center",
    minHeight: 300,
    justifyContent: "center"
  },
  readerWarmupText: {
    bottom: spacing.sm,
    color: colors.muted,
    fontSize: 11,
    fontWeight: "800",
    position: "absolute",
    right: spacing.md
  },
  readerPageTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27,
    textAlign: "center"
  },
  readerPageBody: {
    color: colors.muted,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 25,
    marginTop: spacing.lg,
    textAlign: "center"
  },
  readerControls: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
    padding: spacing.sm
  },
  readerControlButton: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 999,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  readerControlButtonDisabled: {
    opacity: 0.45
  },
  readerControlText: {
    color: colors.child,
    fontSize: 13,
    fontWeight: "900"
  },
  readerProgress: {
    color: colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  gamesHero: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  featuredGame: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    minHeight: 236,
    overflow: "hidden",
    padding: spacing.lg,
    ...shadow
  },
  featuredGameIllustration: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.childSoft,
    borderRadius: 28,
    height: 86,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 86
  },
  featuredGameMark: {
    color: colors.child,
    fontSize: 30,
    fontWeight: "900"
  },
  featuredGameCopy: {
    flex: 1
  },
  gameTag: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.warning,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  featuredGameTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 27,
    marginTop: spacing.sm
  },
  featuredGameBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.sm
  },
  gameAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.child,
    borderRadius: 999,
    marginTop: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11
  },
  gameActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  gameGrid: {
    gap: spacing.md
  },
  gameCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    minHeight: 190,
    padding: spacing.md,
    ...shadow
  },
  gameCardIllustration: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 72
  },
  gameCardMark: {
    color: colors.child,
    fontSize: 26,
    fontWeight: "900"
  },
  gameCardTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 24,
    marginTop: spacing.sm
  },
  gameCardBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs
  },
  gameCardAction: {
    color: colors.child,
    fontSize: 14,
    fontWeight: "900",
    marginTop: spacing.md
  },
  gameStage: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 26,
    borderWidth: 2,
    marginBottom: spacing.md,
    minHeight: 454,
    padding: spacing.lg
  },
  gameStageIllustration: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 44,
    height: 142,
    justifyContent: "center",
    marginBottom: spacing.lg,
    width: 142
  },
  gameStageImage: {
    height: "100%",
    width: "100%"
  },
  gameStageMark: {
    color: colors.child,
    fontSize: 46,
    fontWeight: "900"
  },
  gameStageTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  gameStageBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: spacing.md,
    textAlign: "center"
  },
  landscapeHint: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 18,
    borderWidth: 2,
    marginTop: spacing.lg,
    padding: spacing.md,
    width: "100%"
  },
  landscapeHintText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center"
  },
  gameLandscapeShell: {
    backgroundColor: "#e9f7ef",
    borderColor: "#c9e8c5",
    borderRadius: 24,
    borderWidth: 2,
    gap: spacing.sm,
    minHeight: 520,
    overflow: "hidden",
    padding: spacing.sm
  },
  gameLandscapeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  gameLandscapeKicker: {
    color: colors.child,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0
  },
  gameExitButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 2,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  gameExitButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "900"
  },
  cestaPlayfield: {
    backgroundColor: "#fffaf0",
    borderColor: "#f1d985",
    borderRadius: 22,
    borderWidth: 2,
    flex: 1,
    gap: spacing.md,
    justifyContent: "space-between",
    minHeight: 464,
    overflow: "hidden",
    padding: spacing.md
  },
  cestaBoardImage: {
    borderRadius: 18,
    height: 132,
    width: "100%"
  },
  cestaTaskPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    padding: spacing.md
  },
  cestaTaskTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center"
  },
  cestaTaskBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: spacing.xs,
    textAlign: "center"
  },
  cestaProgressRow: {
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  cestaProgressDot: {
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 13,
    width: 13
  },
  cestaProgressDotDone: {
    backgroundColor: colors.child
  },
  cestaActionRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: spacing.md
  },
  cestaFruitButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 178,
    padding: spacing.md
  },
  cestaBasketButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#f1d985",
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 178,
    padding: spacing.md
  },
  cestaFruitImage: {
    height: 104,
    width: "100%"
  },
  cestaBasketImage: {
    height: 136,
    width: "100%"
  },
  cestaFruitLabel: {
    color: colors.child,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.sm
  },
  cestaVictoryPanel: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#f1d985",
    borderRadius: 22,
    borderWidth: 2,
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 464,
    padding: spacing.lg
  },
  cestaVictoryImage: {
    borderRadius: 18,
    height: 172,
    width: "100%"
  },
  cestaVictoryTitle: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center"
  },
  cestaVictoryBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center"
  },
  cestaVictoryStatus: {
    alignSelf: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 999,
    color: colors.child,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: 7
  },
  achievementsHero: {
    backgroundColor: colors.childSoft,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  progressCelebrationCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    marginTop: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  progressAvatarRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md
  },
  progressAvatar: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: 24,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  progressAvatarImage: {
    height: 68,
    width: 68
  },
  progressAvatarText: {
    color: colors.child,
    fontSize: 20,
    fontWeight: "900"
  },
  progressNameBlock: {
    flex: 1
  },
  progressName: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0
  },
  progressLevel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 3
  },
  progressPoints: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.md
  },
  progressPointsText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "900"
  },
  progressCelebrationText: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 24,
    marginTop: spacing.md
  },
  medalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  medalCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 22,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 208,
    padding: spacing.md,
    ...shadow
  },
  medalIcon: {
    alignItems: "center",
    borderRadius: 23,
    height: 70,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 70
  },
  medalIconEarned: {
    backgroundColor: colors.warningSoft
  },
  medalIconWaiting: {
    backgroundColor: colors.childSoft
  },
  medalMark: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900"
  },
  medalStatus: {
    alignSelf: "flex-start",
    backgroundColor: colors.childSoft,
    borderRadius: 999,
    color: colors.child,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  medalTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 20,
    marginTop: spacing.sm
  },
  medalMessage: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  achievementList: {
    gap: spacing.md
  },
  achievementRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 126,
    padding: spacing.md
  },
  achievementRowIcon: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: 18,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  achievementRowMark: {
    color: colors.warning,
    fontSize: 24,
    fontWeight: "900"
  },
  achievementRowCopy: {
    flex: 1
  },
  achievementRowTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  achievementRowBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3
  },
  achievementDetailHero: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 26,
    borderWidth: 2,
    padding: spacing.lg
  },
  achievementDetailIcon: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: 38,
    height: 116,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 116
  },
  achievementDetailMark: {
    color: colors.warning,
    fontSize: 38,
    fontWeight: "900"
  },
  achievementDetailStatus: {
    alignSelf: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 999,
    color: colors.child,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    textTransform: "uppercase"
  },
  achievementDetailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.md,
    textAlign: "center"
  },
  achievementDetailBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  achievementDetailMessageCard: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 18,
    borderWidth: 2,
    marginVertical: spacing.md,
    padding: spacing.md
  },
  achievementDetailMessageTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0
  },
  achievementDetailMessageBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: spacing.sm
  },
  agendaHero: {
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  weekStrip: {
    flexDirection: "row",
    gap: 7,
    marginTop: spacing.md
  },
  weekDayCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 2,
    flex: 1,
    minHeight: 86,
    paddingHorizontal: 3,
    paddingVertical: spacing.sm
  },
  weekDayToday: {
    backgroundColor: colors.childSoft,
    borderColor: "#9bd59a"
  },
  weekDayShort: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  weekDayNumber: {
    color: colors.ink,
    fontSize: 19,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4
  },
  weekDayLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
    marginTop: 4,
    textAlign: "center"
  },
  weekDayTodayText: {
    backgroundColor: colors.child,
    borderRadius: 999,
    color: colors.surface,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
    marginTop: 5,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 2,
    textAlign: "center"
  },
  todayCard: {
    backgroundColor: "rgba(255, 241, 194, 0.9)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    gap: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  todayEmptyText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21,
    textAlign: "center"
  },
  agendaList: {
    gap: spacing.md
  },
  agendaItemCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 132,
    padding: spacing.md,
    ...shadow
  },
  agendaItemFeatured: {
    borderColor: "#c9e8c5"
  },
  agendaItemIcon: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 18,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  agendaItemIconText: {
    color: colors.child,
    fontSize: 24,
    fontWeight: "900"
  },
  agendaItemCopy: {
    flex: 1
  },
  agendaType: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.warning,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  agendaItemTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  agendaItemMeta: {
    color: colors.child,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: 3
  },
  agendaItemBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3
  },
  agendaDetailHero: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 26,
    borderWidth: 2,
    padding: spacing.lg
  },
  agendaDetailIcon: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 38,
    height: 116,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 116
  },
  agendaDetailIconText: {
    color: colors.child,
    fontSize: 36,
    fontWeight: "900"
  },
  agendaDetailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.md,
    textAlign: "center"
  },
  agendaDetailMeta: {
    color: colors.child,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  agendaDetailBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  agendaReminderCard: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 18,
    borderWidth: 2,
    marginVertical: spacing.md,
    padding: spacing.md
  },
  agendaReminderTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0
  },
  agendaReminderBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: spacing.sm
  },
  notificationsHero: {
    backgroundColor: colors.childSoft,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  notificationSummaryCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    ...shadow
  },
  notificationSummaryIcon: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: 20,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  crescerListIconImage: {
    height: 62,
    width: 62
  },
  notificationSummaryMark: {
    color: colors.warning,
    fontSize: 24,
    fontWeight: "900"
  },
  notificationSummaryCopy: {
    flex: 1
  },
  notificationSummaryLabel: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  notificationSummaryTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 22,
    marginTop: 3
  },
  notificationList: {
    gap: spacing.md
  },
  notificationCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 136,
    padding: spacing.md,
    ...shadow
  },
  notificationCardNew: {
    borderColor: "#c9e8c5",
    borderWidth: 2
  },
  notificationIcon: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 18,
    height: 62,
    justifyContent: "center",
    width: 62
  },
  notificationIconText: {
    color: colors.child,
    fontSize: 24,
    fontWeight: "900"
  },
  notificationCopy: {
    flex: 1
  },
  notificationMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs
  },
  notificationType: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    color: colors.warning,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  notificationNewPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.child,
    borderRadius: 999,
    color: colors.surface,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    textTransform: "uppercase"
  },
  notificationTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 21,
    marginTop: spacing.sm
  },
  notificationSummary: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 3
  },
  notificationOrigin: {
    color: colors.child,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    marginTop: spacing.xs
  },
  notificationDetailHero: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 26,
    borderWidth: 2,
    padding: spacing.lg
  },
  notificationDetailIcon: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 38,
    height: 116,
    justifyContent: "center",
    marginBottom: spacing.md,
    width: 116
  },
  notificationDetailIconText: {
    color: colors.child,
    fontSize: 36,
    fontWeight: "900"
  },
  notificationDetailTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 29,
    marginTop: spacing.md,
    textAlign: "center"
  },
  notificationDetailMeta: {
    color: colors.child,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  notificationDetailBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: spacing.sm,
    textAlign: "center"
  },
  notificationActionCard: {
    backgroundColor: colors.warningSoft,
    borderColor: "#f1d985",
    borderRadius: 18,
    borderWidth: 2,
    marginVertical: spacing.md,
    padding: spacing.md
  },
  notificationActionTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0
  },
  notificationActionBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: spacing.sm
  },
  profileHero: {
    backgroundColor: colors.surface,
    borderColor: "#c9e8c5",
    borderRadius: 22,
    borderWidth: 2,
    padding: spacing.lg
  },
  profileIdentityCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 26,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.lg,
    ...shadow
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#f1d985",
    borderRadius: 38,
    borderWidth: 2,
    height: 96,
    justifyContent: "center",
    width: 96
  },
  profileAvatarText: {
    color: colors.child,
    fontSize: 26,
    fontWeight: "900"
  },
  profileIdentityCopy: {
    flex: 1
  },
  profileName: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 28
  },
  profileClass: {
    color: colors.child,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: spacing.xs
  },
  profileSchool: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 2
  },
  profileLevelPill: {
    alignSelf: "flex-start",
    backgroundColor: colors.warningSoft,
    borderRadius: 999,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6
  },
  profileLevelText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  avatarAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.child,
    borderRadius: 999,
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  avatarActionText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: "900"
  },
  profileProgressGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md
  },
  profileProgressCard: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 20,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 156,
    padding: spacing.md,
    ...shadow
  },
  profileProgressIcon: {
    alignItems: "center",
    backgroundColor: colors.warningSoft,
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 54
  },
  profileProgressMark: {
    color: colors.warning,
    fontSize: 24,
    fontWeight: "900"
  },
  profileProgressValue: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "900",
    letterSpacing: 0
  },
  profileProgressLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 3
  },
  profileSchoolCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#f1d985",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  profileSchoolIcon: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 20,
    height: 64,
    justifyContent: "center",
    width: 64
  },
  profileSchoolIconText: {
    color: colors.child,
    fontSize: 26,
    fontWeight: "900"
  },
  profileSchoolCopy: {
    flex: 1
  },
  profileSchoolTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 21
  },
  profileSchoolBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: spacing.xs
  },
  profileSchoolAction: {
    color: colors.child,
    fontSize: 13,
    fontWeight: "900",
    marginTop: spacing.sm
  },
  profilePreferenceList: {
    gap: spacing.md
  },
  profilePreferenceCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 104,
    padding: spacing.md
  },
  profilePreferenceIcon: {
    alignItems: "center",
    backgroundColor: colors.childSoft,
    borderRadius: 17,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  profilePreferenceMark: {
    color: colors.child,
    fontSize: 24,
    fontWeight: "900"
  },
  profilePreferenceCopy: {
    flex: 1
  },
  profilePreferenceTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0
  },
  profilePreferenceBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4
  },
  profileLogoutButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#f1b7a9",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg
  },
  profileLogoutText: {
    color: colors.coral,
    fontSize: 15,
    fontWeight: "900"
  },
  moduleIntro: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 2,
    padding: spacing.lg
  },
  moduleTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0
  },
  moduleBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: spacing.sm
  },
  viewerMock: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 2,
    minHeight: 280,
    justifyContent: "center",
    marginBottom: spacing.md,
    padding: spacing.xl
  },
  viewerTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  viewerBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 23,
    marginTop: spacing.lg,
    textAlign: "center"
  }
});
