import { useEffect, useRef, useState, useCallback } from "react";
import { ENDPOINTS } from "@/constants/roles";
import { useTripsStore } from "@/store/trips.store";
import { useLocation } from "./useLocation";
 
interface TrackingLocation {
  lon: number;
  lat: number;
  ts: string;
}
 
export const useTracking = (tripId: string | null, userId: string | null) => {
  const [driverLocation, setDriverLocation] = useState<TrackingLocation | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
 
  // Connect to WebSocket and listen for location updates
  useEffect(() => {
    if (!userId || !tripId) return;
 
    const ws = new WebSocket(ENDPOINTS.ws(userId));
    wsRef.current = ws;
 
    ws.onopen = () => {
      console.log("📡 Tracking WS connected");
    };
 
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "location_update" && data.trip_id === tripId) {
          setDriverLocation({ lon: data.lon, lat: data.lat, ts: data.ts });
        }
      } catch {}
    };
 
    ws.onerror = (e) => console.warn("WS error", e);
 
    ws.onclose = () => console.log("📡 Tracking WS disconnected");
 
    return () => {
      ws.close();
    };
  }, [userId, tripId]);
 
  return { driverLocation };
};
 
 
// Driver side: send GPS updates
export const useDriverTracking = (tripId: string | null) => {
  const { updateLocation } = useTripsStore();
  const { location } = useLocation(true); // watch = true
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
 
  useEffect(() => {
    if (!tripId || !location) return;
 
    // Send location to backend every 5 seconds
    intervalRef.current = setInterval(() => {
      if (location) {
        updateLocation(tripId, location.longitude, location.latitude);
      }
    }, 5000);
 
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tripId, location]);
 
  return { location };
};
 
 