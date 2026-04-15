import { View, Text, ScrollView } from "react-native";
import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { TypeMarchandise, CreateLoadPayload } from "@/types/load.types";
import { TouchableOpacity } from "react-native";
 
interface LoadFormProps {
  onSubmit: (payload: CreateLoadPayload) => Promise<void>;
  isLoading?: boolean;
}
 
const TYPES = Object.values(TypeMarchandise);
 
export const LoadForm = ({ onSubmit, isLoading }: LoadFormProps) => {
  const [form, setForm] = useState({
    poidsKg: "",
    typeMarchandises: TypeMarchandise.GENERAL,
    description: "",
    adressEnlev: "",
    adressLivr: "",
    prixPropose: "",
  });
 
  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));
 
  const handleSubmit = async () => {
    await onSubmit({
      poidsKg: parseFloat(form.poidsKg),
      typeMarchandises: form.typeMarchandises,
      description: form.description || undefined,
      adressEnlev: form.adressEnlev,
      coordEnlev: { type: "Point", coordinates: [0, 0] }, // Replace with real geocoding
      adressLivr: form.adressLivr,
      coordLivr: { type: "Point", coordinates: [0, 0] },  // Replace with real geocoding
      prixPropose: parseFloat(form.prixPropose),
    });
  };
 
  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 20 }}>
        Publier une charge
      </Text>
 
      {/* Merchandise type selector */}
      <Text style={{ fontSize: 13, fontWeight: "600", color: Colors.textSecondary, marginBottom: 8 }}>
        Type de marchandise
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            onPress={() => setForm((p) => ({ ...p, typeMarchandises: type }))}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: form.typeMarchandises === type ? Colors.primary : Colors.border,
              backgroundColor: form.typeMarchandises === type ? Colors.primary + "15" : Colors.surface,
            }}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: "600",
              color: form.typeMarchandises === type ? Colors.primary : Colors.textSecondary,
            }}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
 
      <Input label="Poids (kg)" value={form.poidsKg} onChangeText={(v) => set("poidsKg", v)}
        placeholder="Ex: 1500" keyboardType="numeric" />
      <Input label="Adresse d'enlèvement" value={form.adressEnlev} onChangeText={(v) => set("adressEnlev", v)}
        placeholder="Ex: Port d'Alger, Alger" />
      <Input label="Adresse de livraison" value={form.adressLivr} onChangeText={(v) => set("adressLivr", v)}
        placeholder="Ex: Zone Industrielle, Sétif" />
      <Input label="Prix proposé (DA)" value={form.prixPropose} onChangeText={(v) => set("prixPropose", v)}
        placeholder="Ex: 45000" keyboardType="numeric" />
      <Input label="Description (optionnel)" value={form.description} onChangeText={(v) => set("description", v)}
        placeholder="Précisions sur la marchandise..." multiline numberOfLines={3} />
 
      <Button title="Publier la charge" onPress={handleSubmit} isLoading={isLoading}
        style={{ marginTop: 8, marginBottom: 32 }} />
    </ScrollView>
  );
};
 