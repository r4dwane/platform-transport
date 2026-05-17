import { View, Text, ScrollView } from "react-native";
import { useEffect, useState, useRef, useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router";
import { LeafletMap, LatLng } from "@/components/map/LeafletMap";
import { TripStatusStepper } from "@/components/trips/TripStatusStepper";
import { Card } from "@/components/ui/Card";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useTrips } from "@/hooks/useTrips";
import { useTracking } from "@/hooks/useTracking";
import { useAuthStore } from "@/store/auth.store";
import { StatutTrajet } from "@/types/trip.type";
import { formatPrice } from "@/utils/formatPrice";
import { loadsService } from "@/services/loads.service";
import { getRoute, formatDistance, formatDuration, haversineDistance, RouteResult } from "@/services/routing.service";
import { Clock, Ruler, MapPin, Navigation } from "lucide-react-native";

// ─────────────────────────────────────────────
//  ETA Card — reused from driver screen logic
// ─────────────────────────────────────────────

function ETACard({
  label, address, distanceKm, durationMin, color,
}: {
  label: string; address: string;
  distanceKm: number; durationMin: number; color: string;
}) {
  return (
    <Card style={{ marginBottom: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.textMuted,
          textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }} numberOfLines={2}>
        {address}
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: color + "12", borderRadius: 12,
          padding: 12, alignItems: "center", borderWidth: 1, borderColor: color + "25" }}>
          <Ruler size={16} color={color} />
          <Text style={{ fontSize: 18, fontWeight: "800", color, marginTop: 4 }}>
            {formatDistance(distanceKm)}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>Restant</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: Colors.primary + "12", borderRadius: 12,
          padding: 12, alignItems: "center", borderWidth: 1, borderColor: Colors.primary + "25" }}>
          <Clock size={16} color={Colors.primary} />
          <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.primary, marginTop: 4 }}>
            {formatDuration(durationMin)}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>ETA</Text>
        </View>
      </View>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────

