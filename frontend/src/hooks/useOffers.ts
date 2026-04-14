import { useState } from "react";
import { offersService } from "@/services/offers.service";
import { Offer, CreateOfferPayload } from "@/types/offer.type";
import { MethodePaiement } from "@/types/payment.type";
 
export const useOffers = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
 
  const fetchForLoad = async (loadId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await offersService.getForLoad(loadId);
      setOffers(data.offres);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erreur lors du chargement.");
    } finally {
      setIsLoading(false);
    }
  };
 
  const fetchMyOffers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await offersService.getMyOffers();
      setMyOffers(data.offres);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erreur lors du chargement.");
    } finally {
      setIsLoading(false);
    }
  };
 
  const submitOffer = async (payload: CreateOfferPayload) => {
    setError(null);
    try {
      await offersService.create(payload);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erreur lors de la soumission.");
      throw e;
    }
  };
 
  const acceptOffer = async (
    offerId: string,
    methode: MethodePaiement = MethodePaiement.CASH
  ) => {
    setError(null);
    try {
      const { data } = await offersService.accept(offerId, methode);
      return data.trajet_id as string;
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erreur lors de l'acceptation.");
      throw e;
    }
  };
 
  const rejectOffer = async (offerId: string) => {
    setError(null);
    try {
      await offersService.reject(offerId);
      setOffers((prev) => prev.filter((o) => o.id !== offerId));
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erreur lors du refus.");
      throw e;
    }
  };
 
  return {
    offers,
    myOffers,
    isLoading,
    error,
    fetchForLoad,
    fetchMyOffers,
    submitOffer,
    acceptOffer,
    rejectOffer,
  };
};