// app/(fleet)/_layout.tsx

import { Tabs } from "expo-router";
import { Colors } from "@/constants/colors";
import { BarChart2, Users, Package, Clock, User } from "lucide-react-native";
import { NotificationBell } from "@/components/notification/NotificationBell";

export default function FleetLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          height: 60,
          paddingBottom: 8,
        },
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.textPrimary,
        headerRight: () => <NotificationBell />,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => <BarChart2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="drivers"
        options={{
          title: "Chauffeurs",
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="loads"
        options={{
          title: "Charges",
          tabBarIcon: ({ color }) => <Package size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Missions",
          tabBarIcon: ({ color }) => <Clock size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => <User size={22} color={color} />,
        }}
      />
      {/* Hidden screen — accessible via router.push only */}
      <Tabs.Screen
        name="driver-detail"
        options={{ href: null }}
      />
    </Tabs>
  );
}