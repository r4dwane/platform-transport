from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

# 1. Enums pour la cohérence des données
class StatutCharge(str, Enum):
    DISPONIBLE = "DISPONIBLE" # En attente d'offres
    RESERVEE = "RESERVEE"     # Un chauffeur a été choisi
    EN_MISSION = "EN_MISSION"     # Chargement effectué, en route
    LIVREE = "LIVREE"         # Mission terminée
    ANNULEE = "ANNULEE"

class TypeMarchandise(str, Enum):
    GENERAL = "GENERAL"
    PERISSABLE = "PERISSABLE"
    DANGEREUX = "DANGEREUX"
    FRAGILE = "FRAGILE"
    VOLUMINEUX = "VOLUMINEUX"
    LIQUIDE = "LIQUIDE"

# 2. Structure pour la Géolocalisation (Format GeoJSON)
class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]  # [longitude, latitude]

# 3. Le Modèle Principal
class ChargeModel(BaseModel):
    clientId: str = Field(..., description="ID de l'expéditeur")
    
    # Détails de la marchandise
    poidsKg: float = Field(..., gt=0)
    typeMarchandises: TypeMarchandise
    description: Optional[str] = None
    
    # Itinéraire (Texte et Coordonnées)
    adressEnlev: str
    coordEnlev: GeoPoint
    adressLivr: str
    coordLivr: GeoPoint
    
    # Aspect financier
    prixPropose: float = Field(..., gt=0)
    
    # État du cycle de vie
    status: StatutCharge = Field(default=StatutCharge.DISPONIBLE)
    createdAt: datetime = Field(default_factory=datetime.now)

    class Config:
        json_schema_extra = {
            "example": {
                "clientId": "65e123...",
                "poidsKg": 1500.0,
                "typeMarchandises": "PERISSABLE",
                "adressEnlev": "Port d'Alger, Alger",
                "coordEnlev": {"type": "Point", "coordinates": [3.0588, 36.7538]},
                "adressLivr": "Zone Industrielle, Sétif",
                "coordLivr": {"type": "Point", "coordinates": [5.4133, 36.1922]},
                "prixPropose": 45000.0,
                "status": "DISPONIBLE"
            }
        }