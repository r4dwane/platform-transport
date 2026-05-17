import { useState, useEffect, useRef } from "react";
import * as ExpoLocation from "expo-location";
 
interface LocationCoords {
  latitude: number;
  longitude: number;
}
 
export const useLocation = (watch = false) => {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const watchRef = useRef<ExpoLocation.LocationSubscription | null>(null);
 
  useEffect(() => {
    let cancelled = false;
 
    const start = async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Permission de localisation refusée.");
        setIsLoading(false);
        return;
      }
 
      if (watch) {
        // Continuous updates
        watchRef.current = await ExpoLocation.watchPositionAsync(
          {
            accuracy: ExpoLocation.Accuracy.High,
            timeInterval: 5000,   // every 5 seconds
            distanceInterval: 10, // or every 10 metres
          },
          (loc) => {
            if (!cancelled) {
              setLocation({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
              });
              setIsLoading(false);
            }
          }
        );
      } else {
        // One-time fetch
        const loc = await ExpoLocation.getCurrentPositionAsync({
          accuracy: ExpoLocation.Accuracy.High,
        });
        if (!cancelled) {
          setLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          setIsLoading(false);
        }
      }
    };
 
    start().catch((e) => {
      setError(e.message);
      setIsLoading(false);
    });
 
    return () => {
      cancelled = true;
      watchRef.current?.remove();
    };
  }, [watch]);
 
  return { location, error, isLoading };
};