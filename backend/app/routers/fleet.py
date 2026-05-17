from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from bson import ObjectId

from app.database import db
from app.dependencies import require_role
from app.models.user import RoleUtilisateur
from app.models.trip import StatutTrajet
from app.models.load import StatutCharge
from app.models.payment import MethodePaiement
from app.models.vehicul import VehiculeModel, TypeVehicule

router = APIRouter(prefix="/api/v1/fleet", tags=["Gestion de Flotte"])

FLEET_OWNER = RoleUtilisateur.PROP_FLOTTE


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/drivers
# ─────────────────────────────────────────────

@router.get("/drivers", summary="Lister les chauffeurs de ma flotte")
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
#  GET /api/v1/fleet/drivers/{driver_id}
# ─────────────────────────────────────────────

@router.get("/drivers/{driver_id}", summary="Profil d'un chauffeur de ma flotte")
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
        raise HTTPException(status_code=404, detail="Chauffeur introuvable dans votre flotte.")

    driver.pop("motDePasse", None)
    driver["id"] = driver.pop("_id")
    completed_trips = await db["trajets"].count_documents({
        "chauffeurId": driver["id"], "status": "LIVRE"
    })
    driver["trajets_completes"] = completed_trips
    return driver


# ─────────────────────────────────────────────
#  DELETE /api/v1/fleet/drivers/{driver_id}
# ─────────────────────────────────────────────

