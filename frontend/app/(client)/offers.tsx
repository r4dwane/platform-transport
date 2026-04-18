import { View, Text, FlatList, RefreshControl } from "react-native";
import { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { OfferCard } from "@/components/offers/OfferCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useOffers } from "@/hooks/useOffers";
import { MethodePaiement } from "@/types/payment.type";
import { useRouter } from "expo-router";
 
export default function ClientOffersScreen() {
  const { loadId } = useLocalSearchParams<{ loadId: string }>();
  const router = useRouter();
  const { offers, isLoading, fetchForLoad, acceptOffer, rejectOffer } = useOffers();
 
  useEffect(() => {
    if (loadId) fetchForLoad(loadId);
  }, [loadId]);
 
  const handleAccept = async (offerId: string) => {
    const tripId = await acceptOffer(offerId, MethodePaiement.CASH);
    if (tripId) router.push({ pathname: "/(client)/tracking", params: { tripId } });
  };
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>
          Offres reçues
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {offers.length} offre{offers.length !== 1 ? "s" : ""} disponible{offers.length !== 1 ? "s" : ""}
        </Text>
      </View>
 
      {isLoading ? (
        <Loader message="Chargement des offres..." />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <OfferCard
              offer={item}
              showActions
              onAccept={() => handleAccept(item.id)}
              onReject={() => rejectOffer(item.id)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={isLoading}
            onRefresh={() => loadId && fetchForLoad(loadId)} />}
          ListEmptyComponent={
            <EmptyState
              icon="🕐"
              title="Aucune offre pour l'instant"
              description="Les chauffeurs disponibles soumettront bientôt leurs offres."
            />
          }
        />
      )}
    </View>
  );
}
