// import { View, StyleSheet } from "react-native";
// import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
// import { DriverMarker } from "./DriverMarker";
// import { Colors } from "@/constants/colors";
 
// interface LiveMapProps {
//   pickupCoords:  { latitude: number; longitude: number };
//   dropoffCoords: { latitude: number; longitude: number };
//   driverCoords?: { latitude: number; longitude: number } | null;
//   driverName?:   string;
//   trackingPath?: Array<{ latitude: number; longitude: number }>;
// }
 
// export const LiveMap = ({
//   pickupCoords, dropoffCoords, driverCoords, driverName, trackingPath = [],
// }: LiveMapProps) => {
//   const midLat = (pickupCoords.latitude + dropoffCoords.latitude) / 2;
//   const midLon = (pickupCoords.longitude + dropoffCoords.longitude) / 2;
//   const latDelta = Math.abs(pickupCoords.latitude - dropoffCoords.latitude) * 1.5 + 0.05;
//   const lonDelta = Math.abs(pickupCoords.longitude - dropoffCoords.longitude) * 1.5 + 0.05;
 
//   return (
//     <View style={{ flex: 1, borderRadius: 16, overflow: "hidden" }}>
//       <MapView
//         style={StyleSheet.absoluteFillObject}
//         provider={PROVIDER_GOOGLE}
//         initialRegion={{ latitude: midLat, longitude: midLon, latitudeDelta: latDelta, longitudeDelta: lonDelta }}
//       >
//         {/* Pickup marker */}
//         <Marker coordinate={pickupCoords} title="Enlèvement" pinColor={Colors.success} />
 
//         {/* Dropoff marker */}
//         <Marker coordinate={dropoffCoords} title="Livraison" pinColor={Colors.error} />
 
//         {/* Driver live position */}
//         {driverCoords && (
//           <DriverMarker coordinate={driverCoords} driverName={driverName} />
//         )}
 
//         {/* Historical path */}
//         {trackingPath.length > 1 && (
//           <Polyline
//             coordinates={trackingPath}
//             strokeColor={Colors.primary}
//             strokeWidth={3}
//           />
//         )}
//       </MapView>
//     </View>
//   );
// };
// LiveMap.tsx
import { View, Text } from "react-native";
import { Colors } from "@/constants/colors";

export const LiveMap = (props: any) => {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.border, 
      alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: Colors.textMuted }}>Carte (bientôt disponible)</Text>
    </View>
  );
};