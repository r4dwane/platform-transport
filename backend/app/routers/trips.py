from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from datetime import datetime

from app.database import db
from app.models.trip import StatutTrajet
from app.models.load import StatutCharge
from app.dependencies import require_role, get_current_user
from app.models.user import RoleUtilisateur
from app.services.notification import notify_trip_status

router = APIRouter(prefix="/api/v1/trips", tags=["Trajets"])

DRIVER_ROLES = (RoleUtilisateur.CHAUFFEUR_IND, RoleUtilisateur.CHAUFFEUR_FLOTTE)

STATUS_TRANSITIONS = {
    StatutTrajet.PLANIFIE:              StatutTrajet.EN_ROUTE_RAMASSAGE,
    StatutTrajet.EN_ROUTE_RAMASSAGE:    StatutTrajet.CHARGEMENT,
    StatutTrajet.CHARGEMENT:            StatutTrajet.EN_ROUTE_LIVRAISON,
    StatutTrajet.EN_ROUTE_LIVRAISON:    StatutTrajet.LIVRE,
}

LOAD_STATUS_MAP = {
    StatutTrajet.EN_ROUTE_RAMASSAGE:    StatutCharge.RESERVEE,
    StatutTrajet.CHARGEMENT:            StatutCharge.EN_MISSION,
    StatutTrajet.EN_ROUTE_LIVRAISON:    StatutCharge.EN_MISSION,
    StatutTrajet.LIVRE:                 StatutCharge.LIVREE,
}


async def _get_trip_for_driver(trip_id: str, driver_id: str) -> dict:
    trip = await db["trajets"].find_one({"_id": trip_id})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trajet introuvable.")
    if trip["chauffeurId"] != driver_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre trajet.")
    return trip


# ─────────────────────────────────────────────
#  GET /api/v1/trips/my/trips
# ─────────────────────────────────────────────

@router.get("/my/trips", summary="Mes trajets")
async def my_trips(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    uid  = current_user["_id"]

    if role in [r.value for r in DRIVER_ROLES]:
        query = {"chauffeurId": uid}
    elif role == RoleUtilisateur.CLIENT.value:
        query = {"clientId": uid}
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    cursor = db["trajets"].find(query).sort("createdAt", -1)
    trips  = await cursor.to_list(length=100)
    for t in trips:
        t["id"] = t.pop("_id")
    return {"trajets": trips}


# ─────────────────────────────────────────────
#  GET /api/v1/trips/{trip_id}
# ─────────────────────────────────────────────

@router.get("/{trip_id}", summary="Détails d'un trajet")
async def get_trip(trip_id: str, current_user: dict = Depends(get_current_user)):
    trip = await db["trajets"].find_one({"_id": trip_id})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trajet introuvable.")

    if current_user["_id"] not in [trip["chauffeurId"], trip["clientId"]]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    trip["id"] = trip.pop("_id")
    return trip


# ─────────────────────────────────────────────
#  POST /api/v1/trips/{trip_id}/advance  — Driver advances trip status
# ─────────────────────────────────────────────

@router.post("/{trip_id}/advance", summary="Avancer le statut du trajet (chauffeur)")
async def advance_trip_status(
    trip_id: str,
    current_user: dict = Depends(require_role(*DRIVER_ROLES))
):
    trip           = await _get_trip_for_driver(trip_id, current_user["_id"])
    current_status = StatutTrajet(trip["status"])

    if current_status not in STATUS_TRANSITIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le trajet est déjà en statut final : {current_status}."
        )

    next_status = STATUS_TRANSITIONS[current_status]
    update      = {"status": next_status}

    if next_status == StatutTrajet.EN_ROUTE_RAMASSAGE:
        update["debutAt"] = datetime.utcnow()
    if next_status == StatutTrajet.LIVRE:
        update["finAt"] = datetime.utcnow()

    await db["trajets"].update_one({"_id": trip_id}, {"$set": update})

    # Sync load status
    if next_status in LOAD_STATUS_MAP:
        await db["charges"].update_one(
            {"_id": trip["chargeId"]},
            {"$set": {"status": LOAD_STATUS_MAP[next_status]}}
        )

    # Notify client and driver of the status change
    await notify_trip_status(
        client_id=trip["clientId"],
        driver_id=trip["chauffeurId"],
        trip_id=trip_id,
        new_status=next_status.value
    )

    return {"message": f"Statut mis à jour : {next_status}.", "nouveau_statut": next_status}


# ─────────────────────────────────────────────
#  POST /api/v1/trips/{trip_id}/location  — Driver pushes GPS position
# ─────────────────────────────────────────────

class LocationUpdate(BaseModel):
    longitude: float
    latitude: float


@router.post("/{trip_id}/location", summary="Mettre à jour la position GPS (chauffeur)")
async def update_location(
    trip_id: str,
    loc: LocationUpdate,
    current_user: dict = Depends(require_role(*DRIVER_ROLES))
):
    trip = await _get_trip_for_driver(trip_id, current_user["_id"])

    if trip["status"] not in [
        StatutTrajet.EN_ROUTE_RAMASSAGE,
        StatutTrajet.EN_ROUTE_LIVRAISON
    ]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La mise à jour GPS n'est disponible que lorsque le trajet est en route."
        )

    from app.services.gps import update_driver_location
    await update_driver_location(
        driver_id=current_user["_id"],
        trip_id=trip_id,
        longitude=loc.longitude,
        latitude=loc.latitude
    )

    return {"message": "Position mise à jour."}


# ─────────────────────────────────────────────
#  POST /api/v1/trips/{trip_id}/proof  — Driver uploads proof of delivery
# ─────────────────────────────────────────────

class ProofPayload(BaseModel):
    image_url: str


@router.post("/{trip_id}/proof", summary="Soumettre la preuve de livraison (chauffeur)")
async def submit_proof(
    trip_id: str,
    proof: ProofPayload,
    current_user: dict = Depends(require_role(*DRIVER_ROLES))
):
    trip = await _get_trip_for_driver(trip_id, current_user["_id"])

    if trip["status"] != StatutTrajet.LIVRE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La preuve de livraison ne peut être soumise qu'après livraison."
        )

    await db["trajets"].update_one(
        {"_id": trip_id},
        {"$set": {"proofOfDelivery": proof.image_url}}
    )
    return {"message": "Preuve de livraison enregistrée."}