import React from "react";
import { Feather } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ColorValue
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brandedAssetFor, type BrandedEnvironment } from "../branding";
import { colors, radii, shadow, spacing } from "../theme";
import type { AppProfile, IconName, ModuleItem } from "../data/fixtures";

type ScreenTone = "paper" | "child" | "blue" | "teacher";

const ToneContext = React.createContext<ScreenTone>("paper");

export function Screen({
  children,
  scroll = true,
  tone = "paper"
}: {
  children: React.ReactNode;
  scroll?: boolean;
  tone?: ScreenTone;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const backgroundColor =
    tone === "child" ? colors.childSoft : tone === "blue" ? colors.blueSoft : tone === "teacher" ? colors.brandSoft : colors.paper;
  const content = (
    <ToneContext.Provider value={tone}>
      <View style={[styles.screenInner, { paddingTop: insets.top + spacing.md }]}>{children}</View>
    </ToneContext.Provider>
  );
  const backgroundEnvironment = getBackgroundEnvironment(tone);
  const backgroundSource = backgroundEnvironment ? brandedAssetFor(backgroundEnvironment, width) : undefined;
  const backgroundFrame = getAssetFrame(width, height, width >= 700 ? 2048 / 2732 : 1290 / 2796);
  const shell = backgroundSource ? (
    <View style={[styles.screen, { backgroundColor }]}>
      <Image source={backgroundSource} resizeMode="stretch" style={[styles.backgroundImage, backgroundFrame]} />
      <View style={styles.backgroundWash} />
      {scroll ? (
        <ScrollView style={styles.transparent} contentContainerStyle={styles.scrollContent}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  ) : null;

  if (shell) {
    return shell;
  }

  if (!scroll) {
    return <View style={[styles.screen, { backgroundColor }]}>{content}</View>;
  }

  return (
    <ScrollView style={[styles.screen, { backgroundColor }]} contentContainerStyle={styles.scrollContent}>
      {content}
    </ScrollView>
  );
}

function getBackgroundEnvironment(tone: ScreenTone): BrandedEnvironment | null {
  if (tone === "child") return "crescer";
  if (tone === "blue") return "student";
  if (tone === "teacher") return "teacher";
  return null;
}

function getAssetFrame(width: number, height: number, aspectRatio: number) {
  const heightBasedWidth = height * aspectRatio;
  const frameWidth = Math.min(width, heightBasedWidth);
  const frameHeight = frameWidth / aspectRatio;

  return {
    height: frameHeight,
    left: (width - frameWidth) / 2,
    top: (height - frameHeight) / 2,
    width: frameWidth
  };
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  onHome,
  onLogout
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onHome?: () => void;
  onLogout?: () => void;
}) {
  const inkColor = useToneInk();
  return (
    <View style={styles.header}>
      <View style={styles.headerActions}>
        {onBack ? <IconButton icon="chevron-left" label="Voltar" onPress={onBack} /> : <View style={styles.iconSpace} />}
        {onHome ? <IconButton icon="home" label="Início" onPress={onHome} /> : null}
      </View>
      <View style={styles.headerTitle}>
        <Text style={[styles.title, { color: inkColor }]}>{title}</Text>
      </View>
      {onLogout ? <IconButton icon="log-out" label="Sair" onPress={onLogout} /> : <View style={styles.iconSpace} />}
    </View>
  );
}

export function BottomNavigation({
  profile,
  activeKey,
  onSelect
}: {
  profile: AppProfile;
  activeKey: string;
  onSelect: (key: string) => void;
}) {
  const modulesByKey = new Map(profile.modules.map((item) => [item.key, item]));
  const tabs = profile.bottomTabs.map((key) => modulesByKey.get(key) ?? homeModule);
  const insets = useSafeAreaInsets();
  const activeColor = profile.accent === "blue" ? colors.studentInk : colors.brand;

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {tabs.map((tab) => {
        const active = tab.key === activeKey || (tab.key === "home" && activeKey === "home");
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            onPress={() => onSelect(tab.key)}
            style={[styles.bottomItem, active && styles.bottomItemActive]}
          >
            <Feather name={tab.icon} size={19} color={active ? activeColor : colors.muted} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82} style={[styles.bottomLabel, active && styles.bottomLabelActive, active && { color: activeColor }]}>
              {bottomLabel(tab.key, tab.label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function HeroCard({ profile }: { profile: AppProfile }) {
  const inkColor = useToneInk();
  return (
    <View style={[styles.hero, accentBorder(profile.accent)]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials(profile.userName)}</Text>
      </View>
      <View style={styles.heroText}>
        <Text style={[styles.heroTitle, { color: inkColor }]}>{profile.homeTitle}</Text>
        <Text style={styles.heroIntro}>{profile.homeIntro}</Text>
      </View>
    </View>
  );
}

export function ModuleCard({ item, onPress }: { item: ModuleItem; onPress: () => void }) {
  const inkColor = useToneInk();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.moduleCard}>
      <View style={styles.moduleIcon}>
        <Feather name={item.icon} size={22} color={colors.brand} />
      </View>
      <View style={styles.moduleText}>
        <Text style={[styles.moduleLabel, { color: inkColor }]}>{item.label}</Text>
        <Text style={styles.moduleDescription}>{item.description}</Text>
      </View>
      <Feather name="chevron-right" size={22} color={colors.muted} />
    </Pressable>
  );
}

export function StatCard({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  const inkColor = useToneInk();
  return (
    <View style={styles.statCard}>
      <Feather name={icon} size={20} color={colors.brand} />
      <Text style={[styles.statValue, { color: inkColor }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function ListCard({
  title,
  subtitle,
  icon,
  badge,
  onPress
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  badge?: string;
  onPress?: () => void;
}) {
  const inkColor = useToneInk();
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={styles.listCard}>
      <View style={styles.listIcon}>
        <Feather name={icon} size={19} color={colors.brandDark} />
      </View>
      <View style={styles.listText}>
        <Text style={[styles.listTitle, { color: inkColor }]}>{title}</Text>
        <Text style={styles.listSubtitle}>{subtitle}</Text>
      </View>
      {badge ? <Badge label={badge} /> : null}
    </Pressable>
  );
}

export function Badge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: string }) {
  const inkColor = useToneInk();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: inkColor }]}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  const inkColor = useToneInk();
  return (
    <View style={styles.emptyState}>
      <Feather name="inbox" size={26} color={colors.muted} />
      <Text style={[styles.emptyTitle, { color: inkColor }]}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.emptyState}>
      <Feather name="loader" size={26} color={colors.brand} />
      <Text style={styles.emptyTitle}>Carregando</Text>
      <Text style={styles.emptyBody}>Na próxima fase este estado será conectado aos dados reais.</Text>
    </View>
  );
}

export function ErrorState() {
  return (
    <View style={styles.emptyState}>
      <Feather name="alert-triangle" size={26} color={colors.coral} />
      <Text style={styles.emptyTitle}>Algo precisa de atenção</Text>
      <Text style={styles.emptyBody}>Mensagem amigável, sem erro técnico exposto.</Text>
    </View>
  );
}

function IconButton({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Feather name={icon} size={20} color={colors.brandDark} />
    </Pressable>
  );
}

function useToneInk() {
  const tone = React.useContext(ToneContext);
  return tone === "blue" ? colors.studentInk : colors.ink;
}

function accentBorder(accent: AppProfile["accent"]) {
  const borderColor: ColorValue =
    accent === "child" ? colors.child : accent === "blue" ? colors.blue : accent === "coral" ? colors.coral : colors.brand;
  return { borderColor };
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function bottomLabel(key: string, fallback: string) {
  if (key === "discoveries") return "Descobrir";
  if (key === "activities") return "Atividades";
  if (key === "notifications") return "Avisos";
  if (key === "communication") return "Recados";
  if (key === "analytics") return "Dados";
  return fallback;
}

const homeModule: ModuleItem = {
  key: "home",
  label: "Início",
  icon: "home",
  description: "Tela inicial do ambiente."
};

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  backgroundImage: {
    position: "absolute"
  },
  backgroundWash: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  transparent: {
    backgroundColor: "transparent",
    flex: 1
  },
  screenInner: {
    flex: 1,
    paddingHorizontal: spacing.lg
  },
  scrollContent: {
    paddingBottom: 120
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  headerTitle: {
    alignItems: "center",
    flex: 1,
    paddingHorizontal: spacing.sm
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center"
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  iconSpace: {
    height: 42,
    width: 42
  },
  hero: {
    backgroundColor: colors.surface,
    borderLeftWidth: 5,
    borderRadius: radii.lg,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    ...shadow
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radii.pill,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  avatarText: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: "900"
  },
  heroText: {
    flex: 1
  },
  heroTitle: {
    color: colors.ink,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0
  },
  heroIntro: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    marginTop: spacing.xs
  },
  moduleCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  moduleIcon: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  moduleText: {
    flex: 1
  },
  moduleLabel: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  moduleDescription: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 2
  },
  statCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 2,
    flex: 1,
    gap: spacing.xs,
    minHeight: 110,
    padding: spacing.md
  },
  statValue: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  listCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 2,
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
    padding: spacing.md
  },
  listIcon: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  listText: {
    flex: 1
  },
  listTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: "800"
  },
  listSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2
  },
  badge: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  badgeText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.md
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  sectionAction: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "800"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 2,
    gap: spacing.sm,
    padding: spacing.xl
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: "900"
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    textAlign: "center"
  },
  bottomNav: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.xs,
    left: 0,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    position: "absolute",
    right: 0
  },
  bottomItem: {
    alignItems: "center",
    borderRadius: radii.md,
    flex: 1,
    gap: 3,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 2
  },
  bottomItemActive: {
    backgroundColor: colors.brandSoft
  },
  bottomLabel: {
    color: colors.muted,
    fontSize: 9,
    fontWeight: "800"
  },
  bottomLabelActive: {
    color: colors.brand
  }
});
