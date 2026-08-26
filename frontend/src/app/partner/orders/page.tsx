"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Volume2,
  VolumeX,
  Bell,
  Clock,
  CheckCircle2,
  XCircle,
  PackageCheck,
  Bike,
  Plus,
  BarChart3,
  Film,
  UtensilsCrossed,
  ArrowRight,
  UploadCloud,
  ArrowLeft,
  Check,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { getSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface PartnerOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: {
    title: string;
    quantity: number;
    isVeg: boolean;
    variant?: string;
    addOns?: string[];
    price: number;
  }[];
  totalAmount: number;
  status: "NEW" | "PREPARING" | "READY_FOR_PICKUP";
  timerMinutes: number;
  assignedRider?: {
    name: string;
    phone: string;
    hasArrived: boolean;
  };
}

const INITIAL_ORDERS: PartnerOrder[] = [
  {
    id: "ord-1",
    orderNumber: "#IZ-3082",
    customerName: "Floyd Miles",
    customerPhone: "9876543210",
    items: [
      {
        title: "Smokey Truffle Beast Burger",
        quantity: 2,
        isVeg: false,
        variant: "Double Beast",
        addOns: ["Extra Truffle Mayo", "Brioche Bun"],
        price: 698,
      },
      {
        title: "Truffle Parmesan French Fries",
        quantity: 1,
        isVeg: true,
        price: 149,
      },
    ],
    totalAmount: 847,
    status: "NEW",
    timerMinutes: 3,
  },
  {
    id: "ord-2",
    orderNumber: "#IZ-3080",
    customerName: "Bessie Cooper",
    customerPhone: "9876543211",
    items: [
      {
        title: "Woodfired Truffle Margherita",
        quantity: 1,
        isVeg: true,
        variant: "12 Inch Large",
        addOns: ["Extra Fresh Burrata"],
        price: 649,
      },
    ],
    totalAmount: 649,
    status: "PREPARING",
    timerMinutes: 14,
    assignedRider: {
      name: "Vikram Singh",
      phone: "9876543212",
      hasArrived: false,
    },
  },
  {
    id: "ord-3",
    orderNumber: "#IZ-3078",
    customerName: "Ralph Edwards",
    customerPhone: "9876543213",
    items: [
      {
        title: "Dum Gosht Awadhi Dum Biryani",
        quantity: 1,
        isVeg: false,
        variant: "Family Handi",
        addOns: ["Mint Burani Raita"],
        price: 799,
      },
    ],
    totalAmount: 799,
    status: "READY_FOR_PICKUP",
    timerMinutes: 0,
    assignedRider: {
      name: "Rahul Verma",
      phone: "9876543214",
      hasArrived: true,
    },
  },
];

