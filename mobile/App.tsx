import React, { useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./src/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { appProfiles, type AppRole } from "./src/data/fixtures";
import type { MobileSession } from "./src/services/library";

export default function App() {
  const [role, setRole] = useState<AppRole | null>(null);
  const [session, setSession] = useState<MobileSession | null>(null);
  const profile = useMemo(() => (role ? appProfiles[role] : null), [role]);
  const authenticatedProfile = profile && session ? profile : null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {authenticatedProfile ? (
        <AppShell
          profile={authenticatedProfile}
          session={session}
          onLogout={() => {
            setRole(null);
            setSession(null);
          }}
        />
      ) : (
        <LoginScreen
          onSelectRole={(nextRole, nextSession) => {
            setRole(nextRole);
            setSession(nextSession ?? null);
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
