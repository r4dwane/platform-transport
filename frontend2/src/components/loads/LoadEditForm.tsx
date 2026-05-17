// Pre-filled form to edit an existing load
// Shows a warning that pending offers will NOT be cancelled automatically —
// drivers who already submitted offers will see the old price/details
// until the client re-reviews them
 
import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { TypeMarchandise, Load } from "@/types/load.types";
import { MapLocationPicker, PickedLocation } from "@/components/map/MapLocationPicker";
import { MapPin, Weight, DollarSign, AlertTriangle } from "lucide-react-native";
 
const TYPE_OPTIONS: { value: TypeMarchandise; label: string; emoji: string }[] = [
  { value: TypeMarchandise.GENERAL,    label: "Général",    emoji: "📦" },
  { value: TypeMarchandise.PERISSABLE, label: "Périssable", emoji: "🥦" },
  { value: TypeMarchandise.DANGEREUX,  label: "Dangereux",  emoji: "⚠️" },
  { value: TypeMarchandise.FRAGILE,    label: "Fragile",    emoji: "🔮" },
  { value: TypeMarchandise.VOLUMINEUX, label: "Volumineux", emoji: "🪨" },
  { value: TypeMarchandise.LIQUIDE,    label: "Liquide",    emoji: "💧" },
];
 
interface LoadEditFormProps {
  load: Load;
  onSubmit: (payload: any) => Promise<void>;
  isLoading?: boolean;
}
 
export const LoadEditForm = ({ load, onSubmit, isLoading }: LoadEditFormProps) => {
  const [poidsKg, setPoidsKg]         = useState(String(load.poidsKg));
  const [prixPropose, setPrixPropose] = useState(String(load.prixPropose));
  const [description, setDescription] = useState(load.description ?? "");
  const [typeMarchandises, setType]   = useState<TypeMarchandise>(load.typeMarchandises);
 
  const [pickupLocation, setPickupLocation] = useState<PickedLocation>({
    address: load.adressEnlev,
    latitude: load.coordEnlev.coordinates[1],
    longitude: load.coordEnlev.coordinates[0],
  });
  const [dropoffLocation, setDropoffLocation] = useState<PickedLocation>({
    address: load.adressLivr,
    latitude: load.coordLivr.coordinates[1],
    longitude: load.coordLivr.coordinates[0],
  });
 
  const [showPickupPicker, setShowPickupPicker]   = useState(false);
  const [showDropoffPicker, setShowDropoffPicker] = useState(false);
 
  const handleSubmit = async () => {
    if (!poidsKg || isNaN(parseFloat(poidsKg))) {
      Alert.alert("Erreur", "Poids invalide.");
      return;
    }
    if (!prixPropose || isNaN(parseFloat(prixPropose))) {
      Alert.alert("Erreur", "Prix invalide.");
      return;
    }
 
    await onSubmit({
      poidsKg: parseFloat(poidsKg),
      typeMarchandises,
      description: description || undefined,
      adressEnlev: pickupLocation.address,
      coordEnlev: {
        type: "Point",
        coordinates: [pickupLocation.longitude, pickupLocation.latitude],
      },
      adressLivr: dropoffLocation.address,
      coordLivr: {
        type: "Point",
        coordinates: [dropoffLocation.longitude, dropoffLocation.latitude],
      },
      prixPropose: parseFloat(prixPropose),
    });
  };
 
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.textPrimary, marginBottom: 8 }}>
        Modifier la charge
      </Text>
 
      {/* Warning banner */}
      <View style={{
        flexDirection: "row", alignItems: "flex-start", gap: 10,
        backgroundColor: Colors.warning + "15",
        borderRadius: 12, padding: 12, marginBottom: 20,
        borderWidth: 1, borderColor: Colors.warning + "30",
      }}>
        <AlertTriangle size={16} color={Colors.warning} style={{ marginTop: 1 }} />
        <Text style={{ flex: 1, fontSize: 13, color: Colors.warning, lineHeight: 18 }}>
          Les modifications sont possibles uniquement tant qu'aucune offre n'a été acceptée.
          Les chauffeurs ayant déjà soumis une offre verront les nouvelles informations.
        </Text>
      </View>
 
      {/* Type */}
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
              backgroundColor: typeMarchandises === opt.value
                ? Colors.primary + "15" : Colors.surface,
            }}
          >
            <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
            <Text style={{
              fontSize: 13, fontWeight: "600",
              color: typeMarchandises === opt.value ? Colors.primary : Colors.textSecondary,
            }}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
 
      {/* Pickup */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Point d'enlèvement
      </Text>
      <TouchableOpacity
        onPress={() => setShowPickupPicker(true)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 16,
          borderColor: Colors.success,
          backgroundColor: Colors.success + "10",
        }}
      >
        <MapPin size={20} color={Colors.success} />
        <Text style={{ flex: 1, fontSize: 13, color: Colors.textPrimary }} numberOfLines={2}>
          {pickupLocation.address}
        </Text>
      </TouchableOpacity>
 
      {/* Dropoff */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Point de livraison
      </Text>
      <TouchableOpacity
        onPress={() => setShowDropoffPicker(true)}
        style={{
          flexDirection: "row", alignItems: "center", gap: 12,
          padding: 14, borderRadius: 12, borderWidth: 1.5, marginBottom: 16,
          borderColor: Colors.error,
          backgroundColor: Colors.error + "10",
        }}
      >
        <MapPin size={20} color={Colors.error} />
        <Text style={{ flex: 1, fontSize: 13, color: Colors.textPrimary }} numberOfLines={2}>
          {dropoffLocation.address}
        </Text>
      </TouchableOpacity>
 
      {/* Weight + Price */}
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Input
            label="Poids (kg)"
            value={poidsKg}
            onChangeText={setPoidsKg}
            keyboardType="numeric"
            leftIcon={<Weight size={16} color={Colors.textMuted} />}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Input
            label="Prix (DA)"
            value={prixPropose}
            onChangeText={setPrixPropose}
            keyboardType="numeric"
            leftIcon={<DollarSign size={16} color={Colors.textMuted} />}
          />
        </View>
      </View>
 
      <Input
        label="Description (optionnel)"
        value={description}
        onChangeText={setDescription}
        placeholder="Précisions sur la marchandise..."
        multiline
        numberOfLines={3}
        style={{ height: 80, textAlignVertical: "top" }}
      />
 
      <Button
        title="Enregistrer les modifications"
        onPress={handleSubmit}
        isLoading={isLoading}
        size="lg"
        style={{ marginTop: 8, marginBottom: 40 }}
      />
 
      <MapLocationPicker
        visible={showPickupPicker}
        title="Point d'enlèvement"
        initialLocation={pickupLocation}
        onConfirm={(loc) => setPickupLocation(loc)}
        onClose={() => setShowPickupPicker(false)}
      />
      <MapLocationPicker
        visible={showDropoffPicker}
        title="Point de livraison"
        initialLocation={dropoffLocation}
        onConfirm={(loc) => setDropoffLocation(loc)}
        onClose={() => setShowDropoffPicker(false)}
      />
    </ScrollView>
  );
};