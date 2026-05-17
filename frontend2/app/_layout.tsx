import { useState, useEffect } from 'react';
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { RoleUtilisateur } from "@/types/user.types";
import { Colors } from "@/constants/colors";
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useNotifications } from "@/hooks/useNotification";

// ─────────────────────────────────────────────
//  Inner component — runs AFTER auth is loaded
//  so user?.id is available when useNotifications runs
// ─────────────────────────────────────────────

function AppContent() {
  const { user } = useAuthStore();

  // Initialize notifications + WebSocket connection
  // This runs once when the user is authenticated
  // The hook fetches existing notifications and opens a WebSocket
  // for live pushes — keeping the bell count updated in real time
  useNotifications(user?.id ?? null);

  return <Slot />;
}

// ─────────────────────────────────────────────
//  Root layout
// ─────────────────────────────────────────────

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, role, loadFromStorage } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  // On first launch, restore token from SecureStore
  useEffect(() => {
    loadFromStorage().finally(() => setIsReady(true));
  }, []);

  // Redirect based on auth state and role
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated) {
      if (!inAuthGroup) router.replace("/(auth)/login");
      return;
    }

    if (role === RoleUtilisateur.CLIENT) {
      router.replace("/(client)/home");
    } else if (
      role === RoleUtilisateur.CHAUFFEUR_IND ||
      role === RoleUtilisateur.CHAUFFEUR_FLOTTE
    ) {
      router.replace("/(driver)/home");
    } else if (role === RoleUtilisateur.PROP_FLOTTE) {
      router.replace("/(fleet)/dashboard");
    }
  }, [isAuthenticated, role, isReady]);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
        {!isReady ? (
          <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <AppContent />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}