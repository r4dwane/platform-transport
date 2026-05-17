import { Offer, CreateOfferPayload } from "@/types/offer.type";
import api from "./api"; 

export const offersService = {
  getForLoad: (loadId: string) =>
    api.get<{ offres: Offer[] }>(`/api/v1/offers/load/${loadId}`),
 
  getMyOffers: () =>
    api.get<{ offres: Offer[] }>("/api/v1/offers/my/offers"),
 
  create: (payload: CreateOfferPayload) =>
    api.post("/api/v1/offers", payload),
 
  accept: (offerId: string, methodePaiement?: string) =>
    api.post(`/api/v1/offers/${offerId}/accept`, null, {
      params: { methode_paiement: methodePaiement ?? "CASH" },
    }),
 
  reject: (offerId: string) =>
    api.post(`/api/v1/offers/${offerId}/reject`),
};