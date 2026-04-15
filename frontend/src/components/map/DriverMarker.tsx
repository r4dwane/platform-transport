import { View, Text } from "react-native";
import { Marker } from "react-native-maps";
import { Truck } from "lucide-react-native";
import { Colors } from "@/constants/colors";
 
interface DriverMarkerProps {
  coordinate: { latitude: number; longitude: number };
  driverName?: string;
}
 
export const DriverMarker = ({ coordinate, driverName }: DriverMarkerProps) => {
  return (
    <Marker coordinate={coordinate} title={driverName}>
      <View style={{ alignItems: "center", gap: 4 }}>
        <View
          style={{
            backgroundColor: Colors.primary,
            padding: 8,
            borderRadius: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Truck size={20} color="#fff" />
        </View>
        {driverName && (
          <View style={{ backgroundColor: Colors.secondary, paddingHorizontal: 8,
            paddingVertical: 3, borderRadius: 8 }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>{driverName}</Text>
          </View>
        )}
      </View>
    </Marker>
  );
};