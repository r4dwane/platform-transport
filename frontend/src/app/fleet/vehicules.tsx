import { View, Text, FlatList, RefreshControl } from "react-native";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import { Vehicle } from "@/types/vehicule.type";
import { Truck } from "lucide-react-native";
 
const VEHICLE_STATUS_COLORS: Record<string, string> = {
  DISPONIBLE:  Colors.success,
  EN_MISSION:  Colors.warning,
  MAINTENANCE: Colors.error,
};
 
export default function FleetVehiclesScreen() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
 
  const fetchVehicles = async () => {
    setIsLoading(true);
    try {
      const { data } = await fleetService.getVehicles();
      setVehicles(data.vehicules);
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => { fetchVehicles(); }, []);
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>Véhicules</Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {vehicles.length} véhicule{vehicles.length !== 1 ? "s" : ""}
        </Text>
      </View>
 
      {isLoading ? <Loader message="Chargement..." /> : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={{ marginHorizontal: 16, marginTop: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ backgroundColor: Colors.primary + "15", padding: 12, borderRadius: 14 }}>
                  <Truck size={22} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", fontSize: 15, color: Colors.textPrimary }}>
                      {item.type}
                    </Text>
                    <Badge
                      label={item.status}
                      color={VEHICLE_STATUS_COLORS[item.status] ?? Colors.textMuted}
                      size="sm"
                    />
                  </View>
                  <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                    {item.plaqueImmatriculation}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                    Capacité : {item.capaciteKg} kg
                    {item.capaciteM3 ? ` · ${item.capaciteM3} m³` : ""}
                  </Text>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchVehicles} />}
          ListEmptyComponent={
            <EmptyState icon="🚛" title="Aucun véhicule" description="Ajoutez vos véhicules depuis votre profil." />
          }
        />
      )}
    </View>
  );
}