import { useEffect, useRef, useState } from "react";
import { ENDPOINTS } from "@/constants/roles";
import { useTripsStore } from "@/store/trips.store";
import { useLocation } from "./useLocation";
import api from "@/services/api";

interface TrackingLocation {
  lon: number;
  lat: number;
  ts: string;
}

export const useTracking = (tripId: string | null, userId: string | null) => {
  const [driverLocation, setDriverLocation] = useState<TrackingLocation | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!tripId) {
      setDriverLocation(null);
      return;
    }

    setDriverLocation(null);

    api.get(`/api/v1/tracking/trip/${tripId}`)
      .then(({ data }) => {
        if (data?.location) {
          setDriverLocation(data.location);
        }
      })
      .catch((error) => {
        if (error?.response?.status !== 404) {
          console.warn("Tracking REST error", error?.response?.data ?? error?.message ?? error);
        }
        setDriverLocation(null);
      });
  }, [tripId]);

  useEffect(() => {
    if (!userId || !tripId) return;

    const ws = new WebSocket(ENDPOINTS.ws(userId));
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Tracking WS connected", userId);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "location_update" && data.trip_id === tripId) {
          setDriverLocation({ lon: data.lon, lat: data.lat, ts: data.ts });
        }
      } catch (error) {
        console.warn("Tracking WS message error", error);
      }
    };

    ws.onerror = (e) => console.warn("WS error", e);
    ws.onclose = () => console.log("Tracking WS disconnected");

    return () => {
      ws.close();
    };
  }, [userId, tripId]);

  return { driverLocation };
};

export const useDriverTracking = (tripId: string | null) => {
  const { updateLocation } = useTripsStore();
  const { location } = useLocation(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!tripId || !location) return;

    const sendLocation = () => {
      updateLocation(tripId, location.longitude, location.latitude).catch((error) => {
        console.warn("GPS update failed", error?.response?.data ?? error?.message ?? error);
      });
    };

    sendLocation();

    intervalRef.current = setInterval(() => {
      sendLocation();
    }, 5000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tripId, location, updateLocation]);

  return { location };
};
