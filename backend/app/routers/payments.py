from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.database import db
from app.models.payment import MethodePaiement
from app.models.trip import StatutTrajet
from app.dependencies import require_role, get_current_user
from app.models.user import RoleUtilisateur
from app.services.notification import notify_payment_confirmed

router = APIRouter(prefix="/api/v1/payments", tags=["Paiements"])


# ─────────────────────────────────────────────
#  GET /api/v1/payments/trip/{trip_id}  — Get payment status for a trip
# ─────────────────────────────────────────────

@router.get(
    "/trip/{trip_id}",
    summary="Voir le statut du paiement d'un trajet"
)
async def get_payment(
    trip_id: str,
    current_user: dict = Depends(get_current_user)
):
    trip = await db["trajets"].find_one({"_id": trip_id})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trajet introuvable.")

    uid = current_user["_id"]
    if uid not in [trip["chauffeurId"], trip["clientId"]]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé.")

    return {"trajet_id": trip_id, "paiement": trip.get("infoPaiement")}


# ─────────────────────────────────────────────
#  POST /api/v1/payments/trip/{trip_id}/confirm  — Mark payment as done
# ─────────────────────────────────────────────

class ConfirmPaymentRequest(BaseModel):
    transaction_id: Optional[str] = None  # For EDAHABIA / BARIDIMOB / VIREMENT


@router.post(
    "/trip/{trip_id}/confirm",
    summary="Confirmer le paiement d'un trajet"
)
async def confirm_payment(
    trip_id: str,
    payload: ConfirmPaymentRequest,
    current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))
): 
    trip = await db["trajets"].find_one({"_id": trip_id})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trajet introuvable.")

    if trip["clientId"] != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre trajet.")

    payment = trip.get("infoPaiement", {})

    if payment.get("status") == "PAYE":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Ce trajet est déjà payé.")

    if trip["status"] != StatutTrajet.LIVRE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le paiement ne peut être confirmé qu'après la livraison."
        )

    # For non-cash methods a transactionId is required
    methode = payment.get("methode")
    if methode != MethodePaiement.CASH and not payload.transaction_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un ID de transaction est requis pour les paiements électroniques."
        )

    update_fields = {
        "infoPaiement.status": "PAYE",
        "infoPaiement.paidAt": datetime.utcnow()
    }
    if payload.transaction_id:
        update_fields["infoPaiement.transactionId"] = payload.transaction_id

    await db["trajets"].update_one({"_id": trip_id}, {"$set": update_fields})
    await notify_payment_confirmed(
    driver_id=trip["chauffeurId"],
    trip_id=trip_id,
    montant=payment.get("montant", 0)
    )  
    return {"message": "Paiement confirmé avec succès."}


# ─────────────────────────────────────────────
#  POST /api/v1/payments/trip/{trip_id}/fail  — Mark payment as failed (admin / system)
# ─────────────────────────────────────────────

@router.post(
    "/trip/{trip_id}/fail",
    summary="Signaler un échec de paiement (admin)"
)
async def fail_payment(
    trip_id: str,
    current_user: dict = Depends(require_role(RoleUtilisateur.ADMIN))
):
    trip = await db["trajets"].find_one({"_id": trip_id})
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trajet introuvable.")

    await db["trajets"].update_one(
        {"_id": trip_id},
        {"$set": {"infoPaiement.status": "ECHOUE"}}
    )
    return {"message": "Paiement marqué comme échoué."}
