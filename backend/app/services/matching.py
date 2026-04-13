"""
matching.py
-----------
Core business logic : find the best available drivers/vehicles for a given load.

Flow:
    1. Client posts a load  →  POST /loads
    2. System (or client) calls get_matching_drivers(load) to get candidates
    3. Candidates are ranked by distance then by driver rating
    4. Results are returned to the client so they can browse offers
       OR drivers near the pickup are notified automatically (push flow).

MongoDB requirement:
    The `vehicules` collection needs a 2dsphere index on the `position` field.
    Run once in MongoDB shell or on startup:
        db.vehicules.createIndex({ position: "2dsphere" })
"""

from typing import List, Optional
from app.database import db
from app.models.load import ChargeModel, TypeMarchandise
from app.models.vehicul import TypeVehicule


# ─────────────────────────────────────────────
#  Merchandise → compatible vehicle types
# ─────────────────────────────────────────────

COMPATIBILITY: dict[TypeMarchandise, List[TypeVehicule]] = {
    TypeMarchandise.GENERAL:     [TypeVehicule.MARAICHER, TypeVehicule.FRIGORIFIQUE],
    TypeMarchandise.PERISSABLE:  [TypeVehicule.FRIGORIFIQUE],
    TypeMarchandise.DANGEREUX:   [TypeVehicule.CITERNE, TypeVehicule.MARAICHER],
    TypeMarchandise.FRAGILE:     [TypeVehicule.MARAICHER, TypeVehicule.FRIGORIFIQUE],
    TypeMarchandise.VOLUMINEUX:  [TypeVehicule.MARAICHER],
    TypeMarchandise.LIQUIDE:     [TypeVehicule.CITERNE],
}


# ─────────────────────────────────────────────
#  Main matching function
# ─────────────────────────────────────────────

async def get_matching_drivers(
    load: dict,
    radius_km: float = 50.0,
    limit: int = 20
) -> List[dict]:
    """
    Find available vehicles near the load's pickup point that:
      - Are within `radius_km` of the pickup
      - Have sufficient capacity (kg)
      - Are of a compatible type for the merchandise
      - Are currently DISPONIBLE

    Returns a list of candidates enriched with driver info, sorted by
    distance (closest first) then driver rating (highest first).
    """

    pickup_coords = load["coordEnlev"]["coordinates"]  # [longitude, latitude]
    poids         = load["poidsKg"]
    type_marchand = load["typeMarchandises"]

    compatible_types = [t.value for t in COMPATIBILITY.get(type_marchand, list(TypeVehicule))]

    # ── MongoDB $nearSphere geospatial query ──────────────────────────────
    # Requires a 2dsphere index on vehicules.position
    geo_query = {
        "position": {
            "$nearSphere": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": pickup_coords
                },
                "$maxDistance": int(radius_km * 1000)  # metres
            }
        },
        "capaciteKg": {"$gte": poids},
        "type":       {"$in": compatible_types},
        "status":     "DISPONIBLE"
    }

    cursor   = db["vehicules"].find(geo_query).limit(limit)
    vehicles = await cursor.to_list(length=limit)

    if not vehicles:
        return []

    # ── Enrich with driver info ───────────────────────────────────────────
    driver_ids = list({v["proprietaireId"] for v in vehicles})
    driver_cursor = db["users"].find(
        {"_id": {"$in": driver_ids}},
        {"motDePasse": 0}           # never return hashed password
    )
    drivers_list = await driver_cursor.to_list(length=len(driver_ids))
    drivers_map  = {d["_id"]: d for d in drivers_list}

    candidates = []
    for vehicle in vehicles:
        driver = drivers_map.get(vehicle["proprietaireId"])
        if not driver:
            continue

        candidates.append({
            "vehicule_id":   vehicle["_id"],
            "vehicule_type": vehicle["type"],
            "capacite_kg":   vehicle["capaciteKg"],
            "position":      vehicle["position"],
            "driver_id":     driver["_id"],
            "driver_name":   driver.get("nom"),
            "driver_note":   driver.get("note", 0.0),
            "driver_verifie": driver.get("estVerifie", False),
        })

    # ── Sort : verified first, then by rating descending ─────────────────
    candidates.sort(key=lambda c: (not c["driver_verifie"], -c["driver_note"]))

    return candidates


# ─────────────────────────────────────────────
#  Ensure geospatial index exists
# ─────────────────────────────────────────────

async def ensure_geo_index():
    """
    Call this once on app startup (from main.py) to guarantee
    the 2dsphere index exists on vehicules.position.
    """
    await db["vehicules"].create_index([("position", "2dsphere")])
    print("✅  2dsphere index on vehicules.position ensured.")