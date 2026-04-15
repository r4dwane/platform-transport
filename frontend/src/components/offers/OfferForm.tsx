import { View, Text } from "react-native";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { CreateOfferPayload } from "@/types/offer.type";
import { Vehicle } from "@/types/vehicule.type";
import { TouchableOpacity } from "react-native";
 
interface OfferFormProps {
  chargeId: string;
  vehicles: Vehicle[];
  onSubmit: (payload: CreateOfferPayload) => Promise<void>;
  isLoading?: boolean;
}
 
export const OfferForm = ({ chargeId, vehicles, onSubmit, isLoading }: OfferFormProps) => {
  const [prix, setPrix] = useState("");
  const [delai, setDelai] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(
    vehicles[0]?.id ?? null
  );
 
  const handleSubmit = async () => {
    if (!selectedVehicle) return;
    await onSubmit({
      chargeId,
      vehiculeId: selectedVehicle,
      prixPropose: parseFloat(prix),
      delaiRamassage: new Date(delai).toISOString(),
    });
  };
 
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 }}>
        Soumettre une offre
      </Text>
 
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Véhicule
      </Text>
      <View style={{ gap: 8, marginBottom: 16 }}>
        {vehicles.map((v) => (
          <TouchableOpacity
            key={v.id}
            onPress={() => setSelectedVehicle(v.id)}
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: selectedVehicle === v.id ? Colors.primary : Colors.border,
              backgroundColor: selectedVehicle === v.id ? Colors.primary + "10" : Colors.surface,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <Text style={{ fontWeight: "600", color: Colors.textPrimary }}>{v.type}</Text>
            <Text style={{ color: Colors.textSecondary }}>{v.plaqueImmatriculation}</Text>
          </TouchableOpacity>
        ))}
      </View>
 
      <Input label="Prix proposé (DA)" value={prix} onChangeText={setPrix}
        placeholder="Ex: 42000" keyboardType="numeric" />
      <Input label="Date de ramassage" value={delai} onChangeText={setDelai}
        placeholder="JJ/MM/AAAA HH:MM" />
 
      <Button title="Soumettre l'offre" onPress={handleSubmit}
        isLoading={isLoading} style={{ marginTop: 8 }} />
    </View>
  );
};