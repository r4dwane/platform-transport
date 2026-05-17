// app/(fleet)/profile.tsx

import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Share
} from "react-native";
import { useState, useEffect } from "react";
import * as Clipboard from "expo-clipboard";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import { fleetService } from "@/services/fleet.service";
import {
  LogOut, Star, Phone, Mail, Shield,
  QrCode, Copy, Clock, Check, Share2
} from "lucide-react-native";

export default function FleetProfileScreen() {
  const { user, role, logout } = useAuth();
  const [codes, setCodes]           = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const fetchCodes = async () => {
    try {
      const { data } = await fleetService.getInviteCodes();
      setCodes(data.codes ?? []);
    } catch {}
  };

  useEffect(() => { fetchCodes(); }, []);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data } = await fleetService.generateInviteCode();
      await fetchCodes();
      await Share.share({
        message:
          `Bonjour,\n\nJe vous invite à rejoindre ma flotte sur TransportDZ.\n\n` +
          `Code d'invitation : *${data.code}*\n\n` +
          `Valable 24h — usage unique.\n` +
          `Lors de l'inscription, sélectionnez "Chauffeur de Flotte" et entrez ce code.`,
      });
    } catch (e: any) {
      Alert.alert("Erreur", e?.response?.data?.detail ?? "Impossible de générer le code.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vraiment vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnecter", style: "destructive", onPress: logout },
    ]);
  };

  // Safe role label — no crash if role is undefined
  const roleLabel: Record<string, string> = {
    CLIENT:           "Expéditeur",
    CHAUFFEUR_IND:    "Chauffeur Indépendant",
    PROP_FLOTTE:      "Propriétaire de Flotte",
    CHAUFFEUR_FLOTTE: "Chauffeur de Flotte",
    ADMIN:            "Administrateur",
  };

  const activeCodes = codes.filter((c) => c.isActive);
  const usedCodes   = codes.filter((c) => c.used);

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
            {role ? (roleLabel[role] ?? role) : "Flotte"}
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
          { icon: <Mail size={16} color={Colors.textMuted} />,  label: "Email",     value: user.email },
          { icon: <Star size={16} color={Colors.warning} />,   label: "Note",      value: `${user.note.toFixed(1)} / 5.0` },
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

      {/* ── Invite codes ──────────────────────────────── */}
      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between",
          alignItems: "center", marginBottom: 16 }}>
          <View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary }}>
              Codes d'invitation
            </Text>
            <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 2 }}>
              Pour recruter vos chauffeurs
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isGenerating}
            style={{
              flexDirection: "row", alignItems: "center", gap: 6,
              backgroundColor: Colors.primary,
              paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
              opacity: isGenerating ? 0.6 : 1,
            }}
          >
            <QrCode size={14} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              {isGenerating ? "..." : "Générer"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info banner */}
        <View style={{ backgroundColor: Colors.info + "10", borderRadius: 12,
          padding: 12, marginBottom: 16, borderWidth: 1, borderColor: Colors.info + "20" }}>
          <Text style={{ fontSize: 13, color: Colors.info, lineHeight: 20 }}>
            💡 Générez un code et partagez-le avec votre chauffeur. Il l'entrera lors
            de son inscription pour rejoindre votre flotte automatiquement.{"\n"}
            Chaque code est valable <Text style={{ fontWeight: "800" }}>24 heures</Text> et à usage unique.
          </Text>
        </View>

        {/* Active codes */}
        {activeCodes.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.textMuted,
              marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Codes actifs
            </Text>
            {activeCodes.map((c) => (
              <View key={c.id} style={{
                backgroundColor: Colors.success + "10",
                borderRadius: 14, padding: 14, marginBottom: 10,
                borderWidth: 1, borderColor: Colors.success + "30",
              }}>
                {/* Code display */}
                <View style={{ flexDirection: "row", justifyContent: "space-between",
                  alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 30, fontWeight: "900", color: Colors.success,
                    letterSpacing: 6 }}>
                    {c.code}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => handleCopy(c.code)}
                      style={{ backgroundColor: Colors.success + "20",
                        padding: 8, borderRadius: 10 }}
                    >
                      {copiedCode === c.code
                        ? <Check size={16} color={Colors.success} />
                        : <Copy size={16} color={Colors.success} />
                      }
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => Share.share({
                        message: `Code d'invitation TransportDZ : ${c.code}\nValable 24h — usage unique.`,
                      })}
                      style={{ backgroundColor: Colors.primary + "20",
                        padding: 8, borderRadius: 10 }}
                    >
                      <Share2 size={16} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Expiry */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Clock size={12} color={Colors.textMuted} />
                  <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                    Expire le {new Date(c.expiresAt).toLocaleString("fr-DZ", {
                      day: "2-digit", month: "short",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Used codes */}
        {usedCodes.length > 0 && (
          <View>
            <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.textMuted,
              marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Codes utilisés ({usedCodes.length})
            </Text>
            {usedCodes.slice(0, 3).map((c) => (
              <View key={c.id} style={{ flexDirection: "row", justifyContent: "space-between",
                alignItems: "center", padding: 10, marginBottom: 6,
                backgroundColor: Colors.background, borderRadius: 10 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.textMuted,
                  letterSpacing: 3, textDecorationLine: "line-through" }}>
                  {c.code}
                </Text>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                  {c.usedBy ?? "Utilisé"}
                </Text>
              </View>
            ))}
          </View>
        )}

        {codes.length === 0 && (
          <Text style={{ color: Colors.textMuted, textAlign: "center",
            fontSize: 13, paddingVertical: 8 }}>
            Aucun code généré pour l'instant.
          </Text>
        )}
      </Card>

      {/* Logout */}
      <TouchableOpacity
        onPress={handleLogout}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center",
          gap: 10, padding: 16, backgroundColor: Colors.error + "15",
          borderRadius: 14, borderWidth: 1, borderColor: Colors.error + "30",
          marginBottom: 20 }}
      >
        <LogOut size={18} color={Colors.error} />
        <Text style={{ color: Colors.error, fontWeight: "700", fontSize: 15 }}>
          Se déconnecter
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}