// ─── (fleet)/trips.tsx ───────────────────────────────────────────────────────
import { View, Text, FlatList, RefreshControl } from "react-native";
import { useEffect, useState } from "react";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import { Trip } from "@/types/trip.type";
 
export default function FleetTripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
 
  const fetchTrips = async () => {
    setIsLoading(true);
    try {
      const { data } = await fleetService.getTrips();
      setTrips(data.trajets);
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => { fetchTrips(); }, []);
 
  const active    = trips.filter((t) => t.status !== "LIVRE");
  const completed = trips.filter((t) => t.status === "LIVRE");
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>Trajets</Text>
        <View style={{ flexDirection: "row", gap: 16, marginTop: 8 }}>
          <Text style={{ fontSize: 13, color: Colors.warning, fontWeight: "600" }}>
            {active.length} en cours
          </Text>
          <Text style={{ fontSize: 13, color: Colors.success, fontWeight: "600" }}>
            {completed.length} terminés
          </Text>
        </View>
      </View>
 
      {isLoading ? <Loader message="Chargement..." /> : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TripCard trip={item} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchTrips} />}
          ListEmptyComponent={
            <EmptyState icon="📋" title="Aucun trajet" description="Les trajets de votre flotte apparaîtront ici." />
          }
        />
      )}
    </View>
  );
}