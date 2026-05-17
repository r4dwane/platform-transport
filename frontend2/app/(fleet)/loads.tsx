// app/(fleet)/loads.tsx
// Fleet owner sees all available loads on a map
// Can tap a load to assign it directly to a driver

import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, Dimensions
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { LeafletMap, MapMarker } from "@/components/map/LeafletMap";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import { formatPrice } from "@/utils/formatPrice";
import { MapPin, Weight, X, Zap } from "lucide-react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const TYPE_LABELS: Record<string, string> = {
  GENERAL: "Général", PERISSABLE: "Périssable", DANGEREUX: "Dangereux",
  FRAGILE: "Fragile", VOLUMINEUX: "Volumineux", LIQUIDE: "Liquide",
};

export default function FleetLoadsScreen() {
  const router = useRouter();
  const [loads, setLoads] = useState<any[]>([]);
  const [selectedLoad, setSelectedLoad] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fleetService.getAvailableLoads()
      .then(({ data }) => setLoads(data.charges))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const markers: MapMarker[] = loads.map((load) => ({
    id: load.id,
    latitude: load.coordEnlev?.coordinates?.[1] ?? 36.7538,
    longitude: load.coordEnlev?.coordinates?.[0] ?? 3.0588,
    title: `${formatPrice(load.prixPropose)} — ${load.poidsKg}kg`,
    color: selectedLoad?.id === load.id ? "green" : "orange",
    popup: load.adressEnlev,
  }));

  const handleMarkerTap = (markerId: string) => {
    const load = loads.find((l) => l.id === markerId);
    if (!load) return;
    setSelectedLoad(selectedLoad?.id === load.id ? null : load);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* Header */}
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>
          Charges disponibles
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {loads.length} charge{loads.length !== 1 ? "s" : ""} — appuyez sur un marqueur
        </Text>
      </View>

      {/* Map */}
      <View style={{ height: selectedLoad ? SCREEN_HEIGHT * 0.45 : SCREEN_HEIGHT * 0.72 }}>
        {isLoading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <LeafletMap
            center={{ latitude: 36.7538, longitude: 3.0588 }}
            zoom={6}
            markers={markers}
            onMarkerTap={handleMarkerTap}
            style={{ flex: 1 }}
          />
        )}
      </View>

      {/* Selected load detail */}
      {selectedLoad ? (
        <ScrollView style={{ flex: 1, backgroundColor: Colors.surface }}
          contentContainerStyle={{ padding: 16 }}>

          <View style={{ flexDirection: "row", justifyContent: "space-between",
            alignItems: "flex-start", marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.primary }}>
                {formatPrice(selectedLoad.prixPropose)}
              </Text>
              <Badge
                label={TYPE_LABELS[selectedLoad.typeMarchandises] ?? selectedLoad.typeMarchandises}
                color={Colors.primary} size="sm"
              />
            </View>
            <TouchableOpacity
              onPress={() => setSelectedLoad(null)}
              style={{ backgroundColor: Colors.border, width: 32, height: 32,
                borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 8, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <MapPin size={14} color={Colors.success} />
              <Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }}>
                {selectedLoad.adressEnlev}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <MapPin size={14} color={Colors.error} />
              <Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }}>
                {selectedLoad.adressLivr}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8,
            padding: 12, backgroundColor: Colors.background,
            borderRadius: 12, marginBottom: 16 }}>
            <Weight size={14} color={Colors.textMuted} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Poids :</Text>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.textPrimary }}>
              {selectedLoad.poidsKg} kg
            </Text>
          </View>

          {/* Assign button */}
          <TouchableOpacity
            onPress={() => router.push("/(fleet)/dashboard")}
            style={{
              backgroundColor: Colors.primary, padding: 16, borderRadius: 14,
              alignItems: "center", flexDirection: "row",
              justifyContent: "center", gap: 10,
              shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
            }}
          >
            <Zap size={20} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>
              Assigner cette charge
            </Text>
          </TouchableOpacity>

        </ScrollView>
      ) : (
        !isLoading && loads.length === 0 && (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
            <EmptyState
              icon="📦"
              title="Aucune charge disponible"
              description="Les charges publiées par les clients apparaîtront ici."
            />
          </View>
        )
      )}
    </View>
  );
}