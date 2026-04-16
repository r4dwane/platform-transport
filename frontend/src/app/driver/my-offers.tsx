import { View, Text, FlatList, RefreshControl } from "react-native";
import { useEffect } from "react";
import { OfferCard } from "@/components/offers/OfferCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useOffers } from "@/hooks/useOffers";
 
export default function DriverMyOffersScreen() {
  const { myOffers, isLoading, fetchMyOffers } = useOffers();
 
  useEffect(() => { fetchMyOffers(); }, []);
 
  const pending   = myOffers.filter((o) => o.status === "EN_ATTENTE");
  const accepted  = myOffers.filter((o) => o.status === "ACCEPTEE");
  const rejected  = myOffers.filter((o) => o.status === "REFUSEE");
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>Mes Offres</Text>
 
        {/* Mini stats */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
          {[
            { label: "En attente", count: pending.length, color: Colors.warning },
            { label: "Acceptées", count: accepted.length, color: Colors.success },
            { label: "Refusées", count: rejected.length, color: Colors.error },
          ].map((s) => (
            <View key={s.label} style={{ flex: 1, backgroundColor: s.color + "15",
              borderRadius: 10, padding: 10, alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: s.color }}>{s.count}</Text>
              <Text style={{ fontSize: 11, color: s.color, fontWeight: "600" }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>
 
      {isLoading ? <Loader message="Chargement..." /> : (
        <FlatList
          data={myOffers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <OfferCard offer={item} showActions={false} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchMyOffers} />}
          ListEmptyComponent={
            <EmptyState icon="📝" title="Aucune offre soumise"
              description="Parcourez les charges disponibles et soumettez une offre." />
          }
        />
      )}
    </View>
  );
}