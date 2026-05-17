"""
app/services/optimization.py
─────────────────────────────
Fleet optimization engine using the Vehicle Routing Problem (VRP) approach.

BUSINESS PROBLEM:
  A fleet owner has N trucks at different positions across Algeria.
  There are M loads available at different pickup locations.
  Goal: assign loads to trucks to minimize total empty mileage
  (the distance a truck drives WITHOUT cargo = deadhead miles).

ALGORITHM: Greedy Nearest-Neighbor with Capacity Constraints
─────────────────────────────────────────────────────────────
This is a classical heuristic for VRP. It works as follows:

  1. Sort loads by creation time (oldest = most urgent)
  2. For each load:
       a. Find all available drivers (not yet assigned this round)
       b. Filter by capacity: vehicle_capacity >= load_weight
       c. Calculate distance from each driver's current position
          to the load's pickup point (using Haversine formula)
       d. Assign the load to the CLOSEST eligible driver
          (minimizes empty mileage = deadhead reduction)
       e. Mark that driver as busy (can't take another load)
  3. Return the full assignment plan with savings estimates

WHY THIS WORKS:
  By always picking the closest driver, we minimize the distance
  trucks travel empty. In logistics, empty mileage = pure cost.
  A 10% reduction in empty mileage = 10% fuel savings.

MATHEMATICAL MODEL:
  minimize Σ d(truck_i_position, load_j_pickup)
  subject to: vehicle_capacity_i >= load_weight_j
              each truck assigned at most 1 load per round
              each load assigned at most 1 truck

  This is a bipartite matching problem. The greedy approach
  gives a good approximation in O(N×M) time.

FUTURE IMPROVEMENTS (for production scale):
  - Hungarian algorithm for optimal bipartite matching O(N³)
  - Time window constraints (load must be picked up by X time)
  - Multi-load routes (one truck takes 2 loads sequentially)
  - OR-Tools library for exact VRP solving
"""

import math
from typing import List, Dict, Any


