"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  ShieldCheck,
  Clock,
  MapPin,
  CheckCircle2,
  ChefHat,
  Bike,
  Home,
  Copy,
  HelpCircle,
  Sparkles,
  Store,
  ChevronRight,
} from "lucide-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { LiveDeliveryMap } from "@/components/location/LiveDeliveryMap";
import { formatPrice } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { OrderStatus } from "@/types";

/**
 * 🛵 Real-Time Order Tracking HUD
 * ----------------------------------------------------------------------
 * Displays live Google Maps road route, glowing rider movement along
 * real road vectors, delivery OTP, and updates dynamically via WebSocket.
 */
export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = (params?.id as string) || "IZ-40921";
  const router = useRouter();

  const [status, setStatus] = useState<OrderStatus>("OUT_FOR_DELIVERY");
  const [etaMinutes, setEtaMinutes] = useState(14);
  const [otp, setOtp] = useState("8392");
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [restaurantName, setRestaurantName] = useState("The Gourmet Grill");
  const [totalAmount, setTotalAmount] = useState(847);
  const [itemsSummary, setItemsSummary] = useState("2x Smokey Truffle Beast Burger, 1x Truffle Fries");

  // GPS Coordinates for Live Google Map
  const [restaurantLocation, setRestaurantLocation] = useState({
    lat: 12.9784,
    lng: 77.6408,
    name: "The Gourmet Grill (Indiranagar)",
  });
  const [customerLocation, setCustomerLocation] = useState({
    lat: 12.9352,
    lng: 77.6245,
    name: "Your Doorstep (Koramangala)",
  });

  // Simulated GPS rider route progress (0 to 100%)
  const [riderProgress, setRiderProgress] = useState(65);

  // Fetch live order data from Backend API if exists
  useEffect(() => {
    async function fetchOrderDetails() {
      try {
        const res = await api.get(`/orders/${orderId}`);
        const data = res.data?.data || res.data;
        if (data) {
          if (data.status) setStatus(data.status);
          if (data.deliveryOtp || data.otp) setOtp(data.deliveryOtp || data.otp);
          if (data.totalAmount) setTotalAmount(data.totalAmount);
          if (data.partner?.restaurantName || data.restaurantName) {
            setRestaurantName(data.partner?.restaurantName || data.restaurantName);
          }
          if (data.partner?.latitude && data.partner?.longitude) {
            setRestaurantLocation({
              lat: data.partner.latitude,
              lng: data.partner.longitude,
              name: data.partner.restaurantName || "Restaurant Kitchen",
            });
          }
          if (data.deliveryAddress?.coordinates) {
            setCustomerLocation({
              lat: data.deliveryAddress.coordinates[1],
              lng: data.deliveryAddress.coordinates[0],
              name: "Your Doorstep",
            });
          }
          if (data.items && Array.isArray(data.items)) {
            const summary = data.items.map((i: any) => `${i.quantity}x ${i.title || i.name}`).join(", ");
            if (summary) setItemsSummary(summary);
          }
        }
      } catch {
        // Fallback for demo testing
      }
    }

    fetchOrderDetails();
  }, [orderId]);

  // WebSocket Live Listener
  useEffect(() => {
    const socket = getSocket();
    socket.emit("join:order", { orderId });

    socket.on("order:status_update", (data: { status: OrderStatus }) => {
      setStatus(data.status);
      toast.info(`Order Status Updated: ${data.status.replace(/_/g, " ")} ⚡`);
    });

    socket.on(
      "order:rider_location",
      (data: { etaMinutes: number; progressPercent: number }) => {
        if (data.etaMinutes) setEtaMinutes(data.etaMinutes);
        if (data.progressPercent) setRiderProgress(data.progressPercent);
      }
    );

    // Minor simulated rider movement glide
    const interval = setInterval(() => {
      setRiderProgress((prev) => (prev < 92 ? prev + 1 : prev));
    }, 3500);

    return () => {
      socket.off("order:status_update");
      socket.off("order:rider_location");
      clearInterval(interval);
    };
  }, [orderId]);

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    toast.success("Delivery OTP copied to clipboard! 📋");
    setTimeout(() => setCopiedOtp(false), 2000);
  };

  const steps = [
    { id: "CONFIRMED", label: "Confirmed", icon: CheckCircle2 },
    { id: "PREPARING", label: "Kitchen Prep", icon: ChefHat },
    { id: "OUT_FOR_DELIVERY", label: "On The Way", icon: Bike },
    { id: "DELIVERED", label: "Delivered", icon: Home },
  ];

  const getStepIndex = (currentStatus: OrderStatus) => {
    switch (currentStatus) {
      case "CONFIRMED":
        return 0;
      case "PREPARING":
      case "READY_FOR_PICKUP":
        return 1;
      case "PICKED_UP":
      case "OUT_FOR_DELIVERY":
        return 2;
      case "DELIVERED":
        return 3;
      default:
        return 0;
    }
  };

  const activeStepIdx = getStepIndex(status);

  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-24 lg:pb-8">
      <DesktopSidebar />

      <main className="flex-1 lg:pl-64 max-w-4xl w-full p-4 md:p-8 space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/orders"
              className="p-2 rounded-xl bg-card-elevated hover:bg-card-hover text-foreground border border-border transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                  Live Order Tracking
                </h1>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full border border-primary/20">
                  Google Maps GPS
                </span>
              </div>
              <p className="text-xs text-muted">
                Order ID: <strong className="text-foreground font-mono">{orderId}</strong> • {restaurantName}
              </p>
            </div>
          </div>

          <button
            onClick={() => toast.info("Support assistant connecting... 🎧")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-xs font-semibold text-foreground transition-colors shadow-xs cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-muted" />
            <span>Help</span>
          </button>
        </div>

        {/* REAL INTERACTIVE GOOGLE MAP DELIVERY HUD */}
        <LiveDeliveryMap
          origin={restaurantLocation}
          destination={customerLocation}
          riderProgress={riderProgress}
          etaMinutes={etaMinutes}
          status={status}
          className="w-full h-80 md:h-[420px]"
        />

        {/* 4-STAGE VISUAL PROGRESS STEPPER */}
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Order Status
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-foreground">
                {status === "DELIVERED"
                  ? "Order Delivered! Enjoy your meal 🍕"
                  : status === "PREPARING"
                  ? "Kitchen is preparing your food 🍳"
                  : "Rider is on the way with your food 🛵"}
              </h2>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
              Estimated Delivery: {etaMinutes} Mins
            </span>
          </div>

          {/* Progress Bar & Icons */}
          <div className="relative pt-4 pb-2">
            <div className="absolute top-8 inset-x-8 h-1 bg-border rounded-full -z-0">
              <div
                style={{ width: `${(activeStepIdx / (steps.length - 1)) * 100}%` }}
                className="h-full bg-primary transition-all duration-500 rounded-full"
              />
            </div>

            <div className="flex justify-between items-center relative z-10">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = idx <= activeStepIdx;
                const isCurrent = idx === activeStepIdx;

                return (
                  <div key={step.id} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                        isCurrent
                          ? "bg-primary border-primary text-white shadow-md scale-110"
                          : isPassed
                          ? "bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                          : "bg-card-elevated border-border text-muted"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[11px] font-semibold text-center ${
                        isPassed ? "text-foreground font-bold" : "text-muted"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECURITY OTP & RIDER CONTACT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Golden Glowing Delivery OTP Card */}
          <div className="bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-3xl p-5 md:p-6 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" /> Secure Delivery OTP
              </span>
              <button
                onClick={handleCopyOtp}
                className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedOtp ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            <div className="bg-card-elevated border border-amber-500/30 rounded-2xl py-3 px-6 text-center shadow-xs">
              <span className="text-3xl md:text-4xl font-black text-amber-500 font-mono tracking-[0.3em] ml-[0.3em]">
                {otp}
              </span>
            </div>

            <p className="text-[11px] text-muted leading-relaxed text-center font-medium">
              ⚠️ Share this 4-digit PIN with the delivery partner <strong>only upon doorstep handover</strong>.
            </p>
          </div>

          {/* Delivery Rider Profile Card */}
          <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80"
                  alt="Delivery Partner"
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                />
                <div>
                  <h3 className="text-sm font-bold text-foreground">Vikram Singh</h3>
                  <p className="text-xs text-muted font-medium">
                    ⭐ 4.9 • 1,420 Deliveries
                  </p>
                  <p className="text-[10px] text-muted font-mono">
                    KA-01-EQ-9812 (Honda Activa)
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                Verified Rider
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <a
                href="tel:9876543210"
                className="flex-1 bg-card-elevated hover:bg-card-hover text-foreground font-semibold py-2.5 px-3 rounded-xl border border-border text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>Call Rider</span>
              </a>
              <button
                onClick={() => toast.info("Opening chat with rider... 💬")}
                className="flex-1 bg-card-elevated hover:bg-card-hover text-foreground font-semibold py-2.5 px-3 rounded-xl border border-border text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span>Message</span>
              </button>
            </div>
          </div>
        </div>

        {/* Order Items Breakdown */}
        <div className="p-5 rounded-3xl bg-card border border-border flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted font-semibold">Items in Order:</span>
            <p className="text-xs font-bold text-foreground">{itemsSummary}</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-muted font-semibold">Total Paid</span>
            <div className="text-sm font-black text-primary">{formatPrice(totalAmount)}</div>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
