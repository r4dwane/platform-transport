import { View, Text, TouchableOpacity } from "react-native";
import { Bell } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useNotificationsStore } from "@/store/notifications.store";
import { Colors } from "@/constants/colors";
 
export const NotificationBell = () => {
  const router = useRouter();
  const { unreadCount } = useNotificationsStore();
 
  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications")}
      style={{ marginRight: 16, position: "relative" }}
    >
      <Bell size={24} color={Colors.textPrimary} />
      {unreadCount > 0 && (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -4,
            backgroundColor: Colors.error,
            borderRadius: 10,
            minWidth: 18,
            height: 18,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 4,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};