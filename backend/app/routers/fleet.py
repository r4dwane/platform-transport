from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.database import db
from app.dependencies import require_role
from app.models.user import RoleUtilisateur

router = APIRouter(prefix="/api/v1/fleet", tags=["Gestion de Flotte"])

FLEET_OWNER = RoleUtilisateur.PROP_FLOTTE


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/drivers  — Fleet owner lists their drivers
# ─────────────────────────────────────────────

@router.get(
    "/drivers",
    summary="Lister les chauffeurs de ma flotte"
)
async def list_fleet_drivers(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    cursor = db["users"].find({
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": current_user["_id"]
    })
    drivers = await cursor.to_list(length=100)
    for d in drivers:
        d.pop("motDePasse", None)
        d["id"] = d.pop("_id")
    return {"chauffeurs": drivers}


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/drivers/{driver_id}  — Get a specific driver's profile + stats
# ─────────────────────────────────────────────

@router.get(
    "/drivers/{driver_id}",
    summary="Profil d'un chauffeur de ma flotte"
)
async def get_fleet_driver(
    driver_id: str,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    driver = await db["users"].find_one({
        "_id": driver_id,
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": current_user["_id"]
    })
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chauffeur introuvable dans votre flotte.")

    driver.pop("motDePasse", None)
    driver["id"] = driver.pop("_id")

    # Count completed trips
    completed_trips = await db["trajets"].count_documents({
        "chauffeurId": driver["id"],
        "status": "LIVRE"
    })
    driver["trajets_completes"] = completed_trips
    return driver


# ─────────────────────────────────────────────
#  DELETE /api/v1/fleet/drivers/{driver_id}  — Remove driver from fleet
# ─────────────────────────────────────────────

@router.delete(
    "/drivers/{driver_id}",
    summary="Retirer un chauffeur de la flotte"
)
async def remove_fleet_driver(
    driver_id: str,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    driver = await db["users"].find_one({
        "_id": driver_id,
        "employeurId": current_user["_id"]
    })
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chauffeur introuvable dans votre flotte.")

    # Demote to independent driver and clear employer link
    await db["users"].update_one(
        {"_id": driver_id},
        {"$set": {
            "role": RoleUtilisateur.CHAUFFEUR_IND.value,
            "employeurId": None
        }}
    )
    return {"message": "Chauffeur retiré de la flotte. Son compte reste actif en tant que chauffeur indépendant."}


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/vehicles  — Fleet owner lists all their vehicles
# ─────────────────────────────────────────────

@router.get(
    "/vehicles",
    summary="Véhicules de la flotte"
)
async def list_fleet_vehicles(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    cursor = db["vehicules"].find({"proprietaireId": current_user["_id"]})
    vehicles = await cursor.to_list(length=100)
    for v in vehicles:
        v["id"] = v.pop("_id")
    return {"vehicules": vehicles}


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/trips  — Fleet owner sees all trips by their drivers
# ─────────────────────────────────────────────

@router.get(
    "/trips",
    summary="Tous les trajets de la flotte"
)
async def list_fleet_trips(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    # Get all driver IDs in this fleet
    cursor = db["users"].find({
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": current_user["_id"]
    }, {"_id": 1})
    drivers = await cursor.to_list(length=200)
    driver_ids = [d["_id"] for d in drivers]

    if not driver_ids:
        return {"trajets": []}

    cursor = db["trajets"].find(
        {"chauffeurId": {"$in": driver_ids}}
    ).sort("createdAt", -1)
    trips = await cursor.to_list(length=200)
    for t in trips:
        t["id"] = t.pop("_id")
    return {"trajets": trips}


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/stats  — Fleet owner dashboard summary
# ─────────────────────────────────────────────

@router.get(
    "/stats",
    summary="Statistiques de la flotte"
)
async def fleet_stats(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    owner_id = current_user["_id"]

    nb_drivers = await db["users"].count_documents({
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": owner_id
    })
    nb_vehicles = await db["vehicules"].count_documents({"proprietaireId": owner_id})
    nb_vehicles_available = await db["vehicules"].count_documents({
        "proprietaireId": owner_id,
        "status": "DISPONIBLE"
    })

    # Trips by fleet drivers
    driver_cursor = db["users"].find({
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": owner_id
    }, {"_id": 1})
    drivers = await driver_cursor.to_list(length=200)
    driver_ids = [d["_id"] for d in drivers]

    nb_trips_total = await db["trajets"].count_documents({"chauffeurId": {"$in": driver_ids}}) if driver_ids else 0
    nb_trips_active = await db["trajets"].count_documents({
        "chauffeurId": {"$in": driver_ids},
        "status": {"$in": ["EN_ROUTE_RAMASSAGE", "CHARGEMENT", "EN_ROUTE_LIVRAISON"]}
    }) if driver_ids else 0

    return {
        "nb_chauffeurs": nb_drivers,
        "nb_vehicules_total": nb_vehicles,
        "nb_vehicules_disponibles": nb_vehicles_available,
        "nb_trajets_total": nb_trips_total,
        "nb_trajets_en_cours": nb_trips_active,
    }
