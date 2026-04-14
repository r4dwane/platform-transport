import { Colors } from "@/constants/colors";
import { StatutCharge } from "@/types/load.types";
import { StatutTrajet } from "@/types/trip.type";
 
export const getLoadStatusColor = (status: StatutCharge): string => {
  return Colors.status[status] ?? Colors.textMuted;
};
 
export const getTripStatusColor = (status: StatutTrajet): string => {
  return Colors.trip[status] ?? Colors.textMuted;
};
 
export const getLoadStatusLabel = (status: StatutCharge): string => {
  const labels: Record<StatutCharge, string> = {
    DISPONIBLE: "Disponible",
    RESERVEE:   "Réservée",
    EN_MISSION: "En mission",
    LIVREE:     "Livrée",
    ANNULEE:    "Annulée",
  };
  return labels[status] ?? status;
};
 
export const getTripStatusLabel = (status: StatutTrajet): string => {
  const labels: Record<StatutTrajet, string> = {
    PLANIFIE:             "Planifié",
    EN_ROUTE_RAMASSAGE:   "En route (ramassage)",
    CHARGEMENT:           "Chargement",
    EN_ROUTE_LIVRAISON:   "En route (livraison)",
    LIVRE:                "Livré ✓",
  };
  return labels[status] ?? status;
};