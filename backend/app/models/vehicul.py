from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from .load import GeoPoint

class TypeVehicule(str, Enum):
    MARAICHER = "MARAICHER" 
    CITERNE = "CITERNE"
    FRIGORIFIQUE = "FRIGORIFIQUE"

class VehiculeModel(BaseModel):
    proprietaireId: str # Référence à l'Utilisateur
    type: TypeVehicule
    capaciteKg: float = Field(..., gt=0)
    capaciteM3: Optional[float] = None
    plaqueImmatriculation: str
    
    # Position actuelle pour le matching (GeoJSON)
    position: GeoPoint 
    status: str = Field(default="DISPONIBLE") # DISPONIBLE, EN_MISSION, MAINTENANCE