@router.delete("/drivers/{driver_id}", summary="Retirer un chauffeur de la flotte")
async def remove_fleet_driver(
    driver_id: str,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    driver = await db["users"].find_one({
        "_id": driver_id,
        "employeurId": current_user["_id"]
    })
    if not driver:
        raise HTTPException(status_code=404, detail="Chauffeur introuvable dans votre flotte.")

    await db["users"].update_one(
        {"_id": driver_id},
        {"$set": {
            "role": RoleUtilisateur.CHAUFFEUR_IND.value,
            "employeurId": None
        }}
    )
    return {"message": "Chauffeur retiré de la flotte."}


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/vehicles
# ─────────────────────────────────────────────

@router.get("/vehicles", summary="Véhicules de la flotte")
async def list_fleet_vehicles(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    cursor = db["vehicules"].find({"proprietaireId": current_user["_id"]})
    vehicles = await cursor.to_list(length=100)
    for v in vehicles:
        v["id"] = v.pop("_id")
    return {"vehicules": vehicles}


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/trips
# ─────────────────────────────────────────────

@router.get("/trips", summary="Tous les trajets de la flotte")
async def list_fleet_trips(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
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
#  GET /api/v1/fleet/stats
# ─────────────────────────────────────────────

@router.get("/stats", summary="Statistiques de la flotte")
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
        "proprietaireId": owner_id, "status": "DISPONIBLE"
    })

    driver_cursor = db["users"].find({
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": owner_id
    }, {"_id": 1})
    drivers = await driver_cursor.to_list(length=200)
    driver_ids = [d["_id"] for d in drivers]

    nb_trips_total = await db["trajets"].count_documents(
        {"chauffeurId": {"$in": driver_ids}}
    ) if driver_ids else 0

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


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/available-loads
#  Loads that the fleet owner can assign to their drivers
# ─────────────────────────────────────────────

@router.get("/available-loads", summary="Charges disponibles pour assignation")
async def get_available_loads(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    cursor = db["charges"].find(
        {"status": StatutCharge.DISPONIBLE, "marche" : "FLOTTE"}
    ).sort("createdAt", -1).limit(50)
    loads = await cursor.to_list(length=50)

    for l in loads:
        l["id"] = l.pop("_id")
    return {"charges": loads}


# ─────────────────────────────────────────────
#  POST /api/v1/fleet/assign
#
#  The core "transmettre la mission" feature.
#  Fleet owner directly assigns a load to a specific driver,
#  bypassing the offer system entirely.
#
#  Validations:
#    - Load must be DISPONIBLE
#    - Driver must belong to this fleet
#    - Driver must not already be on an active trip
#    - Vehicle must belong to fleet owner and be DISPONIBLE
#    - Vehicle capacity must be >= load weight
# ─────────────────────────────────────────────

class AssignMissionRequest(BaseModel):
    load_id: str = Field(..., description="ID de la charge à assigner")
    driver_id: str = Field(..., description="ID du chauffeur")
    vehicle_id: str = Field(..., description="ID du véhicule")
    methode_paiement: MethodePaiement = Field(default=MethodePaiement.CASH)


@router.post(
    "/assign",
    status_code=status.HTTP_201_CREATED,
    summary="Assigner une charge directement à un chauffeur"
)
async def assign_mission(
    payload: AssignMissionRequest,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    owner_id = current_user["_id"]

    # 1. Verify load exists and is available
    load = await db["charges"].find_one({"_id": payload.load_id})
    if not load:
        raise HTTPException(status_code=404, detail="Charge introuvable.")
    if load["status"] != StatutCharge.DISPONIBLE:
        raise HTTPException(status_code=400, detail="Cette charge n'est plus disponible.")

    # 2. Verify driver belongs to this fleet
    driver = await db["users"].find_one({
        "_id": payload.driver_id,
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": owner_id
    })
    if not driver:
        raise HTTPException(status_code=404, detail="Ce chauffeur n'appartient pas à votre flotte.")

    # 3. Verify driver is not already on an active trip
    active_trip = await db["trajets"].find_one({
        "chauffeurId": payload.driver_id,
        "status": {"$in": [
            StatutTrajet.PLANIFIE,
            StatutTrajet.EN_ROUTE_RAMASSAGE,
            StatutTrajet.CHARGEMENT,
            StatutTrajet.EN_ROUTE_LIVRAISON
        ]}
    })
    if active_trip:
        raise HTTPException(
            status_code=400,
            detail=f"{driver['nom']} est déjà en mission active."
        )

    # 4. Verify vehicle belongs to fleet and is available
    vehicle = await db["vehicules"].find_one({
        "_id": payload.vehicle_id,
        "proprietaireId": owner_id
    })
    if not vehicle:
        raise HTTPException(status_code=404, detail="Ce véhicule n'appartient pas à votre flotte.")
    if vehicle["status"] != "DISPONIBLE":
        raise HTTPException(status_code=400, detail="Ce véhicule n'est pas disponible.")
    
    if vehicle.get("assignedDriverId") != payload.driver_id:
        raise HTTPException(
            status_code=400,
            detail="Ce véhicule n'est pas assigné à ce chauffeur."
        )

    # 5. Check vehicle capacity
    if vehicle["capaciteKg"] < load["poidsKg"]:
        raise HTTPException(
            status_code=400,
            detail=f"Capacité insuffisante: véhicule {vehicle['capaciteKg']}kg < charge {load['poidsKg']}kg."
        )

    # 6. Create the trip
    trip_id = str(ObjectId())
    trip_doc = {
        "_id": trip_id,
        "chargeId": payload.load_id,
        "chauffeurId": payload.driver_id,
        "vehiculeId": payload.vehicle_id,
        "clientId": load["clientId"],
        "assignedByFleet": True,
        "fleetOwnerId": owner_id,
        "status": StatutTrajet.PLANIFIE,
        "tracking": [],
        "debutAt": None,
        "finAt": None,
        "infoPaiement": {
            "montant": load["prixPropose"],
            "methode": payload.methode_paiement,
            "status": "A_PAYER",
            "transactionId": None,
            "createdAt": datetime.utcnow()
        },
        "proofOfDelivery": None,
        "createdAt": datetime.utcnow()
    }
    await db["trajets"].insert_one(trip_doc)

    # 7. Update load status → RESERVEE
    await db["charges"].update_one(
        {"_id": payload.load_id},
        {"$set": {"status": StatutCharge.RESERVEE}}
    )

    # 8. Update vehicle status → EN_MISSION
    await db["vehicules"].update_one(
        {"_id": payload.vehicle_id},
        {"$set": {"status": "EN_MISSION"}}
    )

    return {
        "message": "Mission assignée avec succès.",
        "trajet_id": trip_id,
        "chauffeur": driver.get("nom"),
        "vehicule": vehicle.get("plaqueImmatriculation")
    }


# ─────────────────────────────────────────────
#  POST /api/v1/fleet/optimize
#
#  VRP (Vehicle Routing Problem) optimization engine.
#  Assigns available loads to available drivers to minimize
#  total empty mileage using a greedy nearest-neighbor algorithm
#  with capacity constraints.
#
#  Algorithm:
#    For each available load (sorted by urgency/creation time):
#      1. Find all drivers not on active trips
#      2. Filter by vehicle capacity >= load weight
#      3. Score each driver: score = distance(driver_pos → pickup)
#         (lower = better — minimizes deadhead/empty mileage)
#      4. Assign load to closest eligible driver
#      5. Mark driver as assigned (can't take another load this round)
#
#  This is a greedy approximation of the optimal VRP solution.
#  For small fleets (< 20 trucks) it gives near-optimal results.
# ─────────────────────────────────────────────

@router.post("/optimize", summary="Optimiser l'assignation des charges (VRP)")
async def optimize_fleet(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    from app.services.optimization import optimize_assignments
    owner_id = current_user["_id"]

    # Get all fleet drivers
    driver_cursor = db["users"].find({
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": owner_id
    })
    all_drivers = await driver_cursor.to_list(length=100)

    # Build list of available drivers with their vehicle info
    available_drivers = []
    for driver in all_drivers:
        # Skip drivers already on active trips
        active = await db["trajets"].find_one({
            "chauffeurId": driver["_id"],
            "status": {"$in": [
                StatutTrajet.PLANIFIE,
                StatutTrajet.EN_ROUTE_RAMASSAGE,
                StatutTrajet.CHARGEMENT,
                StatutTrajet.EN_ROUTE_LIVRAISON
            ]}
        })
        if active:
            continue

        # Get their vehicle
        vehicle = await db["vehicules"].find_one({
            "proprietaireId": owner_id,
            "assignedDriverId": driver["_id"],   # ← critical
            "status": "DISPONIBLE",
            "capaciteKg": {"$gt": 0}
})
        if not vehicle:
            continue

        position = vehicle.get("position", {}).get("coordinates", [0, 0])
        available_drivers.append({
            "driver_id": driver["_id"],
            "driver_name": driver["nom"],
            "vehicle_id": vehicle["_id"],
            "vehicle_capacity_kg": vehicle["capaciteKg"],
            "position_lon": position[0],
            "position_lat": position[1],
        })

    if not available_drivers:
        return {
            "message": "Aucun chauffeur disponible pour l'optimisation.",
            "assignments": [],
            "empty_mileage_saved_km": 0
        }

    # Get available loads
    load_cursor = db["charges"].find(
        {"status": StatutCharge.DISPONIBLE, "marche" : "FLOTTE"}
    ).sort("createdAt", 1).limit(100)  # Oldest first = most urgent
    loads = await load_cursor.to_list(length=100)

    if not loads:
        return {
            "message": "Aucune charge disponible pour l'optimisation.",
            "assignments": [],
            "empty_mileage_saved_km": 0
        }

    # Run optimization
    assignments = optimize_assignments(available_drivers, loads)

    return {
        "message": f"{len(assignments)} assignation(s) optimisée(s).",
        "assignments": assignments,
        "drivers_available": len(available_drivers),
        "loads_available": len(loads),
        "loads_assigned": len(assignments),
        "loads_unassigned": len(loads) - len(assignments),
    }

import random
import string
from datetime import timedelta

@router.post("/invite", summary="Générer un code d'invitation pour un chauffeur")
async def generate_invite_code(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    owner_id = current_user["_id"]

    # Generate a unique 6-character alphanumeric code (uppercase)
    # Exclude ambiguous characters: 0, O, I, 1
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    while True:
        code = "".join(random.choices(chars, k=6))
        # Make sure it doesn't already exist and is unused
        existing = await db["invite_codes"].find_one({"code": code, "used": False})
        if not existing:
            break

    # Store in DB
    invite_doc = {
        "_id": str(ObjectId()),
        "code": code,
        "ownerId": owner_id,
        "ownerName": current_user.get("nom", ""),
        "used": False,
        "usedAt": None,
        "usedBy": None,
        "createdAt": datetime.utcnow(),
        "expiresAt": datetime.utcnow() + timedelta(hours=24),
    }
    await db["invite_codes"].insert_one(invite_doc)

    return {
        "code": code,
        "expires_in": "24 heures",
        "message": f"Partagez ce code avec votre chauffeur. Il expire dans 24h et ne peut être utilisé qu'une seule fois."
    }


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/invites
#  Fleet owner sees all their active invite codes
# ─────────────────────────────────────────────

@router.get("/invites", summary="Voir les codes d'invitation actifs")
async def list_invite_codes(
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    cursor = db["invite_codes"].find({
        "ownerId": current_user["_id"],
    }).sort("createdAt", -1).limit(20)
    codes = await cursor.to_list(length=20)
    for c in codes:
        c["id"] = c.pop("_id")
        c["isExpired"] = c["expiresAt"] < datetime.utcnow()
        c["isActive"] = not c["used"] and not c["isExpired"]
    return {"codes": codes}    



# ─────────────────────────────────────────────
#  POST /api/v1/fleet/drivers/{driver_id}/vehicles
#  Fleet owner adds a vehicle and assigns it to a driver
# ─────────────────────────────────────────────

class FleetVehiclePayload(BaseModel):
    type: TypeVehicule = Field(..., description="MARAICHER | CITERNE | FRIGORIFIQUE")
    capaciteKg: float = Field(..., gt=0)
    capaciteM3: Optional[float] = Field(default=None, gt=0)
    plaqueImmatriculation: str = Field(..., min_length=1)


@router.post(
    "/drivers/{driver_id}/vehicles",
    status_code=status.HTTP_201_CREATED,
    summary="Ajouter un véhicule à un chauffeur de la flotte"
)
async def add_vehicle_to_driver(
    driver_id: str,
    payload: FleetVehiclePayload,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    owner_id = current_user["_id"]

    # 1. Verify driver belongs to this fleet
    driver = await db["users"].find_one({
        "_id": driver_id,
        "role": RoleUtilisateur.CHAUFFEUR_FLOTTE.value,
        "employeurId": owner_id
    })
    if not driver:
        raise HTTPException(
            status_code=404,
            detail="Chauffeur introuvable dans votre flotte."
        )

    # 2. Create vehicle — owned by fleet owner, assigned to driver
    plaque = payload.plaqueImmatriculation.strip().upper()
    if not plaque:
        raise HTTPException(
            status_code=400,
            detail="La plaque d'immatriculation est requise."
        )

    existing_vehicle = await db["vehicules"].find_one({
        "proprietaireId": owner_id,
        "plaqueImmatriculation": plaque
    })
    if existing_vehicle:
        raise HTTPException(
            status_code=400,
            detail="Un vehicule avec cette plaque existe deja dans votre flotte."
        )

    vehicle_doc = {
        "_id": str(ObjectId()),
        "proprietaireId": owner_id,        # Fleet owner owns the truck
        "assignedDriverId": driver_id,     # But it's assigned to this driver
        "type": payload.type.value,
        "capaciteKg": payload.capaciteKg,
        "capaciteM3": payload.capaciteM3,
        "plaqueImmatriculation": plaque,
        "position": {"type": "Point", "coordinates": [0, 0]},
        "status": "DISPONIBLE",
        "createdAt": datetime.utcnow()
    }
    await db["vehicules"].insert_one(vehicle_doc)

    return {
        "message": f"Véhicule assigné à {driver['nom']} avec succès.",
        "vehicule_id": vehicle_doc["_id"]
    }


# ─────────────────────────────────────────────
#  DELETE /api/v1/fleet/drivers/{driver_id}/vehicles/{vehicle_id}
#  Fleet owner removes a vehicle from a driver
# ─────────────────────────────────────────────

@router.delete(
    "/drivers/{driver_id}/vehicles/{vehicle_id}",
    summary="Retirer un véhicule d'un chauffeur"
)
async def remove_vehicle_from_driver(
    driver_id: str,
    vehicle_id: str,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    owner_id = current_user["_id"]

    vehicle = await db["vehicules"].find_one({
        "_id": vehicle_id,
        "proprietaireId": owner_id,
        "assignedDriverId": driver_id
    })
    if not vehicle:
        raise HTTPException(status_code=404, detail="Véhicule introuvable.")

    if vehicle["status"] == "EN_MISSION":
        raise HTTPException(
            status_code=400,
            detail="Ce véhicule est actuellement en mission. "
                   "Attendez la fin de la mission avant de le retirer."
        )

    await db["vehicules"].delete_one({"_id": vehicle_id})
    return {"message": "Véhicule retiré avec succès."}


# ─────────────────────────────────────────────
#  GET /api/v1/fleet/drivers/{driver_id}/vehicles
#  Get all vehicles assigned to a specific driver
# ─────────────────────────────────────────────

@router.get(
    "/drivers/{driver_id}/vehicles",
    summary="Véhicules assignés à un chauffeur"
)
async def get_driver_vehicles(
    driver_id: str,
    current_user: dict = Depends(require_role(FLEET_OWNER))
):
    owner_id = current_user["_id"]

    # Verify driver belongs to this fleet
    driver = await db["users"].find_one({
        "_id": driver_id,
        "employeurId": owner_id
    })
    if not driver:
        raise HTTPException(status_code=404, detail="Chauffeur introuvable.")

    cursor = db["vehicules"].find({
        "proprietaireId": owner_id,
        "assignedDriverId": driver_id
    })
    vehicles = await cursor.to_list(length=50)
    for v in vehicles:
        v["id"] = v.pop("_id")
    return {"vehicules": vehicles}
    
