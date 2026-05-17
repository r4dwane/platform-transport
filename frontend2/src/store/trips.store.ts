import { create } from "zustand";
import { Trip, StatutTrajet } from "@/types/trip.type";
import { tripsService } from "@/services/trips.service";
 
interface TripsState {
  myTrips: Trip[];
  activeTrip: Trip | null;   // The current ongoing trip (if any)
  selectedTrip: Trip | null;
  isLoading: boolean;
 
  fetchMyTrips: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  advanceStatus: (id: string) => Promise<void>;
  updateLocation: (id: string, lon: number, lat: number) => Promise<void>;
  submitProof: (id: string, imageUrl: string) => Promise<void>;
  setSelectedTrip: (trip: Trip | null) => void;
}
 
const ACTIVE_STATUSES: StatutTrajet[] = [
  StatutTrajet.PLANIFIE,
  StatutTrajet.EN_ROUTE_RAMASSAGE,
  StatutTrajet.CHARGEMENT,
  StatutTrajet.EN_ROUTE_LIVRAISON,
];
 
export const useTripsStore = create<TripsState>((set, get) => ({
  myTrips: [],
  activeTrip: null,
  selectedTrip: null,
  isLoading: false,
 
  fetchMyTrips: async () => {
    set({ isLoading: true });
    try {
      const { data } = await tripsService.getMyTrips();
      const trips = data.trajets;
 
      // Automatically detect the active trip
      const active = trips.find((t) =>
        ACTIVE_STATUSES.includes(t.status as StatutTrajet)
      ) ?? null;
 
      set({ myTrips: trips, activeTrip: active });
    } finally {
      set({ isLoading: false });
    }
  },
 
  fetchById: async (id) => {
    const { data } = await tripsService.getById(id);
    set({ selectedTrip: data });
 
    // Also update in the list and activeTrip if relevant
    set((state) => ({
      myTrips: state.myTrips.map((t) => (t.id === id ? data : t)),
      activeTrip:
        state.activeTrip?.id === id ? data : state.activeTrip,
    }));
  },
 
  advanceStatus: async (id) => {
    await tripsService.advance(id);
    // Re-fetch to get the updated status
    await get().fetchById(id);
    // Re-evaluate active trip
    set((state) => {
      const active = state.myTrips.find((t) =>
        ACTIVE_STATUSES.includes(t.status as StatutTrajet)
      ) ?? null;
      return { activeTrip: active };
    });
  },
 
  updateLocation: async (id, lon, lat) => {
    await tripsService.updateLocation(id, lon, lat);
  },
 
  submitProof: async (id, imageUrl) => {
    await tripsService.submitProof(id, imageUrl);
    set((state) => ({
      selectedTrip: state.selectedTrip?.id === id
        ? { ...state.selectedTrip, proofOfDelivery: imageUrl }
        : state.selectedTrip,
    }));
  },
 
  setSelectedTrip: (trip) => set({ selectedTrip: trip }),
}));