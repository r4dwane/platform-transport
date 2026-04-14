import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { LoginPayload, RegisterPayload } from "@/types/user.types";
 
export const useAuth = () => {
  const [error, setError] = useState<string | null>(null);
  const { login, register, logout, isLoading, user, role, isAuthenticated } =
    useAuthStore();
 
  const handleLogin = async (payload: LoginPayload) => {
    setError(null);
    try {
      await login(payload);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ?? "Erreur de connexion. Réessayez.";
      setError(msg);
      throw e;
    }
  };
 
  const handleRegister = async (payload: RegisterPayload) => {
    setError(null);
    try {
      await register(payload);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ?? "Erreur lors de l'inscription.";
      setError(msg);
      throw e;
    }
  };
 
  const handleLogout = async () => {
    await logout();
  };
 
  return {
    user,
    role,
    isAuthenticated,
    isLoading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
};