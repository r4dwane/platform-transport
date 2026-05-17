import { useState } from "react";
import { useAuthStore } from "@/store/auth.store";
import { LoginPayload, RegisterPayload } from "@/types/user.types";
import { AxiosError } from "axios";

const extractError = (e: any, fallback: string): string => {
  const detail = e?.response?.data?.detail;
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d?.msg ?? JSON.stringify(d)).join(", ");
  }
  if (typeof detail === "object") return JSON.stringify(detail);
  return fallback;
};

export const useAuth = () => {
  const [error, setError] = useState<string | null>(null);
  const { login, register, logout, isLoading, user, role, isAuthenticated } =
    useAuthStore();

  const handleLogin = async (payload: LoginPayload) => {
    setError(null);
    try {
      await login(payload);
    } catch (e: any) {
      setError(extractError(e, "Erreur de connexion. Réessayez."));
      throw e;
    }
  };

  const handleRegister = async (payload: RegisterPayload) => {
    setError(null);
    try {
      await register(payload);
    } catch (e: any) {
      console.log("REGISTER ERROR:", JSON.stringify(e?.response?.data));
      console.log("STATUS:", e?.response?.status);
      setError(extractError(e, "Erreur lors de l'inscription."));
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

