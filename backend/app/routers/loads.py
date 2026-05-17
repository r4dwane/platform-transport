from fastapi import APIRouter, HTTPException, status, Query, Depends
from bson import ObjectId
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

from app.database import db
from app.models.load import ChargeModel, StatutCharge, TypeMarchandise, TypeMarche
from app.dependencies import require_role, get_current_user
from app.models.user import RoleUtilisateur

router = APIRouter(prefix="/api/v1/loads", tags=["Charges"])


# ─────────────────────────────────────────────
#  POST /api/v1/loads
# ─────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, summary="Publier une nouvelle charge")
async def create_load(
    payload: ChargeModel,
    current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))
):
    doc = payload.model_dump()
    doc["_id"]      = str(ObjectId())
    doc["clientId"] = current_user["_id"]
    doc["status"]   = StatutCharge.DISPONIBLE
    doc["createdAt"]= datetime.utcnow()
    # marche comes from payload (OUVERT or FLOTTE)

    await db["charges"].insert_one(doc)
    return {"message": "Charge publiée avec succès.", "charge_id": doc["_id"]}


# ─────────────────────────────────────────────
#  GET /api/v1/loads
#  CHANGED: only returns OUVERT loads
#  Independent drivers browse this endpoint
# ─────────────────────────────────────────────

@router.get("/", summary="Lister les charges disponibles (marché ouvert)")
async def list_loads(
    type_marchandise: Optional[TypeMarchandise] = None,
    poids_min: Optional[float] = Query(None, gt=0),
    poids_max: Optional[float] = Query(None, gt=0),
    prix_min:  Optional[float] = Query(None, gt=0),
    skip:  int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    # Only OUVERT loads are visible to drivers on the open market
    filters: dict = {
        "status": StatutCharge.DISPONIBLE,
        "marche": TypeMarche.OUVERT,
    }

    if type_marchandise:
        filters["typeMarchandises"] = type_marchandise
    if poids_min is not None:
        filters.setdefault("poidsKg", {})["$gte"] = poids_min
    if poids_max is not None:
        filters.setdefault("poidsKg", {})["$lte"] = poids_max
    if prix_min is not None:
        filters.setdefault("prixPropose", {})["$gte"] = prix_min

    cursor = db["charges"].find(filters).skip(skip).limit(limit).sort("createdAt", -1)
    loads  = await cursor.to_list(length=limit)
    for load in loads:
        load["id"] = load.pop("_id")
    return {"total": len(loads), "charges": loads}


# ─────────────────────────────────────────────
#  GET /api/v1/loads/my/loads
#  Client sees ALL their loads (both OUVERT and FLOTTE)
# ─────────────────────────────────────────────

@router.get("/my/loads", summary="Mes charges publiées (client)")
async def my_loads(
    current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))
):
    cursor = db["charges"].find({"clientId": current_user["_id"]}).sort("createdAt", -1)
    loads  = await cursor.to_list(length=100)
    for load in loads:
        load["id"] = load.pop("_id")
    return {"charges": loads}


# ─────────────────────────────────────────────
#  GET /api/v1/loads/{load_id}
# ─────────────────────────────────────────────

@router.get("/{load_id}", summary="Détails d'une charge")
async def get_load(
    load_id: str,
    current_user: dict = Depends(get_current_user)
):
    load = await db["charges"].find_one({"_id": load_id})
    if not load:
        raise HTTPException(status_code=404, detail="Charge introuvable.")
    load["id"] = load.pop("_id")
    return load


# ─────────────────────────────────────────────
#  PUT /api/v1/loads/{load_id}
# ─────────────────────────────────────────────

class UpdateLoadPayload(BaseModel):
    poidsKg:         Optional[float]          = Field(None, gt=0)
    typeMarchandises:Optional[TypeMarchandise]= None
    marche:          Optional[TypeMarche]     = None
    description:     Optional[str]           = None
    adressEnlev:     Optional[str]           = None
    coordEnlev:      Optional[dict]          = None
    adressLivr:      Optional[str]           = None
    coordLivr:       Optional[dict]          = None
    prixPropose:     Optional[float]          = Field(None, gt=0)


@router.put("/{load_id}", summary="Modifier une charge (avant acceptation d'offre)")
async def update_load(
    load_id: str,
    payload: UpdateLoadPayload,
    current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))
):
    load = await db["charges"].find_one({"_id": load_id})
    if not load:
        raise HTTPException(status_code=404, detail="Charge introuvable.")
    if load["clientId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Ce n'est pas votre charge.")
    if load["status"] != StatutCharge.DISPONIBLE:
        raise HTTPException(status_code=400,
            detail="Cette charge ne peut plus être modifiée.")

    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Aucune donnée à mettre à jour.")
    updates["updatedAt"] = datetime.utcnow()

    await db["charges"].update_one({"_id": load_id}, {"$set": updates})
    return {"message": "Charge mise à jour avec succès."}


# ─────────────────────────────────────────────
#  DELETE /api/v1/loads/{load_id}
# ─────────────────────────────────────────────

@router.delete("/{load_id}", summary="Annuler une charge")
async def cancel_load(
    load_id: str,
    current_user: dict = Depends(require_role(RoleUtilisateur.CLIENT))
):
    load = await db["charges"].find_one({"_id": load_id})
    if not load:
        raise HTTPException(status_code=404, detail="Charge introuvable.")
    if load["clientId"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Ce n'est pas votre charge.")
    if load["status"] != StatutCharge.DISPONIBLE:
        raise HTTPException(status_code=400,
            detail="Impossible d'annuler une charge déjà en cours ou livrée.")

    await db["charges"].update_one(
        {"_id": load_id},
        {"$set": {"status": StatutCharge.ANNULEE}}
    )
    return {"message": "Charge annulée."}