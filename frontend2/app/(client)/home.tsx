import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { LoadCard } from "@/components/loads/LoadCard";
import { LoadForm } from "@/components/loads/LoadForm";
import { LoadEditForm } from "@/components/loads/LoadEditForm";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useLoads } from "@/hooks/useLoads";
import { useAuthStore } from "@/store/auth.store";
import { CreateLoadPayload, Load, StatutCharge } from "@/types/load.types";
import { loadsService } from "@/services/loads.service";
 
export default function ClientHomeScreen() {
  const router = useRouter();
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [showEditSheet, setShowEditSheet]     = useState(false);
  const [editingLoad, setEditingLoad]         = useState<Load | null>(null);
  const [isUpdating, setIsUpdating]           = useState(false);
  const { user } = useAuthStore();
  const { myLoads, isLoadingMine, fetchMyLoads, createLoad, cancelLoad } = useLoads();
  const STATUS_ORDER: Record<string, number> = {
      DISPONIBLE: 0,
      RESERVEE:   1,
      EN_MISSION: 2,
      ANNULEE:    3,
      LIVREE:     4,
    };

  const sortedLoads = [...myLoads].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5)
  );
  
  useEffect(() => { fetchMyLoads(); }, []);
 
  const handleCreate = async (payload: CreateLoadPayload) => {
    await createLoad(payload);
    setShowCreateSheet(false);
  };
 
  const handleEdit = (load: Load) => {
    setEditingLoad(load);
    setShowEditSheet(true);
  };
 
  const handleUpdate = async (payload: any) => {
    if (!editingLoad) return;
    setIsUpdating(true);
    try {
      await loadsService.update(editingLoad.id, payload);
      setShowEditSheet(false);
      setEditingLoad(null);
      await fetchMyLoads();
      Alert.alert("✅ Succès", "Charge mise à jour avec succès.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail ?? "Erreur lors de la mise à jour.");
    } finally {
      setIsUpdating(false);
    }
  };
 
  const handleCancel = (load: Load) => {
    Alert.alert(
      "Annuler la charge",
      "Confirmer l'annulation de cette charge ?",
      [
        { text: "Non", style: "cancel" },
        { text: "Oui", style: "destructive", onPress: () => cancelLoad(load.id) },
      ]
    );
  };
 
  const stats = [
    { label: "Total",      value: myLoads.length,                                            color: Colors.primary },
    { label: "Actives",    value: myLoads.filter(l => l.status === "DISPONIBLE").length,     color: Colors.success },
    { label: "En mission", value: myLoads.filter(l => l.status === "EN_MISSION").length,     color: Colors.info },
    { label: "Livrées",    value: myLoads.filter(l => l.status === "LIVREE").length,         color: Colors.textMuted },
  ];
 
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
 
      {/* Stats */}
      <View style={{ flexDirection: "row", padding: 16, gap: 10 }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ flex: 1, backgroundColor: Colors.surface,
            borderRadius: 12, padding: 12, alignItems: "center",
            borderWidth: 1, borderColor: Colors.border }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: stat.color }}>
              {String(stat.value)}
            </Text>
            <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
 
      {/* List */}
      {isLoadingMine ? (
        <Loader message="Chargement de vos charges..." />
      ) : (
        <FlatList
          data={sortedLoads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LoadCard
              load={item}
              onPress={() => router.push({
                pathname: "/(client)/offers",
                params: { loadId: item.id },
              })}
              onCancel={item.status === StatutCharge.DISPONIBLE
                ? () => handleCancel(item)
                : undefined
              }
              onEdit={item.status === StatutCharge.DISPONIBLE
                ? () => handleEdit(item)
                : undefined
              }
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isLoadingMine} onRefresh={fetchMyLoads} />}
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="Aucune charge publiée"
              description="Publiez votre première charge pour recevoir des offres."
              actionLabel="Publier une charge"
              onAction={() => setShowCreateSheet(true)}
            />
          }
        />
      )}
 
      {/* FAB */}
      <TouchableOpacity
        onPress={() => setShowCreateSheet(true)}
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
 
      {/* Create load sheet */}
      <BottomSheet visible={showCreateSheet} onClose={() => setShowCreateSheet(false)}>
        <LoadForm onSubmit={handleCreate} />
      </BottomSheet>
 
      {/* Edit load sheet */}
      <BottomSheet visible={showEditSheet} onClose={() => {
        setShowEditSheet(false);
        setEditingLoad(null);
      }}>
        {editingLoad && (
          <LoadEditForm
            load={editingLoad}
            onSubmit={handleUpdate}
            isLoading={isUpdating}
          />
        )}
      </BottomSheet>
 
    </View>
  );
}