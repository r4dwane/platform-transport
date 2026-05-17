// app/(fleet)/dashboard.tsx
//
// Fleet owner dashboard with:
//   - Stats overview
//   - "Assigner une mission" — manually pick load + driver + vehicle
//   - "Optimiser la flotte" — run VRP algorithm, review suggestions, confirm

import {
  View, Text, ScrollView, RefreshControl,
  TouchableOpacity, Modal, FlatList, Alert, ActivityIndicator
} from "react-native";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import { useAuthStore } from "@/store/auth.store";
import {
  Users, Truck, Navigation, CheckCircle,
  Zap, Plus, X, ChevronRight, MapPin, Weight
} from "lucide-react-native";
import { formatPrice } from "@/utils/formatPrice";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

interface FleetStats {
  nb_chauffeurs: number;
  nb_vehicules_total: number;
  nb_vehicules_disponibles: number;
  nb_trajets_total: number;
  nb_trajets_en_cours: number;
}

interface OptimizationAssignment {
  load_id: string;
  driver_id: string;
  vehicle_id: string;
  driver_name: string;
  adress_enlev: string;
  adress_livr: string;
  poids_kg: number;
  prix_da: number;
  empty_km: number;
  loaded_km: number;
  total_km: number;
  efficiency_pct: number;
  eta_pickup_min: number;
}

// ─────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────

