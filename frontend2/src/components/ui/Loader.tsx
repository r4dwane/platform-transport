import { View, ActivityIndicator, Text } from "react-native";
import { Colors } from "@/constants/colors";
 
interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}
 
export const Loader = ({ message, fullScreen = false }: LoaderProps) => {
  return (
    <View
      style={{
        flex: fullScreen ? 1 : undefined,
        padding: fullScreen ? 0 : 32,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        backgroundColor: fullScreen ? Colors.background : "transparent",
      }}
    >
      <ActivityIndicator size="large" color={Colors.primary} />
      {message && (
        <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>{message}</Text>
      )}
    </View>
  );
};