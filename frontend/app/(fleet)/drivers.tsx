import { View, Text, FlatList, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import { User } from "@/types/user.types";
import { Trash2, Star } from "lucide-react-native";
 
export default function FleetDriversScreen() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
 
  const fetchDrivers = async () => {
    setIsLoading(true);
    try {
      const { data } = await fleetService.getDrivers();
      setDrivers(data.chauffeurs);
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => { fetchDrivers(); }, []);
 
  const handleRemove = (driver: User) => {
    Alert.alert(
      "Retirer le chauffeur",
      `Voulez-vous retirer ${driver.nom} de votre flotte ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer", style: "destructive",
          onPress: async () => {
            await fleetService.removeDriver(driver.id);
            setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
          },
        },
      ]
    );
  };
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>Chauffeurs</Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {drivers.length} chauffeur{drivers.length !== 1 ? "s" : ""} dans la flotte
        </Text>
      </View>
 
      {isLoading ? <Loader message="Chargement..." /> : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={{ marginHorizontal: 16, marginTop: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Avatar name={item.nom} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 15, color: Colors.textPrimary }}>
                    {item.nom}
                  </Text>
                  <Text style={{ fontSize: 13, color: Colors.textSecondary }}>{item.telephone}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Star size={12} color={Colors.warning} />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.textSecondary }}>
                      {item.note.toFixed(1)}
                    </Text>
                    {item.estVerifie && (
                      <Badge label="Vérifié" color={Colors.success} size="sm" />
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemove(item)}
                  style={{ padding: 8, backgroundColor: Colors.error + "15", borderRadius: 10 }}>
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </Card>
          )}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchDrivers} />}
          ListEmptyComponent={
            <EmptyState icon="👤" title="Aucun chauffeur"
              description="Vos chauffeurs apparaîtront ici une fois enregistrés." />
          }
        />
      )}
    </View>
  );
}