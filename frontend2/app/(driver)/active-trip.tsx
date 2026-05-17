import { View, Text, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState, useRef } from "react";
import { LeafletMap, LatLng } from "@/components/map/LeafletMap";
import { TripStatusStepper } from "@/components/trips/TripStatusStepper";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Colors } from "@/constants/colors";
import { useLocation } from "@/hooks/useLocation";
import { useTrips } from "@/hooks/useTrips";
import { useDriverTracking } from "@/hooks/useTracking";
import { getRoute, formatDistance, formatDuration, RouteResult, haversineDistance } from "@/services/routing.service";
import { loadsService } from "@/services/loads.service";
import { StatutTrajet } from "@/types/trip.type";
import { getTripStatusLabel } from "@/utils/getStatusColor";
import { formatPrice } from "@/utils/formatPrice";
import { Navigation, MapPin, Clock, Ruler } from "lucide-react-native";

const NEXT_ACTION_LABELS: Partial<Record<StatutTrajet, string>> = {
  [StatutTrajet.PLANIFIE]:            "Démarrer vers le ramassage",
  [StatutTrajet.EN_ROUTE_RAMASSAGE]:  "Confirmer l'arrivée au ramassage",
  [StatutTrajet.CHARGEMENT]:          "Chargement terminé — Partir",
  [StatutTrajet.EN_ROUTE_LIVRAISON]:  "Confirmer la livraison",
};

// ─────────────────────────────────────────────
//  ETA Card Component
//  Shows distance + ETA to next destination
// ─────────────────────────────────────────────

function ETACard({
  label,
  address,
  distanceKm,
  durationMin,
  color,
}: {
  label: string;
  address: string;
  distanceKm: number;
  durationMin: number;
  color: string;
}) {
  return (
    <Card style={{ marginBottom: 0 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {label}
        </Text>
      </View>

      <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }} numberOfLines={2}>
        {address}
      </Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {/* Distance */}
        <View style={{
          flex: 1, backgroundColor: color + "12",
          borderRadius: 12, padding: 12, alignItems: "center",
          borderWidth: 1, borderColor: color + "25",
        }}>
          <Ruler size={16} color={color} />
          <Text style={{ fontSize: 18, fontWeight: "800", color, marginTop: 4 }}>
            {formatDistance(distanceKm)}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
            Restant
          </Text>
        </View>

        {/* ETA */}
        <View style={{
          flex: 1, backgroundColor: Colors.primary + "12",
          borderRadius: 12, padding: 12, alignItems: "center",
          borderWidth: 1, borderColor: Colors.primary + "25",
        }}>
          <Clock size={16} color={Colors.primary} />
          <Text style={{ fontSize: 18, fontWeight: "800", color: Colors.primary, marginTop: 4 }}>
            {formatDuration(durationMin)}
          </Text>
          <Text style={{ fontSize: 11, color: Colors.textMuted, marginTop: 2 }}>
            ETA
          </Text>
        </View>
      </View>
    </Card>
  );
}

// ─────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────

