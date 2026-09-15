import React, { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./src/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { colors, radii, shadow, spacing } from "./src/theme";
import {
  hasSupabaseClientConfig,
  profileForAuthContext,
  requestPasswordRecovery,
  restoreAuthSession,
  signInWithPassword,
  signOut,
  type AuthContext
} from "./src/lib/mobileAuth";

type AuthStatus = "checking" | "login" | "ready" | "institutional";

export default function App() {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const profile = useMemo(() => (authContext ? profileForAuthContext(authContext) : null), [authContext]);

  useEffect(() => {
    let mounted = true;

    async function restore() {
      if (!hasSupabaseClientConfig()) {
        if (mounted) {
          setAuthError("Configuração de autenticação indisponível.");
          setStatus("login");
        }
        return;
      }

      try {
        const restoredContext = await restoreAuthSession();
        if (!mounted) return;
        applyResolvedContext(restoredContext);
      } catch {
        if (!mounted) return;
        setStatus("login");
      }
    }

    restore();

    return () => {
      mounted = false;
    };
  }, []);

  function applyResolvedContext(nextContext: AuthContext | null) {
    setAuthContext(nextContext);
    setAuthError(null);
    setAuthInfo(null);

    if (!nextContext) {
      setStatus("login");
      return;
    }

    setStatus(nextContext.route === "institutional" ? "institutional" : "ready");
  }

  async function handleLogin(email: string, password: string) {
    setLoading(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      const context = await signInWithPassword(email, password);
      applyResolvedContext(context);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível entrar agora.");
      setStatus("login");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecoverPassword(email: string) {
    setLoading(true);
    setAuthError(null);
    setAuthInfo(null);

    try {
      await requestPasswordRecovery(email);
      setAuthInfo("Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Não foi possível enviar a recuperação agora.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setAuthContext(null);
      setAuthError(null);
      setAuthInfo(null);
      setStatus("login");
      setLoading(false);
    }
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {status === "ready" && profile ? (
        <AppShell profile={profile} onLogout={handleLogout} />
      ) : status === "institutional" ? (
        <InstitutionalOnlyScreen onLogout={handleLogout} />
      ) : (
        <LoginScreen
          mode={status === "checking" ? "splash" : "login"}
          loading={loading || status === "checking"}
          errorMessage={authError}
          infoMessage={authInfo}
          onLogin={handleLogin}
          onRecoverPassword={handleRecoverPassword}
        />
      )}
    </SafeAreaProvider>
  );
}

function InstitutionalOnlyScreen({ onLogout }: { onLogout: () => void }) {
  return (
    <View style={styles.institutionalScreen}>
      <View style={styles.institutionalCard}>
        <Text style={styles.institutionalEyebrow}>Raízes e Saberes</Text>
        <Text style={styles.institutionalTitle}>Este perfil utiliza a Plataforma Web Raízes e Saberes.</Text>
        <Text style={styles.institutionalBody}>
          Acesso mobile operacional está disponível apenas para estudantes e professores nesta versão.
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Sair" onPress={onLogout} style={styles.institutionalButton}>
          <Text style={styles.institutionalButtonText}>Sair</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  institutionalScreen: {
    alignItems: "center",
    backgroundColor: colors.paper,
    flex: 1,
    justifyContent: "center",
    padding: spacing.xl
  },
  institutionalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 2,
    maxWidth: 520,
    padding: spacing.xl,
    width: "100%",
    ...shadow
  },
  institutionalEyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  institutionalTitle: {
    color: colors.brandDark,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: spacing.sm
  },
  institutionalBody: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginTop: spacing.sm
  },
  institutionalButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    justifyContent: "center",
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.xl
  },
  institutionalButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "900"
  }
});
