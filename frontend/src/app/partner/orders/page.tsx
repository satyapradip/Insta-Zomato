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
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { DietaryBadge } from "@/components/common/DietaryBadge";
import { getSocket } from "@/lib/socket";
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
        // Play notification sound
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
      <header className="h-16 border-b border-white/10 bg-card px-6 flex items-center justify-between z-30">
        <div className="flex items-center gap-4">
          <Link href="/feed" className="flex items-center gap-2 text-white font-black text-lg">
            <div className="w-8 h-8 rounded-lg bg-linear-to-tr from-primary to-secondary flex items-center justify-center text-white">
              <UtensilsCrossed className="w-4 h-4" />
            </div>
            <span>
              Partner<span className="text-primary">Studio</span>
            </span>
          </Link>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-white">The Gourmet Grill</span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isOpen
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-red-500/15 text-red-400 border-red-500/30"
              }`}
            >
              {isOpen ? "LIVE • OPEN" : "CLOSED"}
            </span>
          </div>
        </div>

        {/* Store Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAudioMuted(!isAudioMuted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
              !isAudioMuted
                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                : "bg-white/5 text-white/50 border-white/10"
            }`}
          >
            {!isAudioMuted ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{isAudioMuted ? "Muted" : "Kitchen Audio ON"}</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
          >
            Toggle Store Status
          </button>

          <Link
            href="/feed"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>Customer View</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Kanban Content */}
      <main className="flex-1 p-6 overflow-x-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Kitchen POS & Incoming Orders Queue
          </h1>
          <div className="flex items-center gap-2 text-xs font-bold text-white/60">
            <span>Total Active Orders:</span>
            <span className="text-white font-black bg-primary/20 text-primary px-2.5 py-0.5 rounded-full">
              {orders.length}
            </span>
          </div>
        </div>

        {/* 3-COLUMN KANBAN BOARD */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* COLUMN 1: NEW ORDERS */}
          <div className="bg-card border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  New Incoming
                </h2>
              </div>
              <span className="text-xs font-black bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
                {newOrders.length}
              </span>
            </div>

            <div className="space-y-3">
              {newOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
                  No new incoming orders right now.
                </div>
              ) : (
                newOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-card-elevated border-2 border-orange-500/40 space-y-3 shadow-lg animate-in fade-in zoom-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">{order.orderNumber}</span>
                      <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{order.timerMinutes}m accept timer</span>
                      </span>
                    </div>

                    <div className="text-xs text-white/80 font-medium">
                      Customer: <strong>{order.customerName}</strong> ({order.customerPhone})
                    </div>

                    {/* Dish list */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <DietaryBadge isVeg={i.isVeg} />
                            <span className="text-white font-semibold">
                              {i.quantity}x {i.title}
                            </span>
                          </div>
                          <span className="text-white/60 font-mono">{formatPrice(i.price)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                      <span className="text-white/50">Total Bill</span>
                      <span className="text-sm font-black text-primary">
                        {formatPrice(order.totalAmount)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1 shadow-md"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRejectOrder(order.id)}
                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 text-xs font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: KITCHEN PREPARING */}
          <div className="bg-card border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Kitchen Prep
                </h2>
              </div>
              <span className="text-xs font-black bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                {preparingOrders.length}
              </span>
            </div>

            <div className="space-y-3">
              {preparingOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
                  Kitchen is clear.
                </div>
              ) : (
                preparingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-card-elevated border border-white/15 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">{order.orderNumber}</span>
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{order.timerMinutes}m remaining</span>
                      </span>
                    </div>

                    {/* Dish list */}
                    <div className="space-y-1.5 pt-2 border-t border-white/10 text-xs">
                      {order.items.map((i, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                              <DietaryBadge isVeg={i.isVeg} />
                              <span className="text-white font-semibold">
                                {i.quantity}x {i.title}
                              </span>
                            </div>
                            <span className="text-white/60 font-mono">{formatPrice(i.price)}</span>
                          </div>
                          {i.variant && (
                            <p className="text-[11px] text-primary pl-5">Size: {i.variant}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleMarkReady(order.id)}
                      className="w-full bg-linear-to-r from-amber-500 to-orange-500 hover:brightness-110 text-black text-xs font-bold py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <PackageCheck className="w-4 h-4" />
                      <span>Mark Ready for Pickup</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: READY FOR PICKUP */}
          <div className="bg-card border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                  Ready for Pickup
                </h2>
              </div>
              <span className="text-xs font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                {readyOrders.length}
              </span>
            </div>

            <div className="space-y-3">
              {readyOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-white/40 border border-dashed border-white/10 rounded-2xl">
                  No orders waiting for pickup.
                </div>
              ) : (
                readyOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-2xl bg-card-elevated border border-emerald-500/30 space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">{order.orderNumber}</span>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        Packed & Ready
                      </span>
                    </div>

                    {order.assignedRider && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Bike className="w-4 h-4 text-primary" />
                          <span className="text-white font-medium">{order.assignedRider.name}</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold ${
                            order.assignedRider.hasArrived ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {order.assignedRider.hasArrived ? "Arrived at Restaurant" : "En Route"}
                        </span>
                      </div>
                    )}

                    <button
                      onClick={() => handleHandover(order.id)}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Handover to Rider</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
