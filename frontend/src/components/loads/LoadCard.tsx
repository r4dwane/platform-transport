
import { View, Text, TouchableOpacity } from "react-native";
import { MapPin, Weight, DollarSign, Package } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { LoadStatusBadge } from "./LoadStatusBadge";
import { Load } from "@/types/load.types";
import { Colors } from "@/constants/colors";
import { formatPrice } from "@/utils/formatPrice";
import { formatDate } from "@/utils/formatDate"; 

interface LoadCardProps {
  load: Load;
  onPress?: () => void;
  showStatus?: boolean;
}
 
export const LoadCard = ({ load, onPress, showStatus = true }: LoadCardProps) => {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={{ marginBottom: 12 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ backgroundColor: Colors.primary + "15", padding: 8, borderRadius: 10 }}>
              <Package size={18} color={Colors.primary} />
            </View>
            <View>
              <Text style={{ fontWeight: "700", fontSize: 15, color: Colors.textPrimary }}>
                {load.typeMarchandises}
              </Text>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                {formatDate(load.createdAt)}
              </Text>
            </View>
          </View>
          {showStatus && <LoadStatusBadge status={load.status} />}
        </View>
 
        {/* Route */}
        <View style={{ gap: 6, marginBottom: 12 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.success }} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {load.adressEnlev}
            </Text>
          </View>
          <View style={{ width: 1, height: 10, backgroundColor: Colors.border, marginLeft: 4 }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.error }} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary, flex: 1 }} numberOfLines={1}>
              {load.adressLivr}
            </Text>
          </View>
        </View>
 
        {/* Footer */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.border }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Weight size={14} color={Colors.textMuted} />
            <Text style={{ fontSize: 13, color: Colors.textSecondary, fontWeight: "600" }}>
              {load.poidsKg} kg
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.primary }}>
            {formatPrice(load.prixPropose)}
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
};