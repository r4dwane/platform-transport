from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from .load import GeoPoint
from .payment import PaiementModel

class StatutTrajet(str, Enum):
    PLANIFIE = "PLANIFIE"
    EN_ROUTE_RAMASSAGE = "EN_ROUTE_RAMASSAGE"
    CHARGEMENT = "CHARGEMENT"
    EN_ROUTE_LIVRAISON = "EN_ROUTE_LIVRAISON"
    LIVRE = "LIVRE"

class TrajetModel(BaseModel):
    chargeId: str
    chauffeurId: str
    vehiculeId: str
    clientId: str # L'expéditeur
    
    status: StatutTrajet = Field(default=StatutTrajet.PLANIFIE)
    
    # Historique GPS simplifié (Waypoints)
    # Les points précis seront dans Redis pour la fluidité
    tracking: List[GeoPoint] = [] 
    
    debutAt: Optional[datetime] = None
    finAt: Optional[datetime] = None
    
    # Imbrication du paiement
    infoPaiement: PaiementModel
    
    # Preuve de livraison (URL de l'image stockée)
    proofOfDelivery: Optional[str] = None