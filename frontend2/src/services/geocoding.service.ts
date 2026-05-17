// src/services/geocoding.service.ts
//
// Uses Nominatim — OpenStreetMap's free geocoding API
// No API key required, no rate limit for reasonable usage
// Docs: https://nominatim.org/release-docs/develop/api/Search/

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

// We add a custom User-Agent as required by Nominatim's usage policy
const HEADERS = {
  "User-Agent": "TransportDZ/1.0 (contact@transportdz.dz)",
  "Accept-Language": "fr", // prefer French results for Algeria
};

export interface GeocodingResult {
  displayName: string;    // Full formatted address
  latitude: number;
  longitude: number;
}

// ─────────────────────────────────────────────
//  Forward geocoding: address text → coordinates
//  Used when user types an address
// ─────────────────────────────────────────────
export const searchAddress = async (
  query: string
): Promise<GeocodingResult[]> => {
  if (!query || query.length < 3) return [];

  try {
    const params = new URLSearchParams({
      q: query,
      format: "json",
      limit: "5",
      countrycodes: "dz",       // restrict to Algeria
      addressdetails: "1",
    });

    const response = await fetch(
      `${NOMINATIM_BASE}/search?${params.toString()}`,
      { headers: HEADERS }
    );

    if (!response.ok) throw new Error("Geocoding request failed");

    const data = await response.json();

    return data.map((item: any) => ({
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    }));
  } catch (error) {
    console.log("Geocoding error:", error);
    return [];
  }
};

// ─────────────────────────────────────────────
//  Reverse geocoding: coordinates → address text
//  Used when user taps a point on the map
// ─────────────────────────────────────────────
export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: "json",
      "accept-language": "fr",
    });

    const response = await fetch(
      `${NOMINATIM_BASE}/reverse?${params.toString()}`,
      { headers: HEADERS }
    );

    if (!response.ok) throw new Error("Reverse geocoding failed");

    const data = await response.json();
    return data.display_name ?? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  } catch (error) {
    console.log("Reverse geocoding error:", error);
    return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
  }
};