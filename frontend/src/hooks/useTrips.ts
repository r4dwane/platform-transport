import { useEffect } from "react";
import { useTripsStore } from "@/store/trips.store";
 
export const useTrips = (autoFetch = true) => {
  const store = useTripsStore();
 
  useEffect(() => {
    if (autoFetch) {
      store.fetchMyTrips();
    }
  }, [autoFetch]);
 
  return store;
};