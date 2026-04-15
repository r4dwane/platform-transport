import { View, Text } from "react-native";
import { Colors } from "@/constants/colors";
import { Button } from "./Button";
 
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}
 
export const EmptyState = ({
  icon = "📭",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
      <Text style={{ fontSize: 48 }}>{icon}</Text>
      <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.textPrimary, textAlign: "center" }}>
        {title}
      </Text>
      {description && (
        <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} style={{ marginTop: 8 }} />
      )}
    </View>
  );
};