export default function ClientTrackingScreen() {
  const { tripId } = useLocalSearchParams<{ tripId?: string }>();
  const { user }   = useAuthStore();
  const { activeTrip, selectedTrip, fetchById, fetchMyTrips } = useTrips(false);
  const [load, setLoad]               = useState<any | null>(null);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const routeTimerRef                 = useRef<ReturnType<typeof setInterval> | null>(null);
  const [pickupRouteResult, setPickupRouteResult] = useState<RouteResult | null>(null);

  const currentTrip = tripId ? selectedTrip : activeTrip;

  useFocusEffect(useCallback(() => {
    if (tripId) fetchById(tripId);
    else fetchMyTrips();
  }, [tripId]));

  useEffect(() => {
    if (!currentTrip?.chargeId) return;
    loadsService.getById(currentTrip.chargeId)
      .then(({ data }) => setLoad(data))
      .catch(() => setLoad(null));
  }, [currentTrip?.chargeId]);

  // Live driver position via WebSocket
  const { driverLocation } = useTracking(currentTrip?.id ?? null, user?.id ?? null);

  // Pickup + dropoff coordinates
  const pickupCoords = load
    ? { latitude: load.coordEnlev.coordinates[1], longitude: load.coordEnlev.coordinates[0] }
    : null;
  const dropoffCoords = load
    ? { latitude: load.coordLivr.coordinates[1], longitude: load.coordLivr.coordinates[0] }
    : null;

  // Recalculate route whenever driver moves
  const calculateRoute = useCallback(async () => {
  if (!driverLocation || !pickupCoords || !dropoffCoords) return;

  const driverLatLng: LatLng = {
    latitude: driverLocation.lat,
    longitude: driverLocation.lon,
  };

  const status = currentTrip?.status as StatutTrajet;

  try {
    if (status === StatutTrajet.EN_ROUTE_RAMASSAGE) {
      // Full route: driver → pickup → dropoff
      const fullRoute = await getRoute([driverLatLng, pickupCoords, dropoffCoords]);

      // Pickup-only route: driver → pickup
      const pickupRoute = await getRoute([driverLatLng, pickupCoords]);

      if (fullRoute) {
        setRoutePoints(fullRoute.routePoints);
        setRouteResult(fullRoute);
      }

      if (pickupRoute) {
        setPickupRouteResult(pickupRoute);
      }

    } else if (status === StatutTrajet.EN_ROUTE_LIVRAISON) {
      const deliveryRoute = await getRoute([driverLatLng, dropoffCoords]);

      if (deliveryRoute) {
        setRoutePoints(deliveryRoute.routePoints);
        setRouteResult(deliveryRoute);
      }

      setPickupRouteResult(null);
    }
  } catch {}
  }, [driverLocation?.lat, driverLocation?.lon, load?.id, currentTrip?.status]);

  useEffect(() => {
    calculateRoute();
    // Refresh route every 30s when trip is active
    const isActive =
      currentTrip?.status === StatutTrajet.EN_ROUTE_RAMASSAGE ||
      currentTrip?.status === StatutTrajet.EN_ROUTE_LIVRAISON;
    if (isActive) {
      routeTimerRef.current = setInterval(calculateRoute, 30000);
    }
    return () => { if (routeTimerRef.current) clearInterval(routeTimerRef.current); };
  }, [calculateRoute, currentTrip?.status]);

  if (!currentTrip || !load) {
    return <Loader fullScreen message="Chargement du trajet..." />;
  }

  // ── ETA calculations ────────────────────────────────────────────────────────
  let pickupDistKm  = 0;
  let pickupEtaMin  = 0;
  let dropoffDistKm = 0;
  let dropoffEtaMin = 0;
  const status = currentTrip.status as StatutTrajet;

  if (driverLocation && routeResult && pickupCoords && dropoffCoords) {
    if (status === StatutTrajet.EN_ROUTE_RAMASSAGE && pickupRouteResult) {
      pickupDistKm  = pickupRouteResult.distanceKm;
      pickupEtaMin  = pickupRouteResult.durationMin;

      dropoffDistKm = Math.max(0, routeResult.distanceKm - pickupDistKm);
      dropoffEtaMin = Math.max(0, routeResult.durationMin - pickupEtaMin);

    } else if (status === StatutTrajet.EN_ROUTE_LIVRAISON) {
      dropoffDistKm = routeResult.distanceKm;
      dropoffEtaMin = routeResult.durationMin;
    }
  }

  const showPickupETA  = status === StatutTrajet.EN_ROUTE_RAMASSAGE && pickupDistKm > 0;
  const showDropoffETA = (
    status === StatutTrajet.EN_ROUTE_RAMASSAGE ||
    status === StatutTrajet.EN_ROUTE_LIVRAISON
  ) && dropoffDistKm > 0;

  const mapCenter = driverLocation
    ? { latitude: driverLocation.lat, longitude: driverLocation.lon }
    : pickupCoords ?? { latitude: 36.7538, longitude: 3.0588 };

  const markers = [
    ...(pickupCoords ? [{
      id: "pickup",
      latitude: pickupCoords.latitude,
      longitude: pickupCoords.longitude,
      title: "Enlèvement",
      color: "green" as const,
      popup: load.adressEnlev,
    }] : []),
    ...(dropoffCoords ? [{
      id: "dropoff",
      latitude: dropoffCoords.latitude,
      longitude: dropoffCoords.longitude,
      title: "Livraison",
      color: "red" as const,
      popup: load.adressLivr,
    }] : []),
    ...(driverLocation ? [{
      id: "driver",
      latitude: driverLocation.lat,
      longitude: driverLocation.lon,
      title: "Chauffeur",
      color: "blue" as const,
      popup: `Dernière position: ${new Date(driverLocation.ts).toLocaleTimeString("fr-DZ")}`,
    }] : []),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* Map */}
      <View style={{ height: 300, padding: 12 }}>
        <LeafletMap
          center={mapCenter}
          zoom={12}
          markers={markers}
          routePoints={routePoints}
          routeColor="#F97316"
          style={{ flex: 1 }}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* ETA to pickup */}
        {showPickupETA && (
          <ETACard
            label="Chauffeur vers le ramassage"
            address={load.adressEnlev}
            distanceKm={pickupDistKm}
            durationMin={pickupEtaMin}
            color={Colors.success}
          />
        )}

        {/* ETA to delivery */}
        {showDropoffETA && (
          <ETACard
            label={status === StatutTrajet.EN_ROUTE_LIVRAISON
              ? "Chauffeur vers la livraison"
              : "Distance totale de livraison"}
            address={load.adressLivr}
            distanceKm={dropoffDistKm}
            durationMin={dropoffEtaMin}
            color={Colors.error}
          />
        )}

        {/* No driver location yet */}
        {!driverLocation && (
          status === StatutTrajet.EN_ROUTE_RAMASSAGE ||
          status === StatutTrajet.EN_ROUTE_LIVRAISON
        ) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: Colors.warning + "15", padding: 12, borderRadius: 12,
            borderWidth: 1, borderColor: Colors.warning + "30" }}>
            <Navigation size={16} color={Colors.warning} />
            <Text style={{ fontSize: 13, color: Colors.warning, flex: 1 }}>
              En attente de la position GPS du chauffeur...
            </Text>
          </View>
        )}

        {/* Trip progress */}
        <Card>
          <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary, marginBottom: 16 }}>
            Progression du trajet
          </Text>
          <TripStatusStepper currentStatus={status} />
        </Card>

        {/* Route summary */}
        <Card>
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <MapPin size={14} color={Colors.success} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>ENLÈVEMENT</Text>
                <Text style={{ fontSize: 13, color: Colors.textPrimary, fontWeight: "600" }}>
                  {load.adressEnlev}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
              <MapPin size={14} color={Colors.error} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: Colors.textMuted }}>LIVRAISON</Text>
                <Text style={{ fontSize: 13, color: Colors.textPrimary, fontWeight: "600" }}>
                  {load.adressLivr}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Payment */}
        <Card>
          <Text style={{ fontSize: 15, fontWeight: "700", color: Colors.textPrimary, marginBottom: 12 }}>
            Paiement
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ color: Colors.textSecondary }}>Montant</Text>
            <Text style={{ fontWeight: "700", color: Colors.primary }}>
              {formatPrice(currentTrip.infoPaiement.montant)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <Text style={{ color: Colors.textSecondary }}>Statut</Text>
            <Text style={{
              fontWeight: "600",
              color: currentTrip.infoPaiement.status === "PAYE" ? Colors.success : Colors.warning,
            }}>
              {currentTrip.infoPaiement.status}
            </Text>
          </View>
        </Card>

      </ScrollView>
    </View>
  );
}