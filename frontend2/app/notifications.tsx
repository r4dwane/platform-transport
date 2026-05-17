// app/notifications.tsx
// Accessible from all roles via the bell icon

import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useNotifications } from "@/hooks/useNotification";
import { useAuthStore } from "@/store/auth.store";
import { Colors } from "@/constants/colors";
import { Bell, Check, ArrowLeft } from "lucide-react-native";
import { timeAgo } from "@/utils/formatDate";

const NOTIF_ICONS: Record<string, string> = {
  NEW_OFFER:          "💰",
  OFFER_ACCEPTED:     "✅",
  OFFER_REJECTED:     "❌",
  TRIP_STATUS:        "🚛",
  PAYMENT_CONFIRMED:  "💳",
  NEW_MESSAGE:        "💬",
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { notifications, unreadCount, markRead, markAllRead } =
    useNotifications(user?.id ?? null);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* Header */}
      <View style={{
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        padding: 20, paddingTop: 50, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border,
      }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.textPrimary }}>
              Notifications
            </Text>
            {unreadCount > 0 && (
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </Text>
            )}
          </View>
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={markAllRead}
            style={{
              flexDirection: "row", alignItems: "center", gap: 4,
              backgroundColor: Colors.primary + "15",
              paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
            }}
          >
            <Check size={14} color={Colors.primary} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: Colors.primary }}>
              Tout lire
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => !item.isRead && markRead(item.id)}
            style={{
              flexDirection: "row", alignItems: "flex-start", gap: 12,
              padding: 16,
              backgroundColor: item.isRead ? Colors.surface : Colors.primary + "08",
              borderBottomWidth: 1, borderBottomColor: Colors.border,
            }}
          >
            {/* Icon */}
            <View style={{
              width: 42, height: 42, borderRadius: 21,
              backgroundColor: Colors.primary + "15",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 20 }}>
                {NOTIF_ICONS[item.type] ?? "🔔"}
              </Text>
            </View>

            {/* Content */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between",
                alignItems: "flex-start" }}>
                <Text style={{
                  fontSize: 14, fontWeight: item.isRead ? "600" : "800",
                  color: Colors.textPrimary, flex: 1,
                }}>
                  {item.title}
                </Text>
                {!item.isRead && (
                  <View style={{
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: Colors.primary, marginTop: 4, marginLeft: 8,
                  }} />
                )}
              </View>
              <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 3, lineHeight: 18 }}>
                {item.body}
              </Text>
              <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 6 }}>
                {timeAgo(item.createdAt)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center",
            padding: 48, gap: 12 }}>
            <View style={{ backgroundColor: Colors.border, padding: 20, borderRadius: 24 }}>
              <Bell size={36} color={Colors.textMuted} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
              Aucune notification
            </Text>
            <Text style={{ fontSize: 14, color: Colors.textMuted, textAlign: "center" }}>
              Vos notifications apparaîtront ici.
            </Text>
          </View>
        }
      />
    </View>
  );
}