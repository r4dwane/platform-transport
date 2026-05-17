// app/(driver)/home.tsx
//
// This screen serves BOTH driver types:
//   - CHAUFFEUR_IND: can browse loads and submit offers
//   - CHAUFFEUR_FLOTTE: can ONLY see their assigned mission, no browsing

import {
  View, Text, TouchableOpacity, ActivityIndicator,
  ScrollView, Dimensions
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { LeafletMap, MapMarker, LatLng } from "@/components/map/LeafletMap";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { OfferForm } from "@/components/offers/OfferForm";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Colors } from "@/constants/colors";
import { useLoads } from "@/hooks/useLoads";
import { useOffers } from "@/hooks/useOffers";
import { useTrips } from "@/hooks/useTrips";
import { useLocation } from "@/hooks/useLocation";
import { usersService } from "@/services/users.service";
import { loadsService } from "@/services/loads.service";
import { getRoute, formatDistance, formatDuration, RouteResult } from "@/services/routing.service";
import { useAuthStore } from "@/store/auth.store";
import { RoleUtilisateur } from "@/types/user.types";
import { Load } from "@/types/load.types";
import { Vehicle } from "@/types/vehicule.type";
import { StatutTrajet } from "@/types/trip.type";
import { getTripStatusLabel, getTripStatusColor } from "@/utils/getStatusColor";
import { formatPrice } from "@/utils/formatPrice";
import { MapPin, Navigation, Package, Weight, X, Truck, AlertTriangle } from "lucide-react-native";

const SCREEN_HEIGHT = Dimensions.get("window").height;

const TYPE_LABELS: Record<string, string> = {
  GENERAL: "Général", PERISSABLE: "Périssable", DANGEREUX: "Dangereux",
  FRAGILE: "Fragile", VOLUMINEUX: "Volumineux", LIQUIDE: "Liquide",
};

// Active statuses — driver cannot take new mission in these states
const BLOCKING_STATUSES: StatutTrajet[] = [
  StatutTrajet.EN_ROUTE_RAMASSAGE,
  StatutTrajet.CHARGEMENT,
  StatutTrajet.EN_ROUTE_LIVRAISON,
];

// ─────────────────────────────────────────────
//  Fleet Driver Home
// ─────────────────────────────────────────────
function FleetDriverHome() {
  const { activeTrip, isLoading, fetchMyTrips } = useTrips(false);
  const { location: driverLocation } = useLocation(true);
  const [load, setLoad] = useState<any>(null);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);

  useFocusEffect(useCallback(() => { fetchMyTrips(); }, []));

  useEffect(() => {
    if (activeTrip?.chargeId) {
      loadsService.getById(activeTrip.chargeId)
        .then(({ data }) => setLoad(data))
        .catch(() => {});
    } else {
      setLoad(null);
      setRoutePoints([]); 
    }
  }, [activeTrip?.chargeId]);

  useEffect(() => {
    if (!driverLocation || !load || !activeTrip) {
      setRoutePoints([]);
      return
    };
    const pickup: LatLng = { latitude: load.coordEnlev.coordinates[1], longitude: load.coordEnlev.coordinates[0] };
    const dropoff: LatLng = { latitude: load.coordLivr.coordinates[1], longitude: load.coordLivr.coordinates[0] };
    getRoute([driverLocation, pickup, dropoff])
      .then((r) => { if (r) setRoutePoints(r.routePoints); })
      .catch(() => {});
  }, [driverLocation?.latitude, driverLocation?.longitude, load?.id]);

  // REPLACE the markers array:
const markers: MapMarker[] = [
  ...(driverLocation ? [{
    id: "driver",
    latitude: driverLocation.latitude,
    longitude: driverLocation.longitude,
    title: "Ma position",
    color: "blue" as const,
  }] : []),
  // ← ADD activeTrip guard here:
  ...(load && activeTrip ? [
    {
      id: "pickup",
      latitude: load.coordEnlev.coordinates[1],
      longitude: load.coordEnlev.coordinates[0],
      title: "Enlèvement",
      color: "green" as const,
      popup: load.adressEnlev,
    },
    {
      id: "dropoff",
      latitude: load.coordLivr.coordinates[1],
      longitude: load.coordLivr.coordinates[0],
      title: "Livraison",
      color: "red" as const,
      popup: load.adressLivr,
    },
  ] : []),
];

  if (isLoading) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ height: activeTrip ? SCREEN_HEIGHT * 0.45 : SCREEN_HEIGHT * 0.6 }}>
        <LeafletMap center={driverLocation ?? { latitude: 36.7538, longitude: 3.0588 }} zoom={driverLocation ? 12 : 6} markers={markers} routePoints={routePoints} routeColor={Colors.primary} style={{ flex: 1 }} />
        {driverLocation && (
          <View style={{ position: "absolute", bottom: 12, left: 12, backgroundColor: Colors.info + "ee", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Navigation size={12} color="#fff" /><Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>GPS actif</Text>
          </View>
        )}
      </View>
      {activeTrip && load ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
          <Card style={{ borderLeftWidth: 4, borderLeftColor: getTripStatusColor(activeTrip.status as StatutTrajet) }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.primary }}>{formatPrice(activeTrip.infoPaiement.montant)}</Text>
              <Badge label={getTripStatusLabel(activeTrip.status as StatutTrajet)} color={getTripStatusColor(activeTrip.status as StatutTrajet)} size="sm" />
            </View>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><MapPin size={14} color={Colors.success} /><Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }}>{load.adressEnlev}</Text></View>
              <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><MapPin size={14} color={Colors.error} /><Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }}>{load.adressLivr}</Text></View>
            </View>
          </Card>
          <Text style={{ fontSize: 12, color: Colors.textMuted, textAlign: "center" }}>Rendez-vous dans l'onglet Mission pour mettre à jour le statut</Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 }}>
          <View style={{ backgroundColor: Colors.primary + "15", padding: 20, borderRadius: 24, marginBottom: 8 }}><Truck size={40} color={Colors.primary} /></View>
          <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.textPrimary }}>Pas de mission</Text>
          <Text style={{ fontSize: 14, color: Colors.textSecondary, textAlign: "center", lineHeight: 22 }}>Votre propriétaire de flotte vous assignera une mission.{"\n"}Vous serez notifié dès qu'une mission vous est attribuée.</Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
