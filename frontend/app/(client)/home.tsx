import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import RNBottomSheet from "@gorhom/bottom-sheet";
import { LoadCard } from "@/components/loads/LoadCard";
import { LoadForm } from "@/components/loads/LoadForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useLoads } from "@/hooks/useLoads";
import { useAuthStore } from "@/store/auth.store";
import { CreateLoadPayload } from "@/types/load.types";
 
export default function ClientHomeScreen() {
  const router = useRouter();
  const sheetRef = useRef<RNBottomSheet>(null!);
  const { user } = useAuthStore();
  const { myLoads, isLoadingMine, fetchMyLoads, createLoad } = useLoads();
 
  useEffect(() => { fetchMyLoads(); }, []);
 
  const handleCreate = async (payload: CreateLoadPayload) => {
    await createLoad(payload);
    sheetRef.current?.close();
  };
 
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ padding: 20, paddingBottom: 12, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Bonjour,</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>
          {user?.nom} 👋
        </Text>
      </View>
 
      {/* Stats bar */}
      <View style={{ flexDirection: "row", padding: 16, gap: 10 }}>
        {[
          { label: "Total", value: myLoads.length, color: Colors.primary },
          { label: "Actives", value: myLoads.filter(l => l.status === "DISPONIBLE").length, color: Colors.success },
          { label: "En mission", value: myLoads.filter(l => l.status === "EN_MISSION").length, color: Colors.info },
          { label: "Livrées", value: myLoads.filter(l => l.status === "LIVREE").length, color: Colors.textMuted },
        ].map((stat) => (
          <View key={stat.label} style={{ flex: 1, backgroundColor: Colors.surface,
            borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: stat.color }}>{stat.value}</Text>
            <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>{stat.label}</Text>
          </View>
        ))}
      </View>
 
      {/* List */}
      {isLoadingMine ? (
        <Loader message="Chargement de vos charges..." />
      ) : (
        <FlatList
          data={myLoads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LoadCard
              load={item}
              onPress={() => router.push({ pathname: "/(client)/offers", params: { loadId: item.id } })}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isLoadingMine} onRefresh={fetchMyLoads} />}
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="Aucune charge publiée"
              description="Publiez votre première charge pour recevoir des offres de chauffeurs."
              actionLabel="Publier une charge"
              onAction={() => sheetRef.current?.expand()}
            />
          }
        />
      )}
 
      {/* FAB */}
      <TouchableOpacity
        onPress={() => sheetRef.current?.expand()}
        style={{
          position: "absolute", bottom: 24, right: 24,
          backgroundColor: Colors.primary, width: 56, height: 56,
          borderRadius: 28, alignItems: "center", justifyContent: "center",
          shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
        }}
      >
        <Plus size={24} color="#fff" />
      </TouchableOpacity>
 
      <BottomSheet sheetRef={sheetRef} snapPoints={["85%"]}>
        <LoadForm onSubmit={handleCreate} />
      </BottomSheet>
    </View>
  );
}
 
