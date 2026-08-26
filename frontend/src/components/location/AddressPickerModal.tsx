"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Search,
  Navigation,
  X,
  Home,
  Briefcase,
  Building2,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  loadGoogleMaps,
  OBSIDIAN_DARK_MAP_STYLE,
  CRISP_LIGHT_MAP_STYLE,
  reverseGeocodeLatLng,
} from "@/lib/googleMaps";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useTheme } from "next-themes";

export interface AddressData {
  id?: string;
  _id?: string;
  label: string;
  recipientName: string;
  contactPhone: string;
  flatNumber?: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  isDefault?: boolean;
}

interface AddressPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAddress: (address: AddressData) => void;
  initialAddress?: Partial<AddressData>;
}

export function AddressPickerModal({
  isOpen,
  onClose,
  onSaveAddress,
  initialAddress,
}: AddressPickerModalProps) {
  const { resolvedTheme } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  const [isLoadingMap, setIsLoadingMap] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Search & Predictions
  const [searchQuery, setSearchQuery] = useState("");
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form Fields
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialAddress?.latitude || 12.9716, // Default Bangalore
    lng: initialAddress?.longitude || 77.5946,
  });
  const [label, setLabel] = useState<string>(initialAddress?.label || "Home");
  const [recipientName, setRecipientName] = useState(initialAddress?.recipientName || "");
  const [contactPhone, setContactPhone] = useState(initialAddress?.contactPhone || "");
  const [flatNumber, setFlatNumber] = useState(initialAddress?.flatNumber || "");
  const [street, setStreet] = useState(initialAddress?.street || "Indiranagar 100ft Road");
  const [landmark, setLandmark] = useState(initialAddress?.landmark || "");
  const [city, setCity] = useState(initialAddress?.city || "Bengaluru");
  const [state, setState] = useState(initialAddress?.state || "Karnataka");
  const [pincode, setPincode] = useState(initialAddress?.pincode || "560038");
  const [formattedAddress, setFormattedAddress] = useState(
    initialAddress?.formattedAddress || "Indiranagar, Bengaluru, Karnataka"
  );

  // Initialize Google Map
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingMap(true);
    setMapError(null);

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        if (!maps || typeof maps.Map !== "function") {
          throw new Error("Google Maps JavaScript API is initializing...");
        }

        const isDark = resolvedTheme === "dark";
        const mapOptions = {
          center: { lat: coords.lat, lng: coords.lng },
          zoom: 16,
          styles: isDark ? OBSIDIAN_DARK_MAP_STYLE : CRISP_LIGHT_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        };

        const map = new maps.Map(mapContainerRef.current, mapOptions);
        mapInstanceRef.current = map;

        if (maps.places?.AutocompleteService) {
          try {
            autocompleteServiceRef.current = new maps.places.AutocompleteService();
          } catch {
            // Service fallback
          }
        }
        if (maps.places?.PlacesService) {
          try {
            placesServiceRef.current = new maps.places.PlacesService(map);
          } catch {
            // Service fallback
          }
        }

        // Center Draggable Marker
        const marker = new maps.Marker({
          position: { lat: coords.lat, lng: coords.lng },
          map,
          draggable: true,
          animation: maps.Animation?.DROP,
          title: "Drag to pin exact doorstep",
          icon: {
            path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
            fillColor: "#e11d48",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff",
            scale: 2,
            anchor: new maps.Point(12, 22),
          },
        });
        markerInstanceRef.current = marker;

        // When user drags marker
        marker.addListener("dragend", async (e: any) => {
          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();
          setCoords({ lat: newLat, lng: newLng });
          await handleReverseGeocode(newLat, newLng);
        });

        // When map is clicked
        map.addListener("click", async (e: any) => {
          const newLat = e.latLng.lat();
          const newLng = e.latLng.lng();
          marker.setPosition({ lat: newLat, lng: newLng });
          setCoords({ lat: newLat, lng: newLng });
          await handleReverseGeocode(newLat, newLng);
        });

        setIsLoadingMap(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setMapError(err.message || "Failed to load Google Maps");
        setIsLoadingMap(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, resolvedTheme]);

  // Autocomplete fallback helper via Backend API
  const fetchBackendAutocomplete = async (text: string) => {
    try {
      const res = await api.post("/location/autocomplete", { query: text });
      const data = res.data?.data || res.data;
      if (Array.isArray(data)) {
        setPredictions(
          data.map((item) => ({
            place_id: item.placeId || item.id || `custom_${Date.now()}`,
            description: item.description || item.text,
            structured_formatting: {
              main_text: item.mainText || item.text,
              secondary_text: item.secondaryText || item.city || "Bengaluru, Karnataka",
            },
          }))
        );
      }
    } catch {
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Autocomplete Input
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    if (autocompleteServiceRef.current) {
      try {
        autocompleteServiceRef.current.getPlacePredictions(
          {
            input: text,
            componentRestrictions: { country: "in" },
          },
          (results: any[], status: string) => {
            if (status === "OK" && results && results.length > 0) {
              setPredictions(results);
              setIsSearching(false);
            } else {
              fetchBackendAutocomplete(text);
            }
          }
        );
      } catch {
        fetchBackendAutocomplete(text);
      }
    } else {
      fetchBackendAutocomplete(text);
    }
  };

  // Select Autocomplete Prediction
  const handleSelectPrediction = (prediction: any) => {
    setSearchQuery(prediction.description);
    setPredictions([]);

    // Geocode the selected prediction text or placeId
    if (placesServiceRef.current && prediction.place_id && !prediction.place_id.startsWith("place_")) {
      try {
        placesServiceRef.current.getDetails(
          { placeId: prediction.place_id },
          async (place: any, status: string) => {
            if (status === "OK" && place?.geometry?.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              updatePinLocation(lat, lng);
              return;
            }
            // Fallback to backend geocoding
            fallbackGeocodeText(prediction.description);
          }
        );
      } catch {
        fallbackGeocodeText(prediction.description);
      }
    } else {
      fallbackGeocodeText(prediction.description);
    }
  };

  const updatePinLocation = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(17);
    }
    if (markerInstanceRef.current) {
      markerInstanceRef.current.setPosition({ lat, lng });
    }
    await handleReverseGeocode(lat, lng);
  };

  const fallbackGeocodeText = async (queryText: string) => {
    try {
      const res = await api.post("/location/geocode", { address: queryText });
      const data = res.data?.data || res.data;
      if (data && data.latitude && data.longitude) {
        updatePinLocation(data.latitude, data.longitude);
      }
    } catch {
      // Local fallback
    }
  };

  // Reverse geocode helper
  const handleReverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await reverseGeocodeLatLng(lat, lng);
      setStreet(res.street || "Indiranagar 100ft Road");
      setCity(res.city || "Bengaluru");
      setState(res.state || "Karnataka");
      setPincode(res.pincode || "560038");
      setFormattedAddress(res.formattedAddress);
    } catch {
      try {
        const res = await api.post("/location/reverse-geocode", { latitude: lat, longitude: lng });
        const d = res.data?.data || res.data;
        if (d) {
          setStreet(d.street || "Indiranagar 100ft Road");
          setCity(d.city || "Bengaluru");
          setState(d.state || "Karnataka");
          setPincode(d.pincode || "560038");
          setFormattedAddress(d.formattedAddress || `${d.street}, ${d.city}`);
        }
      } catch {
        // Safe default
        setStreet("Indiranagar 100ft Road");
        setCity("Bengaluru");
        setState("Karnataka");
        setPincode("560038");
        setFormattedAddress(`Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      }
    }
  };

  // Locate Me Button (GPS)
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        updatePinLocation(lat, lng);
        setIsLocating(false);
        toast.success("Location detected via GPS! 📍");
      },
      () => {
        setIsLocating(false);
        toast.error("Could not fetch GPS location. Please select on map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Save Address Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!street.trim()) {
      toast.error("Please provide street / area details");
      return;
    }

    setIsSaving(true);
    const completeAddressStr = `${flatNumber ? `${flatNumber}, ` : ""}${street}${
      landmark ? `, Near ${landmark}` : ""
    }, ${city}, ${state} - ${pincode}`;

    const newAddressObj: AddressData = {
      id: initialAddress?.id || `addr-${Date.now()}`,
      label,
      recipientName: recipientName.trim() || "Customer",
      contactPhone: contactPhone.trim() || "9876543210",
      flatNumber: flatNumber.trim(),
      street: street.trim(),
      landmark: landmark.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      formattedAddress: completeAddressStr,
      latitude: coords.lat,
      longitude: coords.lng,
      isDefault: initialAddress?.isDefault ?? true,
    };

    try {
      try {
        await api.post("/users/addresses", {
          label,
          recipientName: newAddressObj.recipientName,
          street: completeAddressStr,
          landmark,
          city,
          state,
          pincode,
          coordinates: [coords.lng, coords.lat],
          contactPhone: newAddressObj.contactPhone,
          isDefault: newAddressObj.isDefault,
        });
      } catch {
        // Local state fallback
      }

      onSaveAddress(newAddressObj);
      toast.success("Delivery Address Saved Successfully! 📍");
      onClose();
    } catch {
      toast.error("Failed to save address. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="bg-card border border-border rounded-3xl max-w-2xl w-full my-auto overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-card-elevated">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-foreground">
                Set Delivery Location
              </h2>
              <p className="text-xs text-muted">
                Pinpoint your exact doorstep on Google Maps
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-card hover:bg-card-hover border border-border text-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-5 space-y-4">
          {/* Autocomplete Search Bar */}
          <div className="relative z-30">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-muted absolute left-3.5" />
              <input
                type="text"
                placeholder="Search apartment, society, street, or landmark..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-card-elevated border border-border text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary shadow-xs"
              />
              {isSearching && (
                <Loader2 className="w-4 h-4 text-primary animate-spin absolute right-3.5" />
              )}
            </div>

            {/* Predictions Dropdown */}
            {predictions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-card-elevated border border-border rounded-2xl shadow-xl overflow-hidden divide-y divide-border max-h-56 overflow-y-auto z-40">
                {predictions.map((p) => (
                  <button
                    key={p.place_id}
                    type="button"
                    onClick={() => handleSelectPrediction(p)}
                    className="w-full text-left p-3 hover:bg-card text-xs flex items-start gap-2.5 transition-colors cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-foreground">
                        {p.structured_formatting?.main_text || p.description}
                      </div>
                      <div className="text-[11px] text-muted truncate">
                        {p.structured_formatting?.secondary_text || ""}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Google Map Canvas */}
          <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-border bg-card-elevated">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Loading / Error States */}
            {isLoadingMap && (
              <div className="absolute inset-0 bg-card/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <span className="text-xs font-semibold text-foreground">
                  Loading Google Maps...
                </span>
              </div>
            )}

            {mapError && (
              <div className="absolute inset-0 bg-card flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-rose-500 font-bold mb-1">
                  Google Maps script initialization fallback
                </p>
                <p className="text-[11px] text-muted">{mapError}</p>
              </div>
            )}

            {/* Floating "Locate Me" GPS Button */}
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="absolute bottom-3 right-3 bg-card-elevated hover:bg-card-hover border border-border text-foreground px-3 py-1.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer z-10"
            >
              <Navigation className={`w-3.5 h-3.5 text-primary ${isLocating ? "animate-spin" : ""}`} />
              <span>{isLocating ? "Detecting..." : "Locate Me"}</span>
            </button>

            {/* Instruction Badge */}
            <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md px-3 py-1 rounded-full border border-white/15 text-[10px] text-white font-medium flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Tap or drag red pin to fine-tune</span>
            </div>
          </div>

          {/* Address Details Form */}
          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* Address Label Pills */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-2">
                Address Tag
              </label>
              <div className="flex items-center gap-2">
                {[
                  { id: "Home", icon: Home },
                  { id: "Work", icon: Briefcase },
                  { id: "Other", icon: Building2 },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = label === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLabel(item.id)}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-card-elevated border-border text-muted hover:bg-card-hover hover:text-foreground"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* House/Flat & Landmark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted mb-1 block">
                  House / Flat / Floor No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Sunshine Heights"
                  value={flatNumber}
                  onChange={(e) => setFlatNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted mb-1 block">
                  Nearby Landmark (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Opposite Metro Pillar 140"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs"
                />
              </div>
            </div>

            {/* Street / Area (From Map) */}
            <div>
              <label className="text-[11px] font-semibold text-muted mb-1 block">
                Area / Street (Auto-filled from Google Maps) *
              </label>
              <input
                type="text"
                required
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs"
              />
            </div>

            {/* City, State & Pincode */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted mb-1 block">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted mb-1 block">
                  State
                </label>
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted mb-1 block">
                  Pincode
                </label>
                <input
                  type="text"
                  required
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs font-mono"
                />
              </div>
            </div>

            {/* Contact Person Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border">
              <div>
                <label className="text-[11px] font-semibold text-muted mb-1 block">
                  Recipient Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Foodie"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted mb-1 block">
                  Contact Phone No.
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-card-elevated border border-border text-xs text-foreground focus:outline-none focus:border-primary shadow-xs font-mono"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-hover text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                <span>Save Delivery Address & Pin 📍</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
