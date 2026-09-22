import React, { useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions, type TextStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletWidth, loginAssetFor } from "../branding";
import { getAppRoleForSession, signInWithPassword, type MobileSession } from "../services/library";
import { colors, spacing } from "../theme";
import type { AppRole } from "../data/fixtures";

const visibleCaretStyle = { caretColor: colors.brand } as unknown as TextStyle;

export function LoginScreen({ onSelectRole }: { onSelectRole: (role: AppRole, session?: MobileSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const [loginPending, setLoginPending] = useState(false);
  const [loginError, setLoginError] = useState("");
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tablet = isTabletWidth(width);
  const loginRects = useMemo(() => (tablet ? tabletLoginRects : phoneLoginRects), [tablet]);
  const visualSource = loginAssetFor(width);
  const visualAspectRatio = tablet ? 1448 / 1086 : 853 / 1844;
  const assetFrame = useMemo(() => getAssetFrame(width, height, visualAspectRatio), [height, visualAspectRatio, width]);

  async function submitCrescerLogin() {
    if (loginPending) return;
    setLoginPending(true);
    setLoginError("");
    try {
      const session = await signInWithPassword(email, password);
      const role = await getAppRoleForSession(session);
      onSelectRole(role, session);
    } catch (_error) {
      setLoginError("Não foi possível entrar. Confira e tente novamente.");
    } finally {
      setLoginPending(false);
    }
  }

  function recoverPassword() {
    setLoginError("Peça ajuda para sua escola recuperar o acesso.");
  }

  return (
    <View style={styles.screen}>
      <Image source={visualSource} resizeMode="stretch" style={[styles.loginImage, assetFrame]} />
      <View style={[styles.loginLayer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={[styles.assetOverlay, assetFrame]}>
          <Pressable onPress={() => emailInputRef.current?.focus()} style={[styles.loginFieldClip, focusedField === "email" && styles.loginFieldFocused, loginRects.email]}>
            <TextInput
              ref={emailInputRef}
              accessibilityLabel="E-mail"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!loginPending}
              keyboardType="email-address"
              onBlur={() => setFocusedField(null)}
              onChangeText={setEmail}
              onFocus={() => setFocusedField("email")}
              placeholder="E-mail"
              placeholderTextColor="rgba(6, 61, 42, 0.58)"
              returnKeyType="next"
              selectionColor={colors.brand}
              style={[styles.loginTextInput, visibleCaretStyle]}
              textContentType="username"
              value={email}
            />
            <View pointerEvents="none" style={[styles.loginIconLayer, styles.emailIconLayer]}>
              <Feather name="mail" size={14} color={colors.studentInk} />
            </View>
          </Pressable>

          <Pressable onPress={() => passwordInputRef.current?.focus()} style={[styles.loginFieldClip, focusedField === "password" && styles.loginFieldFocused, loginRects.password]}>
            <TextInput
              ref={passwordInputRef}
              accessibilityLabel="Senha"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loginPending}
              onBlur={() => setFocusedField(null)}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onSubmitEditing={submitCrescerLogin}
              placeholder="Senha"
              placeholderTextColor="rgba(6, 61, 42, 0.58)"
              returnKeyType="done"
              secureTextEntry={!passwordVisible}
              selectionColor={colors.brand}
              style={[styles.loginTextInput, styles.passwordTextInput, visibleCaretStyle]}
              textContentType="password"
              value={password}
            />
            <View pointerEvents="none" style={[styles.loginIconLayer, styles.emailIconLayer]}>
              <Feather name="lock" size={14} color={colors.studentInk} />
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
            focusable={false}
            onPress={() => setPasswordVisible((current) => !current)}
            style={[styles.eyeButton, loginRects.eye]}
          >
            <Feather name={passwordVisible ? "eye-off" : "eye"} size={15} color={colors.studentInk} />
          </Pressable>

          <Pressable accessibilityRole="button" accessibilityLabel="Entrar" focusable={false} onPress={submitCrescerLogin} style={[styles.submitButton, loginRects.submit]}>
            <Text style={styles.submitText}>Entrar</Text>
          </Pressable>

          <Pressable accessibilityRole="button" accessibilityLabel="Esqueci minha senha" focusable={false} onPress={recoverPassword} style={[styles.forgotButton, loginRects.forgot]}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </Pressable>

          <Pressable accessibilityRole="button" accessibilityLabel="Precisa de ajuda" focusable={false} onPress={recoverPassword} style={[styles.supportButton, loginRects.support]}>
            <Feather name="headphones" size={20} color={colors.studentInk} />
            <View style={styles.supportTextGroup}>
              <Text style={styles.supportTitle}>Precisa de ajuda?</Text>
              <Text style={styles.supportText}>Fale com o nosso suporte</Text>
            </View>
          </Pressable>

          {loginPending ? (
            <View style={[styles.loadingOverlay, loginRects.submit]}>
              <ActivityIndicator color={colors.surface} size="small" />
            </View>
          ) : null}

          {loginError ? (
            <View style={[styles.feedback, tablet ? styles.feedbackTablet : styles.feedbackPhone]}>
              <Text style={styles.feedbackText}>{loginError}</Text>
            </View>
          ) : null}
        </View>
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
  email: { left: "17.8%", top: "59.3%", width: "64.4%", height: "4.55%" },
  password: { left: "17.8%", top: "65.1%", width: "64.4%", height: "4.55%" },
  eye: { left: "72.2%", top: "65.4%", width: "7.5%", height: "3.9%" },
  submit: { left: "17.8%", top: "71.2%", width: "64.4%", height: "5.3%" },
  forgot: { left: "25.0%", top: "77.3%", width: "50.0%", height: "3.4%" },
  support: { left: "28.0%", top: "83.2%", width: "44.0%", height: "5.2%" }
} as const;

const tabletLoginRects = {
  email: { left: "36.3%", top: "58.0%", width: "27.4%", height: "4.2%" },
  password: { left: "36.3%", top: "63.6%", width: "27.4%", height: "4.2%" },
  eye: { left: "59.7%", top: "63.9%", width: "4.4%", height: "3.6%" },
  submit: { left: "36.3%", top: "70.1%", width: "27.4%", height: "5.0%" },
  forgot: { left: "40.0%", top: "76.7%", width: "20.0%", height: "2.8%" },
  support: { left: "39.0%", top: "82.0%", width: "22.0%", height: "4.4%" }
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
  loginTextInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    bottom: 0,
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
    height: "100%",
    left: 0,
    lineHeight: 15,
    paddingBottom: 0,
    paddingLeft: "17.5%",
    paddingRight: "8%",
    paddingTop: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%",
    zIndex: 2
  },
  passwordTextInput: {
    paddingRight: "19%"
  },
  loginFieldClip: {
    backgroundColor: "rgba(255, 255, 255, 0.72)",
    borderColor: "rgba(8, 67, 47, 0.18)",
    borderRadius: 999,
    borderWidth: 1.5,
    overflow: "hidden",
    position: "absolute"
  },
  loginFieldFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(6, 94, 58, 0.72)",
    shadowColor: "rgba(6, 94, 58, 0.2)",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 8
  },
  loginIconLayer: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "flex-start",
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1
  },
  emailIconLayer: {
    paddingLeft: "8.5%"
  },
  eyeButton: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute"
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 999,
    justifyContent: "center",
    position: "absolute",
    shadowColor: "rgba(6, 61, 42, 0.28)",
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 1,
    shadowRadius: 10
  },
  submitText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0
  },
  forgotButton: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute"
  },
  forgotText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "900"
  },
  supportButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    position: "absolute"
  },
  supportTextGroup: {
    justifyContent: "center"
  },
  supportTitle: {
    color: colors.studentInk,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12
  },
  supportText: {
    color: colors.studentInk,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 12
  },
  loadingOverlay: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute"
  },
  feedback: {
    backgroundColor: "rgba(200, 93, 67, 0.92)",
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute"
  },
  feedbackPhone: {
    left: "12%",
    right: "12%",
    top: "88%"
  },
  feedbackTablet: {
    left: "34%",
    right: "34%",
    top: "80%"
  },
  feedbackText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    textAlign: "center"
  }
});
