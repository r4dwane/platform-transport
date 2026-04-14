import { Trip } from "@/types/trip.type";
import api from "./api";
 
export const tripsService = {
  getMyTrips: () =>
    api.get<{ trajets: Trip[] }>("/api/v1/trips/my/trips"),
 
  getById: (id: string) =>
    api.get<Trip>(`/api/v1/trips/${id}`),
 
  advance: (id: string) =>
    api.post(`/api/v1/trips/${id}/advance`),
 
  updateLocation: (id: string, longitude: number, latitude: number) =>
    api.post(`/api/v1/trips/${id}/location`, { longitude, latitude }),
 
  submitProof: (id: string, image_url: string) =>
    api.post(`/api/v1/trips/${id}/proof`, { image_url }),
};