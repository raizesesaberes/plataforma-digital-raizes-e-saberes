import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, spacing } from "../theme";
export const journeyStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  text: { fontSize: 15, color: colors.ink },
  muted: { fontSize: 14, color: colors.muted },
  input: {
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 12,
    color: colors.ink,
    minHeight: 44,
    backgroundColor: colors.surface,
  },
  button: {
    backgroundColor: colors.brandSoft,
    borderRadius: radii.sm,
    padding: 12,
    minHeight: 44,
  },
  error: { color: colors.coral },
  row: { gap: 8 },
});
export function JourneyCard({ children }: { children: React.ReactNode }) {
  return <View style={journeyStyles.card}>{children}</View>;
}
export function Action({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[journeyStyles.button, disabled ? { opacity: 0.5 } : null]}
    >
      <Text style={journeyStyles.text}>{title}</Text>
    </Pressable>
  );
}
export function useOperation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const run = useCallback(async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
    } catch (e) {
      if (mounted.current) {
        const text = e instanceof Error ? e.message : "";
        setError(
          text === "assignment_not_current"
            ? "Esta turma já possui aplicação futura, encerrada ou cancelada. Revise o agendamento existente antes de publicar agora."
            : text.includes("403")
              ? "Acesso negado. Confira seu vínculo com a escola."
              : text.includes("404")
                ? "Serviço indisponível neste ambiente."
                : text.includes("409")
                  ? "A versão mudou. Atualize antes de tentar novamente."
                  : "Não foi possível confirmar a operação. Atualize para conferir o que foi salvo.",
        );
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);
  return { busy, error, message, setMessage, run };
}
export function OperationStatus({
  busy,
  error,
  message,
}: {
  busy: boolean;
  error: string;
  message: string;
}) {
  return (
    <View accessibilityLiveRegion="polite">
      {busy ? <ActivityIndicator color={colors.brand} /> : null}
      {error ? <Text style={journeyStyles.error}>{error}</Text> : null}
      {message ? <Text style={journeyStyles.text}>{message}</Text> : null}
    </View>
  );
}
