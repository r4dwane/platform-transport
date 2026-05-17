// src/components/map/MapLocationPicker.tsx
//
// A complete location picker that combines:
//   1. A search bar (type address → see suggestions)
//   2. A map (tap to place a pin)
//   3. A confirm button
//
// Used in LoadForm for pickup and dropoff points

import { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, ActivityIndicator, Modal, ScrollView
} from "react-native";
import { LeafletMap, LatLng } from "./LeafletMap";
import { searchAddress, reverseGeocode, GeocodingResult } from "@/services/geocoding.service";
import { Colors } from "@/constants/colors";
import { Search, MapPin, X, Check } from "lucide-react-native";

// ─────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────

export interface PickedLocation {
  address: string;       // Human readable address
  latitude: number;
  longitude: number;
}

interface MapLocationPickerProps {
  visible: boolean;
  title: string;                        // "Point d'enlèvement" or "Point de livraison"
  initialLocation?: PickedLocation;
  onConfirm: (location: PickedLocation) => void;
  onClose: () => void;
}

// ─────────────────────────────────────────────
//  Component
// ─────────────────────────────────────────────

export const MapLocationPicker = ({
  visible,
  title,
  initialLocation,
  onConfirm,
  onClose,
}: MapLocationPickerProps) => {
  const [searchQuery, setSearchQuery]       = useState("");
  const [suggestions, setSuggestions]       = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching]       = useState(false);
  const [pickedLocation, setPickedLocation] = useState<PickedLocation | null>(
    initialLocation ?? null
  );
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // ── Search as user types ──────────────────────────────────────
  const handleSearchChange = useCallback(async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchAddress(text);
      setSuggestions(results);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // ── User picks a suggestion from the list ────────────────────
  const handleSuggestionSelect = (result: GeocodingResult) => {
    setPickedLocation({
      address: result.displayName,
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setSearchQuery(result.displayName);
    setSuggestions([]);
  };

  // ── User taps on the map ─────────────────────────────────────
  const handleMapTap = async (location: LatLng) => {
    setIsReverseGeocoding(true);
    try {
      const address = await reverseGeocode(location.latitude, location.longitude);
      setPickedLocation({
        address,
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setSearchQuery(address);
      setSuggestions([]);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // ── User confirms their choice ───────────────────────────────
  const handleConfirm = () => {
    if (pickedLocation) {
      onConfirm(pickedLocation);
      onClose();
    }
  };

  const markers = pickedLocation
    ? [
        {
          id: "picked",
          latitude: pickedLocation.latitude,
          longitude: pickedLocation.longitude,
          color: "orange" as const,
          title: "Position sélectionnée",
        },
      ]
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: Colors.background }}>

        {/* Header */}
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          padding: 16, paddingTop: 50, backgroundColor: Colors.surface,
          borderBottomWidth: 1, borderBottomColor: Colors.border,
        }}>
          <TouchableOpacity onPress={onClose}>
            <X size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={{ fontSize: 16, fontWeight: "700", color: Colors.textPrimary }}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!pickedLocation}
            style={{
              backgroundColor: pickedLocation ? Colors.primary : Colors.border,
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              Confirmer
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search bar */}
        <View style={{
          margin: 12, flexDirection: "row", alignItems: "center",
          backgroundColor: Colors.surface, borderRadius: 12,
          borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 12,
        }}>
          <Search size={18} color={Colors.textMuted} />
          <TextInput
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 10,
              fontSize: 14, color: Colors.textPrimary }}
            placeholder="Rechercher une adresse en Algérie..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
          />
          {isSearching && <ActivityIndicator size="small" color={Colors.primary} />}
          {searchQuery.length > 0 && !isSearching && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); setSuggestions([]); }}>
              <X size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search suggestions */}
        {suggestions.length > 0 && (
          <View style={{
            marginHorizontal: 12, backgroundColor: Colors.surface,
            borderRadius: 12, borderWidth: 1, borderColor: Colors.border,
            maxHeight: 200, overflow: "hidden", marginBottom: 8,
          }}>
            <FlatList
              data={suggestions}
              keyExtractor={(_, i) => i.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSuggestionSelect(item)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: 10,
                    padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
                  }}
                >
                  <MapPin size={16} color={Colors.primary} />
                  <Text style={{ flex: 1, fontSize: 13, color: Colors.textPrimary }}
                    numberOfLines={2}>
                    {item.displayName}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Instruction */}
        <View style={{
          marginHorizontal: 12, marginBottom: 8,
          flexDirection: "row", alignItems: "center", gap: 6,
        }}>
          <MapPin size={14} color={Colors.textMuted} />
          <Text style={{ fontSize: 12, color: Colors.textMuted }}>
            Recherchez une adresse ou appuyez sur la carte pour choisir un point
          </Text>
        </View>

        {/* Map */}
        <View style={{ flex: 1, marginHorizontal: 12, marginBottom: 12 }}>
          <LeafletMap
            center={
              pickedLocation
                ? { latitude: pickedLocation.latitude, longitude: pickedLocation.longitude }
                : { latitude: 36.7538, longitude: 3.0588 } // Default: Algiers
            }
            zoom={pickedLocation ? 14 : 6}
            markers={markers}
            pickMode={true}
            onMapTap={handleMapTap}
            style={{ borderRadius: 16, overflow: "hidden" }}
          />
        </View>

        {/* Reverse geocoding indicator */}
        {isReverseGeocoding && (
          <View style={{
            position: "absolute", bottom: 80, alignSelf: "center",
            backgroundColor: Colors.secondary + "ee", paddingHorizontal: 16,
            paddingVertical: 8, borderRadius: 20, flexDirection: "row",
            alignItems: "center", gap: 8,
          }}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={{ color: "#fff", fontSize: 13 }}>
              Récupération de l'adresse...
            </Text>
          </View>
        )}

        {/* Selected location preview */}
        {pickedLocation && (
          <View style={{
            margin: 12, padding: 12, backgroundColor: Colors.primary + "15",
            borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + "30",
            flexDirection: "row", alignItems: "center", gap: 10,
          }}>
            <Check size={16} color={Colors.primary} />
            <Text style={{ flex: 1, fontSize: 13, color: Colors.primary,
              fontWeight: "600" }} numberOfLines={2}>
              {pickedLocation.address}
            </Text>
          </View>
        )}

      </View>
    </Modal>
  );
};