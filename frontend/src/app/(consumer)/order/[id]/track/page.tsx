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
    <div className="max-w-4xl w-full mx-auto p-4 md:p-8 space-y-6">
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
          className="px-3 py-1.5 rounded-xl bg-card-elevated border border-border text-xs font-bold text-muted hover:text-foreground transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Get Help</span>
        </button>
      </div>

      {/* ETA Banner Card */}
      <div className="p-6 rounded-3xl bg-linear-to-r from-card to-card-elevated border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              {status.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] text-muted">• On Schedule</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-baseline gap-2">
            <span>Arriving in</span>
            <span className="text-primary">{etaMinutes} mins</span>
          </h2>
          <p className="text-xs text-muted">
            Rider is riding with your fresh, hot gourmet package
          </p>
        </div>

        {/* 4-Digit Delivery PIN / OTP Box */}
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border relative z-10">
          <div>
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
              Doorstep Delivery PIN
            </span>
            <span className="text-xl font-black text-foreground tracking-widest font-mono">
              {otp}
            </span>
          </div>
          <button
            onClick={handleCopyOtp}
            className="p-2 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-muted hover:text-primary transition-colors cursor-pointer"
            title="Copy PIN"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>

        {/* Background Ambient Glow */}
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Stepper Progress Bar */}
      <div className="p-6 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isCompleted = idx <= activeStepIdx;
            const isCurrent = idx === activeStepIdx;

            return (
              <div key={step.id} className="flex flex-col items-center text-center space-y-2">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                    isCurrent
                      ? "bg-primary text-white shadow-md shadow-primary/30 scale-110"
                      : isCompleted
                      ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                      : "bg-card-elevated text-muted border border-border"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[11px] font-bold ${
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="w-full bg-card-elevated h-2 rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-linear-to-r from-emerald-500 to-primary transition-all duration-700 rounded-full"
            style={{ width: `${((activeStepIdx + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* LIVE GOOGLE MAPS GPS CONTAINER */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-foreground tracking-tight flex items-center gap-2">
            <span>Live Hyperlocal GPS Navigation</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </h3>
          <span className="text-xs text-muted">Direct Road Routing</span>
        </div>

        <LiveDeliveryMap
          restaurantLocation={restaurantLocation}
          customerLocation={customerLocation}
          riderProgress={riderProgress}
          etaMinutes={etaMinutes}
        />
      </div>

      {/* Delivery Partner Details Card */}
      <div className="p-5 rounded-3xl bg-card border border-border shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg font-black shrink-0">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-foreground">Vikram Singh</h4>
              <span className="text-[10px] font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                ★ 4.9 (1.2k+ deliveries)
              </span>
            </div>
            <p className="text-xs text-muted">Delivery Partner • EV Bike (KA-01-EQ-9921)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => toast.info("Calling Vikram Singh (+91 98765 43210)... 📞")}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-xs font-bold text-foreground transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-500" />
            <span>Call Rider</span>
          </button>
          <button
            onClick={() => toast.info("Chat assistant opened 💬")}
            className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-xs font-bold text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-white" />
            <span>Message</span>
          </button>
        </div>
      </div>

      {/* Order Items Breakdown */}
      <div className="p-5 rounded-3xl bg-card border border-border flex items-center justify-between shadow-xs">
        <div className="space-y-0.5">
          <span className="text-[11px] text-muted font-semibold">Items in Order:</span>
          <p className="text-xs font-bold text-foreground">{itemsSummary}</p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-muted font-semibold">Total Paid</span>
          <div className="text-sm font-black text-primary">{formatPrice(totalAmount)}</div>
        </div>
      </div>
    </div>
  );
}
