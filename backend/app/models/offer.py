from enum import Enum
from pydantic import BaseModel, Field
from datetime import datetime

class statutOffre(str, Enum):
    EN_ATTENTE = "EN_ATTENTE"
    ACCEPTEE = "ACCEPTEE"
    REFUSEE = "REFUSEE"

class OffreModel(BaseModel):
    chargeId: str      # La marchandise concernée
    chauffeurId: str   # Celui qui propose ses services
    vehiculeId: str    # Le camion qu'il compte utiliser
    
    prixPropose: float = Field(..., gt=0)
    delaiRamassage: datetime # Quand il peut être sur place
    status: statutOffre = Field(default=statutOffre.EN_ATTENTE) # EN_ATTENTE, ACCEPTEE, REFUSEE
    createdAt: datetime = Field(default_factory=datetime.now)