"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  OBSIDIAN_DARK_MAP_STYLE,
  CRISP_LIGHT_MAP_STYLE,
} from "@/lib/googleMaps";
import { useTheme } from "next-themes";
import { ChefHat, Home, Bike, Clock } from "lucide-react";

interface LocationPoint {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}

interface LiveDeliveryMapProps {
  origin?: LocationPoint; // Restaurant
  destination?: LocationPoint; // Customer Doorstep
  restaurantLocation?: LocationPoint;
  customerLocation?: LocationPoint;
  riderLocation?: { lat: number; lng: number };
  riderProgress?: number; // 0 to 100
  etaMinutes?: number;
  status?: string;
  className?: string;
}

/**
 * Calculates Haversine spherical distance between two points in km
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
  const rad = (x: number) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 1.25 * 10) / 10; // 1.25 urban road factor
}

/**
 * Generates realistic urban road grid waypoints between origin & destination
 */
function generateRoadWaypoints(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  steps = 30
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];

  // Corner turn point (Manhattan / Grid routing simulation)
  const midLat = start.lat + (end.lat - start.lat) * 0.45;
  const midLng = start.lng + (end.lng - start.lng) * 0.55;

  const controlPoints = [
    start,
    { lat: midLat + 0.0015, lng: start.lng + (midLng - start.lng) * 0.5 },
    { lat: midLat, lng: midLng },
    { lat: end.lat - (end.lat - midLat) * 0.5, lng: midLng + 0.001 },
    end,
  ];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Multi-segment linear interpolation along control points
    if (t <= 0.5) {
      const subT = t * 2;
      points.push({
        lat: start.lat + (midLat - start.lat) * subT + Math.sin(subT * Math.PI) * 0.0006,
        lng: start.lng + (midLng - start.lng) * subT,
      });
    } else {
      const subT = (t - 0.5) * 2;
      points.push({
        lat: midLat + (end.lat - midLat) * subT,
        lng: midLng + (end.lng - midLng) * subT + Math.sin(subT * Math.PI) * 0.0006,
      });
    }
  }

  return points;
}

