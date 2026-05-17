import { View, Text, FlatList, RefreshControl } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useTrips } from "@/hooks/useTrips";
 
export default function DriverTripsScreen() {
  const router = useRouter();
  const { myTrips, isLoading, fetchMyTrips } = useTrips(false);
  const completed = myTrips.filter((t) => t.status === "LIVRE");
 
  useEffect(() => { fetchMyTrips(); }, []);
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>Historique</Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {completed.length} trajet{completed.length !== 1 ? "s" : ""} complété{completed.length !== 1 ? "s" : ""}
        </Text>
      </View>
 
      {isLoading ? <Loader message="Chargement..." /> : (
        <FlatList
          data={myTrips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TripCard trip={item}
              onPress={() => router.push({ pathname: "/(driver)/active-trip", params: { tripId: item.id } })} />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchMyTrips} />}
          ListEmptyComponent={
            <EmptyState icon="📋" title="Aucun trajet" description="Vos missions terminées apparaîtront ici." />
          }
        />
      )}
    </View>
  );
}
