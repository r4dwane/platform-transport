export enum MethodePaiement {
  CASH = "CASH",
  EDAHABIA = "EDAHABIA",
  BARIDIMOB = "BARIDIMOB",
  VIREMENT = "VIREMENT",
}
 
export enum StatutPaiement {
  A_PAYER = "A_PAYER",
  PAYE = "PAYE",
  ECHOUE = "ECHOUE",
}
 
export interface Payment {
  montant: number;
  methode: MethodePaiement;
  status: StatutPaiement;
  transactionId?: string;
  createdAt: string;
  paidAt?: string;
}