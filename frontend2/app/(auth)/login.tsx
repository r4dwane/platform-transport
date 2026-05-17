import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Lock } from "lucide-react-native";
 
export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useAuth();
  const [telephone, setTelephone] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
 
  const handleLogin = async () => {
    if (!telephone || !motDePasse) return;
    try {
      await login({ telephone, motDePasse });
      // Redirect handled by _layout.tsx based on role
    } catch {}
  };
 
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo / Brand */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              backgroundColor: Colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 32 }}>🚛</Text>
          </View>
          <Text style={{ fontSize: 28, fontWeight: "800", color: Colors.textPrimary }}>
            TransportDZ
          </Text>
          <Text style={{ fontSize: 15, color: Colors.textSecondary, marginTop: 6 }}>
            Connectez-vous à votre compte
          </Text>
        </View>
 
        {/* Form */}
        <View style={{ gap: 4 }}>
          <Input
            label="Numéro de téléphone"
            value={telephone}
            onChangeText={setTelephone}
            placeholder="+213555123456"
            keyboardType="phone-pad"
            autoCapitalize="none"
            leftIcon={<Phone size={18} color={Colors.textMuted} />}
          />
          <Input
            label="Mot de passe"
            value={motDePasse}
            onChangeText={setMotDePasse}
            placeholder="••••••••"
            secureTextEntry={!showPassword}
            leftIcon={<Lock size={18} color={Colors.textMuted} />}
            rightIcon={
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: "600" }}>
                  {showPassword ? "Cacher" : "Voir"}
                </Text>
              </TouchableOpacity>
            }
          />
 
          {error && (
            <View
              style={{
                backgroundColor: Colors.error + "15",
                borderRadius: 10,
                padding: 12,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: Colors.error, fontSize: 13, textAlign: "center" }}>
                {error}
              </Text>
            </View>
          )}
 
          <Button
            title="Se connecter"
            onPress={handleLogin}
            isLoading={isLoading}
            size="lg"
            style={{ marginTop: 8 }}
          />
        </View>
 
        {/* Register link */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 6 }}>
          <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>
            Pas encore de compte ?
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: "700" }}>
              S'inscrire
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}