export function LiveDeliveryMap({
  origin,
  destination,
  restaurantLocation,
  customerLocation,
  riderProgress = 60,
  etaMinutes = 14,
  status = "OUT_FOR_DELIVERY",
  className = "w-full h-72 md:h-96",
}: LiveDeliveryMapProps) {
  const actualOrigin = origin || restaurantLocation || { lat: 12.9784, lng: 77.6408, name: "The Gourmet Grill" };
  const actualDestination = destination || customerLocation || { lat: 12.9352, lng: 77.6245, name: "Your Doorstep" };
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const glowPolylineRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const routePointsRef = useRef<Array<{ lat: number; lng: number }>>([]);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  const roadDistKm = calculateDistanceKm(actualOrigin.lat, actualOrigin.lng, actualDestination.lat, actualDestination.lng);
  const [distanceText, setDistanceText] = useState(`${roadDistKm > 0 ? roadDistKm : 2.4} km`);
  const [durationText, setDurationText] = useState(`${etaMinutes} mins`);

  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((maps) => {
        if (!isMounted || !mapRef.current) return;

        const isDark = resolvedTheme === "dark";

        const centerLat = (actualOrigin.lat + actualDestination.lat) / 2;
        const centerLng = (actualOrigin.lng + actualDestination.lng) / 2;

        const map = new maps.Map(mapRef.current, {
          center: { lat: centerLat, lng: centerLng },
          zoom: 14,
          styles: isDark ? OBSIDIAN_DARK_MAP_STYLE : CRISP_LIGHT_MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        });
        mapInstanceRef.current = map;

        // 1. Restaurant Marker (Amber Origin)
        new maps.Marker({
          position: { lat: actualOrigin.lat, lng: actualOrigin.lng },
          map,
          title: actualOrigin.name || "Restaurant Kitchen",
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#f59e0b",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        // 2. Customer Destination Marker (Emerald Dropoff)
        new maps.Marker({
          position: { lat: actualDestination.lat, lng: actualDestination.lng },
          map,
          title: actualDestination.name || "Customer Doorstep",
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#10b981",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });

        // 3. Generate high-precision urban road route polyline
        const waypoints = generateRoadWaypoints(
          { lat: actualOrigin.lat, lng: actualOrigin.lng },
          { lat: actualDestination.lat, lng: actualDestination.lng }
        );
        routePointsRef.current = waypoints;

        // Ambient Route Glow (Outer Layer)
        const glowLine = new maps.Polyline({
          path: waypoints,
          geodesic: false,
          strokeColor: "#e11d48",
          strokeOpacity: 0.25,
          strokeWeight: 10,
          map,
        });
        glowPolylineRef.current = glowLine;

        // Core Route Polyline (Inner Layer)
        const polyline = new maps.Polyline({
          path: waypoints,
          geodesic: false,
          strokeColor: "#e11d48",
          strokeOpacity: 1.0,
          strokeWeight: 5,
          map,
        });
        polylineRef.current = polyline;

        // 4. Gliding Rider Marker
        const initialRiderPos = waypoints[Math.floor((riderProgress / 100) * (waypoints.length - 1))] || {
          lat: centerLat,
          lng: centerLng,
        };

        const riderMarker = new maps.Marker({
          position: initialRiderPos,
          map,
          title: "Delivery Partner",
          icon: {
            path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
            fillColor: "#e11d48",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 1.6,
            anchor: new maps.Point(12, 12),
          },
        });
        riderMarkerRef.current = riderMarker;

        // 5. Fit bounds to keep entire route in view
        const bounds = new maps.LatLngBounds();
        bounds.extend({ lat: actualOrigin.lat, lng: actualOrigin.lng });
        bounds.extend({ lat: actualDestination.lat, lng: actualDestination.lng });
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });

        setMapLoaded(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setMapError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [actualOrigin.lat, actualOrigin.lng, actualDestination.lat, actualDestination.lng, resolvedTheme]);

  // Smoothly update Rider position along route polyline
  useEffect(() => {
    if (riderMarkerRef.current && routePointsRef.current.length > 0) {
      const points = routePointsRef.current;
      const clamped = Math.min(100, Math.max(0, riderProgress));
      const targetIdx = Math.floor((clamped / 100) * (points.length - 1));
      const targetPoint = points[targetIdx];
      if (targetPoint) {
        riderMarkerRef.current.setPosition(targetPoint);
      }
    }
  }, [riderProgress]);

  return (
    <div
      className={`relative rounded-3xl overflow-hidden bg-card-elevated border border-border shadow-md ${className}`}
    >
      {/* Google Map Canvas */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Fallback Vector HUD if Map Fails */}
      {mapError && (
        <div className="absolute inset-0 bg-[#090b10] opacity-95 flex items-center justify-center">
          <div className="w-full h-full bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path
              d="M 50 250 L 220 180 L 400 220 L 700 80"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
              fill="none"
            />
            <path
              d="M 120 220 C 200 200, 280 140, 480 160 S 680 90, 760 110"
              stroke="#e11d48"
              strokeWidth="4"
              strokeDasharray="8 6"
              fill="none"
            />
          </svg>
        </div>
      )}

      {/* Live Google Navigation Status HUD */}
      <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-2">
        <div className="bg-black/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/20 text-white flex items-center gap-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div className="text-left">
            <span className="text-[10px] text-zinc-400 font-semibold block leading-none">
              Live Google Navigation
            </span>
            <span className="text-xs font-black text-white">
              {distanceText} • {durationText}
            </span>
          </div>
        </div>
      </div>

      {/* Route Endpoints & Live ETA Footer */}
      <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white flex items-center gap-2 text-[11px] font-bold shadow-lg">
          <ChefHat className="w-3.5 h-3.5 text-amber-400" />
          <span className="truncate max-w-[120px] sm:max-w-[180px]">{actualOrigin.name}</span>
        </div>

        <div className="bg-primary text-white px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 text-xs font-black">
          <Bike className="w-4 h-4 animate-bounce" />
          <span>{etaMinutes} mins ETA</span>
        </div>

        <div className="bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-white flex items-center gap-2 text-[11px] font-bold shadow-lg">
          <Home className="w-3.5 h-3.5 text-emerald-400" />
          <span className="truncate max-w-[120px] sm:max-w-[180px]">Your Doorstep</span>
        </div>
      </div>
    </div>
  );
}
