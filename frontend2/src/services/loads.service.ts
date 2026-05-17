import api from "./api";
import { Load, CreateLoadPayload } from "@/types/load.types";
 
export const loadsService = {
  getAvailable: (params?: Record<string, unknown>) =>
    api.get<{ charges: Load[]; total: number }>("/api/v1/loads", { params }),
 
  getById: (id: string) =>
    api.get<Load>(`/api/v1/loads/${id}`),
 
  getMyLoads: () =>
    api.get<{ charges: Load[] }>("/api/v1/loads/my/loads"),
 
  create: (payload: CreateLoadPayload) =>
    api.post("/api/v1/loads", payload),
 
  // NEW — edit a load (only works when status = DISPONIBLE)
  update: (id: string, payload: Partial<CreateLoadPayload>) =>
    api.put(`/api/v1/loads/${id}`, payload),
 
  cancel: (id: string) =>
    api.delete(`/api/v1/loads/${id}`),
};