import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { CreateOfferPayload } from "@/types/offer.type";
import { Vehicle } from "@/types/vehicule.type";

interface OfferFormProps {
  chargeId: string;
  vehicles: Vehicle[];
  onSubmit: (payload: CreateOfferPayload) => Promise<void>;
  isLoading?: boolean;
  loadPrice : number;
}
 

// Parse "DD/MM/YYYY HH:MM" → valid ISO string
const parseDate = (input: string): string | null => {
  try {
    // Try DD/MM/YYYY HH:MM
    const match = input.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/);
    if (match) {
      const [, day, month, year, hour, minute] = match;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    // Try YYYY-MM-DD HH:MM
    const match2 = input.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
    if (match2) {
      const [, year, month, day, hour, minute] = match2;
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    return null;
  } catch {
    return null;
  }
};

// Quick time picker — adds hours to now
const QUICK_TIMES = [
  { label: "Dans 1h",  hours: 1 },
  { label: "Dans 2h",  hours: 2 },
  { label: "Dans 4h",  hours: 4 },
  { label: "Demain",   hours: 24 },
  { label: "Dans 2j",  hours: 48 },
];

export const OfferForm = ({ chargeId, vehicles, onSubmit, isLoading, loadPrice }: OfferFormProps) => {
  const [prix, setPrix] = useState("");
  const [delai, setDelai] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(
    vehicles[0]?.id ?? null
  );
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
        setSelectedVehicle(vehicles[0].id);
      }
    }, [vehicles]);

  const handleQuickTime = (hours: number) => {
    const date = new Date(Date.now() + hours * 60 * 60 * 1000);
    const dd   = String(date.getDate()).padStart(2, "0");
    const mm   = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    const hh   = String(date.getHours()).padStart(2, "0");
    const min  = String(date.getMinutes()).padStart(2, "0");
    setDelai(`${dd}/${mm}/${yyyy} ${hh}:${min}`);
  };

  const handleSubmit = async () => {
    if (!selectedVehicle) {
      Alert.alert("Erreur", "Veuillez sélectionner un véhicule.");
      return;
    }
    if (!prix || isNaN(parseFloat(prix))) {
      Alert.alert("Erreur", "Veuillez entrer un prix valide.");
      return;
    }
    if (!delai) {
      Alert.alert("Erreur", "Veuillez entrer une date de ramassage.");
      return;
    }

    const isoDate = parseDate(delai);
    if (!isoDate) {
      Alert.alert("Format invalide", "Utilisez le format JJ/MM/AAAA HH:MM\nEx: 25/04/2026 14:30");
      return;
    }

    console.log("SUBMITTING OFFER:", { chargeId, vehiculeId: selectedVehicle,
      prixPropose: parseFloat(prix), delaiRamassage: isoDate });

    await onSubmit({
      chargeId,
      vehiculeId: selectedVehicle,
      prixPropose: parseFloat(prix),
      delaiRamassage: isoDate,
    });
  };
  const handleAcceptPrice = async () => {
    if (!selectedVehicle) {
      Alert.alert("Erreur", "Veuillez sélectionner un véhicule.");
      return;
    }

    if (!delai) {
      Alert.alert("Erreur", "Veuillez entrer une date de ramassage.");
      return;
    }

    const isoDate = parseDate(delai);
    if (!isoDate) {
      Alert.alert(
        "Format invalide",
        "Utilisez le format JJ/MM/AAAA HH:MM\nEx: 25/04/2026 14:30"
      );
      return;
    }

    await onSubmit({
      chargeId,
      vehiculeId: selectedVehicle,
      prixPropose: loadPrice,
      delaiRamassage: isoDate,
    });
  };

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 }}>
        Soumettre une offre
      </Text>

      {/* Vehicle selector */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Véhicule
      </Text>

      {vehicles.length === 0 ? (
        <View style={{ padding: 16, backgroundColor: Colors.warning + "15",
          borderRadius: 12, marginBottom: 16 }}>
          <Text style={{ color: Colors.warning, fontWeight: "600", textAlign: "center" }}>
            Aucun véhicule enregistré.{"\n"}Ajoutez un véhicule dans votre profil.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 8, marginBottom: 16 }}>
          {vehicles.map((v) => (
            <TouchableOpacity
              key={v.id}
              onPress={() => setSelectedVehicle(v.id)}
              style={{
                padding: 12, borderRadius: 12, borderWidth: 1.5,
                borderColor: selectedVehicle === v.id ? Colors.primary : Colors.border,
                backgroundColor: selectedVehicle === v.id ? Colors.primary + "10" : Colors.surface,
                flexDirection: "row", justifyContent: "space-between",
              }}
            >
              <Text style={{ fontWeight: "600", color: Colors.textPrimary }}>{v.type}</Text>
              <Text style={{ color: Colors.textSecondary }}>{v.plaqueImmatriculation}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Price */}
      <Input
        label="Prix proposé (DA)"
        value={prix}
        onChangeText={setPrix}
        placeholder="Ex: 42000"
        keyboardType="numeric"
      />

      {/* Date with quick picks */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Date de ramassage
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        {QUICK_TIMES.map((qt) => (
          <TouchableOpacity
            key={qt.label}
            onPress={() => handleQuickTime(qt.hours)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
              backgroundColor: Colors.primary + "15",
              borderWidth: 1, borderColor: Colors.primary + "30",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.primary }}>
              {qt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Input
        value={delai}
        onChangeText={setDelai}
        placeholder="JJ/MM/AAAA HH:MM"
      />
      <Button
        title={`Accepter l'offre (${loadPrice} DA)`}
        onPress={handleAcceptPrice}
        isLoading={isLoading}
        style={{ marginTop: 8 }}
        disabled={vehicles.length === 0}
      />
      <Text
        style={{
          textAlign: "center",
          color: Colors.textMuted,
          marginVertical: 8,
          fontWeight: "600",
        }}
      >
        ou
      </Text>
      <Button
        title="Soumettre l'offre"
        onPress={handleSubmit}
        isLoading={isLoading}
        style={{ marginTop: 8 }}
        disabled={vehicles.length === 0}
      />
    </View>
  );
};