export enum StatutOffre {
  EN_ATTENTE = "EN_ATTENTE",
  ACCEPTEE = "ACCEPTEE",
  REFUSEE = "REFUSEE",
}
 
export interface Offer {
  id: string;
  chargeId: string;
  chauffeurId: string;
  vehiculeId: string;
  prixPropose: number;
  delaiRamassage: string;
  status: StatutOffre;
  createdAt: string;
}
 
export interface CreateOfferPayload {
  chargeId: string;
  vehiculeId: string;
  prixPropose: number;
  delaiRamassage: string;
}