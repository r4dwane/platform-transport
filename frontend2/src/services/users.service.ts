import { Vehicle } from "@/types/vehicule.type";
import api from "./api"; 
export const usersService = {
  getProfile: () =>
    api.get("/api/v1/users/me"),
 
  updateProfile: (data: { nom?: string; email?: string }) =>
    api.patch("/api/v1/users/me", data),
 
  rateUser: (userId: string, note: number, trajet_id: string) =>
    api.post(`/api/v1/users/rate/${userId}`, { note, trajet_id }),
 
  getMyVehicles: () =>
    api.get<{ vehicules: Vehicle[] }>("/api/v1/users/vehicles"),
 
  registerVehicle: (data: Omit<Vehicle, "id" | "proprietaireId" | "status">) =>
    api.post("/api/v1/users/vehicles", data),
 
  updateVehicleStatus: (vehicleId: string, status: string) =>
    api.patch(`/api/v1/users/vehicles/${vehicleId}`, { status }),
};
 