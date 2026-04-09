from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from bson import ObjectId
from datetime import datetime

from app.database import db
from app.models.user import UtilisateurModel, RoleUtilisateur
from app.auth.jwt_handler import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/v1/auth", tags=["Authentification"])


# ─────────────────────────────────────────────
#  Request / Response schemas
# ─────────────────────────────────────────────

class RegisterRequest(BaseModel):
    nom: str = Field(..., min_length=2, max_length=100)
    telephone: str = Field(..., min_length=9, max_length=20)
    email: str
    motDePasse: str = Field(..., min_length=8)
    role: RoleUtilisateur

    # Only required when role = CHAUFFEUR_FLOTTE
    employeurId: str | None = None

    class Config:
        json_schema_extra = {
            "example": {
                "nom": "Karim Boudiaf",
                "telephone": "+213555987654",
                "email": "karim@transport.dz",
                "motDePasse": "securepass123",
                "role": "CHAUFFEUR_IND"
            }
        }


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

@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    summary="Créer un nouveau compte utilisateur"
)
async def register(payload: RegisterRequest):
    # 1. Check if phone number already exists
    existing = await db["users"].find_one({"telephone": payload.telephone})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce numéro de téléphone est déjà utilisé."
        )

    # 2. Validate business rule : CHAUFFEUR_FLOTTE must provide employeurId
    if payload.role == RoleUtilisateur.CHAUFFEUR_FLOTTE and not payload.employeurId:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un chauffeur de flotte doit fournir l'ID de son employeur."
        )

    # 3. If employeurId provided, verify the employer exists and has the right role
    if payload.employeurId:
        employer = await db["users"].find_one({
            "_id": payload.employeurId,
            "role": RoleUtilisateur.PROP_FLOTTE.value
        })
        if not employer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Propriétaire de flotte introuvable."
            )

    # 4. Build the user document
    user_doc = {
        "_id": str(ObjectId()),
        "nom": payload.nom,
        "telephone": payload.telephone,
        "email": payload.email,
        "motDePasse": hash_password(payload.motDePasse),
        "role": payload.role.value,
        "note": 0.0,
        "estVerifie": False,
        "employeurId": payload.employeurId,
        "createdAt": datetime.utcnow()
    }

    # 5. Insert into MongoDB
    await db["users"].insert_one(user_doc)

    return {
        "message": "Compte créé avec succès.",
        "user_id": user_doc["_id"],
        "role": user_doc["role"]
    }


# ─────────────────────────────────────────────
#  POST /api/v1/auth/login
# ─────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Se connecter et obtenir un token JWT"
)
async def login(payload: LoginRequest):
    # 1. Find user by phone number
    user = await db["users"].find_one({"telephone": payload.telephone})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Numéro de téléphone ou mot de passe incorrect."
        )

    # 2. Verify password
    if not verify_password(payload.motDePasse, user["motDePasse"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Numéro de téléphone ou mot de passe incorrect."
        )

    # 3. Create JWT — payload contains user_id and role
    token = create_access_token(data={
        "sub": user["_id"],
        "role": user["role"]
    })

    return TokenResponse(
        access_token=token,
        role=user["role"],
        user_id=user["_id"]
    )


# ─────────────────────────────────────────────
#  GET /api/v1/auth/me  (quick profile check)
# ─────────────────────────────────────────────

@router.get(
    "/me",
    summary="Récupérer le profil de l'utilisateur connecté"
)
async def get_me(token: str):
    """
    Quick endpoint to verify a token and return basic profile info.
    In production this uses Depends(get_current_user) from dependencies.py
    """
    from app.auth.jwt_handler import decode_access_token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré."
        )

    user = await db["users"].find_one({"_id": payload.get("sub")})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur introuvable."
        )

    # Never return the hashed password
    user.pop("motDePasse", None)
    return user
