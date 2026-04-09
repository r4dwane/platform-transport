from enum import Enum
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

# 1. Define the Enum for User Roles
class RoleUtilisateur(str, Enum):
    CLIENT = "CLIENT"
    CHAUFFEUR_IND = "CHAUFFEUR_IND"
    PROP_FLOTTE = "PROP_FLOTTE"
    CHAUFFEUR_FLOTTE = "CHAUFFEUR_FLOTTE"
    ADMIN = "ADMIN"

# 2. Define the Base Schema for the User
class UtilisateurModel(BaseModel):
    nom: str = Field(..., min_length=2, max_length=100)
    telephone: str = Field(..., min_length=9, max_length=20)
    email: EmailStr
    motDePasse: str = Field(..., min_length=8) # Stocké de manière sécurisée (hashé)
    role: RoleUtilisateur
    
    # Default values for new users
    note: float = Field(default=0.0, ge=0.0, le=5.0) # Score between 0 and 5
    estVerifie: bool = Field(default=False)
    
    # Optional field specifically for "CHAUFFEUR_FLOTTE"
    employeurId: Optional[str] = Field(
        default=None,
        description="L'ObjectId du Propriétaire de flotte (sous format string)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "nom": "Ahmed Logistics",
                "telephone": "+213555123456",
                "email": "ahmed@logistics.dz",
                "role": "CHAUFFEUR_IND",
                "note": 4.8,
                "estVerifie": True
            }
        }