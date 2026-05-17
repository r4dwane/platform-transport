import { View, Text, TouchableOpacity } from "react-native";
import { Clock, Truck } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Offer, StatutOffre } from "@/types/offer.type";
import { Colors } from "@/constants/colors";
import { formatPrice} from "@/utils/formatPrice";
import { formatDateTime } from "@/utils/formatDate";
import { Badge } from "@/components/ui/Badge";

 
interface OfferCardProps {
  offer: Offer;
  driverName?: string;
  driverRating?: number;
  showActions?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
}
 
const OFFER_STATUS_COLORS: Record<StatutOffre, string> = {
  EN_ATTENTE: Colors.warning,
  ACCEPTEE:   Colors.success,
  REFUSEE:    Colors.error,
};
const OFFER_STATUS_LABELS: Record<StatutOffre, string> = {
  EN_ATTENTE: "En attente",
  ACCEPTEE:   "Acceptée",
  REFUSEE:    "Refusée",
};
 
export const OfferCard = ({
  offer, driverName = "Chauffeur", driverRating,
  showActions = false, onAccept, onReject,
}: OfferCardProps) => {
  return (
    <Card style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Avatar name={driverName} rating={driverRating} size={44} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: Colors.textPrimary }}>{driverName}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Clock size={13} color={Colors.textMuted} />
            <Text style={{ fontSize: 12, color: Colors.textMuted }}>
              {formatDateTime(offer.delaiRamassage)}
            </Text>
          </View>
        </View>
        <Badge
          label={OFFER_STATUS_LABELS[offer.status]}
          color={OFFER_STATUS_COLORS[offer.status]}
          size="sm"
        />
      </View>
 
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border,
        flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.primary }}>
          {formatPrice(offer.prixPropose)}
        </Text>
        {showActions && offer.status === StatutOffre.EN_ATTENTE && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title="Refuser" variant="outline" size="sm" onPress={onReject} />
            <Button title="Accepter" size="sm" onPress={onAccept} />
          </View>
        )}
      </View>
    </Card>
  );
};
 