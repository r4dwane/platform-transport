import { useRef, useEffect, useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  color?: "green" | "red" | "orange" | "blue" | "gray";
  popup?: string;
}

export interface LeafletMapProps {
  center?: LatLng;
  zoom?: number;
  markers?: MapMarker[];
  routePoints?: LatLng[];
  routeColor?: string;
  pickMode?: boolean;
  onMapTap?: (location: LatLng) => void;
  onMarkerTap?: (markerId: string) => void;
  onMapReady?: () => void;
  style?: object;
}

const generateMapHTML = (
  center: LatLng,
  zoom: number,
  pickMode: boolean
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }

    @keyframes pulse {
      0%   { transform: scale(1); opacity: 1; }
      50%  { transform: scale(1.3); opacity: 0.7; }
      100% { transform: scale(1); opacity: 1; }
    }
    .driver-marker { animation: pulse 2s infinite; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${center.latitude}, ${center.longitude}],
      zoom: ${zoom},
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var markers = {};
    var routeLayer = null;
    var pickMode = ${pickMode};
    var pickMarker = null;

    function createIcon(color) {
      var colors = {
        green:  '#22C55E',
        red:    '#EF4444',
        orange: '#F97316',
        blue:   '#3B82F6',
        gray:   '#94A3B8',
      };
      var c = colors[color] || colors.blue;
      var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40">'
        + '<path d="M14 0C6.3 0 0 6.3 0 14c0 10.5 14 26 14 26S28 24.5 28 14C28 6.3 21.7 0 14 0z" fill="' + c + '"/>'
        + '<circle cx="14" cy="14" r="6" fill="white"/>'
        + '</svg>';
      return L.divIcon({
        html: svg,
        iconSize: [28, 40],
        iconAnchor: [14, 40],
        popupAnchor: [0, -40],
        className: '',
      });
    }

    function createDriverIcon() {
      var svg = '<div class="driver-marker">'
        + '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">'
        + '<circle cx="18" cy="18" r="18" fill="#F97316" opacity="0.3"/>'
        + '<circle cx="18" cy="18" r="12" fill="#F97316"/>'
        + '<text x="18" y="23" text-anchor="middle" font-size="14">🚚</text>'
        + '</svg></div>';
      return L.divIcon({
        html: svg,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: '',
      });
    }

    function sendToRN(data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      }
    }

    map.on('click', function(e) {
      if (pickMode) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;

        if (pickMarker) map.removeLayer(pickMarker);
        pickMarker = L.marker([lat, lng], { icon: createIcon('orange') }).addTo(map);

        sendToRN({ type: 'map_tap', latitude: lat, longitude: lng });
      }
    });

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);

    function handleMessage(event) {
      try {
        var cmd = JSON.parse(event.data);
        switch(cmd.action) {
          case 'add_marker':
            if (markers[cmd.id]) map.removeLayer(markers[cmd.id]);
            var icon = cmd.isDriver ? createDriverIcon() : createIcon(cmd.color || 'blue');
            var m = L.marker([cmd.latitude, cmd.longitude], { icon: icon });
            if (cmd.popup) m.bindPopup(cmd.popup);
            if (cmd.title) m.bindTooltip(cmd.title, { permanent: false });
            m.on('click', function() {
              sendToRN({ type: 'marker_tap', id: cmd.id });
            });
            m.addTo(map);
            markers[cmd.id] = m;
            break;

          case 'remove_marker':
            if (markers[cmd.id]) {
              map.removeLayer(markers[cmd.id]);
              delete markers[cmd.id];
            }
            break;

          case 'clear_markers':
            Object.values(markers).forEach(function(m) { map.removeLayer(m); });
            markers = {};
            break;

          case 'draw_route':
            if (routeLayer) map.removeLayer(routeLayer);
            var points = cmd.points.map(function(p) { return [p.latitude, p.longitude]; });
            routeLayer = L.polyline(points, {
              color: cmd.color || '#F97316',
              weight: 4,
              opacity: 0.8,
              dashArray: cmd.dashed ? '8, 8' : null,
            }).addTo(map);
            break;

          case 'clear_route':
            if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
            break;

          case 'set_center':
            map.setView([cmd.latitude, cmd.longitude], cmd.zoom || map.getZoom());
            break;

          case 'fit_bounds':
            var bounds = cmd.points.map(function(p) { return [p.latitude, p.longitude]; });
            if (bounds.length > 0) map.fitBounds(bounds, { padding: [40, 40] });
            break;

          case 'set_pick_mode':
            pickMode = cmd.enabled;
            map.getContainer().style.cursor = cmd.enabled ? 'crosshair' : '';
            break;
        }
      } catch(e) {
        console.log('Map message error:', e);
      }
    }

    sendToRN({ type: 'map_ready' });
  </script>
</body>
</html>
`;

const DEFAULT_CENTER: LatLng = { latitude: 36.7538, longitude: 3.0588 };

export const LeafletMap = ({
  center = DEFAULT_CENTER,
  zoom = 10,
  markers = [],
  routePoints = [],
  routeColor = "#F97316",
  pickMode = false,
  onMapTap,
  onMarkerTap,
  onMapReady,
  style,
}: LeafletMapProps) => {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);

  const initialHtml = useMemo(
    () => generateMapHTML(center, zoom, pickMode),
    []
  );

  const sendCommand = (command: object) => {
    if (webViewRef.current && mapReady) {
      webViewRef.current.postMessage(JSON.stringify(command));
    }
  };

  useEffect(() => {
    if (!mapReady) return;
    sendCommand({
      action: "set_center",
      latitude: center.latitude,
      longitude: center.longitude,
      zoom,
    });
  }, [center.latitude, center.longitude, zoom, mapReady]);

  useEffect(() => {
    if (!mapReady) return;

    sendCommand({ action: "clear_markers" });
    markers.forEach((marker) => {
      sendCommand({
        action: "add_marker",
        id: marker.id,
        latitude: marker.latitude,
        longitude: marker.longitude,
        color: marker.color ?? "blue",
        title: marker.title,
        popup: marker.popup,
        isDriver: marker.id === "driver",
      });
    });

    if (markers.length > 0) {
      sendCommand({
        action: "fit_bounds",
        points: markers.map((m) => ({
          latitude: m.latitude,
          longitude: m.longitude,
        })),
      });
    }
  }, [markers, mapReady]);

  useEffect(() => {
    if (!mapReady) return;

    if (routePoints.length > 1) {
      sendCommand({
        action: "draw_route",
        points: routePoints,
        color: routeColor,
      });
    } else {
      sendCommand({ action: "clear_route" });
    }
  }, [routePoints, routeColor, mapReady]);

  useEffect(() => {
    if (!mapReady) return;
    sendCommand({ action: "set_pick_mode", enabled: pickMode });
  }, [pickMode, mapReady]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case "map_ready":
          setMapReady(true);
          onMapReady?.();
          break;
        case "map_tap":
          onMapTap?.({ latitude: data.latitude, longitude: data.longitude });
          break;
        case "marker_tap":
          onMarkerTap?.(data.id);
          break;
      }
    } catch (e) {
      console.log("Map message parse error:", e);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        source={{ html: initialHtml }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
        style={styles.webview}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 16,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
