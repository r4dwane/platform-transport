// ─── app/index.tsx ───────────────────────────────────────────────────────────
import { Redirect } from "expo-router";
import { useAuthStore } from "@/store/auth.store";
import { RoleUtilisateur } from "@/types/user.types";

export default function Index() {
  const { isAuthenticated, role } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }


  if (role === RoleUtilisateur.CLIENT) {
    return <Redirect href="/(client)/home" />;
  }

  if (
    role === RoleUtilisateur.CHAUFFEUR_IND ||
    role === RoleUtilisateur.CHAUFFEUR_FLOTTE
  ) {
    return <Redirect href="/(driver)/home" />;
  }

  if (role === RoleUtilisateur.PROP_FLOTTE) {
    return <Redirect href="/(fleet)/dashboard" />;
  }

  return <Redirect href="/(auth)/login" />;
}
