/**
 * 🗺️ Google Maps Utility & Loader for Insta-Zomato
 * ----------------------------------------------------------------------
 * Manages dynamic script loading of Google Maps JavaScript API,
 * provides custom Obsidian Dark and Crisp Light map themes,
 * and exposes geocoding and routing helper functions.
 */

declare global {
  interface Window {
    google?: any;
    __googleMapsLoadedPromise?: Promise<any>;
    __googleMapsInitCallback?: () => void;
  }
}

export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

/**
 * Obsidian Dark Mode Theme for Google Maps
 * Tailored to match Insta-Zomato's #090b10 & #131722 palette.
 */
export const OBSIDIAN_DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b949e" }] },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#c9d1d9" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#58a6ff" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#161b22" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3fb950" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#21262d" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#161b22" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8b949e" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#30363d" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1f242c" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#f0883e" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#161b22" }],
  },
  {
    featureType: "transit.station",
    elementType: "labels.text.fill",
    stylers: [{ color: "#58a6ff" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#030712" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#388bfd" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#030712" }],
  },
];

/**
 * Clean Light Mode Theme for Google Maps
 */
export const CRISP_LIGHT_MAP_STYLE = [
  {
    featureType: "administrative",
    elementType: "labels.text.fill",
    stylers: [{ color: "#444444" }],
  },
  {
    featureType: "landscape",
    elementType: "all",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "poi",
    elementType: "all",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "road",
    elementType: "all",
    stylers: [{ saturation: -100 }, { lightness: 45 }],
  },
  {
    featureType: "road.highway",
    elementType: "all",
    stylers: [{ visibility: "simplified" }],
  },
  {
    featureType: "water",
    elementType: "all",
    stylers: [{ color: "#e0f2fe" }, { visibility: "on" }],
  },
];

/**
 * Loads the Google Maps JavaScript API script singleton and ensures google.maps.Map is ready.
 */
export function loadGoogleMaps(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cannot load Google Maps on server"));
  }

  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (window.__googleMapsLoadedPromise) {
    return window.__googleMapsLoadedPromise;
  }

  window.__googleMapsLoadedPromise = new Promise((resolve, reject) => {
    // If already loaded
    if (window.google?.maps?.Map) {
      resolve(window.google.maps);
      return;
    }

    const callbackName = "__googleMapsInitCallback";
    window.__googleMapsInitCallback = () => {
      if (window.google?.maps?.Map) {
        resolve(window.google.maps);
      } else {
        // Double-check interval in case of slight delay
        const interval = setInterval(() => {
          if (window.google?.maps?.Map) {
            clearInterval(interval);
            resolve(window.google.maps);
          }
        }, 50);
        setTimeout(() => {
          clearInterval(interval);
          if (window.google?.maps?.Map) {
            resolve(window.google.maps);
          } else {
            reject(new Error("Google Maps loaded but google.maps.Map is not ready"));
          }
        }, 3000);
      }
    };

    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      const checkInterval = setInterval(() => {
        if (window.google?.maps?.Map) {
          clearInterval(checkInterval);
          resolve(window.google.maps);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(checkInterval);
        if (window.google?.maps?.Map) {
          resolve(window.google.maps);
        } else {
          reject(new Error("Google Maps script load timed out"));
        }
      }, 5000);
      return;
    }

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.type = "text/javascript";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=${callbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = (err) => {
      reject(err);
    };

    document.head.appendChild(script);
  });

  return window.__googleMapsLoadedPromise;
}

export interface GeocodeResult {
  formattedAddress: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

/**
 * Reverse-geocodes lat/lng into address components using Google Maps Geocoder
 */
export async function reverseGeocodeLatLng(
  lat: number,
  lng: number
): Promise<GeocodeResult> {
  const maps = await loadGoogleMaps();
  const geocoder = new maps.Geocoder();

  return new Promise((resolve, reject) => {
    geocoder.geocode(
      { location: { lat, lng } },
      (results: any[], status: string) => {
        if (status === "OK" && results && results.length > 0) {
          const result = results[0];
          let city = "Bengaluru";
          let state = "Karnataka";
          let pincode = "560001";
          let street = "";
          let premise = "";
          let sublocality = "";

          result.address_components?.forEach((comp: any) => {
            const types = comp.types || [];
            if (types.includes("locality")) city = comp.long_name;
            else if (!city && types.includes("administrative_area_level_2")) city = comp.long_name;
            if (types.includes("administrative_area_level_1")) state = comp.long_name;
            if (types.includes("postal_code")) pincode = comp.long_name;
            if (types.includes("route")) street = comp.long_name;
            if (types.includes("premise") || types.includes("street_number")) premise = comp.long_name;
            if (types.includes("sublocality") || types.includes("sublocality_level_1")) sublocality = comp.long_name;
          });

          const fullStreet = [premise, street, sublocality].filter(Boolean).join(", ") || result.formatted_address.split(",")[0];

          resolve({
            formattedAddress: result.formatted_address,
            street: fullStreet,
            city,
            state,
            pincode,
            latitude: lat,
            longitude: lng,
          });
        } else {
          // Graceful fallback coordinates label
          resolve({
            formattedAddress: `Pinned location (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
            street: "Indiranagar 100ft Road",
            city: "Bengaluru",
            state: "Karnataka",
            pincode: "560038",
            latitude: lat,
            longitude: lng,
          });
        }
      }
    );
  });
}
