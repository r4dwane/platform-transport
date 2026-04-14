import api from "./api";
import { LoginPayload, RegisterPayload, AuthResponse, User } from "@/types/user.types";
 
export const authService = {
  register: (payload: RegisterPayload) =>
    api.post("/api/v1/auth/register", payload),
 
  login: (payload: LoginPayload) =>
    api.post<AuthResponse>("/api/v1/auth/login", payload),
 
  me: () =>
    api.get<User>("/api/v1/auth/me"),
};