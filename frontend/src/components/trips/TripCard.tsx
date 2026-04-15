import { View, Text, TouchableOpacity } from "react-native";
import { MapPin, Calendar } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Trip, StatutTrajet } from "@/types/trip.type";
import { Colors } from "@/constants/colors";
import { formatPrice } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate";
import { getTripStatusColor, getTripStatusLabel } from "@/utils/getStatusColor";
 
interface TripCardProps {
  trip: Trip;
  onPress?: () => void;
}
 
export const TripCard = ({ trip, onPress }: TripCardProps) => {
  const isActive = ![StatutTrajet.LIVRE].includes(trip.status as StatutTrajet);
 
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={{ marginBottom: 12, borderLeftWidth: 4, borderLeftColor: getTripStatusColor(trip.status as StatutTrajet) }}>
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
      </Card>
    </TouchableOpacity>
  );
};
 