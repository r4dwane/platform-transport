import { Tabs } from "expo-router";
import { Colors } from "@/constants/colors";
import { Search, FileText, Navigation, Clock, User } from "lucide-react-native";
import { NotificationBell } from "@/components/notification/NotificationBell";
 
export default function DriverLayout() {
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
        name="home"
        options={{
          title: "Charges",
          tabBarIcon: ({ color }) => <Search size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-offers"
        options={{
          title: "Mes Offres",
          tabBarIcon: ({ color }) => <FileText size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="active-trip"
        options={{
          title: "Mission",
          tabBarIcon: ({ color }) => <Navigation size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: "Historique",
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