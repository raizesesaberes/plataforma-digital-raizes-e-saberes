import React, { useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./src/AppShell";
import { LoginScreen } from "./src/screens/LoginScreen";
import { demoProfiles, type DemoRole } from "./src/data/fixtures";

export default function App() {
  const [role, setRole] = useState<DemoRole | null>(null);
  const profile = useMemo(() => (role ? demoProfiles[role] : null), [role]);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {profile ? (
        <AppShell profile={profile} onLogout={() => setRole(null)} />
      ) : (
        <LoginScreen onSelectRole={setRole} />
      )}
    </SafeAreaProvider>
  );
}
