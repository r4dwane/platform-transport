// app/(fleet)/trips.tsx
// Fleet owner sees all their drivers' missions — read only

import { View, Text, FlatList, RefreshControl } from "react-native";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { TripStatusStepper } from "@/components/trips/TripStatusStepper";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import { StatutTrajet } from "@/types/trip.type";
import { getTripStatusColor, getTripStatusLabel } from "@/utils/getStatusColor";
import { formatPrice } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { MapPin, User } from "lucide-react-native";

export default function FleetTripsScreen() {
  const [trips, setTrips] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      const [tripsRes, driversRes] = await Promise.all([
        fleetService.getTrips(),
        fleetService.getDrivers(),
      ]);
      setTrips(tripsRes.data.trajets);

      // Build a map of driverId → driverName for display
      const driverMap: Record<string, string> = {};
      driversRes.data.chauffeurs.forEach((d: any) => {
        driverMap[d.id] = d.nom;
      });
      setDrivers(driverMap);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTrips(); }, []);

  const active    = trips.filter((t) => t.status !== StatutTrajet.LIVRE);
  const completed = trips.filter((t) => t.status === StatutTrajet.LIVRE);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>
          Missions
        </Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning }} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: "600" }}>
              {active.length} en cours
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: "600" }}>
              {completed.length} terminées
            </Text>
          </View>
        </View>
      </View>

      {isLoading ? <Loader message="Chargement..." /> : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={{
              marginHorizontal: 16, marginTop: 12,
              borderLeftWidth: 4,
              borderLeftColor: getTripStatusColor(item.status as StatutTrajet),
            }}>
              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between",
                alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontWeight: "700", fontSize: 14, color: Colors.textPrimary }}>
                  Mission #{item.id.slice(-6).toUpperCase()}
                </Text>
                <Badge
                  label={getTripStatusLabel(item.status as StatutTrajet)}
                  color={getTripStatusColor(item.status as StatutTrajet)}
                  size="sm"
                />
              </View>

              {/* Driver name */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <User size={13} color={Colors.textMuted} />
                <Text style={{ fontSize: 13, color: Colors.textSecondary }}>
                  {drivers[item.chauffeurId] ?? "Chauffeur inconnu"}
                </Text>
              </View>

              {/* Status stepper — read only */}
              <TripStatusStepper currentStatus={item.status as StatutTrajet} />

              {/* Footer */}
              <View style={{ flexDirection: "row", justifyContent: "space-between",
                paddingTop: 12, marginTop: 8,
                borderTopWidth: 1, borderTopColor: Colors.border }}>
                <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                  {item.debutAt ? formatDate(item.debutAt) : formatDate(item.createdAt)}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.primary }}>
                  {formatPrice(item.infoPaiement?.montant ?? 0)}
                </Text>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchTrips} />}
          ListEmptyComponent={
            <EmptyState icon="📋" title="Aucune mission"
              description="Les missions de votre flotte apparaîtront ici." />
          }
        />
      )}
    </View>
  );
}