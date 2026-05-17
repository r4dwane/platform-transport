import {
  View, Text, FlatList, RefreshControl,
  TouchableOpacity, ActivityIndicator
} from "react-native";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "expo-router";
import { ChevronDown, ChevronUp, Package } from "lucide-react-native";
import { OfferCard } from "@/components/offers/OfferCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { Badge } from "@/components/ui/Badge";
import { Colors } from "@/constants/colors";
import { useOffers } from "@/hooks/useOffers";
import { useLoads } from "@/hooks/useLoads";
import { MethodePaiement } from "@/types/payment.type";
import { StatutCharge, Load } from "@/types/load.types";
import { formatPrice } from "@/utils/formatPrice";

// Status display helpers
const LOAD_STATUS_COLORS: Record<string, string> = {
  DISPONIBLE: Colors.success,
  RESERVEE:   Colors.warning,
  EN_MISSION: Colors.info,
  LIVREE:     Colors.textMuted,
  ANNULEE:    Colors.error,
};
const LOAD_STATUS_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  RESERVEE:   "Réservée",
  EN_MISSION: "En mission",
  LIVREE:     "Livrée",
  ANNULEE:    "Annulée",
};

// One accordion section per load
const LoadOfferSection = ({
  load,
  onAccepted,
}: {
  load: Load;
  onAccepted: (tripId: string) => void;
}) => {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const { offers, fetchForLoad, acceptOffer, rejectOffer } = useOffers();

  // Auto-expand loads that have pending offers
  const loadOffers = useCallback(async () => {
    setSectionLoading(true);
    await fetchForLoad(load.id);
    setSectionLoading(false);
  }, [load.id]);

  useEffect(() => {
    if (expanded) loadOffers();
  }, [expanded]);

  const handleAccept = async (offerId: string) => {
    try {
      const tripId = await acceptOffer(offerId, MethodePaiement.CASH);
      if (tripId) onAccepted(tripId);
    } catch {}
  };

  const handleReject = async (offerId: string) => {
    try {
      await rejectOffer(offerId);
      await loadOffers(); // refresh after reject
    } catch {}
  };

  const canHaveOffers = load.status === StatutCharge.DISPONIBLE || load.status === StatutCharge.RESERVEE;

  return (
    <View style={{
      marginBottom: 12,
      borderRadius: 14,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: Colors.border,
      backgroundColor: Colors.surface,
    }}>
      {/* Load header — always visible */}
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        style={{
          padding: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        {/* Icon */}
        <View style={{
          width: 42, height: 42, borderRadius: 10,
          backgroundColor: Colors.primary + "15",
          alignItems: "center", justifyContent: "center",
        }}>
          <Package size={20} color={Colors.primary} />
        </View>

        {/* Info */}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontWeight: "700", fontSize: 14, color: Colors.textPrimary }}>
            {load.adressEnlev?.split(",")[0] ?? "Enlèvement"} →{" "}
            {load.adressLivr?.split(",")[0] ?? "Livraison"}
          </Text>
          <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
            {load.poidsKg} kg · {formatPrice(load.prixPropose)}
          </Text>
        </View>

        {/* Status + chevron */}
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <Badge
            label={LOAD_STATUS_LABELS[load.status] ?? load.status}
            color={LOAD_STATUS_COLORS[load.status] ?? Colors.textMuted}
            size="sm"
          />
          {expanded
            ? <ChevronUp size={16} color={Colors.textMuted} />
            : <ChevronDown size={16} color={Colors.textMuted} />
          }
        </View>
      </TouchableOpacity>

      {/* Expanded offers */}
      {expanded && (
        <View style={{
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          padding: 12,
          backgroundColor: Colors.background,
        }}>
          {sectionLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 16 }} />
          ) : !canHaveOffers ? (
            <Text style={{ textAlign: "center", color: Colors.textMuted,
              fontSize: 13, paddingVertical: 12 }}>
              Cette charge ne reçoit plus d'offres.
            </Text>
          ) : offers.length === 0 ? (
            <Text style={{ textAlign: "center", color: Colors.textMuted,
              fontSize: 13, paddingVertical: 12 }}>
              Aucune offre reçue pour l'instant.
            </Text>
          ) : (
            offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                showActions={load.status === StatutCharge.DISPONIBLE}
                onAccept={() => handleAccept(offer.id)}
                onReject={() => handleReject(offer.id)}
              />
            ))
          )}
        </View>
      )}
    </View>
  );
};


// ── Main screen ──────────────────────────────────────────────
export default function ClientOffersScreen() {
  const router = useRouter();
  const { myLoads, isLoadingMine, fetchMyLoads } = useLoads();

  useEffect(() => { fetchMyLoads(); }, []);

  // Sort: DISPONIBLE first, LIVREE/ANNULEE last
  const STATUS_ORDER: Record<string, number> = {
    DISPONIBLE: 0,
    RESERVEE:   1,
    EN_MISSION: 2,
    ANNULEE:    3,
    LIVREE:     4,
  };
  const sortedLoads = [...myLoads].sort(
    (a, b) => (STATUS_ORDER[a.status] ?? 5) - (STATUS_ORDER[b.status] ?? 5)
  );

  const pendingCount = myLoads.filter(l => l.status === StatutCharge.DISPONIBLE).length;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>

      {/* Header */}
      <View style={{ padding: 20, backgroundColor: Colors.surface,
        borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ fontSize: 22, fontWeight: "800", color: Colors.textPrimary }}>
          Offres reçues
        </Text>
        <Text style={{ fontSize: 14, color: Colors.textSecondary, marginTop: 2 }}>
          {pendingCount} charge{pendingCount !== 1 ? "s" : ""} en attente d'offres
        </Text>
      </View>

      {isLoadingMine ? (
        <Loader message="Chargement de vos charges..." />
      ) : (
        <FlatList
          data={sortedLoads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <LoadOfferSection
              load={item}
              onAccepted={(tripId) =>
                router.push({ pathname: "/(client)/tracking", params: { tripId } })
              }
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isLoadingMine} onRefresh={fetchMyLoads} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="📦"
              title="Aucune charge publiée"
              description="Publiez une charge depuis l'accueil pour recevoir des offres."
            />
          }
        />
      )}
    </View>
  );
}