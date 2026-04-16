import { View, Text, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { LiveMap } from "@/components/map/LiveMap";
import { TripStatusStepper } from "@/components/trips/TripStatusStepper";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useTrips } from "@/hooks/useTrips";
import { useTracking } from "@/hooks/useTracking";
import { useAuthStore } from "@/store/auth.store";
import { StatutTrajet } from "@/types/trip.type";
import { formatPrice } from "@/utils/formatPrice";
 
export default function ClientTrackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const { user } = useAuthStore();
  const { activeTrip, selectedTrip, fetchById, fetchMyTrips } = useTrips(false);
 
  const currentTrip = tripId ? selectedTrip : activeTrip;
 
  useEffect(() => {
    if (tripId) fetchById(tripId);
    else fetchMyTrips();
  }, [tripId]);
 
  const { driverLocation } = useTracking(currentTrip?.id ?? null, user?.id ?? null);
 
  if (!currentTrip) {
    return <Loader fullScreen message="Chargement du trajet..." />;
  }
 
  const pickupCoords  = { latitude: 36.7538, longitude: 3.0588 }; // Use actual load coords
  const dropoffCoords = { latitude: 36.1922, longitude: 5.4133 };
  const driverCoords  = driverLocation
    ? { latitude: driverLocation.lat, longitude: driverLocation.lon }
    : null;
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Map */}
      <View style={{ height: 300 }}>
        <LiveMap
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          driverCoords={driverCoords}
          driverName="Chauffeur"
        />
      </View>
 
      {/* Details */}
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 16 }}>
            Progression du trajet
          </Text>
          <TripStatusStepper currentStatus={currentTrip.status as StatutTrajet} />
        </Card>
 
        <Card>
          <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 }}>
            Paiement
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: Colors.textSecondary }}>Montant</Text>
            <Text style={{ fontWeight: "700", color: Colors.primary }}>
              {formatPrice(currentTrip.infoPaiement.montant)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: Colors.textSecondary }}>Méthode</Text>
            <Text style={{ fontWeight: "600", color: Colors.textPrimary }}>
              {currentTrip.infoPaiement.methode}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: Colors.textSecondary }}>Statut</Text>
            <Text style={{
              fontWeight: "600",
              color: currentTrip.infoPaiement.status === "PAYE" ? Colors.success : Colors.warning,
            }}>
              {currentTrip.infoPaiement.status}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}