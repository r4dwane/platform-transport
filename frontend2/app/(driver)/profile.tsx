import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, FlatList, Modal
} from "react-native";
import { useState, useEffect } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/constants/api";
import { usersService } from "@/services/users.service";
import { Vehicle, TypeVehicule } from "@/types/vehicule.type";
import {
  LogOut, Star, Phone, Mail, Shield,
  Truck, Plus, X
} from "lucide-react-native";

const VEHICLE_TYPES = Object.values(TypeVehicule);

const VEHICLE_STATUS_COLORS: Record<string, string> = {
  DISPONIBLE:  Colors.success,
  EN_MISSION:  Colors.warning,
  MAINTENANCE: Colors.error,
};

const emptyVehicleForm = {
  type: TypeVehicule.MARAICHER,
  capaciteKg: "",
  capaciteM3: "",
  plaqueImmatriculation: "",
};

export default function DriverProfileScreen() {
  const { user, role, logout } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState(emptyVehicleForm);

  const setField = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const fetchVehicles = async () => {
    setIsLoadingVehicles(true);
    try {
      const { data } = await usersService.getMyVehicles();
      setVehicles(data.vehicules);
    } catch (e) {
      console.log("Fetch vehicles error:", e);
    } finally {
      setIsLoadingVehicles(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, []);

  const handleAddVehicle = async () => {
    if (!form.plaqueImmatriculation || !form.capaciteKg) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setIsSubmitting(true);
    try {
      await usersService.registerVehicle({
        type: form.type,
        capaciteKg: parseFloat(form.capaciteKg),
        capaciteM3: form.capaciteM3 ? parseFloat(form.capaciteM3) : undefined,
        plaqueImmatriculation: form.plaqueImmatriculation,
        position: { type: "Point", coordinates: [0, 0] },
      });
      setShowVehicleModal(false);
      setForm(emptyVehicleForm);
      await fetchVehicles();
      Alert.alert("Succès", "Véhicule enregistré avec succès !");
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail ?? "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = (vehicleId: string, currentStatus: string) => {
  const statuses = ["DISPONIBLE", "EN_MISSION", "MAINTENANCE"].filter(
    (s) => s !== currentStatus
  );

  Alert.alert(
    "Changer le statut",
    "Sélectionnez un nouveau statut :",
    [
      ...statuses.map((s) => ({
        text: s,
        onPress: async () => {
          try {
            await usersService.updateVehicleStatus(vehicleId, s);
            await fetchVehicles();
          } catch (e) {
            Alert.alert("Erreur", "Impossible de mettre à jour le statut.");
          }
        },
      })),
      { text: "Annuler", style: "cancel" as const },
    ]
  );
};

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: logout },
    ]);
  };

  if (!user) return null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      {/* Avatar + name */}
      <Card style={{ alignItems: "center", paddingVertical: 28 }}>
        <Avatar name={user.nom} size={72} rating={user.note} />
        <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.textPrimary, marginTop: 12 }}>
          {user.nom}
        </Text>
        <View style={{ backgroundColor: Colors.primary + "20", paddingHorizontal: 14,
          paddingVertical: 5, borderRadius: 20, marginTop: 6 }}>
          <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 13 }}>
            {role ? ROLE_LABELS[role] : ""}
          </Text>
        </View>
        {user.estVerifie && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
            <Shield size={14} color={Colors.success} />
            <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "600" }}>
              Compte vérifié
            </Text>
          </View>
        )}
      </Card>

      {/* Personal info */}
      <Card>
        <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 14 }}>
          Informations
        </Text>
        {[
          { icon: <Phone size={16} color={Colors.textMuted} />, label: "Téléphone", value: user.telephone },
          { icon: <Mail size={16} color={Colors.textMuted} />, label: "Email", value: user.email },
          { icon: <Star size={16} color={Colors.warning} />, label: "Note", value: `${user.note.toFixed(1)} / 5.0` },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center",
            paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 12 }}>
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

      {/* Vehicles */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between",
          alignItems: "center", marginBottom: 14 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary }}>
            Mes Véhicules ({vehicles.length})
          </Text>
          <TouchableOpacity
            onPress={() => setShowVehicleModal(true)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: Colors.primary + "15", paddingHorizontal: 12,
              paddingVertical: 6, borderRadius: 20 }}
          >
            <Plus size={14} color={Colors.primary} />
            <Text style={{ color: Colors.primary, fontWeight: "700", fontSize: 13 }}>
              Ajouter
            </Text>
          </TouchableOpacity>
        </View>

        {vehicles.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 20 }}>
            <Text style={{ fontSize: 32 }}>🚛</Text>
            <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 8, textAlign: "center" }}>
              Aucun véhicule enregistré.{"\n"}Ajoutez votre camion pour soumettre des offres.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {vehicles.map((vehicle) => (
              <TouchableOpacity
                key={vehicle.id}
                onPress={() => handleUpdateStatus(vehicle.id, vehicle.status)}
                style={{ flexDirection: "row", alignItems: "center", gap: 12,
                  padding: 12, backgroundColor: Colors.background,
                  borderRadius: 12, borderWidth: 1, borderColor: Colors.border }}
              >
                <View style={{ backgroundColor: Colors.primary + "15",
                  padding: 10, borderRadius: 12 }}>
                  <Truck size={20} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between",
                    alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", fontSize: 14, color: Colors.textPrimary }}>
                      {vehicle.type}
                    </Text>
                    <Badge
                      label={vehicle.status}
                      color={VEHICLE_STATUS_COLORS[vehicle.status] ?? Colors.textMuted}
                      size="sm"
                    />
                  </View>
                  <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 2 }}>
                    {vehicle.plaqueImmatriculation}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
                    {vehicle.capaciteKg} kg
                    {vehicle.capaciteM3 ? ` · ${vehicle.capaciteM3} m³` : ""}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center",
          gap: 10, padding: 16, backgroundColor: Colors.error + "15",
          borderRadius: 14, borderWidth: 1, borderColor: Colors.error + "30" }}
      >
        <LogOut size={18} color={Colors.error} />
        <Text style={{ color: Colors.error, fontWeight: "700", fontSize: 15 }}>
          Se déconnecter
        </Text>
      </TouchableOpacity>

      {/* Add Vehicle Modal */}
      <Modal
        visible={showVehicleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVehicleModal(false)}
      >
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }}
            onPress={() => setShowVehicleModal(false)}
          />
          <View style={{ backgroundColor: Colors.surface, borderTopLeftRadius: 24,
            borderTopRightRadius: 24, padding: 24, maxHeight: "85%" }}>

            {/* Modal header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between",
              alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.textPrimary }}>
                Ajouter un véhicule
              </Text>
              <TouchableOpacity onPress={() => setShowVehicleModal(false)}>
                <X size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Vehicle type selector */}
              <Text style={{ fontSize: 13, fontWeight: "600",
                color: Colors.textSecondary, marginBottom: 8 }}>
                Type de véhicule
              </Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {VEHICLE_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setForm((p) => ({ ...p, type }))}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: form.type === type ? Colors.primary : Colors.border,
                      backgroundColor: form.type === type ? Colors.primary + "15" : Colors.surface,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600",
                      color: form.type === type ? Colors.primary : Colors.textSecondary }}>
                      {type}
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
                label="Capacité (kg) *"
                value={form.capaciteKg}
                onChangeText={(v) => setField("capaciteKg", v)}
                placeholder="Ex: 5000"
                keyboardType="numeric"
              />
              <Input
                label="Capacité (m³) — optionnel"
                value={form.capaciteM3}
                onChangeText={(v) => setField("capaciteM3", v)}
                placeholder="Ex: 20"
                keyboardType="numeric"
              />

              <Button
                title="Enregistrer le véhicule"
                onPress={handleAddVehicle}
                isLoading={isSubmitting}
                style={{ marginTop: 8, marginBottom: 32 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}