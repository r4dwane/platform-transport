import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { User, RoleUtilisateur, LoginPayload, RegisterPayload } from "@/types/user.types";
import { authService } from "@/services/auth.service";
 
interface AuthState {
  user: User | null;
  token: string | null;
  role: RoleUtilisateur | null;
  isLoading: boolean;
  isAuthenticated: boolean;
 
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}
 
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  role: null,
  isLoading: false,
  isAuthenticated: false,
 
  login: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await authService.login(payload);
 
      await SecureStore.setItemAsync("access_token", data.access_token);
      await SecureStore.setItemAsync("user_id", data.user_id);
      await SecureStore.setItemAsync("user_role", data.role);
 
      // Fetch full profile
      const { data: profile } = await authService.me();
 
      set({
        token: data.access_token,
        role: data.role,
        user: profile,
        isAuthenticated: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },
 
  register: async (payload) => {
    set({ isLoading: true });
    try {
      await authService.register(payload);
    } finally {
      set({ isLoading: false });
    }
  },
 
  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("user_id");
    await SecureStore.deleteItemAsync("user_role");
    set({ user: null, token: null, role: null, isAuthenticated: false });
  },
 
  loadFromStorage: async () => {
    const token = await SecureStore.getItemAsync("access_token");
    const role  = await SecureStore.getItemAsync("user_role") as RoleUtilisateur | null;
    if (token && role) {
      try {
        const { data: profile } = await authService.me();
        set({ token, role, user: profile, isAuthenticated: true });
      } catch {
        // Token expired
        await SecureStore.deleteItemAsync("access_token");
      }
    }
  },
}));