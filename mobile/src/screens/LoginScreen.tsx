import React, { useMemo, useRef, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletWidth, loginAssetFor, splashAssetFor } from "../branding";
import { colors, spacing } from "../theme";

type LoginScreenProps = {
  mode: "splash" | "login";
  loading: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
  onLogin: (email: string, password: string) => Promise<void> | void;
  onRecoverPassword: (email: string) => Promise<void> | void;
};

export function LoginScreen({ mode, loading, errorMessage, infoMessage, onLogin, onRecoverPassword }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tablet = isTabletWidth(width);
  const loginRects = useMemo(() => (tablet ? tabletLoginRects : phoneLoginRects), [tablet]);
  const visualSource = mode === "login" ? loginAssetFor(width) : splashAssetFor(width);
  const visualAspectRatio = mode === "login" ? (tablet ? 1448 / 1086 : 853 / 1844) : tablet ? 2048 / 2732 : 1290 / 2796;
  const assetFrame = useMemo(
    () => getAssetFrame(width, height, visualAspectRatio),
    [height, visualAspectRatio, width]
  );

  function submit() {
    if (!loading) {
      onLogin(email, password);
    }
  }

  function recoverPassword() {
    if (!loading) {
      onRecoverPassword(email);
    }
  }

  return (
    <View style={styles.screen}>
      <Image source={visualSource} resizeMode="stretch" style={[styles.loginImage, assetFrame]} />
      <View style={[styles.loginLayer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {mode === "splash" ? (
          <View style={[styles.assetOverlay, assetFrame]}>
            <View style={styles.splashLoading}>
              <ActivityIndicator color={colors.brand} size="small" />
            </View>
          </View>
        ) : (
          <View style={[styles.assetOverlay, assetFrame]}>
            <Pressable
              onPress={() => emailInputRef.current?.focus()}
              style={[styles.loginFieldClip, focusedField === "email" && styles.loginFieldFocused, loginRects.email]}
            >
              <TextInput
                ref={emailInputRef}
                accessibilityLabel="E-mail"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
                inputMode="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                onBlur={() => setFocusedField(null)}
                onFocus={() => setFocusedField("email")}
                returnKeyType="next"
                style={styles.hiddenLoginInput}
                textContentType="username"
                value={email}
              />
              <View pointerEvents="none" style={[styles.loginValueLayer, styles.emailValueLayer]}>
                <Feather name="mail" size={14} color={colors.studentInk} />
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.loginValueText, !email && styles.loginPlaceholderText]}>
                  {email || "E-mail"}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => passwordInputRef.current?.focus()}
              style={[styles.loginFieldClip, focusedField === "password" && styles.loginFieldFocused, loginRects.password]}
            >
              <TextInput
                ref={passwordInputRef}
                accessibilityLabel="Senha"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onChangeText={setPassword}
                onBlur={() => setFocusedField(null)}
                onFocus={() => setFocusedField("password")}
                onSubmitEditing={submit}
                returnKeyType="done"
                secureTextEntry={!passwordVisible}
                style={styles.hiddenLoginInput}
                textContentType="password"
                value={password}
              />
              <View pointerEvents="none" style={[styles.loginValueLayer, styles.passwordValueLayer]}>
                <Feather name="lock" size={14} color={colors.studentInk} />
                <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.loginValueText, !password && styles.loginPlaceholderText]}>
                  {password ? (passwordVisible ? password : "•".repeat(Math.min(password.length, 16))) : "Senha"}
                </Text>
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
            <Pressable accessibilityRole="button" accessibilityLabel="Entrar" focusable={false} onPress={submit} style={[styles.submitButton, loginRects.submit]}>
              <Text style={styles.submitText}>Entrar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Esqueci minha senha"
              focusable={false}
              onPress={recoverPassword}
              style={[styles.forgotButton, loginRects.forgot]}
            >
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Precisa de ajuda" focusable={false} onPress={recoverPassword} style={[styles.supportButton, loginRects.support]}>
              <Feather name="headphones" size={20} color={colors.studentInk} />
              <View style={styles.supportTextGroup}>
                <Text style={styles.supportTitle}>Precisa de ajuda?</Text>
                <Text style={styles.supportText}>Fale com o nosso suporte</Text>
              </View>
            </Pressable>
            {loading ? (
              <View style={[styles.loadingOverlay, loginRects.submit]}>
                <ActivityIndicator color={colors.surface} size="small" />
              </View>
            ) : null}
            {errorMessage ? (
              <View style={[styles.feedback, styles.errorFeedback, tablet ? styles.feedbackTablet : styles.feedbackPhone]}>
                <Text style={styles.feedbackText}>{errorMessage}</Text>
              </View>
            ) : null}
            {infoMessage ? (
              <View style={[styles.feedback, styles.infoFeedback, tablet ? styles.feedbackTablet : styles.feedbackPhone]}>
                <Text style={styles.feedbackText}>{infoMessage}</Text>
              </View>
            ) : null}
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
  email: { left: "17.8%", top: "57.0%", width: "64.4%", height: "4.55%" },
  password: { left: "17.8%", top: "62.8%", width: "64.4%", height: "4.55%" },
  eye: { left: "72.2%", top: "63.1%", width: "7.5%", height: "3.9%" },
  submit: { left: "17.8%", top: "68.9%", width: "64.4%", height: "5.3%" },
  forgot: { left: "25.0%", top: "75.0%", width: "50.0%", height: "3.4%" },
  support: { left: "28.0%", top: "80.9%", width: "44.0%", height: "5.2%" }
} as const;

const tabletLoginRects = {
  email: { left: "36.3%", top: "56.3%", width: "27.4%", height: "4.2%" },
  password: { left: "36.3%", top: "61.9%", width: "27.4%", height: "4.2%" },
  eye: { left: "59.7%", top: "62.2%", width: "4.4%", height: "3.6%" },
  submit: { left: "36.3%", top: "68.4%", width: "27.4%", height: "5.0%" },
  forgot: { left: "40.0%", top: "75.0%", width: "20.0%", height: "2.8%" },
  support: { left: "39.0%", top: "80.3%", width: "22.0%", height: "4.4%" }
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
  hiddenLoginInput: {
    backgroundColor: "transparent",
    borderWidth: 0,
    bottom: 0,
    color: "transparent",
    height: "100%",
    left: 0,
    opacity: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    position: "absolute",
    right: 0,
    top: 0,
    width: "100%"
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
  loginValueLayer: {
    alignItems: "center",
    bottom: 0,
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-start",
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0
  },
  emailValueLayer: {
    paddingLeft: "8.5%",
    paddingRight: "8%"
  },
  passwordValueLayer: {
    paddingLeft: "8.5%",
    paddingRight: "19%"
  },
  loginValueText: {
    color: colors.brandDark,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 15
  },
  loginPlaceholderText: {
    color: "rgba(6, 61, 42, 0.58)"
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
  hotspot: {
    position: "absolute"
  },
  splashLoading: {
    alignItems: "center",
    bottom: "8%",
    left: 0,
    position: "absolute",
    right: 0
  },
  loadingOverlay: {
    alignItems: "center",
    justifyContent: "center",
    position: "absolute"
  },
  feedback: {
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
  errorFeedback: {
    backgroundColor: "rgba(200, 93, 67, 0.92)"
  },
  infoFeedback: {
    backgroundColor: "rgba(11, 93, 59, 0.92)"
  },
  feedbackText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    textAlign: "center"
  }
});
