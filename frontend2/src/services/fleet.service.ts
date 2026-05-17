// src/services/fleet.service.ts

import api from "./api";

export const fleetService = {
  getStats: () =>
    api.get("/api/v1/fleet/stats"),

  getDrivers: () =>
    api.get("/api/v1/fleet/drivers"),

  getDriver: (driverId: string) =>
    api.get(`/api/v1/fleet/drivers/${driverId}`),

  removeDriver: (driverId: string) =>
    api.delete(`/api/v1/fleet/drivers/${driverId}`),

  getVehicles: () =>
    api.get("/api/v1/fleet/vehicles"),

  getTrips: () =>
    api.get("/api/v1/fleet/trips"),

  getAvailableLoads: () =>
    api.get("/api/v1/fleet/available-loads"),

  getDriverVehicles: (driverId: string) =>
    api.get(`/api/v1/fleet/drivers/${driverId}/vehicles`),
  
  addVehicleToDriver: (driverId: string, payload: {
    type: string;
    capaciteKg: number;
    capaciteM3?: number;
    plaqueImmatriculation: string;
  }) =>
    api.post(`/api/v1/fleet/drivers/${driverId}/vehicles`, payload),

  removeVehicleFromDriver: (driverId: string, vehicleId: string) =>
    api.delete(`/api/v1/fleet/drivers/${driverId}/vehicles/${vehicleId}`),

  assignMission: (payload: {
    load_id: string;
    driver_id: string;
    vehicle_id: string;
    methode_paiement?: string;
  }) => api.post("/api/v1/fleet/assign", payload),

  optimizeFleet: () =>
    api.post("/api/v1/fleet/optimize"),

  // ── Invite codes ──────────────────────────────
  generateInviteCode: () =>
    api.post("/api/v1/fleet/invite"),

  getInviteCodes: () =>
    api.get("/api/v1/fleet/invites"),
};
