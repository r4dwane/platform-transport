// app/(fleet)/driver-detail.tsx
// Shows a specific fleet driver's profile and assigned trucks.

import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Colors } from "@/constants/colors";
import { fleetService } from "@/services/fleet.service";
import {
  Phone,
  Mail,
  Star,
  Shield,
  Truck,
  Plus,
  Trash2,
  X,
  ChevronLeft,
  CheckCircle,
} from "lucide-react-native";

const VEHICLE_TYPES = ["MARAICHER", "CITERNE", "FRIGORIFIQUE"];
const VEHICLE_TYPE_LABELS: Record<string, string> = {
  MARAICHER: "Maraicher",
  CITERNE: "Citerne",
  FRIGORIFIQUE: "Frigorifique",
};
const VEHICLE_STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: Colors.success,
  EN_MISSION: Colors.warning,
  MAINTENANCE: Colors.error,
};

const emptyForm = {
  type: "MARAICHER",
  capaciteKg: "",
  capaciteM3: "",
  plaqueImmatriculation: "",
};

export default function DriverDetailScreen() {
  const { driverId } = useLocalSearchParams<{ driverId: string }>();
  const router = useRouter();

  const [driver, setDriver] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const setField = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const loadData = async () => {
    if (!driverId) return;
    setIsLoading(true);
    try {
      const [driverRes, vehiclesRes] = await Promise.all([
        fleetService.getDriver(driverId),
        fleetService.getDriverVehicles(driverId),
      ]);
      setDriver(driverRes.data);
      setVehicles(vehiclesRes.data.vehicules);
    } catch {
      Alert.alert("Erreur", "Impossible de charger les donnees.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [driverId]);

  const handleAddVehicle = async () => {
    const plaque = form.plaqueImmatriculation.trim().toUpperCase();
    const capaciteKg = Number(form.capaciteKg);
    const capaciteM3 = form.capaciteM3 ? Number(form.capaciteM3) : undefined;

    if (!plaque) {
      Alert.alert("Erreur", "La plaque d'immatriculation est requise.");
      return;
    }
    if (!Number.isFinite(capaciteKg) || capaciteKg <= 0) {
      Alert.alert("Erreur", "La capacite en kg est requise.");
      return;
    }
    if (capaciteM3 !== undefined && (!Number.isFinite(capaciteM3) || capaciteM3 <= 0)) {
      Alert.alert("Erreur", "La capacite en m3 doit etre superieure a 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      await fleetService.addVehicleToDriver(driverId, {
        type: form.type,
        capaciteKg,
        capaciteM3,
        plaqueImmatriculation: plaque,
      });
      setShowModal(false);
      setForm(emptyForm);
      await loadData();
      Alert.alert("Succes", "Vehicule ajoute avec succes.");
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail ?? "Erreur lors de l'ajout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveVehicle = (vehicle: any) => {
    Alert.alert(
      "Retirer le vehicule",
      `Retirer le ${VEHICLE_TYPE_LABELS[vehicle.type] ?? vehicle.type} (${vehicle.plaqueImmatriculation}) de ${driver?.nom} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: async () => {
            try {
              await fleetService.removeVehicleFromDriver(driverId, vehicle.id);
              await loadData();
            } catch (e: any) {
              Alert.alert(
                "Erreur",
                e?.response?.data?.detail ?? "Impossible de retirer le vehicule."
              );
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: Colors.textMuted }}>Chauffeur introuvable</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 20,
          paddingTop: 50,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.textPrimary }}>
          Profil du chauffeur
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <Card style={{ alignItems: "center", paddingVertical: 28 }}>
          <Avatar name={driver.nom} size={72} rating={driver.note} />
          <Text
            style={{
              fontSize: 20,
              fontWeight: "800",
              color: Colors.textPrimary,
              marginTop: 12,
            }}
          >
            {driver.nom}
          </Text>
          <View
            style={{
              backgroundColor: Colors.primary + "20",
              paddingHorizontal: 14,
              paddingVertical: 5,
              borderRadius: 20,
              marginTop: 6,
            }}
          >
            <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 13 }}>
              Chauffeur de Flotte
            </Text>
          </View>
          {driver.estVerifie && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
              <Shield size={14} color={Colors.success} />
              <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "600" }}>
                Compte verifie
              </Text>
            </View>
          )}
        </Card>

        <Card>
          <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 14 }}>
            Informations
          </Text>
          {[
            { icon: <Phone size={16} color={Colors.textMuted} />, label: "Telephone", value: driver.telephone },
            { icon: <Mail size={16} color={Colors.textMuted} />, label: "Email", value: driver.email },
            { icon: <Star size={16} color={Colors.warning} />, label: "Note", value: `${driver.note?.toFixed(1)} / 5.0` },
            {
              icon: <CheckCircle size={16} color={Colors.success} />,
              label: "Trajets completes",
              value: String(driver.trajets_completes ?? 0),
            },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: Colors.border,
                gap: 12,
              }}
            >
              {item.icon}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: Colors.textMuted }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.textPrimary }}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <Card>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary }}>
              Vehicules assignes ({vehicles.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowModal(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                backgroundColor: Colors.primary + "15",
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Plus size={14} color={Colors.primary} />
              <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 13 }}>
                Ajouter
              </Text>
            </TouchableOpacity>
          </View>

          {vehicles.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24, gap: 8 }}>
              <View style={{ backgroundColor: Colors.border + "50", padding: 16, borderRadius: 20 }}>
                <Truck size={32} color={Colors.textMuted} />
              </View>
              <Text style={{ color: Colors.textMuted, fontSize: 13, textAlign: "center" }}>
                Aucun vehicule assigne.{"\n"}
                Ajoutez un camion pour que ce chauffeur puisse prendre des missions.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {vehicles.map((v) => (
                <View
                  key={v.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    backgroundColor: Colors.background,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: Colors.border,
                  }}
                >
                  <View style={{ backgroundColor: Colors.primary + "15", padding: 10, borderRadius: 12 }}>
                    <Truck size={20} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontWeight: "700", fontSize: 14, color: Colors.textPrimary }}>
                        {VEHICLE_TYPE_LABELS[v.type] ?? v.type}
                      </Text>
                      <Badge
                        label={v.status}
                        color={VEHICLE_STATUS_COLORS[v.status] ?? Colors.textMuted}
                        size="sm"
                      />
                    </View>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                      {v.plaqueImmatriculation}
                    </Text>
                    <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                      {v.capaciteKg} kg
                      {v.capaciteM3 ? ` - ${v.capaciteM3} m3` : ""}
                    </Text>
                  </View>
                  {v.status !== "EN_MISSION" && (
                    <TouchableOpacity
                      onPress={() => handleRemoveVehicle(v)}
                      style={{ padding: 8, backgroundColor: Colors.error + "15", borderRadius: 10 }}
                    >
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={() => setShowModal(false)}
          />
          <View
            style={{
              backgroundColor: Colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              maxHeight: "85%",
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.textPrimary }}>
                Ajouter un vehicule
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View
                style={{
                  backgroundColor: Colors.primary + "10",
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Truck size={16} color={Colors.primary} />
                <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: "600", flex: 1 }}>
                  Ce vehicule sera assigne a {driver.nom}
                </Text>
              </View>

              <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
                Type de vehicule
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {VEHICLE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setField("type", type)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: form.type === type ? Colors.primary : Colors.border,
                      backgroundColor: form.type === type ? Colors.primary + "15" : Colors.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: form.type === type ? Colors.primary : Colors.textSecondary,
                      }}
                    >
                      {VEHICLE_TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Plaque d'immatriculation *"
                value={form.plaqueImmatriculation}
                onChangeText={(v) => setField("plaqueImmatriculation", v)}
                placeholder="Ex: 123-456-07"
                autoCapitalize="characters"
              />
              <Input
                label="Capacite (kg) *"
                value={form.capaciteKg}
                onChangeText={(v) => setField("capaciteKg", v)}
                placeholder="Ex: 5000"
                keyboardType="numeric"
              />
              <Input
                label="Capacite (m3) - optionnel"
                value={form.capaciteM3}
                onChangeText={(v) => setField("capaciteM3", v)}
                placeholder="Ex: 20"
                keyboardType="numeric"
              />

              <Button
                title="Enregistrer le vehicule"
                onPress={handleAddVehicle}
                isLoading={isSubmitting}
                style={{ marginTop: 8, marginBottom: 32 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
