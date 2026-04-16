import { View, Text, ScrollView, Alert } from "react-native";
import { useEffect } from "react";
import { TripStatusStepper } from "@/components/trips/TripStatusStepper";
import { LiveMap } from "@/components/map/LiveMap";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useTrips } from "@/hooks/useTrips";
import { useDriverTracking } from "@/hooks/useTracking";
import { useAuthStore } from "@/store/auth.store";
import { StatutTrajet } from "@/types/trip.type";
import { getTripStatusLabel } from "@/utils/getStatusColor";
import { formatPrice } from "@/utils/formatPrice";
import { Navigation } from "lucide-react-native";
 
const NEXT_ACTION_LABELS: Partial<Record<StatutTrajet, string>> = {
  [StatutTrajet.PLANIFIE]:            "Démarrer vers le ramassage",
  [StatutTrajet.EN_ROUTE_RAMASSAGE]:  "Confirmer l'arrivée au ramassage",
  [StatutTrajet.CHARGEMENT]:          "Chargement terminé — Partir",
  [StatutTrajet.EN_ROUTE_LIVRAISON]:  "Confirmer la livraison",
};
 
export default function ActiveTripScreen() {
  const { user } = useAuthStore();
  const { activeTrip, isLoading, fetchMyTrips, advanceStatus } = useTrips(false);
 
  useEffect(() => { fetchMyTrips(); }, []);
 
  // Send GPS while on the move
  useDriverTracking(
    activeTrip?.status === StatutTrajet.EN_ROUTE_RAMASSAGE ||
    activeTrip?.status === StatutTrajet.EN_ROUTE_LIVRAISON
      ? activeTrip?.id ?? null
      : null
  );
 
  const handleAdvance = () => {
    if (!activeTrip) return;
    const label = NEXT_ACTION_LABELS[activeTrip.status as StatutTrajet];
    Alert.alert("Confirmer", label ?? "Avancer le statut ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", onPress: () => advanceStatus(activeTrip.id) },
    ]);
  };
 
  if (isLoading) return <Loader fullScreen message="Chargement de la mission..." />;
 
  if (!activeTrip) {
    return (
      <EmptyState
        icon="✅"
        title="Aucune mission active"
        description="Vous n'avez pas de trajet en cours. Soumettez une offre pour commencer."
      />
    );
  }
 
  const pickupCoords  = { latitude: 36.7538, longitude: 3.0588 };
  const dropoffCoords = { latitude: 36.1922, longitude: 5.4133 };
  const nextAction    = NEXT_ACTION_LABELS[activeTrip.status as StatutTrajet];
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Map */}
      <View style={{ height: 260 }}>
        <LiveMap pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} />
      </View>
 
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* Current status */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ backgroundColor: Colors.primary + "15", padding: 10, borderRadius: 12 }}>
              <Navigation size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>Statut actuel</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
                {getTripStatusLabel(activeTrip.status as StatutTrajet)}
              </Text>
            </View>
          </View>
 
          <TripStatusStepper currentStatus={activeTrip.status as StatutTrajet} />
        </Card>
 
        {/* Payment info */}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Rémunération</Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.primary }}>
              {formatPrice(activeTrip.infoPaiement.montant)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
            Méthode : {activeTrip.infoPaiement.methode}
          </Text>
        </Card>
 
        {/* Advance button */}
        {nextAction && (
          <Button
            title={nextAction}
            onPress={handleAdvance}
            size="lg"
            style={{ marginTop: 4 }}
          />
        )}
 
        {activeTrip.status === StatutTrajet.LIVRE && !activeTrip.proofOfDelivery && (
          <Button
            title="📸 Soumettre preuve de livraison"
            variant="outline"
            onPress={() => {/* open camera */}}
          />
        )}
      </ScrollView>
    </View>
  );
}