//  Independent Driver Home
// ─────────────────────────────────────────────
function IndependentDriverHome() {
  const router = useRouter();
  const [showSheet, setShowSheet] = useState(false);
  const { user } = useAuthStore();
  const { availableLoads, isLoadingAvailable, fetchAvailable } = useLoads();
  const { submitOffer, isLoading: isSubmitting } = useOffers();
  const { activeTrip, fetchMyTrips } = useTrips(false);
  const { location: driverLocation } = useLocation(true);
  const [selectedLoad, setSelectedLoad] = useState<Load | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Is driver currently on an active blocking mission?
  const isOnMission = activeTrip != null &&
    BLOCKING_STATUSES.includes(activeTrip.status as StatutTrajet);

  useFocusEffect(useCallback(() => {
    fetchAvailable();
    fetchMyTrips();
    usersService.getMyVehicles()
      .then(({ data }) => setVehicles(data.vehicules))
      .catch(() => {});
  }, []));

  const buildMarkers = (): MapMarker[] => {
    const markers: MapMarker[] = [];
    if (driverLocation) {
      markers.push({ id: "driver", latitude: driverLocation.latitude, longitude: driverLocation.longitude, title: "Ma position", color: "blue" });
    }
    availableLoads.forEach((load) => {
      const isSelected = selectedLoad?.id === load.id;
      if (isSelected) {
        markers.push({ id: `pickup-${load.id}`, latitude: load.coordEnlev.coordinates[1], longitude: load.coordEnlev.coordinates[0], title: "Enlèvement", color: "green", popup: load.adressEnlev });
        markers.push({ id: `dropoff-${load.id}`, latitude: load.coordLivr.coordinates[1], longitude: load.coordLivr.coordinates[0], title: "Livraison", color: "red", popup: load.adressLivr });
      } else {
        markers.push({ id: load.id, latitude: load.coordEnlev.coordinates[1], longitude: load.coordEnlev.coordinates[0], title: `${formatPrice(load.prixPropose)} — ${load.poidsKg}kg`, color: "orange", popup: load.adressEnlev });
      }
    });
    return markers;
  };

  const handleMarkerTap = async (markerId: string) => {
    if (markerId === "driver" || markerId.startsWith("pickup-") || markerId.startsWith("dropoff-")) return;
    const load = availableLoads.find((l) => l.id === markerId);
    if (!load) return;
    if (selectedLoad?.id === load.id) { setSelectedLoad(null); setRouteResult(null); return; }
    setSelectedLoad(load);
    setRouteResult(null);
    if (driverLocation) {
      setIsLoadingRoute(true);
      try {
        const result = await getRoute([
          driverLocation,
          { latitude: load.coordEnlev.coordinates[1], longitude: load.coordEnlev.coordinates[0] },
          { latitude: load.coordLivr.coordinates[1], longitude: load.coordLivr.coordinates[0] },
        ]);
        setRouteResult(result);
      } finally {
        setIsLoadingRoute(false);
      }
    }
  };

  const handleSubmitOffer = async (payload: any) => {
    await submitOffer(payload);
    setShowSheet(false);
    setSelectedLoad(null);
    setRouteResult(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {/* Header */}
      <View style={{ padding: 16, paddingTop: 50, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontSize: 13, color: Colors.textSecondary }}>Bonjour,</Text>
          <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.textPrimary }}>{user?.nom} 🚛</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>Disponibles</Text>
          <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.primary }}>{String(availableLoads.length)}</Text>
        </View>
      </View>

      {/* Mission in progress banner */}
      {isOnMission && (
        <TouchableOpacity
          onPress={() => router.push("/(driver)/active-trip")}
          style={{ backgroundColor: Colors.warning + "20", borderBottomWidth: 1, borderBottomColor: Colors.warning + "40", padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <AlertTriangle size={18} color={Colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: Colors.warning }}>Mission en cours</Text>
            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>Terminez votre mission actuelle avant d'en accepter une nouvelle.</Text>
          </View>
          <Text style={{ fontSize: 12, color: Colors.warning, fontWeight: "700" }}>Voir →</Text>
        </TouchableOpacity>
      )}

      {/* Map */}
      <View style={{ height: selectedLoad ? SCREEN_HEIGHT * 0.40 : SCREEN_HEIGHT * 0.58 }}>
        <LeafletMap
          center={driverLocation ?? { latitude: 36.7538, longitude: 3.0588 }}
          zoom={driverLocation ? 10 : 6}
          markers={buildMarkers()}
          routePoints={routeResult?.routePoints ?? []}
          routeColor={Colors.primary}
          onMarkerTap={handleMarkerTap}
          style={{ flex: 1 }}
        />
        {isLoadingRoute && (
          <View style={{ position: "absolute", top: 12, alignSelf: "center", backgroundColor: Colors.secondary + "ee", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: "#fff", fontSize: 13 }}>Calcul itinéraire...</Text>
          </View>
        )}
        {driverLocation && (
          <View style={{ position: "absolute", bottom: 12, left: 12, backgroundColor: Colors.info + "ee", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Navigation size={12} color="#fff" /><Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>GPS actif</Text>
          </View>
        )}
      </View>

      {/* Selected load detail */}
      {selectedLoad ? (
        <ScrollView style={{ flex: 1, backgroundColor: Colors.surface }} contentContainerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.primary }}>{formatPrice(selectedLoad.prixPropose)}</Text>
              <Badge label={TYPE_LABELS[selectedLoad.typeMarchandises] ?? selectedLoad.typeMarchandises} color={Colors.primary} size="sm" />
            </View>
            <TouchableOpacity onPress={() => { setSelectedLoad(null); setRouteResult(null); }} style={{ backgroundColor: Colors.border, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
              <X size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {routeResult && (
            <View style={{ flexDirection: "row", gap: 10, marginBottom: 14, backgroundColor: Colors.primary + "10", padding: 12, borderRadius: 12 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>Distance totale</Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.primary }}>{formatDistance(routeResult.distanceKm)}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: Colors.border }} />
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>Durée estimée</Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.primary }}>{formatDuration(routeResult.durationMin)}</Text>
              </View>
            </View>
          )}

          <View style={{ gap: 8, marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}><MapPin size={14} color={Colors.success} /><Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }}>{selectedLoad.adressEnlev}</Text></View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}><MapPin size={14} color={Colors.error} /><Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }}>{selectedLoad.adressLivr}</Text></View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 12, backgroundColor: Colors.background, borderRadius: 12, marginBottom: 16 }}>
            <Weight size={16} color={Colors.textMuted} />
            <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Poids :</Text>
            <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.textPrimary }}>{selectedLoad.poidsKg} kg</Text>
          </View>

          {/* Offer button — blocked if on active mission */}
          {isOnMission ? (
            <TouchableOpacity
              onPress={() => router.push("/(driver)/active-trip")}
              style={{ backgroundColor: Colors.warning + "20", padding: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, borderWidth: 1, borderColor: Colors.warning + "40", marginBottom: 20 }}
            >
              <AlertTriangle size={18} color={Colors.warning} />
              <Text style={{ color: Colors.warning, fontSize: 14, fontWeight: "700" }}>Terminez votre mission en cours d'abord</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setShowSheet(true)}
              style={{ backgroundColor: Colors.primary, padding: 16, borderRadius: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 10, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, marginBottom: 20 }}
            >
              <Package size={20} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 16, fontWeight: "800" }}>Soumettre une offre</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 }}>
          {isLoadingAvailable ? <ActivityIndicator size="large" color={Colors.primary} /> : availableLoads.length === 0 ? (
            <><Text style={{ fontSize: 36 }}>🔍</Text><Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>Aucune charge disponible</Text></>
          ) : (
            <><Text style={{ fontSize: 36 }}>👆</Text><Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>Appuyez sur un marqueur</Text><Text style={{ fontSize: 13, color: Colors.textMuted, textAlign: "center" }}>Touchez une charge sur la carte pour voir les détails.</Text></>
          )}
        </View>
      )}

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        {selectedLoad && <OfferForm chargeId={selectedLoad.id} vehicles={vehicles} onSubmit={handleSubmitOffer} isLoading={isSubmitting} loadPrice={selectedLoad.prixPropose} />}
      </BottomSheet>
    </View>
  );
}

export default function DriverHomeScreen() {
  const { role } = useAuthStore();
  console.log("DRIVER HOME ROLE:", role);
  if (role === RoleUtilisateur.CHAUFFEUR_FLOTTE) return <FleetDriverHome />;
  return <IndependentDriverHome />;
}