export default function PartnerOrdersPage() {
  const [orders, setOrders] = useState<PartnerOrder[]>(INITIAL_ORDERS);
  const [isOpen, setIsOpen] = useState(true);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join:partner", { partnerId: "partner-1" });

    socket.on("partner:new_order", (newOrder: PartnerOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
      if (!isAudioMuted) {
        toast.success(`⚡ New Incoming Order ${newOrder.orderNumber}!`, {
          duration: 6000,
        });
      }
    });

    return () => {
      socket.off("partner:new_order");
    };
  }, [isAudioMuted]);

  const handleAcceptOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "PREPARING", timerMinutes: 20 } : o))
    );
    toast.success("Order accepted! Moved to Kitchen Prep 🍳");
  };

  const handleRejectOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    toast.error("Order rejected");
  };

  const handleMarkReady = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "READY_FOR_PICKUP" } : o))
    );
    toast.success("Order marked Ready for Pickup! 📦 Rider notified.");
  };

  const handleHandover = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    toast.success("Handover confirmed! Order out for delivery 🛵");
  };

  const newOrders = orders.filter((o) => o.status === "NEW");
  const preparingOrders = orders.filter((o) => o.status === "PREPARING");
  const readyOrders = orders.filter((o) => o.status === "READY_FOR_PICKUP");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top POS Header */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between z-30 shadow-xs">
        <div className="flex items-center gap-4">
          <Link href="/feed" className="flex items-center gap-2 text-foreground font-black text-lg">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-primary to-secondary flex items-center justify-center text-white">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span>
              Partner<span className="text-primary">Studio</span>
            </span>
          </Link>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-foreground">The Gourmet Grill</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isOpen
                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                  : "bg-red-500/15 text-red-500 border-red-500/30"
              }`}
            >
              {isOpen ? "LIVE • OPEN" : "CLOSED"}
            </span>
          </div>
        </div>

        {/* Store Controls */}
        <div className="flex items-center gap-3">
          <Link
            href="/partner/upload"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Dish Video</span>
          </Link>

          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              !isAudioMuted
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                : "bg-card-elevated text-muted border-border"
            }`}
          >
            {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{isAudioMuted ? "Muted" : "Kitchen Audio ON"}</span>
          </button>
        </div>
      </header>

      {/* 3-COLUMN KANBAN BOARD */}
      <main className="flex-1 p-6 overflow-x-auto grid grid-cols-1 md:grid-cols-3 gap-6 bg-background">
        {/* COLUMN 1: NEW ORDERS */}
        <div className="flex flex-col rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-card-elevated flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              <h2 className="font-extrabold text-sm text-foreground">New Incoming</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-extrabold border border-primary/20">
              {newOrders.length}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {newOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card-elevated border border-primary/30 rounded-2xl p-4 space-y-3 shadow-sm hover:border-primary transition-all"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-primary">{order.orderNumber}</span>
                    <h3 className="text-sm font-bold text-foreground">{order.customerName}</h3>
                  </div>
                  <span className="text-xs font-black text-foreground">{formatPrice(order.totalAmount)}</span>
                </div>

                <div className="space-y-1 py-1 border-y border-border">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-foreground/90 font-medium">
                        {it.quantity}x {it.title}
                      </span>
                      <span className="text-muted font-mono">{formatPrice(it.price)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleRejectOrder(order.id)}
                    className="flex-1 py-2 rounded-xl bg-card hover:bg-card-hover border border-border text-xs font-semibold text-rose-500"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    className="flex-2 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs"
                  >
                    Accept & Prepare (20m)
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 2: PREPARING IN KITCHEN */}
        <div className="flex flex-col rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-card-elevated flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h2 className="font-extrabold text-sm text-foreground">Kitchen Preparing</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-extrabold border border-amber-500/20">
              {preparingOrders.length}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {preparingOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card-elevated border border-border rounded-2xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-amber-500">{order.orderNumber}</span>
                    <h3 className="text-sm font-bold text-foreground">{order.customerName}</h3>
                  </div>
                  <span className="text-xs font-black text-foreground">{formatPrice(order.totalAmount)}</span>
                </div>

                <div className="space-y-1 py-1 border-y border-border">
                  {order.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-foreground/90 font-medium">
                        {it.quantity}x {it.title}
                      </span>
                      <span className="text-muted font-mono">{formatPrice(it.price)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleMarkReady(order.id)}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Mark Ready for Pickup 📦
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* COLUMN 3: READY FOR RIDER PICKUP */}
        <div className="flex flex-col rounded-3xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border bg-card-elevated flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="font-extrabold text-sm text-foreground">Ready for Pickup</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-extrabold border border-emerald-500/20">
              {readyOrders.length}
            </span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {readyOrders.map((order) => (
              <div
                key={order.id}
                className="bg-card-elevated border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-emerald-500">{order.orderNumber}</span>
                    <h3 className="text-sm font-bold text-foreground">{order.customerName}</h3>
                  </div>
                  <span className="text-xs font-black text-foreground">{formatPrice(order.totalAmount)}</span>
                </div>

                {order.assignedRider && (
                  <div className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
                    <span className="text-muted">Rider: {order.assignedRider.name}</span>
                    <span className="text-emerald-500 font-bold">Arrived 🛵</span>
                  </div>
                )}

                <button
                  onClick={() => handleHandover(order.id)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Confirm Handover to Rider ➔
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
