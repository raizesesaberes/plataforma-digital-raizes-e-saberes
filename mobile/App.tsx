import React, { useEffect, useMemo, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./src/AppShell";
import { splashAssetFor } from "./src/branding";
import { LoginScreen } from "./src/screens/LoginScreen";
import { appProfiles, type AppRole } from "./src/data/fixtures";
import type { MobileSession } from "./src/services/library";

const SPLASH_DURATION_MS = 2000;

function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const { width, height } = useWindowDimensions();
  const [progress, setProgress] = useState(0);
  const spin = useRef(new Animated.Value(0)).current;
  const splashAspectRatio = width >= 700 ? 1448 / 1086 : 853 / 1844;
  const assetFrame = useMemo(() => getAssetFrame(width, height, splashAspectRatio), [height, splashAspectRatio, width]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const nextProgress = Math.min(100, Math.round(((Date.now() - startedAt) / SPLASH_DURATION_MS) * 100));
      setProgress(nextProgress);
      if (nextProgress >= 100) {
        clearInterval(timer);
        onComplete();
      }
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  return (
    <View style={styles.splashScreen}>
      <Image source={splashAssetFor(width)} resizeMode="stretch" style={[styles.splashImage, assetFrame]} />
      <View style={[styles.splashLayer, assetFrame]}>
        <View style={styles.splashLoaderWrap}>
          <View style={styles.splashLoaderShadow}>
            <View style={styles.splashRing}>
              <Animated.View style={[styles.splashOrbit, { transform: [{ rotate: rotation }] }]}>
                <View style={styles.splashDot} />
              </Animated.View>
              <Text style={styles.splashPercent}>{progress}%</Text>
            </View>
          </View>
          <Text style={styles.splashLoadingText}>Carregando</Text>
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

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [session, setSession] = useState<MobileSession | null>(null);
  const profile = useMemo(() => (role ? appProfiles[role] : null), [role]);
  const authenticatedProfile = profile && session ? profile : null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {showSplash ? (
        <SplashScreen onComplete={() => setShowSplash(false)} />
      ) : authenticatedProfile ? (
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

const styles = StyleSheet.create({
  splashScreen: {
    backgroundColor: "#f8fbef",
    flex: 1
  },
  splashImage: {
    position: "absolute"
  },
  splashLayer: {
    position: "absolute"
  },
  splashLoaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    paddingBottom: "12%"
  },
  splashLoaderShadow: {
    borderRadius: 52,
    shadowColor: "#0b5136",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22
  },
  splashRing: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 41,
    borderWidth: 6,
    borderColor: "rgba(255, 174, 36, 0.26)",
    backgroundColor: "rgba(255, 255, 255, 0.84)"
  },
  splashOrbit: {
    position: "absolute",
    width: 82,
    height: 82,
    alignItems: "center"
  },
  splashDot: {
    width: 15,
    height: 15,
    marginTop: -5,
    borderRadius: 8,
    backgroundColor: "#f59d16",
    borderWidth: 3,
    borderColor: "#fff9e8"
  },
  splashPercent: {
    color: "#075c3a",
    fontSize: 19,
    fontWeight: "900"
  },
  splashLoadingText: {
    color: "#0b6a42",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0
  }
});
