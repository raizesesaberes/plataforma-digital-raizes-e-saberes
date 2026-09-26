import React, { useMemo, useState } from "react";
import { Feather } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type TextStyle
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { isTabletWidth, loginAssetFor, splashAssetFor } from "../branding";
import { colors, spacing } from "../theme";

const visibleCaretStyle = { caretColor: colors.brand } as unknown as TextStyle;

export function LoginScreen({
  mode = "login",
  loading,
  errorMessage,
  infoMessage,
  onLogin,
  onRecoverPassword
}: {
  mode?: "splash" | "login";
  loading?: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
  onLogin: (email: string, password: string) => void;
  onRecoverPassword: (email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tablet = isTabletWidth(width);
  const loginRects = useMemo(() => (tablet ? tabletLoginRects : phoneLoginRects), [tablet]);
  const visualSource = mode === "splash" ? splashAssetFor(width) : loginAssetFor(width);
  const visualAspectRatio = mode === "splash" ? (tablet ? 2048 / 2732 : 1290 / 2796) : tablet ? 1448 / 1086 : 853 / 1844;
  const assetFrame = useMemo(
    () => getAssetFrame(width, height, visualAspectRatio),
    [height, visualAspectRatio, width]
  );

  function submitLogin() {
    if (loading) return;
    onLogin(email, password);
  }

  function recoverPassword() {
    onRecoverPassword(email);
  }

  return (
    <View style={styles.screen}>
      <Image source={visualSource} resizeMode="stretch" style={[styles.loginImage, assetFrame]} />
      <View style={[styles.loginLayer, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        {mode === "login" ? (
          <View style={[styles.assetOverlay, assetFrame]}>
            <View style={[styles.loginFieldClip, focusedField === "email" && styles.loginFieldFocused, loginRects.email]}>
              <TextInput
                accessibilityLabel="E-mail"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                editable={!loading}
                keyboardType="email-address"
                onBlur={() => setFocusedField(null)}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onSubmitEditing={() => undefined}
                placeholder="E-mail"
                placeholderTextColor="rgba(6, 61, 42, 0.58)"
                returnKeyType="next"
                selectionColor={colors.brand}
                style={[styles.loginTextInput, visibleCaretStyle]}
                textContentType="username"
                value={email}
              />
              <View pointerEvents="none" style={styles.loginIconLayer}>
                <Feather name="mail" size={14} color={colors.studentInk} />
              </View>
            </View>

            <View style={[styles.loginFieldClip, focusedField === "password" && styles.loginFieldFocused, loginRects.password]}>
              <TextInput
                accessibilityLabel="Senha"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                onBlur={() => setFocusedField(null)}
                onChangeText={setPassword}
                onFocus={() => setFocusedField("password")}
                onSubmitEditing={submitLogin}
                placeholder="Senha"
                placeholderTextColor="rgba(6, 61, 42, 0.58)"
                returnKeyType="done"
                secureTextEntry={!passwordVisible}
                selectionColor={colors.brand}
                style={[styles.loginTextInput, styles.passwordTextInput, visibleCaretStyle]}
                textContentType="password"
                value={password}
              />
              <View pointerEvents="none" style={styles.loginIconLayer}>
                <Feather name="lock" size={14} color={colors.studentInk} />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={passwordVisible ? "Ocultar senha" : "Mostrar senha"}
              focusable={false}
              onPress={() => setPasswordVisible((current) => !current)}
              style={[styles.eyeButton, loginRects.eye]}
            >
              <Feather name={passwordVisible ? "eye-off" : "eye"} size={15} color={colors.studentInk} />
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel="Entrar" focusable={false} onPress={submitLogin} style={[styles.submitButton, loginRects.submit]}>
              <Text style={styles.submitText}>Entrar</Text>
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel="Esqueci minha senha" focusable={false} onPress={recoverPassword} style={[styles.forgotButton, loginRects.forgot]}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel="Precisa de ajuda" focusable={false} onPress={recoverPassword} style={[styles.supportButton, loginRects.support]}>
              <Feather name="headphones" size={20} color={colors.studentInk} />
              <View>
                <Text style={styles.supportTitle}>Precisa de ajuda?</Text>
                <Text style={styles.supportText}>Fale com o nosso suporte</Text>
              </View>
            </Pressable>

            {loading ? (
              <View style={[styles.loadingOverlay, loginRects.submit]}>
                <ActivityIndicator color={colors.surface} size="small" />
              </View>
            ) : null}

            {errorMessage || infoMessage ? (
              <View style={[styles.feedback, errorMessage ? styles.feedbackError : styles.feedbackInfo, tablet ? styles.feedbackTablet : styles.feedbackPhone]}>
                <Text style={styles.feedbackText}>{errorMessage || infoMessage}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.splashLoader}>
            <ActivityIndicator color={colors.brand} size="large" />
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
    paddingLeft: "8.5%",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 1
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
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: "absolute"
  },
  feedbackError: {
    backgroundColor: "rgba(200, 93, 67, 0.92)"
  },
  feedbackInfo: {
    backgroundColor: "rgba(8, 96, 62, 0.92)"
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
  },
  splashLoader: {
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: "12%"
  }
});
