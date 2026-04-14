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
};