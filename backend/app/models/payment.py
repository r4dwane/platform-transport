from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
class MethodePaiement(str, Enum):
    CASH = "CASH"
    EDAHABIA = "EDAHABIA"
    BARIDIMOB = "BARIDIMOB"
    VIREMENT = "VIREMENT"

class PaiementModel(BaseModel):
    montant: float
    methode: MethodePaiement
    status: str = Field(default="A_PAYER") # A_PAYER, PAYE, ECHOUE
    transactionId: Optional[str] = None # ID de l'opérateur (SATIM/Poste)
    createdAt: datetime = Field(default_factory=datetime.now)