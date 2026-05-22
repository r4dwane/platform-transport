"""
app/services/optimization.py
─────────────────────────────
Fleet optimization engine using ORS Matrix API for real road distances.
Falls back to Haversine if ORS is unavailable.
"""

import math
import httpx
from typing import List, Dict, Any, Optional
from app.config import settings


# ─────────────────────────────────────────────
#  Haversine — fallback straight-line distance
# ─────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi       = math.radians(lat2 - lat1)
    dlambda    = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 2)


def estimate_trip_km(
    driver_lat: float, driver_lon: float,
    pickup_lat: float, pickup_lon: float,
    dropoff_lat: float, dropoff_lon: float,
    empty_km_override: Optional[float] = None
) -> Dict[str, float]:
    empty_leg  = empty_km_override if empty_km_override is not None \
                 else haversine_km(driver_lat, driver_lon, pickup_lat, pickup_lon)
    loaded_leg = haversine_km(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
    total      = round(empty_leg + loaded_leg, 2)
    return {
        "empty_km":       empty_leg,
        "loaded_km":      loaded_leg,
        "total_km":       total,
        "efficiency_pct": round((loaded_leg / total) * 100, 1) if total > 0 else 0,
    }


# ─────────────────────────────────────────────
#  ORS Matrix API
#  One call returns ALL driver→pickup distances
#  Much faster than N×M individual route calls
# ─────────────────────────────────────────────

async def fetch_ors_distance_matrix(
    driver_positions: List[Dict],   # [{lon, lat, driver_id}, ...]
    pickup_positions: List[Dict],   # [{lon, lat, load_id}, ...]
) -> Optional[List[List[float]]]:
    """
    Returns a matrix[i][j] = road distance in km
    from driver i to pickup j.
    Returns None if ORS fails.
    """
    if not settings.ORS_API_KEY:
        return None

    if not driver_positions or not pickup_positions:
        return None

    # ORS Matrix expects [lon, lat] format
    # Sources = drivers, destinations = pickups
    sources      = [[d["lon"], d["lat"]] for d in driver_positions]
    destinations = [[p["lon"], p["lat"]] for p in pickup_positions]
    locations    = sources + destinations
    source_indices      = list(range(len(sources)))
    destination_indices = list(range(len(sources), len(locations)))

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                "https://api.openrouteservice.org/v2/matrix/driving-hgv",
                headers={
                    "Authorization": settings.ORS_API_KEY,
                    "Content-Type":  "application/json",
                },
                json={
                    "locations":    locations,
                    "sources":      source_indices,
                    "destinations": destination_indices,
                    "metrics":      ["distance"],   # distance in meters
                    "units":        "km",
                }
            )

        if response.status_code != 200:
            print(f"ORS Matrix failed: {response.status_code} {response.text[:200]}")
            return None

        data = response.json()
        # distances[i][j] = km from driver i to pickup j
        distances = data.get("distances")
        if not distances:
            return None

        print(f"✅ ORS Matrix: {len(driver_positions)} drivers × "
              f"{len(pickup_positions)} pickups")
        return distances

    except Exception as e:
        print(f"ORS Matrix error: {e}")
        return None


# ─────────────────────────────────────────────
#  Main optimization function (now async)
# ─────────────────────────────────────────────

