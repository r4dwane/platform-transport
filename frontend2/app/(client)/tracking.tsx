import { View, Text, FlatList, RefreshControl } from "react-native";
import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { useRouter } from "expo-router";
import { PackageCheck, PackageSearch, Truck } from "lucide-react-native";
import { TripCard } from "@/components/trips/TripCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useTrips } from "@/hooks/useTrips";
import { StatutTrajet, Trip } from "@/types/trip.type";

type MissionGroupKey = "active" | "available" | "delivered";

interface MissionGroup {
  key: MissionGroupKey;
  title: string;
  subtitle: string;
  color: string;
  icon: ReactNode;
  trips: Trip[];
}

const ACTIVE_STATUSES = new Set<StatutTrajet>([
  StatutTrajet.EN_ROUTE_RAMASSAGE,
  StatutTrajet.CHARGEMENT,
  StatutTrajet.EN_ROUTE_LIVRAISON,
]);

const getMissionRank = (status: StatutTrajet) => {
  if (ACTIVE_STATUSES.has(status)) return 0;
  if (status === StatutTrajet.PLANIFIE) return 1;
  if (status === StatutTrajet.LIVRE) return 2;
  return 3;
};

const byMissionPriority = (a: Trip, b: Trip) => {
  const rankDiff = getMissionRank(a.status as StatutTrajet) - getMissionRank(b.status as StatutTrajet);
  if (rankDiff !== 0) return rankDiff;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
};

export default function ClientMissionsScreen() {
  const router = useRouter();
  const { myTrips, isLoading, fetchMyTrips } = useTrips(false);

  useEffect(() => { fetchMyTrips(); }, []);

  const groups = useMemo<MissionGroup[]>(() => {
    const sortedTrips = [...myTrips].sort(byMissionPriority);

    const missionGroups: MissionGroup[] = [
      {
        key: "active",
        title: "En mission",
        subtitle: "Missions en cours de ramassage, chargement ou livraison",
        color: Colors.info,
        icon: <Truck size={18} color={Colors.info} />,
        trips: sortedTrips.filter((trip) => ACTIVE_STATUSES.has(trip.status as StatutTrajet)),
      },
      {
        key: "available",
        title: "Disponibles",
        subtitle: "Missions planifiees en attente de depart",
        color: Colors.warning,
        icon: <PackageSearch size={18} color={Colors.warning} />,
        trips: sortedTrips.filter((trip) => trip.status === StatutTrajet.PLANIFIE),
      },
      {
        key: "delivered",
        title: "Livrees",
        subtitle: "Missions terminees et factures disponibles",
        color: Colors.success,
        icon: <PackageCheck size={18} color={Colors.success} />,
        trips: sortedTrips.filter((trip) => trip.status === StatutTrajet.LIVRE),
      },
    ];

    return missionGroups.filter((group) => group.trips.length > 0);
  }, [myTrips]);

  const activeCount = myTrips.filter((trip) => ACTIVE_STATUSES.has(trip.status as StatutTrajet)).length;
  const plannedCount = myTrips.filter((trip) => trip.status === StatutTrajet.PLANIFIE).length;
  const deliveredCount = myTrips.filter((trip) => trip.status === StatutTrajet.LIVRE).length;

  if (isLoading && myTrips.length === 0) {
    return <Loader fullScreen message="Chargement des missions..." />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{
        padding: 20,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
      }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>
          Missions
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {myTrips.length} mission{myTrips.length !== 1 ? "s" : ""} au total
        </Text>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          {[
            { label: "En mission", value: activeCount, color: Colors.info },
            { label: "Disponibles", value: plannedCount, color: Colors.warning },
            { label: "Livrees", value: deliveredCount, color: Colors.success },
          ].map((stat) => (
            <View
              key={stat.label}
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: stat.color + "35",
                backgroundColor: stat.color + "10",
                padding: 10,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "800", color: stat.color }}>
                {stat.value}
              </Text>
              <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 2 }}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchMyTrips} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="Aucune mission"
            description="Vos missions apparaitront ici apres acceptation d'une offre."
          />
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <View style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: item.color + "15",
              }}>
                {item.icon}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.textPrimary }}>
                  {item.title}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.textMuted }} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "800", color: item.color }}>
                {item.trips.length}
              </Text>
            </View>

            {item.trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onPress={() => router.push({
                  pathname: "/(client)/trip-detail",
                  params: { tripId: trip.id },
                })}
              />
            ))}
          </View>
        )}
      />
    </View>
  );
}
