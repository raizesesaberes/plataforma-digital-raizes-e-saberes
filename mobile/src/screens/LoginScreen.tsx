import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletWidth, loginAssetFor, splashAssetFor } from "../branding";
import { demoProfiles, type DemoRole } from "../data/fixtures";
import { colors, radii, shadow, spacing } from "../theme";

const roles: DemoRole[] = ["crescer", "fundamental", "professor"];

export function LoginScreen({ onSelectRole }: { onSelectRole: (role: DemoRole) => void }) {
  const [loginPreviewVisible, setLoginPreviewVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tablet = isTabletWidth(width);
  const loginRects = useMemo(() => (tablet ? tabletLoginRects : phoneLoginRects), [tablet]);
  const visualSource = loginPreviewVisible ? loginAssetFor(width) : splashAssetFor(width);
  const visualAspectRatio = loginPreviewVisible ? (tablet ? 1448 / 1086 : 853 / 1844) : tablet ? 2048 / 2732 : 1290 / 2796;
  const assetFrame = useMemo(
    () => getAssetFrame(width, height, visualAspectRatio),
    [height, visualAspectRatio, width]
  );

  return (
    <View style={styles.screen}>
      <Image source={visualSource} resizeMode="stretch" style={[styles.loginImage, assetFrame]} />
      <View style={[styles.loginLayer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {loginPreviewVisible ? (
          <View style={[styles.assetOverlay, assetFrame]}>
            <Text style={[styles.visualInputLabel, loginRects.emailLabel]}>E-mail</Text>
            <Text style={[styles.visualInputLabel, loginRects.passwordLabel]}>Senha</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Campo de e-mail" focusable={false} onPress={() => undefined} style={[styles.hotspot, loginRects.email]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Campo de senha" focusable={false} onPress={() => undefined} style={[styles.hotspot, loginRects.password]} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
              focusable={false}
              onPress={() => setPasswordVisible((current) => !current)}
              style={[styles.hotspot, loginRects.eye]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Entrar" focusable={false} onPress={() => setLoginPreviewVisible(false)} style={[styles.hotspot, loginRects.submit]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Esqueci minha senha" focusable={false} onPress={() => setLoginPreviewVisible(false)} style={[styles.hotspot, loginRects.forgot]} />
            <Pressable accessibilityRole="button" accessibilityLabel="Precisa de ajuda" focusable={false} onPress={() => setLoginPreviewVisible(false)} style={[styles.hotspot, loginRects.support]} />
          </View>
        ) : (
          <View style={styles.selectorPanel}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorEyebrow}>Raízes e Saberes</Text>
              <Text style={styles.selectorTitle}>Um app. Cada perfil no seu espaço.</Text>
              <Text style={styles.selectorBody}>Selecione um ambiente demonstrativo para homologar navegação e visual antes da integração com dados reais.</Text>
            </View>
            <View style={styles.roleList}>
              {roles.map((role) => {
                const profile = demoProfiles[role];
                return (
                  <Pressable key={role} accessibilityRole="button" accessibilityLabel={profile.title} style={styles.roleCard} onPress={() => onSelectRole(role)}>
                    <View style={styles.roleIcon}>
                      <Feather name={role === "crescer" ? "smile" : "user"} size={22} color={colors.brand} />
                    </View>
                    <View style={styles.roleText}>
                      <Text style={styles.roleTitle}>{profile.title}</Text>
                      <Text style={styles.roleSubtitle}>{profile.subtitle}</Text>
                    </View>
                    <Feather name="chevron-right" size={22} color={colors.muted} />
                  </Pressable>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Ver login visual" onPress={() => setLoginPreviewVisible(true)} style={styles.loginPreviewButton}>
              <Text style={styles.loginPreviewText}>Ver login visual</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

function getAssetFrame(width: number, height: number, aspectRatio: number) {
  const heightBasedWidth = height * aspectRatio;
  const baseWidth = Math.min(width, heightBasedWidth);
  const baseHeight = baseWidth / aspectRatio;

  return {
    height: baseHeight,
    left: (width - baseWidth) / 2,
    top: (height - baseHeight) / 2,
    width: baseWidth
  };
}

const phoneLoginRects = {
  email: { left: "15.0%", top: "56.4%", width: "70.0%", height: "4.8%" },
  emailLabel: { left: "30.0%", top: "57.30%", width: "36.0%", height: "2.4%" },
  password: { left: "15.0%", top: "63.4%", width: "63.0%", height: "4.8%" },
  passwordLabel: { left: "30.0%", top: "62.65%", width: "32.0%", height: "2.4%" },
  eye: { left: "78.0%", top: "63.6%", width: "7.6%", height: "4.2%" },
  submit: { left: "11.6%", top: "70.2%", width: "76.8%", height: "5.4%" },
  forgot: { left: "24.0%", top: "76.5%", width: "52.0%", height: "3.5%" },
  support: { left: "28.0%", top: "82.0%", width: "44.0%", height: "5.2%" }
} as const;

const tabletLoginRects = {
  email: { left: "28.4%", top: "55.0%", width: "49.2%", height: "4.4%" },
  emailLabel: { left: "40.8%", top: "55.45%", width: "22.0%", height: "2.0%" },
  password: { left: "28.4%", top: "61.2%", width: "44.0%", height: "4.4%" },
  passwordLabel: { left: "40.8%", top: "61.65%", width: "21.0%", height: "2.0%" },
  eye: { left: "73.2%", top: "61.4%", width: "5.2%", height: "3.8%" },
  submit: { left: "21.8%", top: "63.7%", width: "56.4%", height: "4.9%" },
  forgot: { left: "35.0%", top: "69.6%", width: "30.0%", height: "2.8%" },
  support: { left: "38.0%", top: "75.2%", width: "24.0%", height: "4.8%" }
} as const;

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.paper,
    flex: 1
  },
  loginImage: {
    position: "absolute"
  },
  loginLayer: {
    flex: 1
  },
  assetOverlay: {
    position: "absolute"
  },
  visualInputLabel: {
    color: "rgba(6, 61, 42, 0.46)",
    fontSize: 12,
    fontWeight: "800",
    position: "absolute"
  },
  hotspot: {
    position: "absolute"
  },
  selectorPanel: {
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(220, 231, 223, 0.92)",
    borderRadius: radii.lg,
    borderWidth: 1.5,
    marginTop: "12%",
    maxWidth: 620,
    padding: spacing.lg,
    width: "88%",
    ...shadow
  },
  selectorHeader: {
    marginBottom: spacing.md
  },
  selectorEyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  selectorTitle: {
    color: colors.ink,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.xs
  },
  selectorBody: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21,
    marginTop: spacing.xs
  },
  roleList: {
    gap: spacing.sm
  },
  roleCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.md,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md
  },
  loginPreviewButton: {
    alignItems: "center",
    alignSelf: "center",
    marginTop: spacing.md,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  loginPreviewText: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: "900"
  },
  roleIcon: {
    alignItems: "center",
    backgroundColor: colors.brandSoft,
    borderRadius: radii.md,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  roleText: {
    flex: 1
  },
  roleTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: "900"
  },
  roleSubtitle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2
  }
});
