import {Payment} from "./payment.type";
  
export enum StatutTrajet {
  PLANIFIE = "PLANIFIE",
  EN_ROUTE_RAMASSAGE = "EN_ROUTE_RAMASSAGE",
  CHARGEMENT = "CHARGEMENT",
  EN_ROUTE_LIVRAISON = "EN_ROUTE_LIVRAISON",
  LIVRE = "LIVRE",
}
 
export interface Trip {
  id: string;
  chargeId: string;
  chauffeurId: string;
  vehiculeId: string;
  clientId: string;
  status: StatutTrajet;
  tracking: Array<{ type: string; coordinates: [number, number] }>;
  debutAt?: string;
  finAt?: string;
  infoPaiement: Payment;
  proofOfDelivery?: string;
  createdAt: string;
}