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
} from "lucide-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { formatPrice } from "@/lib/utils";
import { getSocket } from "@/lib/socket";
import { toast } from "sonner";
import { OrderStatus } from "@/types";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderId = (params?.id as string) || "IZ-40921";
  const router = useRouter();

  const [status, setStatus] = useState<OrderStatus>("OUT_FOR_DELIVERY");
  const [etaMinutes, setEtaMinutes] = useState(14);
  const [otp] = useState("8392");
  const [copiedOtp, setCopiedOtp] = useState(false);

  // Simulated GPS rider route progress (0 to 100%)
  const [riderProgress, setRiderProgress] = useState(65);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join:order", { orderId });

    socket.on("order:status_update", (data: { status: OrderStatus }) => {
      setStatus(data.status);
      toast.info(`Order Status Updated: ${data.status}`);
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
      setRiderProgress((prev) => (prev < 90 ? prev + 1 : prev));
    }, 4000);

    return () => {
      socket.off("order:status_update");
      socket.off("order:rider_location");
      clearInterval(interval);
    };
  }, [orderId]);

  const handleCopyOtp = () => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(true);
    toast.success("Delivery OTP copied to clipboard!");
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
              href="/feed"
              className="p-2 rounded-xl bg-card-elevated hover:bg-card-hover text-foreground border border-border transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                  Live Order Tracking
                </h1>
              </div>
              <p className="text-xs text-muted">
                Order ID: <strong className="text-foreground font-mono">{orderId}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => toast.info("Support assistant connecting... 🎧")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card-elevated hover:bg-card-hover border border-border text-xs font-semibold text-foreground transition-colors shadow-xs"
          >
            <HelpCircle className="w-4 h-4 text-muted" />
            <span>Help</span>
          </button>
        </div>

        {/* INTERACTIVE VECTOR MAP HUD */}
        <div className="relative w-full h-72 md:h-96 rounded-3xl overflow-hidden bg-card-elevated border border-border shadow-md flex items-center justify-center">
          {/* Simulated Dark Vector Map Grid & Roads */}
          <div className="absolute inset-0 bg-[#090b10] opacity-95">
            {/* Grid Pattern */}
            <div className="w-full h-full bg-[radial-gradient(#1e2433_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
            {/* Simulated Road Paths */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
              {/* Secondary gray roads */}
              <path
                d="M 50 250 L 220 180 L 400 220 L 700 80"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="8"
                fill="none"
              />
              <path
                d="M 120 40 L 180 180 L 260 320"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="6"
                fill="none"
              />
              {/* Primary Glowing Neon Route Polyline */}
              <path
                d="M 120 220 C 200 200, 280 140, 480 160 S 680 90, 760 110"
                stroke="rgba(220, 38, 38, 0.4)"
                strokeWidth="8"
                fill="none"
              />
              <path
                d="M 120 220 C 200 200, 280 140, 480 160 S 680 90, 760 110"
                stroke="#dc2626"
                strokeWidth="4"
                strokeDasharray="8 6"
                className="animate-[dash_2s_linear_infinite]"
                fill="none"
              />
            </svg>
          </div>

          {/* Restaurant Marker (Start) */}
          <div className="absolute left-[15%] bottom-[35%] flex flex-col items-center gap-1 z-10">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 border-2 border-amber-500 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]">
              <ChefHat className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-white">
              The Gourmet Grill
            </span>
          </div>

          {/* Gliding Rider Marker */}
          <div
            style={{ left: `${riderProgress}%`, top: "42%" }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20 transition-all duration-1000 ease-out"
          >
            {/* Live ETA Floating Pill */}
            <div className="bg-primary text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-lg flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{etaMinutes} mins</span>
            </div>
            {/* Scooter Badge */}
            <div className="w-12 h-12 rounded-full bg-linear-to-tr from-primary to-secondary border-2 border-white flex items-center justify-center text-white shadow-2xl animate-bounce">
              <Bike className="w-6 h-6" />
            </div>
          </div>

          {/* Destination Customer Home Marker (End) */}
          <div className="absolute right-[12%] top-[25%] flex flex-col items-center gap-1 z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <Home className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20 text-white">
              Your Doorstep
            </span>
          </div>
        </div>

        {/* 4-STAGE VISUAL PROGRESS STEPPER */}
        <div className="bg-card border border-border rounded-3xl p-5 md:p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                Order Status
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-foreground">
                Rider is on the way with your food 🛵
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
      </main>

      <MobileBottomNav />
    </div>
  );
}