export default function FleetDashboardScreen() {
  const { user } = useAuthStore();

  // Stats
  const [stats, setStats]           = useState<FleetStats | null>(null);
  const [isLoading, setIsLoading]   = useState(true);

  // Manual assign modal
  const [showAssignModal, setShowAssignModal]   = useState(false);
  const [availableLoads, setAvailableLoads]     = useState<any[]>([]);
  const [fleetDrivers, setFleetDrivers]         = useState<any[]>([]);
  const [fleetVehicles, setFleetVehicles]       = useState<any[]>([]);
  const [selectedLoad, setSelectedLoad]         = useState<any | null>(null);
  const [selectedDriver, setSelectedDriver]     = useState<any | null>(null);
  const [selectedVehicle, setSelectedVehicle]   = useState<any | null>(null);
  const [isAssigning, setIsAssigning]           = useState(false);
  const [assignStep, setAssignStep]             = useState<1 | 2 | 3>(1);

  // Optimization
  const [showOptimizeModal, setShowOptimizeModal]   = useState(false);
  const [optimizeResult, setOptimizeResult]         = useState<any | null>(null);
  const [isOptimizing, setIsOptimizing]             = useState(false);
  const [isConfirmingAll, setIsConfirmingAll]       = useState(false);

  // ── Fetch stats ───────────────────────────────────────────────
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

  // ── Open assign modal — load all needed data ──────────────────
  const openAssignModal = async () => {
    setAssignStep(1);
    setSelectedLoad(null);
    setSelectedDriver(null);
    setSelectedVehicle(null);
    setShowAssignModal(true);

    try {
      const [loadsRes, driversRes, vehiclesRes] = await Promise.all([
        fleetService.getAvailableLoads(),
        fleetService.getDrivers(),
        fleetService.getVehicles(),
      ]);
      setAvailableLoads(loadsRes.data.charges);
      setFleetDrivers(driversRes.data.chauffeurs);
      setFleetVehicles(vehiclesRes.data.vehicules.filter((v: any) => v.status === "DISPONIBLE"));
    } catch (e) {
      Alert.alert("Erreur", "Impossible de charger les données.");
      setShowAssignModal(false);
    }
  };

  // ── Confirm manual assignment ─────────────────────────────────
  const confirmAssignment = async () => {
    if (!selectedLoad || !selectedDriver || !selectedVehicle) return;

    setIsAssigning(true);
    try {
      await fleetService.assignMission({
        load_id: selectedLoad.id,
        driver_id: selectedDriver.id,
        vehicle_id: selectedVehicle.id,
      });
      setShowAssignModal(false);
      await fetchStats();
      Alert.alert(
        "✅ Mission assignée",
        `${selectedDriver.nom} a été assigné à la charge de ${formatPrice(selectedLoad.prixPropose)}.`
      );
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail ?? "Erreur lors de l'assignation.");
    } finally {
      setIsAssigning(false);
    }
  };

  // ── Run optimization algorithm ────────────────────────────────
  const runOptimization = async () => {
    setIsOptimizing(true);
    setOptimizeResult(null);
    setShowOptimizeModal(true);
    try {
      const { data } = await fleetService.optimizeFleet();
      setOptimizeResult(data);
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail ?? "Erreur lors de l'optimisation.");
      setShowOptimizeModal(false);
    } finally {
      setIsOptimizing(false);
    }
  };

  // ── Confirm ALL optimization suggestions at once ──────────────
  const confirmAllAssignments = async () => {
    if (!optimizeResult?.assignments?.length) return;

    Alert.alert(
      "Confirmer toutes les assignations",
      `Voulez-vous assigner ${optimizeResult.assignments.length} mission(s) automatiquement ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer tout",
          onPress: async () => {
            setIsConfirmingAll(true);
            let successCount = 0;
            let errorCount = 0;

            for (const assignment of optimizeResult.assignments) {
              try {
                await fleetService.assignMission({
                  load_id: assignment.load_id,
                  driver_id: assignment.driver_id,
                  vehicle_id: assignment.vehicle_id,
                });
                successCount++;
              } catch {
                errorCount++;
              }
            }

            setIsConfirmingAll(false);
            setShowOptimizeModal(false);
            await fetchStats();

            Alert.alert(
              "Résultat",
              `✅ ${successCount} mission(s) assignée(s) avec succès.` +
              (errorCount > 0 ? `\n❌ ${errorCount} échec(s).` : "")
            );
          }
        }
      ]
    );
  };

  // ── Stats cards ───────────────────────────────────────────────
  const statCards = [
    { label: "Chauffeurs",  value: stats?.nb_chauffeurs ?? 0,          icon: <Users size={22} color={Colors.primary} />,  color: Colors.primary },
    { label: "Véhicules",   value: stats?.nb_vehicules_total ?? 0,     icon: <Truck size={22} color={Colors.info} />,     color: Colors.info },
    { label: "Disponibles", value: stats?.nb_vehicules_disponibles ?? 0, icon: <CheckCircle size={22} color={Colors.success} />, color: Colors.success },
    { label: "En mission",  value: stats?.nb_trajets_en_cours ?? 0,    icon: <Navigation size={22} color={Colors.warning} />, color: Colors.warning },
  ];

  if (isLoading) return <Loader fullScreen message="Chargement..." />;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchStats} />}
    >
      {/* Header */}
      <View>
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
            <Text style={{ fontSize: 28, fontWeight: "800", color: s.color }}>
              {String(s.value)}
            </Text>
            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 4 }}>{s.label}</Text>
          </Card>
        ))}
      </View>

      {/* Total trips progress */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Total trajets</Text>
            <Text style={{ fontSize: 32, fontWeight: "800", color: Colors.textPrimary, marginTop: 4 }}>
              {String(stats?.nb_trajets_total ?? 0)}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 13, color: Colors.textMuted }}>En cours</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: Colors.warning }}>
              {String(stats?.nb_trajets_en_cours ?? 0)}
            </Text>
          </View>
        </View>
        {(stats?.nb_trajets_total ?? 0) > 0 && (
          <View style={{ marginTop: 16 }}>
            <View style={{ height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" }}>
              <View style={{
                height: "100%",
                width: `${((stats?.nb_trajets_en_cours ?? 0) / (stats?.nb_trajets_total ?? 1)) * 100}%`,
                backgroundColor: Colors.warning, borderRadius: 4,
              }} />
            </View>
          </View>
        )}
      </Card>

      {/* Action buttons */}
      <View style={{ gap: 12 }}>
        {/* Manual assign */}
        <TouchableOpacity
          onPress={openAssignModal}
          style={{
            backgroundColor: Colors.primary,
            borderRadius: 16, padding: 18,
            flexDirection: "row", alignItems: "center", gap: 14,
            shadowColor: Colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
          }}
        >
          <View style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: 10, borderRadius: 12 }}>
            <Plus size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Assigner une mission
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 }}>
              Choisir manuellement charge + chauffeur
            </Text>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        {/* Auto optimize */}
        <TouchableOpacity
          onPress={runOptimization}
          style={{
            backgroundColor: Colors.secondary,
            borderRadius: 16, padding: 18,
            flexDirection: "row", alignItems: "center", gap: 14,
          }}
        >
          <View style={{ backgroundColor: "rgba(255,255,255,0.15)", padding: 10, borderRadius: 12 }}>
            <Zap size={22} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Optimiser la flotte
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 2 }}>
              Algorithme VRP — minimiser le kilométrage à vide
            </Text>
          </View>
          <ChevronRight size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* ── Manual Assign Modal ──────────────────────────────────── */}
      <Modal visible={showAssignModal} animationType="slide" onRequestClose={() => setShowAssignModal(false)}>
        <View style={{ flex: 1, backgroundColor: Colors.background }}>

          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            padding: 20, paddingTop: 50, backgroundColor: Colors.surface,
            borderBottomWidth: 1, borderBottomColor: Colors.border,
          }}>
            <TouchableOpacity onPress={() => setShowAssignModal(false)}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
              Assigner une mission
            </Text>
            <View style={{ flexDirection: "row", gap: 4 }}>
              {[1, 2, 3].map((s) => (
                <View key={s} style={{
                  width: 8, height: 8, borderRadius: 4,
                  backgroundColor: assignStep >= s ? Colors.primary : Colors.border,
                }} />
              ))}
            </View>
          </View>

          {/* Step 1: Choose load */}
          {assignStep === 1 && (
            <FlatList
              data={availableLoads}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListHeaderComponent={
                <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 }}>
                  1. Choisir une charge
                </Text>
              }
              ListEmptyComponent={
                <Text style={{ color: Colors.textMuted, textAlign: "center", marginTop: 40 }}>
                  Aucune charge disponible
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setSelectedLoad(item); setAssignStep(2); }}
                  style={{
                    backgroundColor: Colors.surface, borderRadius: 14,
                    padding: 14, marginBottom: 10,
                    borderWidth: 1, borderColor: Colors.border,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={{ fontWeight: "700", fontSize: 15, color: Colors.textPrimary }}>
                      {formatPrice(item.prixPropose)}
                    </Text>
                    <Badge label={item.typeMarchandises} color={Colors.primary} size="sm" />
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <MapPin size={12} color={Colors.success} />
                    <Text style={{ fontSize: 12, color: Colors.textSecondary }} numberOfLines={1}>
                      {item.adressEnlev}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                    <MapPin size={12} color={Colors.error} />
                    <Text style={{ fontSize: 12, color: Colors.textSecondary }} numberOfLines={1}>
                      {item.adressLivr}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Weight size={12} color={Colors.textMuted} />
                    <Text style={{ fontSize: 12, color: Colors.textMuted }}>{item.poidsKg} kg</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}

          {/* Step 2: Choose driver */}
          {assignStep === 2 && (
            <FlatList
              data={fleetDrivers}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListHeaderComponent={
                <View style={{ marginBottom: 12 }}>
                  <TouchableOpacity onPress={() => setAssignStep(1)} style={{ marginBottom: 8 }}>
                    <Text style={{ color: Colors.primary, fontWeight: "600" }}>← Retour</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
                    2. Choisir un chauffeur
                  </Text>
                </View>
              }
              ListEmptyComponent={
                <Text style={{ color: Colors.textMuted, textAlign: "center", marginTop: 40 }}>
                  Aucun chauffeur disponible
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { setSelectedDriver(item); setAssignStep(3); }}
                  style={{
                    backgroundColor: Colors.surface, borderRadius: 14,
                    padding: 14, marginBottom: 10,
                    borderWidth: 1, borderColor: Colors.border,
                    flexDirection: "row", alignItems: "center", gap: 12,
                  }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: Colors.primary,
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
                      {item.nom?.charAt(0)?.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", fontSize: 15, color: Colors.textPrimary }}>
                      {item.nom}
                    </Text>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary }}>{item.telephone}</Text>
                    <Text style={{ fontSize: 12, color: Colors.warning }}>
                      ⭐ {item.note?.toFixed(1)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            />
          )}

          {/* Step 3: Choose vehicle + confirm */}
          {assignStep === 3 && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <TouchableOpacity onPress={() => setAssignStep(2)} style={{ marginBottom: 12 }}>
                <Text style={{ color: Colors.primary, fontWeight: "600" }}>← Retour</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 }}>
                3. Choisir un véhicule
              </Text>

              {fleetVehicles
                .filter((v) => v.capaciteKg >= (selectedLoad?.poidsKg ?? 0))
                .map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    onPress={() => setSelectedVehicle(v)}
                    style={{
                      backgroundColor: selectedVehicle?.id === v.id
                        ? Colors.primary + "10" : Colors.surface,
                      borderRadius: 14, padding: 14, marginBottom: 10,
                      borderWidth: 2,
                      borderColor: selectedVehicle?.id === v.id
                        ? Colors.primary : Colors.border,
                      flexDirection: "row", alignItems: "center", gap: 12,
                    }}
                  >
                    <Truck size={20} color={selectedVehicle?.id === v.id ? Colors.primary : Colors.textMuted} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: "700", color: Colors.textPrimary }}>{v.type}</Text>
                      <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
                        {v.plaqueImmatriculation} — {v.capaciteKg} kg
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              }

              {fleetVehicles.filter((v) => v.capaciteKg >= (selectedLoad?.poidsKg ?? 0)).length === 0 && (
                <Text style={{ color: Colors.error, textAlign: "center", marginVertical: 20 }}>
                  Aucun véhicule avec capacité suffisante ({selectedLoad?.poidsKg} kg requis)
                </Text>
              )}

              {/* Summary before confirm */}
              {selectedVehicle && (
                <Card style={{ marginTop: 16, backgroundColor: Colors.primary + "08" }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 10 }}>
                    Récapitulatif
                  </Text>
                  {[
                    { label: "Charge", value: formatPrice(selectedLoad?.prixPropose) },
                    { label: "De", value: selectedLoad?.adressEnlev },
                    { label: "Vers", value: selectedLoad?.adressLivr },
                    { label: "Poids", value: `${selectedLoad?.poidsKg} kg` },
                    { label: "Chauffeur", value: selectedDriver?.nom },
                    { label: "Véhicule", value: selectedVehicle?.plaqueImmatriculation },
                  ].map((row) => (
                    <View key={row.label} style={{
                      flexDirection: "row", justifyContent: "space-between",
                      paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border,
                    }}>
                      <Text style={{ fontSize: 13, color: Colors.textMuted }}>{row.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textPrimary,
                        flex: 1, textAlign: "right" }} numberOfLines={1}>
                        {row.value}
                      </Text>
                    </View>
                  ))}
                </Card>
              )}

              <Button
                title="Confirmer l'assignation"
                onPress={confirmAssignment}
                isLoading={isAssigning}
                disabled={!selectedVehicle}
                style={{ marginTop: 20 }}
                size="lg"
              />
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* ── Optimization Result Modal ────────────────────────────── */}
      <Modal
        visible={showOptimizeModal}
        animationType="slide"
        onRequestClose={() => setShowOptimizeModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: Colors.background }}>

          {/* Header */}
          <View style={{
            flexDirection: "row", alignItems: "center", justifyContent: "space-between",
            padding: 20, paddingTop: 50, backgroundColor: Colors.surface,
            borderBottomWidth: 1, borderBottomColor: Colors.border,
          }}>
            <TouchableOpacity onPress={() => setShowOptimizeModal(false)}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
              Optimisation VRP
            </Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Loading */}
          {isOptimizing && (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ fontSize: 15, color: Colors.textSecondary }}>
                Calcul de l'optimisation...
              </Text>
              <Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 40 }}>
                Algorithme VRP en cours — minimisation du kilométrage à vide
              </Text>
            </View>
          )}

          {/* Results */}
          {!isOptimizing && optimizeResult && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>

              {/* Summary card */}
              {optimizeResult.assignments?.length > 0 && (
                <Card style={{ backgroundColor: Colors.success + "10", marginBottom: 16 }}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.success, marginBottom: 8 }}>
                    ✅ {optimizeResult.loads_assigned} assignation(s) optimisée(s)
                  </Text>
                  {optimizeResult.assignments[0]?.fleet_summary && (
                    <>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                        <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
                          Kilométrage à vide total
                        </Text>
                        <Text style={{ fontWeight: "700", color: Colors.error }}>
                          {optimizeResult.assignments[0].fleet_summary.total_empty_km} km
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                        <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>
                          Efficacité globale
                        </Text>
                        <Text style={{ fontWeight: "700", color: Colors.success }}>
                          {optimizeResult.assignments[0].fleet_summary.overall_efficiency_pct}%
                        </Text>
                      </View>
                    </>
                  )}
                </Card>
              )}

              {optimizeResult.assignments?.length === 0 && (
                <View style={{ alignItems: "center", padding: 40, gap: 12 }}>
                  <Text style={{ fontSize: 36 }}>🤔</Text>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
                    {optimizeResult.message}
                  </Text>
                </View>
              )}

              {/* Individual assignments */}
              {optimizeResult.assignments?.map((a: OptimizationAssignment, i: number) => (
                <Card key={a.load_id} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between",
                    alignItems: "center", marginBottom: 10 }}>
                    <Text style={{ fontWeight: "800", fontSize: 15, color: Colors.primary }}>
                      {formatPrice(a.prix_da)}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Badge
                        label={`${a.efficiency_pct}% efficace`}
                        color={a.efficiency_pct >= 60 ? Colors.success : Colors.warning}
                        size="sm"
                      />
                    </View>
                  </View>

                  <View style={{ gap: 4, marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MapPin size={12} color={Colors.success} />
                      <Text style={{ fontSize: 12, color: Colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        {a.adress_enlev}
                      </Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <MapPin size={12} color={Colors.error} />
                      <Text style={{ fontSize: 12, color: Colors.textSecondary, flex: 1 }} numberOfLines={1}>
                        {a.adress_livr}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between",
                    paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border }}>
                    <View>
                      <Text style={{ fontSize: 11, color: Colors.textMuted }}>Chauffeur</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.textPrimary }}>
                        {a.driver_name}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 11, color: Colors.textMuted }}>À vide</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.error }}>
                        {a.empty_km} km
                      </Text>
                    </View>
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ fontSize: 11, color: Colors.textMuted }}>Chargé</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.success }}>
                        {a.loaded_km} km
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={{ fontSize: 11, color: Colors.textMuted }}>ETA ramassage</Text>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.info }}>
                        ~{a.eta_pickup_min} min
                      </Text>
                    </View>
                  </View>
                </Card>
              ))}

              {/* Confirm all button */}
              {optimizeResult.assignments?.length > 0 && (
                <Button
                  title={`Confirmer toutes les ${optimizeResult.assignments.length} assignations`}
                  onPress={confirmAllAssignments}
                  isLoading={isConfirmingAll}
                  size="lg"
                  style={{ marginTop: 8, marginBottom: 40 }}
                />
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

    </ScrollView>
  );
}