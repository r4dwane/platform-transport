import { View, Text } from "react-native";
 
interface BadgeProps {
  label: string;
  color: string;
  size?: "sm" | "md";
}
 
export const Badge = ({ label, color, size = "md" }: BadgeProps) => {
  return (
    <View
      style={{
        backgroundColor: color + "20", // 12% opacity background
        paddingHorizontal: size === "sm" ? 8 : 12,
        paddingVertical: size === "sm" ? 3 : 5,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: color + "40",
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color, fontSize: size === "sm" ? 11 : 12, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
};