import { View, Text } from "react-native";
import { StatutTrajet } from "@/types/trip.type";
import { Colors } from "@/constants/colors";
import { getTripStatusColor, getTripStatusLabel } from "@/utils/getStatusColor";
import { Check } from "lucide-react-native";
 
const STEPS = [
  StatutTrajet.PLANIFIE,
  StatutTrajet.EN_ROUTE_RAMASSAGE,
  StatutTrajet.CHARGEMENT,
  StatutTrajet.EN_ROUTE_LIVRAISON,
  StatutTrajet.LIVRE,
];
 
export const TripStatusStepper = ({ currentStatus }: { currentStatus: StatutTrajet }) => {
  const currentIndex = STEPS.indexOf(currentStatus);
 
  return (
    <View style={{ paddingVertical: 8 }}>
      {STEPS.map((step, index) => {
        const isDone    = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
 
        const color = isCurrent
          ? getTripStatusColor(step)
          : isDone
          ? Colors.success
          : Colors.border;
 
        return (
          <View key={step} style={{ flexDirection: "row", alignItems: "flex-start", gap: 14 }}>
            {/* Line + dot */}
            <View style={{ alignItems: "center", width: 24 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isPending ? Colors.background : color,
                  borderWidth: isPending ? 2 : 0,
                  borderColor: Colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isDone && <Check size={13} color="#fff" />}
                {isCurrent && (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" }} />
                )}
              </View>
              {index < STEPS.length - 1 && (
                <View style={{ width: 2, height: 28, backgroundColor: isDone ? Colors.success : Colors.border }} />
              )}
            </View>
 
            {/* Label */}
            <View style={{ paddingTop: 2, paddingBottom: index < STEPS.length - 1 ? 28 : 0 }}>
              <Text style={{
                fontSize: 14,
                fontWeight: isCurrent ? "700" : "500",
                color: isPending ? Colors.textMuted : Colors.textPrimary,
              }}>
                {getTripStatusLabel(step)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};