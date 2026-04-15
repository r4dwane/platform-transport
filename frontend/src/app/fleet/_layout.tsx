import { Tabs } from "expo-router";
import { Colors } from "@/constants/colors";
import { BarChart2, Users, Truck, Clock, User } from "lucide-react-native";
import { NotificationBell } from "@/components/notification /NotificationBell";
 
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
        name="vehicles"
        options={{
          title: "Véhicules",
          tabBarIcon: ({ color }) => <Truck size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Trajets",
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
    </Tabs>
  );
}