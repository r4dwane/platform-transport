import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { TypeMarchandise, TypeMarche, CreateLoadPayload } from "@/types/load.types";
import { MapLocationPicker, PickedLocation } from "@/components/map/MapLocationPicker";
import { MapPin, Weight, DollarSign, Globe, Truck } from "lucide-react-native";

const TYPE_OPTIONS: { value: TypeMarchandise; label: string; emoji: string }[] = [
  { value: TypeMarchandise.GENERAL,    label: "Général",    emoji: "📦" },
  { value: TypeMarchandise.PERISSABLE, label: "Périssable", emoji: "🥦" },
  { value: TypeMarchandise.DANGEREUX,  label: "Dangereux",  emoji: "⚠️" },
  { value: TypeMarchandise.FRAGILE,    label: "Fragile",    emoji: "🔮" },
  { value: TypeMarchandise.VOLUMINEUX, label: "Volumineux", emoji: "🪨" },
  { value: TypeMarchandise.LIQUIDE,    label: "Liquide",    emoji: "💧" },
];

interface LoadFormProps {
  onSubmit: (payload: CreateLoadPayload) => Promise<void>;
  isLoading?: boolean;
}

export const LoadForm = ({ onSubmit, isLoading }: LoadFormProps) => {
  const [poidsKg, setPoidsKg]         = useState("");
  const [prixPropose, setPrixPropose] = useState("");
  const [description, setDescription] = useState("");
  const [typeMarchandises, setType]   = useState<TypeMarchandise>(TypeMarchandise.GENERAL);
  const [marche, setMarche]           = useState<TypeMarche>(TypeMarche.OUVERT);
  const [pickupLocation, setPickupLocation]   = useState<PickedLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<PickedLocation | null>(null);
  const [showPickupPicker, setShowPickupPicker]   = useState(false);
  const [showDropoffPicker, setShowDropoffPicker] = useState(false);

  const handleSubmit = async () => {
    if (!pickupLocation) {
      Alert.alert("Champ manquant", "Veuillez choisir le point d'enlèvement."); return;
    }
    if (!dropoffLocation) {
      Alert.alert("Champ manquant", "Veuillez choisir le point de livraison."); return;
    }
    if (!poidsKg || isNaN(parseFloat(poidsKg)) || parseFloat(poidsKg) <= 0) {
      Alert.alert("Champ manquant", "Veuillez entrer un poids valide."); return;
    }
    if (!prixPropose || isNaN(parseFloat(prixPropose)) || parseFloat(prixPropose) <= 0) {
      Alert.alert("Champ manquant", "Veuillez entrer un prix valide."); return;
    }

    await onSubmit({
      poidsKg:          parseFloat(poidsKg),
      typeMarchandises,
      marche,
      description:      description || undefined,
      adressEnlev:      pickupLocation.address,
      coordEnlev:       { type: "Point", coordinates: [pickupLocation.longitude, pickupLocation.latitude] },
      adressLivr:       dropoffLocation.address,
      coordLivr:        { type: "Point", coordinates: [dropoffLocation.longitude, dropoffLocation.latitude] },
      prixPropose:      parseFloat(prixPropose),
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.textPrimary, marginBottom: 20 }}>
        Publier une charge
      </Text>

      {/* ── Market type selector ───────────────────────── */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 10 }}>
        Type de marché
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>

        {/* OUVERT card */}
        <TouchableOpacity
          onPress={() => setMarche(TypeMarche.OUVERT)}
          style={{
            flex: 1, padding: 14, borderRadius: 14, borderWidth: 2,
            borderColor: marche === TypeMarche.OUVERT ? Colors.primary : Colors.border,
            backgroundColor: marche === TypeMarche.OUVERT ? Colors.primary + "10" : Colors.surface,
            alignItems: "center", gap: 6,
          }}
        >
          <Globe size={22} color={marche === TypeMarche.OUVERT ? Colors.primary : Colors.textMuted} />
          <Text style={{ fontWeight: "800", fontSize: 13,
            color: marche === TypeMarche.OUVERT ? Colors.primary : Colors.textPrimary }}>
            Marché Ouvert
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, textAlign: "center", lineHeight: 15 }}>
            Chauffeurs indépendants soumettent des offres
          </Text>
        </TouchableOpacity>

        {/* FLOTTE card */}
        <TouchableOpacity
          onPress={() => setMarche(TypeMarche.FLOTTE)}
          style={{
            flex: 1, padding: 14, borderRadius: 14, borderWidth: 2,
            borderColor: marche === TypeMarche.FLOTTE ? Colors.secondary : Colors.border,
            backgroundColor: marche === TypeMarche.FLOTTE ? Colors.secondary + "10" : Colors.surface,
            alignItems: "center", gap: 6,
          }}
        >
          <Truck size={22} color={marche === TypeMarche.FLOTTE ? Colors.secondary : Colors.textMuted} />
          <Text style={{ fontWeight: "800", fontSize: 13,
            color: marche === TypeMarche.FLOTTE ? Colors.secondary : Colors.textPrimary }}>
            Flotte Privée
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, textAlign: "center", lineHeight: 15 }}>
            Le propriétaire de flotte assigne directement
          </Text>
        </TouchableOpacity>

      </View>

      {/* Info banner based on selection */}
      <View style={{
        backgroundColor: marche === TypeMarche.OUVERT ? Colors.info + "10" : Colors.warning + "10",
        borderRadius: 12, padding: 12, marginBottom: 20,
        borderWidth: 1,
        borderColor: marche === TypeMarche.OUVERT ? Colors.info + "30" : Colors.warning + "30",
      }}>
        <Text style={{ fontSize: 12, lineHeight: 18,
          color: marche === TypeMarche.OUVERT ? Colors.info : Colors.warning }}>
          {marche === TypeMarche.OUVERT
            ? "💡 Les chauffeurs indépendants verront cette charge et pourront soumettre leurs offres. Vous choisissez la meilleure."
            : "🚛 Cette charge sera visible uniquement aux propriétaires de flotte. Ils l'assigneront directement à l'un de leurs chauffeurs via leur moteur d'optimisation."
          }
        </Text>
      </View>

      {/* ── Merchandise type ──────────────────────────── */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 10 }}>
        Type de marchandise
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {TYPE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            onPress={() => setType(opt.value)}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              borderWidth: 1.5,
              borderColor: typeMarchandises === opt.value ? Colors.primary : Colors.border,
              backgroundColor: typeMarchandises === opt.value ? Colors.primary + "15" : Colors.surface,
            }}
          >
            <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
            <Text style={{ fontSize: 13, fontWeight: "600",
              color: typeMarchandises === opt.value ? Colors.primary : Colors.textSecondary }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Pickup ───────────────────────────────────── */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Point d'enlèvement
      </Text>
      <TouchableOpacity
        onPress={() => setShowPickupPicker(true)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 16,
          borderColor: pickupLocation ? Colors.success : Colors.border,
          backgroundColor: pickupLocation ? Colors.success + "10" : Colors.surface,
        }}
      >
        <MapPin size={20} color={pickupLocation ? Colors.success : Colors.textMuted} />
        <Text style={{ flex: 1, fontSize: 13,
          color: pickupLocation ? Colors.textPrimary : Colors.textMuted }} numberOfLines={2}>
          {pickupLocation ? pickupLocation.address : "Appuyer pour choisir sur la carte"}
        </Text>
        {pickupLocation && <Text style={{ fontSize: 11, color: Colors.success, fontWeight: "700" }}>✓</Text>}
      </TouchableOpacity>

      {/* ── Dropoff ──────────────────────────────────── */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Point de livraison
      </Text>
      <TouchableOpacity
        onPress={() => setShowDropoffPicker(true)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 16,
          borderColor: dropoffLocation ? Colors.error : Colors.border,
          backgroundColor: dropoffLocation ? Colors.error + "10" : Colors.surface,
        }}
      >
        <MapPin size={20} color={dropoffLocation ? Colors.error : Colors.textMuted} />
        <Text style={{ flex: 1, fontSize: 13,
          color: dropoffLocation ? Colors.textPrimary : Colors.textMuted }} numberOfLines={2}>
          {dropoffLocation ? dropoffLocation.address : "Appuyer pour choisir sur la carte"}
        </Text>
        {dropoffLocation && <Text style={{ fontSize: 11, color: Colors.error, fontWeight: "700" }}>✓</Text>}
      </TouchableOpacity>

      {/* ── Weight + Price ────────────────────────────── */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input label="Poids (kg)" value={poidsKg} onChangeText={setPoidsKg}
            placeholder="Ex: 1500" keyboardType="numeric"
            leftIcon={<Weight size={16} color={Colors.textMuted} />} />
        </View>
        <View style={{ flex: 1 }}>
          <Input label="Prix (DA)" value={prixPropose} onChangeText={setPrixPropose}
            placeholder="Ex: 45000" keyboardType="numeric"
            leftIcon={<DollarSign size={16} color={Colors.textMuted} />} />
        </View>
      </View>

      <Input label="Description (optionnel)" value={description} onChangeText={setDescription}
        placeholder="Précisions sur la marchandise..." multiline numberOfLines={3}
        style={{ height: 80, textAlignVertical: "top" }} />

      <Button title="Publier la charge" onPress={handleSubmit} isLoading={isLoading}
        size="lg" style={{ marginTop: 8, marginBottom: 40 }} />

      <MapLocationPicker visible={showPickupPicker} title="Point d'enlèvement"
        initialLocation={pickupLocation ?? undefined}
        onConfirm={(loc) => setPickupLocation(loc)}
        onClose={() => setShowPickupPicker(false)} />

      <MapLocationPicker visible={showDropoffPicker} title="Point de livraison"
        initialLocation={dropoffLocation ?? undefined}
        onConfirm={(loc) => setDropoffLocation(loc)}
        onClose={() => setShowDropoffPicker(false)} />
    </ScrollView>
  );
};