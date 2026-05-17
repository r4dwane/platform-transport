// src/services/routing.service.ts

import { LatLng } from "@/components/map/LeafletMap";

// ORS free tier: 2000 requests/day
// Sign up at openrouteservice.org to get your key
// Add to .env: EXPO_PUBLIC_ORS_API_KEY=your_key_here
const ORS_BASE = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY ?? "";

export interface RouteResult {
  routePoints: LatLng[];
  distanceKm: number;
  durationMin: number;
}

// ─────────────────────────────────────────────
//  Main routing function
//  waypoints = [start, ...stops, end]
// ─────────────────────────────────────────────

export const getRoute = async (
  waypoints: LatLng[]
): Promise<RouteResult | null> => {
  if (waypoints.length < 2) return null;

  if (!ORS_API_KEY) {
    console.warn("ORS API key not set — using straight line fallback");
    return straightLineFallback(waypoints);
  }

  try {
    // ORS expects coordinates as [longitude, latitude]
    const coordinates = waypoints.map((p) => [p.longitude, p.latitude]);

    const response = await fetch(ORS_BASE, {
      method: "POST",
      headers: {
        "Authorization": ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates,
        format: "geojson",
        units: "km",
        // radiuses: how far ORS will snap each point to the nearest road (metres)
        // 5000m = 5km tolerance, handles points in remote areas of Algeria
        radiuses: coordinates.map(() => 5000),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("ORS route failed:", response.status, errorText);
      return straightLineFallback(waypoints);
    }

    const data = await response.json();
    const route = data.features?.[0];
    if (!route) return straightLineFallback(waypoints);

    // GeoJSON returns [lon, lat] — convert to {latitude, longitude}
    const routePoints: LatLng[] = route.geometry.coordinates.map(
      (coord: number[]) => ({ latitude: coord[1], longitude: coord[0] })
    );

    const summary = route.properties?.summary;
    const distanceKm = Math.round((summary?.distance ?? 0) * 10) / 10;
    const durationMin = Math.round((summary?.duration ?? 0) / 60);

    return { routePoints, distanceKm, durationMin };

  } catch (error) {
    console.warn("Routing error:", error);
    return straightLineFallback(waypoints);
  }
};

// ─────────────────────────────────────────────
//  Fallback: straight lines + Haversine distance
//  Used when: no API key, ORS fails, or offline
// ─────────────────────────────────────────────

const straightLineFallback = (waypoints: LatLng[]): RouteResult => {
  let totalDistanceKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistanceKm += haversineDistance(waypoints[i], waypoints[i + 1]);
  }
  // Average truck speed in Algeria: ~70 km/h
  const durationMin = Math.round((totalDistanceKm / 70) * 60);
  return {
    routePoints: waypoints,
    distanceKm: Math.round(totalDistanceKm * 10) / 10,
    durationMin,
  };
};

// ─────────────────────────────────────────────
//  Haversine formula — straight line distance in km
// ─────────────────────────────────────────────

export const haversineDistance = (a: LatLng, b: LatLng): number => {
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

// ─────────────────────────────────────────────
//  Formatting helpers
// ─────────────────────────────────────────────

export const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};