async def optimize_assignments(
    drivers: List[Dict[str, Any]],
    loads:   List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Assign loads to drivers to minimize empty mileage.
    Uses ORS Matrix API for real road distances when available,
    falls back to Haversine straight-line if ORS fails.
    """

    if not drivers or not loads:
        return []

    # ── Build position lists for ORS Matrix call ──────────────────
    driver_positions = [
        {"lon": d["position_lon"], "lat": d["position_lat"],
         "driver_id": d["driver_id"]}
        for d in drivers
    ]

    # Filter loads with valid coordinates
    valid_loads = [
        l for l in loads
        if l.get("coordEnlev", {}).get("coordinates", [0, 0]) != [0, 0]
    ]
    if not valid_loads:
        return []

    pickup_positions = []
    for l in valid_loads:
        coords = l["coordEnlev"]["coordinates"]
        pickup_positions.append({
            "lon": coords[0],
            "lat": coords[1],
            "load_id": str(l["_id"])
        })

    # ── Fetch ORS distance matrix ─────────────────────────────────
    distance_matrix = await fetch_ors_distance_matrix(
        driver_positions, pickup_positions
    )

    using_ors = distance_matrix is not None
    if not using_ors:
        print("⚠️  ORS unavailable — falling back to Haversine distances")

    # ── Greedy nearest-neighbor assignment ────────────────────────
    assignments         = []
    assigned_driver_ids = set()
    assigned_load_ids   = set()

    sorted_loads = sorted(valid_loads, key=lambda l: l.get("createdAt", ""))

    for load_idx, load in enumerate(sorted_loads):
        load_id      = str(load.get("_id", ""))
        poids_kg     = load.get("poidsKg", 0)
        prix         = load.get("prixPropose", 0)
        adress_enlev = load.get("adressEnlev", "")
        adress_livr  = load.get("adressLivr", "")

        coord_enlev  = load["coordEnlev"]["coordinates"]
        pickup_lon, pickup_lat = coord_enlev[0], coord_enlev[1]

        coord_livr   = load.get("coordLivr", {}).get("coordinates", [0, 0])
        dropoff_lon, dropoff_lat = coord_livr[0], coord_livr[1]

        best_driver    = None
        best_empty_km  = float("inf")
        best_trip_info = None

        for driver_idx, driver in enumerate(drivers):
            if driver["driver_id"] in assigned_driver_ids:
                continue
            if driver["vehicle_capacity_kg"] < poids_kg:
                continue

            # Use ORS road distance if available, else Haversine
            if using_ors and distance_matrix:
                raw = distance_matrix[driver_idx][load_idx]
                # ORS returns null for unreachable points
                empty_km = float(raw) if raw is not None else haversine_km(
                    driver["position_lat"], driver["position_lon"],
                    pickup_lat, pickup_lon
                )
            else:
                empty_km = haversine_km(
                    driver["position_lat"], driver["position_lon"],
                    pickup_lat, pickup_lon
                )

            if empty_km < best_empty_km:
                best_empty_km  = empty_km
                best_driver    = driver
                best_trip_info = estimate_trip_km(
                    driver["position_lat"], driver["position_lon"],
                    pickup_lat, pickup_lon,
                    dropoff_lat, dropoff_lon,
                    empty_km_override=empty_km
                )

        if best_driver and best_trip_info:
            assigned_driver_ids.add(best_driver["driver_id"])
            assigned_load_ids.add(load_id)

            assignments.append({
                "load_id":        load_id,
                "driver_id":      best_driver["driver_id"],
                "vehicle_id":     best_driver["vehicle_id"],
                "driver_name":    best_driver["driver_name"],
                "adress_enlev":   adress_enlev,
                "adress_livr":    adress_livr,
                "poids_kg":       poids_kg,
                "prix_da":        prix,
                "empty_km":       best_trip_info["empty_km"],
                "loaded_km":      best_trip_info["loaded_km"],
                "total_km":       best_trip_info["total_km"],
                "efficiency_pct": best_trip_info["efficiency_pct"],
                "eta_pickup_min": round((best_trip_info["empty_km"] / 70) * 60),
                "distance_source": "ORS" if using_ors else "Haversine",
            })

    # ── Fleet summary ─────────────────────────────────────────────
    total_empty_km  = sum(a["empty_km"]  for a in assignments)
    total_loaded_km = sum(a["loaded_km"] for a in assignments)
    total           = total_empty_km + total_loaded_km
    overall_eff     = round((total_loaded_km / total) * 100, 1) if total > 0 else 0

    for a in assignments:
        a["fleet_summary"] = {
            "total_assignments":      len(assignments),
            "total_empty_km":         round(total_empty_km, 1),
            "total_loaded_km":        round(total_loaded_km, 1),
            "overall_efficiency_pct": overall_eff,
            "distance_source":        "ORS" if using_ors else "Haversine",
        }

    return assignments