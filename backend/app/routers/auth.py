from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime, timedelta
import random
import string

from app.database import db
from app.models.user import UtilisateurModel, RoleUtilisateur
from app.auth.jwt_handler import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentification"])


# ─────────────────────────────────────────────
#  Schemas
# ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    nom: str = Field(..., min_length=2, max_length=100)
    telephone: str = Field(..., min_length=9, max_length=20)
    email: str
    motDePasse: str = Field(..., min_length=8)
    role: RoleUtilisateur
    # For CHAUFFEUR_FLOTTE: provide invite code instead of employeurId
    inviteCode: str | None = None
    # Keep employeurId for backward compatibility (direct assignment)
    employeurId: str | None = None


class LoginRequest(BaseModel):
    telephone: str
    motDePasse: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str


# ─────────────────────────────────────────────
#  POST /api/v1/auth/register
# ─────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED,
             summary="Créer un nouveau compte utilisateur")
async def register(payload: RegisterRequest):
    # 1. Check phone uniqueness
    existing = await db["users"].find_one({"telephone": payload.telephone})
    if existing:
        raise HTTPException(status_code=409,
                            detail="Ce numéro de téléphone est déjà utilisé.")

    employer_id = None

    if payload.role == RoleUtilisateur.CHAUFFEUR_FLOTTE:
        # Must provide either inviteCode or employeurId
        if not payload.inviteCode and not payload.employeurId:
            raise HTTPException(
                status_code=422,
                detail="Un chauffeur de flotte doit fournir un code d'invitation."
            )

        if payload.inviteCode:
            # Look up the invite code
            invite = await db["invite_codes"].find_one({
                "code": payload.inviteCode.upper().strip(),
                "used": False,
            })
            if not invite:
                raise HTTPException(
                    status_code=404,
                    detail="Code d'invitation invalide ou déjà utilisé."
                )
            # Check expiry
            if invite["expiresAt"] < datetime.utcnow():
                raise HTTPException(
                    status_code=400,
                    detail="Ce code d'invitation a expiré. "
                           "Demandez un nouveau code à votre employeur."
                )
            employer_id = invite["ownerId"]

            # Mark code as used
            await db["invite_codes"].update_one(
                {"_id": invite["_id"]},
                {"$set": {
                    "used": True,
                    "usedAt": datetime.utcnow(),
                    "usedBy": payload.telephone,
                }}
            )

        elif payload.employeurId:
            # Legacy: direct employeurId
            employer = await db["users"].find_one({
                "_id": payload.employeurId,
                "role": RoleUtilisateur.PROP_FLOTTE.value
            })
            if not employer:
                raise HTTPException(status_code=404,
                                    detail="Propriétaire de flotte introuvable.")
            employer_id = payload.employeurId

    # 2. Build user doc
    user_doc = {
        "_id": str(ObjectId()),
        "nom": payload.nom,
        "telephone": payload.telephone,
        "email": payload.email,
        "motDePasse": hash_password(payload.motDePasse),
        "role": payload.role.value,
        "note": 0.0,
        "estVerifie": False,
        "employeurId": employer_id,
        "createdAt": datetime.utcnow()
    }

    await db["users"].insert_one(user_doc)

    return {
        "message": "Compte créé avec succès.",
        "user_id": user_doc["_id"],
        "role": user_doc["role"]
    }


# ─────────────────────────────────────────────
#  POST /api/v1/auth/login
# ─────────────────────────────────────────────

@router.post("/login", response_model=TokenResponse,
             summary="Se connecter et obtenir un token JWT")
async def login(payload: LoginRequest):
    user = await db["users"].find_one({"telephone": payload.telephone})
    if not user:
        raise HTTPException(status_code=401,
                            detail="Numéro de téléphone ou mot de passe incorrect.")

    if not verify_password(payload.motDePasse, user["motDePasse"]):
        raise HTTPException(status_code=401,
                            detail="Numéro de téléphone ou mot de passe incorrect.")

    token = create_access_token(data={"sub": user["_id"], "role": user["role"]})

    return TokenResponse(access_token=token, role=user["role"], user_id=user["_id"])


# ─────────────────────────────────────────────
#  GET /api/v1/auth/me
# ─────────────────────────────────────────────

@router.get("/me", summary="Récupérer le profil de l'utilisateur connecté")
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user.pop("motDePasse", None)
    return current_user