from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class StatutCharge(str, Enum):
    DISPONIBLE = "DISPONIBLE"
    RESERVEE   = "RESERVEE"
    EN_MISSION = "EN_MISSION"
    LIVREE     = "LIVREE"
    ANNULEE    = "ANNULEE"


class TypeMarchandise(str, Enum):
    GENERAL    = "GENERAL"
    PERISSABLE = "PERISSABLE"
    DANGEREUX  = "DANGEREUX"
    FRAGILE    = "FRAGILE"
    VOLUMINEUX = "VOLUMINEUX"
    LIQUIDE    = "LIQUIDE"


# NEW — market type
class TypeMarche(str, Enum):
    OUVERT = "OUVERT"   # Open market: independent drivers submit offers
    FLOTTE = "FLOTTE"   # Fleet only: fleet owner assigns directly


class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]


class ChargeModel(BaseModel):
    clientId: Optional[str] = None

    poidsKg: float = Field(..., gt=0)
    typeMarchandises: TypeMarchandise
    description: Optional[str] = None

    adressEnlev: str
    coordEnlev: GeoPoint
    adressLivr: str
    coordLivr: GeoPoint

    prixPropose: float = Field(..., gt=0)

    # NEW — defaults to OUVERT for backward compatibility
    marche: TypeMarche = Field(default=TypeMarche.OUVERT)

    status: StatutCharge = Field(default=StatutCharge.DISPONIBLE)
    createdAt: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "clientId": "65e123...",
                "poidsKg": 1500.0,
                "typeMarchandises": "PERISSABLE",
                "marche": "OUVERT",
                "adressEnlev": "Port d'Alger, Alger",
                "coordEnlev": {"type": "Point", "coordinates": [3.0588, 36.7538]},
                "adressLivr": "Zone Industrielle, Sétif",
                "coordLivr": {"type": "Point", "coordinates": [5.4133, 36.1922]},
                "prixPropose": 45000.0,
                "status": "DISPONIBLE"
            }
        }