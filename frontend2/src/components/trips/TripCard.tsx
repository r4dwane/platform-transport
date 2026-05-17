import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Calendar, FileText } from "lucide-react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as SecureStore from "expo-secure-store";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Trip, StatutTrajet } from "@/types/trip.type";
import { Colors } from "@/constants/colors";
import { formatPrice } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { getTripStatusColor, getTripStatusLabel } from "@/utils/getStatusColor";
import { API_BASE_URL } from "@/constants/roles"; // adjust to your actual constant path

interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}

export const TripCard = ({ trip, onPress }: TripCardProps) => {
  const [downloading, setDownloading] = useState(false);
  const isDelivered = trip.status === StatutTrajet.LIVRE;

  const downloadInvoice = async () => {
    try {
      setDownloading(true);
      const token = await SecureStore.getItemAsync("access_token");
      if (!token) throw new Error("Non authentifié.");

      const invoiceNo = trip.id.slice(-6).toUpperCase();
      const fileUri = FileSystem.documentDirectory + `facture-${invoiceNo}.pdf`;

      const result = await FileSystem.downloadAsync(
        `${API_BASE_URL}/api/v1/payments/trip/${trip.id}/invoice`,
        fileUri,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (result.status !== 200) {
        throw new Error("Échec du téléchargement.");
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: `Facture TDZ-${invoiceNo}`,
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Téléchargé", `Facture sauvegardée: ${result.uri}`);
      }
    } catch (e: any) {
      Alert.alert("Erreur", e?.message ?? "Impossible de télécharger la facture.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: getTripStatusColor(trip.status as StatutTrajet) }}>
        
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontWeight: "700", fontSize: 14, color: Colors.textPrimary }}>
            Trajet #{trip.id.slice(-6).toUpperCase()}
          </Text>
          <Badge
            label={getTripStatusLabel(trip.status as StatutTrajet)}
            color={getTripStatusColor(trip.status as StatutTrajet)}
            size="sm"
          />
        </View>

        {/* Status dots */}
        <View style={{ gap: 6, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success }} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Ramassage confirmé</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error }} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Livraison en cours</Text>
          </View>
        </View>

        {/* Footer row */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10,
          borderTopWidth: 1, borderTopColor: Colors.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Calendar size={13} color={Colors.textMuted} />
            <Text style={{ fontSize: 12, color: Colors.textMuted }}>
              {trip.debutAt ? formatDate(trip.debutAt) : formatDate(trip.createdAt)}
            </Text>
          </View>
          <Text style={{ fontWeight: "700", fontSize: 14, color: Colors.primary }}>
            {formatPrice(trip.infoPaiement.montant)}
          </Text>
        </View>

        {/* Invoice download button — only for delivered trips */}
        {isDelivered && (
          <TouchableOpacity
            onPress={downloadInvoice}
            disabled={downloading}
            activeOpacity={0.75}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 12,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: Colors.primary + "40",
              backgroundColor: Colors.primary + "10",
            }}
          >
            {downloading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <FileText size={15} color={Colors.primary} />
            )}
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.primary }}>
              {downloading ? "Téléchargement..." : "Télécharger la facture PDF"}
            </Text>
          </TouchableOpacity>
        )}

      </Card>
    </TouchableOpacity>
  );
};