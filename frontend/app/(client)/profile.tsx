import { View, Text, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/constants/api";
import { LogOut, Star, Phone, Mail, Shield } from "lucide-react-native";
 
export default function ProfileScreen() {
  const { user, role, logout } = useAuth();
 
  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: logout },
    ]);
  };
 
  if (!user) return null;
 
  return (
    <ScrollView style={{ flex: 1, backgroundColor: Colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}>
 
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
            <Text style={{ color: Colors.success, fontSize: 12, fontWeight: "600" }}>Compte vérifié</Text>
          </View>
        )}
      </Card>
 
      {/* Info */}
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
              <Text style={{ fontSize: 14, fontWeight: "600", color: Colors.textPrimary }}>{item.value}</Text>
            </View>
          </View>
        ))}
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
    </ScrollView>
  );
}