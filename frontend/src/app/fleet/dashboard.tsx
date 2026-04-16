import { View, Text, ScrollView, RefreshControl } from "react-native";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import { useAuthStore } from "@/store/auth.store";
import { Users, Truck, Navigation, CheckCircle } from "lucide-react-native";
 
interface FleetStats {
  nb_chauffeurs: number;
  nb_vehicules_total: number;
  nb_vehicules_disponibles: number;
  nb_trajets_total: number;
  nb_trajets_en_cours: number;
}
 
export default function FleetDashboardScreen() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
 
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data } = await fleetService.getStats();
      setStats(data);
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => { fetchStats(); }, []);
 
  if (isLoading) return <Loader fullScreen message="Chargement du tableau de bord..." />;
 
  const statCards = [
    { label: "Chauffeurs", value: stats?.nb_chauffeurs ?? 0, icon: <Users size={22} color={Colors.primary} />, color: Colors.primary },
    { label: "Véhicules", value: stats?.nb_vehicules_total ?? 0, icon: <Truck size={22} color={Colors.info} />, color: Colors.info },
    { label: "Disponibles", value: stats?.nb_vehicules_disponibles ?? 0, icon: <CheckCircle size={22} color={Colors.success} />, color: Colors.success },
    { label: "En mission", value: stats?.nb_trajets_en_cours ?? 0, icon: <Navigation size={22} color={Colors.warning} />, color: Colors.warning },
  ];
 
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchStats} />}
    >
      {/* Header */}
      <View style={{ marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Tableau de bord</Text>
        <Text style={{ fontSize: 24, fontWeight: "800", color: Colors.textPrimary }}>
          {user?.nom}
        </Text>
      </View>
 
      {/* Stats grid */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {statCards.map((s) => (
          <Card key={s.label} style={{ width: "47%", alignItems: "center", paddingVertical: 20 }}>
            <View style={{ backgroundColor: s.color + "15", padding: 12, borderRadius: 14, marginBottom: 10 }}>
              {s.icon}
            </View>
            <Text style={{ fontSize: 28, fontWeight: "800", color: s.color }}>{s.value}</Text>
            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>{s.label}</Text>
          </Card>
        ))}
      </View>
 
      {/* Total trips */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Total trajets</Text>
            <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.textPrimary, marginTop: 4 }}>
              {stats?.nb_trajets_total ?? 0}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, color: Colors.textMuted }}>En cours</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.warning }}>
              {stats?.nb_trajets_en_cours ?? 0}
            </Text>
          </View>
        </View>
 
        {/* Progress bar */}
        {(stats?.nb_trajets_total ?? 0) > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" }}>
              <View style={{
                height: "100%",
                width: `${((stats?.nb_trajets_en_cours ?? 0) / (stats?.nb_trajets_total ?? 1)) * 100}%`,
                backgroundColor: Colors.warning, borderRadius: 4,
              }} />
            </View>
            <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 6 }}>
              {Math.round(((stats?.nb_trajets_en_cours ?? 0) / (stats?.nb_trajets_total ?? 1)) * 100)}% en cours
            </Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}