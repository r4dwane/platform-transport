from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

from app.database import db
from app.dependencies import require_role, get_current_user
from app.models.user import RoleUtilisateur
from app.models.vehicul import VehiculeModel, TypeVehicule
from app.models.load import GeoPoint
from bson import ObjectId

router = APIRouter(prefix="/api/v1/users", tags=["Utilisateurs & Véhicules"])


# ─────────────────────────────────────────────
#  GET /api/v1/users/me  — Full profile
# ─────────────────────────────────────────────

@router.get("/me", summary="Mon profil complet")
async def get_profile(current_user: dict = Depends(get_current_user)):
    current_user.pop("motDePasse", None)
    return current_user


# ─────────────────────────────────────────────
#  PATCH /api/v1/users/me  — Update own profile
# ─────────────────────────────────────────────

class UpdateProfileRequest(BaseModel):
    nom: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = None


@router.patch("/me", summary="Mettre à jour mon profil")
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user)
):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Aucune donnée à mettre à jour.")

    await db["users"].update_one({"_id": current_user["_id"]}, {"$set": updates})
    return {"message": "Profil mis à jour."}


# ─────────────────────────────────────────────
#  POST /api/v1/users/rate/{user_id}  — Rate a driver or client after trip
# ─────────────────────────────────────────────

class RatingRequest(BaseModel):
    note: float = Field(..., ge=0.0, le=5.0)
    trajet_id: str


@router.post("/rate/{user_id}", summary="Noter un utilisateur après un trajet")
async def rate_user(
    user_id: str,
    payload: RatingRequest,
    current_user: dict = Depends(get_current_user)
):
    # Verify the trip involves both users
    trip = await db["trajets"].find_one({"_id": payload.trajet_id})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trajet introuvable.")

    uid = current_user["_id"]
    if uid not in [trip["chauffeurId"], trip["clientId"]]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Vous ne faites pas partie de ce trajet.")
    if user_id not in [trip["chauffeurId"], trip["clientId"]]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="L'utilisateur noté ne fait pas partie de ce trajet.")
    if user_id == uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Vous ne pouvez pas vous noter vous-même.")

    # Simple rolling average: fetch current note and number of ratings
    target = await db["users"].find_one({"_id": user_id})
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur introuvable.")

    current_note = target.get("note", 0.0)
    nb_ratings = target.get("nbRatings", 0)
    new_note = round(((current_note * nb_ratings) + payload.note) / (nb_ratings + 1), 2)

    await db["users"].update_one(
        {"_id": user_id},
        {"$set": {"note": new_note}, "$inc": {"nbRatings": 1}}
    )
    return {"message": "Note enregistrée.", "nouvelle_note": new_note}


# ─────────────────────────────────────────────
#  POST /api/v1/users/vehicles  — Driver registers a vehicle
# ─────────────────────────────────────────────

@router.post(
    "/vehicles",
    status_code=status.HTTP_201_CREATED,
    summary="Enregistrer un véhicule"
)
async def register_vehicle(
    payload: VehiculeModel,
    current_user: dict = Depends(
        require_role(RoleUtilisateur.CHAUFFEUR_IND, RoleUtilisateur.PROP_FLOTTE)
    )
):
    doc = payload.model_dump()
    doc["_id"] = str(ObjectId())
    doc["proprietaireId"] = current_user["_id"]
    doc["status"] = "DISPONIBLE"
    doc["createdAt"] = datetime.utcnow()

    await db["vehicules"].insert_one(doc)
    return {"message": "Véhicule enregistré.", "vehicule_id": doc["_id"]}


# ─────────────────────────────────────────────
#  GET /api/v1/users/vehicles  — Driver lists their vehicles
# ─────────────────────────────────────────────

@router.get("/vehicles", summary="Mes véhicules")
async def my_vehicles(
    current_user: dict = Depends(
        require_role(RoleUtilisateur.CHAUFFEUR_IND, RoleUtilisateur.PROP_FLOTTE)
    )
):
    cursor = db["vehicules"].find({"proprietaireId": current_user["_id"]})
    vehicles = await cursor.to_list(length=50)
    for v in vehicles:
        v["id"] = v.pop("_id")
    return {"vehicules": vehicles}


# ─────────────────────────────────────────────
#  PATCH /api/v1/users/vehicles/{vehicle_id}  — Update vehicle status
# ─────────────────────────────────────────────

class VehicleStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(DISPONIBLE|EN_MISSION|MAINTENANCE)$")


@router.patch("/vehicles/{vehicle_id}", summary="Mettre à jour le statut d'un véhicule")
async def update_vehicle_status(
    vehicle_id: str,
    payload: VehicleStatusUpdate,
    current_user: dict = Depends(
        require_role(RoleUtilisateur.CHAUFFEUR_IND, RoleUtilisateur.PROP_FLOTTE)
    )
):
    vehicle = await db["vehicules"].find_one({"_id": vehicle_id})
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Véhicule introuvable.")
    if vehicle["proprietaireId"] != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre véhicule.")

    await db["vehicules"].update_one({"_id": vehicle_id}, {"$set": {"status": payload.status}})
    return {"message": f"Statut du véhicule mis à jour : {payload.status}."}
