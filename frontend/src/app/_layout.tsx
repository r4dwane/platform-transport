import { useState } from 'react' 
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { RoleUtilisateur } from "@/types/user.types";
import { Colors } from "@/constants/colors"
 
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
 
    // Authenticated — route to the correct tab group by role
    if (role === RoleUtilisateur.CLIENT) {
      router.replace("/client/home");
    } else if (
      role === RoleUtilisateur.CHAUFFEUR_IND ||
      role === RoleUtilisateur.CHAUFFEUR_FLOTTE
    ) {
      router.replace("/driver/home");
    } else if (role === RoleUtilisateur.PROP_FLOTTE) {
      router.replace("/fleet/dashboard");
    }
  }, [isAuthenticated, role, isReady]);
 
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
 
  return <Slot />;
}