# ─────────────────────────────────────────────
#  Haversine Distance
#  Calculates straight-line distance between two GPS points in km.
#  This is the "as the crow flies" distance, not road distance.
#  For road distance we'd need ORS API, but for optimization
#  purposes the straight-line is a good enough approximation.
# ─────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance in kilometers between two GPS coordinates.
    Uses the Haversine formula which accounts for Earth's curvature.
    """
    R = 6371  # Earth radius in km

    # Convert degrees to radians
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = (math.sin(dphi / 2) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return round(R * c, 2)


# ─────────────────────────────────────────────
#  Trip distance estimate
#  Total km a driver would travel for a given load:
#    empty_leg = driver_position → pickup
#    loaded_leg = pickup → dropoff
# ─────────────────────────────────────────────

def estimate_trip_km(
    driver_lat: float, driver_lon: float,
    pickup_lat: float, pickup_lon: float,
    dropoff_lat: float, dropoff_lon: float
) -> Dict[str, float]:
    empty_leg = haversine_km(driver_lat, driver_lon, pickup_lat, pickup_lon)
    loaded_leg = haversine_km(pickup_lat, pickup_lon, dropoff_lat, dropoff_lon)
    return {
        "empty_km": empty_leg,       # Deadhead distance (cost without revenue)
        "loaded_km": loaded_leg,     # Revenue-generating distance
        "total_km": round(empty_leg + loaded_leg, 2),
        "efficiency_pct": round((loaded_leg / (empty_leg + loaded_leg)) * 100, 1)
        if (empty_leg + loaded_leg) > 0 else 0
        # efficiency = % of trip that is revenue-generating
        # Higher = better (100% = no empty mileage)
    }


# ─────────────────────────────────────────────
#  Main optimization function
# ─────────────────────────────────────────────

def optimize_assignments(
    drivers: List[Dict[str, Any]],
    loads: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Assign loads to drivers optimally to minimize empty mileage.

    Args:
        drivers: list of dicts with keys:
            driver_id, driver_name, vehicle_id,
            vehicle_capacity_kg, position_lon, position_lat

        loads: list of MongoDB load documents with:
            _id, poidsKg, coordEnlev, coordLivr,
            adressEnlev, adressLivr, prixPropose

    Returns:
        List of assignment dicts with full details for the frontend
    """

    assignments = []
    assigned_driver_ids = set()   # Track which drivers are taken
    assigned_load_ids   = set()   # Track which loads are taken

    # Sort loads: oldest first (most urgent)
    sorted_loads = sorted(loads, key=lambda l: l.get("createdAt", ""))

    for load in sorted_loads:
        load_id     = str(load.get("_id", ""))
        poids_kg    = load.get("poidsKg", 0)
        prix        = load.get("prixPropose", 0)
        adress_enlev = load.get("adressEnlev", "")
        adress_livr  = load.get("adressLivr", "")

        # Extract pickup coordinates [lon, lat]
        coord_enlev = load.get("coordEnlev", {}).get("coordinates", [0, 0])
        pickup_lon, pickup_lat = coord_enlev[0], coord_enlev[1]

        # Extract dropoff coordinates
        coord_livr = load.get("coordLivr", {}).get("coordinates", [0, 0])
        dropoff_lon, dropoff_lat = coord_livr[0], coord_livr[1]

        # Skip loads with no real coordinates (both zero = not set)
        if pickup_lat == 0 and pickup_lon == 0:
            continue

        best_driver = None
        best_empty_km = float("inf")
        best_trip_info = None

        # Find the best driver for this load
        for driver in drivers:
            # Skip already assigned drivers
            if driver["driver_id"] in assigned_driver_ids:
                continue

            # Skip if vehicle capacity is insufficient
            if driver["vehicle_capacity_kg"] < poids_kg:
                continue

            driver_lat = driver["position_lat"]
            driver_lon = driver["position_lon"]

            # Calculate empty mileage (driver → pickup)
            empty_km = haversine_km(
                driver_lat, driver_lon,
                pickup_lat, pickup_lon
            )

            # This driver is better if they're closer to pickup
            if empty_km < best_empty_km:
                best_empty_km = empty_km
                best_driver = driver
                best_trip_info = estimate_trip_km(
                    driver_lat, driver_lon,
                    pickup_lat, pickup_lon,
                    dropoff_lat, dropoff_lon
                )

        # If we found a suitable driver → assign
        if best_driver and best_trip_info:
            assigned_driver_ids.add(best_driver["driver_id"])
            assigned_load_ids.add(load_id)

            assignments.append({
                # IDs for the frontend to execute the assignment
                "load_id":    load_id,
                "driver_id":  best_driver["driver_id"],
                "vehicle_id": best_driver["vehicle_id"],

                # Human-readable info
                "driver_name":  best_driver["driver_name"],
                "adress_enlev": adress_enlev,
                "adress_livr":  adress_livr,
                "poids_kg":     poids_kg,
                "prix_da":      prix,

                # Distance metrics
                "empty_km":       best_trip_info["empty_km"],
                "loaded_km":      best_trip_info["loaded_km"],
                "total_km":       best_trip_info["total_km"],
                "efficiency_pct": best_trip_info["efficiency_pct"],

                # Estimated time (assuming average 70 km/h for trucks in Algeria)
                "eta_pickup_min": round((best_trip_info["empty_km"] / 70) * 60),
            })

    # Calculate total empty mileage saved vs random assignment
    # (compared to worst case: furthest driver takes each load)
    total_empty_km = sum(a["empty_km"] for a in assignments)
    total_loaded_km = sum(a["loaded_km"] for a in assignments)
    overall_efficiency = round(
        (total_loaded_km / (total_empty_km + total_loaded_km)) * 100, 1
    ) if (total_empty_km + total_loaded_km) > 0 else 0

    # Add summary to each assignment for display
    for a in assignments:
        a["fleet_summary"] = {
            "total_assignments": len(assignments),
            "total_empty_km": round(total_empty_km, 1),
            "total_loaded_km": round(total_loaded_km, 1),
            "overall_efficiency_pct": overall_efficiency,
        }

    return assignments