export default function ActiveTripScreen() {
  const { activeTrip, isLoading, fetchMyTrips, advanceStatus } = useTrips(false);
  const [load, setLoad]               = useState<any | null>(null);
  const [routePoints, setRoutePoints] = useState<LatLng[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const { location: driverLocation }  = useLocation(true);
  const routeTimerRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  useFocusEffect(useCallback(() => { fetchMyTrips(); }, []));

  // Fetch load details when trip changes
  useEffect(() => {
    if (!activeTrip?.chargeId) { setLoad(null); return; }
    loadsService.getById(activeTrip.chargeId)
      .then(({ data }) => setLoad(data))
      .catch(() => setLoad(null));
  }, [activeTrip?.chargeId]);

  // Calculate route — runs immediately + every 30s while driving
  const calculateRoute = useCallback(async () => {
    if (!driverLocation || !load) return;

    const pickup: LatLng = {
      latitude: load.coordEnlev.coordinates[1],
      longitude: load.coordEnlev.coordinates[0],
    };
    const dropoff: LatLng = {
      latitude: load.coordLivr.coordinates[1],
      longitude: load.coordLivr.coordinates[0],
    };

    // Route depends on current trip phase:
    //   EN_ROUTE_RAMASSAGE  → Driver → Pickup → Dropoff
    //   EN_ROUTE_LIVRAISON  → Driver → Dropoff only (already picked up)
    //   Other statuses      → Driver → Pickup → Dropoff (full route preview)
    const waypoints = activeTrip?.status === StatutTrajet.EN_ROUTE_LIVRAISON
      ? [driverLocation, dropoff]
      : [driverLocation, pickup, dropoff];

    try {
      const result = await getRoute(waypoints);
      if (result) {
        setRoutePoints(result.routePoints);
        setRouteResult(result);
      }
    } catch {}
  }, [driverLocation?.latitude, driverLocation?.longitude, load?.id, activeTrip?.status]);

  useEffect(() => {
    calculateRoute();

    // Recalculate every 30 seconds while driver is moving
    const isMoving =
      activeTrip?.status === StatutTrajet.EN_ROUTE_RAMASSAGE ||
      activeTrip?.status === StatutTrajet.EN_ROUTE_LIVRAISON;

    if (isMoving) {
      routeTimerRef.current = setInterval(calculateRoute, 30000);
    }

    return () => {
      if (routeTimerRef.current) clearInterval(routeTimerRef.current);
    };
  }, [calculateRoute, activeTrip?.status]);

  // Send GPS while driving
  useDriverTracking(
    activeTrip?.status === StatutTrajet.EN_ROUTE_RAMASSAGE ||
    activeTrip?.status === StatutTrajet.EN_ROUTE_LIVRAISON
      ? activeTrip?.id ?? null
      : null
  );

  const handleAdvance = () => {
    if (!activeTrip) return;
    const label = NEXT_ACTION_LABELS[activeTrip.status as StatutTrajet];
    Alert.alert("Confirmer", label ?? "Avancer le statut ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Confirmer", onPress: () => advanceStatus(activeTrip.id) },
    ]);
  };

  if (isLoading) return <Loader fullScreen message="Chargement de la mission..." />;

  if (!activeTrip) {
    return (
      <EmptyState
        icon="✅"
        title="Aucune mission active"
        description="Vous n'avez pas de trajet en cours. Soumettez une offre pour commencer."
      />
    );
  }

  const pickupCoords = load
    ? { latitude: load.coordEnlev.coordinates[1], longitude: load.coordEnlev.coordinates[0] }
    : { latitude: 36.7538, longitude: 3.0588 };

  const dropoffCoords = load
    ? { latitude: load.coordLivr.coordinates[1], longitude: load.coordLivr.coordinates[0] }
    : { latitude: 36.1922, longitude: 5.4133 };

  const nextAction = NEXT_ACTION_LABELS[activeTrip.status as StatutTrajet];

  // ── Calculate ETA metrics for display ──────────────────────────────────────
  // We compute segment distances separately so we can show:
  //   - Km + ETA to pickup   (when heading to pickup)
  //   - Km + ETA to dropoff  (when heading to deliver)
  let pickupDistKm   = 0;
  let pickupEtaMin   = 0;
  let dropoffDistKm  = 0;
  let dropoffEtaMin  = 0;

  if (driverLocation && routeResult) {
    const status = activeTrip.status as StatutTrajet;

    if (status === StatutTrajet.EN_ROUTE_RAMASSAGE) {
      // Leg 1: driver → pickup
      pickupDistKm = haversineDistance(driverLocation, pickupCoords);
      pickupEtaMin = Math.round((pickupDistKm / 70) * 60);
      // Leg 2: pickup → dropoff (full route minus first leg)
      dropoffDistKm = Math.max(0, routeResult.distanceKm - pickupDistKm);
      dropoffEtaMin = Math.max(0, routeResult.durationMin - pickupEtaMin);

    } else if (status === StatutTrajet.EN_ROUTE_LIVRAISON) {
      // Only remaining leg: driver → dropoff
      dropoffDistKm = routeResult.distanceKm;
      dropoffEtaMin = routeResult.durationMin;
    }
  }

  const markers = [
    {
      id: "pickup",
      latitude: pickupCoords.latitude,
      longitude: pickupCoords.longitude,
      title: "Enlèvement",
      color: "green" as const,
      popup: load?.adressEnlev,
    },
    {
      id: "dropoff",
      latitude: dropoffCoords.latitude,
      longitude: dropoffCoords.longitude,
      title: "Livraison",
      color: "red" as const,
      popup: load?.adressLivr,
    },
    ...(driverLocation ? [{
      id: "driver",
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
      title: "Ma position",
      color: "blue" as const,
    }] : []),
  ];

  const showPickupETA  = activeTrip.status === StatutTrajet.EN_ROUTE_RAMASSAGE && pickupDistKm > 0;
  const showDropoffETA = (
    activeTrip.status === StatutTrajet.EN_ROUTE_RAMASSAGE ||
    activeTrip.status === StatutTrajet.EN_ROUTE_LIVRAISON
  ) && dropoffDistKm > 0;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* Map */}
      <View style={{ height: 260, padding: 12 }}>
        <LeafletMap
          center={driverLocation ?? pickupCoords}
          zoom={12}
          markers={markers}
          routePoints={routePoints}
          routeColor="#F97316"
          style={{ flex: 1 }}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>

        {/* ETA Cards — shown only while driving */}
        {showPickupETA && (
          <ETACard
            label="Vers le ramassage"
            address={load?.adressEnlev ?? ""}
            distanceKm={pickupDistKm}
            durationMin={pickupEtaMin}
            color={Colors.success}
          />
        )}

        {showDropoffETA && (
          <ETACard
            label={activeTrip.status === StatutTrajet.EN_ROUTE_LIVRAISON
              ? "Vers la livraison"
              : "Distance totale de livraison"}
            address={load?.adressLivr ?? ""}
            distanceKm={dropoffDistKm}
            durationMin={dropoffEtaMin}
            color={Colors.error}
          />
        )}

        {/* Status stepper */}
        <Card>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <View style={{ backgroundColor: Colors.primary + "15", padding: 10, borderRadius: 12 }}>
              <Navigation size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={{ fontSize: 12, color: Colors.textMuted }}>Statut actuel</Text>
              <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
                {getTripStatusLabel(activeTrip.status as StatutTrajet)}
              </Text>
            </View>
          </View>
          <TripStatusStepper currentStatus={activeTrip.status as StatutTrajet} />
        </Card>

        {/* Payment */}
        <Card>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: Colors.textSecondary, fontSize: 14 }}>Rémunération</Text>
            <Text style={{ fontSize: 20, fontWeight: "800", color: Colors.primary }}>
              {formatPrice(activeTrip.infoPaiement.montant)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: Colors.textMuted, marginTop: 4 }}>
            Méthode : {activeTrip.infoPaiement.methode}
          </Text>
        </Card>

        {/* Advance button */}
        {nextAction && (
          <Button title={nextAction} onPress={handleAdvance} size="lg" style={{ marginTop: 4 }} />
        )}

        {activeTrip.status === StatutTrajet.LIVRE && !activeTrip.proofOfDelivery && (
          <Button
            title="📸 Soumettre preuve de livraison"
            variant="outline"
            onPress={() => {}}
          />
        )}

      </ScrollView>
    </View>
  );
}