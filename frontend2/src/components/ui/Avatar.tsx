import { View, Text, Image } from "react-native";
import { Colors } from "@/constants/colors";
 
interface AvatarProps {
  name: string;
  imageUrl?: string;
  size?: number;
  rating?: number;
}
 
export const Avatar = ({ name, imageUrl, size = 44, rating }: AvatarProps) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
 
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: Colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#fff", fontSize: size * 0.35, fontWeight: "700" }}>
            {initials}
          </Text>
        </View>
      )}
      {rating !== undefined && (
        <Text style={{ fontSize: 11, color: Colors.textSecondary, fontWeight: "600" }}>
          ⭐ {rating.toFixed(1)}
        </Text>
      )}
    </View>
  );
};