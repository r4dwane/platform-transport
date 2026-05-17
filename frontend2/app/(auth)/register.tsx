 import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { RoleUtilisateur } from "@/types/user.types";
import { ROLE_LABELS } from "@/constants/api";
import { User, Phone, Mail, Lock } from "lucide-react-native";
 
const SELECTABLE_ROLES = [
  RoleUtilisateur.CLIENT,
  RoleUtilisateur.CHAUFFEUR_IND,
  RoleUtilisateur.PROP_FLOTTE,
  RoleUtilisateur.CHAUFFEUR_FLOTTE,
];
 
export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error } = useAuth();
 
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    motDePasse: "",
    role: RoleUtilisateur.CLIENT,
    employeurId: "",
  });
  const [step, setStep] = useState<1 | 2>(1);
 
  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));
 
  const handleRegister = async () => {
    try {
      await register({
        nom: form.nom,
        telephone: form.telephone,
        email: form.email,
        motDePasse: form.motDePasse,
        role: form.role,
        employeurId: form.role === RoleUtilisateur.CHAUFFEUR_FLOTTE
          ? form.employeurId
          : undefined,
      });
      router.replace("/(auth)/login");
    } catch {}
  };
 
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
          <Text style={{ color: Colors.primary, fontSize: 15, fontWeight: "600" }}>← Retour</Text>
        </TouchableOpacity>
 
        <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.textPrimary, marginBottom: 4 }}>
          Créer un compte
        </Text>
        <Text style={{ fontSize: 15, color: Colors.textSecondary, marginBottom: 32 }}>
          Rejoignez la plateforme TransportDZ
        </Text>
 
        {step === 1 ? (
          <View>
            {/* Step 1: Personal info */}
            <Input
              label="Nom complet"
              value={form.nom}
              onChangeText={(v) => set("nom", v)}
              placeholder="Ahmed Boudiaf"
              leftIcon={<User size={18} color={Colors.textMuted} />}
            />
            <Input
              label="Téléphone"
              value={form.telephone}
              onChangeText={(v) => set("telephone", v)}
              placeholder="+213555123456"
              keyboardType="phone-pad"
              leftIcon={<Phone size={18} color={Colors.textMuted} />}
            />
            <Input
              label="Email"
              value={form.email}
              onChangeText={(v) => set("email", v)}
              placeholder="ahmed@example.dz"
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={18} color={Colors.textMuted} />}
            />
            <Input
              label="Mot de passe"
              value={form.motDePasse}
              onChangeText={(v) => set("motDePasse", v)}
              placeholder="Minimum 8 caractères"
              secureTextEntry
              leftIcon={<Lock size={18} color={Colors.textMuted} />}
            />
            <Button
              title="Continuer"
              onPress={() => setStep(2)}
              size="lg"
              style={{ marginTop: 8 }}
              disabled={!form.nom || !form.telephone || !form.email || !form.motDePasse}
            />
          </View>
        ) : (
          <View>
            {/* Step 2: Role selection */}
            <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 16 }}>
              Quel est votre rôle ?
            </Text>
 
            <View style={{ gap: 10, marginBottom: 24 }}>
              {SELECTABLE_ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  onPress={() => setForm((p) => ({ ...p, role }))}
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: form.role === role ? Colors.primary : Colors.border,
                    backgroundColor: form.role === role ? Colors.primary + "10" : Colors.surface,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: form.role === role ? Colors.primary : Colors.border,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {form.role === role && (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary }} />
                    )}
                  </View>
                  <View>
                    <Text style={{
                      fontWeight: "700",
                      fontSize: 15,
                      color: form.role === role ? Colors.primary : Colors.textPrimary,
                    }}>
                      {ROLE_LABELS[role]}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
 
            {form.role === RoleUtilisateur.CHAUFFEUR_FLOTTE && (
              <Input
                label="ID de votre employeur"
                value={form.employeurId}
                onChangeText={(v) => set("employeurId", v)}
                placeholder="ID du propriétaire de flotte"
              />
            )}
 
            {error && (
              <View style={{ backgroundColor: Colors.error + "15", borderRadius: 10,
                padding: 12, marginBottom: 12 }}>
                <Text style={{ color: Colors.error, fontSize: 13, textAlign: "center" }}>{error}</Text>
              </View>
            )}
 
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button title="Retour" variant="outline" onPress={() => setStep(1)}
                style={{ flex: 1 }} />
              <Button title="S'inscrire" onPress={handleRegister}
                isLoading={isLoading} style={{ flex: 2 }} />
            </View>
          </View>
        )}
 
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 6 }}>
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Déjà un compte ?</Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: "700" }}>
              Se connecter
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}