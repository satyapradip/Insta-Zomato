"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Navigation,
  ArrowLeft,
  Store,
  Home,
  Phone,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Clock,
} from "lucide-react";
import { LiveDeliveryMap } from "@/components/location/LiveDeliveryMap";
import { toast } from "sonner";

export default function RiderNavigatePage() {
  const [progress, setProgress] = useState(45);

  const deliveryData = {
    orderNumber: "#IZ-3082",
    customerName: "Floyd Miles",
    customerPhone: "9876543210",
    customerAddress: "Flat 402, Sunshine Heights, Indiranagar 100ft Rd, Bangalore",
    customerCoords: { lat: 12.9784, lng: 77.6408 },
    restaurantName: "The Gourmet Grill",
    restaurantAddress: "100ft Rd, Indiranagar, Bangalore",
    restaurantCoords: { lat: 12.9716, lng: 77.5946 },
    etaMinutes: 11,
    distanceKm: 2.1,
  };

  const handleOpenGoogleMaps = () => {
    const origin = encodeURIComponent(deliveryData.restaurantAddress);
    const dest = encodeURIComponent(deliveryData.customerAddress);
    window.open(
      `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`,
      "_blank"
    );
  };

  return (
    <div className="max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link
            href="/rider"
            className="p-2 rounded-xl bg-card-elevated hover:bg-card-hover text-foreground border border-border transition-colors shadow-xs"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                Turn-by-Turn GPS HUD
              </h1>
            </div>
            <p className="text-xs text-muted">
              Live route to {deliveryData.customerName} • {deliveryData.orderNumber}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenGoogleMaps}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>Launch Google Maps App 🧭</span>
        </button>
      </div>

      {/* Full Map Canvas */}
      <div className="rounded-3xl overflow-hidden border border-border shadow-md">
        <LiveDeliveryMap
          restaurantLocation={{
            lat: deliveryData.restaurantCoords.lat,
            lng: deliveryData.restaurantCoords.lng,
            name: deliveryData.restaurantName,
          }}
          customerLocation={{
            lat: deliveryData.customerCoords.lat,
            lng: deliveryData.customerCoords.lng,
            name: deliveryData.customerName,
          }}
          riderProgress={progress}
          className="w-full h-80 sm:h-96"
        />
      </div>

      {/* Navigation Instruction HUD */}
      <div className="p-5 rounded-3xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
            ⬆️
          </div>
          <div>
            <h3 className="text-sm font-black text-foreground">In 200m, turn right onto 100ft Road</h3>
            <p className="text-xs text-muted">
              Destination on left • {deliveryData.distanceKm} km ({deliveryData.etaMinutes} mins)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => toast.info(`Calling ${deliveryData.customerName}...`)}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-xs font-bold text-foreground flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Call Customer</span>
          </button>
          <Link
            href="/rider"
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify OTP at Door</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
