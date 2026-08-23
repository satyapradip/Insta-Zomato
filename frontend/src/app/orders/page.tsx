"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, Bike, CheckCircle2, ChevronRight, UtensilsCrossed } from "lucide-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { formatPrice } from "@/lib/utils";

const PAST_ORDERS = [
  {
    id: "IZ-40921",
    restaurant: "The Gourmet Grill",
    date: "Today, 08:30 PM",
    items: "2x Smokey Truffle Beast Burger, 1x Truffle Fries",
    totalAmount: 847,
    status: "OUT_FOR_DELIVERY",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=200&q=80",
    isLive: true,
  },
  {
    id: "IZ-30914",
    restaurant: "Bistro Verde Ristorante",
    date: "Yesterday, 01:15 PM",
    items: "1x Woodfired Truffle Burrata Margherita, 1x Lemonade",
    totalAmount: 649,
    status: "DELIVERED",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=200&q=80",
    isLive: false,
  },
  {
    id: "IZ-20899",
    restaurant: "Dawat-e-Khas",
    date: "18 Aug 2026",
    items: "1x Dum Gosht Awadhi Dum Biryani, 1x Raita",
    totalAmount: 460,
    status: "DELIVERED",
    image: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=200&q=80",
    isLive: false,
  },
];

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex justify-center pb-24 lg:pb-8">
      <DesktopSidebar />

      <main className="flex-1 lg:pl-64 max-w-4xl w-full p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Link
              href="/feed"
              className="p-2 rounded-xl bg-card-elevated hover:bg-card-hover text-foreground border border-border transition-colors shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                My Orders & Receipts
              </h1>
              <p className="text-xs text-muted">Track live orders and view past receipts</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {PAST_ORDERS.map((order) => (
            <div
              key={order.id}
              className={`bg-card border rounded-3xl p-5 md:p-6 space-y-4 shadow-sm transition-all ${
                order.isLive
                  ? "border-primary/40 shadow-md ring-1 ring-primary/20"
                  : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={order.image}
                    alt={order.restaurant}
                    className="w-14 h-14 rounded-2xl object-cover border border-border"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-foreground">{order.restaurant}</h2>
                      {order.isLive && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted">{order.date}</p>
                    <p className="text-xs text-foreground/80 line-clamp-1">{order.items}</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <span className="text-sm font-extrabold text-foreground">
                    {formatPrice(order.totalAmount)}
                  </span>
                  <div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        order.isLive
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-xs text-muted font-mono">{order.id}</span>
                {order.isLive ? (
                  <Link
                    href={`/order/${order.id}/track`}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Track Live GPS Route ➔</span>
                  </Link>
                ) : (
                  <button className="text-xs font-semibold text-muted hover:text-foreground bg-card-elevated hover:bg-card-hover border border-border px-3 py-1.5 rounded-xl transition-colors shadow-xs">
                    Re-Order Dishes
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
