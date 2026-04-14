
import { create } from "zustand";
import { Load, CreateLoadPayload, StatutCharge, TypeMarchandise } from "@/types/load.types";
import { loadsService } from "@/services/loads.service";
 
interface LoadsFilters {
  type_marchandise?: TypeMarchandise;
  poids_min?: number;
  poids_max?: number;
  prix_min?: number;
  [key: string]: unknown;
}
 
interface LoadsState {
  // Available loads (driver browsing)
  availableLoads: Load[];
  isLoadingAvailable: boolean;
 
  // Client's own loads
  myLoads: Load[];
  isLoadingMine: boolean;
 
  // Selected load detail
  selectedLoad: Load | null;
 
  // Filters
  filters: LoadsFilters;
 
  // Actions
  fetchAvailable: (filters?: LoadsFilters) => Promise<void>;
  fetchMyLoads: () => Promise<void>;
  fetchById: (id: string) => Promise<void>;
  createLoad: (payload: CreateLoadPayload) => Promise<string>;
  cancelLoad: (id: string) => Promise<void>;
  setFilters: (filters: LoadsFilters) => void;
  clearFilters: () => void;
  setSelectedLoad: (load: Load | null) => void;
}
 
export const useLoadsStore = create<LoadsState>((set, get) => ({
  availableLoads: [],
  isLoadingAvailable: false,
  myLoads: [],
  isLoadingMine: false,
  selectedLoad: null,
  filters: {},
 
  fetchAvailable: async (filters) => {
    set({ isLoadingAvailable: true });
    try {
      const activeFilters = filters ?? get().filters;
      const { data } = await loadsService.getAvailable(activeFilters);
      set({ availableLoads: data.charges });
    } finally {
      set({ isLoadingAvailable: false });
    }
  },
 
  fetchMyLoads: async () => {
    set({ isLoadingMine: true });
    try {
      const { data } = await loadsService.getMyLoads();
      set({ myLoads: data.charges });
    } finally {
      set({ isLoadingMine: false });
    }
  },
 
  fetchById: async (id) => {
    const { data } = await loadsService.getById(id);
    set({ selectedLoad: data });
  },
 
  createLoad: async (payload) => {
    const { data } = await loadsService.create(payload);
    // Refresh my loads after creation
    await get().fetchMyLoads();
    return data.charge_id;
  },
 
  cancelLoad: async (id) => {
    await loadsService.cancel(id);
    // Remove from both lists
    set((state) => ({
      myLoads: state.myLoads.map((l) =>
        l.id === id ? { ...l, status: StatutCharge.ANNULEE } : l
      ),
      availableLoads: state.availableLoads.filter((l) => l.id !== id),
    }));
  },
 
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
  setSelectedLoad: (load) => set({ selectedLoad: load }),
}));