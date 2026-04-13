from fastapi import APIRouter, HTTPException, status, Depends
from bson import ObjectId
from datetime import datetime

from app.database import db
from app.models.offer import OffreModel, statutOffre
from app.models.load import StatutCharge
from app.models.trip import StatutTrajet
from app.models.payment import MethodePaiement
from app.dependencies import require_role, get_current_user
from app.models.user import RoleUtilisateur
from app.services.notification import (
    notify_new_offer,
    notify_offer_accepted,
    notify_offer_rejected
)

router = APIRouter(prefix="/api/v1/offers", tags=["Offres"])


@router.post("/", 
             status_code=status.HTTP_201_CREATED, 
             summary="Soumettre une offre sur une charge"
             )
async def create_offer(
    payload: OffreModel,
    current_user: dict = Depends(
        require_role(RoleUtilisateur.CHAUFFEUR_IND, RoleUtilisateur.CHAUFFEUR_FLOTTE)
    )
):
    load = await db["charges"].find_one({"_id": payload.chargeId})
    if not load:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charge introuvable.")
    if load["status"] != StatutCharge.DISPONIBLE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette charge n'accepte plus d'offres.")

    vehicle = await db["vehicules"].find_one({"_id": payload.vehiculeId, "proprietaireId": current_user["_id"]})
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Véhicule introuvable ou ne vous appartient pas.")

    existing_offer = await db["offres"].find_one({
        "chargeId": payload.chargeId,
        "chauffeurId": current_user["_id"],
        "status": statutOffre.EN_ATTENTE
    })
    if existing_offer:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Vous avez déjà une offre en attente pour cette charge.")

    doc = payload.model_dump()
    doc["_id"] = str(ObjectId())
    doc["chauffeurId"] = current_user["_id"]
    doc["status"] = statutOffre.EN_ATTENTE
    doc["createdAt"] = datetime.utcnow()

    await db["offres"].insert_one(doc)

    await notify_new_offer(
        client_id=load["clientId"],
        load_id=load["_id"],
        driver_name=current_user.get("nom", "Un chauffeur"),
        prix=payload.prixPropose
    )

    return {"message": "Offre soumise avec succès.", "offre_id": doc["_id"]}


@router.get("/load/{load_id}", summary="Voir toutes les offres sur une charge")
async def get_offers_for_load(load_id: str, current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))):
    load = await db["charges"].find_one({"_id": load_id})
    if not load:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Charge introuvable.")
    if load["clientId"] != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre charge.")

    cursor = db["offres"].find({"chargeId": load_id}).sort("prixPropose", 1)
    offers = await cursor.to_list(length=100)
    for offer in offers:
        offer["id"] = offer.pop("_id")
    return {"offres": offers}


@router.get("/my/offers", summary="Mes offres soumises (chauffeur)")
async def my_offers(
    current_user: dict = Depends(require_role(RoleUtilisateur.CHAUFFEUR_IND, RoleUtilisateur.CHAUFFEUR_FLOTTE))
):
    cursor = db["offres"].find({"chauffeurId": current_user["_id"]}).sort("createdAt", -1)
    offers = await cursor.to_list(length=100)
    for offer in offers:
        offer["id"] = offer.pop("_id")
    return {"offres": offers}


@router.post("/{offer_id}/accept", status_code=status.HTTP_201_CREATED, summary="Accepter une offre et créer un trajet")
async def accept_offer(
    offer_id: str,
    methode_paiement: MethodePaiement = MethodePaiement.CASH,
    current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))
):
    offer = await db["offres"].find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre introuvable.")
    if offer["status"] != statutOffre.EN_ATTENTE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette offre n'est plus disponible.")

    load = await db["charges"].find_one({"_id": offer["chargeId"]})
    if not load or load["clientId"] != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre charge.")
    if load["status"] != StatutCharge.DISPONIBLE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette charge n'est plus disponible.")

    trip_id = str(ObjectId())
    payment_doc = {
        "montant": offer["prixPropose"],
        "methode": methode_paiement,
        "status": "A_PAYER",
        "transactionId": None,
        "createdAt": datetime.utcnow()
    }
    trip_doc = {
        "_id": trip_id,
        "chargeId": offer["chargeId"],
        "chauffeurId": offer["chauffeurId"],
        "vehiculeId": offer["vehiculeId"],
        "clientId": current_user["_id"],
        "status": StatutTrajet.PLANIFIE,
        "tracking": [],
        "debutAt": None,
        "finAt": None,
        "infoPaiement": payment_doc,
        "proofOfDelivery": None,
        "createdAt": datetime.utcnow()
    }
    await db["trajets"].insert_one(trip_doc)

    await db["offres"].update_one({"_id": offer_id}, {"$set": {"status": statutOffre.ACCEPTEE}})

    rejected_cursor = db["offres"].find({
        "chargeId": offer["chargeId"],
        "_id": {"$ne": offer_id},
        "status": statutOffre.EN_ATTENTE
    })
    rejected_offers = await rejected_cursor.to_list(length=100)

    await db["offres"].update_many(
        {"chargeId": offer["chargeId"], "_id": {"$ne": offer_id}},
        {"$set": {"status": statutOffre.REFUSEE}}
    )
    await db["charges"].update_one({"_id": offer["chargeId"]}, {"$set": {"status": StatutCharge.RESERVEE}})

    await notify_offer_accepted(
        driver_id=offer["chauffeurId"],
        load_id=offer["chargeId"],
        trip_id=trip_id
    )
    for rejected in rejected_offers:
        await notify_offer_rejected(driver_id=rejected["chauffeurId"], load_id=rejected["chargeId"])

    return {"message": "Offre acceptée. Trajet créé.", "trajet_id": trip_id}


@router.post("/{offer_id}/reject", summary="Refuser une offre")
async def reject_offer(offer_id: str, current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))):
    offer = await db["offres"].find_one({"_id": offer_id})
    if not offer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Offre introuvable.")

    load = await db["charges"].find_one({"_id": offer["chargeId"]})
    if not load or load["clientId"] != current_user["_id"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ce n'est pas votre charge.")

    await db["offres"].update_one({"_id": offer_id}, {"$set": {"status": statutOffre.REFUSEE}})
    await notify_offer_rejected(driver_id=offer["chauffeurId"], load_id=offer["chargeId"])

    return {"message": "Offre refusée."}