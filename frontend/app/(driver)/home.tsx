import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useRef, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import RNBottomSheet from "@gorhom/bottom-sheet";
import { LoadCard } from "@/components/loads/LoadCard";
import { OfferForm } from "@/components/offers/OfferForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/colors";
import { useLoads } from "@/hooks/useLoads";
import { useOffers } from "@/hooks/useOffers";
import { usersService } from "@/services/users.service";
import { useAuthStore } from "@/store/auth.store";
import { Load } from "@/types/load.types";
import { Vehicle } from "@/types/vehicule.type";
import { TypeMarchandise } from "@/types/load.types";
import { Filter } from "lucide-react-native";
 
const TYPE_FILTERS = ["Tous", ...Object.values(TypeMarchandise)];
 
export default function DriverHomeScreen() {
  const sheetRef = useRef<RNBottomSheet>(null!);
  const { user } = useAuthStore();
  const { availableLoads, isLoadingAvailable, fetchAvailable } = useLoads();
  const { submitOffer, isLoading: isSubmitting } = useOffers();
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeFilter, setActiveFilter] = useState("Tous");
 
  useEffect(() => {
    fetchAvailable();
    usersService.getMyVehicles().then(({ data }) => setVehicles(data.vehicules));
  }, []);
 
  const filteredLoads = activeFilter === "Tous"
    ? availableLoads
    : availableLoads.filter((l) => l.typeMarchandises === activeFilter);
 
  const handleOfferPress = (load: Load) => {
    setSelectedLoad(load);
    sheetRef.current?.expand();
  };
 
  const handleSubmitOffer = async (payload: any) => {
    await submitOffer(payload);
    sheetRef.current?.close();
  };
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 12, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Bonjour,</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>
          {user?.nom} 🚛
        </Text>
      </View>
 
      {/* Filters */}
      <FlatList
        horizontal
        data={TYPE_FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveFilter(item)}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              backgroundColor: activeFilter === item ? Colors.primary : Colors.surface,
              borderWidth: 1, borderColor: activeFilter === item ? Colors.primary : Colors.border,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "600",
              color: activeFilter === item ? "#fff" : Colors.textSecondary }}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
 
      {/* Loads list */}
      {isLoadingAvailable ? <Loader message="Recherche des charges..." /> : (
        <FlatList
          data={filteredLoads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LoadCard
              load={item}
              showStatus={false}
              onPress={() => handleOfferPress(item)}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isLoadingAvailable} onRefresh={() => fetchAvailable()} />}
          ListEmptyComponent={
            <EmptyState
              icon="🔍"
              title="Aucune charge disponible"
              description="Revenez plus tard, de nouvelles charges seront publiées."
            />
          }
        />
      )}
 
      {/* Offer sheet */}
      <BottomSheet sheetRef={sheetRef} snapPoints={["70%"]}>
        {selectedLoad && (
          <OfferForm
            chargeId={selectedLoad.id}
            vehicles={vehicles}
            onSubmit={handleSubmitOffer}
            isLoading={isSubmitting}
          />
        )}
      </BottomSheet>
    </View>
  );
}