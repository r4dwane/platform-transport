"""
app/services/optimization.pyFleet optimization engine using ORS Matrix API for real road distances.
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
    empty_km_override: Optional[float] = None,
    loaded_km_override: Optional[float] = None,   # ← NEW
) -> Dict[str, float]:
    empty_leg  = empty_km_override if empty_km_override is not None \
                 else haversine_km(driver_lat, driver_lon, pickup_lat, pickup_lon)
    # Use ORS road distance for loaded leg when available, else Haversine
    loaded_leg = loaded_km_override if loaded_km_override is not None \
                 else haversine_km(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
    total      = round(empty_leg + loaded_leg, 2)
    return {
        "empty_km":       empty_leg,
        "loaded_km":      loaded_leg,
        "total_km":       total,
        "efficiency_pct": round((loaded_leg / total) * 100, 1) if total > 0 else 0,
    }


# ─────────────────────────────────────────────
#  ORS Matrix API
#  One call returns ALL pairwise distances
# ─────────────────────────────────────────────

async def fetch_ors_distance_matrix(
    driver_positions: List[Dict],   # [{lon, lat, driver_id}, ...]
    pickup_positions: List[Dict],   # [{lon, lat, load_id}, ...]
    dropoff_positions: List[Dict],  # ← NEW [{lon, lat, load_id}, ...]
) -> Optional[Dict]:
    """
    Returns:
      {
        "driver_to_pickup":  matrix[i][j] = road km, driver i → pickup j
        "pickup_to_dropoff": matrix[j]    = road km, pickup j → dropoff j
      }
    Returns None if ORS fails.

    We use TWO ORS Matrix calls:
      Call 1: sources=drivers,  destinations=pickups  → empty leg matrix
      Call 2: sources=pickups,  destinations=dropoffs → loaded leg per load
               (diagonal only matters: pickup[j] → dropoff[j])
    """
    if not settings.ORS_API_KEY:
        return None
    if not driver_positions or not pickup_positions or not dropoff_positions:
        return None

    async def call_matrix(sources_ll, destinations_ll):
        locations    = sources_ll + destinations_ll
        src_idx      = list(range(len(sources_ll)))
        dst_idx      = list(range(len(sources_ll), len(locations)))
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    "https://api.openrouteservice.org/v2/matrix/driving-hgv",
                    headers={
                        "Authorization": settings.ORS_API_KEY,
                        "Content-Type":  "application/json",
                    },
                    json={
                        "locations":    locations,
                        "sources":      src_idx,
                        "destinations": dst_idx,
                        "metrics":      ["distance"],
                        "units":        "km",
                    }
                )
            if resp.status_code != 200:
                print(f"ORS Matrix failed: {resp.status_code} {resp.text[:200]}")
                return None
            return resp.json().get("distances")
        except Exception as e:
            print(f"ORS Matrix error: {e}")
            return None

    sources_ll      = [[d["lon"], d["lat"]] for d in driver_positions]
    pickups_ll      = [[p["lon"], p["lat"]] for p in pickup_positions]
    dropoffs_ll     = [[d["lon"], d["lat"]] for d in dropoff_positions]

    # Call 1: driver → pickup (empty leg matrix)
    driver_to_pickup = await call_matrix(sources_ll, pickups_ll)
    if driver_to_pickup is None:
        return None

    # Call 2: pickup → dropoff (loaded leg per load)
    # Each pickup[j] paired with its own dropoff[j]
    # Matrix is NxN but we only need the diagonal pickup[j]→dropoff[j]
    pickup_to_dropoff_matrix = await call_matrix(pickups_ll, dropoffs_ll)
    if pickup_to_dropoff_matrix is None:
        # ORS worked for empty leg but not loaded — use Haversine for loaded
        print("⚠️  ORS loaded-leg matrix failed — using Haversine for loaded leg")
        pickup_to_dropoff = None
    else:
        # Extract diagonal: pickup[j] → dropoff[j]
        pickup_to_dropoff = [
            pickup_to_dropoff_matrix[j][j]
            for j in range(len(pickup_positions))
        ]

    print(
        f"✅ ORS Matrix: {len(driver_positions)} drivers × "
        f"{len(pickup_positions)} loads "
        f"({'full ORS' if pickup_to_dropoff else 'empty ORS + loaded Haversine'})"
    )

    return {
        "driver_to_pickup":  driver_to_pickup,
        "pickup_to_dropoff": pickup_to_dropoff,  # list[float] or None
    }


# ─────────────────────────────────────────────
#  Main optimization function (async)
# ─────────────────────────────────────────────

async def optimize_assignments(
    drivers: List[Dict[str, Any]],
    loads:   List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Assign loads to drivers to minimize empty mileage.
    Uses ORS Matrix API for real road distances (both legs) when available,
    falls back to Haversine if ORS fails.
    """

    if not drivers or not loads:
        return []

    # ── Build position lists ──────────────────────────────────────
    driver_positions = [
        {"lon": d["position_lon"], "lat": d["position_lat"],
         "driver_id": d["driver_id"]}
        for d in drivers
    ]

    valid_loads = [
        l for l in loads
        if l.get("coordEnlev", {}).get("coordinates", [0, 0]) != [0, 0]
    ]
    if not valid_loads:
        return []

    pickup_positions = []
    dropoff_positions = []                           # ← NEW
    for l in valid_loads:
        enlev_coords = l["coordEnlev"]["coordinates"]
        pickup_positions.append({
            "lon": enlev_coords[0],
            "lat": enlev_coords[1],
            "load_id": str(l["_id"])
        })
        # ← NEW: collect dropoff for loaded leg matrix
        livr_coords = l.get("coordLivr", {}).get("coordinates", [0, 0])
        dropoff_positions.append({
            "lon": livr_coords[0],
            "lat": livr_coords[1],
            "load_id": str(l["_id"])
        })

    # ── Fetch ORS distance matrices ───────────────────────────────
    ors_result = await fetch_ors_distance_matrix(
        driver_positions, pickup_positions, dropoff_positions   # ← NEW arg
    )

    using_ors = ors_result is not None
    if not using_ors:
        print("⚠️  ORS unavailable — falling back to Haversine for all distances")

    driver_to_pickup_matrix = ors_result["driver_to_pickup"]  if using_ors else None
    pickup_to_dropoff_list  = ors_result["pickup_to_dropoff"] if using_ors else None

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

        coord_enlev          = load["coordEnlev"]["coordinates"]
        pickup_lon, pickup_lat = coord_enlev[0], coord_enlev[1]

        coord_livr             = load.get("coordLivr", {}).get("coordinates", [0, 0])
        dropoff_lon, dropoff_lat = coord_livr[0], coord_livr[1]

        # Loaded leg distance for this load (same for all drivers)
        if pickup_to_dropoff_list is not None:
            raw_loaded = pickup_to_dropoff_list[load_idx]
            loaded_km_override = float(raw_loaded) if raw_loaded is not None \
                                 else haversine_km(pickup_lat, pickup_lon,
                                                   dropoff_lat, dropoff_lon)
        else:
            loaded_km_override = None   # estimate_trip_km will use Haversine

        best_driver    = None
        best_empty_km  = float("inf")
        best_trip_info = None

        for driver_idx, driver in enumerate(drivers):
            if driver["driver_id"] in assigned_driver_ids:
                continue
            if driver["vehicle_capacity_kg"] < poids_kg:
                continue

            # Empty leg distance
            if using_ors and driver_to_pickup_matrix:
                raw = driver_to_pickup_matrix[driver_idx][load_idx]
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
                    empty_km_override=empty_km,
                    loaded_km_override=loaded_km_override,  # ← NEW
                )

        if best_driver and best_trip_info:
            assigned_driver_ids.add(best_driver["driver_id"])
            assigned_load_ids.add(load_id)

            assignments.append({
                "load_id":         load_id,
                "driver_id":       best_driver["driver_id"],
                "vehicle_id":      best_driver["vehicle_id"],
                "driver_name":     best_driver["driver_name"],
                "adress_enlev":    adress_enlev,
                "adress_livr":     adress_livr,
                "poids_kg":        poids_kg,
                "prix_da":         prix,
                "empty_km":        best_trip_info["empty_km"],
                "loaded_km":       best_trip_info["loaded_km"],
                "total_km":        best_trip_info["total_km"],
                "efficiency_pct":  best_trip_info["efficiency_pct"],
                "eta_pickup_min":  round((best_trip_info["empty_km"] / 70) * 60),
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